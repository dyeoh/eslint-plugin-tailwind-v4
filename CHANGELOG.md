# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Test suite using ESLint `RuleTester`
- GitHub Actions CI workflow (tests on Node 18, 20, 22)
- GitHub Actions release workflow (automated npm publish on version tags)
- `.npmignore` for cleaner published packages
- `.gitignore`

## [1.0.15] - 2025

### Features
- Validate Tailwind CSS v4 classes in `className` attributes
- Support for `cn()`, `clsx()`, `cva()`, `tw()` utility functions
- Responsive, state, and pseudo-element prefix handling
- `@theme` variable parsing and utility generation
- `@utility` and `@layer` definition extraction
- CSS import following (recursive)
- Arbitrary value support
- Important modifier (`!`) support
- Gradient, animation, shadow, radius, spacing, typography utility generation from theme variables
