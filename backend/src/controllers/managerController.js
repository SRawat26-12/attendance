const Attendance = require("../models/attendence");
const User = require("../models/User");


exports.getTeamAttendance = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { month, year } = req.query; 

    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || (new Date().getMonth() + 1);

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const employees = await User.find({ manager: managerId }).select('_id');
    const employeeIds = employees.map(emp => emp._id);

    const records = await Attendance.find({ 
        user: { $in: employeeIds },
        createdAt: { $gte: startDate, $lte: endDate } 
      })
      .populate("user", "name email") 
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
};

exports.validateAttendance = async (req, res) => {
  try {
    const { attendanceId, status, remarks } = req.body;
  
    const attendance = await Attendance.findById(attendanceId).populate('user');
    
    if (!attendance) {
        return res.status(404).json({ 
          success: false, 
          message: "Attendance not found"
         });
    }
    const managerId = req.user._id.toString();
    const attendanceManagerId = attendance.user.manager.toString(); 

    if (attendanceManagerId !== managerId) {
       return res.status(403).json({ 
        success: false, 
        message: "Unauthorized"
       });
    }

    attendance.verificationStatus = status;
    attendance.remarks = remarks || "";
    attendance.verifiedBy = req.user._id;
    attendance.verifiedAt = new Date();
    
    await attendance.save();

    res.status(200).json({
       success: true,
        updated: attendance
       });
  } catch (err) {
    console.error("Validate Error:", err);
    res.status(500).json({ 
      success: false,
       message: err.message
       });
  }
};

exports.overtimeAction = async (req, res) => {
  try {
    const { attendanceId, action, remarks } = req.body;
    const attendance = await Attendance.findById(attendanceId);

    if (action === "approved" && attendance.overtimeStatus !== "approved") {
      attendance.totalHours = (attendance.totalHours || 0) + (attendance.overtimeRequested || 0);
      attendance.overtimeApprovedHours = attendance.overtimeRequested;
    }

    attendance.overtimeStatus = action;
    attendance.remarks = remarks || attendance.remarks;
    attendance.overtimeApprovedBy = req.user._id;
    attendance.overtimeApprovedAt = new Date();
    
    await attendance.save();
    res.status(200).json({ success: true, updated: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



exports.getPendingOvertime = async (req, res) => {
  try {
    const managerId = req.user._id;
    const employees = await User.find({ manager: managerId }).select('_id');
    const employeeIds = employees.map(emp => emp._id);

    const pendingRecords = await Attendance.find({
      user: { $in: employeeIds },
      overtimeStatus: "pending" 
    })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true,
       records: pendingRecords
       });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Error fetching pending OT"
     });
  }
};

exports.exportTeamAttendanceCSV = async (req, res) => {
  try {
    const { month, year } = req.query;
    const managerId = req.user._id; 

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const teamUsers = await User.find({ manager: managerId }).select('_id');
    const records = await Attendance.find({
      user: { $in: teamUsers.map(u => u._id) },
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('user', 'email');

    let csvData = "Email,Punch In,Punch Out,Total Hours,Status,Remarks\n";
    records.forEach(r => {
      csvData += `${r.user?.email || "N/A"},${r.punchInTime},${r.punchOutTime || ""},${r.totalHours || 0},${r.verificationStatus},"${r.remarks || ''}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=Team_Report_${month}_${year}.csv`);
    return res.status(200).send(csvData);
  } catch (err) {
    res.status(500).json({ message: "Error generating CSV" });
  }
};