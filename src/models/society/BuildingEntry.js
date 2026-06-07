import mongoose from "mongoose";

const BuildingEntrySchema = new mongoose.Schema(
  {
    societyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Society",     required: true },
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company",     required: true },
    buildingName: { type: String, required: true, trim: true },
    flatId:       { type: mongoose.Schema.Types.ObjectId, ref: "Flat",        default: null },
    personName:   { type: String, required: true, trim: true },
    personType:   { type: String, default: "Staff" },
    phone:        { type: String, default: "" },
    entryType:    { type: String, enum: ["IN", "OUT"], required: true },
    purpose:      { type: String, default: "" },
    timestamp:    { type: Date,   default: Date.now },
    recordedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

BuildingEntrySchema.index({ societyId: 1, timestamp: -1 });
BuildingEntrySchema.index({ companyId: 1, timestamp: -1 });

export default mongoose.models.BuildingEntry ||
  mongoose.model("BuildingEntry", BuildingEntrySchema);




// import mongoose from "mongoose";

// const BuildingEntrySchema = new mongoose.Schema({
//   societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//   buildingName: { type: String, required: true },
//   personName: { type: String, required: true },
//   personType: { type: String,  default: "Staff" },
//   phone: String,
//   flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat" },  // ✅ नया फील्ड
//   entryType: { type: String, enum: ["IN", "OUT"], required: true },
//   purpose: String,
//   timestamp: { type: Date, default: Date.now },
//   recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
// }, { timestamps: true });

// export default mongoose.models.BuildingEntry || mongoose.model("BuildingEntry", BuildingEntrySchema);