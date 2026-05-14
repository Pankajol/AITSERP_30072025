import { autoCloseTickets } from "@/cron/autoCloseTickets";
import { checkAgentSLA } from "@/cron/checkAgentSLA";

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoCloseTickets();
  await checkAgentSLA();

  return Response.json({ success: true });
}
