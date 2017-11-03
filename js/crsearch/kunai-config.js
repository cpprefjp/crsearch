import {IndexType as IType} from './index-type'
import {default as Marked} from 'marked'

const MarkedOpts = {
  gfm: true,
  tables: true,
}

//
// Reference implementation for https://github.com/cpprefjp/kunai_config
//

const Prop = {
  toplevel_category: Symbol.for('TOPLEVEL_CATEGORY'),
  order_priority: Symbol.for('order_priority'),
}

class Priority {
  constructor(i) {
    this.i = i
  }

  toString() {
    return `Priority(${this.i})`
  }
}

class UnhandledHeading {
  constructor(token) {
    this.reason = `unhandled heading '${token.get('text')}'`
    this.args = arguments
  }
}

class ArticleCategory {
  constructor(index, name) {
    this.index = index
    this.name = name
  }
}

class ArticleProcessor {
  constructor() {
    this.categories = new Map
    this.single_bufs = []

    this.currentIndex = 0

    this.zoneProc = new Map([
      [
        Prop.toplevel_category, {
          'list_item_start': () => {
            this.single_bufs.push('')
          },
          'list_item_end': () => {
            const buf = this.single_bufs.pop()
            // console.log(buf)

            const m = buf.match(/^([^[]+)\[([^\]]+)\]$/)
            if (!m) {
              throw new Error(`[BUG] unhandled format ${buf}`)
            }

            this.categories.set(
              m[2],
              new ArticleCategory(
                this.currentIndex++, m[1]
              )
            )
          },
          'text': (token) => {
            // console.log(token)
            this.single_bufs[this.single_bufs.length - 1] += token.get('text').trim()
          },
        }
      ],
    ])
  }

  process(tokens) {
    for (const token of tokens) {
      this.process_single(token)
    }
    return this.categories
  }

  process_single(token) {
    const type = token.get('type')

    switch (type) {
      case 'heading': {
        try {
          if (token.get('depth') !== 2) {
            break
          }

          const heading = Symbol.for(token.get('text').trim())
          if (!this.zoneProc.has(heading)) {
            throw new UnhandledHeading(token)
          }

          this.currentZoneProc = this.zoneProc.get(heading)

        } catch (e) {
          if (e instanceof UnhandledHeading) {
            console.log('skipping!', e)
            this.currentZoneProc = null

          } else {
            throw e
          }
        }
        break
      }

      default: {
        if (this.currentZoneProc) {
          const proc = this.currentZoneProc[type]
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
    let lexer = new Marked.Lexer(MarkedOpts)

    return proc.process(lexer.lex(md_raw).map(e => {
      return new Map(Object.entries(e))
    }))
  }

  constructor(data) {
    this.article = new Map
    {
      const e = Config.parseMD(data['article.md'], new ArticleProcessor)
      console.log(e)
      this.article.set(
        Prop.toplevel_category,
        e
      )
    }

    this.cpp_json = new Map
    this.cpp_json.set(Prop.order_priority, data['cpp.json']['order_priority'].map((e) => {
      // e[0]: id
      // e[1]: description
      // console.log(e)

      return e[0]
    }))

    this.prioSpecials = new Map
    for (const [i, cfg] of this.getData(Prop.order_priority).entries()) {
      if (cfg.match(/^__/)) {
        this.prioSpecials.set(cfg, new Priority(i))
      }
    }
  }

  getData(prop) {
    return this.cpp_json.get(prop)
  }

  categories() {
    return this.article.get(Prop.toplevel_category)
  }

  priorityForIndex(idx) {
    if (!idx.page_id || !idx.page_id.length) {
      return new Priority(-42)
    }
    if (idx.type() === IType.header) {
      return new Priority(-10)
    }

    const key = idx.page_id[idx.page_id.length - 1]

    for (const [i, cfg] of this.cpp_json.get(Prop.order_priority).entries()) {
      if (cfg === key) {
        // exact match
        return new Priority(i)
      }

      if (key.match(/^op_/)) {
        return this.prioSpecials.get('__converter__')
      }

      if (key.match(/^type-/)) {
        return this.prioSpecials.get('__types__')
      }

      return this.prioSpecials.get('__functions__')
    }
  }
}

export {Prop, Priority, Config}

