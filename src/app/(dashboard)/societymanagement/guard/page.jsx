"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// ── Icons ─────────────────────────────────────────────────────────
const Icons = {
  Shield:      () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Clock:       () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Truck:       () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Building:    () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  LogIn:       () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  LogOut:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  MapPin:      () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  ChevronDown: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Check:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Refresh:     () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Search:      () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  User:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Phone:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Car:         () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  X:           () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Exit:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>,
};

// ── Constants ─────────────────────────────────────────────────────
const GATE_PURPOSE_OPTIONS     = ["Delivery","Visitor","Milk","Newspaper","Maintenance","Guest","Other"];
const BUILDING_PURPOSE_OPTIONS = ["Cleaning","Repair","Inspection","Delivery","Visitor","Other"];
const PERSON_TYPES  = ["Milkman","Newspaper","Delivery Person","Guest","Staff","Worker","Resident","Maintenance","Other"];
const CATEGORIES    = ["Person","Bike","Car","Truck","Other"];

const EMPTY_GATE_FORM     = { personName:"", phone:"", vehicleNumber:"", category:"Person", purpose:"" };
const EMPTY_BUILDING_FORM = (buildingName = "") => ({ buildingName, flatId:"", personName:"", personType:"Staff", phone:"", purpose:"" });

// ── Validators ────────────────────────────────────────────────────
const validators = {
  phone: (v) => {
    if (!v) return null;
    if (!/^\d+$/.test(v))  return "Only digits allowed";
    if (v.length < 7)      return "Too short (min 7 digits)";
    if (v.length > 15)     return "Too long (max 15 digits)";
    return null;
  },
  vehicleNumber: (v) => {
    if (!v) return null;
    if (v.length > 20)                       return "Too long (max 20 chars)";
    if (!/^[A-Za-z0-9\s\-]+$/.test(v))      return "Only letters, numbers & hyphens";
    return null;
  },
  personName: (v) => {
    if (!v?.trim())                            return "Person name is required";
    if (v.trim().length < 2)                   return "Too short (min 2 chars)";
    if (v.trim().length > 60)                  return "Too long (max 60 chars)";
    if (!/^[A-Za-z\s\-'.]+$/.test(v.trim()))  return "Only letters, spaces & hyphens";
    return null;
  },
};

// ── Active-entry filter ───────────────────────────────────────────
// An IN entry is "active" when no OUT exists with the same personName+contact AFTER its timestamp.
function filterActiveEntries(allEntries) {
  const getContact = (e) => (e.contactNumber || e.phone || "").trim();

  const inEntries  = allEntries.filter(e => e.entryType === "IN");
  const outEntries = allEntries.filter(e => e.entryType === "OUT");

  return inEntries.filter(inE => {
    const key    = `${(inE.personName || "").trim().toLowerCase()}::${getContact(inE)}`;
    const inTime = new Date(inE.timestamp).getTime();

    const hasLaterOut = outEntries.some(outE => {
      const outKey  = `${(outE.personName || "").trim().toLowerCase()}::${getContact(outE)}`;
      const outTime = new Date(outE.timestamp).getTime();
      return outKey === key && outTime > inTime;
    });

    return !hasLaterOut;
  });
}

// ── Reusable UI Components ────────────────────────────────────────
function RippleButton({ children, onClick, className = "", disabled = false, type = "button" }) {
  const [ripples, setRipples] = useState([]);
  const handle = (e) => {
    const r  = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
    setTimeout(() => setRipples(p => p.filter(x => x.id !== id)), 600);
    if (onClick) onClick(e);
  };
  return (
    <button type={type} disabled={disabled} onClick={handle} className={`relative overflow-hidden select-none ${className}`}>
      {ripples.map(rp => (
        <span key={rp.id} style={{ left: rp.x, top: rp.y }}
          className="absolute pointer-events-none rounded-full bg-white/40 animate-ping w-5 h-5 -translate-x-2.5 -translate-y-2.5" />
      ))}
      {children}
    </button>
  );
}

function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function StatusDot({ active }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-500" : "bg-red-400"}`}/>
    </span>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    if (message) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-[90vw] border ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
      {message.type === "success" ? <Icons.Check /> : <Icons.Alert />}
      {message.text}
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><Icons.X /></button>
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-[11px] font-bold tracking-widest uppercase text-gray-600">{label}</label>
        {required && <span className="text-indigo-500 text-xs font-bold">*</span>}
      </div>
      {children}
      {error
        ? <div className="flex items-center gap-1.5 text-red-500"><Icons.Alert /><span className="text-[11px] font-medium">{error}</span></div>
        : hint && <p className="text-[11px] text-gray-500">{hint}</p>
      }
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", icon, error, onBlur, className = "" }) {
  const [focused, setFocused] = useState(false);
  const handleChange = (e) => {
    let v = e.target.value;
    if (type === "tel") v = v.replace(/\D/g, "");
    onChange({ target: { value: v } });
  };
  return (
    <div className={`relative rounded-xl border transition-all duration-150
      ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
      ${error ? "border-red-400 ring-2 ring-red-50" : ""} bg-white`}>
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
      <input
        type={type === "tel" ? "tel" : "text"}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { setFocused(false); if (onBlur) onBlur(e); }}
        className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400 py-3 pr-3 rounded-xl outline-none border-0 ${icon ? "pl-9" : "pl-3.5"} ${className}`}
      />
    </div>
  );
}

function Select({ value, onChange, options, placeholder, error, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`relative rounded-xl border bg-white transition-all duration-150
      ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
      ${error ? "border-red-400 ring-2 ring-red-50" : ""}`}>
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</div>}
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full appearance-none bg-transparent text-sm py-3 pr-8 rounded-xl outline-none border-0 ${value ? "text-gray-900" : "text-gray-400"} ${icon ? "pl-9" : "pl-3.5"}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Icons.ChevronDown /></div>
    </div>
  );
}

function AutoSuggestInput({ value, onChange, suggestions = [], placeholder, error, onSelect, icon, onBlur }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  const filtered = value.trim()
    ? suggestions.filter(s => (s.label || s).toLowerCase().includes(value.toLowerCase()))
    : suggestions.slice(0, 8);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelect = (item) => {
    const label = typeof item === "object" ? item.label : item;
    onChange({ target: { value: label } });
    if (onSelect && item.data) onSelect(item.data);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className={`relative rounded-xl border bg-white transition-all duration-150
        ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
        ${error ? "border-red-400 ring-2 ring-red-50" : ""}`}>
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={(e) => { setFocused(false); if (onBlur) onBlur(e); }}
          className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400 py-3 pr-3 rounded-xl outline-none border-0 ${icon ? "pl-9" : "pl-3.5"}`}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map((item, i) => (
            <button key={i} type="button" onClick={() => handleSelect(item)}
              className="w-full text-left px-3.5 py-2.5 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
              {typeof item === "object" ? item.label : item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlatSelector({ flats, selectedFlatId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered      = flats.filter(f => f.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = selectedFlatId ? flats.find(f => f.value === selectedFlatId)?.label : null;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3.5 py-3 bg-white rounded-xl border text-sm transition-all duration-150 ${open ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300 hover:border-gray-400"}`}>
        <span className={selectedLabel ? "text-gray-900 font-medium" : "text-gray-400"}>{selectedLabel || "Select flat number"}</span>
        <div className="flex items-center gap-1.5">
          {selectedFlatId && (
            <span onClick={e => { e.stopPropagation(); onSelect(""); }} className="text-gray-400 hover:text-red-400 transition-colors p-0.5">
              <Icons.X />
            </span>
          )}
          <span className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}><Icons.ChevronDown /></span>
        </div>
      </button>
      {open && (
        <div className="absolute z-[60] mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
              <input type="text" placeholder="Search flat..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-400"/>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-2 max-h-40 overflow-y-auto">
            {filtered.length === 0
              ? <p className="col-span-4 text-center text-xs text-gray-500 py-3">No flats found</p>
              : filtered.map(flat => (
                  <button key={flat.value} type="button" onClick={() => { onSelect(flat.value); setOpen(false); }}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all text-center ${selectedFlatId === flat.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"}`}>
                    {flat.label}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function ErrorSummary({ errors }) {
  if (!errors || !Object.keys(errors).length) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5">
      <div className="text-red-500 mt-0.5 flex-shrink-0"><Icons.Alert /></div>
      <div>
        <p className="text-xs font-bold text-red-600 mb-1">Please fix the following:</p>
        <ul className="space-y-0.5">
          {Object.values(errors).map((e, i) => <li key={i} className="text-[11px] text-red-600">· {e}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ActiveEntriesList — shows every currently-inside person with an OUT button
function ActiveEntriesList({ entries, onExit, exitingIds = new Set() }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
        Currently Inside ({entries.length})
      </p>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={entry._id || `entry-${idx}`}
            className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">{entry.personName}</p>
              <p className="text-[11px] text-gray-500">
                {entry.flatNumber ? `Flat ${entry.flatNumber} · ` : ""}
                {(entry.phone || entry.contactNumber) ? `📞 ${entry.phone || entry.contactNumber}` : ""}
                {entry.category ? ` · ${entry.category}` : ""}
                {entry.personType ? ` · ${entry.personType}` : ""}
              </p>
              <p className="text-[10px] text-gray-400">
                {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })}
              </p>
            </div>
            <RippleButton
              disabled={exitingIds.has(entry._id)}
              onClick={() => onExit(entry._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm">
              {exitingIds.has(entry._id) ? <Spinner size={12}/> : <Icons.Exit />} OUT
            </RippleButton>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Guard Page ───────────────────────────────────────────────
export default function GuardPage() {
  // ── Auth ───────────────────────────────────────────────────────
  const [token, setToken] = useState(null);
  useEffect(() => {
    // Safe localStorage access after mount
    setToken(localStorage.getItem("token") || null);
  }, []);

  // ── Core state ─────────────────────────────────────────────────
  const [user,                  setUser]                  = useState(null);
  const [assignment,            setAssignment]            = useState(null);
  const [society,               setSociety]               = useState(null);
  const [assignedBuildingName,  setAssignedBuildingName]  = useState("");
  const [assignedBuildingId,    setAssignedBuildingId]    = useState(null);
  const [shiftInfo,             setShiftInfo]             = useState("General");
  const [isClockedIn,           setIsClockedIn]           = useState(false);
  const [loading,               setLoading]               = useState(true);
  const [todayPunches,          setTodayPunches]          = useState([]);
  const [punchLoading,          setPunchLoading]          = useState(null);   // "CheckpointNameIN" | "CheckpointNameOUT" | null

  // ── Gate entry state ───────────────────────────────────────────
  const [gateForm,      setGateForm]      = useState(EMPTY_GATE_FORM);
  const [gateErrors,    setGateErrors]    = useState({});
  const [gateTouched,   setGateTouched]   = useState({});
  const [savingGate,    setSavingGate]    = useState(false);
  const [exitingGateIds, setExitingGateIds] = useState(new Set());
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);

  // ── Building entry state ───────────────────────────────────────
  const [buildingForm,          setBuildingForm]          = useState(EMPTY_BUILDING_FORM());
  const [buildingErrors,        setBuildingErrors]        = useState({});
  const [buildingTouched,       setBuildingTouched]       = useState({});
  const [savingBuilding,        setSavingBuilding]        = useState(false);
  const [exitingBuildingIds,    setExitingBuildingIds]    = useState(new Set());
  const [activeBuildingEntries, setActiveBuildingEntries] = useState([]);
  const [recentBuildingPersons, setRecentBuildingPersons] = useState([]);

  const [flats,       setFlats]       = useState([]);
  const [message,     setMessage]     = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab,   setActiveTab]   = useState("attendance");

  const showMsg = useCallback((text, type = "success") => setMessage({ text, type }), []);

  const isGuard = user?.roles?.includes("Guard");

  // ── Bootstrap: load persisted data ────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem("user"); if (s) setUser(JSON.parse(s)); } catch {}
    try { const s = localStorage.getItem("guardRecentVisitors");       if (s) setRecentVisitors(JSON.parse(s)); }       catch {}
    try { const s = localStorage.getItem("guardRecentBuildingPersons"); if (s) setRecentBuildingPersons(JSON.parse(s)); } catch {}
  }, []);

  // ── Recent-visitor helpers ─────────────────────────────────────
  const saveRecentVisitor = (v) => {
    if (!v.personName) return;
    setRecentVisitors(prev => {
      const list = [...prev];
      const idx  = list.findIndex(x => x.phone && x.phone === v.phone);
      if (idx >= 0) list[idx] = v; else list.unshift(v);
      const trimmed = list.slice(0, 20);
      localStorage.setItem("guardRecentVisitors", JSON.stringify(trimmed));
      return trimmed;
    });
  };

  const saveRecentBuildingPerson = (p) => {
    if (!p.personName) return;
    setRecentBuildingPersons(prev => {
      const list = [...prev];
      const idx  = list.findIndex(x => x.phone && x.phone === p.phone);
      if (idx >= 0) list[idx] = p; else list.unshift(p);
      const trimmed = list.slice(0, 20);
      localStorage.setItem("guardRecentBuildingPersons", JSON.stringify(trimmed));
      return trimmed;
    });
  };

  // ── Fetch flats ────────────────────────────────────────────────
  const fetchFlats = useCallback(async (societyId, buildingId) => {
    if (!societyId || !token) return;
    try {
      let url = `/api/societymanagement/flat?societyId=${societyId}&limit=200`;
      if (buildingId) url += `&buildingId=${buildingId}`;
      const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
    } catch { setFlats([]); }
  }, [token]);

  // ── Fetch active entries ───────────────────────────────────────
  const loadActiveGateEntries = useCallback(async (soc) => {
    if (!soc || !token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await axios.get(
        `/api/societymanagement/gate-entry?societyId=${soc._id}&date=${today}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setActiveVisitors(filterActiveEntries(data.data));
    } catch (err) { console.error("[loadActiveGateEntries]", err); }
  }, [token]);

  const loadActiveBuildingEntries = useCallback(async (soc) => {
    if (!soc || !token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await axios.get(
        `/api/societymanagement/building-entry?societyId=${soc._id}&date=${today}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setActiveBuildingEntries(filterActiveEntries(data.data));
    } catch (err) { console.error("[loadActiveBuildingEntries]", err); }
  }, [token]);

  // ── Load duty + society ────────────────────────────────────────
  const loadDuty = useCallback(async () => {
    if (!token || !user?._id) return;
    try {
      const { data: a } = await axios.get(
        `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (a.success && a.data.length > 0) {
        const asgn  = a.data[0];
        setAssignment(asgn);
        setShiftInfo(asgn.shiftId?.name || (asgn.customShiftStart ? `${asgn.customShiftStart} – ${asgn.customShiftEnd}` : "General"));

        const bName = asgn.buildingId?.name || "";
        const bId   = asgn.buildingId?._id  || null;
        setAssignedBuildingName(bName);
        setAssignedBuildingId(bId);

        const { data: s } = await axios.get(
          `/api/societymanagement/society?id=${asgn.societyId?._id || asgn.societyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (s.success) {
          const soc = s.data;
          setSociety(soc);
          // Pre-fill building name if assigned
          if (bName) setBuildingForm(EMPTY_BUILDING_FORM(bName));
          await fetchFlats(soc._id, bId);
          await Promise.all([loadActiveGateEntries(soc), loadActiveBuildingEntries(soc)]);
        }
      } else {
        setAssignment(null);
        setSociety(null);
      }
    } catch (e) { console.error("[loadDuty]", e); }
  }, [token, user, fetchFlats, loadActiveGateEntries, loadActiveBuildingEntries]);

  // ── Load today's punches ───────────────────────────────────────
  const loadPunches = useCallback(async (soc) => {
    const target = soc || society;
    if (!target || !isGuard || !token) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      const { data } = await axios.get(
        `/api/societymanagement/guard-entry?date=${today}&societyId=${target._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setTodayPunches(data.data);
        const last = data.data[data.data.length - 1];
        setIsClockedIn(!!last && last.checkpointType === "IN");
      }
    } catch {}
  }, [society, isGuard, token]);

  // ── Effects ────────────────────────────────────────────────────
  useEffect(() => {
    if (token && user?._id) {
      setLoading(true);
      loadDuty().finally(() => setLoading(false));
    }
  }, [loadDuty, token, user?._id]);

  useEffect(() => {
    if (society && isGuard) loadPunches(society);
  }, [society, isGuard]);

  // ── Live validation: gate form ─────────────────────────────────
  useEffect(() => {
    const e = {};
    if (gateTouched.personName) {
      const err = validators.personName(gateForm.personName); if (err) e.personName = err;
    }
    if (gateTouched.phone && gateForm.phone) {
      const err = validators.phone(gateForm.phone); if (err) e.phone = err;
    }
    if (gateTouched.vehicleNumber && gateForm.vehicleNumber) {
      const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) e.vehicleNumber = err;
    }
    setGateErrors(e);
  }, [gateForm, gateTouched]);

  // ── Live validation: building form ────────────────────────────
  useEffect(() => {
    const e = {};
    if (buildingTouched.buildingName && !buildingForm.buildingName) e.buildingName = "Building is required";
    if (buildingTouched.personName) {
      const err = validators.personName(buildingForm.personName); if (err) e.personName = err;
    }
    if (buildingTouched.phone && buildingForm.phone) {
      const err = validators.phone(buildingForm.phone); if (err) e.phone = err;
    }
    setBuildingErrors(e);
  }, [buildingForm, buildingTouched]);

  // ── Punch (attendance) ─────────────────────────────────────────
  const punch = async (cpName, cpType) => {
    if (!navigator.geolocation) return showMsg("Location not supported", "error");
    const key = cpName + cpType;
    setPunchLoading(key);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await axios.post(
            "/api/societymanagement/guard-entry",
            {
              companyUserId:  user._id,
              checkpointName: cpName,
              checkpointType: cpType,
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          showMsg(`${cpType} recorded at ${cpName}`);
          await loadPunches(society);
        } catch (err) {
          showMsg(err.response?.data?.message || "Punch failed", "error");
        } finally {
          setPunchLoading(null);
        }
      },
      () => { showMsg("Location permission denied", "error"); setPunchLoading(null); }
    );
  };

  // ── Submit gate entry IN (with optimistic UI) ─────────────────
  const submitGate = async (e) => {
    e.preventDefault();
    // Touch all fields
    setGateTouched({ personName: true, phone: true, vehicleNumber: true, category: true, purpose: true });

    const errs = {};
    const nameErr = validators.personName(gateForm.personName);
    if (nameErr) errs.personName = nameErr;
    if (gateForm.phone) { const err = validators.phone(gateForm.phone); if (err) errs.phone = err; }
    if (gateForm.vehicleNumber) { const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) errs.vehicleNumber = err; }
    if (!gateForm.category) errs.category = "Category is required";
    setGateErrors(errs);
    if (Object.keys(errs).length) return showMsg("Please fix the errors", "error");
    if (!society?._id) return showMsg("Society data not loaded", "error");

    setSavingGate(true);

    const payload = {
      societyId:     society._id,
      gateName:      "Main Gate",
      entryType:     "IN",
      category:      gateForm.category,
      personName:    gateForm.personName.trim(),
      contactNumber: gateForm.phone,
      vehicleNumber: gateForm.vehicleNumber,
      purpose:       gateForm.purpose,
    };

    // Optimistic entry
    const tempId = "temp_" + Date.now();
    const optimistic = { ...payload, timestamp: new Date().toISOString(), _id: tempId };
    setActiveVisitors(prev => [optimistic, ...prev]);

    try {
      const res = await axios.post(
        "/api/societymanagement/gate-entry",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Replace optimistic entry with real one
      setActiveVisitors(prev => prev.map(e => e._id === tempId ? res.data.data : e));
      saveRecentVisitor({ personName: gateForm.personName, phone: gateForm.phone, vehicleNumber: gateForm.vehicleNumber, category: gateForm.category, purpose: gateForm.purpose });
      setGateForm(EMPTY_GATE_FORM);
      setGateErrors({}); setGateTouched({});
      showMsg("Entry recorded");
    } catch {
      // Roll back optimistic entry
      setActiveVisitors(prev => prev.filter(e => e._id !== tempId));
      showMsg("Failed to record entry", "error");
    } finally {
      setSavingGate(false);
    }
  };

  // ── Gate OUT ────────────────────────────────────────────────────
  const handleExitGate = async (entryId) => {
    const entry = activeVisitors.find(e => e._id === entryId);
    if (!entry || exitingGateIds.has(entryId)) return;

    // Mark as exiting (disables button, shows spinner)
    setExitingGateIds(prev => new Set([...prev, entryId]));

    try {
      await axios.post(
        "/api/societymanagement/gate-entry",
        {
          societyId:     society._id,
          gateName:      entry.gateName || "Main Gate",
          entryType:     "OUT",
          category:      entry.category,
          personName:    entry.personName,
          contactNumber: entry.contactNumber || "",
          vehicleNumber: entry.vehicleNumber || "",
          purpose:       "Exit",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Remove from active list
      setActiveVisitors(prev => prev.filter(e => e._id !== entryId));
      showMsg("Exit recorded");
    } catch {
      showMsg("Failed to record exit", "error");
    } finally {
      setExitingGateIds(prev => { const n = new Set(prev); n.delete(entryId); return n; });
    }
  };

  // ── Submit building entry IN ────────────────────────────────────
  const submitBuilding = async (e) => {
    e.preventDefault();
    setBuildingTouched({ buildingName: true, personName: true, phone: true, purpose: true });

    const errs = {};
    if (!buildingForm.buildingName) errs.buildingName = "Building is required";
    const nameErr = validators.personName(buildingForm.personName);
    if (nameErr) errs.personName = nameErr;
    if (buildingForm.phone) { const err = validators.phone(buildingForm.phone); if (err) errs.phone = err; }
    setBuildingErrors(errs);
    if (Object.keys(errs).length) return showMsg("Please fix the errors", "error");
    if (!society?._id) return showMsg("Society data not loaded", "error");

    setSavingBuilding(true);

    const payload = {
      societyId:    society._id,
      buildingName: buildingForm.buildingName,
      personName:   buildingForm.personName.trim(),
      personType:   buildingForm.personType || "Staff",
      entryType:    "IN",
      purpose:      buildingForm.purpose,
      phone:        buildingForm.phone,
      flatId:       buildingForm.flatId || undefined,
    };

    const tempId = "temp_" + Date.now();
    const optimistic = { ...payload, timestamp: new Date().toISOString(), _id: tempId };
    setActiveBuildingEntries(prev => [optimistic, ...prev]);

    try {
      const res = await axios.post(
        "/api/societymanagement/building-entry",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveBuildingEntries(prev => prev.map(e => e._id === tempId ? res.data.data : e));
      saveRecentBuildingPerson({ personName: buildingForm.personName, phone: buildingForm.phone, personType: buildingForm.personType, purpose: buildingForm.purpose });
      setBuildingForm(EMPTY_BUILDING_FORM(assignedBuildingName));
      setBuildingErrors({}); setBuildingTouched({});
      showMsg("Entry recorded");
    } catch {
      setActiveBuildingEntries(prev => prev.filter(e => e._id !== tempId));
      showMsg("Failed to record entry", "error");
    } finally {
      setSavingBuilding(false);
    }
  };

  // ── Building OUT ───────────────────────────────────────────────
  const handleExitBuilding = async (entryId) => {
    const entry = activeBuildingEntries.find(e => e._id === entryId);
    if (!entry || exitingBuildingIds.has(entryId)) return;

    setExitingBuildingIds(prev => new Set([...prev, entryId]));

    try {
      await axios.post(
        "/api/societymanagement/building-entry",
        {
          societyId:    society._id,
          buildingName: entry.buildingName,
          personName:   entry.personName,
          personType:   entry.personType,
          entryType:    "OUT",
          purpose:      "Exit",
          phone:        entry.phone || "",
          flatId:       entry.flatId || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveBuildingEntries(prev => prev.filter(e => e._id !== entryId));
      showMsg("Exit recorded");
    } catch {
      showMsg("Failed to record exit", "error");
    } finally {
      setExitingBuildingIds(prev => { const n = new Set(prev); n.delete(entryId); return n; });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/signin";
  };

  const fillGateFromVisitor     = (v) => setGateForm({ personName: v.personName||"", phone: v.phone||"", vehicleNumber: v.vehicleNumber||"", category: v.category||"Person", purpose: v.purpose||"" });
  const fillBuildingFromPerson  = (p) => setBuildingForm(prev => ({ ...prev, personName: p.personName||"", phone: p.phone||"", personType: p.personType||"Staff", purpose: p.purpose||"" }));
  const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });

  const isBuildingAssigned = !!assignedBuildingName;
  const gateSuggestions    = recentVisitors.map(v => ({ label: v.personName, data: v }));
  const buildingSuggestions = recentBuildingPersons.map(p => ({ label: p.personName, data: p }));

  const tabs = [
    { id:"attendance", label:"Attendance", icon:Icons.Clock    },
    { id:"gate",       label:"Gate Entry", icon:Icons.Truck    },
    { id:"building",   label:"Building",   icon:Icons.Building },
  ];

  // ── Loading / No assignment screens ───────────────────────────
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading duty information…</p>
        </div>
      </div>
    );
  }

  if (!assignment || !society) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Assignment</h2>
          <p className="text-gray-500 text-sm leading-relaxed">You are not assigned to any society. Contact your supervisor.</p>
          <button onClick={handleLogout} className="mt-6 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .ring-3 {
          --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
          --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);
          box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
        }
      `}</style>

      <Toast message={message} onClose={() => setMessage(null)} />

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Icons.Shield />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900">{society.name}</h1>
                {assignedBuildingName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 mono">
                    {assignedBuildingName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusDot active={isClockedIn} />
                <span className="text-[11px] text-gray-500">{isClockedIn ? "On duty" : "Off duty"}</span>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-gray-500 mono">{shiftInfo}</span>
              </div>
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-black text-white shadow-sm">
                {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G"}
              </div>
              <span className={`text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}>
                <Icons.ChevronDown />
              </span>
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                    {isGuard ? "Guard" : "Housekeeper"}
                  </span>
                </div>
                <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                  <Icons.LogOut /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">

        {/* Attendance Tab */}
        {activeTab === "attendance" && isGuard && (
          <div className="p-4 space-y-4">
            {/* Shift banner */}
            <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-indigo-200">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                <Icons.Clock />
              </div>
              <div>
                <p className="text-[11px] text-indigo-200 font-bold tracking-widest uppercase">Current Shift</p>
                <p className="text-base font-bold text-white mono mt-0.5">{shiftInfo}</p>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
                <StatusDot active={isClockedIn} />
                <span className="text-xs text-white font-semibold">{isClockedIn ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {/* Checkpoints */}
            <SectionCard title="Checkpoints">
              <div className="flex items-center justify-between -mt-2 mb-1">
                <span className="text-xs text-gray-500">{society.checkpoints?.length || 0} location{society.checkpoints?.length !== 1 ? "s" : ""}</span>
                <button onClick={() => loadPunches(society)} className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                  <Icons.Refresh /> Refresh
                </button>
              </div>
              {(!society.checkpoints || society.checkpoints.length === 0)
                ? <p className="text-xs text-gray-500 text-center py-3">No checkpoints configured</p>
                : society.checkpoints.map(cp => (
                    <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{cp.name}</p>
                        {cp.latitude && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Icons.MapPin /> GPS verified</p>}
                      </div>
                      <div className="flex gap-2">
                        <RippleButton onClick={() => punch(cp.name, "IN")} disabled={punchLoading === cp.name + "IN"}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200">
                          {punchLoading === cp.name + "IN" ? <Spinner size={13}/> : <Icons.LogIn />} IN
                        </RippleButton>
                        <RippleButton onClick={() => punch(cp.name, "OUT")} disabled={punchLoading === cp.name + "OUT"}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md shadow-red-200">
                          {punchLoading === cp.name + "OUT" ? <Spinner size={13}/> : <Icons.LogOut />} OUT
                        </RippleButton>
                      </div>
                    </div>
                  ))
              }
            </SectionCard>

            {/* Today's punch log */}
            {todayPunches.length > 0 && (
              <SectionCard title="Today's Log">
                <div className="divide-y divide-gray-100 -mx-4 -mt-4">
                  {todayPunches.map(e => (
                    <div key={e._id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${e.checkpointType === "IN" ? "bg-emerald-500" : "bg-red-400"}`}/>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{e.checkpointName}</p>
                          <p className="text-[10px] text-gray-500">{e.checkpointType === "IN" ? "Clocked in" : "Clocked out"}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold mono px-2 py-1 rounded-lg ${e.checkpointType === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                        {formatTime(e.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* Gate Entry Tab */}
        {activeTab === "gate" && isGuard && (
          <div className="p-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span className="text-2xl">🚪</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Gate Entry</p>
                <p className="text-xs text-gray-600">Record visitor entry / exit</p>
              </div>
            </div>

            <SectionCard title="New Entry (IN)">
              <form onSubmit={submitGate} className="space-y-3">
                <Field label="Person Name" required error={gateErrors.personName}>
                  <AutoSuggestInput
                    value={gateForm.personName}
                    onChange={e => setGateForm({ ...gateForm, personName: e.target.value })}
                    suggestions={gateSuggestions}
                    placeholder="Visitor name"
                    error={gateErrors.personName}
                    icon={<Icons.User />}
                    onSelect={fillGateFromVisitor}
                    onBlur={() => setGateTouched(p => ({ ...p, personName: true }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" error={gateErrors.phone}>
                    <Input type="tel" value={gateForm.phone}
                      onChange={e => setGateForm({ ...gateForm, phone: e.target.value })}
                      placeholder="Phone" icon={<Icons.Phone />} error={gateErrors.phone}
                      onBlur={() => setGateTouched(p => ({ ...p, phone: true }))} />
                  </Field>
                  <Field label="Vehicle" error={gateErrors.vehicleNumber}>
                    <Input value={gateForm.vehicleNumber}
                      onChange={e => setGateForm({ ...gateForm, vehicleNumber: e.target.value.toUpperCase() })}
                      placeholder="Number" icon={<Icons.Car />} error={gateErrors.vehicleNumber}
                      onBlur={() => setGateTouched(p => ({ ...p, vehicleNumber: true }))} />
                  </Field>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <Field label="Category" required error={gateErrors.category}>
                      <Select value={gateForm.category}
                        onChange={e => { setGateForm({ ...gateForm, category: e.target.value }); setGateTouched(p => ({ ...p, category: true })); }}
                        options={CATEGORIES} error={gateErrors.category} />
                    </Field>
                  </div>
                  <div className="flex-1">
                    <Field label="Purpose">
                      <Select value={gateForm.purpose}
                        onChange={e => setGateForm({ ...gateForm, purpose: e.target.value })}
                        options={GATE_PURPOSE_OPTIONS} placeholder="Select…" />
                    </Field>
                  </div>
                </div>

                <ErrorSummary errors={gateErrors} />

                <RippleButton type="submit" disabled={savingGate}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {savingGate ? <Spinner /> : <Icons.LogIn />} Record Entry
                </RippleButton>
              </form>
            </SectionCard>

            <ActiveEntriesList entries={activeVisitors} onExit={handleExitGate} exitingIds={exitingGateIds} />
          </div>
        )}

        {/* Building Entry Tab */}
        {activeTab === "building" && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <p className="text-sm font-bold text-blue-800">Building Entry</p>
                <p className="text-xs text-gray-600">Record person entry / exit</p>
              </div>
            </div>

            <SectionCard title="New Entry (IN)">
              <form onSubmit={submitBuilding} className="space-y-3">
                {/* Building field */}
                <Field label="Building" required error={buildingErrors.buildingName}>
                  {isBuildingAssigned
                    ? (
                      <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gray-50 border border-gray-300 rounded-xl">
                        <Icons.Building />
                        <span className="text-sm font-semibold text-gray-800">{assignedBuildingName}</span>
                        <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">Assigned</span>
                      </div>
                    ) : (
                      <Input value={buildingForm.buildingName}
                        onChange={e => { setBuildingForm({ ...buildingForm, buildingName: e.target.value }); setBuildingTouched(p => ({ ...p, buildingName: true })); }}
                        placeholder="Building name" error={buildingErrors.buildingName} />
                    )
                  }
                </Field>

                <Field label="Flat Number">
                  <FlatSelector flats={flats} selectedFlatId={buildingForm.flatId} onSelect={v => setBuildingForm({ ...buildingForm, flatId: v })} />
                </Field>

                <Field label="Person Name" required error={buildingErrors.personName}>
                  <AutoSuggestInput
                    value={buildingForm.personName}
                    onChange={e => setBuildingForm({ ...buildingForm, personName: e.target.value })}
                    suggestions={buildingSuggestions}
                    placeholder="Name"
                    error={buildingErrors.personName}
                    icon={<Icons.User />}
                    onSelect={fillBuildingFromPerson}
                    onBlur={() => setBuildingTouched(p => ({ ...p, personName: true }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Person Type">
                    <Select value={buildingForm.personType}
                      onChange={e => setBuildingForm({ ...buildingForm, personType: e.target.value })}
                      options={PERSON_TYPES} />
                  </Field>
                  <Field label="Phone" error={buildingErrors.phone}>
                    <Input type="tel" value={buildingForm.phone}
                      onChange={e => { setBuildingForm({ ...buildingForm, phone: e.target.value }); setBuildingTouched(p => ({ ...p, phone: true })); }}
                      placeholder="Phone" icon={<Icons.Phone />} error={buildingErrors.phone} />
                  </Field>
                </div>

                <Field label="Purpose">
                  <Select value={buildingForm.purpose}
                    onChange={e => setBuildingForm({ ...buildingForm, purpose: e.target.value })}
                    options={BUILDING_PURPOSE_OPTIONS} placeholder="Select…" />
                </Field>

                <ErrorSummary errors={buildingErrors} />

                <RippleButton type="submit" disabled={savingBuilding}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {savingBuilding ? <Spinner /> : <Icons.Building />} Record Entry
                </RippleButton>
              </form>
            </SectionCard>

            <ActiveEntriesList entries={activeBuildingEntries} onExit={handleExitBuilding} exitingIds={exitingBuildingIds} />
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex">
          {tabs.map(tab => {
            const Icon   = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 relative transition-colors ${active ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full"/>}
                <span className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}><Icon /></span>
                <span className={`text-[10px] mt-1 font-bold ${active ? "text-indigo-600" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// "use client";
// import { useState, useEffect, useCallback, useRef } from "react";
// import axios from "axios";

// // ── Icons ─────────────────────────────────────────────────────────
// const Icons = {
//   Shield:      () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
//   Clock:       () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
//   Truck:       () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
//   Building:    () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
//   LogIn:       () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
//   LogOut:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
//   MapPin:      () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
//   ChevronDown: ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
//   Check:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
//   Alert:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
//   Refresh:     () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
//   Search:      () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
//   User:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
//   Phone:       () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
//   Car:         () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
//   X:           () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
// };

// // ── Constants ─────────────────────────────────────────────────────
// const GATE_PURPOSE_OPTIONS    = ["Delivery","Visitor","Milk","Newspaper","Maintenance","Guest","Other"];
// const BUILDING_PURPOSE_OPTIONS = ["Cleaning","Repair","Inspection","Delivery","Visitor","Other"];
// const PERSON_TYPES  = ["Staff","Worker","Resident","Visitor","Other"];
// const CATEGORIES    = ["Person","Bike","Car","Truck","Other"];
// const CATEGORY_ICONS = { Person:"🚶", Bike:"🏍️", Car:"🚗", Truck:"🚛", Other:"📦" };

// // ── Validators ────────────────────────────────────────────────────
// const validators = {
//   phone: (v) => {
//     if (!v) return null;
//     if (!/^\d+$/.test(v)) return "Only digits allowed";
//     if (v.length < 7)  return "Too short (min 7 digits)";
//     if (v.length > 15) return "Too long (max 15 digits)";
//     return null;
//   },
//   vehicleNumber: (v) => {
//     if (!v) return null;
//     if (v.length > 20) return "Too long (max 20 chars)";
//     if (!/^[A-Za-z0-9\s\-]+$/.test(v)) return "Only letters, numbers & hyphens";
//     return null;
//   },
//   personName: (v) => {
//     if (!v?.trim()) return "Person name is required";
//     if (v.trim().length < 2)  return "Too short (min 2 chars)";
//     if (v.trim().length > 60) return "Too long (max 60 chars)";
//     if (!/^[A-Za-z\s\-'.]+$/.test(v.trim())) return "Only letters, spaces & hyphens";
//     return null;
//   },
// };

// // ── Ripple Button ─────────────────────────────────────────────────
// function RippleButton({ children, onClick, className = "", disabled = false, type = "button" }) {
//   const [ripples, setRipples] = useState([]);
//   const handle = (e) => {
//     const r = e.currentTarget.getBoundingClientRect();
//     const id = Date.now();
//     setRipples(p => [...p, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
//     setTimeout(() => setRipples(p => p.filter(x => x.id !== id)), 600);
//     if (onClick) onClick(e);
//   };
//   return (
//     <button type={type} disabled={disabled} onClick={handle}
//       className={`relative overflow-hidden select-none ${className}`}>
//       {ripples.map(rp => (
//         <span key={rp.id} style={{ left: rp.x, top: rp.y }}
//           className="absolute pointer-events-none rounded-full bg-white/40 animate-ping w-5 h-5 -translate-x-2.5 -translate-y-2.5" />
//       ))}
//       {children}
//     </button>
//   );
// }

// // ── Spinner ───────────────────────────────────────────────────────
// function Spinner({ size = 16 }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none">
//       <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
//       <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
//     </svg>
//   );
// }

// // ── Status Dot ────────────────────────────────────────────────────
// function StatusDot({ active }) {
//   return (
//     <span className="relative flex h-2.5 w-2.5">
//       {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>}
//       <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-500" : "bg-red-400"}`}/>
//     </span>
//   );
// }

// // ── Toast ─────────────────────────────────────────────────────────
// function Toast({ message, onClose }) {
//   useEffect(() => { if (message) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [message]);
//   if (!message) return null;
//   return (
//     <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-[90vw] border
//       ${message.type === "error"
//         ? "bg-red-50 border-red-200 text-red-700"
//         : "bg-emerald-50 border-emerald-200 text-emerald-700"
//       }`}>
//       {message.type === "success" ? <Icons.Check /> : <Icons.Alert />}
//       {message.text}
//       <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><Icons.X /></button>
//     </div>
//   );
// }

// // ── Field Wrapper ─────────────────────────────────────────────────
// function Field({ label, required, error, hint, children }) {
//   return (
//     <div className="space-y-1.5">
//       <div className="flex items-center gap-1">
//         <label className="text-[11px] font-bold tracking-widest uppercase text-gray-600">{label}</label>
//         {required && <span className="text-indigo-500 text-xs font-bold">*</span>}
//       </div>
//       {children}
//       {error
//         ? <div className="flex items-center gap-1.5 text-red-500"><Icons.Alert /><span className="text-[11px] font-medium">{error}</span></div>
//         : hint && <p className="text-[11px] text-gray-500">{hint}</p>
//       }
//     </div>
//   );
// }

// // ── Text Input ────────────────────────────────────────────────────
// function Input({ value, onChange, placeholder, type = "text", icon, error, className = "", ...rest }) {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div className={`relative rounded-xl border transition-all duration-150
//       ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
//       ${error  ? "border-red-400 ring-2 ring-red-50" : ""}
//       bg-white
//     `}>
//       {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
//       <input type={type} value={value} onChange={onChange} placeholder={placeholder}
//         onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//         className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400
//           py-3 pr-3 rounded-xl outline-none border-0
//           ${icon ? "pl-9" : "pl-3.5"} ${className}`}
//         {...rest} />
//     </div>
//   );
// }

// // ── Select ────────────────────────────────────────────────────────
// function Select({ value, onChange, options, placeholder, error, icon }) {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div className={`relative rounded-xl border bg-white transition-all duration-150
//       ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
//       ${error   ? "border-red-400 ring-2 ring-red-50" : ""}
//     `}>
//       {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</div>}
//       <select value={value} onChange={onChange}
//         onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//         className={`w-full appearance-none bg-transparent text-sm py-3 pr-8 rounded-xl outline-none border-0
//           ${value ? "text-gray-900" : "text-gray-400"}
//           ${icon ? "pl-9" : "pl-3.5"}`}>
//         {placeholder && <option value="">{placeholder}</option>}
//         {options.map(o => (
//           <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
//             {typeof o === "string" ? o : o.label}
//           </option>
//         ))}
//       </select>
//       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
//         <Icons.ChevronDown />
//       </div>
//     </div>
//   );
// }

// // ── AutoSuggest ────────────────────────────────────────────────────
// function AutoSuggestInput({ value, onChange, suggestions = [], placeholder, error, onSelect, icon }) {
//   const [open, setOpen] = useState(false);
//   const [filtered, setFiltered] = useState([]);
//   const [focused, setFocused] = useState(false);
//   const ref = useRef(null);

//   useEffect(() => {
//     setFiltered(value.trim()
//       ? suggestions.filter(s => (s.label || s).toLowerCase().includes(value.toLowerCase()))
//       : suggestions.slice(0, 8));
//   }, [value, suggestions]);

//   useEffect(() => {
//     const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener("mousedown", h);
//     return () => document.removeEventListener("mousedown", h);
//   }, []);

//   const handleSelect = (item) => {
//     const label = typeof item === "object" ? item.label : item;
//     onChange({ target: { value: label } });
//     if (onSelect && item.data) onSelect(item.data);
//     setOpen(false);
//   };

//   return (
//     <div className="relative" ref={ref}>
//       <div className={`relative rounded-xl border bg-white transition-all duration-150
//         ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
//         ${error   ? "border-red-400 ring-2 ring-red-50" : ""}
//       `}>
//         {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
//         <input type="text" value={value} onChange={onChange} placeholder={placeholder}
//           onFocus={() => { setFocused(true); setOpen(true); }}
//           onBlur={() => setFocused(false)}
//           className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400
//             py-3 pr-3 rounded-xl outline-none border-0
//             ${icon ? "pl-9" : "pl-3.5"}`} />
//       </div>
//       {open && filtered.length > 0 && (
//         <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
//           {filtered.map((item, i) => (
//             <button key={i} type="button" onClick={() => handleSelect(item)}
//               className="w-full text-left px-3.5 py-2.5 text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-0">
//               <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
//               {typeof item === "object" ? item.label : item}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Flat Selector (improved visibility) ──────────────────────────
// function FlatSelector({ flats, selectedFlatId, onSelect }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");
//   const ref = useRef(null);

//   useEffect(() => {
//     const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener("mousedown", h);
//     return () => document.removeEventListener("mousedown", h);
//   }, []);

//   const filtered = flats.filter(f => f.label.toLowerCase().includes(search.toLowerCase()));
//   const selectedLabel = selectedFlatId ? flats.find(f => f.value === selectedFlatId)?.label : null;

//   return (
//     <div className="relative" ref={ref}>
//       <button type="button" onClick={() => setOpen(!open)}
//         className={`w-full flex items-center justify-between px-3.5 py-3 bg-white rounded-xl border text-sm transition-all duration-150
//           ${open ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300 hover:border-gray-400"}`}>
//         <span className={selectedLabel ? "text-gray-900 font-medium" : "text-gray-400"}>
//           {selectedLabel || "Select flat number"}
//         </span>
//         <div className="flex items-center gap-1.5">
//           {selectedFlatId && (
//             <span onClick={e => { e.stopPropagation(); onSelect(""); }}
//               className="text-gray-400 hover:text-red-400 transition-colors p-0.5"><Icons.X /></span>
//           )}
//           <span className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
//             <Icons.ChevronDown />
//           </span>
//         </div>
//       </button>

//       {open && (
//         <div className="absolute z-[60] mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
//           <div className="p-2 border-b border-gray-100">
//             <div className="relative">
//               <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
//               <input type="text" placeholder="Search flat..." value={search} onChange={e => setSearch(e.target.value)}
//                 className="w-full pl-7 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-400"/>
//             </div>
//           </div>
//           <div className="grid grid-cols-4 gap-1.5 p-2 max-h-40 overflow-y-auto">
//             {filtered.length === 0
//               ? <p className="col-span-4 text-center text-xs text-gray-500 py-3">No flats found</p>
//               : filtered.map(flat => (
//                 <button key={flat.value} type="button" onClick={() => { onSelect(flat.value); setOpen(false); }}
//                   className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all text-center
//                     ${selectedFlatId === flat.value
//                       ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
//                       : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
//                     }`}>
//                   {flat.label}
//                 </button>
//               ))
//             }
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ── IN/OUT Toggle ─────────────────────────────────────────────────
// function InOutToggle({ value, onChange, error }) {
//   return (
//     <div className={`flex rounded-xl overflow-hidden border ${error ? "border-red-400" : "border-gray-200"} bg-gray-50`}>
//       {["IN","OUT"].map(opt => (
//         <button key={opt} type="button" onClick={() => onChange(opt)}
//           className={`flex-1 py-3 text-sm font-bold tracking-wider transition-all duration-200
//             ${value === opt
//               ? opt === "IN"
//                 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
//                 : "bg-red-500 text-white shadow-lg shadow-red-200"
//               : "bg-transparent text-gray-600 hover:text-gray-800"
//             }`}>
//           {opt}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ── Category Selector ─────────────────────────────────────────────
// function CategorySelector({ value, onChange, error }) {
//   return (
//     <div className={`flex gap-1.5 p-1.5 rounded-xl border bg-gray-50 ${error ? "border-red-400" : "border-gray-200"}`}>
//       {CATEGORIES.map(cat => (
//         <button key={cat} type="button" onClick={() => onChange(cat)}
//           className={`flex-1 flex flex-col items-center py-2 px-0.5 rounded-lg text-[10px] font-bold transition-all duration-150
//             ${value === cat
//               ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"
//               : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50"
//             }`}>
//           <span className="text-base mb-0.5">{CATEGORY_ICONS[cat]}</span>
//           {cat}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ── Section Card (without overflow-hidden) ──────────────────────
// function SectionCard({ title, children }) {
//   return (
//     <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
//       <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
//         <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">{title}</p>
//       </div>
//       <div className="p-4 space-y-4">{children}</div>
//     </div>
//   );
// }

// // ── Error Summary ─────────────────────────────────────────────────
// function ErrorSummary({ errors }) {
//   if (!Object.keys(errors).length) return null;
//   return (
//     <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5">
//       <div className="text-red-500 mt-0.5 flex-shrink-0"><Icons.Alert /></div>
//       <div>
//         <p className="text-xs font-bold text-red-600 mb-1">Please fix the following:</p>
//         <ul className="space-y-0.5">
//           {Object.values(errors).map((e, i) => (
//             <li key={i} className="text-[11px] text-red-600">· {e}</li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// // ── Main ──────────────────────────────────────────────────────────
// export default function GuardPage() {
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   const [user,               setUser]               = useState(null);
//   const [assignment,         setAssignment]         = useState(null);
//   const [society,            setSociety]            = useState(null);
//   const [assignedBuildingName, setAssignedBuildingName] = useState("");
//   const [assignedBuildingId,   setAssignedBuildingId]   = useState(null);
//   const [shiftInfo,          setShiftInfo]          = useState("General");
//   const [isClockedIn,        setIsClockedIn]        = useState(false);
//   const [loading,            setLoading]            = useState(true);
//   const [todayPunches,       setTodayPunches]       = useState([]);
//   const [punchLoading,       setPunchLoading]       = useState(null);

//   const [gateForm, setGateForm] = useState({
//     gateName:"Main Gate", entryType:"IN", category:"Person",
//     personName:"", vehicleNumber:"", purpose:"", contactNumber:"", purposeOther:""
//   });
//   const [gateErrors,  setGateErrors]  = useState({});
//   const [gateTouched, setGateTouched] = useState({});
//   const [savingGate,  setSavingGate]  = useState(false);

//   const [buildingForm, setBuildingForm] = useState({
//     buildingName:"", flatId:"", personName:"", personType:"Staff",
//     entryType:"IN", purpose:"", phone:"", purposeOther:""
//   });
//   const [buildingErrors,  setBuildingErrors]  = useState({});
//   const [buildingTouched, setBuildingTouched] = useState({});
//   const [savingBuilding,  setSavingBuilding]  = useState(false);

//   const [flats,                    setFlats]                    = useState([]);
//   const [recentVisitors,           setRecentVisitors]           = useState([]);
//   const [buildingPersonSuggestions, setBuildingPersonSuggestions] = useState([]);
//   const [message,      setMessage]      = useState(null);
//   const [profileOpen,  setProfileOpen]  = useState(false);
//   const [activeTab,    setActiveTab]    = useState("attendance");

//   const showMsg = (text, type = "success") => setMessage({ text, type });
//   const isGuard = user?.roles?.includes("Guard");

//   // ── Bootstrap ──────────────────────────────────────────────────
//   useEffect(() => {
//     try { const s = localStorage.getItem("user"); if (s) setUser(JSON.parse(s)); } catch (e) {}
//     try { const s = localStorage.getItem("guardRecentVisitors"); if (s) setRecentVisitors(JSON.parse(s)); } catch (e) {}
//   }, []);

//   const saveRecentVisitor = (v) => {
//     if (!v.personName) return;
//     const list = [...recentVisitors];
//     const idx = list.findIndex(x => x.contactNumber && x.contactNumber === v.contactNumber);
//     if (idx >= 0) list[idx] = v; else list.unshift(v);
//     const trimmed = list.slice(0, 20);
//     setRecentVisitors(trimmed);
//     localStorage.setItem("guardRecentVisitors", JSON.stringify(trimmed));
//   };

//   const fetchFlats = async (societyId, buildingId) => {
//     try {
//       let url = `/api/societymanagement/flat?societyId=${societyId}&limit=200`;
//       if (buildingId) url += `&buildingId=${buildingId}`;
//       const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
//       if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
//     } catch { setFlats([]); }
//   };

//   const fetchBuildingPersonSuggestions = async (societyId) => {
//     try {
//       const today = new Date().toISOString().split("T")[0];
//       const { data } = await axios.get(
//         `/api/societymanagement/building-entry?societyId=${societyId}&date=${today}&limit=100`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) setBuildingPersonSuggestions([...new Set(data.data.map(e => e.personName).filter(Boolean))]);
//     } catch {}
//   };

//   const loadDuty = useCallback(async () => {
//     if (!token || !user?._id) return;
//     try {
//       const { data: a } = await axios.get(
//         `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (a.success && a.data.length > 0) {
//         const asgn = a.data[0];
//         setAssignment(asgn);
//         setShiftInfo(asgn.shiftId?.name || (asgn.customShiftStart ? `${asgn.customShiftStart} – ${asgn.customShiftEnd}` : "General"));
//         const bName = asgn.buildingId?.name || "";
//         const bId   = asgn.buildingId?._id  || null;
//         setAssignedBuildingName(bName);
//         setAssignedBuildingId(bId);
//         const { data: s } = await axios.get(
//           `/api/societymanagement/society?id=${asgn.societyId._id || asgn.societyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (s.success) {
//           setSociety(s.data);
//           await fetchFlats(s.data._id, bId);
//           if (bName) setBuildingForm(p => ({ ...p, buildingName: bName }));
//           await fetchBuildingPersonSuggestions(s.data._id);
//         }
//       } else { setAssignment(null); setSociety(null); }
//     } catch (e) { console.error(e); }
//   }, [token, user]);

//   const loadPunches = useCallback(async () => {
//     if (!society || !isGuard) return;
//     try {
//       const today = new Date().toISOString().split("T")[0];
//       const { data } = await axios.get(
//         `/api/societymanagement/guard-entry?date=${today}&societyId=${society._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setTodayPunches(data.data);
//         setIsClockedIn(data.data.length > 0 && data.data[data.data.length - 1].checkpointType === "IN");
//       }
//     } catch {}
//   }, [society, isGuard]);

//   useEffect(() => { if (token && user) { setLoading(true); loadDuty().finally(() => setLoading(false)); } }, [loadDuty]);
//   useEffect(() => { if (society && isGuard) loadPunches(); }, [loadPunches]);

//   // ── Live gate validation ───────────────────────────────────────
//   useEffect(() => {
//     if (!Object.keys(gateTouched).length) return;
//     const e = {};
//     if (gateTouched.entryType  && !gateForm.entryType)  e.entryType  = "Entry type is required";
//     if (gateTouched.category   && !gateForm.category)   e.category   = "Category is required";
//     if (gateTouched.personName && gateForm.personName)  { const err = validators.personName(gateForm.personName);    if (err) e.personName    = err; }
//     if (gateTouched.contactNumber && gateForm.contactNumber) { const err = validators.phone(gateForm.contactNumber); if (err) e.contactNumber = err; }
//     if (gateTouched.vehicleNumber && gateForm.vehicleNumber) { const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) e.vehicleNumber = err; }
//     if (gateTouched.purpose && gateForm.purpose === "Other" && !gateForm.purposeOther?.trim()) e.purpose = "Please specify the purpose";
//     setGateErrors(e);
//   }, [gateForm, gateTouched]);

//   // ── Live building validation ───────────────────────────────────
//   useEffect(() => {
//     if (!Object.keys(buildingTouched).length) return;
//     const e = {};
//     if (buildingTouched.buildingName && !buildingForm.buildingName) e.buildingName = "Building is required";
//     if (buildingTouched.personName) { const err = validators.personName(buildingForm.personName); if (err) e.personName = err; }
//     if (buildingTouched.entryType  && !buildingForm.entryType) e.entryType = "IN/OUT is required";
//     if (buildingTouched.phone && buildingForm.phone) { const err = validators.phone(buildingForm.phone); if (err) e.phone = err; }
//     if (buildingTouched.purpose && buildingForm.purpose === "Other" && !buildingForm.purposeOther?.trim()) e.purpose = "Please specify the purpose";
//     setBuildingErrors(e);
//   }, [buildingForm, buildingTouched]);

//   // ── Punch ──────────────────────────────────────────────────────
//   const punch = async (cp, type) => {
//     if (!navigator.geolocation) return showMsg("Location not supported", "error");
//     setPunchLoading(cp + type);
//     navigator.geolocation.getCurrentPosition(async (pos) => {
//       try {
//         await axios.post("/api/societymanagement/guard-entry", {
//           companyUserId: user?._id, checkpointName: cp, checkpointType: type,
//           latitude: pos.coords.latitude, longitude: pos.coords.longitude,
//         }, { headers: { Authorization: `Bearer ${token}` } });
//         showMsg(`${type} recorded at ${cp}`);
//         loadPunches();
//       } catch (err) { showMsg(err.response?.data?.message || "Punch failed", "error"); }
//       finally { setPunchLoading(null); }
//     }, () => { showMsg("Location permission denied", "error"); setPunchLoading(null); });
//   };

//   // ── Submit Gate ────────────────────────────────────────────────
//   const submitGate = async (ev) => {
//     ev.preventDefault();
//     setGateTouched({ entryType:true, category:true, personName:true, contactNumber:true, vehicleNumber:true, purpose:true });
//     const e = {};
//     if (!gateForm.entryType)  e.entryType  = "Entry type is required";
//     if (!gateForm.category)   e.category   = "Category is required";
//     if (gateForm.personName)    { const err = validators.personName(gateForm.personName);    if (err) e.personName    = err; }
//     if (gateForm.contactNumber) { const err = validators.phone(gateForm.contactNumber);      if (err) e.contactNumber = err; }
//     if (gateForm.vehicleNumber) { const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) e.vehicleNumber = err; }
//     if (gateForm.purpose === "Other" && !gateForm.purposeOther?.trim()) e.purpose = "Please specify the purpose";
//     setGateErrors(e);
//     if (Object.keys(e).length) { showMsg("Please fix the errors below", "error"); return; }

//     setSavingGate(true);
//     try {
//       const finalPurpose = gateForm.purpose === "Other" ? gateForm.purposeOther : gateForm.purpose;
//       await axios.post("/api/societymanagement/gate-entry",
//         { societyId: society._id, ...gateForm, purpose: finalPurpose },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       saveRecentVisitor({ personName: gateForm.personName, contactNumber: gateForm.contactNumber, vehicleNumber: gateForm.vehicleNumber, category: gateForm.category, purpose: finalPurpose });
//       setGateForm({ gateName:"Main Gate", entryType:"IN", category:"Person", personName:"", vehicleNumber:"", purpose:"", contactNumber:"", purposeOther:"" });
//       setGateErrors({}); setGateTouched({});
//       showMsg("Gate entry recorded successfully");
//     } catch (err) { showMsg(err.response?.data?.message || "Failed to record", "error"); }
//     finally { setSavingGate(false); }
//   };

//   // ── Submit Building ────────────────────────────────────────────
//   const submitBuilding = async (ev) => {
//     ev.preventDefault();
//     setBuildingTouched({ buildingName:true, personName:true, entryType:true, phone:true, purpose:true });
//     const e = {};
//     if (!buildingForm.buildingName) e.buildingName = "Building is required";
//     const ne = validators.personName(buildingForm.personName); if (ne) e.personName = ne;
//     if (!buildingForm.entryType) e.entryType = "IN/OUT is required";
//     if (buildingForm.phone) { const pe = validators.phone(buildingForm.phone); if (pe) e.phone = pe; }
//     if (buildingForm.purpose === "Other" && !buildingForm.purposeOther?.trim()) e.purpose = "Please specify the purpose";
//     setBuildingErrors(e);
//     if (Object.keys(e).length) { showMsg("Please fix the errors below", "error"); return; }

//     setSavingBuilding(true);
//     try {
//       const finalPurpose = buildingForm.purpose === "Other" ? buildingForm.purposeOther : buildingForm.purpose;
//       await axios.post("/api/societymanagement/building-entry", {
//         societyId: society._id, buildingName: buildingForm.buildingName,
//         personName: buildingForm.personName, personType: buildingForm.personType,
//         entryType: buildingForm.entryType, purpose: finalPurpose,
//         phone: buildingForm.phone, flatId: buildingForm.flatId || undefined,
//       }, { headers: { Authorization: `Bearer ${token}` } });
//       setBuildingForm(p => ({ ...p, flatId:"", personName:"", personType:"Staff", entryType:"IN", purpose:"", phone:"", purposeOther:"" }));
//       setBuildingErrors({}); setBuildingTouched({});
//       showMsg("Building entry recorded successfully");
//       fetchBuildingPersonSuggestions(society._id);
//     } catch (err) { showMsg(err.response?.data?.message || "Failed to record", "error"); }
//     finally { setSavingBuilding(false); }
//   };

//   const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/signin"; };

//   const fillGateFromVisitor = (v) => {
//     setGateForm(f => ({ ...f, personName: v.personName||"", contactNumber: v.contactNumber||"", vehicleNumber: v.vehicleNumber||"", category: v.category||"Person", purpose: v.purpose||"", purposeOther:"" }));
//   };

//   const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });

//   // ── Loading ────────────────────────────────────────────────────
//   if (loading || !user) return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//       <div className="flex flex-col items-center gap-4">
//         <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
//           <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
//         </div>
//         <p className="text-gray-500 text-sm font-medium">Loading duty information...</p>
//       </div>
//     </div>
//   );

//   if (!assignment || !society) return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="text-center max-w-xs">
//         <div className="w-20 h-20 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto mb-5">
//           <span className="text-4xl">🔒</span>
//         </div>
//         <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Assignment</h2>
//         <p className="text-gray-500 text-sm leading-relaxed">You are not assigned to any society. Contact your supervisor.</p>
//         <button onClick={handleLogout} className="mt-6 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
//           Sign Out
//         </button>
//       </div>
//     </div>
//   );

//   const isBuildingAssigned = assignedBuildingName !== "";
//   const gateSuggestions = recentVisitors.map(v => ({
//     label: `${v.personName || "?"}${v.contactNumber ? " · " + v.contactNumber : ""}`,
//     data: v
//   }));

//   const tabs = [
//     { id:"attendance", label:"Attendance", icon:Icons.Clock  },
//     { id:"gate",       label:"Gate Entry", icon:Icons.Truck  },
//     { id:"building",   label:"Building",   icon:Icons.Building },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
//         * { font-family: 'Plus Jakarta Sans', sans-serif; }
//         .mono { font-family: 'JetBrains Mono', monospace; }
//         ::-webkit-scrollbar { width: 4px; height: 4px; }
//         ::-webkit-scrollbar-track { background: #f1f5f9; }
//         ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
//         .ring-3 { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
//       `}</style>

//       <Toast message={message} onClose={() => setMessage(null)} />

//       {/* ── Header ─────────────────────────────────────────────── */}
//       <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
//         <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
//               <Icons.Shield />
//             </div>
//             <div>
//               <div className="flex items-center gap-2">
//                 <h1 className="text-sm font-bold text-gray-900">{society.name}</h1>
//                 {assignedBuildingName && (
//                   <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 mono">
//                     {assignedBuildingName}
//                   </span>
//                 )}
//               </div>
//               <div className="flex items-center gap-2 mt-0.5">
//                 <StatusDot active={isClockedIn} />
//                 <span className="text-[11px] text-gray-500">{isClockedIn ? "On duty" : "Off duty"}</span>
//                 <span className="text-gray-300">·</span>
//                 <span className="text-[11px] text-gray-500 mono">{shiftInfo}</span>
//               </div>
//             </div>
//           </div>

//           <div className="relative">
//             <button onClick={() => setProfileOpen(!profileOpen)}
//               className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-gray-100 transition-colors">
//               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-black text-white shadow-sm">
//                 {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G"}
//               </div>
//               <span className={`text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}>
//                 <Icons.ChevronDown />
//               </span>
//             </button>

//             {profileOpen && (
//               <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
//                 <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
//                   <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
//                   <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
//                   <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
//                     {isGuard ? "Guard" : "Housekeeper"}
//                   </span>
//                 </div>
//                 <button onClick={() => { setProfileOpen(false); handleLogout(); }}
//                   className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
//                   <Icons.LogOut /> Sign Out
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* ── Content ────────────────────────────────────────────── */}
//       <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">

//         {/* Attendance */}
//         {activeTab === "attendance" && isGuard && (
//           <div className="p-4 space-y-4">
//             {/* Shift banner */}
//             <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-indigo-200">
//               <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
//                 <Icons.Clock />
//               </div>
//               <div>
//                 <p className="text-[11px] text-indigo-200 font-bold tracking-widest uppercase">Current Shift</p>
//                 <p className="text-base font-bold text-white mono mt-0.5">{shiftInfo}</p>
//                 <p className="text-xs text-indigo-200 mt-0.5">
//                   {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" })}
//                 </p>
//               </div>
//               <div className="ml-auto flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
//                 <StatusDot active={isClockedIn} />
//                 <span className="text-xs text-white font-semibold">{isClockedIn ? "Active" : "Inactive"}</span>
//               </div>
//             </div>

//             {/* Checkpoints */}
//             <SectionCard title="Checkpoints">
//               <div className="flex items-center justify-between -mt-2 mb-1">
//                 <span className="text-xs text-gray-500">{society.checkpoints?.length || 0} location{society.checkpoints?.length !== 1 ? "s" : ""}</span>
//                 <button onClick={loadPunches} className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
//                   <Icons.Refresh /> Refresh
//                 </button>
//               </div>
//               {(!society.checkpoints || society.checkpoints.length === 0)
//                 ? <p className="text-xs text-gray-500 text-center py-3">No checkpoints configured</p>
//                 : society.checkpoints.map(cp => (
//                   <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
//                     <div>
//                       <p className="text-sm font-bold text-gray-800">{cp.name}</p>
//                       {cp.latitude && (
//                         <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
//                           <Icons.MapPin /> GPS verified
//                         </p>
//                       )}
//                     </div>
//                     <div className="flex gap-2">
//                       <RippleButton onClick={() => punch(cp.name, "IN")} disabled={punchLoading === cp.name + "IN"}
//                         className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200">
//                         {punchLoading === cp.name + "IN" ? <Spinner size={13}/> : <Icons.LogIn />} IN
//                       </RippleButton>
//                       <RippleButton onClick={() => punch(cp.name, "OUT")} disabled={punchLoading === cp.name + "OUT"}
//                         className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md shadow-red-200">
//                         {punchLoading === cp.name + "OUT" ? <Spinner size={13}/> : <Icons.LogOut />} OUT
//                       </RippleButton>
//                     </div>
//                   </div>
//                 ))
//               }
//             </SectionCard>

//             {/* Today's log */}
//             {todayPunches.length > 0 && (
//               <SectionCard title="Today's Log">
//                 <div className="divide-y divide-gray-100 -mx-4 -mt-4">
//                   {todayPunches.map(e => (
//                     <div key={e._id} className="flex items-center justify-between px-4 py-2.5">
//                       <div className="flex items-center gap-3">
//                         <div className={`w-2 h-2 rounded-full ${e.checkpointType === "IN" ? "bg-emerald-500" : "bg-red-400"}`}/>
//                         <div>
//                           <p className="text-xs font-semibold text-gray-800">{e.checkpointName}</p>
//                           <p className="text-[10px] text-gray-500">{e.checkpointType === "IN" ? "Clocked in" : "Clocked out"}</p>
//                         </div>
//                       </div>
//                       <span className={`text-[11px] font-bold mono px-2 py-1 rounded-lg
//                         ${e.checkpointType === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
//                         {formatTime(e.timestamp)}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </SectionCard>
//             )}
//           </div>
//         )}

//         {/* Gate Entry */}
//         {activeTab === "gate" && isGuard && (
//           <div className="p-4">
//             <form onSubmit={submitGate} noValidate>
//               <div className="space-y-4">
//                 {/* Banner */}
//                 <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
//                   <span className="text-2xl">🚪</span>
//                   <div>
//                     <p className="text-sm font-bold text-amber-800">Gate Entry / Exit</p>
//                     <p className="text-xs text-gray-600">Record all visitors and vehicles</p>
//                   </div>
//                 </div>

//                 <SectionCard title="Entry Details">
//                   <Field label="Entry Type" required error={gateErrors.entryType}>
//                     <InOutToggle value={gateForm.entryType}
//                       onChange={v => { setGateForm(f => ({...f, entryType:v})); setGateTouched(t => ({...t, entryType:true})); }}
//                       error={gateErrors.entryType} />
//                   </Field>
//                   <Field label="Category" required error={gateErrors.category}>
//                     <CategorySelector value={gateForm.category}
//                       onChange={v => { setGateForm(f => ({...f, category:v})); setGateTouched(t => ({...t, category:true})); }}
//                       error={gateErrors.category} />
//                   </Field>
//                   <Field label="Gate Name" hint="e.g. Main Gate, Back Gate">
//                     <Input value={gateForm.gateName}
//                       onChange={e => setGateForm(f => ({...f, gateName:e.target.value}))}
//                       placeholder="Main Gate" />
//                   </Field>
//                 </SectionCard>

//                 <SectionCard title="Person Details">
//                   <Field label="Person Name" error={gateErrors.personName} hint="Letters only · 2–60 characters">
//                     <AutoSuggestInput value={gateForm.personName}
//                       onChange={e => { setGateForm(f => ({...f, personName:e.target.value})); setGateTouched(t => ({...t, personName:true})); }}
//                       suggestions={gateSuggestions} placeholder="Type or pick from recent"
//                       error={gateErrors.personName} icon={<Icons.User />}
//                       onSelect={v => fillGateFromVisitor(v)} />
//                   </Field>
//                   <Field label="Contact Number" error={gateErrors.contactNumber} hint="Digits only · 7–15 digits">
//                     <Input type="tel" value={gateForm.contactNumber}
//                       onChange={e => { setGateForm(f => ({...f, contactNumber:e.target.value})); setGateTouched(t => ({...t, contactNumber:true})); }}
//                       placeholder="9876543210" icon={<Icons.Phone />} error={gateErrors.contactNumber} />
//                   </Field>
//                   <Field label="Vehicle Number" error={gateErrors.vehicleNumber} hint="Alphanumeric · auto-uppercased">
//                     <Input value={gateForm.vehicleNumber}
//                       onChange={e => { setGateForm(f => ({...f, vehicleNumber:e.target.value.toUpperCase()})); setGateTouched(t => ({...t, vehicleNumber:true})); }}
//                       placeholder="MH12AB1234" icon={<Icons.Car />} error={gateErrors.vehicleNumber} className="tracking-widest" />
//                   </Field>
//                 </SectionCard>

//                 <SectionCard title="Purpose of Visit">
//                   <Field label="Purpose" error={gateErrors.purpose}>
//                     <Select value={gateForm.purpose}
//                       onChange={e => { setGateForm(f => ({...f, purpose:e.target.value, purposeOther:""})); setGateTouched(t => ({...t, purpose:true})); }}
//                       options={GATE_PURPOSE_OPTIONS} placeholder="Select purpose..." error={gateErrors.purpose} />
//                     {gateForm.purpose === "Other" && (
//                       <Input value={gateForm.purposeOther}
//                         onChange={e => { setGateForm(f => ({...f, purposeOther:e.target.value})); setGateTouched(t => ({...t, purpose:true})); }}
//                         placeholder="Please specify..." error={gateErrors.purpose} className="mt-2" />
//                     )}
//                   </Field>
//                 </SectionCard>

//                 <ErrorSummary errors={gateErrors} />

//                 <RippleButton type="submit" disabled={savingGate}
//                   className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-indigo-200">
//                   {savingGate ? <Spinner /> : <Icons.LogIn />}
//                   {savingGate ? "Recording..." : "Record Gate Entry"}
//                 </RippleButton>
//               </div>
//             </form>
//           </div>
//         )}

//         {/* Building Entry */}
//         {activeTab === "building" && (
//           <div className="p-4">
//             <form onSubmit={submitBuilding} noValidate>
//               <div className="space-y-4">
//                 {/* Banner */}
//                 <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3">
//                   <span className="text-2xl">🏢</span>
//                   <div>
//                     <p className="text-sm font-bold text-blue-800">Building Entry / Exit</p>
//                     <p className="text-xs text-gray-600">Log all people entering or exiting</p>
//                   </div>
//                 </div>

//                 <SectionCard title="Location">
//                   <Field label="Building" required error={buildingErrors.buildingName}>
//                     {isBuildingAssigned ? (
//                       <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gray-50 border border-gray-300 rounded-xl">
//                         <span className="text-gray-500"><Icons.Building /></span>
//                         <span className="text-sm font-semibold text-gray-800">{assignedBuildingName}</span>
//                         <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">Assigned</span>
//                       </div>
//                     ) : (
//                       <Input value={buildingForm.buildingName}
//                         onChange={e => { setBuildingForm(f => ({...f, buildingName:e.target.value})); setBuildingTouched(t => ({...t, buildingName:true})); }}
//                         placeholder="Enter building name" error={buildingErrors.buildingName} />
//                     )}
//                   </Field>
//                   <Field label="Flat Number" hint="Optional">
//                     <FlatSelector flats={flats} selectedFlatId={buildingForm.flatId}
//                       onSelect={v => setBuildingForm(f => ({...f, flatId:v}))} />
//                   </Field>
//                 </SectionCard>

//                 <SectionCard title="Person Details">
//                   <Field label="Person Name" required error={buildingErrors.personName} hint="Letters only · 2–60 characters">
//                     <AutoSuggestInput value={buildingForm.personName}
//                       onChange={e => { setBuildingForm(f => ({...f, personName:e.target.value})); setBuildingTouched(t => ({...t, personName:true})); }}
//                       suggestions={buildingPersonSuggestions.map(n => ({ label:n, data:n }))}
//                       placeholder="Type or pick from today's log"
//                       error={buildingErrors.personName} icon={<Icons.User />}
//                       onSelect={name => setBuildingForm(f => ({...f, personName:name}))} />
//                   </Field>
//                   <Field label="Person Type">
//                     <Select value={buildingForm.personType}
//                       onChange={e => setBuildingForm(f => ({...f, personType:e.target.value}))}
//                       options={PERSON_TYPES} />
//                   </Field>
//                   <Field label="Phone" error={buildingErrors.phone} hint="Digits only · 7–15 digits">
//                     <Input type="tel" value={buildingForm.phone}
//                       onChange={e => { setBuildingForm(f => ({...f, phone:e.target.value})); setBuildingTouched(t => ({...t, phone:true})); }}
//                       placeholder="9876543210" icon={<Icons.Phone />} error={buildingErrors.phone} />
//                   </Field>
//                 </SectionCard>

//                 <SectionCard title="Entry Details">
//                   <Field label="IN / OUT" required error={buildingErrors.entryType}>
//                     <InOutToggle value={buildingForm.entryType}
//                       onChange={v => { setBuildingForm(f => ({...f, entryType:v})); setBuildingTouched(t => ({...t, entryType:true})); }}
//                       error={buildingErrors.entryType} />
//                   </Field>
//                   <Field label="Purpose" error={buildingErrors.purpose}>
//                     <Select value={buildingForm.purpose}
//                       onChange={e => { setBuildingForm(f => ({...f, purpose:e.target.value, purposeOther:""})); setBuildingTouched(t => ({...t, purpose:true})); }}
//                       options={BUILDING_PURPOSE_OPTIONS} placeholder="Select purpose..." error={buildingErrors.purpose} />
//                     {buildingForm.purpose === "Other" && (
//                       <Input value={buildingForm.purposeOther}
//                         onChange={e => { setBuildingForm(f => ({...f, purposeOther:e.target.value})); setBuildingTouched(t => ({...t, purpose:true})); }}
//                         placeholder="Please specify..." error={buildingErrors.purpose} className="mt-2" />
//                     )}
//                   </Field>
//                 </SectionCard>

//                 <ErrorSummary errors={buildingErrors} />

//                 <RippleButton type="submit" disabled={savingBuilding}
//                   className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-blue-200">
//                   {savingBuilding ? <Spinner /> : <Icons.Building />}
//                   {savingBuilding ? "Recording..." : "Record Building Entry"}
//                 </RippleButton>
//               </div>
//             </form>
//           </div>
//         )}

//         <div className="h-20" />
//       </div>

//       {/* ── Bottom Nav ─────────────────────────────────────────── */}
//       <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
//         <div className="max-w-md mx-auto flex">
//           {tabs.map(tab => {
//             const TabIcon = tab.icon;
//             const active = activeTab === tab.id;
//             return (
//               <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//                 className={`flex-1 flex flex-col items-center justify-center py-2.5 relative transition-colors
//                   ${active ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
//                 {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full"/>}
//                 <span className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}>
//                   <TabIcon />
//                 </span>
//                 <span className={`text-[10px] mt-1 font-bold ${active ? "text-indigo-600" : ""}`}>
//                   {tab.label}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//       </nav>
//     </div>
//   );
// }


// "use client";
// import { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import {
//   FiLogIn, FiLogOut, FiTruck, FiClock, FiMapPin,
//   FiAlertCircle, FiChevronDown, FiLogOut as FiSignOut,
//   FiCheckCircle, FiLoader, FiRefreshCw, FiHome, FiSearch
// } from "react-icons/fi";
// import { format } from "date-fns";

// // ── Gate Entry fields ─────────────────────────────────────────────
// const GATE_FIELDS = [
//   { name: "gateName", label: "Gate Name", type: "text", placeholder: "Main Gate" },
//   { name: "entryType", label: "Entry Type *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "category", label: "Category *", type: "select", required: true, options: [
//     { value: "Person", label: "Person" }, { value: "Bike", label: "Bike" },
//     { value: "Car", label: "Car" }, { value: "Truck", label: "Truck" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "personName", label: "Person Name", type: "text" },
//   { name: "vehicleNumber", label: "Vehicle Number", type: "text" },
//   { name: "purpose", label: "Purpose", type: "text" },
//   { name: "contactNumber", label: "Contact Number", type: "text" }
// ];

// // ── Building Entry fields ─────────────────────────────────────────
// const BUILDING_FIELDS = [
//   { name: "buildingName", label: "Building *", type: "select", required: true, options: [] },
//   { name: "flatId", label: "Flat Number", type: "select", options: [] },
//   { name: "personName", label: "Person Name *", type: "text", required: true },
//   { name: "personType", label: "Person Type", type: "select", options: [
//     { value: "Staff", label: "Staff" }, { value: "Worker", label: "Worker" },
//     { value: "Resident", label: "Resident" }, { value: "Visitor", label: "Visitor" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "phone", label: "Phone", type: "text" },
//   { name: "entryType", label: "IN/OUT *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "purpose", label: "Purpose", type: "text" }
// ];

// // ── Advanced Flat Selector ────────────────────────────────────────
// function FlatSelector({ flats, selectedFlatId, onSelect }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");

//   const filtered = flats.filter(f =>
//     f.label.toLowerCase().includes(search.toLowerCase())
//   );

//   const selectedLabel = selectedFlatId
//     ? flats.find(f => f.value === selectedFlatId)?.label || "Select Flat"
//     : "Select Flat";

//   return (
//     <div className="relative">
//       <button
//         type="button"
//         onClick={() => setOpen(!open)}
//         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-indigo-400 transition-all flex items-center justify-between"
//       >
//         <span className={selectedFlatId ? "text-gray-900" : "text-gray-400"}>
//           {selectedLabel}
//         </span>
//         <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       <div
//         className={`absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top ${
//           open ? "scale-y-100 opacity-100 max-h-60" : "scale-y-0 opacity-0 max-h-0"
//         }`}
//       >
//         <div className="p-2">
//           <div className="relative">
//             <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
//             <input
//               type="text"
//               placeholder="Search flat..."
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-indigo-400"
//             />
//           </div>
//           <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
//             {filtered.length === 0 ? (
//               <p className="col-span-3 text-center text-xs text-gray-400 py-4">No flats found</p>
//             ) : (
//               filtered.map(flat => (
//                 <button
//                   key={flat.value}
//                   type="button"
//                   onClick={() => { onSelect(flat.value); setOpen(false); }}
//                   className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${
//                     selectedFlatId === flat.value
//                       ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
//                       : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600"
//                   }`}
//                 >
//                   {flat.label}
//                 </button>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Guard Page ──────────────────────────────────────────────
// export default function GuardPage() {
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ── Core state ──────────────────────────────────────────────────
//   const [user, setUser] = useState(null);
//   const [assignment, setAssignment] = useState(null);
//   const [society, setSociety] = useState(null);
//   const [assignedBuildingName, setAssignedBuildingName] = useState("");
//   const [assignedBuildingId, setAssignedBuildingId] = useState(null);
//   const [shiftInfo, setShiftInfo] = useState("General");
//   const [isClockedIn, setIsClockedIn] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [todayPunches, setTodayPunches] = useState([]);
//   const [punchLoading, setPunchLoading] = useState(null);

//   // ── Forms ───────────────────────────────────────────────────────
//   const [gateForm, setGateForm] = useState({
//     gateName: "Main Gate", entryType: "IN", category: "Person",
//     personName: "", vehicleNumber: "", purpose: "", contactNumber: ""
//   });
//   const [savingGate, setSavingGate] = useState(false);

//   const [buildingForm, setBuildingForm] = useState({
//     buildingName: "", flatId: "", personName: "", personType: "Staff",
//     entryType: "IN", purpose: "", phone: ""
//   });
//   const [savingBuilding, setSavingBuilding] = useState(false);

//   // ── Dropdown data (only flats, buildings are taken from assignment) ──
//   const [flats, setFlats] = useState([]);

//   const [message, setMessage] = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("attendance");

//   // ── Helpers ──────────────────────────────────────────────────────
//   const showMsg = (text, type = "success") => { setMessage({ text, type }); setTimeout(() => setMessage(null), 4000); };
//   const getUserId = () => user?._id || "";
//   const isGuard = user?.roles?.includes("Guard");

//   // ── Load user ───────────────────────────────────────────────────
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem("user");
//       if (stored) setUser(JSON.parse(stored));
//     } catch (e) {}
//   }, []);

//   // ✅ Fetch flats for a society, optionally filtered by buildingId
//   const fetchFlats = async (societyId, buildingId = null) => {
//     if (!societyId) return;
//     try {
//       let url = `/api/societymanagement/flat?societyId=${societyId}&limit=200`;
//       if (buildingId) {
//         url += `&buildingId=${buildingId}`;
//       }
//       const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
//       if (data.success) {
//         setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
//       }
//     } catch (e) { setFlats([]); }
//   };

//   // ── Load duty (assignment → society → flats) ──────────────────
//   const loadDuty = useCallback(async () => {
//     if (!token || !user?._id) return;
//     try {
//       const { data: a } = await axios.get(
//         `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (a.success && a.data.length > 0) {
//         const asgn = a.data[0];
//         setAssignment(asgn);
//         setShiftInfo(
//           asgn.shiftId?.name ||
//           (asgn.customShiftStart ? `${asgn.customShiftStart} - ${asgn.customShiftEnd}` : "General")
//         );

//         // ✅ असाइनमेंट से सीधे बिल्डिंग का नाम और ID लो (पॉप्युलेटेड)
//         const buildingName = asgn.buildingId?.name || "";
//         const buildingId = asgn.buildingId?._id || null;
//         setAssignedBuildingName(buildingName);
//         setAssignedBuildingId(buildingId);

//         const { data: s } = await axios.get(
//           `/api/societymanagement/society?id=${asgn.societyId._id || asgn.societyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (s.success) {
//           setSociety(s.data);
//           // ✅ फ़्लैट लोड करो – अगर बिल्डिंग सेट है तो उसके फ़्लैट, वरना पूरे सोसाइटी के
//           await fetchFlats(s.data._id, buildingId);
//           // बिल्डिंग फॉर्म में सेट करो (डिसेबल रहेगा)
//           if (buildingName) {
//             setBuildingForm(prev => ({ ...prev, buildingName }));
//           }
//         } else {
//           setSociety(null);
//           setAssignment(null);
//         }
//       } else {
//         setAssignment(null); setSociety(null);
//       }
//     } catch (e) { console.error(e); }
//   }, [token, user]);

//   // ── Load punches ───────────────────────────────────────────────
//   const loadPunches = useCallback(async () => {
//     if (!society || !isGuard) return;
//     const today = new Date().toISOString().split("T")[0];
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/guard-entry?date=${today}&societyId=${society._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setTodayPunches(data.data);
//         setIsClockedIn(data.data.length > 0 && data.data[data.data.length - 1].checkpointType === "IN");
//       }
//     } catch (e) {}
//   }, [society, isGuard]);

//   useEffect(() => { if (token && user) { setLoading(true); loadDuty().finally(() => setLoading(false)); } }, [loadDuty]);
//   useEffect(() => { if (society && isGuard) loadPunches(); }, [loadPunches]);

//   // ── Punch ──────────────────────────────────────────────────────
//   const punch = async (point, type) => {
//     if (!navigator.geolocation) return showMsg("Location not supported", "error");
//     setPunchLoading(point);
//     navigator.geolocation.getCurrentPosition(async (pos) => {
//       try {
//         await axios.post("/api/societymanagement/guard-entry", {
//           companyUserId: getUserId(), checkpointName: point, checkpointType: type,
//           latitude: pos.coords.latitude, longitude: pos.coords.longitude,
//         }, { headers: { Authorization: `Bearer ${token}` } });
//         showMsg(`${type} recorded at ${point}`);
//         loadPunches();
//       } catch (err) { showMsg(err.response?.data?.message || "Punch failed", "error"); }
//       finally { setPunchLoading(null); }
//     }, () => { showMsg("Location permission denied", "error"); setPunchLoading(null); });
//   };

//   // ── Gate Entry ─────────────────────────────────────────────────
//   const submitGate = async (e) => {
//     e.preventDefault();
//     if (!gateForm.entryType || !gateForm.category) return showMsg("Entry Type and Category required", "error");
//     setSavingGate(true);
//     try {
//       await axios.post("/api/societymanagement/gate-entry", { societyId: society._id, ...gateForm }, { headers: { Authorization: `Bearer ${token}` } });
//       setGateForm({ gateName: "Main Gate", entryType: "IN", category: "Person", personName: "", vehicleNumber: "", purpose: "", contactNumber: "" });
//       showMsg("Gate entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingGate(false); }
//   };

//   // ── Building Entry ─────────────────────────────────────────────
//   const submitBuilding = async (e) => {
//     e.preventDefault();
//     if (!buildingForm.buildingName || !buildingForm.personName || !buildingForm.entryType)
//       return showMsg("Building, Person Name, Entry Type required", "error");
//     setSavingBuilding(true);
//     try {
//       const payload = {
//         societyId: society._id, buildingName: buildingForm.buildingName,
//         personName: buildingForm.personName, personType: buildingForm.personType,
//         entryType: buildingForm.entryType, purpose: buildingForm.purpose,
//         phone: buildingForm.phone, flatId: buildingForm.flatId || undefined,
//       };
//       await axios.post("/api/societymanagement/building-entry", payload, { headers: { Authorization: `Bearer ${token}` } });
//       setBuildingForm(prev => ({ ...prev, flatId: "", personName: "", personType: "Staff", entryType: "IN", purpose: "", phone: "" }));
//       showMsg("Building entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingBuilding(false); }
//   };

//   const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/signin"; };

//   // ── Loading / Empty ────────────────────────────────────────────
//   if (loading || !user) return <div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="flex flex-col items-center gap-3"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/><p className="text-sm text-gray-500">Loading duty information...</p></div></div>;
//   if (!assignment || !society) return <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4"><div className="text-center max-w-sm"><div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4"><FiMapPin className="text-3xl text-indigo-300"/></div><h2 className="text-xl font-bold text-gray-800 mb-1">No Active Assignment</h2><p className="text-sm text-gray-500">You are not assigned to any society. Contact your supervisor.</p></div></div>;

//   const isBuildingAssigned = assignedBuildingName !== "";

//   const tabs = [
//     { id: "attendance", label: "Attendance", icon: FiClock },
//     { id: "gate", label: "Gate Entry", icon: FiTruck },
//     { id: "building", label: "Building", icon: FiHome },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       {/* Top Bar */}
//       <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
//         <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
//           <div>
//             <h1 className="text-sm font-bold text-gray-900">{isGuard ? "🛡️ Guard Duty" : "🧹 Housekeeper"}</h1>
//             <p className="text-xs text-gray-500">{society.name}</p>
//             {assignedBuildingName && <p className="text-xs text-gray-400">{assignedBuildingName}</p>}
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-1.5 text-xs">
//               <div className={`w-2 h-2 rounded-full ${isClockedIn ? "bg-green-500" : "bg-red-500"}`} />
//               <span className="text-gray-500">{isClockedIn ? "On duty" : "Off duty"}</span>
//             </div>
//             <div className="relative">
//               <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 text-sm font-medium text-gray-700 focus:outline-none">
//                 <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
//                   {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G"}
//                 </div>
//                 <FiChevronDown className={`text-xs transition-transform ${profileOpen ? "rotate-180" : ""}`} />
//               </button>
//               {profileOpen && (
//                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//                   <div className="px-4 py-2 border-b border-gray-100"><p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p><p className="text-xs text-gray-500 truncate">{user?.email}</p></div>
//                   <button onClick={() => { setProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"><FiSignOut className="text-base" /> Sign Out</button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Toast */}
//       {message && (
//         <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
//           {message.type === "success" ? <FiCheckCircle className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
//           {message.text}
//         </div>
//       )}

//       {/* Shift info (attendance tab only) */}
//       {activeTab === "attendance" && (
//         <div className="max-w-md mx-auto w-full px-4 pt-4">
//           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
//             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600"><FiClock className="text-lg" /></div>
//             <div><p className="text-sm font-semibold text-gray-800">Current Shift</p><p className="text-xs text-gray-500">{shiftInfo}</p></div>
//           </div>
//         </div>
//       )}

//       {/* Content */}
//       <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 overflow-y-auto">
//         {/* Attendance Tab */}
//         {activeTab === "attendance" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <div className="flex items-center justify-between mb-3">
//               <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><FiMapPin className="text-indigo-600" /> My Attendance</h2>
//               <button onClick={loadPunches} className="text-xs text-indigo-600 font-bold flex items-center gap-1"><FiRefreshCw className="text-sm" /> Refresh</button>
//             </div>
//             {society.checkpoints?.length === 0 && <p className="text-xs text-gray-400">No checkpoints configured.</p>}
//             {society.checkpoints?.map(cp => (
//               <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2 last:mb-0">
//                 <div>
//                   <p className="text-sm font-semibold text-gray-800">{cp.name}</p>
//                   {cp.latitude && <p className="text-[10px] text-gray-400 flex items-center gap-1"><FiMapPin className="text-xs" /> Geo‑fenced</p>}
//                 </div>
//                 <div className="flex gap-2">
//                   <button onClick={() => punch(cp.name, "IN")} disabled={punchLoading === cp.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"><FiLogIn className="text-sm" /> IN</button>
//                   <button onClick={() => punch(cp.name, "OUT")} disabled={punchLoading === cp.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"><FiLogOut className="text-sm" /> OUT</button>
//                 </div>
//               </div>
//             ))}
//             {todayPunches.length > 0 && (
//               <div className="mt-3 pt-3 border-t border-gray-100">
//                 <p className="text-xs font-semibold text-gray-500 mb-1">Today's log</p>
//                 <div className="space-y-1 max-h-24 overflow-y-auto">
//                   {todayPunches.map(e => (
//                     <div key={e._id} className="flex justify-between text-xs">
//                       <span>{e.checkpointName} <span className={`font-bold ${e.checkpointType === "IN" ? "text-green-600" : "text-red-600"}`}>{e.checkpointType}</span></span>
//                       <span className="text-gray-400">{format(new Date(e.timestamp), "HH:mm")}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </section>
//         )}

//         {/* Gate Entry Tab */}
//         {activeTab === "gate" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><FiTruck className="text-indigo-600" /> Visitor / Vehicle Entry</h2>
//             <form onSubmit={submitGate} className="space-y-3">
//               {GATE_FIELDS.map(field => (
//                 <div key={field.name}>
//                   <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
//                   {field.type === "select" ? (
//                     <select value={gateForm[field.name]} onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})} required={field.required} className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
//                       {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//                     </select>
//                   ) : (
//                     <input type="text" placeholder={field.placeholder || ""} value={gateForm[field.name]} onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})} className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
//                   )}
//                 </div>
//               ))}
//               <button type="submit" disabled={savingGate} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{savingGate ? <FiLoader className="animate-spin" /> : null} Record Entry</button>
//             </form>
//           </section>
//         )}

//         {/* Building Entry Tab – enhanced */}
//         {activeTab === "building" && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><FiHome className="text-indigo-600" /> Building Entry / Exit</h2>
//             <form onSubmit={submitBuilding} className="space-y-3">
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Building *</label>
//                 <select
//                   value={buildingForm.buildingName}
//                   onChange={(e) => setBuildingForm({...buildingForm, buildingName: e.target.value})}
//                   required
//                   disabled={isBuildingAssigned}
//                   className={`w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 ${isBuildingAssigned ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
//                 >
//                   {isBuildingAssigned ? (
//                     <option value={assignedBuildingName}>{assignedBuildingName}</option>
//                   ) : (
//                     <>
//                       <option value="">Select...</option>
//                       {/* We don't have building list, so fallback to text input? No, we can just show a disabled message if no assignment. But if no building assigned, how does guard select? 
//                            We'll keep the dropdown empty, and guard can't select. Ideally they should have building list, but since API is 403, we can skip building dropdown and show a text input? 
//                            Let's keep it simple: if no building assigned, we show a text input for building name. */}
//                     </>
//                   )}
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Flat Number</label>
//                 <FlatSelector flats={flats} selectedFlatId={buildingForm.flatId} onSelect={(value) => setBuildingForm({...buildingForm, flatId: value})} />
//               </div>
//               <div><label className="block text-xs font-semibold text-gray-500 mb-1">Person Name *</label><input type="text" value={buildingForm.personName} onChange={e => setBuildingForm({...buildingForm, personName: e.target.value})} required className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" /></div>
//               <div><label className="block text-xs font-semibold text-gray-500 mb-1">Person Type</label><select value={buildingForm.personType} onChange={e => setBuildingForm({...buildingForm, personType: e.target.value})} className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"><option value="Staff">Staff</option><option value="Worker">Worker</option><option value="Resident">Resident</option><option value="Visitor">Visitor</option><option value="Other">Other</option></select></div>
//               <div><label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label><input type="text" value={buildingForm.phone} onChange={e => setBuildingForm({...buildingForm, phone: e.target.value})} className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" /></div>
//               <div><label className="block text-xs font-semibold text-gray-500 mb-1">IN/OUT *</label><select value={buildingForm.entryType} onChange={e => setBuildingForm({...buildingForm, entryType: e.target.value})} required className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"><option value="IN">IN</option><option value="OUT">OUT</option></select></div>
//               <div><label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label><input type="text" value={buildingForm.purpose} onChange={e => setBuildingForm({...buildingForm, purpose: e.target.value})} className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" /></div>
//               <button type="submit" disabled={savingBuilding} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{savingBuilding ? <FiLoader className="animate-spin" /> : null} Record Building Entry</button>
//             </form>
//           </section>
//         )}
//       </div>

//       {/* Bottom Tab Navigation */}
//       <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30">
//         <div className="max-w-md mx-auto flex">
//           {tabs.map(tab => {
//             const Icon = tab.icon;
//             return (
//               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "text-indigo-600" : "text-gray-500"}`}>
//                 <Icon className={`text-lg mb-0.5 ${activeTab === tab.id ? "text-indigo-600" : "text-gray-400"}`} />
//                 {tab.label}
//               </button>
//             );
//           })}
//         </div>
//       </nav>
//     </div>
//   );
// }



// "use client";
// import { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import {
//   FiLogIn, FiLogOut, FiTruck, FiClock, FiMapPin,
//   FiAlertCircle, FiChevronDown, FiLogOut as FiSignOut,
//   FiCheckCircle, FiLoader, FiRefreshCw, FiHome, FiSearch
// } from "react-icons/fi";
// import { format } from "date-fns";

// // ── Gate Entry fields (same as admin GateEntryPage) ────────────────
// const GATE_FIELDS = [
//   { name: "gateName", label: "Gate Name", type: "text", placeholder: "Main Gate" },
//   { name: "entryType", label: "Entry Type *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "category", label: "Category *", type: "select", required: true, options: [
//     { value: "Person", label: "Person" }, { value: "Bike", label: "Bike" },
//     { value: "Car", label: "Car" }, { value: "Truck", label: "Truck" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "personName", label: "Person Name", type: "text" },
//   { name: "vehicleNumber", label: "Vehicle Number", type: "text" },
//   { name: "purpose", label: "Purpose", type: "text" },
//   { name: "contactNumber", label: "Contact Number", type: "text" }
// ];

// // ── Building Entry fields (same as admin BuildingEntryPage) + flatId ─
// const BUILDING_FIELDS = [
//   { name: "buildingName", label: "Building *", type: "select", required: true, options: [] },
//   { name: "flatId", label: "Flat Number", type: "select", options: [] },
//   { name: "personName", label: "Person Name *", type: "text", required: true },
//   { name: "personType", label: "Person Type", type: "select", options: [
//     { value: "Staff", label: "Staff" }, { value: "Worker", label: "Worker" },
//     { value: "Resident", label: "Resident" }, { value: "Visitor", label: "Visitor" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "phone", label: "Phone", type: "text" },
//   { name: "entryType", label: "IN/OUT *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "purpose", label: "Purpose", type: "text" }
// ];

// // ── Advanced Flat Selector Component ─────────────────────────────
// function FlatSelector({ flats, selectedFlatId, onSelect }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");

//   const filtered = flats.filter(f =>
//     f.label.toLowerCase().includes(search.toLowerCase())
//   );

//   const selectedLabel = selectedFlatId
//     ? flats.find(f => f.value === selectedFlatId)?.label || "Select Flat"
//     : "Select Flat";

//   return (
//     <div className="relative">
//       <button
//         type="button"
//         onClick={() => setOpen(!open)}
//         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-indigo-400 transition-all flex items-center justify-between"
//       >
//         <span className={selectedFlatId ? "text-gray-900" : "text-gray-400"}>
//           {selectedLabel}
//         </span>
//         <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       <div
//         className={`absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top ${
//           open ? "scale-y-100 opacity-100 max-h-60" : "scale-y-0 opacity-0 max-h-0"
//         }`}
//       >
//         <div className="p-2">
//           <div className="relative">
//             <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
//             <input
//               type="text"
//               placeholder="Search flat..."
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-indigo-400"
//             />
//           </div>
//           <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
//             {filtered.length === 0 ? (
//               <p className="col-span-3 text-center text-xs text-gray-400 py-4">No flats found</p>
//             ) : (
//               filtered.map(flat => (
//                 <button
//                   key={flat.value}
//                   type="button"
//                   onClick={() => {
//                     onSelect(flat.value);
//                     setOpen(false);
//                   }}
//                   className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${
//                     selectedFlatId === flat.value
//                       ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
//                       : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600"
//                   }`}
//                 >
//                   {flat.label}
//                 </button>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Guard Page Component ─────────────────────────────────────
// export default function GuardPage() {
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ── Core state ──────────────────────────────────────────────────
//   const [user, setUser] = useState(null);
//   const [assignment, setAssignment] = useState(null);
//   const [society, setSociety] = useState(null);
//   const [shiftInfo, setShiftInfo] = useState("General");
//   const [isClockedIn, setIsClockedIn] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [todayPunches, setTodayPunches] = useState([]);
//   const [punchLoading, setPunchLoading] = useState(null);

//   // ── Gate & Building form states ─────────────────────────────────
//   const [gateForm, setGateForm] = useState({
//     gateName: "Main Gate", entryType: "IN", category: "Person",
//     personName: "", vehicleNumber: "", purpose: "", contactNumber: ""
//   });
//   const [savingGate, setSavingGate] = useState(false);

//   const [buildingForm, setBuildingForm] = useState({
//     buildingName: "", flatId: "", personName: "", personType: "Staff",
//     entryType: "IN", purpose: "", phone: ""
//   });
//   const [savingBuilding, setSavingBuilding] = useState(false);

//   // ── Dropdown data ──────────────────────────────────────────────
//   const [flats, setFlats] = useState([]);
//   const [buildings, setBuildings] = useState([]);   // ✅ नया स्टेट

//   const [message, setMessage] = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("attendance"); // attendance | gate | building

//   // ── Helpers ──────────────────────────────────────────────────────
//   const showMsg = (text, type = "success") => {
//     setMessage({ text, type });
//     setTimeout(() => setMessage(null), 4000);
//   };
//   const getUserId = () => user?._id || "";
//   const isGuard = user?.roles?.includes("Guard");

//   // ── Load user from localStorage ──────────────────────────────────
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem("user");
//       if (stored) setUser(JSON.parse(stored));
//     } catch (e) {}
//   }, []);

//   // ✅ Fetch buildings for the society
//   const fetchBuildings = async (societyId) => {
//     if (!societyId) return;
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/building?societyId=${societyId}&limit=100`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         const options = data.data.map(b => ({ value: b.name, label: b.name }));
//         setBuildings(options);
//       } else {
//         setBuildings([]);
//       }
//     } catch (e) {
//       console.error("Failed to fetch buildings", e);
//       setBuildings([]);
//     }
//   };

//   // ✅ Fetch flats for the society
//   const fetchFlats = async (societyId) => {
//     if (!societyId) return;
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/flat?societyId=${societyId}&limit=100`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         const options = data.data.map(f => ({ value: f._id, label: f.flatNumber }));
//         setFlats(options);
//       } else {
//         setFlats([]);
//       }
//     } catch (e) {
//       console.error("Failed to fetch flats", e);
//       setFlats([]);
//     }
//   };

//   // ── Load assignment & society, then buildings and flats ─────────
//   const loadDuty = useCallback(async () => {
//     if (!token || !user?._id) return;
//     try {
//       const { data: a } = await axios.get(
//         `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (a.success && a.data.length > 0) {
//         const asgn = a.data[0];
//         setAssignment(asgn);
//         setShiftInfo(
//           asgn.shiftId?.name ||
//           (asgn.customShiftStart ? `${asgn.customShiftStart} - ${asgn.customShiftEnd}` : "General")
//         );
//         const { data: s } = await axios.get(
//           `/api/societymanagement/society?id=${asgn.societyId._id || asgn.societyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (s.success) {
//           setSociety(s.data);
//           // ✅ लोड बिल्डिंग और फ्लैट
//           fetchBuildings(s.data._id);
//           fetchFlats(s.data._id);
//         } else {
//           setSociety(null);
//           setAssignment(null);
//         }
//       } else {
//         setAssignment(null); setSociety(null);
//       }
//     } catch (e) { console.error(e); }
//   }, [token, user]);

//   // ── Load today's punches ────────────────────────────────────────
//   const loadPunches = useCallback(async () => {
//     if (!society || !isGuard) return;
//     const today = new Date().toISOString().split("T")[0];
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/guard-entry?date=${today}&societyId=${society._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setTodayPunches(data.data);
//         if (data.data.length > 0) {
//           const last = data.data[data.data.length - 1];
//           setIsClockedIn(last.checkpointType === "IN");
//         } else setIsClockedIn(false);
//       }
//     } catch (e) {}
//   }, [society, isGuard]);

//   useEffect(() => {
//     if (token && user) { setLoading(true); loadDuty().finally(() => setLoading(false)); }
//   }, [loadDuty]);
//   useEffect(() => { if (society && isGuard) loadPunches(); }, [loadPunches]);

//   // ── Punch action ────────────────────────────────────────────────
//   const punch = async (point, type) => {
//     if (!navigator.geolocation) return showMsg("Location not supported", "error");
//     setPunchLoading(point);
//     navigator.geolocation.getCurrentPosition(async (pos) => {
//       try {
//         await axios.post("/api/societymanagement/guard-entry", {
//           companyUserId: getUserId(),
//           checkpointName: point,
//           checkpointType: type,
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//         }, { headers: { Authorization: `Bearer ${token}` } });
//         showMsg(`${type} recorded at ${point}`);
//         loadPunches();
//       } catch (err) { showMsg(err.response?.data?.message || "Punch failed", "error"); }
//       finally { setPunchLoading(null); }
//     }, () => { showMsg("Location permission denied", "error"); setPunchLoading(null); });
//   };

//   // ── Submit Gate Entry ────────────────────────────────────────────
//   const submitGate = async (e) => {
//     e.preventDefault();
//     if (!gateForm.entryType || !gateForm.category) return showMsg("Entry Type and Category required", "error");
//     setSavingGate(true);
//     try {
//       await axios.post("/api/societymanagement/gate-entry", {
//         societyId: society._id,
//         ...gateForm,
//       }, { headers: { Authorization: `Bearer ${token}` } });
//       setGateForm({ gateName: "Main Gate", entryType: "IN", category: "Person",
//         personName: "", vehicleNumber: "", purpose: "", contactNumber: "" });
//       showMsg("Gate entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingGate(false); }
//   };

//   // ── Submit Building Entry ────────────────────────────────────────
//   const submitBuilding = async (e) => {
//     e.preventDefault();
//     if (!buildingForm.buildingName || !buildingForm.personName || !buildingForm.entryType)
//       return showMsg("Building, Person Name, Entry Type required", "error");
//     setSavingBuilding(true);
//     try {
//       const payload = {
//         societyId: society._id,
//         buildingName: buildingForm.buildingName,
//         personName: buildingForm.personName,
//         personType: buildingForm.personType,
//         entryType: buildingForm.entryType,
//         purpose: buildingForm.purpose,
//         phone: buildingForm.phone,
//         flatId: buildingForm.flatId || undefined,
//       };
//       await axios.post("/api/societymanagement/building-entry", payload, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setBuildingForm({ buildingName: "", flatId: "", personName: "", personType: "Staff",
//         entryType: "IN", purpose: "", phone: "" });
//       showMsg("Building entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingBuilding(false); }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     window.location.href = "/signin";
//   };

//   // ── Loading / Empty states ──────────────────────────────────────
//   if (loading || !user) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
//           <p className="text-sm text-gray-500">Loading duty information...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!assignment || !society) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
//         <div className="text-center max-w-sm">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
//             <FiMapPin className="text-3xl text-indigo-300" />
//           </div>
//           <h2 className="text-xl font-bold text-gray-800 mb-1">No Active Assignment</h2>
//           <p className="text-sm text-gray-500">You are not assigned to any society. Contact your supervisor.</p>
//         </div>
//       </div>
//     );
//   }

//   // ── Dynamic dropdowns ────────────────────────────────────────────
//   const buildingOptions = buildings;   // ✅ बिल्डिंग API से आया डेटा

//   const tabs = [
//     { id: "attendance", label: "Attendance", icon: FiClock },
//     { id: "gate", label: "Gate Entry", icon: FiTruck },
//     { id: "building", label: "Building", icon: FiHome },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       {/* ── Top Bar ──────────────────────────────────────────────── */}
//       <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
//         <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
//           <div>
//             <h1 className="text-sm font-bold text-gray-900">
//               {isGuard ? "🛡️ Guard Duty" : "🧹 Housekeeper"}
//             </h1>
//             <p className="text-xs text-gray-500">{society.name}</p>
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-1.5 text-xs">
//               <div className={`w-2 h-2 rounded-full ${isClockedIn ? "bg-green-500" : "bg-red-500"}`} />
//               <span className="text-gray-500">{isClockedIn ? "On duty" : "Off duty"}</span>
//             </div>
//             <div className="relative">
//               <button
//                 onClick={() => setProfileOpen(!profileOpen)}
//                 className="flex items-center gap-2 text-sm font-medium text-gray-700 focus:outline-none"
//               >
//                 <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
//                   {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G"}
//                 </div>
//                 <FiChevronDown className={`text-xs transition-transform ${profileOpen ? "rotate-180" : ""}`} />
//               </button>
//               {profileOpen && (
//                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//                   <div className="px-4 py-2 border-b border-gray-100">
//                     <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
//                     <p className="text-xs text-gray-500 truncate">{user?.email}</p>
//                   </div>
//                   <button
//                     onClick={() => { setProfileOpen(false); handleLogout(); }}
//                     className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
//                   >
//                     <FiSignOut className="text-base" /> Sign Out
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* ── Toast message ─────────────────────────────────────────── */}
//       {message && (
//         <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg ${
//           message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
//         }`}>
//           {message.type === "success" ? <FiCheckCircle className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
//           {message.text}
//         </div>
//       )}

//       {/* ── Shift info (only on attendance tab) ──────────────────── */}
//       {activeTab === "attendance" && (
//         <div className="max-w-md mx-auto w-full px-4 pt-4">
//           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
//             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
//               <FiClock className="text-lg" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-gray-800">Current Shift</p>
//               <p className="text-xs text-gray-500">{shiftInfo}</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Content area ──────────────────────────────────────────── */}
//       <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 overflow-y-auto">
//         {/* Attendance Tab */}
//         {activeTab === "attendance" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <div className="flex items-center justify-between mb-3">
//               <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
//                 <FiMapPin className="text-indigo-600" /> My Attendance
//               </h2>
//               <button onClick={loadPunches} className="text-xs text-indigo-600 font-bold flex items-center gap-1">
//                 <FiRefreshCw className="text-sm" /> Refresh
//               </button>
//             </div>
//             {society.checkpoints?.length === 0 && (
//               <p className="text-xs text-gray-400">No checkpoints configured.</p>
//             )}
//             {society.checkpoints?.map(cp => (
//               <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2 last:mb-0">
//                 <div>
//                   <p className="text-sm font-semibold text-gray-800">{cp.name}</p>
//                   {cp.latitude && (
//                     <p className="text-[10px] text-gray-400 flex items-center gap-1">
//                       <FiMapPin className="text-xs" /> Geo‑fenced
//                     </p>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => punch(cp.name, "IN")}
//                     disabled={punchLoading === cp.name}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
//                   >
//                     {punchLoading === cp.name ? <FiLoader className="animate-spin text-sm" /> : <><FiLogIn className="text-sm" /> IN</>}
//                   </button>
//                   <button
//                     onClick={() => punch(cp.name, "OUT")}
//                     disabled={punchLoading === cp.name}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
//                   >
//                     {punchLoading === cp.name ? <FiLoader className="animate-spin text-sm" /> : <><FiLogOut className="text-sm" /> OUT</>}
//                   </button>
//                 </div>
//               </div>
//             ))}
//             {todayPunches.length > 0 && (
//               <div className="mt-3 pt-3 border-t border-gray-100">
//                 <p className="text-xs font-semibold text-gray-500 mb-1">Today's log</p>
//                 <div className="space-y-1 max-h-24 overflow-y-auto">
//                   {todayPunches.map(e => (
//                     <div key={e._id} className="flex justify-between text-xs">
//                       <span>{e.checkpointName} <span className={`font-bold ${e.checkpointType === "IN" ? "text-green-600" : "text-red-600"}`}>{e.checkpointType}</span></span>
//                       <span className="text-gray-400">{format(new Date(e.timestamp), "HH:mm")}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </section>
//         )}

//         {/* Gate Entry Tab */}
//         {activeTab === "gate" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
//               <FiTruck className="text-indigo-600" /> Visitor / Vehicle Entry
//             </h2>
//             <form onSubmit={submitGate} className="space-y-3">
//               {GATE_FIELDS.map(field => (
//                 <div key={field.name}>
//                   <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
//                   {field.type === "select" ? (
//                     <select
//                       value={gateForm[field.name]}
//                       onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})}
//                       required={field.required}
//                       className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                     >
//                       {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//                     </select>
//                   ) : (
//                     <input
//                       type="text"
//                       placeholder={field.placeholder || ""}
//                       value={gateForm[field.name]}
//                       onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})}
//                       className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                     />
//                   )}
//                 </div>
//               ))}
//               <button type="submit" disabled={savingGate}
//                 className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
//                 {savingGate ? <FiLoader className="animate-spin" /> : null} Record Entry
//               </button>
//             </form>
//           </section>
//         )}

//         {/* Building Entry Tab (Guard & Housekeeper) */}
//         {activeTab === "building" && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
//               <FiHome className="text-indigo-600" /> Building Entry / Exit
//             </h2>
//             <form onSubmit={submitBuilding} className="space-y-3">
//               {/* Building Name */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Building *</label>
//                 <select
//                   value={buildingForm.buildingName}
//                   onChange={e => setBuildingForm({...buildingForm, buildingName: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="">Select...</option>
//                   {buildingOptions.map(o => (
//                     <option key={o.value} value={o.value}>{o.label}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Flat Number – Advanced Selector */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Flat Number</label>
//                 <FlatSelector
//                   flats={flats}
//                   selectedFlatId={buildingForm.flatId}
//                   onSelect={(value) => setBuildingForm({...buildingForm, flatId: value})}
//                 />
//               </div>

//               {/* Person Name */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Person Name *</label>
//                 <input
//                   type="text"
//                   value={buildingForm.personName}
//                   onChange={e => setBuildingForm({...buildingForm, personName: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               {/* Person Type */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Person Type</label>
//                 <select
//                   value={buildingForm.personType}
//                   onChange={e => setBuildingForm({...buildingForm, personType: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="Staff">Staff</option>
//                   <option value="Worker">Worker</option>
//                   <option value="Resident">Resident</option>
//                   <option value="Visitor">Visitor</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>

//               {/* Phone */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
//                 <input
//                   type="text"
//                   value={buildingForm.phone}
//                   onChange={e => setBuildingForm({...buildingForm, phone: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               {/* Entry Type (IN/OUT) */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">IN/OUT *</label>
//                 <select
//                   value={buildingForm.entryType}
//                   onChange={e => setBuildingForm({...buildingForm, entryType: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="IN">IN</option>
//                   <option value="OUT">OUT</option>
//                 </select>
//               </div>

//               {/* Purpose */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label>
//                 <input
//                   type="text"
//                   value={buildingForm.purpose}
//                   onChange={e => setBuildingForm({...buildingForm, purpose: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={savingBuilding}
//                 className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
//               >
//                 {savingBuilding ? <FiLoader className="animate-spin" /> : null} Record Building Entry
//               </button>
//             </form>
//           </section>
//         )}
//       </div>

//       {/* ── Bottom Tab Navigation ──────────────────────────────────── */}
//       <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30">
//         <div className="max-w-md mx-auto flex">
//           {tabs.map(tab => {
//             const Icon = tab.icon;
//             const isActive = activeTab === tab.id;
//             return (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
//                   isActive ? "text-indigo-600" : "text-gray-500"
//                 }`}
//               >
//                 <Icon className={`text-lg mb-0.5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
//                 {tab.label}
//               </button>
//             );
//           })}
//         </div>
//       </nav>
//     </div>
//   );
// }



// "use client";
// import { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import {
//   FiLogIn, FiLogOut, FiTruck, FiClock, FiMapPin,
//   FiAlertCircle, FiChevronDown, FiLogOut as FiSignOut,
//   FiCheckCircle, FiLoader, FiRefreshCw, FiHome, FiSearch
// } from "react-icons/fi";
// import { format } from "date-fns";

// // ── Gate Entry fields (same as admin GateEntryPage) ────────────────
// const GATE_FIELDS = [
//   { name: "gateName", label: "Gate Name", type: "text", placeholder: "Main Gate" },
//   { name: "entryType", label: "Entry Type *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "category", label: "Category *", type: "select", required: true, options: [
//     { value: "Person", label: "Person" }, { value: "Bike", label: "Bike" },
//     { value: "Car", label: "Car" }, { value: "Truck", label: "Truck" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "personName", label: "Person Name", type: "text" },
//   { name: "vehicleNumber", label: "Vehicle Number", type: "text" },
//   { name: "purpose", label: "Purpose", type: "text" },
//   { name: "contactNumber", label: "Contact Number", type: "text" }
// ];

// // ── Building Entry fields (same as admin BuildingEntryPage) + flatId ─
// const BUILDING_FIELDS = [
//   { name: "buildingName", label: "Building *", type: "select", required: true, options: [] },
//   { name: "flatId", label: "Flat Number", type: "select", options: [] },
//   { name: "personName", label: "Person Name *", type: "text", required: true },
//   { name: "personType", label: "Person Type", type: "select", options: [
//     { value: "Staff", label: "Staff" }, { value: "Worker", label: "Worker" },
//     { value: "Resident", label: "Resident" }, { value: "Visitor", label: "Visitor" },
//     { value: "Other", label: "Other" }
//   ]},
//   { name: "phone", label: "Phone", type: "text" },
//   { name: "entryType", label: "IN/OUT *", type: "select", required: true, options: [
//     { value: "IN", label: "IN" }, { value: "OUT", label: "OUT" }
//   ]},
//   { name: "purpose", label: "Purpose", type: "text" }
// ];

// // ── Advanced Flat Selector Component ─────────────────────────────
// function FlatSelector({ flats, selectedFlatId, onSelect }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");

//   const filtered = flats.filter(f =>
//     f.label.toLowerCase().includes(search.toLowerCase())
//   );

//   const selectedLabel = selectedFlatId
//     ? flats.find(f => f.value === selectedFlatId)?.label || "Select Flat"
//     : "Select Flat";

//   return (
//     <div className="relative">
//       <button
//         type="button"
//         onClick={() => setOpen(!open)}
//         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-indigo-400 transition-all flex items-center justify-between"
//       >
//         <span className={selectedFlatId ? "text-gray-900" : "text-gray-400"}>
//           {selectedLabel}
//         </span>
//         <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       <div
//         className={`absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all duration-200 origin-top ${
//           open ? "scale-y-100 opacity-100 max-h-60" : "scale-y-0 opacity-0 max-h-0"
//         }`}
//       >
//         <div className="p-2">
//           <div className="relative">
//             <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
//             <input
//               type="text"
//               placeholder="Search flat..."
//               value={search}
//               onChange={e => setSearch(e.target.value)}
//               className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg mb-2 focus:outline-none focus:border-indigo-400"
//             />
//           </div>
//           <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
//             {filtered.length === 0 ? (
//               <p className="col-span-3 text-center text-xs text-gray-400 py-4">No flats found</p>
//             ) : (
//               filtered.map(flat => (
//                 <button
//                   key={flat.value}
//                   type="button"
//                   onClick={() => {
//                     onSelect(flat.value);
//                     setOpen(false);
//                   }}
//                   className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center ${
//                     selectedFlatId === flat.value
//                       ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
//                       : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-600"
//                   }`}
//                 >
//                   {flat.label}
//                 </button>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main Guard Page Component ─────────────────────────────────────
// export default function GuardPage() {
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ── Core state ──────────────────────────────────────────────────
//   const [user, setUser] = useState(null);
//   const [assignment, setAssignment] = useState(null);
//   const [society, setSociety] = useState(null);
//   const [shiftInfo, setShiftInfo] = useState("General");
//   const [isClockedIn, setIsClockedIn] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [todayPunches, setTodayPunches] = useState([]);
//   const [punchLoading, setPunchLoading] = useState(null);

//   // ── Gate & Building form states ─────────────────────────────────
//   const [gateForm, setGateForm] = useState({
//     gateName: "Main Gate", entryType: "IN", category: "Person",
//     personName: "", vehicleNumber: "", purpose: "", contactNumber: ""
//   });
//   const [savingGate, setSavingGate] = useState(false);

//   const [buildingForm, setBuildingForm] = useState({
//     buildingName: "", flatId: "", personName: "", personType: "Staff",
//     entryType: "IN", purpose: "", phone: ""
//   });
//   const [savingBuilding, setSavingBuilding] = useState(false);

//   const [flats, setFlats] = useState([]);                 // Flat dropdown
//   const [message, setMessage] = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("attendance"); // attendance | gate | building

//   // ── Helpers ──────────────────────────────────────────────────────
//   const showMsg = (text, type = "success") => {
//     setMessage({ text, type });
//     setTimeout(() => setMessage(null), 4000);
//   };
//   const getUserId = () => user?._id || "";
//   const isGuard = user?.roles?.includes("Guard");

//   // ── Load user from localStorage ──────────────────────────────────
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem("user");
//       if (stored) setUser(JSON.parse(stored));
//     } catch (e) {}
//   }, []);

//   // ── Load assignment & society, then flats ────────────────────────
//   const loadDuty = useCallback(async () => {
//     if (!token || !user?._id) return;
//     try {
//       const { data: a } = await axios.get(
//         `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (a.success && a.data.length > 0) {
//         const asgn = a.data[0];
//         setAssignment(asgn);
//         setShiftInfo(
//           asgn.shiftId?.name ||
//           (asgn.customShiftStart ? `${asgn.customShiftStart} - ${asgn.customShiftEnd}` : "General")
//         );
//         const { data: s } = await axios.get(
//           `/api/societymanagement/society?id=${asgn.societyId._id || asgn.societyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (s.success) {
//           setSociety(s.data);
//           // Fetch flats for the society
//           fetchFlats(s.data._id);
//         } else {
//           setSociety(null);
//           setAssignment(null);
//         }
//       } else {
//         setAssignment(null); setSociety(null);
//       }
//     } catch (e) { console.error(e); }
//   }, [token, user]);

//   // ✅ Fetch flats for the society (with error handling)
//   const fetchFlats = async (societyId) => {
//     if (!societyId) return;
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/flat?societyId=${societyId}&limit=100`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         const options = data.data.map(f => ({ value: f._id, label: f.flatNumber }));
//         setFlats(options);
//       } else {
//         setFlats([]);
//       }
//     } catch (e) {
//       console.error("Failed to fetch flats", e);
//       setFlats([]);
//     }
//   };

//   // ── Load today's punches ────────────────────────────────────────
//   const loadPunches = useCallback(async () => {
//     if (!society || !isGuard) return;
//     const today = new Date().toISOString().split("T")[0];
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/guard-entry?date=${today}&societyId=${society._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setTodayPunches(data.data);
//         if (data.data.length > 0) {
//           const last = data.data[data.data.length - 1];
//           setIsClockedIn(last.checkpointType === "IN");
//         } else setIsClockedIn(false);
//       }
//     } catch (e) {}
//   }, [society, isGuard]);

//   useEffect(() => {
//     if (token && user) { setLoading(true); loadDuty().finally(() => setLoading(false)); }
//   }, [loadDuty]);
//   useEffect(() => { if (society && isGuard) loadPunches(); }, [loadPunches]);

//   // ── Punch action ────────────────────────────────────────────────
//   const punch = async (point, type) => {
//     if (!navigator.geolocation) return showMsg("Location not supported", "error");
//     setPunchLoading(point);
//     navigator.geolocation.getCurrentPosition(async (pos) => {
//       try {
//         await axios.post("/api/societymanagement/guard-entry", {
//           companyUserId: getUserId(),
//           checkpointName: point,
//           checkpointType: type,
//           latitude: pos.coords.latitude,
//           longitude: pos.coords.longitude,
//         }, { headers: { Authorization: `Bearer ${token}` } });
//         showMsg(`${type} recorded at ${point}`);
//         loadPunches();
//       } catch (err) { showMsg(err.response?.data?.message || "Punch failed", "error"); }
//       finally { setPunchLoading(null); }
//     }, () => { showMsg("Location permission denied", "error"); setPunchLoading(null); });
//   };

//   // ── Submit Gate Entry ────────────────────────────────────────────
//   const submitGate = async (e) => {
//     e.preventDefault();
//     if (!gateForm.entryType || !gateForm.category) return showMsg("Entry Type and Category required", "error");
//     setSavingGate(true);
//     try {
//       await axios.post("/api/societymanagement/gate-entry", {
//         societyId: society._id,
//         ...gateForm,
//       }, { headers: { Authorization: `Bearer ${token}` } });
//       setGateForm({ gateName: "Main Gate", entryType: "IN", category: "Person",
//         personName: "", vehicleNumber: "", purpose: "", contactNumber: "" });
//       showMsg("Gate entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingGate(false); }
//   };

//   // ── Submit Building Entry ────────────────────────────────────────
//   const submitBuilding = async (e) => {
//     e.preventDefault();
//     if (!buildingForm.buildingName || !buildingForm.personName || !buildingForm.entryType)
//       return showMsg("Building, Person Name, Entry Type required", "error");
//     setSavingBuilding(true);
//     try {
//       const payload = {
//         societyId: society._id,
//         buildingName: buildingForm.buildingName,
//         personName: buildingForm.personName,
//         personType: buildingForm.personType,
//         entryType: buildingForm.entryType,
//         purpose: buildingForm.purpose,
//         phone: buildingForm.phone,
//         flatId: buildingForm.flatId || undefined,
//       };
//       await axios.post("/api/societymanagement/building-entry", payload, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setBuildingForm({ buildingName: "", flatId: "", personName: "", personType: "Staff",
//         entryType: "IN", purpose: "", phone: "" });
//       showMsg("Building entry recorded");
//     } catch (err) { showMsg("Failed", "error"); }
//     finally { setSavingBuilding(false); }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     window.location.href = "/signin";
//   };

//   // ── Loading / Empty states ──────────────────────────────────────
//   if (loading || !user) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
//           <p className="text-sm text-gray-500">Loading duty information...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!assignment || !society) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
//         <div className="text-center max-w-sm">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
//             <FiMapPin className="text-3xl text-indigo-300" />
//           </div>
//           <h2 className="text-xl font-bold text-gray-800 mb-1">No Active Assignment</h2>
//           <p className="text-sm text-gray-500">You are not assigned to any society. Contact your supervisor.</p>
//         </div>
//       </div>
//     );
//   }

//   // ── Dynamic dropdowns ────────────────────────────────────────────
//   const buildingOptions = society?.checkpoints?.map(cp => ({ value: cp.name, label: cp.name })) || [];
//   // We'll use the flats state directly in FlatSelector, no need to modify BUILDING_FIELDS

//   const tabs = [
//     { id: "attendance", label: "Attendance", icon: FiClock },
//     { id: "gate", label: "Gate Entry", icon: FiTruck },
//     { id: "building", label: "Building", icon: FiHome },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       {/* ── Top Bar ──────────────────────────────────────────────── */}
//       <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
//         <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
//           <div>
//             <h1 className="text-sm font-bold text-gray-900">
//               {isGuard ? "🛡️ Guard Duty" : "🧹 Housekeeper"}
//             </h1>
//             <p className="text-xs text-gray-500">{society.name}</p>
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-1.5 text-xs">
//               <div className={`w-2 h-2 rounded-full ${isClockedIn ? "bg-green-500" : "bg-red-500"}`} />
//               <span className="text-gray-500">{isClockedIn ? "On duty" : "Off duty"}</span>
//             </div>
//             <div className="relative">
//               <button
//                 onClick={() => setProfileOpen(!profileOpen)}
//                 className="flex items-center gap-2 text-sm font-medium text-gray-700 focus:outline-none"
//               >
//                 <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
//                   {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "G"}
//                 </div>
//                 <FiChevronDown className={`text-xs transition-transform ${profileOpen ? "rotate-180" : ""}`} />
//               </button>
//               {profileOpen && (
//                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//                   <div className="px-4 py-2 border-b border-gray-100">
//                     <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
//                     <p className="text-xs text-gray-500 truncate">{user?.email}</p>
//                   </div>
//                   <button
//                     onClick={() => { setProfileOpen(false); handleLogout(); }}
//                     className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
//                   >
//                     <FiSignOut className="text-base" /> Sign Out
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* ── Toast message ─────────────────────────────────────────── */}
//       {message && (
//         <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg ${
//           message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
//         }`}>
//           {message.type === "success" ? <FiCheckCircle className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
//           {message.text}
//         </div>
//       )}

//       {/* ── Shift info (only on attendance tab) ──────────────────── */}
//       {activeTab === "attendance" && (
//         <div className="max-w-md mx-auto w-full px-4 pt-4">
//           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
//             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
//               <FiClock className="text-lg" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold text-gray-800">Current Shift</p>
//               <p className="text-xs text-gray-500">{shiftInfo}</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── Content area ──────────────────────────────────────────── */}
//       <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 overflow-y-auto">
//         {/* Attendance Tab */}
//         {activeTab === "attendance" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <div className="flex items-center justify-between mb-3">
//               <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
//                 <FiMapPin className="text-indigo-600" /> My Attendance
//               </h2>
//               <button onClick={loadPunches} className="text-xs text-indigo-600 font-bold flex items-center gap-1">
//                 <FiRefreshCw className="text-sm" /> Refresh
//               </button>
//             </div>
//             {society.checkpoints?.length === 0 && (
//               <p className="text-xs text-gray-400">No checkpoints configured.</p>
//             )}
//             {society.checkpoints?.map(cp => (
//               <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200 mb-2 last:mb-0">
//                 <div>
//                   <p className="text-sm font-semibold text-gray-800">{cp.name}</p>
//                   {cp.latitude && (
//                     <p className="text-[10px] text-gray-400 flex items-center gap-1">
//                       <FiMapPin className="text-xs" /> Geo‑fenced
//                     </p>
//                   )}
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => punch(cp.name, "IN")}
//                     disabled={punchLoading === cp.name}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
//                   >
//                     {punchLoading === cp.name ? <FiLoader className="animate-spin text-sm" /> : <><FiLogIn className="text-sm" /> IN</>}
//                   </button>
//                   <button
//                     onClick={() => punch(cp.name, "OUT")}
//                     disabled={punchLoading === cp.name}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
//                   >
//                     {punchLoading === cp.name ? <FiLoader className="animate-spin text-sm" /> : <><FiLogOut className="text-sm" /> OUT</>}
//                   </button>
//                 </div>
//               </div>
//             ))}
//             {todayPunches.length > 0 && (
//               <div className="mt-3 pt-3 border-t border-gray-100">
//                 <p className="text-xs font-semibold text-gray-500 mb-1">Today's log</p>
//                 <div className="space-y-1 max-h-24 overflow-y-auto">
//                   {todayPunches.map(e => (
//                     <div key={e._id} className="flex justify-between text-xs">
//                       <span>{e.checkpointName} <span className={`font-bold ${e.checkpointType === "IN" ? "text-green-600" : "text-red-600"}`}>{e.checkpointType}</span></span>
//                       <span className="text-gray-400">{format(new Date(e.timestamp), "HH:mm")}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </section>
//         )}

//         {/* Gate Entry Tab */}
//         {activeTab === "gate" && isGuard && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
//               <FiTruck className="text-indigo-600" /> Visitor / Vehicle Entry
//             </h2>
//             <form onSubmit={submitGate} className="space-y-3">
//               {GATE_FIELDS.map(field => (
//                 <div key={field.name}>
//                   <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
//                   {field.type === "select" ? (
//                     <select
//                       value={gateForm[field.name]}
//                       onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})}
//                       required={field.required}
//                       className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                     >
//                       {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
//                     </select>
//                   ) : (
//                     <input
//                       type="text"
//                       placeholder={field.placeholder || ""}
//                       value={gateForm[field.name]}
//                       onChange={e => setGateForm({...gateForm, [field.name]: e.target.value})}
//                       className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                     />
//                   )}
//                 </div>
//               ))}
//               <button type="submit" disabled={savingGate}
//                 className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
//                 {savingGate ? <FiLoader className="animate-spin" /> : null} Record Entry
//               </button>
//             </form>
//           </section>
//         )}

//         {/* Building Entry Tab (Guard & Housekeeper) */}
//         {activeTab === "building" && (
//           <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
//             <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
//               <FiHome className="text-indigo-600" /> Building Entry / Exit
//             </h2>
//             <form onSubmit={submitBuilding} className="space-y-3">
//               {/* Building Name */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Building *</label>
//                 <select
//                   value={buildingForm.buildingName}
//                   onChange={e => setBuildingForm({...buildingForm, buildingName: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="">Select...</option>
//                   {buildingOptions.map(o => (
//                     <option key={o.value} value={o.value}>{o.label}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Flat Number – Advanced Selector */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Flat Number</label>
//                 <FlatSelector
//                   flats={flats}
//                   selectedFlatId={buildingForm.flatId}
//                   onSelect={(value) => setBuildingForm({...buildingForm, flatId: value})}
//                 />
//               </div>

//               {/* Person Name */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Person Name *</label>
//                 <input
//                   type="text"
//                   value={buildingForm.personName}
//                   onChange={e => setBuildingForm({...buildingForm, personName: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               {/* Person Type */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Person Type</label>
//                 <select
//                   value={buildingForm.personType}
//                   onChange={e => setBuildingForm({...buildingForm, personType: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="Staff">Staff</option>
//                   <option value="Worker">Worker</option>
//                   <option value="Resident">Resident</option>
//                   <option value="Visitor">Visitor</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>

//               {/* Phone */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
//                 <input
//                   type="text"
//                   value={buildingForm.phone}
//                   onChange={e => setBuildingForm({...buildingForm, phone: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               {/* Entry Type (IN/OUT) */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">IN/OUT *</label>
//                 <select
//                   value={buildingForm.entryType}
//                   onChange={e => setBuildingForm({...buildingForm, entryType: e.target.value})}
//                   required
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 >
//                   <option value="IN">IN</option>
//                   <option value="OUT">OUT</option>
//                 </select>
//               </div>

//               {/* Purpose */}
//               <div>
//                 <label className="block text-xs font-semibold text-gray-500 mb-1">Purpose</label>
//                 <input
//                   type="text"
//                   value={buildingForm.purpose}
//                   onChange={e => setBuildingForm({...buildingForm, purpose: e.target.value})}
//                   className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={savingBuilding}
//                 className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
//               >
//                 {savingBuilding ? <FiLoader className="animate-spin" /> : null} Record Building Entry
//               </button>
//             </form>
//           </section>
//         )}
//       </div>

//       {/* ── Bottom Tab Navigation ──────────────────────────────────── */}
//       <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-30">
//         <div className="max-w-md mx-auto flex">
//           {tabs.map(tab => {
//             const Icon = tab.icon;
//             const isActive = activeTab === tab.id;
//             return (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
//                   isActive ? "text-indigo-600" : "text-gray-500"
//                 }`}
//               >
//                 <Icon className={`text-lg mb-0.5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
//                 {tab.label}
//               </button>
//             );
//           })}
//         </div>
//       </nav>
//     </div>
//   );
// }








