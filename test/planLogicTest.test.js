// Logic Plan Unit Test

const { expect } = require("chai");
const { generatePlan } = require("../routes/questionnaireroutes");

// Age-Based Recommendation Test
describe("Plan Generation Logic", () => {
    
  it("should recommend Lifetime ISA for users under 30", () => {
    const user = {
      age: 25,
      income: 2000,
      savings: "under500",
      dependents: 0,
      housing: "owned",
    };

    const plan = generatePlan(user);
    expect(plan.recommendations.some((r) => r.includes("Lifetime ISA"))).to.be
      .true;
  });
});

// Income-Based Recommendation Test
it("should recommend Help to Save for low-income, no savings users", () => {
  const user = {
    age: 35,
    income: 1200,
    savings: "none",
    dependents: 0,
    housing: "rented",
  };

  const plan = generatePlan(user);
  expect(plan.recommendations.some((r) => r.includes("Help to Save"))).to.be
    .true;
});

// Dependent-Based Recommendation Test
it("should recommend life insurance if user has dependents", () => {
  const user = {
    age: 40,
    income: 3000,
    savings: "over2000",
    dependents: 2,
    housing: "owned",
  };

  const plan = generatePlan(user);
  expect(plan.recommendations.some((r) => r.includes("life insurance"))).to.be
    .true;
});

// Housing-Based Recommendation Test
it("should suggest Right to Buy scheme for council tenants", () => {
  const user = {
    age: 30,
    income: 1600,
    savings: "500to2000",
    dependents: 1,
    housing: "council",
  };

  const plan = generatePlan(user);
  expect(plan.recommendations.some((r) => r.includes("Right to Buy scheme"))).to
    .be.true;
});
