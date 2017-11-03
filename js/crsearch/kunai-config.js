import {IndexType as IType} from './index-type'

// Reference implementation for https://github.com/cpprefjp/kunai_config


const Prop = {
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

class Config {
  static Prop = Prop

  constructor(data) {
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

  priorityFor(idx) {
    if (idx.type() === IType.header) {
      throw new Error(`[BUG] sorting a <header> page is not implemented; got ${idx}`)
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

