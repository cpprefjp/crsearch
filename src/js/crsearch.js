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

  static HELP = `
    <div class="help-content">
      <div class="message"></div>
      <ul class="examples">
        <li>
          <h3>Class / Function / Type</h3>
          <div class="query">std::<span class="input"></span></div>
        </li>
        <li>
          <h3>Header file</h3>
          <div class="query">&lt;<span class="input"></span>&gt;</div>
        </li>
        <li>
          <h3>All</h3>
          <div class="query"><span class="input"></span></div>
        </li>
      </ul>
    </div>
  `

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

      if (this.last_input[e.data.id] != text) {
        this.last_input[e.data.id] = text

        if (text.length >= 2) {
          this.find_result_for(e.target).removeClass('help')
          this.msg_for(e.target)
          this.do_search(e)

        } else {
          this.msg_for(e.target, text.length == 0 ? '' : 'input >= 2 characters...')
          this.find_result_for(e.target).addClass('help')
        }
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
    result.addClass('help')
    result.appendTo(box)

    let help_content = $(CRSearch.HELP)
    help_content.appendTo(result)

    input.on('focusin', function() {
      return this.show_result_for(this)
    }.bind(this))
    input.on('focusout', function() {
      return this.hide_all_result()
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

  find_cr_for(input) {
    return $(input).closest(`.${CRSearch.KLASS}`)
  }

  find_result_for(input) {
    return this.find_cr_for(input).children(`.${CRSearch.RESULT_KLASS}`)
  }

  show_result_for(input) {
    this.find_result_for(input).addClass('visible')
    return false
  }

  msg_for(input, msg = '') {
    this.find_cr_for(input).find('.result-wrapper .help-content .message').text(msg)
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

