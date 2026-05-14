import mongoose from "mongoose";

// Sub-schema for Bin Locations
const BinLocationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    aisle: { type: String, trim: true, default: "" },
    rack: { type: String, trim: true, default: "" },
    bin: { type: String, trim: true, default: "" },
    maxCapacity: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
  },
  { _id: true }
);

const WarehouseSchema = new mongoose.Schema(
  {
    companyId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Company", 
      required: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "CompanyUser" 
    },
    warehouseCode: { 
      type: String, 
      required: true, 
      trim: true, 
      uppercase: true 
    },
    warehouseName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    account: { type: String, required: true, default: "" },
    company: { type: String, required: true, default: "" }, 
    phoneNo: { type: String, default: "" },
    mobileNo: { type: String, default: "" },
    email: { type: String, default: "" },
    addressLine1: { type: String, required: true, default: "" },
    addressLine2: { type: String, default: "" },
    city: { type: String, required: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pin: { type: String, required: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    warehouseType: { 
      type: String, 
      enum: ["Main", "Transit", "Cold Storage", "Bonded", "Distribution"],
      default: "Main"
    },
    defaultInTransit: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false, index: true },
    status: { 
      type: String, 
      enum: ["Active", "Inactive", "Under Maintenance"],
      default: "Active" 
    },
    binLocations: [BinLocationSchema],
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    managerName: { type: String, default: "" },
    openingDate: { type: Date, default: Date.now },
    closingDate: { type: Date },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

// Compound index for uniqueness per company
WarehouseSchema.index({ warehouseCode: 1, companyId: 1 }, { unique: true });
WarehouseSchema.index({ companyId: 1, isDefault: 1 });

// Pre-save middleware to ensure only one default warehouse per company
WarehouseSchema.pre('save', async function(next) {
  if (this.isDefault) {
    const Warehouse = mongoose.model('Warehouse');
    await Warehouse.updateMany(
      { companyId: this.companyId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static method to get default warehouse
WarehouseSchema.statics.getDefaultWarehouse = async function(companyId) {
  let defaultWarehouse = await this.findOne({ companyId, isDefault: true, status: "Active" });
  if (!defaultWarehouse) {
    defaultWarehouse = await this.findOne({ companyId, status: "Active" });
  }
  return defaultWarehouse;
};

// Method to check if bin code exists
WarehouseSchema.methods.binCodeExists = function(binCode) {
  return this.binLocations.some(bin => bin.code === binCode);
};

// Virtual for full address
WarehouseSchema.virtual('fullAddress').get(function() {
  const parts = [this.addressLine1, this.addressLine2, this.city, this.state, this.pin, this.country];
  return parts.filter(part => part && part.trim()).join(', ');
});

WarehouseSchema.set('toJSON', { virtuals: true });
WarehouseSchema.set('toObject', { virtuals: true });

const Warehouse = mongoose.models.Warehouse || mongoose.model("Warehouse", WarehouseSchema);
export default Warehouse;

// import mongoose from "mongoose";

// const WarehouseSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser" },
//     warehouseCode: { type: String, required: true, unique: true },
//     warehouseName: { type: String, required: true },
//     parentWarehouse: { type: String },
//     account: { type: String, required: true },
//     company: { type: String, required: true },
//     phoneNo: { type: String, required: true },
//     mobileNo: { type: String },
//     addressLine1: { type: String, required: true },
//     addressLine2: { type: String },
//     city: { type: String, required: true },
//     state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
//     pin: { type: String, required: true },
//     country: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true },
//     warehouseType: { type: String, required: true },
//     defaultInTransit: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Warehouse ||
//   mongoose.model("Warehouse", WarehouseSchema);
