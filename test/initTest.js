import './setup.js';
import { expect } from 'chai';
import '../src/jq-repeat.js';

describe('jq-repeat Initialization', function () {
  beforeEach(function() {
    // Clear the body before each test
    document.body.innerHTML = '';
  });

  it('should create a RepeatList in $.scope when jq-repeat element is added to DOM', function (done) {
    // Add a jq-repeat element to the DOM
    const $el = $('<div jq-repeat="sample">{{text}}</div>').appendTo('body');

    // Give MutationObserver time to process
    setTimeout(() => {
      try {
        // Check that $.scope.sample exists and is an array
        expect($.scope.sample).to.exist;
        expect(Array.isArray($.scope.sample)).to.be.true;

        // Check the scope ID
        expect($.scope.sample.__jqRepeatId).to.equal('sample');

        // Check that the template was replaced with a script tag
        const $holder = $('#jq-repeat-holder-sample');
        expect($holder.length).to.equal(1);
        expect($holder.prop('tagName')).to.equal('SCRIPT');

        done();
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should render items when pushed to the scope', function (done) {
    // Add a jq-repeat element to the DOM
    $('<div jq-repeat="testList">{{name}}</div>').appendTo('body');

    // Give MutationObserver time to initialize
    setTimeout(() => {
      // Push an item to the scope
      $.scope.testList.push({ name: 'Test Item' });

      // Check that the item was rendered
      setTimeout(() => {
        try {
          expect($.scope.testList.length).to.equal(1);
          expect($('.jq-repeat-testList').length).to.equal(1);
          expect($('.jq-repeat-testList').text()).to.equal('Test Item');
          done();
        } catch (error) {
          done(error);
        }
      }, 50);
    }, 100);
  });

  it('should support array methods like splice, pop, and shift', function (done) {
    $('<li jq-repeat="items">{{value}}</li>').appendTo('body');

    setTimeout(() => {
      // Push multiple items
      $.scope.items.push({ value: 'A' }, { value: 'B' }, { value: 'C' });

      setTimeout(() => {
        try {
          expect($.scope.items.length).to.equal(3);

          // Test pop
          const popped = $.scope.items.pop();
          expect(popped).to.exist;
          expect(popped.value).to.equal('C');
          expect($.scope.items.length).to.equal(2);

          setTimeout(() => {
            // Test shift
            const shifted = $.scope.items.shift();
            expect(shifted).to.exist;
            expect(shifted.value).to.equal('A');
            expect($.scope.items.length).to.equal(1);
            expect($.scope.items[0].value).to.equal('B');

            done();
          }, 50);
        } catch (error) {
          done(error);
        }
      }, 100);
    }, 100);
  });
});
