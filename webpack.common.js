const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const PJ = require('./package.json');


function isExternal(module) {
  var context = module.context;

  if (typeof context !== 'string') {
    return false;
  }

  return context.indexOf('node_modules') !== -1;
}

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
              options: 'CRSearch',
            },
            {
              loader: 'babel-loader',
            },
          ],
          include: [
            path.resolve(__dirname, 'js'),
            path.resolve(__dirname, 'node_modules', 'nagato'),
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
      new webpack.optimize.CommonsChunkPlugin({
        name: 'crsearch-vendor',
        minChunks: function(module) {
          return isExternal(module);
        },
      }),
    ],
  },
  css: {
    context: path.resolve(__dirname, 'css'),
    entry: {
      crsearch: './crsearch.scss',
      'font-awesome': './font-awesome.scss',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'css/[name].css',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: ExtractTextPlugin.extract({
            // fallback: 'style-loader',
            use: [
              {
                loader: 'css-loader',
                options: {
                  minimize: true,
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
          }),
        },
        {
          test: /\.(ttf|eot|svg|woff(2)?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]?[hash]',
                publicPath: '../',
                outputPath: 'fonts/',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new ExtractTextPlugin({
        filename: 'css/[name].css',
        disable: false,
        allChunks: true,
      }),
    ]
  },
};

