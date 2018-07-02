import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'

import {DOM} from './dom'


class Index {
  constructor(log, cpp_version, id, json, make_url) {
    this._log = log.makeContext('Index')
    this._in_header = null
    this._make_url = make_url
    this._ns = null
    this._is_fake = false

    if (!id) {
      // this._log.debug('fake Index created')
      return
    }

    this._id = id
    this._page_id = json.page_id
    this._related_to = json.related_to
    this._nojump = !!json.nojump
    this._attributes = json.attributes
    this._cpp_version = cpp_version

    // cache
    this._id_cache = this.join()
  }

  isRootArticle() {
    return this._page_id[0].length === 0 /* && [IType.meta, IType.article].includes(this._id.type) */
  }

  type() {
    return this._id.type
  }

  async join_html(opts = DOM.defaultOptions) {
    const container = $('<div>', {'data-index-type': this._id.type}).addClass('cr-index')
    if (IndexID.isClassy(this._id.type)) {
      container.addClass('classy')
    }

    container.append($('<div>', {class: 'type'}))

    const title = $('<div>', {class: 'title'}).appendTo(container)
    title.append(await this._id.join_html(opts))

    let attrs = []
    if (!opts.badges.noselfcpp && this._cpp_version) {
      attrs.push(`added-in-cpp${this._cpp_version}`)
    }
    if (this._attributes) {
      attrs = attrs.concat(this._attributes)
    }

    if (attrs.length) {
      title.append(await DOM.makeBadges(attrs, opts))
    }

    return container
  }

  join() {
    return this._id.join()
  }

  toString() {
    return `Index(${this.join()})`
  }

  static ambgMatch(idx, q) {
    if ([IType.article, IType.meta].includes(idx.id.type)) {
      return idx._id_cache.toLowerCase().includes(q.toLowerCase())
    }

    return idx._id_cache.includes(q)
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

  set ns(ns) {
    this._ns = ns
  }

  get is_fake() {
    return this._is_fake
  }

  set is_fake(is_fake) {
    this._is_fake = is_fake
  }

  get id() {
    return this._id
  }

  set id(id) {
    this._id = id
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

  get id_cache() {
    return this._id_cache
  }

  set id_cache(id_cache) {
    this._id_cache = id_cache
  }
}

export {Index}

