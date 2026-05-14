import AgentProfile from "@/models/crm/AgentProfile";

// choose best agent for a category
export async function pickAgent({ companyId, category }) {
  const agents = await AgentProfile.find({
    companyId,
    isOnline: true,
    isBusy: false,
    categories: category,
  }).sort({ priority: -1, lastCallAt: 1 }); // priority high + round-robin by lastCallAt

  if (!agents.length) {
    // fallback general
    const fallback = await AgentProfile.find({
      companyId,
      isOnline: true,
      isBusy: false,
      categories: "general",
    }).sort({ priority: -1, lastCallAt: 1 });

    return fallback?.[0] || null;
  }

  return agents[0];
}

export async function markAgentBusy({ companyId, userId, busy }) {
  return AgentProfile.findOneAndUpdate(
    { companyId, userId },
    { $set: { isBusy: busy, lastCallAt: new Date() } },
    { new: true }
  );
}
