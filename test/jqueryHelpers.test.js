import './setup.js';
import { expect } from 'chai';
import '../src/jq-repeat.js';

describe('jQuery Helper Methods', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
  });

  it('should get scope using scopeGet()', function (done) {
    $('<div jq-repeat="helpers">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.helpers.push({ text: 'Test' });

      setTimeout(() => {
        try {
          const $element = $('.jq-repeat-helpers').first();
          const scope = $element.scopeGet();

          expect(scope).to.exist;
          expect(scope).to.equal($.scope.helpers);
          expect(scope.__jqRepeatId).to.equal('helpers');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should get closest jq-repeat element using scopeGetEl()', function (done) {
    $('<div jq-repeat="containers"><span class="inner">{{ value }}</span></div>').appendTo('body');

    setTimeout(() => {
      $.scope.containers.push({ value: 'Test' });

      setTimeout(() => {
        try {
          const $inner = $('.inner').first();
          const $scopeEl = $inner.scopeGetEl();

          expect($scopeEl).to.exist;
          expect($scopeEl.attr('jq-repeat-scope')).to.equal('containers');
          expect($scopeEl.hasClass('jq-repeat-containers')).to.be.true;

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should get item data using scopeItem()', function (done) {
    $('<div jq-repeat="helperItems">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.helperItems.push({ name: 'Item 1', id: 1 });
      $.scope.helperItems.push({ name: 'Item 2', id: 2 });

      setTimeout(() => {
        try {
          const $secondElement = $('.jq-repeat-helperItems').eq(1);
          const itemData = $secondElement.scopeItem();

          expect(itemData).to.exist;
          expect(itemData.name).to.equal('Item 2');
          expect(itemData.id).to.equal(2);

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should update item using scopeItemUpdate()', function (done) {
    $('<div jq-repeat="records">{{ status }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.records.push({ status: 'pending', value: 100 });
      $.scope.records.push({ status: 'pending', value: 200 });

      setTimeout(() => {
        try {
          const $firstElement = $('.jq-repeat-records').first();

          // Update using scopeItemUpdate
          $firstElement.scopeItemUpdate({ status: 'completed' });

          setTimeout(() => {
            expect($.scope.records[0].status).to.equal('completed');
            expect($.scope.records[0].value).to.equal(100); // Other fields preserved

            // Re-query the element after update since it gets replaced
            const $updatedElement = $('.jq-repeat-records').first();
            expect($updatedElement.text()).to.include('completed');

            done();
          }, 150);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should remove item using scopeItemRemove()', function (done) {
    $('<div jq-repeat="removables">{{ text }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.removables.push({ text: 'First' });
      $.scope.removables.push({ text: 'Second' });
      $.scope.removables.push({ text: 'Third' });

      setTimeout(() => {
        try {
          expect($.scope.removables.length).to.equal(3);

          const $secondElement = $('.jq-repeat-removables').eq(1);
          $secondElement.scopeItemRemove();

          setTimeout(() => {
            expect($.scope.removables.length).to.equal(2);
            expect($('.jq-repeat-removables').length).to.equal(2);
            expect($.scope.removables[1].text).to.equal('Third');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should work with custom index keys', function (done) {
    $('<div jq-repeat="indexed" jq-index-key="id">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.indexed.push({ id: 'item1', name: 'First' });
      $.scope.indexed.push({ id: 'item2', name: 'Second' });

      setTimeout(() => {
        try {
          const $element = $('[jq-repeat-index="item2"]');
          const itemData = $element.scopeItem();

          expect(itemData).to.exist;
          expect(itemData.id).to.equal('item2');
          expect(itemData.name).to.equal('Second');

          // Update using scopeItemUpdate
          $element.scopeItemUpdate({ name: 'Second Updated' });

          setTimeout(() => {
            const updatedItem = $.scope.indexed.getByKey('id', 'item2');
            expect(updatedItem.name).to.equal('Second Updated');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should handle nested elements correctly', function (done) {
    $('<ul><li jq-repeat="listItems"><span class="text">{{ value }}</span><button class="delete">X</button></li></ul>').appendTo('body');

    setTimeout(() => {
      $.scope.listItems.push({ value: 'Item 1' });
      $.scope.listItems.push({ value: 'Item 2' });

      setTimeout(() => {
        try {
          // Get item from nested button
          const $button = $('.delete').first();
          const itemData = $button.scopeItem();

          expect(itemData).to.exist;
          expect(itemData.value).to.equal('Item 1');

          // Remove using button
          $button.scopeItemRemove();

          setTimeout(() => {
            expect($.scope.listItems.length).to.equal(1);
            expect($.scope.listItems[0].value).to.equal('Item 2');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });
});
