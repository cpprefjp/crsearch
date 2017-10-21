import {Result} from './result'

class IndexID {
  static VERBATIM_TRS = new Map([
    ['コンストラクタ', {to: '(constructor)', only: Result.MEM_FUN}],
    ['デストラクタ', {to: '(destructor)', only: Result.MEM_FUN}],
    ['推論補助', {to: '(deduction guide)', type: Result.CLASS}],
    ['非メンバ関数', {to: 'non-member function', type: Result.FUNCTION}],
    ['単項', {to: 'unary'}],
  ])

  equals(rhs) {
    // return this.id === rhs.id
    return this.s_key === rhs.s_key && this.ns_id === rhs.ns_id
  }

  constructor(s_key, json) {
    this.s_key = s_key
    let key = json.key

    this.type = ['header', 'namespace', 'class', 'function', 'mem_fun', 'enum', 'variable', 'type-alias', 'macro'].includes(json.type) ? Symbol.for(`cpp-${json.type}`) : Symbol.for(json.type)

    switch (this.type) {
    case Result.CLASS:
    case Result.FUNCTION:
    case Result.MEM_FUN:
    case Result.ENUM:
    case Result.VARIABLE:
    case Result.TYPE_ALIAS:
      let ns = ['std']
      if (json.cpp_namespace) {
        ns = json.cpp_namespace
      }

      key = ns.concat(key)
      break
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

          if (this.type === Result.CLASS && this.key[0] !== 'std') {
            this.key.unshift({name: 'std'})
          }
        }
      }
    })
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

export {IndexID}

