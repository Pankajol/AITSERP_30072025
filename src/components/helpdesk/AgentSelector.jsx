"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";

export default function AgentSelector({ onSelect }) {
  const [agents, setAgents] = useState([]);

  // memoized axios instance
  const api = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return axios.create({
      baseURL: "/api/helpdesk",
      headers: { Authorization: token ? "Bearer " + token : "" },
      validateStatus: () => true, // allow manual error handling
    });
  }, []);

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAgents() {
    try {
      const resp = await api.get("/agents");

      const ct = (resp.headers["content-type"] || "").toLowerCase();

      // If the backend returned HTML, avoid JSON parsing errors
      if (ct.includes("text/html")) {
        console.error("❌ AgentSelector: API returned HTML (Not JSON). Status:", resp.status);
        console.error(String(resp.data).slice(0, 400));
        setAgents([]);
        return;
      }

      if (!resp.data || typeof resp.data !== "object") {
        console.error("❌ Unexpected response:", resp.data);
        setAgents([]);
        return;
      }

      if (resp.data.success === false) {
        console.error("❌ API success:false", resp.data.msg);
        setAgents([]);
        return;
      }

      setAgents(resp.data.agents || []);
    } catch (err) {
      console.error("AgentSelector error:", err);
      setAgents([]);
    }
  }

  return (
    <select
      onChange={(e) => onSelect?.(e.target.value)}
      className="p-2 border rounded bg-gray-800 text-white"
    >
      <option value="">Select agent</option>
      {agents.map((a) => (
        <option key={a._id} value={a._id}>
          {a.name} — {a.email}
        </option>
      ))}
    </select>
  );
}
