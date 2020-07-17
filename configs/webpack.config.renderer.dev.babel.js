/**
 * Build config for development electron renderer process that uses
 * Hot-Module-Replacement - https://webpack.js.org/concepts/hot-module-replacement/
 */
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import webpack from 'webpack';
import merge from 'webpack-merge';
import CheckNodeEnv from '../internals/scripts/CheckNodeEnv';

import baseConfig, { CSSLoader } from './webpack.config.base.renderer';

const NODE_ENV = 'development';

// When an ESLint server is running, we can't set the NODE_ENV so we'll check if it's
// at the dev webpack config is not accidentally run in a production environment
if (process.env.NODE_ENV === 'production') {
  CheckNodeEnv(NODE_ENV);
}

const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const DLL_DIR = path.join(ROOT_DIR, 'dll');
const DIST_DIR = path.join(APP_DIR, 'dist');

const port = process.env.PORT || 1212;
const publicPath = `http://localhost:${port}/dist`;
const manifest = path.resolve(DLL_DIR, 'renderer.json');
const requiredByDLLConfig = module.parent.filename.includes(
  'webpack.config.renderer.dev.dll'
);

/**
 * Warn if the DLL is not built
 */
if (
  !requiredByDLLConfig &&
  !(fs.existsSync(DLL_DIR) && fs.existsSync(manifest))
) {
  console.log(
    chalk.black.bgYellow.bold(
      'The DLL files are missing. Sit back while we build them for you with "yarn build-dll"'
    )
  );
  execSync('yarn build-dll');
}

let DLLConfig = null;
if (!requiredByDLLConfig) {
  DLLConfig = new webpack.DllReferencePlugin({
    context: DLL_DIR,
    manifest: require(manifest),
    sourceType: 'var',
  });
}

// Loaders
const TypingLoader = [
  'typings-for-css-modules-loader',
  {
    loader: 'typings-for-css-modules-loader',
    options: {
      modules: {
        localIdentName: '[name]__[local]__[hash:base64:5]',
      },
      sourceMap: true,
      importLoaders: 1,
    },
  },
];

export default merge.smart(baseConfig, {
  mode: NODE_ENV,
  devtool: 'inline-source-map',
  entry: {
    'dev-loader': [
      ...(process.env.PLAIN_HMR ? [] : ['react-hot-loader/patch']),
      `webpack-dev-server/client?http://localhost:${port}/`,
      'webpack/hot/only-dev-server',
    ],
    dll: path.join(DLL_DIR, 'renderer.dev.dll'),
    renderer: path.join(APP_DIR, 'index.tsx'),
  },
  output: {
    publicPath: `http://localhost:${port}/dist/`,
    filename: '[name].dev.js',
  },
  resolve: {
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
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
     *
     * By default, use 'development' as NODE_ENV. This can be overriden with
     * 'staging', for example, by changing the ENV variables in the npm scripts
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV,
    }),
    DLLConfig,
    new webpack.HotModuleReplacementPlugin({
      multiStep: true,
    }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),
  ],
  devServer: {
    port,
    publicPath,
    compress: true,
    noInfo: false,
    stats: 'errors-only',
    inline: true,
    lazy: false,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    contentBase: DIST_DIR,
    watchOptions: {
      aggregateTimeout: 300,
      ignored: /node_modules/,
      poll: 100,
    },
    historyApiFallback: {
      disableDotRule: false,
      verbose: true,
    },
    before() {
      if (process.env.START_HOT) {
        console.log('Starting Main Process...');
        spawn('npm', ['run', 'start-main-dev'], {
          env: process.env,
          shell: true,
          stdio: 'inherit',
        })
          .on('close', (code) => process.exit(code))
          .on('error', (spawnError) => console.error(spawnError));
      }
    },
  },
  target: 'electron-renderer',
  module: {
    rules: [
      // Styles support - CSS - Extract all .global.css to style.css as is
      {
        test: /\.global\.css$/,
        use: ['style-loader', CSSLoader],
      },
      // Styles support - CSS - Pipe other styles through css modules and append to style.css
      {
        test: /^((?!\.global).)*\.css$/,
        use: [
          'style-loader',
          merge.smart(CSSLoader, {
            options: {
              modules: {
                localIdentName: '[name]__[local]__[hash:base64:5]',
              },
              importLoaders: 1,
            },
          }),
        ],
      },
      // Styles support - SASS/SCSS - compile all .global.s[ac]ss files and pipe it to style.css
      {
        test: /\.global\.(scss|sass)$/,
        use: ['style-loader', CSSLoader, 'sass-loader'],
      },
      // Styles support - SASS/SCSS - compile all other .s[ac]ss files and pipe it to style.css
      {
        test: /^((?!\.global).)*\.(scss|sass)$/,
        use: [...TypingLoader, 'sass-loader'],
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
});
