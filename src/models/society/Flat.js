import mongoose from "mongoose";

const flatSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },   // ✅ यह लाइन जोड़ो
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  
  block: String,
  floor: String,
  flatNumber: { type: String, required: true },
  flatType: { type: String, enum: ["1BHK", "2BHK", "3BHK", "Penthouse", "Office"] },
  area: Number,
  isOccupied: { type: Boolean, default: false },
}, { timestamps: true });

flatSchema.index({ societyId: 1, buildingId: 1, flatNumber: 1 }, { unique: true });

export default mongoose.models.Flat || mongoose.model("Flat", flatSchema);


// // models/Flat.js
// import mongoose from "mongoose";

// const flatSchema = new mongoose.Schema({
//   societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true }, // एजेंसी (डिनॉर्मलाइज़)

//   block: String,               // "A", "B"
//   floor: String,               // "1", "2"
//   flatNumber: { type: String, required: true }, // "101"
//   flatType: { type: String, enum: ["1BHK", "2BHK", "3BHK", "Penthouse", "Office"] },
//   area: Number,                // sqft
//   isOccupied: { type: Boolean, default: false },
// }, { timestamps: true });

// flatSchema.index({ societyId: 1, flatNumber: 1 }, { unique: true });

// export default mongoose.models.Flat || mongoose.model("Flat", flatSchema);