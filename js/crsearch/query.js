import {Result} from './result'


class Query {
  static Filter = {
    header: Result.HEADER,
  }

  constructor(log, text) {
    this.log = log.make_context(this.constructor.name)
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

    this.frags = this.frags.reduce(
      (l, r) => { r[0] === '-' ? l.not.add(r.substring(1)) : l.and.add(r); return l },
      {and: new Set, not: new Set}
    )
    this.frags.not.delete('')

    this.log.debug(`parsed query ${this.original_text}`, this.frags, this.filters)
  }
} // Query

export {Query}

