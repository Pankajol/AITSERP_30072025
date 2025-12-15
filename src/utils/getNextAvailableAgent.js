import CompanyUser from "@/models/CompanyUser";

/**
 * Returns next AVAILABLE agent for a customer
 * - respects isActive
 * - respects leave / holiday
 * - round-robin safe
 */
export async function getNextAvailableAgent(customer) {
  if (!customer?.assignedAgents?.length) {
    console.log("❌ No assignedAgents on customer");
    return null;
  }

  const agents = await CompanyUser.find({
    _id: { $in: customer.assignedAgents },
    isActive: { $ne: false },
  }).lean();

  if (!agents.length) {
    console.log("❌ No active agents found");
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ filter available agents
  const availableAgents = agents.filter((a) => {
    // leave check
    if (a.leaveFrom && a.leaveTo) {
      const from = new Date(a.leaveFrom);
      const to = new Date(a.leaveTo);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      if (today >= from && today <= to) return false;
    }

    // holiday check
    if (Array.isArray(a.holidays)) {
      const isHoliday = a.holidays.some((d) => {
        const hd = new Date(d);
        hd.setHours(0, 0, 0, 0);
        return hd.getTime() === today.getTime();
      });
      if (isHoliday) return false;
    }

    return true;
  });

  if (!availableAgents.length) {
    console.log("⚠️ All agents unavailable today");
    return null;
  }

  // 🔁 ROUND ROBIN
  const lastIndex = customer.lastAssignedAgentIndex ?? -1;
  const nextIndex = (lastIndex + 1) % availableAgents.length;
  const selected = availableAgents[nextIndex];

  // save index back to customer
  await customer.constructor.updateOne(
    { _id: customer._id },
    { $set: { lastAssignedAgentIndex: nextIndex } }
  );

  console.log("🎯 Selected agent:", selected._id.toString());
  return selected._id;
}
