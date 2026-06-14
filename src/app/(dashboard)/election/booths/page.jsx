"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FiPlus, FiTrash2, FiEdit2, FiSearch, FiHome, FiX, FiChevronDown, FiChevronUp
} from "react-icons/fi";

// Searchable Select Component
function SearchableSelect({ options, value, onChange, placeholder, disabled, className, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className || ""}`}>
      <div
        className={`w-full py-2.5 px-4 rounded-xl border text-sm flex items-center justify-between cursor-pointer ${
          disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-gray-200"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
          {isLoading ? "Loading..." : (selectedOption ? selectedOption.label : placeholder)}
        </span>
        {isOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
      </div>
      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full py-1.5 px-3 rounded-lg border border-gray-200 text-sm"
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
                onClick={() => handleSelect(opt)}
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

// Booth form fields (without block/ward – handled separately)
const BOOTH_FORM_FIELDS = [
  { name: "boothNumber", label: "Booth Number *", type: "text", required: true },
  { name: "name", label: "Name", type: "text" },
  { name: "address.line1", label: "Address Line 1", type: "text" },
  { name: "address.village", label: "Village", type: "text" },
  { name: "address.postOffice", label: "Post Office", type: "text" },
  { name: "address.pincode", label: "PIN Code", type: "text" },
  { name: "address.location.latitude", label: "Latitude", type: "number", step: "any" },
  { name: "address.location.longitude", label: "Longitude", type: "number", step: "any" },
  { name: "totalVoters", label: "Total Voters", type: "number" },
];

export default function BoothsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    constituencyId: "",
    blockId: "",
    wardId: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [constituencyOptions, setConstituencyOptions] = useState([]);
  const [blockOptions, setBlockOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [agentList, setAgentList] = useState([]);

  // Selected IDs for cascading in form
  const [selectedConstituencyId, setSelectedConstituencyId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");

  // Loading states
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── Fetch booths with filters ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filters.constituencyId) params.set("constituency", filters.constituencyId);
      if (filters.blockId) params.set("block", filters.blockId);
      if (filters.wardId) params.set("ward", filters.wardId);

      const { data } = await axios.get(`/api/election/booth?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, search, filters]);

  // ─── Fetch constituencies ──────────────────────────────────────────
  const fetchConstituencies = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/election/constituency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setConstituencyOptions(data.data.map(c => ({ value: c._id, label: c.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // ─── Fetch blocks for a constituency ────────────────────────────────
  const loadBlocks = async (constituencyId) => {
    if (!token || !constituencyId) {
      setBlockOptions([]);
      return;
    }
    setIsLoadingBlocks(true);
    try {
      const { data } = await axios.get(`/api/election/block?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setBlockOptions(data.data.map(b => ({ value: b._id, label: `${b.blockNumber} - ${b.name || ""}` })));
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingBlocks(false); }
  };

  // ─── Fetch wards for a block ────────────────────────────────────────
  const loadWards = async (blockId) => {
    if (!token || !blockId) {
      setWardOptions([]);
      return;
    }
    setIsLoadingWards(true);
    try {
      const { data } = await axios.get(`/api/election/ward?block=${blockId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setWardOptions(data.data.map(w => ({ value: w._id, label: `${w.wardNumber} - ${w.name || ""}` })));
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingWards(false); }
  };

  // ─── Fetch workers (agents) ─────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/election/worker", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAgentList(data.data.map(w => ({ value: w._id, label: w.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Initial loads
  useEffect(() => {
    fetchData();
    fetchConstituencies();
    fetchAgents();
  }, [fetchData, fetchConstituencies, fetchAgents]);

  // Cascading for filters
  useEffect(() => {
    if (filters.constituencyId) {
      loadBlocks(filters.constituencyId);
    } else {
      setBlockOptions([]);
      setFilters(prev => ({ ...prev, blockId: "", wardId: "" }));
    }
  }, [filters.constituencyId]);

  useEffect(() => {
    if (filters.blockId) {
      loadWards(filters.blockId);
    } else {
      setWardOptions([]);
      setFilters(prev => ({ ...prev, wardId: "" }));
    }
  }, [filters.blockId]);

  // Filter handlers
  const handleFilterConstituencyChange = (value) => {
    setFilters(prev => ({ ...prev, constituencyId: value, blockId: "", wardId: "" }));
  };
  const handleFilterBlockChange = (value) => {
    setFilters(prev => ({ ...prev, blockId: value, wardId: "" }));
  };

  // ─── Form handlers ───────────────────────────────────────────────────
  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setError("");
    setSelectedConstituencyId("");
    setSelectedBlockId("");
    setSelectedWardId("");
    setBlockOptions([]);
    setWardOptions([]);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    const blockId = item.block?._id || "";
    const wardId = item.ward?._id || "";
    const constituencyId = item.constituency?._id || "";

    setSelectedConstituencyId(constituencyId);
    setSelectedBlockId(blockId);
    setSelectedWardId(wardId);

    setForm({
      boothNumber: item.boothNumber || "",
      name: item.name || "",
      "address.line1": item.address?.line1 || "",
      "address.village": item.address?.village || "",
      "address.postOffice": item.address?.postOffice || "",
      "address.pincode": item.address?.pincode || "",
      "address.location.latitude": item.address?.location?.coordinates?.[1] ?? "",
      "address.location.longitude": item.address?.location?.coordinates?.[0] ?? "",
      totalVoters: item.totalVoters ?? "",
      assignedAgent: item.assignedAgent?._id || "",
      block: blockId,
      ward: wardId,
    });

    if (constituencyId) loadBlocks(constituencyId);
    if (blockId) loadWards(blockId);
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFormConstituencyChange = (value) => {
    setSelectedConstituencyId(value);
    setSelectedBlockId("");
    setSelectedWardId("");
    setForm(prev => ({ ...prev, block: "", ward: "" }));
    loadBlocks(value);
    setWardOptions([]);
  };

  const handleFormBlockChange = (value) => {
    setSelectedBlockId(value);
    setSelectedWardId("");
    setForm(prev => ({ ...prev, block: value, ward: "" }));
    loadWards(value);
  };

  const buildPayload = () => {
    const payload = {
      boothNumber: form.boothNumber,
      name: form.name,
      constituency: selectedConstituencyId,
      block: selectedBlockId || undefined,
      ward: selectedWardId || undefined,
      totalVoters: form.totalVoters ? parseInt(form.totalVoters, 10) : 0,
      assignedAgent: form.assignedAgent || undefined,
      address: {
        line1: form["address.line1"] || "",
        village: form["address.village"] || "",
        postOffice: form["address.postOffice"] || "",
        pincode: form["address.pincode"] || "",
      },
    };

    const lat = form["address.location.latitude"];
    const lng = form["address.location.longitude"];
    if (lat !== undefined && lat !== "" && lng !== undefined && lng !== "") {
      payload.address.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.boothNumber || !selectedConstituencyId) {
      return setError("Booth Number and Constituency are required.");
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await axios.put(`/api/election/booth?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/booth", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this booth?")) return;
    await axios.delete(`/api/election/booth?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecords(prev => prev.filter(r => r._id !== id));
  };

  const filteredRecords = useMemo(() => records, [records]);

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Booths</h1>
          <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
          <FiPlus className="text-base" /> Add Booth
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search booth number, name..."
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <SearchableSelect
            options={constituencyOptions}
            value={filters.constituencyId}
            onChange={handleFilterConstituencyChange}
            placeholder="All Constituencies"
            className="w-44"
          />
          <SearchableSelect
            options={blockOptions}
            value={filters.blockId}
            onChange={handleFilterBlockChange}
            placeholder="All Blocks"
            disabled={!filters.constituencyId}
            isLoading={isLoadingBlocks}
            className="w-44"
          />
          <SearchableSelect
            options={wardOptions}
            value={filters.wardId}
            onChange={(val) => setFilters(prev => ({ ...prev, wardId: val }))}
            placeholder="All Wards"
            disabled={!filters.blockId}
            isLoading={isLoadingWards}
            className="w-44"
          />
        </div>
      </div>

      {/* Booth Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
              <div className="flex gap-1.5">
                {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiHome className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No booths yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Booth" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.boothNumber}</h3>
                  {item.name && <p className="text-sm text-gray-600">{item.name}</p>}
                  <p className="text-xs text-gray-400">{item.constituency?.name || "-"}</p>
                  {item.block && <p className="text-xs text-purple-500">Block: {item.block.blockNumber}</p>}
                  {item.ward && <p className="text-xs text-green-500">Ward: {item.ward.wardNumber}</p>}
                  {(item.address?.line1 || item.address?.village) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {item.address?.line1 ? `${item.address.line1}, ` : ""}
                      {item.address?.village || ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.assignedAgent?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-50 text-green-600">
                    Agent: {item.assignedAgent.name}
                  </span>
                )}
                {item.totalVoters != null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600">
                    {item.totalVoters} voters
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiHome className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold">{editingId ? "Edit Booth" : "New Booth"}</h2>
                  <p className="text-xs text-gray-400">{editingId ? "Update details" : "Enter booth information"}</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

                {/* Hierarchy: Constituency → Block → Ward */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Constituency *</label>
                    <SearchableSelect
                      options={constituencyOptions}
                      value={selectedConstituencyId}
                      onChange={handleFormConstituencyChange}
                      placeholder="Select constituency..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Block</label>
                    <SearchableSelect
                      options={blockOptions}
                      value={selectedBlockId}
                      onChange={handleFormBlockChange}
                      placeholder="Select block (optional)..."
                      disabled={!selectedConstituencyId}
                      isLoading={isLoadingBlocks}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Ward</label>
                    <SearchableSelect
                      options={wardOptions}
                      value={selectedWardId}
                      onChange={(val) => { setSelectedWardId(val); setForm(prev => ({ ...prev, ward: val })); }}
                      placeholder="Select ward (optional)..."
                      disabled={!selectedBlockId}
                      isLoading={isLoadingWards}
                    />
                  </div>
                </div>

                {/* Other fields */}
                {BOOTH_FORM_FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">{field.label}</label>
                    <input
                      name={field.name}
                      type={field.type}
                      value={form[field.name] || ""}
                      onChange={handleFieldChange}
                      required={field.required}
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm"
                      placeholder={`Enter ${field.label.replace(" *","")}`}
                      step={field.step}
                    />
                  </div>
                ))}

                {/* Assigned Agent */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Assigned Agent</label>
                  <select
                    name="assignedAgent"
                    value={form.assignedAgent || ""}
                    onChange={handleFieldChange}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm"
                  >
                    <option value="">None</option>
                    {agentList.map(agent => (
                      <option key={agent.value} value={agent.value}>{agent.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600">Cancel</button>
                <button type="submit" disabled={saving}
                  className={`px-6 py-2 rounded-xl text-white ${saving ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                  {saving ? "Saving..." : (editingId ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}