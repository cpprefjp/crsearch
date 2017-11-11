import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'

import {DOM} from './dom'

const arrayIncludes = require("core-js/library/fn/array/includes")

class Index {
  constructor(log, cpp_version, id, json, make_url) {
    this.log = log.makeContext('Index')
    this.in_header = null
    this.in_class = null
    this.url = () => { return make_url(this) }
    this.ns = null
    this.is_fake = false

    if (!id) {
      // this.log.debug('fake Index created')
      return
    }

    this.id = id
    this.page_id = json.page_id
    this.related_to = json.related_to
    this.nojump = !!json.nojump
    this.attributes = json.attributes
    this.cpp_version = cpp_version

    // cache
    this.id_cache = this.join()
  }

  isRootArticle() {
    return this.page_id[0].length === 0 /* && arrayIncludes([IType.meta, IType.article], this.id.type) */
  }

  isParent() {
    return this.id.type === IType.header
  }

  getParent() {
    return this.in_header
  }

  type() {
    return this.id.type
  }

  async join_html(opts = DOM.defaultOptions) {
    let container = $('<div>', {'data-index-type': Symbol.keyFor(this.id.type)}).addClass('cr-index')
    if (IndexID.isClassy(this.id.type)) {
      container.addClass('classy')
    }

    container.append($('<div>', {class: 'type'}))

    let title = $('<div>', {class: 'title'}).appendTo(container)
    title.append(await this.id.join_html(opts))

    let attrs = []
    if (!opts.badges.noselfcpp && this.cpp_version) {
      attrs.push(`added-in-cpp${this.cpp_version}`)
    }
    if (this.attributes) {
      attrs = attrs.concat(this.attributes)
    }

    if (attrs.length) {
      title.append(await DOM.makeBadges(attrs, opts))
    }

    return container
  }

  join() {
    return this.id.join()
  }

  toString() {
    return `Index(${this.join()})`
  }

  static ambgMatch(idx, q) {
    if (arrayIncludes([IType.article, IType.meta], idx.id.type)) {
      return arrayIncludes(idx.id_cache.toLowerCase(), q.toLowerCase())
    }

    return arrayIncludes(idx.id_cache, q)
  }
}

export {Index}

