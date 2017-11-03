import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'
import {Index} from './index'
import {Namespace} from './namespace'

import * as Query from './query'


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
    for (const ns of this.namespaces) {
      for (let [id, idx] of ns.indexes) {
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

  getTree(kc) {
    let res = new Map
    const cats = kc.categories()

    for (const ns of this.namespaces) {
      const tns = this.getTreeNamespace(ns)
      const gkey = ns.genericKey()
      const cat = cats.get(gkey)

      this.log.debug(`got '${ns.genericKey()}', ordered: ${cat.index}`, ns, cat)

      if (!res.has(cat)) {
        res.set(cat.index, new Map)
      }
      let m = res.get(cat.index)
      for (const [id, idx] of ns.indexes) {
        const prio = kc.priorityForIndex(idx)
        if (!m.has(prio)) {
          m.set(prio, [])
        }
        m.get(prio).push(idx)
      }
    }

    this.log.debug('res', res)
    return Array.from(res.entries()).sort((a, b) => {
      return a[0].index < b[0].index ? -1 : 1

    }).map((e) => {
      return {category: e[0], indexes: e[1]}
    })
  }

  getTreeNamespace(ns) {
    return ns.name
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

