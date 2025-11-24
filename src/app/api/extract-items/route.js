import { NextResponse } from "next/server";

/** ✅ CLEAN NUMBER */
function cleanNumber(n) {
  if (!n) return 0;
  return Number(String(n).replace(/[^0-9.]/g, "")) || 0;
}

/** ✅ EXTRACT MULTI-LINE ITEMS RELIABLY */
function parseItems(ocrText = "") {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ✅ DIRECT ITEM-XXXX ON SAME LINE
    let sameLineCode = line.match(/ITEM[-\s]*0*\d+/i);
    if (sameLineCode) {
      const itemCode = sameLineCode[0].replace(/\s+/g, "").toUpperCase();

      // try to find qty on same line or previous line
      let qty = 1;
      const qtySame = line.match(/\b(\d+)\b/);
      const qtyPrev = lines[i - 1]?.match(/\b(\d+)\b/);

      if (qtySame) qty = cleanNumber(qtySame[1]);
      else if (qtyPrev) qty = cleanNumber(qtyPrev[1]);

      items.push({ itemCode, quantity: qty });
      continue;
    }

    // ✅ CASE: Description line → next line has itemCode
    const qtyMatch = line.match(/\b(\d+)\b/); // e.g. "bottel 10 500.00 12%"

    if (qtyMatch && lines[i + 1]) {
      const next = lines[i + 1];
      const nextCode = next.match(/ITEM[-\s]*0*\d+/i);

      if (nextCode) {
        const itemCode = nextCode[0].replace(/\s+/g, "").toUpperCase();
        const quantity = cleanNumber(qtyMatch[1]);

        items.push({ itemCode, quantity });

        i++; // skip next line
        continue;
      }
    }
  }

  return items;
}

export async function POST(req) {
  try {
    const { ocrText } = await req.json();

    console.log("✅ RAW OCR INPUT:\n", ocrText);

    // ✅ FIRST: Try local parser (Stable)
    const localItems = parseItems(ocrText);
    if (localItems.length > 0) {
      return NextResponse.json({
        success: true,
        items: localItems,
      });
    }

    // ✅ SECOND: Try Gemini if available
    const API_KEY = process.env.GOOGLE_API_KEY;
    if (API_KEY) {
      const prompt = `
Extract ONLY itemCode and quantity. Output JSON only.
Example:
[
  {"itemCode":"ITEM-0001","quantity":10}
]

OCR:
${ocrText}
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 },
        }),
      });

      const raw = await resp.text();
      console.log("✅ GEMINI RAW:", raw);

      const jsonArray = raw.match(/\[[\s\S]*?\]/);
      if (jsonArray) {
        try {
          const parsed = JSON.parse(jsonArray[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({ success: true, items: parsed });
          }
        } catch (err) {}
      }
    }

    // ✅ If STILL nothing, return fallback
    return NextResponse.json({ success: true, items: [] });

  } catch (err) {
    console.error("❌ API ERROR:", err);
    return NextResponse.json({ success: false, items: [] });
  }
}




// import { NextResponse } from "next/server";

// const API_KEY = process.env.GOOGLE_API_KEY;
// const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// /* ------------------------------------------------------
//  ✅ Utility: Extract the FIRST balanced JSON array […] 
// ------------------------------------------------------ */
// function findBalancedJsonArray(str = "") {
//   const n = str.length;
//   let start = -1, depth = 0, inString = false, esc = false;

//   for (let i = 0; i < n; i++) {
//     const ch = str[i];

//     if (inString) {
//       if (esc) esc = false;
//       else if (ch === "\\") esc = true;
//       else if (ch === '"') inString = false;
//       continue;
//     }

//     if (ch === '"') { inString = true; continue; }

//     if (ch === "[" && depth === 0) {
//       start = i;
//       depth = 1;
//       continue;
//     }

//     if (start !== -1) {
//       if (ch === "[") depth++;
//       else if (ch === "]") {
//         depth--;
//         if (depth === 0) return str.slice(start, i + 1);
//       }
//     }
//   }
//   return null;
// }

// /* ------------------------------------------------------
//  ✅ Normalize to final backend shape 
// ------------------------------------------------------ */
// function normalizeItems(raw) {
//   if (!Array.isArray(raw)) return [];

//   return raw
//     .map((r) => (typeof r === "object" ? r : {}))
//     .map((r) => ({
//       itemCode: r.itemCode || "",
//       itemDescription: r.itemDescription || "",
//       quantity: Number(r.quantity) || 0,
//       unitPrice: Number(r.unitPrice) || 0,
//       discountPercent: Number(r.discountPercent) || 0,
//       gstRate: Number(r.gstRate) || 0,
//       warehouse: r.warehouse || "",
//     }))
//     .filter((r) => r.itemDescription && r.itemCode);
// }

// /* ------------------------------------------------------
//  ✅ NEW: Clean invoice text → keep only useful part
// ------------------------------------------------------ */
// function cleanOcrText(raw = "") {
//   if (!raw) return "";
//   const t = raw.replace(/\t+/g, " ").replace(/[ ]{2,}/g, " ");

//   const lines = t
//     .split(/\r?\n/)
//     .map((l) => l.trim())
//     .filter(Boolean);

//   // Remove headers like "Invoice Items", "Totals", etc.
//   return lines
//     .filter(
//       (l) =>
//         !/^(invoice items|totals|grand total|additional information)$/i.test(l)
//     )
//     .join("\n");
// }

// /* ------------------------------------------------------
//  ✅ Extract first int in line (quantity)
// ------------------------------------------------------ */
// function extractLikelyQty(line) {
//   const m = line.match(/\b(\d{1,4})\b/);
//   return m ? Number(m[1]) : 1;
// }

// /* ------------------------------------------------------
//  ✅ FALLBACK PARSER — Works for your exact invoice format
// ------------------------------------------------------ */
// function fallbackParseItemsFromText(raw = "") {
//   const text = cleanOcrText(raw);
//   if (!text) return [];

//   const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

//   const items = [];

//   const itemCodeRx = /(ITEM[- ]?\d{3,6})/i;
//   const priceRx = /[₹$]?\s*\d+(?:,\d+)*(?:\.\d+)?/;
//   const gstRx = /(\d{1,2})\s*%/;

//   for (let i = 0; i < lines.length - 2; i++) {
//     const L1 = lines[i];       // description
//     const L2 = lines[i + 1];   // item code
//     const L3 = lines[i + 2];   // qty or price
//     const L4 = lines[i + 3] || "";
//     const L5 = lines[i + 4] || "";
//     const L6 = lines[i + 5] || "";

//     // ✅ Detect item code
//     const codeMatch = L2.match(itemCodeRx);
//     if (!codeMatch) continue;

//     const itemCode = codeMatch[1].replace(" ", "-").toUpperCase();
//     const itemDescription = L1;

//     // ✅ quantity
//     const quantity = extractLikelyQty(L3);

//     // ✅ unit price
//     const priceMatch = (L3.match(priceRx) || L4.match(priceRx) || ["0"]);
//     const unitPrice = Number(priceMatch[0].replace(/[^\d.]/g, "")) || 0;

//     // ✅ gst%
//     const gstMatch = (L3.match(gstRx) || L4.match(gstRx) || L5.match(gstRx));
//     const gstRate = gstMatch ? Number(gstMatch[1]) : 0;

//     // ✅ warehouse
//     const warehouse = /store/i.test(L6) ? L6 : "";

//     items.push({
//       itemCode,
//       itemDescription,
//       quantity,
//       unitPrice,
//       discountPercent: 0,
//       gstRate,
//       warehouse,
//     });
//   }

//   return items;
// }

// /* ------------------------------------------------------
//  ✅ MAIN API ROUTE
// ------------------------------------------------------ */
// export async function POST(request) {
//   try {
//     const { ocrText } = await request.json();

//     if (!ocrText) {
//       return NextResponse.json(
//         { success: false, error: "ocrText is required" },
//         { status: 400 }
//       );
//     }

//     const cleaned = cleanOcrText(ocrText);

//     /* -------------------------------------------
//       ✅ If no Google API → fallback only
//     -------------------------------------------- */
//     if (!API_KEY) {
//       const parsed = fallbackParseItemsFromText(cleaned);
//       return NextResponse.json({
//         success: true,
//         items: normalizeItems(parsed),
//       });
//     }

//     /* -------------------------------------------
//       ✅ PRIMARY: Ask Gemini AI
//     -------------------------------------------- */
//     const prompt = `
// Extract ONLY line items. Use this format:

// [
//   {
//     "itemCode": "ITEM-0001",
//     "itemDescription": "bottel",
//     "quantity": 1,
//     "unitPrice": 500,
//     "gstRate": 12,
//     "discountPercent": 0,
//     "warehouse": "Thane Store"
//   }
// ]

// Ignore totals. Use ONLY data inside text:
// ${cleaned}
// `.trim();

//     const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

//     const body = {
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       generationConfig: {
//         temperature: 0.0,
//         maxOutputTokens: 1024,
//         response_mime_type: "application/json",
//       },
//     };

//     const resp = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     const raw = await resp.text();

//     if (!resp.ok) {
//       const fallback = fallbackParseItemsFromText(cleaned);
//       return NextResponse.json({
//         success: true,
//         items: normalizeItems(fallback),
//       });
//     }

//     let json;

//     try {
//       json = JSON.parse(raw);
//     } catch {
//       const slice = findBalancedJsonArray(raw);
//       json = slice ? JSON.parse(slice) : null;
//     }

//     let arr =
//       json?.candidates?.[0]?.content?.parts
//         ?.map((p) => p.text || "")
//         .join("")
//         .trim() || json;

//     if (typeof arr === "string") {
//       try {
//         arr = JSON.parse(arr);
//       } catch {
//         const slice = findBalancedJsonArray(arr);
//         arr = slice ? JSON.parse(slice) : [];
//       }
//     }

//     // ✅ If Gemini fails → use fallback
//     if (!Array.isArray(arr) || arr.length === 0) {
//       const fallback = fallbackParseItemsFromText(cleaned);
//       return NextResponse.json({
//         success: true,
//         items: normalizeItems(fallback),
//       });
//     }

//     return NextResponse.json({ success: true, items: normalizeItems(arr) });
//   } catch (err) {
//     return NextResponse.json(
//       { success: false, error: err.message },
//       { status: 500 }
//     );
//   }
// }





// // File: app/api/extract-items/route.js

// import { NextResponse } from "next/server";

// const API_KEY = process.env.GOOGLE_API_KEY;

// // --- THIS IS THE FIX ---
// // Use the model name from your own "ListModels" output
// const MODEL = "gemini-2.5-flash";
// // --- END OF FIX ---

// export async function POST(request) {
//   try {
//     if (!API_KEY) {
//       throw new Error("Missing GOOGLE_API_KEY in .env.local");
//     }

//     const { ocrText } = await request.json();
//     if (!ocrText) {
//       return NextResponse.json(
//         { success: false, error: "ocrText is required" },
//         { status: 400 }
//       );
//     }

//     const prompt = `
//       You are an invoice data extraction expert.
//       Extract the line items from this OCR text.
//       Ignore totals, taxes, and other irrelevant data.
//       Return ONLY a valid JSON array of objects with the keys:
//         - "itemDescription" (string)
//         - "quantity" (number)
//         - "unitPrice" (number)
//         - "discountPercent" (number)
//         - "gstRate" (number)
      
//       - "itemDescription" should be a string.
//       - "quantity" should be a number.
//       - "unitPrice" should be the price per unit, before discount.
//       - "discountPercent" should be the discount percentage (e.g., 5 for 5%, 0 if no discount).
//       - "gstRate" should be the GST percentage (e.g., 18 for 18%, 0 if no GST).
      
//       If nothing is found, return [].
//       Do not include any other text, explanations, or markdown. Only the JSON array.

//       OCR TEXT:
//       ${ocrText}
//     `;

//     // The URL constructs as: .../models/gemini-2.5-flash:generateContent?key=...
//     const response = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           contents: [{ parts: [{ text: prompt }] }],
//           generationConfig: {
//             temperature: 0.2,
//             maxOutputTokens: 2048,
//           },
//         }),
//       }
//     );

//     // Get the raw text of the response
//     const rawResponseText = await response.text();

//     if (!response.ok) {
//       // If the response failed, log the raw text and throw an error
//       console.error("Gemini API Error:", rawResponseText);
//       let errorMessage = "Failed to call Gemini API";
//       try {
//         // Try to parse it as JSON to get a clean error message
//         const errorData = JSON.parse(rawResponseText);
//         errorMessage = errorData.error?.message || errorMessage;
//       } catch (e) {
//         // It wasn't JSON, just use the raw text
//         errorMessage = rawResponseText;
//       }
//       throw new Error(errorMessage);
//     }

//     // Now that we know response.ok is true, parse the JSON
//     const data = JSON.parse(rawResponseText);

//     // Extract the text content from the AI's response
//     const text =
//       data?.candidates?.[0]?.content?.parts?.[0]?.text
//         ?.replace(/```json|```/g, "")
//         ?.trim() || "";

//     let items = [];
//     try {
//       // Parse the AI's text into a JSON array
//       items = JSON.parse(text);
//       if (!Array.isArray(items)) items = [];
//     } catch (err) {
//       // This catches if the AI returns malformed JSON
//       console.error("Invalid JSON returned by Gemini:", text);
//     }

//     return NextResponse.json({ success: true, items });
//   } catch (error) {
//     console.error("Error in /api/extract-items:", error.message);
//     return NextResponse.json(
//       { success: false, error: `AI processing failed: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }