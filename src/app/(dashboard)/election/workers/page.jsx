// app/(dashboard)/election/workers/page.js
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUserCheck, FiX, FiLoader,
  FiShield, FiChevronRight, FiChevronDown
} from "react-icons/fi";

// ========================
// Constants
// ========================
const ELECTION_MODULES = [
  "Election Dashboard", "Voters", "Booths", "Constituencies",
  "Election Expenses", "Election Analytics", "Election Campaign",
  "Election Surveys", "Election Reports", "Election Communication",
  "Parties / Candidates", "Workers", "Election GIS",
];

const PERMISSIONS = ["create", "view", "edit", "delete", "print", "approve", "reject", "import", "export", "upload", "download", "email", "copy", "whatsapp"];
const PERM_ICONS = {
  create: "➕", view: "👁", edit: "✏️", delete: "🗑️", print: "🖨️", approve: "✅", reject: "❌",
  import: "📥", export: "📤", upload: "☁️⬆️", download: "☁️⬇️", email: "📧", copy: "📋", whatsapp: "💬"
};

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
  "Ward / Village Level": { needsConstituency: true, needsBlock: true, needsWard: true, needsDistrict: false, needsState: false },
  "Block / Taluka Level": { needsConstituency: true, needsBlock: true, needsDistrict: false, needsState: false },
  "District Level": { needsDistrict: true, needsConstituency: false },
  "State Level": { needsState: true },
  "National Level": { needsNational: true },
};

// ========================
// SearchableSelect Component
// ========================
function SearchableSelect({ options, value, onChange, placeholder, disabled, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <div
        className={`w-full py-2.5 px-4 rounded-xl border text-sm flex items-center justify-between cursor-pointer ${
          disabled ? "bg-gray-100 text-gray-400" : "bg-white border-gray-200"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
          {isLoading ? "Loading..." : (selectedOption ? selectedOption.label : placeholder)}
        </span>
        {isOpen ? <FiChevronDown /> : <FiChevronRight />}
      </div>
      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full py-1.5 px-3 rounded-lg border text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 text-center">No options</p>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.value}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                  opt.value === value ? "bg-indigo-50 font-semibold" : ""
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ========================
// Main Component
// ========================
export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", role: "", levelGroup: "",
    constituencyId: "", boothIds: [],
    blockId: "", wardId: "", district: "", state: "",
  });
  const [modulesConfig, setModulesConfig] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [constituencies, setConstituencies] = useState([]);
  const [boothsList, setBoothsList] = useState([]);
  const [blocksList, setBlocksList] = useState([]);
  const [wardsList, setWardsList] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ========================
  // Data fetching
  // ========================
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

  // Load booths for a constituency (Booth Level)
  const loadBooths = async (constituencyId) => {
    if (!token || !constituencyId) return setBoothsList([]);
    try {
      const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBoothsList(data.data);
    } catch (e) { console.error(e); }
  };

  // Load blocks for a constituency
  const loadBlocks = async (constituencyId) => {
    if (!token || !constituencyId) {
      setBlocksList([]);
      return;
    }
    setIsLoadingBlocks(true);
    try {
      const { data } = await axios.get(`/api/election/block?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map(b => ({ value: b._id, label: `${b.blockNumber}${b.name ? " - " + b.name : ""}` }));
        setBlocksList(mapped);
      } else {
        setBlocksList([]);
      }
    } catch (err) {
      console.error("loadBlocks error:", err);
      setBlocksList([]);
      setError("Failed to load blocks. Check backend /api/election/block?constituency=...");
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  // Load wards for a block
  const loadWards = async (blockId) => {
    if (!token || !blockId) {
      setWardsList([]);
      return;
    }
    setIsLoadingWards(true);
    try {
      const { data } = await axios.get(`/api/election/ward?block=${blockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map(w => ({ value: w._id, label: `${w.wardNumber}${w.name ? " - " + w.name : ""}` }));
        setWardsList(mapped);
      } else {
        setWardsList([]);
      }
    } catch (err) {
      console.error("loadWards error:", err);
      setWardsList([]);
      setError("Failed to load wards. Check backend /api/election/ward?block=...");
    } finally {
      setIsLoadingWards(false);
    }
  };

  // ========================
  // Form Handlers
  // ========================
  const handleRoleSelect = (roleValue) => {
    let foundLevel = null;
    for (const [levelGroup, roles] of Object.entries(WORKER_ROLES)) {
      if (roles.some(r => r.value === roleValue)) {
        foundLevel = levelGroup;
        break;
      }
    }
    setForm({
      name: form.name, phone: form.phone, email: form.email,
      role: roleValue, levelGroup: foundLevel || "",
      constituencyId: "", boothIds: [], blockId: "", wardId: "", district: "", state: "",
    });
    setBoothsList([]);
    setBlocksList([]);
    setWardsList([]);
  };

  const handleConstituencyChange = async (constituencyId) => {
    setForm(prev => ({ ...prev, constituencyId, boothIds: [], blockId: "", wardId: "" }));
    const level = form.levelGroup;
    if (level === "Booth Level") {
      await loadBooths(constituencyId);
    } else if (level === "Block / Taluka Level" || level === "Ward / Village Level") {
      await loadBlocks(constituencyId);
    }
  };

  const handleBlockChange = async (blockId) => {
    setForm(prev => ({ ...prev, blockId, wardId: "" }));
    // Always load wards if block is selected (for both Block and Ward levels)
    await loadWards(blockId);
  };

  const renderAssignmentFields = () => {
    const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
    if (!cfg) return null;

    return (
      <div className="space-y-4">
        {cfg.needsConstituency && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Constituency *</label>
            <select
              value={form.constituencyId}
              onChange={(e) => handleConstituencyChange(e.target.value)}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              required
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
            <label className="text-xs font-bold uppercase text-gray-500">Booth(s) (multi-select) *</label>
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
              required
            >
              {boothsList.map(b => (
                <option key={b._id} value={b._id}>{b.boothNumber} - {b.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Hold Ctrl to select multiple</p>
          </div>
        )}

        {/* Block field – shown for both Block and Ward levels */}
        {(cfg.needsBlock || cfg.needsWard) && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Block *</label>
            <SearchableSelect
              options={blocksList}
              value={form.blockId}
              onChange={handleBlockChange}
              placeholder="Select block"
              disabled={!form.constituencyId}
              isLoading={isLoadingBlocks}
            />
            {!form.constituencyId && (
              <p className="text-xs text-amber-600 mt-1">Please select a constituency first</p>
            )}
          </div>
        )}

        {cfg.needsWard && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Ward *</label>
            <SearchableSelect
              options={wardsList}
              value={form.wardId}
              onChange={(val) => setForm(prev => ({ ...prev, wardId: val }))}
              placeholder="Select ward"
              disabled={!form.blockId}
              isLoading={isLoadingWards}
            />
            {!form.blockId && (
              <p className="text-xs text-amber-600 mt-1">Please select a block first</p>
            )}
            {form.blockId && wardsList.length === 0 && !isLoadingWards && (
              <p className="text-xs text-red-500 mt-1">No wards found for this block</p>
            )}
          </div>
        )}

        {cfg.needsDistrict && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">District *</label>
            <input
              type="text"
              value={form.district}
              onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., New Delhi"
              required
            />
          </div>
        )}

        {cfg.needsState && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">State *</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
              placeholder="e.g., Uttar Pradesh"
              required
            />
          </div>
        )}

        {cfg.needsNational && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">National Level</label>
            <input type="text" value="India (All States)" disabled className="w-full py-2.5 px-4 rounded-xl bg-gray-50 text-gray-500" />
          </div>
        )}
      </div>
    );
  };

  const openAdd = () => {
    setEditingWorker(null);
    setActiveTab("info");
    setForm({
      name: "", phone: "", email: "", role: "", levelGroup: "",
      constituencyId: "", boothIds: [], blockId: "", wardId: "", district: "", state: "",
    });
    setBoothsList([]);
    setBlocksList([]);
    setWardsList([]);
    const defaultModules = {};
    ELECTION_MODULES.forEach(mod => {
      defaultModules[mod] = { selected: false, permissions: Object.fromEntries(PERMISSIONS.map(p => [p, false])) };
    });
    setModulesConfig(defaultModules);
    setError("");
    setModalOpen(true);
  };

  const openEdit = async (worker) => {
    let derivedLevelGroup = "";
    for (const [levelGroup, roles] of Object.entries(WORKER_ROLES)) {
      if (roles.some(r => r.value === worker.workerRole)) {
        derivedLevelGroup = levelGroup;
        break;
      }
    }

    const constituencyId = worker.assignedConstituency?._id || "";
    const blockId = worker.assignedBlock?._id || "";
    const wardId = worker.assignedWard?._id || "";

    setEditingWorker(worker);
    setActiveTab("info");
    setForm({
      name: worker.name,
      phone: worker.phone,
      email: worker.email || "",
      role: worker.workerRole,
      levelGroup: derivedLevelGroup,
      constituencyId,
      boothIds: worker.assignedBooths?.map(b => b._id) || [],
      blockId,
      wardId,
      district: worker.district || "",
      state: worker.state || "",
    });

    // Load modules — modulesConfig from backend is a Map, so it may arrive
    // as a plain object (after JSON serialization). Match keys tolerantly
    // in case of whitespace/case differences.
    const existingModules = worker.modules || {};
    const normalize = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const existingKeysNormalized = {};
    Object.keys(existingModules).forEach(k => {
      existingKeysNormalized[normalize(k)] = k;
    });
    const mergedModules = {};
    ELECTION_MODULES.forEach(mod => {
      const matchKey = existingKeysNormalized[normalize(mod)];
      const existing = matchKey ? existingModules[matchKey] : undefined;
      mergedModules[mod] = {
        selected: existing?.selected || false,
        permissions: {
          ...Object.fromEntries(PERMISSIONS.map(p => [p, false])),
          ...(existing?.permissions || {})
        }
      };
    });
    setModulesConfig(mergedModules);

    // Auto-expand any modules that already have permissions selected
    const initialExpanded = {};
    Object.entries(mergedModules).forEach(([mod, cfg]) => {
      if (cfg.selected) initialExpanded[mod] = true;
    });
    setExpandedModules(initialExpanded);

    // Reset dependent lists before loading
    setBoothsList([]);
    setBlocksList([]);
    setWardsList([]);

    setError("");
    setModalOpen(true);

    // Load dependent dropdowns for edit (after modal is open so loading states show)
    if (constituencyId) {
      if (derivedLevelGroup === "Booth Level") {
        await loadBooths(constituencyId);
      } else if (derivedLevelGroup === "Block / Taluka Level" || derivedLevelGroup === "Ward / Village Level") {
        await loadBlocks(constituencyId);
        if (blockId) {
          await loadWards(blockId);
          // re-apply blockId/wardId after async loads complete
          setForm(prev => ({ ...prev, blockId, wardId }));
        }
      }
    }
  };

  // ========================
  // Permissions handlers
  // ========================
  const toggleModule = (moduleName) => {
    setModulesConfig(prev => {
      const nextSelected = !prev[moduleName]?.selected;
      return {
        ...prev,
        [moduleName]: {
          selected: nextSelected,
          permissions: prev[moduleName]?.permissions || Object.fromEntries(PERMISSIONS.map(p => [p, false]))
        }
      };
    });
    // Auto-expand the module so the permission grid is visible immediately
    setExpandedModules(prev => ({ ...prev, [moduleName]: true }));
  };

  const togglePermission = (moduleName, perm) => {
    setModulesConfig(prev => ({
      ...prev,
      [moduleName]: {
        selected: true,
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
      [moduleName]: { selected: value, permissions: newPerms }
    }));
  };

  // ========================
  // Submit
  // ========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.role) {
      return setError("Name, Phone and Role are required.");
    }
    const cfg = LEVEL_ASSIGNMENT[form.levelGroup];
    if (cfg?.needsConstituency && !form.constituencyId) return setError("Please select a constituency.");
    if (cfg?.needsBooths && form.boothIds.length === 0) return setError("Please select at least one booth.");
    if ((cfg?.needsBlock || cfg?.needsWard) && !form.blockId) return setError("Please select a block.");
    if (cfg?.needsWard && !form.wardId) return setError("Please select a ward.");
    if (cfg?.needsDistrict && !form.district) return setError("District is required.");
    if (cfg?.needsState && !form.state) return setError("State is required.");

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
        constituencyId: form.constituencyId || null,
        boothIds: form.boothIds,
        blockId: form.blockId || null,
        wardId: form.wardId || null,
        district: form.district,
        state: form.state,
        modules: modulesConfig,
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

  // ========================
  // Permissions Tab Render
  // ========================
  const renderPermissionsTab = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      {ELECTION_MODULES.map(module => {
        const config = modulesConfig[module] || { selected: false, permissions: {} };
        const isExpanded = expandedModules[module];
        const selectedCount = Object.values(config.permissions || {}).filter(Boolean).length;
        return (
          <div key={module} className="bg-gray-50 rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-gray-500"
                  onClick={() => setExpandedModules(prev => ({ ...prev, [module]: !prev[module] }))}
                >
                  {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                </button>
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setExpandedModules(prev => ({ ...prev, [module]: !prev[module] }))}
                >
                  <input
                    type="checkbox"
                    checked={!!config.selected}
                    onChange={() => toggleModule(module)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium text-gray-800">{module}</span>
                </label>
              </div>
              {selectedCount > 0 && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{selectedCount}</span>
              )}
            </div>
            {isExpanded && config.selected && (
              <div className="p-3 border-t bg-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-gray-400">Permissions</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAllPermissions(module, true)} className="text-xs text-green-600 hover:underline">All</button>
                    <button type="button" onClick={() => setAllPermissions(module, false)} className="text-xs text-red-500 hover:underline">None</button>
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

  // ========================
  // Main Render
  // ========================
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
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
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
                {w.assignedBlock?.blockNumber && <span className="bg-amber-50 px-2 py-0.5 rounded-full">Block: {w.assignedBlock.blockNumber}</span>}
                {w.assignedWard?.wardNumber && <span className="bg-green-50 px-2 py-0.5 rounded-full">Ward: {w.assignedWard.wardNumber}</span>}
                {w.assignedBooths?.length > 0 && <span className="bg-cyan-50 px-2 py-0.5 rounded-full">{w.assignedBooths.length} booths</span>}
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

            <div className="flex border-b px-4">
              <button
                type="button"
                className={`py-2 px-4 text-sm font-medium border-b-2 ${
                  activeTab === "info" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"
                }`}
                onClick={() => setActiveTab("info")}
              >
                Basic Info
              </button>
              <button
                type="button"
                className={`py-2 px-4 text-sm font-medium border-b-2 flex items-center gap-1 ${
                  activeTab === "permissions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500"
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
                      <label className="text-xs font-bold uppercase text-gray-500">Email</label>
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