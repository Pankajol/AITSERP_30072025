import mongoose from "mongoose";

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId, // ✅ mongoose.Schema.Types.ObjectId
      ref: "CompanyUser",                   // ✅ matches your CompanyUser model
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompanyUser",                 // ✅ same here
      },
    ],
  },
  { timestamps: true } // ✅ options go OUTSIDE the field definitions
);

export default mongoose.models.Workspace ||
  mongoose.model("Workspace", WorkspaceSchema);
