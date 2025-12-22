import mongoose from "mongoose";

const EmailMasterSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

  email: {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  index: true,
},
  purpose: { type: String, default: "" },
  service: { type: String, default: "gmail" }, // gmail / outlook / custom
  recoveryEmail: { type: String, default: "" },
  owner: { type: String, default: "" },

  maskedAppPassword: { type: String, default: "" }, // UI visible masked password
  encryptedAppPassword: { type: String, required: true }, // encrypted real app password

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  notes: { type: String, default: "" },
  lastUpdatedBy: { type: String, default: "" },

}, { timestamps: true });

EmailMasterSchema.index({ companyId: 1, email: 1 }, { unique: true });
export default mongoose.models.EmailMaster ||
  mongoose.model("EmailMaster", EmailMasterSchema);
