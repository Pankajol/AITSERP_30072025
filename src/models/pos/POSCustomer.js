import mongoose from "mongoose";

const POSCustomerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // link if already exists in ERP
    customerRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    gstin: {
      type: String,
      trim: true,
    },

    isWalkIn: {
      type: Boolean,
      default: true,
    },

    lastPurchaseAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.POSCustomer ||
  mongoose.model("POSCustomer", POSCustomerSchema);
