const $ = require('jquery')
const Mousetrap = require('mousetrap')

class CRSearch {
  static VERSION = '1.0.0'

  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
  }

  static KLASS = 'crsearch'
  static RESULT_KLASS = 'result-wrapper'
  static INPUT_PLACEHOLDER = '"std::...", "<header>", etc.'

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts
    this.databases = new Set

    Mousetrap.bind('/', function() {
      return this.select_default()
    }.bind(this))

    Mousetrap.bind('esc', function() {
      return this.hide_all_result()
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

    Mousetrap(input.get(0)).bind('esc', function(e) {
      $(e.target).blur()
      return this.hide_all_result()
    }.bind(this))

    let result = $('<div />')
    result.addClass(CRSearch.RESULT_KLASS)
    result.appendTo(box)

    input.on('focusin', function() {
      let res = $(this).closest(`.${CRSearch.KLASS}`).children(`.${CRSearch.RESULT_KLASS}`)
      res.addClass('visible')
    })

    let btn_search = $('<span />')
    btn_search.addClass('search')
    btn_search.addClass(this.opts.klass.search_button)
    btn_search.appendTo(control)
  }

  select_default() {
    this.default_input.select()
    return false
  }

  hide_all_result() {
    let res = $(`.${CRSearch.KLASS} .${CRSearch.RESULT_KLASS}`)
    res.removeClass('visible')
    return false
  }
}
module.exports = CRSearch

