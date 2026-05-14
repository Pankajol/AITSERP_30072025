import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Notification from "@/models/helpdesk/Notification";

export async function checkAgentSLA() {
  await dbConnect();

  const deadline = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const tickets = await Ticket.find({
    status: "open",
    lastCustomerReplyAt: { $lte: deadline },
  });

  for (const t of tickets) {
    if (t.lastAgentReplyAt && t.lastAgentReplyAt > t.lastCustomerReplyAt) {
      continue;
    }

    await Notification.create({
      userId: t.agentId,
      type: "SLA_BREACH",
      ticketId: t._id,
      message: "⏰ SLA breached: customer waiting > 24h",
    });
  }
}
