class DOM {
  static defaultOptions = {
    links: {
      deprecated: null,
      removed: null,
    },
    badges: {
      noselfcpp: false,
      switches: [],
    },
  }

  static async makeBadges(attrs, opts = DOM.defaultOptions) {
    const ul = $('<ul>').addClass('badges').addClass([].concat(opts.badges.switches).join(' '))
    for (const attr of attrs) {
      const li = $('<li>', {'data-original-attr': attr}).addClass('badge').appendTo(ul)
      const target = $('<a>').append($('<i/>')).appendTo(li)

      const cppm = attr.match(/cpp(\d+)/)
      if (cppm) {
        const cppv = `C++${cppm[1]}`
        li.attr('data-cpp-version', cppm[1])

        if (attr.match('deprecated')) {
          li.addClass('deprecated-spec').attr('title', `${cppv}で非推奨`)
        } else if (attr.match('removed')) {
          li.addClass('removed-spec').attr('title', `${cppv}で削除`)
        } else if (attr.match('added-in')) {
          li.addClass('added-in-spec').attr('title', `${cppv}で追加`)
        }
      }

      if (['deprecated_in_latest', 'removed_in_latest', 'added_in_latest'].includes(attr)) {
        li.addClass('latest-spec')
      }
    }
    return ul
  }
}

export {DOM}

