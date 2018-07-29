import IType from './index-type'
import Index from './index'

export default class Namespace {
  constructor(log, json, db) {
    this._log = log.makeContext('Namespace')
    this._indexes = new Map
    this._namespace = json.namespace
    this._db = db
    this._path_prefixes = this._namespace.join('/')
    this._all_headers = new Map
    this._all_articles = new Set
    this._root_article = null

    Object.seal(this)

    this.merge(json)
  }

  merge(json) {
    const cpp_version = json.cpp_version || null
    const extra_path = this._extraPath(json.path_prefixes || this._namespace)

    for (const j_idx of json.indexes) {
      const idx = this._createIndex(cpp_version, this._db.getIndexID(j_idx.id), j_idx, extra_path)
      this._indexes.set(idx.path, idx)
    }
  }

  _extraPath(path_prefixes) {
    return path_prefixes.slice(this._namespace.length)
  }

  _createIndex(cpp_version, iid, j_idx, extra_path) {
    return new Index(this._log, cpp_version, iid, j_idx, extra_path, this)
  }

  init() {
    for (const path of Array.from(this._indexes.keys()).sort()) {
      const idx = this._indexes.get(path)
      this._resolveRelatedTo(idx)

      this._db.all_fullpath_pages.set(idx.fullpath, idx)

      if (idx.type === IType.header) {
        this._initHeader(idx)

      } else if (IType.isContainer(idx.type)) {
        this._initClass(idx)

      } else if (IType.isArticles(idx.type)) {
        if (idx.isRootArticle()) {
          this._root_article = idx
        } else {
          this._all_articles.add(idx)
        }

      } else {
        const h = this._all_headers.get(idx.in_header)
        const cand = this._indexes.get(idx.parentPath)

        if (cand && h.classes.has(cand)) {
          idx.parent = cand
          h.classes.get(cand).add(idx)
        } else {
          h.others.add(idx)
        }
      }
    }
  }

  _resolveRelatedTo(idx) {
    if (!idx.related_to) {
      return
    }

    const deref_related_to = new Set

    for (const rsid of idx.related_to) {
      const rid = this._db.getIndexID(rsid)

      if (rid.type === IType.header) {
        let found = null
        const indexes = rid.indexes
        if (indexes.length === 0) {
          found = this._createIndex(idx.cpp_version, rid, null, [])
          if (found.name === '<header_name>') {
            // shit
            continue
          }
          this._indexes.set(found.name, found)

          this._log.warn(`no namespace has this index; fake indexing '${found.name}' --> '${idx.name}'`, 'namespace:', this._pretty_name(), '\nfake index:', found, '\nself:', idx.name)

          found.in_header = found
          this._initHeader(found)
        } else {
          found = indexes[0]
        }

        idx.in_header = found
        deref_related_to.add(found)
      } // header
    } // deref related_to loop

    idx.related_to = deref_related_to
  }

  _initHeader(hdr) {
    const h = {classes: new Map, others: new Set}
    this._all_headers.set(hdr, h)
  }

  _initClass(cls) {
    const hdr = cls.in_header
    const h = this._all_headers.get(hdr)
    h.classes.set(cls, new Set)
  }

  makeTree(kc) {
    return {
      category: kc.categories().get(this._namespace[0]),
      namespace: this,
      root: this._root_article,
      articles: Array.from(this._all_articles).sort((a, b) =>
        a.name < b.name ? -1 : 1
      ),
      headers: Array.from(this._all_headers, ([hdr, h]) => ({
        self: hdr,
        classes: Namespace._makeClassTree(h.classes, kc),
        others: Namespace._makeOtherTree(h.others),
      })).sort((a, b) => a.self.name < b.self.name ? -1 : 1)
    }
  }

  static _makeClassTree(classes, kc) {
    return Array.from(classes.entries(), ([cls, members]) => ({
      self: cls,
      members: Array.from(members).sort((a_, b_) => {
        const a = kc.makeMemberData(a_)
        const b = kc.makeMemberData(b_)

        if (a.i < b.i) {
          return -1
        } else if (a.i > b.i) {
          return 1
        } else {
          return a.name < b.name ? -1 : 1
        }
      })
    })).sort((a, b) => a.self.name < b.self.name ? -1 : 1)
  }

  static _makeOtherTree(others) {
    return Array.from(others).sort((a, b) => {
      if (a.type < b.type) {
        return -1
      } else if (a.type > b.type) {
        return 1
      } else {
        return a.name < b.name ? -1 : 1
      }
    })
  }

  query(q) {
    const targets = []

    for (const idx of this._indexes.values()) {
      if (q.match(idx)) {
        targets.push(idx)
      }
    }

    return targets
  }

  _pretty_name() {
    return this._namespace.join(' \u226B')
  }

  get namespace() {
    return this._namespace
  }

  get base_url() {
    return this._db.base_url
  }
}
