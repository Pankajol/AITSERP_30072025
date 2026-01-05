"use client";

import { useEffect, useState } from "react";
import axios from "axios";

/* ================= HELPERS ================= */

function calculateStats(feedbacks) {
  const valid = feedbacks.filter(
    (f) => typeof f.rating === "number" && f.rating > 0
  );

  const total = valid.length;

  const avgRating =
    total === 0
      ? "0.00"
      : (
          valid.reduce((sum, f) => sum + f.rating, 0) / total
        ).toFixed(2);

  const sentiment = {
    positive: valid.filter((f) => f.sentiment?.label === "positive").length,
    neutral: valid.filter((f) => f.sentiment?.label === "neutral").length,
    negative: valid.filter((f) => f.sentiment?.label === "negative").length,
  };

  return { total, avgRating, sentiment };
}

function resolveAgentName(f) {
  if (f.agentId?.name) return f.agentId.name;
  if (f.agentFromTicket?.name) return f.agentFromTicket.name;
  return "Unassigned";
}

/* ================= MAIN ================= */

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const res = await axios.get("/api/helpdesk/feedback/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFeedbacks(res.data?.data || []);
    } catch (err) {
      setError("Failed to load feedback data");
    } finally {
      setLoading(false);
    }
  }

  const stats = calculateStats(feedbacks);

  /* ================= UI STATES ================= */

  if (loading) {
    return (
      <div className="p-6 text-gray-500 text-lg">
        Loading feedback dashboard…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Feedback Dashboard</h1>
        <p className="text-sm text-gray-500">
          Customer satisfaction & agent performance overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Avg Rating" value={stats.avgRating} />
        <StatCard title="Total Feedback" value={stats.total} />
        <StatCard
          title="Positive"
          value={stats.sentiment.positive}
          color="green"
        />
        <StatCard
          title="Neutral"
          value={stats.sentiment.neutral}
          color="yellow"
        />
        <StatCard
          title="Negative"
          value={stats.sentiment.negative}
          color="red"
        />
      </div>

      {/* Feedback Table */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Rating</th>
              <th className="px-4 py-3 text-left">Sentiment</th>
              <th className="px-4 py-3 text-left">Comment</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {feedbacks.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No feedback received yet
                </td>
              </tr>
            ) : (
              feedbacks.map((f) => (
                <tr key={f._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {f.ticketId?.subject || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {resolveAgentName(f)}
                  </td>

                  <td className="px-4 py-3">
                    <Stars value={f.rating} />
                  </td>

                  <td className="px-4 py-3 capitalize">
                    <SentimentBadge value={f.sentiment?.label} />
                  </td>

                  <td className="px-4 py-3 max-w-xs truncate">
                    {f.comment || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function StatCard({ title, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Stars({ value = 0 }) {
  return (
    <span className="text-yellow-500">
      {"★".repeat(value)}
      <span className="text-gray-300">
        {"★".repeat(5 - value)}
      </span>
    </span>
  );
}

function SentimentBadge({ value }) {
  if (!value) return "-";

  const map = {
    positive: "bg-green-100 text-green-700",
    neutral: "bg-yellow-100 text-yellow-700",
    negative: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${map[value]}`}
    >
      {value}
    </span>
  );
}
