# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-07-17

### Fixed
- **`splice()` with a not-found target no longer deletes the last item**: a
  lookup (by key, string, or object reference) that finds nothing now always
  returns `[]` instead of falling through to index `-1`, which was normalized
  to "last item" and silently removed it.
- **Numeric custom index keys work with the jQuery helpers**: `scopeItem()`,
  `scopeItemUpdate()`, and `scopeItemRemove()` read the `jq-repeat-index` DOM
  attribute (always a string); `indexOf()` now matches number and string key
  values interchangeably (`5` matches `'5'`), so numeric ids resolve correctly
  everywhere, including nested-parent lookups.
- **`sort()` keeps the DOM in sync**: `Array.prototype.sort` previously
  reordered the data while leaving the DOM (and index attributes) stale;
  `sort()` is now overridden to re-order elements like `reverse()` does.
- **`fill()` and `copyWithin()` refuse instead of desyncing**: both would
  duplicate item references across indices, which cannot map to per-item DOM
  elements. They now warn and make no changes.
- **Sorted repositioning no longer fires `take`/`put`**: an `update()` that
  moves an item (sort key changed) now detaches and re-inserts the existing
  element and refreshes it through `putUpdate` — user hooks doing teardown on
  `take` no longer see moves as removals.

### Added
- **`replace(newItems)`**: sync the whole list to a new array in one call.
  With an index key it diffs by key (update in place / remove / add) and
  mirrors the new order (unless `jr-order-by` takes precedence); without one
  it matches by position.
- **Leading-edge updates + `jr-update-delay`**: the first `update()` in a
  burst now renders on the next microtask instead of waiting out the 50ms
  window; later calls in the window still coalesce into one trailing render.
  The window is configurable per scope via the `jr-update-delay` attribute.
- **`onUpdate` hook**: per-scope data-level callback fired after an item's
  DOM updates (in-place and repositioning), alongside the existing
  `put`/`take`/`putUpdate` DOM hooks.
- **`$.jqRepeat` lifecycle namespace**: `destroyAll()` tears down every
  registered scope; `stop()`/`start()` disconnect and reconnect the
  MutationObserver for SPA teardown.
- **CI/CD**: GitHub Actions workflows — tests + build on Node 18/20/22 for
  every push and pull request, and npm publish (with provenance) on GitHub
  release.
- **TypeScript definitions**: `types/jq-repeat.d.ts` ships with the package
  (`types` field) and augments the jQuery globals — `JQRepeat.RepeatList<T>`,
  `$.scope`, `$.jqRepeat`, and the `scope*` jQuery helpers. Compile-checked
  in CI via `npm run test:types`.

### Changed
- Nested template HTML is parsed once per scope and cloned per render instead
  of re-parsed for every item.

## [2.1.0] - 2026-07-16

### Fixed
- **Crash on trailing throttled update of a removed item**: a pending
  (trailing) `update()` whose target item was removed before the throttle tick
  fired no longer throws `Cannot read properties of undefined`; pending updates
  for removed items are now cancelled.
- **Rapid partial updates no longer lose data**: successive `update()` calls to
  the same item within the 50ms throttle window now deep-merge their data
  instead of "last write wins", so intermediate keys are preserved.
- **Stale index on sorted updates**: `update()` now keys throttled work by the
  item reference (resolved at call time) and re-resolves its index when the
  tick fires, so two updates in the same tick each hit the item the caller
  intended even when the first update reorders a sorted list.
- **`$.scope` no longer polluted by reads**: reading a scope that does not exist
  returns a throwaway array that only registers on mutation; added
  `$.scope.has(name)` for safe existence checks. Internal guards now use
  `hasOwnProperty` instead of truthiness.
- **Nested scopes no longer share one global slot**: each parent instance now
  owns its own nested `RepeatList` (unique internal id), so multiple parents
  with the same nested template no longer overwrite each other, and removing
  one parent no longer deletes another's nested scope.
- **`reverse()` on a sorted list no longer leaks elements**: detached elements
  are reused (re-inserted) instead of orphaned while fresh elements are built.
- **Multi-level nested initialization**: the MutationObserver and initial scan
  now process only the outermost `[jq-repeat]` elements, fixing double-init of
  nested templates and enabling correct orgs → depts → people chains.

### Added
- **Nested template auto-populate**: pushing a parent item whose data contains
  an array named after the nested scope now auto-populates that nested scope.
  Nested lists are reachable via `$(nestedEl).scopeGet()` or
  `parentItem.__jqNested.<scopeName>`.
- **`destroy()` / `$.fn.scopeDestroy()`**: tear down a scope (empty items,
  cascade nested cleanup, cancel pending updates, remove holder, unregister).
- **`$.scope.has(name)`**: check whether a scope is registered.
- **Sorted batch insert**: `push`/`unshift` of many items into a sorted list now
  uses a single sort + single DOM pass instead of per-item O(n) re-indexing.

### Changed
- `update()` is now trailing-edge throttled (the first call in a window is also
  deferred by up to 50ms) so multiple synchronous updates batch correctly.
- `push()`/`unshift()` now return the new list length (standard `Array` behavior).
- `jr-order-reverse` is now a boolean-style attribute: present with any
  non-explicitly-false value (valueless, `"true"`, `"1"`, etc.) means reversed;
  only `"false"`, `"0"`, `"no"`, `"off"` disable it. Previously only the literal
  string `"true"` enabled it.

### Removed
- Dead code: `templateKeys`, `templateKeysObj`, the `__parseTemplateKeys`
  method, and the now-unused `Mustache.parse` call were removed (none were read
  anywhere). The `__parseNestedTemplates` `tempData` dead branch and the
  commented-out `__parseTemplateKeys` block were also removed.

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
