import AuditLog from "@/models/AuditLog";

export async function logAudit({ companyId, userId, userName, action, entityType, entityId, oldData, newData, changes, req }) {
  try {
    if (!companyId || !userId) return;
    const ipAddress = req?.headers?.get("x-forwarded-for") || req?.headers?.get("x-real-ip") || req?.connection?.remoteAddress;
    const userAgent = req?.headers?.get("user-agent");
    
    await AuditLog.create({
      companyId,
      userId,
      userName: userName || "System",
      action,
      entityType,
      entityId,
      oldData: oldData ? JSON.stringify(oldData) : undefined,
      newData: newData ? JSON.stringify(newData) : undefined,
      changes: changes || (oldData && newData ? "Data changed" : undefined),
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}