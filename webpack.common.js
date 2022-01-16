const path = require('path');
const webpack = require('webpack');
//workaround: https://github.com/webpack-contrib/mini-css-extract-plugin/issues/896
const MiniCssExtractPlugin = require('mini-css-extract-plugin').default;

const PJ = require('./package.json');

module.exports = {
  context: __dirname,
  entry: {
    js: { import: './js/crsearch.js', filename: 'js/crsearch.js' },
    css: './css/crsearch.scss',
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
              exposes: ['CRSearch'],
            }
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
        type: 'asset/source',
      },
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
        type: 'asset/resource',
        generator: {
          publicPath: 'fonts/[name][ext]?[hash]',
        }
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
    new MiniCssExtractPlugin({
      filename: 'css/[name].css'
    }),
  ],
  optimization: {
    splitChunks: {
      name: 'crsearch-vendor',
    },
  },
};

