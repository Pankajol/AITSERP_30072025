import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: true },
  comments: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
