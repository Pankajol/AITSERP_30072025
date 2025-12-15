export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import TicketReassignmentLog from "@/models/helpdesk/TicketReassignmentLog";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { notifyAgent } from "@/utils/notifyAgent";

export async function GET() {
  try {
    await dbConnect();
    console.log("🔁 Auto-reassign cron started");

    const tickets = await Ticket.find({
      status: "open",
      assignedTo: { $ne: null },
    }).populate("customerId");

    for (const ticket of tickets) {
      const customer = ticket.customerId;
      if (!customer?.assignedAgents?.length) continue;

      const nextAgent = await getNextAvailableAgent(customer);
      if (!nextAgent) continue;

      if (ticket.assignedTo?.toString() === nextAgent.toString()) continue;

      const previousAgent = ticket.assignedTo;

      ticket.assignedTo = nextAgent;
      await ticket.save();

      // 🧾 LOG
      await TicketReassignmentLog.create({
        companyId: customer.companyId,
        ticketId: ticket._id,
        fromAgent: previousAgent,
        toAgent: nextAgent,
        reason: "LEAVE",
        triggeredBy: "CRON",
      });

      // 🔔 NOTIFY
      await notifyAgent({ agentId: nextAgent, ticket });

      console.log(`✅ Ticket ${ticket._id} reassigned`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Auto reassignment completed" }),
      { status: 200 }
    );

  } catch (err) {
    console.error("Auto-reassign error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
