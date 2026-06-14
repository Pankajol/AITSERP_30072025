import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Voter from "@/models/election/Voter";
import Booth from "@/models/election/Booth";
import Block from "@/models/election/Block";
import Ward from "@/models/election/Ward";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

function normalizeField(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

function normalizeVoterRow(raw) {
  const lower = Object.keys(raw).reduce((acc, key) => {
    acc[key.toLowerCase()] = raw[key];
    return acc;
  }, {});

  return {
    firstName: normalizeField(lower, ["firstname", "first name", "first_name"]),
    middleName: normalizeField(lower, ["middlename", "middle name", "middle_name"]),
    lastName: normalizeField(lower, ["lastname", "last name", "last_name"]),
    voterId: normalizeField(lower, ["voterid", "voter id", "voter_id"]),
    aadhaar: normalizeField(lower, ["aadhaar", "aadhar"]),
    phone: normalizeField(lower, ["phone", "mobile", "mobile number"]),
    altPhone: normalizeField(lower, ["altphone", "alt phone", "alternate phone", "alternatephone"]),
    email: normalizeField(lower, ["email", "email address"]),
    age: normalizeField(lower, ["age"]),
    dob: normalizeField(lower, ["dob", "dateofbirth", "date of birth", "date_of_birth"]),
    gender: normalizeField(lower, ["gender"]),
    caste: normalizeField(lower, ["caste"]),
    religion: normalizeField(lower, ["religion"]),
    occupation: normalizeField(lower, ["occupation"]),
    education: normalizeField(lower, ["education"]),
    address: {
      line1: normalizeField(lower, ["addressline1", "address line1", "address line 1", "address_line1", "address_line_1", "line1"]),
      village: normalizeField(lower, ["village"]),
      postOffice: normalizeField(lower, ["postoffice", "post office", "post_office"]),
      pincode: normalizeField(lower, ["pincode", "pin code", "pin", "zip"]),
    },
    constituencyId: normalizeField(lower, ["constituencyid", "constituency id", "constituency_id"]),
    block: normalizeField(lower, ["block", "blockid", "block id", "block_id"]),
    ward: normalizeField(lower, ["ward", "wardid", "ward id", "ward_id"]),
    booth: normalizeField(lower, ["booth", "boothid", "booth id", "booth_id"]),
    supportLevel: normalizeField(lower, ["supportlevel", "support level", "support_level"]),
    influenceRating: normalizeField(lower, ["influencerating", "influence rating", "influence_rating"]),
    tags: normalizeField(lower, ["tags"]),
    membershipNumber: normalizeField(lower, ["membershipnumber", "membership number", "membership_number"]),
    rowNum: normalizeField(lower, ["rownum", "row num", "row_number"]),
  };
}

export async function POST(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  // Extract assigned areas from the user object (must be populated in JWT)
  const assignedConstituency = user.assignedConstituency?._id || user.assignedConstituency || null;
  const assignedBlock = user.assignedBlock?._id || user.assignedBlock || null;
  const assignedWard = user.assignedWard?._id || user.assignedWard || null;
  const assignedBooths = user.assignedBooths?.map(b => b._id) || [];
  const isRestricted = !!(assignedConstituency || assignedBlock || assignedWard || assignedBooths.length);

  try {
    const body = await req.json();
    const rawVoters = body.voters;
    let voters = Array.isArray(rawVoters) ? rawVoters.map(normalizeVoterRow) : [];

    if (!Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { success: false, message: "No voters data provided" },
        { status: 400 }
      );
    }

    // For restricted users, automatically fill missing hierarchy fields from JWT
    if (isRestricted) {
      voters = voters.map(v => ({
        ...v,
        constituencyId: v.constituencyId || assignedConstituency,
        block: v.block || assignedBlock,
        ward: v.ward || assignedWard,
        // If exactly one booth assigned, use it; otherwise keep as is (CSV must provide)
        booth: v.booth || (assignedBooths.length === 1 ? assignedBooths[0] : undefined),
      }));
    }

    const invalidRows = [];
    const successRows = [];
    const duplicateVoterIds = [];

    // Check duplicate Voter IDs
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

    // Validate booths, blocks, wards
    const boothIds = voters.map(v => v.booth).filter(id => id);
    const blockIds = voters.map(v => v.block).filter(id => id);
    const wardIds = voters.map(v => v.ward).filter(id => id);

    const validBooths = await Booth.find({
      _id: { $in: boothIds },
      companyId: user.companyId,
    }).select("_id").lean();
    const validBoothIdSet = new Set(validBooths.map(b => b._id.toString()));

    const validBlocks = await Block.find({
      _id: { $in: blockIds },
      companyId: user.companyId,
    }).select("_id").lean();
    const validBlockIdSet = new Set(validBlocks.map(b => b._id.toString()));

    const validWards = await Ward.find({
      _id: { $in: wardIds },
      companyId: user.companyId,
    }).select("_id").lean();
    const validWardIdSet = new Set(validWards.map(w => w._id.toString()));

    for (let i = 0; i < voters.length; i++) {
      const v = voters[i];
      const rowNum = i + 1;

      if (!v.firstName?.trim()) {
        invalidRows.push({ row: rowNum, reason: "Missing firstName" });
        continue;
      }

      // For restricted users, at least one of booth/block/ward may have been auto-filled; check again
      const hasLocation = !!(v.booth || v.block || v.ward);
      if (!hasLocation) {
        invalidRows.push({ row: rowNum, reason: "Missing booth/block/ward – at least one required" });
        continue;
      }

      // Validate booth if provided
      if (v.booth && !validBoothIdSet.has(v.booth.toString())) {
        invalidRows.push({ row: rowNum, reason: `Invalid booth ID: ${v.booth}` });
        continue;
      }
      // Validate block if provided
      if (v.block && !validBlockIdSet.has(v.block.toString())) {
        invalidRows.push({ row: rowNum, reason: `Invalid block ID: ${v.block}` });
        continue;
      }
      // Validate ward if provided
      if (v.ward && !validWardIdSet.has(v.ward.toString())) {
        invalidRows.push({ row: rowNum, reason: `Invalid ward ID: ${v.ward}` });
        continue;
      }

      // Check duplicate Voter ID
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
            line1: v.address?.line1 || "",
            village: v.address?.village || "",
            postOffice: v.address?.postOffice || "",
            pincode: v.address?.pincode || "",
          },
          constituencyId: v.constituencyId || undefined,
          block: v.block || undefined,
          ward: v.ward || undefined,
          booth: v.booth || undefined,
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

        // Increment totalVoters on booth if present
        if (v.booth) {
          await Booth.findByIdAndUpdate(v.booth, { $inc: { totalVoters: 1 } });
        }
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