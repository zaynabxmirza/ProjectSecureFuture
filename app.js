const express = require('express')
const app = express()
const port = 3000

// Static assets
app.use(express.static("public"));

// Enables transfer of post data from html forms
app.use(express.urlencoded({ extended: true}))

// View engine middleware
app.set('view engine', 'ejs');
app.set('views', [__dirname + "/views",__dirname + "/views/users"]);

// MongoDB ORM middleware
const mongoose = require("./config/dbconfig");

// Session-based authorisation middleware
const session = require("express-session");

app.use(
    session({
        secret: "randomised text",
        resave: false,
        saveUninitialized: false
    })
)

// Global use of user
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
  });  

// Authentication middleware
const passport = require("passport");
app.use(passport.initialize());
app.use(passport.session());

// Endpoint definition
require("./routes/userroutes")(app);
require("./routes/questionnaireroutes")(app);

// Starts the server listening to port 3000
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})