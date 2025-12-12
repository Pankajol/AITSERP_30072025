export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";

// 1x1 transparent PNG (small)
const PIXEL_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAgMBgYtkt1cAAAAASUVORK5CYII=";
const PIXEL_BUFFER = Buffer.from(PIXEL_BASE64, "base64");

function pixelResponse() {
  return new Response(PIXEL_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      console.warn("email-open: missing id");
      return pixelResponse();
    }

    // capture headers
    const headers = req.headers;
    const userAgent = headers.get("user-agent") || "";

    // pick IP respecting proxies
    const xfwd = headers.get("x-forwarded-for") || headers.get("x-real-ip") || "";
    const ip = xfwd ? xfwd.split(",")[0].trim() : null;

    // try geo lookup (optional - non-blocking)
    let city = "", region = "", country = "";
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, { cache: "no-store" });
        if (geoRes.ok) {
          const g = await geoRes.json();
          city = g.city || "";
          region = g.region || "";
          country = g.country_name || "";
        }
      } catch (geoErr) {
        // don't fail pixel on geo lookup error
        console.debug("email-open: geo lookup failed", geoErr?.message || geoErr);
      }
    }

    const log = await EmailLog.findById(id);
    if (!log) {
      console.warn("email-open: EmailLog not found", id);
      return pixelResponse();
    }

    // update fields — be defensive about schema names
    try {
      // If fields exist use them; otherwise set fallback fields
      const updates = {
        $inc: { openCount: 1 },
        $set: {
          lastOpenedAt: new Date(),
          isOpened: true,
        },
      };

      // set firstOpenedAt if not present
      if (!log.firstOpenedAt) updates.$set.firstOpenedAt = new Date();

      // capture ip/ua/location first time only
      if (!log.ip && ip) updates.$set.ip = ip;
      if (!log.userAgent && userAgent) updates.$set.userAgent = userAgent;
      if (!log.city && city) updates.$set.city = city;
      if (!log.region && region) updates.$set.region = region;
      if (!log.country && country) updates.$set.country = country;

      await EmailLog.findByIdAndUpdate(id, updates, { new: true });
    } catch (uerr) {
      console.error("email-open: update error", uerr);
      // swallow error and still return pixel
    }

    return pixelResponse();
  } catch (err) {
    console.error("email-open: fatal error", err);
    return pixelResponse();
  }
}




// import dbConnect from "@/lib/db";
// import EmailLog from "@/models/EmailLog";

// export async function GET(req) {
//   try {
//     await dbConnect();

//     const url = new URL(req.url);
//     const id = url.searchParams.get("id");

//     if (!id) return new Response("Missing ID", { status: 400 });

//     const headers = req.headers;

//     // IP detect (behind proxy)
//     const ipHeader =
//       headers.get("x-forwarded-for") ||
//       headers.get("x-real-ip") ||
//       "";
//     const ip = ipHeader.split(",")[0].trim() || null;

//     const userAgent = headers.get("user-agent") || "";

//     // Geo lookup (optional – free service example)
//     let city = "";
//     let region = "";
//     let country = "";

//     if (ip && ip !== "127.0.0.1" && ip !== "::1") {
//       try {
//         const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
//           cache: "no-store",
//         });
//         if (geoRes.ok) {
//           const g = await geoRes.json();
//           city = g.city || "";
//           region = g.region || "";
//           country = g.country_name || "";
//         }
//       } catch (e) {
//         console.error("Geo lookup failed:", e);
//       }
//     }

//     const log = await EmailLog.findById(id);
//     if (!log) {
//       // Just return pixel even if log missing
//       return pixelResponse();
//     }

//     // Update tracking
//     log.isOpened = true;
//     log.openCount = (log.openCount || 0) + 1;
//     if (!log.firstOpenedAt) log.firstOpenedAt = new Date();
//     log.lastOpenedAt = new Date();

//     // Only set IP/UA/location first time
//     if (!log.ip && ip) log.ip = ip;
//     if (!log.userAgent && userAgent) log.userAgent = userAgent;
//     if (!log.city && city) log.city = city;
//     if (!log.region && region) log.region = region;
//     if (!log.country && country) log.country = country;

//     await log.save();

//     return pixelResponse();
//   } catch (err) {
//     console.error("email-open track error:", err);
//     return pixelResponse(); // never break the email
//   }
// }

// function pixelResponse() {
//   const imageBuffer = Buffer.from(
//     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAgMBgYtkt1cAAAAASUVORK5CYII=",
//     "base64"
//   );

//   return new Response(imageBuffer, {
//     status: 200,
//     headers: {
//       "Content-Type": "image/png",
//       "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
//     },
//   });
// }
