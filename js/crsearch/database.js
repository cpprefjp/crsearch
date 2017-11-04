import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'
import {Index} from './index'
import {Namespace} from './namespace'
import {Dictionary} from './dictionary'

import * as Query from './query'

class RootIndexError {
  constructor(idx) {
    this.idx = idx
    this.args = arguments
  }
}

class Database {
  constructor(log, json) {
    this.log = log.makeContext('Database')
    this.name = json.database_name
    this.base_url = new URL(json.base_url)
    this.namespaces = []
    this.exactNamespaces = new Map
    this.default_ns = new Map
    this.ids = []

    for (const [s_key, id] of json.ids.entries()) {
      this.ids.push(new IndexID(this.log, s_key, id))
    }

    for (const [s_key, j_ns] of json.namespaces.entries()) {
      const ns = new Namespace(this.log, s_key, j_ns, this.ids, this.make_url.bind(this))
      this.log.info(`got Namespace: '${ns.pretty_name()}'`, ns)
      this.exactNamespaces.set(ns.canonicalKey(), ns)
      this.namespaces.push(ns)

      // set namespace w/ no cpp_version as default fallback

      if (!ns.cpp_version) {
        this.log.info(`setting default namespace version for '${ns.namespace.join('/')}'`, ns.pretty_name())
        this.default_ns.set(ns.namespace.join('/'), ns)
      }
    }

    // map fake header page to related_to, if needed
    this.all_classes = new Map
    for (const ns of this.namespaces) {
      for (const idx of ns.findIndex((idx) => idx.id.type === IType.class)) {
        this.all_classes.set(idx.id.join(), idx)
      }
    }

    for (const ns of this.namespaces) {
      for (let [id, idx] of ns.indexes) {
        if (idx.id.type === IType.mem_fun) {
          let class_keys = [].concat(idx.id.key)
          class_keys.pop()
          const cand = class_keys.map((k) => k.name).join('::')

          const c = this.all_classes.get(cand)
          if (!c) {
            this.log.warn(`parent class '${cand}' for index '${idx}' not found in database`, idx)
          } else {
            idx.in_class = c
          }
        }


        if (!idx.related_to) continue

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
                fake.id = rid
                fake.id_cache = fake.id.key.map(kv => kv.name).join()

                if (fake.id_cache === 'header_name') {
                  // shit
                  continue
                }

                // this.log.debug('fake', fake, fake.url())
                found = fake

                this.log.warn(`no namespace has this index; fake indexing '${fake.id.join()}' --> '${id.join()}'`, 'default namespace:', dns.pretty_name(), '\nfake index:', fake, '\nself:', id.join())

                dns.indexes.set(rid, fake)
              }

            } else {
              // this.log.warn(`related_to entity ${rid.join()} not found in this namespace '${ns.pretty_name()}', falling back to default`, 'default:', rid.join())
            }

            idx.in_header = found
            deref_related_to.add(found)
          } // header
        } // deref related_to loop

        idx.related_to = deref_related_to
      }
    }
  }

  getTree() {
    let articles = new Map
    let headers = new Map

    for (const ns of this.namespaces) {
      const gkey = ns.genericKey()
      // this.log.debug(`tree for '${ns.genericKey()}' --------------------------------------`, ns)

      const [parentIndexes, childIndexes] = ns.partitionIndex((idx) => idx.isParent())
      // this.log.debug(`${parentIndexes.size} parents, ${childIndexes.size} children`, parentIndexes, childIndexes)

      const getIndexDict = (idx) => {
        const p = idx.getParent()

        if (p) {
          const key = p.id.join()

          if (!headers.has(key)) {
            // this.log.debug(`new header dict for '${key}'`)
            let d = new Dictionary(this.log, p, [])
            headers.set(key, d)
          }
          return headers.get(key)

        } else {
          if (![IType.meta, IType.article].includes(idx.type())) {
            throw new Error(`[BUG] wild index type must be an article; got: ${idx}`)
          }


          if (!idx.page_id || !idx.page_id.length || !idx.page_id[0].length || !idx.page_id[idx.page_id.length - 1].length) {
            this.log.warn(`empty index '${idx}' (maybe root?)`, idx)
            throw new RootIndexError(idx)
          }

          const key = idx.page_id[0]
          if (!articles.has(key)) {
            // this.log.debug(`new article dict for '${key}'`)
            let d = new Dictionary(this.log, key, [])
            articles.set(key, d)
          }
          return articles.get(key)
        }
      }

      for (const idx of childIndexes) {
        try {
          const d = getIndexDict(idx)
          // this.log.debug(`pushing index '${idx}' to dictionary '${d.self}'...`)
          d.children.push(idx)
        } catch (e) {
          if (e instanceof RootIndexError) {
            continue
          } else {
            throw e
          }
        }
      }
    }

    this.log.info(`${headers.size} headers, ${articles.size} article categories`, headers, articles)

    return {
      headers: headers,
      articles: articles,
    }
  }

  sortTree(kc, tree) {
    let headers = []
    for (const [h, dict] of tree.headers) {
      let classes = new Map
      let others = new Set
      let no_class = new Set

      this.log.debug('fasfsadsa', h, dict)
      for (const idx of dict.children) {
        if (idx.id.type === IType.mem_fun) {
          const c = idx.in_class

          if (!c) {
            no_class.add(idx)
            continue
          }

          const key = c.id.join()
          if (!classes.has(key)) {
            classes.set(key, {self: c, children: new Set})
          }
          classes.get(key).children.add(idx)
        } else {
          if (idx.id.type === IType.class) {
            const key = idx.id.join()
            if (!classes.has(key)) {
              classes.set(key, {self: idx, children: new Set})
            }
          }
          others.add(idx)
        }
      }
      this.log.debug('AAAAAA', classes, others)

      classes = Array.from(classes).map((kv) => {
        return [kv[0], kv[1]]
      }).sort((a, b) => {
        return a[0] < b[0] ? -1 : 1
      })

      for (let [key, c] of classes) {
        if (!c.children) {
          c.children = []
          continue
        }
        c.children = Array.from(c.children).sort((a, b) => {
          return kc.priorityForIndex(a).i < kc.priorityForIndex(b).i ? -1 : 1
        })
      }

      headers.push([h, {
        self: dict.self,
        classes: classes,
        others: Array.from(others).sort((a, b) => {
          return a.join() < b.join() ? -1 : 1
        })
      }])
    }

    return {
      headers: headers.sort((a, b) => {
        // this.log.debug('sort', a[0], b[0])
        return a[0] < b[0] ? -1 : 1
      }),
      articles: Array.from(tree.articles).sort((a, b) => {
        return a[0] < b[0] ? -1 : 1
      }),
    }
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

  exactNamespace(narray, cppv) {
    return this.exactNamespaces.get(
      Namespace.makeCanonicalKey(narray, cppv)
    )
  }
}
export {Database}

