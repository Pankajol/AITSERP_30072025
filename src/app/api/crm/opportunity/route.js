import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Opportunity from "@/models/crm/Opportunity";
import { NextResponse } from "next/server";

// Helper to validate user
async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  return verifyJWT(token);
}

// ------------------------- GET (list or single by ?id) -------------------------
export async function GET(req) {
  try {
    await dbConnect();
    const user = await getUser(req);
    if (!user?.companyId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Single opportunity by query param
    if (id) {
      const opp = await Opportunity.findOne({ _id: id, companyId: user.companyId }).lean();
      if (!opp) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: opp });
    }

    // Paginated list
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const stage = searchParams.get("stage");

    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { opportunityName: { $regex: search, $options: "i" } },
        { accountName: { $regex: search, $options: "i" } },
      ];
    }
    if (stage && stage !== "All") query.stage = stage;

    const skip = (page - 1) * limit;
    const [opportunities, total] = await Promise.all([
      Opportunity.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Opportunity.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: opportunities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ------------------------- POST (create) -------------------------
export async function POST(req) {
  try {
    await dbConnect();
    const user = await getUser(req);
    if (!user?.companyId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.opportunityName || !body.accountName || !body.closeDate) {
      return NextResponse.json({ success: false, message: "Required fields missing" }, { status: 400 });
    }

    const newOpp = new Opportunity({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await newOpp.save();

    return NextResponse.json({ success: true, data: newOpp }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ------------------------- PUT (update) – optional, but can keep via query param too -------------------------
export async function PUT(req) {
  try {
    await dbConnect();
    const user = await getUser(req);
    if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const body = await req.json();
    const updated = await Opportunity.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ------------------------- DELETE (optional via query param) -------------------------
export async function DELETE(req) {
  try {
    await dbConnect();
    const user = await getUser(req);
    if (!user?.companyId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Opportunity.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}




// // app/api/opportunity/route.js
// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Opportunity from "@/models/crm/Opportunity";


// // -------------------------------
// //  CREATE OPPORTUNITY (POST)
// // -------------------------------
// export async function POST(req) {
//   try {
//     await dbConnect();

//     // Get token
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
//     }

//     // Validate token
//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId) {
//       return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), { status: 403 });
//     }

//     const body = await req.json();

//     // Inject companyId from JWT
//     const opportunity = new Opportunity({
//       ...body,
//       companyId: decoded.companyId,
//     });

//     const saved = await opportunity.save();

//     return new Response(
//       JSON.stringify({ success: true, data: saved }),
//       { status: 201 }
//     );

//   } catch (err) {
//     console.error("POST Opportunity Error:", err);
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }



// // -------------------------------
// //  GET OPPORTUNITIES (PAGINATION)
// // -------------------------------
// export async function GET(req) {
//   try {
//     await dbConnect();

//     // Get token
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
//     }

//     // Validate token
//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId) {
//       return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), { status: 403 });
//     }

//     // URL params
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get("page")) || 1;
//     const limit = parseInt(searchParams.get("limit")) || 10;
//     const skip = (page - 1) * limit;

//     // Fetch only that company's opportunities
//     const query = { companyId: decoded.companyId };

//     const [opportunities, total] = await Promise.all([
//       Opportunity.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
//       Opportunity.countDocuments(query),
//     ]);

//     return new Response(
//       JSON.stringify({
//         success: true,
//         data: opportunities,
//         pagination: {
//           total,
//           page,
//           limit,
//           totalPages: Math.ceil(total / limit),
//         },
//       }),
//       { status: 200 }
//     );

//   } catch (err) {
//     console.error("GET Opportunity Error:", err);
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }
