const plugin = require('../index');

// Verify the plugin exports the expected structure
if (!plugin.rules['no-undefined-classes']) {
  throw new Error('Missing rule: no-undefined-classes');
}

if (!plugin.configs.recommended) {
  throw new Error('Missing config: recommended');
}

if (plugin.configs.recommended.rules['tailwind-v4/no-undefined-classes'] !== 'error') {
  throw new Error('Recommended config should set no-undefined-classes to error');
}

console.log('Plugin structure tests passed!');
