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
  constructor(index, name) {
    this.index = index
    this.name = name
  }

  toString() {
    return `Priority(#${this.index}, '${this.name}')`
  }
}

class UnhandledHeading {
  constructor(token) {
    this.reason = `unhandled heading '${token.get('text')}'`
    this.args = arguments
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
              new Priority(
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
            // console.log('skipping!', e)
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
      // console.log(e)
      this.article.set(
        Prop.toplevel_category,
        e
      )
    }

    let i = 0
    this.cpp_json = new Map
    this.cpp_json.set(Prop.order_priority, new Map(data['cpp.json']['order_priority'].map((e) => {
      // e[0]: id
      // e[1]: description
      // console.log(e)

      return [e[0], [i++, e]]
    })))

    this.prioSpecials = new Map
    for (const [k, [i, [key, desc]]] of this.getData(Prop.order_priority)) {
      if (key.match(/^__/)) {
        this.prioSpecials.set(key, new Priority(i, key))
      }
    }
  }

  getData(prop) {
    return this.cpp_json.get(prop)
  }

  categories() {
    return this.article.get(Prop.toplevel_category)
  }

  getPriorityForIndex(idx) {
    if (!idx.page_id || !idx.page_id.length) {
      throw [1]
    }
    if (idx.type() === IType.header) {
      throw [2]
    }

    const key = idx.page_id[idx.page_id.length - 1]
    // console.log(`key: ${key}`)

    if (this.cpp_json.get(Prop.order_priority).has(key)) {
      // exact match
      return new Priority(this.cpp_json.get(Prop.order_priority).get(key)[0], key)
    }

    if (key.match(/^op_/)) {
      return this.prioSpecials.get('__converter__')
    }

    if (key.match(/^type-/)) {
      return this.prioSpecials.get('__types__')
    }

    return this.prioSpecials.get('__functions__')
  }

  makeMemberData(t) {
    return {
      i: this.getPriorityForIndex(t).index,
      name: t.id.key[t.id.key.length - 1].name,
    }
  }
}

export {Prop, Priority, Config}

