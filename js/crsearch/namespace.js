import {Index} from './index'


class Namespace {
  constructor(log, ns_id, json, ids, make_url) {
    this.log = log.makeContext('Namespace')
    this.ns_id = ns_id
    this.indexes = new Map
    this.name = json.name || null
    this.namespace = json.namespace
    this.cpp_version = json.cpp_version || null

    if (json.path_prefixes) {
      this.path_prefixes = json.path_prefixes.join('/')
    } else {
      this.path_prefixes = this.namespace.join('/')
    }

    for (const idx of json.indexes) {
      const idx_ = new Index(this.log, this.cpp_version, ids[idx.id], idx, (idx) => { return make_url(this.make_path(idx)) })
      // this.log.debug('got Index', idx_)()
      this.indexes.set(idx_.id, idx_)
    }
  }

  static makeGenericKey(narray) {
    return `${[].concat(narray).join('/')}`
  }

  static makeCanonicalKey(gkey, cppv) {
    return `${gkey}///${cppv || null}`
  }

  genericKey() {
    return Namespace.makeGenericKey(this.namespace)
  }

  canonicalKey() {
    return Namespace.makeCanonicalKey(
      Namespace.makeGenericKey(this.namespace),
      this.cpp_version
    )
  }

  exactIndex(id) {
    return this.indexes.get(id)
  }

  findIndex(f) {
    return new Set(Array.from(this.indexes.values()).filter(f))
  }

  query(q, found_count, max_count, path_composer) {
    let targets = []

    for (let [id, idx] of this.indexes) {
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
      return `${this.path_prefixes}/${idx.page_id.join('/')}`
    } else {
      return `${this.path_prefixes}/${idx.id.path_join()}`
    }
  }

  pretty_version() {
    if (this.cpp_version) {
      return `C++${this.cpp_version}`
    } else {
      return '(no version)'
    }
  }

  pretty_name(include_version = true) {
    return `${this.namespace.join(' \u226B')}${include_version ? `[${this.pretty_version()}]` : ''}`
  }
}

export {Namespace}

