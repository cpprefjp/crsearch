import IType from './index-type'
import { Marked } from 'marked'

const MarkedOpts = {
  gfm: true,
  tables: true,
}

//
// Reference implementation for https://github.com/cpprefjp/kunai_config
//

const Prop = {
  toplevel_category: 'TOPLEVEL_CATEGORY',
  order_priority: 'order_priority',
}

class Priority {
  constructor(index, name) {
    this.index = index
    this.name = name

    Object.freeze(this)
  }

  toString() {
    return `Priority(#${this.index}, '${this.name}')`
  }
}

class UnhandledHeading {
  constructor(token) {
    this.reason = `unhandled heading '${token.get('text')}'`
    this.args = arguments

    Object.freeze(this)
  }
}

class ArticleProcessor {
  constructor() {
    this._categories = new Map
    this._single_bufs = []

    this._currentIndex = 0

    this._zoneProc = new Map([
      [
        Prop.toplevel_category, {
          'list_item_start': () => {
            this._single_bufs.push('')
          },
          'list_item_end': () => {
            const buf = this._single_bufs.pop()
            // console.log(buf)

            const m = buf.match(/^([^[]+)\[([^\]]+)\]$/)
            if (!m) {
              throw new Error(`[BUG] unhandled format ${buf}`)
            }

            this._categories.set(
              m[2],
              new Priority(
                this._currentIndex++, m[1]
              )
            )
          },
          'text': token => {
            // console.log(token)
            this._single_bufs[this._single_bufs.length - 1] += token.get('text').trim()
          },
        }
      ],
    ])

    this._currentZoneProc = null

    Object.seal(this)
  }

  process(tokens) {
    for (const token of tokens) {
      this._process_single(token)
    }
    return this._categories
  }

  _process_single(token) {
    const type = token.get('type')

    switch (type) {
      case 'heading': {
        try {
          if (token.get('depth') !== 2) {
            break
          }

          const heading = token.get('text').trim()
          if (!this._zoneProc.has(heading)) {
            throw new UnhandledHeading(token)
          }

          this._currentZoneProc = this._zoneProc.get(heading)

        } catch (e) {
          if (e instanceof UnhandledHeading) {
            // console.log('skipping!', e)
            this._currentZoneProc = null

          } else {
            throw e
          }
        }
        break
      }

      default: {
        if (this._currentZoneProc) {
          const proc = this._currentZoneProc[type]
          if (proc) {
            proc(token)
          }
        }
        break
      }
    }
  }
}

class Config {
  static Prop = Prop

  static parseMD(md_raw, proc) {
    const lexer = new Marked.Lexer(MarkedOpts)

    return proc.process(lexer.lex(md_raw).map(e =>
      new Map(Object.entries(e))
    ))
  }

  constructor(data) {
    this._article = new Map
    {
      const e = Config.parseMD(data['article.md'], new ArticleProcessor)
      // console.log(e)
      this._article.set(
        Prop.toplevel_category,
        e
      )
    }

    let i = 0
    this._cpp_json = new Map
    this._cpp_json.set(Prop.order_priority, new Map(data['cpp.json']['order_priority'].map(e =>
      // e[0]: id
      // e[1]: description
      // console.log(e)

      [e[0], [i++, e]]
    )))

    this._prioSpecials = new Map
    for (const [k, [i, [key, desc]]] of this._getData(Prop.order_priority)) {
      if (key.match(/^__/)) {
        this._prioSpecials.set(key, new Priority(i, key))
      }
    }

    Object.freeze(this)
  }

  _getData(prop) {
    return this._cpp_json.get(prop)
  }

  categories() {
    return this._article.get(Prop.toplevel_category)
  }

  getPriorityForIndex(idx) {
    if (!idx.page_id || !idx.page_id.length) {
      throw [1]
    }
    if (IType.isHeader(idx.type)) {
      throw [2]
    }

    const key = idx.page_id[idx.page_id.length - 1]
    // console.log(`key: ${key}`)

    if (this._cpp_json.get(Prop.order_priority).has(key)) {
      // exact match
      return new Priority(this._cpp_json.get(Prop.order_priority).get(key)[0], key)
    }

    if (key.match(/^op_/)) {
      return this._prioSpecials.get('__converter__')
    }

    if (key.match(/^type-/)) {
      return this._prioSpecials.get('__types__')
    }

    return this._prioSpecials.get('__functions__')
  }

  makeMemberData(t) {
    return {
      i: this.getPriorityForIndex(t).index,
      name: t.id.keys[t.id.keys.length - 1],
    }
  }

  get prioSpecials() {
    return this._prioSpecials
  }
}

export {Prop, Priority, Config}
