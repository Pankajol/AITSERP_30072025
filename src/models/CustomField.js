import mongoose from "mongoose";

const customFieldSchema = new mongoose.Schema({

  // ⭐ COMPANY WISE
  companyId:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    index:true
  },

  // lead | client | ticket
  module:{
    type:String,
    required:true
  },

  label:String,     // GST Number
  name:String,      // gstNumber
  type:String,      // text | number | select | date
  options:[String], // dropdown
  isRequired:Boolean,

  isActive:{
    type:Boolean,
    default:true
  }

},{timestamps:true});


// ⭐ UNIQUE PER COMPANY + MODULE
customFieldSchema.index(
  {companyId:1,module:1,name:1},
  {unique:true}
);

export default mongoose.models.CustomField ||
mongoose.model("CustomField",customFieldSchema);