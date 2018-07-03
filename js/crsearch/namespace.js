import {Index} from './index'


class Namespace {
  constructor(log, json, ids, make_url) {
    this._log = log.makeContext('Namespace')
    this._indexes = new Map
    this._namespace = json.namespace
    this._cpp_version = json.cpp_version || null
    this._make_url = idx => make_url(this._make_path(idx))


    if (json.path_prefixes) {
      this._path_prefixes = json.path_prefixes.join('/')
    } else {
      this._path_prefixes = this._namespace.join('/')
    }

    for (const idx of json.indexes) {
      this.createIndex(this._cpp_version, ids[idx.id], idx)
    }
  }

  createIndex(cpp_version, iid, j_idx) {
    const idx = new Index(this._log, cpp_version, iid, j_idx, this._make_url, this)
    this._indexes.set(idx.id, idx)
    return idx
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

  _pretty_version() {
    if (this._cpp_version) {
      return `C++${this._cpp_version}`
    } else {
      return '(no version)'
    }
  }

  pretty_name(include_version = true) {
    return `${this._namespace.join(' \u226B')}${include_version ? `[${this._pretty_version()}]` : ''}`
  }

  get indexes() {
    return this._indexes
  }

  get namespace() {
    return this._namespace
  }

  get cpp_version() {
    return this._cpp_version
  }
}

export {Namespace}

