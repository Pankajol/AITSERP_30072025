import cron from "node-cron";
import { createBackupForCompany, deleteOldBackupsForCompany } from "@/lib/backupService";
import BackupSettings from "@/models/BackupSettings";

export async function startBackupScheduler() {
  // Fetch all companies with enabled backups and their schedules
  const settings = await BackupSettings.find({ enabled: true });
  for (const setting of settings) {
    if (setting.schedule && setting.schedule.trim()) {
      cron.schedule(setting.schedule, async () => {
        console.log(`Running scheduled backup for company ${setting.companyId} at ${new Date().toISOString()}`);
        try {
          await createBackupForCompany(setting.companyId);
          await deleteOldBackupsForCompany(setting.companyId);
          console.log(`Backup completed for company ${setting.companyId}`);
        } catch (err) {
          console.error(`Backup failed for company ${setting.companyId}:`, err);
          await BackupSettings.updateOne({ companyId: setting.companyId }, { lastBackupStatus: "failed", lastBackupError: err.message });
        }
      });
    }
  }
  console.log(`Scheduler started for ${settings.length} companies with backup enabled.`);
}