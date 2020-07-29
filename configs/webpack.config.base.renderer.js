/**
 * Renderer Shared Rules
 */
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import { merge } from 'webpack-merge';

import baseConfig from './webpack.config.base';

const NODE_ENV = 'production';

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');

// Shared Loaders
const URL_LIMIT = 10 * 1024;
const FontLoader = {
  loader: 'url-loader',
  options: {
    limit: URL_LIMIT,
    fallback: {
      loader: 'file-loader',
      options: {
        name: 'fonts/[name].[ext]',
      },
    },
  },
};

export const CSSLoader = {
  loader: 'css-loader',
  options: {
    sourceMap: true,
  },
};

export default merge(baseConfig, {
  mode: NODE_ENV,
  devtool: 'inline-source-map',
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV,
      DEBUG_PROD: false,
      E2E_BUILD: false,
    }),
    new HtmlWebpackPlugin({
      filename: 'app.html',
      template: path.join(APP_DIR, 'app.html'),
      hash: true,
      xhtml: true,
      chunks: ['requirements', 'dev-loader', 'dll', 'renderer'],
    }),
  ],
  module: {
    rules: [
      // WOFF Font
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: merge(FontLoader, {
          options: {
            mimetype: 'font/woff',
          },
        }),
      },
      // WOFF2 Font
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: merge(FontLoader, {
          options: {
            mimetype: 'font/woff2',
          },
        }),
      },
      // TTF Font
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: merge(FontLoader, {
          options: {
            mimetype: 'font/ttf',
          },
        }),
      },
      // EOT Font
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: merge(FontLoader, {
          options: {
            mimetype: 'application/vnd.ms-fontobject',
          },
        }),
      },
      // SVG
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: URL_LIMIT,
            mimetype: 'image/svg+xml',
          },
        },
      },
      // Common Image Formats
      {
        test: /\.(?:bmp|ico|gif|png|jpe?g|tiff|webp)$/,
        use: 'url-loader',
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
});
