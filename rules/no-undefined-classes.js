// eslint-plugin-tailwind-v4/rules/no-undefined-classes.js
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
      allowArbitraryValues = true
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

        // Build your complete CSS using just your globals.css
        // No test HTML needed since you have all your imports
        const outputCssPath = path.join(projectRoot, 'temp-eslint-validation.css');

        try {
          // Build CSS with all your project files as content
          execSync(
            `npx @tailwindcss/cli@next -i ${cssPath} -o ${outputCssPath} --content "./src/**/*.{js,jsx,ts,tsx}"`,
            { 
              cwd: projectRoot, 
              stdio: 'pipe'
            }
          );

          // Read the complete generated CSS
          const generatedCss = fs.readFileSync(outputCssPath, 'utf8');
          
          // Extract all class names from the generated CSS
          extractAllClassNames(generatedCss);

          // Clean up
          fs.unlinkSync(outputCssPath);

          console.log(`✅ Extracted ${validClasses.size} valid classes from your CSS build`);

        } catch (buildError) {
          console.warn('Could not build CSS for validation:', buildError.message);
        }

        cssBuilt = true;

      } catch (error) {
        console.warn('CSS validation setup failed:', error.message);
        cssBuilt = true;
      }
    }

    function extractAllClassNames(css) {
      // Extract all CSS class selectors
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

        // Skip CSS-only classes that aren't meant to be used directly
        if (!isInternalCssClass(className)) {
          validClasses.add(className);
        }
      }
    }

    function isInternalCssClass(className) {
      // Filter out internal CSS classes that shouldn't be used directly
      const internalPatterns = [
        /^before$/, /^after$/, /^first-letter$/, /^first-line$/,
        /^marker$/, /^backdrop$/,
        /^-/, // Negative utility classes are handled by Tailwind
      ];

      return internalPatterns.some(pattern => pattern.test(className));
    }

    function isArbitraryValue(className) {
      return /\[.+\]/.test(className);
    }

    function getBaseClass(className) {
      // Remove prefixes to get base class
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
      // Allow arbitrary values
      if (isArbitraryValue(className) && allowArbitraryValues) {
        return true;
      }

      // Check exact match
      if (validClasses.has(className)) {
        return true;
      }

      // Check base class for prefixed utilities
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