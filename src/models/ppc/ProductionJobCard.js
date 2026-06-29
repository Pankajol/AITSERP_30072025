import mongoose from "mongoose";

const ProductionJobCardSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobCardNo: { type: String, required: true, unique: true },

    // Order & Item
    productionOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: true,
    },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    uom: { type: String, default: "nos" },

    // Planning
    expectedStartDate: Date,
    expectedEndDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    totalDuration: { type: Number, default: 0 }, // seconds

    status: {
      type: String,
      enum: [
        "Planned",
        "In Progress",
        "QC",
        "Completed",
        "Ready",
        "Delivered",
      ],
      default: "Planned",
    },

    // Inspection (optional, can be used before starting)
    inspection: {
      inspector: String,
      remarks: String,
      passed: Boolean,
      photos: [String],
      inspectedAt: Date,
    },

    // Assigned resources (linked to PPC)
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: "Operator" },

    // Process steps (generic, you can add custom steps as needed)
    steps: [
      {
        stepName: String,
        status: { type: String, default: "pending" }, // pending, in_progress, completed
        machine: String,
        operator: String,
        startTime: Date,
        endTime: Date,
        duration: Number, // seconds
        remarks: String,
        data: mongoose.Schema.Types.Mixed, // for custom fields
      },
    ],

    // Materials consumption
    materials: [
      {
        itemName: String,
        quantity: Number,
        unit: String,
        batchNumber: String,
      },
    ],

    // Labour tracking
    labour: [
      {
        department: String,
        employee: String,
        hoursWorked: Number,
        costPerHour: Number,
      },
    ],

    // Quality control (separate from inspection)
    quality: {
      inspectedBy: String,
      passed: Boolean,
      remarks: String,
      photos: [String],
    },

    // Costing
    costing: {
      materialCost: Number,
      labourCost: Number,
      machineCost: Number,
      electricityCost: Number,
      overheadCost: Number,
      totalCost: Number,
      sellingPrice: Number,
      profitMargin: Number,
    },

    // Photos (before / during / after / delivery)
    photos: {
      beforeProduction: [String],
      duringProduction: [String],
      afterProduction: [String],
      deliveryPhoto: [String],
    },

    // Barcode / RFID
    barcode: String,
    qrCode: String,
    rfidTag: String,
    scanHistory: [
      {
        location: String,
        timestamp: Date,
      },
    ],

    // Dispatch
    dispatch: {
      deliveryChallan: String,
      invoiceNumber: String,
      transportDetails: String,
      vehicleNumber: String,
      deliveredBy: String,
      deliveryDate: Date,
      customerSignature: String,
    },

    // Warranty
    warranty: {
      warrantyNumber: String,
      warrantyPeriod: Number,
      kmWarranty: Number,
      claims: [
        {
          claimDate: Date,
          description: String,
          status: String,
          resolution: String,
        },
      ],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.ProductionJobCard ||
  mongoose.model("ProductionJobCard", ProductionJobCardSchema);