import {default as Mousetrap} from 'mousetrap'

import {Query} from './crsearch/query'
import {Result} from './crsearch/result'
import {Index, Database} from './crsearch/database'
import {Logger} from './crsearch/logger'


export default class CRSearch {
  static APPNAME = 'CRSearch'
  static VERSION = '1.0.0'
  static HOMEPAGE = 'https://github.com/cpprefjp/crsearch'

  static OPTS_DEFAULT = {
    klass: {
      search_button: ['fa', 'fa-fw', 'fa-binoculars'],
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

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts
    this.log = new Logger(CRSearch.APPNAME, opts)

    this.loaded = false
    this.db = new Map
    this.last_id = 0
    this.last_input = {}
    this.search_timer = {}
    this.selectIndex = 0
    this.resultCount = 0
    this.hasFocus = false

    Mousetrap.bind('/', function() {
      if (this.hasFocus) return
      return this.select_default_input()
    }.bind(this))

    Mousetrap.bind('esc', function() {
      return this.hide_all_result()
    }.bind(this))

    this.log.info('initialized.')
  }

  load() {
    let i = 1
    for (const [url, db] of this.db) {
      if (url.pathname == '/') {
        url.pathname = '/crsearch.json'
      }
      this.log.info(`fetching database (${i}/${this.db.size}): ${url}`)

      $.ajax({
        url: url,

        success: (data) => {
          this.log.info('fetched')
          this.parse(url, data)
        },

        fail: (e) => {
          this.log.error('fetch failed', e)
        }
      })

      ++i
    }
  }

  parse(url, json) {
    this.log.info('parsing...', json)
    this.db.set(url, new Database(this.log, json))

    if (!this.defaultUrl) this.defaultUrl = new URL(this.db.get(url).base_url).hostname
    this.updateSearchButton('')

    this.log.info('parsed.', this.db.get(url))
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

  selectChange(isUp, box) {
    // this.log.debug('selectChange', 'isUp?: ', isUp, 'selectIndex: ', this.selectIndex, box)

    this.selectIndex += isUp ? -1 : 1
    if (this.selectIndex < 0) {
      this.selectIndex = this.resultCount
    } else if (this.selectIndex > this.resultCount) {
      this.selectIndex = 0
    }

    for (const e of box.find('.results .result')) {
      let link = $(e).children('a')
      if (parseInt($(e).attr('data-result-id')) === this.selectIndex) {
        link.addClass('focus')
        link.focus()
      } else {
        link.removeClass('focus')
        link.blur()
      }
    }

    // this.log.debug(this.selectIndex)
  }

  do_search(e) {
    clearTimeout(this.search_timer[e.data.id])
    this.search_timer[e.data.id] = setTimeout(function(e) {
      this.selectIndex = 0
      this.resultCount = this.do_search_impl(e)
    }.bind(this, e), 20)
  }

  do_search_impl(e) {
    const q = new Query(this.log, this.last_input[e.data.id])
    this.log.debug(`query: '${q.original_text}'`, q)

    let result_list = this.clear_results_for(e.target)
    let extra_info_for = {}

    // do the lookup per database
    let res = new Map

    for (const [url, db] of this.db) {
      const ret = db.query(q, 0, CRSearch.MAX_RESULT)
      extra_info_for[db.name] = {url: db.base_url}

      res.set(db.name, ret.targets)
      if (res.get(db.name).length == 0) {
        let msg = $(`<div class="message">No matches for </div>`)
        let rec_q = $('<span class="query" />')
        rec_q.text(q.original_text)
        rec_q.appendTo(msg)

        extra_info_for[db.name].html = msg
        continue
      }

      const found_count = ret.found_count
      if (found_count > CRSearch.MAX_RESULT) {
        extra_info_for[db.name].html = $(`<div class="message">Showing first<span class="match-count">${CRSearch.MAX_RESULT}</span>matches</div>`)
      } else {
        extra_info_for[db.name].html = $(`<div class="message">Showing<span class="match-count">all</span>matches</div>`)
      }
    }

    let result_id = 0
    for (const [db_name, targets] of res) {
      result_list.append(this.make_result_header(db_name, extra_info_for[db_name]))

      for (const target of targets) {
        let e = this.make_result(
          target.index.type(),
          target.index,
          target.path
        )

        e.attr('data-result-id', result_id++)
        result_list.append(e)
      }
    }

    for (const [url, db] of this.db) {
      // always include fallback
      let e = this.make_result(Result.GOOGLE_FALLBACK, q.original_text, {
        name: db.name,
        url: db.base_url.host,
      })
      e.attr('data-result-id', result_id++)
      result_list.append(e)
    }

    // always focus 1st result by default
    // just add 'focused' class, don't actually focus
    result_list.find('.result[data-result-id="0"] > a').addClass('focus')
    return result_id - 1 // i.e. result count
  }

  make_result_header(db_name, extra_info) {
    let elem = $('<li class="result" />')
    elem.addClass('cr-result-header')

    if (extra_info.html) {
      let extra = $(`<div class="extra" />`)

      if (extra_info.klass) {
        extra.addClass(extra_info.klass)
      }
      extra_info.html.appendTo(extra)
      extra.appendTo(elem)
    }

    let dbn = $(`<a class="db-name" />`)
    dbn.attr('href', extra_info.url)
    dbn.attr('target', '_blank')
    dbn.text(db_name)
    dbn.appendTo(elem)
    return elem
  }

  make_google_url(q, site) {
    let url = this.opts.google_url
    url.searchParams.set('q', `${q} site:${site}`)
    return url
  }

  make_result(t, target, extra = undefined) {
    let elem = CRSearch.RESULT_PROTO.clone()
    elem.addClass(Symbol.keyFor(t))
    let a = elem.children('a')
    let content = $('<div class="content" />').appendTo(a)
    let url = undefined

    switch (t) {
    case Result.GOOGLE_FALLBACK:
      a.attr('href', this.make_google_url(target, extra.url))
      a.attr('target', '_blank')
      $(`<div class="query">${target}</div>`).appendTo(content)
      $(`<div class="fallback-site">${extra.url}</div>`).appendTo(content)
      break

    default:
      a.attr('href', extra)
      target.join_html().appendTo(content)
      if (this.opts.force_new_window) {
        a.attr('target', '_blank')
      }
      break
    }

    return elem
  }

  updateSearchButton(href) {
    this.searchButton.attr('href', this.make_google_url(href, this.defaultUrl))
  }

  searchbox(sel) {
    this.searchButton = $('<a />')
    this.searchButton.attr('target', '_blank')
    this.searchButton.addClass('search')

    for (const klass of this.opts.klass.search_button) {
      this.searchButton.addClass(klass)
    }

    if (!this.loaded) {
      this.loaded = true
      this.load()
    }

    const id = this.last_id++;
    this.log.info(`creating searchbox ${id}`)

    let box = $(sel)
    box.attr('data-crsearch-id', id)

    this.last_input[id] = ''

    let control = $('<div class="control" />')
    control.appendTo(box)

    let input = $('<input type="text" />')
    input.addClass('input')
    input.addClass('mousetrap')
    input.attr('autocomplete', false)
    input.attr('placeholder', CRSearch.INPUT_PLACEHOLDER)
    input.appendTo(control)

    Mousetrap.bind('up', e => {
      if ($(document.activeElement).closest('*[data-crsearch-id="' + id + '"]').length != 0) {
        e.preventDefault()
        this.selectChange(true, box)
      }
    })
    Mousetrap.bind('down', e => {
      if ($(document.activeElement).closest('*[data-crsearch-id="' + id + '"]').length != 0) {
        e.preventDefault()
        this.selectChange(false, box)
      }
    })

    input.on('click', function(e) {
      this.show_result_wrapper_for(e.target)
      return this.select_default_input()
    }.bind(this))

    input.on('keyup', {id: id}, function(e) {
      this.show_result_wrapper_for(e.target)

      const text = $(e.target).val().replace(/\s+/g, ' ').trim()

      if (this.last_input[e.data.id] != text) {
        this.last_input[e.data.id] = text
        this.updateSearchButton(text)

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
    cr_info_link.text(`${CRSearch.APPNAME} v${CRSearch.VERSION}`)
    cr_info_link.appendTo(cr_info)
    cr_info.appendTo(result_wrapper)

    input.on('focusin', function() {
      this.hasFocus = true
      return this.show_result_wrapper_for(this)
    }.bind(this))

    input.on('focusout', () => {
      this.hasFocus = false
    })

    this.searchButton.appendTo(control)
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
} // CRSearch

module.exports = CRSearch

