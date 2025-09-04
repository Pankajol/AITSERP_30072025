import mongoose from "mongoose";

// -------------------- SUBSCHEMAS --------------------

const SubtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ["open", "in_progress", "completed"], default: "open" }
}, { _id: false });

const MilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dueDate: Date,
  completed: { type: Boolean, default: false }
}, { _id: false });

// -------------------- MAIN MODELS --------------------

// 1. User
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  assignedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
}, { timestamps: true });

// 2. Team / Workspace
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }]
}, { timestamps: true });

// 3. Project / Board
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ["draft", "active", "completed", "archived"], default: "draft" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  milestones: [MilestoneSchema],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  startDate: Date,
  endDate: Date
}, { timestamps: true });

// 4. Task / Item
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ["open", "in_progress", "completed", "blocked"], default: "open" },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // multiple users
  subtasks: [SubtaskSchema],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attachment" }],
  dueDate: Date
}, { timestamps: true });

// 5. Comment / Update
const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
}, { timestamps: true });

// 6. Attachment
const AttachmentSchema = new mongoose.Schema({
  filename: String,
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" }
}, { timestamps: true });

// 7. Activity Log
const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // e.g. "assigned task", "updated status"
  targetModel: { type: String, required: true }, // "Task", "Project", etc.
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  meta: { type: Object } // extra details
}, { timestamps: true });

// -------------------- EXPORT MODELS --------------------

export const User = mongoose.model("User", UserSchema);
export const Team = mongoose.model("Team", TeamSchema);
export const Project = mongoose.model("Project", ProjectSchema);
export const Task = mongoose.model("Task", TaskSchema);
export const Comment = mongoose.model("Comment", CommentSchema);
export const Attachment = mongoose.model("Attachment", AttachmentSchema);
export const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);
export const Milestone = mongoose.model("Milestone", MilestoneSchema);
export const Subtask = mongoose.model("Subtask", SubtaskSchema);
