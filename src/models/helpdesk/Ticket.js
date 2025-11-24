import mongoose from "mongoose";

const TicketMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    message: { type: String, required: true },
    aiSuggested: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TicketSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    subject: { type: String, required: true },
    category: { type: String, default: "general" },
    status: { type: String, default: "open" },
    priority: { type: String, default: "normal" },
    messages: [TicketMessageSchema],
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Ticket ||
  mongoose.model("Ticket", TicketSchema);
