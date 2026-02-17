/**
 * CSS Parser
 *
 * Reads a CSS entry file, follows @import chains, and delegates
 * extraction to the class-extractor module. Returns a complete set
 * of valid classes and metadata.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { extractFromCSS } = require('./class-extractor');

// ---------------------------------------------------------------------------
// Tailwind import detection
// ---------------------------------------------------------------------------

/** Patterns that prove Tailwind is in the import graph. */
const TAILWIND_IMPORT_PATTERNS = [
  /@import\s+["']tailwindcss["']/,
  /@import\s+url\(["']?tailwindcss["']?\)/,
  /@tailwind\s+(base|components|utilities)/,
  /@import\s+["']tailwindcss\/[^"']*["']/,
  /@theme\s*\{/,
];

/**
 * @param {string} css
 * @returns {boolean}
 */
function containsTailwindImport(css) {
  return TAILWIND_IMPORT_PATTERNS.some((p) => p.test(css));
}

// ---------------------------------------------------------------------------
// @import queue helpers
// ---------------------------------------------------------------------------

/** Extensions to try when an @import has no extension. */
const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];

/**
 * Resolve relative @import paths from `cssContent` and push them onto `queue`.
 */
function queueImports(cssContent, currentPath, queue, visited, debug) {
  const importRegex = /@import\s+["']([^"']+)["'];?/g;
  let match;

  while ((match = importRegex.exec(cssContent)) !== null) {
    const importPath = match[1];

    // Skip bare Tailwind package imports.
    if (importPath === 'tailwindcss' || importPath.startsWith('tailwindcss/')) continue;

    // Only follow relative imports.
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) continue;

    let fullPath = path.resolve(path.dirname(currentPath), importPath);

    // Try extensions when none is specified.
    if (!path.extname(fullPath)) {
      for (const ext of CSS_EXTENSIONS) {
        const withExt = fullPath + ext;
        if (fs.existsSync(withExt)) {
          fullPath = withExt;
          break;
        }
      }
    }

    if (fs.existsSync(fullPath) && !visited.has(fullPath)) {
      queue.push(fullPath);
      if (debug) console.log(`[css-parser] Queued import: ${fullPath}`);
    } else if (!fs.existsSync(fullPath) && debug) {
      console.warn(`[css-parser] Import not found: ${fullPath}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSS entry file and all its transitive @imports.
 *
 * @param {string}  cssPath     - Absolute path to the CSS entry file.
 * @param {string}  projectRoot - Absolute path to the project root.
 * @param {boolean} [debug]     - Enable debug logging.
 * @returns {{ validClasses: Set<string>, hasTailwindImport: boolean, themeVariables: Set<string> }}
 */
function parseCSS(cssPath, projectRoot, debug = false) {
  const validClasses = new Set();
  const themeVariables = new Set();
  let hasTailwindImport = false;

  if (!fs.existsSync(cssPath)) {
    if (debug) console.warn(`[css-parser] CSS file not found: ${cssPath}`);
    return { validClasses, hasTailwindImport, themeVariables };
  }

  const visited = new Set();
  const queue = [cssPath];

  while (queue.length > 0) {
    const currentPath = queue.shift();
    if (visited.has(currentPath)) continue;
    visited.add(currentPath);

    let cssContent;
    try {
      cssContent = fs.readFileSync(currentPath, 'utf8');
    } catch (err) {
      if (debug) console.warn(`[css-parser] Error reading ${currentPath}:`, err.message);
      continue;
    }

    if (debug) {
      console.log(`[css-parser] Parsing: ${path.relative(projectRoot, currentPath)}`);
    }

    // Detect Tailwind import.
    if (!hasTailwindImport && containsTailwindImport(cssContent)) {
      hasTailwindImport = true;
      if (debug) console.log('[css-parser] Tailwind import detected');
    }

    // Extract classes & theme vars from this file.
    const result = extractFromCSS(cssContent, path.basename(currentPath), debug);
    result.classes.forEach((cls) => validClasses.add(cls));
    result.themeVariables.forEach((v) => themeVariables.add(v));

    // Follow @imports.
    queueImports(cssContent, currentPath, queue, visited, debug);
  }

  if (debug) {
    console.log(`[css-parser] Tailwind import detected: ${hasTailwindImport}`);
    console.log(`[css-parser] Total valid classes: ${validClasses.size}`);
    console.log(`[css-parser] Theme variables: ${themeVariables.size}`);
  }

  return { validClasses, hasTailwindImport, themeVariables };
}

module.exports = { parseCSS };
