// helpers/autoAssignAgent.js

import CompanyUser from "@/models/CompanyUser";
import { isAgentAvailable } from "./agentAvailability";

export async function getNextAvailableAgent(customer) {
  if (!customer.assignedAgents?.length) return null;

  const total = customer.assignedAgents.length;
  let last = customer.lastAssignedAgentIndex ?? -1;

  for (let i = 1; i <= total; i++) {
    const idx = (last + i) % total;
    const agentId = customer.assignedAgents[idx];

    const agent = await CompanyUser.findById(agentId).lean();
    if (!agent || agent.isActive === false) continue;

    // leave / holiday logic here

    await Customer.updateOne(
      { _id: customer._id },
      { $set: { lastAssignedAgentIndex: idx } }
    );

    return agentId; // ✅ ONLY ObjectId
  }

  return null;
}

