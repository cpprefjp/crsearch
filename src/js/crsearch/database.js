import {Result} from './result'
import {IndexID} from './index-id'
import {Namespace} from './namespace'


class Database {
  constructor(json) {
    this.name = json.database_name
    this.base_url = new URL(json.base_url)
    this.namespaces = []
    this.ids = []

    for (const [s_key, id] of json.ids.entries()) {
      this.ids.push(new IndexID(s_key, id))
    }

    for (const [s_key, ns] of json.namespaces.entries()) {
      this.namespaces.push(new Namespace(s_key, ns, this.ids))
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

