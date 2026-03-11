export const runtime = "nodejs";
import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    
    const logId = searchParams.get("logId") || searchParams.get("id");
    let target = searchParams.get("url");

    if (!target) {
      console.error("Missing target URL in tracking");
      return Response.redirect(process.env.NEXT_PUBLIC_BASE_URL || "/", 302);
    }

    // --- CRITICAL FIX START ---
    // Agar target sirf "pankajal.in" hai, toh browser use relative path samajhta hai.
    // Use absolute banane ke liye https:// check karna zaroori hai.
    let finalRedirectUrl = target;
    if (!finalRedirectUrl.startsWith("http://") && !finalRedirectUrl.startsWith("https://")) {
        finalRedirectUrl = "https://" + finalRedirectUrl;
    }
    // --- CRITICAL FIX END ---

    if (logId) {
      try {
        await EmailLog.findByIdAndUpdate(logId, {
          $inc: { clickCount: 1 },
          $set: { 
            linkClicked: true, 
            clickedAt: new Date(), 
            lastClickUrl: finalRedirectUrl // Updated URL save karein
          }
        });
        console.log("✅ Click Logged for:", logId);
      } catch (err) {
        console.error("❌ DB Update Error:", err);
      }
    }

    // Ab ye pakka pankajal.in par jayega, aapke Vercel domain par nahi.
    return Response.redirect(finalRedirectUrl, 302);

  } catch (err) {
    console.error("Fatal Tracking Error:", err);
    return Response.redirect(process.env.NEXT_PUBLIC_BASE_URL || "/", 302);
  }
}


// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import EmailLog from "@/models/EmailLog";

// export async function GET(req) {
//   try {
//     await dbConnect();

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");
//     // url param may be encoded, e.g. url=https%3A%2F%2Fexample.com
//     const target = url.searchParams.get("url");

//     if (!id || !target) {
//       return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
//     }

//     // log click (timestamp + increment)
//     try {
//       await EmailLog.findByIdAndUpdate(
//         id,
//         {
//           $set: { clickedAt: new Date(), lastClickUrl: target },
//           $inc: { clickCount: 1 },
//         },
//         { new: true }
//       );
//     } catch (err) {
//       console.error("link track update error:", err);
//       // continue to redirect even on DB error
//     }

//     // redirect to target
//     return Response.redirect(target, 302);
//   } catch (err) {
//     console.error("track/link handler error:", err);
//     return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
//   }
// }



// import dbConnect from "@/lib/db";
// import EmailLog from "@/models/EmailLog";

// export async function GET(req) {
//   try {
//     await dbConnect();
//     const { searchParams } = new URL(req.url);

//     const id = searchParams.get("id");
//     const redirect = searchParams.get("url");

//     if (!id || !redirect)
//       return new Response("Invalid request", { status: 400 });

//     await EmailLog.findByIdAndUpdate(id, {
//       linkClicked: true,
//     });

//     return Response.redirect(redirect);

//   } catch (err) {
//     return new Response("Error", { status: 500 });
//   }
// }
