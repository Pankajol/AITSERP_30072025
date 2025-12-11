import mongoose from "mongoose";

import Counter from "@/models/Counter";
const { Schema } = mongoose;


const ItemSchema = new mongoose.Schema(
 {
     item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
     itemCode: { type: String },
     itemName: { type: String },
     itemDescription: { type: String },
     quantity: { type: Number, default: 0 },
     orderedQuantity: { type: Number, default: 0 },
     unitPrice: { type: Number, default: 0 },
     discount: { type: Number, default: 0 },
     freight: { type: Number, default: 0 },
     gstRate: { type: Number, default: 0 },
     taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
     priceAfterDiscount: { type: Number, default: 0 },
     totalAmount: { type: Number, default: 0 },
     gstAmount: { type: Number, default: 0 },
     cgstAmount: { type: Number, default: 0 },
     sgstAmount: { type: Number, default: 0 },
     igstAmount: { type: Number, default: 0 },
     tdsAmount: { type: Number, default: 0 },
     warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: false,default: null, },
     warehouseName: { type: String },
     warehouseCode: { type: String },
     stockAdded: { type: Boolean, default: false },
     managedBy: { type: String },
 
  
     removalReason: { type: String },
   },
);

const SalesQuotationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerCode: { type: String, required: true },
    customerName: { type: String, required: true },
    contactPerson: { type: String },
    refNumber: { type: String },
    status: { type: String, default: "Open" },
    postingDate: { type: Date },
    validUntil: { type: Date },
    documentDate: { type: Date },
    documentNumberQuatation: { type: String ,required:true },

    items: [ItemSchema],
    salesEmployee: { type: String },
    remarks: { type: String },
    freight: { type: Number, default: 0 },
    rounding: { type: Number, default: 0 },
    totalBeforeDiscount: { type: Number, default: 0 },
    totalDownPayment: { type: Number, default: 0 },
    appliedAmounts: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    openBalance: { type: Number, default: 0 },
   attachments: [
          {
            fileName: String,
            fileUrl: String, // e.g., /uploads/somefile.pdf
            fileType: String,
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
  },
  { timestamps: true }
);

 SalesQuotationSchema.index({ documentNumberQuatation: 1, companyId: 1 }, { unique: true });


// SalesQuotationSchema.pre("save", async function (next) {
//   if (this.documentNumberQuatation) return next();
//   try {
//     const key = `salesQuatation${this.companyId}`;
//     const counter = await Counter.findOneAndUpdate(
//   { id: key, companyId: this.companyId }, // Match on both
//   { 
//     $inc: { seq: 1 },
//     $setOnInsert: { companyId: this.companyId }  // Ensure it's set on insert
//   },
//   { new: true, upsert: true }
// );

//     const now = new Date();
// const currentYear = now.getFullYear();
// const currentMonth = now.getMonth() + 1;

// // Calculate financial year
// let fyStart = currentYear;
// let fyEnd = currentYear + 1;

// if (currentMonth < 4) {
//   // Jan–Mar => part of previous FY
//   fyStart = currentYear - 1;
//   fyEnd = currentYear;
// }

// const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;

// // Assuming `counter.seq` is your sequence number (e.g., 30)
// const paddedSeq = String(counter.seq).padStart(5, '0');

// // Generate final sales order number
// this.documentNumberQuatation = `Sal-QUA/${financialYear}/${paddedSeq}`;


//     // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

export default mongoose.models.SalesQuotation ||
  mongoose.model("SalesQuotation", SalesQuotationSchema);
