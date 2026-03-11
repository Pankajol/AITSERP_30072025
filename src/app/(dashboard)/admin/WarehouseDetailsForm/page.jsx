"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import CountryStateSearch from "@/components/CountryStateSearch";
import { toast } from "react-toastify";
import {
  FaPlus, FaTrash, FaSearch, FaChevronDown, FaChevronRight,
  FaTimes, FaWarehouse, FaBoxOpen, FaExclamationCircle, FaCheck
} from "react-icons/fa";

const EMPTY_WH = {
  warehouseCode: "", warehouseName: "", parentWarehouse: "",
  account: "", company: "", phoneNo: "", mobileNo: "",
  addressLine1: "", addressLine2: "", city: "", state: "", pin: "",
  warehouseType: "", defaultInTransit: false, country: "",
};

const EMPTY_BIN = {
  code: "", aisle: "", rack: "", bin: "", maxCapacity: "", warehouseCode: "",
};

export default function WarehouseDetailsForm() {
  const [warehouses,   setWarehouses]   = useState([]);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [listLoading,  setListLoading]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [isBinForm,    setIsBinForm]    = useState(false);
  const [modalTitle,   setModalTitle]   = useState("");
  const [expanded,     setExpanded]     = useState({});
  const [formData,     setFormData]     = useState({ ...EMPTY_WH });
  const [errs,         setErrs]         = useState({});

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    setListLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setWarehouses(res.data.data);
    } catch { toast.error("Failed to fetch warehouses"); }
    setListLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (errs[name]) setErrs(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleSelectCountry = (c) => setFormData(p => ({ ...p, country: c?.name || "", state: "" }));
  const handleSelectState   = (s) => setFormData(p => ({ ...p, state:   s?.name || "" }));

  const fetchPin = async (pin) => {
    if (pin.length !== 6) return;
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0]?.PostOffice?.[0];
        if (!post) return;
        setFormData(p => ({
          ...p,
          city:    post.District || p.city,
          state:   post.State    || p.state,
          country: "India",
        }));
        toast.success("City, State & Country auto-filled!");
      }
    } catch { }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const validate = () => {
    const e = {};
    if (isBinForm) {
      ["code", "aisle", "rack", "bin", "maxCapacity"].forEach(f => { if (!formData[f]) e[f] = "Required"; });
    } else {
      ["warehouseCode","warehouseName","account","company","phoneNo","addressLine1","city","state","pin","country","warehouseType"]
        .forEach(f => { if (!formData[f]) e[f] = "Required"; });
      if (formData.phoneNo && !/^\d{10}$/.test(formData.phoneNo)) e.phoneNo = "Must be 10 digits";
      if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) e.mobileNo = "Must be 10 digits";
      if (formData.pin && !/^\d{6}$/.test(formData.pin)) e.pin = "Must be 6 digits";
    }
    setErrs(e);
    if (Object.keys(e).length) { toast.error("Please fill all required fields"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (isBinForm) {
        const res = await axios.post(`/api/warehouse/${formData.warehouseCode}/bins`, formData, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { toast.success("Bin added!"); closeModal(); fetchWarehouses(); }
      } else {
        const res = await axios.post("/api/warehouse", formData, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { toast.success("Warehouse added!"); closeModal(); fetchWarehouses(); }
      }
    } catch { toast.error("Failed to save"); }
    setLoading(false);
  };

  const deleteWarehouse = async (id) => {
    if (!confirm("Delete this warehouse?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/warehouse?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Deleted!"); fetchWarehouses();
    } catch { toast.error("Failed to delete"); }
  };

  const openMainModal = () => {
    setFormData({ ...EMPTY_WH }); setIsBinForm(false);
    setModalTitle("Add Warehouse"); setErrs({}); setModalOpen(true);
  };

  const openBinModal = (wh) => {
    setFormData({ ...EMPTY_BIN, warehouseCode: wh.warehouseCode });
    setIsBinForm(true); setModalTitle(`Add Bin — ${wh.warehouseName}`);
    setErrs({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setErrs({}); };

  const filtered = warehouses.filter(w =>
    w.warehouseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.warehouseType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total:    warehouses.length,
    bins:     warehouses.reduce((a, w) => a + (w.binLocations?.length || 0), 0),
    transit:  warehouses.filter(w => w.defaultInTransit).length,
    types:    [...new Set(warehouses.map(w => w.warehouseType).filter(Boolean))].length,
  };

  // ── UI helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k]
       ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300"
       : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Warehouses</h1>
            <p className="text-sm text-gray-400 mt-0.5">{warehouses.length} total warehouses</p>
          </div>
          <button onClick={openMainModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaPlus className="text-xs" /> Add Warehouse
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Warehouses", value: stats.total,   emoji: "🏭" },
            { label: "Total Bins",       value: stats.bins,    emoji: "📦" },
            { label: "In Transit",       value: stats.transit, emoji: "🚚" },
            { label: "Types",            value: stats.types,   emoji: "🗂️"  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 border-2 border-transparent shadow-sm hover:-translate-y-0.5 hover:border-indigo-100 transition-all cursor-default">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search warehouses…" />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Code", "Warehouse Name", "Type", "City", "Phone", "Bins", "Transit", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(9).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">🏭</div>
                    <p className="text-sm font-medium text-gray-300">
                      {searchTerm ? "No warehouses match your search" : "No warehouses yet — add your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(wh => (
                  <React.Fragment key={wh._id}>
                    {/* Warehouse Row */}
                    <tr className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">

                      {/* Expand toggle */}
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => toggleExpand(wh._id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs
                            ${wh.binLocations?.length
                              ? "bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white cursor-pointer"
                              : "bg-gray-50 text-gray-200 cursor-default"}`}
                          disabled={!wh.binLocations?.length}>
                          {expanded[wh._id] ? <FaChevronDown /> : <FaChevronRight />}
                        </button>
                      </td>

                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{wh.warehouseCode}</span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 text-sm">{wh.warehouseName}</p>
                        <p className="text-xs text-gray-400">{wh.company}</p>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        {wh.warehouseType
                          ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{wh.warehouseType}</span>
                          : <span className="text-gray-200">—</span>}
                      </td>

                      {/* City */}
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{wh.city || <span className="text-gray-200">—</span>}</td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{wh.phoneNo || <span className="text-gray-200">—</span>}</td>

                      {/* Bin count */}
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full
                          ${wh.binLocations?.length ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                          {wh.binLocations?.length || 0} bins
                        </span>
                      </td>

                      {/* Transit */}
                      <td className="px-4 py-3">
                        {wh.defaultInTransit
                          ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">✓ Transit</span>
                          : <span className="text-gray-200 text-xs">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openBinModal(wh)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white text-xs font-semibold transition-all">
                            <FaPlus className="text-[9px]" /> Bin
                          </button>
                          <button onClick={() => deleteWarehouse(wh._id)}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded Bins ── */}
                    {expanded[wh._id] && wh.binLocations?.length > 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 pb-3 bg-gray-50/60">
                          <div className="rounded-xl border border-gray-200 overflow-hidden mt-1">
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600">
                              <FaBoxOpen className="text-white text-xs" />
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-white">
                                Bin Locations — {wh.warehouseName}
                              </span>
                              <span className="ml-auto text-[10px] text-indigo-200 font-semibold">{wh.binLocations.length} bins</span>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                  {["Bin Code", "Aisle", "Rack", "Bin", "Max Capacity"].map(h => (
                                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {wh.binLocations.map((bin, i) => (
                                  <tr key={bin._id || i} className="border-b border-gray-100 last:border-0 hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-3 py-2">
                                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{bin.code}</span>
                                    </td>
                                    <td className="px-3 py-2 font-medium text-gray-600">{bin.aisle || "—"}</td>
                                    <td className="px-3 py-2 font-medium text-gray-600">{bin.rack || "—"}</td>
                                    <td className="px-3 py-2 font-medium text-gray-600">{bin.bin || "—"}</td>
                                    <td className="px-3 py-2">
                                      <span className="font-semibold text-gray-700">{bin.maxCapacity}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ── MODAL — Add Warehouse / Bin ──
      ══════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                {isBinForm ? <FaBoxOpen className="text-sm" /> : <FaWarehouse className="text-sm" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{modalTitle}</h3>
                <p className="text-xs text-gray-400">{isBinForm ? "Fill bin location details" : "Fill warehouse details"}</p>
              </div>
              <button onClick={closeModal}
                className="ml-auto w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {isBinForm ? (
                /* ── Bin Form ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { k: "code",        l: "Bin Code",     ph: "e.g. BIN-001" },
                    { k: "aisle",       l: "Aisle",        ph: "e.g. A" },
                    { k: "rack",        l: "Rack",         ph: "e.g. R1" },
                    { k: "bin",         l: "Bin",          ph: "e.g. B1" },
                    { k: "maxCapacity", l: "Max Capacity", ph: "e.g. 100" },
                  ].map(f => (
                    <div key={f.k}>
                      <Lbl text={f.l} req />
                      <input className={fi(f.k)} name={f.k} value={formData[f.k] || ""} onChange={handleChange} placeholder={f.ph} />
                      <Err k={f.k} />
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Warehouse Form ── */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Lbl text="Warehouse Code" req />
                      <input className={fi("warehouseCode")} name="warehouseCode" value={formData.warehouseCode} onChange={handleChange} placeholder="e.g. WH001" />
                      <Err k="warehouseCode" />
                    </div>
                    <div>
                      <Lbl text="Warehouse Name" req />
                      <input className={fi("warehouseName")} name="warehouseName" value={formData.warehouseName} onChange={handleChange} placeholder="e.g. Main Warehouse" />
                      <Err k="warehouseName" />
                    </div>
                    <div>
                      <Lbl text="Account" req />
                      <input className={fi("account")} name="account" value={formData.account} onChange={handleChange} placeholder="Account name" />
                      <Err k="account" />
                    </div>
                    <div>
                      <Lbl text="Company" req />
                      <input className={fi("company")} name="company" value={formData.company} onChange={handleChange} placeholder="Company name" />
                      <Err k="company" />
                    </div>
                    <div>
                      <Lbl text="Phone No." req />
                      <input className={fi("phoneNo")} name="phoneNo" type="text" maxLength={10} value={formData.phoneNo} onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) handleChange(e); }} placeholder="10-digit number" />
                      <Err k="phoneNo" />
                    </div>
                    <div>
                      <Lbl text="Mobile No." />
                      <input className={fi("mobileNo")} name="mobileNo" type="text" maxLength={10} value={formData.mobileNo} onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) handleChange(e); }} placeholder="10-digit number" />
                      <Err k="mobileNo" />
                    </div>
                    <div>
                      <Lbl text="Address Line 1" req />
                      <input className={fi("addressLine1")} name="addressLine1" value={formData.addressLine1} onChange={handleChange} placeholder="Street / Building" />
                      <Err k="addressLine1" />
                    </div>
                    <div>
                      <Lbl text="Address Line 2" />
                      <input className={fi("")} name="addressLine2" value={formData.addressLine2} onChange={handleChange} placeholder="Area / Landmark" />
                    </div>
                    <div>
                      <Lbl text="City" req />
                      <input className={fi("city")} name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                      <Err k="city" />
                    </div>
                    <div>
                      <Lbl text="PIN Code" req />
                      <input
                        className={fi("pin")} name="pin" type="number" maxLength={6}
                        value={formData.pin}
                        onChange={e => {
                          const val = e.target.value;
                          handleChange(e);
                          fetchPin(val);
                        }}
                        placeholder="6-digit PIN (auto-fills city & state)"
                      />
                      <Err k="pin" />
                      {formData.pin?.length === 6 && !errs.pin && formData.city && (
                        <p className="text-[11px] text-emerald-500 font-medium mt-1">✓ Auto-filled: {formData.city}, {formData.state}</p>
                      )}
                    </div>
                    <div>
                      <Lbl text="Warehouse Type" req />
                      <select className={fi("warehouseType")} name="warehouseType" value={formData.warehouseType} onChange={handleChange}>
                        <option value="">Select type…</option>
                        <option value="Main">Main</option>
                        <option value="Transit">Transit</option>
                        <option value="Cold Storage">Cold Storage</option>
                        <option value="Bonded">Bonded</option>
                        <option value="Distribution">Distribution</option>
                      </select>
                      <Err k="warehouseType" />
                    </div>
                  </div>

                  {/* Country/State */}
                  <div>
                    <Lbl text="Country & State" req />
                    <CountryStateSearch
                      valueCountry={formData.country ? { name: formData.country } : null}
                      valueState={formData.state   ? { name: formData.state }   : null}
                      onSelectCountry={handleSelectCountry}
                      onSelectState={handleSelectState}
                    />
                    {(errs.country || errs.state) && (
                      <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500 font-medium"><FaExclamationCircle className="text-[10px]" /> Country and State are required</p>
                    )}
                  </div>

                  {/* Default In Transit toggle */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, defaultInTransit: !p.defaultInTransit }))}
                      className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${formData.defaultInTransit ? "bg-indigo-500" : "bg-gray-200"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.defaultInTransit ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Default In Transit</p>
                      <p className="text-xs text-gray-400">Enable for transit/temporary holding warehouse</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button onClick={closeModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-300 transition-all">
                <FaTimes className="text-xs" /> Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : <><FaCheck className="text-xs" /> {isBinForm ? "Add Bin" : "Add Warehouse"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}


// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const WarehouseDetailsForm = () => {
//   const initialWarehouseData = {
//     warehouseCode: "",
//     warehouseName: "",
//     parentWarehouse: "",
//     account: "",
//     company: "",
//     phoneNo: "",
//     mobileNo: "",
//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//     country: "",
//   };

//   const initialBinData = {
//     code: "",
//     aisle: "",
//     rack: "",
//     bin: "",
//     maxCapacity: "",
//     parentWarehouse: "",
//   };

//   const [formData, setFormData] = useState(initialWarehouseData);
//   const [isBinForm, setIsBinForm] = useState(false);

//   const [warehouses, setWarehouses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [listLoading, setListLoading] = useState(false);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalTitle, setModalTitle] = useState("Add Warehouse");

//   const [selectedParent, setSelectedParent] = useState(null);
//    const [expanded, setExpanded] = useState({});
//   // Fetch warehouses
//   const fetchWarehouses = async () => {
//     setListLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/warehouse", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) setWarehouses(res.data.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setListLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchWarehouses();
//   }, []);

//   // Form change
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
//   };


//    const toggleExpand = (id) => {
//     setExpanded((prev) => ({
//       ...prev,
//       [id]: !prev[id],
//     }));
//   };

//   const handleSelectCountry = (country) =>
//     setFormData((prev) => ({ ...prev, country: country?._id || "", state: "" }));

//   const handleSelectState = (state) =>
//     setFormData((prev) => ({ ...prev, state: state?._id || "" }));

//   const validateForm = () => {
//     if (isBinForm) {
//       const required = ["code", "aisle", "rack", "bin", "maxCapacity"];
//       const missing = required.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all bin fields.");
//         return false;
//       }
//       return true;
//     } else {
//       const requiredFields = [
//         "warehouseCode",
//         "warehouseName",
//         "account",
//         "company",
//         "phoneNo",
//         "addressLine1",
//         "city",
//         "state",
//         "pin",
//         "country",
//         "warehouseType",
//       ];
//       const missing = requiredFields.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all required fields.");
//         return false;
//       }
//       if (!/^\d{10}$/.test(formData.phoneNo)) {
//         toast.error("Phone must be 10 digits.");
//         return false;
//       }
//       if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
//         toast.error("Mobile must be 10 digits.");
//         return false;
//       }
//       if (!/^\d{6}$/.test(formData.pin)) {
//         toast.error("PIN must be 6 digits.");
//         return false;
//       }
//       return true;
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");

//       if (isBinForm) {
//         // 👉 Save Bin
//         const res = await axios.post(
//           `/api/warehouse/${formData.parentWarehouse}/bins`,
//           formData,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (res.data.success) {
//           toast.success("Bin added successfully!");
//           setFormData(initialBinData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       } else {
//         // 👉 Save Main Warehouse
//         const res = await axios.post("/api/warehouse", formData, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           toast.success("Warehouse added successfully!");
//           setFormData(initialWarehouseData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       }
//       setSelectedParent(null);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deleteWarehouse = async (id) => {
//     if (!confirm("Are you sure you want to delete this warehouse?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/warehouse?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       toast.success("Deleted successfully!");
//       fetchWarehouses();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete warehouse");
//     }
//   };

//   // Open modal for main warehouse
//   const openMainModal = () => {
//     setModalTitle("Add Warehouse");
//     setFormData(initialWarehouseData);
//     setIsBinForm(false);
//     setSelectedParent(null);
//     setModalOpen(true);
//   };

//   // Open modal for sub-warehouse/bin
//   const openSubModal = (parent) => {
//     setModalTitle(`Add Bin for ${parent.warehouseName}`);
//     setFormData({ ...initialBinData, parentWarehouse: parent._id });
//     setSelectedParent(parent);
//     setIsBinForm(true);
//     setModalOpen(true);
//   };

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <button
//         onClick={openMainModal}
//         className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
//       >
//         Add Warehouse
//       </button>

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//           <div className="bg-white w-full max-w-3xl p-6 m-48 rounded shadow-lg relative max-h-[80vh] overflow-y-auto">
//             <button
//               onClick={() => setModalOpen(false)}
//               className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-semibold mb-4">{modalTitle}</h2>

//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-1 md:grid-cols-2 gap-4"
//             >
//               {isBinForm ? (
//                 <>
//                   <InputField
//                     label="Bin Code"
//                     name="code"
//                     value={formData.code}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Aisle"
//                     name="aisle"
//                     value={formData.aisle}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Rack"
//                     name="rack"
//                     value={formData.rack}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Bin"
//                     name="bin"
//                     value={formData.bin}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Max Capacity"
//                     name="maxCapacity"
//                     value={formData.maxCapacity}
//                     onChange={handleChange}
//                   />
//                 </>
//               ) : (
//                 <>
//                   <InputField
//                     label="Warehouse Code"
//                     name="warehouseCode"
//                     value={formData.warehouseCode}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Warehouse Name"
//                     name="warehouseName"
//                     value={formData.warehouseName}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Account"
//                     name="account"
//                     value={formData.account}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Company"
//                     name="company"
//                     value={formData.company}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Phone"
//                     name="phoneNo"
//                     value={formData.phoneNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Mobile"
//                     name="mobileNo"
//                     value={formData.mobileNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 1"
//                     name="addressLine1"
//                     value={formData.addressLine1}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 2"
//                     name="addressLine2"
//                     value={formData.addressLine2}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="City"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="PIN"
//                     name="pin"
//                     value={formData.pin}
//                     onChange={handleChange}
//                   />
//                   <div className="col-span-2">
//                     <CountryStateSearch
//                       valueCountry={formData.country}
//                       valueState={formData.state}
//                       onSelectCountry={handleSelectCountry}
//                       onSelectState={handleSelectState}
//                     />
//                   </div>
//                   <InputField
//                     label="Warehouse Type"
//                     name="warehouseType"
//                     value={formData.warehouseType}
//                     onChange={handleChange}
//                   />
//                   <div className="flex items-center col-span-2">
//                     <input
//                       type="checkbox"
//                       name="defaultInTransit"
//                       checked={formData.defaultInTransit}
//                       onChange={handleChange}
//                       className="mr-2"
//                     />
//                     <label>Default In Transit</label>
//                   </div>
//                 </>
//               )}
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="col-span-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
//               >
//                 {loading ? "Saving..." : "Save"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Warehouse List */}
//   <h2 className="text-xl font-semibold mt-6 mb-2">Warehouse List</h2>
//       {listLoading ? (
//         <p>Loading...</p>
//       ) : (
//         <table className="min-w-full border border-gray-300">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="border px-3 py-1">Code</th>
//               <th className="border px-3 py-1">Name</th>
//               <th className="border px-3 py-1">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {warehouses.map((wh) => (
//               <React.Fragment key={wh._id}>
//                 {/* Warehouse row */}
//                 <tr className="bg-white">
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {expanded[wh._id] ? "▼ " : "▶ "} {wh.warehouseCode}
//                   </td>
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {wh.warehouseName}
//                   </td>
//                   <td className="border px-3 py-1 flex gap-2">
//                     <button
//                       onClick={() => openSubModal(wh)}
//                       className="bg-green-500 text-white px-2 py-1 rounded"
//                     >
//                       Add Bin
//                     </button>
//                     <button
//                       onClick={() => deleteWarehouse(wh._id)}
//                       className="bg-red-500 text-white px-2 py-1 rounded"
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>

//                 {/* Expanded Bin rows */}
//                 {expanded[wh._id] && wh.binLocations && wh.binLocations.length > 0 && (
//                   <tr>
//                     <td colSpan="3" className="p-0">
//                       <table className="w-full border border-gray-200 ml-6">
//                         <thead>
//                           <tr className="bg-gray-50 text-sm">
//                             <th className="border px-2 py-1">Bin Code</th>
//                             <th className="border px-2 py-1">Aisle</th>
//                             <th className="border px-2 py-1">Rack</th>
//                             <th className="border px-2 py-1">Bin</th>
//                             <th className="border px-2 py-1">Max Capacity</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {wh.binLocations.map((bin) => (
//                             <tr key={bin._id} className="text-sm">
//                               <td className="border px-2 py-1">{bin.code}</td>
//                               <td className="border px-2 py-1">{bin.aisle || "-"}</td>
//                               <td className="border px-2 py-1">{bin.rack || "-"}</td>
//                               <td className="border px-2 py-1">{bin.bin || "-"}</td>
//                               <td className="border px-2 py-1">{bin.maxCapacity}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             ))}
//           </tbody>
//         </table>
//       )}

//     </div>
//   );
// };

// // Reusable Input Component
// const InputField = ({ label, name, value, onChange, disabled }) => (
//   <div>
//     <label className="block text-sm font-medium">{label}</label>
//     <input
//       type="text"
//       name={name}
//       value={value}
//       onChange={onChange}
//       disabled={disabled}
//       className={`mt-1 p-2 w-full border rounded ${disabled ? "bg-gray-100" : ""}`}
//     />
//   </div>
// );

// export default WarehouseDetailsForm;
