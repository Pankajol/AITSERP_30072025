import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: true },
  type: { type: String, enum: ["task-assigned", "comment", "due-reminder"], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },      // 👈 linked task
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" } // 👈 linked project
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);




// import mongoose from "mongoose";

// const NotificationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: true },
//   type: { type: String, enum: ["task-assigned", "comment", "due-reminder"], required: true },
//   message: { type: String, required: true },
//   read: { type: Boolean, default: false }
// }, { timestamps: true });

// export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
