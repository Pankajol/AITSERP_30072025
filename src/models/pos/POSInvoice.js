import mongoose from "mongoose";

const POSSaleSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "POSCustomer", required: true },
    
    // 🟢 ADD THIS FIELD: To store INV-XXXX-DDMMYYYY
    invoiceNo: { type: String, unique: true }, 

    items: [
      {
        inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
        itemName: String,
        qty: Number,
        price: Number,
        gstRate: Number, 
      },
    ],
    netTotal: Number,
    taxableAmount: Number,
    cgst: Number,
    sgst: Number,
    discount: {
      type: { type: String, enum: ["amount", "percent"] },
      value: Number,
    },
    grandTotal: Number,
    paymentReceived: Number,
    balanceReturned: Number,
    dueAmount: { type: Number, default: 0 },
    status: { type: String, default: "Completed" },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.POSSale || mongoose.model("POSSale", POSSaleSchema);


// import mongoose from "mongoose";

// const POSSaleSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     customerId: { type: mongoose.Schema.Types.ObjectId, ref: "POSCustomer", required: true },
//     items: [
//       {
//         inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
//         itemName: String,
//         qty: Number,
//         price: Number,
//       },
//     ],
//     netTotal: Number,
//     discount: {
//       type: { type: String, enum: ["amount", "percent"] },
//       value: Number,
//     },
//     grandTotal: Number,
//     paymentReceived: Number,
//     balanceReturned: Number,
//     status: { type: String, default: "Completed" },
//     soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.POSSale || mongoose.model("POSSale", POSSaleSchema);