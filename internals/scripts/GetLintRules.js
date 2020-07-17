import { deepStrictEqual } from 'assert';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { CLIEngine } from 'eslint';
import lintConfig from '../../.eslintrc';

// Config Vars
const ROOT_DIR = path.join(__dirname, '..', '..');
const RULES_DIR = path.join(ROOT_DIR, 'configs', 'eslint_rules-tmp');

// Make rules dir if not exists
if (!fs.existsSync(RULES_DIR)) {
  fs.mkdirSync(RULES_DIR);
}

// Utilities
function sortObject(unordered) {
  if (!unordered || typeof unordered !== 'object' || Array.isArray(unordered)) {
    return unordered;
  }

  const ordered = {};
  Object.keys(unordered)
    .sort()
    .forEach((key) => {
      ordered[key] = sortObject(unordered[key]);
    });
  return ordered;
}

function getOrigin(pluginName) {
  if (pluginName.includes('/')) {
    const origin = pluginName.split('/', 1)[0];
    return origin
      .replace(/^@/, '')
      .replace(/[\s]/, '_')
      .replace(/[-_]eslint/, '');
  }
  return 'eslint';
}

function multiReplace(str, ...replace) {
  let tmp = str;
  replace.forEach(([p, r]) => {
    tmp = tmp.replace(p, r);
  });
  return tmp;
}

function getNumericSetting(ruleSettings) {
  const state = ruleSettings[0];
  if (typeof state === 'string') {
    switch (state) {
      case 'off':
        ruleSettings[0] = 0;
        break;
      case 'warn':
        ruleSettings[0] = 1;
        break;
      case 'error':
        ruleSettings[0] = 2;
        break;
      default:
        // Invalid setting, eslint compliance & just in case
        ruleSettings[0] = 3;
    }
  }
  if (Array.isArray(ruleSettings) && ruleSettings.length === 1) {
    return ruleSettings[0];
  }
  return ruleSettings;
}

function stringify(settings) {
  let fmtSettings = '';
  let obj = {};
  switch (true) {
    case typeof settings === 'number':
      return settings === Infinity ? null : settings;
    case typeof settings === 'string':
      return `'${settings}'`;
    case Array.isArray(settings):
      // eslint-disable-next-line no-case-declarations, no-unused-vars, @typescript-eslint/no-unused-vars
      const [set0, set1, set2, set3, ...sets] = settings;
      if (
        settings.every((i) => typeof i !== 'object') &&
        settings.length <= 5
      ) {
        fmtSettings = JSON.stringify(settings).replace(/,/g, ', ');
        break;
      }

      switch (true) {
        case settings.length === 2:
          obj = stringify(sortObject(set1)).replace(/\n/g, '\n\t');
          fmtSettings = `[${set0}, ${obj}]`;
          break;
        // eslint-disable-next-line prettier/prettier
        case (typeof set0 === 'number' && (settings.slice(1).every((i) => typeof i === 'string') || settings.slice(1).every((i) => typeof i === 'object'))):
          obj = settings
            .slice(1)
            .map((idx) => {
              const v = stringify(sortObject(idx));
              return typeof v === 'string' ? v.replace(/\n/g, '\n\t') : v;
            })
            .join(',\n\t');
          fmtSettings = `[${set0},\n\t\t${obj.replace(/\n/g, '\n\t')}\n\t]`;
          break;
        case settings.length === 3:
          obj = stringify(sortObject(set2)).replace(/\n/g, '\n\t');
          fmtSettings = `[${set0}, ${stringify(set1)}, ${obj}]`;
          break;
        case settings.length === 4:
          obj = stringify(sortObject(set3)).replace(/\n/g, '\n\t');
          // eslint-disable-next-line prettier/prettier
          fmtSettings = `[${set0}, ${stringify(set1)}, ${stringify(set2)}, ${obj}]`;
          break;
        default:
          obj = settings
            .map((idx) => {
              const v = stringify(sortObject(idx));
              return typeof v === 'string' ? v.replace(/\n/g, '\n\t') : v;
            })
            .join(',\n\t');
          fmtSettings = `[\n\t${obj}\n]`;
      }
      break;
    case typeof settings === 'object':
      // eslint-disable-next-line no-case-declarations
      const keys = Object.keys(settings);
      if (keys.length === 0) {
        fmtSettings = '{}';
        break;
      }
      obj = keys
        .map((k) => {
          let v = stringify(sortObject(settings[k]));
          v = typeof v === 'string' ? v.replace(/\n/g, '\n\t') : v;
          return `'${k.replace(/"/g, '\\"')}': ${v}`;
        })
        .join(',\n\t');
      return `{\n\t${obj}\n}`;
    default:
      fmtSettings = JSON.stringify(settings, null, 2);
  }
  return multiReplace(fmtSettings, [/([^\\])"/g, "$1'"], [/([^\\])"/g, "$1'"]);
}

// Actual Script
const lint = new CLIEngine(lintConfig);
const formats = ['jsx', 'ts', 'tsx'];
const baseConfig = lint.getConfigForFile('*.js');
const plugins = baseConfig.plugins.map((p) => getOrigin(`${p}/`));
const rules = {
  eslint: {},
  ...plugins.reduce((a, k) => {
    a[k] = {};
    return a;
  }, {}),
};

// Gather Rules
console.log('Using rules from *.js as base');
console.log('Gathering rules for [*.jsx, *.ts, *.tsx] files');
formats.forEach((fmt) => {
  const ruleset = lint.getConfigForFile(`*.${fmt}`).rules;
  Object.keys(ruleset).forEach((rule) => {
    const plugin = getOrigin(rule);
    const ruleSettings = getNumericSetting(ruleset[rule]);

    if (rule in rules[plugin]) {
      try {
        deepStrictEqual(rules[plugin][rule], ruleSettings);
      } catch (err) {
        const msg = chalk.yellowBright.bold(
          // eslint-disable-next-line prettier/prettier
          `Rule from *.${fmt} differs -> ${rule} --> ${JSON.stringify(rules[plugin][rule])} - ${JSON.stringify(ruleSettings)}`
        );
        console.log(msg);
      }
    } else {
      rules[plugin][rule] = ruleSettings;
    }
  });
});

// Write rules to files by plugin
let rulesRoot = [];
Object.keys(rules)
  .sort()
  .forEach((plug) => {
    rulesRoot.push(`\t...require('./${plug}_rules')`);
    let contents = `// ${plug} Rules\nmodule.exports = {\n`;

    const sortRules = sortObject(rules[plug]);
    contents += Object.keys(sortRules)
      .map((rule) => `\t'${rule}': ${stringify(sortRules[rule])}`)
      .join(',\n');

    contents += '\n};\n';
    contents = contents.replace(/\t/g, '  ');
    fs.writeFile(path.join(RULES_DIR, `${plug}_rules.js`), contents, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });

rulesRoot = `module.exports = {\n${rulesRoot.join(',\n')}\n};\n`;
rulesRoot = rulesRoot.replace(/\t/g, '  ');
fs.writeFile(path.join(RULES_DIR, `index.js`), rulesRoot, (err) => {
  if (err) {
    console.error(err);
  }
});

const info = [
  'Rules places in `/configs/eslint_rules-tmp` to avoid overriding existing rules,',
  'change this to `/configs/eslint_rules` to utalize the new rules.',
  "Uncomment `// ...require('./configs/eslint_rule')` from the .eslintrc.js to make changes to the new rules.",
];
console.info(chalk.whiteBright.bgBlue(info.join('\n')));
