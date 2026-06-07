import mongoose from "mongoose";

const GuardEntrySchema = new mongoose.Schema(
  {
    companyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Company",     required: true },
    employeeId:     { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    societyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Society",     required: true },
    // renamed from deploymentId → assignmentId to match GuardAssignment model
    assignmentId:   { type: mongoose.Schema.Types.ObjectId, ref: "GuardAssignment" },
    checkpointName: { type: String, required: true },
    checkpointType: { type: String, enum: ["IN", "OUT"], required: true },
    timestamp:      { type: Date, default: Date.now },
    latitude:       { type: Number, default: null },
    longitude:      { type: Number, default: null },
    withinGeofence: { type: Boolean, default: null },
  },
  { timestamps: true }
);

GuardEntrySchema.index({ employeeId: 1, societyId: 1, timestamp: -1 });
GuardEntrySchema.index({ companyId:  1, timestamp: -1 });

export default mongoose.models.GuardEntry ||
  mongoose.model("GuardEntry", GuardEntrySchema);




// // models/GuardEntry.js
// import mongoose from "mongoose";
// const GuardEntrySchema = new mongoose.Schema({
//   companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//   employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
//   societyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
//   deploymentId:{ type: mongoose.Schema.Types.ObjectId, ref: "Deployment" },
//   checkpointName: String,
//   checkpointType: { type: String, enum: ["IN", "OUT"], required: true },
//   timestamp:    { type: Date, default: Date.now },
//   latitude:     Number,
//   longitude:    Number,
//   withinGeofence: Boolean,
// }, { timestamps: true });
// GuardEntrySchema.index({ employeeId: 1, societyId: 1, timestamp: -1 });
// export default mongoose.models.GuardEntry || mongoose.model("GuardEntry", GuardEntrySchema);