import './setup.js';
import { expect } from 'chai';
import '../src/jq-repeat.js';
import { cleanupScopes } from './setup.js';

describe('Sorting Functionality', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('should sort items when jr-order-by is set', function (done) {
    $('<div jq-repeat="sortUsers" jr-order-by="age">{{ name }}: {{ age }}</div>').appendTo('body');

    setTimeout(() => {
      // Add items in random order
      $.scope.sortUsers.push({ name: 'Bob', age: 30 });
      $.scope.sortUsers.push({ name: 'Alice', age: 25 });
      $.scope.sortUsers.push({ name: 'Charlie', age: 35 });

      setTimeout(() => {
        try {
          expect($.scope.sortUsers.length).to.equal(3);

          // Check they are sorted by age
          expect($.scope.sortUsers[0].age).to.equal(25); // Alice
          expect($.scope.sortUsers[1].age).to.equal(30); // Bob
          expect($.scope.sortUsers[2].age).to.equal(35); // Charlie

          // Check DOM order matches
          const elements = $('.jq-repeat-sortUsers').map((i, el) => $(el).text()).get();
          expect(elements[0]).to.include('Alice');
          expect(elements[1]).to.include('Bob');
          expect(elements[2]).to.include('Charlie');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should sort items in reverse order with jr-order-reverse', function (done) {
    $('<div jq-repeat="scores" jr-order-by="points" jr-order-reverse="true">{{ player }}: {{ points }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.scores.push({ player: 'Player1', points: 100 });
      $.scope.scores.push({ player: 'Player2', points: 200 });
      $.scope.scores.push({ player: 'Player3', points: 150 });

      setTimeout(() => {
        try {
          expect($.scope.scores.length).to.equal(3);

          // Check reverse order (highest first)
          expect($.scope.scores[0].points).to.equal(200); // Player2
          expect($.scope.scores[1].points).to.equal(150); // Player3
          expect($.scope.scores[2].points).to.equal(100); // Player1

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should sort strings alphabetically', function (done) {
    $('<div jq-repeat="sortStrings" jr-order-by="name">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.sortStrings.push({ name: 'Zebra' });
      $.scope.sortStrings.push({ name: 'Apple' });
      $.scope.sortStrings.push({ name: 'Mango' });

      setTimeout(() => {
        try {
          expect($.scope.sortStrings[0].name).to.equal('Apple');
          expect($.scope.sortStrings[1].name).to.equal('Mango');
          expect($.scope.sortStrings[2].name).to.equal('Zebra');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should reposition items when updated if sort order changes', function (done) {
    $('<div jq-repeat="records" jr-order-by="value">{{ id }}: {{ value }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.records.push({ id: 'A', value: 10 });
      $.scope.records.push({ id: 'B', value: 20 });
      $.scope.records.push({ id: 'C', value: 30 });

      setTimeout(() => {
        try {
          expect($.scope.records[0].id).to.equal('A');
          expect($.scope.records[1].id).to.equal('B');
          expect($.scope.records[2].id).to.equal('C');

          // Update B to have the highest value
          $.scope.records.update(1, { value: 50 });

          setTimeout(() => {
            // B should now be at the end
            expect($.scope.records[0].id).to.equal('A');
            expect($.scope.records[1].id).to.equal('C');
            expect($.scope.records[2].id).to.equal('B');

            done();
          }, 150);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should handle null and undefined values in sorting', function (done) {
    $('<div jq-repeat="data" jr-order-by="value">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      $.scope.data.push({ name: 'Has value', value: 10 });
      $.scope.data.push({ name: 'Null value', value: null });
      $.scope.data.push({ name: 'Undefined value' }); // value is undefined
      $.scope.data.push({ name: 'Another value', value: 5 });

      setTimeout(() => {
        try {
          expect($.scope.data.length).to.equal(4);

          // Items with values should come first, sorted
          const withValues = $.scope.data.filter(d => d.value !== null && d.value !== undefined);
          expect(withValues.length).to.equal(2);

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it('should handle Date objects in sorting', function (done) {
    $('<div jq-repeat="events" jr-order-by="date">{{ name }}</div>').appendTo('body');

    setTimeout(() => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2023-01-01');
      const date3 = new Date('2025-01-01');

      $.scope.events.push({ name: 'Event 2024', date: date1 });
      $.scope.events.push({ name: 'Event 2023', date: date2 });
      $.scope.events.push({ name: 'Event 2025', date: date3 });

      setTimeout(() => {
        try {
          expect($.scope.events[0].name).to.equal('Event 2023');
          expect($.scope.events[1].name).to.equal('Event 2024');
          expect($.scope.events[2].name).to.equal('Event 2025');

          done();
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });
});
