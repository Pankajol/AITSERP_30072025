"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiEdit, FiTrash2, FiRefreshCw } from "react-icons/fi";

const DEFAULT_AVATAR = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

/**
 * Agents Management (Create / Edit / Delete) using axios.
 * - GET /api/helpdesk/agents
 * - POST /api/helpdesk/agents
 * - PUT  /api/helpdesk/agents/:id
 * - DELETE /api/helpdesk/agents/:id
 *
 * Assumes token in localStorage.token
 */

export default function AgentsManagePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // agent object or null
  const [form, setForm] = useState({ name: "", email: "", password: "", roles: ["Agent"], avatar: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }
  const [query, setQuery] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const axiosInstance = axios.create({
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    setMsg(null);
    try {
      const url = query ? `/api/helpdesk/agents?q=${encodeURIComponent(query)}` : "/api/helpdesk/agents";
      const { data } = await axiosInstance.get(url);
      if (data?.success) setAgents(data.agents || []);
      else {
        setAgents([]);
        setMsg({ type: "error", text: data?.msg || "Failed to load agents" });
      }
    } catch (err) {
      console.error("loadAgents", err);
      setAgents([]);
      setMsg({ type: "error", text: err?.response?.data?.msg || err.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", roles: ["Agent"], avatar: "" });
    setModalOpen(true);
    setMsg(null);
  }

  function openEdit(agent) {
    setEditing(agent);
    setForm({
      name: agent.name || "",
      email: agent.email || "",
      password: "",
      roles: agent.roles || ["Agent"],
      avatar: agent.avatar || "",
    });
    setModalOpen(true);
    setMsg(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", email: "", password: "", roles: ["Agent"], avatar: "" });
  }

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submitForm(e) {
    e?.preventDefault();
    setBusy(true);
    setMsg(null);

    try {
      // Validation
      if (!form.name || !form.email) {
        setMsg({ type: "error", text: "Name and email are required" });
        return;
      }

      // Build payload
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        roles: Array.isArray(form.roles) ? form.roles : [form.roles],
        avatar: form.avatar || undefined,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        // update
        const { data } = await axiosInstance.put(`/api/helpdesk/agents/${editing._id}`, payload);
        if (data?.success) {
          // update in list
          setAgents((prev) => prev.map((p) => (String(p._id) === String(editing._id) ? { ...p, ...data.agent } : p)));
          setMsg({ type: "success", text: "Agent updated" });
          closeModal();
        } else {
          setMsg({ type: "error", text: data?.msg || "Update failed" });
        }
      } else {
        // create
        const { data } = await axiosInstance.post("/api/helpdesk/agents", payload);
        if (data?.success) {
          // prepend new agent for quick visibility
          setAgents((prev) => [data.user || data.user, ...prev]);
          setMsg({ type: "success", text: "Agent created" });
          closeModal();
        } else {
          setMsg({ type: "error", text: data?.msg || "Create failed" });
        }
      }
    } catch (err) {
      console.error("submitForm", err);
      setMsg({ type: "error", text: err?.response?.data?.msg || err.message || "Request failed" });
    } finally {
      setBusy(false);
    }
  }

  async function removeAgent(id) {
    if (!confirm("Delete this agent? This action cannot be undone.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await axiosInstance.delete(`/api/helpdesk/agents/${id}`);
      if (data?.success) {
        setAgents((prev) => prev.filter((p) => String(p._id) !== String(id)));
        setMsg({ type: "success", text: "Agent deleted" });
      } else {
        setMsg({ type: "error", text: data?.msg || "Delete failed" });
      }
    } catch (err) {
      console.error("removeAgent", err);
      setMsg({ type: "error", text: err?.response?.data?.msg || err.message || "Delete failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Agents</h1>
          <p className="text-sm text-gray-500">Create, edit or remove agents for your helpdesk.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="px-3 py-2 border rounded w-64"
          />
          <button
            onClick={() => loadAgents()}
            className="px-3 py-2 bg-gray-200 rounded flex items-center gap-2"
            title="Refresh"
          >
            <FiRefreshCw />
          </button>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
            <FiPlus /> Create Agent
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded ${msg.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10">Loading agents…</div>
        ) : agents.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500">No agents found</div>
        ) : (
          agents.map((a) => (
            <div key={a._id} className="bg-white rounded shadow p-4 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={a.avatar || DEFAULT_AVATAR}
                  alt={a.name}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                />
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm text-gray-600">{a.email}</div>
                  <div className="text-xs text-gray-400 mt-1">Roles: {(a.roles || []).join(", ")}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-sm text-gray-600">Assigned: <span className="font-medium">{a.assignedCount ?? 0}</span></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-800"
                    title="Edit"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => removeAgent(a._id)}
                    className="p-2 rounded bg-red-50 hover:bg-red-100 text-red-800"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow max-w-xl w-full p-6">
            <h3 className="text-lg font-semibold mb-3">{editing ? "Edit Agent" : "Create Agent"}</h3>

            <form onSubmit={submitForm} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border p-2 rounded"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                />
                <input
                  className="border p-2 rounded"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border p-2 rounded"
                  placeholder={editing ? "Leave blank to keep password" : "Password"}
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                />
                <input
                  className="border p-2 rounded"
                  placeholder="Avatar URL (optional)"
                  value={form.avatar}
                  onChange={(e) => setField("avatar", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Roles (comma separated)</label>
                <input
                  className="w-full border p-2 rounded mt-1"
                  placeholder="e.g. Agent, Support Executive"
                  value={(Array.isArray(form.roles) ? form.roles.join(", ") : form.roles)}
                  onChange={(e) => setField("roles", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                />
                <div className="text-xs text-gray-400 mt-1">Common: Agent, Support Executive, Admin</div>
              </div>

              <div className="flex gap-3 pt-2">
                <button disabled={busy} type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">
                  {busy ? "Saving…" : editing ? "Update Agent" : "Create Agent"}
                </button>
                <button type="button" onClick={closeModal} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
              </div>
            </form>

            {msg && (
              <div className={`mt-3 p-2 rounded ${msg.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
