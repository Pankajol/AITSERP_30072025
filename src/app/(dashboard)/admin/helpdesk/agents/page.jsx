"use client";

import { useEffect, useState } from "react";

const DEFAULT_AVATAR = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        if (!token) {
          setErr("Not authenticated — please login.");
          setAgents([]);
          return;
        }
        const url = query ? `/api/helpdesk/agents?q=${encodeURIComponent(query)}` : "/api/helpdesk/agents";
        const res = await fetch(url, {
          headers: { Authorization: "Bearer " + token },
          signal: ac.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.msg || body?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setAgents(data?.agents || []);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("load agents error:", e);
        setErr(e.message || "Failed to load agents");
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [query]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-gray-500">Support agents for your company</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="px-3 py-2 border rounded w-64"
          />
          <button
            onClick={() => setQuery((q) => q.trim())}
            className="px-3 py-2 bg-gray-200 rounded"
            title="Apply"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading agents…</div>
      ) : err ? (
        <div className="text-center py-6 text-red-600">{err}</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No agents found</div>
      ) : (
        <ul className="space-y-3 mt-4">
          {agents.map((a) => (
            <li
              key={a._id}
              className="p-3 bg-white shadow rounded flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <img
                  src={a.avatar || DEFAULT_AVATAR}
                  alt={a.name}
                  className="w-12 h-12 rounded-full object-cover border"
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                />
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-sm opacity-70">{a.email}</div>
                </div>
              </div>

              <div className="text-sm opacity-60">Assigned Tickets: {a.assignedCount ?? "—"}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
