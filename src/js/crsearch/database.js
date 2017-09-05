import * as $ from 'jquery'
import {Result} from './result'

class Index {
  constructor(json) {
    this.type = ['namespace', 'class', 'function', 'mem_fun', 'enum', 'variable', 'type-alias', 'macro'].includes(json.id.type) ? Symbol.for(`cpp-${json.id.type}`) : Symbol.for(json.id.type)
    this.page_id = json.page_id

    switch (json.id.type) {
    case 'header':
      this.id = `<${json.id.key.join('/')}>`
      break

    case 'namespace':
      this.id = json.id.key.join('::')
      break

    case 'class':
    case 'function':
    case 'mem_fun':
    case 'enum':
    case 'variable':
    case 'type-alias':
      let ns = 'std'
      if (json.id.cpp_namespace) {
        ns = json.id.cpp_namespace.join('::')
      }
      ns += '::'

      const entity = json.id.key.join('::')

      this.id = `${ns}${entity}`
      break

    case 'macro':
    case 'article':
    case 'meta':
      this.id = json.id.key.join('')
      break

    default:
      throw `unhandled type '${json.id.type}' in Index`
    }
  }

  pretty_name() {
    return this.id
  }
}

class Namespace {
  constructor(json) {
    this.indexes = new Map
    this.namespace = json.namespace

    if (json.path_prefixes) {
      this.path_prefixes = json.path_prefixes.join('/')
    } else {
      this.path_prefixes = this.namespace.join('/')
    }

    for (const idx of json.indexes) {
      const idx_ = new Index(idx)
      console.log('got Index', idx_)
      this.indexes.set(idx_.id, idx_)
    }
  }

  query(q, found_count, max_count, path_composer) {
    let targets = []

    for (const [id, idx] of this.indexes) {
      if (id.search(q) != -1) {
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

class Database {
  constructor(json) {
    this.name = json.database_name
    this.base_url = new URL(json.base_url)
    this.namespaces = []

    for (const ns of json.namespaces) {
      this.namespaces.push(new Namespace(ns))
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
export {Index, Database}

