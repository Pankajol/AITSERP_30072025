import axios from "axios";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    // 🔒 Extract and verify JWT from headers
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    // ✅ Read request body
    const { udyamNumber } = await req.json();
    if (!udyamNumber) {
      return NextResponse.json(
        { success: false, error: "Udyam number is required" },
        { status: 400 }
      );
    }

    // 🌐 Call Attestr API
    const response = await axios.post(
      "https://api.attestr.com/api/v2/public/corpx/udyam",
      { reg: udyamNumber },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic T1gwZU1FNGdFWmJaMEVPR2Z4LmM2YmJmYTkxNTBmZjRmMjExZDA1MTA4YmM2Mjg2NmM3OmNhMDI0Njc2N2ZhYWQ3NzY2OWIyZmM5MzI1ZmMyY2I2ODQ1NDcwNDFhMmFlMzk0Yg==",
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (err) {
    console.error("Attestr Udyam verify error:", err.message);

    return NextResponse.json(
      {
        success: false,
        error: err.response?.data || err.message,
      },
      { status: err.response?.status || 500 }
    );
  }
}




// import axios from "axios";
// import https from "https";
// import * as cheerio from "cheerio";
// import { NextResponse } from "next/server";

// export async function POST(req) {
//   try {
//     const { udyamNumber } = await req.json();
//     if (!udyamNumber) {
//       return Response.json({ error: "Udyam number is required" }, { status: 400 });
//     }

//     const httpsAgent = new https.Agent({ rejectUnauthorized: false });
//     const getPage = await axios.get("https://udyamregistration.gov.in/Udyam_Verify.aspx", { httpsAgent });
//     const $ = cheerio.load(getPage.data);

//     const viewState = $("input[name='__VIEWSTATE']").val();
//     const eventValidation = $("input[name='__EVENTVALIDATION']").val();
//     const viewStateGenerator = $("input[name='__VIEWSTATEGENERATOR']").val();

//     // ** Replace these below with the real names from inspection **
//     const inputNameForUdyam = "ctl00$ContentPlaceHolder1$txtUdyamRegistrationNo";
//     const buttonNameForVerify = "ctl00$ContentPlaceHolder1$btnSearch";

//     const response = await axios.post(
//       "https://udyamregistration.gov.in/Udyam_Verify.aspx",
//       new URLSearchParams({
//         __VIEWSTATE: viewState,
//         __EVENTVALIDATION: eventValidation,
//         __VIEWSTATEGENERATOR: viewStateGenerator,
//         [inputNameForUdyam]: udyamNumber,
//         [buttonNameForVerify]: "Verify"
//       }).toString(),
//       {
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         httpsAgent,
//       }
//     );

//     const $$ = cheerio.load(response.data);
//     const rows = [];
//     $$("#ctl00_ContentPlaceHolder1_grdView tr").each((_, el) => {
//       const cols = $$(el)
//         .find("td")
//         .map((__, td) => $$(td).text().trim())
//         .get();
//       if (cols.length >= 2) rows.push({ label: cols[0], value: cols[1] });
//     });

//     if (rows.length === 0) {
//       return Response.json(
//         { success: false, message: "No details found. Check Udyam number." },
//         { status: 404 }
//       );
//     }

//     const parsed = {};
//     rows.forEach((row) => {
//       parsed[row.label] = row.value;
//     });

//     return Response.json({ success: true, data: parsed });
//   } catch (err) {
//     console.error("Udyam verify error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }
