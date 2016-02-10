# jq-repeat [![Build Status](https://travis-ci.org/wmantly/jq-repeat.svg)](https://travis-ci.org/wmantly/jq-repeat)

[![Join the chat at https://gitter.im/wmantly/jq-repeat](https://badges.gitter.im/wmantly/jq-repeat.svg)](https://gitter.im/wmantly/jq-repeat?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
A simple, yet highly customizable plugin to handle all of you're client-side repetitive DOM needs. Simple, quick and powerful templating. It is modeled after ng-repeat and shares some basic syntax, but is not a clone.

* To do list [demo](http://jsfiddle.net/wmantly/nLj6nr4q/)
* Reddit JSON feed [demo](http://jsfiddle.net/wmantly/sge3zr28/)

# Requirements 

* __jq-repeat requires [jQuery](http://jquery.com/) 1.x/2.x and [Mustache](https://github.com/janl/mustache.js) 1.x to run__.

## Template
To set up a jq-repeat template, write any element tag you wish to repeat once where you want the repeating to start, this will serve as the template and starting point.

Simply add a `jq-repeat` attribute with a unique value for the reference name for that template, in this case `toDo`. 
```html
<ul>
    <li jq-repeat="toDo">
        <span class="item">{{ item }}</span> {{{ done }}}
    </li>
</ul>
```
Just like mustache, to add variables use double brackets with the name inside.

## Insert
Now that you have a template set up, let's populate the template use $.scope.toDo.push()
```javaScript
$.scope.toDo.push( { item: 'Get milk', done: 'Yes' } )
```
You can add any number of objects as arguments you wish and each will create a new element from the template. Values must be supplied as objects with keys corresponding to the variable names used in the template.
```javaScript
$.scope.toDo.push({
    item: 'Collect underwear',
    done: 'Yes'
}, {
    item: '?',
    done: 'No'
}, {
    item: 'Profit',
    done: 'No'
});
```
## Methods
The repeat object can take many methods used for arrays, as arrays are the internal data structure.

* `$.scope.toDo.splice(index [,howMany] [,ToAdd])` functions exactly as a regular array with notable difference. If the index propriety is set a string can be passed as the value of the index.
 * **index** *Type: Number or String*
    Index of element you wish to manipulate. If the .index property is set, you may pass a string to match to the index array.
 * **howMany** *Type: Number*
    Number of repeat objects that will be removed. If there are non to be removed, it is not required to use this argument.
 * **update** *Type: Array*
    This is the array of repeat objects to add. If there are none to this is not required.
 * **returns** *Type: Array*
    This function will return an array of deleted elements.
* `$.scope.toDo.pop()` Will remove and return the last element in the repeat array
* `$.scope.toDo.reverse()` Will reverse the repeat array by index number.todo: if .index is a number, will use that. Returns the newly formated array.
* `$.scope.toDo.shift()` works the same as regular arrays.
* `$.scope.toDo.loop()` will take the last value and insert in the front. `toDo.loopUp()` does the opposite. Returns the newly formated array.
* `$.scope.toDo.indexOf( key, value )` Returns the array index number of the matching element. Mostly used for internals.
  * **key** *Type: String*
    The key element to match.
  * **value** *Type: String*
    The value of the matching element.
* `$.scope.toDo.update( key, [value,] update)` Updates selected value with new data. The selection process is done by matching key, value pairs from the existing objects,
  * **key** *Type: String or Number*
    The key or index to the matching element to update
  * **value** *Type: String*
    The value of the matching key to the element to be update.If the index number will be used, must be ommited!
  * **update** *Type: Object*
    This is the object that will be applied to the matching element.
* `$.scope.toDo.__put` is the function that will run when a element is being inserted. This must be a function and must include this.show(), or some other way of un-hiding 'this'.
* `$.scope.toDo.__take` is the function that will run when an element is being removed. This must be a function and include this.remove() or some other way to remove 'this'.
* `$scope.toDo.__index` is the propriety that defines the object key to use an the index. If this is set, a string can be used in place of a number for any index reference.

## Credits
* Written by [William Mantly](https://github.com/wmantly)
* Big thanks to [Derek Hu](https://github.com/derek-dchu) for creating NPM and bower package, and other general house keeping.
* Also, thanks to [Raja Kapur](https://github.com/aonic) for advice and guidance.
