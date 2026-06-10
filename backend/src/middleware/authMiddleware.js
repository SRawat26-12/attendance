const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User not found with this token" });
      }

      if (req.user.isActive === false) {
        return res.status(401).json({ 
          success: false, 
          message: "Your account has been deactivated. Please contact admin." 
        });
      }

      next(); 
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

exports.isManager = (req, res, next) => {
  if (req.user && req.user.role === "manager") {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: "Access Denied: Only Manager can access this resource" 
    });
  }
};

exports.isAdmin = (req, res, next) => {
  console.log("Logged in user:", req.user);
  if (req.user && req.user.role === "admin") {
    next(); 
  } else {
    return res.status(403).json({ 
      success: false, 
      message: "Access Denied: Only Admin can access this resource" 
    });
  }
};