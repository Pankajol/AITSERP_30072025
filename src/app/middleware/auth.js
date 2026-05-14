import jwt from "jsonwebtoken";
import dbConnect from '@/lib/db';
import { User } from "@/models/User";

const secret = process.env.JWT_SECRET;

export const auth = async (req) => {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) throw new Error("Unauthorized – no token");
  const payload = jwt.verify(token, secret);
  await dbConnect();
  const user = await User.findById(payload.uid);
  if (!user || !user.isActive) throw new Error("Unauthorized – user not found or inactive");
  return user;
};

// curry: withPermission("sales_orders", "approve")
export const withPermission = (module, action) => async (req, res, handler) => {
  try {
    const user = await auth(req);
    const allowed = await user.hasPermission(module, action);
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    return handler(req, res);
  } catch (e) {
    return res.status(401).json({ message: e.message });
  }
};