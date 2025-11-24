import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import BankHead from "@/models/BankHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  try {
    // ✅ 1️⃣ Authenticate user
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const decoded = verifyJWT(token);
    const companyId = decoded.companyId;
    const createdBy = decoded.userId;

    // ✅ 2️⃣ Parse input
    const { customers } = await req.json();
    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty customers array" },
        { status: 400 }
      );
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // ✅ 3️⃣ Find last customer code
    const last = await Customer.findOne({ companyId }).sort({ createdAt: -1 });
    let nextCodeNumber = last
      ? parseInt(last.customerCode?.split("-")[1] || "0", 10) + 1
      : 1;

    // ✅ 4️⃣ Preload BankHeads for GL Account matching
    const bankHeads = await BankHead.find({ companyId }).select("_id accountName");
    const bankMap = {};
    bankHeads.forEach((b) => {
      bankMap[b.accountName.trim().toLowerCase()] = b._id;
    });

    // ✅ 5️⃣ Loop through each row
    for (let i = 0; i < customers.length; i++) {
      const row = customers[i];
      const errors = [];
      const warnings = [];

      // Validate required fields
      if (!row.customerName) errors.push("customerName missing");
      if (!row.customerGroup) errors.push("customerGroup missing");
      if (!row.customerType) errors.push("customerType missing");
      if (!row.mobileNumber) errors.push("mobileNumber missing");
      if (!row.pan) errors.push("pan missing");
      if (!row.gstCategory) errors.push("gstCategory missing");

      if (errors.length > 0) {
        skippedCount++;
        results.push({ row: i + 1, success: false, errors });
        continue;
      }

      // ✅ Optional GL Account lookup
      let glAccountId = null;
      if (row.glAccount && row.glAccount.trim()) {
        const match = bankMap[row.glAccount.trim().toLowerCase()];
        if (match) {
          glAccountId = match;
        } else {
          warnings.push(`GL Account '${row.glAccount}' not found – skipped`);
        }
      }

      // ✅ Address mapping
      const billingAddress = {
        address1: row.billingAddress1 || "",
        address2: row.billingAddress2 || "",
        city: row.billingCity || "",
        state: row.billingState || "",
        pin: row.billingPin || "",
        country: row.billingCountry || "",
      };

      const shippingAddress = {
        address1: row.shippingAddress1 || "",
        address2: row.shippingAddress2 || "",
        city: row.shippingCity || "",
        state: row.shippingState || "",
        pin: row.shippingPin || "",
        country: row.shippingCountry || "",
      };

      // ✅ Check if customer exists (by name, email, or mobile)
      const existingCustomer = await Customer.findOne({
        companyId,
        $or: [
          { customerName: row.customerName },
          { emailId: row.emailId },
          { mobileNumber: row.mobileNumber },
        ],
      });

      const customerData = {
        companyId,
        createdBy,
        customerName: row.customerName,
        customerGroup: row.customerGroup,
        customerType: row.customerType,
        emailId: row.emailId,
        mobileNumber: row.mobileNumber,
        gstNumber: row.gstNumber,
        gstCategory: row.gstCategory,
        pan: row.pan,
        contactPersonName: row.contactPersonName,
        commissionRate: row.commissionRate,
        paymentTerms: row.paymentTerms,
        billingAddresses: [billingAddress],
        shippingAddresses: [shippingAddress],
        glAccount: glAccountId || null,
      };

      if (existingCustomer) {
        // ✅ Update existing record
        Object.assign(existingCustomer, customerData);
        await existingCustomer.save();
        updatedCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "updated",
          warnings,
        });
      } else {
        // ✅ Create new record
        const customerCode = `CUST-${nextCodeNumber.toString().padStart(4, "0")}`;
        nextCodeNumber++;
        customerData.customerCode = customerCode;

        await Customer.create(customerData);
        createdCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "created",
          warnings,
        });
      }
    }

    // ✅ 6️⃣ Return structured result
    const message = `Bulk upload complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`;

    return NextResponse.json({
      success: true,
      message,
      results,
    });
  } catch (err) {
    console.error("Customer Bulk Upload Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
