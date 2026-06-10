const express=require("express")
const router=express.Router()
const adminController=require("../controllers/adminController")
router.get("/getusers", adminController.getAllUsers);
router.post("/create-user", adminController.createUser);
router.get("/all-attendance",adminController.getAllAttendance)
router.get("/getManager",adminController.getManagers)
router.post("/validate",adminController.validateAttendance)
router.post("/overtimeAction", adminController.overtimeAction);
router.patch("/deactivate/:userId",adminController.deactivateUser)
router.get("/dashboardstats",adminController.getDashboardStats)
router.get("/downloadcsv",adminController.exportAttendanceCSV)
module.exports=router;