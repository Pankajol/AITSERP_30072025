export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    // 'id' ya 'logId' jo bhi aapne URL mein bheja ho
    const id = url.searchParams.get("logId") || url.searchParams.get("id");
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing target URL", { status: 400 });
    }

    if (id) {
      try {
        // Log click: Timestamp set karega aur click count badhayega
        await EmailLog.findByIdAndUpdate(
          id,
          {
            $set: { 
              clickedAt: new Date(), 
              lastClickUrl: target,
              status: "clicked" // Status update karna reporting ke liye acha hota hai
            },
            $inc: { clickCount: 1 },
          }
        );
        console.log(`✅ Click tracked for log: ${id}`);
      } catch (err) {
        console.error("❌ Link track DB update error:", err.message);
        // DB error aane par bhi user ka experience kharab nahi hona chahiye, isliye redirect chalne denge
      }
    }

    // Redirect to target URL
    // Hamesha 302 (Found/Temporary) use karein tracking ke liye
    return Response.redirect(target, 302);

  } catch (err) {
    console.error("❌ Track/link handler error:", err);
    // Agar sab fail ho jaye toh kam se kam home page par redirect kar dein
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
