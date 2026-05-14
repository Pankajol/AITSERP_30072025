import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * ✅ Ensures:
 * - DB is connected
 * - Token is valid
 * - User has companyId
 */
export async function withAuth(req) {
  await connectDB();

  const token = getTokenFromHeader(req);

  if (!token) {
    return { error: "No token", status: 401, user: null };
  }

  try {
    const user = verifyJWT(token);

    if (!user || !user.companyId) {
      return { error: "Invalid token", status: 401, user: null };
    }

    return { user };
  } catch (e) {
    return { error: "Unauthorized", status: 401, user: null };
  }
}

/**
 * ✅ Case-insensitive & safe role checking
 * Works with: HR, hr, Hr, ADMIN, admin, Manager etc
 */
export function hasRole(user, allowed = []) {
  if (!user) return false;

  // ✅ If roles come as array (your case)
  if (Array.isArray(user.roles)) {
    const userRoles = user.roles.map(r => r.toLowerCase());

    return allowed.some(a =>
      userRoles.includes(a.toLowerCase())
    );
  }

  // ✅ If role comes as single string
  if (user.role) {
    const role = user.role.toLowerCase();

    return allowed.map(a => a.toLowerCase()).includes(role);
  }

  return false;
}

