module.exports = function (app) {
  const mongoose = require("../config/dbconfig");
  const User = require("../models/user");
  const passport = require("passport");

  // Configures Passport.js for user authentication
  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  checkAuth = (req, res, next) => {
    // passport adds this to the request object
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/login");
  };
  //to serve static files from current location, determine parent directory
  const path = require("path");
  const parentDirectory = path.dirname(__dirname);

  //------------------------------------Questionnaire routes------------------------------------------------
  app.get("/questionnaire/personal-information", (req, res) => {
    res.render("questionnaireStep1");
  });

  // Step 1: Personal Information
  app.post(
    "/questionnaire/personal-information",
    checkAuth,
    async (req, res) => {
      const { age, dependents } = req.body;

      try {
        await User.findByIdAndUpdate(req.user._id, {
          age,
          dependents,
        });
        res.redirect("/questionnaire/financial-information");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error saving step 1 data.");
      }
    }
  );

  // Step 2: Financial Information
  app.get("/questionnaire/financial-information", (req, res) => {
    res.render("questionnaireStep2");
  });

  app.post(
    "/questionnaire/financial-information",
    checkAuth,
    async (req, res) => {
      const { income, benefits, housing } = req.body;

      try {
        await User.findByIdAndUpdate(req.user._id, {
          income,
          benefits,
          housing,
        });
        res.redirect("/questionnaire/savings");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error saving step 2 data.");
      }
    }
  );

  // Step 3: Final Step — Generate Plan
  app.get("/questionnaire/savings", (req, res) => {
    res.render("questionnaireStep3");
  });

  app.post("/questionnaire/savings", checkAuth, async (req, res) => {
    const { savings } = req.body;

    try {
      await User.findByIdAndUpdate(req.user._id, { savings });

      const user = await User.findById(req.user._id);

      const plan = generatePlan(user);

      const planEntry = {
        date: new Date(),
        dataSnapshot: {
          age: user.age,
          dependents: user.dependents,
          income: user.income,
          benefits: user.benefits,
          housing: user.housing,
          savings: user.savings,
        },
        plan: plan,
      };

      // Add to history
      user.financialPlans.push(planEntry);
      user.financialPlan = plan; 
      await user.save();

      res.redirect("/plan/summary");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error completing questionnaire.");
    }
  });

  //------------------------------------------Plan routes---------------------------------------------
  // Single plan view
  app.get("/your-plan-summary", checkAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user.financialPlan) {
        return res.redirect("/questionnaire/personal-information");
      }

      res.render("planSummary", { plan: user.financialPlan, user: req.user });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading plan summary.");
    }
  });

  // View all plans by index
  app.get("/plans/:id", checkAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      const index = parseInt(req.params.id);
      const selectedPlan = user.financialPlans?.[index];
  
      if (!selectedPlan) {
        return res.status(404).send("Plan not found.");
      }
  
      res.render("planSummary", { 
        plan: selectedPlan.plan, 
        user: req.user
      });
      
    } catch (err) {
      console.error("Error loading individual plan:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // View latest plan
  app.get("/plan/summary", checkAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      if (!user.financialPlans || user.financialPlans.length === 0) {
        return res.redirect("/user_dashboard");
      }
  
      const latestPlan = user.financialPlans[user.financialPlans.length - 1];
  
      res.render("planSummary", { plan: latestPlan.plan, user: req.user });
    } catch (err) {
      console.error("Error showing latest plan:", err);
      res.status(500).send("Could not load latest plan.");
    }
  });
  
};

// Plan generation 
function generatePlan(user) {
  const recommendations = [];
  const nextSteps = [];

  // Age-based Logic
  if (user.age < 30) {
    recommendations.push(
      "Consider opening a Lifetime ISA to save for your first home or retirement. The government offers a 25% bonus up to £1,000 per year."
    );
    nextSteps.push(
      "Visit https://www.gov.uk/lifetime-isa for full eligibility details and application steps."
    );
  
  } else if (user.age >= 30 && user.age < 50) {
    recommendations.push(
      "Review your workplace pension to ensure you're contributing enough for your retirement. Increasing your contributions now can make a significant difference."
    );
    nextSteps.push(
      "Use the pension calculator at https://www.gov.uk/workplace-pensions to assess your current contributions."
    );
  
  } else if (user.age >= 50) {
    recommendations.push(
      "It's a good time to review your retirement plans in detail. Pension Wise offers free and impartial guidance to help you plan effectively."
    );
    nextSteps.push(
      "Schedule a free session at https://www.pensionwise.gov.uk/ to review your options."
    );
  }  

  // Income Logic
  if (user.income < 1800 && !user.benefits) {
    recommendations.push(
      "You may be eligible for Universal Credit or other income-based benefits to support your financial wellbeing."
    );
    nextSteps.push(
      "Check your eligibility and apply at https://www.gov.uk/universal-credit."
    );
  }
  
  if (user.income < 1200 && user.savings === "none") {
    recommendations.push(
      "Consider applying for the Help to Save scheme, which offers a 50% government bonus on savings up to £1,200 over 4 years."
    );
    nextSteps.push(
      "Learn more and apply at https://www.gov.uk/get-help-savings-low-income."
    );
  }
  
  if (user.income < 1500 && user.dependents > 0) {
    recommendations.push(
      "You may be eligible for local council support through the Household Support Fund, which helps with essential living costs."
    );
    nextSteps.push(
      "Find your local council’s support options at https://www.gov.uk/cost-living-help-local-council."
    );
  }
  
  // Savings Logic
  if (user.savings === "none") {
    if (user.income < 1500) {
      recommendations.push(
        "You may benefit from the Help to Save scheme, which offers a 50% bonus on savings up to £50 per month."
      );
      nextSteps.push(
        "Check your eligibility and apply at https://www.gov.uk/get-help-savings-low-income."
      );
    }
    recommendations.push(
      "Start building an emergency fund of at least £500 to cover unexpected expenses."
    );
    nextSteps.push("Set up a dedicated savings account and commit to monthly deposits.");
  
  } else if (user.savings === "under500") {
    if (user.income < 1500) {
      recommendations.push(
        "Since your savings are below £500 and your income is low, you may qualify for the Help to Save scheme, offering a 50% bonus on savings."
      );
      nextSteps.push(
        "Learn more at https://www.gov.uk/get-help-savings-low-income."
      );
    }
    recommendations.push(
      "Your savings are below the recommended £500 emergency fund. Aim to boost your savings to at least this level to cover unexpected costs."
    );
    nextSteps.push("Review your monthly budget to find areas where you can save more.");
  
  } else if (user.savings === "500to2000") {
    recommendations.push(
      "Great job reaching over £500 in savings! To further strengthen your financial resilience, aim for at least 3 months' worth of essential expenses (typically around £2,000 or more)."
    );
    nextSteps.push(
      "Consider setting a savings goal and automating deposits to reach your target."
    );
  
  } else if (user.savings === "over2000") {
    recommendations.push(
      "Fantastic work maintaining a strong savings buffer! You might now consider diversifying your finances, such as investing for long-term growth."
    );
    nextSteps.push(
      "Explore ISA options or speak with a financial advisor for tailored investment guidance."
    );
  }
  
  // Dependents Logic
  if (user.dependents && user.dependents > 0) {
    recommendations.push(
      `You have ${user.dependents} dependent(s). It's important to have life insurance to protect your family’s financial future.`
    );
    nextSteps.push(
      "Explore life insurance options on comparison websites like MoneySuperMarket."
    );
  
    recommendations.push(
      "You may be eligible for Child Benefit to help with the cost of raising children."
    );
    nextSteps.push(
      "Apply or check your eligibility at https://www.gov.uk/child-benefit."
    );
  
    recommendations.push(
      "If you pay for childcare, you could benefit from Tax-Free Childcare, which covers 20% of childcare costs."
    );
    nextSteps.push(
      "Learn more and apply at https://www.gov.uk/tax-free-childcare."
    );
  
    recommendations.push(
      "Consider setting up a Junior ISA to build long-term savings for your child’s future."
    );
    nextSteps.push(
      "See options and learn more at https://www.gov.uk/junior-individual-savings-accounts."
    );
  }  

  // Housing Logic
  if (user.housing === "council") {
    recommendations.push(
      "You may be eligible for the Right to Buy scheme, which allows council tenants to purchase their home at a discount."
    );
    nextSteps.push(
      "Check your eligibility at https://www.gov.uk/right-to-buy-buying-your-council-home."
    );
    recommendations.push(
      "If buying isn't an option, explore council rent reduction schemes or housing benefit support."
    );
  
  } else if (user.housing === "rented") {
    recommendations.push(
      "As a renter, you might qualify for Housing Benefit or Universal Credit housing support to assist with your rent."
    );
    nextSteps.push(
      "Learn more and check your eligibility at https://www.gov.uk/housing-benefit."
    );
  
  } else if (user.housing === "owned") {
    recommendations.push(
      "Review your mortgage plan regularly to ensure you're on the best rate and terms. Consider using comparison tools or seeking independent advice."
    );
    nextSteps.push(
      "Explore GOV.UK’s mortgage calculator for insights: https://www.gov.uk/mortgage-calculator."
    );
  
  } else if (user.housing === "livingWithFamily") {
    recommendations.push(
      "Consider discussing long-term housing plans with your family, and explore first-time buyer schemes if you're planning independence."
    );
    nextSteps.push(
      "Read about Shared Ownership and other schemes at https://www.gov.uk/affordable-home-ownership-schemes."
    );
  
  } else if (user.housing === "other") {
    recommendations.push(
      "Explore government housing support schemes tailored to your circumstances, including Housing Benefit or local authority advice."
    );
    nextSteps.push(
      "Find general housing support at https://www.gov.uk/housing-local-and-council-tax."
    );
  }  

  return {
    recommendations,
    nextSteps,
  };
}
// Exports the generatePlan function
module.exports.generatePlan = generatePlan;