


import mongoose from "mongoose";
const { Schema } = mongoose;

// Subdocument for tracking each work session per job card
const TimeLogSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "companyUser", required: true },
    fromTime: { type: Date, required: true },
    toTime: { type: Date, required: true },
    timeInMins: { type: Number, default: 0 },
    completedQty: { type: Number, default: 0 },
  },
  { _id: true }
);

// Main JobCard schema
const JobCardSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    productionOrder: {
      type: Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: true,
    },
    operation: {
      type: Schema.Types.ObjectId,
      ref: "Operation",
      required: true,
    },
    machine: {
      type: Schema.Types.ObjectId,
      ref: "Machine",
    },
    operator: {
      type: Schema.Types.ObjectId,
      ref: "Operator",
    },

    jobCardNo: {
      type: String,
      required: true,
      unique: true,
    },

    qtyToManufacture: { type: Number, default: 0 },
    completedQty: { type: Number, default: 0 },

    // ✅ Updated status values
    status: {
      type: String,
      // enum: ["planned", "in progress", "on_hold", "pending", "completed"],
      default: "planned",
    },

    actualStartDate: { type: Date },
    actualEndDate: { type: Date },

    // ✅ Total active working duration in seconds
    totalDuration: { type: Number, default: 0 },

    // ✅ Track multiple sessions per operator
    timeLogs: {
      type: [TimeLogSchema],
      default: [],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

// ✅ Prevent model overwrite in hot reload
export default mongoose.models.JobCard ||
  mongoose.model("JobCard", JobCardSchema);




// import mongoose from "mongoose";
// const { Schema } = mongoose;

// // Subdocument for tracking time logs per job card
// const TimeLogSchema = new Schema({
//   employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
//   fromTime: { type: Date, required: true },
//   toTime: { type: Date, required: true },
//   timeInMins: { type: Number, default: 0 },
//   completedQty: { type: Number, default: 0 },
// }, { _id: true }); // keep _id for each log

// // Main JobCard schema
// const JobCardSchema = new Schema({
//   companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
//   productionOrder: { type: Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
//   operation: { type: Schema.Types.ObjectId, ref: "Operation", required: true },
//   machine: { type: Schema.Types.ObjectId, ref: "Machine" },
//   operator: { type: Schema.Types.ObjectId, ref: "Operator" },

//   jobCardNo: { type: String, required: true, unique: true },
//   qtyToManufacture: { type: Number, default: 0 },
//   completedQty: { type: Number, default: 0 },

//   status: {
//     type: String,
//     enum: ["Pending", "In Progress", "Completed"],
//     default: "Pending",
//   },

//   actualStartDate: { type: Date },
//   actualEndDate: { type: Date },
//   actualTime: { type: Number, default: 0 },
//   timeLogs: { type: [TimeLogSchema], default: [] },

//   createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
// }, { timestamps: true });

// // Export model
// export default mongoose.models.JobCard || mongoose.model("JobCard", JobCardSchema);






// import mongoose from "mongoose";
// const { Schema } = mongoose;

// const TimeLogSchema = new Schema({
//   employee: { type: Schema.Types.ObjectId, ref: "Employee" },
//   fromTime: Date,
//   toTime: Date,
//   timeInMins: Number,
//   completedQty: Number,
// });

// const JobCardSchema = new Schema(
//   {
//     companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
//     productionOrder: { type: Schema.Types.ObjectId, ref: "ProductionOrder", required: true },
//     operation: { type: Schema.Types.ObjectId, ref: "Operation", required: true },
//     machine: { type: Schema.Types.ObjectId, ref: "Machine" },
//     operator: { type: Schema.Types.ObjectId, ref: "Operator" },

//     jobCardNo: { type: String },
//     qtyToManufacture: { type: Number, default: 0 },
//     status: {
//       type: String,
//       enum: ["Pending", "In Progress", "Completed"],
//       default: "Pending",
//     },

//     actualTime: { type: Number, default: 0 },
//     timeLogs: [TimeLogSchema],

//     createdBy: { type: Schema.Types.ObjectId, ref: "companyUser" },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.JobCard || mongoose.model("JobCard", JobCardSchema);
