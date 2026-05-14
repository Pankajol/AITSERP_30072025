// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["leave", "attendance", "system"],
      default: "system",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // 🔥 future use (optional)
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    referenceModel: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);