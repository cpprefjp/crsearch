const IndexType = {
  header: 'header',
  namespace: 'namespace',
  class: 'class',
  function: 'function',
  mem_fun: 'mem_fun',
  enum: 'enum',
  variable: 'variable',
  type_alias: 'type-alias',
  concept: 'concept',
  macro: 'macro',
  cpo: 'cpo',
  article: 'article',
  meta: 'meta',

  isContainer(type) {
    return [this.class, this.namespace].includes(type)
  },

  isArticles(type) {
    return [this.article, this.meta].includes(type)
  },

  isClassy(type) {
    return [this.class, this.function, this.mem_fun, this.enum, this.variable, this.type_alias, this.concept, this.namespace].includes(type)
  },
}

Object.freeze(IndexType)

export default IndexType
