const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const PJ = require('./package.json');

module.exports = {
  js: {
    context: path.resolve(__dirname, 'js'),
    entry: {
      crsearch: './crsearch.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: 'expose-loader',
              options: {
                exposes: {
                  globalName: 'CRSearch',
                  override: true,
                },
              },
            },
            {
              loader: 'babel-loader',
            },
          ],
          include: [
            path.resolve(__dirname, 'js'),
            path.resolve(__dirname, 'node_modules', 'whatwg-url'),
          ],
        },
        {
          test: /\.md$/,
          use: [
            {
              loader: 'raw-loader',
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
      }),
      new webpack.DefinePlugin({
        CRS_PACKAGE: JSON.stringify({
          version: PJ.version,
          bugs_url: PJ.bugs.url,
        }),
      }),
    ],
    optimization: {
      splitChunks: {
        name: 'crsearch-vendor',
      },
    },
  },
  css: {
    context: path.resolve(__dirname, 'css'),
    entry: {
      crsearch: './crsearch.scss',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      //filename: 'css/[name].css',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
              },
            },
            {
              loader: 'css-loader',
              options: {
                // minimize: false,
                sourceMap: true,
              }
            },
            {
              loader: 'postcss-loader',
            },
            {
              loader: 'sass-loader'
            },
          ],
        },
        {
          test: /\.(ttf|eot|svg|woff(2)?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]?[hash]',
                publicPath: '../fonts/',
                outputPath: 'fonts/',
              },
            },
          ]
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/[name].css'
      }),
    ]
  },
};

