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