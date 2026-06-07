import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  creatBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  title: { type: String, required: true },
  description: { type: String },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],
  status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  progress: { type: Number, default: 10 },
  projectedStartDate: { type: Date },
  projectedEndDate: { type: Date },
  subTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubTask" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  startDate: { type: Date },
  endDate: { type: Date },
  dueDate: Date,
  labels: [String],

  // ---------- NEW CRM FIELDS ----------
  relatedTo: {
    model: { type: String, enum: ["Lead", "Opportunity", "Customer", null], default: null },
    id: { type: mongoose.Schema.Types.ObjectId, refPath: "relatedTo.model" },
  },
  reminderAt: { type: Date },
  reminderSent: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

// Index for reminders
TaskSchema.index({ reminderAt: 1, reminderSent: 1 });

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);