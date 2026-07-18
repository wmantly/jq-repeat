import globalJsdom from 'global-jsdom';
import Mustache from 'mustache';

// Set up a global DOM environment
globalJsdom('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
});

// jQuery 4 requires a window at import time (static imports are hoisted above
// the globalJsdom() call), so load it dynamically now that the DOM exists.
const { jQueryFactory } = await import('jquery/factory');
const $ = jQueryFactory(window);
global.jQuery = $;
global.$ = $;
global.Mustache = Mustache;

// Export a cleanup function for tests to use
export function cleanupScopes() {
  // Clear all scopes except 'onNew'
  const scopeKeys = Object.keys($.scope);
  for (const key of scopeKeys) {
    if (key !== 'onNew') {
      delete $.scope[key];
    }
  }
}
