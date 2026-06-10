const express=require("express")
const router=express.Router();
const punchController=require("../controllers/punchController")
router.post("/punchIn",punchController.punchIn)
router.get("/status/:userId", punchController.getStatus);
router.post("/punchOut",punchController.punchOut)
router.post("/overtimeRequest",punchController.requestOvertime)
router.get("/gethistory/:userId",punchController.getHistory)
module.exports=router;