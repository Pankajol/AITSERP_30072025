import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import MachineOutput from '@/models/ppc/machineOutputModel';

// Check if the user is authorized
const isAuthorized = (user) =>
  user?.type === "company" ||
  user?.role === "Admin" ||
  user?.permissions?.includes("manage_production_data");

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user))
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const outputs = await MachineOutput.find({ companyId: user.companyId })
      .populate("item", "itemCode itemName")
      .populate("machine", "machineCode name");

    return NextResponse.json({ success: true, data: outputs }, { status: 200 });
  } catch (err) {
    console.error("GET /api/machine-outputs error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();

    // Validate required fields
    const requiredFields = ["name", "date", "description", "holidayType"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `Validation Error: The '${field}' field is required.` },
          { status: 400 }
        );
      }
    }

    // ✅ Check if holiday already exists for this date
    const existingHoliday = await Holiday.findOne({ date: body.date, companyId: user.companyId });
    if (existingHoliday) {
      return NextResponse.json(
        { success: true, message: "Holiday already exists for this date, skipping insert.", data: existingHoliday },
        { status: 200 }
      );
    }

    const newHoliday = new Holiday({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await newHoliday.save();

    return NextResponse.json(
      { success: true, data: newHoliday, message: "Holiday created successfully" },
      { status: 201 }
    );

  } catch (err) {
    console.error("POST /api/ppc/holidays error:", err);

    // Handle duplicate key error gracefully
    if (err.code === 11000) {
      return NextResponse.json(
        { success: true, message: "Holiday already exists for this date, skipping insert." },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}




// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import MachineOutput from '@/models/ppc/machineOutputModel';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// const isAuthorized = (user) =>
//   user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_production_data");

// export async function GET(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

//     const user = verifyJWT(token);
//     if (!user || !user.companyId || !isAuthorized(user))
//       return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

//    const outputs = await MachineOutput.find()
//   .populate("item", "itemCode itemName")
//   .populate("machine", "machineCode name");


//     return NextResponse.json({ success: true, data: outputs }, { status: 200 });
//   } catch (err) {
//     console.error("GET /api/machine-outputs error:", err);
//     return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

//     const user = verifyJWT(token);
//     if (!user || !user.companyId || !isAuthorized(user))
//       return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

//     const body = await req.json();

//     // ✅ Corrected required fields according to your schema
//     const requiredFields = [ "item", "machine", "perDayOutput", "machineRunningCost"];
//     for (const field of requiredFields) {
//       if (!body[field] && body[field] !== 0) {
//         return NextResponse.json(
//           { success: false, message: `Validation Error: The '${field}' field is required.` },
//           { status: 400 }
//         );
//       }
//     }

//     const newOutput = new MachineOutput({
//       ...body,
//       companyId: user.companyId,
//       createdBy: user.id || user._id,
//     });

//     await newOutput.save();

//     return NextResponse.json(
//       { success: true, data: newOutput, message: "Machine output created successfully" },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("POST /api/machine-outputs error:", err);
//     return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
//   }
// }


