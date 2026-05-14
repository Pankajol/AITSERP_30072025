import { transporter } from "@/lib/mailer";
import CompanyUser from "@/models/CompanyUser";

export async function notifyAgent({ agentId, ticket }) {
  if (!agentId) return;

  const agent = await CompanyUser.findById(agentId).lean();
  if (!agent?.email) return;

  await transporter.sendMail({
    to: agent.email,
    subject: `🆕 Ticket Assigned: ${ticket.subject}`,
    html: `
      <p>Hello ${agent.name},</p>
      <p>A new ticket has been assigned to you automatically.</p>
      <p><b>Ticket:</b> ${ticket.subject}</p>
      <p><b>Ticket ID:</b> ${ticket._id}</p>
      <br/>
      <p>— Support System</p>
    `,
  });
}
