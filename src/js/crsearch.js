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

  static MAX_RESULT = 5

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts
    this.databases = new Set
    this.last_id = 0
    this.last_input = {}

    Mousetrap.bind('/', function() {
      return this.select_default()
    }.bind(this))

    Mousetrap.bind('esc', function() {
      return this.hide_all_result()
    }.bind(this))

    this.debug('initialized.')
  }

  database(base_url) {
    this.databases.add(base_url)
  }

  do_search(e) {
    const text = this.last_input[e.data.id]

    this.debug('input change', e.data)
    this.debug('text:', text)
  }

  searchbox(sel) {
    const id = this.last_id++;
    this.debug('new searchbox', id)

    let box = $(sel)
    $.data(box, 'crsearch-id', id)
    this.last_input[id] = ''

    let control = $('<div class="control" />')
    control.appendTo(box)

    let input = $('<input type="text" class="input">')
    input.attr('placeholder', CRSearch.INPUT_PLACEHOLDER)
    input.appendTo(control)

    input.on('click', function(e) {
      this.show_result_for(e.target)
      return this.select_default()
    }.bind(this))

    input.on('keyup', {id: id}, function(e) {
      this.show_result_for(e.target)

      const text = $(e.target).val().replace(/\s+/g, ' ').trim()
      if (this.last_input[e.data.id] != text && text.length >= 2) {
        this.last_input[e.data.id] = text
        this.do_search(e)
      } else {
        this.last_input[e.data.id] = text
      }

      if (text == '') {
        this.hide_all_result()
      }
      return false
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
      return this.show_result_for(this)
    }.bind(this))

    let btn_search = $('<span />')
    btn_search.addClass('search')
    btn_search.addClass(this.opts.klass.search_button)
    btn_search.appendTo(control)
  }

  select_default() {
    this.default_input.select()
    return false
  }

  show_result_for(input) {
    let res = $(input).closest(`.${CRSearch.KLASS}`).children(`.${CRSearch.RESULT_KLASS}`)
    res.addClass('visible')
    return false
  }

  hide_all_result() {
    let res = $(`.${CRSearch.KLASS} .${CRSearch.RESULT_KLASS}`)
    res.removeClass('visible')
    return false
  }

  debug() {
    console.log('[CRSearch]', ...arguments)
  }
}
module.exports = CRSearch

