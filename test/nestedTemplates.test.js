import './setup.js';
import { expect } from 'chai';
import { cleanupScopes } from './setup.js';
import '../src/jq-repeat.js';

describe('Nested Templates', function () {
  beforeEach(function() {
    document.body.innerHTML = '';
    cleanupScopes();
  });

  it('should auto-populate nested jq-repeat scopes from parent data', function (done) {
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
      $.scope.departments.push({
        name: 'Engineering',
        employees: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ]
      });

      setTimeout(() => {
        try {
          expect($.scope.departments.length).to.equal(1);
          expect($('.jq-repeat-departments').length).to.equal(1);
          expect($('.jq-repeat-departments h2').text()).to.equal('Engineering');

          // Nested scope auto-populated and rendered.
          expect($('.jq-repeat-employees').length).to.equal(2);
          const nested = $('.jq-repeat-employees').first().scopeGet();
          expect(nested).to.exist;
          expect(nested.length).to.equal(2);
          // Also reachable from the parent item.
          expect($.scope.departments[0].__jqNested.employees.length).to.equal(2);

          done();
        } catch (error) {
          done(error);
        }
      }, 200);
    }, 100);
  });

  it('should access parent data using _parent in nested templates', function (done) {
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
        try {
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
    }, 100);
  });

  it('should clean up nested scopes when parent items are removed', function (done) {
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
        try {
          const initialMemberCount = $('.jq-repeat-members').length;
          expect(initialMemberCount).to.equal(3);

          const teamAScopes = Object.keys($.scope).filter(k => k.startsWith('members__'));
          expect(teamAScopes.length).to.equal(2);

          // Remove first team (Team A with 2 members).
          $.scope.teams.shift();

          setTimeout(() => {
            try {
              // Only Team B's single member should remain.
              const remainingMembers = $('.jq-repeat-members').length;
              expect(remainingMembers).to.equal(1);

              // Team A's nested scope must be unregistered, Team B's kept.
              const remainingScopes = Object.keys($.scope).filter(k => k.startsWith('members__'));
              expect(remainingScopes.length).to.equal(1);

              done();
            } catch (error) {
              done(error);
            }
          }, 100);
        } catch (error) {
          done(error);
        }
      }, 200);
    }, 100);
  });

  it('should give each parent instance its own nested scope (no shared global)', function (done) {
    const template = `
      <div jq-repeat="depts">
        <h2>{{ name }}</h2>
        <ul><li jq-repeat="emps">{{ n }}</li></ul>
      </div>
    `;

    $(template).appendTo('body');

    setTimeout(() => {
      $.scope.depts.push({ name: 'Eng', emps: [{ n: 'a1' }, { n: 'a2' }] });
      $.scope.depts.push({ name: 'Sales', emps: [{ n: 's1' }] });

      setTimeout(() => {
        try {
          // No shared global nested scope under the bare name.
          expect($.scope.has('emps')).to.equal(false);

          // Each dept owns its own emps list, isolated from the other.
          expect($.scope.depts[0].__jqNested.emps.length).to.equal(2);
          expect($.scope.depts[1].__jqNested.emps.length).to.equal(1);

          // All three rendered together, selectable by the base class.
          expect($('.jq-repeat-emps').length).to.equal(3);

          // scopeGet() on a nested element returns that parent's list only.
          const firstEmpsList = $('.jq-repeat-emps').first().scopeGet();
          expect(firstEmpsList.length).to.equal(2);

          // Mutating one parent's nested list does not affect the other.
          $.scope.depts[0].__jqNested.emps.push({ n: 'a3' });
          expect($('.jq-repeat-emps').length).to.equal(4);
          expect($.scope.depts[1].__jqNested.emps.length).to.equal(1);

          done();
        } catch (error) {
          done(error);
        }
      }, 200);
    }, 100);
  });

  it('should support multiple levels of nesting with auto-populate', function (done) {
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
              { personName: 'Seller 1' },
              { personName: 'Seller 2' }
            ]
          }
        ]
      });

      setTimeout(() => {
        try {
          expect($.scope.organizations.length).to.equal(1);
          expect($('.jq-repeat-organizations').length).to.equal(1);

          // Departments auto-populated.
          expect($('.jq-repeat-departments').length).to.equal(1);
          const deptList = $('.jq-repeat-departments').first().scopeGet();
          expect(deptList.length).to.equal(1);

          // People auto-populated inside the department.
          expect($('.jq-repeat-people').length).to.equal(2);
          const peopleList = $('.jq-repeat-people').first().scopeGet();
          expect(peopleList.length).to.equal(2);

          // Reachable through the parent chain.
          expect($.scope.organizations[0].__jqNested.departments[0].__jqNested.people.length).to.equal(2);

          done();
        } catch (error) {
          done(error);
        }
      }, 250);
    }, 100);
  });
});