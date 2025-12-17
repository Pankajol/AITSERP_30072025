"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#22c55e", "#facc15", "#ef4444"];

export default function FeedbackAnalytics() {
  const [sentiment, setSentiment] = useState([]);
  const [trend, setTrend] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("/api/helpdesk/feedback/charts/sentiment", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) =>
        setSentiment(
          res.data.data.map((d) => ({
            name: d._id || "neutral",
            value: d.count,
          }))
        )
      );

    axios
      .get("/api/helpdesk/feedback/charts/rating-trend", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) =>
        setTrend(
          res.data.data.map((d) => ({
            month: `${d._id.month}/${d._id.year}`,
            avgRating: Number(d.avgRating.toFixed(2)),
          }))
        )
      );

    axios
      .get("/api/helpdesk/feedback/charts/leaderboard")
      .then((res) => setLeaderboard(res.data.data));
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h2>📊 Feedback Analytics</h2>

      {/* Sentiment Pie */}
      <h3>😊 Sentiment Distribution</h3>
      <PieChart width={300} height={250}>
        <Pie data={sentiment} dataKey="value" nameKey="name" outerRadius={100}>
          {sentiment.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>

      {/* Avg Rating Trend */}
      <h3>📈 Avg Rating Trend</h3>
      <LineChart width={500} height={250} data={trend}>
        <XAxis dataKey="month" />
        <YAxis domain={[1, 5]} />
        <Tooltip />
        <Line type="monotone" dataKey="avgRating" />
      </LineChart>

      {/* Leaderboard */}
      <h3>🏆 Agent Leaderboard</h3>
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Avg Rating</th>
            <th>Total Feedback</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((a) => (
            <tr key={a._id}>
              <td>{a._id || "Unassigned"}</td>
              <td>{a.avgRating.toFixed(2)}</td>
              <td>{a.totalFeedback}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
