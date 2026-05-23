// app/api/election/voter/route.js
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

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 200);
    const search = searchParams.get("search") || "";

    const booth = searchParams.get("booth");
    const supportLevel = searchParams.get("supportLevel");
    const caste = searchParams.get("caste");
    const gender = searchParams.get("gender");
    const phone = searchParams.get("phone");
    const voterId = searchParams.get("voterId");

    if (id) {
      const voter = await Voter.findOne({ _id: id, companyId: user.companyId })
        .populate("booth", "boothNumber name constituency")
        .populate("contactHistory.createdBy", "name")
        .populate("surveys.survey", "title")
        .populate("surveys.surveyedBy", "name")
        .lean();
      if (!voter) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: voter });
    }

    const query = { companyId: user.companyId };
    if (booth) query.booth = booth;
    if (supportLevel) query.supportLevel = supportLevel;
    if (caste) query.caste = caste;
    if (gender) query.gender = gender;
    if (phone) query.phone = phone;
    if (voterId) query.voterId = voterId;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { voterId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [voters, total] = await Promise.all([
      Voter.find(query)
        .populate("booth", "boothNumber name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Voter.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: voters,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const required = ["firstName", "booth"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    if (data.voterId) {
      const exists = await Voter.findOne({ voterId: data.voterId, companyId: user.companyId });
      if (exists) {
        return NextResponse.json({ success: false, message: "Voter ID already exists" }, { status: 400 });
      }
    }

    const voter = new Voter({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await voter.save();

    await Booth.findByIdAndUpdate(data.booth, { $inc: { totalVoters: 1 } });

    return NextResponse.json({ success: true, data: voter }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create voter" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await Voter.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Voter not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const voter = await Voter.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!voter) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    await Booth.findByIdAndUpdate(voter.booth, { $inc: { totalVoters: -1 } });

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}




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
//   return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
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

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 200); // voters list may be larger
//     const search = searchParams.get("search") || "";

//     // Filters
//     const booth = searchParams.get("booth");
//     const supportLevel = searchParams.get("supportLevel");
//     const caste = searchParams.get("caste");
//     const gender = searchParams.get("gender");
//     const phone = searchParams.get("phone");
//     const voterId = searchParams.get("voterId");

//     if (id) {
//       const voter = await Voter.findOne({ _id: id, companyId: user.companyId })
//         .populate("booth", "boothNumber name constituency")
//         .populate("contactHistory.createdBy", "name")
//         .populate("surveys.survey", "title")
//         .populate("surveys.surveyedBy", "name")
//         .lean();
//       if (!voter) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: voter });
//     }

//     const query = { companyId: user.companyId };
//     if (booth) query.booth = booth;
//     if (supportLevel) query.supportLevel = supportLevel;
//     if (caste) query.caste = caste;
//     if (gender) query.gender = gender;
//     if (phone) query.phone = phone;
//     if (voterId) query.voterId = voterId;

//     if (search) {
//       query.$or = [
//         { firstName: { $regex: search, $options: "i" } },
//         { lastName: { $regex: search, $options: "i" } },
//         { voterId: { $regex: search, $options: "i" } },
//         { phone: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [voters, total] = await Promise.all([
//       Voter.find(query)
//         .populate("booth", "boothNumber name")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       Voter.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: voters,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();
//     const required = ["firstName", "booth"];
//     for (const field of required) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     // यूनीक voterId चेक (यदि दिया हो)
//     if (data.voterId) {
//       const exists = await Voter.findOne({ voterId: data.voterId, companyId: user.companyId });
//       if (exists) {
//         return NextResponse.json({ success: false, message: "Voter ID already exists" }, { status: 400 });
//       }
//     }

//     const voter = new Voter({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });
//     await voter.save();

//     // बूथ में टोटल वोटर बढ़ाएँ
//     await Booth.findByIdAndUpdate(data.booth, { $inc: { totalVoters: 1 } });

//     return NextResponse.json({ success: true, data: voter }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to create voter" }, { status: 500 });
//   }
// }

// export async function PUT(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

//     const data = await req.json();
//     const updated = await Voter.findOneAndUpdate(
//       { _id: id, companyId: user.companyId },
//       { ...data },
//       { new: true, runValidators: true }
//     );
//     if (!updated) return NextResponse.json({ success: false, message: "Voter not found" }, { status: 404 });
//     return NextResponse.json({ success: true, data: updated });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
//   }
// }

// export async function DELETE(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

//     const voter = await Voter.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!voter) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

//     // बूथ का टोटल वोटर घटाएँ
//     await Booth.findByIdAndUpdate(voter.booth, { $inc: { totalVoters: -1 } });

//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
//   }
// }