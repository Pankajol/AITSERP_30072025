import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true }, // 👈 add this
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true },
  description: String,
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],
  status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  dueDate: Date,
  labels: [String],
}, { timestamps: true });

export default mongoose.models.Task || mongoose.model("Task", TaskSchema);



// import mongoose from "mongoose";

// const TaskSchema = new mongoose.Schema({
//   project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
//   title: { type: String, required: true },
//   description: String,
//   status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
//   priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
//   assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],

//   dueDate: Date,
//   labels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Label" }],
// }, { timestamps: true });

// export default mongoose.models.Task || mongoose.model("Task", TaskSchema);
