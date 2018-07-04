import {Index} from './index'


class Namespace {
  constructor(log, json, ids, make_url) {
    this._log = log.makeContext('Namespace')
    this._indexes = new Map
    this._namespace = json.namespace
    this._make_url = idx => make_url(this._make_path(idx))
    this._path_prefixes = this._namespace.join('/')


    Object.freeze(this)

    this.merge(json, ids)
  }

  merge(json, ids) {
    const cpp_version = json.cpp_version || null
    const extra_path = this._extraPath(json.path_prefixes || this._namespace)

    for (const j_idx of json.indexes) {
      const idx = this.createIndex(cpp_version, ids[j_idx.id], j_idx, extra_path)
      this._indexes.set(idx.path, idx)
    }
  }

  _extraPath(path_prefixes) {
    return path_prefixes.slice(this._namespace.length)
  }

  createIndex(cpp_version, iid, j_idx, extra_path) {
    return new Index(this._log, cpp_version, iid, j_idx, extra_path, this._make_url, this)
  }

  query(q, found_count, max_count) {
    const targets = []

    for (const idx of this._indexes.values()) {
      if (q.match(idx)) {
        ++found_count

        if (found_count > max_count) {
          return {targets: targets, found_count: found_count}
        }
        targets.push({path: idx.url(), index: idx})
      }
    }

    return {targets: targets, found_count: found_count}
  }

  _make_path(idx) {
    const path = idx.path
    if (path.length !== 0) {
      return `${this._path_prefixes}/${path}`
    } else {
      return this._path_prefixes
    }
  }

  pretty_name() {
    return this._namespace.join(' \u226B')
  }

  get indexes() {
    return this._indexes
  }

  get namespace() {
    return this._namespace
  }
}

export {Namespace}

