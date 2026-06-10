const mongoose = require("mongoose");
const Attendance = require("../models/attendence");

// PUNCH STATUS
exports.getStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await Attendance.findOne({
      user: new mongoose.Types.ObjectId(userId),
      punchInTime: { $gte: today, $lt: tomorrow },
    }).sort({ punchInTime: -1 });

    return res.status(200).json({
      success: true,
      isPunchedIn: record ? !record.punchOutTime : false,
      record: record || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUNCH IN
exports.punchIn = async (req, res) => {
  try {
    const { userId, selfie, lat, lng } = req.body;
    
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const already = await Attendance.findOne({ user: userObjectId, punchOutTime: null });
    if (already) return res.status(400).json({ success: false, message: "Already punched in" });

    const attendance = await Attendance.create({
      user: userObjectId,
      punchInTime: new Date(),
      selfieIn: selfie,
      locationIn: { lat, lng },
      status: "incomplete",
    });

    return res.status(200).json({ success: true, message: "Punch In successful", attendance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/// ================= PUNCH OUT =================
exports.punchOut = async (req, res) => {
  try {
    const { userId, selfie, lat, lng } = req.body;

    const attendance = await Attendance.findOne({
      user: userId,
      punchOutTime: null,
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: "No active punch-in found." });
    }

    const punchOutTime = new Date();
    const diffInMs = punchOutTime - new Date(attendance.punchInTime);
    const totalHours = diffInMs / (1000 * 60 * 60); 

    attendance.punchOutTime = punchOutTime;
    attendance.selfieOut = selfie;
    attendance.locationOut = { lat, lng };
    attendance.totalHours = parseFloat(totalHours.toFixed(2)); // Number() की जगह parseFloat
    attendance.status = totalHours >= 8 ? "completed" : "incomplete";

    await attendance.save();

    return res.status(200).json({ success: true, message: "Punched out successfully", attendance });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= OVERTIME REQUEST =================
exports.requestOvertime = async (req, res) => {
  try {
    const { attendanceId, hoursRequested } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) return res.status(404).json({ success: false, message: "Record not found" });

    if (parseFloat(attendance.totalHours) < 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Overtime denied. You worked only ${attendance.totalHours} hrs.` 
      });
    }

    attendance.overtimeRequested = parseFloat(hoursRequested);
    attendance.overtimeStatus = "pending";
    await attendance.save();

    return res.status(200).json({ success: true, message: "Request submitted", attendance });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// ================= GET ATTENDANCE HISTORY =================
exports.getHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Looking for history for User ID:", userId); // ये लाइन टर्मिनल में एरर का कारण बताएगी
    
    if (!userId || userId === "undefined") {
      return res.status(400).json({ success: false, message: "Invalid User ID" });
    }

    const history = await Attendance.find({ user: userId }).sort({ punchInTime: -1 });
    return res.status(200).json({ success: true, history });
  } catch (err) {
    console.error("CRITICAL ERROR IN getHistory:", err); // यहाँ पूरा एरर स्टैक दिखेगा
    return res.status(500).json({ success: false, message: err.message });
  }
};