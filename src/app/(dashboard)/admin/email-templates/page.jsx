"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import TiptapEditor from "@/components/TiptapEditor";
import { Plus, Edit3, Trash2, X, Save } from "lucide-react";

export default function EmailTemplatesAdmin() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // { mode:'create'|'edit', data }
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const nameRef = useRef("");
  const subjectRef = useRef("");
  const [html, setHtml] = useState("<p></p>");
  const [companyIdInput, setCompanyIdInput] = useState(""); // optional - usually server uses token.companyId

  // make axios instance that attaches token from localStorage for each request
  const axiosAuth = axios.create();
  axiosAuth.interceptors.request.use((cfg) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // ignore
    }
    return cfg;
  });

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await axiosAuth.get("/api/email-templates");
      setTemplates(res.data?.data || []);
    } catch (err) {
      console.error("load templates", err);
      setStatus({ type: "error", text: err?.response?.data?.error || err.message || "Failed to load" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ mode: "create", data: null });
    nameRef.current = "";
    subjectRef.current = "";
    setHtml("<p></p>");
    setCompanyIdInput("");
    setStatus(null);
  };

  const openEdit = (doc) => {
    setEditing({ mode: "edit", data: doc });
    nameRef.current = doc.name || "";
    subjectRef.current = doc.subject || "";
    setHtml(doc.contentHtml || "<p></p>");
    setCompanyIdInput(doc.companyId || "");
    setStatus(null);
  };

  const closeEditor = () => setEditing(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        name: nameRef.current,
        subject: subjectRef.current,
        contentHtml: html,
        // prefer server-assigned companyId from token; include only if needed
        companyId: companyIdInput || undefined,
      };

      let res;
      if (editing.mode === "create") {
        res = await axiosAuth.post("/api/email-templates", payload);
      } else {
        res = await axiosAuth.put(`/api/email-templates/${editing.data._id}`, payload);
      }

      if (res.data?.error) throw new Error(res.data.error);
      setStatus({ type: "success", text: "Saved" });
      await loadTemplates();
      closeEditor();
    } catch (err) {
      console.error("save template", err);
      setStatus({ type: "error", text: err?.response?.data?.error || err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await axiosAuth.delete(`/api/email-templates/${id}`);
      setStatus({ type: "success", text: "Deleted" });
      await loadTemplates();
    } catch (err) {
      console.error("delete template", err);
      setStatus({ type: "error", text: err?.response?.data?.error || err.message || "Delete failed" });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Email Content Templates</h2>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Plus className="w-4 h-4" /> New</button>
          <button onClick={loadTemplates} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      {status && <div className={`mb-4 p-3 rounded ${status.type === "error" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{status.text}</div>}

      <div className="bg-white border rounded p-4 mb-6">
        {loading ? <div className="text-gray-500">Loading...</div> : templates.length === 0 ? <div className="text-sm text-gray-500">No templates yet</div> : (
          <div className="grid gap-3">
            {templates.map((t) => (
              <div key={t._id} className="border rounded p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{t.name || t.subject}</div>
                  <div className="text-xs text-gray-500">{t.subject}</div>
                  <div className="text-xs text-gray-400 mt-2">{t.companyId ? `Company: ${t.companyId}` : "Global"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(t)} className="px-2 py-1 bg-yellow-50 border rounded text-sm flex items-center gap-2"><Edit3 className="w-4 h-4" /> Edit</button>
                  <button onClick={() => handleDelete(t._id)} className="px-2 py-1 bg-red-50 border rounded text-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-start justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing.mode === "create" ? "Create Template" : "Edit Template"}</h3>
              <button onClick={closeEditor} className="p-1 rounded hover:bg-gray-100"><X /></button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Internal name" defaultValue={nameRef.current} onChange={(e) => (nameRef.current = e.target.value)} className="p-2 border rounded" />
              <input placeholder="Subject" defaultValue={subjectRef.current} onChange={(e) => (subjectRef.current = e.target.value)} className="p-2 border rounded" />
              <input placeholder="Company ID (optional - usually from token)" value={companyIdInput} onChange={(e) => setCompanyIdInput(e.target.value)} className="p-2 border rounded" />

              <div className="min-h-[260px] border rounded p-2">
                <TiptapEditor content={html} onChange={(val) => setHtml(val)} />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={closeEditor} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
