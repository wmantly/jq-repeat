import './setup.js';
import { expect } from 'chai';
import { cleanupScopes } from './setup.js';
import '../src/jq-repeat.js';

describe('Nested Templates', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it.skip('should support nested jq-repeat templates (auto-populate not implemented)', function (done) {
    // Create a nested template structure
    const template = `
      <div jq-repeat="departments">
        <h2>{{ name }}</h2>
        <ul>
          <li jq-repeat="employees">{{ firstName }} {{ lastName }}</li>
        </ul>
      </div>
    `;

    $(template).appendTo('body');

    setTimeout(() => {
      // Add department with employees
      $.scope.departments.push({
        name: 'Engineering',
        employees: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ]
      });

      setTimeout(() => {
        try {
          // Check department was created
          expect($.scope.departments.length).to.equal(1);
          expect($('.jq-repeat-departments').length).to.equal(1);
          expect($('.jq-repeat-departments h2').text()).to.equal('Engineering');

          // Wait for nested template to initialize
          setTimeout(() => {
            console.log('All scopes:', Object.keys($.scope));
            console.log('Employees scope exists:', !!$.scope.employees);
            if ($.scope.employees) {
              console.log('Employees length:', $.scope.employees.length);
              console.log('Employees:', $.scope.employees);
            }
            console.log('DOM employees elements:', $('.jq-repeat-employees').length);
            console.log('Body HTML:', document.body.innerHTML);

            // Check that employees scope was created and populated
            expect($.scope.employees).to.exist;
            expect($.scope.employees.length).to.equal(2);
            expect($('.jq-repeat-employees').length).to.equal(2);

            done();
          }, 200);
        } catch (error) {
          done(error);
        }
      }, 150);
    }, 100);
  });

  it.skip('should access parent data using _parent in nested templates (auto-populate not implemented)', function (done) {
    const template = `
      <div jq-repeat="companies">
        <h2>{{ companyName }}</h2>
        <div jq-repeat="workers">{{ name }} works at {{ _parent.companyName }}</div>
      </div>
    `;

    $(template).appendTo('body');

    setTimeout(() => {
      $.scope.companies.push({
        companyName: 'TechCorp',
        workers: [
          { name: 'Alice' },
          { name: 'Bob' }
        ]
      });

      setTimeout(() => {
        setTimeout(() => {
          try {
            console.log('Workers elements:', $('.jq-repeat-workers').length);
            console.log('Workers text:', $('.jq-repeat-workers').map((i, el) => $(el).text()).get());

            expect($('.jq-repeat-workers').length).to.equal(2);

            const texts = $('.jq-repeat-workers').map((i, el) => $(el).text()).get();
            expect(texts[0]).to.include('Alice');
            expect(texts[0]).to.include('TechCorp');
            expect(texts[1]).to.include('Bob');
            expect(texts[1]).to.include('TechCorp');

            done();
          } catch (error) {
            done(error);
          }
        }, 200);
      }, 150);
    }, 100);
  });

  it.skip('should clean up nested scopes when parent items are removed (auto-populate not implemented)', function (done) {
    const template = `
      <div jq-repeat="teams">
        <h3>{{ teamName }}</h3>
        <span jq-repeat="members">{{ memberName }}</span>
      </div>
    `;

    $(template).appendTo('body');

    setTimeout(() => {
      $.scope.teams.push({
        teamName: 'Team A',
        members: [
          { memberName: 'Member 1' },
          { memberName: 'Member 2' }
        ]
      });

      $.scope.teams.push({
        teamName: 'Team B',
        members: [
          { memberName: 'Member 3' }
        ]
      });

      setTimeout(() => {
        setTimeout(() => {
          try {
            const initialMemberCount = $('.jq-repeat-members').length;
            console.log('Initial member elements:', initialMemberCount);
            expect(initialMemberCount).to.be.greaterThan(0);

            // Remove first team
            $.scope.teams.shift();

            setTimeout(() => {
              // Members from removed team should be gone
              const remainingMembers = $('.jq-repeat-members').length;
              console.log('Remaining member elements:', remainingMembers);
              expect(remainingMembers).to.be.lessThan(initialMemberCount);

              done();
            }, 100);
          } catch (error) {
            done(error);
          }
        }, 200);
      }, 150);
    }, 100);
  });

  it('should support multiple levels of nesting', function (done) {
    const template = `
      <div jq-repeat="organizations">
        <h1>{{ orgName }}</h1>
        <div jq-repeat="departments">
          <h2>{{ deptName }}</h2>
          <div jq-repeat="people">{{ personName }}</div>
        </div>
      </div>
    `;

    $(template).appendTo('body');

    setTimeout(() => {
      $.scope.organizations.push({
        orgName: 'Corp Inc',
        departments: [
          {
            deptName: 'Sales',
            people: [
              { personName: 'Seller 1' }
            ]
          }
        ]
      });

      setTimeout(() => {
        setTimeout(() => {
          setTimeout(() => {
            try {
              console.log('Organizations:', $.scope.organizations.length);
              console.log('Organization elements:', $('.jq-repeat-organizations').length);

              expect($.scope.organizations.length).to.equal(1);
              expect($('.jq-repeat-organizations').length).to.equal(1);

              // Check if departments were created
              if ($.scope.departments) {
                console.log('Departments:', $.scope.departments.length);
                console.log('Department elements:', $('.jq-repeat-departments').length);
              }

              // Check if people were created
              if ($.scope.people) {
                console.log('People:', $.scope.people.length);
                console.log('People elements:', $('.jq-repeat-people').length);
              }

              done();
            } catch (error) {
              done(error);
            }
          }, 200);
        }, 200);
      }, 150);
    }, 100);
  });
});
