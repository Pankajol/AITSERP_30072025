import mongoose from "mongoose";

const TyreJobCardSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  jobCardNo: { type: String, required: true, unique: true },

  // Customer & Vehicle
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  customerPO: String,
  vehicleNumber: String,
  fleetName: String,
  vehicleType: String,
  makeModel: String,
  axlePosition: String,
  driverName: String,

  // Tyre Details
  tyreBrand: String,
  tyreSize: String,
  tyrePattern: String,
  tyreSerialNumber: String,
  tyreType: { type: String, enum: ["Tube", "Tubeless"] },
  casingNumber: String,
  odometerReading: Number,
  previousRetreadCount: Number,
  manufacturingDate: Date,
  tyreCondition: String, // brief visual condition

  // Inspection
  inspection: {
    inspector: String,
    casingGrade: { type: String, enum: ["A", "B", "C", "Reject"] },
    beadDamage: Boolean,
    sidewallDamage: Boolean,
    shoulderDamage: Boolean,
    nailCut: Boolean,
    separation: Boolean,
    heatDamage: Boolean,
    repairRequired: Boolean,
    rejectionReason: String,
    photos: [String], // URLs
    inspectedAt: Date,
  },

  // Status & Dates
  receivedDate: { type: Date, default: Date.now },
  expectedDelivery: Date,
  priority: { type: String, enum: ["Normal", "Urgent"], default: "Normal" },
  status: {
    type: String,
    enum: ["Received", "Inspection", "Buffing", "Repair", "Building", "Curing", "Finishing", "QC", "Ready", "Delivered"],
    default: "Received",
  },

  // Process Tracking (embedded)
  buffing: {
    machine: String,
    operator: String,
    startTime: Date,
    endTime: Date,
    diameterAfterBuffing: Number,
  },
  repair: {
    repairType: String,
    patchUsed: String,
    cushionGumUsed: Number,
    operator: String,
  },
  building: {
    treadRubberUsed: Number,
    cushionGum: Number,
    cementUsed: Number,
    builder: String,
  },
  curing: {
    chamberNumber: String,
    temperature: Number,
    pressure: Number,
    cycleTime: Number,
    operator: String,
  },
  finishing: {
    painting: Boolean,
    branding: Boolean,
    finalInspection: Boolean,
  },

  // Quality
  quality: {
    airLeakTest: Boolean,
    balanceCheck: Boolean,
    visualInspection: Boolean,
    passed: Boolean,
    remarks: String,
    qcInspector: String,
    photos: [String],
  },

  // Materials consumption
  materials: [{
    itemName: String,
    quantity: Number,
    unit: String,
    batchNumber: String,
  }],

  // Labour tracking
  labour: [{
    department: String,
    employee: String,
    hoursWorked: Number,
    costPerHour: Number,
  }],

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

  // Barcode / RFID
  barcode: String,
  qrCode: String,
  rfidTag: String,
  scanHistory: [{
    location: String,
    timestamp: Date,
  }],

  // Photos
  photos: {
    beforeRepair: [String],
    duringRepair: [String],
    afterRepair: [String],
    deliveryPhoto: [String],
  },

  // Dispatch
  dispatch: {
    deliveryChallan: String,
    invoiceNumber: String,
    transportDetails: String,
    vehicleNumber: String,
    deliveredBy: String,
    deliveryDate: Date,
    customerSignature: String, // URL
  },

  // Warranty
  warranty: {
    warrantyNumber: String,
    warrantyPeriod: Number, // months
    kmWarranty: Number,
    claims: [{
      claimDate: Date,
      description: String,
      status: String,
      resolution: String,
    }],
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
}, { timestamps: true });

export default mongoose.models.TyreJobCard || mongoose.model("TyreJobCard", TyreJobCardSchema);