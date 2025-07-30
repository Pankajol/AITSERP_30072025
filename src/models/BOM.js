import mongoose from 'mongoose';
const { Schema } = mongoose;

const bomItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  itemCode: String,
  itemName: String,
  quantity: Number,
  warehouse: String,
  issueMethod: String,
  priceList: String,
  unitPrice: Number,
  total: Number,
});

const bomSchema = new Schema({
   companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  productNo:{ type: Schema.Types.ObjectId, ref: "Item", required: true },
  productDesc: String,
  warehouse: {type:mongoose.Schema.Types.ObjectId, ref: 'Warehouse'},
  priceList: String,
  bomType: {
    type: String,
    enum: ['Production', 'Sales', 'Template'],
  },
  xQuantity: {
    type: Number,
    default: 1,
  },
  distRule: String,
  project: String,
  items: [bomItemSchema],
  totalSum: Number,
    attachments: [
      {
        fileName: String,
        fileUrl: String, // e.g., /uploads/somefile.pdf
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.BOM || mongoose.model('BOM', bomSchema);


// import mongoose from 'mongoose';

// const bomItemSchema = new mongoose.Schema({
//   item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
//   itemCode: String,
//   itemName: String,
//   quantity: Number,
//   warehouse: String,
//   issueMethod: String,
//   priceList: String,
//   unitPrice: Number,
//   total: Number,
// });

// const bomSchema = new mongoose.Schema({
//   productNo: String,
//   productDesc: String,
//   warehouse: String,
//   priceList: String,
//   bomType: {
//     type: String,
//     enum: ['Production', 'Sales', 'Template'],
//   },
//   xQuantity: {
//     type: Number,
//     default: 1,
//   },
//   distRule: String,
//   project: String,
//   items: [bomItemSchema],
//   totalSum: Number,
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export default mongoose.models.BOM || mongoose.model('BOM', bomSchema);
