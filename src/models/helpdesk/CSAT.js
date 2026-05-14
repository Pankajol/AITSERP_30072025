import mongoose from "mongoose";

const CSATSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
}, { timestamps: true });

export default mongoose.models.CSAT || mongoose.model("CSAT", CSATSchema);
