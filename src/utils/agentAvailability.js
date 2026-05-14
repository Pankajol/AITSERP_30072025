// helpers/isAgentAvailable.js
export function isAgentAvailable(agent) {
  if (!agent) return false;

  // inactive agent
  if (agent.isActive === false) return false;

  // manual leave
  if (agent.onLeave === true) return false;

  const now = new Date();

  // holiday range check
  if (Array.isArray(agent.holidays)) {
    for (const h of agent.holidays) {
      const from = new Date(h.from);
      const to = new Date(h.to);

      if (now >= from && now <= to) {
        return false;
      }
    }
  }

  return true;
}
