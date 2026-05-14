"use client";
import { useState } from "react";

export default function FileUploader({ ticketId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) return alert("Select file");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (ticketId) fd.append("ticketId", ticketId);

    const res = await fetch("/api/helpdesk/upload", {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      body: fd,
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onUploaded && onUploaded(data.attachment);
      alert("Uploaded");
    } else alert(data.msg || "Upload failed");
  }

  return (
    <div className="space-y-2">
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={upload} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">
        {loading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
