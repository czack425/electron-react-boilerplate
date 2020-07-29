/**
 * Build config for electron renderer process
 */
import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';
import CheckNodeEnv from '../internals/scripts/CheckNodeEnv';
import DeleteSourceMaps from '../internals/scripts/DeleteSourceMaps';

import baseConfig, { CSSLoader } from './webpack.config.base.renderer';

const NODE_ENV = 'production';
CheckNodeEnv(NODE_ENV);
DeleteSourceMaps();

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const DIST_DIR = path.join(APP_DIR, 'dist');

const minimizer = [];
if (!process.env.E2E_BUILD) {
  minimizer.push(
    new TerserPlugin({
      cache: true,
      parallel: true,
      sourceMap: true,
    })
  );
  minimizer.push(
    new OptimizeCSSAssetsPlugin({
      cssProcessorOptions: {
        map: {
          annotation: true,
          inline: false,
        },
      },
    })
  );
}

export default merge(baseConfig, {
  mode: NODE_ENV,
  devtool: process.env.DEBUG_PROD === 'true' ? 'source-map' : 'none',
  entry: {
    requirements: ['core-js', 'regenerator-runtime/runtime'],
    renderer: path.join(APP_DIR, 'index.tsx'),
  },
  output: {
    path: DIST_DIR,
    publicPath: './dist/',
    filename: '[name].prod.js',
  },
  plugins: [
    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV,
      DEBUG_PROD: false,
      E2E_BUILD: false,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
    }),
    new BundleAnalyzerPlugin({
      analyzerMode:
        process.env.OPEN_ANALYZER === 'true' ? 'server' : 'disabled',
      openAnalyzer: process.env.OPEN_ANALYZER === 'true',
    }),
  ],
  optimization: {
    minimizer,
  },
  target: process.env.E2E_BUILD ? 'electron-renderer' : 'electron-preload',
  module: {
    rules: [
      // Styles support - CSS - Extract all .global.css to style.css as is
      {
        test: /\.global\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: './',
            },
          },
          CSSLoader,
        ],
      },
      // Styles support - CSS - Pipe other styles through css modules and append to style.css
      {
        test: /^((?!\.global).)*\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          merge(CSSLoader, {
            options: {
              modules: {
                localIdentName: '[name]__[local]__[hash:base64:5]',
              },
            },
          }),
        ],
      },
      // Styles support - SASS/SCSS - compile all .global.s[ac]ss files and pipe it to style.css
      {
        test: /\.global\.(scss|sass)$/,
        use: [
          MiniCssExtractPlugin.loader,
          merge(CSSLoader, {
            options: {
              importLoaders: 1,
            },
          }),
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      // Styles support - SASS/SCSS - compile all other .s[ac]ss files and pipe it to style.css
      {
        test: /^((?!\.global).)*\.(scss|sass)$/,
        use: [
          MiniCssExtractPlugin.loader,
          merge(CSSLoader, {
            options: {
              importLoaders: 1,
              modules: {
                localIdentName: '[name]__[local]__[hash:base64:5]',
              },
            },
          }),
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
});
