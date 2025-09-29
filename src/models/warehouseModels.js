import mongoose from "mongoose";

// ✅ Sub-schema for Bin Locations (Sub-warehouses)
const BinLocationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true }, // Unique code for bin
    aisle: { type: String, trim: true },
    rack: { type: String, trim: true },
    bin: { type: String, trim: true },
    maxCapacity: { type: Number, default: 0 },
  },
  { _id: true } // keep _id for each bin location
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
      unique: true, 
      trim: true, 
      uppercase: true 
    },
    warehouseName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    account: { type: String, required: true },
    company: { type: String, required: true }, 
    phoneNo: { type: String },
    mobileNo: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "State", 
      required: true 
    },
    pin: { type: String, required: true },
    country: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Country", 
      required: true 
    },
    warehouseType: { 
      type: String, 
     
    // Only main/transit warehouses, bins inside
    },
    defaultInTransit: { type: Boolean, default: false },

    // ✅ Array of Bin Locations
    binLocations: [BinLocationSchema],
  },
  { timestamps: true }
);

// ✅ Compound index for uniqueness per company
WarehouseSchema.index({ warehouseCode: 1, companyId: 1 }, { unique: true });

export default mongoose.models.Warehouse ||
  mongoose.model("Warehouse", WarehouseSchema);


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
