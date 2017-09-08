import * as $ from 'jquery'
import {Result} from './result'

class IndexKey {
  static VERBATIM_TRS = new Map([
    ['コンストラクタ', {to: '(constructor)', only: Result.MEM_FUN}],
    ['デストラクタ', {to: '(destructor)', only: Result.MEM_FUN}],
    ['推論補助', {to: '(deduction guide)', type: Result.CLASS}],
    ['単項', {to: 'unary'}],
  ])

  constructor(json) {
    this.type = ['header', 'namespace', 'class', 'function', 'mem_fun', 'enum', 'variable', 'type-alias', 'macro'].includes(json.id.type) ? Symbol.for(`cpp-${json.id.type}`) : Symbol.for(json.id.type)

    let keys = json.id.key

    switch (this.type) {
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

      keys = ns.concat(json.id.key)
      break
    }

    this.keys = keys.map((k) => {
      return {name: k.normalize('NFKC')}
    })

    IndexKey.VERBATIM_TRS.forEach((v, k) => {
      if (v.only && v.only !== this.type) {
        return
      }

      if (this.keys[this.keys.length - 1].name.includes(k)) {
        this.keys[this.keys.length - 1] = {
          name: this.keys[keys.length - 1].name.replace(k, `${v.to}`),
          classes: ['special'],
        }

        if (v.type) {
          this.type = v.type

          if (this.type === Result.CLASS && this.keys[0] !== 'std') {
            this.keys.unshift({name: 'std'})
          }
        }
      }
    })
  }

  join(hint = this.join_hint()) {
    return `${hint.wrap.left || ''}${this.keys.map((k) => k.name).join(hint.delim.text)}${hint.wrap.right || ''}`
  }

  join_html(hint = this.join_hint()) {
    let container  = $(`<div class="key-container delim-${hint.delim.name}" />`)
    if (hint.wrap.left) {
      let e = $('<span class="wrap" />')
      e.text(hint.wrap.left)
      e.appendTo(container)
    }

    let keys = $('<div class="keys" />')
    keys.appendTo(container)

    this.keys.forEach((k) => {
      let e = $('<span class="key" />')

      if (k.classes) {
        k.classes.forEach((c) =>
          e.addClass(c)
        )
      }
      e.text(k.name)
      e.appendTo(keys)
    })

    if (hint.wrap.right) {
      let e = $('<span class="wrap" />')
      e.text(hint.wrap.right)
      e.appendTo(container)
    }

    return container
  }

  join_hint() {
    let hint = {delim: {name: 'none', text: ''}, wrap: {}}

    switch (this.type) {
    case Result.HEADER:
      hint = {
        wrap: {left: '<', right: '>'},
        delim: {
          name: 'slash',
          text: '/'
        }
      }
      break

    case Result.NAMESPACE:
    case Result.CLASS:
    case Result.FUNCTION:
    case Result.MEM_FUN:
    case Result.ENUM:
    case Result.VARIABLE:
    case Result.TYPE_ALIAS:
      hint.delim = {
        name: 'ns',
        text: '::'
      }
      break
    }

    return hint
  }
}

class Index {
  constructor(json) {
    this.page_id = json.page_id
    this.key = new IndexKey(json)

    // cache
    this.key_cache = this.join()
  }

  type() {
    return this.key.type
  }

  join_html() {
    return this.key.join_html()
  }

  join() {
    return this.key.join()
  }

  static ambgMatch(idx, q) {
    if ([Result.ARTICLE, Result.META].includes(idx.type)) {
      return idx.key_cache.toLowerCase().includes(q.toLowerCase())
    }

    return idx.key_cache.includes(q)
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
      this.indexes.set(idx_.key_cache, idx_)
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

    for (let [id, idx] of this.indexes) {
      if (
        Array.from(queries.and).every(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx)) &&
        !Array.from(queries.not).some(function(idx, q) { return Index.ambgMatch(idx, q) }.bind(null, idx))

      ) {
        console.log('match', idx)
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

