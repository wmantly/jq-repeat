# jq-repeat

[![CI](https://github.com/wmantly/jq-repeat/actions/workflows/ci.yml/badge.svg)](https://github.com/wmantly/jq-repeat/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/jq-repeat.svg)](https://www.npmjs.com/package/jq-repeat)

A simple, yet highly customizable jQuery plugin to handle all of your client-side repetitive DOM needs. Simple, quick and powerful templating using Mustache syntax. Modeled after ng-repeat with automatic DOM synchronization.

**[View Interactive Demos](https://wmantly.github.io/jq-repeat/)** - See jq-repeat in action with live examples!

## Requirements

* **jQuery 3.x** ([http://jquery.com/](http://jquery.com/))
* **Mustache 4.x** ([https://github.com/janl/mustache.js](https://github.com/janl/mustache.js))

## Installation

### NPM
```bash
npm install jq-repeat
```

### Include in HTML
```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/4.2.0/mustache.min.js"></script>
<script src="dist/js/jq-repeat.min.js"></script>
```

### TypeScript

Type definitions ship with the package (`types/jq-repeat.d.ts`) and augment
the jQuery globals — you just need `@types/jquery`:

```typescript
interface Todo { item: string; done: string; }

const todos = $.scope.toDo as JQRepeat.RepeatList<Todo>;
todos.push({ item: 'Get milk', done: 'No' });   // typed
todos.update(0, { done: 'Yes' });               // Partial<Todo>

const item = $('.jq-repeat-toDo').first().scopeItem<Todo>();
```

## Quick Start

### Template Setup
Add a `jq-repeat` attribute with a unique scope name to any element you want to use as a repeating template:

```html
<ul>
    <li jq-repeat="toDo">
        <span class="item">{{ item }}</span>
        <span class="status">{{ done }}</span>
    </li>
</ul>
```

Use Mustache syntax (`{{ variable }}`) for text interpolation and `{{{ variable }}}` for unescaped HTML.

### Adding Items

Items are automatically rendered when you push data to the scope:

```javascript
$.scope.toDo.push({ item: 'Get milk', done: 'Yes' });

// Add multiple items at once
$.scope.toDo.push(
    { item: 'Collect underwear', done: 'Yes' },
    { item: '?', done: 'No' },
    { item: 'Profit', done: 'No' }
);
```

## Upgrading from 2.0.x

2.1.0 is backward-compatible for typical (flat-list, event-driven) usage. Two
patterns need attention when upgrading:

1. **Nested scopes are no longer on `$.scope.<name>`.** Previously a nested
   `jq-repeat="employees"` registered a single shared `$.scope.employees`
   (which never auto-populated). Now each parent instance owns its own nested
   list and **auto-populates** from the parent item's matching-named array.
   Replace manual `$.scope.employees.push(...)` with either letting
   auto-populate handle it, or targeting the parent's list:
   ```javascript
   // Before (2.0.x): $.scope.employees.push({ ... })
   // After (2.1.0):
   $.scope.departments[0].__jqNested.employees.push({ ... });
   // or, from a rendered nested element:
   $('.jq-repeat-employees').first().scopeGet().push({ ... });
   ```

2. **`update()` is now trailing-edge throttled.** The first `update()` in a
   burst is no longer applied synchronously — it runs within ~50ms, coalesced
   with any subsequent updates. If you read the DOM or item data immediately
   after calling `update()`, wrap that read in a `setTimeout`/event handler so
   it runs after the throttle tick.

See the [Changelog](./CHANGELOG.md) for the full list of fixes and additions.

## Core Features

### Automatic Sorting

Sort items automatically with the `jr-order-by` attribute:

```html
<li jq-repeat="users" jr-order-by="name">
    {{ name }} - {{ age }}
</li>

<li jq-repeat="scores" jr-order-by="points" jr-order-reverse="true">
    {{ player }}: {{ points }}
</li>
```

When `jr-order-by` is set, items are automatically inserted and maintained in sorted order.

### Custom Index Keys

Use a custom property as the index with `jq-index-key`:

```html
<div jq-repeat="users" jq-index-key="userId">
    {{ userName }}
</div>
```

```javascript
$.scope.users.push({ userId: 'user123', userName: 'John' });
$.scope.users.update('userId', 'user123', { userName: 'John Doe' });
```

### Nested Templates

jq-repeat supports nested repeating templates. Each parent instance gets its
**own** nested scope — multiple parents do not share one global list — and the
nested scope is **auto-populated** from the array property on the parent item
whose name matches the nested scope name:

```html
<div jq-repeat="departments">
    <h2>{{ name }}</h2>
    <ul>
        <li jq-repeat="employees">
            {{ firstName }} {{ lastName }}
        </li>
    </ul>
</div>
```

```javascript
// `employees` inside each department is auto-populated from the
// `employees` array on the department item:
$.scope.departments.push({
    name: 'Engineering',
    employees: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' }
    ]
});
```

Access parent data in nested templates using `_parent`:

```html
<li jq-repeat="employees">
    {{ firstName }} works in {{ _parent.name }}
</li>
```

Because each parent instance owns its own nested list, nested scopes are **not**
registered under the bare name on `$.scope` (there is no single
`$.scope.employees`). Access a nested list from a rendered nested element, or
from the parent item's `__jqNested` map:

```javascript
// From any rendered nested element:
$('.jq-repeat-employees').first().scopeGet();        // -> that department's employees RepeatList

// From the parent item:
$.scope.departments[0].__jqNested.employees;         // -> same list

// All instances of a nested template share a CSS class based on the scope
// name, so you can select across parents:
$('.jq-repeat-employees').length;                      // total across all departments
```

Removing a parent item automatically empties and unregisters its nested scopes
(and their nested scopes, recursively).

## Array Methods

The scope object extends Array, so all standard array methods work with automatic DOM synchronization:

### `push(...items)`
Add items to the end (or in sorted position if `jr-order-by` is set):
```javascript
$.scope.toDo.push({ item: 'New task', done: 'No' });
```

### `pop()`
Remove and return the last item:
```javascript
const last = $.scope.toDo.pop();
```

### `shift()`
Remove and return the first item:
```javascript
const first = $.scope.toDo.shift();
```

### `unshift(...items)`
Add items to the beginning (or in sorted position if `jr-order-by` is set):
```javascript
$.scope.toDo.unshift({ item: 'Urgent task', done: 'No' });
```

### `splice(index, howMany, ...itemsToAdd)`
Remove and/or add items at a specific position:
```javascript
// Remove 2 items starting at index 1
$.scope.toDo.splice(1, 2);

// Replace 1 item at index 2
$.scope.toDo.splice(2, 1, { item: 'Updated task', done: 'Yes' });

// With custom index key
$.scope.users.splice('user123', 1); // Remove user with userId 'user123'
```

### `reverse()`
Reverse the order of items:
```javascript
$.scope.toDo.reverse();
```

### `sort(compareFn)`
Sort the items and re-order the DOM to match, exactly like `Array.prototype.sort`:
```javascript
$.scope.toDo.sort((a, b) => a.item.localeCompare(b.item));
```
If the scope has `jr-order-by` set, a warning is logged: the manual sort is
applied, but later inserts will still follow `jr-order-by`.

> **Unsupported mutators:** `fill()` and `copyWithin()` would duplicate item
> references across indices, which can't be mapped to per-item DOM elements.
> They log a warning and make no changes. Likewise, **direct index assignment**
> (`$.scope.toDo[0] = {...}`) updates the data but is not observed — the DOM
> will not re-render. Use `update()`, `splice()`, or `replace()` instead.

### `indexOf(keyOrValue, value)`
Find the index of an item:
```javascript
// With custom index key
const index = $.scope.users.indexOf('user123');

// By property value
const index = $.scope.users.indexOf('name', 'John');

// By object reference
const index = $.scope.users.indexOf(userObject);
```

Number and string key values are matched interchangeably (`5` matches `'5'`),
because DOM attributes — which back `scopeItem()` and friends — always
stringify values. Numeric custom index keys therefore work everywhere.

### `update(keyOrIndex, valueOrData, dataToUpdate)`
Update an item with automatic DOM re-rendering:
```javascript
// Update by index
$.scope.toDo.update(0, { done: 'Yes' });

// Update with custom index key
$.scope.users.update('user123', { userName: 'Jane Doe' });

// Update by key/value pair
$.scope.items.update('id', 42, { quantity: 10 });
```

Updates are **coalesced per item, leading + trailing edge**: the first
`update()` for an item renders on the next microtask (effectively
immediately), which opens a coalescing window — 50ms by default, configurable
per scope with the `jr-update-delay` attribute:
```html
<li jq-repeat="feed" jr-update-delay="200">...</li>
```
Later calls for the *same* item inside the window are deep-merged into a
single trailing re-render, so distinct partial updates accumulate rather than
clobber each other. The target item is resolved by reference at call time, so
an update always lands on the item you meant — even if an earlier update in
the same tick reordered a sorted list. A pending update for an item that gets
removed before the window closes is simply cancelled (and never throws).

On a sorted scope (`jr-order-by`), an update that changes the sort key
*moves* the item: its element is detached and re-inserted at the new
position, then refreshed through the normal `putUpdate` hook. The `take` and
`put` hooks do **not** fire for moves — they are reserved for real removals
and additions.

### `replace(newItems)`
Sync the whole list to a new array in one call — ideal for "reload from the
server" without the flash of `empty()` + `push(...)`:
```javascript
const rows = await fetch('/api/users').then(r => r.json());
$.scope.users.replace(rows);
```

With a custom index key, `replace()` diffs by key: existing items whose key
still appears are **updated in place** (data deep-merged, `putUpdate` fires),
items whose key is gone are removed (`take` fires), and new keys are added
(`put` fires). The DOM is re-ordered to match `newItems` — unless the scope
has `jr-order-by`, which keeps precedence.

Without an index key, items are matched by position: overlapping indices are
updated in place, extras are removed, and additions are appended.

### `getByKey(key, value)`
Get an item by key/value:
```javascript
const user = $.scope.users.getByKey('userId', 'user123');
```

### `remove(keyOrValue, value)`
Remove an item:
```javascript
// By custom index
$.scope.users.remove('user123');

// By key/value
$.scope.items.remove('id', 42);
```

### `empty()`
Remove all items:
```javascript
$.scope.toDo.empty();
```

### `destroy()`
Tear down a scope entirely: empty all of its items (recursively cleaning up any
nested scopes), cancel any pending throttled updates, remove the placeholder
holder element, detach from its parent's nested map, and unregister the scope
from `$.scope`:
```javascript
$.scope.toDo.destroy();
// $.scope.has('toDo') === false; all of its DOM is gone
```

## `$.scope`

`$.scope` is a proxy over the registry of all repeat scopes.

Reading a scope that has not been created yet (e.g. before its
`[jq-repeat]` element is in the DOM) returns a throwaway empty array that only
registers itself the first time you actually mutate it — so the
push-before-the-template workflow still works without permanently polluting the
registry on a plain read:
```javascript
$.scope.toDo.push({ item: 'Get milk' }); // works even if the template isn't loaded yet
```

Check whether a scope actually exists without accidentally creating it:
```javascript
$.scope.has('toDo');   // true once a [jq-repeat="toDo"] element has initialized
$.scope.has('nope');   // false (and does not create anything)
```

`$.scope.onNew` is a callback queue invoked with each newly created scope (top-
level and nested) right after it initializes:
```javascript
$.scope.onNew.push(function(list) {
    console.log('scope ready:', list.__jqRepeatId);
});
```

## `$.jqRepeat` — Global Lifecycle

For single-page apps that need to tear jq-repeat down:

```javascript
// Destroy every registered scope: their DOM, nested scopes, pending updates,
// and any pre-populated data arrays.
$.jqRepeat.destroyAll();

// Stop watching the DOM for new [jq-repeat] templates. Existing scopes keep
// working; templates added while stopped are ignored.
$.jqRepeat.stop();

// Resume watching.
$.jqRepeat.start();
```

Note that nested templates also initialize through the DOM watcher, so calling
`stop()` while parent scopes are still receiving items will prevent their
nested lists from initializing.

## jQuery Helper Methods

### `$(element).scopeGet()`
Get the RepeatList scope for an element:
```javascript
$('.jq-repeat-toDo').first().scopeGet(); // Returns $.scope.toDo
```

### `$(element).scopeGetEl()`
Get the closest jq-repeat element:
```javascript
$('.item').scopeGetEl(); // Returns the <li jq-repeat-scope="toDo"> element
```

### `$(element).scopeItem()`
Get the data object for a specific rendered item:
```javascript
const itemData = $('.jq-repeat-toDo').first().scopeItem();
```

### `$(element).scopeItemUpdate(data)`
Update a specific item:
```javascript
$('.jq-repeat-toDo').first().scopeItemUpdate({ done: 'Yes' });
```

### `$(element).scopeItemRemove()`
Remove a specific item:
```javascript
$('.jq-repeat-toDo').first().scopeItemRemove();
```

### `$(element).scopeDestroy()`
Destroy the scope for an element (see [`destroy()`](#destroy)):
```javascript
$('.jq-repeat-toDo').first().scopeDestroy();
```

## Customization Hooks

### `__put($el, item, list)`
Called when an item is added to the DOM. Default implementation just shows the element:
```javascript
$.scope.toDo.__put = function($el, item, list) {
    $el.fadeIn(300);
};
```

### `__take($el, item, list)`
Called when an item is removed from the DOM. Not called when a sorted update
merely repositions an item — moves go through `__putUpdate` instead:
```javascript
$.scope.toDo.__take = function($el, item, list) {
    $el.fadeOut(300, function() {
        $(this).remove();
    });
};
```

### `__putUpdate($oldEl, $newEl, item, list)`
Called when an item is updated:
```javascript
$.scope.toDo.__putUpdate = function($oldEl, $newEl, item, list) {
    $oldEl.fadeOut(150, function() {
        $newEl.fadeIn(150);
        $oldEl.replaceWith($newEl);
    });
};
```

### `__onUpdate($el, item, list)`
Data-level hook called after an item's DOM has been updated (both in-place
updates and sorted repositions). Unlike `__putUpdate` it has no DOM
responsibilities — use it to react to changes:
```javascript
$.scope.toDo.onUpdate = function($el, item, list) {
    console.log('item changed:', item);
};
```

### `parseKeys`
Transform data before rendering:
```javascript
$.scope.toDo.parseKeys.timestamp = function(value, key, data) {
    return new Date(value).toLocaleString();
};
```

## Template Variables

Special variables available in templates:

* `_parent` - Access parent scope data in nested templates
* `_index` - Current item's index in the array
* `_list` - Reference to the RepeatList instance
* `nestedTemplates` - Array of nested template HTML

## Building

Build the distribution files:
```bash
npm run build
```

This creates:
- `dist/js/jq-repeat.js` - Unminified version
- `dist/js/jq-repeat.min.js` - Minified version with source map

## Testing

Run tests:
```bash
npm test
```

## Browser Compatibility

Works in all modern browsers that support ES6 features including:
- Classes
- Arrow functions
- Proxies
- Template literals
- Spread operator

For older browsers, use a transpiler like Babel.

## Credits

* Written by [William Mantly](https://github.com/wmantly)
* Big thanks to [Derek Hu](https://github.com/derek-dchu) for creating NPM and bower package, and other general housekeeping
* Also, thanks to [Raja Kapur](https://github.com/aonic) for advice and guidance

## License

MIT License - see LICENSE file for details
