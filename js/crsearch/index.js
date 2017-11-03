import {Result} from './result'
import {IndexID} from './index-id'

class Index {
  constructor(log, id, json, make_url) {
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

    // cache
    this.id_cache = this.join()
  }

  type() {
    return this.id.type
  }

  join_html() {
    return this.id.join_html()
  }

  join() {
    return this.id.join()
  }

  static ambgMatch(idx, q) {
    if ([Result.ARTICLE, Result.META].includes(idx.id.type)) {
      return idx.id_cache.toLowerCase().includes(q.toLowerCase())
    }

    return idx.id_cache.includes(q)
  }
}

export {Index}

