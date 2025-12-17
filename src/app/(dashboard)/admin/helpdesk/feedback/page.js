"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = localStorage.getItem("token");

    const [listRes, statsRes] = await Promise.all([
      axios.get("/api/helpdesk/feedback/list", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("/api/helpdesk/feedback/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    setFeedbacks(listRes.data.data);
    setStats(statsRes.data);
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>📊 Feedback Dashboard</h2>

      {/* Analytics Cards */}
      {stats && (
        <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
          <Card title="⭐ Avg Rating" value={stats.avgRating} />
          <Card title="🧾 Total Feedback" value={stats.total} />
          <Card title="😊 Positive" value={stats.sentiment.positive} />
          <Card title="😐 Neutral" value={stats.sentiment.neutral} />
          <Card title="😠 Negative" value={stats.sentiment.negative} />
        </div>
      )}

      {/* Feedback Table */}
      <table border="1" cellPadding="10" width="100%">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Agent</th>
            <th>Rating</th>
            <th>Sentiment</th>
            <th>Comment</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((f) => (
            <tr key={f._id}>
              <td>{f.ticketId?.subject || "-"}</td>
              <td>{f.agentId?.name || "-"}</td>
              <td>{"⭐".repeat(f.rating)}</td>
              <td>{f.sentiment?.label} ({f.sentiment?.score})</td>
              <td>{f.comment || "-"}</td>
              <td>{new Date(f.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        padding: 20,
        border: "1px solid #ddd_toggle",
        borderRadius: 8,
        minWidth: 150,
      }}
    >
      <h4>{title}</h4>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  );
}
