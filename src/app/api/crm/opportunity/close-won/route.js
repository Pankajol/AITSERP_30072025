import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Opportunity from "@/models/crm/Opportunity";
import Customer from "@/models/CustomerModel";
import SalesQuotation from "@/models/SalesQuotationModel";
import Lead from "@/models/crm/load";
import AccountHead from "@/models/accounts/AccountHead";
import mongoose from "mongoose";

// ===================== Helper Functions =====================
function generateDummyPan() {
  return `TEMP${Math.floor(Math.random() * 10000000)}`;
}

// Generate sequential customer code like CUST-0001, CUST-0002...
// Only looks at codes with exactly 4 digits after hyphen (ignores legacy/timestamp codes)
async function generateUniqueCustomerCode(companyId) {
  const existing = await Customer.find(
    { companyId, customerCode: { $regex: /^CUST-\d{4}$/ } },
    { customerCode: 1 }
  );

  let maxNum = 0;
  for (const doc of existing) {
    const match = doc.customerCode.match(/^CUST-(\d{4})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(4, '0');
  return `CUST-${padded}`;
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "No token", status: 401 };
  const decoded = verifyJWT(token);
  if (!decoded) return { error: "Invalid token", status: 401 };
  return { user: decoded, error: null };
}

// ===================== Main POST Handler =====================
export async function POST(req) {
  try {
    await dbConnect();
    const { user, error } = await validateUser(req);
    if (error || !user) {
      return NextResponse.json(
        { success: false, message: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { opportunityId, quotationId, customerUpdates } = await req.json();
    if (!opportunityId || !quotationId) {
      return NextResponse.json(
        { success: false, message: "Opportunity ID and Quotation ID required" },
        { status: 400 }
      );
    }

    // 1. Find opportunity
    const opp = await Opportunity.findOne({ _id: opportunityId, companyId: user.companyId });
    if (!opp) {
      return NextResponse.json(
        { success: false, message: "Opportunity not found" },
        { status: 404 }
      );
    }

    // 2. Verify quotation belongs to this opportunity
    if (!opp.quotations || !opp.quotations.includes(quotationId)) {
      return NextResponse.json(
        { success: false, message: "Quotation does not belong to this opportunity" },
        { status: 400 }
      );
    }

    // 3. Check if customer already linked to this quotation
    const existingQuote = await SalesQuotation.findById(quotationId);
    if (existingQuote.customer) {
      return NextResponse.json(
        { success: false, message: "Customer already linked to this quotation" },
        { status: 400 }
      );
    }

    // 4. GL Account handling
    let glAccountId = null;
    if (customerUpdates?.glAccount) {
      glAccountId = new mongoose.Types.ObjectId(
        customerUpdates.glAccount._id || customerUpdates.glAccount
      );
    } else {
      const customerName = opp.accountName.trim();
      let account = await AccountHead.findOne({
        companyId: user.companyId,
        name: { $regex: new RegExp(`^${customerName}$`, "i") },
      });
      if (!account) {
        const accountCode = `CUS-${Date.now()}`;
        account = await AccountHead.create({
          companyId: user.companyId,
          name: customerName,
          code: accountCode,
          type: "Asset",
          group: "Accounts Receivable",
          balanceType: "Debit",
        });
      }
      glAccountId = account._id;
    }

    // 5. Prepare customer data from opportunity & lead
    const lead = await Lead.findOne({ convertedToOpportunity: opp._id });
    const panValue = customerUpdates?.pan || lead?.pan || generateDummyPan();
    const gstValue = customerUpdates?.gst || lead?.gstNumber || "";
    const emailValue = (customerUpdates?.email || lead?.email || "").trim().toLowerCase();
    const mobileValue = customerUpdates?.mobile || lead?.mobileNo || "";

    const customerName = opp.accountName.trim();

    // 6. Try to find existing customer for this opportunity first
    let customer = await Customer.findOne({
      companyId: user.companyId,
      fromOpportunity: opp._id,
    });

    // If not found, try to find by email (to avoid duplicates)
    if (!customer && emailValue) {
      customer = await Customer.findOne({
        companyId: user.companyId,
        emailId: emailValue,
      });
      if (customer) {
        // Link this opportunity to the existing customer
        customer.fromOpportunity = opp._id;
        if (lead && !customer.fromLead) customer.fromLead = lead._id;
        if (!customer.customerName) customer.customerName = customerName;
        if (!customer.gstNumber && gstValue) customer.gstNumber = gstValue;
        if (!customer.mobileNumber && mobileValue) customer.mobileNumber = mobileValue;
        if (!customer.pan && panValue !== "TEMP") customer.pan = panValue;
        if (!customer.glAccount && glAccountId) customer.glAccount = glAccountId;
        await customer.save();
      }
    }

    // 7. If still no customer, create a new one with unique sequential customerCode
    if (!customer) {
      const customerCode = await generateUniqueCustomerCode(user.companyId);
      try {
        customer = new Customer({
          companyId: user.companyId,
          createdBy: user.id,
          customerName: customerName,
          customerGroup: "Regular",
          customerType: "Business",
          pan: panValue,
          gstNumber: gstValue,
          emailId: emailValue,
          mobileNumber: mobileValue,
          fromOpportunity: opp._id,
          fromLead: lead?._id,
          glAccount: glAccountId,
          customerCode: customerCode,
        });
        await customer.save();
      } catch (err) {
        // Handle duplicate key errors (email or customerCode)
        if (err.code === 11000) {
          const duplicateField = Object.keys(err.keyPattern)[0];
          if (duplicateField === "emailId") {
            const existing = await Customer.findOne({
              companyId: user.companyId,
              emailId: emailValue,
            });
            if (existing) {
              customer = existing;
              if (!customer.fromOpportunity) customer.fromOpportunity = opp._id;
              if (lead && !customer.fromLead) customer.fromLead = lead._id;
              await customer.save();
            } else {
              throw new Error(`Duplicate email but customer not found: ${emailValue}`);
            }
          } else if (duplicateField === "customerCode") {
            // Very rare – regenerate with a fresh sequential number
            const newCode = await generateUniqueCustomerCode(user.companyId);
            customer.customerCode = newCode;
            await customer.save();
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    await customer.populate("glAccount", "accountName accountCode");

    // 8. Link customer to the quotation
    await SalesQuotation.findByIdAndUpdate(quotationId, { customer: customer._id,status: "Approved", });


    // 9. Update lead status if linked
    if (lead) {
      lead.status = "Customer";
      await lead.save();
    }

    // Optional: mark opportunity as Closed Won
    opp.stage = "Closed Won";
    opp.probability = 100;
    opp.customerId = customer._id;
    await opp.save();

    return NextResponse.json({
      success: true,
      data: { customer, quotationId, opportunityId },
    });
  } catch (err) {
    console.error("Close Won Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to close opportunity" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Opportunity from "@/models/crm/Opportunity";
// import Customer from "@/models/CustomerModel";
// import SalesQuotation from "@/models/SalesQuotationModel";
// import Lead from "@/models/crm/load";
// import AccountHead from "@/models/accounts/AccountHead";
// import mongoose from "mongoose";

// function generateDummyPan() {
//   return `TEMP${Math.floor(Math.random() * 10000000)}`;
// }

// // Generate unique customer code
// function generateCustomerCode() {
//   return `CUST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "No token", status: 401 };
//   const decoded = verifyJWT(token);
//   if (!decoded) return { error: "Invalid token", status: 401 };
//   return { user: decoded, error: null };
// }

// export async function POST(req) {
//   try {
//     await dbConnect();
//     const { user, error } = await validateUser(req);
//     if (error || !user) {
//       return NextResponse.json({ success: false, message: error || "Unauthorized" }, { status: 401 });
//     }

//     const { opportunityId, quotationId, customerUpdates } = await req.json();
//     if (!opportunityId || !quotationId) {
//       return NextResponse.json({ success: false, message: "Opportunity ID and Quotation ID required" }, { status: 400 });
//     }

//     // 1. Find opportunity
//     const opp = await Opportunity.findOne({ _id: opportunityId, companyId: user.companyId });
//     if (!opp) return NextResponse.json({ success: false, message: "Opportunity not found" }, { status: 404 });

//     // 2. Verify quotation belongs to this opportunity
//     if (!opp.quotations || !opp.quotations.includes(quotationId)) {
//       return NextResponse.json({ success: false, message: "Quotation does not belong to this opportunity" }, { status: 400 });
//     }

//     // 3. Check if customer already linked to this quotation
//     const existingQuote = await SalesQuotation.findById(quotationId);
//     if (existingQuote.customer) {
//       return NextResponse.json({ success: false, message: "Customer already linked to this quotation" }, { status: 400 });
//     }

//     // 4. GL Account handling
//     let glAccountId = null;
//     if (customerUpdates?.glAccount) {
//       glAccountId = new mongoose.Types.ObjectId(customerUpdates.glAccount._id || customerUpdates.glAccount);
//     } else {
//       const customerName = opp.accountName.trim();
//       let account = await AccountHead.findOne({
//         companyId: user.companyId,
//         name: { $regex: new RegExp(`^${customerName}$`, "i") }
//       });
//       if (!account) {
//         const accountCode = `CUS-${Date.now()}`;
//         account = await AccountHead.create({
//           companyId: user.companyId,
//           name: customerName,
//           code: accountCode,
//           type: "Asset",
//           group: "Accounts Receivable",
//           balanceType: "Debit",
//         });
//       }
//       glAccountId = account._id;
//     }

//     // 5. Prepare customer data from opportunity & lead
//     const lead = await Lead.findOne({ convertedToOpportunity: opp._id });
//     const panValue = customerUpdates?.pan || lead?.pan || generateDummyPan();
//     const gstValue = customerUpdates?.gst || lead?.gstNumber || "";
//     const emailValue = (customerUpdates?.email || lead?.email || "").trim().toLowerCase();
//     const mobileValue = customerUpdates?.mobile || lead?.mobileNo || "";
//     const customerName = opp.accountName.trim();

//     // 6. Try to find existing customer for this opportunity first
//     let customer = await Customer.findOne({ companyId: user.companyId, fromOpportunity: opp._id });

//     // If not found, try to find by email (to avoid duplicates)
//     if (!customer && emailValue) {
//       customer = await Customer.findOne({ companyId: user.companyId, emailId: emailValue });
//       if (customer) {
//         // Link this opportunity to the existing customer
//         customer.fromOpportunity = opp._id;
//         if (lead && !customer.fromLead) customer.fromLead = lead._id;
//         // Update other fields if they are empty
//         if (!customer.customerName) customer.customerName = customerName;
//         if (!customer.gstNumber && gstValue) customer.gstNumber = gstValue;
//         if (!customer.mobileNumber && mobileValue) customer.mobileNumber = mobileValue;
//         if (!customer.pan && panValue !== "TEMP") customer.pan = panValue;
//         if (!customer.glAccount && glAccountId) customer.glAccount = glAccountId;
//         await customer.save();
//       }
//     }

//     // 7. If still no customer, create a new one with unique customerCode
//     if (!customer) {
//       const customerCode = generateCustomerCode();
//       try {
//         customer = new Customer({
//           companyId: user.companyId,
//           createdBy: user.id,
//           customerName: customerName,
//           customerGroup: "Regular",
//           customerType: "Business",
//           pan: panValue,
//           gstNumber: gstValue,
//           emailId: emailValue,
//           mobileNumber: mobileValue,
//           fromOpportunity: opp._id,
//           fromLead: lead?._id,
//           glAccount: glAccountId,
//           customerCode: customerCode,   // ← crucial to avoid unique index violation
//         });
//         await customer.save();
//       } catch (err) {
//         // If duplicate key on email or customerCode, try to find the conflicting customer and reuse
//         if (err.code === 11000) {
//           const duplicateField = Object.keys(err.keyPattern)[0];
//           if (duplicateField === 'emailId') {
//             // Email already exists – fetch and reuse
//             const existing = await Customer.findOne({ companyId: user.companyId, emailId: emailValue });
//             if (existing) {
//               customer = existing;
//               // Update opportunity link if not set
//               if (!customer.fromOpportunity) customer.fromOpportunity = opp._id;
//               if (lead && !customer.fromLead) customer.fromLead = lead._id;
//               await customer.save();
//             } else {
//               throw new Error(`Duplicate email but customer not found: ${emailValue}`);
//             }
//           } else if (duplicateField === 'customerCode') {
//             // Extremely unlikely, but retry with a new code
//             customer = new Customer({
//               ...customer.toObject(),
//               customerCode: generateCustomerCode(),
//             });
//             await customer.save();
//           } else {
//             throw err;
//           }
//         } else {
//           throw err;
//         }
//       }
//     }

//     await customer.populate("glAccount", "accountName accountCode");

//     // 8. Link customer to the quotation
//     await SalesQuotation.findByIdAndUpdate(quotationId, { customer: customer._id });

//     // 9. Update lead status if linked
//     if (lead) {
//       lead.status = "Customer";
//       await lead.save();
//     }

//     return NextResponse.json({ success: true, data: { customer, quotationId, opportunityId } });
//   } catch (err) {
//     console.error("Close Won Error:", err);
//     return NextResponse.json(
//       { success: false, message: err.message || "Failed to close opportunity" },
//       { status: 500 }
//     );
//   }
// }