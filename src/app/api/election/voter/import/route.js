// app/api/election/voter/import/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Voter from "@/models/election/Voter";
import Booth from "@/models/election/Booth";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function POST(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const { voters } = body;

    if (!Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { success: false, message: "No voters data provided" },
        { status: 400 }
      );
    }

    const requiredFields = ["firstName", "booth"];
    const invalidRows = [];
    const successRows = [];
    const duplicateVoterIds = [];

    const voterIds = voters
      .map((v) => v.voterId)
      .filter((id) => id && id.trim());
    let existingIds = [];
    if (voterIds.length > 0) {
      const existing = await Voter.find(
        {
          companyId: user.companyId,
          voterId: { $in: voterIds },
        },
        { voterId: 1 }
      ).lean();
      existingIds = existing.map((v) => v.voterId);
    }

    const boothIds = voters.map((v) => v.booth);
    const validBooths = await Booth.find({
      _id: { $in: boothIds },
      companyId: user.companyId,
    })
      .select("_id")
      .lean();
    const validBoothIdSet = new Set(validBooths.map((b) => b._id.toString()));

    for (let i = 0; i < voters.length; i++) {
      const v = voters[i];
      const rowNum = i + 1;

      if (!v.firstName?.trim() || !v.booth) {
        invalidRows.push({ row: rowNum, reason: "Missing firstName or booth" });
        continue;
      }

      if (!validBoothIdSet.has(v.booth.toString())) {
        invalidRows.push({ row: rowNum, reason: "Invalid booth ID" });
        continue;
      }

      if (v.voterId && existingIds.includes(v.voterId)) {
        duplicateVoterIds.push({ row: rowNum, voterId: v.voterId });
        continue;
      }

      try {
        const voter = new Voter({
          firstName: v.firstName,
          middleName: v.middleName,
          lastName: v.lastName,
          voterId: v.voterId || undefined,
          aadhaar: v.aadhaar || undefined,
          phone: v.phone,
          altPhone: v.altPhone,
          email: v.email,
          age: v.age ? Number(v.age) : undefined,
          dob: v.dob || undefined,
          gender: v.gender || undefined,
          caste: v.caste || undefined,
          religion: v.religion || undefined,
          occupation: v.occupation || undefined,
          education: v.education || undefined,
          address: {
            line1: v.addressLine1 || v.address?.line1 || "",
            village: v.village || v.address?.village || "",
            postOffice: v.postOffice || v.address?.postOffice || "",
            pincode: v.pincode || v.address?.pincode || "",
          },
          booth: v.booth,
          supportLevel: v.supportLevel || undefined,
          influenceRating: v.influenceRating ? Number(v.influenceRating) : undefined,
          tags: v.tags
            ? (Array.isArray(v.tags) ? v.tags : v.tags.split(",").map((t) => t.trim()).filter(Boolean))
            : [],
          membershipNumber: v.membershipNumber || undefined,
          companyId: user.companyId,
          createdBy: user.id,
        });

        await voter.save();
        successRows.push(voter._id);

        await Booth.findByIdAndUpdate(v.booth, { $inc: { totalVoters: 1 } });
      } catch (err) {
        invalidRows.push({ row: rowNum, reason: err.message || "Failed to save" });
      }
    }

    return NextResponse.json({
      success: true,
      imported: successRows.length,
      failed: invalidRows.length,
      duplicates: duplicateVoterIds.length,
      details: {
        invalidRows,
        duplicateVoterIds,
      },
    });
  } catch (err) {
    console.error("Voter import error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during import" },
      { status: 500 }
    );
  }
}



// // app/api/election/voter/import/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Voter from "@/models/election/Voter";
// import Booth from "@/models/election/Booth";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager", "canvasser", "booth agent"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function POST(req) {
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   await dbConnect();

//   try {
//     const body = await req.json();
//     const { voters } = body; // आगे से भेजी गई voters की array

//     if (!Array.isArray(voters) || voters.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "No voters data provided" },
//         { status: 400 }
//       );
//     }

//     // आवश्यक फ़ील्ड चेक – हर voter में firstName और booth होना चाहिए
//     const requiredFields = ["firstName", "booth"];
//     const invalidRows = [];
//     const successRows = [];
//     const duplicateVoterIds = [];

//     // सभी voterIds इकट्ठा करके पहले से मौजूद चेक करें (स्पीड के लिए)
//     const voterIds = voters
//       .map((v) => v.voterId)
//       .filter((id) => id && id.trim());
//     let existingIds = [];
//     if (voterIds.length > 0) {
//       const existing = await Voter.find(
//         {
//           companyId: user.companyId,
//           voterId: { $in: voterIds },
//         },
//         { voterId: 1 }
//       ).lean();
//       existingIds = existing.map((v) => v.voterId);
//     }

//     // बूथ IDs की वैधता चेक करने के लिए सभी booth IDs एकत्र करें
//     const boothIds = voters.map((v) => v.booth);
//     const validBooths = await Booth.find({
//       _id: { $in: boothIds },
//       companyId: user.companyId,
//     })
//       .select("_id")
//       .lean();
//     const validBoothIdSet = new Set(validBooths.map((b) => b._id.toString()));

//     for (let i = 0; i < voters.length; i++) {
//       const v = voters[i];
//       const rowNum = i + 1;

//       // ज़रूरी फ़ील्ड चेक
//       if (!v.firstName?.trim() || !v.booth) {
//         invalidRows.push({ row: rowNum, reason: "Missing firstName or booth" });
//         continue;
//       }

//       // बूथ वैध है?
//       if (!validBoothIdSet.has(v.booth.toString())) {
//         invalidRows.push({ row: rowNum, reason: "Invalid booth ID" });
//         continue;
//       }

//       // अगर voterId दिया है और पहले से मौजूद है
//       if (v.voterId && existingIds.includes(v.voterId)) {
//         duplicateVoterIds.push({ row: rowNum, voterId: v.voterId });
//         continue;
//       }

//       try {
//         const voter = new Voter({
//           firstName: v.firstName,
//           middleName: v.middleName,
//           lastName: v.lastName,
//           voterId: v.voterId || undefined,
//           aadhaar: v.aadhaar || undefined,
//           phone: v.phone,
//           altPhone: v.altPhone,
//           email: v.email,
//           age: v.age ? Number(v.age) : undefined,
//           dob: v.dob || undefined,
//           gender: v.gender || undefined,
//           caste: v.caste || undefined,
//           religion: v.religion || undefined,
//           occupation: v.occupation || undefined,
//           education: v.education || undefined,
//           address: {
//             line1: v.addressLine1 || v.address?.line1 || "",
//             village: v.village || v.address?.village || "",
//             postOffice: v.postOffice || v.address?.postOffice || "",
//             pincode: v.pincode || v.address?.pincode || "",
//           },
//           booth: v.booth,
//           supportLevel: v.supportLevel || undefined,
//           influenceRating: v.influenceRating ? Number(v.influenceRating) : undefined,
//           tags: v.tags
//             ? (Array.isArray(v.tags) ? v.tags : v.tags.split(",").map((t) => t.trim()).filter(Boolean))
//             : [],
//           membershipNumber: v.membershipNumber || undefined,
//           companyId: user.companyId,
//           createdBy: user.id,
//         });

//         await voter.save();
//         successRows.push(voter._id);

//         // बूथ का totalVoters बढ़ाएँ
//         await Booth.findByIdAndUpdate(v.booth, { $inc: { totalVoters: 1 } });
//       } catch (err) {
//         invalidRows.push({ row: rowNum, reason: err.message || "Failed to save" });
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       imported: successRows.length,
//       failed: invalidRows.length,
//       duplicates: duplicateVoterIds.length,
//       details: {
//         invalidRows,
//         duplicateVoterIds,
//       },
//     });
//   } catch (err) {
//     console.error("Voter import error:", err);
//     return NextResponse.json(
//       { success: false, message: "Server error during import" },
//       { status: 500 }
//     );
//   }
// }