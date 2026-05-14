import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  action: { type: String, required: true },
  details: String
}, { timestamps: true });

export default mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);
