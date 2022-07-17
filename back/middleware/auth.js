const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const httpStatus = require("http-status");
dotenv.config();

module.exports = (req, res, next) => {
  try {
    // (0 = bearer, 1 = token)
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.PRIVATE_KEY_JWT);
    const userId = decodedToken.userId;
    req.auth = {
      userId: userId,
    };
    next();
  } catch (error) {
    res.status(httpStatus.FORBIDDEN).json({
      error,
      message: "Need to login first",
    });
  }
};
