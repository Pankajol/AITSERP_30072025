import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id } = params;

    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: decoded.userId },
      { read: true },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}




// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Notification from "@/models/project/NotificationModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const notification = await Notification.findOne({
//       _id: params.id,
//       user: decoded.userId,
//     });

//     if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });

//     return NextResponse.json(notification);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 401 });
//   }
// }

// export async function PUT(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const body = await req.json();
//     const updated = await Notification.findOneAndUpdate(
//       { _id: params.id, user: decoded.userId },
//       body,
//       { new: true }
//     );

//     if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
//     return NextResponse.json(updated);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const deleted = await Notification.findOneAndDelete({
//       _id: params.id,
//       user: decoded.userId,
//     });

//     if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

//     return NextResponse.json({ message: "Deleted successfully" });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }
