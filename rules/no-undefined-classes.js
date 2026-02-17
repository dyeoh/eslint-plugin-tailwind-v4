/**
 * ESLint Rule: no-undefined-classes
 *
 * Validates that every Tailwind CSS class used in `className` attributes
 * or utility functions (`cn`, `clsx`, `cva`, `tw`) is actually defined —
 * either as a built-in Tailwind utility *or* through your project's CSS
 * (`@theme` variables, `@utility` definitions, `@layer` blocks, etc.).
 *
 * The heavy lifting is delegated to the `lib/` modules:
 *   - css-finder        → locates the CSS entry file
 *   - css-parser        → follows @import chains, extracts classes
 *   - tailwind-patterns → pattern-matches built-in Tailwind utilities
 */

'use strict';

const { findCSSEntryFile } = require('../lib/css-finder');
const { parseCSS } = require('../lib/css-parser');
const {
  isTailwindUtility,
  isArbitraryValue,
  getBaseClass,
  isOverridableUtility,
  hasThemeOverride,
} = require('../lib/tailwind-patterns');

// =============================================================================
// Shared cache — avoids re-parsing CSS for every file ESLint processes.
// Keyed by the resolved CSS path so different configs don't collide.
// =============================================================================

/** @type {Map<string, { validClasses: Set<string>, hasTailwindImport: boolean, themeVariables: Set<string> }>} */
const cssCache = new Map();

// =============================================================================
// Rule Definition
// =============================================================================

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate Tailwind CSS v4 classes against your CSS imports and theme variables',
      category: 'Stylistic Issues',
      recommended: true,
      url: 'https://github.com/dyeoh/eslint-plugin-tailwind-v4#no-undefined-classes',
    },
    schema: [
      {
        type: 'object',
        properties: {
          cssFile: {
            type: 'string',
            description:
              'Path to the CSS entry file (relative to project root). ' +
              'When omitted the plugin auto-detects common locations.',
          },
          allowArbitraryValues: {
            type: 'boolean',
            default: true,
            description: 'Allow arbitrary-value syntax like bg-[#f00].',
          },
          debug: {
            type: 'boolean',
            default: false,
            description: 'Print debug info to the console.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefinedClass:
        "Tailwind class '{{className}}' is not defined in your CSS",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const {
      cssFile: userCSSFile,
      allowArbitraryValues = true,
      debug = false,
    } = options;

    // Resolve once per run — uses cache for subsequent files.
    const projectRoot = context.getCwd();
    const cssPath = findCSSEntryFile(projectRoot, userCSSFile, debug);

    // Load & cache the CSS parse result.
    if (!cssCache.has(cssPath)) {
      cssCache.set(cssPath, parseCSS(cssPath, projectRoot, debug));
    }
    const { validClasses, hasTailwindImport, themeVariables } =
      cssCache.get(cssPath);

    // -------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------

    /**
     * Determine whether `className` is valid.
     */
    function isValidClass(className) {
      let clean = className;
      if (clean.startsWith('!')) clean = clean.substring(1);

      // Arbitrary values are always OK (when enabled).
      if (allowArbitraryValues && isArbitraryValue(clean)) return true;

      // Matched in the explicit custom class set (highest priority).
      if (validClasses.has(clean)) return true;

      // Strip variant prefixes and re-check.
      const base = getBaseClass(className);
      if (base) {
        const cleanBase = base.startsWith('!') ? base.substring(1) : base;
        if (validClasses.has(cleanBase)) return true;
        if (hasTailwindImport && isTailwindUtility(cleanBase)) {
          return (
            !isOverridableUtility(cleanBase) ||
            !hasThemeOverride(cleanBase, themeVariables)
          );
        }
      }

      // Built-in Tailwind utility check.
      if (hasTailwindImport && isTailwindUtility(className)) {
        return (
          !isOverridableUtility(clean) ||
          !hasThemeOverride(clean, themeVariables)
        );
      }

      return false;
    }

    // -------------------------------------------------------------------
    // AST helpers
    // -------------------------------------------------------------------

    /** Extract space-separated class names from a JSX string or template literal. */
    function extractClassNames(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value.split(/\s+/).filter(Boolean);
      }
      if (node.type === 'TemplateLiteral') {
        let str = '';
        for (let i = 0; i < node.quasis.length; i++) {
          str += node.quasis[i].value.cooked || '';
          if (i < node.expressions.length) str += ' ';
        }
        return str.split(/\s+/).filter(Boolean);
      }
      return [];
    }

    /** Report each invalid class on `node`. */
    function validateClasses(node, classNames) {
      for (const className of classNames) {
        if (!isValidClass(className)) {
          context.report({
            node,
            messageId: 'undefinedClass',
            data: { className },
          });
        }
      }
    }

    // -------------------------------------------------------------------
    // Supported utility function names (cn, clsx, cva, tw, twMerge, etc.)
    // -------------------------------------------------------------------

    const UTILITY_FN_NAMES = new Set([
      'cn', 'clsx', 'cva', 'tw', 'twMerge', 'twJoin',
    ]);

    // -------------------------------------------------------------------
    // ESLint Visitors
    // -------------------------------------------------------------------

    return {
      /** `<div className="…" />` */
      JSXAttribute(node) {
        if (node.name.name !== 'className' || !node.value) return;
        validateClasses(node.value, extractClassNames(node.value));
      },

      /** `cn("…")`, `clsx("…")`, `cva("…")`, `tw("…")`, etc. */
      CallExpression(node) {
        const name =
          node.callee.name ||
          (node.callee.type === 'MemberExpression' &&
            node.callee.property?.name);

        if (!UTILITY_FN_NAMES.has(name)) return;

        for (const arg of node.arguments) {
          const classNames = extractClassNames(arg);
          validateClasses(arg, classNames);
        }
      },
    };
  },
};
