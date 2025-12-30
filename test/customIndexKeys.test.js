import './setup.js';
import { expect } from 'chai';
import { cleanupScopes } from './setup.js';
import '../src/jq-repeat.js';

describe('Custom Index Keys', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('should use custom index key for element identification', function (done) {
    $('<div jq-repeat="users" jq-index-key="userId">{{ userName }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.users.push({ userId: 'user123', userName: 'John' });
      $.scope.users.push({ userId: 'user456', userName: 'Jane' });

      setTimeout(() => {
        try {
          expect($.scope.users.length).to.equal(2);

          // Check that elements have custom index attributes
          const elements = $('.jq-repeat-users');
          expect($(elements[0]).attr('jq-repeat-index')).to.equal('user123');
          expect($(elements[1]).attr('jq-repeat-index')).to.equal('user456');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should find items by custom index key using indexOf', function (done) {
    $('<div jq-repeat="products" jq-index-key="productId">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.products.push({ productId: 'prod1', name: 'Widget' });
      $.scope.products.push({ productId: 'prod2', name: 'Gadget' });
      $.scope.products.push({ productId: 'prod3', name: 'Doohickey' });

      setTimeout(() => {
        try {
          // Find by custom index
          const index = $.scope.products.indexOf('prod2');
          expect(index).to.equal(1);

          // Get item by custom index
          const item = $.scope.products.getByKey('productId', 'prod3');
          expect(item.name).to.equal('Doohickey');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should update items using custom index key', function (done) {
    $('<div jq-repeat="contacts" jq-index-key="email">{{ name }}: {{ phone }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.contacts.push({ email: 'john@example.com', name: 'John', phone: '123-4567' });
      $.scope.contacts.push({ email: 'jane@example.com', name: 'Jane', phone: '987-6543' });

      setTimeout(() => {
        try {
          // Update by custom index key
          $.scope.contacts.update('john@example.com', { phone: '555-0000' });

          setTimeout(() => {
            const john = $.scope.contacts.getByKey('email', 'john@example.com');
            expect(john.phone).to.equal('555-0000');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should remove items using custom index key', function (done) {
    $('<div jq-repeat="inventory" jq-index-key="sku">{{ itemName }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.inventory.push({ sku: 'SKU001', itemName: 'Item 1' });
      $.scope.inventory.push({ sku: 'SKU002', itemName: 'Item 2' });
      $.scope.inventory.push({ sku: 'SKU003', itemName: 'Item 3' });

      setTimeout(() => {
        try {
          expect($.scope.inventory.length).to.equal(3);

          // Remove by custom index
          $.scope.inventory.remove('SKU002');

          setTimeout(() => {
            expect($.scope.inventory.length).to.equal(2);
            expect($.scope.inventory.indexOf('SKU002')).to.equal(-1);
            expect($('.jq-repeat-inventory').length).to.equal(2);

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should splice items using custom index key', function (done) {
    $('<div jq-repeat="tasks" jq-index-key="taskId">{{ title }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.tasks.push({ taskId: 'task1', title: 'Task 1' });
      $.scope.tasks.push({ taskId: 'task2', title: 'Task 2' });
      $.scope.tasks.push({ taskId: 'task3', title: 'Task 3' });

      setTimeout(() => {
        try {
          // Splice using custom index
          const removed = $.scope.tasks.splice('task2', 1, { taskId: 'task2-new', title: 'Task 2 New' });

          setTimeout(() => {
            expect(removed.length).to.equal(1);
            expect(removed[0].taskId).to.equal('task2');

            const newTask = $.scope.tasks.getByKey('taskId', 'task2-new');
            expect(newTask).to.exist;
            expect(newTask.title).to.equal('Task 2 New');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should handle updates when custom index key value changes', function (done) {
    $('<div jq-repeat="accounts" jq-index-key="accountId">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.accounts.push({ accountId: 'acc1', name: 'Account 1' });

      setTimeout(() => {
        try {
          // Update with new accountId
          $.scope.accounts.update(0, { accountId: 'acc1-updated', name: 'Account 1 Updated' });

          setTimeout(() => {
            const element = $('.jq-repeat-accounts').first();
            expect(element.attr('jq-repeat-index')).to.equal('acc1-updated');
            expect(element.text()).to.include('Account 1 Updated');

            done();
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should support getByKey with single argument using default index key', function (done) {
    $('<div jq-repeat="items" jq-index-key="itemId">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.items.push({ itemId: 'item1', name: 'First Item' });
      $.scope.items.push({ itemId: 'item2', name: 'Second Item' });
      $.scope.items.push({ itemId: 'item3', name: 'Third Item' });

      setTimeout(() => {
        try {
          // Test getByKey with single argument (should use default index key)
          const item = $.scope.items.getByKey('item2');
          expect(item).to.exist;
          expect(item.name).to.equal('Second Item');
          expect(item.itemId).to.equal('item2');

          // Also test with two arguments to ensure it still works
          const item3 = $.scope.items.getByKey('itemId', 'item3');
          expect(item3).to.exist;
          expect(item3.name).to.equal('Third Item');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });
});
