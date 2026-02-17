/**
 * CSS Entry Point Finder
 *
 * Auto-detects the Tailwind CSS entry file in a project by scanning
 * common locations. Falls back to user-provided path if given.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Common CSS entry point paths used across different project setups.
 * Ordered by prevalence — checked top-to-bottom, first match wins.
 */
const COMMON_CSS_PATHS = [
  // Tailwind v4 / Vite setups
  'src/styles/globals.css',
  'src/index.css',
  'src/app.css',
  'src/main.css',
  'src/global.css',
  'src/styles/global.css',
  'src/styles/main.css',
  'src/styles/index.css',
  'src/css/globals.css',
  'src/css/index.css',
  // Next.js
  'app/globals.css',
  'app/global.css',
  'app/layout.css',
  'src/app/globals.css',
  'src/app/global.css',
  // Nuxt
  'assets/css/main.css',
  'assets/css/globals.css',
  'assets/css/tailwind.css',
  // SvelteKit
  'src/app.css',
  // Generic
  'styles/globals.css',
  'styles/global.css',
  'styles/main.css',
  'styles/index.css',
  'css/globals.css',
  'css/main.css',
  'global.css',
  'globals.css',
  'tailwind.css',
];

/**
 * Patterns that indicate a file is a Tailwind v4 entry point.
 */
const TAILWIND_ENTRY_PATTERNS = [
  /@import\s+["']tailwindcss["']/,
  /@import\s+url\(["']?tailwindcss["']?\)/,
  /@tailwind\s+(base|components|utilities)/,
  /@import\s+["']tailwindcss\/[^"']*["']/,
];

/**
 * Check whether a CSS file is a Tailwind entry point.
 * @param {string} filePath - Absolute path to a CSS file.
 * @returns {boolean}
 */
function isTailwindEntryFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return TAILWIND_ENTRY_PATTERNS.some((p) => p.test(content));
  } catch {
    return false;
  }
}

/**
 * Resolve the Tailwind CSS entry file for a project.
 *
 * Resolution order:
 * 1. If `userPath` is provided, use it directly.
 * 2. Scan COMMON_CSS_PATHS for a Tailwind entry point.
 * 3. Return the first `.css` file found at common paths (even if it
 *    doesn't contain a Tailwind import — the parser handles that).
 * 4. Fall back to `src/styles/globals.css` so the rule still reports
 *    a meaningful "file not found" when nothing matches.
 *
 * @param {string}  projectRoot - Absolute path to the project root.
 * @param {string} [userPath]   - User-provided cssFile option.
 * @param {boolean} [debug]     - Print debug info.
 * @returns {string} Absolute path to the CSS entry file.
 */
function findCSSEntryFile(projectRoot, userPath, debug = false) {
  // If the user explicitly set a path, honour it.
  if (userPath) {
    const resolved = path.resolve(projectRoot, userPath);
    if (debug) console.log(`[css-finder] Using user-provided path: ${resolved}`);
    return resolved;
  }

  // Auto-detect: find the first file that looks like a Tailwind entry.
  for (const candidate of COMMON_CSS_PATHS) {
    const abs = path.resolve(projectRoot, candidate);
    if (fs.existsSync(abs) && isTailwindEntryFile(abs)) {
      if (debug) console.log(`[css-finder] Auto-detected Tailwind entry: ${candidate}`);
      return abs;
    }
  }

  // Fallback: first existing CSS file (might not have @import tailwindcss
  // but could still have @theme blocks).
  for (const candidate of COMMON_CSS_PATHS) {
    const abs = path.resolve(projectRoot, candidate);
    if (fs.existsSync(abs)) {
      if (debug) console.log(`[css-finder] Using fallback CSS file: ${candidate}`);
      return abs;
    }
  }

  // Nothing found — return the legacy default so error messages are clear.
  const fallback = path.resolve(projectRoot, 'src/styles/globals.css');
  if (debug) console.log(`[css-finder] No CSS file found, using default: src/styles/globals.css`);
  return fallback;
}

module.exports = {
  findCSSEntryFile,
  isTailwindEntryFile,
  COMMON_CSS_PATHS,
};
