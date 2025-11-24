import mongoose from "mongoose";

const TicketCategorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    name: { type: String, required: true, unique: true },
    type: { type: String, default: "custom" }, // "default" | "custom"
  },
  { timestamps: true }
);

export default mongoose.models.TicketCategory ||
  mongoose.model("TicketCategory", TicketCategorySchema);
