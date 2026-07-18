import './setup.js';
import { expect } from 'chai';
import { cleanupScopes } from './setup.js';
import '../src/jq-repeat.js';

const tick = ms => new Promise(r => setTimeout(r, ms));

describe('2.2 fixes: splice lookup safety', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('splice(objectNotInList) is a no-op instead of removing the last item', async function () {
    $('<div jq-repeat="spliceSafe">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.spliceSafe.push({ t: 'a' }, { t: 'b' }, { t: 'c' });
    await tick(50);

    const result = $.scope.spliceSafe.splice({ t: 'not-in-list' });

    expect(result).to.deep.equal([]);
    expect($.scope.spliceSafe.length).to.equal(3);
    expect($('.jq-repeat-spliceSafe').length).to.equal(3);
  });

  it('splice(missingKey) with an index key is a no-op', async function () {
    $('<div jq-repeat="spliceKey" jq-index-key="id">{{ id }}</div>').appendTo('body');
    await tick(50);
    $.scope.spliceKey.push({ id: 'x' }, { id: 'y' });
    await tick(50);

    const result = $.scope.spliceKey.splice('nope');

    expect(result).to.deep.equal([]);
    expect($.scope.spliceKey.length).to.equal(2);
  });

  it('splice(missingString) without an index key is a no-op', async function () {
    $('<div jq-repeat="spliceStr">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.spliceStr.push({ t: 'x' }, { t: 'y' });
    await tick(50);

    const result = $.scope.spliceStr.splice('nope');

    expect(result).to.deep.equal([]);
    expect($.scope.spliceStr.length).to.equal(2);
  });

  it('pop() still works on lookups that resolve', async function () {
    $('<div jq-repeat="popStill">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.popStill.push({ t: 'x' }, { t: 'y' });
    await tick(50);

    const popped = $.scope.popStill.pop();

    expect(popped.t).to.equal('y');
    expect($.scope.popStill.length).to.equal(1);
  });
});

describe('2.2 fixes: sort() and unsupported mutators', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('sort() reorders the DOM to match the array', async function () {
    $('<div jq-repeat="sortSync">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.sortSync.push({ t: 'b' }, { t: 'a' }, { t: 'c' });
    await tick(50);

    $.scope.sortSync.sort((x, y) => x.t.localeCompare(y.t));

    const domOrder = $('.jq-repeat-sortSync').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('a,b,c');

    // Index attributes must be refreshed too
    const attrs = $('.jq-repeat-sortSync').map((i, e) => $(e).attr('jq-repeat-index')).get();
    expect(attrs).to.deep.equal(['0', '1', '2']);
  });

  it('fill() and copyWithin() refuse and leave data + DOM untouched', async function () {
    $('<div jq-repeat="noFill">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.noFill.push({ t: 'a' }, { t: 'b' });
    await tick(50);

    $.scope.noFill.fill({ t: 'z' });
    $.scope.noFill.copyWithin(0, 1);

    expect($.scope.noFill[0].t).to.equal('a');
    expect($.scope.noFill[1].t).to.equal('b');
    const domOrder = $('.jq-repeat-noFill').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('a,b');
  });
});

describe('2.2 fixes: numeric custom index keys', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('scopeItem(), scopeItemUpdate() and scopeItemRemove() work with numeric ids', async function () {
    $('<div jq-repeat="numKey" jq-index-key="id">{{ name }}</div>').appendTo('body');
    await tick(50);
    $.scope.numKey.push({ id: 5, name: 'five' }, { id: 7, name: 'seven' });
    await tick(50);

    const item = $('.jq-repeat-numKey').first().scopeItem();
    expect(item).to.exist;
    expect(item.name).to.equal('five');

    $('.jq-repeat-numKey').first().scopeItemUpdate({ name: 'FIVE' });
    await tick(100);
    expect($.scope.numKey.getByKey('id', 5).name).to.equal('FIVE');

    $('.jq-repeat-numKey').last().scopeItemRemove();
    await tick(50);
    expect($.scope.numKey.length).to.equal(1);
    expect($('.jq-repeat-numKey').length).to.equal(1);
  });

  it('indexOf coerces number/string but never objects', async function () {
    $('<div jq-repeat="coerce" jq-index-key="id">{{ id }}</div>').appendTo('body');
    await tick(50);
    $.scope.coerce.push({ id: 5 });
    await tick(50);

    expect($.scope.coerce.indexOf('id', '5')).to.equal(0);
    expect($.scope.coerce.indexOf('id', 5)).to.equal(0);
    expect($.scope.coerce.indexOf('id', {})).to.equal(-1);
  });
});

describe('2.2: update timing and hooks', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('applies the first update in a burst immediately (next microtask)', async function () {
    $('<div jq-repeat="fastUpd">{{ v }}</div>').appendTo('body');
    await tick(50);
    $.scope.fastUpd.push({ v: 'old' });
    await tick(50);

    $.scope.fastUpd.update(0, { v: 'new' });
    await tick(0); // well under the 50ms coalescing window

    expect($('.jq-repeat-fastUpd').text()).to.equal('new');
  });

  it('honors the jr-update-delay attribute', async function () {
    $('<div jq-repeat="slowUpd" jr-update-delay="200">{{ v }}</div>').appendTo('body');
    await tick(50);

    expect($.scope.slowUpd.__jqUpdateDelay).to.equal(200);

    $.scope.slowUpd.push({ v: 0 });
    await tick(50);

    $.scope.slowUpd.update(0, { v: 1 });
    await tick(0);
    $.scope.slowUpd.update(0, { v: 2 }); // inside the 200ms window

    await tick(100); // window still open: trailing update not applied yet
    expect($('.jq-repeat-slowUpd').text()).to.equal('1');

    await tick(150); // window closed
    expect($('.jq-repeat-slowUpd').text()).to.equal('2');
  });

  it('fires the onUpdate hook after an item updates', async function () {
    $('<div jq-repeat="onUpd">{{ v }}</div>').appendTo('body');
    await tick(50);
    $.scope.onUpd.push({ v: 'a' });
    await tick(50);

    let seen = null;
    $.scope.onUpd.onUpdate = function ($el, item, list) {
      seen = { text: $el.text(), item, list };
    };

    $.scope.onUpd.update(0, { v: 'b' });
    await tick(100);

    expect(seen).to.exist;
    expect(seen.text).to.equal('b');
    expect(seen.item.v).to.equal('b');
    expect(seen.list).to.equal($.scope.onUpd);
  });

  it('does not fire take/put hooks when a sorted update repositions an item', async function () {
    $('<div jq-repeat="moveHooks" jr-order-by="v">{{ id }}</div>').appendTo('body');
    await tick(50);
    $.scope.moveHooks.push({ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'c', v: 3 });
    await tick(50);

    let takeCalls = 0;
    let putCalls = 0;
    let putUpdateCalls = 0;
    $.scope.moveHooks.take = function ($el, item, list) { takeCalls++; $el.remove(); if (item) item.__jq_$el = null; };
    $.scope.moveHooks.put = function ($el) { putCalls++; $el.show(); };
    $.scope.moveHooks.putUpdate = function ($el, $render) { putUpdateCalls++; $render.show(); $el.replaceWith($render); };

    $.scope.moveHooks.update(0, { v: 100 }); // moves 'a' to the end
    await tick(100);

    expect(takeCalls).to.equal(0);
    expect(putCalls).to.equal(0);
    expect(putUpdateCalls).to.equal(1);

    const domOrder = $('.jq-repeat-moveHooks').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('b,c,a');
  });
});

describe('2.2: replace()', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('diffs by index key: updates, removes, adds, and mirrors new order', async function () {
    $('<div jq-repeat="repKey" jq-index-key="id">{{ id }}:{{ name }}</div>').appendTo('body');
    await tick(50);
    $.scope.repKey.push(
      { id: 1, name: 'one' },
      { id: 2, name: 'two' },
      { id: 3, name: 'three' }
    );
    await tick(50);

    const survivorEl = $.scope.repKey.getByKey('id', 2).__jq_$el;

    $.scope.repKey.replace([
      { id: 3, name: 'THREE' },
      { id: 2, name: 'two' },
      { id: 4, name: 'four' },
    ]);
    await tick(50);

    expect($.scope.repKey.length).to.equal(3);
    expect($.scope.repKey.getByKey('id', 1)).to.be.undefined;
    expect($.scope.repKey.getByKey('id', 3).name).to.equal('THREE');
    expect($.scope.repKey.getByKey('id', 4).name).to.equal('four');

    const domOrder = $('.jq-repeat-repKey').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('3:THREE,2:two,4:four');
    expect($('.jq-repeat-repKey').length).to.equal(3);
  });

  it('matches by position when there is no index key', async function () {
    $('<div jq-repeat="repPos">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.repPos.push({ t: 'a' }, { t: 'b' }, { t: 'c' });
    await tick(50);

    $.scope.repPos.replace([{ t: 'x' }, { t: 'y' }]);
    await tick(50);

    expect($.scope.repPos.length).to.equal(2);
    const domOrder = $('.jq-repeat-repPos').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('x,y');
  });

  it('keeps jr-order-by precedence over the new array order', async function () {
    $('<div jq-repeat="repSort" jq-index-key="id" jr-order-by="v">{{ id }}</div>').appendTo('body');
    await tick(50);
    $.scope.repSort.push({ id: 'a', v: 1 }, { id: 'b', v: 2 });
    await tick(50);

    $.scope.repSort.replace([
      { id: 'c', v: 0 },
      { id: 'a', v: 3 },
    ]);
    await tick(50);

    const domOrder = $('.jq-repeat-repSort').map((i, e) => $(e).text()).get().join(',');
    expect(domOrder).to.equal('c,a');
    expect($.scope.repSort.getByKey('id', 'b')).to.be.undefined;
  });

  it('rejects non-array input without changing anything', async function () {
    $('<div jq-repeat="repBad">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.repBad.push({ t: 'a' });
    await tick(50);

    $.scope.repBad.replace('not an array');

    expect($.scope.repBad.length).to.equal(1);
  });
});

describe('2.2: $.jqRepeat lifecycle', function () {
  beforeEach(function () {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  afterEach(function () {
    // Never leave the observer stopped for other test files.
    $.jqRepeat.start();
  });

  it('destroyAll() tears down every scope and its DOM', async function () {
    $('<div jq-repeat="lifeA">{{ t }}</div>').appendTo('body');
    $('<div jq-repeat="lifeB">{{ t }}</div>').appendTo('body');
    await tick(50);
    $.scope.lifeA.push({ t: '1' });
    $.scope.lifeB.push({ t: '2' });
    await tick(50);

    $.jqRepeat.destroyAll();

    expect($.scope.has('lifeA')).to.be.false;
    expect($.scope.has('lifeB')).to.be.false;
    expect($('.jq-repeat-lifeA').length).to.equal(0);
    expect($('.jq-repeat-lifeB').length).to.equal(0);
    expect($('#jq-repeat-holder-lifeA').length).to.equal(0);
  });

  it('stop() halts template auto-initialization; start() resumes it', async function () {
    $.jqRepeat.stop();

    $('<div jq-repeat="whileStopped">{{ t }}</div>').appendTo('body');
    await tick(100);
    expect($.scope.has('whileStopped')).to.be.false;

    $.jqRepeat.start();

    $('<div jq-repeat="afterStart">{{ t }}</div>').appendTo('body');
    await tick(100);
    expect($.scope.has('afterStart')).to.be.true;
  });
});
