import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/CompanyUser';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();

    // Get JWT from header
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const companyId = decoded.companyId; // Assuming token contains companyId

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID missing in token' }, { status: 400 });
    }

    // Fetch users only belonging to the same company
    const users = await User.find({ companyId });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Error fetching users', error: error.message },
      { status: 500 }
    );
  }
}



// import dbConnect from '@/lib/db';
// import { User, Role } from "@/models/User";
// import { withPermission } from "@/app/middleware/auth";

// /* ---------- GET  /api/users -------------- */
// export const GET = withPermission("users", "read")(async (req, res) => {
//   await dbConnect();
//   const users = await User.find().populate("role", "name").select("-password");
//   return res.json(users);
// });

// /* ---------- POST /api/users (create employee) -------------- */
// export const POST = withPermission("users", "create")(async (req, res) => {
//   const bodyx = await req.json();
//   const { firstName, lastName, email, phone, password, roleName = "SalesManager" } = body;
//   await dbConnect();
//   if (await User.findOne({ email })) return res.status(409).json({ message: "Email exists" });
//   const role = await Role.findOne({ name: roleName });
//   const user = await User.create({ firstName, lastName, email, phone, password, role });
//   return res.status(201).json(user);
// });