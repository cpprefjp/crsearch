import {IndexType as IType} from './index-type'

class IndexID {
  static VERBATIM_TRS = new Map([
    ['コンストラクタ', {to: '(constructor)', only: [IType.mem_fun]}],
    ['デストラクタ', {to: '(destructor)', only: [IType.mem_fun]}],
    ['推論補助', {to: '(deduction guide)', only: [IType.header, IType.mem_fun], type: IType.mem_fun}],
    ['初期化', {to: '(initialization)', only: [IType.header, IType.mem_fun], type: IType.mem_fun}],
    ['非メンバ関数', {to: 'non-member function', type: IType.function}],
    ['単項', {to: 'unary'}],
  ])

  static isClassy(type) {
    return [IType.class, IType.function, IType.mem_fun, IType.enum, IType.variable, IType.type_alias, IType.namespace].includes(type)
  }

  constructor(log, json) {
    this._log = log.makeContext('IndexID')
    this._type = json.type
    this._indexes = []

    const keys = json.key.map(k => k.normalize('NFKC'))
    for (const [k, v] of IndexID.VERBATIM_TRS) {
      if (v.only && !v.only.includes(this._type)) {
        continue
      }

      const last = keys[keys.length - 1]
      if (last.includes(k)) {
        keys[keys.length - 1] = last.replace(k, v.to)

        if (v.type) {
          this._type = v.type
        }
      }
    }

    if (IndexID.isClassy(this._type)) {
      const ns = json.cpp_namespace || ['std']
      keys.unshift(...ns)
    }
    this._keys = keys

    this._name = this._generateName()

    Object.freeze(this)
  }

  _generateName() {
    if (IndexID.isClassy(this._type)) {
      return this._keys.join('::')
    } else if (this._type === IType.header) {
      return `<${this._keys.join()}>`
    } else {
      return this._keys.join()
    }
  }

  toString() {
    return `IndexID(${this._name})`
  }

  join() {
    return this._name
  }

  async join_html() {
    return $('<ul>').addClass('keys').append(
      this._keys.map(k => $('<li>', {class: 'key'}).text(k))
    )
  }

  add_index(idx) {
    this._indexes.push(idx)
  }

  get type() {
    return this._type
  }

  get keys() {
    return this._keys
  }

  get name() {
    return this._name
  }

  get indexes() {
    return this._indexes
  }
}

export {IndexID}

