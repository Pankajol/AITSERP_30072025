import mongoose from "mongoose";

const PriceListItemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    priceListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceList",
      required: true,
      index: true,
    },

    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    // ✅ Rate
    sellingPrice: { type: Number, required: true, min: 0 },

    // ✅ GST
    gstPercent: { type: Number, default: 18, min: 0, max: 100 },

    // ✅ Discount
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },

    // ✅ Validity
    validFrom: { type: Date },
    validUpto: { type: Date },

    // ✅ Extra fields (ERP style)
    currency: { type: String, default: "INR" },
    buying: { type: Boolean, default: false },
    selling: { type: Boolean, default: true },
    batchNo: { type: String, trim: true },
    note: { type: String, trim: true },
    leadTimeDays: { type: Number, default: 0, min: 0 },
    packingUnit: { type: Number, default: 0, min: 0 },
    uom: { type: String, trim: true },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// ✅ Unique constraint
PriceListItemSchema.index(
  { companyId: 1, priceListId: 1, itemId: 1, warehouseId: 1 },
  { unique: true }
);

export default mongoose.models.PriceListItem ||
  mongoose.model("PriceListItem", PriceListItemSchema);




// import mongoose from "mongoose";

// const PriceListItemSchema = new mongoose.Schema(
//   {
//     /* ================= COMPANY ================= */
//     companyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Company",
//       required: true,
//       index: true,
//     },

//     /* ================= PRICE LIST ================= */
//     priceListId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "PriceList",
//       required: true,
//       index: true,
//     },

//     /* ================= ITEM ================= */
//     itemId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Item",
//       required: true,
//       index: true,
//     },

//     /* ================= WAREHOUSE ================= */
//     warehouseId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Warehouse",
//       required: true,
//       index: true,
//     },

//     /* ================= PRICING ================= */
//     sellingPrice: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     gstPercent: {
//       type: Number,
//       default: 18,
//       min: 0,
//     },

//     /* ================= STATUS ================= */
//     active: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// /* =================================================
//    🔒 UNIQUE CONSTRAINT (VERY IMPORTANT)
//    One price per:
//    company + priceList + item + warehouse
// ================================================= */
// PriceListItemSchema.index(
//   {
//     companyId: 1,
//     priceListId: 1,
//     itemId: 1,
//     warehouseId: 1,
//   },
//   { unique: true }
// );

// export default mongoose.models.PriceListItem ||
//   mongoose.model("PriceListItem", PriceListItemSchema);
