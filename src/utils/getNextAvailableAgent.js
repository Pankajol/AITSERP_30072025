import CompanyUser from "@/models/CompanyUser";
import Leave from "@/models/hr/Leave";


export async function getNextAvailableAgent(customer) {
  if (!customer?.assignedAgents?.length) {
    console.log("❌ No assignedAgents on customer");
    return null;
  }

  // normalize today (IST-safe)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // fetch agents
  const agents = await CompanyUser.find({
    _id: { $in: customer.assignedAgents },
    isActive: { $ne: false },
  }).lean();

  if (!agents.length) {
    console.log("❌ No active agents");
    return null;
  }

  // filter availability
  const availableAgents = [];

  for (const agent of agents) {
    // 🔴 LEAVE CHECK
    const onLeave = await Leave.findOne({
      agentId: agent._id,
      status: "Approved",
      fromDate: { $lte: today },
      toDate: { $gte: today },
    });

    if (onLeave) {
      console.log("⛔ On leave:", agent._id.toString());
      continue;
    }

    // 🔴 HOLIDAY CHECK
    if (Array.isArray(agent.holidays)) {
      const isHoliday = agent.holidays.some((d) => {
        const hd = new Date(d);
        hd.setHours(0, 0, 0, 0);
        return hd.getTime() === today.getTime();
      });

      if (isHoliday) {
        console.log("🎌 Holiday:", agent._id.toString());
        continue;
      }
    }

    availableAgents.push(agent);
  }

  if (!availableAgents.length) {
    console.log("⚠️ No agents available today");
    return null;
  }

  // 🔁 SAFE ROUND ROBIN (by agentId)
  const lastAgentId = customer.lastAssignedAgentId;
  let index = availableAgents.findIndex(
    (a) => a._id.toString() === lastAgentId
  );

  const nextIndex = (index + 1) % availableAgents.length;
  const selected = availableAgents[nextIndex];

  // save selected agent id
  await customer.constructor.updateOne(
    { _id: customer._id },
    { $set: { lastAssignedAgentId: selected._id.toString() } }
  );

  console.log("🎯 Assigned agent:", selected._id.toString());
  return selected._id;
}
