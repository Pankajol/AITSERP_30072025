"use client";

import { useEffect, useState } from "react";

export default function AdminHelpdeskAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // sample local file path you uploaded earlier — will be transformed to a URL by your environment if needed
  const sampleImageUrl = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setLoading(false);
      return;
    }

    fetch("/api/helpdesk/analytics/overview", {
      headers: { Authorization: "Bearer " + t },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading analytics…</div>;

  if (!data)
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Helpdesk Analytics</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded">No data (make sure you're signed in and have admin role).</div>
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin — Helpdesk Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-900 text-white rounded">
          <div className="text-sm">Total Tickets</div>
          <div className="text-2xl font-semibold">{data.total ?? 0}</div>
        </div>

        <div className="p-4 bg-gray-900 text-white rounded">
          <div className="text-sm">Open</div>
          <div className="text-2xl font-semibold">{data.open ?? 0}</div>
        </div>

        <div className="p-4 bg-gray-900 text-white rounded">
          <div className="text-sm">In Progress</div>
          <div className="text-2xl font-semibold">{data.inProgress ?? 0}</div>
        </div>

        <div className="p-4 bg-gray-900 text-white rounded">
          <div className="text-sm">Closed</div>
          <div className="text-2xl font-semibold">{data.closed ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Average CSAT</div>
          <div className="text-2xl font-semibold">{data.avgCSAT ? Number(data.avgCSAT).toFixed(2) : "N/A"}</div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">Top Categories</div>
          <div className="text-lg text-gray-700">Use analytics endpoints to populate charts</div>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <div className="text-sm text-gray-500">SLA Overview</div>
          <div className="text-lg text-gray-700">Configure SLAs in admin panel. Use /api/helpdesk/sla endpoints.</div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Sample uploaded file (local test)</h3>
        <p className="text-sm text-gray-500 mb-2">
          This image path is the one you uploaded earlier — useful for testing file serving / viewer.
        </p>

        <div className="max-w-md">
          <img src={sampleImageUrl} alt="sample" className="w-full h-auto rounded shadow" />
        </div>
      </div>
    </div>
  );
}
