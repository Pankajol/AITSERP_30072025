import mongoose from "mongoose";

const SubTaskSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    title: { type: String, required: true },
    description: String,
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],
    dueDate: Date,
    projectedStartDate: Date,
    projectedEndDate: Date,
    startDate: Date,
    endDate: Date,
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    progress: { type: Number, default: 10 },
    status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  },
  { timestamps: true }
);

export default mongoose.models.SubTask || mongoose.model("SubTask", SubTaskSchema);
