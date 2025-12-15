import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";

/**
 * Run this job every day / hour
 * Reassign tickets if current agent unavailable
 */
export async function autoReassignTickets() {
  console.log("🔁 Auto-reassign job started");

  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1️⃣ Find all open tickets with assigned agent
  const tickets = await Ticket.find({
    status: { $in: ["open", "pending"] },
    assignedTo: { $ne: null },
  }).lean();

  console.log(`🔎 Found ${tickets.length} tickets to evaluate`);

  for (const ticket of tickets) {
    try {
      const agent = await CompanyUser.findById(ticket.assignedTo).lean();

      let agentUnavailable = false;

      // ❌ agent deleted / inactive
      if (!agent || agent.isActive === false) {
        agentUnavailable = true;
      }

      // ❌ agent on leave
      if (!agentUnavailable && agent.leaveFrom && agent.leaveTo) {
        const from = new Date(agent.leaveFrom);
        const to = new Date(agent.leaveTo);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);

        if (today >= from && today <= to) {
          agentUnavailable = true;
        }
      }

      // ❌ agent on holiday
      if (!agentUnavailable && Array.isArray(agent.holidays)) {
        const isHoliday = agent.holidays.some((d) => {
          const hd = new Date(d);
          hd.setHours(0, 0, 0, 0);
          return hd.getTime() === today.getTime();
        });

        if (isHoliday) agentUnavailable = true;
      }

      // ✅ agent still valid → skip
      if (!agentUnavailable) continue;

      // 2️⃣ Fetch customer
      if (!ticket.customerId) continue;

      const customer = await Customer.findById(ticket.customerId);
      if (!customer) continue;

      // 3️⃣ Find next available agent
      const newAgentId = await getNextAvailableAgent(customer);

      if (!newAgentId) {
        console.warn(`⚠️ No agent available for ticket ${ticket._id}`);
        continue;
      }

      // 4️⃣ Update ticket
      await Ticket.updateOne(
        { _id: ticket._id },
        {
          $set: {
            assignedTo: newAgentId,
            assignedAt: new Date(),
            assignmentSource: "auto-reassign-cron",
          },
        }
      );

      console.log(
        `✅ Ticket ${ticket._id} reassigned from ${ticket.assignedTo} → ${newAgentId}`
      );
    } catch (err) {
      console.error(`❌ Failed to process ticket ${ticket._id}`, err);
    }
  }

  console.log("✅ Auto-reassign job finished");
}
