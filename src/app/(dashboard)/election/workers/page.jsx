// app/(dashboard)/election/workers/page.js
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUserCheck, FiX, FiLoader,
  FiShield, FiChevronRight, FiChevronDown
} from "react-icons/fi";

// All election modules (must match keys used in backend)
const ELECTION_MODULES = [
  "Election Dashboard",
  "Voters",
  "Booths",
  "Constituencies",
  "Election Expenses",
  "Election Analytics",
  "Election Campaign",
  "Election Surveys",
  "Election Reports",
  "Election Communication",
  "Parties / Candidates",
  "Workers",
  "Election GIS",
];

// Available permissions
const PERMISSIONS = ["create", "view", "edit", "delete", "print", "approve", "reject", "import", "export", "upload", "download", "email", "copy", "whatsapp"];
const PERM_ICONS = {
  create: "➕", view: "👁", edit: "✏️", delete: "🗑️", print: "🖨️", approve: "✅", reject: "❌",
  import: "📥", export: "📤", upload: "☁️⬆️", download: "☁️⬇️", email: "📧", copy: "📋", whatsapp: "💬"
};

// Worker roles (same as before)
const WORKER_ROLES = {
  "Booth Level": [
    { value: "BoothAgent", label: "Booth Agent" },
    { value: "BoothPresident", label: "Booth President" },
    { value: "BoothWorker", label: "Booth Worker" },
  ],
  "Ward / Village Level": [
    { value: "WardPresident", label: "Ward President" },
    { value: "WardCoordinator", label: "Ward Coordinator" },
    { value: "Canvasser", label: "Canvasser" },
  ],
  "Block / Taluka Level": [
    { value: "BlockPresident", label: "Block President" },
    { value: "BlockIncharge", label: "Block Incharge" },
  ],
  "District Level": [
    { value: "DistrictPresident", label: "District President" },
    { value: "DistrictCoordinator", label: "District Coordinator" },
    { value: "DistrictSpokesperson", label: "District Spokesperson" },
  ],
  "State Level": [
    { value: "StatePresident", label: "State President" },
    { value: "StateSecretary", label: "State Secretary" },
    { value: "StateSpokesperson", label: "State Spokesperson" },
    { value: "StateCoordinator", label: "State Coordinator" },
  ],
  "National Level": [
    { value: "NationalPresident", label: "National President" },
    { value: "NationalSecretary", label: "National Secretary" },
    { value: "NationalSpokesperson", label: "National Spokesperson" },
    { value: "CentralCommitteeMember", label: "Central Committee Member" },
  ],
};

const LEVEL_ASSIGNMENT = {
  "Booth Level": { needsConstituency: true, needsBooths: true, needsWard: false, needsBlock: false, needsDistrict: false, needsState: false },
  "Ward / Village Level": { needsConstituency: true, needsBooths: false, needsWard: true, needsBlock: false, needsDistrict: false, needsState: false },
  "Block / Taluka Level": { needsConstituency: true, needsBooths: false, needsWard: false, needsBlock: true, needsDistrict: false, needsState: false },
  "District Level": { needsConstituency: true, needsBooths: false, needsWard: false, needsBlock: false, needsDistrict: true, needsState: false },
  "State Level": { needsState: true, needsConstituency: false },
  "National Level": { needsNational: true },
};

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [activeTab, setActiveTab] = useState("info"); // "info" or "permissions"
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    levelGroup: "",
    constituencyId: "",
    boothIds: [],
    ward: "",
    block: "",
    district: "",
    state: "",
  });
  // Permissions state: object like { moduleName: { selected: true, permissions: { create: true, view: true, ... } } }
  const [modulesConfig, setModulesConfig] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [constituencies, setConstituencies] = useState([]);
  const [boothsList, setBoothsList] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ──────────────────────────────────────────────
  // Data fetching
  // ──────────────────────────────────────────────
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

  const loadBooths = async (constituencyId) => {
    if (!token || !constituencyId) return setBoothsList([]);
    try {
      const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBoothsList(data.data);
    } catch (e) { console.error(e); }
  };

  // ──────────────────────────────────────────────
  // Role & Form Handlers
  // ──────────────────────────────────────────────
  const handleRoleSelect = (roleValue) => {
    let foundLevel = null;
    for (const [levelGroup, roles] of Object.entries(WORKER_ROLES)) {
      if (roles.some(r => r.value === roleValue)) {
        foundLevel = levelGroup;
        break;
      }
    }
    setForm(prev => ({ ...prev, role: roleValue, levelGroup: foundLevel || "" }));
  };

  const renderAssignmentFields = () => {
    const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
    if (!cfg) return null;
    return (
      <div className="space-y-4">
        {cfg.needsConstituency && (
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
        )}
        {cfg.needsBooths && (
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
        )}
        {cfg.needsWard && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Ward / Village</label>
            <input
              type="text"
              value={form.ward}
              onChange={(e) => setForm(prev => ({ ...prev, ward: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., Ward No. 12, Village Name"
            />
          </div>
        )}
        {cfg.needsBlock && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Block / Taluka</label>
            <input
              type="text"
              value={form.block}
              onChange={(e) => setForm(prev => ({ ...prev, block: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., Block Name"
            />
          </div>
        )}
        {cfg.needsDistrict && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">District</label>
            <input
              type="text"
              value={form.district}
              onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., District Name"
            />
          </div>
        )}
        {cfg.needsState && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., Uttar Pradesh"
            />
          </div>
        )}
        {cfg.needsNational && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">National Role</label>
            <input
              type="text"
              value="India (All States)"
              disabled
              className="w-full py-2.5 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500"
            />
          </div>
        )}
      </div>
    );
  };

  const openAdd = () => {
    setEditingWorker(null);
    setActiveTab("info");
    setForm({
      name: "",
      phone: "",
      email: "",
      role: "",
      levelGroup: "",
      constituencyId: "",
      boothIds: [],
      ward: "",
      block: "",
      district: "",
      state: "",
    });
    // Default permissions – all modules unselected
    const defaultModules = {};
    ELECTION_MODULES.forEach(mod => {
      defaultModules[mod] = { selected: false, permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false])) };
    });
    setModulesConfig(defaultModules);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (worker) => {
    let derivedLevelGroup = "";
    for (const [levelGroup, roles] of Object.entries(WORKER_ROLES)) {
      if (roles.some(r => r.value === worker.workerRole)) {
        derivedLevelGroup = levelGroup;
        break;
      }
    }
    setEditingWorker(worker);
    setActiveTab("info");
    setForm({
      name: worker.name,
      phone: worker.phone,
      email: worker.email || "",
      role: worker.workerRole,
      levelGroup: derivedLevelGroup,
      constituencyId: worker.assignedConstituency?._id || "",
      boothIds: worker.assignedBooths?.map(b => b._id) || [],
      ward: worker.ward || "",
      block: worker.block || "",
      district: worker.district || "",
      state: worker.state || "",
    });
    // Load existing modules from worker
    const existingModules = worker.modules || {};
    const mergedModules = {};
    ELECTION_MODULES.forEach(mod => {
      const existing = existingModules[mod];
      mergedModules[mod] = {
        selected: existing?.selected || false,
        permissions: {
          ...Object.fromEntries(PERMISSIONS.map(p => [p, false])),
          ...(existing?.permissions || {})
        }
      };
    });
    setModulesConfig(mergedModules);
    if (worker.assignedConstituency?._id) loadBooths(worker.assignedConstituency._id);
    setError("");
    setModalOpen(true);
  };

  // ──────────────────────────────────────────────
  // Permission toggles
  // ──────────────────────────────────────────────
  const toggleModule = (moduleName) => {
    setModulesConfig(prev => ({
      ...prev,
      [moduleName]: {
        selected: !prev[moduleName]?.selected,
        permissions: prev[moduleName]?.permissions || Object.fromEntries(PERMISSIONS.map(p => [p, false]))
      }
    }));
  };

  const togglePermission = (moduleName, perm) => {
    setModulesConfig(prev => ({
      ...prev,
      [moduleName]: {
        selected: true, // auto‑select module when toggling any permission
        permissions: {
          ...(prev[moduleName]?.permissions || Object.fromEntries(PERMISSIONS.map(p => [p, false]))),
          [perm]: !(prev[moduleName]?.permissions?.[perm] || false)
        }
      }
    }));
  };

  const setAllPermissions = (moduleName, value) => {
    const newPerms = Object.fromEntries(PERMISSIONS.map(p => [p, value]));
    setModulesConfig(prev => ({
      ...prev,
      [moduleName]: {
        selected: value,
        permissions: newPerms
      }
    }));
  };

  // ──────────────────────────────────────────────
  // Submit handler (sends modules data)
  // ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.role) {
      return setError("Name, Phone and Role are required.");
    }
    const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
    if (cfg?.needsConstituency && !form.constituencyId) return setError("Please select a constituency.");
    if (cfg?.needsBooths && form.boothIds.length === 0) return setError("Please select at least one booth.");

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
        constituencyId: form.constituencyId || null,
        boothIds: form.boothIds,
        ward: form.ward,
        block: form.block,
        district: form.district,
        state: form.state,
        modules: modulesConfig,  // send the permissions
      };
      if (editingWorker) {
        await axios.put(`/api/election/worker?id=${editingWorker._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/worker", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setModalOpen(false);
      fetchWorkers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save worker");
    } finally {
      setSaving(false);
    }
  };

  const deleteWorker = async (id) => {
    if (!confirm("Delete this worker?")) return;
    try {
      await axios.delete(`/api/election/worker?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWorkers();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = useMemo(() =>
    workers.filter(w => !search.trim() || w.name?.toLowerCase().includes(search.toLowerCase())),
    [workers, search]
  );

  // ──────────────────────────────────────────────
  // Render Permission Tab Content
  // ──────────────────────────────────────────────
  const renderPermissionsTab = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      {ELECTION_MODULES.map(module => {
        const config = modulesConfig[module] || { selected: false, permissions: {} };
        const isExpanded = expandedModules[module];
        const selectedCount = Object.values(config.permissions || {}).filter(Boolean).length;
        return (
          <div key={module} className="bg-gray-50 rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedModules(prev => ({ ...prev, [module]: !prev[module] }))}>
              <div className="flex items-center gap-3">
                <button className="text-gray-500">{isExpanded ? <FiChevronDown /> : <FiChevronRight />}</button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.selected}
                    onChange={() => toggleModule(module)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium text-gray-800">{module}</span>
                </label>
              </div>
              {selectedCount > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{selectedCount} permissions</span>
              )}
            </div>
            {isExpanded && config.selected && (
              <div className="p-3 border-t bg-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-gray-400">Permissions</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAllPermissions(module, true)} className="text-xs text-green-600 hover:underline">All</button>
                    <button onClick={() => setAllPermissions(module, false)} className="text-xs text-red-500 hover:underline">None</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {PERMISSIONS.map(perm => (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => togglePermission(module, perm)}
                      className={`flex flex-col items-center p-1.5 rounded-lg border text-xs transition-all ${
                        config.permissions?.[perm] ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <span className="text-base">{PERM_ICONS[perm]}</span>
                      <span className="capitalize mt-0.5 text-[10px]">{perm}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ──────────────────────────────────────────────
  // Main Render
  // ──────────────────────────────────────────────
  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Party Workers</h1>
          <p className="text-sm text-gray-400">{workers.length} workers</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
          <FiPlus /> Add Worker
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400"
          placeholder="Search workers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
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
            <div key={w._id} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md group">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{w.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{w.workerRole}</p>
                  <p className="text-xs text-gray-400">{w.phone}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(w)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => deleteWorker(w._id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                {w.assignedConstituency?.name && <span className="bg-purple-50 px-2 py-0.5 rounded-full">{w.assignedConstituency.name}</span>}
                {w.assignedBooths?.length > 0 && <span className="bg-cyan-50 px-2 py-0.5 rounded-full">{w.assignedBooths.length} booths</span>}
                {w.ward && <span className="bg-gray-100 px-2 py-0.5 rounded-full">Ward: {w.ward}</span>}
                {w.block && <span className="bg-gray-100 px-2 py-0.5 rounded-full">Block: {w.block}</span>}
                {w.district && <span className="bg-gray-100 px-2 py-0.5 rounded-full">District: {w.district}</span>}
                {w.state && <span className="bg-gray-100 px-2 py-0.5 rounded-full">State: {w.state}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">{editingWorker ? "Edit Worker" : "Add Worker"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <FiX size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-4">
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "info" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("info")}
              >
                Basic Info
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === "permissions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("permissions")}
              >
                <FiShield /> Permissions
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 p-3 text-red-600 text-sm rounded-xl">{error}</div>}

                {activeTab === "info" && (
                  <>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Full Name *</label>
                      <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border rounded-xl" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Phone *</label>
                      <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border rounded-xl" required />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Email (optional)</label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500">Role *</label>
                      <select value={form.role} onChange={e => handleRoleSelect(e.target.value)} className="w-full p-2.5 border rounded-xl">
                        <option value="">Select Role</option>
                        {Object.entries(WORKER_ROLES).map(([level, roles]) => (
                          <optgroup key={level} label={level}>
                            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    {form.levelGroup && renderAssignmentFields()}
                  </>
                )}

                {activeTab === "permissions" && renderPermissionsTab()}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <span className="flex items-center gap-1"><FiLoader className="animate-spin" /> Saving...</span> : (editingWorker ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






// // app/(dashboard)/election/workers/page.js
// "use client";
// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import {
//   FiPlus, FiEdit2, FiTrash2, FiSearch, FiUserCheck, FiX, FiLoader
// } from "react-icons/fi";

// // भारतीय राजनीति के अनुसार रोल्स और लेवल
// const WORKER_ROLES = {
//   "Booth Level": [
//     { value: "BoothAgent", label: "Booth Agent" },
//     { value: "BoothPresident", label: "Booth President" },
//     { value: "BoothWorker", label: "Booth Worker" },
//   ],
//   "Ward / Village Level": [
//     { value: "WardPresident", label: "Ward President" },
//     { value: "WardCoordinator", label: "Ward Coordinator" },
//     { value: "Canvasser", label: "Canvasser" },
//   ],
//   "Block / Taluka Level": [
//     { value: "BlockPresident", label: "Block President" },
//     { value: "BlockIncharge", label: "Block Incharge" },
//   ],
//   "District Level": [
//     { value: "DistrictPresident", label: "District President" },
//     { value: "DistrictCoordinator", label: "District Coordinator" },
//     { value: "DistrictSpokesperson", label: "District Spokesperson" },
//   ],
//   "State Level": [
//     { value: "StatePresident", label: "State President" },
//     { value: "StateSecretary", label: "State Secretary" },
//     { value: "StateSpokesperson", label: "State Spokesperson" },
//     { value: "StateCoordinator", label: "State Coordinator" },
//   ],
//   "National Level": [
//     { value: "NationalPresident", label: "National President" },
//     { value: "NationalSecretary", label: "National Secretary" },
//     { value: "NationalSpokesperson", label: "National Spokesperson" },
//     { value: "CentralCommitteeMember", label: "Central Committee Member" },
//   ],
// };

// // लेवल के हिसाब से Assignment Type
// const LEVEL_ASSIGNMENT = {
//   "Booth Level": { needsConstituency: true, needsBooths: true, needsWard: false, needsBlock: false, needsDistrict: false, needsState: false },
//   "Ward / Village Level": { needsConstituency: true, needsBooths: false, needsWard: true, needsBlock: false, needsDistrict: false, needsState: false },
//   "Block / Taluka Level": { needsConstituency: true, needsBooths: false, needsWard: false, needsBlock: true, needsDistrict: false, needsState: false },
//   "District Level": { needsConstituency: true, needsBooths: false, needsWard: false, needsBlock: false, needsDistrict: true, needsState: false },
//   "State Level": { needsState: true, needsConstituency: false },
//   "National Level": { needsNational: true },
// };

// export default function WorkersPage() {
//   const [workers, setWorkers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [search, setSearch] = useState("");
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editingWorker, setEditingWorker] = useState(null);
//   const [form, setForm] = useState({
//     name: "",
//     phone: "",
//     email: "",
//     role: "",
//     levelGroup: "",
//     constituencyId: "",
//     boothIds: [],
//     ward: "",
//     block: "",
//   });
//   const [error, setError] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [constituencies, setConstituencies] = useState([]);
//   const [boothsList, setBoothsList] = useState([]);
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ─── वर्कर्स लिस्ट ───
//   const fetchWorkers = useCallback(async () => {
//     if (!token) return;
//     setLoading(true);
//     try {
//       const { data } = await axios.get("/api/election/worker", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setWorkers(data.success ? data.data : []);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   }, [token]);

//   const fetchConstituencies = useCallback(async () => {
//     if (!token) return;
//     try {
//       const { data } = await axios.get("/api/election/constituency", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) setConstituencies(data.data);
//     } catch (e) { console.error(e); }
//   }, [token]);

//   useEffect(() => {
//     fetchWorkers();
//     fetchConstituencies();
//   }, [fetchWorkers, fetchConstituencies]);

//   const loadBooths = async (constituencyId) => {
//     if (!token || !constituencyId) return setBoothsList([]);
//     try {
//       const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) setBoothsList(data.data);
//     } catch (e) { console.error(e); }
//   };

//   // ─── रोल सिलेक्ट होने पर लेवल ग्रुप सेट ───
//   const handleRoleSelect = (roleValue) => {
//     let foundLevel = null;
//     for (const [levelGroup, roles] of Object.entries(WORKER_ROLES)) {
//       if (roles.some(r => r.value === roleValue)) {
//         foundLevel = levelGroup;
//         break;
//       }
//     }
//     setForm(prev => ({ ...prev, role: roleValue, levelGroup: foundLevel || "" }));
//   };

//   // ─── असाइनमेंट फ़ील्ड्स ───
//   const renderAssignmentFields = () => {
//     const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
//     if (!cfg) return null;

//     return (
//       <div className="space-y-4">
//         {cfg.needsConstituency && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">Constituency</label>
//             <select
//               value={form.constituencyId}
//               onChange={(e) => {
//                 setForm(prev => ({ ...prev, constituencyId: e.target.value, boothIds: [] }));
//                 loadBooths(e.target.value);
//               }}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//             >
//               <option value="">Select Constituency</option>
//               {constituencies.map(c => (
//                 <option key={c._id} value={c._id}>{c.name}</option>
//               ))}
//             </select>
//           </div>
//         )}
//         {cfg.needsBooths && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">Booth(s) (multi-select)</label>
//             <select
//               multiple
//               value={form.boothIds}
//               onChange={(e) =>
//                 setForm(prev => ({
//                   ...prev,
//                   boothIds: Array.from(e.target.selectedOptions, opt => opt.value)
//                 }))
//               }
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm h-32"
//             >
//               {boothsList.map(b => (
//                 <option key={b._id} value={b._id}>{b.boothNumber} - {b.name}</option>
//               ))}
//             </select>
//             <p className="text-xs text-gray-400 mt-1">Hold Ctrl to select multiple</p>
//           </div>
//         )}
//         {cfg.needsWard && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">Ward / Village</label>
//             <input
//               type="text"
//               value={form.ward}
//               onChange={(e) => setForm(prev => ({ ...prev, ward: e.target.value }))}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//               placeholder="e.g., Ward No. 12, Village Name"
//             />
//           </div>
//         )}
//         {cfg.needsBlock && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">Block / Taluka</label>
//             <input
//               type="text"
//               value={form.block}
//               onChange={(e) => setForm(prev => ({ ...prev, block: e.target.value }))}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//               placeholder="e.g., Block Name"
//             />
//           </div>
//         )}
//         {cfg.needsDistrict && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">District</label>
//             <input
//               type="text"
//               value={form.district}
//               onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//               placeholder="e.g., District Name"
//             />
//           </div>
//         )}
//         {cfg.needsState && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">State</label>
//             <input
//               type="text"
//               value={form.state}
//               onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//               placeholder="e.g., Uttar Pradesh"
//             />
//           </div>
//         )}
//         {cfg.needsNational && (
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">National Role</label>
//             <input
//               type="text"
//               value="India (All States)"
//               disabled
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500"
//             />
//           </div>
//         )}
//       </div>
//     );
//   };

//   const openAdd = () => {
//     setEditingWorker(null);
//     setForm({ name: "", phone: "", email: "", role: "", levelGroup: "", constituencyId: "", boothIds: [], ward: "", block: "", district: "", state: "" });
//     setError("");
//     setModalOpen(true);
//   };

//   const openEdit = (worker) => {
//     setEditingWorker(worker);
//     setForm({
//       name: worker.name,
//       phone: worker.phone,
//       email: worker.email,
//       role: worker.role,
//       levelGroup: worker.levelGroup,
//       constituencyId: worker.assignedConstituency?._id || "",
//       boothIds: worker.assignedBooths?.map(b => b._id) || [],
//       ward: worker.ward || "",
//       block: worker.block || "",
//       district: worker.district || "",
//       state: worker.state || "",
//     });
//     if (worker.assignedConstituency?._id) loadBooths(worker.assignedConstituency._id);
//     setError("");
//     setModalOpen(true);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.name || !form.phone || !form.role) {
//       return setError("Name, Phone and Role are required.");
//     }
//     const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
//     if (cfg?.needsConstituency && !form.constituencyId) return setError("Please select a constituency.");
//     if (cfg?.needsBooths && form.boothIds.length === 0) return setError("Please select at least one booth.");

//     setSaving(true);
//     try {
//       const payload = { ...form, levelGroup: form.levelGroup };
//       if (editingWorker) {
//         await axios.put(`/api/election/worker?id=${editingWorker._id}`, payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         await axios.post("/api/election/worker", payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }
//       setModalOpen(false);
//       fetchWorkers();
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to save worker");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deleteWorker = async (id) => {
//     if (!confirm("Delete this worker?")) return;
//     await axios.delete(`/api/election/worker/${id}`, { headers: { Authorization: `Bearer ${token}` } });
//     fetchWorkers();
//   };

//   const filtered = useMemo(() =>
//     workers.filter(w => !search.trim() || w.name?.toLowerCase().includes(search.toLowerCase())),
//     [workers, search]
//   );

//   return (
//     <div className="max-w-screen-xl mx-auto">
//       {/* Header */}
//       <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-extrabold text-gray-900">Party Workers</h1>
//           <p className="text-sm text-gray-400">{workers.length} workers</p>
//         </div>
//         <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
//           <FiPlus /> Add Worker
//         </button>
//       </div>

//       {/* Search */}
//       <div className="relative mb-5 max-w-sm">
//         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
//         <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm" placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} />
//       </div>

//       {/* Worker Cards */}
//       {loading ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">Loading...</div>
//       ) : filtered.length === 0 ? (
//         <div className="text-center py-20">No workers yet</div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {filtered.map(w => (
//             <div key={w._id} className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md group">
//               <div className="flex justify-between">
//                 <div>
//                   <h3 className="font-bold text-gray-900">{w.name}</h3>
//                   <p className="text-sm text-gray-500">{w.role}</p>
//                   <p className="text-xs text-gray-400">{w.phone}</p>
//                 </div>
//                 <div className="flex gap-1">
//                   <button onClick={() => openEdit(w)} className="p-1 text-indigo-600"><FiEdit2 /></button>
//                   <button onClick={() => deleteWorker(w._id)} className="p-1 text-red-500"><FiTrash2 /></button>
//                 </div>
//               </div>
//               <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
//                 {w.assignedConstituency?.name && <span className="bg-purple-50 px-2 py-0.5 rounded-full">{w.assignedConstituency.name}</span>}
//                 {w.assignedBooths?.length > 0 && <span className="bg-cyan-50 px-2 py-0.5 rounded-full">{w.assignedBooths.length} booths</span>}
//                 {w.levelGroup && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{w.levelGroup}</span>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Add/Edit Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between p-4 border-b">
//               <h2 className="text-lg font-bold">{editingWorker ? "Edit Worker" : "Add Worker"}</h2>
//               <button onClick={() => setModalOpen(false)}><FiX /></button>
//             </div>
//             <form onSubmit={handleSubmit} className="p-5 space-y-4">
//               {error && <div className="bg-red-50 p-3 text-red-600 text-sm rounded-xl">{error}</div>}
//               <div>
//                 <label className="text-xs font-bold uppercase">Full Name *</label>
//                 <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border rounded-xl" required />
//               </div>
//               <div>
//                 <label className="text-xs font-bold uppercase">Phone *</label>
//                 <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2.5 border rounded-xl" required />
//               </div>
//               <div>
//                 <label className="text-xs font-bold uppercase">Email (optional)</label>
//                 <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2.5 border rounded-xl" />
//               </div>
//               <div>
//                 <label className="text-xs font-bold uppercase">Role *</label>
//                 <select value={form.role} onChange={e => handleRoleSelect(e.target.value)} className="w-full p-2.5 border rounded-xl">
//                   <option value="">Select Role</option>
//                   {Object.entries(WORKER_ROLES).map(([level, roles]) => (
//                     <optgroup key={level} label={level}>
//                       {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
//                     </optgroup>
//                   ))}
//                 </select>
//               </div>
//               {form.levelGroup && renderAssignmentFields()}
//               <div className="flex justify-end gap-3 pt-2">
//                 <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
//                 <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl">{saving ? "Saving..." : (editingWorker ? "Update" : "Create")}</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




// // app/(dashboard)/election/workers/page.js
// "use client";
// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";
// import {
//   FiPlus, FiEdit2, FiSearch, FiUserCheck, FiX, FiLoader
// } from "react-icons/fi";

// const WORKER_ROLES = [
//   { value: "BoothAgent",        label: "Booth Agent",        level: "Booth" },
//   { value: "BoothPresident",    label: "Booth President",    level: "Booth" },
//   { value: "Canvasser",         label: "Canvasser",          level: "Ward" },
//   { value: "WardPresident",     label: "Ward President",     level: "Ward" },
//   { value: "BlockPresident",    label: "Block President",    level: "Block" },
//   { value: "DistrictPresident", label: "District President", level: "District" },
//   { value: "DivisionPresident", label: "Division President", level: "Division" },
//   { value: "Coordinator",       label: "Coordinator",        level: "Any" },
//   { value: "MediaHandler",      label: "Media Handler",      level: "Any" },
// ];

// export default function WorkersPage() {
//   const [workers, setWorkers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [search, setSearch] = useState("");
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editingWorker, setEditingWorker] = useState(null);
//   const [form, setForm] = useState({
//     employeeId: "",          // Employee._id
//     companyUserId: "",       // CompanyUser._id (जो API को भेजेंगे)
//     workerRole: "",
//     level: "",
//     constituencyId: "",
//     boothIds: [],
//   });
//   const [error, setError] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [checkingUser, setCheckingUser] = useState(false);
//   const [constituencies, setConstituencies] = useState([]);
//   const [boothsList, setBoothsList] = useState([]);
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ─── वर्कर्स लिस्ट ───
//   const fetchWorkers = useCallback(async () => {
//     if (!token) return;
//     setLoading(true);
//     try {
//       const { data } = await axios.get("/api/election/worker", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setWorkers(data.success ? data.data : []);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   }, [token]);

//   // ─── कांस्टीट्यूएंसी ───
//   const fetchConstituencies = useCallback(async () => {
//     if (!token) return;
//     try {
//       const { data } = await axios.get("/api/election/constituency", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) setConstituencies(data.data);
//     } catch (e) { console.error(e); }
//   }, [token]);

//   useEffect(() => {
//     fetchWorkers();
//     fetchConstituencies();
//   }, [fetchWorkers, fetchConstituencies]);

//   // ─── बूथ लोड (कांस्टीट्यूएंसी बदलने पर) ───
//   const loadBooths = async (constituencyId) => {
//     if (!token || !constituencyId) return setBoothsList([]);
//     try {
//       const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) setBoothsList(data.data);
//     } catch (e) { console.error(e); }
//   };

//   // ─── लेवल के हिसाब से फ़ील्ड दिखाएँ ───
//   const renderAssignmentFields = () => {
//     if (!form.level) return null;

//     if (form.level === "Booth") {
//       return (
//         <>
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">
//               Constituency
//             </label>
//             <select
//               value={form.constituencyId}
//               onChange={(e) => {
//                 setForm(prev => ({ ...prev, constituencyId: e.target.value, boothIds: [] }));
//                 loadBooths(e.target.value);
//               }}
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//             >
//               <option value="">Select Constituency</option>
//               {constituencies.map(c => (
//                 <option key={c._id} value={c._id}>{c.name}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="text-xs font-bold uppercase text-gray-500">
//               Booth(s) (multi-select)
//             </label>
//             <select
//               multiple
//               value={form.boothIds}
//               onChange={(e) =>
//                 setForm(prev => ({
//                   ...prev,
//                   boothIds: Array.from(e.target.selectedOptions, opt => opt.value)
//                 }))
//               }
//               className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm h-32"
//             >
//               {boothsList.map(b => (
//                 <option key={b._id} value={b._id}>{b.boothNumber} - {b.name}</option>
//               ))}
//             </select>
//             <p className="text-xs text-gray-400 mt-1">Hold Ctrl to select multiple</p>
//           </div>
//         </>
//       );
//     } else if (["Ward", "Block", "District", "Division", "Any"].includes(form.level)) {
//       return (
//         <div>
//           <label className="text-xs font-bold uppercase text-gray-500">Constituency</label>
//           <select
//             value={form.constituencyId}
//             onChange={(e) => setForm(prev => ({ ...prev, constituencyId: e.target.value }))}
//             className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//           >
//             <option value="">Select Constituency</option>
//             {constituencies.map(c => (
//               <option key={c._id} value={c._id}>{c.name}</option>
//             ))}
//           </select>
//         </div>
//       );
//     }
//     return null;
//   };

//   // ─── मोडल खोलना / बंद करना ───
//   const openAdd = () => {
//     setEditingWorker(null);
//     setForm({
//       employeeId: "",
//       companyUserId: "",
//       workerRole: "",
//       level: "",
//       constituencyId: "",
//       boothIds: [],
//     });
//     setError("");
//     setModalOpen(true);
//   };

//   const openEdit = (worker) => {
//     setEditingWorker(worker);
//     const roleObj = WORKER_ROLES.find(r => r.value === worker.workerRole) || {};
//     setForm({
//       employeeId: "", // edit mode में ज़रूरी नहीं
//       companyUserId: worker._id, // worker._id पहले से CompanyUser._id है
//       workerRole: worker.workerRole || "",
//       level: roleObj.level || "",
//       constituencyId: worker.assignedConstituency?._id || "",
//       boothIds: worker.assignedBooths?.map(b => b._id || b) || [],
//     });
//     setError("");
//     if (worker.assignedConstituency?._id) loadBooths(worker.assignedConstituency._id);
//     setModalOpen(true);
//   };

//   // ─── एम्प्लॉई सिलेक्ट होने पर CompanyUser._id खोजें / बनाएँ (with retry) ───
//   const handleEmployeeSelect = async (emp) => {
//     setForm(prev => ({ ...prev, employeeId: emp._id }));
//     setError("");
//     setCheckingUser(true);

//     try {
//       // 1. पहले employeeId से CompanyUser ढूँढें
//       const { data } = await axios.get(`/api/company/users?employeeId=${emp._id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (Array.isArray(data) && data.length > 0) {
//         setForm(prev => ({ ...prev, companyUserId: data[0]._id }));
//         setCheckingUser(false);
//         return;
//       }

//       // 2. नया CompanyUser बनाने की कोशिश करें
//       if (!emp.email || !emp.email.trim()) {
//         setError("This employee does not have an email address. Please add email in Employee record first.");
//         setForm(prev => ({ ...prev, companyUserId: "" }));
//         setCheckingUser(false);
//         return;
//       }

//       const userForm = {
//         employeeId: emp._id,
//         name: emp.fullName || emp.name || "New Worker",
//         email: emp.email.trim(),
//         password: "Worker@123",
//         roles: ["Employee"],
//         modules: {},
//       };

//       try {
//         const createRes = await axios.post("/api/company/users", userForm, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (createRes.data && createRes.data.id) {
//           setForm(prev => ({ ...prev, companyUserId: createRes.data.id }));
//           setError("");
//           setCheckingUser(false);
//           return;
//         }

//         // क्रिएट फ़ेल – मैसेज चेक करें
//         const msg = (createRes.data?.message || "").toLowerCase();
//         if (msg.includes("email") && (msg.includes("already") || msg.includes("exists"))) {
//           await handleDuplicateEmail(emp);
//         } else {
//           setError(createRes.data?.message || "Failed to create user account.");
//         }
//       } catch (postErr) {
//         const msg = (postErr.response?.data?.message || "").toLowerCase();
//         if (msg.includes("email") && (msg.includes("already") || msg.includes("exists"))) {
//           await handleDuplicateEmail(emp);
//         } else {
//           setError(postErr.response?.data?.message || "Failed to create user account.");
//         }
//       }
//     } catch (e) {
//       setError(e.response?.data?.message || "Failed to verify or create user account.");
//     } finally {
//       setCheckingUser(false);
//     }
//   };

//   // हेल्पर – डुप्लीकेट ईमेल होने पर मौजूदा यूज़र को एम्प्लॉई से लिंक करें
//   const handleDuplicateEmail = async (emp) => {
//     try {
//       // अब API ?email= पैरामीटर सपोर्ट करता है (एक्ज़ैक्ट मैच)
//       const { data } = await axios.get(`/api/company/users?email=${encodeURIComponent(emp.email.trim())}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (Array.isArray(data) && data.length > 0) {
//         const existingUser = data[0];
//         // क्या लिंक किया जा सकता है?
//         if (!existingUser.employeeId || existingUser.employeeId === emp._id) {
//           // employeeId खाली है या पहले से इसी एम्प्लॉई से लिंक्ड है
//           await axios.put(`/api/company/users/${existingUser._id}`, { employeeId: emp._id }, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           setForm(prev => ({ ...prev, companyUserId: existingUser._id }));
//           setError("");
//         } else {
//           // किसी और एम्प्लॉई से जुड़ा है – conflict
//           setError("An account with this email already exists for a different employee. Please contact admin.");
//           setForm(prev => ({ ...prev, companyUserId: "" }));
//         }
//       } else {
//         // ईमेल से कोई नहीं मिला – फिर भी डुप्लीकेट एरर आई (अनपेक्षित)
//         setError("Email already exists, but could not locate the account. Please contact admin.");
//         setForm(prev => ({ ...prev, companyUserId: "" }));
//       }
//     } catch (e) {
//       setError("Error while resolving duplicate email. Please try again.");
//       setForm(prev => ({ ...prev, companyUserId: "" }));
//     }
//   };

//   // ─── सेव ───
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.companyUserId || !form.workerRole) {
//       return setError("Employee (with a user account) and Role are required.");
//     }
//     if (form.level === "Booth" && (!form.constituencyId || form.boothIds.length === 0)) {
//       return setError("Please select a constituency and at least one booth for Booth level.");
//     }
//     if (["Ward", "Block", "District", "Division", "Any"].includes(form.level) && !form.constituencyId) {
//       return setError("Please select a constituency.");
//     }

//     setSaving(true);
//     setError("");
//     try {
//       await axios.put(`/api/election/worker/assign`, {
//         userId: form.companyUserId,
//         role: form.workerRole,
//         constituencyId: form.constituencyId || null,
//         boothIds: form.boothIds,
//       }, { headers: { Authorization: `Bearer ${token}` } });

//       setModalOpen(false);
//       fetchWorkers();
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to save worker");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const filtered = useMemo(
//     () => workers.filter(w =>
//       !search.trim() || w.name?.toLowerCase().includes(search.toLowerCase())
//     ),
//     [workers, search]
//   );

//   return (
//     <div className="max-w-screen-xl mx-auto">
//       {/* ─── हैडर ─── */}
//       <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
//             Election Workers
//           </h1>
//           <p className="text-sm text-gray-400 mt-0.5">{workers.length} workers</p>
//         </div>
//         <button
//           onClick={openAdd}
//           className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
//         >
//           <FiPlus className="text-base" /> Add Worker
//         </button>
//       </div>

//       {/* ─── सर्च बार ─── */}
//       <div className="relative mb-5 max-w-sm">
//         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
//         <input
//           className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400"
//           value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workers..."
//         />
//       </div>

//       {/* ─── लोडिंग / खाली / कार्ड व्यू ─── */}
//       {loading ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {Array(6).fill(0).map((_, i) => (
//             <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
//               <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
//               <div className="h-3 w-36 bg-gray-100 rounded" />
//             </div>
//           ))}
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="flex flex-col items-center justify-center py-20 text-center">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
//             <FiUserCheck className="text-3xl text-indigo-300" />
//           </div>
//           <p className="text-gray-400 font-medium">
//             {search ? "No workers match your search" : "No workers yet"}
//           </p>
//           {!search && (
//             <p className="text-sm text-gray-300 mt-1">
//               Click &quot;Add Worker&quot; to assign election role
//             </p>
//           )}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {filtered.map(w => (
//             <div
//               key={w._id}
//               className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md group"
//             >
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h3 className="text-base font-bold text-gray-900">{w.name}</h3>
//                   <p className="text-sm text-gray-500">{w.workerRole || "No role"}</p>
//                 </div>
//                 <button
//                   onClick={() => openEdit(w)}
//                   className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"
//                 >
//                   <FiEdit2 className="text-xs" />
//                 </button>
//               </div>
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 {w.assignedConstituency?.name && (
//                   <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-purple-50 text-purple-600 border border-purple-100">
//                     {w.assignedConstituency.name}
//                   </span>
//                 )}
//                 {w.assignedBooths?.length > 0 && (
//                   <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-cyan-50 text-cyan-600 border border-cyan-100">
//                     {w.assignedBooths.length} booths
//                   </span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* ─── मोडल (Add / Edit) ─── */}
//       {modalOpen && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
//             {/* ── मोडल हैडर ── */}
//             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
//                   <FiUserCheck className="text-white text-base" />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-bold text-gray-900">
//                     {editingWorker ? "Edit Worker" : "Add Worker"}
//                   </h2>
//                   <p className="text-xs text-gray-400">
//                     {editingWorker
//                       ? `Editing ${editingWorker.name}`
//                       : "Assign election role to employee"}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setModalOpen(false)}
//                 className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"
//               >
//                 <FiX />
//               </button>
//             </div>

//             {/* ── मोडल बॉडी ── */}
//             <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
//               {error && (
//                 <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
//                   <FiX className="text-red-500" />
//                   <p className="text-sm text-red-600 font-medium">{error}</p>
//                 </div>
//               )}

//               {/* एम्प्लॉई सिलेक्ट (सिर्फ ऐड मोड) */}
//               {!editingWorker && (
//                 <div>
//                   <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">
//                     Select Employee *
//                   </label>
//                   <EmployeeSearchSelect
//                     token={token}
//                     onSelect={handleEmployeeSelect}
//                   />
//                   {checkingUser && (
//                     <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
//                       <FiLoader className="animate-spin" /> Checking user account...
//                     </p>
//                   )}
//                   {form.companyUserId && !checkingUser && (
//                     <p className="text-xs text-emerald-600 mt-1 font-medium">
//                       ✓ User account ready
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* रोल + लेवल */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
//                     Role *
//                   </label>
//                   <select
//                     value={form.workerRole}
//                     onChange={(e) => {
//                       const selectedRole = WORKER_ROLES.find(
//                         r => r.value === e.target.value
//                       );
//                       setForm(prev => ({
//                         ...prev,
//                         workerRole: e.target.value,
//                         level: selectedRole?.level || "",
//                       }));
//                     }}
//                     className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//                   >
//                     <option value="">Select Role</option>
//                     {WORKER_ROLES.map(r => (
//                       <option key={r.value} value={r.value}>
//                         {r.label}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
//                     Level (auto)
//                   </label>
//                   <input
//                     value={form.level}
//                     disabled
//                     className="w-full py-2.5 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-500"
//                     placeholder="Auto selected"
//                   />
//                 </div>
//               </div>

//               {/* लेवल के हिसाब से असाइनमेंट */}
//               {renderAssignmentFields()}

//               {/* ── फ़ुटर बटन ── */}
//               <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
//                 <button
//                   type="button"
//                   onClick={() => setModalOpen(false)}
//                   className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={saving || checkingUser || !form.companyUserId}
//                   className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
//                     saving || checkingUser || !form.companyUserId
//                       ? "bg-gray-300 cursor-not-allowed"
//                       : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
//                   }`}
//                 >
//                   {saving ? (
//                     <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                   ) : (
//                     <FiPlus className="text-sm" />
//                   )}
//                   {editingWorker ? "Update" : "Add"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }