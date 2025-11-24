import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },

  date: { type: String, required: true }, // YYYY-MM-DD

  punchIn: {
    time: String,
    latitude: Number,
     timestamp: Number,
    longitude: Number,
    withinGeofence: { type: Boolean, default: true }
  },

  punchOut: {
    time: String,
    latitude: Number,
     timestamp: Number,
    longitude: Number,
    withinGeofence: { type: Boolean, default: true }
  },

  totalHours: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["Present","Half Day","Absent","Geo-Violation"],
    default: "Present"
  },

}, { timestamps: true });

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
