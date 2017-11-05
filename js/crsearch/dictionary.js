class Dictionary {
  constructor(self, priority, children) {
    if (!self || !priority || !children) {
      throw new Error('invalid arguments', arguments)
    }
    this.self = self
    this.priority = priority
    this.children = children
  }
}

export {Dictionary}

