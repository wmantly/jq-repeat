# jq-repeat

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

jq-repeat supports nested repeating templates:

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

Access parent data in nested templates using `_parent`:

```html
<li jq-repeat="employees">
    {{ firstName }} works in {{ _parent.name }}
</li>
```

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

### `update(keyOrIndex, valueOrData, dataToUpdate)`
Update an item with automatic DOM re-rendering (throttled at 50ms):
```javascript
// Update by index
$.scope.toDo.update(0, { done: 'Yes' });

// Update with custom index key
$.scope.users.update('user123', { userName: 'Jane Doe' });

// Update by key/value pair
$.scope.items.update('id', 42, { quantity: 10 });
```

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

## Customization Hooks

### `__put($el, item, list)`
Called when an item is added to the DOM. Default implementation just shows the element:
```javascript
$.scope.toDo.__put = function($el, item, list) {
    $el.fadeIn(300);
};
```

### `__take($el, item, list)`
Called when an item is removed from the DOM:
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
