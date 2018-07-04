import {IndexID} from './index-id'
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
    this._name_iid_map = new Map

    // global map
    this._all_fullpath_pages = new Map

    this._log.debug('[P1] initializing all IndexID...')
    for (const id of json.ids) {
      const iid = new IndexID(this._log, id)
      this._ids.push(iid)
      this._name_iid_map.set(iid.name, iid)
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
      ns.init(this)
    }

    console.timeEnd(runID)
    this._log.info('initialized.', this._all_pages)

    Object.freeze(this)
  }

  getTree(kc) {
    const runID = JSON.stringify({name: 'Database::getTree', timestamp: Date.now()})
    console.time(runID)

    const toplevels = Array.from(this._path_ns_map.values(),
      ns => ns.makeTree(kc)
    ).sort((a, b) =>
      a.category.index < b.category.index ? -1 : 1
    )

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

  getIndexIDFromName(name) {
    return this._name_iid_map.get(name)
  }

  getIndexID(n) {
    return this._ids[n]
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

