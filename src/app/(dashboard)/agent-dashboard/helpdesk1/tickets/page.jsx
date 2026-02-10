"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TicketCard from "@/components/helpdesk/TicketCard";

// uploaded file path (will be transformed to a usable URL by your environment)
const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

/**
 * AgentTickets
 * - Shows only tickets assigned to the currently authenticated agent.
 * - Attempts to discover current user id from /api/auth/me (if available) or by decoding the JWT in localStorage.
 * - Falls back to hiding all tickets if we cannot determine the current user.
 */
export default function AgentTickets() {
  const [tickets, setTickets] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      // get token
      const rawToken = localStorage.getItem("token") || "";
      const token = rawToken?.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;

      // 1) try /api/auth/me to get user id (recommended)
      try {
        if (token) {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: "Bearer " + token },
          });
          if (res.ok) {
            const j = await res.json();
            // many implementations return { success: true, user: { _id, id, email, ... } }
            const uid = j?.user?._id || j?.user?.id || j?.id || j?.user?.userId;
            if (uid) {
              setUserId(String(uid));
            }
          }
        }
      } catch (e) {
        // ignore, we'll try decode next
        console.warn("api/auth/me not available or failed:", e);
      }

      // 2) if still no userId try to decode JWT payload (best-effort)
      if (!userId && token) {
        try {
          const parts = token.split(".");
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            const uid = payload?.id || payload?._id || payload?.sub || payload?.userId || payload?.uid;
            if (uid) setUserId(String(uid));
          }
        } catch (e) {
          console.warn("JWT decode failed:", e);
        }
      }

      // 3) fetch tickets (server should return populated agentId)
      try {
        const res = await fetch("/api/helpdesk/list", {
          headers: token ? { Authorization: "Bearer " + token } : {},
        });
        const data = await res.json();
        if (!data || typeof data !== "object") throw new Error("Invalid server response");
        const all = data.tickets || [];
        setTickets(all);
      } catch (e) {
        console.error("Failed to load tickets:", e);
        setErr("Failed to load tickets");
        setTickets([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // if we couldn't determine user id, don't show assigned tickets (safer)
  if (loading) return <div className="p-6">Loading assigned tickets…</div>;

  if (!userId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Assigned Tickets</h1>
        <div className="mb-4 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
          Unable to determine your user identity. Make sure you're logged in. If you just logged in, refresh the page.
        </div>

        <div className="mb-4">
          <img src={SAMPLE_IMAGE} alt="sample" className="w-40 rounded shadow-sm" />
        </div>

        {err && <div className="text-red-600 mb-2">{err}</div>}
      </div>
    );
  }

  // filter tickets assigned to this agent
  const assigned = tickets.filter((t) => {
    if (!t) return false;
    // agentId may be an object (populated) or a string id
    const aid = t.agentId;
    if (!aid) return false;
    if (typeof aid === "string") return aid === userId;
    // object form
    return String(aid._id || aid.id || aid).toString() === String(userId);
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Assigned Tickets</h1>

      {assigned.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">You have no assigned tickets right now.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {assigned.map((t) => (
            <Link key={t._id} href={`/agent-dashboard/helpdesk/tickets/${t._id}`} className="block">
              <TicketCard ticket={t} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
