module.exports = function (app) {
  const mongoose = require("../config/dbconfig");
  const User = require("../models/user");
  const passport = require("passport");

  // Configures Passport.js for user authentication
  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  checkAuth = (req, res, next) => {
    // Passport adds this to the request object
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/login");
  };

  // To serve static files from current location, determine parent directory
  const path = require("path");
  const parentDirectory = path.dirname(__dirname);

  // Password validation function
  function isValidPassword(password) {
  const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*£]).{6,}$/;
  return regex.test(password);
}

  //-------------------------------------------------------------------------
  //---------------------index page------------------------------------------
  app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.role === "Admin") {
      return res.redirect("/admin_dashboard");
    } else {
      return res.redirect("/user_dashboard");
    }
  }
  res.render("index");
});

  // Handles user registration
  app.get("/register", (req, res) => {
    res.render("register");
  });

  app.post("/register", async (req, res) => {
    try {

      if (!isValidPassword(req.body.password)) {
        return res.render("register", { error: "Password must be at least 6 characters and include a number and special character." });
      }

      // Create new user object with extra fields
      const newUser = new User({
        useremail: req.body.useremail,
        userforename: req.body.userforename,
        usersurname: req.body.usersurname,
        role: req.body.role,
      });
      
      // Register user with hashed password (passport-local-mongoose)
      await User.register(newUser, req.body.password);

      // Authenticate and login user after registration
      passport.authenticate("local")(req, res, () => {
        
        // Redirect based on user role
        if (req.user.role === "User") {
          return res.redirect("/user_dashboard");
        } else if (req.user.role === "Admin") {
          return res.redirect("/admin_dashboard");
        } else {
          return res.redirect("/");
        }
      });

    } catch (err) {
      console.log("Error registering user:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Handles Login
  app.get("/login", (req, res) => {
    res.render("login");
  });

  app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.log("authentication error: ", err);
        return next(err);
      }

      if (!user) {
        // Failed authentication
        console.log("authentication failed:", info);
        return res.redirect("/login");
      }

      // Succeeded authentication
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        // Debug session data -> who is currently accessing
        console.log("Session:", req.session);
        console.log("User in session:", req.user);

        // redirection based on user category
        if (user.role === "User") {
          return res.redirect("/user_dashboard");
        } else if (user.role === "Admin") {
          return res.redirect("/admin_dashboard");
        } else {
          //Handle other user categories or redirect to a default page
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  // Admin Dashboard
  app.get("/admin_dashboard", checkAuth, (req, res) => {
    if (req.user.role === "Admin") {
      console.log(
        `Authenticated at /admin_dashboard: ${req.isAuthenticated()}`
      );
      res.render("admin_dashboard");
    } else {
      res.redirect("/login");
    }
  });

  // User Dashboard
  app.get("/user_dashboard", checkAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      res.render("user_dashboard", { user: user, userforename: user.userforename, 
      });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Dashboard error");
    }
  });

  // Logs user out redirecting to home page 
  app.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.log("Error logging out:", err);
        return res.redirect("/user_dashboard");
      }
      console.log("User has logged out");
      res.redirect("/");
    });
  });

  // Change Password Page
  app.get('/profile', checkAuth, (req, res) => {
  res.render('change-password', {
    error: null,
    success: null,
    user: req.user 
  });
});

app.post('/profile', checkAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!isValidPassword(newPassword)) {
    return res.render('change-password', {
      error: "New password must be at least 6 characters, include a number and special character.",
      success: null
    });
  }

  try {
    const user = req.user;
    user.changePassword(currentPassword, newPassword, function (err) {
      if (err) {
        console.error("Password change error:", err);
        return res.render('change-password', {
          error: "Current password is incorrect.",
          success: null
        });
      }

      // On success, show confirmation
      res.redirect('/user_dashboard');
    });
  } catch (err) {
    res.status(500).render('change-password', {
      error: "Error updating password.",
      success: null
    });
  }
});

  // Displays About Us 
  app.get("/aboutus", (req, res) => {
    res.render("aboutus")
  })
  
  // Displays Contact Us
  app.get("/contact", (req, res) => {
    res.render("contact")
  })

  app.post("/contact", (req, res) => {
    console.log("Contact form submitted:", req.body);
    res.send("Thank you for contacting us! We will get back to you shortly.");
  });
  

  //-------------------------------------------------------------------------
  // All routes related to http://localhost:3000/admin/..
  //---------------------------User Management-------------------------------

  // User management page
  app.get("/admin/usermanagement", async (req, res) => {
    const users = await User.find(); 
    res.render("admin/userManagement", { users });
    });


  // Creates an account
  app.get("/admin/usermanagement/create", (req, res) => {
    res.render("../admin/adduser");
  });

  app.post("/admin/usermanagement/create", async (req, res) => {
  try {
    if (!isValidPassword(req.body.password)) {
      const users = await User.find(); // Re-fetch users to populate the view again
      return res.render("admin/userManagement", {
        users,
        error: "Password must be at least 6 characters and include a number and special character.",
      });
    }

    const newUser = new User({
      useremail: req.body.useremail,
      userforename: req.body.userforename,
      usersurname: req.body.usersurname,
      role: req.body.role,
    });

    // Registers new user
    User.register(newUser, req.body.password, async function (err, user) {
      if (err) {
        console.log("Registration error:", err);
        const users = await User.find();
        return res.render("admin/userManagement", {
          users,
          error: "Error: " + err.message,
        });
      }

      console.log(`New user: ${user.userforename} ${user.usersurname} created successfully.`);
      res.redirect("/admin/usermanagement");
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(400).send("Error creating user");
  }
});

  
  // Deletes a user
  app.post("/admin/usermanagement/deleteuser/:id", async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.redirect("/admin/usermanagement");
    } catch (err) {
      res.status(500).send("Failed to delete user");
    }
  });
  
  // Updates a user
  app.get("/admin/usermanagement/update/:id", async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      res.render("admin/updateuser", { user });
    } catch (err) {
      res.status(500).send("Error loading user");
    }
  });
  
  app.post("/admin/usermanagement/update/:id", async (req, res) => {
    try {
      await User.findByIdAndUpdate(req.params.id, {
        userforename: req.body.userforename,
        usersurname: req.body.usersurname,
        useremail: req.body.useremail
      });
      res.redirect("/admin/usermanagement");
    } catch (err) {
      res.status(500).send("Failed to update user");
    }
  });

//--------------Plan Management----------------------------------------------------------------------------------
// Get all users and their financial plans
app.get('/admin/userplans', async (req, res) => {
  try {
    const users = await User.find({}, 'userforename usersurname email financialPlans');
    res.render('admin/viewUserPlans', { users });
  } catch (err) {
    res.status(500).send("Error retrieving user plans");
  }
});

// Deletes a specific financial plan for a user
app.post('/admin/userplans/delete/:userId/:planIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    user.financialPlans.splice(req.params.planIndex, 1); // Remove the plan at the given index
    await user.save();
    res.redirect('/admin/userplans');
  } catch (err) {
    res.status(500).send("Could not delete plan");
  }
});

// Updates a specific financial plan for a user 
app.get('/admin/userplans/update/:userId/:planIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const plan = user.financialPlans[req.params.planIndex];
    res.render('admin/updateUserPlan', { user, plan, planIndex: req.params.planIndex });
  } catch (err) {
    res.status(500).send("Error retrieving plan for update");
  }
});

app.post('/admin/userplans/update/:userId/:planIndex', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const plan = user.financialPlans[req.params.planIndex];

    // Update plan outputs only
    plan.plan.recommendations = req.body.recommendations.split('\n').filter(Boolean);
    plan.plan.nextSteps = req.body.nextSteps.split('\n').filter(Boolean);

    await user.save();
    res.redirect('/admin/userplans');
  } catch (err) {
    res.status(500).send("Error updating plan");
  }
});
}