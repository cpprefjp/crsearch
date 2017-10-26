import {Result} from './result'
import {IndexID} from './index-id'

class Index {
  constructor(log, id, json) {
    this.log = log.make_context(this.constructor.name)
    if (!id) {
      // this.log.debug('fake Index created')
      return
    }

    this.id = id
    this.page_id = json.page_id
    this.related_to = json.related_to

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

