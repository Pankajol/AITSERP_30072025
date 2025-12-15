export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";

/**
 * 🔁 Auto Reassign Tickets
 * - Run via CRON
 * - Reassign tickets if agent is inactive / on leave / holiday
 */
export async function GET() {
  try {
    console.log("🔁 Auto-reassign job started");

    await dbConnect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* ===============================
       1️⃣ Find tickets with agentId
    =============================== */
    const tickets = await Ticket.find({
      status: { $in: ["open", "in_progress"] },
      agentId: { $ne: null },
    }).lean();

    console.log(`🔎 Tickets found: ${tickets.length}`);

    for (const ticket of tickets) {
      try {
        /* ===============================
           2️⃣ Load assigned agent
        =============================== */
        const agent = await CompanyUser.findById(ticket.agentId).lean();

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

        // ✅ agent available → skip
        if (!agentUnavailable) continue;

        console.log(
          `⚠️ Agent unavailable for ticket ${ticket._id}, reassigning...`
        );

        /* ===============================
           3️⃣ Fetch customer
        =============================== */
        if (!ticket.customerId) continue;

        const customer = await Customer.findById(ticket.customerId);
        if (!customer) continue;

        /* ===============================
           4️⃣ Get next available agent
        =============================== */
        const newAgentId = await getNextAvailableAgent(customer);

        if (!newAgentId) {
          console.warn(
            `⚠️ No available agent for ticket ${ticket._id}`
          );
          continue;
        }

        /* ===============================
           5️⃣ Update ticket
        =============================== */
        await Ticket.updateOne(
          { _id: ticket._id },
          {
            $set: {
              agentId: newAgentId,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `✅ Ticket ${ticket._id} reassigned → ${newAgentId}`
        );
      } catch (err) {
        console.error(
          `❌ Failed for ticket ${ticket._id}`,
          err
        );
      }
    }

    console.log("✅ Auto-reassign job finished");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Auto-reassign CRON error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
