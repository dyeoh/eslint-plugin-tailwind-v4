const { RuleTester } = require('eslint');
const rule = require('../rules/no-undefined-classes');
const path = require('path');

const cssFile = path.relative(
  path.join(__dirname, '..'),
  path.join(__dirname, 'fixtures', 'globals.css')
);

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: { jsx: true },
    sourceType: 'module',
  },
});

// =============================================================================
// TESTS
// =============================================================================

ruleTester.run('no-undefined-classes', rule, {
  valid: [
    // -------------------------------------------------------------------------
    // Built-in Tailwind utilities
    // -------------------------------------------------------------------------
    {
      code: '<div className="flex items-center justify-between" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="p-4 m-2 mx-auto" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="text-lg font-bold" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="bg-red-500 text-white border border-gray-200" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="grid grid-cols-3 gap-4" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="absolute top-0 left-0 z-10" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="w-full h-screen max-w-full" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="rounded-lg shadow-md opacity-50" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="transition duration-300 ease-in-out" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Responsive & state prefixes
    // -------------------------------------------------------------------------
    {
      code: '<div className="sm:flex md:grid lg:hidden" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="hover:bg-blue-500 focus:ring-2" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="dark:bg-gray-900 dark:text-white" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="first:mt-0 last:mb-0" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="sm:hover:bg-blue-600" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Arbitrary values
    // -------------------------------------------------------------------------
    {
      code: '<div className="bg-[#ff0000] text-[14px] w-[200px]" />',
      options: [{ cssFile, allowArbitraryValues: true }],
    },
    {
      code: '<div className="grid-cols-[1fr_2fr] top-[calc(100%-1rem)]" />',
      options: [{ cssFile, allowArbitraryValues: true }],
    },

    // -------------------------------------------------------------------------
    // Important modifier
    // -------------------------------------------------------------------------
    {
      code: '<div className="!font-bold !p-4" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Theme-generated utilities (from @theme variables)
    // -------------------------------------------------------------------------
    {
      code: '<div className="text-primary bg-primary border-primary" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="text-secondary bg-danger" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="text-brand-blue bg-brand-blue" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="from-primary via-secondary to-danger" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="animate-fadeIn" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="shadow-soft" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="rounded-lg" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // @utility definitions
    // -------------------------------------------------------------------------
    {
      code: '<div className="container-sm" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="btn-primary" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // @layer definitions
    // -------------------------------------------------------------------------
    {
      code: '<div className="card" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="badge" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Utility functions (cn, clsx, cva, tw)
    // -------------------------------------------------------------------------
    {
      code: 'cn("flex items-center", "p-4")',
      options: [{ cssFile }],
    },
    {
      code: 'clsx("bg-red-500", "text-white")',
      options: [{ cssFile }],
    },
    {
      code: 'cva("flex", "items-center")',
      options: [{ cssFile }],
    },
    {
      code: 'tw("flex gap-4")',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Template literals
    // -------------------------------------------------------------------------
    {
      code: '<div className={`flex ${someVar} items-center`} />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Group / Peer
    // -------------------------------------------------------------------------
    {
      code: '<div className="group" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="peer" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="group-hover:text-blue-500" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Negative values
    // -------------------------------------------------------------------------
    {
      code: '<div className="-translate-x-4 -rotate-45" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Spacing from theme
    // -------------------------------------------------------------------------
    {
      code: '<div className="p-18 m-18 gap-18" />',
      options: [{ cssFile }],
    },

    // -------------------------------------------------------------------------
    // Font utilities from theme
    // -------------------------------------------------------------------------
    {
      code: '<div className="font-display" />',
      options: [{ cssFile }],
    },
    {
      code: '<div className="text-xxl" />',
      options: [{ cssFile }],
    },
  ],

  invalid: [
    // -------------------------------------------------------------------------
    // Completely made-up classes
    // -------------------------------------------------------------------------
    {
      code: '<div className="not-a-real-class" />',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'not-a-real-class' } }],
    },
    {
      code: '<div className="bg-nonexistent" />',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'bg-nonexistent' } }],
    },
    {
      code: '<div className="flex totally-fake" />',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'totally-fake' } }],
    },

    // -------------------------------------------------------------------------
    // Invalid with utility functions
    // -------------------------------------------------------------------------
    {
      code: 'cn("flex", "completely-invalid")',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'completely-invalid' } }],
    },
    {
      code: 'clsx("invalid-class-name")',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'invalid-class-name' } }],
    },

    // -------------------------------------------------------------------------
    // Multiple invalid classes
    // -------------------------------------------------------------------------
    {
      code: '<div className="fake-one fake-two" />',
      options: [{ cssFile }],
      errors: [
        { messageId: 'undefinedClass', data: { className: 'fake-one' } },
        { messageId: 'undefinedClass', data: { className: 'fake-two' } },
      ],
    },

    // -------------------------------------------------------------------------
    // Invalid with prefix
    // -------------------------------------------------------------------------
    {
      code: '<div className="foobar-widget" />',
      options: [{ cssFile }],
      errors: [{ messageId: 'undefinedClass', data: { className: 'foobar-widget' } }],
    },
  ],
});

console.log('All tests passed!');
