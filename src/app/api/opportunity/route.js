// app/api/opportunity/route.js
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Opportunity from "@/models/Opportunity";


// -------------------------------
//  CREATE OPPORTUNITY (POST)
// -------------------------------
export async function POST(req) {
  try {
    await dbConnect();

    // Get token
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    // Validate token
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), { status: 403 });
    }

    const body = await req.json();

    // Inject companyId from JWT
    const opportunity = new Opportunity({
      ...body,
      companyId: decoded.companyId,
    });

    const saved = await opportunity.save();

    return new Response(
      JSON.stringify({ success: true, data: saved }),
      { status: 201 }
    );

  } catch (err) {
    console.error("POST Opportunity Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}



// -------------------------------
//  GET OPPORTUNITIES (PAGINATION)
// -------------------------------
export async function GET(req) {
  try {
    await dbConnect();

    // Get token
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
    }

    // Validate token
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), { status: 403 });
    }

    // URL params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Fetch only that company's opportunities
    const query = { companyId: decoded.companyId };

    const [opportunities, total] = await Promise.all([
      Opportunity.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Opportunity.countDocuments(query),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: opportunities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error("GET Opportunity Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
