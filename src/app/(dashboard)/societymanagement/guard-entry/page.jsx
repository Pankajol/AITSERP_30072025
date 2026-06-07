"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiSearch, FiCalendar, FiMapPin } from "react-icons/fi";
import { format } from "date-fns";

export default function GuardEntryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [societyId, setSocietyId] = useState("");
  const [date, setDate] = useState("");
  const [societies, setSocieties] = useState([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (societyId) params.append("societyId", societyId);
      if (date) params.append("date", date);
      const { data } = await axios.get(`/api/societymanagement/guard-entry?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setEntries(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token, societyId, date]);

  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setSocieties(data.data);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { fetchData(); fetchSocieties(); }, [fetchData, fetchSocieties]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Guard Punch Entries</h1>
          <p className="text-sm text-gray-400 mt-0.5">{entries.length} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Society</label>
          <select value={societyId} onChange={e => setSocietyId(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100">
            <option value="">All</option>
            {societies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-12 bg-white rounded-xl shadow-sm animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No punch entries found</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Guard</th>
                  <th className="px-6 py-3 text-left">Checkpoint</th>
                  <th className="px-6 py-3 text-left">IN/OUT</th>
                  <th className="px-6 py-3 text-left">Timestamp</th>
                  <th className="px-6 py-3 text-left">Geofence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(e => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{e.employeeId?.name || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{e.checkpointName}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${e.checkpointType === "IN" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {e.checkpointType}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{format(new Date(e.timestamp), "dd MMM yyyy hh:mm a")}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${e.withinGeofence ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>
                        {e.withinGeofence ? "Inside" : "Outside"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}