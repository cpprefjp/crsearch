import {IndexType as IType} from './index-type'

class IndexID {
  static VERBATIM_TRS = new Map([
    ['コンストラクタ', {to: '(constructor)', only: IType.mem_fun}],
    ['デストラクタ', {to: '(destructor)', only: IType.mem_fun}],
    ['推論補助', {to: '(deduction guide)', type: IType.class}],
    ['非メンバ関数', {to: 'non-member function', type: IType.function}],
    ['単項', {to: 'unary'}],
  ])

  static composeReverseID(type, keys) {
    return `<:RVID:>/${Symbol.keyFor(type)}/${keys.join('<::>')}`
  }

  toReverseID() {
    let k = this.key.map((k) => k.name)
    if (IndexID.isClassy(this.type)) {
      k.shift()
      return IndexID.composeReverseID(this.type, k)

    } else {
      return IndexID.composeReverseID(this.type, k)
    }
  }

  equals(rhs) {
    // return this.id === rhs.id
    return this.s_key === rhs.s_key && this.ns_id === rhs.ns_id
  }

  static isClassy(type) {
    return [IType.class, IType.function, IType.mem_fun, IType.enum, IType.variable, IType.type_alias].includes(type)
  }

  constructor(log, s_key, json) {
    this.log = log.makeContext('IndexID')
    this.cpp_namespace = json.cpp_namespace

    this.s_key = s_key
    let key = json.key

    this.type = ['header', 'namespace', 'class', 'function', 'mem_fun', 'enum', 'variable', 'type-alias', 'macro'].includes(json.type) ? Symbol.for(`cpp-${json.type}`) : Symbol.for(json.type)

    if (IndexID.isClassy(this.type)) {
      let ns = ['std']
      if (json.cpp_namespace) {
        ns = json.cpp_namespace
      }

      // legacy workarounds
      if (key.some((k) => k.match(/::/))) {
        this.log.warn(`Invalid fragment '::' detected. Using legacy fallback until corresponding PR is deployed: https://github.com/cpprefjp/site_generator/pull/39`, key, json)
        let newKey = []
        for (const k of key) {
          if (k.match(/::/)) {
            newKey = newKey.concat(k.split(/::/))
          } else {
            newKey = newKey.concat(k)
          }
        }
        key = newKey
      }

      key = ns.concat(key)
    }

    this.key = key.map((k) => {
      return {name: k.normalize('NFKC')}
    })

    IndexID.VERBATIM_TRS.forEach((v, k) => {
      if (v.only && v.only !== this.type) {
        return
      }

      if (this.key[this.key.length - 1].name.includes(k)) {
        this.key[this.key.length - 1] = {
          name: this.key[this.key.length - 1].name.replace(k, `${v.to}`),
          classes: ['special'],
        }

        if (v.type) {
          this.type = v.type

          if (this.type === IType.class && this.key[0] !== 'std') {
            this.key.unshift({name: 'std'})
          }
        }
      }
    })
  }

  path_join() {
    return this.key.map(k => k.name).join('/')
  }

  toString() {
    return `IndexID(${this.join()})`
  }

  join(hint = this.join_hint()) {
    return `${hint.wrap.left || ''}${this.key.map((k) => k.name).join(hint.delim.text)}${hint.wrap.right || ''}`
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

    this.key.forEach((k) => {
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
    case IType.header:
      hint = {
        wrap: {left: '<', right: '>'},
        delim: {
          name: 'slash',
          text: '/'
        }
      }
      break

    case IType.namespace:
    case IType.class:
    case IType.function:
    case IType.mem_fun:
    case IType.enum:
    case IType.variable:
    case IType.type_alias:
      hint.delim = {
        name: 'ns',
        text: '::'
      }
      break
    }

    return hint
  }
}

export {IndexID}

