import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import BankHead from "@/models/BankHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  try {
    // ✅ 1️⃣ Authenticate
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const decoded = verifyJWT(token);
    const companyId = decoded.companyId;
    const createdBy = decoded.userId;

    // ✅ 2️⃣ Parse request
    const { suppliers } = await req.json();
    if (!Array.isArray(suppliers))
      return NextResponse.json(
        { success: false, message: "Invalid suppliers array" },
        { status: 400 }
      );

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // ✅ 3️⃣ Get latest supplier code
    const lastSupplier = await Supplier.findOne({ companyId }).sort({
      createdAt: -1,
    });
    let nextCodeNumber = lastSupplier
      ? parseInt(lastSupplier.supplierCode?.split("-")[1] || "0", 10) + 1
      : 1;

    // ✅ 4️⃣ Fetch all BankHeads once (for fast lookup)
    const bankHeads = await BankHead.find({ companyId }).select(
      "_id accountName"
    );
    const bankMap = {};
    bankHeads.forEach((b) => {
      bankMap[b.accountName.trim().toLowerCase()] = b._id;
    });

    // ✅ 5️⃣ Process each supplier row
    for (let i = 0; i < suppliers.length; i++) {
      const row = suppliers[i];
      const errors = [];

      // Required fields validation
      if (!row.supplierName) errors.push("supplierName missing");
      if (!row.supplierGroup) errors.push("supplierGroup missing");
      if (!row.supplierType) errors.push("supplierType missing");
      if (!row.mobileNumber) errors.push("mobileNumber missing");
      if (!row.pan) errors.push("pan missing");
      if (!row.gstCategory) errors.push("gstCategory missing");

      if (errors.length > 0) {
        skippedCount++;
        results.push({ row: i + 1, success: false, errors });
        continue;
      }

      // ✅ Match GL Account from BankHead master (if provided)
      let glAccountId = null;
      if (row.glAccount && row.glAccount.trim()) {
        const match = bankMap[row.glAccount.trim().toLowerCase()];
        if (match) {
          glAccountId = match;
        } else {
          errors.push(`GL Account '${row.glAccount}' not found – skipped`);
        }
      }

      // ✅ Prepare address objects
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

      // ✅ Check if supplier already exists
      const existing = await Supplier.findOne({
        companyId,
        $or: [
          { supplierName: row.supplierName },
          { mobileNumber: row.mobileNumber },
          { emailId: row.emailId },
        ],
      });

      if (existing) {
        // Update existing supplier
        existing.supplierGroup = row.supplierGroup || existing.supplierGroup;
        existing.supplierType = row.supplierType || existing.supplierType;
        existing.emailId = row.emailId || existing.emailId;
        existing.mobileNumber = row.mobileNumber || existing.mobileNumber;
        existing.gstNumber = row.gstNumber || existing.gstNumber;
        existing.gstCategory = row.gstCategory || existing.gstCategory;
        existing.pan = row.pan || existing.pan;
        existing.contactPersonName =
          row.contactPersonName || existing.contactPersonName;
        existing.commissionRate =
          row.commissionRate || existing.commissionRate;
        existing.paymentTerms = row.paymentTerms || existing.paymentTerms;
        existing.billingAddresses = [billingAddress];
        existing.shippingAddresses = [shippingAddress];

        // Optional GL Account link
        if (glAccountId) existing.glAccount = glAccountId;

        await existing.save();
        updatedCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "updated",
          warnings: errors,
        });
      } else {
        // Create new supplier
        const supplierCode = `SUPP-${nextCodeNumber
          .toString()
          .padStart(4, "0")}`;
        nextCodeNumber++;

        const supplierData = {
          companyId,
          createdBy,
          supplierCode,
          supplierName: row.supplierName,
          supplierGroup: row.supplierGroup,
          supplierType: row.supplierType,
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
          glAccount: glAccountId, // optional
        };

        await Supplier.create(supplierData);
        createdCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "created",
          warnings: errors,
        });
      }
    }

    // ✅ 6️⃣ Summary response
    const message = `Bulk upload complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`;

    return NextResponse.json({
      success: true,
      message,
      results,
    });
  } catch (err) {
    console.error("Bulk Upload Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: err.message,
      },
      { status: 500 }
    );
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Supplier from "@/models/SupplierModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req) {
//   await dbConnect();

//   try {
//     // ✅ 1️⃣ Get and verify JWT
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );

//     const decoded = verifyJWT(token);
//     const companyId = decoded.companyId;
//     const createdBy = decoded.userId;

//     // ✅ 2️⃣ Parse request body
//     const { suppliers } = await req.json();
//     if (!Array.isArray(suppliers)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid suppliers array" },
//         { status: 400 }
//       );
//     }

//     const results = [];
//     let skipped = 0;

//     // ✅ 3️⃣ Get latest supplier code
//     const lastSupplier = await Supplier.findOne({ companyId }).sort({
//       createdAt: -1,
//     });

//     let nextCodeNumber = lastSupplier
//       ? parseInt(lastSupplier.supplierCode?.split("-")[1] || "0", 10) + 1
//       : 1;

//     // ✅ 4️⃣ Process each supplier
//     for (let i = 0; i < suppliers.length; i++) {
//       const row = suppliers[i];
//       const errors = [];

//       // ✅ Validate required fields
//       if (!row.supplierName) errors.push("supplierName missing");
//       if (!row.supplierGroup) errors.push("supplierGroup missing");
//       if (!row.supplierType) errors.push("supplierType missing");
//       if (!row.mobileNumber) errors.push("mobileNumber missing");
//       if (!row.pan) errors.push("pan missing");
//       if (!row.gstCategory) errors.push("gstCategory missing");

//       // ✅ Skip invalid rows
//       if (errors.length > 0) {
//         skipped++;
//         results.push({ row: i + 1, success: false, errors });
//         continue;
//       }

//       // ✅ Build new supplier code
//       const supplierCode = `SUPP-${nextCodeNumber.toString().padStart(4, "0")}`;
//       nextCodeNumber++;

//       // ✅ Map addresses
//       const billingAddress = {
//         address1: row.billingAddress1 || "",
//         address2: row.billingAddress2 || "",
//         city: row.billingCity || "",
//         state: row.billingState || "",
//         pin: row.billingPin || "",
//         country: row.billingCountry || "",
//       };

//       const shippingAddress = {
//         address1: row.shippingAddress1 || "",
//         address2: row.shippingAddress2 || "",
//         city: row.shippingCity || "",
//         state: row.shippingState || "",
//         pin: row.shippingPin || "",
//         country: row.shippingCountry || "",
//       };

//       // ✅ Supplier Data Object (no glAccount)
//       const supplierData = {
//         companyId,
//         createdBy,
//         supplierCode,
//         supplierName: row.supplierName,
//         supplierGroup: row.supplierGroup,
//         supplierType: row.supplierType,
//         emailId: row.emailId,
//         mobileNumber: row.mobileNumber,
//         gstNumber: row.gstNumber,
//         gstCategory: row.gstCategory,
//         pan: row.pan,
//         contactPersonName: row.contactPersonName,
//         commissionRate: row.commissionRate,
//         paymentTerms: row.paymentTerms,
//         billingAddresses: [billingAddress],
//         shippingAddresses: [shippingAddress],
//       };

//       try {
//         await Supplier.create(supplierData);
//         results.push({ row: i + 1, success: true });
//       } catch (err) {
//         skipped++;
//         results.push({
//           row: i + 1,
//           success: false,
//           errors: [err.message],
//         });
//       }
//     }

//     // ✅ 5️⃣ Summarize result
//     const message =
//       skipped > 0
//         ? `Bulk upload complete (${skipped} record(s) skipped due to missing required fields)`
//         : "Bulk upload complete (all records successful)";

//     return NextResponse.json({
//       success: true,
//       message,
//       results,
//     });
//   } catch (err) {
//     console.error("Bulk Upload Error:", err);
//     return NextResponse.json(
//       {
//         success: false,
//         message: "Server error",
//         error: err.message,
//       },
//       { status: 500 }
//     );
//   }
// }
