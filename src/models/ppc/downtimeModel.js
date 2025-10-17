import mongoose from "mongoose";

const DowntimeSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "Operator", required: true },
    fromTime: { type: Date, required: true },
    toTime: { type: Date, required: true },
    stopReason: { type: String, required: true },
    remarks: { type: String, default: "" },
    durationMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

// Auto-calculate downtime duration before saving
DowntimeSchema.pre("save", function (next) {
  if (this.fromTime && this.toTime) {
    const diffMs = new Date(this.toTime) - new Date(this.fromTime);
    this.durationMinutes = Math.max(0, Math.round(diffMs / 60000)); // convert to minutes
  }
  next();
});

export default mongoose.models.Downtime || mongoose.model("Downtime", DowntimeSchema);
