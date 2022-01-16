const common = require('./webpack.common.js');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = merge(common, {
  mode: 'production',
  output: {
    clean: true
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new CssMinimizerPlugin({
      minimizerOptions: [
        {
          // http://cssnano.co/optimisations/reduceidents/
          reduceIdents: false,
        }
      ],
      minify: [
        CssMinimizerPlugin.cssnanoMinify,
      ]
    }),
  ],
});

