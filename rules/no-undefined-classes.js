// no-undefined-classes.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Tailwind v4 classes against your actual CSS build',
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
    let cssBuilt = false;

    function buildAndExtractClasses() {
      if (cssBuilt) return;

      try {
        const projectRoot = context.getCwd();
        const cssPath = path.resolve(projectRoot, cssFile);
        
        if (!fs.existsSync(cssPath)) {
          console.warn(`Warning: CSS file not found at ${cssPath}`);
          cssBuilt = true;
          return;
        }

        const outputCssPath = path.join(projectRoot, 'temp-eslint-validation.css');

        try {
          // ✅ Let's try building CSS with ALL possible content patterns
          const contentPattern = `"${projectRoot}/src/**/*.{js,jsx,ts,tsx,html}" "${projectRoot}/**/*.{js,jsx,ts,tsx}" "${projectRoot}/pages/**/*.{js,jsx,ts,tsx}" "${projectRoot}/app/**/*.{js,jsx,ts,tsx}" "${projectRoot}/components/**/*.{js,jsx,ts,tsx}"`;
          
          if (debug) {
            console.log(`🔍 Building CSS from: ${cssPath}`);
            console.log(`🔍 Content pattern: ${contentPattern}`);
          }

          execSync(
            `npx @tailwindcss/cli@next -i ${cssPath} -o ${outputCssPath} --content ${contentPattern}`,
            { 
              cwd: projectRoot, 
              stdio: debug ? 'inherit' : 'pipe'
            }
          );

          const generatedCss = fs.readFileSync(outputCssPath, 'utf8');
          
          if (debug) {
            console.log(`🔍 Generated CSS size: ${(generatedCss.length / 1024).toFixed(2)}KB`);
            // Show first few classes found
            const cssLines = generatedCss.split('\n').slice(0, 50);
            console.log('🔍 First 50 lines of generated CSS:');
            console.log(cssLines.join('\n'));
          }
          
          extractAllClassNames(generatedCss);

          fs.unlinkSync(outputCssPath);

          if (debug) {
            console.log(`✅ Extracted ${validClasses.size} valid classes from CSS build`);
            // Show some examples of what was found
            const classArray = Array.from(validClasses);
            console.log('🔍 Sample classes found:', classArray.slice(0, 20));
            console.log('🔍 Looking for whitespace-nowrap:', validClasses.has('whitespace-nowrap'));
            console.log('🔍 Looking for items-center:', validClasses.has('items-center'));
            console.log('🔍 Looking for flex:', validClasses.has('flex'));
          }

        } catch (buildError) {
          console.warn('Could not build CSS for validation:', buildError.message);
          if (debug) {
            console.error('Full build error:', buildError);
          }
        }

        cssBuilt = true;

      } catch (error) {
        console.warn('CSS validation setup failed:', error.message);
        if (debug) {
          console.error('Full setup error:', error);
        }
        cssBuilt = true;
      }
    }

    function extractAllClassNames(css) {
      const classRegex = /\.([a-zA-Z_-][\w\-\\:\[\]\/\(\)]*(?:\\[\w\-\\:\[\]\/\(\)]+)*)/g;
      let match;

      while ((match = classRegex.exec(css)) !== null) {
        let className = match[1];
        
        // Clean up escaped characters from CSS
        className = className
          .replace(/\\:/g, ':')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\[/g, '[')
          .replace(/\\\]/g, ']')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\//g, '/')
          .replace(/\\\\/g, '\\');

        if (!isInternalCssClass(className)) {
          validClasses.add(className);
        }
      }
    }

    function isInternalCssClass(className) {
      const internalPatterns = [
        /^before$/, /^after$/, /^first-letter$/, /^first-line$/,
        /^marker$/, /^backdrop$/,
      ];

      return internalPatterns.some(pattern => pattern.test(className));
    }

    function isArbitraryValue(className) {
      return /\[.+\]/.test(className);
    }

    function getBaseClass(className) {
      const prefixes = [
        'sm:', 'md:', 'lg:', 'xl:', '2xl:',
        'hover:', 'focus:', 'active:', 'disabled:', 'dark:',
        'focus-visible:', 'focus-within:', 'group-hover:',
        'data-\\[.*?\\]:',
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
      if (isArbitraryValue(className) && allowArbitraryValues) {
        return true;
      }

      if (validClasses.has(className)) {
        return true;
      }

      const baseClass = getBaseClass(className);
      if (baseClass && validClasses.has(baseClass)) {
        return true;
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
      if (!cssBuilt) {
        buildAndExtractClasses();
      }

      classNames.forEach(className => {
        if (!isValidClass(className)) {
          if (debug) {
            console.log(`❌ Invalid class found: ${className}`);
          }
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