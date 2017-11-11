import {IndexType as IType} from './index-type'


class Query {
  static Filter = {
    header: IType.header,
  }

  constructor(log, text) {
    this.log = log.makeContext('Query')
    this.original_text = text
    this.frags = ((typeof String.prototype.normalize === 'function') ? text.normalize('NFKC') : text).split(/\s+/).filter(Boolean)

    this.filters = new Set

    // filter <headers>
    if (this.frags[0].match(/^</)) {
      this.filters.add(Query.Filter.header)
      this.frags = this.frags.map((q) => {
        return q.replace(/[<>]/, '').split(/\//)
      }).reduce((a, b) => a.concat(b)).filter(Boolean)
    }

    let real_frags = []
    for (const fr of this.frags) {
      const kv = fr.split(/:/)
      if (kv[0] === 'type') {
        if (!kv[1]) continue

        const types = kv[1].split(/,/)
        for (const t of types) {
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
              this.log.error('unhandled type in query', t)
              break
          }

          if (kind) {
            this.filters.add(kind)
          }
        }

      } else {
        real_frags.push(fr)
      }
    }

    this.frags = real_frags.reduce(
      (l, r) => { r[0] === '-' ? l.not.add(r.substring(1)) : l.and.add(r); return l },
      {and: new Set, not: new Set}
    )
    this.frags.not.delete('')

    // this.log.debug(`parsed query ${this.original_text}`, this.frags, this.filters)
  }
} // Query

export {Query}

