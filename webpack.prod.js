const common = require('./webpack.common.js');
const webpack = require('webpack');
const Merge = require('webpack-merge');

module.exports = Merge.multiple(common, {
  js: {
    plugins: [
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      }),
    ],
  },
});

