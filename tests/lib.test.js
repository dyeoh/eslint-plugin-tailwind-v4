/**
 * Unit tests for lib/ modules.
 */

const path = require('path');
const {
  isTailwindUtility,
  isArbitraryValue,
  getBaseClass,
  isOverridableUtility,
  hasThemeOverride,
} = require('../lib/tailwind-patterns');
const { generateUtilitiesFromVariable } = require('../lib/utility-generator');
const { extractFromCSS, unescapeClassName } = require('../lib/class-extractor');
const { findCSSEntryFile } = require('../lib/css-finder');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// tailwind-patterns
// ---------------------------------------------------------------------------

console.log('\n--- isTailwindUtility ---');

const VALID_UTILITIES = [
  'flex', 'grid', 'block', 'hidden', 'inline-flex', 'contents',
  'p-4', 'm-2', 'mx-auto', 'px-0', 'gap-4',
  'text-lg', 'font-bold', 'text-center', 'italic', 'underline', 'truncate',
  'bg-red-500', 'text-white', 'border-gray-200',
  'rounded-lg', 'shadow-md', 'opacity-50',
  'w-full', 'h-screen', 'size-10',
  'absolute', 'relative', 'sticky', 'fixed',
  'top-0', 'left-0', 'z-10', 'inset-0',
  'transition', 'duration-300', 'ease-in-out',
  'cursor-pointer', 'select-none',
  'sr-only', 'not-sr-only',
  'grid-cols-3', 'col-span-2', 'row-span-full',
  'aspect-video', 'aspect-square',
  'group', 'peer',
  'group/sidebar', 'peer/input',
  'animate-spin', 'animate-bounce',
  'order-1', 'order-first',
  'text-ellipsis', 'line-clamp-3',
  '-translate-x-4', '-rotate-45',
  'bg-gradient-to-r', 'bg-linear-to-br',
  'from-red-500', 'via-purple-500', 'to-blue-500',
  'ring-2', 'ring-inset',
  'divide-y', 'divide-gray-200',
  'space-x-4', 'space-y-2',
  'list-disc', 'list-inside',
  'object-cover', 'object-center',
  'ps-4', 'me-2',
  'start-0', 'end-auto',
];

for (const cls of VALID_UTILITIES) {
  assert(isTailwindUtility(cls), `${cls} should be valid`);
}

console.log('--- isArbitraryValue ---');

assert(isArbitraryValue('bg-[#ff0000]'), 'bg-[#ff0000]');
assert(isArbitraryValue('w-[200px]'), 'w-[200px]');
assert(isArbitraryValue('grid-cols-[1fr_2fr]'), 'grid-cols-[1fr_2fr]');
assert(!isArbitraryValue('flex'), 'flex is not arbitrary');
assert(!isArbitraryValue('data-[state=open]:'), 'data-[] prefix is not arbitrary');

console.log('--- getBaseClass ---');

assert(getBaseClass('hover:bg-blue-500') === 'bg-blue-500', 'strip hover:');
assert(getBaseClass('sm:flex') === 'flex', 'strip sm:');
assert(getBaseClass('dark:text-white') === 'text-white', 'strip dark:');
assert(getBaseClass('sm:hover:bg-blue-600') === 'bg-blue-600', 'strip chained sm:hover:');
assert(getBaseClass('!font-bold') === 'font-bold', 'strip !');
assert(getBaseClass('flex') === null, 'no prefix returns null');
assert(getBaseClass('group-hover:opacity-100') === 'opacity-100', 'strip group-hover:');
assert(getBaseClass('peer-focus:ring-2') === 'ring-2', 'strip peer-focus:');
assert(getBaseClass('first-letter:text-lg') === 'text-lg', 'strip first-letter:');
assert(getBaseClass('before:content-[""]') === 'content-[""]', 'strip before:');
assert(getBaseClass('after:absolute') === 'absolute', 'strip after:');

console.log('--- isOverridableUtility / hasThemeOverride ---');

assert(isOverridableUtility('text-lg'), 'text-lg is overridable');
assert(isOverridableUtility('font-bold'), 'font-bold is overridable');
assert(!isOverridableUtility('flex'), 'flex is not overridable');

const themeVars = new Set(['font-size-lg', 'font-weight-bold', 'color-red-500']);
assert(hasThemeOverride('text-lg', themeVars), 'text-lg overridden by font-size-lg');
assert(hasThemeOverride('font-bold', themeVars), 'font-bold overridden');
assert(!hasThemeOverride('text-sm', themeVars), 'text-sm not overridden');

// ---------------------------------------------------------------------------
// utility-generator
// ---------------------------------------------------------------------------

console.log('\n--- generateUtilitiesFromVariable ---');

const colorOut = new Set();
generateUtilitiesFromVariable('color-primary', colorOut);
assert(colorOut.has('text-primary'), 'color-primary → text-primary');
assert(colorOut.has('bg-primary'), 'color-primary → bg-primary');
assert(colorOut.has('border-primary'), 'color-primary → border-primary');
assert(colorOut.has('from-primary'), 'color-primary → from-primary');
assert(colorOut.has('divide-primary'), 'color-primary → divide-primary');

const animOut = new Set();
generateUtilitiesFromVariable('animate-fadeIn', animOut);
assert(animOut.has('animate-fadeIn'), 'animate-fadeIn → animate-fadeIn');

const shadowOut = new Set();
generateUtilitiesFromVariable('shadow-soft', shadowOut);
assert(shadowOut.has('shadow-soft'), 'shadow-soft → shadow-soft');

const radiusOut = new Set();
generateUtilitiesFromVariable('radius-pill', radiusOut);
assert(radiusOut.has('rounded-pill'), 'radius-pill → rounded-pill');

const spacingOut = new Set();
generateUtilitiesFromVariable('spacing-18', spacingOut);
assert(spacingOut.has('p-18'), 'spacing-18 → p-18');
assert(spacingOut.has('m-18'), 'spacing-18 → m-18');
assert(spacingOut.has('gap-18'), 'spacing-18 → gap-18');
assert(spacingOut.has('w-18'), 'spacing-18 → w-18');
assert(spacingOut.has('h-18'), 'spacing-18 → h-18');
assert(spacingOut.has('inset-18'), 'spacing-18 → inset-18');

const fontFamilyOut = new Set();
generateUtilitiesFromVariable('font-family-display', fontFamilyOut);
assert(fontFamilyOut.has('font-display'), 'font-family-display → font-display');

const fontWeightOut = new Set();
generateUtilitiesFromVariable('font-weight-semi-bold', fontWeightOut);
assert(fontWeightOut.has('font-semi-bold'), 'font-weight-semi-bold → font-semi-bold');

const fontSizeOut = new Set();
generateUtilitiesFromVariable('font-size-xxl', fontSizeOut);
assert(fontSizeOut.has('text-xxl'), 'font-size-xxl → text-xxl');

const textOut = new Set();
generateUtilitiesFromVariable('text-title', textOut);
assert(textOut.has('text-title'), 'text-title → text-title');

const nothingOut = new Set();
const count = generateUtilitiesFromVariable('random-thing', nothingOut);
assert(count === 0 && nothingOut.size === 0, 'unknown var generates nothing');

// ---------------------------------------------------------------------------
// class-extractor
// ---------------------------------------------------------------------------

console.log('\n--- extractFromCSS ---');

const css = `
@import "tailwindcss";

@theme {
  --color-brand: #123;
  --animate-slide: slide 0.3s;
  --radius-xl: 1rem;
}

@utility card-grid {
  display: grid;
}

@layer components {
  .card { background: white; }
  .badge { display: inline-flex; }
}

.custom-class { display: block; }
`;

const result = extractFromCSS(css, 'test.css');
assert(result.classes.has('card-grid'), '@utility card-grid extracted');
assert(result.classes.has('card'), '@layer .card extracted');
assert(result.classes.has('badge'), '@layer .badge extracted');
assert(result.classes.has('custom-class'), '.custom-class extracted');
assert(result.classes.has('text-brand'), 'color-brand → text-brand generated');
assert(result.classes.has('bg-brand'), 'color-brand → bg-brand generated');
assert(result.classes.has('animate-slide'), 'animate-slide generated');
assert(result.classes.has('rounded-xl'), 'radius-xl → rounded-xl generated');
assert(result.themeVariables.has('color-brand'), 'theme var recorded');
assert(result.themeVariables.has('animate-slide'), 'theme var recorded');

// ---------------------------------------------------------------------------
// unescapeClassName
// ---------------------------------------------------------------------------

console.log('\n--- unescapeClassName ---');

assert(unescapeClassName('hover\\:bg-blue') === 'hover:bg-blue', 'unescape colon');
assert(unescapeClassName('w-1\\/2') === 'w-1/2', 'unescape slash');
assert(unescapeClassName('bg-\\[#fff\\]') === 'bg-[#fff]', 'unescape brackets');

// ---------------------------------------------------------------------------
// css-finder
// ---------------------------------------------------------------------------

console.log('\n--- findCSSEntryFile ---');

// With explicit path, it should return that path.
const fixturesRoot = path.join(__dirname, '..');
const explicit = findCSSEntryFile(fixturesRoot, 'tests/fixtures/globals.css');
assert(explicit.endsWith('tests/fixtures/globals.css'), 'explicit path returned');

// Auto-detect should find tests/fixtures/globals.css if we create a fake project root
// (skip this — it would require directory manipulation; trust the unit test above)

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n✓ ${passed} passed, ✗ ${failed} failed\n`);
if (failed > 0) process.exit(1);
