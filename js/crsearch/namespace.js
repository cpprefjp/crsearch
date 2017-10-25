import {Index} from './index'

class Namespace {
  constructor(ns_id, json, ids) {
    this.ns_id = ns_id
    this.indexes = new Map
    this.namespace = json.namespace

    if (json.path_prefixes) {
      this.path_prefixes = json.path_prefixes.join('/')
    } else {
      this.path_prefixes = this.namespace.join('/')
    }

    for (const idx of json.indexes) {
      const idx_ = new Index(ids[idx.id], idx)

      if (process.env.NODE_ENV === 'development') {
        console.log('got Index', idx_)
      }
      this.indexes.set(idx_.id_cache, idx_)
    }
  }

  query(queries, filters, found_count, max_count, path_composer) {
    let targets = []

    for (let [id, idx] of this.indexes) {
      if (!Array.from(filters).every((f) => { return idx.id.type === f })) continue

      if (
        Array.from(queries.and).every(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx)) &&
        !Array.from(queries.not).some(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx))

      ) {
        ++found_count

        if (found_count > max_count) {
          return {targets: targets, found_count: found_count}
        }
        targets.push({path: path_composer(this.make_path(idx.page_id)), index: idx})
      }
    }

    return {targets: targets, found_count: found_count}
  }

  make_path(page_id) {
    return `${this.path_prefixes}/${page_id.join('/')}`
  }
}

export {Namespace}

