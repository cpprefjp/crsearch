import {Index} from './index'
import {IndexType as IType} from './index-type'


class Namespace {
  constructor(log, ns_id, json, ids, make_url) {
    this._log = log.makeContext('Namespace')
    this._ns_id = ns_id
    this._indexes = new Map
    this._namespace = json.namespace
    this._cpp_version = json.cpp_version || null


    if (json.path_prefixes) {
      this._path_prefixes = json.path_prefixes.join('/')
    } else {
      this._path_prefixes = this._namespace.join('/')
    }

    for (const idx of json.indexes) {
      const idx_ = new Index(this._log, this._cpp_version, ids[idx.id], idx, (idx) => { return make_url(this.make_path(idx)) })

      idx_.ns = this

      // this._log.debug('got Index', idx_)()
      this._indexes.set(idx_.id, idx_)
    }
  }

  static _makeGenericKey(narray) {
    return `${[].concat(narray).join('/')}`
  }

  static _makeCanonicalKey(gkey, cppv) {
    return `${gkey}///${cppv || null}`
  }

  _genericKey() {
    return Namespace._makeGenericKey(this._namespace)
  }

  _canonicalKey() {
    return Namespace._makeCanonicalKey(
      Namespace._makeGenericKey(this._namespace),
      this._cpp_version
    )
  }

  _exactIndex(id) {
    return this._indexes.get(id)
  }

  _findIndex(f) {
    return new Set(Array.from(this._indexes.values()).filter(f))
  }

  _partitionIndex(f) {
    const ret = [new Set, new Set]
    for (const [id, idx] of this._indexes) {
      if (f(idx)) {
        ret[0].add(idx)
      } else {
        ret[1].add(idx)
      }
    }
    return ret
  }

  query(q, found_count, max_count, path_composer) {
    const targets = []

    for (const [id, idx] of this._indexes) {
      if (q.filters.size && !Array.from(q.filters).some((f) => { return idx.id.type === f })) continue

      if (
        Array.from(q.frags.and).every(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx)) &&
        !Array.from(q.frags.not).some(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx))

      ) {
        ++found_count

        if (found_count > max_count) {
          return {targets: targets, found_count: found_count}
        }
        targets.push({path: path_composer(this.make_path(idx)), index: idx})
      }
    }

    return {targets: targets, found_count: found_count}
  }

  make_path(idx) {
    if (idx.page_id) {
      if (idx.page_id[0].length) {
        return `${this._path_prefixes}/${idx.page_id.join('/')}`
      } else {
        return `${this._path_prefixes}`
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

