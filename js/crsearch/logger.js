class LogStyle {
  constructor(kv) {
    this.kv = kv
  }

  join() {
    return Object.keys(this.kv).map(k => {
      return `${k}:${this.kv[k]}`
    }).join(';')
  }

  clone(assigner) {
    return new LogStyle(Object.assign({}, this.kv, assigner))
  }
}

class Logger {
  static Level = {
    debug: {
      intensity: -1, label: 'DEBUG',
      out: console.debug,
      style: new LogStyle({
        'font-family': 'sans-serif',
        'font-weight': 'bold',
        'text-decoration': 'underline',
        'color': '#B40486',
      }),
      icon: '⚒️',
    },

    info: {
      intensity: 0, label: 'INFO ',
      out: console.info,
      style: new LogStyle({
        'font-family': 'sans-serif',
        'color': 'gray',
      }),
      icon: '📝',
    },
    warn: {
      intensity: 1, label: 'WARN ',
      out: console.warn,
      style: new LogStyle({
        'font-family': 'sans-serif',
        'font-weight': 'bold',
        'color': '#ff8c00',
      }),
      icon: '⚠️',
    },
    error: {
      intensity: 2, label: 'ERROR',
      out: console.error,
      style: new LogStyle({
        'font-family': 'sans-serif',
        'font-weight': 'bold',
        'color': '#dc143c',
      }),
      icon: '🚫',
    },
  } // Level

  static PartStyle = {
    message: new LogStyle({'font-weight': 'bold', 'text-decoration': 'underline', 'color': '#aaa'}),
    message_body: new LogStyle({'font-weight': 'normal', 'text-decoration': 'none', 'color': '#222'}),
    backtrace: new LogStyle({'font-weight': 'bold', 'text-decoration': 'underline', 'color': '#aaa'}),
  }

  static default_level() {
    return this.Level.info
  }

  static defaultOptions = {
    ctx: {
      level: Logger.default_level(),
      style: new LogStyle({
        'font-weight': 'bold',
        'color': '#222222',
      }),
    },
  }

  constructor(ctx, opts = {}) {
    this.orig_ctx = [].concat(ctx)
    this.ctx = [].concat(ctx)
    this.opts = Object.assign(Logger.defaultOptions, opts)
  }

  original_context() {
    return this.orig_ctx
  }

  make_context(name) {
    let l = new Logger(this.orig_ctx.concat(name), this.opts)
    l.orig_ctx = Object.assign([], this.orig_ctx)
    return l
  }

  debug() {
    return this.log_impl(Logger.Level.debug, ...arguments)
  }
  info() {
    return this.log_impl(Logger.Level.info, ...arguments)
  }
  warn() {
    return this.log_impl(Logger.Level.warn, ...arguments)
  }
  error() {
    return this.log_impl(Logger.Level.error, ...arguments)
  }

  log_impl(level, arg1, ...args) {
    if (this.need_log(level)) {
      const master_output = level.intensity >= Logger.Level.error.intensity ? console.group : console.groupCollapsed

      master_output(`%c${level.icon} %c${level.label}%c [%c${this.ctx.join('::')}%c] %c${arg1}`, level.style.clone({'text-decoration': 'none'}).join(), level.style.join(), '', this.opts.ctx.style.join(), '', Logger.PartStyle.message_body.join())

      // console.group(`%ccount`, Logger.PartStyle.message.join())
      // console.count()
      // console.groupEnd()

      if (args.length) {
        console.group(`%cmessage`, Logger.PartStyle.message.join())
        console.log(...args)
        console.groupEnd()
      }

      console.groupCollapsed('%cbacktrace', Logger.PartStyle.backtrace.join())
      console.trace()
      console.groupEnd()

      console.groupEnd()

    } else {
      // suppressed...
    }
  }

  need_log(level) {
    if (level.intensity === Logger.Level.debug.intensity) {
      return process.env.NODE_ENV === 'development'
    } else {
      return level.intensity >= this.opts.ctx.level.intensity
    }
  }
}

export {Logger}

