import Index from './index'
import IndexID from './index-id'
import Namespace from './namespace'

import URL from 'url-parse'


export default class Database {
  constructor(log, json) {
    const runID = JSON.stringify({name: 'Database::constructor', timestamp: Date.now()})
    console.time(runID)

    this._log = log.makeContext('Database')
    this._name = json.database_name
    this._base_url = new URL(json.base_url)
    this._online_base_url = json.online_base_url ? new URL(json.online_base_url) : null
    this._path_ns_map = new Map
    this._ids = []

    // global map
    this._all_fullpath_pages = new Map

    this._log.debug('[P1] initializing all IndexID...')
    for (const id of json.ids) {
      const iid = new IndexID(this._log, id)
      this._ids.push(iid)
    }

    this._log.debug('[P1] initializing all Namespace...')
    for (const j_ns of json.namespaces) {
      const path = j_ns.namespace.join('/')
      let ns = this._path_ns_map.get(path)
      if (ns) {
        ns.merge(j_ns)
      } else {
        ns = new Namespace(this._log, j_ns, this)
        this._path_ns_map.set(path, ns)
      }
    }

    this._log.info('[P2] generating reverse maps...')
    for (const ns of this._path_ns_map.values()) {
      ns.init()
    }

    console.timeEnd(runID)
    this._log.info('initialized.', this._all_pages)

    Object.freeze(this)
  }

  getTree(kc) {
    const runID = JSON.stringify({name: 'Database::getTree', timestamp: Date.now()})
    console.time(runID)

    const toplevels = Array.from(this._path_ns_map.values(),
      ns => ns.makeTree(kc)
    ).sort((a, b) =>
      a.category.index < b.category.index ? -1 : 1
    )

    console.timeEnd(runID)
    return toplevels
  }

  query(q, max_count) {
    const targets = []

    for (const ns of this._path_ns_map.values()) {
      targets.push(...ns.query(q))
    }

    // 検索クエリとの完全一致を優先するソート
    const grouped_targets = targets.sort((aidx, bidx) => {
      // 名前の最後の部分（名前空間を除いた部分）を取得
      const getLastPart = (name) => {
        const parts = name.split('::')
        return parts[parts.length - 1]
      }

      // 検索クエリとの完全一致を判定（フル名）
      const aExactFull = q._and.some(s => aidx._name === s)
      const bExactFull = q._and.some(s => bidx._name === s)

      // 完全一致（フル名）を最優先
      if (aExactFull && !bExactFull) return -1
      if (!aExactFull && bExactFull) return 1

      // 名前空間を除いた部分での完全一致を判定
      const aExactPart = q._and.some(s => getLastPart(aidx._name) === s)
      const bExactPart = q._and.some(s => getLastPart(bidx._name) === s)

      // 名前空間を除いた部分での完全一致を次に優先
      if (aExactPart && !bExactPart) return -1
      if (!aExactPart && bExactPart) return 1

      // 完全一致でない場合、元のcompareロジックを使用
      return Index.compare(aidx, bidx)
    }).slice(0, max_count).reduce(
      (gr, index) => {
        const hdr = index.in_header
        let indexes = gr.get(hdr)
        if (!indexes) {
          indexes = []
          gr.set(hdr, indexes)
        }
        indexes.push(index)
        return gr
      }, new Map
    )

    return {targets: grouped_targets, found_count: targets.length}
  }

  getIndexID(n) {
    return this._ids[n]
  }

  get name() {
    return this._name
  }

  get base_url() {
    return this._base_url
  }

  get online_base_url() {
    return this._online_base_url
  }

  get all_fullpath_pages() {
    return this._all_fullpath_pages
  }
}
