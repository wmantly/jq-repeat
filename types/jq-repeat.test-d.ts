// Compile-only exercises for jq-repeat.d.ts (checked by `npm run test:types`).
// Not executed at runtime.

interface Todo {
	item: string;
	done: string;
	priority?: number;
}

// --- $.scope access ---

const todos = $.scope.toDo as JQRepeat.RepeatList<Todo>;
const anyScope: JQRepeat.RepeatList = $.scope.whatever;
const exists: boolean = $.scope.has('toDo');

$.scope.onNew.push((list) => {
	const n: number = list.length;
});

// --- Array methods ---

const len: number = todos.push({ item: 'a', done: 'No' }, { item: 'b', done: 'No' });
todos.unshift({ item: 'first', done: 'No' });
const popped: Todo | undefined = todos.pop();
const shifted: Todo | undefined = todos.shift();

const removedByIndex: Todo[] = todos.splice(0, 1);
const removedByKey: Todo[] = todos.splice('someKey', 1);
todos.splice(1, 0, { item: 'inserted', done: 'No' });

const i1: number = todos.indexOf('someKey');
const i2: number = todos.indexOf('item', 'a');
const i3: number = todos.indexOf(5);
const byKey: Todo | undefined = todos.getByKey('item', 'a');

todos.remove('someKey');
todos.remove('item', 'a');

const emptied: Todo[] = todos.empty();

// --- update overloads ---

const u1: Todo | null = todos.update({ done: 'Yes' });
const u2: Todo | null = todos.update(0, { done: 'Yes' });
const u3: Todo | null = todos.update('someKey', { done: 'Yes' });
const u4: Todo | null = todos.update('item', 'a', { done: 'Yes' });

// --- replace / sort / reverse / destroy ---

todos.replace([{ item: 'x', done: 'No' }]);
todos.sort((a, b) => a.item.localeCompare(b.item)).reverse();
todos.fill({ item: 'z', done: 'No' }); // warns, no-op
todos.copyWithin(0, 1); // warns, no-op
todos.destroy();

// --- hooks ---

todos.put = ($el, item, list) => {
	$el.fadeIn(300);
	const s: string = item.item;
	const l: number = list.length;
};
todos.take = ($el) => $el.fadeOut(300, function () { $(this).remove(); });
todos.putUpdate = ($oldEl, $newEl) => { $oldEl.replaceWith($newEl); };
todos.onUpdate = ($el, item) => { console.log(item.done); };
todos.parseKeys.priority = (value, key, data) => Number(value);

// --- jQuery helpers ---

const list2: JQRepeat.RepeatList | undefined = $('.jq-repeat-toDo').scopeGet();
const el: JQuery = $('.jq-repeat-toDo').scopeGetEl();
const item2: Todo | undefined = $('.jq-repeat-toDo').scopeItem<Todo>();
$('.jq-repeat-toDo').scopeItemUpdate({ done: 'Yes' });
$('.jq-repeat-toDo').scopeItemRemove();
$('.jq-repeat-toDo').scopeDestroy();

// --- $.jqRepeat lifecycle ---

$.jqRepeat.stop();
$.jqRepeat.start();
$.jqRepeat.destroyAll();
