// app/(dashboard)/election/voters/page.js
"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiX, FiChevronDown, FiChevronUp,
} from "react-icons/fi";

// ─── Support levels & colours ──────────────────────────────────────────
const SUPPORT_LEVELS = [
  "StrongSupporter", "WeakSupporter", "Neutral", "Opposition", "Undecided",
];
const SUPPORT_COLORS = {
  StrongSupporter: "bg-green-50 text-green-600 border-green-200",
  WeakSupporter: "bg-lime-50 text-lime-600 border-lime-200",
  Neutral: "bg-gray-50 text-gray-500 border-gray-200",
  Opposition: "bg-red-50 text-red-600 border-red-200",
  Undecided: "bg-yellow-50 text-yellow-600 border-yellow-200",
};

// ─── Static form fields (excl. constituency & booth) ──────────────────
const VOTER_FORM_FIELDS = [
  { name: "firstName", label: "First Name *", type: "text", required: true },
  { name: "middleName", label: "Middle Name", type: "text" },
  { name: "lastName", label: "Last Name", type: "text" },
  { name: "voterId", label: "Voter ID (EPIC)", type: "text" },
  { name: "aadhaar", label: "Aadhaar", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "altPhone", label: "Alternate Phone", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "age", label: "Age", type: "number" },
  { name: "dob", label: "Date of Birth", type: "date" },
  { name: "gender", label: "Gender", type: "select", options: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" }
  ]},
  { name: "caste", label: "Caste", type: "text" },
  { name: "religion", label: "Religion", type: "text" },
  { name: "occupation", label: "Occupation", type: "text" },
  { name: "education", label: "Education", type: "text" },
  { name: "addressLine1", label: "Address Line 1", type: "text" },
  { name: "village", label: "Village", type: "text" },
  { name: "postOffice", label: "Post Office", type: "text" },
  { name: "pincode", label: "PIN Code", type: "text", maxLength: 6 },
  { name: "supportLevel", label: "Support Level", type: "select",
    options: SUPPORT_LEVELS.map(s => ({ value: s, label: s })) },
  { name: "influenceRating", label: "Influence (1-5)", type: "number", min: 1, max: 5 },
  { name: "tags", label: "Tags (comma separated)", type: "text" },
  { name: "membershipNumber", label: "Membership No.", type: "text" },
];

// ─── Searchable Select Component (Typeahead) ──────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, disabled, className }) {
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
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {isOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full py-1.5 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
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

export default function VotersPage() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    supportLevel: "", caste: "", gender: ""
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Constituency & Booth data
  const [constituencyOptions, setConstituencyOptions] = useState([]); // {value, label}
  const [boothOptions, setBoothOptions] = useState([]);              // {value, label}
  const [selectedConstituencyId, setSelectedConstituencyId] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── Fetch voters ────────────────────────────────────────────────────
  const fetchVoters = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

      const { data } = await axios.get(`/api/election/voter?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVoters(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, search, filters]);

  // ─── Fetch constituencies & transform to options ─────────────────────
  const fetchConstituencyOptions = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get("/api/election/constituency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setConstituencyOptions(data.data.map(c => ({ value: c._id, label: c.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // ─── Load booths for a given constituency ────────────────────────────
  const loadBoothOptions = async (constituencyId) => {
    if (!token || !constituencyId) {
      setBoothOptions([]);
      return;
    }
    try {
      const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setBoothOptions(data.data.map(b => ({
          value: b._id,
          label: `${b.boothNumber} - ${b.name || ""}`
        })));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchVoters();
    fetchConstituencyOptions();
  }, [fetchVoters, fetchConstituencyOptions]);

  // ─── Form helpers ────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setError("");
    setSelectedConstituencyId("");
    setBoothOptions([]);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (voter) => {
    setEditingId(voter._id);
    const boothId = voter.booth?._id || "";
    const constituencyId = voter.booth?.constituency?._id || "";

    setSelectedConstituencyId(constituencyId);
    setForm({
      firstName: voter.firstName || "",
      middleName: voter.middleName || "",
      lastName: voter.lastName || "",
      voterId: voter.voterId || "",
      aadhaar: voter.aadhaar || "",
      phone: voter.phone || "",
      altPhone: voter.altPhone || "",
      email: voter.email || "",
      age: voter.age || "",
      dob: voter.dob ? new Date(voter.dob).toISOString().split("T")[0] : "",
      gender: voter.gender || "",
      caste: voter.caste || "",
      religion: voter.religion || "",
      occupation: voter.occupation || "",
      education: voter.education || "",
      addressLine1: voter.address?.line1 || "",
      village: voter.address?.village || "",
      postOffice: voter.address?.postOffice || "",
      pincode: voter.address?.pincode || "",
      supportLevel: voter.supportLevel || "",
      influenceRating: voter.influenceRating || "",
      tags: voter.tags?.join(", ") || "",
      membershipNumber: voter.membershipNumber || "",
      booth: boothId,
    });

    if (constituencyId) loadBoothOptions(constituencyId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // ─── Constituency selection (searchable) ─────────────────────────────
  const handleConstituencyChange = (value) => {
    setSelectedConstituencyId(value);
    setForm(prev => ({ ...prev, booth: "" }));
    loadBoothOptions(value);
  };

  // ─── PIN auto‑fill (optional) ────────────────────────────────────────
  const fetchCityStateFromPin = async (pin) => {
    if (pin.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0]?.PostOffice?.[0];
        if (post) {
          setForm(prev => ({
            ...prev,
            village: prev.village || post.Name || "",
            postOffice: prev.postOffice || post.Name || "",
          }));
        }
      }
    } catch (e) { /* silent */ }
  };

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.booth) {
      return setError("First Name and Booth are required.");
    }
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName || undefined,
        voterId: form.voterId || undefined,
        aadhaar: form.aadhaar || undefined,
        phone: form.phone || undefined,
        altPhone: form.altPhone || undefined,
        email: form.email || undefined,
        age: form.age ? Number(form.age) : undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        caste: form.caste || undefined,
        religion: form.religion || undefined,
        occupation: form.occupation || undefined,
        education: form.education || undefined,
        address: {
          line1: form.addressLine1 || "",
          village: form.village || "",
          postOffice: form.postOffice || "",
          pincode: form.pincode || "",
        },
        booth: form.booth,
        supportLevel: form.supportLevel || undefined,
        influenceRating: form.influenceRating ? Number(form.influenceRating) : undefined,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        membershipNumber: form.membershipNumber || undefined,
      };

      if (editingId) {
        await axios.put(`/api/election/voter?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/voter", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      closeModal();
      fetchVoters();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving voter");
    } finally { setSaving(false); }
  };

  // ─── Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this voter?")) return;
    try {
      await axios.delete(`/api/election/voter?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVoters(prev => prev.filter(v => v._id !== id));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete voter");
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Voters</h1>
          <p className="text-sm text-gray-400 mt-0.5">{voters.length} records</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Voter
        </button>
      </div>

      {/* ─── Search & Filters ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, Voter ID, phone..."
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filters.supportLevel}
            onChange={e => setFilters(prev => ({ ...prev, supportLevel: e.target.value }))}
            className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All Support</option>
            {SUPPORT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input
            placeholder="Caste"
            value={filters.caste}
            onChange={e => setFilters(prev => ({ ...prev, caste: e.target.value }))}
            className="py-2.5 px-3 w-24 rounded-xl border border-gray-200 text-sm"
          />
          <select
            value={filters.gender}
            onChange={e => setFilters(prev => ({ ...prev, gender: e.target.value }))}
            className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm"
          >
            <option value="">All Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* ─── Voter Cards ──────────────────────────────────────────────── */}
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
      ) : voters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiUser className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">No voters yet</p>
          <p className="text-sm text-gray-300 mt-1">Click &quot;Add Voter&quot; to start</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {voters.map(voter => (
            <div key={voter._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {voter.firstName} {voter.middleName ? voter.middleName + " " : ""}{voter.lastName}
                  </h3>
                  {voter.voterId && <p className="text-sm text-gray-500">ID: {voter.voterId}</p>}
                  {voter.phone && <p className="text-xs text-gray-400">{voter.phone}</p>}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(voter)}
                    className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(voter._id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${SUPPORT_COLORS[voter.supportLevel] || "bg-gray-50 text-gray-500"}`}>
                  {voter.supportLevel}
                </span>
                {voter.booth?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {voter.booth.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Voter Modal (Add / Edit) ─────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiUser className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingId ? "Edit Voter" : "New Voter"}
                  </h2>
                  <p className="text-xs text-gray-400">Fields marked * are required</p>
                </div>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all">
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <FiX className="text-red-500" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
                )}

                {/* Constituency + Booth (both searchable) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Constituency
                    </label>
                    <SearchableSelect
                      options={constituencyOptions}
                      value={selectedConstituencyId}
                      onChange={handleConstituencyChange}
                      placeholder="Search constituency..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      Booth *
                    </label>
                    <SearchableSelect
                      options={boothOptions}
                      value={form.booth || ""}
                      onChange={(val) => setForm(prev => ({ ...prev, booth: val }))}
                      placeholder="Search booth..."
                      disabled={!selectedConstituencyId}
                    />
                  </div>
                </div>

                {/* Other fields in a two‑column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {VOTER_FORM_FIELDS.map(field => {
                    const extraProps = field.name === "pincode" ? {
                      onChange: (e) => {
                        handleFieldChange(e);
                        fetchCityStateFromPin(e.target.value);
                      },
                      maxLength: 6,
                    } : {};
                    return (
                      <div key={field.name} className={field.name === "addressLine1" ? "sm:col-span-2" : ""}>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                          {field.label}
                        </label>
                        {field.type === "select" ? (
                          <select
                            name={field.name}
                            value={form[field.name] || ""}
                            onChange={handleFieldChange}
                            required={field.required}
                            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                          >
                            <option value="">Select...</option>
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={field.name}
                            type={field.type}
                            value={form[field.name] || ""}
                            onChange={field.name === "pincode" ? extraProps.onChange : handleFieldChange}
                            required={field.required}
                            min={field.min}
                            max={field.max}
                            maxLength={extraProps.maxLength}
                            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                            placeholder={`Enter ${field.label.replace(" *","")}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
                    saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                  }`}>
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  ) : (
                    <><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



// // app/(dashboard)/election/voters/page.js
// "use client";
// import React, { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import {
//   FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiX, FiChevronDown, FiChevronUp,
// } from "react-icons/fi";

// // ─── Support levels & colours ──────────────────────────────────────────
// const SUPPORT_LEVELS = [
//   "StrongSupporter", "WeakSupporter", "Neutral", "Opposition", "Undecided",
// ];
// const SUPPORT_COLORS = {
//   StrongSupporter: "bg-green-50 text-green-600 border-green-200",
//   WeakSupporter: "bg-lime-50 text-lime-600 border-lime-200",
//   Neutral: "bg-gray-50 text-gray-500 border-gray-200",
//   Opposition: "bg-red-50 text-red-600 border-red-200",
//   Undecided: "bg-yellow-50 text-yellow-600 border-yellow-200",
// };

// // ─── Static form fields (excl. constituency & booth) ──────────────────
// const VOTER_FORM_FIELDS = [
//   { name: "firstName", label: "First Name *", type: "text", required: true },
//   { name: "middleName", label: "Middle Name", type: "text" },
//   { name: "lastName", label: "Last Name", type: "text" },
//   { name: "voterId", label: "Voter ID (EPIC)", type: "text" },
//   { name: "aadhaar", label: "Aadhaar", type: "text" },
//   { name: "phone", label: "Phone", type: "text" },
//   { name: "altPhone", label: "Alternate Phone", type: "text" },
//   { name: "email", label: "Email", type: "email" },
//   { name: "age", label: "Age", type: "number" },
//   { name: "dob", label: "Date of Birth", type: "date" },
//   { name: "gender", label: "Gender", type: "select", options: [
//       { value: "Male", label: "Male" },
//       { value: "Female", label: "Female" },
//       { value: "Other", label: "Other" }
//   ]},
//   { name: "caste", label: "Caste", type: "text" },
//   { name: "religion", label: "Religion", type: "text" },
//   { name: "occupation", label: "Occupation", type: "text" },
//   { name: "education", label: "Education", type: "text" },
//   { name: "addressLine1", label: "Address Line 1", type: "text" },
//   { name: "village", label: "Village", type: "text" },
//   { name: "postOffice", label: "Post Office", type: "text" },
//   { name: "pincode", label: "PIN Code", type: "text", maxLength: 6 },
//   { name: "supportLevel", label: "Support Level", type: "select",
//     options: SUPPORT_LEVELS.map(s => ({ value: s, label: s })) },
//   { name: "influenceRating", label: "Influence (1-5)", type: "number", min: 1, max: 5 },
//   { name: "tags", label: "Tags (comma separated)", type: "text" },
//   { name: "membershipNumber", label: "Membership No.", type: "text" },
// ];

// // ─── Searchable Select Component (Typeahead) ──────────────────────────
// function SearchableSelect({ options, value, onChange, placeholder, disabled, className }) {
//   const [isOpen, setIsOpen] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const filtered = options.filter(opt =>
//     opt.label.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const handleSelect = (opt) => {
//     onChange(opt.value);
//     setIsOpen(false);
//     setSearchTerm("");
//   };

//   const selectedOption = options.find(o => o.value === value);

//   return (
//     <div className={`relative ${className || ""}`}>
//       <div
//         className={`w-full py-2.5 px-4 rounded-xl border text-sm flex items-center justify-between cursor-pointer ${
//           disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-gray-200"
//         }`}
//         onClick={() => !disabled && setIsOpen(!isOpen)}
//       >
//         <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
//           {selectedOption ? selectedOption.label : placeholder}
//         </span>
//         {isOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
//       </div>
//       {isOpen && !disabled && (
//         <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
//           <div className="p-2">
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Search..."
//               className="w-full py-1.5 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
//               onClick={(e) => e.stopPropagation()}
//             />
//           </div>
//           {filtered.length === 0 ? (
//             <p className="p-3 text-xs text-gray-400 text-center">No options</p>
//           ) : (
//             filtered.map(opt => (
//               <div
//                 key={opt.value}
//                 className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
//                   opt.value === value ? "bg-indigo-50 font-semibold" : ""
//                 }`}
//                 onClick={() => handleSelect(opt)}
//               >
//                 {opt.label}
//               </div>
//             ))
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// export default function VotersPage() {
//   const [voters, setVoters] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [search, setSearch] = useState("");
//   const [filters, setFilters] = useState({
//     supportLevel: "", caste: "", gender: ""
//   });

//   const [modalOpen, setModalOpen] = useState(false);
//   const [form, setForm] = useState({});
//   const [editingId, setEditingId] = useState(null);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   // Constituency & Booth data
//   const [constituencyOptions, setConstituencyOptions] = useState([]); // {value, label}
//   const [boothOptions, setBoothOptions] = useState([]);              // {value, label}
//   const [selectedConstituencyId, setSelectedConstituencyId] = useState("");

//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ─── Fetch voters ────────────────────────────────────────────────────
//   const fetchVoters = useCallback(async () => {
//     if (!token) return;
//     setLoading(true);
//     try {
//       const params = new URLSearchParams();
//       if (search) params.set("search", search);
//       Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

//       const { data } = await axios.get(`/api/election/voter?${params.toString()}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setVoters(data.success ? data.data : []);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   }, [token, search, filters]);

//   // ─── Fetch constituencies & transform to options ─────────────────────
//   const fetchConstituencyOptions = useCallback(async () => {
//     if (!token) return;
//     try {
//       const { data } = await axios.get("/api/election/constituency", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) {
//         setConstituencyOptions(data.data.map(c => ({ value: c._id, label: c.name })));
//       }
//     } catch (e) { console.error(e); }
//   }, [token]);

//   // ─── Load booths for a given constituency ────────────────────────────
//   const loadBoothOptions = async (constituencyId) => {
//     if (!token || !constituencyId) {
//       setBoothOptions([]);
//       return;
//     }
//     try {
//       const { data } = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) {
//         setBoothOptions(data.data.map(b => ({
//           value: b._id,
//           label: `${b.boothNumber} - ${b.name || ""}`
//         })));
//       }
//     } catch (e) { console.error(e); }
//   };

//   useEffect(() => {
//     fetchVoters();
//     fetchConstituencyOptions();
//   }, [fetchVoters, fetchConstituencyOptions]);

//   // ─── Form helpers ────────────────────────────────────────────────────
//   const resetForm = () => {
//     setForm({});
//     setEditingId(null);
//     setError("");
//     setSelectedConstituencyId("");
//     setBoothOptions([]);
//   };

//   const openAdd = () => {
//     resetForm();
//     setModalOpen(true);
//   };

//   const openEdit = (voter) => {
//     setEditingId(voter._id);
//     const boothId = voter.booth?._id || "";
//     const constituencyId = voter.booth?.constituency?._id || "";

//     setSelectedConstituencyId(constituencyId);
//     setForm({
//       firstName: voter.firstName || "",
//       middleName: voter.middleName || "",
//       lastName: voter.lastName || "",
//       voterId: voter.voterId || "",
//       aadhaar: voter.aadhaar || "",
//       phone: voter.phone || "",
//       altPhone: voter.altPhone || "",
//       email: voter.email || "",
//       age: voter.age || "",
//       dob: voter.dob ? new Date(voter.dob).toISOString().split("T")[0] : "",
//       gender: voter.gender || "",
//       caste: voter.caste || "",
//       religion: voter.religion || "",
//       occupation: voter.occupation || "",
//       education: voter.education || "",
//       addressLine1: voter.address?.line1 || "",
//       village: voter.address?.village || "",
//       postOffice: voter.address?.postOffice || "",
//       pincode: voter.address?.pincode || "",
//       supportLevel: voter.supportLevel || "",
//       influenceRating: voter.influenceRating || "",
//       tags: voter.tags?.join(", ") || "",
//       membershipNumber: voter.membershipNumber || "",
//       booth: boothId,
//     });

//     if (constituencyId) loadBoothOptions(constituencyId);
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setModalOpen(false);
//     resetForm();
//   };

//   const handleFieldChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));
//   };

//   // ─── Constituency selection (searchable) ─────────────────────────────
//   const handleConstituencyChange = (value) => {
//     setSelectedConstituencyId(value);
//     setForm(prev => ({ ...prev, booth: "" }));
//     loadBoothOptions(value);
//   };

//   // ─── PIN auto‑fill (optional) ────────────────────────────────────────
//   const fetchCityStateFromPin = async (pin) => {
//     if (pin.length !== 6) return;
//     try {
//       const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
//       const data = await res.json();
//       if (data?.[0]?.Status === "Success") {
//         const post = data[0]?.PostOffice?.[0];
//         if (post) {
//           setForm(prev => ({
//             ...prev,
//             village: prev.village || post.Name || "",
//             postOffice: prev.postOffice || post.Name || "",
//           }));
//         }
//       }
//     } catch (e) { /* silent */ }
//   };

//   // ─── Submit ──────────────────────────────────────────────────────────
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.firstName || !form.booth) {
//       return setError("First Name and Booth are required.");
//     }
//     setSaving(true);
//     try {
//       const payload = {
//         firstName: form.firstName,
//         middleName: form.middleName || undefined,
//         lastName: form.lastName || undefined,
//         voterId: form.voterId || undefined,
//         aadhaar: form.aadhaar || undefined,
//         phone: form.phone || undefined,
//         altPhone: form.altPhone || undefined,
//         email: form.email || undefined,
//         age: form.age ? Number(form.age) : undefined,
//         dob: form.dob || undefined,
//         gender: form.gender || undefined,
//         caste: form.caste || undefined,
//         religion: form.religion || undefined,
//         occupation: form.occupation || undefined,
//         education: form.education || undefined,
//         address: {
//           line1: form.addressLine1 || "",
//           village: form.village || "",
//           postOffice: form.postOffice || "",
//           pincode: form.pincode || "",
//         },
//         booth: form.booth,
//         supportLevel: form.supportLevel || undefined,
//         influenceRating: form.influenceRating ? Number(form.influenceRating) : undefined,
//         tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
//         membershipNumber: form.membershipNumber || undefined,
//       };

//       if (editingId) {
//         await axios.put(`/api/election/voter?id=${editingId}`, payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         await axios.post("/api/election/voter", payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }
//       closeModal();
//       fetchVoters();
//     } catch (e) {
//       setError(e.response?.data?.message || "Error saving voter");
//     } finally { setSaving(false); }
//   };

//   // ─── Delete ──────────────────────────────────────────────────────────
//   const handleDelete = async (id) => {
//     if (!confirm("Delete this voter?")) return;
//     try {
//       await axios.delete(`/api/election/voter?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setVoters(prev => prev.filter(v => v._id !== id));
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to delete voter");
//     }
//   };

//   return (
//     <div className="max-w-screen-xl mx-auto">
//       {/* ─── Header ──────────────────────────────────────────────────── */}
//       <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Voters</h1>
//           <p className="text-sm text-gray-400 mt-0.5">{voters.length} records</p>
//         </div>
//         <button onClick={openAdd}
//           className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//           <FiPlus className="text-base" /> Add Voter
//         </button>
//       </div>

//       {/* ─── Search & Filters ────────────────────────────────────────── */}
//       <div className="flex flex-col sm:flex-row gap-3 mb-5">
//         <div className="relative flex-1">
//           <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
//           <input
//             className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//             value={search} onChange={e => setSearch(e.target.value)}
//             placeholder="Search name, Voter ID, phone..."
//           />
//         </div>
//         <div className="flex flex-wrap gap-2 items-center">
//           <select
//             value={filters.supportLevel}
//             onChange={e => setFilters(prev => ({ ...prev, supportLevel: e.target.value }))}
//             className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-indigo-100"
//           >
//             <option value="">All Support</option>
//             {SUPPORT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
//           </select>
//           <input
//             placeholder="Caste"
//             value={filters.caste}
//             onChange={e => setFilters(prev => ({ ...prev, caste: e.target.value }))}
//             className="py-2.5 px-3 w-24 rounded-xl border border-gray-200 text-sm"
//           />
//           <select
//             value={filters.gender}
//             onChange={e => setFilters(prev => ({ ...prev, gender: e.target.value }))}
//             className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white text-sm"
//           >
//             <option value="">All Gender</option>
//             <option value="Male">Male</option>
//             <option value="Female">Female</option>
//             <option value="Other">Other</option>
//           </select>
//         </div>
//       </div>

//       {/* ─── Voter Cards ──────────────────────────────────────────────── */}
//       {loading ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {Array(6).fill(0).map((_, i) => (
//             <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
//               <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
//               <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
//               <div className="flex gap-1.5">
//                 {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : voters.length === 0 ? (
//         <div className="flex flex-col items-center justify-center py-20 text-center">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
//             <FiUser className="text-3xl text-indigo-300" />
//           </div>
//           <p className="text-gray-400 font-medium">No voters yet</p>
//           <p className="text-sm text-gray-300 mt-1">Click &quot;Add Voter&quot; to start</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {voters.map(voter => (
//             <div key={voter._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
//               <div className="flex items-start justify-between mb-2">
//                 <div>
//                   <h3 className="text-base font-bold text-gray-900">
//                     {voter.firstName} {voter.middleName ? voter.middleName + " " : ""}{voter.lastName}
//                   </h3>
//                   {voter.voterId && <p className="text-sm text-gray-500">ID: {voter.voterId}</p>}
//                   {voter.phone && <p className="text-xs text-gray-400">{voter.phone}</p>}
//                 </div>
//                 <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
//                   <button onClick={() => openEdit(voter)}
//                     className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
//                     <FiEdit2 className="text-xs" />
//                   </button>
//                   <button onClick={() => handleDelete(voter._id)}
//                     className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
//                     <FiTrash2 className="text-xs" />
//                   </button>
//                 </div>
//               </div>
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${SUPPORT_COLORS[voter.supportLevel] || "bg-gray-50 text-gray-500"}`}>
//                   {voter.supportLevel}
//                 </span>
//                 {voter.booth?.name && (
//                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
//                     {voter.booth.name}
//                   </span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* ─── Voter Modal (Add / Edit) ─────────────────────────────────── */}
//       {modalOpen && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
//             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
//                   <FiUser className="text-white text-base" />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-bold text-gray-900">
//                     {editingId ? "Edit Voter" : "New Voter"}
//                   </h2>
//                   <p className="text-xs text-gray-400">Fields marked * are required</p>
//                 </div>
//               </div>
//               <button onClick={closeModal}
//                 className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all">
//                 <FiX />
//               </button>
//             </div>

//             <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
//               <div className="px-6 py-5 space-y-4">
//                 {error && (
//                   <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
//                     <FiX className="text-red-500" />
//                     <p className="text-sm text-red-600 font-medium">{error}</p>
//                   </div>
//                 )}

//                 {/* Constituency + Booth (both searchable) */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                       Constituency
//                     </label>
//                     <SearchableSelect
//                       options={constituencyOptions}
//                       value={selectedConstituencyId}
//                       onChange={handleConstituencyChange}
//                       placeholder="Search constituency..."
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                       Booth *
//                     </label>
//                     <SearchableSelect
//                       options={boothOptions}
//                       value={form.booth || ""}
//                       onChange={(val) => setForm(prev => ({ ...prev, booth: val }))}
//                       placeholder="Search booth..."
//                       disabled={!selectedConstituencyId}
//                     />
//                   </div>
//                 </div>

//                 {/* Other fields in a two‑column grid */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   {VOTER_FORM_FIELDS.map(field => {
//                     const extraProps = field.name === "pincode" ? {
//                       onChange: (e) => {
//                         handleFieldChange(e);
//                         fetchCityStateFromPin(e.target.value);
//                       },
//                       maxLength: 6,
//                     } : {};
//                     return (
//                       <div key={field.name} className={field.name === "addressLine1" ? "sm:col-span-2" : ""}>
//                         <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                           {field.label}
//                         </label>
//                         {field.type === "select" ? (
//                           <select
//                             name={field.name}
//                             value={form[field.name] || ""}
//                             onChange={handleFieldChange}
//                             required={field.required}
//                             className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
//                           >
//                             <option value="">Select...</option>
//                             {field.options?.map(opt => (
//                               <option key={opt.value} value={opt.value}>{opt.label}</option>
//                             ))}
//                           </select>
//                         ) : (
//                           <input
//                             name={field.name}
//                             type={field.type}
//                             value={form[field.name] || ""}
//                             onChange={field.name === "pincode" ? extraProps.onChange : handleFieldChange}
//                             required={field.required}
//                             min={field.min}
//                             max={field.max}
//                             maxLength={extraProps.maxLength}
//                             className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//                             placeholder={`Enter ${field.label.replace(" *","")}`}
//                           />
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
//                 <button type="button" onClick={closeModal}
//                   className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
//                   Cancel
//                 </button>
//                 <button type="submit" disabled={saving}
//                   className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
//                     saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
//                   }`}>
//                   {saving ? (
//                     <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
//                   ) : (
//                     <><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }