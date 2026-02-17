# eslint-plugin-tailwind-v4

[![CI](https://github.com/dyeoh/eslint-plugin-tailwind-v4/actions/workflows/ci.yml/badge.svg)](https://github.com/dyeoh/eslint-plugin-tailwind-v4/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/eslint-plugin-tailwind-v4.svg)](https://www.npmjs.com/package/eslint-plugin-tailwind-v4)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ESLint plugin that validates Tailwind CSS v4 class names against your actual CSS configuration. Catches typos, undefined classes, and invalid utilities at lint time — before they silently fail in production.

## Why?

Tailwind v4 moved configuration from `tailwind.config.js` into CSS (`@theme`, `@utility`, `@layer`). This plugin reads your CSS entry file, follows `@import` chains, and builds a complete set of valid classes — so ESLint can flag anything that doesn't exist.

## Installation

```bash
npm install eslint-plugin-tailwind-v4 --save-dev
```

> **Peer dependency:** ESLint >= 8

## Quick Start

### Zero-config (auto-detection)

The plugin automatically finds your CSS entry file by scanning common locations (`src/styles/globals.css`, `src/index.css`, `app/globals.css`, etc.). If your project follows a standard layout, no configuration is needed:

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": "error"
  }
}
```

Or use the recommended preset:

```json
{
  "extends": ["plugin:tailwind-v4/recommended"]
}
```

### Explicit CSS path

If your CSS file is in a non-standard location, point to it explicitly:

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": [
      "error",
      {
        "cssFile": "src/styles/globals.css"
      }
    ]
  }
}
```

The path is relative to your project root.

## What it detects

```jsx
// ✅ Valid — built-in Tailwind utility
<div className="flex items-center gap-4 p-2" />

// ✅ Valid — custom colour from @theme { --color-brand: … }
<div className="text-brand bg-brand border-brand" />

// ✅ Valid — @utility definition
<div className="container-fluid stack-v" />

// ✅ Valid — @layer components class
<div className="card badge" />

// ✅ Valid — variant prefixes, arbitrary values, important
<div className="sm:hover:bg-blue-600 w-[200px] !font-bold" />

// ❌ Error — typo / undefined class
<div className="flexs itms-center" />
//                ^^^^^ ^^^^^^^^^^^  not defined in your CSS
```

## Supported Tailwind v4 Features

| Feature | Example | Status |
|---------|---------|--------|
| `@import "tailwindcss"` | Entry point detection | ✅ |
| `@theme` variables | `--color-brand`, `--spacing-18`, `--animate-fade` | ✅ |
| `@utility` definitions | `@utility card-grid { … }` | ✅ |
| `@layer` blocks | `@layer components { .card { … } }` | ✅ |
| CSS `@import` chains | `@import "./base/colors.css"` | ✅ |
| Recursive imports | Nested imports followed automatically | ✅ |
| Variant prefixes | `hover:`, `sm:`, `dark:`, `group-hover:`, etc. | ✅ |
| Chained variants | `sm:hover:bg-blue-600` | ✅ |
| Arbitrary values | `bg-[#f00]`, `w-[calc(100%-1rem)]` | ✅ |
| Important modifier | `!font-bold` | ✅ |
| Negative values | `-translate-x-4`, `-rotate-45` | ✅ |
| Pseudo-elements | `before:`, `after:`, `placeholder:` | ✅ |
| Container queries | `@container`, `@md/sidebar` | ✅ |
| Opacity modifiers | `bg-red-500/50` | ✅ |
| Group / Peer | `group/name`, `peer/name` | ✅ |

## Supported Utility Functions

The plugin validates class strings inside these function calls:

- `cn()` — common in shadcn/ui projects
- `clsx()`
- `cva()` — class-variance-authority
- `tw()`
- `twMerge()` — tailwind-merge
- `twJoin()` — tailwind-merge

```jsx
// All of these are validated:
cn("flex items-center", condition && "bg-red-500")
clsx("p-4", "text-lg")
cva("rounded-lg", { variants: { size: { sm: "p-2" } } })
twMerge("p-4", "p-6")
```

## Theme Variable → Utility Mapping

When the plugin finds `@theme` variables, it automatically generates the corresponding utility classes:

| Theme Variable | Generated Utilities |
|---|---|
| `--color-brand` | `text-brand`, `bg-brand`, `border-brand`, `from-brand`, `ring-brand`, … |
| `--animate-fade` | `animate-fade` |
| `--shadow-soft` | `shadow-soft` |
| `--radius-pill` | `rounded-pill` |
| `--spacing-18` | `p-18`, `m-18`, `gap-18`, `w-18`, `h-18`, `inset-18`, … |
| `--font-size-xxl` | `text-xxl` |
| `--font-family-display` | `font-display` |
| `--font-weight-semi-bold` | `font-semi-bold` |
| `--leading-relaxed` | `leading-relaxed` |
| `--tracking-tight` | `tracking-tight` |

## Auto-detected CSS Paths

When `cssFile` is omitted, the plugin scans these locations (first match wins):

```
src/styles/globals.css      ← Vite + Tailwind v4 (default)
src/index.css               ← Vite / CRA
src/app.css                 ← SvelteKit
src/main.css                ← Various
app/globals.css             ← Next.js App Router
src/app/globals.css         ← Next.js App Router (src/)
assets/css/main.css         ← Nuxt
styles/globals.css          ← Generic
```

> Files are validated as Tailwind entry points by checking for `@import "tailwindcss"` or `@tailwind` directives.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cssFile` | `string` | Auto-detected | Path to CSS entry file (relative to project root) |
| `allowArbitraryValues` | `boolean` | `true` | Allow arbitrary-value syntax like `bg-[#f00]` |
| `debug` | `boolean` | `false` | Print debug info to console |

### Debug mode

Enable debug mode to see exactly what the plugin finds:

```json
{
  "tailwind-v4/no-undefined-classes": ["warn", { "debug": true }]
}
```

This logs:
- Which CSS file was loaded and how it was found
- Every `@import` that was followed
- All `@theme` variables and generated utilities
- All `@utility` and `@layer` class definitions

## Example Setups

### Next.js (App Router)

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": ["error", {
      "cssFile": "app/globals.css"
    }]
  }
}
```

### Vite + React

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": "error"
  }
}
```

Auto-detects `src/styles/globals.css`, `src/index.css`, or `src/app.css`.

### Nuxt

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": ["error", {
      "cssFile": "assets/css/main.css"
    }]
  }
}
```

### SvelteKit

```json
{
  "plugins": ["tailwind-v4"],
  "rules": {
    "tailwind-v4/no-undefined-classes": ["error", {
      "cssFile": "src/app.css"
    }]
  }
}
```

## Architecture

```
eslint-plugin-tailwind-v4/
├── index.js                          # Plugin entry — exports rules & configs
├── rules/
│   └── no-undefined-classes.js       # ESLint rule — thin orchestrator
└── lib/
    ├── css-finder.js                 # Auto-detects CSS entry file
    ├── css-parser.js                 # Follows @import chains, delegates extraction
    ├── class-extractor.js            # Extracts classes from CSS content
    ├── utility-generator.js          # Generates utilities from @theme variables
    └── tailwind-patterns.js          # Built-in Tailwind utility pattern matching
```

The rule file is a thin orchestrator (~170 lines). All logic lives in focused modules under `lib/` for easy testing and extension.

## Releasing

Releases are fully automated. Just merge to `main` — GitHub Actions will:

1. Run tests
2. Determine the version bump from commit messages
3. Bump `package.json`, commit, and tag
4. Publish to npm
5. Create a GitHub Release with auto-generated notes

### Commit message convention

The version bump is determined by [Conventional Commits](https://www.conventionalcommits.org/):

| Commit prefix | Bump | Example |
|---|---|---|
| `fix:` | patch (1.0.0 → 1.0.1) | `fix: handle nested @layer blocks` |
| `feat:` | minor (1.0.0 → 1.1.0) | `feat: add support for @property` |
| `feat!:` or `BREAKING CHANGE` | major (1.0.0 → 2.0.0) | `feat!: require ESLint 9` |
| anything else | patch | `chore: update deps` |

**One-time setup:** Add an `NPM_TOKEN` secret in GitHub repo settings → Secrets → Actions.

## Requirements

- Node.js >= 14
- ESLint >= 8
- Tailwind CSS v4

## License

MIT
