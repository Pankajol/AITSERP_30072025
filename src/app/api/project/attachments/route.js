import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attachment from "@/models/project/AttachmentModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const attachments = await Attachment.find({ company: decoded.companyId });
    return NextResponse.json(attachments, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const attachment = new Attachment({
      ...body,
      user: decoded.userId,
      company: decoded.companyId,
    });
    await attachment.save();

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
