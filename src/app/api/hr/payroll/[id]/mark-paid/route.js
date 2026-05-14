// 📁 src/app/api/hr/payroll/[id]/mark-paid/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Payroll from "@/models/hr/Payroll";
import Salary from "@/models/hr/Salary";
import Employee from "@/models/hr/Employee";

// ✅ ADD: Auto accounting entry
import { autoPayrollPaid } from "@/lib/autoTransaction";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "edit"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const payroll = await Payroll.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { $set: { paidStatus: "Paid", paidAt: new Date() } },
      { new: true }
    );

    if (!payroll)
      return NextResponse.json({ success: false, message: "Payroll not found" }, { status: 404 });

    // ✅ Auto-create Salary slip
    const [year, month] = payroll.month.split("-").map(Number);

    const existingSlip = await Salary.findOne({
      employeeId: payroll.employeeId,
      month,
      year,
    });

    if (!existingSlip) {
      await Salary.create({
        companyId:        payroll.companyId,
        employeeId:       payroll.employeeId,
        month,
        year,
        date:             new Date(year, month - 1, 1),
        basicSalary:      payroll.basic,
        hra:              payroll.hra,
        da:               0,
        specialAllowance: payroll.allowances,
        grossPay:         payroll.basic + payroll.hra + payroll.allowances,
        totalDeductions:  payroll.deductions,
        netPay:           payroll.netSalary,
        status:           "Paid",
        paidAt:           new Date(),
      });
    }

    // ✅ AUTO ACCOUNTING ENTRY
    // Salary Expense Dr ↑ (Expense)  — company ka cost
    // Bank Cr           ↓ (Asset)    — bank se paise gaye
    try {
      // Employee ka naam chahiye — populate karo
      const employee = await Employee.findById(payroll.employeeId)
        .select("fullName")
        .lean();

      const employeeName = employee?.fullName || "Employee";

      await autoPayrollPaid({
        companyId:    user.companyId,
        amount:       payroll.netSalary,
        employeeId:   payroll.employeeId,
        employeeName: employeeName,
        payrollId:    payroll._id,
        month:        payroll.month,          // "YYYY-MM" e.g. "2026-03"
        createdBy:    user.id,
        // bankAccountName: "Bank Account"   // ← default, change karo agar alag bank hai
      });
    } catch (accountingErr) {
      // ✅ Accounting fail hone se payroll fail NAHI hoga
      // Salary slip aur paidStatus already save ho gaya hai
      console.error(
        `⚠️ Accounting entry failed for payroll ${payroll._id} (${payroll.month}):`,
        accountingErr.message
      );
    }

    return NextResponse.json({ success: true, data: payroll });
  } catch (err) {
    console.error("PATCH /api/hr/payroll/[id]/mark-paid error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}




// // 📁 src/app/api/hr/payroll/[id]/mark-paid/route.js

// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
// import Payroll from "@/models/hr/Payroll";
// import Salary from "@/models/hr/Salary"; // ✅ Salary slip auto-create on mark-paid

// export async function PATCH(req, { params }) {
//   try {
//     await connectDB();
//     const user = verifyJWT(getTokenFromHeader(req));
//     if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     if (!hasPermission(user, "payroll", "edit"))
//       return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

//     const payroll = await Payroll.findOneAndUpdate(
//       { _id: params.id, companyId: user.companyId },
//       { $set: { paidStatus: "Paid", paidAt: new Date() } },
//       { new: true }
//     );

//     if (!payroll)
//       return NextResponse.json({ success: false, message: "Payroll not found" }, { status: 404 });

//     // ✅ Auto-create Salary slip so employee can see it on My Salary page
//     // Parse "YYYY-MM" → month number and year
//     const [year, month] = payroll.month.split("-").map(Number);

//     const existingSlip = await Salary.findOne({
//       employeeId: payroll.employeeId,
//       month,
//       year,
//     });

//     if (!existingSlip) {
//       await Salary.create({
//         companyId:   payroll.companyId,
//         employeeId:  payroll.employeeId,
//         month,
//         year,
//         date:        new Date(year, month - 1, 1),
//         basicSalary: payroll.basic,
//         hra:         payroll.hra,
//         da:          0,
//         specialAllowance: payroll.allowances,
//         grossPay:    payroll.basic + payroll.hra + payroll.allowances,
//         totalDeductions: payroll.deductions,
//         netPay:      payroll.netSalary,
//         status:      "Paid",
//         paidAt:      new Date(),
//       });
//     }

//     return NextResponse.json({ success: true, data: payroll });
//   } catch (err) {
//     console.error("PATCH /api/hr/payroll/[id]/mark-paid error:", err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }