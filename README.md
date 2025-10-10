# eslint-plugin-tailwind-v4

ESLint plugin for validating Tailwind CSS v4 classes in your JavaScript and TypeScript projects.

## Installation

```bash
npm install eslint-plugin-tailwind-v4 --save-dev
```

## Usage

Add `tailwind-v4` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": "error"
  }
}
```

Or use the recommended configuration:

```json
{
  "extends": ["plugin:tailwind-v4/recommended"]
}
```

## Configuration

The `no-undefined-classes` rule accepts an options object:

```json
{
  "rules": {
    "tailwind-v4/no-undefined-classes": [
      "error",
      {
        "cssFile": "src/styles/globals.css",
        "allowArbitraryValues": true,
        "customClasses": ["custom-class-1", "custom-class-2"]
      }
    ]
  }
}
```

### Options

- `cssFile` (string): Path to your Tailwind CSS file. Default: `"src/styles/globals.css"`
- `allowArbitraryValues` (boolean): Allow arbitrary values like `bg-[#ff0000]`. Default: `true`
- `customClasses` (array): Additional custom classes to allow. Default: `[]`

## Features

- ✅ Validates Tailwind classes in `className` attributes
- ✅ Supports utility functions like `cn()`, `clsx()`, `cva()`, `tw()`
- ✅ Handles responsive prefixes (`sm:`, `md:`, `lg:`, etc.)
- ✅ Supports state prefixes (`hover:`, `focus:`, `active:`, etc.)
- ✅ Validates against your actual Tailwind v4 CSS output
- ✅ Configurable arbitrary value support
- ✅ Custom class allowlist

## Requirements

- Node.js >= 14
- ESLint >= 8
- Tailwind CSS v4

## License

MIT