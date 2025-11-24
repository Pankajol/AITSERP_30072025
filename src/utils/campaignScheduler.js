import cron from "node-cron";
import EmailCampaign from "@/models/EmailCampaign";
import dbConnect from "@/lib/db";

console.log("🚀 Scheduler Loaded");

cron.schedule("* * * * *", async () => {
  console.log("⏱  Scheduler Running:", new Date().toLocaleString());

  await dbConnect();

  const now = new Date();

  const due = await EmailCampaign.find({
    scheduledTime: { $lte: now },
    status: "Scheduled",
  });

  if (due.length > 0) {
    console.log(`📨 Found ${due.length} campaign(s) ready to send`);
  } else {
    console.log("⏳ No campaigns ready");
  }

  for (const camp of due) {
    try {
      console.log(`➡ Sending campaign: ${camp._id}`);

      // --- Your send logic here ---
      camp.status = "Sent";
      await camp.save();

      console.log(`✔ Campaign Sent: ${camp._id}`);
    } catch (err) {
      console.error(`❌ Failed: ${camp._id}`, err);
      camp.status = "Failed";
      await camp.save();
    }
  }
});
