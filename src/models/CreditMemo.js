import mongoose from "mongoose";
import Counter from "@/models/Counter";
const { Schema } = mongoose;

const BatchSchema = new mongoose.Schema({
  batchNumber: { type: String },
  expiryDate: { type: Date }, 
  manufacturer: { type: String },
  batchQuantity: { type: Number, default: 0 },
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  // You might reference an Item collection if needed.
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  itemCode: { type: String, required: true },
  itemName: { type: String, required: true },
  itemDescription: { type: String},
  quantity: { type: Number, required: true },
  allowedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  gstType: { type: Number, default: 0 },
  priceAfterDiscount: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  cgstAmount: { type: Number, required: true },
  sgstAmount: { type: Number, required: true },
  igstAmount: { type: Number, required: true },
  managedBy: { type: String },
  batches: [BatchSchema],

  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  warehouseName: String,
  warehouseCode: String,
  taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
  managedByBatch: { type: Boolean, default: true },
});

const CreditNoteSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerCode: { type: String, required: true },
  customerName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  refNumber: { type: String, required: true },
  salesEmployee: { type: String },
  status: { type: String },
  postingDate: { type: Date },
  validUntil: { type: Date },
  documentDate: { type: Date },
  documentNumberCreditNote: { type: String, unique: true },
  paymentTerms: { type: String },
  items: [ItemSchema],
  remarks: { type: String },
  freight: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, required: true },
  gstTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  openBalance: { type: Number },
  fromQuote: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
   attachments: [
      {
        fileName: String,
        fileUrl: String, // e.g., /uploads/somefile.pdf
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
},
  { timestamps: true });

CreditNoteSchema.pre("save", async function (next) {
    if (this.documentNumberCreditNote) return next();
    try {
      const key = `CreditNote${this.companyId}`;
      const counter = await Counter.findOneAndUpdate(
        { id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
  
      const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Calculate financial year
  let fyStart = currentYear;
  let fyEnd = currentYear + 1;
  
  if (currentMonth < 4) {
    // Jan–Mar => part of previous FY
    fyStart = currentYear - 1;
    fyEnd = currentYear;
  }
  
  const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
  
  // Assuming `counter.seq` is your sequence number (e.g., 30)
  const paddedSeq = String(counter.seq).padStart(5, '0');
  
  // Generate final sales order number
  this.documentNumberCreditNote = `DN-/${financialYear}/${paddedSeq}`;
  
  
   
      next();
    } catch (err) {
      next(err);
    }
  });


export default mongoose.models.CreditNote || mongoose.model("CreditNote", CreditNoteSchema);


// import mongoose from "mongoose";

// const CreditMemoItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   allowedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstType: { type: Number, default: 0 },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   tdsAmount: { type: Number, default: 0 },
//   warehouse: { type: String },
//   errorMessage: { type: String }
// });

// const CreditMemoSchema = new mongoose.Schema({
//   customerCode: { type: String, required: true },
//   customerName: { type: String, required: true },
//   contactPerson: { type: String },
//   status: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
//   creditMemoDate: { type: Date, required: true },
//   referenceInvoice: { type: String },
//   items: [CreditMemoItemSchema],
//   remarks: { type: String },
//   totalBeforeDiscount: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   fromInvoice: { type: Boolean, default: false }
// }, {
//   timestamps: true // Adds createdAt and updatedAt fields
// });

// export default mongoose.models.CreditMemo || mongoose.model('CreditMemo', CreditMemoSchema);
