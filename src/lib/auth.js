import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET;

/** Sign token for BOTH company + company‑user */
export function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user?.name || user?.fullName || user?.companyName || "Unknown",
                                   // user or company _id
      email: user.email,
      role: user.role?.name ?? "Company",             // if company this is just "Company"
      type: user.type,
      permissions: user.permissions,
                                     // "company" | "user"
      // ⬇️ ALWAYS include companyId; if it's a company token, use its own _id
      companyId: user.companyId ? user.companyId : user._id,
    },
    SECRET,
    { expiresIn: "1d" }
  );
}

/** decode → returns payload or throws */
export function verifyJWT(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return null;
  }
}

/** Bearer XX helper */
export function getTokenFromHeader(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.split(" ")[1];
  
}
export function hasPermission(user, moduleName, action) {
  if (!user) return false;
  if (user.role === "Admin") return true; // full access

  const modulePermissions =
    user.permissions?.[moduleName] || user.permissions?.[moduleName.toLowerCase()];

  if (!modulePermissions) return false;

  return modulePermissions.includes(action);
}