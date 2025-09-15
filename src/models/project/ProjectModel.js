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
    // projected date
    projectedStartDate: {type: Date},
    projectedEndDate: {type: Date},


    // actual date
    startDate: {type: Date},
    endDate: {type: Date},


    dueDate:{type: Date},
 

    progress: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    costingBilling:  { type: Number, default: 0 },
    estimatedCosting: { type: Number, default: 0 },
    defaultCostCenter: { type: Number, default: 0 },
    // billingAmount: { type: Number, default: 0 },

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
