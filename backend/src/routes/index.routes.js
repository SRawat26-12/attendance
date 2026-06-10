const express = require("express");
const router = express.Router();

// Import Routes
const authRoute = require("./auth.route");
const punchRoute = require("./punch.route");
const managerRoute = require("./manager.route");
const adminRoute = require("./admin.route");


const { protect, isManager, isAdmin } = require("../middleware/authMiddleware");


router.use("/auth", authRoute);
router.use("/punch", protect, punchRoute);
router.use("/manager", protect, isManager, managerRoute);
router.use("/admin", protect, isAdmin, adminRoute); 

module.exports = router;