import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true }, // 👈 add this
  creatBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }, // 👈 add this
  title: { type: String, required: true },
  description:{ type: String },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],
  status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  progress: { type: Number, default: 10 },
  // project date
  projectedStartDate: {type: Date},
  projectedEndDate: {type: Date},
 
  subTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubTask" }],
   comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  // actual date
  startDate: {type: Date},
  endDate: {type: Date},
  dueDate: Date,
  labels: [String],
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model("TaskCompany", TaskSchema);