import mongoose from "mongoose";

const PriceListSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * ❗ Rule:
 * One company can have only ONE default price list
 */
PriceListSchema.index(
  { companyId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export default mongoose.models.PriceList ||
  mongoose.model("PriceList", PriceListSchema);
