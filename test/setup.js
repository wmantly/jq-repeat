import globalJsdom from 'global-jsdom';
import jquery from 'jquery';
import Mustache from 'mustache';

// Set up a global DOM environment
globalJsdom('<!DOCTYPE html><html><head></head><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
});

// Make jQuery and Mustache available globally
const $ = jquery(window);
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
