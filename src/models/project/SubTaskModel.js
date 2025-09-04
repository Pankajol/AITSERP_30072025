import mongoose from "mongoose";

const SubTaskSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.SubTask || mongoose.model("SubTask", SubTaskSchema);
