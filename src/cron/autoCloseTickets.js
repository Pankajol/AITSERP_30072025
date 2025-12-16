import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";

export async function autoCloseTickets() {
  await dbConnect();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tickets = await Ticket.find({
    status: "open",
    lastAgentReplyAt: { $lte: sevenDaysAgo },
  });

  for (const ticket of tickets) {
    ticket.status = "closed";
    ticket.autoClosed = true;
    ticket.closedAt = new Date();
    await ticket.save();

    // 🔥 FEEDBACK EMAIL
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/feedback?ticketId=${ticket._id}`
    ).catch(console.error);
  }
}
