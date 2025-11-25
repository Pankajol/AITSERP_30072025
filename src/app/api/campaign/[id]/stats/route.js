import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailLog from "@/models/EmailLog";

export async function GET(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.companyId)
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403 });

    const { id } = params;

    const logs = await EmailLog.find({ campaignId: id });

    const total = logs.length;
    const opens = logs.filter(l => l.isOpened).length;
    const attachments = logs.filter(l => l.attachmentOpened).length;
    const clicks = logs.filter(l => l.linkClicked).length;

    return new Response(JSON.stringify({
      success: true,
      data: {
        total,
        opens,
        attachments,
        clicks
      }
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500 });
  }
}
