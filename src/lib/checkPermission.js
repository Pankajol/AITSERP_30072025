import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * Check module permission
 * @param {Request} req
 * @param {string} moduleName
 * @param {string} action
 */

export function checkPermission(req, moduleName, action = "view") {

  const token = getTokenFromHeader(req);

  if (!token) {
    throw new Error("JWT token missing");
  }

  const user = verifyJWT(token);

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Company → full access
  if (user.type === "company") {
    return user;
  }

  // Admin → full access
  if (user.roles?.includes("Admin")) {
    return user;
  }
  

  const module = user.modules?.[moduleName];

  if (!module || !module.selected) {
    throw new Error("Module access denied");
  }

  if (!module.permissions?.[action]) {
    throw new Error("Permission denied");
  }

  return user;
}