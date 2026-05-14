import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.models.Attachment || mongoose.model("Attachment", AttachmentSchema);
