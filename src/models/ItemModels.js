import mongoose from "mongoose";

const QualityCheckSchema = new mongoose.Schema({
  srNo:      { type: String },
  parameter: { type: String },
  min:       { type: String },
  max:       { type: String },
});

const POSConfigSchema = new mongoose.Schema(
  {
    barcode:            { type: String, trim: true },
    posPrice:           { type: Number },
    allowDiscount:      { type: Boolean, default: true },
    maxDiscountPercent: { type: Number, default: 100 },
    taxableInPOS:       { type: Boolean, default: true },
    showInPOS:          { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * Variant Schema
 * Each item can have multiple variants (e.g. size, diameter, grade).
 * Variant-level `price` overrides the base `salesPrice`.
 * Variant-level `attributes` is a key→value map (e.g. { Size: "10mm" }).
 */
const VariantSchema = new mongoose.Schema(
  {
    sku:        { type: String, trim: true },
    attributes: { type: Map, of: String, default: {} },  // { Size: "10mm", Grade: "Fe500D" }
    price:      { type: Number },       // overrides base salesPrice if set
    quantity:   { type: Number, default: 0 },
    imageUrl:   { type: String },
    barcode:    { type: String, trim: true },
    posPrice:   { type: Number },
  },
  { _id: true, timestamps: false }
);

const ItemSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────────
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    itemCode:    { type: String, required: true },
    itemName:    { type: String, required: true },
    description: { type: String },

    // ── Category & Classification ────────────────────────────────
    category:  { type: String, required: true },
    itemGroup: { type: String },   // 📱 Mobile: category display & filter

    // ── Pricing ─────────────────────────────────────────────────
    unitPrice:  { type: Number, required: true },
    salesPrice: { type: Number },  // 📱 Mobile: store-facing selling price
    mrp:        { type: Number },  // 📱 Mobile: MRP for discount % calculation

    // ── Units & Measurement ──────────────────────────────────────
    unit:           { type: String, default: "piece" },  // 📱 Mobile: piece, kg, metre, etc.
    weightPerPiece: { type: Number },                    // 📱 Mobile: for weight calculator
    length:         { type: Number },
    width:          { type: Number },
    height:         { type: Number },
    weight:         { type: Number },

    // ── Stock ────────────────────────────────────────────────────
    quantity:      { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },         // 📱 Mobile: current stock count
    inStock:       { type: Boolean, default: true },     // 📱 Mobile: available for purchase
    reorderLevel:  { type: Number },
    leadTime:      { type: Number },

    // ── Images ──────────────────────────────────────────────────
    imageUrl: { type: String },
    images:   [{ type: String }],  // 📱 Mobile: array of image URLs

    // ── Mobile Store Flags ───────────────────────────────────────
    isFeatured: { type: Boolean, default: false },  // 📱 Mobile: show in featured carousel

    // ── Variants ────────────────────────────────────────────────
    variants:    [VariantSchema],
    variantType: { type: String },  // 📱 Mobile: axis label e.g. "Size", "Grade", "Diameter"

    // ── Item Classification ──────────────────────────────────────
    itemType:       { type: String },
    uom:            { type: String },
    managedBy:      { type: String },
    managedValue:   { type: String },
    batchNumber:    { type: String },
    expiryDate:     { type: Date },
    manufacturer:   { type: String },
    tags:           [{ type: String }],

    // ── Workflow Flags ───────────────────────────────────────────
    gnr:               { type: Boolean, default: false },
    delivery:          { type: Boolean, default: false },
    productionProcess: { type: Boolean, default: false },

    // ── POS ──────────────────────────────────────────────────────
    posEnabled: { type: Boolean, default: false },
    posConfig:  { type: POSConfigSchema, default: {} },

    // ── Quality Checks ───────────────────────────────────────────
    includeQualityCheck: { type: Boolean, default: false },
    qualityCheckDetails: [QualityCheckSchema],

    // ── GST ──────────────────────────────────────────────────────
    includeGST:  { type: Boolean, default: true },
    includeIGST: { type: Boolean, default: false },
    gstCode:     { type: String },
    gstName:     { type: String },
    gstRate:     { type: Number },
    cgstRate:    { type: Number },
    sgstRate:    { type: Number },
    igstCode:    { type: String },
    igstName:    { type: String },
    igstRate:    { type: Number },

    // ── Marketplace ───────────────────────────────────────────────
    vendorId:          { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    commissionPercent: { type: Number, default: 0 },
    isMarketplace:     { type: Boolean, default: false },
    bookingSlots: [
      {
        date:            Date,
        startTime:       String,
        endTime:         String,
        maxBookings:     Number,
        currentBookings: { type: Number, default: 0 },
      },
    ],

    // ── Status ────────────────────────────────────────────────────
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────
ItemSchema.index({ companyId: 1, posEnabled: 1, active: 1 });
ItemSchema.index({ companyId: 1, "posConfig.barcode": 1 });
ItemSchema.index({ companyId: 1, itemCode: 1 }, { unique: true });       // fast slug lookup
ItemSchema.index({ companyId: 1, itemGroup: 1, status: 1 });            // category filter
ItemSchema.index({ companyId: 1, isFeatured: 1, status: 1 });           // featured query

export default mongoose.models.Item || mongoose.model("Item", ItemSchema);
