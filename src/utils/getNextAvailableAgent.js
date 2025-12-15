import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";

/**
 * Get next available agent using round-robin
 * - skips inactive / on-leave / holiday agents
 * - updates customer.lastAssignedAgentIndex
 */
export async function getNextAvailableAgent(customer) {
  if (
    !customer ||
    !Array.isArray(customer.assignedAgents) ||
    customer.assignedAgents.length === 0
  ) {
    return null;
  }

  const agents = customer.assignedAgents.map(String);
  const totalAgents = agents.length;

  let lastIndex =
    typeof customer.lastAssignedAgentIndex === "number"
      ? customer.lastAssignedAgentIndex
      : -1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 🔁 try max N agents (round-robin)
  for (let i = 1; i <= totalAgents; i++) {
    const nextIndex = (lastIndex + i) % totalAgents;
    const agentId = agents[nextIndex];

    const agent = await CompanyUser.findById(agentId).lean();
    if (!agent) continue;

    // ❌ inactive user
    if (agent.isActive === false) continue;

    // ❌ agent role missing
    if (!agent.roles?.includes("agent")) continue;

    // ❌ leave check (optional fields)
    if (agent.leaveFrom && agent.leaveTo) {
      const from = new Date(agent.leaveFrom);
      const to = new Date(agent.leaveTo);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);

      if (today >= from && today <= to) continue;
    }

    // ❌ holiday check (array of dates)
    if (Array.isArray(agent.holidays)) {
      const isHoliday = agent.holidays.some((d) => {
        const hd = new Date(d);
        hd.setHours(0, 0, 0, 0);
        return hd.getTime() === today.getTime();
      });
      if (isHoliday) continue;
    }

    // ✅ FOUND VALID AGENT
    await Customer.updateOne(
      { _id: customer._id },
      { $set: { lastAssignedAgentIndex: nextIndex } }
    );

    return agent._id;
  }

  // ❌ no agent available
  return null;
}
