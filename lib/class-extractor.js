/**
 * Class Extractor
 *
 * Extracts custom class names from a single CSS file's content.
 * Handles:
 * - Explicit class selectors  (`.my-class { … }`)
 * - `@utility` definitions    (`@utility btn { … }`)
 * - `@layer` definitions      (`@layer components { .card { … } }`)
 * - `@theme` variables        (`--color-primary: …`)
 * - Gradient utility classes   (`.from-primary { … }`)
 *
 * Theme variables are also passed to the utility-generator to create
 * the corresponding Tailwind utility class names.
 */

'use strict';

const { generateUtilitiesFromVariable } = require('./utility-generator');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Un-escape CSS class name characters.
 * E.g. `hover\:bg-blue-500` → `hover:bg-blue-500`
 *
 * @param {string} raw
 * @returns {string}
 */
function unescapeClassName(raw) {
  return raw
    .replace(/\\:/g, ':')
    .replace(/\\\//g, '/')
    .replace(/\\\./g, '.')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\-/g, '-')
    .replace(/\\\\/g, '\\');
}

/** Regex used to match class selectors in CSS. */
const CLASS_SELECTOR_RE = /\.([a-zA-Z@][\w-]*(?:\\[\w\/\.\:\[\]]+[\w-]*)*)\s*\{/g;

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

/**
 * Extract explicit class selectors from CSS content.
 */
function extractExplicitClasses(css, classes, debug, fileName) {
  const re = new RegExp(CLASS_SELECTOR_RE.source, 'g');
  let m;
  while ((m = re.exec(css)) !== null) {
    const cls = unescapeClassName(m[1]);
    classes.add(cls);
  }
}

/**
 * Extract `@utility <name> { … }` definitions.
 */
function extractUtilityDefinitions(css, classes, debug, fileName) {
  const re = /@utility\s+([a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    classes.add(m[1]);
    if (debug) console.log(`[extractor] @utility in ${fileName}: ${m[1]}`);
  }
}

/**
 * Extract class selectors from `@layer base|components|utilities { … }` blocks.
 */
function extractLayerDefinitions(css, classes, debug, fileName) {
  const layerRe = /@layer\s+(base|components|utilities)\s*\{((?:[^{}]*\{[^{}]*\}[^{}]*)*[^{}]*)\}/gs;
  let lm;
  while ((lm = layerRe.exec(css)) !== null) {
    const layerContent = lm[2];
    const innerRe = new RegExp(CLASS_SELECTOR_RE.source, 'g');
    let im;
    while ((im = innerRe.exec(layerContent)) !== null) {
      const cls = unescapeClassName(im[1]);
      classes.add(cls);
      if (debug) console.log(`[extractor] @layer class in ${fileName}: .${cls}`);
    }
  }
}

/**
 * Extract gradient utility selectors (`.from-*`, `.via-*`, `.to-*`).
 */
function extractGradientUtilities(css, classes, debug, fileName) {
  const re = /\.(from|via|to)-([a-zA-Z][\w-]*)\s*\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    classes.add(`${m[1]}-${m[2]}`);
  }
}

/**
 * Extract `@theme { … }` variables, record them, and generate
 * corresponding utility classes.
 */
function extractThemeVariables(css, classes, themeVars, debug, fileName) {
  const themeRe = /@theme\s*\{([\s\S]*?)\}/gs;
  let tm;
  while ((tm = themeRe.exec(css)) !== null) {
    const varRe = /--([a-zA-Z][\w-]*)\s*:\s*([^;]+);/g;
    let vm;
    while ((vm = varRe.exec(tm[1])) !== null) {
      const varName = vm[1];
      themeVars.add(varName);

      // Generate utility classes implied by this theme variable.
      const generated = generateUtilitiesFromVariable(varName, classes);
      if (debug && generated > 0) {
        console.log(`[extractor] ${generated} utilities from --${varName} (${fileName})`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all extractors on a single CSS file's content.
 *
 * @param {string}  cssContent - Raw CSS text.
 * @param {string}  fileName   - Basename for debug messages.
 * @param {boolean} [debug]
 * @returns {{ classes: Set<string>, themeVariables: Set<string> }}
 */
function extractFromCSS(cssContent, fileName, debug = false) {
  const classes = new Set();
  const themeVariables = new Set();

  extractExplicitClasses(cssContent, classes, debug, fileName);
  extractGradientUtilities(cssContent, classes, debug, fileName);
  extractThemeVariables(cssContent, classes, themeVariables, debug, fileName);
  extractUtilityDefinitions(cssContent, classes, debug, fileName);
  extractLayerDefinitions(cssContent, classes, debug, fileName);

  if (debug) {
    console.log(`[extractor] ${classes.size} classes from ${fileName}`);
  }

  return { classes, themeVariables };
}

module.exports = { extractFromCSS, unescapeClassName };
