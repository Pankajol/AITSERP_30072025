export function hasPermission(user, moduleName, action) {
  if (!user) return false;
  if (user.role === "Admin") return true; // full access

  const modulePermissions =
    user.permissions?.[moduleName] || user.permissions?.[moduleName.toLowerCase()];

  if (!modulePermissions) return false;

  return modulePermissions.includes(action);
}
