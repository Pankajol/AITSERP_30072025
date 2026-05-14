import mongoose from "mongoose";
const { Schema } = mongoose;

const MachineSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },

    code: { type: String, required: true }, // <-- main unique field
    name: { type: String, required: true },
    model: { type: String },
    brandName: { type: String, required: true },
    productionCapacity: { type: String, required: true },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);



export default mongoose.models.Machine ||
  mongoose.model("Machine", MachineSchema);
