// Type definitions for jq-repeat
// Project: https://github.com/wmantly/jq-repeat
// Definitions: https://github.com/wmantly/jq-repeat/blob/master/types/jq-repeat.d.ts

/// <reference types="jquery" />

declare namespace JQRepeat {
	/** Hook fired with an item's element: `put`, `take`, `onUpdate`. */
	type Hook<T extends object> = ($el: JQuery, item: T, list: RepeatList<T>) => void;

	/** Hook fired when an item re-renders: `putUpdate`. */
	type UpdateHook<T extends object> = (
		$oldEl: JQuery,
		$newEl: JQuery,
		item: T,
		list: RepeatList<T>
	) => void;

	/** Per-key transform applied to a copy of the data before each render. */
	type ParseFn = (value: any, key: string, data: Record<string, any>) => any;

	interface CallbackQueue<F extends (...args: any[]) => void = (...args: any[]) => void> {
		push(callback: F): void;
		call(...args: Parameters<F>): void;
	}

	/**
	 * A jq-repeat scope: an Array subclass whose mutations are mirrored in the
	 * DOM. Obtain one via `$.scope.<name>` or `$(el).scopeGet()`.
	 */
	interface RepeatList<T extends object = Record<string, any>> extends Array<T> {
		/** `jq-`/`jr-` attribute options captured at init, camelCased. */
		options: Record<string, string>;

		/** Per-key data transforms applied before each render. */
		parseKeys: Record<string, ParseFn>;

		/** Called when an item's element is added. Default: `$el.show()`. */
		put: Hook<T>;

		/**
		 * Called when an item's element is removed. Not called when a sorted
		 * update merely repositions an item (moves go through `putUpdate`).
		 * Default: `$el.remove()`.
		 */
		take: Hook<T>;

		/**
		 * Called to swap the re-rendered element in on update.
		 * Default: `$oldEl.replaceWith($newEl)`.
		 */
		putUpdate: UpdateHook<T>;

		/**
		 * Data-level hook fired after an item's DOM has been updated (both
		 * in-place updates and sorted repositions). Default: no-op.
		 */
		onUpdate: Hook<T>;

		push(...items: T[]): number;
		unshift(...items: T[]): number;
		pop(): T | undefined;
		shift(): T | undefined;

		/**
		 * Remove/insert items. `target` may be a numeric index, an index-key
		 * value (when `jq-index-key` is set), or an item reference. A lookup
		 * that finds nothing is a no-op returning `[]`.
		 */
		splice(target: number | string | T, deleteCount?: number, ...items: T[]): T[];

		/**
		 * Find an item's index by index-key value, `(key, value)` pair, item
		 * reference, or numeric index. Number and string key values match
		 * interchangeably (`5` matches `'5'`).
		 */
		indexOf(keyOrValue: string | number | T, valueToMatch?: any): number;

		/** `this[this.indexOf(...)]` — see {@link indexOf}. */
		getByKey(keyOrValue: string | number | T, valueToMatch?: any): T | undefined;

		/** Remove one item found via {@link indexOf}. Not-found is a no-op. */
		remove(keyOrValue: string | number | T, value?: any): void;

		/**
		 * Deep-merge `data` into an item and re-render it. The first update in
		 * a burst renders on the next microtask; later updates for the same
		 * item within the coalescing window (`jr-update-delay`, default 50ms)
		 * merge into one trailing render. Returns the targeted item, or null
		 * if no target was found.
		 */
		update(data: Partial<T>): T | null;
		update(index: number, data: Partial<T>): T | null;
		update(indexKeyValue: string, data: Partial<T>): T | null;
		update(key: string, value: string | number, data: Partial<T>): T | null;

		/**
		 * Sync the whole list to `newItems`. With `jq-index-key`, diffs by key
		 * (update in place / remove / add) and mirrors the new order unless
		 * `jr-order-by` takes precedence; without one, matches by position.
		 */
		replace(newItems: T[]): this;

		/** Remove every item (and its DOM). Returns the removed items. */
		empty(): T[];

		/** Sort the items and re-order the DOM to match. */
		sort(compareFn?: (a: T, b: T) => number): this;

		/** Reverse the items and re-order the DOM to match. */
		reverse(): this;

		/** Unsupported on a jq-repeat list: warns and makes no changes. */
		fill(...args: any[]): this;

		/** Unsupported on a jq-repeat list: warns and makes no changes. */
		copyWithin(...args: any[]): this;

		/**
		 * Tear down this scope: remove all items and nested scopes, cancel
		 * pending updates, remove the placeholder, and unregister the scope.
		 */
		destroy(): this;
	}

	type Scope = {
		/** True once a scope with this name has initialized. Never creates. */
		has(name: string): boolean;

		/** Callback queue invoked with each newly created scope. */
		onNew: CallbackQueue<(list: RepeatList<any>) => void>;
	} & {
		[scopeName: string]: RepeatList<any>;
	};

	interface Global {
		/** Tear down every registered scope and clear pre-populated arrays. */
		destroyAll(): void;

		/** Stop watching the DOM for new `[jq-repeat]` templates. */
		stop(): void;

		/** Resume watching the DOM after `stop()`. */
		start(): void;
	}
}

interface JQueryStatic {
	scope: JQRepeat.Scope;
	jqRepeat: JQRepeat.Global;
}

interface JQuery<TElement = HTMLElement> {
	/** The RepeatList owning the closest rendered jq-repeat element. */
	scopeGet(): JQRepeat.RepeatList<any> | undefined;

	/** The closest element carrying a `jq-repeat-scope` attribute. */
	scopeGetEl(): JQuery;

	/** The data item backing the closest rendered jq-repeat element. */
	scopeItem<T extends object = Record<string, any>>(): T | undefined;

	/** Update the data item backing the closest rendered element. */
	scopeItemUpdate(data: Record<string, any>): void;

	/** Remove the item backing the closest rendered element. */
	scopeItemRemove(): void;

	/** Destroy the scope owning the closest rendered element. */
	scopeDestroy(): this;
}
