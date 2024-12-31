const path = require('path');
const common = require('./webpack.common.js');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');
const Merge = require('webpack-merge');

module.exports = Merge.multiple(common, {
  js: {
    mode: 'development',
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
    devtool: 'inline-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'example'),
        publicPath: '/',
      },
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
        template: '../html/crsearch-testing.hbs',
        chunks: [
          'crsearch-vendor',
          'crsearch',
          'browser',
        ],
      }),
      // new HtmlWebpackIncludeAssetsPlugin({
        // assets: ['css/font-awesome.css'],
        // append: false,
        // hash: true,
      // }),
      new HtmlWebpackTagsPlugin({
        tags: [
          'css/browser.css',
          'css/crsearch.css',
        ],
        append: true,
        useHash: true,
      }),
    ],
  },
  css: {
    mode: 'development',
    entry: {
      browser: './browser.scss',
    },
    devtool: 'eval-cheap-module-source-map',
  },
});

