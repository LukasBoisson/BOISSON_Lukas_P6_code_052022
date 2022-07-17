const User = require("../models/user");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const httpStatus = require("http-status");
const passwordValidator = require("password-validator");

const regExpEmail = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
const schema = new passwordValidator();
schema.is().min(8).is().max(30).has().uppercase(3).has().lowercase(3).has().digits(3).has().not().spaces();

// signup
exports.signup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  if (regExpEmail.test(email) && schema.validate(password)) {
    bcrypt
      .hash(password, 10)
      .then((hash) => {
        const user = new User({
          email: email,
          password: hash,
        });
        user
          .save()
          .then(() => res.status(httpStatus.CREATED).json({ message: "User created" }))
          .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "User not created" }));
      })
      .catch((error) => res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error, message: "" }));
  } else {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message:
        "the email or pasword format is incorrect. The password must contain at least 8 characters (3 upper case, 3 lower case and 3 numbers).",
    });
  }
};

// login
exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (!user) {
        return res.status(httpStatus.UNAUTHORIZED).json({ error: "User not found !" });
      }
      bcrypt
        .compare(req.body.password, user.password)
        .then((valid) => {
          if (!valid) {
            return res.status(httpStatus.UNAUTHORIZED).json({ error: "Incorrect password !" });
          }
          res.status(httpStatus.OK).json({
            userId: user._id,
            token: jwt.sign({ userId: user._id }, process.env.PRIVATE_KEY_JWT, {
              expiresIn: "24h",
            }),
          });
        })
        .catch((error) => res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error }));
    })
    .catch((error) => res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error }));
};
