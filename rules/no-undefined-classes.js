// eslint-plugin-tailwind-v4/rules/no-undefined-classes.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate Tailwind v4 classes against generated CSS',
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
          customClasses: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefinedClass: "Tailwind class '{{className}}' is not defined in your CSS",
      buildError: "Could not validate classes - CSS build failed",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const { 
      cssFile = 'src/styles/globals.css', 
      allowArbitraryValues = true, 
      customClasses = [] 
    } = options;

    let validClasses = new Set();
    let cssBuilt = false;

    // Build CSS and extract valid classes
    function buildAndExtractClasses() {
      if (cssBuilt) return;

      try {
        const projectRoot = context.getCwd();
        const cssPath = path.resolve(projectRoot, cssFile);
        
        if (!fs.existsSync(cssPath)) {
          console.warn(`Warning: CSS file not found at ${cssPath}`);
          return;
        }

        // Create a temporary test HTML file with common classes
        const testHtml = `
          <div class="flex items-center justify-center bg-white text-black">
            <div class="bg-red border-ring ring-ring outline-ring text-button text-dark-grey">
              Test content
            </div>
          </div>
        `;

        const tempHtmlPath = path.join(projectRoot, 'temp-test.html');
        const tempCssPath = path.join(projectRoot, 'temp-output.css');

        fs.writeFileSync(tempHtmlPath, testHtml);

        // Build CSS using Tailwind v4 CLI
        try {
          execSync(
            `npx @tailwindcss/cli@next -i ${cssPath} -o ${tempCssPath} --content ${tempHtmlPath}`,
            { 
              cwd: projectRoot, 
              stdio: 'pipe'
            }
          );

          // Extract class names from generated CSS
          const generatedCss = fs.readFileSync(tempCssPath, 'utf8');
          extractClassNamesFromCSS(generatedCss);

          // Clean up temp files
          fs.unlinkSync(tempHtmlPath);
          fs.unlinkSync(tempCssPath);

        } catch (buildError) {
          console.warn('Could not build CSS for validation:', buildError.message);
          // Fallback to basic validation
          addBasicTailwindClasses();
        }

        cssBuilt = true;

      } catch (error) {
        console.warn('CSS validation setup failed:', error.message);
        addBasicTailwindClasses();
        cssBuilt = true;
      }
    }

    function extractClassNamesFromCSS(css) {
      // Extract class selectors from CSS
      const classRegex = /\.([a-zA-Z][\w-]*(?:\\[\w-]+)*)/g;
      let match;
      
      while ((match = classRegex.exec(css)) !== null) {
        const className = match[1].replace(/\\/g, ''); // Remove escape characters
        validClasses.add(className);
      }

      // Add custom classes
      customClasses.forEach(cls => validClasses.add(cls));
    }

    function addBasicTailwindClasses() {
      // Add common Tailwind classes as fallback
      const basicClasses = [
        'flex', 'items-center', 'justify-center', 'bg-white', 'text-black',
        'hover:bg-gray-100', 'focus:outline-none', 'transition-colors',
        'rounded', 'border', 'px-4', 'py-2', 'text-sm', 'font-medium',
        'disabled:opacity-50', 'sr-only'
      ];
      
      basicClasses.forEach(cls => validClasses.add(cls));
      customClasses.forEach(cls => validClasses.add(cls));
    }

    function isArbitraryValue(className) {
      return /\[.+\]/.test(className);
    }

    function isValidClass(className) {
      // Handle responsive and state prefixes
      const prefixes = ['sm:', 'md:', 'lg:', 'xl:', '2xl:', 'hover:', 'focus:', 'active:', 'disabled:', 'dark:', 'data-\\[.*\\]:'];
      let baseClass = className;

      for (const prefix of prefixes) {
        const regex = new RegExp(`^${prefix}`);
        if (regex.test(baseClass)) {
          baseClass = baseClass.replace(regex, '');
          break;
        }
      }

      // Allow arbitrary values if enabled
      if (isArbitraryValue(baseClass) && allowArbitraryValues) {
        return true;
      }

      return validClasses.has(baseClass);
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
      // Build CSS on first validation
      if (!cssBuilt) {
        buildAndExtractClasses();
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
      // Handle className prop
      JSXAttribute(node) {
        if (node.name.name === 'className' && node.value) {
          const classNames = extractClassNames(node.value);
          validateClasses(node.value, classNames);
        }
      },

      // Handle cn() and similar functions
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