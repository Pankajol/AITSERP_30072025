import mongoose from "mongoose";

const ROLE_OPTIONS = {
  Admin: [],
  "Sales Manager": ["Sales Order", "Sales Invoice", "Delivery"],
  "Purchase Manager": ["Purchase Order", "Purchase Invoice", "GRN"],
  "Inventory Manager": ["Stock Adjustment", "Stock Transfer", "Stock Report"],
  "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry"],
  "HR Manager": ["Employee", "Attendance", "Payroll"],
  "Support Executive": ["Tickets", "Responses"],
  "Production Head": ["BOM", "Work Order", "Production Report"],
  "Project Manager": ["Project", "Tasks", "Timesheet"],
  Employee: ["Profile", "Timesheet"],
};

const VALID_ROLES = Object.keys(ROLE_OPTIONS);

const CompanyUserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    roles: {
      type: [String],
      enum: VALID_ROLES,
      default: ["Sales Manager"],
    },
    subRoles: {
      type: [String],
      default: [],
      validate: {
        validator: function (subs) {
          return subs.every((sr) =>
            Object.values(ROLE_OPTIONS).flat().includes(sr)
          );
        },
        message: "Invalid sub-role detected",
      },
    },
  },
  { timestamps: true }
);

CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

export default mongoose.models.CompanyUser || mongoose.model("CompanyUser", CompanyUserSchema);
export { ROLE_OPTIONS, VALID_ROLES };





// import mongoose from 'mongoose';

// const CompanyUserSchema = new mongoose.Schema(
//   {
//     companyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Company',
//       required: true,
//     },
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       lowercase: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: true, // hashed
//     },
//     roles: {
//       type: [String],
//       enum: [
//         'Admin',
//         'Sales Manager',
//         'Purchase Manager',
//         'Inventory Manager',
//         'Accounts Manager',
//         'HR Manager',
//         'Support Executive',
//         'Production Head',
//         'Project Manager',
//         'Employee',
//       ],
//       default: ['Sales Manager'],
//     },
//   },
//   { timestamps: true }
// );

// // Unique index per company+email
// CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

// export default mongoose.models.CompanyUser ||
//        mongoose.model('CompanyUser', CompanyUserSchema);
