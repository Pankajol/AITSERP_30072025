import mongoose from "mongoose";

const GateEntrySchema = new mongoose.Schema(
  {
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: "Company"     },
    societyId:     { type: mongoose.Schema.Types.ObjectId, ref: "Society",    required: true },
    gateName:      { type: String, default: "Main Gate" },
    entryType:     { type: String, enum: ["IN", "OUT"],                        required: true },
    category:      { type: String, enum: ["Person","Bike","Car","Truck","Other"], required: true },
    personName:    { type: String, default: "" },
    vehicleNumber: { type: String, default: "" },
    purpose:       { type: String, default: "" },
    contactNumber: { type: String, default: "" },
    timestamp:     { type: Date, default: Date.now },
    recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

GateEntrySchema.index({ societyId: 1, timestamp: -1 });
GateEntrySchema.index({ companyId: 1, timestamp: -1 });

export default mongoose.models.GateEntry ||
  mongoose.model("GateEntry", GateEntrySchema);




// import mongoose from "mongoose";   // ✅ ये लाइन ज़रूरी है

// const GateEntrySchema = new mongoose.Schema({
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
//   societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
//   gateName: String,
//   entryType: { type: String, enum: ["IN", "OUT"], required: true },
//   category: { type: String, enum: ["Person", "Bike", "Car", "Truck", "Other"], required: true },
//   personName: String,
//   vehicleNumber: String,
//   purpose: String,
//   contactNumber: String,
//   timestamp: { type: Date, default: Date.now },
//   recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
// }, { timestamps: true });

// export default mongoose.models.GateEntry || mongoose.model("GateEntry", GateEntrySchema);