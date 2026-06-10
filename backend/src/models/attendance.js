const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        punchInTime: Date,
        punchOutTime: Date,

        selfieIn: String,
        selfieOut: String,

        locationIn: {
            lat: Number,
            lng: Number,
        },

        locationOut: {
            lat: Number,
            lng: Number,
        },

        totalHours: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ["completed", "incomplete"],
            default: "incomplete",
        },

        // Attendance Validation
        verificationStatus: {
            type: String,
            enum: ["pending", "valid", "invalid"],
            default: "pending",
        },

        remarks: {
            type: String,
            default: "",
        },

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        verifiedAt: {
            type: Date,
            default: null,
        },

        // Overtime
        overtimeRequested: {
            type: Number,
            default: 0,
        },

        overtimeStatus: {
            type: String,
            enum: ["none", "pending", "approved", "rejected"],
            default: "none",
        },

        overtimeApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        overtimeApprovedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);