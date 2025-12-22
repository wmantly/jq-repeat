# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-22

### Breaking Changes
- **ES6+ Required**: Code now uses modern JavaScript features (classes, arrow functions, Proxies, etc.)
- **Dependencies Updated**: Now requires jQuery 3.x and Mustache 4.x (previously 1.x/2.x and 1.x)
- **Moved to Peer Dependencies**: jQuery and Mustache are now peer dependencies instead of dependencies
- **Build System**: Replaced Gulp with Rollup for modern bundling

### Added
- **Automatic Sorting**: New `jr-order-by` and `jr-order-reverse` attributes for automatic item sorting
- **Update Throttling**: Updates are now throttled at 50ms for better performance
- **Nested Template Support**: Full support for nested jq-repeat templates with `_parent` access
- **Custom Hooks**: `parseKeys` for data transformation before rendering
- **Template Key Parsing**: Better Mustache template parsing with `templateKeysObj`
- **Comprehensive Test Suite**: 32 passing tests covering all features
- **Modern Build System**: Rollup-based build with minification and source maps
- **Build Scripts**: `npm run build` for generating distribution files
- **Pre-publish Hooks**: Automatic build and test before publishing

### Improved
- **Performance**: Better DOM manipulation and update batching
- **Memory Management**: Proper cleanup of nested templates when parent items are removed
- **Error Handling**: Better warnings for invalid operations
- **Documentation**: Complete rewrite with comprehensive API documentation
- **Array Methods**: Fixed bug in `splice()` with negative indices (e.g., `pop()`)
- **Property Naming**: Renamed internal properties from `__repeatId` to `__jqRepeatId` for clarity

### Fixed
- **Splice Bug**: Fixed `splice()` returning empty arrays for negative indices used by `pop()`
- **Index Handling**: Better handling of custom index keys in all array methods
- **Nested Cleanup**: Proper cleanup of nested scopes when parent items are removed
- **Update Positioning**: Items now correctly reposition when sorted values change

### Technical Improvements
- Migrated to ES6 classes from constructor functions
- Implemented `Symbol.species` for proper Array subclassing
- Added `CallbackQueue` class for managing callbacks
- Implemented throttling system for update operations
- Better separation of concerns with `__buildData` and `__parseNestedTemplates`

### Development
- Modern test setup with Mocha, Chai, and JSDOM
- ES6 module support throughout codebase and tests
- Rollup configuration for builds
- Comprehensive test coverage for all features

## [1.0.0] - Previous Release

Initial release with basic functionality.
