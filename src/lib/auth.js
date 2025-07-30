import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET;

/** Sign token for BOTH company + company‑user */
export function signToken(user) {
  return jwt.sign(
    {
      id: user._id,                                   // user or company _id
      email: user.email,
      role: user.role?.name ?? "Company",             // if company this is just "Company"
      type: user.type,                                // "company" | "user"
      // ⬇️ ALWAYS include companyId; if it's a company token, use its own _id
      companyId: user.companyId ? user.companyId : user._id,
    },
    SECRET,
    { expiresIn: "1d" }
  );
}

/** decode → returns payload or throws */
export function verifyJWT(token) {
  return jwt.verify(token, SECRET); // sync is fine in App Router
}

/** Bearer XX helper */
export function getTokenFromHeader(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.split(" ")[1];
}
