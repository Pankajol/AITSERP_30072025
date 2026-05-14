import mongoose from "mongoose";

const { Schema } = mongoose;

// Schema for each invoice that this payment applies to
const AppliedInvoiceSchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, required: true },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },      // amount paid toward this invoice
  },
  { _id: false }
);

const PaymentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: "Company" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Transaction identification
    paymentNumber: { type: String, unique: true },   // auto-generated: PAY-001 or REC-001
    type: { type: String, enum: ["Payment", "Receipt"], required: true }, // Payment = out, Receipt = in
    paymentDate: { type: Date, default: Date.now, required: true },

    // Amount & accounts
    amount: { type: Number, required: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "AccountHead", required: true },

    // Party information
    partyType: { type: String, enum: ["Supplier", "Customer"], required: true },
    partyId: { type: Schema.Types.ObjectId, required: true }, // references Supplier or Customer
    partyName: { type: String, required: true },

    // Payment mode details
    paymentMode: { type: String, enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Card", "Other"], default: "Bank Transfer" },
    chequeNumber: { type: String, default: null },
    utrNumber: { type: String, default: null }, // also used for reference

    // Additional info
    narration: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Completed" },

    // Applied invoices (for allocation)
    appliedInvoices: { type: [AppliedInvoiceSchema], default: [] },
  },
  { timestamps: true }
);

// Auto-generate payment number based on type (PAY-xxx or REC-xxx)
PaymentSchema.pre("save", async function (next) {
  if (!this.paymentNumber) {
    const Counter = (await import("./Counter.js")).default;
    try {
      const prefix = this.type === "Payment" ? "PAY" : "REC";
      const counter = await Counter.findOneAndUpdate(
        { id: `payment_${prefix}` },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.paymentNumber = `${prefix}-${String(counter.seq).padStart(4, "0")}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);