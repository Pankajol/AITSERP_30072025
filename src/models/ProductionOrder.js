import mongoose from "mongoose";
const { Schema } = mongoose;

const ProductionOrderSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "companyUser",
    },
    productionDocNo: {
      type: String,
      required: true,
      unique: true,
    },


    // BOM Reference
    bomId: {
      type: Schema.Types.ObjectId,
      ref: "BOM",
      required: true,
    },

    // General info
    type: {
      type: String,
      enum: ["manufacture", "subcontract", "assemble"],
      default: "manufacture",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Completed", "Cancelled"],
      default: "Open",
    },
    priority: {
      type: String,
      default: "",
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    productDesc: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
    },
    productionDate: {
      type: Date,
      default: Date.now,
    },

    // Sales Orders linked to this Production Order
    salesOrder: [
      {
        type: Schema.Types.ObjectId,
        ref: "SalesOrder",
      },
    ],

    // Items list (from BOM)
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
        itemCode: { type: String },
        itemName: { type: String },
        unitQty: { type: Number, default: 1 },
        quantity: { type: Number, default: 1 },
        requiredQty: { type: Number, default: 1 },
        warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
        unitPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    ],

    // Resources list (from BOM)
    resources: [
      {
        resource: { type: Schema.Types.ObjectId, ref: "Resource" },
        code: { type: String },
        name: { type: String },
        quantity: { type: Number, default: 1 },
        warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
        unitPrice: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    ],

    // Operation Flow (operation + machine + operator)
    operationFlow: [
      {
        operation: { type: Schema.Types.ObjectId, ref: "Operation" },
        machine: { type: Schema.Types.ObjectId, ref: "Machine" },
        operator: { type: Schema.Types.ObjectId, ref: "Operator" },
        expectedStartDate: { type: Date },
        expectedEndDate: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ProductionOrder ||
  mongoose.model("ProductionOrder", ProductionOrderSchema);


// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const ProductionOrderSchema = new Schema(
//   {
//     companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
//     createdBy: { type: Schema.Types.ObjectId, ref: 'companyUser' },
//     bomId: { type: Schema.Types.ObjectId, ref: 'BOM', required: true },
//     type: { type: String, default: 'manufacture' },
//     status: { type: String, default: 'Open' },
//     warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
//     salesOrder: [{ type: Schema.Types.ObjectId, ref: 'SalesOrder' }],

//     productDesc: { type: String },
//     priority: { type: String },
//     productionDate: { type: Date },
//     quantity: { type: Number, default: 1 },
//     transferQty: { type: Number, default: 0 },
//     isSuForProductionQty: { type: Number, default: 0 },
//     receiptForProductionQty: { type: Number, default: 0 },
//     rate: { type: Number, default: 0 },
//     amount: { type: Number, default: 0 },

//     machine: { type: Schema.Types.ObjectId, ref: 'Machine' },
//     operator: { type: Schema.Types.ObjectId, ref: 'Operator' },
//     operations: [{ type: Schema.Types.ObjectId, ref: 'Operation' }],

//     items: [
//       {
//         item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
//         itemCode: { type: String },
//         itemName: { type: String },
//         unitQty: { type: Number, default: 1 },
//         quantity: { type: Number, default: 1 },
//         requiredQty: { type: Number, default: 0 },
//         warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
//         unitPrice: { type: Number, default: 0 },
//         total: { type: Number, default: 0 },
//         type: { type: String, default: 'Item' },
//       },
//     ],

//     resources: [
//       {
//         resource: { type: Schema.Types.ObjectId, ref: 'Resource' },
//         code: { type: String },
//         name: { type: String },
//         quantity: { type: Number, default: 1 },
//         warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
//         unitPrice: { type: Number, default: 0 },
//         total: { type: Number, default: 0 },
//         type: { type: String, default: 'Resource' },
//       },
//     ],

//     attachments: [
//       {
//         fileName: { type: String },
//         fileUrl: { type: String },
//         fileType: { type: String },
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],

//     statusHistory: [
//       {
//         status: { type: String },
//         date: { type: Date, default: Date.now },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// // Prevent model overwrite on hot reload
// export default mongoose.models.ProductionOrder ||
//   mongoose.model('ProductionOrder', ProductionOrderSchema);


// before the ppc code is working 

// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const ProductionOrderSchema = new Schema({
//   companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
//   createdBy: { type: Schema.Types.ObjectId, ref: 'companyUser' },
//   bomId: { type: Schema.Types.ObjectId, ref: 'BOM', required: true },
//   type: { type: String, default: 'standard' },
//   salesOrder: [{ type: Schema.Types.ObjectId, ref: 'SalesOrder' }],
//   status: { type: String, default: 'planned' },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

 
//   productDesc: String,
//   priority: String,
//   productionDate: Date,
//   quantity: { type: Number, default: 1 },
//   transferqty: { type: Number, default: 0 }, // Added transfer <quantity></quantity>
//   issuforproductionqty: { type: Number, default: 0 }, // Added  <quantity></quantity>
//   reciptforproductionqty: { type: Number, default: 0 }, // Added  <quantity></quantity>
//   rate: { type: Number, default: 0 }, // Added rate <rate></rate>
//   amount: { type: Number, default: 0 }, // Added amount <amount></amount>
  
//   items: [
//     {
//       item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
//       itemCode: String,
//       itemName: String,
//       unitQty: Number,
//       quantity: Number,
//       requiredQty: Number,
//       warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    
//     }
//   ],
  
  
//   attachments: [
//     {
//       fileName: String,
//       fileUrl: String, // e.g., /uploads/somefile.pdf 
//       fileType: String,
//       uploadedAt: { type: Date, default: Date.now },
//     },
//   ],
//   statusHistory: [
//     {
//       status: String,
//       date: Date
//     }
//   ]
// }, { timestamps: true });

// export default mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', ProductionOrderSchema);



