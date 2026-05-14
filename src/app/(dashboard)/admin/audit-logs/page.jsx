"use client";
import { useEffect, useState } from "react";
import { Search, Filter, Calendar } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entityType: "", action: "", fromDate: "", toDate: "" });
  const token = () => localStorage.getItem("token") || "";

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.entityType) params.append("entityType", filters.entityType);
    if (filters.action) params.append("action", filters.action);
    if (filters.fromDate) params.append("fromDate", filters.fromDate);
    if (filters.toDate) params.append("toDate", filters.toDate);
    const res = await fetch(`/api/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setLogs(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [filters]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div><label className="block text-xs text-gray-500">Entity Type</label><select value={filters.entityType} onChange={e=>setFilters({...filters, entityType:e.target.value})} className="border rounded p-2"><option value="">All</option><option>SalesInvoice</option><option>PurchaseInvoice</option><option>Customer</option><option>Supplier</option><option>AccountHead</option></select></div>
          <div><label className="block text-xs text-gray-500">Action</label><select value={filters.action} onChange={e=>setFilters({...filters, action:e.target.value})} className="border rounded p-2"><option value="">All</option><option>CREATE</option><option>UPDATE</option><option>DELETE</option></select></div>
          <div><label className="block text-xs text-gray-500">From Date</label><input type="date" value={filters.fromDate} onChange={e=>setFilters({...filters, fromDate:e.target.value})} className="border rounded p-2" /></div>
          <div><label className="block text-xs text-gray-500">To Date</label><input type="date" value={filters.toDate} onChange={e=>setFilters({...filters, toDate:e.target.value})} className="border rounded p-2" /></div>
          <button onClick={fetchLogs} className="bg-indigo-600 text-white px-4 py-2 rounded">Search</button>
        </div>
        {loading ? <div className="animate-pulse space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-200 rounded"></div>)}</div> : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Time</th><th>User</th><th>Action</th><th>Entity</th><th>Changes</th></tr></thead>
              <tbody>
                {logs.map(log=>(
                  <tr key={log._id} className="border-t"><td className="px-4 py-3">{new Date(log.timestamp).toLocaleString()}</td><td>{log.userName}</td><td><span className={`px-2 py-0.5 rounded text-xs ${log.action==='CREATE'?'bg-green-100 text-green-700':log.action==='UPDATE'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>{log.action}</span></td><td>{log.entityType}</td><td className="max-w-md truncate">{log.changes}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}