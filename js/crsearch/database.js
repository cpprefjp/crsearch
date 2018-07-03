import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'
import {Index} from './index'
import {Namespace} from './namespace'

import URL from 'url-parse'


class Database {
  constructor(log, json) {
    const runID = JSON.stringify({name: 'Database::constructor', timestamp: Date.now()})
    console.time(runID)

    this._log = log.makeContext('Database')
    this._name = json.database_name
    this._base_url = new URL(json.base_url)
    this._path_ns_map = new Map
    this._ids = []
    this._reverseID = new Map

    // global map
    this._all_headers = new Map
    this._all_classes = new WeakMap
    this._all_articles = new Set
    this._root_articles = new WeakMap
    this._all_fullpath_pages = new Map


    this._log.debug('[P1] initializing all IndexID...')
    for (const id of json.ids) {
      const iid = new IndexID(this._log, id)

      const rvid = iid.toReverseID()
      // this._log.debug(`rvid for '${iid}': '${rvid}'`, iid)
      // if (rvid.match(/ios_base/)) {
        // this._log.debug(`rvid '${rvid}'`, rvid, iid)
      // }

      this._ids.push(iid)
      this._reverseID.set(rvid, iid)
    }

    this._log.debug('[P1] initializing all Namespace...')
    for (const j_ns of json.namespaces) {
      const path = j_ns.namespace.join('/')
      let ns = this._path_ns_map.get(path)
      if (ns) {
        ns.merge(j_ns, this._ids)
      } else {
        ns = new Namespace(this._log, j_ns, this._ids, path => this._make_url(path))
        this._path_ns_map.set(path, ns)
      }
    }


    this._log.info('[P2] generating reverse maps...')
    for (const ns of this._path_ns_map.values()) {
      for (const idx of ns.indexes.values()) {
        this._resolveRelatedTo(ns, idx)

        if (!idx.is_fake) {
          this._all_fullpath_pages.set(idx.ns.namespace.concat(idx.page_id).join('/'), idx)
        }

        if (idx.type === IType.header) {
          this._autoInit(idx, null)

        } else if (idx.type === IType.class) {
          this._autoInit(idx.in_header, idx)

        } else if (idx.type === IType.mem_fun) {
          const class_keys = [].concat(idx.id.keys)
          class_keys.shift()
          class_keys.pop()
          const rvid = IndexID.composeReverseID(IType.class, class_keys)
          const cand = this._reverseID.get(rvid)

          if (!cand) {
            this._log.error(`[BUG] class candidate for member '${idx.name}' not found (rvid: ${rvid})`, idx)
            continue
          }

          // this._log.debug(`rvid candidate for mem_fun '${idx}': '${rvid}' (candidate '${cand}')`, idx, rvid, cand)

          if (!this._all_classes.has(cand)) {
            this._all_classes.set(cand, {self: null, members: new Set})
          }

          this._all_classes.get(cand).members.add(idx)

        } else if ([IType.article, IType.meta].includes(idx.type)) {
          if (idx.isRootArticle()) {
            this._root_articles.set(
              idx.ns,
              idx
            )
          } else {
            this._all_articles.add(idx)
          }

        } else {
          if (!idx.in_header) {
            throw new Error(`[BUG] got an 'other' type, but in_header was not detected (idx: ${idx})`)
          }
          this._autoInit(idx.in_header, null)
          this._all_headers.get(idx.in_header.name).others.add(idx)
        }
      } // for ns.indexes
    }

    console.timeEnd(runID)
    this._log.info('initialized.', this._all_pages)

    Object.freeze(this)
  }

  _resolveRelatedTo(ns, idx) {
    if (!idx.related_to) return null

    const deref_related_to = new Set

    for (const rsid of idx.related_to) {
      const rid = this._ids[rsid]

      if (rid.type === IType.header) {
        let found = ns.indexes.get(rid)
        if (!found) {
          const fake = ns.createIndex(idx.cpp_version, rid, null, [])

          if (fake.name === '<header_name>') {
            // shit
            continue
          }

          // this._log.debug('fake', fake, fake.url())
          found = fake

          this._log.warn(`no namespace has this index; fake indexing '${fake.name}' --> '${idx.name}'`, 'namespace:', ns.pretty_name(), '\nfake index:', fake, '\nself:', idx.name)

          fake.in_header = fake
          this._autoInit(fake, null)
        }

        idx.in_header = found
        deref_related_to.add(found)
      } // header
    } // deref related_to loop

    idx.related_to = deref_related_to
    return idx.related_to
  }

  _autoInit(hparam, cparam) {
    if (!hparam) {
      throw new Error(`hparam is not supplied ('${hparam}', '${cparam}')`)
    }

    const hkey = hparam.id
    if (!this._all_headers.has(hkey.name)) {
      // this._log.debug(`new: '${hkey}'`, hparam, cparam)
      this._all_headers.set(hkey.name, {self: hparam, classes: new Map, others: new Set})
    }
    const h = this._all_headers.get(hkey.name)

    if (!cparam) return [h, null]

    const ckey = cparam.id
    if (!this._all_classes.has(ckey)) {
      // this._log.debug(`new: '${ckey}'`, hparam, cparam)
      this._all_classes.set(ckey, {self: cparam, members: new Set})
    } else {
      if (!this._all_classes.get(ckey).self) {
        this._all_classes.get(ckey).self = cparam
      }
    }
    const c = this._all_classes.get(ckey)

    if (!h.classes.has(ckey)) {
      // this._log.debug(`'${ckey}' --> '${hkey}'`, hparam, cparam)
      h.classes.set(ckey, c)
    }
    return [h, c]
  }


  getTree(kc) {
    const runID = JSON.stringify({name: 'Database::getTree', timestamp: Date.now()})
    console.time(runID)

    const toplevels = Array.from(this._path_ns_map).map(([name, ns]) => ({
      category: kc.categories().get(ns.namespace[0]),
      namespace: ns,
      root: this._root_articles.get(ns),
      articles: [],
      headers: [],
    })).sort((a, b) =>
      a.category.index < b.category.index ? -1 : 1
    )


    toplevels[kc.categories().get('reference').index].headers =
      Array.from(this._all_headers).map(([name, h]) => ({
        self: h.self,

        classes: Array.from(h.classes).map(([id, c]) => ({
          self: c.self,
          members: Array.from(c.members).sort((a_, b_) => {
            const a = kc.makeMemberData(a_)
            const b = kc.makeMemberData(b_)

            // this._log.debug('a, b', a, b)

            if (a.i < b.i) {
              return -1
            } else if (a.i > b.i) {
              return 1
            } else {
              return a.name < b.name ? -1 : 1
            }
          })
        })).sort((a, b) => a.self.name < b.self.name ? -1 : 1),

        others: Array.from(h.others).sort((a, b) => {
          if (a.type < b.type) {
            return -1
          } else if (a.type > b.type) {
            return 1
          } else {
            return a.name < b.name ? -1 : 1
          }
        }),

      })).sort((a, b) => a.self.name < b.self.name ? -1 : 1)

    for (const ar of this._all_articles) {
      toplevels[kc.categories().get(ar.ns.namespace[0]).index].articles.push(ar)
    }
    for (const t of toplevels) {
      t.articles.sort((a, b) =>
        a.name < b.name ? -1 : 1
      )
    }

    console.timeEnd(runID)
    return toplevels
  }

  query(q, found_count, max_count) {
    const targets = []

    for (const ns of this._path_ns_map.values()) {
      const res = ns.query(q, found_count, max_count)
      if (res.targets.length == 0) {
        continue
      }
      found_count = res.found_count
      targets.push(...res.targets)

      if (found_count > max_count) {
        return {targets: targets, found_count: found_count}
      }
    }
    return {targets: targets, found_count: found_count}
  }

  _make_url(ns_path) {
    return new URL(`/${ns_path}.html`, this._base_url)
  }

  get name() {
    return this._name
  }

  get base_url() {
    return this._base_url
  }

  get all_fullpath_pages() {
    return this._all_fullpath_pages
  }
}
export {Database}

