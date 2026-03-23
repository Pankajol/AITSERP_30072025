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
      console.error("❌ Missing target URL");
      return Response.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL).href, 302);
    }

    // --- FORCE EXTERNAL REDIRECT LOGIC ---
    let finalRedirectUrl;
    try {
      // Agar target "pankajal.in" hai, toh use "https://" ke saath jodo
      let cleanTarget = target.trim();
      if (!cleanTarget.startsWith("http")) {
        cleanTarget = "https://" + cleanTarget;
      }
      
      // URL object validate karega ki link sahi hai
      const validUrl = new URL(cleanTarget);
      finalRedirectUrl = validUrl.href;
    } catch (e) {
      console.error("❌ Invalid Target URL:", target);
      return Response.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL).href, 302);
    }

    // --- DB UPDATE ---
    if (logId) {
      try {
        await EmailLog.findByIdAndUpdate(logId, {
          $inc: { clickCount: 1 },
          $set: { 
            linkClicked: true, 
            clickedAt: new Date(), 
            lastClickUrl: finalRedirectUrl 
          }
        });
        console.log("✅ Click Logged for:", logId);
      } catch (dbErr) {
        console.error("❌ DB Update Error:", dbErr.message);
      }
    }

    // --- FINAL REDIRECT ---
    // Header add kar rahe hain cache clear karne ke liye
    return new Response(null, {
      status: 302,
      headers: {
        Location: finalRedirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (err) {
    console.error("❌ Fatal Tracking Error:", err);
    const fallback = process.env.NEXT_PUBLIC_BASE_URL || "https://aitserp-30072025.vercel.app";
    return Response.redirect(fallback, 302);
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
