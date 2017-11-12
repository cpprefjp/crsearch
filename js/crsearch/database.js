import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'
import {Index} from './index'
import {Namespace} from './namespace'
import {Dictionary} from './dictionary'
import {Priority, SiteCategory} from './kunai-config'

import URL from 'url-parse'

import * as Query from './query'


class Database {
  constructor(log, json) {
    const runID = JSON.stringify({name: 'Database::constructor', timestamp: Date.now()})
    console.time(runID)

    this.log = log.makeContext('Database')
    this.name = json.database_name
    this.base_url = new URL(json.base_url)
    this.namespaces = []
    this.default_ns = new Map
    this.topNamespaces = new Map
    this.ids = []
    this.reverseID = new Map

    // global map
    this.all_headers = new Map
    this.all_classes = new WeakMap
    this.all_articles = new Set
    this.root_articles = new WeakMap


    this.log.debug('[P1] initializing all IndexID...')
    let fallback_001_used = false
    for (const [s_key, id] of json.ids.entries()) {
      const iid = new IndexID(this.log, s_key, id)

      // legacy fallback
      if (iid.cpp_namespace && iid.cpp_namespace.length >= 2) {
        if (iid.cpp_namespace[1] === 'string_literals') {
          fallback_001_used = true
          this.log.warn('using fallback for string_literals namespace issue: https://github.com/cpprefjp/site/commit/6325b516f91f7434abbcef1ecaa04950d80ec9a9')
          iid.keys.shift()
          iid.type = IType.function
        }
      }

      const rvid = iid.toReverseID()
      // this.log.debug(`rvid for '${iid}': '${rvid}'`, iid)
      // if (rvid.match(/ios_base/)) {
        // this.log.debug(`rvid '${rvid}'`, rvid, iid)
      // }

      this.ids.push(iid)
      this.reverseID.set(rvid, iid)
    }

    if (!fallback_001_used) {
      this.log.warn('fallback_001 is not used; maybe time to remove this workaround?')
    }

    this.log.debug('[P1] initializing all Namespace...')
    for (const [s_key, j_ns] of json.namespaces.entries()) {
      const ns = new Namespace(this.log, s_key, j_ns, this.ids, this.make_url.bind(this))
      this.log.debug(`got Namespace: '${ns.pretty_name()}'`, ns)
      this.namespaces.push(ns)

      // set namespace w/ no cpp_version as default fallback

      if (!ns.cpp_version) {
        this.log.debug(`setting default namespace version for '${ns.namespace.join('/')}'`, ns.pretty_name())
        this.default_ns.set(ns.namespace.join('/'), ns)
      }
    }


    this.log.info('[P2] generating reverse maps...')
    for (const ns of this.namespaces) {
      if (ns.namespace.length <= 1) {
        this.topNamespaces.set(ns.namespace[0], ns)
      }

      for (let [id, idx] of ns.indexes) {
        this.resolveRelatedTo(ns, idx)

        if (idx.id.type === IType.header) {
          this.autoInit(idx, null)

        } else if (idx.id.type === IType.class) {
          this.autoInit(idx.in_header, idx)

        } else if (idx.id.type === IType.mem_fun) {
          let class_keys = [].concat(idx.id.keys)
          class_keys.shift()
          class_keys.pop()
          const rvid = IndexID.composeReverseID(IType.class, class_keys)
          const cand = this.reverseID.get(rvid)

          if (!cand) {
            this.log.error(`[BUG] class candidate for member '${idx.id.join()}' not found (rvid: ${rvid})`, idx)
            continue
          }

          // this.log.debug(`rvid candidate for mem_fun '${idx}': '${rvid}' (candidate '${cand}')`, idx, rvid, cand)

          if (!this.all_classes.has(cand)) {
            this.all_classes.set(cand, {self: null, members: new Set})
          }

          this.all_classes.get(cand).members.add(idx)

        } else if ([IType.article, IType.meta].includes(idx.id.type)) {
          if (idx.isRootArticle()) {
            this.root_articles.set(
              idx.ns,
              idx
            )
          } else {
            this.all_articles.add(idx)
          }

        } else {
          if (!idx.in_header) {
            throw new Error(`[BUG] got an 'other' type, but in_header was not detected (idx: ${idx})`)
          }
          this.autoInit(idx.in_header, null)
          this.all_headers.get(idx.in_header.id.join()).others.add(idx)
        }
      } // for ns.indexes
    }

    console.timeEnd(runID)
    this.log.info('initialized.')
  }

  resolveRelatedTo(ns, idx) {
    if (!idx.related_to) return null

    let deref_related_to = new Set

    for (const rsid of idx.related_to) {
      const rid = this.ids[rsid]

      if (rid.type === IType.header) {
        let found = ns.indexes.get(rid)
        if (!found) {
          for (const in_ns of this.namespaces) {
            if (in_ns.indexes.has(rid)) {
              found = in_ns.indexes.get(rid)
              break
            }
          }

          if (!found) {
            let dns = this.default_ns.get(ns.namespace.join('/'))
            let fake = new Index(this.log, dns.cpp_version, null, null, (idx) => { return this.make_url(dns.make_path(idx)) })
            fake.is_fake = true
            fake.id = rid
            fake.id_cache = fake.id.keys.join()

            if (fake.id_cache === 'header_name') {
              // shit
              continue
            }

            // this.log.debug('fake', fake, fake.url())
            found = fake

            this.log.warn(`no namespace has this index; fake indexing '${fake.id.join()}' --> '${idx.id.join()}'`, 'default namespace:', dns.pretty_name(), '\nfake index:', fake, '\nself:', idx.id.join())

            dns.indexes.set(rid, fake)
            this.reverseID.set(rid.toReverseID(), rid)
            this.autoInit(fake, null)
          }

        } else {
          // this.log.warn(`related_to entity ${rid.join()} not found in this namespace '${ns.pretty_name()}', falling back to default`, 'default:', rid.join())
        }

        idx.in_header = found
        deref_related_to.add(found)
      } // header
    } // deref related_to loop

    idx.related_to = deref_related_to
    return idx.related_to
  }

  autoInit(hparam, cparam) {
    if (!hparam) {
      throw new Error(`hparam is not supplied ('${hparam}', '${cparam}')`)
    }

    const hkey = hparam.id
    if (!this.all_headers.has(hkey.join())) {
      // this.log.debug(`new: '${hkey}'`, hparam, cparam)
      this.all_headers.set(hkey.join(), {self: hparam, classes: new Map, others: new Set})
    }
    let h = this.all_headers.get(hkey.join())

    if (!cparam) return [h, null]


    // -------------------------------------------------------------
    // LEGACY WORKAROUND
    // https://github.com/cpprefjp/site_generator/issues/42

    // const ckey = cparam.id
    const ckey = this.reverseID.get(cparam.id.toReverseID())
    // -------------------------------------------------------------

    if (!this.all_classes.has(ckey)) {
      // this.log.debug(`new: '${ckey}'`, hparam, cparam)
      this.all_classes.set(ckey, {self: cparam, members: new Set})
    } else {
      if (!this.all_classes.get(ckey).self) {
        this.all_classes.get(ckey).self = cparam
      }
    }
    let c = this.all_classes.get(ckey)

    if (!h.classes.has(ckey)) {
      // this.log.debug(`'${ckey}' --> '${hkey}'`, hparam, cparam)
      h.classes.set(ckey, c)
    }
    return [h, c]
  }


  getTree(kc) {
    const runID = JSON.stringify({name: 'Database::getTree', timestamp: Date.now()})
    console.time(runID)

    let toplevels = Array.from(this.topNamespaces).map(([name, ns]) => {
      return {
        category: kc.categories().get(ns.namespace[0]),
        namespace: ns,
        root: this.root_articles.get(
          this.default_ns.get(ns.namespace.join('/'))
        ),
        articles: [],
        headers: [],
      }
    }).sort((a, b) => {
      return a.category.index < b.category.index ? -1 : 1
    })


    toplevels[kc.categories().get('reference').index].headers =
      Array.from(this.all_headers).map(([name, h]) => ({
        self: h.self,

        classes: Array.from(h.classes).map((([id, c]) => ({
          self: c.self,
          members: Array.from(c.members).sort((a_, b_) => {
            const a = kc.makeMemberData(a_)
            const b = kc.makeMemberData(b_)

            // this.log.debug('a, b', a, b)

            if (a.i < b.i) {
              return -1
            } else if (a.i > b.i) {
              return 1
            } else {
              return a.name < b.name ? -1 : 1
            }
          })
        }))).sort((a, b) => a.self.id.join() < b.self.id.join() ? -1 : 1),

        others: Array.from(h.others).sort((a, b) => {
          if (a.id.type < b.id.type) {
            return -1
          } else if (a.id.type > b.id.type) {
            return 1
          } else {
            return a.id.join() < b.id.join() ? -1 : 1
          }
        }),

      })).sort((a, b) => a.self.id.join() < b.self.id.join() ? -1 : 1)

    for (const ar of this.all_articles) {
      toplevels[kc.categories().get(ar.ns.namespace[0]).index].articles.push(ar)
    }
    for (let t of toplevels) {
      t.articles.sort((a, b) => {
        return a.id.join() < b.id.join() ? -1 : 1
      })
    }

    console.timeEnd(runID)
    return toplevels
  }

  query(q, found_count, max_count) {
    let targets = []

    for (const ns of this.namespaces) {
      const res = ns.query(q, found_count, max_count, this.make_url.bind(this))
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

  make_url(ns_path) {
    return new URL(`/${ns_path}.html`, this.base_url)
  }

  findNamespace(f) {
    return this.namespaces.filter(f)
  }
}
export {Database}

