const mongoose = require("mongoose"); 
const mongoDB = 
  "mongodb+srv://zaynab:F3a802OIzr3VWgJn@cluster0.2oygzlm.mongodb.net/Finance"; 
mongoose.connect(mongoDB);  

const db = mongoose.connection; 
db.on("error", console.error.bind(console, "connection error:")); 
db.once("open", function () {   
    console.log("Connected successfully to MongoDB!"); 
}); module.exports = mongoose; 
