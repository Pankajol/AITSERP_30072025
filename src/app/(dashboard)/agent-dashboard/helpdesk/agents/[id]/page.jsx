"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { FiUser, FiMail, FiTag, FiPlusCircle } from "react-icons/fi";

const DEFAULT_AVATAR = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

export default function AgentProfilePage() {
  const { id } = useParams();

  const [agent, setAgent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assignModal, setAssignModal] = useState(false); // for Step 4

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const axiosInstance = axios.create({
    headers: { Authorization: token ? "Bearer " + token : "" },
  });

  useEffect(() => {
    if (id) loadAgent();
  }, [id]);

  async function loadAgent() {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(
        `/api/helpdesk/agents/${id}`
      );

      if (data?.success) {
        setAgent(data.agent);
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("agent profile load:", err);
    } finally {
      setLoading(false);
    }
  }

  function statusColor(status) {
    if (!status) return "bg-gray-500 text-white";
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-600 text-white";
      case "assigned":
        return "bg-yellow-500 text-white";
      case "in-progress":
        return "bg-purple-600 text-white";
      case "resolved":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  if (loading)
    return (
      <div className="p-6 text-center text-gray-500">Loading agent...</div>
    );

  if (!agent)
    return (
      <div className="p-6 text-center text-red-500">Agent not found</div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Agent Header */}
      <div className="bg-white shadow rounded-lg p-6 flex gap-6 items-center">
        <img
          src={agent.avatar || DEFAULT_AVATAR}
          alt="avatar"
          className="w-24 h-24 rounded-full object-cover border"
        />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiUser /> {agent.name}
          </h1>
          <p className="flex items-center gap-2 text-gray-600 mt-1">
            <FiMail /> {agent.email}
          </p>

          <div className="flex gap-2 mt-2 flex-wrap">
            {(agent.roles || []).map((r, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-200 rounded text-gray-700 text-sm flex items-center gap-1"
              >
                <FiTag /> {r}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto">
          <button
            onClick={() => setAssignModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            <FiPlusCircle /> Assign Ticket
          </button>
        </div>
      </div>

      {/* Tickets Section */}
      <h2 className="text-xl font-semibold mt-8 mb-3">Assigned Tickets</h2>

      {tickets.length === 0 ? (
        <div className="bg-white p-6 rounded shadow text-gray-500">
          No tickets assigned yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((t) => (
            <div
              key={t._id}
              className="bg-white p-4 rounded shadow border hover:shadow-md transition"
            >
              <h3 className="font-semibold text-lg">{t.subject}</h3>
              <p className="text-gray-600 text-sm mt-1">{t.description}</p>

              <div className="flex justify-between items-center mt-4">
                <span
                  className={`px-3 py-1 rounded text-xs ${statusColor(
                    t.status
                  )}`}
                >
                  {t.status || "open"}
                </span>

                {t.priority && (
                  <span className="px-3 py-1 rounded bg-red-200 text-red-800 text-xs">
                    {t.priority.toUpperCase()}
                  </span>
                )}
              </div>

              {/* SLA Due */}
              {t.slaDue && (
                <div className="text-xs text-gray-500 mt-2">
                  SLA Due: {new Date(t.slaDue).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Ticket Modal (Step 4) */}
      {assignModal && (
        <AssignTicketModal
          agentId={id}
          close={() => setAssignModal(false)}
          refresh={loadAgent}
        />
      )}
    </div>
  );
}

/* ---------------- MODAL COMPONENT FOR STEP 4 ----------------- */

function AssignTicketModal({ agentId, close, refresh }) {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const axiosInstance = axios.create({
    headers: { Authorization: token ? "Bearer " + token : "" },
  });

  useEffect(() => {
    loadUnassignedTickets();
  }, []);

  async function loadUnassignedTickets() {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(
        "/api/helpdesk/tickets/unassigned"
      );
      if (data?.success) setTickets(data.tickets || []);
    } catch (err) {
      console.error("load unassigned tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function assign() {
    if (!selected) return alert("Select a ticket");

    setSaving(true);
    try {
      const { data } = await axiosInstance.post(
        `/api/helpdesk/agents/${agentId}/assign-ticket`,
        { ticketId: selected, priority }
      );

      if (data?.success) {
        alert("Ticket Assigned");
        refresh();
        close();
      }
    } catch (err) {
      console.error("assign:", err);
      alert("Failed to assign ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow">
        <h2 className="text-xl font-bold mb-4">Assign Ticket</h2>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            <label className="block text-sm font-medium">Select Ticket</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border p-2 rounded mt-1"
            >
              <option value="">-- Select --</option>
              {tickets.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.subject}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium mt-4">
              Priority (SLA)
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border p-2 rounded mt-1"
            >
              <option value="low">Low - 48 hrs</option>
              <option value="medium">Medium - 24 hrs</option>
              <option value="high">High - 8 hrs</option>
              <option value="critical">Critical - 1 hr</option>
            </select>

            <div className="flex gap-2 mt-6">
              <button
                disabled={saving}
                onClick={assign}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={close}
                className="flex-1 bg-gray-300 hover:bg-gray-400 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
