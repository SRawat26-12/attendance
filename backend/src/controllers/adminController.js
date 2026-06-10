const User = require("../models/user");
const Attendance = require("../models/attendance"); 
const bcrypt = require("bcryptjs");


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('manager', 'name'); 
    res.status(200).json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, manager } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with this email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      manager: role === "employee" ? manager : null,
    });

    res.status(201).json({ 
      success: true, 
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`, 
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error creating user: " + err.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { month, year } = req.query; 

    
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || (new Date().getMonth() + 1);

  
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .populate({
        path: "user",
        select: "name email manager", 
        populate: { path: "manager", select: "name" } 
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error: " + err.message });
  }
};


exports.getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: "manager" }).select("name _id");
    res.status(200).json({ success: true, count: managers.length, managers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching managers: " + err.message });
  }
};

exports.validateAttendance = async (req, res) => {
  try {
    const { attendanceId, status, remarks } = req.body;
    
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found" });
    }

    attendance.verificationStatus = status;
    attendance.verifiedBy = req.user._id;
    attendance.verifiedAt = new Date();

   
    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    await attendance.save();
    res.status(200).json({ success: true, message: "Attendance status updated by Admin!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error: " + err.message });
  }
};


exports.overtimeAction = async (req, res) => {
  try {
    const { attendanceId, action, remarks } = req.body; 

    const attendance = await Attendance.findById(attendanceId).populate('user');
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance not found" });

    const isManager = attendance.user.manager && attendance.user.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isManager && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (action === "approved" && attendance.overtimeStatus !== "approved") {
      const requestedHours = attendance.overtimeRequested || 0;
      attendance.totalHours = (attendance.totalHours || 0) + requestedHours;
      attendance.overtimeApprovedHours = requestedHours;
    }

    attendance.overtimeStatus = action;
    attendance.overtimeApprovedBy = req.user._id;
    attendance.overtimeApprovedAt = new Date();

   
    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    await attendance.save();
    res.status(200).json({ success: true, message: `Overtime ${action} by Admin!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params; 

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const currentIsActive = currentUser.isActive !== false; 
    const newStatus = !currentIsActive;

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { isActive: newStatus }, 
      { new: true }
    );

    const actionMessage = newStatus ? "activated" : "deactivated";

    res.status(200).json({ 
      success: true, 
      message: `User ${actionMessage} successfully!`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        isActive: updatedUser.isActive
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const totalUsers = await User.countDocuments();
    const pendingVerifications = await Attendance.countDocuments({ verificationStatus: 'pending' });
    const activePunches = await Attendance.countDocuments({ 
      punchOut: { $exists: false }, 
      createdAt: { $gte: today } 
    });

    res.status(200).json({ 
      success: true, 
      stats: { totalUsers, pendingVerifications, activePunches } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportAttendanceCSV = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate({
      path: "user",
      select: "name email",
      populate: { path: "manager", select: "name" }
    });

    let csvData = "Employee Name,Email,Manager,Verification Status,Punch In/Out Time,Created At\n";

  
    records.forEach(record => {
      const name = record.user?.name || "N/A";
      const email = record.user?.email || "N/A";
      const manager = record.user?.manager?.name || "N/A";
      const status = record.verificationStatus || "pending";
      const createdAt = new Date(record.createdAt).toLocaleString();

      csvData += `"${name}","${email}","${manager}","${status.toUpperCase()}","${createdAt}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${month}_${year}.csv`
    );

  
    return res.status(200).send(csvData);

  } catch (err) {
    console.error("Export CSV Error:", err);
    res.status(500).json({ message: "Server error while exporting CSV" });
  }
};