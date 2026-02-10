"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  positive: "#22c55e",
  neutral: "#facc15",
  negative: "#ef4444",
};

export default function FeedbackAnalytics() {
  const [sentiment, setSentiment] = useState([]);
  const [trend, setTrend] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    async function load() {
      try {
        setLoading(true);

        const [sentRes, trendRes, leaderRes] = await Promise.all([
          axios.get("/api/helpdesk/feedback/charts/sentiment", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("/api/helpdesk/feedback/charts/monthly-avg", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("/api/helpdesk/feedback/charts/top-agents", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        /* ---------- SENTIMENT ---------- */
        const sentData = sentRes.data.data;
        setSentiment(
          Object.keys(sentData).map((k) => ({
            name: k,
            value: sentData[k],
          }))
        );

        /* ---------- TREND ---------- */
        setTrend(
          (trendRes.data.data || []).map((d) => ({
            month: `${d._id.month}/${d._id.year}`,
            avgRating: Number(d.avgRating.toFixed(2)),
          }))
        );

        /* ---------- LEADERBOARD ---------- */
        setLeaderboard(leaderRes.data.data || []);
      } catch (err) {
        console.error("Analytics load failed", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 text-lg">
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">📊 Feedback Analytics</h1>
        <p className="text-sm text-gray-500">
          Customer sentiment, rating trends & agent performance
        </p>
      </div>

      {/* Sentiment + Trend */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Sentiment Pie */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-4">😊 Sentiment Distribution</h3>

          {sentiment.length === 0 ? (
            <p className="text-sm text-gray-500">
              No sentiment data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sentiment}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {sentiment.map((s) => (
                    <Cell
                      key={s.name}
                      fill={COLORS[s.name] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rating Trend */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold mb-4">📈 Avg Rating Trend</h3>

          {trend.length === 0 ? (
            <p className="text-sm text-gray-500">
              No rating trend available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <XAxis dataKey="month" />
                <YAxis domain={[1, 5]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgRating"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="font-semibold">🏆 Top Agents</h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Avg Rating</th>
              <th className="px-4 py-3 text-left">Feedback</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {leaderboard.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No agent feedback available
                </td>
              </tr>
            ) : (
              leaderboard.map((a) => (
                <tr key={a.agentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {a.agentName}
                  </td>
                  <td className="px-4 py-3">
                    ⭐ {a.avgRating}
                  </td>
                  <td className="px-4 py-3">
                    {a.totalFeedback}
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




// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   LineChart,
//   Line,
// } from "recharts";

// const COLORS = ["#22c55e", "#facc15", "#ef4444"];

// export default function FeedbackAnalytics() {
//   const [sentiment, setSentiment] = useState([]);
//   const [trend, setTrend] = useState([]);
//   const [leaderboard, setLeaderboard] = useState([]);

//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     axios
//       .get("/api/helpdesk/feedback/charts/sentiment", {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) =>
//         setSentiment(
//           res.data.data.map((d) => ({
//             name: d._id || "neutral",
//             value: d.count,
//           }))
//         )
//       );

//     axios
//       .get("/api/helpdesk/feedback/charts/rating-trend", {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) =>
//         setTrend(
//           res.data.data.map((d) => ({
//             month: `${d._id.month}/${d._id.year}`,
//             avgRating: Number(d.avgRating.toFixed(2)),
//           }))
//         )
//       );

//     axios
//       .get("/api/helpdesk/feedback/charts/leaderboard")
//       .then((res) => setLeaderboard(res.data.data));
//   }, []);

//   return (
//     <div style={{ padding: 30 }}>
//       <h2>📊 Feedback Analytics</h2>

//       {/* Sentiment Pie */}
//       <h3>😊 Sentiment Distribution</h3>
//       <PieChart width={300} height={250}>
//         <Pie data={sentiment} dataKey="value" nameKey="name" outerRadius={100}>
//           {sentiment.map((_, i) => (
//             <Cell key={i} fill={COLORS[i % COLORS.length]} />
//           ))}
//         </Pie>
//         <Tooltip />
//       </PieChart>

//       {/* Avg Rating Trend */}
//       <h3>📈 Avg Rating Trend</h3>
//       <LineChart width={500} height={250} data={trend}>
//         <XAxis dataKey="month" />
//         <YAxis domain={[1, 5]} />
//         <Tooltip />
//         <Line type="monotone" dataKey="avgRating" />
//       </LineChart>

//       {/* Leaderboard */}
//       <h3>🏆 Agent Leaderboard</h3>
//       <table border="1" cellPadding="10">
//         <thead>
//           <tr>
//             <th>Agent</th>
//             <th>Avg Rating</th>
//             <th>Total Feedback</th>
//           </tr>
//         </thead>
//         <tbody>
//           {leaderboard.map((a) => (
//             <tr key={a._id}>
//               <td>{a._id || "Unassigned"}</td>
//               <td>{a.avgRating.toFixed(2)}</td>
//               <td>{a.totalFeedback}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
