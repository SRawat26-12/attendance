const express=require("express")
const router=express.Router();
const punchController=require("../controllers/punchController")
const managerController=require("../controllers/managerController")
router.get("/getTeamAttendance", managerController.getTeamAttendance);
router.post("/validate",managerController.validateAttendance)
router.post("/overTimeAction",managerController.overtimeAction)
router.get("/getPendingOvertime", managerController.getPendingOvertime);
router.get("/downloadcsv",managerController.exportTeamAttendanceCSV)
module.exports=router;