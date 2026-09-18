import goodActionHygiene from './rules/good-action-hygiene';

const plugin = {
  meta: { name: 'eslint-plugin-ngrx-sugar', version: '0.1.0' },
  rules: { 'good-action-hygiene': goodActionHygiene },
};

export = plugin;
