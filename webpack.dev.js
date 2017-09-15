const path = require('path');
const common = require('./webpack.common.js');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const Merge = require('webpack-merge');

module.exports = Merge.multiple(common, {
  js: {
    entry: {
      browser: './browser.js',
    },
    module: {
      rules: [
        {
          test: /\.hbs$/,
          use: [
            {
              loader: 'handlebars-loader',
            },
          ],
        },
      ],
    },
    devtool: 'cheap-module-eval-source-map',
    devServer: {
      publicPath: '/',
      contentBase: path.join(__dirname, 'public'),
      watchContentBase: true,
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('development')
        }
      }),
      new HtmlWebpackPlugin({
        title: 'CRSearch - sample setup',
        hash: true,
        template: '../html/index.hbs',
        chunks: [
          'crsearch-vendor',
          'crsearch',
          'browser',
        ],
      }),
      new HtmlWebpackIncludeAssetsPlugin({
        assets: ['css/font-awesome.css'],
        append: false,
        hash: true,
      }),
      new HtmlWebpackIncludeAssetsPlugin({
        assets: ['css/browser.css', 'css/crsearch.css'],
        append: true,
        hash: true,
      }),
    ],
  },
  css: {
    entry: {
      browser: './browser.scss',
    },
    devtool: 'cheap-module-eval-source-map',
  },
});

