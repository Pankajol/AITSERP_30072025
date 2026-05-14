"use client";
import { useEffect, useState } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

export default function BackupSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const token = () => localStorage.getItem("token") || "";

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const res = await fetch("/api/backup-settings", { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setSettings(data.data);
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch("/api/backup-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setMessage({ type: data.success ? "success" : "error", text: data.message || (data.success ? "Saved" : "Failed") });
    setTimeout(() => setMessage(null), 5000);
    setSaving(false);
  };

  const manualBackup = async () => {
    setManualLoading(true);
    const res = await fetch("/api/backup-settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (data.success) setMessage({ type: "success", text: "Backup created successfully" });
    else setMessage({ type: "error", text: data.message });
    setManualLoading(false);
    setTimeout(() => setMessage(null), 5000);
    fetchSettings(); // refresh last backup info
  };

  const updateField = (field, value) => setSettings({ ...settings, [field]: value });

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Backup Configuration</h1>
        
        {message && (
          <div className={`mb-4 p-3 rounded flex items-center gap-2 ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
        
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings?.enabled || false} onChange={e => updateField("enabled", e.target.checked)} className="w-4 h-4" />
              Enable Automatic Backups
            </label>
            <button onClick={manualBackup} disabled={manualLoading} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
              <RefreshCw size={14} className={manualLoading ? "animate-spin" : ""} /> Run Manual Backup
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Storage Provider</label>
            <select value={settings?.storageProvider || "local"} onChange={e => updateField("storageProvider", e.target.value)} className="mt-1 w-full border rounded p-2">
              <option value="local">Local Filesystem</option>
              <option value="google_drive">Google Drive</option>
              <option value="s3">AWS S3</option>
              <option value="dropbox">Dropbox</option>
              <option value="azure">Azure Blob Storage</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div><label>Schedule (cron) <span className="text-xs text-gray-400">e.g. 0 2 * * *</span></label><input value={settings?.schedule || "0 2 * * *"} onChange={e => updateField("schedule", e.target.value)} className="w-full border rounded p-2" /></div>
            <div><label>Retention Days</label><input type="number" value={settings?.retentionDays || 30} onChange={e => updateField("retentionDays", parseInt(e.target.value))} className="w-full border rounded p-2" /></div>
          </div>
          
          {settings?.storageProvider === "local" && (
            <div><label>Local Path</label><input value={settings?.localPath || "./backups"} onChange={e => updateField("localPath", e.target.value)} className="w-full border rounded p-2" /></div>
          )}
          
          {settings?.storageProvider === "google_drive" && (
            <div className="space-y-3 border-t pt-4">
              <input placeholder="Google Client ID" value={settings?.googleClientId || ""} onChange={e => updateField("googleClientId", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="Google Client Secret" type="password" value={settings?.googleClientSecret || ""} onChange={e => updateField("googleClientSecret", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="Google Refresh Token" type="password" value={settings?.googleRefreshToken || ""} onChange={e => updateField("googleRefreshToken", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="Folder ID (optional)" value={settings?.googleFolderId || ""} onChange={e => updateField("googleFolderId", e.target.value)} className="w-full border rounded p-2" />
            </div>
          )}
          
          {settings?.storageProvider === "s3" && (
            <div className="space-y-3 border-t pt-4">
              <input placeholder="AWS Access Key ID" value={settings?.awsAccessKeyId || ""} onChange={e => updateField("awsAccessKeyId", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="AWS Secret Access Key" type="password" value={settings?.awsSecretAccessKey || ""} onChange={e => updateField("awsSecretAccessKey", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="AWS Region" value={settings?.awsRegion || "ap-south-1"} onChange={e => updateField("awsRegion", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="Bucket Name" value={settings?.awsBucket || ""} onChange={e => updateField("awsBucket", e.target.value)} className="w-full border rounded p-2" />
            </div>
          )}
          
          {settings?.storageProvider === "dropbox" && (
            <div><input placeholder="Dropbox Access Token" type="password" value={settings?.dropboxAccessToken || ""} onChange={e => updateField("dropboxAccessToken", e.target.value)} className="w-full border rounded p-2" /></div>
          )}
          
          {settings?.storageProvider === "azure" && (
            <div className="space-y-3 border-t pt-4">
              <input placeholder="Azure Connection String" type="password" value={settings?.azureConnectionString || ""} onChange={e => updateField("azureConnectionString", e.target.value)} className="w-full border rounded p-2" />
              <input placeholder="Container Name" value={settings?.azureContainerName || "backups"} onChange={e => updateField("azureContainerName", e.target.value)} className="w-full border rounded p-2" />
            </div>
          )}
          
          <div className="border-t pt-4 text-sm text-gray-500">
            <p><strong>Last backup:</strong> {settings?.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "Never"}</p>
            <p><strong>Last status:</strong> <span className={settings?.lastBackupStatus === "success" ? "text-green-600" : "text-red-600"}>{settings?.lastBackupStatus || "—"}</span></p>
            {settings?.lastBackupError && <p className="text-red-500">Error: {settings.lastBackupError}</p>}
          </div>
          
          <button onClick={saveSettings} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">
            <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}