// eslint-plugin-tailwind-v4/rules/no-undefined-classes.js
const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Tailwind v4 classes against your CSS imports and theme variables',
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
      undefinedClass: "Tailwind class '{{className}}' is not defined in your CSS",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const { 
      cssFile = 'src/styles/globals.css', 
      allowArbitraryValues = true,
      debug = false
    } = options;

    let validClasses = new Set();
    let customClasses = new Set();
    let hasTailwindImport = false;
    let cssLoaded = false;

    function loadAllCSSClasses() {
      if (cssLoaded) return;

      const projectRoot = context.getCwd();
      const cssPath = path.resolve(projectRoot, cssFile);
      
      if (debug) {
        console.log(`🔍 Loading CSS from: ${cssPath}`);
      }
      
      // Parse all CSS imports recursively
      parseCSSImports(cssPath, projectRoot);
      
      // Custom classes are added directly during parsing
      customClasses.forEach(cls => validClasses.add(cls));
      
      if (debug) {
        console.log(`✅ Tailwind import detected: ${hasTailwindImport}`);
        console.log(`✅ Custom classes found: ${customClasses.size}`);
        console.log(`✅ Total valid classes: ${validClasses.size}`);
        console.log(`🔍 Sample custom classes: ${Array.from(customClasses).slice(0, 15).join(', ')}`);
      }
      
      cssLoaded = true;
    }

    function parseCSSImports(cssPath, projectRoot) {
      if (!fs.existsSync(cssPath)) {
        if (debug) console.warn(`CSS file not found: ${cssPath}`);
        return;
      }

      const visited = new Set();
      const cssQueue = [cssPath];

      while (cssQueue.length > 0) {
        const currentPath = cssQueue.shift();
        if (visited.has(currentPath)) continue;
        visited.add(currentPath);

        try {
          const cssContent = fs.readFileSync(currentPath, 'utf8');
          
          if (debug) {
            console.log(`📁 Parsing: ${path.relative(projectRoot, currentPath)}`);
          }
          
          // Detect Tailwind import
          if (cssContent.includes('@import "tailwindcss"')) {
            hasTailwindImport = true;
            if (debug) console.log('✅ Found Tailwind import');
          }
          
          // Extract theme variables and custom classes from this file
          extractCustomClasses(cssContent, currentPath, projectRoot);
          
          // Follow @import statements for custom files
          const importRegex = /@import\s+["']([^"']+)["'];?/g;
          let match;
          
          while ((match = importRegex.exec(cssContent)) !== null) {
            const importPath = match[1];
            
            // Skip the tailwindcss import
            if (importPath === 'tailwindcss') continue;
            
            // Handle relative imports
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const fullPath = path.resolve(path.dirname(currentPath), importPath);
              if (fs.existsSync(fullPath)) {
                cssQueue.push(fullPath);
                if (debug) {
                  console.log(`📄 Queued import: ${path.relative(projectRoot, fullPath)}`);
                }
              } else {
                if (debug) console.warn(`Import not found: ${fullPath}`);
              }
            }
          }
        } catch (error) {
          if (debug) console.warn(`Error reading ${currentPath}:`, error.message);
        }
      }
    }

    function extractCustomClasses(cssContent, filePath, projectRoot) {
      let classesFound = 0;
      const fileName = path.basename(filePath);
      const explicitClasses = new Set();
      
      // FIRST: Extract explicit utility classes: .text-button { ... }
      // These take precedence over auto-generated theme utilities
      const utilityRegex = /\.([a-zA-Z][\w-]*)\s*\{/g;
      let match;
      
      while ((match = utilityRegex.exec(cssContent)) !== null) {
        const className = match[1];
        explicitClasses.add(className);
        customClasses.add(className);
        classesFound++;
        
        if (debug && (className.includes('button') || className.includes('tag') || className.includes('dropdown') || className.includes('markdown'))) {
          console.log(`🎯 Found explicit class in ${fileName}: .${className}`);
        }
      }

      // SECOND: Extract @theme variables and generate utilities (excluding overridden ones)
      const themeBlockRegex = /@theme\s*\{([^}]+)\}/gs;
      let themeMatch;
      
      while ((themeMatch = themeBlockRegex.exec(cssContent)) !== null) {
        const themeContent = themeMatch[1];
        
        if (debug) {
          console.log(`🎨 Found @theme block in ${fileName}`);
        }
        
        // Extract all CSS custom properties: --anything-name: value;
        const variableRegex = /--([a-zA-Z][\w-]*)\s*:/g;
        let varMatch;
        
        while ((varMatch = variableRegex.exec(themeContent)) !== null) {
          const fullVarName = varMatch[1];
          
          // Generate utilities from this variable, but check for explicit overrides
          const generatedCount = generateUtilitiesFromVariable(fullVarName, fileName, explicitClasses);
          classesFound += generatedCount;
        }
      }

      // THIRD: Extract @utility definitions (Tailwind v4)
      const utilityDefRegex = /@utility\s+([a-zA-Z][\w-]*)/g;
      while ((match = utilityDefRegex.exec(cssContent)) !== null) {
        customClasses.add(match[1]);
        classesFound++;
        
        if (debug) {
          console.log(`🔧 Found @utility in ${fileName}: ${match[1]}`);
        }
      }

      if (debug && classesFound > 0) {
        console.log(`📊 Extracted ${classesFound} classes/variables from ${fileName}`);
      }
    }

    function generateUtilitiesFromVariable(varName, fileName, explicitClasses) {
      let generatedCount = 0;
      
      // Colors: --color-dark-grey, --color-primary-black
      if (varName.startsWith('color-')) {
        const colorName = varName.substring(6); // Remove 'color-'
        const colorUtilities = [
          `text-${colorName}`,
          `bg-${colorName}`,
          `border-${colorName}`,
          `decoration-${colorName}`,
          `outline-${colorName}`,
          `ring-${colorName}`,
          `ring-offset-${colorName}`,
          `shadow-${colorName}`,
          `accent-${colorName}`,
          `caret-${colorName}`,
          `fill-${colorName}`,
          `stroke-${colorName}`,
        ];
        
        colorUtilities.forEach(cls => {
          // Only add if not explicitly overridden
          if (!explicitClasses.has(cls)) {
            customClasses.add(cls);
            generatedCount++;
          } else if (debug) {
            console.log(`⚠️  Skipping auto-generated ${cls} - explicitly defined in ${fileName}`);
          }
        });
        
        if (debug) {
          console.log(`🎨 Generated ${generatedCount} color utilities for: ${colorName} (from ${fileName})`);
        }
      }
      
      // Animations: --animate-fade-in, --animate-slide-up
      else if (varName.startsWith('animate-')) {
        const animationName = varName.substring(8); // Remove 'animate-'
        const animationUtility = `animate-${animationName}`;
        
        if (!explicitClasses.has(animationUtility)) {
          customClasses.add(animationUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`🎬 Generated animation utility: ${animationUtility} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${animationUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Shadows: --shadow-sm, --shadow-elevation-1
      else if (varName.startsWith('shadow-')) {
        const shadowName = varName.substring(7); // Remove 'shadow-'
        const shadowUtility = `shadow-${shadowName}`;
        
        if (!explicitClasses.has(shadowUtility)) {
          customClasses.add(shadowUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`🌫️ Generated shadow utility: shadow-${shadowName} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${shadowUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Border radius: --radius-sm, --radius-card
      else if (varName.startsWith('radius-')) {
        const radiusName = varName.substring(7); // Remove 'radius-'
        const radiusUtility = `rounded-${radiusName}`;
        
        if (!explicitClasses.has(radiusUtility)) {
          customClasses.add(radiusUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`🔘 Generated radius utility: rounded-${radiusName} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${radiusUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Spacing: --spacing-xs, --spacing-section
      else if (varName.startsWith('spacing-')) {
        const spacingName = varName.substring(8); // Remove 'spacing-'
        
        // Spacing generates multiple utilities
        const spacingPrefixes = ['p', 'm', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'space-x', 'space-y'];
        spacingPrefixes.forEach(prefix => {
          const spacingUtility = `${prefix}-${spacingName}`;
          if (!explicitClasses.has(spacingUtility)) {
            customClasses.add(spacingUtility);
            generatedCount++;
          }
        });
        
        if (debug) {
          console.log(`📏 Generated spacing utilities: p-${spacingName}, m-${spacingName}, gap-${spacingName}, etc. (from ${fileName})`);
        }
      }
      
      // Typography sizes: --text-title, --text-body, --text-button
      else if (varName.startsWith('text-')) {
        const textName = varName.substring(5); // Remove 'text-'
        const textUtility = `text-${textName}`;
        
        // Only add if not explicitly overridden
        if (!explicitClasses.has(textUtility)) {
          customClasses.add(textUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`📝 Generated text utility: ${textUtility} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${textUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Font families: --font-family-inter
      else if (varName.startsWith('font-family-')) {
        const familyName = varName.substring(12); // Remove 'font-family-'
        const fontUtility = `font-${familyName}`;
        
        if (!explicitClasses.has(fontUtility)) {
          customClasses.add(fontUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`🔤 Generated font family utility: ${fontUtility} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${fontUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Font weights: --font-weight-semi-bold
      else if (varName.startsWith('font-weight-')) {
        const weightName = varName.substring(12); // Remove 'font-weight-'
        const weightUtility = `font-${weightName}`;
        
        if (!explicitClasses.has(weightUtility)) {
          customClasses.add(weightUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`⚖️ Generated font weight utility: font-${weightName} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${weightUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      // Font sizes: --font-size-sm, --font-size-lg
      else if (varName.startsWith('font-size-')) {
        const sizeName = varName.substring(10); // Remove 'font-size-'
        const sizeUtility = `text-${sizeName}`;
        
        if (!explicitClasses.has(sizeUtility)) {
          customClasses.add(sizeUtility);
          generatedCount++;
          
          if (debug) {
            console.log(`📏 Generated font size utility: ${sizeUtility} (from ${fileName})`);
          }
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${sizeUtility} - explicitly defined in ${fileName}`);
        }
      }
      
      return generatedCount;
    }

    function isTailwindUtility(className) {
      // Check against comprehensive Tailwind patterns for utilities not in our hardcoded list
      const tailwindPatterns = [
        // Layout patterns
        /^(container|block|inline-block|inline|flex|inline-flex|table|inline-table|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row-group|table-row|flow-root|grid|inline-grid|contents|list-item|hidden)$/,
        /^flex-(row|col|wrap|nowrap|1|auto|initial|none)(-reverse)?$/,
        /^(grow|grow-0|shrink|shrink-0)$/,
        /^(items|justify|content|self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
        /^(place-content|place-items|place-self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
        
        // Spacing patterns
        /^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px|auto)$/,
        /^gap(-x|-y)?-(\d+\.?\d*|px)$/,
        /^space-(x|y)-(\d+\.?\d*|px|reverse)$/,
        
        // Sizing patterns
        /^(w|h|min-w|min-h|max-w|max-h)-(0|px|\d+\.?\d*|auto|full|screen|min|max|fit)$/,
        /^(w|h)-(\d+\/\d+)$/,
        
        // Typography patterns
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
        /^font-(sans|serif|mono)$/,
        /^text-(left|center|right|justify|start|end)$/,
        /^(uppercase|lowercase|capitalize|normal-case)$/,
        /^(italic|not-italic)$/,
        /^(underline|overline|line-through|no-underline)$/,
        /^decoration-(slice|clone|auto|from-font|\d+|double|dotted|dashed|wavy)$/,
        /^underline-offset-(auto|\d+)$/,
        /^leading-(none|tight|snug|normal|relaxed|loose|\d+\.?\d*)$/,
        /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
        /^indent-(\d+\.?\d*|px)$/,
        /^(align-baseline|align-top|align-middle|align-bottom|align-text-top|align-text-bottom|align-super|align-sub)$/,
        /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
        /^(break-normal|break-words|break-all|break-keep)$/,
        /^hyphens-(none|manual|auto)$/,
        
        // Color patterns - Tailwind's default color palette
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(inherit|current|transparent|black|white)$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(\w+)-(\d+)\/(\d+)$/, // opacity variants
        
        // Background patterns
        /^bg-(fixed|local|scroll)$/,
        /^bg-(auto|cover|contain)$/,
        /^bg-(center|top|right|bottom|left|right-top|right-bottom|left-top|left-bottom)$/,
        /^bg-(repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space)$/,
        /^bg-origin-(border|padding|content)$/,
        /^bg-clip-(border|padding|content|text)$/,
        
        // Border patterns
        /^border(-\d+|-x|-y|-s|-e|-t|-r|-b|-l)?$/,
        /^border-(solid|dashed|dotted|double|hidden|none)$/,
        /^(divide-x|divide-y)(-\d+|-reverse)?$/,
        /^divide-(solid|dashed|dotted|double|none)$/,
        /^outline(-\d+|-none|-dashed|-dotted|-double)?$/,
        /^outline-offset-\d+$/,
        /^ring(-\d+|-inset)?$/,
        /^ring-offset-\d+$/,
        
        // Border radius patterns
        /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
        /^rounded-(s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
        
        // Effects patterns
        /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/,
        /^shadow-\w+-(\d+)(\/\d+)?$/,
        /^opacity-(\d+)$/,
        /^mix-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity|plus-darker|plus-lighter)$/,
        /^bg-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/,
        
        // Filter patterns
        /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia)(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
        /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(-none|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
        
        // Table patterns
        /^(border-collapse|border-separate)$/,
        /^(table-auto|table-fixed)$/,
        /^caption-(top|bottom)$/,
        
        // Animation patterns
        /^animate-(none|spin|ping|pulse|bounce)$/,
        
        // Transform patterns
        /^(transform|transform-cpu|transform-gpu|transform-none)$/,
        /^scale(-\d+|-x-\d+|-y-\d+)?$/,
        /^rotate-(\d+)$/,
        /^translate-(x|y)-(\d+\.?\d*|px|full)$/,
        /^skew-(x|y)-(\d+)$/,
        /^origin-(center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/,
        
        // Transition patterns
        /^transition(-none|-all|-colors|-opacity|-shadow|-transform)?$/,
        /^duration-(\d+)$/,
        /^delay-(\d+)$/,
        /^ease-(linear|in|out|in-out)$/,
        
        // Position patterns
        /^(static|fixed|absolute|relative|sticky)$/,
        /^(inset|inset-x|inset-y|top|right|bottom|left)-(\d+\.?\d*|px|auto|full)$/,
        /^z-(\d+|auto)$/,
        
        // Overflow patterns
        /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/,
        /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/,
        
        // Visibility patterns
        /^(visible|invisible|collapse)$/,
        /^(isolate|isolation-auto)$/,
        
        // Object patterns
        /^object-(contain|cover|fill|none|scale-down)$/,
        /^object-(bottom|center|left|left-bottom|left-top|right|right-bottom|right-top|top)$/,
        
        // Interactivity patterns
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
        
        // SVG patterns
        /^fill-(none|current|\w+-\d+)$/,
        /^stroke-(none|current|\w+-\d+|\d+)$/,
        
        // Accessibility patterns
        /^(sr-only|not-sr-only)$/,
        
        // Grid patterns
        /^grid-cols-(none|\d+|subgrid)$/,
        /^col-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-rows-(none|\d+|subgrid)$/,
        /^row-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-flow-(row|col|dense|row-dense|col-dense)$/,
        /^auto-(cols|rows)-(auto|min|max|fr)$/,
        
        // List patterns
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
      
      return tailwindPatterns.some(pattern => pattern.test(className));
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

      // Check exact match in our collected classes
      if (validClasses.has(className)) {
        return true;
      }

      // If Tailwind is imported, check against Tailwind patterns
      if (hasTailwindImport && isTailwindUtility(className)) {
        return true;
      }

      // Check base class for prefixed utilities
      const baseClass = getBaseClass(className);
      if (baseClass) {
        if (validClasses.has(baseClass)) {
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
        loadAllCSSClasses();
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