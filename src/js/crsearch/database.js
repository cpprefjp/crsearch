import * as $ from 'jquery'
import {Result} from './result'

class Index {
  static METHOD_TRS = new Map([
    ['コンストラクタ', 'constructor'],
    ['デストラクタ', 'destructor'],
  ])

  static VERBATIM_TRS = new Map([
    ['推論補助', {to: 'deduction guide', type: Symbol.for('cpp-class')}],
    ['単項', {to: 'unary'}],
  ])

  constructor(json) {
    this.type = ['header', 'namespace', 'class', 'function', 'mem_fun', 'enum', 'variable', 'type-alias', 'macro'].includes(json.id.type) ? Symbol.for(`cpp-${json.id.type}`) : Symbol.for(json.id.type)
    this.page_id = json.page_id

    json.id.key = json.id.key.map((v) => {
      return v.normalize('NFKC')
    })

    Index.VERBATIM_TRS.forEach((v, k) => {
      if (json.id.key[json.id.key.length - 1].includes(k)) {
        json.id.key[json.id.key.length - 1] = `(${v.to})`

        if (v.type) {
          this.type = v.type
        }
      }
    })

    switch (this.type) {
    case Result.HEADER:
      this.id = json.id.key
      this.pretty_id = `<${json.id.key.join('/')}>`
      break

    case Result.NAMESPACE:
      this.id = json.id.key
      this.pretty_id = json.id.key.join('::')
      break

    case Result.CLASS:
    case Result.FUNCTION:
    case Result.MEM_FUN:
    case Result.ENUM:
    case Result.VARIABLE:
    case Result.TYPE_ALIAS:
      let ns = ['std']
      if (json.id.cpp_namespace) {
        ns = json.id.cpp_namespace
      }

      if (json.id.type === 'mem_fun') {
        Index.METHOD_TRS.forEach((v, k) => {
          if (json.id.key[json.id.key.length - 1] === k) {
            json.id.key[json.id.key.length - 1] = `(${v})`
          }
        })
      }

      this.id = ns.concat(json.id.key)
      this.pretty_id = `${ns.join('::')}::${json.id.key.join('::')}`
      break

    case Result.MACRO:
    case Result.ARTICLE:
    case Result.META:
      this.id = json.id.key
      this.pretty_id = json.id.key.join('')
      break

    default:
      throw `unhandled type '${this.type}' in Index`
    }
  }

  pretty_name() {
    return this.pretty_id
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
      this.indexes.set(idx_.pretty_id, idx_)
    }
  }

  query(q, found_count, max_count, path_composer) {
    let targets = []
    let queries = q.normalize('NFKC').split(/\s+/).filter(Boolean).reduce(
      (l, r) => { r[0] === '-' ? l.not.add(r.substring(1)) : l.and.add(r); return l },
      {and: new Set, not: new Set}
    )
    queries.not.delete('')
    // console.log(queries)

    const ambgMatch = (idx, q) => {
      if ([Result.ARTICLE, Result.META].includes(idx.type)) {
        return idx.pretty_id.toLowerCase().includes(q.toLowerCase())
      }

      return idx.pretty_id.includes(q)
    }

    for (let [id, idx] of this.indexes) {
      if (
        Array.from(queries.and).every(function(idx, q) { return ambgMatch(idx, q) }.bind(null, idx)) &&
        !Array.from(queries.not).some(function(idx, q) { return ambgMatch(idx, q) }.bind(null, idx))

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

