// ✅ STEP 8: Backend route for bulk import API
// ✅ File: /app/api/importdata/[model]/route.js
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized: No token" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.error("Token verify error:", err.message);
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    if (!decoded?.companyId || !decoded?.id) {
      return NextResponse.json({ success: false, error: "Invalid token payload" }, { status: 401 });
    }

    const { model } = params;
    const { data } = await req.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
    }

    const modelModule = await import(`@/models/${model}.js`);
    const Model = modelModule.default;

    let count = 0;
    for (const row of data) {
      const doc = new Model({
        ...row,
        companyId: decoded.companyId,
        createdBy: decoded.id,
      });
      await doc.save();
      count++;
    }

    return NextResponse.json({ success: true, count });
  } catch (err) {
    console.error("Import error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


// import dbConnect from "@/lib/db";

// export async function POST(req, { params }) {
//   const { modelName } = params;
//   const { data } = await req.json();

//   try {
//     await dbConnect();

//     const modelPath = `@/models/${modelName}`;
//     const model = (await import(modelPath)).default;

//     if (!model) return Response.json({ success: false, error: "Invalid model" }, { status: 400 });

//     let count = 0;
//     for (const record of data) {
//       await model.create(record);
//       count++;
//     }

//     return Response.json({ success: true, count });
//   } catch (err) {
//     return Response.json({ success: false, error: err.message }, { status: 500 });
//   }
// }
