import mongoose from "mongoose";

const ModuleSchema = new mongoose.Schema(
  {
    selected: { type: Boolean, default: false },
    permissions: {
      create: { type: Boolean, default: false },
      view: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      print: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      reject: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      upload: { type: Boolean, default: false },
      download: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      copy: { type: Boolean, default: false },
      // sms: { type: Boolean, default: false },
      // call: { type: Boolean, default: false },
      // chat: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const CompanyUserSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: [{ type: String }],
     // 🔥 AGENT STATUS
  isActive: { type: Boolean, default: true },

  onLeave: { type: Boolean, default: false },

  holidays: [
    {
      from: Date,
      to: Date,
    }
  ],
   // 🔁 for fair assignment
  lastAssignedAt: { type: Date },
    modules: {
      type: Map,
      of: ModuleSchema, // ✅ modules per module name
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompanyUser ||
  mongoose.model("CompanyUser", CompanyUserSchema);



// import mongoose from "mongoose";

// const ROLE_OPTIONS = {
//   Admin: [],
//   "Sales Manager": ["Sales Order", "Sales Invoice", "Delivery"],
//   "Purchase Manager": ["Purchase Order", "Purchase Invoice", "GRN"],
//   "Inventory Manager": ["Stock Adjustment", "Stock Transfer", "Stock Report"],
//   "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry"],
//   "HR Manager": ["Employee", "Attendance", "Payroll"],
//   "Support Executive": ["Tickets", "Responses"],
//   "Production Head": ["BOM", "Work Order", "Production Report"],
//   "Project Manager": ["Project", "Tasks", "Timesheet"],
//   Employee: ["Profile", "Timesheet"],
// };

// const VALID_ROLES = Object.keys(ROLE_OPTIONS);

// const CompanyUserSchema = new mongoose.Schema(
//   {
//     companyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Company",
//       required: true,
//     },
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, lowercase: true, trim: true },
//     password: { type: String, required: true },
//     roles: {
//       type: [String],
//       enum: VALID_ROLES,
//       default: ["Sales Manager"],
//     },
//     subRoles: {
//       type: [String],
//       default: [],
//       validate: {
//         validator: function (subs) {
//           return subs.every((sr) =>
//             Object.values(ROLE_OPTIONS).flat().includes(sr)
//           );
//         },
//         message: "Invalid sub-role detected",
//       },
//     },
//   },
//   { timestamps: true }
// );

// CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

// export default mongoose.models.CompanyUser || mongoose.model("CompanyUser", CompanyUserSchema);
// export { ROLE_OPTIONS, VALID_ROLES };


