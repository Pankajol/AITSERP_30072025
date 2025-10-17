import mongoose from "mongoose";

const MachineOutputSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "companyUser",
    },
    item: {
      type: mongoose.Schema.ObjectId,
      ref: "Item",
      required: true,
    },
    machine: {
      type: mongoose.Schema.ObjectId,
      ref: "Machine",
      required: true,
    },
    perDayOutput: {
      type: Number,
      required: [true, "Please provide the output per day"],
    },
    machineRunningCost: {
      type: Number,
      required: [true, "Please provide the machine running cost"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.MachineOutput ||
  mongoose.model("MachineOutput", MachineOutputSchema);
