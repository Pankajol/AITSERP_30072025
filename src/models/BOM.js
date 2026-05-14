import mongoose from "mongoose";
const { Schema } = mongoose;

const bomItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  itemCode: String,
  itemName: String,
  quantity: { type: Number, default: 1 },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  issueMethod: String,
  priceList: String,
  unitPrice: Number,
  total: Number,
});

const bomResourceSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
  code: String,
  name: String,
  quantity: { type: Number, default: 1 },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  unitPrice: Number,
  total: Number,
});

const bomSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
  productNo: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  productDesc: String,
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  priceList: String,
  bomType: { type: String, enum: ["Production", "Sales", "Template"], default: "Production" },
  xQuantity: { type: Number, default: 1 },
  distRule: String,
  project: String,
  items: [bomItemSchema],
  resources: [bomResourceSchema], // ✅ Resource embedded schema
  totalSum: Number,
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BOM || mongoose.model("BOM", bomSchema);




// this code working before ppc 07/10/2025

// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const bomItemSchema = new Schema({
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

// const bomSchema = new Schema({
//    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
//     createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
//   productNo:{ type: Schema.Types.ObjectId, ref: "Item", required: true },
//   productDesc: String,
//   warehouse: {type:mongoose.Schema.Types.ObjectId, ref: 'Warehouse'},
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
//     attachments: [
//       {
//         fileName: String,
//         fileUrl: String, // e.g., /uploads/somefile.pdf
//         fileType: String,
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],

//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export default mongoose.models.BOM || mongoose.model('BOM', bomSchema);

