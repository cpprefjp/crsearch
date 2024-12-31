const common = require('./webpack.common.js');
const webpack = require('webpack');
const Merge = require('webpack-merge');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");


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
    optimization: {
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            processorOptions: {
              // http://cssnano.co/optimisations/reduceidents/
              reduceIdents: false,
            },
          },
        }),
      ],
    },
  },
});

