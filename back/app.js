const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();

// access to file system paths
const path = require("path");

const helmet = require("helmet");

const sauceRoutes = require("./routes/sauce");
const userRoutes = require("./routes/user");

const app = express();

app.use(helmet.crossOriginResourcePolicy({ policy: "same-site" }));

// connection to the MongoDB database
mongoose
  .connect(process.env.PRIVATE_KEY_MDB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Successful connection to MongoDB!"))
  .catch(() => console.log("Failed to connect to MongoDB!"));

// add headers for requests
app.use((req, res, next) => {
  // access the API from any origin
  res.setHeader("Access-Control-ALlow-Origin", "*");
  // add the mentioned headers to the requests sent to the API
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization");
  //send requests with the mentioned methods
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  next();
});

app.use(express.json());

app.use("/api/sauces", sauceRoutes);
app.use("/api/auth", userRoutes);
app.use("/images", express.static(path.join(__dirname, "images")));

module.exports = app;
