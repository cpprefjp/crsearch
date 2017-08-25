const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = [
  {
    context: path.resolve(__dirname, 'src/js'),
    entry: {
      crsearch: './crsearch.js'
    },
    output: {
      path: path.join(__dirname, 'dist/js'),
      filename: '[name].js',
      publicPath: '/js/',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: 'expose-loader',
              options: 'CRSearch',
            },
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['env', {'modules': false}],
                ],
                plugins: [
                  'transform-class-properties',
                ],
              },
            },
          ],
          exclude: /node_modules/,
        }
      ],
    },
    devtool: 'source-map',
    plugins: [
      new webpack.optimize.UglifyJsPlugin(),
    ],
  },
  {
    context: path.resolve(__dirname, 'src/css'),
    entry: {
      crsearch: './crsearch.scss'
    },
    output: {
      path: path.join(__dirname, 'dist/css'),
      filename: '[name].css',
      publicPath: '/css/',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: [
              {
                loader: 'css-loader',
                options: {
                  minimize: true,
                  sourceMap: true
                }
              },
              {
                loader: 'sass-loader'
              },
            ],
          }),
        }
      ],
    },
    devtool: 'source-map',
    plugins: [
      new ExtractTextPlugin({
        filename: 'crsearch.css',
        disable: false,
        allChunks: true,
      }),
    ]
  },
];

