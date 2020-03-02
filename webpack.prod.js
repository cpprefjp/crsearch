const common = require('./webpack.common.js');
const webpack = require('webpack');
const Merge = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');


module.exports = Merge.multiple(common, {
  js: {
    mode: 'production',
    plugins: [
      new CleanWebpackPlugin(
        { verbose: true }
      ),
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      }),
    ],
  },
  css: {
    mode: 'production',
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

