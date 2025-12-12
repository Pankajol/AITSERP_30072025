// models/EmailTemplateModel.js
import mongoose from "mongoose";

const EmailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },         // internal name
    subject: { type: String, required: true },
    contentHtml: { type: String, required: true },  // HTML body from editor
    textPlain: { type: String, required: false },   // optional plain text
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: false },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", EmailTemplateSchema);
