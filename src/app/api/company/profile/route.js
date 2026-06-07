import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import jwt from "jsonwebtoken";

async function getCompanyIdFromToken(req) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || decoded.companyId || null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const company = await Company.findById(companyId).select("-password");
    if (!company) return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    return NextResponse.json({ success: true, company });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    // Allowed fields (everything except password, _id, etc.)
    const allowedFields = [
      "companyName", "contactName", "phone", "email", "country", "address", "pinCode", "agreeToTerms",
      "businessType", "industry", "gstNumber", "plan", "paymentMethod", "planActivatedAt", "trialEndsAt",
      "managementType", "erpModules", "employeeCount", "societyRegNo", "totalFlats", "committeeName",
      "licenseNumber", "facilityType", "bedCapacity", "institutionCode", "boardOrUniversity", "studentCapacity",
      "storePan", "outletCount", "primaryCategory", "constituencyName", "electionType", "electionDate", "boothCount",
      "workingHours", "supportEmails"
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    // Special handling for nested objects
    if (body.workingHours) updateData.workingHours = body.workingHours;
    if (body.supportEmails) updateData.supportEmails = body.supportEmails;
    // Date fields
    if (body.electionDate) updateData.electionDate = new Date(body.electionDate);
    if (body.planActivatedAt) updateData.planActivatedAt = new Date(body.planActivatedAt);
    if (body.trialEndsAt) updateData.trialEndsAt = new Date(body.trialEndsAt);
    await dbConnect();
    const company = await Company.findByIdAndUpdate(companyId, { $set: updateData }, { new: true, runValidators: true }).select("-password");
    if (!company) return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 });
    return NextResponse.json({ success: true, company });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Update failed: " + error.message }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import jwt from "jsonwebtoken";

// // Helper to verify JWT and get company ID
// async function getCompanyIdFromToken(req) {
//   const authHeader = req.headers.get("authorization");
//   const token = authHeader?.split(" ")[1];
//   if (!token) return null;
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     return decoded.id || decoded.companyId;
//   } catch {
//     return null;
//   }
// }

// // GET – fetch company profile
// export async function GET(req) {
//   try {
//     const companyId = await getCompanyIdFromToken(req);
//     if (!companyId) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     await dbConnect();
//     const company = await Company.findById(companyId).select("-password");
//     if (!company) {
//       return NextResponse.json({ message: "Company not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, company });
//   } catch (error) {
//     console.error("GET /api/company/profile error:", error);
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }

// // PUT – update company profile
// export async function PUT(req) {
//   try {
//     const companyId = await getCompanyIdFromToken(req);
//     if (!companyId) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const body = await req.json();
//     const {
//       contactName,
//       phone,
//       address,
//       pinCode,
//       societyRegNo,
//       constituencyName,
//       electionType,
//       electionDate,
//       boothCount,
//     } = body;

//     await dbConnect();
//     const company = await Company.findByIdAndUpdate(
//       companyId,
//       {
//         contactName,
//         phone,
//         address,
//         pinCode,
//         societyRegNo,
//         constituencyName,
//         electionType,
//         electionDate: electionDate || undefined,
//         boothCount,
//       },
//       { new: true, runValidators: true }
//     ).select("-password");

//     if (!company) {
//       return NextResponse.json({ message: "Company not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, company });
//   } catch (error) {
//     console.error("PUT /api/company/profile error:", error);
//     return NextResponse.json({ message: "Update failed" }, { status: 500 });
//   }
// }
