const mongoose = require("mongoose");
passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  // User details
  useremail: { type: String, required: true }, // Using email as username
  userforename: String,
  usersurname: String,
  role: {type: String, enum: ['Admin', 'User'], default: 'User'},
  
  // Core inputs for generating a plan
  age: Number,
  dependents: Number,
  income: Number,
  benefits: String,
  housing: String,
  savings: String,

  // Plan output
  financialPlans: [
    {
      date: { type: Date, default: Date.now }, 
      dataSnapshot: {
        age: Number,
        dependents: Number,
        income: Number,
        benefits: String,
        housing: String,
        savings: String
      },
      plan: {
        recommendations: [String],
        nextSteps: [String]
      }
    }
  ]
})

UserSchema.plugin(passportLocalMongoose, { usernameField: "useremail" });

// Export the model
module.exports = mongoose.model("User", UserSchema);