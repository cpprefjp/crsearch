import {IndexType as IType} from './index-type'
import {IndexID} from './index-id'

class Index {
  constructor(log, cpp_version, id, json, make_url) {
    this.log = log.makeContext('Index')
    this.in_header = null
    this.url = () => { return make_url(this) }

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

  type() {
    return this.id.type
  }

  join_html() {
    let container = $('<div>').addClass('index').append(this.id.join_html())

    let attrs = this.attributes || []

    // if (this.cpp_version) {
      // attrs.push(`cpp${this.cpp_version}`)
    // }

    if (attrs.length) {
      let e = $('<ul>').addClass('badges')
      for (const attr of attrs) {
        let b = $('<li>').addClass('badge').addClass(attr)
        if (attr.match('deprecated')) {
          b.addClass('deprecated_spec')
        } else if (attr.match('removed')) {
          b.addClass('removed_spec')
        }
        if (['deprecated_in_latest', 'removed_in_latest'].includes(attr)) {
          b.addClass('latest_spec')
        }
        b.appendTo(e)
      }
      container.append(e)
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
    if ([IType.article, IType.meta].includes(idx.id.type)) {
      return idx.id_cache.toLowerCase().includes(q.toLowerCase())
    }

    return idx.id_cache.includes(q)
  }
}

export {Index}

