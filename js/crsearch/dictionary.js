class Dictionary {
  constructor(log, self, children) {
    this.log = log.makeContext('Dictionary')
    this.self = self
    this.children = children
  }
}

export {Dictionary}

