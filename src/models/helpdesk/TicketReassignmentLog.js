import mongoose from "mongoose";

const TicketReassignmentLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },

    fromAgent: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    toAgent: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },

    reason: {
      type: String,
      enum: ["LEAVE", "HOLIDAY", "SICK", "INACTIVE", "AUTO_ROTATION"],
      required: true,
    },

    triggeredBy: {
      type: String,
      enum: ["CRON", "SYSTEM", "ADMIN"],
      default: "CRON",
    },

    reassignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.TicketReassignmentLog ||
  mongoose.model("TicketReassignmentLog", TicketReassignmentLogSchema);
