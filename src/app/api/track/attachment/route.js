export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";
import EmailCampaign from "@/models/EmailCampaign";

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const id = url.searchParams.get("id"); // EmailLog id
    const ix = parseInt(url.searchParams.get("ix") || "0", 10); // optional attachment index

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }

    // find log to get campaignId
    const log = await EmailLog.findById(id).lean();
    if (!log || !log.campaignId) {
      // still return 404 or simple message
      return new Response(JSON.stringify({ error: "Log not found" }), { status: 404 });
    }

    // try to load campaign to find attachments array
    const campaign = await EmailCampaign.findById(log.campaignId).lean();
    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404 });
    }

    const attachments = Array.isArray(campaign.attachments) ? campaign.attachments : [];
    const idx = Number.isFinite(ix) && ix >= 0 && ix < attachments.length ? ix : 0;
    const attachmentUrl = attachments[idx];

    if (!attachmentUrl) {
      return new Response(JSON.stringify({ error: "Attachment not found" }), { status: 404 });
    }

    // update log
    try {
      await EmailLog.findByIdAndUpdate(id, {
        $set: { attachmentDownloadedAt: new Date(), lastDownloadedAttachmentIndex: idx },
        $inc: { attachmentDownloadCount: 1 },
      });
    } catch (err) {
      console.error("attachment log update error:", err);
      // continue to redirect anyway
    }

    return Response.redirect(attachmentUrl, 302);
  } catch (err) {
    console.error("track/attachment handler error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}



// import dbConnect from "@/lib/db";
// import EmailLog from "@/models/EmailLog";
// import fs from "fs";
// import path from "path";

// export async function GET(req) {
//   try {
//     await dbConnect();

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");

//     if (!id) return new Response("Missing ID", { status: 400 });

//     await EmailLog.findByIdAndUpdate(id, {
//       attachmentOpened: true,
//     });

//     // TODO: yahan apni actual file ka path use karo
//     const filePath = path.join(process.cwd(), "upload", "sample.pdf");

//     if (!fs.existsSync(filePath)) {
//       return new Response("File not found", { status: 404 });
//     }

//     const file = fs.readFileSync(filePath);

//     return new Response(file, {
//       headers: {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": "inline; filename=attachment.pdf",
//       },
//     });
//   } catch (err) {
//     console.error("attachment track error:", err);
//     return new Response("Error", { status: 500 });
//   }
// }
