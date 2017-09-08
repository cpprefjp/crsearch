import * as $ from 'jquery'
import * as Mousetrap from 'mousetrap'
import {Result} from './crsearch/result'
import {Index, Database} from './crsearch/database'

class Search {
  static VERSION = '1.0.0'
  static HOMEPAGE = 'https://github.com/cpprefjp/crsearch'

  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
    google_url: new URL('https://www.google.co.jp/search'),
    force_new_window: false,
  }

  static KLASS = 'crsearch'
  static RESULT_WRAPPER_KLASS = 'result-wrapper'
  static RESULTS_KLASS = 'results'
  static INPUT_PLACEHOLDER = '"std::...", "<header>", etc.'

  static MAX_RESULT = 5

  static RESULT_PROTO = $('<li class="result"><a href="#"></a></li>')

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

  constructor(opts = Search.OPTS_DEFAULT) {
    this.opts = opts
    this.loaded = false
    this.db = new Map
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

  load() {
    let i = 1
    for (const [url, db] of this.db) {
      if (url.pathname == '/') {
        url.pathname = '/crsearch.json'
      }
      this.debug(`fetching database (${i}/${this.db.size}):`, url)

      $.ajax({
        url: url,

        success: function(data) {
          this.debug('fetched.')
          this.parse(url, data)
        }.bind(this),

        fail: function() {
          this.debug('fetch failed.')
        }.bind(this)
      })
      ++i
    }
  }

  parse(url, json) {
    this.debug('parsing...', json)
    this.db.set(url, new Database(json))
    this.debug('parsed.', this.db.get(url))
  }

  database(base_url) {
    try {
      const url = new URL(base_url)
      this.db.set(url.toString(), null)
    } catch (e) {
      const a = document.createElement('a')
      a.href = base_url
      if (a.pathname == '/') a.pathname = '/crsearch.json'

      const url = new URL(a.toString())
      this.db.set(url.toString(), null)
    }
  }

  do_search(e) {
    clearTimeout(this.search_timer[e.data.id])
    this.search_timer[e.data.id] = setTimeout(function(e) {
      this.do_search_impl(e)
    }.bind(this, e), 20)
  }

  do_search_impl(e) {
    const text = this.last_input[e.data.id]
    this.debug('[query]', text)

    let result_list = this.clear_results_for(e.target)
    let extra_info_for = {}

    // do the lookup per database
    let res = new Map

    for (const [url, db] of this.db) {
      const ret = db.query(text, 0, Search.MAX_RESULT)
      extra_info_for[db.name] = {url: db.base_url, text: ''}

      res.set(db.name, ret.targets)
      if (res.get(db.name).length == 0) {
        extra_info_for[db.name].text = `No matches for '${text}'`
        continue
      }

      const found_count = ret.found_count
      if (found_count > Search.MAX_RESULT) {
        extra_info_for[db.name].text = `Showing first ${Search.MAX_RESULT} matches`
      } else {
        extra_info_for[db.name].text = 'Showing all matches'
      }
    }

    for (const [db_name, targets] of res) {
      result_list.append(this.make_result_header(db_name, extra_info_for[db_name]))

      for (const target of targets) {
        result_list.append(this.make_result(
          target.index.type,
          target.index,
          target.path
        ))
      }
    }

    for (const [url, db] of this.db) {
      // always include fallback
      result_list.append(this.make_result(Result.GOOGLE_FALLBACK, text, {
        name: db.name,
        url: db.base_url.host,
      }))
    }
  }

  make_result_header(db_name, extra_info) {
    let elem = $('<li class="result" />')
    elem.addClass('cr-result-header')

    if (extra_info.text.length != 0) {
      let extra = $(`<span class="extra" />`)

      if (extra_info.klass) {
        extra.addClass(extra_info.klass)
      }
      extra.text(extra_info.text)
      extra.appendTo(elem)
    }

    let dbn = $(`<a class="db-name" />`)
    dbn.attr('href', extra_info.url)
    dbn.attr('target', '_blank')
    dbn.text(db_name)
    dbn.appendTo(elem)
    return elem
  }

  make_result(t, target, extra = undefined) {
    let elem = Search.RESULT_PROTO.clone()
    elem.addClass(Symbol.keyFor(t))
    let a = elem.children('a')
    let content = $('<div class="content" />').appendTo(a)
    let url = undefined

    switch (t) {
    case Result.GOOGLE_FALLBACK:
      url = this.opts.google_url
      url.searchParams.set('q', `${target} site:${extra.url}`)
      a.attr('href', url)
      a.attr('target', '_blank')
      content.text(`${extra.name}: ${target}`)
      break

    default:
      a.attr('href', extra)
      content.text(target.pretty_name())
      if (this.opts.force_new_window) {
        a.attr('target', '_blank')
      }
      break
    }

    return elem
  }

  searchbox(sel) {
    if (!this.loaded) {
      this.loaded = true
      this.load()
    }

    const id = this.last_id++;
    this.debug('creating searchbox', id)

    let box = $(sel)
    $.data(box, 'crsearch-id', id)
    this.last_input[id] = ''

    let control = $('<div class="control" />')
    control.appendTo(box)

    let input = $('<input type="text" class="input">')
    input.attr('autocomplete', false)
    input.attr('placeholder', Search.INPUT_PLACEHOLDER)
    input.appendTo(control)

    input.on('click', function(e) {
      this.show_result_wrapper_for(e.target)
      return this.select_default_input()
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
          this.clear_results_for(e.target)
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
    result_wrapper.addClass(Search.RESULT_WRAPPER_KLASS)
    result_wrapper.addClass('help')
    result_wrapper.appendTo(box)

    let results = $('<ul />')
    results.addClass(Search.RESULTS_KLASS)
    results.appendTo(result_wrapper)

    let help_content = $(Search.HELP)
    help_content.appendTo(result_wrapper)

    let cr_info = $('<div class="crsearch-info" />')
    let cr_info_link = $('<a />')
    cr_info_link.attr('href', Search.HOMEPAGE)
    cr_info_link.attr('target', '_blank')
    cr_info_link.text(`CRSearch v${Search.VERSION}`)
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

  select_default_input() {
    this.default_input.select()
    return false
  }

  find_cr_for(input) {
    return $(input).closest(`.${Search.KLASS}`)
  }

  find_result_wrapper_for(input) {
    return this.find_cr_for(input).children(`.${Search.RESULT_WRAPPER_KLASS}`)
  }

  find_results_for(input) {
    return this.find_result_wrapper_for(input).children(`.${Search.RESULTS_KLASS}`)
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
    let res = $(`.${Search.KLASS} .${Search.RESULT_WRAPPER_KLASS}`)
    res.removeClass('visible')
    return false
  }

  debug() {
    console.log('[CRSearch]', ...arguments)
  }
} // Search

export {Search}

