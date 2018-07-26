import {IndexType as IType} from './index-type'


class Query {
  constructor(log, text) {
    this._log = log.makeContext('Query')
    this._original_text = text

    const filters = new Set
    const and = new Set
    const not = new Set

    const real_frags = []
    for (const fr of text.normalize('NFKC').trim().split(/\s+/)) {
      if (fr.startsWith('type:')) {
        for (const t of fr.substring(5).split(',')) {
          let kind = null
          switch (t) {
            case 'header':     kind = IType.header; break
            case 'namespace':  kind = IType.namespace; break
            case 'class':      kind = IType.class; break
            case 'function':   kind = IType.function; break
            case 'mem_fun':    kind = IType.mem_fun; break
            case 'enum':       kind = IType.enum; break
            case 'variable':   kind = IType.variable; break
            case 'type-alias': kind = IType.type_alias; break
            case 'macro':      kind = IType.macro; break
            case 'article':    kind = IType.article; break
            case 'meta':       kind = IType.meta; break

            default:
              this._log.error('unhandled type in query', t)
              break
          }

          if (kind) {
            filters.add(kind)
          }
        }

      } else if (fr[0] === '-') {
        if (fr.length > 1) {
          not.add(fr.substring(1))
        }
      } else {
        and.add(fr)
      }
    }

    this._filters = filters
    this._and = Array.from(and)
    this._not = Array.from(not)

    // this._log.debug(`parsed query ${this._original_text}`, this._and, this._not, this._filters)
    Object.freeze(this)
  }

  match(idx) {
    return (this._filters.size === 0 || this._filters.has(idx.type)) &&
           this._and.every(s => idx.ambgMatch(s)) &&
           !this._not.some(s => idx.ambgMatch(s))
  }

  get original_text() {
    return this._original_text
  }
} // Query

export {Query}

