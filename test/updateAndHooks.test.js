import './setup.js';
import { expect } from 'chai';
import '../src/jq-repeat.js';

describe('Update Functionality and Hooks', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
  });

  it('should update items by index', function (done) {
    $('<div jq-repeat="updateTest">{{ value }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.updateTest.push({ value: 'Original' });

      setTimeout(() => {
        try {
          $.scope.updateTest.update(0, { value: 'Updated' });

          setTimeout(() => {
            expect($.scope.updateTest[0].value).to.equal('Updated');
            expect($('.jq-repeat-updateTest').text()).to.include('Updated');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should merge data when updating, not replace', function (done) {
    $('<div jq-repeat="mergeTest">{{ name }}: {{ age }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.mergeTest.push({ name: 'John', age: 30, country: 'USA' });

      setTimeout(() => {
        try {
          // Update only age
          $.scope.mergeTest.update(0, { age: 31 });

          setTimeout(() => {
            const item = $.scope.mergeTest[0];
            expect(item.name).to.equal('John'); // Preserved
            expect(item.age).to.equal(31); // Updated
            expect(item.country).to.equal('USA'); // Preserved

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should throttle multiple rapid updates', function (done) {
    $('<div jq-repeat="throttleTest">{{ counter }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.throttleTest.push({ counter: 0 });

      setTimeout(() => {
        try {
          let updateCount = 0;

          // Override __putUpdate to count actual DOM updates
          const original__putUpdate = $.scope.throttleTest.__putUpdate;
          $.scope.throttleTest.__putUpdate = function($oldEl, $newEl, item, list) {
            updateCount++;
            original__putUpdate.call(this, $oldEl, $newEl, item, list);
          };

          // Perform rapid updates
          for (let i = 1; i <= 10; i++) {
            $.scope.throttleTest.update(0, { counter: i });
          }

          // Wait for throttle to settle
          setTimeout(() => {
            // Should have fewer updates than calls due to throttling
            expect(updateCount).to.be.lessThan(10);
            expect($.scope.throttleTest[0].counter).to.equal(10);

            done();
          }, 300);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should call __put hook when item is added', function (done) {
    $('<div jq-repeat="putHook">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        let putCalled = false;
        let putElement = null;
        let putItem = null;

        $.scope.putHook.__put = function($el, item, list) {
          putCalled = true;
          putElement = $el;
          putItem = item;
          $el.show();
        };

        $.scope.putHook.push({ text: 'Test' });

        setTimeout(() => {
          expect(putCalled).to.be.true;
          expect(putElement).to.exist;
          expect(putItem).to.exist;
          expect(putItem.text).to.equal('Test');

          done();
        }, 150);
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should call __take hook when item is removed', function (done) {
    $('<div jq-repeat="takeHook">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        let takeCalled = false;
        let takeElement = null;
        let takeItem = null;

        $.scope.takeHook.push({ text: 'To Remove' });

        setTimeout(() => {
          $.scope.takeHook.__take = function($el, item, list) {
            takeCalled = true;
            takeElement = $el;
            takeItem = item;
            $el.remove();
          };

          $.scope.takeHook.pop();

          setTimeout(() => {
            expect(takeCalled).to.be.true;
            expect(takeElement).to.exist;
            expect(takeItem).to.exist;
            expect(takeItem.text).to.equal('To Remove');

            done();
          }, 100);
        }, 150);
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should call __putUpdate hook when item is updated', function (done) {
    $('<div jq-repeat="updateHook">{{ status }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        $.scope.updateHook.push({ status: 'pending' });

        setTimeout(() => {
          let updateCalled = false;
          let oldElement = null;
          let newElement = null;

          $.scope.updateHook.__putUpdate = function($oldEl, $newEl, item, list) {
            updateCalled = true;
            oldElement = $oldEl;
            newElement = $newEl;
            $oldEl.replaceWith($newEl);
          };

          $.scope.updateHook.update(0, { status: 'completed' });

          setTimeout(() => {
            expect(updateCalled).to.be.true;
            expect(oldElement).to.exist;
            expect(newElement).to.exist;

            done();
          }, 150);
        }, 150);
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should transform data using parseKeys', function (done) {
    $('<div jq-repeat="parseTest">{{ timestamp }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        // Add a parser for timestamp
        $.scope.parseTest.parseKeys.timestamp = function(value, key, data) {
          return new Date(value).toLocaleDateString();
        };

        const testDate = new Date('2024-01-15').getTime();
        $.scope.parseTest.push({ timestamp: testDate });

        setTimeout(() => {
          const element = $('.jq-repeat-parseTest').first();
          const text = element.text();

          // Should display formatted date, not timestamp
          expect(text).to.not.include(testDate.toString());
          expect(text.length).to.be.greaterThan(0);

          done();
        }, 150);
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should validate that hooks must be functions', function (done) {
    $('<div jq-repeat="validateHooks">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        // Try to set hook to non-function
        const consoleSpy = [];
        const originalWarn = console.warn;
        console.warn = function(...args) {
          consoleSpy.push(args.join(' '));
          originalWarn.apply(console, args);
        };

        $.scope.validateHooks.put = 'not a function';

        // Should have warned
        expect(consoleSpy.some(msg => msg.includes('put'))).to.be.true;

        console.warn = originalWarn;
        done();
      } catch (error) {
        done(error);
      }
    }, 100);
  });

  it('should support custom put logic in hooks', function (done) {
    $('<div jq-repeat="animTest">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      try {
        let customPutCalled = false;
        let putElement = null;

        $.scope.animTest.__put = function($el, item, list) {
          customPutCalled = true;
          putElement = $el;
          // Custom logic - add a class instead of animation
          $el.addClass('custom-added').show();
        };

        $.scope.animTest.push({ text: 'Custom' });

        setTimeout(() => {
          expect(customPutCalled).to.be.true;
          expect(putElement).to.exist;
          expect($('.jq-repeat-animTest').hasClass('custom-added')).to.be.true;
          expect($('.jq-repeat-animTest').length).to.equal(1);

          done();
        }, 150);
      } catch (error) {
        done(error);
      }
    }, 100);
  });
});
