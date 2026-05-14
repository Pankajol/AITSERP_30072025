import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser",  },
  company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
}, { timestamps: true });


export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
