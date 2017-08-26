const $ = require('jquery')
const Mousetrap = require('mousetrap')

class CRSearch {
  static VERSION = '1.0.0'
  static HOMEPAGE = 'https://github.com/cpprefjp/crsearch'

  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
    search_fallback_host: 'cpprefjp.github.io',
    google_url: new URL('https://www.google.co.jp/search'),
  }

  static KLASS = 'crsearch'
  static RESULT_WRAPPER_KLASS = 'result-wrapper'
  static RESULTS_KLASS = 'results'
  static INPUT_PLACEHOLDER = '"std::...", "<header>", etc.'

  static MAX_RESULT = 5

  static RESULT_PROTO = $('<li class="result"><a href="#"></a></li>')
  static RESULT = {
    HEADER: Symbol(),
    CLASS: Symbol(),
    FUNCTION: Symbol(),
    MEM_FUN: Symbol(),
    ENUM: Symbol(),
    VARIABLE: Symbol(),
    TYPE_ALIAS: Symbol(),
    MACRO: Symbol(),
    ARTICLE: Symbol(),
    META: Symbol(),
    GOOGLE_FALLBACK: Symbol(),
    NO_MATCH: Symbol(),
  }

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
          <h3>Other / All</h3>
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
    this.search_timer = {}

    Mousetrap.bind('/', function() {
      return this.select_default_input()
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
    clearTimeout(this.search_timer[e.data.id])
    this.search_timer[e.data.id] = setTimeout(function(e) {
      this.do_search_impl(e)
    }.bind(this, e), 20)
  }

  do_search_impl(e) {
    const text = this.last_input[e.data.id]

    this.debug('input change', e.data)
    this.debug('text:', text)

    let res = this.clear_results_for(e.target)

    // do the lookup
    let found = []
    if (found.length == 0) {
      res.append(this.make_result(CRSearch.RESULT.NO_MATCH, text))
    }

    // always include fallback
    res.append(this.make_result(CRSearch.RESULT.GOOGLE_FALLBACK, text))
  }

  make_result(t, target) {
    let elem = CRSearch.RESULT_PROTO.clone()

    switch (t) {
    case CRSearch.RESULT.NO_MATCH:
      elem.empty()
      elem.addClass('no-match')
      let q = $('<span class="query" />')
      q.text(target)
      q.appendTo(elem)
      break

    case CRSearch.RESULT.GOOGLE_FALLBACK:
      elem.addClass('google-fallback')
      let a = elem.children('a')

      let url = this.opts.google_url
      let params = url.searchParams
      params.set('q', `${target} site:${this.opts.search_fallback_host}`)
      url.searchParams = params
      a.attr('href', url)
      a.attr('target', '_blank')
      a.text(target)
      break

    default:
        throw 'unhandled result type'
    }

    return elem
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
    input.attr('autocomplete', false)
    input.attr('placeholder', CRSearch.INPUT_PLACEHOLDER)
    input.appendTo(control)

    input.on('click', function(e) {
      this.show_result_wrapper_for(e.target)
      return this.select_default_input()
    }.bind(this))

    Mousetrap(input.get(0)).bind('up', function(e) {
      this.select_result(-1, e)
    }.bind(this))
    Mousetrap(input.get(0)).bind('down', function(e) {
      this.select_result(+1, e)
    }.bind(this))

    input.on('keyup', {id: id}, function(e) {
      this.show_result_wrapper_for(e.target)

      const text = $(e.target).val().replace(/\s+/g, ' ').trim()

      if (this.last_input[e.data.id] != text) {
        this.last_input[e.data.id] = text

        if (text.length >= 2) {
          this.find_result_wrapper_for(e.target).removeClass('help')
          this.msg_for(e.target)
          this.do_search(e)

        } else if (text.length == 0) {
          this.clear_results_for(e.target)
          this.msg_for(e.target)
          this.find_result_wrapper_for(e.target).addClass('help')

        } else {
          this.msg_for(e.target, text.length == 0 ? '' : 'input >= 2 characters...')
          this.find_result_wrapper_for(e.target).addClass('help')
        }
      }
      return false

    }.bind(this))
    this.default_input = input

    Mousetrap(input.get(0)).bind('esc', function(e) {
      $(e.target).blur()
      return this.hide_all_result()
    }.bind(this))

    let result_wrapper = $('<div />')
    result_wrapper.addClass(CRSearch.RESULT_WRAPPER_KLASS)
    result_wrapper.addClass('help')
    result_wrapper.appendTo(box)

    let results = $('<ul />')
    results.addClass(CRSearch.RESULTS_KLASS)
    results.appendTo(result_wrapper)

    let help_content = $(CRSearch.HELP)
    help_content.appendTo(result_wrapper)

    let cr_info = $('<div class="crsearch-info" />')
    let cr_info_link = $('<a />')
    cr_info_link.attr('href', CRSearch.HOMEPAGE)
    cr_info_link.attr('target', '_blank')
    cr_info_link.text(`CRSearch v${CRSearch.VERSION}`)
    cr_info_link.appendTo(cr_info)
    cr_info.appendTo(result_wrapper)

    input.on('focusin', function() {
      return this.show_result_wrapper_for(this)
    }.bind(this))

    let btn_search = $('<span />')
    btn_search.addClass('search')
    btn_search.addClass(this.opts.klass.search_button)
    btn_search.appendTo(control)
  }

  select_result(dir, e) {
    let results = this.find_results_for(e.target)
    let all_results = results.children('.result:not(.no-match)')
    let hovered = results.find('.result:not(.no-match) > a:hover')

    if (!hovered || hovered.parent().index() + dir < 0) {
      $(all_results[0]).children('a').addClass('hover')
    } else {
      $(all_results[hovered.parent().index() + dir]).children('a').addClass('hover')
    }
  }

  select_default_input() {
    this.default_input.select()
    return false
  }

  find_cr_for(input) {
    return $(input).closest(`.${CRSearch.KLASS}`)
  }

  find_result_wrapper_for(input) {
    return this.find_cr_for(input).children(`.${CRSearch.RESULT_WRAPPER_KLASS}`)
  }

  find_results_for(input) {
    return this.find_result_wrapper_for(input).children(`.${CRSearch.RESULTS_KLASS}`)
  }

  show_result_wrapper_for(input) {
    this.find_result_wrapper_for(input).addClass('visible')
    return false
  }

  msg_for(input, msg = '') {
    this.find_cr_for(input).find('.result-wrapper .help-content .message').text(msg)
    return false
  }

  hide_result_wrapper_for(input) {
    this.find_result_wrapper_for(input).removeClass('visible')
    return false
  }

  clear_results_for(input) {
    let res = this.find_results_for(input)
    res.empty()
    return res
  }

  hide_all_result() {
    let res = $(`.${CRSearch.KLASS} .${CRSearch.RESULT_WRAPPER_KLASS}`)
    res.removeClass('visible')
    return false
  }

  debug() {
    console.log('[CRSearch]', ...arguments)
  }
}
module.exports = CRSearch

