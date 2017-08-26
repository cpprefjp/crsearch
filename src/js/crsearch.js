const $ = require('jquery')
const Mousetrap = require('mousetrap')

class CRSearch {
  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
  }

  static INPUT_PLACEHOLDER = '"std::...", "<header>", etc.'

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts
    this.databases = new Set

    Mousetrap.bind('/', function() {
      return this.select_default()
    }.bind(this))
  }

  database(base_url) {
    this.databases.add(base_url)
  }

  searchbox(sel) {
    let box = $(sel)
    let control = $('<div class="control" />')
    control.appendTo(box)

    let input = $('<input type="text" class="input">')
    input.attr('placeholder', CRSearch.INPUT_PLACEHOLDER)
    input.appendTo(control)
    input.on('click', function() {
      return this.select_default()
    }.bind(this))
    this.default_input = input

    let btn_search = $('<span />')
    btn_search.addClass('search')
    btn_search.addClass(this.opts.klass.search_button)
    btn_search.appendTo(control)
  }

  select_default() {
    this.default_input.select()
    return false
  }
}
module.exports = CRSearch

