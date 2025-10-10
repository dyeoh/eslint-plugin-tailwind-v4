// eslint-plugin-tailwind-v4/index.js
module.exports = {
  rules: {
    'no-undefined-classes': require('./rules/no-undefined-classes'),
  },
  configs: {
    recommended: {
      plugins: ['tailwind-v4'],
      rules: {
        'tailwind-v4/no-undefined-classes': 'error',
      },
    },
  },
};