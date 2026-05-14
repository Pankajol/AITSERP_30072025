"use client";
import { useState, useEffect } from "react";
import { Download, Upload, Trash2, RefreshCw, HardDrive } from "lucide-react";

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const token = () => localStorage.getItem("token") || "";

const fetchBackups = async () => {
  setLoading(true);
  try {
    const res = await fetch("/api/backup", { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) {
      setBackups(data.data);
    } else {
      console.error("Backup fetch error:", data.message);
      alert("Error loading backups: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Network error: " + err.message);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchBackups(); }, []);

  const createManualBackup = async () => {
    setCreating(true);
    await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action: "manual" }),
    });
    await fetchBackups();
    setCreating(false);
  };

  const restoreBackup = async (id, filename) => {
    if (!confirm(`Restore backup ${filename}? This will overwrite current data.`)) return;
    setLoading(true);
    await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action: "restore", backupId: id }),
    });
    alert("Restore initiated. Please refresh data.");
    setLoading(false);
  };

  const deleteBackup = async (id, filename) => {
    if (!confirm(`Delete backup ${filename}?`)) return;
    await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ action: "delete", backupId: id }),
    });
    await fetchBackups();
  };

const downloadBackup = async (id, filename) => {
  try {
    const res = await fetch(`/api/backup?action=download&id=${id}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Download failed: " + err.message);
  }
};

  const formatDate = (d) => new Date(d).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Data Backup & Restore</h1>
          <button onClick={createManualBackup} disabled={creating} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <HardDrive size={16} /> {creating ? "Creating..." : "Create Backup Now"}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Backup History</h2>
            <button onClick={fetchBackups} className="text-sm text-indigo-600 flex items-center gap-1"><RefreshCw size={14}/> Refresh</button>
          </div>
          {loading ? <div className="animate-pulse h-32 bg-gray-100 rounded"></div> : backups.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No backups found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Filename</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Size</th>
                    <th className="px-4 py-2 text-left">Storage</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b._id} className="border-t">
                      <td className="py-2 font-mono text-xs">{b.filename}</td>
                      <td className="py-2">{formatDate(b.createdAt)}</td>
                      <td className="py-2">{(b.fileSize / 1024).toFixed(1)} KB</td>
                      <td className="py-2 capitalize">{b.storageType}</td>
                      <td className="py-2 flex gap-2">
                        <button onClick={() => downloadBackup(b._id, b.filename)} className="text-blue-600 hover:text-blue-800"><Download size={16}/></button>
                        <button onClick={() => restoreBackup(b._id, b.filename)} className="text-green-600 hover:text-green-800"><Upload size={16}/></button>
                        <button onClick={() => deleteBackup(b._id, b.filename)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 text-sm text-blue-800">
          <strong>Schedule:</strong> Daily at 2 AM (configurable via BACKUP_SCHEDULE).<br/>
          <strong>Retention:</strong> {process.env.NEXT_PUBLIC_BACKUP_RETENTION_DAYS || 30} days.<br/>
          <strong>Storage:</strong> {process.env.BACKUP_STORAGE || "local"}.
        </div>
      </div>
    </div>
  );
}