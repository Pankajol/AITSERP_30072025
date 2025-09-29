// models/project/NotificationModel.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    type: {
      type: String,
      // ✅ Add valid values
      required: true,
    },
    message: { type: String, required: true },
    role: { type: String,   },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);




// import mongoose from "mongoose";

// const NotificationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: true },
//   type: { type: String, enum: ["task-assigned", "comment", "due-reminder"], required: true },
//   message: { type: String, required: true },
//   read: { type: Boolean, default: false }
// }, { timestamps: true });

// export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
