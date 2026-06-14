// app/api/election/booth/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Booth from "@/models/election/Booth";
import Constituency from "@/models/election/Constituency";
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

  if (!hasPermission(user, "Booths", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const constituencyId = searchParams.get("constituency");
    const blockId = searchParams.get("block");          // NEW
    const wardId = searchParams.get("ward");            // NEW
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    if (id) {
      const booth = await Booth.findOne({ _id: id, companyId: user.companyId })
        .populate("assignedAgent", "name email")
        .populate("incharge", "name email")
        .populate("constituency", "name")
        .populate("block", "blockNumber name")          // NEW
        .populate("ward", "wardNumber name")            // NEW
        .lean();
      if (!booth) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: booth });
    }

    const query = { companyId: user.companyId };
    if (constituencyId) query.constituency = constituencyId;
    if (blockId) query.block = blockId;
    if (wardId) query.ward = wardId;
    if (search) {
      query.$or = [
        { boothNumber: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [booths, total] = await Promise.all([
      Booth.find(query)
        .populate("assignedAgent", "name")
        .populate("incharge", "name")
        .populate("constituency", "name")
        .populate("block", "blockNumber name")          // NEW
        .populate("ward", "wardNumber name")            // NEW
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Booth.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: booths,
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

  if (!hasPermission(user, "Booths", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const payload = { ...data };
    if (payload.totalVoters != null) payload.totalVoters = Number(payload.totalVoters) || 0;
    if (payload.address?.location?.coordinates) {
      payload.address = {
        ...payload.address,
        location: {
          type: payload.address.location.type || "Point",
          coordinates: payload.address.location.coordinates.map(coord => Number(coord) || 0),
        },
      };
    }

    const required = ["boothNumber", "constituency"];
    for (const field of required) {
      if (!payload[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const booth = new Booth({
      ...payload,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await booth.save();

    // Add to constituency's booths array
    await Constituency.findByIdAndUpdate(data.constituency, {
      $push: { booths: booth._id },
    });

    return NextResponse.json({ success: true, data: booth }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create booth" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Booths", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const payload = { ...data };
    if (payload.totalVoters != null) payload.totalVoters = Number(payload.totalVoters) || 0;
    if (payload.address?.location?.coordinates) {
      payload.address = {
        ...payload.address,
        location: {
          type: payload.address.location.type || "Point",
          coordinates: payload.address.location.coordinates.map(coord => Number(coord) || 0),
        },
      };
    }

    const updated = await Booth.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...payload },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Booth not found" }, { status: 404 });
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

  if (!hasPermission(user, "Booths", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const booth = await Booth.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!booth) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    await Constituency.findByIdAndUpdate(booth.constituency, {
      $pull: { booths: booth._id },
    });

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Booth from "@/models/election/Booth";
// import Constituency from "@/models/election/Constituency";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // isAuthorized और validateUser वही है, बस roles में "booth agent" आदि जोड़ सकते हैं
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager", "booth agent"];
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
//     const constituencyId = searchParams.get("constituency");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
//     const search = searchParams.get("search") || "";

//     if (id) {
//       const booth = await Booth.findOne({ _id: id, companyId: user.companyId })
//         .populate("assignedAgent", "name email")
//         .populate("incharge", "name email")
//         .populate("constituency", "name")
//         .lean();
//       if (!booth) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: booth });
//     }

//     const query = { companyId: user.companyId };
//     if (constituencyId) query.constituency = constituencyId;
//     if (search) {
//       query.$or = [
//         { boothNumber: { $regex: search, $options: "i" } },
//         { name: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [booths, total] = await Promise.all([
//       Booth.find(query)
//         .populate("assignedAgent", "name")
//         .populate("incharge", "name")
//         .populate("constituency", "name")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       Booth.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: booths,
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
//     const required = ["boothNumber", "constituency"];
//     for (const field of required) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     const booth = new Booth({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });
//     await booth.save();

//     // Constituency के booths array में जोड़ें
//     await Constituency.findByIdAndUpdate(data.constituency, {
//       $push: { booths: booth._id },
//     });

//     return NextResponse.json({ success: true, data: booth }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to create booth" }, { status: 500 });
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
//     const updated = await Booth.findOneAndUpdate(
//       { _id: id, companyId: user.companyId },
//       { ...data },
//       { new: true, runValidators: true }
//     );
//     if (!updated) return NextResponse.json({ success: false, message: "Booth not found" }, { status: 404 });
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

//     const booth = await Booth.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!booth) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

//     // Constituency से भी हटाएँ
//     await Constituency.findByIdAndUpdate(booth.constituency, {
//       $pull: { booths: booth._id },
//     });

//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
//   }
// }