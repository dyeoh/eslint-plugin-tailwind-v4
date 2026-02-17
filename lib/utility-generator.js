/**
 * Utility Generator
 *
 * Given a Tailwind v4 `@theme` variable name (e.g. `color-primary`),
 * generate all the Tailwind utility class names that would be created
 * from that variable.
 *
 * Each generator function handles one namespace (`color-*`, `animate-*`,
 * etc.) and returns the number of utilities it produced.
 *
 * To support a new namespace, add a new generator to GENERATORS.
 */

'use strict';

// ---------------------------------------------------------------------------
// Individual generators
// ---------------------------------------------------------------------------

/** @typedef {(varName: string, out: Set<string>) => number} Generator */

/**
 * `--color-<name>` → text-<name>, bg-<name>, border-<name>, etc.
 * @type {Generator}
 */
function generateColorUtilities(varName, out) {
  if (!varName.startsWith('color-')) return 0;
  const name = varName.substring(6);

  const prefixes = [
    // Core color utilities
    'text', 'bg', 'border', 'decoration', 'outline', 'ring',
    'ring-offset', 'shadow', 'accent', 'caret', 'fill', 'stroke',
    // Gradient stops
    'from', 'via', 'to',
    // Directional borders
    'border-t', 'border-r', 'border-b', 'border-l',
    'border-x', 'border-y',
    // Logical borders
    'border-s', 'border-e',
    'border-is', 'border-ie', 'border-bs', 'border-be',
    // Divide
    'divide',
  ];

  let count = 0;
  for (const prefix of prefixes) {
    out.add(`${prefix}-${name}`);
    count++;
  }
  return count;
}

/**
 * `--animate-<name>` → animate-<name>
 * @type {Generator}
 */
function generateAnimationUtilities(varName, out) {
  if (!varName.startsWith('animate-')) return 0;
  out.add(varName); // varName already equals `animate-<name>`
  return 1;
}

/**
 * `--shadow-<name>` → shadow-<name>
 * @type {Generator}
 */
function generateShadowUtilities(varName, out) {
  if (!varName.startsWith('shadow-')) return 0;
  out.add(varName);
  return 1;
}

/**
 * `--radius-<name>` → rounded-<name>
 * @type {Generator}
 */
function generateRadiusUtilities(varName, out) {
  if (!varName.startsWith('radius-')) return 0;
  const name = varName.substring(7);
  out.add(`rounded-${name}`);
  return 1;
}

/**
 * `--spacing-<name>` → p-<name>, m-<name>, gap-<name>, etc.
 * @type {Generator}
 */
function generateSpacingUtilities(varName, out) {
  if (!varName.startsWith('spacing-')) return 0;
  const name = varName.substring(8);

  const prefixes = [
    'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
    'ps', 'pe',
    'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
    'ms', 'me',
    'gap', 'gap-x', 'gap-y',
    'space-x', 'space-y',
    'w', 'min-w', 'max-w',
    'h', 'min-h', 'max-h',
    'size',
    'inset', 'inset-x', 'inset-y',
    'top', 'right', 'bottom', 'left',
    'start', 'end',
    'scroll-m', 'scroll-p',
    'indent',
  ];

  let count = 0;
  for (const prefix of prefixes) {
    out.add(`${prefix}-${name}`);
    count++;
  }
  return count;
}

/**
 * `--text-<name>` → text-<name>  (custom text sizes defined as theme vars)
 * @type {Generator}
 */
function generateTextUtilities(varName, out) {
  if (!varName.startsWith('text-')) return 0;
  out.add(varName);
  return 1;
}

/**
 * `--font-family-<name>` → font-<name>
 * @type {Generator}
 */
function generateFontFamilyUtilities(varName, out) {
  if (!varName.startsWith('font-family-')) return 0;
  const name = varName.substring(12);
  out.add(`font-${name}`);
  return 1;
}

/**
 * `--font-weight-<name>` → font-<name>
 * @type {Generator}
 */
function generateFontWeightUtilities(varName, out) {
  if (!varName.startsWith('font-weight-')) return 0;
  const name = varName.substring(12);
  out.add(`font-${name}`);
  return 1;
}

/**
 * `--font-size-<name>` → text-<name>
 * @type {Generator}
 */
function generateFontSizeUtilities(varName, out) {
  if (!varName.startsWith('font-size-')) return 0;
  const name = varName.substring(10);
  out.add(`text-${name}`);
  return 1;
}

/**
 * `--leading-<name>` → leading-<name>
 * @type {Generator}
 */
function generateLeadingUtilities(varName, out) {
  if (!varName.startsWith('leading-')) return 0;
  out.add(varName);
  return 1;
}

/**
 * `--tracking-<name>` → tracking-<name>
 * @type {Generator}
 */
function generateTrackingUtilities(varName, out) {
  if (!varName.startsWith('tracking-')) return 0;
  out.add(varName);
  return 1;
}

/**
 * `--breakpoint-<name>` → sm:, md:, etc. are handled by patterns,
 * but we still record the variable for completeness.
 * @type {Generator}
 */
function generateBreakpointUtilities(varName, out) {
  if (!varName.startsWith('breakpoint-')) return 0;
  // Breakpoints don't map to classes directly — they're prefixes.
  return 0;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Ordered list of generators. Each is tried in sequence for every
 * theme variable. Add new generators here to extend support.
 */
const GENERATORS = [
  generateColorUtilities,
  generateAnimationUtilities,
  generateShadowUtilities,
  generateRadiusUtilities,
  generateSpacingUtilities,
  generateTextUtilities,
  generateFontFamilyUtilities,
  generateFontWeightUtilities,
  generateFontSizeUtilities,
  generateLeadingUtilities,
  generateTrackingUtilities,
  generateBreakpointUtilities,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate utility class names from a single `@theme` variable.
 *
 * @param {string}      varName - Variable name without `--` prefix (e.g. `color-primary`).
 * @param {Set<string>} out     - Set to add generated class names into.
 * @returns {number} Number of classes generated.
 */
function generateUtilitiesFromVariable(varName, out) {
  let total = 0;
  for (const gen of GENERATORS) {
    total += gen(varName, out);
  }
  return total;
}

module.exports = { generateUtilitiesFromVariable, GENERATORS };
