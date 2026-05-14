import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  size: { type: Number },
  mimeType: { type: String },
}, { timestamps: true });

export default mongoose.models.Attachment || mongoose.model("Attachment", AttachmentSchema);
