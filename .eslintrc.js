module.exports = {
  extends: 'erb/typescript',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./configs/webpack.config.eslint.js'),
      },
    },
  },
  rules: {
    /*
     * "off" or 0 - turn the rule off
     * "warn" or 1 - turn the rule on as a warning (doesn't affect exit code)
     * "error" or 2 - turn the rule on as an error (exit code is 1 when triggered)
     */
    // Run `yarn get-rules` and rename `configs/eslint_rules-tmp` to `configs/eslint_rules` before uncommenting
    // eslint-disable-next-line global-require
    // ...require('./configs/eslint_rules'),
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 0,
  },
};
