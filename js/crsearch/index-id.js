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
    let k = [].concat(this.keys)
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
    this.type = Symbol.for(json.type)

    this.s_key = s_key
    let keys = json.key


    if (IndexID.isClassy(this.type)) {
      let ns = ['std']
      if (json.cpp_namespace) {
        ns = json.cpp_namespace
      }

      // legacy workarounds
      if (keys.some((k) => k.match(/::/))) {
        this.log.warn(`Invalid fragment '::' detected. Using legacy fallback until corresponding PR is deployed: https://github.com/cpprefjp/site_generator/pull/39`, keys, json)
        let newKey = []
        for (const k of keys) {
          if (k.match(/::/)) {
            newKey = newKey.concat(k.split(/::/))
          } else {
            newKey = newKey.concat(k)
          }
        }
        keys = newKey
      }

      keys = ns.concat(keys)
    }
    this.cpp_namespace = keys

    this.keys = keys.map((k) => k.normalize('NFKC'))

    for (const [k, v] of IndexID.VERBATIM_TRS) {
      if (v.only && v.only !== this.type) {
        return
      }

      if (this.keys[this.keys.length - 1].includes(k)) {
        this.keys[this.keys.length - 1] = this.keys[this.keys.length - 1].replace(k, `${v.to}`)

        if (v.type) {
          this.type = v.type

          if (this.type === IType.class && this.keys[0] !== 'std') {
            this.keys.unshift('std')
          }
        }
      }
    }
  }

  path_join() {
    return this.keys.join('/')
  }

  toString() {
    return `IndexID(${this.join()})`
  }

  join() {
    if (IndexID.isClassy(this.type)) {
      return `${this.keys.join('::')}`
    } else {
      if (this.type === IType.header) {
        return `<${this.keys.join()}>`
      } else {
        return this.keys.join()
      }
    }
  }

  async join_html() {
    return $('<ul>').addClass('keys').append(
      this.keys.map((k) => $('<li>', {class: 'key'}).text(k))
    )
  }
}

export {IndexID}

