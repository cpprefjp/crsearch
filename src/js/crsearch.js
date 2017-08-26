const $ = require('jquery');

class CRSearch {
  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
  };

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts;
    this.databases = [];
  }

  database(base_url) {
    this.databases.push(base_url);
  }

  searchbox(sel) {
    let box = $(sel);
    box.append('<div class="control" />');

    let control = box.children('.control');
    control.append('<input type="text" class="input">');
  }
}
module.exports = CRSearch;

