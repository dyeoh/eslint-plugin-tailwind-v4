/**
 * Tailwind Pattern Matcher
 *
 * Contains the regex patterns for every built-in Tailwind CSS v4 utility.
 * Split into logical groups for readability and maintenance.
 *
 * Also provides helpers for:
 * - Stripping variant prefixes  (`hover:`, `sm:`, `dark:`, …)
 * - Detecting arbitrary values   (`bg-[#f00]`)
 * - Identifying overridable utilities (ones that @theme can replace)
 * - Checking if a @theme override exists
 */

'use strict';

// =============================================================================
// VARIANT PREFIXES
// =============================================================================

/**
 * All recognised variant prefixes. Used to strip chained prefixes
 * from a class name to get at the base utility.
 *
 * Order doesn't matter — we strip iteratively until nothing matches.
 */
const VARIANT_PREFIXES = [
  // Responsive
  'sm:', 'md:', 'lg:', 'xl:', '2xl:',
  // Pseudo-classes
  'hover:', 'focus:', 'focus-within:', 'focus-visible:', 'active:',
  'visited:', 'target:', 'first:', 'last:', 'only:', 'odd:', 'even:',
  'first-of-type:', 'last-of-type:', 'only-of-type:', 'empty:',
  'disabled:', 'enabled:', 'checked:', 'indeterminate:', 'default:',
  'required:', 'valid:', 'invalid:', 'in-range:', 'out-of-range:',
  'placeholder-shown:', 'autofill:', 'read-only:',
  // Pseudo-elements
  'first-letter:', 'first-line:', 'selection:', 'marker:', 'placeholder:', 'file:',
  'before:', 'after:', 'backdrop:',
  // Group variants
  'group-hover:', 'group-focus:', 'group-active:', 'group-focus-within:',
  'group-focus-visible:', 'group-visited:', 'group-target:',
  'group-first:', 'group-last:', 'group-only:', 'group-odd:', 'group-even:',
  'group-first-of-type:', 'group-last-of-type:', 'group-only-of-type:',
  'group-empty:', 'group-disabled:', 'group-enabled:', 'group-checked:',
  'group-indeterminate:', 'group-default:', 'group-required:',
  'group-valid:', 'group-invalid:', 'group-in-range:', 'group-out-of-range:',
  'group-placeholder-shown:', 'group-autofill:', 'group-read-only:',
  'group-has-hover:', 'group-has-focus:', 'group-has-active:',
  'group-has-disabled:', 'group-has-checked:', 'group-has-selected:',
  'group-has-valid:', 'group-has-invalid:', 'group-has-required:', 'group-has-optional:',
  // Peer variants
  'peer-hover:', 'peer-focus:', 'peer-active:', 'peer-focus-within:',
  'peer-focus-visible:', 'peer-visited:', 'peer-target:',
  'peer-first:', 'peer-last:', 'peer-only:', 'peer-odd:', 'peer-even:',
  'peer-first-of-type:', 'peer-last-of-type:', 'peer-only-of-type:',
  'peer-empty:', 'peer-disabled:', 'peer-enabled:', 'peer-checked:',
  'peer-indeterminate:', 'peer-default:', 'peer-required:',
  'peer-valid:', 'peer-invalid:', 'peer-in-range:', 'peer-out-of-range:',
  'peer-placeholder-shown:', 'peer-autofill:', 'peer-read-only:',
  'peer-has-hover:', 'peer-has-focus:', 'peer-has-active:',
  'peer-has-disabled:', 'peer-has-checked:', 'peer-has-selected:',
  'peer-has-valid:', 'peer-has-invalid:', 'peer-has-required:', 'peer-has-optional:',
  // Colour scheme
  'dark:', 'light:',
  // Motion / contrast
  'motion-safe:', 'motion-reduce:', 'contrast-more:', 'contrast-less:',
  // Orientation
  'portrait:', 'landscape:',
  // Print
  'print:',
];

/**
 * Regex-based prefixes that need pattern matching rather than literal comparison.
 */
const VARIANT_PREFIX_PATTERNS = [
  /^group-has-\[.*?\]:/,
  /^peer-has-\[.*?\]:/,
  /^group-[\w-]+\/[\w-]+:/,
  /^supports-\[.*?\]:/,
  /^data-\[.*?\]:/,
  /^aria-\[.*?\]:/,
  /^\[&.*?\]:/,
];

// =============================================================================
// BUILT-IN UTILITY PATTERNS
// =============================================================================

/**
 * Patterns for every built-in Tailwind CSS v4 utility.
 * Grouped by category to make additions easy.
 */
const TAILWIND_PATTERNS = [
  // -- Container Queries ------------------------------------------------------
  /^@container$/,
  /^@(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)\/(.+)$/,
  /^@container-(.+)\/(.+)$/,

  // -- Layout -----------------------------------------------------------------
  /^(container|block|inline-block|inline|flex|inline-flex|table|inline-table|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row-group|table-row|flow-root|grid|inline-grid|contents|list-item|hidden)$/,

  // -- Aspect Ratio -----------------------------------------------------------
  /^aspect-(square|video|auto|\d+\/\d+)$/,

  // -- Group & Peer -----------------------------------------------------------
  /^(group|peer)$/,
  /^group\/[\w-]+$/,
  /^peer\/[\w-]+$/,

  // -- Flexbox ----------------------------------------------------------------
  /^flex-(row|col|wrap|nowrap|1|auto|initial|none)(-reverse)?$/,
  /^flex-(\d+\/\d+|\d+)$/,
  /^(grow|grow-0|shrink|shrink-0)$/,
  /^flex-(grow|shrink)(-0)?$/,
  /^(items|justify|content|self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
  /^(place-content|place-items|place-self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
  /^basis-(auto|full|0|px|\d+(\.\d+)?|\d+\/\d+)$/,
  /^order-(\d+|first|last|none)$/,

  // -- Grid -------------------------------------------------------------------
  /^grid-cols-(none|\d+|subgrid)$/,
  /^col-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
  /^grid-rows-(none|\d+|subgrid)$/,
  /^row-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
  /^grid-flow-(row|col|dense|row-dense|col-dense)$/,
  /^auto-(cols|rows)-(auto|min|max|fr)$/,

  // -- Spacing ----------------------------------------------------------------
  /^(p|m|px|py|pt|pr|pb|pl|ps|pe|mx|my|mt|mr|mb|ml|ms|me)-(\d+\.?\d*|px|auto)$/,
  /^(m|p)(s|e|is|ie|bs|be)-(\d+\.?\d*|px|auto)$/,
  /^gap(-x|-y)?-(\d+\.?\d*|px)$/,
  /^space-(x|y)-(\d+\.?\d*|px|reverse)$/,

  // -- Sizing -----------------------------------------------------------------
  /^(w|h)-(dvh|lvh|svh|dvw|lvw|svw)$/,
  /^(w|h)-(\d+\/\d+)$/,
  /^(w|h|min-w|min-h|max-w|max-h)-(0|px|\d+\.?\d*|auto|full|screen|min|max|fit)$/,
  /^(min-w|min-h|max-w|max-h)-(0|none|full|min|max|fit|prose|screen-(sm|md|lg|xl|2xl))$/,
  /^(min-w|min-h|max-w|max-h)-(\d+\/\d+)$/,
  /^size-(\d+\.?\d*|px|auto|full|screen|min|max|fit)$/,

  // -- Typography -------------------------------------------------------------
  /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  /^font-(sans|serif|mono)$/,
  /^text-(left|center|right|justify|start|end)$/,
  /^(uppercase|lowercase|capitalize|normal-case)$/,
  /^(italic|not-italic)$/,
  /^(underline|overline|line-through|no-underline)$/,
  /^decoration-(slice|clone|auto|from-font|\d+|double|dotted|dashed|wavy|solid)$/,
  /^underline-offset-(auto|\d+)$/,
  /^leading-(none|tight|snug|normal|relaxed|loose|\d+\.?\d*)$/,
  /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
  /^indent-(\d+\.?\d*|px)$/,
  /^(align-baseline|align-top|align-middle|align-bottom|align-text-top|align-text-bottom|align-super|align-sub)$/,
  /^text-(wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
  /^(break-normal|break-words|break-all|break-keep)$/,
  /^hyphens-(none|manual|auto)$/,
  /^text-overflow-(ellipsis|clip)$/,
  /^line-clamp-(\d+|none)$/,
  /^(truncate|antialiased|subpixel-antialiased)$/,

  // -- Logical Properties -----------------------------------------------------
  /^border-(s|e|is|ie|bs|be)(-\d+)?$/,
  /^rounded-(s|e|ss|se|ee|es)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,

  // -- Colours ----------------------------------------------------------------
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(inherit|current|transparent|black|white)$/,
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  // Directional border colours
  /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-(inherit|current|transparent|black|white)$/,
  /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-[\w-]+$/,
  /^divide-[\w-]+$/,
  // Opacity modifiers
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(\w+)(-\d+)?\/\d+$/,
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(current|transparent|inherit|black|white)\/\d+$/,
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(\w+)-(\d+)\/(\d+)$/,

  // -- Backgrounds & Gradients ------------------------------------------------
  /^bg-(fixed|local|scroll)$/,
  /^bg-(auto|cover|contain)$/,
  /^bg-(center|top|right|bottom|left|right-top|right-bottom|left-top|left-bottom)$/,
  /^bg-(repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space)$/,
  /^bg-origin-(border|padding|content)$/,
  /^bg-clip-(border|padding|content|text)$/,
  /^bg-gradient-to-(t|tr|r|br|b|bl|l|tl)$/,
  /^bg-gradient-(conic|radial|linear)$/,
  /^bg-linear-to-(t|tr|r|br|b|bl|l|tl)$/,
  /^bg-(linear|radial|conic)-gradient$/,
  // Gradient stops
  /^(from|via|to)-(inherit|current|transparent|black|white)$/,
  /^(from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  /^(from|via|to)-(inherit|current|transparent|black|white)\/\d+$/,
  /^(from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\/\d+$/,
  /^(from|via|to)-[\w-]+$/,
  /^(from|via|to)-[\w-]+\/\d+$/,

  // -- Borders ----------------------------------------------------------------
  /^border$/,
  /^border-(\d+\.?\d*|px)$/,
  /^border-(x|y|s|e|t|r|b|l)$/,
  /^border-(x|y|s|e|t|r|b|l)-(\d+\.?\d*|px)$/,
  /^border-(solid|dashed|dotted|double|hidden|none)$/,
  /^(divide-x|divide-y)(-\d+|-reverse)?$/,
  /^divide-(solid|dashed|dotted|double|none)$/,
  /^outline(-\d+|-none|-dashed|-dotted|-double|-hidden)?$/,
  /^outline-offset-\d+$/,
  /^ring(-\d+|-inset)?$/,
  /^ring-offset-\d+$/,

  // -- Border Radius ----------------------------------------------------------
  /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
  /^rounded-(s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,

  // -- Effects ----------------------------------------------------------------
  /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-inner)?$/,
  /^shadow-\w+-(\d+)(\/\d+)?$/,
  /^opacity-(\d+)$/,
  /^mix-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity|plus-darker|plus-lighter)$/,
  /^bg-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/,

  // -- Filters ----------------------------------------------------------------
  /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia)(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
  /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,

  // -- Tables -----------------------------------------------------------------
  /^(border-collapse|border-separate)$/,
  /^(table-auto|table-fixed)$/,
  /^caption-(top|bottom)$/,

  // -- Animations -------------------------------------------------------------
  /^animate-(none|spin|ping|pulse|bounce)$/,
  /^animate-[\w-]+$/,

  // -- Transforms -------------------------------------------------------------
  /^(transform|transform-cpu|transform-gpu|transform-none)$/,
  /^-?scale(-\d+|-x-\d+|-y-\d+)?$/,
  /^-?rotate-(\d+)$/,
  /^-?translate-(x|y)-(\d+\.?\d*|px|full|\d+\/\d+)$/,
  /^-?skew-(x|y)-(\d+)$/,
  /^origin-(center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/,

  // -- Transitions ------------------------------------------------------------
  /^transition(-none|-all|-colors|-opacity|-shadow|-transform)?$/,
  /^duration-(\d+)$/,
  /^delay-(\d+)$/,
  /^ease-(linear|in|out|in-out)$/,

  // -- Positioning ------------------------------------------------------------
  /^(static|fixed|absolute|relative|sticky)$/,
  /^-?(inset|inset-x|inset-y|top|right|bottom|left|start|end)-(\d+\.?\d*|px|auto|full|\d+\/\d+)$/,
  /^-?z-(\d+|auto)$/,

  // -- Overflow ---------------------------------------------------------------
  /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/,
  /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/,

  // -- Visibility -------------------------------------------------------------
  /^(visible|invisible|collapse)$/,
  /^(isolate|isolation-auto)$/,

  // -- Object Fit / Position --------------------------------------------------
  /^object-(contain|cover|fill|none|scale-down)$/,
  /^object-(bottom|center|left|left-bottom|left-top|right|right-bottom|right-top|top)$/,

  // -- Interactivity ----------------------------------------------------------
  /^(appearance-none|appearance-auto)$/,
  /^cursor-(auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out)$/,
  /^caret-\w+-(\d+)$/,
  /^pointer-events-(none|auto)$/,
  /^resize(-none|-y|-x)?$/,
  /^scroll-(auto|smooth)$/,
  /^scroll-(m|p)(-x|-y|-s|-e|-t|-r|-b|-l)?-(\d+\.?\d*|px)$/,
  /^snap-(none|x|y|both|mandatory|proximity)$/,
  /^snap-(start|end|center|align-none)$/,
  /^touch-(auto|none|pan-x|pan-left|pan-right|pan-y|pan-up|pan-down|pinch-zoom|manipulation)$/,
  /^select-(none|text|all|auto)$/,
  /^will-change-(auto|scroll|contents|transform)$/,

  // -- SVG --------------------------------------------------------------------
  /^fill-(none|current|\w+-\d+)$/,
  /^stroke-(none|current|\w+-\d+|\d+)$/,

  // -- Accessibility ----------------------------------------------------------
  /^(sr-only|not-sr-only)$/,

  // -- Lists ------------------------------------------------------------------
  /^list-(none|disc|decimal)$/,
  /^list-(inside|outside)$/,
  /^marker-\w+-(\d+)$/,

  // -- Variant prefixes (as classes) ------------------------------------------
  /^(hover|focus|focus-within|focus-visible|active|visited|target|first|last|only|odd|even|first-of-type|last-of-type|only-of-type|empty|disabled|enabled|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|read-only):/,
  /^(first-letter|first-line|selection|marker|placeholder|file|before|after|backdrop):/,
  /^(group-hover|group-focus|group-active|group-focus-within|group-focus-visible|group-visited|group-target|group-first|group-last|group-only|group-odd|group-even|group-first-of-type|group-last-of-type|group-only-of-type|group-empty|group-disabled|group-enabled|group-checked|group-indeterminate|group-default|group-required|group-valid|group-invalid|group-in-range|group-out-of-range|group-placeholder-shown|group-autofill|group-read-only):/,
  /^group-has-\[.*?\]:/,
  /^(group-has-hover|group-has-focus|group-has-active|group-has-disabled|group-has-checked|group-has-selected|group-has-valid|group-has-invalid|group-has-required|group-has-optional):/,
  /^group-[\w-]+\/[\w-]+:[\w-]+$/,
  /^(peer-hover|peer-focus|peer-active|peer-focus-within|peer-focus-visible|peer-visited|peer-target|peer-first|peer-last|peer-only|peer-odd|peer-even|peer-first-of-type|peer-last-of-type|peer-only-of-type|peer-empty|peer-disabled|peer-enabled|peer-checked|peer-indeterminate|peer-default|peer-required|peer-valid|peer-invalid|peer-in-range|peer-out-of-range|peer-placeholder-shown|peer-autofill|peer-read-only):/,
  /^peer-has-\[.*?\]:/,
  /^(peer-has-hover|peer-has-focus|peer-has-active|peer-has-disabled|peer-has-checked|peer-has-selected|peer-has-valid|peer-has-invalid|peer-has-required|peer-has-optional):/,

  // -- Media queries ----------------------------------------------------------
  /^(sm|md|lg|xl|2xl):/,
  /^(dark|light):/,
  /^(motion-safe|motion-reduce|contrast-more|contrast-less):/,
  /^(portrait|landscape):/,
  /^print:/,
  /^supports-\[.*?\]:/,

  // -- Attribute selectors / arbitrary selectors ------------------------------
  /^(data-\[.*?\]|aria-\[.*?\]):/,
  /^\[&.*?\]:/,
  /^\[.*?\]$/,
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a class name is a built-in Tailwind utility.
 * @param {string} className - May include `!` prefix.
 * @returns {boolean}
 */
function isTailwindUtility(className) {
  const clean = className.startsWith('!') ? className.substring(1) : className;
  return TAILWIND_PATTERNS.some((p) => p.test(clean));
}

/**
 * Check if a class uses an arbitrary value (`[…]`).
 * @param {string} className
 * @returns {boolean}
 */
function isArbitraryValue(className) {
  return (
    /\[.+\]/.test(className) &&
    !/^\[&.*?\]:/.test(className) &&
    !/^data-\[.*?\]:/.test(className) &&
    !/^aria-\[.*?\]:/.test(className) &&
    !/^supports-\[.*?\]:/.test(className)
  );
}

/**
 * Strip all variant prefixes and the `!` modifier from a class name
 * to reveal the base utility.
 *
 * Returns `null` if nothing was stripped (i.e. the class has no prefixes).
 *
 * @param {string} className
 * @returns {string|null}
 */
function getBaseClass(className) {
  let base = className;
  if (base.startsWith('!')) base = base.substring(1);

  let changed = base !== className;

  // Strip known literal prefixes and regex-based prefixes iteratively.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let stripped = false;

    for (const prefix of VARIANT_PREFIXES) {
      if (base.startsWith(prefix)) {
        base = base.substring(prefix.length);
        stripped = true;
        changed = true;
        break;
      }
    }

    if (!stripped) {
      for (const pattern of VARIANT_PREFIX_PATTERNS) {
        const m = base.match(pattern);
        if (m) {
          base = base.substring(m[0].length);
          stripped = true;
          changed = true;
          break;
        }
      }
    }

    if (!stripped) break;
  }

  return changed ? base : null;
}

// =============================================================================
// OVERRIDABLE UTILITY DETECTION
// =============================================================================

/** Patterns for built-in utilities that @theme variables can override. */
const OVERRIDABLE_PATTERNS = [
  /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
  /^font-(sans|serif|mono)$/,
  /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  /^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px)$/,
  /^gap(-x|-y)?-(\d+\.?\d*|px)$/,
  /^space-(x|y)-(\d+\.?\d*|px)$/,
  /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
  /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-inner)?$/,
  /^animate-(none|spin|ping|pulse|bounce)$/,
];

/**
 * @param {string} className
 * @returns {boolean}
 */
function isOverridableUtility(className) {
  return OVERRIDABLE_PATTERNS.some((p) => p.test(className));
}

/**
 * Check if a `@theme` override exists for a given built-in utility.
 *
 * @param {string}      className      - The utility class name.
 * @param {Set<string>} themeVariables - Set of theme variable names found.
 * @returns {boolean}
 */
function hasThemeOverride(className, themeVariables) {
  // Typography sizes
  if (/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(className)) {
    const size = className.replace('text-', '');
    return themeVariables.has(`font-size-${size}`) || themeVariables.has(`text-${size}`);
  }

  // Font weights
  if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(className)) {
    const weight = className.replace('font-', '');
    return themeVariables.has(`font-weight-${weight}`);
  }

  // Default colours
  const colorMatch = className.match(
    /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  );
  if (colorMatch) {
    const [, , colorName, shade] = colorMatch;
    return themeVariables.has(`color-${colorName}-${shade}`);
  }

  // Spacing
  const spacingMatch = className.match(
    /^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px)$/,
  );
  if (spacingMatch) {
    const [, , size] = spacingMatch;
    return themeVariables.has(`spacing-${size}`);
  }

  // Border radius
  const radiusMatch = className.match(/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/);
  if (radiusMatch) {
    const radius = radiusMatch[1] ? radiusMatch[1].replace('-', '') : 'DEFAULT';
    return themeVariables.has(`radius-${radius}`);
  }

  // Shadows
  const shadowMatch = className.match(/^shadow(-none|-sm|-md|-lg|-2xl|-3xl|-inner)?$/);
  if (shadowMatch) {
    const shadow = shadowMatch[1] ? shadowMatch[1].replace('-', '') : 'DEFAULT';
    return themeVariables.has(`shadow-${shadow}`);
  }

  return false;
}

module.exports = {
  TAILWIND_PATTERNS,
  VARIANT_PREFIXES,
  VARIANT_PREFIX_PATTERNS,
  isTailwindUtility,
  isArbitraryValue,
  getBaseClass,
  isOverridableUtility,
  hasThemeOverride,
};
