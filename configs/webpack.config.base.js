/**
 * Base webpack config used across other specific configs
 */
import path from 'path';
import webpack from 'webpack';

import { dependencies as externals } from '../app/package.json';

const NODE_ENV = 'production';
const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');

export default {
  output: {
    path: APP_DIR,
    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: 'commonjs2',
  },
  // Determine the array of extensions that should be used to resolve modules.
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [APP_DIR, 'node_modules'],
  },
  externals: [...Object.keys(externals || {})],
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV,
    }),
    new webpack.NamedModulesPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
    ],
  },
};
