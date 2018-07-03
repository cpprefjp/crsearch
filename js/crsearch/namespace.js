import {Index} from './index'


class Namespace {
  constructor(log, json, ids, make_url) {
    this._log = log.makeContext('Namespace')
    this._indexes = new Map
    this._namespace = json.namespace
    this._cpp_version = json.cpp_version || null


    if (json.path_prefixes) {
      this._path_prefixes = json.path_prefixes.join('/')
    } else {
      this._path_prefixes = this._namespace.join('/')
    }

    for (const idx of json.indexes) {
      const idx_ = new Index(this._log, this._cpp_version, ids[idx.id], idx, idx => make_url(this.make_path(idx)))

      idx_.ns = this

      // this._log.debug('got Index', idx_)()
      this._indexes.set(idx_.id, idx_)
    }
  }

  query(q, found_count, max_count) {
    const targets = []

    for (const idx of this._indexes.values()) {
      if (q.filters.size && !Array.from(q.filters).some(f => idx.id.type === f)) continue

      if (
        Array.from(q.frags.and).every(q => Index.ambgMatch(idx, q)) &&
        !Array.from(q.frags.not).some(q => Index.ambgMatch(idx, q))

      ) {
        ++found_count

        if (found_count > max_count) {
          return {targets: targets, found_count: found_count}
        }
        targets.push({path: idx.url(), index: idx})
      }
    }

    return {targets: targets, found_count: found_count}
  }

  make_path(idx) {
    if (idx.page_id) {
      if (idx.page_id[0].length) {
        return `${this._path_prefixes}/${idx.page_id.join('/')}`
      } else {
        return this._path_prefixes
      }
    } else {
      return `${this._path_prefixes}/${idx.id.path_join()}`
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

