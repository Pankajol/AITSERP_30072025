"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from "@/components/hr/PageHeader";

export default function CompanyLeavePage() {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState("");
 

  const [filters, setFilters] = useState({
    status: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  function getLeaveDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;

  const oneDay = 1000 * 60 * 60 * 24;

  const start = new Date(fromDate);
  const end = new Date(toDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.floor((end - start) / oneDay) + 1;
}




  const loadLeaves = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/hr/leaves", {
        headers: { Authorization: "Bearer " + token },
        params: filters,
      });

      setLeaves(res.data?.data || []);
      console.log("Leaves data:", res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load leave records");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Leave Register"
        subtitle="All employee leave records at company level"
      />

      {/* FILTERS */}
      <div className="rounded-2xl border bg-white p-4 grid gap-4 md:grid-cols-4">
        <select
          className="border rounded p-2"
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <input
          type="date"
          className="border rounded p-2"
          value={filters.from}
          onChange={(e) =>
            setFilters({ ...filters, from: e.target.value })
          }
        />

        <input
          type="date"
          className="border rounded p-2"
          value={filters.to}
          onChange={(e) =>
            setFilters({ ...filters, to: e.target.value })
          }
        />

        <button
          onClick={loadLeaves}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4"
        >
          Apply Filters
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Leave Type</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Reason</th>
              </tr>
            </thead>

            <tbody>
              {!loading && leaves.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-6 text-slate-400"
                  >
                    No leave records found.
                  </td>
                </tr>
              )}

              {leaves.map((l) => (
                <tr key={l._id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {l.employeeId?.fullName || "N/A"}
                    <div className="text-xs text-slate-500">
                      {l.employeeCode}
                    </div>
                  </td>

                  <td className="px-4 py-3">{l.leaveType}</td>

                  <td className="px-4 py-3 text-slate-500">
                    {new Date(l.fromDate).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {new Date(l.toDate).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
  {l.days ??
    (l.fromDate && l.toDate
      ? getLeaveDays(l.fromDate, l.toDate)
      : "-")}
</td>


                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        l.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : l.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {l.reason || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
