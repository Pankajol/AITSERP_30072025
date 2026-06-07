import mongoose from "mongoose";

const NoticeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" }, // optional
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat" }, // optional
  title: { type: String, required: true },
  description: String,
  attachments: [String], // URLs (or file paths if file upload is added)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
  
  // ✨ Additional fields
  isImportant: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  expiryDate: { type: Date }, // notice becomes hidden after this date
  targetAudience: {
    type: String,
    enum: ["All", "Owners", "Tenants", "Staff", "Specific Flats"],
    default: "All"
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }], // track who read it
}, { timestamps: true });

// Indexes for performance
NoticeSchema.index({ societyId: 1, createdAt: -1 });
NoticeSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 }); // auto-expire if expiryDate set

export default mongoose.models.Notice || mongoose.model("Notice", NoticeSchema);