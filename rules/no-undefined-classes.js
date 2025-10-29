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

    // State variables
    let validClasses = new Set();
    let customClasses = new Set();
    let hasTailwindImport = false;
    let cssLoaded = false;
    let foundThemeVariables = new Set();

    // =============================================================================
    // MAIN ENTRY POINT
    // =============================================================================

    function loadAllCSSClasses() {
      if (cssLoaded) return;

      const projectRoot = context.getCwd();
      const cssPath = path.resolve(projectRoot, cssFile);

      if (debug) {
        console.log(`🔍 Loading CSS from: ${cssPath}`);
      }

      parseCSSImports(cssPath, projectRoot);
      customClasses.forEach(cls => validClasses.add(cls));

      if (debug) {
        console.log(`✅ Tailwind import detected: ${hasTailwindImport}`);
        console.log(`✅ Custom classes found: ${customClasses.size}`);
        console.log(`✅ Total valid classes: ${validClasses.size}`);
        console.log(`✅ Theme variables found: ${foundThemeVariables.size}`);
        console.log(`🔍 Sample custom classes: ${Array.from(customClasses).slice(0, 15).join(', ')}`);
        console.log(`🔍 Sample theme variables: ${Array.from(foundThemeVariables).slice(0, 10).join(', ')}`);
      }

      cssLoaded = true;
    }

    // =============================================================================
    // CSS PARSING
    // =============================================================================

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

          // Detect Tailwind imports
          detectTailwindImport(cssContent);

          // Extract custom classes and theme variables
          extractCustomClasses(cssContent, currentPath, projectRoot);

          // Queue additional CSS imports
          queueCSSImports(cssContent, currentPath, projectRoot, cssQueue, visited);

        } catch (error) {
          if (debug) console.warn(`Error reading ${currentPath}:`, error.message);
        }
      }
    }

    function detectTailwindImport(cssContent) {
      const tailwindImportPatterns = [
        /@import\s+["']tailwindcss["']/,
        /@import\s+url\(["']?tailwindcss["']?\)/,
        /@tailwind\s+(base|components|utilities)/,
        /@import\s+["']tailwindcss\/[^"']*["']/,
        /@theme\s*\{/
      ];

      const foundTailwind = tailwindImportPatterns.some(pattern => pattern.test(cssContent));

      if (foundTailwind) {
        hasTailwindImport = true;
        if (debug) console.log('✅ Found Tailwind import');
      }
    }

    function queueCSSImports(cssContent, currentPath, projectRoot, cssQueue, visited) {
      const importRegex = /@import\s+["']([^"']+)["'];?/g;
      let match;

      while ((match = importRegex.exec(cssContent)) !== null) {
        const importPath = match[1];

        // Skip Tailwind imports
        if (importPath === 'tailwindcss' || importPath.startsWith('tailwindcss/')) continue;

        // Handle relative imports
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          let fullPath = path.resolve(path.dirname(currentPath), importPath);

          // Try different extensions if no extension provided
          if (!path.extname(fullPath)) {
            const possibleExtensions = ['.css', '.scss', '.sass', '.less'];
            for (const ext of possibleExtensions) {
              const pathWithExt = fullPath + ext;
              if (fs.existsSync(pathWithExt)) {
                fullPath = pathWithExt;
                break;
              }
            }
          }

          if (fs.existsSync(fullPath) && !visited.has(fullPath)) {
            cssQueue.push(fullPath);
            if (debug) {
              console.log(`📄 Queued import: ${path.relative(projectRoot, fullPath)}`);
            }
          } else if (!fs.existsSync(fullPath) && debug) {
            console.warn(`Import not found: ${fullPath}`);
          }
        }
      }
    }

    // =============================================================================
    // CLASS EXTRACTION
    // =============================================================================

    function extractCustomClasses(cssContent, filePath, projectRoot) {
      let classesFound = 0;
      const fileName = path.basename(filePath);
      const explicitClasses = new Set();

      // Extract explicit utility classes
      classesFound += extractExplicitClasses(cssContent, fileName, explicitClasses);

      // Extract gradient utilities
      classesFound += extractGradientUtilities(cssContent, fileName);

      // Extract theme variables and generate utilities
      classesFound += extractThemeVariables(cssContent, fileName, explicitClasses);

      // Extract @utility definitions
      classesFound += extractUtilityDefinitions(cssContent, fileName);

      // Extract @layer definitions
      classesFound += extractLayerDefinitions(cssContent, fileName);

      if (debug && classesFound > 0) {
        console.log(`📊 Extracted ${classesFound} classes/variables from ${fileName}`);
      }
    }

    function extractExplicitClasses(cssContent, fileName, explicitClasses) {
      // Enhanced regex to handle complex escaped characters and special cases
      const utilityRegex = /\.([a-zA-Z@][\w-]*(?:\\[\w\/\.\:\[\]]+[\w-]*)*)\s*\{/g;
      let match;
      let count = 0;

      while ((match = utilityRegex.exec(cssContent)) !== null) {
        let className = match[1];
        
        // Convert escaped CSS class name to actual class name
        // Handle various escape patterns
        className = className
          .replace(/\\:/g, ':')     // \: becomes :
          .replace(/\\\//g, '/')    // \/ becomes /
          .replace(/\\\./g, '.')    // \. becomes .
          .replace(/\\\[/g, '[')    // \[ becomes [
          .replace(/\\\]/g, ']')    // \] becomes ]
          .replace(/\\\(/g, '(')    // \( becomes (
          .replace(/\\\)/g, ')')    // \) becomes )
          .replace(/\\\-/g, '-')    // \- becomes -
          .replace(/\\\\/g, '\\');  // \\ becomes \
        
        explicitClasses.add(className);
        customClasses.add(className);
        count++;

        if (debug && (className.includes('@container') || className.includes('group-even') || className.includes('decoration') || className.includes('from-') || className.includes('to-'))) {
          console.log(`🎯 Found explicit class in ${fileName}: .${className}`);
        }
      }

      return count;
    }

    function extractThemeVariables(cssContent, fileName, explicitClasses) {
      const themeBlockRegex = /@theme\s*\{([\s\S]*?)\}/gs;
      let themeMatch;
      let count = 0;

      while ((themeMatch = themeBlockRegex.exec(cssContent)) !== null) {
        const themeContent = themeMatch[1];

        if (debug) {
          console.log(`🎨 Found @theme block in ${fileName}`);
        }

        // Updated regex to handle CSS variables with complex values
        const variableRegex = /--([a-zA-Z][\w-]*)\s*:\s*([^;]+);/g;
        let varMatch;

        while ((varMatch = variableRegex.exec(themeContent)) !== null) {
          const fullVarName = varMatch[1];
          const variableValue = varMatch[2].trim();
          
          foundThemeVariables.add(fullVarName);

          if (debug && fullVarName.startsWith('animate-')) {
            console.log(`🎬 Found animation variable: --${fullVarName}: ${variableValue}`);
          }

          const generatedCount = generateUtilitiesFromVariable(fullVarName, fileName, explicitClasses);
          count += generatedCount;
        }
      }

      return count;
    }

    function extractUtilityDefinitions(cssContent, fileName) {
      const utilityDefRegex = /@utility\s+([a-zA-Z][\w-]*)/g;
      let match;
      let count = 0;

      while ((match = utilityDefRegex.exec(cssContent)) !== null) {
        customClasses.add(match[1]);
        count++;

        if (debug) {
          console.log(`🔧 Found @utility in ${fileName}: ${match[1]}`);
        }
      }

      return count;
    }

    function extractLayerDefinitions(cssContent, fileName) {
      // Updated regex to handle nested braces properly
      const layerRegex = /@layer\s+(base|components|utilities)\s*\{((?:[^{}]*\{[^{}]*\}[^{}]*)*[^{}]*)\}/gs;
      let layerMatch;
      let count = 0;

      while ((layerMatch = layerRegex.exec(cssContent)) !== null) {
        const layerType = layerMatch[1];
        const layerContent = layerMatch[2];

        if (debug) {
          console.log(`🏗️ Found @layer ${layerType} in ${fileName}`);
          console.log(`📝 Layer content preview: ${layerContent.substring(0, 100)}...`);
        }

        // Enhanced regex to handle complex escaped characters
        const layerUtilityRegex = /\.([a-zA-Z@][\w-]*(?:\\[\w\/\.\:\[\]]+[\w-]*)*)\s*\{/g;
        let layerUtilityMatch;

        while ((layerUtilityMatch = layerUtilityRegex.exec(layerContent)) !== null) {
          let className = layerUtilityMatch[1];
          
          // Convert escaped CSS class name to actual class name
          className = className
            .replace(/\\:/g, ':')     // \: becomes :
            .replace(/\\\//g, '/')    // \/ becomes /
            .replace(/\\\./g, '.')    // \. becomes .
            .replace(/\\\[/g, '[')    // \[ becomes [
            .replace(/\\\]/g, ']')    // \] becomes ]
            .replace(/\\\(/g, '(')    // \( becomes (
            .replace(/\\\)/g, ')')    // \) becomes )
            .replace(/\\\-/g, '-')    // \- becomes -
            .replace(/\\\\/g, '\\');  // \\ becomes \
          
          customClasses.add(className);
          count++;

          if (debug) {
            console.log(`🎯 Found @layer utility in ${fileName}: .${className}`);
          }
        }
      }

      return count;
    }

    // Add new function to extract gradient utilities from CSS
    function extractGradientUtilities(cssContent, fileName) {
      // Match gradient utility classes like .from-blue-gradient-start, .to-red-500, etc.
      const gradientRegex = /\.(from|via|to)-([a-zA-Z][\w-]*)\s*\{/g;
      let match;
      let count = 0;

      while ((match = gradientRegex.exec(cssContent)) !== null) {
        const gradientType = match[1]; // from, via, or to
        const colorName = match[2];
        const gradientUtility = `${gradientType}-${colorName}`;
        
        customClasses.add(gradientUtility);
        count++;

        if (debug) {
          console.log(`🌈 Found gradient utility in ${fileName}: .${gradientUtility}`);
        }
      }

      return count;
    }

    // =============================================================================
    // UTILITY GENERATION
    // =============================================================================

    function generateUtilitiesFromVariable(varName, fileName, explicitClasses) {
      const generators = [
        () => generateColorUtilities(varName, fileName, explicitClasses),
        () => generateAnimationUtilities(varName, fileName, explicitClasses),
        () => generateShadowUtilities(varName, fileName, explicitClasses),
        () => generateRadiusUtilities(varName, fileName, explicitClasses),
        () => generateSpacingUtilities(varName, fileName, explicitClasses),
        () => generateTextUtilities(varName, fileName, explicitClasses),
        () => generateFontFamilyUtilities(varName, fileName, explicitClasses),
        () => generateFontWeightUtilities(varName, fileName, explicitClasses),
        () => generateFontSizeUtilities(varName, fileName, explicitClasses),
      ];

      return generators.reduce((total, generator) => total + generator(), 0);
    }

    function generateColorUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('color-')) return 0;

      const colorName = varName.substring(6);
      const colorUtilities = [
        `text-${colorName}`, `bg-${colorName}`, `border-${colorName}`,
        `decoration-${colorName}`, `outline-${colorName}`, `ring-${colorName}`,
        `ring-offset-${colorName}`, `shadow-${colorName}`, `accent-${colorName}`,
        `caret-${colorName}`, `fill-${colorName}`, `stroke-${colorName}`,
        // Add gradient utilities
        `from-${colorName}`, `via-${colorName}`, `to-${colorName}`,
        // Add directional border utilities
        `border-t-${colorName}`, `border-r-${colorName}`, `border-b-${colorName}`, `border-l-${colorName}`,
        `border-x-${colorName}`, `border-y-${colorName}`,
        // Add logical border utilities
        `border-s-${colorName}`, `border-e-${colorName}`,
        `border-is-${colorName}`, `border-ie-${colorName}`,
        `border-bs-${colorName}`, `border-be-${colorName}`,
        // Add divide utilities
        `divide-${colorName}`,
      ];

      let count = 0;
      colorUtilities.forEach(cls => {
        if (!explicitClasses.has(cls)) {
          customClasses.add(cls);
          count++;
        } else if (debug) {
          console.log(`⚠️  Skipping auto-generated ${cls} - explicitly defined in ${fileName}`);
        }
      });

      if (debug && count > 0) {
        console.log(`🎨 Generated ${count} color utilities for: ${colorName} (from ${fileName})`);
      }

      return count;
    }

    function generateAnimationUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('animate-')) return 0;

      const animationName = varName.substring(8);
      const animationUtility = `animate-${animationName}`;

      if (!explicitClasses.has(animationUtility)) {
        customClasses.add(animationUtility);
        if (debug) {
          console.log(`🎬 Generated animation utility: ${animationUtility} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${animationUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateShadowUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('shadow-')) return 0;

      const shadowName = varName.substring(7);
      const shadowUtility = `shadow-${shadowName}`;

      if (!explicitClasses.has(shadowUtility)) {
        customClasses.add(shadowUtility);
        if (debug) {
          console.log(`🌫️ Generated shadow utility: shadow-${shadowName} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${shadowUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateRadiusUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('radius-')) return 0;

      const radiusName = varName.substring(7);
      const radiusUtility = `rounded-${radiusName}`;

      if (!explicitClasses.has(radiusUtility)) {
        customClasses.add(radiusUtility);
        if (debug) {
          console.log(`🔘 Generated radius utility: rounded-${radiusName} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${radiusUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateSpacingUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('spacing-')) return 0;

      const spacingName = varName.substring(8);
      const spacingPrefixes = ['p', 'm', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'space-x', 'space-y'];
      let count = 0;

      spacingPrefixes.forEach(prefix => {
        const spacingUtility = `${prefix}-${spacingName}`;
        if (!explicitClasses.has(spacingUtility)) {
          customClasses.add(spacingUtility);
          count++;
        }
      });

      if (debug && count > 0) {
        console.log(`📏 Generated spacing utilities: p-${spacingName}, m-${spacingName}, gap-${spacingName}, etc. (from ${fileName})`);
      }

      return count;
    }

    function generateTextUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('text-')) return 0;

      const textName = varName.substring(5);
      const textUtility = `text-${textName}`;

      if (!explicitClasses.has(textUtility)) {
        customClasses.add(textUtility);
        if (debug) {
          console.log(`📝 Generated text utility: ${textUtility} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${textUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateFontFamilyUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('font-family-')) return 0;

      const familyName = varName.substring(12);
      const fontUtility = `font-${familyName}`;

      if (!explicitClasses.has(fontUtility)) {
        customClasses.add(fontUtility);
        if (debug) {
          console.log(`🔤 Generated font family utility: ${fontUtility} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${fontUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateFontWeightUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('font-weight-')) return 0;

      const weightName = varName.substring(12);
      const weightUtility = `font-${weightName}`;

      if (!explicitClasses.has(weightUtility)) {
        customClasses.add(weightUtility);
        if (debug) {
          console.log(`⚖️ Generated font weight utility: font-${weightName} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${weightUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    function generateFontSizeUtilities(varName, fileName, explicitClasses) {
      if (!varName.startsWith('font-size-')) return 0;

      const sizeName = varName.substring(10);
      const sizeUtility = `text-${sizeName}`;

      if (!explicitClasses.has(sizeUtility)) {
        customClasses.add(sizeUtility);
        if (debug) {
          console.log(`📏 Generated font size utility: ${sizeUtility} (from ${fileName})`);
        }
        return 1;
      } else if (debug) {
        console.log(`⚠️  Skipping auto-generated ${sizeUtility} - explicitly defined in ${fileName}`);
      }

      return 0;
    }

    // =============================================================================
    // VALIDATION LOGIC
    // =============================================================================

    function isValidClass(className) {
      // Handle important modifier
      let cleanClassName = className;
      if (cleanClassName.startsWith('!')) {
        cleanClassName = cleanClassName.substring(1);
      }

      // Allow arbitrary values
      if (isArbitraryValue(cleanClassName) && allowArbitraryValues) {
        return true;
      }

      // Check if it's in our custom classes (highest priority)
      if (validClasses.has(cleanClassName)) {
        return true;
      }

      // Check base class for prefixed utilities
      const baseClass = getBaseClass(className);
      if (baseClass) {
        let cleanBaseClass = baseClass;
        if (cleanBaseClass.startsWith('!')) {
          cleanBaseClass = cleanBaseClass.substring(1);
        }
        
        if (validClasses.has(cleanBaseClass)) {
          return true;
        }
        if (hasTailwindImport && isTailwindUtility(cleanBaseClass)) {
          return !isOverridableUtility(cleanBaseClass) || !hasThemeOverride(cleanBaseClass);
        }
      }

      // Check Tailwind utilities
      if (hasTailwindImport && isTailwindUtility(className)) {
        return !isOverridableUtility(cleanClassName) || !hasThemeOverride(cleanClassName);
      }

      return false;
    }

    function isOverridableUtility(className) {
      const overridablePatterns = [
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

      return overridablePatterns.some(pattern => pattern.test(className));
    }

    function hasThemeOverride(className) {
      // Typography sizes
      if (/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(className)) {
        const size = className.replace('text-', '');
        return foundThemeVariables.has(`font-size-${size}`) || foundThemeVariables.has(`text-${size}`);
      }

      // Font weights
      if (/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(className)) {
        const weight = className.replace('font-', '');
        return foundThemeVariables.has(`font-weight-${weight}`);
      }

      // Colors
      const colorMatch = className.match(/^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/);
      if (colorMatch) {
        const [, , colorName, shade] = colorMatch;
        return foundThemeVariables.has(`color-${colorName}-${shade}`);
      }

      // Spacing
      const spacingMatch = className.match(/^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px)$/);
      if (spacingMatch) {
        const [, , size] = spacingMatch;
        return foundThemeVariables.has(`spacing-${size}`);
      }

      // Border radius
      const radiusMatch = className.match(/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/);
      if (radiusMatch) {
        const radius = radiusMatch[1] ? radiusMatch[1].replace('-', '') : 'DEFAULT';
        return foundThemeVariables.has(`radius-${radius}`);
      }

      // Shadows
      const shadowMatch = className.match(/^shadow(-none|-sm|-md|-lg|-2xl|-3xl|-inner)?$/);
      if (shadowMatch) {
        const shadow = shadowMatch[1] ? shadowMatch[1].replace('-', '') : 'DEFAULT';
        return foundThemeVariables.has(`shadow-${shadow}`);
      }

      return false;
    }

    // =============================================================================
    // TAILWIND PATTERNS
    // =============================================================================

    function isTailwindUtility(className) {
      // Handle important modifier
      let cleanClassName = className;
      if (cleanClassName.startsWith('!')) {
        cleanClassName = cleanClassName.substring(1);
      }

      const tailwindPatterns = [
        // Container Queries - ENHANCED
        /^@container$/,  // Added standalone @container
        /^@(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)\/(.+)$/,
        /^@container-(.+)\/(.+)$/,

        // Layout
        /^(container|block|inline-block|inline|flex|inline-flex|table|inline-table|table-caption|table-cell|table-column|table-column-group|table-footer-group|table-header-group|table-row-group|table-row|flow-root|grid|inline-grid|contents|list-item|hidden)$/,

        // Aspect Ratio - ADDED
        /^aspect-(square|video|auto|\d+\/\d+)$/,

        // Group and Peer
        /^(group|peer)$/,
        /^group\/[\w-]+$/,
        /^peer\/[\w-]+$/,

        // Flexbox - ENHANCED
        /^flex-(row|col|wrap|nowrap|1|auto|initial|none)(-reverse)?$/,
        /^flex-(\d+\/\d+|\d+)$/,
        /^(grow|grow-0|shrink|shrink-0)$/,
        /^flex-(grow|shrink)(-0)?$/, // flex-grow, flex-shrink, flex-grow-0, flex-shrink-0
        /^(items|justify|content|self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,
        /^(place-content|place-items|place-self)-(start|end|center|stretch|between|around|evenly|baseline|auto)$/,

        // Logical Properties
        /^(m|p)(s|e|is|ie|bs|be)-(\d+\.?\d*|px|auto)$/,
        /^border-(s|e|is|ie|bs|be)(-\d+)?$/,
        /^rounded-(s|e|ss|se|ee|es)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,

        // Spacing
        /^(p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml)-(\d+\.?\d*|px|auto)$/,
        /^gap(-x|-y)?-(\d+\.?\d*|px)$/,
        /^space-(x|y)-(\d+\.?\d*|px|reverse)$/,

        // Sizing - ENHANCED to include fractions for min/max width/height
        /^(w|h)-(dvh|lvh|svh|dvw|lvw|svw)$/,
        /^(min-w|min-h|max-w|max-h)-(0|none|full|min|max|fit|prose|screen-(sm|md|lg|xl|2xl))$/,
        /^(min-w|min-h|max-w|max-h)-(\d+\/\d+)$/, // Added fractional support for min/max width/height
        /^size-(\d+\.?\d*|px|auto|full|screen|min|max|fit)$/,
        /^(w|h|min-w|min-h|max-w|max-h)-(0|px|\d+\.?\d*|auto|full|screen|min|max|fit)$/,
        /^(w|h)-(\d+\/\d+)$/,

        // Typography
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
        /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
        /^font-(sans|serif|mono)$/,
        /^text-(left|center|right|justify|start|end)$/,
        /^(uppercase|lowercase|capitalize|normal-case)$/,
        /^(italic|not-italic)$/,
        /^(underline|overline|line-through|no-underline)$/,
        /^decoration-(slice|clone|auto|from-font|\d+|double|dotted|dashed|wavy|solid)$/, // Added 'solid'
        /^underline-offset-(auto|\d+)$/,
        /^leading-(none|tight|snug|normal|relaxed|loose|\d+\.?\d*)$/,
        /^tracking-(tighter|tight|normal|wide|wider|widest)$/,
        /^indent-(\d+\.?\d*|px)$/,
        /^(align-baseline|align-top|align-middle|align-bottom|align-text-top|align-text-bottom|align-super|align-sub)$/,

        // Text and whitespace - ENHANCED with line-clamp and text-ellipsis
        /^text-(wrap|nowrap|balance|pretty|ellipsis|clip)$/, // Added text-ellipsis and text-clip
        /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
        /^(break-normal|break-words|break-all|break-keep)$/,
        /^hyphens-(none|manual|auto)$/,
        /^text-overflow-(ellipsis|clip)$/,
        /^line-clamp-(\d+|none)$/, // Added line-clamp support

        // Colors - ENHANCED with directional borders and opacity support
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(inherit|current|transparent|black|white)$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        // Directional border colors
        /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-(inherit|current|transparent|black|white)$/,
        /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^border-(t|r|b|l|x|y|s|e|is|ie|bs|be)-[\w-]+$/, // Custom directional border colors
        /^divide-[\w-]+$/, // Custom divide colors
        // Standard color patterns with opacity
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(\w+)(-\d+)?\/\d+$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(current|transparent|inherit|black|white)\/\d+$/,
        /^(text|bg|border|decoration|outline|ring|ring-offset|shadow|accent|caret|fill|stroke)-(\w+)-(\d+)\/(\d+)$/,

        // Backgrounds & Gradients - ENHANCED
        /^bg-(fixed|local|scroll)$/,
        /^bg-(auto|cover|contain)$/,
        /^bg-(center|top|right|bottom|left|right-top|right-bottom|left-top|left-bottom)$/,
        /^bg-(repeat|no-repeat|repeat-x|repeat-y|repeat-round|repeat-space)$/,
        /^bg-origin-(border|padding|content)$/,
        /^bg-clip-(border|padding|content|text)$/,
        // Gradient directions - ENHANCED to include linear gradients
        /^bg-gradient-to-(t|tr|r|br|b|bl|l|tl)$/,
        /^bg-gradient-(conic|radial|linear)$/,
        /^bg-linear-to-(t|tr|r|br|b|bl|l|tl)$/, // Added bg-linear-to- patterns
        /^bg-(linear|radial|conic)-gradient$/,
        // Gradient stops - enhanced to handle custom colors and opacity
        /^(from|via|to)-(inherit|current|transparent|black|white)$/,
        /^(from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        /^(from|via|to)-(inherit|current|transparent|black|white)\/\d+$/, // Added opacity support
        /^(from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\/\d+$/,
        /^(from|via|to)-[\w-]+$/, // Custom gradient colors like from-blue-gradient-start
        /^(from|via|to)-[\w-]+\/\d+$/, // Custom gradient colors with opacity

        // Borders - ENHANCED to handle all border utilities properly
        /^border$/,
        /^border-(\d+\.?\d*|px)$/,
        /^border-(x|y|s|e|t|r|b|l)$/,
        /^border-(x|y|s|e|t|r|b|l)-(\d+\.?\d*|px)$/,
        /^border-(solid|dashed|dotted|double|hidden|none)$/,
        /^(divide-x|divide-y)(-\d+|-reverse)?$/,
        /^divide-(solid|dashed|dotted|double|none)$/,
        /^outline(-\d+|-none|-dashed|-dotted|-double|-hidden)?$/, // Added -hidden for outline
        /^outline-offset-\d+$/,
        /^ring(-\d+|-inset)?$/,
        /^ring-offset-\d+$/,

        // Border radius
        /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,
        /^rounded-(s|e|t|r|b|l|ss|se|ee|es|tl|tr|br|bl)(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/,

        // Effects
        /^shadow(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-inner)?$/,
        /^shadow-\w+-(\d+)(\/\d+)?$/,
        /^opacity-(\d+)$/,
        /^mix-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity|plus-darker|plus-lighter)$/,
        /^bg-blend-(normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity)$/,

        // Filters - ENHANCED to include 'xs' size and negative values
        /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia)(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,
        /^backdrop-(blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia)(-none|-xs|-sm|-md|-lg|-xl|-2xl|-3xl)?$/,

        // Tables
        /^(border-collapse|border-separate)$/,
        /^(table-auto|table-fixed)$/,
        /^caption-(top|bottom)$/,

        // Animations
        /^animate-(none|spin|ping|pulse|bounce)$/,
        /^animate-[\w-]+$/,

        // Transforms - ENHANCED to handle negative values and fractions
        /^(transform|transform-cpu|transform-gpu|transform-none)$/,
        /^-?scale(-\d+|-x-\d+|-y-\d+)?$/, // Handles scale, -scale-x-100, etc.
        /^-?rotate-(\d+)$/,
        /^-?translate-(x|y)-(\d+\.?\d*|px|full|\d+\/\d+)$/, // Handles negative translate and fractions
        /^-?skew-(x|y)-(\d+)$/,
        /^origin-(center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left)$/,

        // Transitions
        /^transition(-none|-all|-colors|-opacity|-shadow|-transform)?$/,
        /^duration-(\d+)$/,
        /^delay-(\d+)$/,
        /^ease-(linear|in|out|in-out)$/,

        // Positioning - ENHANCED to handle negative values and fractions
        /^(static|fixed|absolute|relative|sticky)$/,
        /^-?(inset|inset-x|inset-y|top|right|bottom|left)-(\d+\.?\d*|px|auto|full|\d+\/\d+)$/, // Handles negative positioning and fractions
        /^-?z-(\d+|auto)$/, // Handles negative z-index

        // Overflow
        /^(overflow|overflow-x|overflow-y)-(auto|hidden|clip|visible|scroll)$/,
        /^(overscroll|overscroll-x|overscroll-y)-(auto|contain|none)$/,

        // Visibility
        /^(visible|invisible|collapse)$/,
        /^(isolate|isolation-auto)$/,

        // Object
        /^object-(contain|cover|fill|none|scale-down)$/,
        /^object-(bottom|center|left|left-bottom|left-top|right|right-bottom|right-top|top)$/,

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
        /^stroke-(none|current|\w+-\d+|\d+)$/,

        // Accessibility
        /^(sr-only|not-sr-only)$/,

        // Grid
        /^grid-cols-(none|\d+|subgrid)$/,
        /^col-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-rows-(none|\d+|subgrid)$/,
        /^row-(auto|span-\d+|span-full|start-\d+|start-auto|end-\d+|end-auto)$/,
        /^grid-flow-(row|col|dense|row-dense|col-dense)$/,
        /^auto-(cols|rows)-(auto|min|max|fr)$/,

        // Lists
        /^list-(none|disc|decimal)$/,
        /^list-(inside|outside)$/,
        /^marker-\w+-(\d+)$/,

        // State prefixes - ENHANCED with pseudo-elements
        /^(hover|focus|focus-within|focus-visible|active|visited|target|first|last|only|odd|even|first-of-type|last-of-type|only-of-type|empty|disabled|enabled|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|read-only):/,
        /^(first-letter|first-line|selection|marker|placeholder|file):/, // Added pseudo-elements
        /^(group-hover|group-focus|group-active|group-focus-within|group-focus-visible|group-visited|group-target|group-first|group-last|group-only|group-odd|group-even|group-first-of-type|group-last-of-type|group-only-of-type|group-empty|group-disabled|group-enabled|group-checked|group-indeterminate|group-default|group-required|group-valid|group-invalid|group-in-range|group-out-of-range|group-placeholder-shown|group-autofill|group-read-only):/,
        /^group-has-\[.*?\]:/,
        /^(group-has-hover|group-has-focus|group-has-active|group-has-disabled|group-has-checked|group-has-selected|group-has-valid|group-has-invalid|group-has-required|group-has-optional):/,
        /^group-[\w-]+\/[\w-]+:[\w-]+$/, // Enhanced group patterns like group-even/product-shadow:p-1.25
        /^(peer-hover|peer-focus|peer-active|peer-focus-within|peer-focus-visible|peer-visited|peer-target|peer-first|peer-last|peer-only|peer-odd|peer-even|peer-first-of-type|peer-last-of-type|peer-only-of-type|peer-empty|peer-disabled|peer-enabled|peer-checked|peer-indeterminate|peer-default|peer-required|peer-valid|peer-invalid|peer-in-range|peer-out-of-range|peer-placeholder-shown|peer-autofill|peer-read-only):/,
        /^peer-has-\[.*?\]:/,
        /^(peer-has-hover|peer-has-focus|peer-has-active|peer-has-disabled|peer-has-checked|peer-has-selected|peer-has-valid|peer-has-invalid|peer-has-required|peer-has-optional):/,

        // Media queries
        /^(sm|md|lg|xl|2xl):/,
        /^(dark|light):/,
        /^(motion-safe|motion-reduce|contrast-more|contrast-less):/,
        /^(portrait|landscape):/,
        /^print:/,
        /^supports-\[.*?\]:/,

        // Attributes
        /^(data-\[.*?\]|aria-\[.*?\]):/,

        // Complex selectors
        /^\[&.*?\]:/,
        /^\[.*?\]$/,
      ];

      const isMatch = tailwindPatterns.some(pattern => pattern.test(cleanClassName));

      if (debug && (cleanClassName.includes('outline-hidden') || cleanClassName.includes('min-w-2/3'))) {
        console.log(`🔍 isTailwindUtility(${className} -> ${cleanClassName}): ${isMatch}`);
        console.log(`  - Testing outline-hidden and min-w fraction patterns`);
      }

      return isMatch;
    }

    function isArbitraryValue(className) {
      return /\[.+\]/.test(className) &&
        !/^\[&.*?\]:/.test(className) &&
        !/^data-\[.*?\]:/.test(className) &&
        !/^aria-\[.*?\]:/.test(className) &&
        !/^supports-\[.*?\]:/.test(className);
    }

    function getBaseClass(className) {
      // Handle important modifier (!) at the beginning
      let baseClass = className;
      if (baseClass.startsWith('!')) {
        baseClass = baseClass.substring(1);
      }

      const prefixes = [
        'sm:', 'md:', 'lg:', 'xl:', '2xl:',
        'hover:', 'focus:', 'focus-within:', 'focus-visible:', 'active:', 'visited:', 'target:',
        'first:', 'last:', 'only:', 'odd:', 'even:', 'first-of-type:', 'last-of-type:',
        'only-of-type:', 'empty:', 'disabled:', 'enabled:', 'checked:', 'indeterminate:',
        'default:', 'required:', 'valid:', 'invalid:', 'in-range:', 'out-of-range:',
        'placeholder-shown:', 'autofill:', 'read-only:',
        'first-letter:', 'first-line:', 'selection:', 'marker:', 'placeholder:', 'file:', // Added pseudo-elements
        'group-hover:', 'group-focus:', 'group-active:', 'group-focus-within:', 'group-focus-visible:',
        'group-visited:', 'group-target:', 'group-first:', 'group-last:', 'group-only:',
        'group-odd:', 'group-even:', 'group-first-of-type:', 'group-last-of-type:',
        'group-only-of-type:', 'group-empty:', 'group-disabled:', 'group-enabled:',
        'group-checked:', 'group-indeterminate:', 'group-default:', 'group-required:',
        'group-valid:', 'group-invalid:', 'group-in-range:', 'group-out-of-range:',
        'group-placeholder-shown:', 'group-autofill:', 'group-read-only:',
        'group-has-\\[.*?\\]:', 'group-has-hover:', 'group-has-focus:', 'group-has-active:',
        'group-has-disabled:', 'group-has-checked:', 'group-has-selected:', 'group-has-valid:',
        'group-has-invalid:', 'group-has-required:', 'group-has-optional:',
        'group-[\\w-]+\\/[\\w-]+:', // Enhanced group patterns
        'peer-hover:', 'peer-focus:', 'peer-active:', 'peer-focus-within:', 'peer-focus-visible:',
        'peer-visited:', 'peer-target:', 'peer-first:', 'peer-last:', 'peer-only:',
        'peer-odd:', 'peer-even:', 'peer-first-of-type:', 'peer-last-of-type:',
        'peer-only-of-type:', 'peer-empty:', 'peer-disabled:', 'peer-enabled:',
        'peer-checked:', 'peer-indeterminate:', 'peer-default:', 'peer-required:',
        'peer-valid:', 'peer-invalid:', 'peer-in-range:', 'peer-out-of-range:',
        'peer-placeholder-shown:', 'peer-autofill:', 'peer-read-only:',
        'peer-has-\\[.*?\\]:', 'peer-has-hover:', 'peer-has-focus:', 'peer-has-active:',
        'peer-has-disabled:', 'peer-has-checked:', 'peer-has-selected:', 'peer-has-valid:',
        'peer-has-invalid:', 'peer-has-required:', 'peer-has-optional:',
        'dark:', 'light:',
        'motion-safe:', 'motion-reduce:', 'contrast-more:', 'contrast-less:',
        'portrait:', 'landscape:',
        'print:',
        'supports-\\[.*?\\]:',
        'data-\\[.*?\\]:', 'aria-\\[.*?\\]:',
        '\\[&.*?\\]:',
      ];

      // Strip prefixes iteratively to handle chained prefixes
      while (true) {
        let stripped = false;

        for (const prefix of prefixes) {
          const regex = new RegExp(`^${prefix}`);
          if (regex.test(baseClass)) {
            const newBaseClass = baseClass.replace(regex, '');
            if (newBaseClass !== baseClass) {
              baseClass = newBaseClass;
              stripped = true;
              break;
            }
          }
        }

        if (!stripped) break;
      }

      return baseClass !== className ? baseClass : null;
    }

    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================

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

    // =============================================================================
    // ESLint VISITORS
    // =============================================================================

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