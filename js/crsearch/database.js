import {Result} from './result'
import {IndexID} from './index-id'
import {Index} from './index'
import {Namespace} from './namespace'

import * as Query from './query'


class Database {
  constructor(log, json) {
    this.log = log.make_context(this.constructor.name)
    this.name = json.database_name
    this.base_url = new URL(json.base_url)
    this.namespaces = []
    this.default_ns = new Map
    this.ids = []

    for (const [s_key, id] of json.ids.entries()) {
      this.ids.push(new IndexID(this.log, s_key, id))
    }

    for (const [s_key, j_ns] of json.namespaces.entries()) {
      const ns = new Namespace(this.log, s_key, j_ns, this.ids)
      this.log.info(`got Namespace: '${ns.pretty_name()}'`, ns)
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

          if (rid.type !== Result.HEADER) {
            continue // skip unused related_to s
          }

          let found = ns.indexes.get(rid)
          if (!found) {
            for (const in_ns of this.namespaces) {
              if (in_ns.indexes.has(rid)) {
                found = in_ns.indexes.get(rid)
                break
              }
            }

            if (!found) {
              let fake = new Index(this.log)
              fake.id = rid
              fake.id_cache = fake.id.key.map(kv => kv.name).join()

              let dns = this.default_ns.get(ns.namespace.join('/'))
              this.log.warn(`no namespace has this index; fake indexing '${fake.id.join()}' --> '${id.join()}'`, 'default namespace:', dns.pretty_name(), '\nfake index:', fake, '\nself:', id.join())

              deref_related_to.add(fake)

              dns.indexes.set(rid, fake)

            } else {
              deref_related_to.add(found)
            }

          } else {
            // this.log.warn(`related_to entity ${rid.join()} not found in this namespace '${ns.pretty_name()}', falling back to default`, 'default:', rid.join())
            deref_related_to.add(ns.indexes.get(rid))
          }
        }

        idx.related_to = deref_related_to
      }
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
}
export {Database}

