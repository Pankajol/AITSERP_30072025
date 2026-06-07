import mongoose from "mongoose";

const GuardAssignmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },  // ✅ नया
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },
    customShiftStart: String,
    customShiftEnd: String,
    startDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    dailyRate: Number,
  },
  { timestamps: true, collection: "guardassignments" }
);

// मल्टी‑टेनेंसी: एक ही कंपनी में एक यूज़र की एक ही असाइनमेंट
GuardAssignmentSchema.index(
  { companyId: 1, userId: 1 },
  { unique: true }
);

GuardAssignmentSchema.index({ companyId: 1, userId: 1, isActive: 1 });

export default mongoose.models.GuardAssignment || mongoose.model("GuardAssignment", GuardAssignmentSchema);




// import mongoose from "mongoose";

// const GuardAssignmentSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true, unique: true },
//     societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
//     shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },
//     customShiftStart: String,
//     customShiftEnd: String,
//     startDate: { type: Date, default: Date.now },
//     isActive: { type: Boolean, default: true },
//     dailyRate: Number,
//   },
//   { timestamps: true, collection: "guardassignments" }
// );

// export default mongoose.models.GuardAssignment || mongoose.model("GuardAssignment", GuardAssignmentSchema);