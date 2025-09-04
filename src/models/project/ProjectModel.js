import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,

    // Correct: project belongs to a workspace
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Correct: project owner is a CompanyUser
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
    },

    // Project members
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }],

    status: {
      type: String,
      enum: ["active", "on-hold", "completed"],
      default: "active",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);
