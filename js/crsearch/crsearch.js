import {default as Mousetrap} from 'mousetrap'
import * as Nagato from 'nagato'

import {Query} from './query'
import {Database} from './database'

import URL from 'url-parse'


class CRSearch {
  static _APPNAME = 'crsearch'
  static _HOMEPAGE = 'https://github.com/cpprefjp/crsearch'

  static _OPTS_DEFAULT = {
    klass: {
      search_button: ['fa', 'fa-fw', 'fa-binoculars'],
    },
    google_url: new URL('https://www.google.co.jp/search'),
    force_new_window: false,
  }

  static _KLASS = 'crsearch'
  static _RESULT_WRAPPER_KLASS = 'result-wrapper'
  static _RESULTS_KLASS = 'results'
  static _INPUT_PLACEHOLDER = '"std::...", "<header>", etc.'

  static _MAX_RESULT = 5

  static _RESULT_PROTO = $('<li class="result"><a href="#"></a></li>')

  static _HELP = `
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

  constructor(opts = {}) {
    this._opts = Object.assign({}, CRSearch._OPTS_DEFAULT, opts)
    this._log = new Nagato.Logger(CRSearch._APPNAME, new Nagato.Logger.Option(Object.assign({}, this._opts, {
      icon: {
        text: '\u{1F50E}',
        color: '#3A6E83',
      }
    })))

    this._loaded = false
    this._db = new Map
    this._pendingDB = new Set
    this._last_id = 0
    this._last_input = {}
    this._search_timer = {}
    this._selectIndex = 0
    this._resultCount = 0
    this._hasFocus = false
    this._defaultUrl = null
    this._searchButton = null
    this._default_input = null


    Mousetrap.bind('/', () => {
      if (this._hasFocus) return
      return this._select_default_input()
    })

    Mousetrap.bind('esc', () =>
      this._hide_all_result()
    )

    this._log.info('initialized.')

    Object.seal(this)
  }

  async _load() {
    try {
      let i = 1
      for (const url of this._pendingDB) {
        if (url.pathname == '/') {
          url.pathname = '/crsearch.json'
        }
        this._log.info(`fetching database (${i}/${this._pendingDB.size}): ${url}`)

        $.ajax({
          url: url,
          dataType: "json",

          success: async data => {
            this._log.info('fetched')
            this._parse(url, data)
          },

          fail: async e => {
            this._log.error('fetch failed', e)
          }
        })

        ++i
      }
    } finally {
      this._pendingDB.clear()
    }

    this._loaded = true
  }

  async _parse(url, json) {
    this._log.info('parsing...', json)

    const db = new Database(this._log, json)
    this._db.set(db.name, db)
    if (!this._defaultUrl) {
      this._defaultUrl = new URL(db.base_url).hostname
    }

    this._updateSearchButton('')
    this._log.info(`parsed '${db.name}'`, db)
    if (this._opts.onDatabase) {
      this._opts.onDatabase(db)
    }
  }

  database(base_url) {
    const autoSuffix = url => {
      if (url.pathname === '/') url.pathname = '/crsearch.json'
      return url
    }

    try {
      const url = new URL(base_url)
      this._pendingDB.add(autoSuffix(url).toString())

    } catch (e) {
      const a = document.createElement('a')
      a.href = base_url

      const url = new URL(autoSuffix(a).toString())
      this._pendingDB.add(url)
    }
  }

  _selectChange(isUp, box) {
    // this._log.debug('_selectChange', 'isUp?: ', isUp, '_selectIndex: ', this._selectIndex, box)

    this._selectIndex += isUp ? -1 : 1
    if (this._selectIndex < 0) {
      this._selectIndex = this._resultCount
    } else if (this._selectIndex > this._resultCount) {
      this._selectIndex = 0
    }

    for (const e of box.find('.results .result')) {
      const link = $(e).children('a')
      if (parseInt($(e).attr('data-result-id')) === this._selectIndex) {
        link.addClass('focus')
        link.focus()
      } else {
        link.removeClass('focus')
        link.blur()
      }
    }

    // this._log.debug(this._selectIndex)
  }

  async _do_search(e) {
    clearTimeout(this._search_timer[e.data.id])
    this._search_timer[e.data.id] = setTimeout(async () => {
      this._selectIndex = 0
      this._resultCount = await this._do_search_impl(e)
    }, 20)
  }

  async _do_search_impl(e) {
    const q = new Query(this._log, this._last_input[e.data.id])
    // this._log.debug(`query: '${q.original_text}'`, q)

    const result_list = this._clear_results_for(e.target)
    const extra_info_for = {}

    // do the lookup per database
    const res = new Map

    for (const [name, db] of this._db) {
      const ret = db.query(q, 0, CRSearch._MAX_RESULT)
      extra_info_for[db.name] = {url: db.base_url}

      res.set(db.name, ret.targets)
      if (res.get(db.name).length == 0) {
        const msg = $('<div class="message"><span class="pre">No matches for</span></div>')
        const rec_q = $('<span class="query" />')
        rec_q.text(q.original_text)
        rec_q.appendTo(msg)

        extra_info_for[db.name].html = msg
        continue
      }

      const found_count = ret.found_count
      if (found_count > CRSearch._MAX_RESULT) {
        extra_info_for[db.name].html = $(`<div class="message">Showing first<span class="match-count">${CRSearch._MAX_RESULT}</span>matches</div>`)
      } else {
        extra_info_for[db.name].html = $('<div class="message">Showing<span class="match-count">all</span>matches</div>')
      }
    }

    let result_id = 0
    for (const [db_name, targets] of res) {
      result_list.append(this._make_site_header(db_name, extra_info_for[db_name]))

      const grouped_targets = targets.reduce((gr, e) => {
        const key = e.index.in_header
        gr.set(key, gr.get(key) || [])
        gr.get(key).push(e)
        return gr
      }, new Map)

      // this._log.debug('gr', grouped_targets)

      for (const [in_header, the_targets] of grouped_targets) {
        result_list.append(await this._make_result_header(in_header))

        for (const t of the_targets) {
          const e = await this._make_result(
            t.index.type,
            t.index,
            t.path
          )

          e.attr('data-result-id', result_id++)
          result_list.append(e)
        }
      }
    }

    for (const [name, db] of this._db) {
      // always include fallback
      const e = await this._make_result(null, q.original_text, {
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

  _make_site_header(db_name, extra_info) {
    const elem = $('<li class="result cr-meta-result cr-result-header" />')

    if (extra_info.html) {
      const extra = $('<div class="extra" />')

      if (extra_info.klass) {
        extra.addClass(extra_info.klass)
      }
      extra_info.html.appendTo(extra)
      extra.appendTo(elem)
    }

    const dbn = $('<a class="db-name" />')
    dbn.attr('href', extra_info.url)
    dbn.attr('target', '_blank')
    dbn.text(db_name)
    dbn.appendTo(elem)
    return elem
  }

  _make_google_url(q, site) {
    const url = this._opts.google_url
    url.set('query', {q: `${q} site:${site}`})
    return url
  }

  async _make_result_header(header) {
    const elem = $('<li class="result cr-meta-result in-header" />')

    const body = $('<a>')
    if (header) {
      if (this._opts.force_new_window) {
        body.attr('target', '_blank')
      }
      body.attr('href', header.url())
    }
    body.text(header ? header.name : '(no header)')
    body.appendTo(elem)
    return elem
  }

  async _make_result(t, target, extra = null) {
    const elem = CRSearch._RESULT_PROTO.clone()

    const a = elem.children('a')
    const content = $('<div class="content" />').appendTo(a)
    const url = null

    switch (t) {
    case null: {
      elem.addClass('fallback')
      a.attr('href', this._make_google_url(target, extra.url))
      a.attr('target', '_blank')
      $(`<div class="query">${target}</div>`).appendTo(content)
      $(`<div class="fallback-site">${extra.url}</div>`).appendTo(content)
      break
    }

    default:
      a.attr('href', extra)
      content.append(await target.join_html({badges: {switches: ['simple']}}))

      if (this._opts.force_new_window) {
        a.attr('target', '_blank')
      }
      break
    }

    return elem
  }

  async _updateSearchButton(href) {
    this._searchButton.attr('href', this._make_google_url(href, this._defaultUrl))
  }

  async searchbox(sel) {
    const box = $(sel).addClass('loading').append($('<div>', {class: 'loading-icon'}))
    if (!this._loaded) {
      await this._load()
    }
    box.removeClass('loading').addClass('loaded')

    this._searchButton = $('<a />')
    this._searchButton.attr('target', '_blank')
    this._searchButton.addClass('search')

    for (const klass of this._opts.klass.search_button) {
      this._searchButton.addClass(klass)
    }

    const id = this._last_id++;
    box.attr('data-crsearch-id', id)
    this._log.info(`creating searchbox ${id}`)


    this._last_input[id] = ''

    const control = $('<div class="control" />')
    control.appendTo(box)

    const input = $('<input type="text" />')
    input.addClass('input')
    input.addClass('mousetrap')
    input.attr('autocomplete', false)
    input.attr('placeholder', CRSearch._INPUT_PLACEHOLDER)
    input.appendTo(control)

    const get_root = () => $(document.activeElement).closest('*[data-crsearch-id="' + id + '"]')
    const is_self = () => !!get_root().length

    const forceFocus = () => {
      const results = get_root().find('.results')
      if (!results.children('.result a:focus').length) {
        results.find('.result a.focus').focus()[0].click()
      }
    }

    Mousetrap.bind('enter', e => {
      if (is_self()) {
        // don't!
        // e.preventDefault()

        forceFocus()
      }
      return true
    })

    Mousetrap.bind('up', e => {
      if (is_self()) {
        e.preventDefault()
        this._selectChange(true, box)
      }
    })
    Mousetrap.bind('down', e => {
      if (is_self()) {
        e.preventDefault()
        this._selectChange(false, box)
      }
    })

    input.on('click', e => {
      this._show_result_wrapper_for(e.target)
      return this._select_default_input()
    })

    input.on('keyup', {id: id}, e => {
      this._show_result_wrapper_for(e.target)

      const text = $(e.target).val().replace(/\s+/g, ' ').trim()

      if (this._last_input[e.data.id] != text) {
        this._last_input[e.data.id] = text
        this._updateSearchButton(text)

        if (text.length >= 2) {
          this._find_result_wrapper_for(e.target).removeClass('help')
          this._msg_for(e.target)
          this._do_search(e)

        } else if (text.length == 0) {
          this._clear_results_for(e.target)
          this._msg_for(e.target)
          this._find_result_wrapper_for(e.target).addClass('help')

        } else {
          this._clear_results_for(e.target)
          this._msg_for(e.target, text.length == 0 ? '' : 'input >= 2 characters...')
          this._find_result_wrapper_for(e.target).addClass('help')
        }
      }
      return false

    })
    this._default_input = input

    Mousetrap(input.get(0)).bind('esc', e => {
      $(e.target).blur()
      return this._hide_all_result()
    })

    const result_wrapper = $('<div />')
    result_wrapper.addClass(CRSearch._RESULT_WRAPPER_KLASS)
    result_wrapper.addClass('help')
    result_wrapper.appendTo(box)

    const results = $('<ul />')
    results.addClass(CRSearch._RESULTS_KLASS)
    results.appendTo(result_wrapper)

    const help_content = $(CRSearch._HELP)
    help_content.appendTo(result_wrapper)

    const cr_info = $('<div class="crsearch-info" />')
    const cr_info_link = $('<a />')
    cr_info_link.attr('href', CRSearch._HOMEPAGE)
    cr_info_link.attr('target', '_blank')
    cr_info_link.text(`${CRSearch._APPNAME} v${CRS_PACKAGE.version}`)
    cr_info_link.appendTo(cr_info)
    cr_info.appendTo(result_wrapper)

    input.on('focusin', () => {
      this._hasFocus = true
      return this._show_result_wrapper_for(this)
    })

    input.on('focusout', () => {
      this._hasFocus = false
    })

    this._searchButton.appendTo(control)
  }

  _select_default_input() {
    this._default_input.select()
    return false
  }

  _find_cr_for(input) {
    return $(input).closest(`.${CRSearch._KLASS}`)
  }

  _find_result_wrapper_for(input) {
    return this._find_cr_for(input).children(`.${CRSearch._RESULT_WRAPPER_KLASS}`)
  }

  _find_results_for(input) {
    return this._find_result_wrapper_for(input).children(`.${CRSearch._RESULTS_KLASS}`)
  }

  _show_result_wrapper_for(input) {
    this._find_result_wrapper_for(input).addClass('visible')
    return false
  }

  _msg_for(input, msg = '') {
    this._find_cr_for(input).find('.result-wrapper .help-content .message').text(msg)
    return false
  }

  _clear_results_for(input) {
    const res = this._find_results_for(input)
    res.empty()
    return res
  }

  _hide_all_result() {
    const res = $(`.${CRSearch._KLASS} .${CRSearch._RESULT_WRAPPER_KLASS}`)
    res.removeClass('visible')
    return false
  }
} // CRSearch

export {CRSearch}

