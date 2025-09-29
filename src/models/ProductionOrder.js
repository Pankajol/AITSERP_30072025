import mongoose from 'mongoose';
const { Schema } = mongoose;

const ProductionOrderSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'companyUser' },
  bomId: { type: Schema.Types.ObjectId, ref: 'BOM', required: true },
  type: { type: String, default: 'standard' },
  salesOrder: [{ type: Schema.Types.ObjectId, ref: 'SalesOrder' }],
  status: { type: String, default: 'planned' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

 
  productDesc: String,
  priority: String,
  productionDate: Date,
  quantity: { type: Number, default: 1 },
  transferqty: { type: Number, default: 0 }, // Added transfer <quantity></quantity>
  issuforproductionqty: { type: Number, default: 0 }, // Added  <quantity></quantity>
  reciptforproductionqty: { type: Number, default: 0 }, // Added  <quantity></quantity>
  rate: { type: Number, default: 0 }, // Added rate <rate></rate>
  amount: { type: Number, default: 0 }, // Added amount <amount></amount>
  
  items: [
    {
      item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
      itemCode: String,
      itemName: String,
      unitQty: Number,
      quantity: Number,
      requiredQty: Number,
      warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    
    }
  ],
  attachments: [
    {
      fileName: String,
      fileUrl: String, // e.g., /uploads/somefile.pdf 
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  statusHistory: [
    {
      status: String,
      date: Date
    }
  ]
}, { timestamps: true });

export default mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', ProductionOrderSchema);




// import mongoose from 'mongoose';

// const ProductionOrderSchema = new mongoose.Schema({
//   bomId: { type: mongoose.Types.ObjectId, ref: 'BOM', required: true },
//   type: { type: String, default: 'standard' },
//   status: { type: String, default: 'planned' },
//   warehouse: { type: mongoose.Types.ObjectId, ref: 'Warehouse' },
//   productDesc: String,
//   priority: String,
//   productionDate: Date,
//   quantity: { type: Number, default: 1 },
//   items: [
//     {
//       item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
//       itemCode: String,
//       itemName: String,
//       unitQty: Number,
//       quantity: Number,
//       requiredQty: Number,
//       warehouse: { type: mongoose.Types.ObjectId, ref: 'Warehouse' }
//     }
//   ],
//   statusHistory: [{ status: String, date: Date }]
// }, { timestamps: true });

// export default mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', ProductionOrderSchema);
