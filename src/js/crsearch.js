const $ = require('jquery');

class CRSearch {
  static OPTS_DEFAULT = {
    klass: {
      search_button: 'glyphicon glyphicon-search',
    },
  };

  constructor(opts = CRSearch.OPTS_DEFAULT) {
    this.opts = opts;
  }

  searchbox(id) {
  }
}
module.exports = CRSearch;

