// app/(dashboard)/election/workers/page.js
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";
import { FiPlus, FiEdit2, FiSearch, FiUserCheck, FiX } from "react-icons/fi";

const WORKER_ROLES = [
  { value: "BoothAgent",       label: "Booth Agent",       level: "Booth" },
  { value: "BoothPresident",   label: "Booth President",   level: "Booth" },
  { value: "Canvasser",        label: "Canvasser",         level: "Ward" },
  { value: "WardPresident",    label: "Ward President",    level: "Ward" },
  { value: "BlockPresident",   label: "Block President",   level: "Block" },
  { value: "DistrictPresident",label: "District President",level: "District" },
  { value: "DivisionPresident",label: "Division President",level: "Division" },
  { value: "Coordinator",      label: "Coordinator",       level: "Any" },
  { value: "MediaHandler",     label: "Media Handler",     level: "Any" },
];

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [form, setForm] = useState({
    employeeId: "",          // Employee._id
    companyUserId: "",       // CompanyUser._id (जो API को भेजेंगे)
    workerRole: "",
    level: "",
    constituencyId: "",
    boothIds: [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [constituencies, setConstituencies] = useState([]);
  const [boothsList, setBoothsList] = useState([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── वर्कर्स लिस्ट ───
  const fetchWorkers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/election/worker", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkers(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // ─── कांस्टीट्यूएंसी ───
  const fetchConstituencies = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/election/constituency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setConstituencies(data.data);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    fetchWorkers();
    fetchConstituencies();
  }, [fetchWorkers, fetchConstituencies]);

  // ─── बूथ लोड (कांस्टीट्यूएंसी बदलने पर) ───
  const loadBooths = async (constituencyId) => {
    if (!token || !constituencyId) return setBoothsList([]);
    try {
      const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBoothsList(data.data);
    } catch (e) { console.error(e); }
  };

  // ─── लेवल के हिसाब से फ़ील्ड दिखाएँ ───
  const renderAssignmentFields = () => {
    if (!form.level) return null;

    if (form.level === "Booth") {
      return (
        <>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Constituency</label>
            <select
              value={form.constituencyId}
              onChange={(e) => {
                setForm(prev => ({ ...prev, constituencyId: e.target.value, boothIds: [] }));
                loadBooths(e.target.value);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
            >
              <option value="">Select Constituency</option>
              {constituencies.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Booth(s) (multi-select)</label>
            <select
              multiple
              value={form.boothIds}
              onChange={(e) =>
                setForm(prev => ({
                  ...prev,
                  boothIds: Array.from(e.target.selectedOptions, opt => opt.value)
                }))
              }
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm h-32"
            >
              {boothsList.map(b => (
                <option key={b._id} value={b._id}>{b.boothNumber} - {b.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Hold Ctrl to select multiple</p>
          </div>
        </>
      );
    } else if (["Ward", "Block", "District", "Division", "Any"].includes(form.level)) {
      return (
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Constituency</label>
          <select
            value={form.constituencyId}
            onChange={(e) => setForm(prev => ({ ...prev, constituencyId: e.target.value }))}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
          >
            <option value="">Select Constituency</option>
            {constituencies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      );
    }
    return null;
  };

  // ─── मोडल खोलना / बंद करना ───
  const openAdd = () => {
    setEditingWorker(null);
    setForm({
      employeeId: "",
      companyUserId: "",
      workerRole: "",
      level: "",
      constituencyId: "",
      boothIds: [],
    });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (worker) => {
    setEditingWorker(worker);
    const roleObj = WORKER_ROLES.find(r => r.value === worker.workerRole) || {};
    setForm({
      employeeId: "", // edit mode में employeeId ज़रूरी नहीं
      companyUserId: worker._id, // worker._id पहले से CompanyUser._id है
      workerRole: worker.workerRole || "",
      level: roleObj.level || "",
      constituencyId: worker.assignedConstituency?._id || "",
      boothIds: worker.assignedBooths?.map(b => b._id || b) || [],
    });
    setError("");
    if (worker.assignedConstituency?._id) loadBooths(worker.assignedConstituency._id);
    setModalOpen(true);
  };

  // ─── एम्प्लॉई सिलेक्ट होने पर CompanyUser._id खोजें ───
  const handleEmployeeSelect = async (emp) => {
    setForm(prev => ({ ...prev, employeeId: emp._id }));
    // अब उस Employee से लिंक्ड CompanyUser ढूँढें
    try {
      const { data } = await axios.get(`/api/company/users?employeeId=${emp._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && data.data.length > 0) {
        setForm(prev => ({ ...prev, companyUserId: data.data[0]._id }));
      } else {
        // अगर CompanyUser नहीं है तो बाद में API खुद बना लेगा या हम एरर दिखाएँगे
        setForm(prev => ({ ...prev, companyUserId: "" }));
        setError("This employee doesn't have a user account yet. Please create one first.");
      }
    } catch (e) {
      setForm(prev => ({ ...prev, companyUserId: "" }));
      setError("Failed to verify user account.");
    }
  };

  // ─── सेव ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyUserId || !form.workerRole) {
      return setError("Employee (with a user account) and Role are required.");
    }
    if (form.level === "Booth" && (!form.constituencyId || form.boothIds.length === 0)) {
      return setError("Please select a constituency and at least one booth for Booth level.");
    }
    if (["Ward", "Block", "District", "Division", "Any"].includes(form.level) && !form.constituencyId) {
      return setError("Please select a constituency.");
    }

    setSaving(true);
    setError("");
    try {
      await axios.put(`/api/election/worker/assign`, {
        userId: form.companyUserId,          // यह CompanyUser._id है
        role: form.workerRole,
        constituencyId: form.constituencyId || null,
        boothIds: form.boothIds,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setModalOpen(false);
      fetchWorkers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save worker");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () => workers.filter(w =>
      !search.trim() || w.name?.toLowerCase().includes(search.toLowerCase())
    ),
    [workers, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Election Workers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{workers.length} workers</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          <FiPlus className="text-base" /> Add Worker
        </button>
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
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiUserCheck className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">
            {search ? "No workers match your search" : "No workers yet"}
          </p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Worker" to assign election role</p>}
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

      {/* ─── मोडल ─── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiUserCheck className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingWorker ? "Edit Worker" : "Add Worker"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {editingWorker ? `Editing ${editingWorker.name}` : "Assign election role to employee"}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <FiX className="text-red-500" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* एम्प्लॉई सिलेक्ट (सिर्फ ऐड मोड में) */}
              {!editingWorker && (
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">Select Employee *</label>
                  <EmployeeSearchSelect
                    token={token}
                    onSelect={handleEmployeeSelect}
                  />
                  {/* अगर CompanyUser मिल गया है तो संकेत दिखाएँ */}
                  {form.companyUserId && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">✓ User account found</p>
                  )}
                </div>
              )}

              {/* रोल + लेवल */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Role *</label>
                  <select
                    value={form.workerRole}
                    onChange={(e) => {
                      const selectedRole = WORKER_ROLES.find(r => r.value === e.target.value);
                      setForm(prev => ({
                        ...prev,
                        workerRole: e.target.value,
                        level: selectedRole?.level || "",
                      }));
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
                  >
                    <option value="">Select Role</option>
                    {WORKER_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Level (auto)</label>
                  <input
                    value={form.level}
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500"
                    placeholder="Auto selected"
                  />
                </div>
              </div>

              {/* लेवल के हिसाब से असाइनमेंट */}
              {renderAssignmentFields()}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
                    saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                  }`}>
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiPlus className="text-sm" />
                  )}
                  {editingWorker ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}