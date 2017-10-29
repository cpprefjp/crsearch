import {Result} from './result'


class Query {
  static Filter = {
    header: Result.HEADER,
  }

  constructor(log, text) {
    this.log = log.makeContext('Query')
    this.original_text = text
    this.frags = text.normalize('NFKC').split(/\s+/).filter(Boolean)

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
            case 'header':     kind = Result.HEADER; break
            case 'namespace':  kind = Result.NAMESPACE; break
            case 'class':      kind = Result.CLASS; break
            case 'function':   kind = Result.FUNCTION; break
            case 'mem_fun':    kind = Result.MEM_FUN; break
            case 'enum':       kind = Result.ENUM; break
            case 'variable':   kind = Result.VARIABLE; break
            case 'type-alias': kind = Result.TYPE_ALIAS; break
            case 'macro':      kind = Result.MACRO; break
            case 'article':    kind = Result.ARTICLE; break
            case 'meta':       kind = Result.META; break

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

    this.log.debug(`parsed query ${this.original_text}`, this.frags, this.filters)
  }
} // Query

export {Query}

