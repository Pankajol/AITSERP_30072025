// app/(dashboard)/election/workers/page.js
"use client";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiEdit2, FiSearch, FiUserCheck, FiX } from "react-icons/fi";

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingWorker, setEditingWorker] = useState(null);
  const [form, setForm] = useState({ workerRole: "", assignedConstituency: "" });
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchWorkers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/election/worker", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkers(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkers(); }, [token]);

  const openEdit = (worker) => {
    setEditingWorker(worker);
    setForm({
      workerRole: worker.workerRole || "",
      assignedConstituency: worker.assignedConstituency?._id || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/election/worker/assign`, {
        userId: editingWorker._id,
        role: form.workerRole,
        constituencyId: form.assignedConstituency,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingWorker(null);
      fetchWorkers();
    } catch (e) { alert("Failed to update"); }
  };

  const filtered = useMemo(
    () => workers.filter(w =>
      !search.trim() || w.name?.toLowerCase().includes(search.toLowerCase())
    ),
    [workers, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Election Workers</h1>
      </div>
      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400"
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <div key={w._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{w.name}</h3>
                  <p className="text-sm text-gray-500">{w.workerRole || "No role"}</p>
                </div>
                <button onClick={() => openEdit(w)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
                  <FiEdit2 className="text-xs" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {w.assignedConstituency?.name && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-purple-50 text-purple-600 border border-purple-100">
                    {w.assignedConstituency.name}
                  </span>
                )}
                {w.assignedBooths?.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-cyan-50 text-cyan-600 border border-cyan-100">
                    {w.assignedBooths.length} booths
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Worker Modal */}
      {editingWorker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Edit Worker: {editingWorker.name}</h2>
            </div>
            <form onSubmit={handleUpdate} className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Role</label>
                <select value={form.workerRole} onChange={e => setForm({...form, workerRole: e.target.value})}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm">
                  <option value="">Select...</option>
                  <option value="BoothAgent">Booth Agent</option>
                  <option value="Canvasser">Canvasser</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="MediaHandler">Media Handler</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Constituency ID</label>
                <input value={form.assignedConstituency} onChange={e => setForm({...form, assignedConstituency: e.target.value})}
                  className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm" placeholder="ObjectId"/>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingWorker(null)} className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-bold">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}