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

		// --- Throttling ---
		//
		// `throttleMap` is keyed by an arbitrary key (for jq-repeat that key is the
		// data item being updated). Throttling is *leading + trailing edge*: the
		// first call for a key executes on the next microtask (so a burst of calls
		// made in the same tick coalesces into that first execution, and each call
		// resolves its target against the not-yet-mutated array), opening a window
		// of `minDelay` ms. Calls arriving later inside that window are coalesced
		// into one trailing execution when the window closes. By default the latest
		// arguments win; pass a `mergeFn` to combine arguments instead (used by
		// `update()` so that rapid partial merges accumulate instead of clobbering
		// each other).
		const throttleMap = new Map();

		function throttle(key, minDelay, callBack, mergeFn, ...args) {
			const existing = throttleMap.get(key);
			if (existing) {
				// `args === null` means the leading call already ran; anything
				// arriving now waits for the trailing edge.
				existing.args = existing.args === null
					? args
					: (mergeFn ? mergeFn(existing.args, args) : args);
				return;
			}

			const entry = { args, callBack };
			throttleMap.set(key, entry);

			queueMicrotask(() => {
				const current = throttleMap.get(key);
				if (current !== entry) return; // cancelled before it ran
				const callArgs = entry.args;
				entry.args = null;
				callBack(...callArgs);
			});

			entry.timer = setTimeout(() => {
				const current = throttleMap.get(key);
				if (current === entry) {
					throttleMap.delete(key);
					if (current.args !== null) {
						callBack(...current.args);
					}
				}
			}, minDelay);
		}

		// Cancel a pending throttled call (e.g. when its item is removed/destroyed).
		function cancelThrottle(key) {
			const entry = throttleMap.get(key);
			if (entry) {
				clearTimeout(entry.timer);
				throttleMap.delete(key);
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

		// Monotonic counter used to derive a unique scope id for each nested
		// template instance, so multiple parents can each own their own nested list.
		let nextNestedId = 0;

		// Returns a throwaway empty array that only writes itself into the scope the
		// first time it is actually mutated. This lets `$.scope.foo.push(...)` work
		// before a `[jq-repeat="foo"]` element exists (the "pre-populate" workflow)
		// without plain reads of `$.scope.foo` permanently polluting the scope.
		function createLazyScopeArray(obj, prop) {
			const arr = [];
			let registered = false;
			const ensure = () => {
				if (!registered) {
					registered = true;
					obj[prop] = arr;
				}
			};
			return new Proxy(arr, {
				get(target, key, receiver) {
					const val = Reflect.get(target, key, receiver);
					// Treat any method access as "intent to use as an array" and
					// materialize. Pure property reads (length, indices) stay lazy.
					if (typeof val === 'function') {
						ensure();
						return val.bind(target);
					}
					return val;
				},
				set(target, key, value, receiver) {
					ensure();
					return Reflect.set(target, key, value, receiver);
				}
			});
		}

		$.scope = new Proxy(_scope, {
			get(obj, prop) {
				if (typeof prop === 'symbol') {
					return Reflect.get(obj, prop);
				}
				if (prop === 'has') {
					return (name) => Object.prototype.hasOwnProperty.call(obj, name);
				}
				if (Object.prototype.hasOwnProperty.call(obj, prop)) {
					return Reflect.get(obj, prop);
				}
				return createLazyScopeArray(obj, prop);
			},
			set(obj, prop, value) {
				return Reflect.set(...arguments);
			},
		});

		// --- Helper: clean up the nested scopes attached to a parent item ---
		//
		// Nested lists live on their parent item (item.__jqNested) rather than as a
		// single shared global, so removing a parent item must empty each of its own
		// nested lists and drop them from the registry. `empty()` recurses, so
		// deeper nesting (orgs -> depts -> people) cleans up correctly.
		function cleanupNestedRepeats(item) {
			if (!item || !item.__jqNested) return;
			const nested = item.__jqNested;
			for (const baseName of Object.keys(nested)) {
				const nestedList = nested[baseName];
				if (nestedList && typeof nestedList.empty === 'function') {
					nestedList.empty();
				}
				if (nestedList) {
					delete _scope[nestedList.__jqRepeatId];
				}
			}
			for (const baseName of Object.keys(nested)) {
				delete nested[baseName];
			}
		}

		// --- ES6 Class for jq-repeat lists ---
		class RepeatList extends Array {
			// This is the fix: tells built-in Array methods (like slice, map, filter)
			// to return plain Array instances instead of RepeatList instances.
			static get [Symbol.species]() {
				return Array;
			}

			constructor(element, scopeId, options, parentData, parentId, parentIndex, templateHTML, nestedTemplates, baseScopeId) {
				super();

				this.__jqRepeatId = scopeId;
				// The user-facing scope name (the bare `jq-repeat="..."` value). For
				// top-level scopes this equals scopeId; for nested scopes scopeId is a
				// unique derived id while baseScopeId stays the shared name used for the
				// CSS class so all instances of the same nested template stay selectable.
				this.__jqBaseId = baseScopeId || scopeId;
				this.options = options;

				// Store the actual indexKey property name for quick access
				if (options && options.indexKey !== undefined) {
					this.__jqIndexKey = options.indexKey;
				}

				// Store sorting options
				if (options && options.orderBy !== undefined) {
					this.__jqOrderBy = options.orderBy;
					// Boolean-style attribute: present with any non-explicitly-false
					// value (including valueless, "true", "1") means reversed.
					const rev = options.orderReverse;
					this.__jqOrderReverse =
						rev !== undefined && rev !== null && rev !== false &&
						rev !== 'false' && rev !== '0' && rev !== 'no' && rev !== 'off';
				} else {
					this.__jqOrderBy = null;
					this.__jqOrderReverse = false;
				}

				// Coalescing window (ms) for update(): the first update in a burst
				// renders immediately, later ones merge into one trailing render.
				// Configurable via the `jr-update-delay` attribute.
				const updateDelay = options && options.updateDelay !== undefined ? Number(options.updateDelay) : NaN;
				this.__jqUpdateDelay = Number.isFinite(updateDelay) && updateDelay >= 0 ? updateDelay : 50;

				this._parentData = parentData;
				this.__jqParent = parentId;
				this.__jqParentIndex = parentIndex;
				this.__jqTemplate = templateHTML;
				this.nestedTemplates = nestedTemplates || [];

				// Parse each nested template's HTML once; per-item renders clone
				// these instead of re-parsing the HTML string every time.
				Object.defineProperty(this, '__nestedTemplateCache', {
					value: this.nestedTemplates.map(t => $(`${t}`)),
					writable: true,
					enumerable: false,
					configurable: true,
				});

				this.$this = $(`<script type="x-tmpl-mustache" id="jq-repeat-holder-${this.__jqRepeatId}"><\/script>`);
				$(element).replaceWith(this.$this);

				this.parseKeys = {};

				for (let prop of ['put', 'take', 'putUpdate', 'parseData', 'onUpdate']) {
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

			// Render a single item's jQuery element at `index` for `item`, applying the
			// class/scope/index attributes consistently.
			__renderItem(index, item) {
				const renderData = this.__buildData(index, item);
				const $render = $(Mustache.render(this.__jqTemplate, renderData))
					.addClass("jq-repeat-" + this.__jqBaseId)
					.attr("jq-repeat-scope", this.__jqRepeatId);

				if (this.__jqIndexKey && item.hasOwnProperty(this.__jqIndexKey)) {
					$render.attr("jq-repeat-index", item[this.__jqIndexKey]);
				} else {
					$render.attr("jq-repeat-index", index);
				}

				Object.defineProperty(item, "__jq_$el", {
					value: $render,
					writable: true,
					enumerable: false,
					configurable: true,
				});

				return $render;
			}

			__refreshIndexAttr(index, item) {
				if (!item || !item.__jq_$el) return;
				if (this.__jqIndexKey && item.hasOwnProperty(this.__jqIndexKey)) {
					item.__jq_$el.attr("jq-repeat-index", item[this.__jqIndexKey]);
				} else {
					item.__jq_$el.attr("jq-repeat-index", index);
				}
				item.__jq_$el.attr("jq-repeat-scope", this.__jqRepeatId);
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

				// A lookup (by key or object reference) that found nothing must never
				// fall through to the numeric path: index -1 would be normalized to
				// "last item" and silently delete it. Negative numeric indices (e.g.
				// pop()'s splice(-1, 1)) don't set wasIndexLookup and are unaffected.
				if (wasIndexLookup && index === -1) {
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
					if (item) {
						cleanupNestedRepeats(item);
						cancelThrottle(item);
						if (item.__jq_$el) {
							this.__take(item.__jq_$el, item, this);
						}
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
						let $render = this.__renderItem(index + i, newItemData);

						if (previousElement && previousElement.length) {
							previousElement.after($render);
						} else {
							this.$this.after($render);
						}
						previousElement = $render;

						this.__put($render, newItemData, this);
					}
				}

				// --- RE-INDEXING REMAINING ELEMENTS ---
				for (let i = index; i < this.length; i++) {
					this.__refreshIndexAttr(i, this[i]);
				}

				return nativeSpliceResult;
			}

			push(...args) {
				if (args.length === 0) return this.length;
				if (!this.__jqOrderBy) {
					this.splice(this.length, 0, ...args);
					return this.length;
				}
				if (args.length === 1) {
					this.splice(this.__findInsertionIndex(args[0]), 0, args[0]);
					return this.length;
				}
				this.__sortedBatchAdd(args);
				return this.length;
			}

			// Add many items to a sorted list in a single pass: append them all,
			// stable-sort the whole list once, then reorder the DOM once. This is
			// O((n+m) log(n+m)) + O(n+m) DOM work instead of the O(n*m) re-indexing
			// that per-item splice insertion would do.
			__sortedBatchAdd(newItems) {
				super.push(...newItems);

				Array.prototype.sort.call(this, this.__compareItems.bind(this));

				// Detach every existing element so we can re-insert in the new order.
				for (let i = 0; i < this.length; i++) {
					if (this[i] && this[i].__jq_$el) {
						this[i].__jq_$el.detach();
					}
				}

				let previousElement = this.$this;
				for (let i = 0; i < this.length; i++) {
					const item = this[i];
					if (!item) continue;

					let $el = item.__jq_$el;
					if (!$el || !$el.length) {
						// New item: render fresh.
						$el = this.__renderItem(i, item);
						this.__put($el, item, this);
					}
					this.__refreshIndexAttr(i, item);

					if (previousElement && previousElement.length) {
						previousElement.after($el);
					} else {
						this.$this.after($el);
					}
					previousElement = $el;
				}
			}

			pop() {
				return this.splice(-1, 1)[0];
			}

			// Detach every rendered element and re-insert it in current array order,
			// refreshing index attributes. Reuses the existing elements rather than
			// re-rendering, so element identity is preserved and nothing leaks.
			__syncDomOrder() {
				for (let i = 0; i < this.length; i++) {
					if (this[i] && this[i].__jq_$el) {
						this[i].__jq_$el.detach();
					}
				}

				let previousElement = this.$this;
				for (let i = 0; i < this.length; i++) {
					const item = this[i];
					if (item && item.__jq_$el) {
						this.__refreshIndexAttr(i, item);
						if (previousElement && previousElement.length) {
							previousElement.after(item.__jq_$el);
						} else {
							this.$this.after(item.__jq_$el);
						}
						previousElement = item.__jq_$el;
					}
				}
				return this;
			}

			reverse() {
				if (this.__jqOrderBy) {
					console.warn(`jq-repeat: Calling 'reverse()' on a list with 'jr-order-by' defined. This operation might not yield the expected stable sorted order.`);
				}

				super.reverse();
				return this.__syncDomOrder();
			}

			sort(compareFn) {
				if (this.__jqOrderBy) {
					console.warn(`jq-repeat: Calling 'sort()' on a list with 'jr-order-by' defined. Later inserts will still follow 'jr-order-by', not this sort.`);
				}

				Array.prototype.sort.call(this, compareFn);
				return this.__syncDomOrder();
			}

			// fill() and copyWithin() would duplicate item references across
			// indices, which cannot be mapped to per-item DOM elements. Refuse
			// them instead of silently desyncing the DOM.
			fill() {
				console.warn(`jq-repeat: 'fill()' is not supported on scope '${this.__jqRepeatId}'. Use splice()/update()/replace() instead. No changes made.`);
				return this;
			}

			copyWithin() {
				console.warn(`jq-repeat: 'copyWithin()' is not supported on scope '${this.__jqRepeatId}'. Use splice()/update()/replace() instead. No changes made.`);
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
				if (args.length === 0) return this.length;
				if (!this.__jqOrderBy) {
					this.splice(0, 0, ...args);
					return this.length;
				}
				// In a sorted list "unshift" has no positional meaning; insert in
				// sorted order just like push would.
				this.__sortedBatchAdd(args);
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
					if (!this[i] || !this[i].hasOwnProperty(searchKey)) continue;
					const candidate = this[i][searchKey];
					if (candidate === searchValue) {
						return i;
					}
					// DOM attributes stringify values, so a numeric index key must
					// still match its attribute form (5 vs "5") when looked up via
					// the jq-repeat-index attribute (scopeItem() and friends).
					if ((typeof candidate === 'number' || typeof candidate === 'string') &&
						(typeof searchValue === 'number' || typeof searchValue === 'string') &&
						String(candidate) === String(searchValue)) {
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

			    // Snapshot the item by reference at call time and key the throttled
			    // update by that reference. This way an update can't accidentally land
			    // on the wrong item if a previous (now-applied) update reordered the
			    // list, and a pending update for a removed item can be cancelled.
			    const item = this[index];
			    const boundUpdateDom = this.__updateDom.bind(this);

			    // Merge successive partial updates so nothing is lost inside the
			    // throttle window (instead of "last write wins").
			    const mergeFn = (prev, next) => [prev[0], $.extend(true, {}, prev[1], next[1])];

			    throttle(item, this.__jqUpdateDelay, boundUpdateDom, mergeFn, item, data);
			    return item;
			}

			__updateDom(item, data){
				// Re-resolve the item's current index. It may have moved (sorted list)
				// or been removed entirely since the update was scheduled.
				const index = this.indexOf(item);
				if (index === -1) {
					// The item is no longer in the list (removed/destroyed). Nothing
					// to render; a pending update for it was also cancelled on removal.
					return null;
				}

				if (!item.__jq_$el) {
					console.warn(`jq-repeat: Item at index ${index} exists, but its DOM element reference (__jq_$el) is null or missing for scope '${this.__jqRepeatId}'.`);
					return null;
				}

				const originalItemData = $.extend(true, {}, item);
				const originalDOMEl = item.__jq_$el;

				// Clean up nested repeats before updating (the parent element is about
				// to be re-rendered, which re-injects fresh nested templates).
				cleanupNestedRepeats(item);

				// Merge new data into the existing item
				$.extend(true, item, data);

				let renderIndex = index;

				// If the sort key changed, reposition the item. This is a *move*,
				// not a removal: the existing element is detached and re-inserted
				// (no take/put hooks fire), and the content refresh below goes
				// through putUpdate like any other update.
				if (this.__jqOrderBy && this.__compareItems(originalItemData, item) !== 0) {
					super.splice(index, 1);
					renderIndex = this.__findInsertionIndex(item);
					super.splice(renderIndex, 0, item);

					if (originalDOMEl && originalDOMEl.length) {
						originalDOMEl.detach();
						let previousElement = this.$this;
						if (renderIndex > 0 && this[renderIndex - 1] && this[renderIndex - 1].__jq_$el) {
							previousElement = this[renderIndex - 1].__jq_$el;
						}
						previousElement.after(originalDOMEl);
					}

					// Re-index elements after the move
					for (let i = 0; i < this.length; i++) {
						this.__refreshIndexAttr(i, this[i]);
					}
				}

				// In-place content refresh
				const renderData = this.__buildData(renderIndex, item);
				const $render = $(Mustache.render(this.__jqTemplate, renderData));

				$render.attr('jq-repeat-scope', this.__jqRepeatId);
				if (this.__jqIndexKey && item.hasOwnProperty(this.__jqIndexKey)) {
					$render.attr('jq-repeat-index', item[this.__jqIndexKey]);
				} else {
					$render.attr('jq-repeat-index', renderIndex);
				}
				$render.addClass(`jq-repeat-${this.__jqBaseId}`);

				this.__putUpdate(originalDOMEl, $render, item, this);

				item.__jq_$el = $render;
				this.__onUpdate($render, item, this);
				return $render;
			}

			/**
			 * Syncs the list to `newItems`. With an index key, existing items whose
			 * key matches are updated in place (merged), items missing from
			 * `newItems` are removed, and new keys are added; without one, items
			 * are matched by position. DOM order follows `newItems` unless the
			 * scope has `jr-order-by`, which keeps precedence.
			 */
			replace(newItems) {
				if (!Array.isArray(newItems)) {
					console.error(`jq-repeat: replace() expects an array for scope '${this.__jqRepeatId}'.`, newItems);
					return this;
				}

				const key = this.__jqIndexKey;
				if (key) {
					const newKeys = new Set();
					for (const newItem of newItems) {
						if (newItem && Object.prototype.hasOwnProperty.call(newItem, key)) {
							newKeys.add(String(newItem[key]));
						}
					}

					// Remove items whose key is gone (backwards, so indices hold).
					for (let i = this.length - 1; i >= 0; i--) {
						const existing = this[i];
						if (!existing || !Object.prototype.hasOwnProperty.call(existing, key) || !newKeys.has(String(existing[key]))) {
							this.splice(i, 1);
						}
					}

					for (const newItem of newItems) {
						const idx = (newItem && Object.prototype.hasOwnProperty.call(newItem, key))
							? this.indexOf(key, newItem[key])
							: -1;
						if (idx === -1) {
							this.push(newItem);
						} else {
							// Apply synchronously; a pending throttled update would
							// otherwise re-apply stale data on top of this.
							cancelThrottle(this[idx]);
							this.__updateDom(this[idx], newItem);
						}
					}

					// Without jr-order-by, mirror the order of newItems in the DOM.
					if (!this.__jqOrderBy) {
						const ordered = [];
						for (const newItem of newItems) {
							if (!newItem || !Object.prototype.hasOwnProperty.call(newItem, key)) continue;
							const item = this.getByKey(key, newItem[key]);
							if (item && !ordered.includes(item)) {
								ordered.push(item);
							}
						}
						if (ordered.length === this.length) {
							super.splice(0, this.length, ...ordered);
							this.__syncDomOrder();
						}
					}
				} else {
					const common = Math.min(this.length, newItems.length);
					for (let i = 0; i < common; i++) {
						cancelThrottle(this[i]);
						this.__updateDom(this[i], newItems[i]);
					}
					if (this.length > newItems.length) {
						this.splice(newItems.length, this.length - newItems.length);
					} else if (newItems.length > this.length) {
						this.push(...newItems.slice(common));
					}
				}

				return this;
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

			// Called after an item's DOM has been updated (data-level hook; fires
			// for both in-place updates and sorted repositioning).
			__onUpdate($el, item, list) {}

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
				const templates = [];

				// The nested template's parent must point back at THIS item, so tag it
				// with this item's index (or custom index-key value) — not the parent
				// list's own parent index.
				const parentIndexAttr = (this.__jqIndexKey && data && data.hasOwnProperty(this.__jqIndexKey))
					? data[this.__jqIndexKey]
					: index;

				for (let idx = 0; idx < this.__nestedTemplateCache.length; idx++) {
					const $el = this.__nestedTemplateCache[idx].clone();

					$el.attr('jq-repeat-parent', this.__jqRepeatId);
					$el.attr('jq-repeat-parent-index', parentIndexAttr);
					templates[idx] = $el[0].outerHTML;
				}
				return templates;
			}

			// Tear down this scope: remove all items (cascading nested cleanup and
			// cancellation of any pending throttled updates), drop the placeholder
			// element, detach from the parent's nested map, and unregister the scope.
			destroy() {
				this.empty();

				if (this._parentData && this._parentData.__jqNested) {
					for (const baseName of Object.keys(this._parentData.__jqNested)) {
						if (this._parentData.__jqNested[baseName] === this) {
							delete this._parentData.__jqNested[baseName];
						}
					}
				}

				if (this.$this && this.$this.length) {
					this.$this.remove();
				}

				delete _scope[this.__jqRepeatId];
				return this;
			}
		}

		var make = function(element) {
			const $this = $(element);

			const baseScopeId = $this.attr('jq-repeat');
			if (!baseScopeId) {
				console.error("jq-repeat: Element missing 'jq-repeat' attribute:", element);
				return undefined;
			}

			const options = {};
			$.each($this[0].attributes, function() {
				if (this.name.startsWith("jq-") || this.name.startsWith("jr-")) {
					const optionName = this.name.replace(/^(jq-|jr-)/, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
					options[optionName] = this.value;
				}
			});

			let parentData = null;
			let parentId = null;
			let parentIndex = null;
			const hasParent = !!$this.attr('jq-repeat-parent');
			if (hasParent) {
				parentId = $this.attr('jq-repeat-parent');
				const parentElement = $this.parent().closest(`[jq-repeat-scope="${parentId}"]`);
				if (parentElement.length) {
					parentIndex = parentElement.attr('jq-repeat-index');
					if (Object.prototype.hasOwnProperty.call(_scope, parentId) && _scope[parentId]) {
						const parentList = _scope[parentId];
						if (parentList.__jqIndexKey) {
							parentData = parentList.getByKey(parentList.__jqIndexKey, parentIndex);
						} else if (!isNaN(Number(parentIndex))) {
							parentData = parentList[Number(parentIndex)];
						}
					}
					if (!parentData) {
						console.warn(`jq-repeat: Parent item for nested scope not found (parent='${parentId}', index='${parentIndex}').`);
					}
				} else {
					console.warn(`jq-repeat: Could not find parent element for scope '${parentId}'.`);
				}
			}

			// Top-level scopes keep the bare name as their id (so `$.scope.foo` and
			// `$.scope[uniqueId]` line up); nested scopes get a unique derived id so
			// multiple parent instances don't clobber one global slot.
			let scopeId = baseScopeId;
			if (hasParent) {
				scopeId = baseScopeId + '__' + (nextNestedId++);
			}

			const nestedTemplates = [];
			$this.find('[jq-repeat]').each((idx, el) => {
				let templateIdx = nestedTemplates.length;
				let template = `${el.outerHTML}`;
				nestedTemplates.push(template);
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
				nestedTemplates,
				baseScopeId
			);

			// If a scope with this id was already initialized (e.g. a top-level
			// template re-added to the DOM), tear the old one down before replacing it
			// so its DOM and nested scopes don't leak.
			const existing = _scope[scopeId];
			if (existing && existing instanceof RepeatList && existing !== repeatListInstance) {
				existing.destroy();
			}

			// Preserve pre-existing data pushed before the template existed (only
			// meaningful for top-level scopes, which share id and base name).
			let tempPreExistingData;
			if (hasParent) {
				tempPreExistingData = [];
			} else {
				tempPreExistingData = _scope[baseScopeId] || [];
			}

			_scope[scopeId] = repeatListInstance;

			// Register on the parent item and auto-populate from the parent's data
			// array (keyed by the nested scope's base name).
			if (hasParent && parentData) {
				if (!Object.prototype.hasOwnProperty.call(parentData, '__jqNested')) {
					Object.defineProperty(parentData, '__jqNested', {
						value: {},
						writable: true,
						enumerable: false,
						configurable: true,
					});
				}
				parentData.__jqNested[baseScopeId] = repeatListInstance;

				if (Array.isArray(parentData[baseScopeId])) {
					repeatListInstance.push(...parentData[baseScopeId]);
				}
			}

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

			return repeatListInstance;
		};

		// --- jQuery Plugin Methods ---

		$.fn.scopeGetEl = function() {
			return this.closest('[jq-repeat-scope]');
		};

		$.fn.scopeGet = function() {
			let $el = this.scopeGetEl();
			if ($el && $el.attr('jq-repeat-scope')) {
				const list = _scope[$el.attr('jq-repeat-scope')];
				if (list && list.__jqRepeatId) {
					return list;
				}
			}
			return undefined;
		};

			$.fn.scopeItem = function() {
			let $el = this.scopeGetEl();
			if ($el) {
				const scopeId = $el.attr('jq-repeat-scope');
				const indexOrId = $el.attr('jq-repeat-index');
				const scopeInstance = _scope[scopeId];

				if (scopeInstance && scopeInstance.__jqRepeatId) {
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
				const scopeInstance = _scope[scopeId];

				if (scopeInstance && scopeInstance.__jqRepeatId) {
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
				const scopeInstance = _scope[scopeId];

				if (scopeInstance && scopeInstance.__jqRepeatId) {
					if (scopeInstance.__jqIndexKey) {
						scopeInstance.remove(indexOrId);
					} else {
						scopeInstance.remove(Number(indexOrId));
					}
				}
			}
		};

		$.fn.scopeDestroy = function() {
			const list = this.scopeGet();
			if (list && typeof list.destroy === 'function') {
				list.destroy();
			}
			return this;
		};

		// --- Global namespace: lifecycle control for SPA teardown ---

		let observer = null;

		$.jqRepeat = {
			// Tear down every registered scope (DOM elements, nested scopes,
			// pending throttled updates) and clear pre-populated data arrays.
			destroyAll() {
				for (const key of Object.keys(_scope)) {
					const list = _scope[key];
					if (list instanceof RepeatList) {
						list.destroy();
					} else if (Object.prototype.hasOwnProperty.call(_scope, key)) {
						delete _scope[key];
					}
				}
			},

			// Stop watching the DOM for new [jq-repeat] templates. Existing
			// scopes keep working; new templates added after stop() are ignored
			// until start() is called.
			stop() {
				if (observer) {
					observer.disconnect();
				}
			},

			// Resume watching the DOM after stop().
			start() {
				if (observer && document.body) {
					observer.observe(document.body, {
						childList: true,
						subtree: true
					});
				}
			},
		};

		// --- Document Ready and MutationObserver for Auto-Initialization ---

		// A `[jq-repeat]` element that lives inside another `[jq-repeat]` template
		// is extracted into that parent's nested templates during the parent's
		// `make()`, so it must not be initialized independently here. Only process
		// "standalone" repeats — those with no `[jq-repeat]` ancestor.
		function isStandaloneRepeat(el) {
			return !$(el).parent().closest('[jq-repeat]').length;
		}

		$(document).ready(function() {
			observer = new MutationObserver(function(mutationsList) {
				const candidates = [];
				for (const mutation of mutationsList) {
					if (mutation.type !== 'childList') continue;
					for (const node of mutation.addedNodes) {
						if (node.nodeType !== Node.ELEMENT_NODE) continue;
						if (node.hasAttribute('jq-repeat')) {
							candidates.push(node);
						} else {
							const found = node.querySelectorAll('[jq-repeat]');
							for (const f of found) candidates.push(f);
						}
					}
				}
				if (!candidates.length) return;

				const seen = new Set();
				for (const el of candidates) {
					if (seen.has(el)) continue;
					seen.add(el);
					if (!isStandaloneRepeat(el)) continue;
					const list = make(el);
					if (list) _scope.onNew.call(list);
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true
			});

			// Initialize any jq-repeat elements already present in the DOM on load.
			// Snapshot the standalone ones first so make()'s DOM mutations don't
			// change which elements look standalone mid-loop.
			const initial = $('[jq-repeat]').get().filter(el => {
				return $(el).closest('body').length !== 0 && isStandaloneRepeat(el);
			});
			for (const el of initial) {
				const list = make(el);
				if (list) _scope.onNew.call(list);
			}
		});

	})(jQuery, Mustache);

})();
