import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET;

/** Sign token for BOTH company + company-user */
export function signToken(user) {
  return jwt.sign(
    {
      id:          user._id,
      name:        user?.name || user?.fullName || user?.companyName || "Unknown",
      email:       user.email,
      role:        user.role?.name ?? "Company",
      type:        user.type,
      permissions: user.permissions,
      companyId:   user.companyId ? user.companyId : user._id,
          // ✅ ADD THIS
      modules: user.modules || {},

      // ✅ OPTIONAL (employee linking)
      employeeId: user.employeeId || null,
    },
    SECRET,
    { expiresIn: "1d" }
  );
}

/** decode → returns payload or null */
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

  // ✅ Company full access
  if (user.type === "company") return true;

  // ✅ Admin full access
  if (
    user.role === "Company" ||
    user.role === "Admin" ||
    user.role === "admin" ||
    user.role?.name === "Admin"
  ) {
    return true;
  }

  // ✅ MODULE BASED CHECK (IMPORTANT FIX)
  const module =
    user.modules?.[moduleName] ||
    user.modules?.[moduleName.toLowerCase()];

  if (!module || !module.selected) return false;

  return module.permissions?.[action] === true;
}
// export function hasPermission(user, moduleName, action) {
//   if (!user) return false;

//   // ✅ FIX 1: company owner — type is "company" (set at login)
//   if (user.type === "company") return true;

//   // ✅ FIX 2: role is "Company" when company owner token is decoded
//   //           role is "Admin" for admin staff users
//   if (user.role === "Company" || user.role === "Admin" || user.role === "admin") return true;

//   // ✅ FIX 3: role might be a populated object { name: "Admin" }
//   if (user.role?.name === "Admin" || user.role?.name === "Company") return true;

//   // Granular permission check for regular staff
//   const modulePermissions =
//     user.permissions?.[moduleName] ||
//     user.permissions?.[moduleName.toLowerCase()];

//   if (!modulePermissions) return false;

//   return modulePermissions.includes(action);
// }




// import jwt from "jsonwebtoken";
// const SECRET = process.env.JWT_SECRET;

// /** Sign token for BOTH company + company‑user */
// export function signToken(user) {
//   return jwt.sign(
//     {
//       id: user._id,
//       name: user?.name || user?.fullName || user?.companyName || "Unknown",
//                                    // user or company _id
//       email: user.email,
//       role: user.role?.name ?? "Company",             // if company this is just "Company"
//       type: user.type,
//       permissions: user.permissions,
//                                      // "company" | "user"
//       // ⬇️ ALWAYS include companyId; if it's a company token, use its own _id
//       companyId: user.companyId ? user.companyId : user._id,
//     },
//     SECRET,
//     { expiresIn: "1d" }
//   );
// }

// /** decode → returns payload or throws */
// export function verifyJWT(token) {
//   try {
//     return jwt.verify(token, SECRET);
//   } catch (error) {
//     console.error("JWT verify error:", error.message);
//     return null;
//   }
// }

// /** Bearer XX helper */
// export function getTokenFromHeader(req) {
//   const auth = req.headers.get("authorization") || "";
//   if (!auth.startsWith("Bearer ")) return null;
//   return auth.split(" ")[1];
  
// }
// export function hasPermission(user, moduleName, action) {
//   if (!user) return false;
//   if (user.role === "Admin") return true; // full access

//   const modulePermissions =
//     user.permissions?.[moduleName] || user.permissions?.[moduleName.toLowerCase()];

//   if (!modulePermissions) return false;

//   return modulePermissions.includes(action);
// }



