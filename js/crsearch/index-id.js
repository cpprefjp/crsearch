import {IndexType as IType} from './index-type'

class IndexID {
  static VERBATIM_TRS = new Map([
    ['コンストラクタ', {to: '(constructor)', only: IType.mem_fun}],
    ['デストラクタ', {to: '(destructor)', only: IType.mem_fun}],
    ['推論補助', {to: '(deduction guide)', only: [IType.header, IType.mem_fun], type: IType.mem_fun}],
    ['初期化', {to: '(initialization)', only: IType.header, type: IType.mem_fun}],
    ['非メンバ関数', {to: 'non-member function', type: IType.function}],
    ['単項', {to: 'unary'}],
  ])

  static composeReverseID(type, keys) {
    return `<:RVID:>/${type}/${keys.join('<::>')}`
  }

  toReverseID() {
    const k = [].concat(this._keys)
    if (IndexID.isClassy(this._type)) {
      k.shift()
      return IndexID.composeReverseID(this._type, k)

    } else {
      return IndexID.composeReverseID(this._type, k)
    }
  }

  static isClassy(type) {
    return [IType.class, IType.function, IType.mem_fun, IType.enum, IType.variable, IType.type_alias].includes(type)
  }

  constructor(log, json) {
    this._log = log.makeContext('IndexID')
    this._type = json.type

    let keys = json.key


    if (IndexID.isClassy(this._type)) {
      const ns = json.cpp_namespace || ['std']

      keys = ns.concat(keys)
    }
    this._keys = keys.map(k => k.normalize('NFKC'))

    for (const [k, v] of IndexID.VERBATIM_TRS) {
      if (v.only && ![].concat(v.only).includes(this._type)) {
        continue
      }

      const last = this._keys[this._keys.length - 1]
      if (last.includes(k)) {
        this._keys[this._keys.length - 1] = last.replace(k, v.to)

        if (v.type) {
          this._type = v.type

          if ([IType.class, IType.mem_fun].includes(this._type) && this._keys[0] !== 'std') {
            this._keys.unshift('std')
          }
        }
      }
    }
  }

  path_join() {
    return this._keys.join('/')
  }

  toString() {
    return `IndexID(${this.join()})`
  }

  join() {
    if (IndexID.isClassy(this._type)) {
      return this._keys.join('::')
    } else if (this._type === IType.header) {
      return `<${this._keys.join()}>`
    } else {
      return this._keys.join()
    }
  }

  async join_html() {
    return $('<ul>').addClass('keys').append(
      this._keys.map(k => $('<li>', {class: 'key'}).text(k))
    )
  }

  get type() {
    return this._type
  }

  get keys() {
    return this._keys
  }
}

export {IndexID}

