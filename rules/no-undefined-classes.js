// no-undefined-classes.js
const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Tailwind v4 classes like VS Code IntelliSense',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          cssFile: {
            type: 'string',
            description: 'Path to globals.css file',
            default: 'src/styles/globals.css',
          },
          allowArbitraryValues: {
            type: 'boolean',
            default: true,
          },
          debug: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefinedClass: "Tailwind class '{{className}}' is not defined",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const { 
      cssFile = 'src/styles/globals.css', 
      allowArbitraryValues = true,
      debug = false
    } = options;

    let customClasses = new Set();
    let hasTailwindImport = false;
    let cssLoaded = false;

    function loadCSSConfig() {
      if (cssLoaded) return;

      const projectRoot = context.getCwd();
      const cssPath = path.resolve(projectRoot, cssFile);
      
      // Parse CSS imports to detect Tailwind and custom classes
      parseCSSImports(cssPath, projectRoot);
      
      if (debug) {
        console.log(`✅ Tailwind import detected: ${hasTailwindImport}`);
        console.log(`✅ Custom classes found: ${customClasses.size}`);
        console.log(`🔍 Sample custom classes: ${Array.from(customClasses).slice(0, 10).join(', ')}`);
      }
      
      cssLoaded = true;
    }

    function parseCSSImports(cssPath, projectRoot) {
      if (!fs.existsSync(cssPath)) return;

      const visited = new Set();
      const cssQueue = [cssPath];

      while (cssQueue.length > 0) {
        const currentPath = cssQueue.shift();
        if (visited.has(currentPath)) continue;
        visited.add(currentPath);

        try {
          const cssContent = fs.readFileSync(currentPath, 'utf8');
          
          // Detect Tailwind import
          if (cssContent.includes('@import "tailwindcss"')) {
            hasTailwindImport = true;
          }
          
          // Extract custom utility classes
          extractCustomClasses(cssContent);
          
          // Follow @import statements for custom files
          const importRegex = /@import\s+["']([^"']+)["'];?/g;
          let match;
          
          while ((match = importRegex.exec(cssContent)) !== null) {
            const importPath = match[1];
            if (importPath === 'tailwindcss') continue;
            
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const fullPath = path.resolve(path.dirname(currentPath), importPath);
              if (fs.existsSync(fullPath)) {
                cssQueue.push(fullPath);
              }
            }
          }
        } catch (error) {
          if (debug) console.warn(`Error reading ${currentPath}:`, error.message);
        }
      }
    }

    function extractCustomClasses(cssContent) {
      // Extract utility classes like .text-button, .bg-tag-grey
      const utilityRegex = /\.([a-zA-Z][\w-]*)\s*\{/g;
      let match;
      
      while ((match = utilityRegex.exec(cssContent)) !== null) {
        customClasses.add(match[1]);
      }

      // Extract @utility definitions (Tailwind v4)
      const utilityDefRegex = /@utility\s+([a-zA-Z][\w-]*)/g;
      while ((match = utilityDefRegex.exec(cssContent)) !== null) {
        customClasses.add(match[1]);
      }
    }

    function isTailwindUtility(className) {
      // Comprehensive Tailwind utility patterns (like VS Code IntelliSense uses)
      const patterns = [
        // Container & Layout
        /^container$/,
        /^(block|inline-block|inline|flex|inline-flex|table|inline-table|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row-group|table-row|flow-root|grid|inline-grid|contents|list-item|hidden)$/,
        
        // Flexbox & Grid
        /^flex-(row|row-reverse|col|col-reverse|wrap|wrap-reverse|nowrap|1|auto|initial|none)$/,
        /^(grow|grow-0|shrink|shrink-0)$/,
        /^order-(first|last|none|\d+)$/,
        /^grid-cols-(none|\d+|subgrid)$/,
        /^col-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-rows-(none|\d+|subgrid)$/,
        /^row-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-flow-(row|col|dense|row-dense|col-dense)$/,
        /^auto-(cols|rows)-(auto|min|max|fr)$/,
        
        // Spacing
        /^gap(-x|-y)?-(\d+\.?\d*|px)$/,
        /^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px|auto)$/,
        /^space-(x|y)-(\d+\.?\d*|px|reverse)$/,
        
        // Sizing
        /^(w|h|min-w|min-h|max-w|max-h)-(0|px|0\.5|\d+\.?\d*|auto|full|screen|min|max|fit|prose)$/,
        /^(w|h)-(\d+\/\d+)$/,
        
        // Typography
        /^font-(sans|serif|mono)$/,
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
        /^(italic|not-italic)$/,
        /^(uppercase|lowercase|capitalize|normal-case)$/,
        /^text-(left|center|right|justify|start|end)$/,
        /^(underline|overline|line-through|no-underline)$/,
        /^decoration-(slice|clone)$/,
        /^decoration-(auto|from-font|\d+|double|dotted|dashed|wavy)$/,
        /^underline-offset-(auto|\d+)$/,
        /^leading-(none|tight|snug|normal|relaxed|loose|\d+\.?\d*)$/,
        /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
        /^indent-(\d+\.?\d*|px)$/,
        /^(align-baseline|align-top|align-middle|align-bottom|align-text-top|align-text-bottom|align-super|align-sub)$/,
        /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
        /^(break-normal|break-words|break-all|break-keep)$/,
        /^hyphens-(none|manual|auto)$/,
        
        // Colors - Tailwind's default color palette
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret)-(inherit|current|transparent|black|white)$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret)-(\w+)-(\d+)\/(\d+)$/, // opacity variants
        
        // Background
        /^bg-(fixed|local|scroll)$/,
        /^bg-(auto|cover|contain)$/,
        /^bg-(center|top|right|bottom|left|right-top|right-bottom|left-top|left-bottom)$/,
        /^bg-(repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space)$/,
        /^bg-origin-(border|padding|content)$/,
        /^bg-clip-(border|padding|content|text)$/,
        
        // Borders
        /^border(-\d+|-x|-y|-s|-e|-t|-r|-b|-l)?$/,
        /^border-(solid|dashed|dotted|double|hidden|none)$/,
        /^(divide-x|divide-y)(-\d+|-reverse)?$/,
        /^divide-(solid|dashed|dotted|double|none)$/,
        /^outline(-\d+|-none|-dashed|-dotted|-double)?$/,
        /^outline-offset-\d+$/,
        /^ring(-\d+|-inset)?$/,
        /^ring-offset-\d+$/,
        
        // Border Radius
        /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
        /^rounded-(s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
        
        // Effects
        /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/,
        /^shadow-\w+-(\d+)(\/\d+)?$/,
        /^opacity-(\d+)$/,
        /^mix-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity|plus-darker|plus-lighter)$/,
        /^bg-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/,
        
        // Filters
        /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia)(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
        /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
        
        // Tables
        /^(border-collapse|border-separate)$/,
        /^(table-auto|table-fixed)$/,
        /^caption-(top|bottom)$/,
        
        // Transitions & Animation
        /^transition(-none|-all|-colors|-opacity|-shadow|-transform)?$/,
        /^duration-(\d+)$/,
        /^delay-(\d+)$/,
        /^ease-(linear|in|out|in-out)$/,
        /^animate-(none|spin|ping|pulse|bounce)$/,
        
        // Transforms
        /^(transform|transform-cpu|transform-gpu|transform-none)$/,
        /^scale(-\d+|-x-\d+|-y-\d+)?$/,
        /^rotate-(\d+)$/,
        /^translate-(x|y)-(\d+\.?\d*|px|full)$/,
        /^skew-(x|y)-(\d+)$/,
        /^origin-(center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/,
        
        // Interactivity
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
        
        // SVG
        /^fill-(none|current|\w+-\d+)$/,
        /^stroke-(none|current|\w+-\d+)$/,
        /^stroke-\d+$/,
        
        // Accessibility
        /^sr-only$/,
        /^not-sr-only$/,
        
        // Position
        /^(static|fixed|absolute|relative|sticky)$/,
        /^(inset|inset-x|inset-y|top|right|bottom|left)-(\d+\.?\d*|px|auto|full)$/,
        /^z-(\d+|auto)$/,
        
        // Overflow
        /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/,
        /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/,
        
        // Position & Layout
        /^(visible|invisible|collapse)$/,
        /^(isolate|isolation-auto)$/,
        /^object-(contain|cover|fill|none|scale-down)$/,
        /^object-(bottom|center|left|left-bottom|left-top|right|right-bottom|right-top|top)$/,
        
        // Flexbox & Grid Alignment
        /^(justify|items|self|content)-(start|end|center|stretch|between|around|evenly|baseline)$/,
        /^(place-content|place-items|place-self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
        
        // Lists
        /^list-(none|disc|decimal)$/,
        /^list-(inside|outside)$/,
        /^marker-\w+-(\d+)$/,
        
        // Pseudo-class prefixes (for validation of base classes)
        /^(hover|focus|focus-within|focus-visible|active|visited|target|first|last|only|odd|even|first-of-type|last-of-type|only-of-type|empty|disabled|enabled|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|read-only):/,
        
        // State prefixes
        /^(group-hover|group-focus|group-active|peer-hover|peer-focus|peer-active):/,
        
        // Responsive prefixes
        /^(sm|md|lg|xl|2xl):/,
        
        // Dark mode
        /^dark:/,
        
        // Data attributes
        /^data-\[.*?\]:/,
        
        // Complex selectors
        /^\[&.*?\]:/,
        /^\[.*?\]$/,
      ];
      
      return patterns.some(pattern => pattern.test(className));
    }

    function isArbitraryValue(className) {
      return /\[.+\]/.test(className) && !/^\[&.*?\]:/.test(className);
    }

    function getBaseClass(className) {
      const prefixes = [
        'sm:', 'md:', 'lg:', 'xl:', '2xl:',
        'hover:', 'focus:', 'focus-within:', 'focus-visible:', 'active:', 'visited:', 'target:',
        'first:', 'last:', 'only:', 'odd:', 'even:', 'first-of-type:', 'last-of-type:',
        'only-of-type:', 'empty:', 'disabled:', 'enabled:', 'checked:', 'indeterminate:',
        'default:', 'required:', 'valid:', 'invalid:', 'in-range:', 'out-of-range:',
        'placeholder-shown:', 'autofill:', 'read-only:',
        'group-hover:', 'group-focus:', 'group-active:',
        'peer-hover:', 'peer-focus:', 'peer-active:',
        'dark:',
        'data-\\[.*?\\]:',
        '\\[&.*?\\]:',
      ];

      let baseClass = className;
      for (const prefix of prefixes) {
        const regex = new RegExp(`^${prefix}`);
        if (regex.test(baseClass)) {
          baseClass = baseClass.replace(regex, '');
          break;
        }
      }

      return baseClass !== className ? baseClass : null;
    }

    function isValidClass(className) {
      // Allow arbitrary values
      if (isArbitraryValue(className) && allowArbitraryValues) {
        return true;
      }

      // Check custom classes from your CSS imports
      if (customClasses.has(className)) {
        return true;
      }

      // If Tailwind is imported, validate against Tailwind patterns
      if (hasTailwindImport && isTailwindUtility(className)) {
        return true;
      }

      // Check base class for prefixed utilities
      const baseClass = getBaseClass(className);
      if (baseClass) {
        if (customClasses.has(baseClass)) {
          return true;
        }
        if (hasTailwindImport && isTailwindUtility(baseClass)) {
          return true;
        }
      }

      return false;
    }

    function extractClassNames(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value.split(/\s+/).filter(cls => cls.length > 0);
      }
      
      if (node.type === 'TemplateLiteral') {
        let classString = '';
        for (let i = 0; i < node.quasis.length; i++) {
          classString += node.quasis[i].value.cooked || '';
          if (i < node.expressions.length) {
            classString += ' ';
          }
        }
        return classString.split(/\s+/).filter(cls => cls.length > 0);
      }

      return [];
    }

    function validateClasses(node, classNames) {
      if (!cssLoaded) {
        loadCSSConfig();
      }

      classNames.forEach(className => {
        if (!isValidClass(className)) {
          context.report({
            node,
            messageId: 'undefinedClass',
            data: { className },
          });
        }
      });
    }

    return {
      JSXAttribute(node) {
        if (node.name.name === 'className' && node.value) {
          const classNames = extractClassNames(node.value);
          validateClasses(node.value, classNames);
        }
      },

      CallExpression(node) {
        const fnNames = ['cn', 'clsx', 'cva', 'tw'];
        const isCnCall = fnNames.includes(node.callee.name) ||
          (node.callee.type === 'MemberExpression' && 
           fnNames.includes(node.callee.property?.name));

        if (isCnCall) {
          node.arguments.forEach(arg => {
            const classNames = extractClassNames(arg);
            validateClasses(arg, classNames);
          });
        }
      },
    };
  },
};