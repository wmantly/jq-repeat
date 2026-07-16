import './setup.js';
import { expect } from 'chai';
import { cleanupScopes } from './setup.js';
import '../src/jq-repeat.js';

describe('Bug fixes', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  // #1: a pending (trailing) throttled update must not crash when its item is
  // removed before the trailing call fires.
  it('does not crash when a trailing throttled update targets a removed item', function (done) {
    $('<div jq-repeat="r">{{ v }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.r.push({ v: 1 }, { v: 2 }, { v: 3 });
      setTimeout(() => {
        const originalError = console.error;
        let errored = false;
        console.error = (...a) => { errored = true; originalError.apply(console, a); };

        $.scope.r.update(2, { v: 'A' }); // executes on the trailing tick
        $.scope.r.update(2, { v: 'B' }); // coalesced into the trailing tick
        $.scope.r.splice(2, 1);          // remove the item before the tick fires

        setTimeout(() => {
          console.error = originalError;
          try {
            expect(errored).to.equal(false);
            expect($.scope.r.length).to.equal(2);
            expect($('.jq-repeat-r').length).to.equal(2);
            done();
          } catch (e) { done(e); }
        }, 150);
      }, 150);
    }, 100);
  });

  // #2: rapid partial updates within the throttle window must accumulate, not
  // collapse to "last write wins" (intermediate keys are lost).
  it('coalesces rapid partial updates without losing intermediate keys', function (done) {
    $('<div jq-repeat="r">{{ a }}/{{ b }}/{{ c }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.r.push({ a: 0, b: 0, c: 0 });
      setTimeout(() => {
        $.scope.r.update(0, { a: 1 });
        $.scope.r.update(0, { b: 2 });
        $.scope.r.update(0, { c: 3 });

        setTimeout(() => {
          try {
            const it = $.scope.r[0];
            expect(it.a).to.equal(1);
            expect(it.b).to.equal(2);
            expect(it.c).to.equal(3);
            done();
          } catch (e) { done(e); }
        }, 200);
      }, 150);
    }, 100);
  });

  // #3: two updates in the same tick must each target the item the caller
  // referred to, even when the first update reorders a sorted list.
  it('resolves update indices against the pre-mutation array on sorted lists', function (done) {
    $('<div jq-repeat="rec" jr-order-by="v">{{ id }}:{{ v }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.rec.push({ id: 'A', v: 1 }, { id: 'B', v: 2 }, { id: 'C', v: 3 });
      setTimeout(() => {
        // A was index 0, C was index 2. The first update moves A to the end;
        // the second must still update C (not whatever now sits at index 2).
        $.scope.rec.update(0, { v: 100 });
        $.scope.rec.update(2, { v: 0 });

        setTimeout(() => {
          try {
            const order = $.scope.rec.map(r => r.id).join(',');
            // Sorted ascending by v: C(0), B(2), A(100).
            expect(order).to.equal('C,B,A');
            expect($.scope.rec[0].id).to.equal('C');
            expect($.scope.rec[0].v).to.equal(0);
            expect($.scope.rec[2].id).to.equal('A');
            expect($.scope.rec[2].v).to.equal(100);
            done();
          } catch (e) { done(e); }
        }, 200);
      }, 150);
    }, 100);
  });

  // #4: reading a scope that does not exist must not pollute the scope registry.
  it('does not pollute $.scope on read and supports $.scope.has()', function () {
    const before = Object.keys($.scope).filter(k => k !== 'onNew').length;

    const x = $.scope.neverRegistered;   // pure read
    const y = $.scope.alsoNever;          // pure read

    const after = Object.keys($.scope).filter(k => k !== 'onNew').length;
    expect(after).to.equal(before);

    // The reads still returned array-like values.
    expect(Array.isArray(x)).to.equal(true);
    expect(Array.isArray(y)).to.equal(true);

    // has() reports truth without creating.
    expect($.scope.has('neverRegistered')).to.equal(false);
    expect($.scope.has('alsoNever')).to.equal(false);

    // A mutation registers it.
    $.scope.nowRegistered.push({ v: 1 });
    expect($.scope.has('nowRegistered')).to.equal(true);
  });

  // #6: batch sorted push of many items is correct (and a single DOM pass).
  it('batch-pushes many items into a sorted list in correct order', function (done) {
    $('<div jq-repeat="s" jr-order-by="v">{{ id }}:{{ v }}</div>').appendTo('body');

    setTimeout(() => {
      // Push 200 items in deliberately unsorted order in one call.
      const items = [];
      for (let i = 0; i < 200; i++) {
        items.push({ id: 'i' + i, v: (i * 37) % 200 });
      }
      $.scope.s.push(...items);

      setTimeout(() => {
        try {
          expect($.scope.s.length).to.equal(200);
          // Array must be sorted ascending by v.
          for (let i = 1; i < $.scope.s.length; i++) {
            expect($.scope.s[i].v).to.be.at.least($.scope.s[i - 1].v);
          }
          // DOM order must mirror the array order.
          const domTexts = $('.jq-repeat-s').map((i, el) => $(el).text()).get();
          expect(domTexts.length).to.equal(200);
          for (let i = 0; i < $.scope.s.length; i++) {
            expect(domTexts[i]).to.include($.scope.s[i].id);
          }
          // All rendered exactly once (no duplicates / leaks).
          expect($('.jq-repeat-s').length).to.equal(200);
          done();
        } catch (e) { done(e); }
      }, 200);
    }, 100);
  });

  // #7: reverse() on a sorted list must not leak or duplicate elements.
  it('reverse() on a sorted list reuses elements without leaking', function (done) {
    $('<div jq-repeat="r" jr-order-by="v">{{ id }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.r.push({ id: 'A', v: 1 }, { id: 'B', v: 2 }, { id: 'C', v: 3 });
      setTimeout(() => {
        const before = $.scope.r.length;
        $.scope.r.reverse();

        setTimeout(() => {
          try {
            // Same count, no duplicate/leaked nodes in the body.
            expect($('.jq-repeat-r').length).to.equal(before);
            expect($.scope.r.length).to.equal(before);
            // Items are reversed relative to the sorted order.
            expect($.scope.r.map(i => i.id).join(',')).to.equal('C,B,A');
            done();
          } catch (e) { done(e); }
        }, 100);
      }, 150);
    }, 100);
  });

  // #10: destroy() tears down the scope completely.
  it('destroy() removes DOM, scope registration, and nested scopes', function (done) {
    $('<div jq-repeat="top"><span>{{ v }}</span><span jq-repeat="kids">{{ k }}</span></div>').appendTo('body');

    setTimeout(() => {
      $.scope.top.push({ v: 'one', kids: [{ k: 'k1' }, { k: 'k2' }] });
      $.scope.top.push({ v: 'two', kids: [{ k: 'k3' }] });

      setTimeout(() => {
        try {
          expect($.scope.has('top')).to.equal(true);
          expect($('.jq-repeat-top').length).to.equal(2);
          expect($('.jq-repeat-kids').length).to.equal(3);

          $.scope.top.destroy();

          setTimeout(() => {
            try {
              // All DOM gone.
              expect($('.jq-repeat-top').length).to.equal(0);
              expect($('.jq-repeat-kids').length).to.equal(0);
              // Holder gone.
              expect($('#jq-repeat-holder-top').length).to.equal(0);
              // Scope unregistered (and no orphaned nested scopes).
              expect($.scope.has('top')).to.equal(false);
              const nestedLeaked = Object.keys($.scope).filter(k => k.startsWith('kids__'));
              expect(nestedLeaked.length).to.equal(0);
              done();
            } catch (e) { done(e); }
          }, 100);
        } catch (e) { done(e); }
      }, 200);
    }, 100);
  });

  // #10 via the jQuery helper.
  it('scopeDestroy() tears down via the element helper', function (done) {
    $('<div jq-repeat="viaHelper">{{ v }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.viaHelper.push({ v: 'a' }, { v: 'b' });
      setTimeout(() => {
        try {
          expect($('.jq-repeat-viaHelper').length).to.equal(2);
          $('.jq-repeat-viaHelper').first().scopeDestroy();
          setTimeout(() => {
            try {
              expect($('.jq-repeat-viaHelper').length).to.equal(0);
              expect($.scope.has('viaHelper')).to.equal(false);
              done();
            } catch (e) { done(e); }
          }, 100);
        } catch (e) { done(e); }
      }, 150);
    }, 100);
  });
});