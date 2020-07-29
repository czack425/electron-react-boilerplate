/**
 * Builds the DLL for development electron renderer process
 */
import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import CheckNodeEnv from '../internals/scripts/CheckNodeEnv';

import baseConfig from './webpack.config.base';
import { dependencies } from '../package.json';

const NODE_ENV = 'development';
CheckNodeEnv(NODE_ENV);

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const DLL_DIR = path.join(ROOT_DIR, 'dll');

export default merge(baseConfig, {
  mode: NODE_ENV,
  devtool: 'eval',
  entry: {
    renderer: Object.keys(dependencies || {}),
  },
  output: {
    filename: '[name].dev.dll.js',
    library: 'renderer',
    libraryTarget: 'var',
    path: DLL_DIR,
  },
  context: ROOT_DIR,
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
    }),
    new webpack.DllPlugin({
      path: path.join(DLL_DIR, '[name].json'),
      name: '[name]',
    }),
    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        context: APP_DIR,
        output: {
          path: DLL_DIR,
        },
      },
    }),
  ],
  target: 'electron-renderer',
  externals: ['fsevents', 'crypto-browserify'],
  // Use `module` from `webpack.config.renderer.dev.js`
  module: require('./webpack.config.renderer.dev.babel').default.module,
});
