const common = require('./webpack.common.js');
const webpack = require('webpack');
const Merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');


module.exports = Merge.multiple(common, {
  js: {
    plugins: [
      new CleanWebpackPlugin(
        ['dist'], { verbose: true, }
      ),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      }),
    ],
  },
  css: {
    plugins: [
      new OptimizeCSSAssetsPlugin({
        canPrint: true,
        cssProcessorOptions: {
          // http://cssnano.co/optimisations/reduceidents/
          reduceIdents: false,
        },
      }),
    ],
  },
});

