import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import SLA from "@/models/helpdesk/SLA";

async function seed(companyId) {
  await dbConnect();
  const defaults = ["billing","technical","login","bug","general"];
  for (const d of defaults) {
    const exists = await TicketCategory.findOne({ companyId, name: d });
    if (!exists) await TicketCategory.create({ companyId, name: d, type: "default" });
  }
  // create a default SLA
  const slaExists = await SLA.findOne({ companyId, name: "default" });
  if (!slaExists) await SLA.create({ companyId, name: "default", responseHours: 4, resolutionHours: 72, createdBy: null });
  console.log("Seed done");
}

// call seed with your company id
// seed("YOUR_COMPANY_ID").catch(console.error);
