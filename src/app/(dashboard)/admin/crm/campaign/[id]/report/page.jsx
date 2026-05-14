"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

// Chart.js
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CampaignReportPage() {
  const { id } = useParams();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!id) return;

    // first fetch
    fetchReport();

    // 🔴 LIVE REFRESH (every 10 sec)
    const interval = setInterval(() => {
      if (live) fetchReport(false);
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, live]);

  async function fetchReport(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.get(`/api/campaign/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLogs(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      if (showLoader) alert("Failed to load report");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  // ✅ Excel / CSV download
  function downloadCSV() {
    const headers = [
      "Email",
      "Opened",
      "Open Count",
      "Attachment Opened",
      "Link Clicked",
      "Last Opened Time",
      "IP",
      "City",
      "Region",
      "Country",
      "User Agent",
    ];

    const rows = logs.map((l) => [
      l.to,
      l.isOpened ? "YES" : "NO",
      l.openCount || 0,
      l.attachmentOpened ? "YES" : "NO",
      l.linkClicked ? "YES" : "NO",
      l.lastOpenedAt ? new Date(l.lastOpenedAt).toLocaleString() : "",
      l.ip || "",
      l.city || "",
      l.region || "",
      l.country || "",
      (l.userAgent || "").replace(/,/g, ";"),
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "campaign-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const total = logs.length;
  const opened = logs.filter((l) => l.isOpened).length;
  const clicked = logs.filter((l) => l.linkClicked).length;
  const attached = logs.filter((l) => l.attachmentOpened).length;

  // ---------- Charts data ----------

  const openChartData = useMemo(
    () => ({
      labels: ["Opened", "Not Opened"],
      datasets: [
        {
          data: [opened, total - opened],
          backgroundColor: ["#22c55e", "#e5e7eb"],
        },
      ],
    }),
    [opened, total]
  );

  const clickChartData = useMemo(
    () => ({
      labels: ["Clicked", "Not Clicked"],
      datasets: [
        {
          data: [clicked, total - clicked],
          backgroundColor: ["#3b82f6", "#e5e7eb"],
        },
      ],
    }),
    [clicked, total]
  );

  const attachChartData = useMemo(
    () => ({
      labels: ["Attachment Opened", "Not Opened"],
      datasets: [
        {
          data: [attached, total - attached],
          backgroundColor: ["#f97316", "#e5e7eb"],
        },
      ],
    }),
    [attached, total]
  );

  // Location summary (top 5 by count)
  const topLocations = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      const key = `${l.city || "Unknown"}, ${l.country || ""}`;
      if (!map.has(key)) map.set(key, 0);
      map.set(key, map.get(key) + 1);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaign Report</h1>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
            />
            Live Auto-Refresh
          </label>

          <button
            onClick={() => fetchReport()}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded"
          >
            Refresh Now
          </button>

          <button
            onClick={downloadCSV}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-500">Total Sent</p>
          <h2 className="text-2xl font-bold">{total}</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-500">Opened</p>
          <h2 className="text-2xl font-bold">{opened}</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-500">Attachments Opened</p>
          <h2 className="text-2xl font-bold">{attached}</h2>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-sm text-gray-500">Link Clicks</p>
          <h2 className="text-2xl font-bold">{clicked}</h2>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-sm font-semibold mb-2">Open Rate</h3>
          {total ? <Pie data={openChartData} /> : <p className="text-xs text-gray-400">No data</p>}
        </div>
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-sm font-semibold mb-2">Click Rate</h3>
          {total ? <Pie data={clickChartData} /> : <p className="text-xs text-gray-400">No data</p>}
        </div>
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-sm font-semibold mb-2">Attachment Opens</h3>
          {total ? <Pie data={attachChartData} /> : <p className="text-xs text-gray-400">No data</p>}
        </div>
      </div>

      {/* Top locations */}
      <div className="bg-white shadow rounded p-4">
        <h3 className="text-sm font-semibold mb-3">Top Locations</h3>
        {topLocations.length ? (
          <ul className="text-sm space-y-1">
            {topLocations.map(([loc, count]) => (
              <li key={loc} className="flex justify-between">
                <span>{loc}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No location data yet</p>
        )}
      </div>

      {/* Detailed table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow rounded overflow-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Opened</th>
                <th className="p-3 text-left">Open Count</th>
                <th className="p-3 text-left">Attachment</th>
                <th className="p-3 text-left">CTA Click</th>
                <th className="p-3 text-left">Last Opened</th>
                <th className="p-3 text-left">IP</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Device / Browser</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l._id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{l.to}</td>
                  <td className="p-3">{l.isOpened ? "✅ Yes" : "❌ No"}</td>
                  <td className="p-3">{l.openCount || 0}</td>
                  <td className="p-3">
                    {l.attachmentOpened ? "✅ Yes" : "❌ No"}
                  </td>
                  <td className="p-3">
                    {l.linkClicked ? "✅ Yes" : "❌ No"}
                  </td>
                  <td className="p-3">
                    {l.lastOpenedAt
                      ? new Date(l.lastOpenedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-3">{l.ip || "—"}</td>
                  <td className="p-3">
                    {(l.city || "Unknown") +
                      (l.country ? `, ${l.country}` : "")}
                  </td>
                  <td className="p-3 max-w-xs break-words">
                    {l.userAgent || "—"}
                  </td>
                </tr>
              ))}

              {!logs.length && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    No tracking data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
