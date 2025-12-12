import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailLog from "@/models/EmailLog";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    await dbConnect();

    // -----------------------
    // AUTH CHECK
    // -----------------------
    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
      });

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("JWT verify failed:", err?.message);
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
      });
    }

    if (!decoded?.companyId)
      return new Response(JSON.stringify({ success: false, error: "Invalid token (no company)" }), {
        status: 403,
      });

    // -----------------------
    // PARAMS CHECK
    // -----------------------
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid campaign ID" }), {
        status: 400,
      });
    }

    // -----------------------
    // FETCH LOGS
    // -----------------------
    const logs = await EmailLog.find({
      campaignId: id,
      companyId: decoded.companyId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return new Response(
      JSON.stringify({
        success: true,
        data: logs,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("LOG FETCH ERROR:", err);

    return new Response(
      JSON.stringify({ success: false, error: err.message || "Server error" }),
      { status: 500 }
    );
  }
}




// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import EmailLog from "@/models/EmailLog";

// export async function GET(req, { params }) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId)
//       return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403 });

//     const { id } = params;

//     const logs = await EmailLog.find({
//       campaignId: id,
//       companyId: decoded.companyId,
//     }).sort({ createdAt: -1 });

//     return new Response(
//       JSON.stringify({
//         success: true,
//         data: logs
//       }),
//       { status: 200 }
//     );

//   } catch (err) {
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }
