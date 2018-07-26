import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'

import {DOM} from './dom'


class Index {
  constructor(log, cpp_version, id, json, make_url, ns) {
    this._log = log.makeContext('Index')
    this._in_header = null
    this._make_url = make_url
    this._ns = ns
    this._id = id
    this._cpp_version = cpp_version

    // cache
    this._name = this._id.name

    if (json) {
      this._is_fake = false
      this._page_id = json.page_id.filter(s => s.length !== 0)
      this._related_to = json.related_to
      this._nojump = !!json.nojump
      this._attributes = json.attributes
    } else {
      // this._log.debug('fake Index created')
      this._is_fake = true
      this._page_id = id.keys.slice(-1)
    }

    Object.seal(this)
  }

  isRootArticle() {
    return this._page_id.length === 0 /* && [IType.meta, IType.article].includes(this._id.type) */
  }

  async join_html(opts = DOM.defaultOptions) {
    const container = $('<div>', {'data-index-type': this._id.type}).addClass('cr-index')
    if (IndexID.isClassy(this._id.type)) {
      container.addClass('classy')
    }

    container.append($('<div>', {class: 'type'}))

    const title = $('<div>', {class: 'title'}).appendTo(container)
    title.append(await this._id.join_html(opts))

    const attrs = []
    if (!opts.badges.noselfcpp && this._cpp_version) {
      attrs.push(`added-in-cpp${this._cpp_version}`)
    }
    if (this._attributes) {
      attrs.push(...this._attributes)
    }

    if (attrs.length) {
      title.append(await DOM.makeBadges(attrs, opts))
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
    if ([IType.article, IType.meta].includes(this._id.type)) {
      return this._name.toLowerCase().includes(q.toLowerCase())
    }

    return this._name.includes(q)
  }

  get in_header() {
    return this._in_header
  }

  set in_header(in_header) {
    this._in_header = in_header
  }

  url() {
    return this._make_url(this)
  }

  get ns() {
    return this._ns
  }

  get is_fake() {
    return this._is_fake
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
}

export {Index}

