/*!
 * jq-repeat
 * https://github.com/wmantly/jq-repeat
 * MIT License
 */
(function () {
	'use strict';

	/*
	Author William Mantly Jr <wmantly@gmail.com>
	https://github.com/wmantly/jq-repeat
	MIT license
	*/

	class CallbackQueue {
		constructor(callbacks) {
			this.__callbacks = [];

			for (let callback of Array.isArray(callbacks) ? callbacks : [callbacks]) {
				this.push(callback);
			}
		}

		push(callback) {
			if (callback instanceof Function) {
				this.__callbacks.push(callback);
			}
		}

		call() {
			let args = arguments;
			this.__callbacks.forEach(callback => {
				callback(...args);
			});
		}
	}

	// Encapsulate the library within an IIFE to prevent global scope pollution
	(function($, Mustache) {

		const throttleMap = {};

		function throttleCheck(key) {
		    if (throttleMap[key] && throttleMap[key].args !== null) {
		        // Call the callback with the stored arguments
		        throttleMap[key].callBack(...throttleMap[key].args);
		        throttleMap[key].args = null;
		        
		        // Schedule next check
		        setTimeout(throttleCheck, throttleMap[key].minDelay, key);
		    } else {
		        // Clean up when no more pending calls
		        delete throttleMap[key];
		    }
		}

		function throttle(key, minDelay, callBack, ...args) {
		    if (throttleMap[key]) {
		        // Update arguments for pending call
		        throttleMap[key].args = args;
		    } else {
		        // First call - execute immediately and set up throttling
		        throttleMap[key] = {
		            args: null,
		            minDelay,
		            callBack,
		        };

		        // Execute immediately
		        callBack(...args);
		        
		        // Schedule throttle check
		        setTimeout(throttleCheck, minDelay, key);
		    }
		}

		// Internal scope object for managing repeat lists
		const _scope = {};

		Object.defineProperty(_scope, 'onNew', {
			value: new CallbackQueue(),
			writable: true,
			enumerable: false,
			configurable: true
		});

		$.scope = new Proxy(_scope, {
			get(obj, prop) {
				if (!obj[prop]) {
					obj[prop] = [];
				}
				return Reflect.get(...arguments);
			},
			set(obj, prop, value) {
				return Reflect.set(...arguments);
			},
		});

		// --- Helper function to clean up nested jq-repeat elements ---
		function cleanupNestedRepeats($element) {
			if (!$element || !$element.length) return;
			
			// Find all nested jq-repeat elements within this element
			const $nestedRepeats = $element.find('[jq-repeat-scope]');
			
			$nestedRepeats.each(function() {
				const $nested = $(this);
				const nestedScopeId = $nested.attr('jq-repeat-scope');
				
				if (nestedScopeId && $.scope[nestedScopeId]) {
					// Clean up the nested scope instance
					const nestedInstance = $.scope[nestedScopeId];
					
					// Call take on all items to clean up their DOM elements
					for (let i = 0; i < nestedInstance.length; i++) {
						if (nestedInstance[i] && nestedInstance[i].__jq_$el) {
							nestedInstance.__take(nestedInstance[i].__jq_$el, nestedInstance[i], nestedInstance);
						}
					}
					
					// Clear the array
					nestedInstance.length = 0;
					
					// Remove from global scope
					delete $.scope[nestedScopeId];
				}
			});
		}

		// --- ES6 Class for jq-repeat lists ---
		class RepeatList extends Array {
			// This is the fix: tells built-in Array methods (like slice, map, filter)
			// to return plain Array instances instead of RepeatList instances.
			static get [Symbol.species]() {
				return Array;
			}

			constructor(element, scopeId, options, parentData, parentId, parentIndex, templateHTML, nestedTemplates) {
				super();

				this.__jqRepeatId = scopeId;
				this.options = options;

				// Store the actual indexKey property name for quick access
				if (options && options.indexKey !== undefined) {
					this.__jqIndexKey = options.indexKey;
				}

				// Store sorting options
				if (options && options.orderBy !== undefined) {
					this.__jqOrderBy = options.orderBy;
					this.__jqOrderReverse = options.orderReverse === 'true';
				} else {
					this.__jqOrderBy = null;
					this.__jqOrderReverse = false;
				}

				this._parentData = parentData;
				this.__jqParent = parentId;
				this.__jqParentIndex = parentIndex;
				this.__jqTemplate = templateHTML;
				this.nestedTemplates = nestedTemplates;

				this.$this = $(`<script type="x-tmpl-mustache" id="jq-repeat-holder-${this.__jqRepeatId}"><\/script>`);
				$(element).replaceWith(this.$this);

				let tokenArray = Mustache.parse(this.__jqTemplate);

				this.templateKeys = [];

				for(let token of tokenArray){
					if(['name', '#', '^'].includes(token[0])){
						this.templateKeys.push(token[1]);
					}
				}

				this.templateKeysObj = this.__parseTemplateKeys(tokenArray);

				this.parseKeys = {};

				for (let prop of ['put', 'take', 'putUpdate', 'parseData']) {
					Object.defineProperty(this, prop, {
						enumerable: false,
						get() {
							return this[`__${prop}`];
						},
						set(value) {
							if (typeof value === 'function') {
								this[`__${prop}`] = value;
							} else {
								console.warn(`jq-repeat: Attempted to set '${prop}' to a non-function value for scope '${this.__jqRepeatId}'.`);
							}
						},
					});
				}
			}

	/*		__parseTemplateKeys(parsed, obj){
				for(let token of parsed){
					if(['name', '^'].includes(token[0])){
						obj[token[1].split('.')[0].split('[')[0]] = null;
					}
					if(token[0] === '#'){
						obj[token[1]] = {};
						this.__parseTemplateKeys(token[4], obj[token[1]])
					}
					if(token[0] === '&'){
						obj[token[1].split('.')[0].split('[')[0]] = null;
					}
				}
			}*/

		__parseTemplateKeys(tokenArray){
			const keyMap = {};

			tokenArray.forEach(token => {
			const type = token[0];
			const key = token[1];

			// We only care about tokens that represent a variable, section, or partial
			if (['name', '#', '^', '>', '&'].includes(type)) {
			  // Handle dot notation and array-like keys
			  const keyParts = key.split('.');
			  let currentMap = keyMap;

			  keyParts.forEach((part, index) => {
			    // Check for array notation like `user[0]` and treat it as a plain key
			    const cleanPart = part.split('[')[0];

			    if (index === keyParts.length - 1) {
			      // This is the last part of the key path
			      if (type === '#' || type === '^') {
			        // For sections, make a recursive call to get nested keys
			        currentMap[cleanPart] = this.__parseTemplateKeys(token[4]);
			      } else {
			        // For simple variables or partials, just set the value to null
			        currentMap[cleanPart] = null;
			      }
			    } else {
			      // This is an intermediate part of the key path
			      // If the part doesn't exist or isn't an object, create a new object
			      if (!currentMap[cleanPart] || typeof currentMap[cleanPart] !== 'object') {
			        currentMap[cleanPart] = {};
			      }
			      // Move to the next level of the object
			      currentMap = currentMap[cleanPart];
			    }
			  });
			}
			});

			return keyMap;
		}


			/**
			 * Compares two items based on the __jqOrderBy key and __jqOrderReverse flag.
			 */
			__compareItems(itemA, itemB) {
				if (!this.__jqOrderBy) {
					return 0;
				}

				if (itemB === undefined || itemB === null) {
				    return 0;
				}

				const valA = itemA[this.__jqOrderBy];
				const valB = itemB[this.__jqOrderBy];

				// Handle undefined/null values
				if (valA === undefined || valA === null) return (valB === undefined || valB === null) ? 0 : (this.__jqOrderReverse ? -1 : 1);
				if (valB === undefined || valB === null) return (this.__jqOrderReverse ? 1 : -1);

				let comparison = 0;

				// Numeric comparison
				if (typeof valA === 'number' && typeof valB === 'number') {
					comparison = valA - valB;
				}
				// String comparison (case-insensitive)
				else if (typeof valA === 'string' && typeof valB === 'string') {
					comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
				}
				// Date comparison
				else if (valA instanceof Date && valB instanceof Date) {
					comparison = valA.getTime() - valB.getTime();
				} else {
					// Fallback to string comparison
					comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' });
				}

				return this.__jqOrderReverse ? -comparison : comparison;
			}

			/**
			 * Finds the correct insertion index for a new item to maintain sorted order.
			 */
			__findInsertionIndex(newItem) {
			    if (!this.__jqOrderBy) {
			        return this.length;
			    }

			    for (let i = 0; i < this.length; i++) {
			        if (this[i] === undefined || this[i] === null) {
			            console.warn(`jq-repeat: Encountered an undefined or null item at index ${i} during sorting in scope ${this.__jqRepeatId}. Skipping comparison.`);
			            continue;
			        }
			        if (this.__compareItems(newItem, this[i]) < 0) {
			            return i;
			        }
			    }
			    return this.length;
			}

			splice(inputValue, ...args) {
				let index;
				let wasIndexLookup = false;

				// Determine the starting index for splice
				if (typeof inputValue === "string" && this.__jqIndexKey) {
					index = this.indexOf(inputValue);
					wasIndexLookup = true;
					if (index === -1) {
						let numericInput = Number(inputValue);
						if (!isNaN(numericInput) && numericInput >= 0 && numericInput < this.length) {
							index = numericInput;
							wasIndexLookup = false;
						} else {
							if (args[0] === 0 && args.length > 1) {
								index = Math.max(0, numericInput);
								wasIndexLookup = false;
							} else {
								return [];
							}
						}
					}
				} else {
					if (typeof inputValue === 'number') {
						index = inputValue;
					} else {
						index = this.indexOf(inputValue);
						wasIndexLookup = true;
					}
				}

				// Only return empty array if indexOf was called and returned -1 (item not found)
				// Don't return empty for negative numeric indices like -1 used by pop()
				if (wasIndexLookup && index === -1 && (args[0] > 0 || args.length === 1)) {
					return [];
				}

				let howMany = args[0] ?? (this.length - index);
				let toAdd = args.slice(1);

				// Normalize index and howMany
				if (index > this.length) index = this.length;
				if (index < 0) index = Math.max(0, this.length + index);
				howMany = Math.min(howMany, this.length - index);

				let removedItems = this.slice(index, index + howMany);

				// --- DOM REMOVAL with nested cleanup ---
				for (let i = 0; i < removedItems.length; i++) {
					let item = removedItems[i];
					if (item && item.__jq_$el) {
						// Clean up nested repeats before removing the element
						cleanupNestedRepeats(item.__jq_$el);
						this.__take(item.__jq_$el, item, this);
					}
				}

				// Perform native Array.splice
				const nativeSpliceResult = super.splice(index, howMany, ...toAdd);

				// --- DOM ADDITION / RE-INSERTION ---
				if (toAdd.length > 0) {
					let previousElement = null;
					if (index > 0 && this[index - 1] && this[index - 1].__jq_$el) {
						previousElement = this[index - 1].__jq_$el;
					} else {
						previousElement = this.$this;
					}

					for (let i = 0; i < toAdd.length; i++) {
						let newItemData = toAdd[i];
						let renderData = this.__buildData(index + i, newItemData);
						let $render = $(Mustache.render(this.__jqTemplate, renderData))
							.addClass("jq-repeat-" + this.__jqRepeatId)
							.attr("jq-repeat-scope", this.__jqRepeatId);

						if (this.__jqIndexKey && newItemData.hasOwnProperty(this.__jqIndexKey)) {
							$render.attr("jq-repeat-index", newItemData[this.__jqIndexKey]);
						} else {
							$render.attr("jq-repeat-index", index + i);
						}

						if (previousElement && previousElement.length) {
							previousElement.after($render);
						} else {
							this.$this.after($render);
						}
						previousElement = $render;

						Object.defineProperty(newItemData, "__jq_$el", {
							value: $render,
							writable: true,
							enumerable: false,
							configurable: true,
						});

						this.__put($render, newItemData, this);
					}
				}

				// --- RE-INDEXING REMAINING ELEMENTS ---
				for (let i = index; i < this.length; i++) {
					if (this[i] && this[i].__jq_$el) {
						if (this.__jqIndexKey && this[i].hasOwnProperty(this.__jqIndexKey)) {
							this[i].__jq_$el.attr("jq-repeat-index", this[i][this.__jqIndexKey]);
						} else {
							this[i].__jq_$el.attr("jq-repeat-index", i);
						}
						this[i].__jq_$el.attr("jq-repeat-scope", this.__jqRepeatId);
					}
				}

				return nativeSpliceResult;
			}

			push(...args) {
				if (!this.__jqOrderBy) {
					const index = this.length || 0;
					return this.splice(index, 0, ...args);
				}

				for (let i = 0; i < args.length; ++i) {
					const newItem = args[i];
					const insertionIndex = this.__findInsertionIndex(newItem);
					this.splice(insertionIndex, 0, newItem);
				}
				return this.length;
			}

			pop() {
				return this.splice(-1, 1)[0];
			}

			reverse() {
				if (!this.__jqOrderBy) {
					let elementsToReverse = [];
					for (let i = 0; i < this.length; i++) {
						if (this[i] && this[i].__jq_$el) {
							elementsToReverse.push(this[i].__jq_$el.detach());
						}
					}

					elementsToReverse.reverse();

					let lastElement = this.$this;
					for (let i = 0; i < elementsToReverse.length; i++) {
						lastElement.after(elementsToReverse[i]);
						lastElement = elementsToReverse[i];
					}

					super.reverse();

					for (let i = 0; i < this.length; i++) {
						if (this[i] && this[i].__jq_$el) {
							if (!this.__jqIndexKey) {
								this[i].__jq_$el.attr("jq-repeat-index", i);
							}
						}
					}
				} else {
					console.warn(`jq-repeat: Calling 'reverse()' on a list with 'jr-order-by' defined. This operation might not yield the expected stable sorted order.`);

					let detachedElements = [];
					for (let i = 0; i < this.length; i++) {
						if (this[i] && this[i].__jq_$el) {
							detachedElements.push(this[i].__jq_$el.detach());
						}
					}

					super.reverse();

					let previousElement = this.$this;
					for (let i = 0; i < this.length; i++) {
						const item = this[i];
						if (item && item.__jq_$el) {
							const renderData = this.__buildData(i, item);
							const $render = $(Mustache.render(this.__jqTemplate, renderData))
								.addClass("jq-repeat-" + this.__jqRepeatId)
								.attr("jq-repeat-scope", this.__jqRepeatId);

							if (this.__jqIndexKey && item.hasOwnProperty(this.__jqIndexKey)) {
								$render.attr("jq-repeat-index", item[this.__jqIndexKey]);
							} else {
								$render.attr("jq-repeat-index", i);
							}

							previousElement.after($render);
							Object.defineProperty(item, "__jq_$el", {
								value: $render,
								writable: true,
								enumerable: false,
								configurable: true,
							});
							previousElement = $render;
						}
					}
				}
				return this;
			}

			remove(keyOrValue, value) {
				let index;
				if (arguments.length === 1) {
					index = this.indexOf(keyOrValue);
				} else {
					index = this.indexOf(keyOrValue, value);
				}

				if (index === -1) return;
				this.splice(index, 1);
			}

			empty() {
				return this.splice(0, this.length);
			}

			shift() {
				return this.splice(0, 1)[0];
			}

			unshift(...args) {
				if (!this.__jqOrderBy) {
					return this.splice(0, 0, ...args);
				}

				for (let i = args.length - 1; i >= 0; --i) {
					const newItem = args[i];
					const insertionIndex = this.__findInsertionIndex(newItem);
					this.splice(insertionIndex, 0, newItem);
				}
				return this.length;
			}

			/**
			 * Finds the index of an item in the list.
			 */
			indexOf(keyOrValue, valueToMatch) {
				if (typeof keyOrValue === 'number') {
					if (keyOrValue >= 0 && keyOrValue < this.length) {
						return keyOrValue;
					}
					return -1;
				}

				let searchKey;
				let searchValue;

				if (arguments.length === 2) {
					searchKey = keyOrValue;
					searchValue = valueToMatch;
				} else if (arguments.length === 1) {
					if (typeof keyOrValue === 'object' && keyOrValue !== null) {
						for (let i = 0; i < this.length; ++i) {
							if (this[i] === keyOrValue) {
								return i;
							}
						}
						return -1;
					} else {
						searchKey = this.__jqIndexKey;
						searchValue = keyOrValue;

						if (!searchKey) {
							console.warn(`jq-repeat: Cannot use indexOf with a single value argument without a 'jq-index-key' specified for scope '${this.__jqRepeatId}'.`);
							return -1;
						}
					}
				} else {
					console.error("jq-repeat: Invalid arguments for indexOf method.", arguments);
					return -1;
				}

				for (let i = 0; i < this.length; ++i) {
					if (this[i] && this[i].hasOwnProperty(searchKey) && this[i][searchKey] === searchValue) {
						return i;
					}
				}
				return -1;
			}

			// Fixed update method
			update(keyOrIndex, valueOrData, dataToUpdate) {
			    let index;
			    let data;

			    if (typeof keyOrIndex === 'object' && valueOrData === undefined && dataToUpdate === undefined) {
			        if (this.length > 0) {
			            index = 0;
			            data = keyOrIndex;
			        } else {
			            console.warn(`jq-repeat: Calling update(data) on an empty list '${this.__jqRepeatId}'. Item will be pushed instead.`);
			            return this.push(keyOrIndex);
			        }
			    } else if (typeof keyOrIndex === 'number' && typeof valueOrData === 'object') {
			        index = keyOrIndex;
			        data = valueOrData;
			    } else if (typeof keyOrIndex === 'string' && typeof valueOrData === 'string' && typeof dataToUpdate === 'object') {
			        index = this.indexOf(keyOrIndex, valueOrData);
			        data = dataToUpdate;
			    } else if (typeof keyOrIndex === 'string' && typeof valueOrData === 'object' && dataToUpdate === undefined) {
			        index = this.indexOf(keyOrIndex);
			        data = valueOrData;
			    } else {
			        console.error("jq-repeat: Invalid arguments for update method.", arguments);
			        return null;
			    }

			    if (index === -1 || index >= this.length) {
			        console.warn(`jq-repeat: Update target not found at index ${index} or by key/value. No update performed for scope '${this.__jqRepeatId}'.`);
			        return null;
			    }

			    if (!this[index]) {
			        console.warn(`jq-repeat: Item at calculated index ${index} is null or undefined for scope '${this.__jqRepeatId}'. Cannot update.`);
			        return null;
			    }

			    const throttleKey = this.__jqRepeatId + '_' + index;
			    const boundUpdateDom = this.__updateDom.bind(this);
			    
			    return throttle(throttleKey, 50, boundUpdateDom, index, data);
			}

			__updateDom(index, data){
				let originalItemData = null;
				let originalDOMEl = null;

	            if (!this[index].__jq_$el) {
	                console.warn(`jq-repeat: Item at index ${index} exists, but its DOM element reference (__jq_$el) is null or missing for scope '${this.__jqRepeatId}'.`);
	                return null;
	            }

				originalItemData = $.extend(true, {}, this[index]);
				originalDOMEl = this[index].__jq_$el;

				// Clean up nested repeats before updating
				cleanupNestedRepeats(originalDOMEl);

				// Merge new data into the existing item
				this[index] = $.extend(true, this[index], data);

				// Check if sorting position has changed
				if (this.__jqOrderBy) {
					// Simplified check for position change
					if (this.__compareItems(originalItemData, this[index]) !== 0) {
						const itemToMove = this[index];

						// Remove from DOM and array
						if (originalDOMEl && originalDOMEl.length) {
							this.__take(originalDOMEl, itemToMove, this);
						}
						super.splice(index, 1);

						// Find new insertion point and insert
						const newInsertionIndex = this.__findInsertionIndex(itemToMove);
						super.splice(newInsertionIndex, 0, itemToMove);

						// Render at new position
						const renderData = this.__buildData(newInsertionIndex, itemToMove);
						const $render = $(Mustache.render(this.__jqTemplate, renderData))
							.addClass("jq-repeat-" + this.__jqRepeatId)
							.attr("jq-repeat-scope", this.__jqRepeatId);

						if (this.__jqIndexKey && itemToMove.hasOwnProperty(this.__jqIndexKey)) {
							$render.attr('jq-repeat-index', itemToMove[this.__jqIndexKey]);
						} else {
							$render.attr('jq-repeat-index', newInsertionIndex);
						}

						let previousElement = null;
						if (newInsertionIndex > 0 && this[newInsertionIndex - 1] && this[newInsertionIndex - 1].__jq_$el) {
							previousElement = this[newInsertionIndex - 1].__jq_$el;
						} else {
							previousElement = this.$this;
						}

						if (previousElement && previousElement.length) {
							previousElement.after($render);
						} else {
							this.$this.after($render);
						}

						Object.defineProperty(itemToMove, "__jq_$el", {
							value: $render,
							writable: true,
							enumerable: false,
							configurable: true,
						});

						this.__put($render, itemToMove, this);

						// Re-index elements
						for (let i = 0; i < this.length; i++) {
							if (this[i] && this[i].__jq_$el && !this.__jqIndexKey) {
								this[i].__jq_$el.attr("jq-repeat-index", i);
							}
						}

						return $render;
					}
				}

				// Standard update (no position change)
				const renderData = this.__buildData(index, this[index]);
				const $render = $(Mustache.render(this.__jqTemplate, renderData));

				$render.attr('jq-repeat-scope', this.__jqRepeatId);
				if (this.__jqIndexKey && this[index].hasOwnProperty(this.__jqIndexKey)) {
					$render.attr('jq-repeat-index', this[index][this.__jqIndexKey]);
				} else {
					$render.attr('jq-repeat-index', index);
				}
				$render.addClass(`jq-repeat-${this.__jqRepeatId}`);

				this.__putUpdate(originalDOMEl, $render, this[index], this);

				this[index].__jq_$el = $render;
				return $render;
			}

			getByKey(...args) {
				return this[this.indexOf(...args)];
			}

			// --- User-definable Helper Methods ---

			__put($el, item, list) {
				$el.show();
			}

			__take($el, item, list) {
				if ($el && $el.length) {
					$el.remove();
				}
				if (item) {
					item.__jq_$el = null;
				}
			}

			__putUpdate($el, $render, item, list) {
				$render.show();
				$el.replaceWith($render);
			}

			__parseData(data) {
				let parsedData = { ...data };
				for (let key of Object.keys(parsedData)) {
					if (this.parseKeys[key]) {
						parsedData[key] = this.parseKeys[key](parsedData[key], key, parsedData);
					}
				}
				return parsedData;
			}

			// --- Internal Helper Methods ---

			__buildData(index, data) {
				const actualParentIndex = this.__jqParentIndex;
				return {
					...this.__parseData(data),
					nestedTemplates: this.__parseNestedTemplates(index, data),
					_parent: this._parentData,
					_index: index,
					_list: this,
					_actualParentIndex: actualParentIndex,
				};
			}

			__parseNestedTemplates(index, data) {
				let templates = [];
				({
					...data});

				for (let idx in this.nestedTemplates) {
					let $el = $(`${this.nestedTemplates[idx]}`);

					$el.attr('jq-repeat-parent', this.__jqRepeatId);
					$el.attr('jq-repeat-parent-index', this.__jqParentIndex);
					templates[idx] = $el[0].outerHTML;
				}
				return templates;
			}
		}

		var make = function(element) {
			const $this = $(element);

			const scopeId = $this.attr('jq-repeat');
			if (!scopeId) {
				console.error("jq-repeat: Element missing 'jq-repeat' attribute:", element);
				return;
			}

			const options = {};
			$.each($this[0].attributes, function() {
				if (this.name.startsWith("jq-") || this.name.startsWith("jr-")) {
					const optionName = this.name.replace(/^(jq-|jr-)/, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
					options[optionName] = this.value;
				}
			});

			// const parent = $this.scopeGet();
			let parentData = null;
			let parentId = null;
			let parentIndex = null;
			if ($this.attr('jq-repeat-parent')) {
				parentId = $this.attr('jq-repeat-parent');
				const parentElement = $this.parent().closest(`[jq-repeat-scope="${parentId}"]`);
				if (parentElement.length) {
					parentIndex = parentElement.attr('jq-repeat-index');
					if ($.scope[parentId] && $.scope[parentId].__jqIndexKey && $.scope[parentId].getByKey($.scope[parentId].__jqIndexKey, parentIndex)) {
						parentData = $.scope[parentId].getByKey($.scope[parentId].__jqIndexKey, parentIndex);
					} else if ($.scope[parentId] && !$.scope[parentId].__jqIndexKey && !isNaN(Number(parentIndex))) {
						parentData = $.scope[parentId][Number(parentIndex)];
					}
					else {
						console.warn(`jq-repeat: Parent scope '${parentId}' or item with index/ID '${parentIndex}' not found for nested element.`);
					}
				} else {
					console.warn(`jq-repeat: Could not find parent element for scope '${parentId}'.`);
				}
			}


			const nestedTemplates = [];
			$this.find('[jq-repeat]').each((idx, el) => {
				let templateIdx = nestedTemplates.length;
				let template = `${el.outerHTML}`;
				nestedTemplates.push(template);
				// el.setAttribute('jq-parent-nestedTemplate-index', templateIdx)
				 $(el).replaceWith(`{{{ nestedTemplates.${templateIdx} }}}`);
			});

			$this.removeAttr('jq-repeat');

			const templateHTML = $this[0].outerHTML;

			const repeatListInstance = new RepeatList(
				element,
				scopeId,
				options,
				parentData,
				parentId,
				parentIndex,
				templateHTML,
				nestedTemplates
			);

			const tempPreExistingData = _scope[scopeId] || [];
			_scope[scopeId] = repeatListInstance;

			// Process pre-existing data
			for (const prop of Object.keys(tempPreExistingData)) {
				if (Number.isInteger(Number(prop)) && Number(prop) >= 0) {
					repeatListInstance.push(tempPreExistingData[prop]);
				} else {
					if (typeof repeatListInstance[prop] === 'undefined' || repeatListInstance[prop] === null) {
						repeatListInstance[prop] = tempPreExistingData[prop];
					}
				}
			}
		};

		// --- jQuery Plugin Methods ---

		$.fn.scopeGetEl = function() {
			return this.closest('[jq-repeat-scope]');
		};

		$.fn.scopeGet = function() {
			let $el = this.scopeGetEl();
			if ($el && $el.attr('jq-repeat-scope')) {
				return $.scope[$el.attr('jq-repeat-scope')];
			}
			return undefined;
		};

				$.fn.scopeItem = function() {
			let $el = this.scopeGetEl();
			if ($el) {
				const scopeId = $el.attr('jq-repeat-scope');
				const indexOrId = $el.attr('jq-repeat-index');
				const scopeInstance = $.scope[scopeId];

				if (scopeInstance) {
					if (scopeInstance.__jqIndexKey) {
						return scopeInstance.getByKey(scopeInstance.__jqIndexKey, indexOrId);
					} else {
						return scopeInstance[Number(indexOrId)];
					}
				}
			}
			return undefined;
		};

		$.fn.scopeItemUpdate = function(data) {
			let $el = this.scopeGetEl();
			if ($el) {
				const scopeId = $el.attr('jq-repeat-scope');
				const indexOrId = $el.attr('jq-repeat-index');
				const scopeInstance = $.scope[scopeId];

				if (scopeInstance) {
					if (scopeInstance.__jqIndexKey) {
						scopeInstance.update(scopeInstance.__jqIndexKey, indexOrId, data);
					} else {
						scopeInstance.update(Number(indexOrId), data);
					}
				}
			}
		};

		$.fn.scopeItemRemove = function() {
			let $el = this.scopeGetEl();
			if ($el) {
				const scopeId = $el.attr('jq-repeat-scope');
				const indexOrId = $el.attr('jq-repeat-index');
				const scopeInstance = $.scope[scopeId];

				if (scopeInstance) {
					if (scopeInstance.__jqIndexKey) {
						scopeInstance.remove(indexOrId);
					} else {
						scopeInstance.remove(Number(indexOrId));
					}
				}
			}
		};

		// --- Document Ready and MutationObserver for Auto-Initialization ---

		$(document).ready(function() {
			const observer = new MutationObserver(function(mutationsList) {
				mutationsList.forEach(mutation => {
					if (mutation.type === 'childList') {
						const addedNodes = mutation.addedNodes;
						addedNodes.forEach(node => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								// Check if the added node itself is a jq-repeat
								if (node.hasAttribute("jq-repeat")) {
									const scopeId = $(node).attr('jq-repeat');
									make($(node));
									if (scopeId && $.scope[scopeId]) {
										_scope.onNew.call($.scope[scopeId]);
									}
									return;
								} else {
									// Check if any of its descendants are jq-repeat
									const foundRepeats = node.querySelectorAll("[jq-repeat]");
									if (foundRepeats.length > 0) {
										foundRepeats.forEach(foundNode => {
											const scopeId = $(foundNode).attr('jq-repeat');
											make($(foundNode));
											if (scopeId && $.scope[scopeId]) {
												_scope.onNew.call($.scope[scopeId]);
											}
										});
									}
								}
							}
						});
					}
				});
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true
			});

			// Initialize any jq-repeat elements already present in the DOM on load
			$('[jq-repeat]').each(function(key, value) {
				if ($(value).closest('body').length !== 0) {
					const scopeId = $(value).attr('jq-repeat');
					make($(value));
					if (scopeId && $.scope[scopeId]) {
						_scope.onNew.call($.scope[scopeId]);
					}
				}
			});
		});

	})(jQuery, Mustache);

})();
