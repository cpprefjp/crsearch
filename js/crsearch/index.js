import IType from './index-type'
import DOM from './dom'

import URL from 'url-parse'


export default class Index {
  constructor(log, cpp_version, id, json, extra_path, ns) {
    this._log = log.makeContext('Index')
    this._in_header = null
    this._parent = null
    this._ns = ns
    this._id = id
    this._cpp_version = cpp_version

    // cache
    this._name = this._id.name

    if (json) {
      this._page_id = extra_path.concat(json.page_id.filter(s => s.length !== 0))
      this._related_to = json.related_to
      this._nojump = !!json.nojump
      this._attributes = json.attributes
    } else {
      // this._log.debug('fake Index created')
      this._page_id = id.keys.slice(-1)
    }

    Object.seal(this)

    id.add_index(this)
  }

  isRootArticle() {
    return this._page_id.length === 0 /* && IType.isArticles(this._id.type) */
  }

  join_html(opts = DOM.defaultOptions) {
    const container = $('<div>', {'data-index-type': this._id.type}).addClass('cr-index')
    if (IType.isClassy(this._id.type)) {
      container.addClass('classy')
    }

    container.append($('<div>', {class: 'type'}))

    const title = $('<div>', {class: 'title'}).appendTo(container)
    title.append(this._id.join_html(opts))

    const attrs = []
    if (!opts.badges.noselfcpp && this._cpp_version) {
      attrs.push(`added-in-cpp${this._cpp_version}`)
    }
    if (this._attributes) {
      attrs.push(...this._attributes)
    }

    if (attrs.length) {
      title.append(DOM.makeBadges(attrs, opts))
    }

    return container
  }

  join() {
    return this._name
  }

  toString() {
    return `Index(${this._name})`
  }

  ambgMatch(q) {
    if (IType.isArticles(this._id.type)) {
      return this._name.toLowerCase().includes(q.toLowerCase())
    }

    return this._name.includes(q)
  }

  ambgMatchMulti(q) {
    if (IType.isArticles(this._id.type)) {
      return this._name.toLowerCase().includes(q.toLowerCase())
    }

    return this._name.includes(q) ||
      this._in_header && this._in_header._name.includes(q) ||
      this._parent && this._parent._name.includes(q)
  }

  get in_header() {
    return this._in_header
  }

  set in_header(in_header) {
    this._in_header = in_header
  }

  set parent(parent) {
    this._parent = parent
  }

  url() {
    return new URL(`/${this.fullpath}.html`, this._ns.base_url)
  }

  get ns() {
    return this._ns
  }

  get id() {
    return this._id
  }

  get page_id() {
    return this._page_id
  }

  get related_to() {
    return this._related_to
  }

  set related_to(related_to) {
    this._related_to = related_to
  }

  get cpp_version() {
    return this._cpp_version
  }

  get name() {
    return this._name
  }

  get type() {
    return this._id.type
  }

  get path() {
    return this._page_id.join('/')
  }

  get parentPath() {
    return this._page_id.slice(0, -1).join('/')
  }

  get fullpath() {
    return this._ns.namespace.concat(this._page_id).join('/')
  }

  get isNoJump() {
    return this._nojump
  }

  static compare(aidx, bidx) {
    const ahdr = aidx._in_header
    const bhdr = bidx._in_header
    const ahname = ahdr && ahdr._name
    const bhname = bhdr && bhdr._name
    if (ahname !== bhname) {
      return ahname < bhname ? -1 : 1
    }
    const aname = aidx._name
    const bname = bidx._name
    if (aname !== bname) {
      return aname < bname ? -1 : 1
    }
    return aidx.path < bidx.path ? -1 : 1
  }
}
