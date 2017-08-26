const $ = require('jquery')
const Mousetrap = require('mousetrap')

class CRSearch {
  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
  }

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts
    this.databases = []

    Mousetrap.bind('/', function() {
      return this.select_default()
    }.bind(this))
  }

  database(base_url) {
    this.databases.push(base_url)
  }

  searchbox(sel) {
    let box = $(sel)
    let control = $('<div class="control" />')
    control.appendTo(box)

    let input = $('<input type="text" class="input">')
    input.appendTo(control)
    input.on('click', function() {
      return this.select_default()
    }.bind(this))
    this.default_input = input
  }

  select_default() {
    this.default_input.select()
    return false
  }
}
module.exports = CRSearch

