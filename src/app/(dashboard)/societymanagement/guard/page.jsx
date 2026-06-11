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
  Key:         () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  History:     () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M7.7 7.7A10 10 0 1 0 12 2"/></svg>,
  Location:    () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
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

// ── Geolocation helper (Capacitor-first, browser fallback) ────────
/**
 * Returns { latitude, longitude } or throws an error with a user-friendly
 * .userMessage property set so callers can display it directly.
 *
 * Strategy:
 *  1. Try @capacitor/geolocation (native app)
 *  2. If Capacitor is unavailable or throws, fall back to browser geolocation
 *  3. Classify every known error code into a clear message
 */
async function getLocation() {
  // ── helper: get coords via browser Geolocation API (returns a Promise) ──
  const browserGeo = () =>
    new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        const e = new Error("Geolocation not supported");
        e.userMessage = "Location is not supported on this device/browser.";
        return reject(e);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => {
          const e = new Error(err.message);
          switch (err.code) {
            case 1: // PERMISSION_DENIED
              e.userMessage = "Location permission denied. Please enable it in your device settings and try again.";
              break;
            case 2: // POSITION_UNAVAILABLE
              e.userMessage = "Your location could not be determined. Please check that GPS is turned on.";
              break;
            case 3: // TIMEOUT
              e.userMessage = "Location request timed out. Move to an open area and try again.";
              break;
            default:
              e.userMessage = "Could not get location. Please check GPS and try again.";
          }
          reject(e);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  // ── Try Capacitor first ──────────────────────────────────────────
  try {
    const { Geolocation } = await import("@capacitor/geolocation");

    // Request permission if not already granted
    let perm = await Geolocation.checkPermissions();
    if (perm.location === "prompt" || perm.location === "prompt-with-rationale") {
      perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    }
    if (perm.location === "denied") {
      const e = new Error("Permission denied");
      e.userMessage = "Location permission denied. Please enable it in your device settings → App → Location → Allow.";
      throw e;
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (capErr) {
    // If the error already has our userMessage (e.g. permission denied), rethrow
    if (capErr.userMessage) throw capErr;

    // Capacitor not available / plugin not found / unknown → fall back to browser
    console.warn("[Geolocation] Capacitor failed, trying browser fallback:", capErr);
    try {
      return await browserGeo();
    } catch (browserErr) {
      throw browserErr; // already has userMessage
    }
  }
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
    if (message) { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[100] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-[92vw] border ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
      style={{ top: `max(env(safe-area-inset-top, 0px), 16px)` }}
    >
      <span className="flex-shrink-0 mt-0.5">{message.type === "success" ? <Icons.Check /> : <Icons.Alert />}</span>
      <span className="leading-snug">{message.text}</span>
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100 flex-shrink-0 mt-0.5"><Icons.X /></button>
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
        inputMode={type === "tel" ? "numeric" : undefined}
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

// ── Location Permission Banner ────────────────────────────────────
function LocationPermissionBanner({ onRetry }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icons.Location />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-amber-800">Location Permission Required</p>
        <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
          To punch IN/OUT, please allow location access. Go to <strong>Settings → App → Location → Allow</strong>, then tap Retry.
        </p>
        <button onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
          <Icons.Refresh /> Retry
        </button>
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
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-semibold text-gray-800 truncate">{entry.personName}</p>
              <p className="text-[11px] text-gray-500 truncate">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0">
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
  const [punchLoading,          setPunchLoading]          = useState(null);
  const [locationDenied,        setLocationDenied]        = useState(false);

  // ── Gate entry state ───────────────────────────────────────────
  const [gateForm,        setGateForm]        = useState(EMPTY_GATE_FORM);
  const [gateErrors,      setGateErrors]      = useState({});
  const [gateTouched,     setGateTouched]     = useState({});
  const [savingGate,      setSavingGate]      = useState(false);
  const [exitingGateIds,  setExitingGateIds]  = useState(new Set());
  const [activeVisitors,  setActiveVisitors]  = useState([]);
  const [recentVisitors,  setRecentVisitors]  = useState([]);

  // ── Building entry state ───────────────────────────────────────
  const [buildingForm,          setBuildingForm]          = useState(EMPTY_BUILDING_FORM());
  const [buildingErrors,        setBuildingErrors]        = useState({});
  const [buildingTouched,       setBuildingTouched]       = useState({});
  const [savingBuilding,        setSavingBuilding]        = useState(false);
  const [exitingBuildingIds,    setExitingBuildingIds]    = useState(new Set());
  const [activeBuildingEntries, setActiveBuildingEntries] = useState([]);
  const [recentBuildingPersons, setRecentBuildingPersons] = useState([]);

  const [flats,              setFlats]              = useState([]);
  const [message,            setMessage]            = useState(null);
  const [profileOpen,        setProfileOpen]        = useState(false);
  const [activeTab,          setActiveTab]          = useState("attendance");
  const [allGateEntries,     setAllGateEntries]     = useState([]);
  const [allBuildingEntries, setAllBuildingEntries] = useState([]);
  const [historyFilter,      setHistoryFilter]      = useState("all");

  const showMsg = useCallback((text, type = "success") => setMessage({ text, type }), []);
  const isGuard = user?.roles?.includes("Guard");

  // ── Bootstrap ────────────────────────────────────────────────
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

  // ── Fetch flats ─────────────────────────────────────────────
  const fetchFlats = useCallback(async (societyId, buildingId) => {
    if (!societyId || !token) return;
    try {
      let url = `/api/societymanagement/flat?societyId=${societyId}&limit=200`;
      if (buildingId) url += `&buildingId=${buildingId}`;
      const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
    } catch { setFlats([]); }
  }, [token]);

  // ── Fetch active entries ────────────────────────────────────
  const loadActiveGateEntries = useCallback(async (soc) => {
    if (!soc || !token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await axios.get(
        `/api/societymanagement/gate-entry?societyId=${soc._id}&date=${today}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setActiveVisitors(filterActiveEntries(data.data));
        setAllGateEntries(data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
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
      if (data.success) {
        setActiveBuildingEntries(filterActiveEntries(data.data));
        setAllBuildingEntries(data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) { console.error("[loadActiveBuildingEntries]", err); }
  }, [token]);

  // ── Load duty + society ─────────────────────────────────────
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

  // ── Load today's punches ────────────────────────────────────
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

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => {
    if (token && user?._id) {
      setLoading(true);
      loadDuty().finally(() => setLoading(false));
    }
  }, [loadDuty, token, user?._id]);

  useEffect(() => {
    if (society && isGuard) loadPunches(society);
  }, [society, isGuard]);

  // ── Live validation: gate form ─────────────────────────────
  useEffect(() => {
    const e = {};
    if (gateTouched.personName) { const err = validators.personName(gateForm.personName); if (err) e.personName = err; }
    if (gateTouched.phone && gateForm.phone) { const err = validators.phone(gateForm.phone); if (err) e.phone = err; }
    if (gateTouched.vehicleNumber && gateForm.vehicleNumber) { const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) e.vehicleNumber = err; }
    setGateErrors(e);
  }, [gateForm, gateTouched]);

  // ── Live validation: building form ─────────────────────────
  useEffect(() => {
    const e = {};
    if (buildingTouched.buildingName && !buildingForm.buildingName) e.buildingName = "Building is required";
    if (buildingTouched.personName) { const err = validators.personName(buildingForm.personName); if (err) e.personName = err; }
    if (buildingTouched.phone && buildingForm.phone) { const err = validators.phone(buildingForm.phone); if (err) e.phone = err; }
    setBuildingErrors(e);
  }, [buildingForm, buildingTouched]);

  // ── Punch IN / OUT ─────────────────────────────────────────
  const punch = async (cpName, cpType) => {
    const key = cpName + cpType;
    setPunchLoading(key);
    setLocationDenied(false);

    try {
      const { latitude, longitude } = await getLocation();

      await axios.post(
        "/api/societymanagement/guard-entry",
        {
          companyUserId:  user._id,
          checkpointName: cpName,
          checkpointType: cpType,
          latitude,
          longitude,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg(`${cpType === "IN" ? "✅ Punched IN" : "🔴 Punched OUT"} at ${cpName}`);
      await loadPunches(society);
    } catch (err) {
      console.error("[punch error]", err);
      const msg = err.userMessage || err?.response?.data?.message || "Punch failed. Please try again.";
      // If it's a location permission error, show the banner too
      if (err.userMessage?.toLowerCase().includes("permission")) {
        setLocationDenied(true);
      }
      showMsg(msg, "error");
    } finally {
      setPunchLoading(null);
    }
  };

  // ── Submit gate entry IN ───────────────────────────────────
  const submitGate = async (e) => {
    e.preventDefault();
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

    const tempId = "temp_" + Date.now();
    const optimistic = { ...payload, timestamp: new Date().toISOString(), _id: tempId };
    setActiveVisitors(prev => [optimistic, ...prev]);

    try {
      const res = await axios.post(
        "/api/societymanagement/gate-entry",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveVisitors(prev => prev.map(e => e._id === tempId ? res.data.data : e));
      saveRecentVisitor({ personName: gateForm.personName, phone: gateForm.phone, vehicleNumber: gateForm.vehicleNumber, category: gateForm.category, purpose: gateForm.purpose });
      setGateForm(EMPTY_GATE_FORM);
      setGateErrors({}); setGateTouched({});
      showMsg("Entry recorded ✅");
    } catch {
      setActiveVisitors(prev => prev.filter(e => e._id !== tempId));
      showMsg("Failed to record entry", "error");
    } finally {
      setSavingGate(false);
    }
  };

  // ── Gate OUT ───────────────────────────────────────────────
  const handleExitGate = async (entryId) => {
    const entry = activeVisitors.find(e => e._id === entryId);
    if (!entry || exitingGateIds.has(entryId)) return;
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
      setActiveVisitors(prev => prev.filter(e => e._id !== entryId));
      showMsg("Exit recorded ✅");
    } catch {
      showMsg("Failed to record exit", "error");
    } finally {
      setExitingGateIds(prev => { const n = new Set(prev); n.delete(entryId); return n; });
    }
  };

  // ── Submit building entry IN ───────────────────────────────
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
      showMsg("Entry recorded ✅");
    } catch {
      setActiveBuildingEntries(prev => prev.filter(e => e._id !== tempId));
      showMsg("Failed to record entry", "error");
    } finally {
      setSavingBuilding(false);
    }
  };

  // ── Building OUT ───────────────────────────────────────────
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
      showMsg("Exit recorded ✅");
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

  const fillGateFromVisitor    = (v) => setGateForm({ personName: v.personName||"", phone: v.phone||"", vehicleNumber: v.vehicleNumber||"", category: v.category||"Person", purpose: v.purpose||"" });
  const fillBuildingFromPerson = (p) => setBuildingForm(prev => ({ ...prev, personName: p.personName||"", phone: p.phone||"", personType: p.personType||"Staff", purpose: p.purpose||"" }));
  const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });

  const isBuildingAssigned  = !!assignedBuildingName;
  const gateSuggestions     = recentVisitors.map(v => ({ label: v.personName, data: v }));
  const buildingSuggestions = recentBuildingPersons.map(p => ({ label: p.personName, data: p }));

  const tabs = [
    { id:"attendance", label:"Attendance", icon:Icons.Clock    },
    { id:"gate",       label:"Gate Entry", icon:Icons.Truck    },
    { id:"building",   label:"Building",   icon:Icons.Building },
    { id:"history",    label:"History",    icon:Icons.History  },
  ];

  // ── Loading / No assignment screens ───────────────────────
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

  // ── Main render ────────────────────────────────────────────
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

      {/* Header */}
      <header
        className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 shadow-sm max-w-md mx-auto"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
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
                <button onClick={() => { setProfileOpen(false); window.location.href = "/societymanagement/profile"; }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                  <Icons.User /> Profile Settings
                </button>
                <button onClick={() => { setProfileOpen(false); window.location.href = "/societymanagement/change-password"; }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                  <Icons.Key /> Change Password
                </button>
                <button onClick={() => { setProfileOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                  <Icons.LogOut /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div
        className="max-w-md mx-auto w-full overflow-y-auto"
        style={{
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
          marginTop: "64px",
          marginBottom: "80px",
          minHeight: "calc(100vh - 144px)"
        }}
      >

        {/* ── Attendance Tab ──────────────────────────────────────── */}
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
              <div className="ml-auto flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 flex-shrink-0">
                <StatusDot active={isClockedIn} />
                <span className="text-xs text-white font-semibold">{isClockedIn ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {/* Location permission banner */}
            {locationDenied && (
              <LocationPermissionBanner onRetry={() => setLocationDenied(false)} />
            )}

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
                    <div key={cp.name} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{cp.name}</p>
                          {cp.latitude && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Icons.MapPin /> GPS verified
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <RippleButton
                          onClick={() => punch(cp.name, "IN")}
                          disabled={!!punchLoading}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200 active:scale-95">
                          {punchLoading === cp.name + "IN" ? <Spinner size={15}/> : <Icons.LogIn />}
                          <span>Punch IN</span>
                        </RippleButton>
                        <RippleButton
                          onClick={() => punch(cp.name, "OUT")}
                          disabled={!!punchLoading}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md shadow-red-200 active:scale-95">
                          {punchLoading === cp.name + "OUT" ? <Spinner size={15}/> : <Icons.LogOut />}
                          <span>Punch OUT</span>
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

        {/* ── Gate Entry Tab ──────────────────────────────────────── */}
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
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-95">
                  {savingGate ? <Spinner /> : <Icons.LogIn />} Record Entry
                </RippleButton>
              </form>
            </SectionCard>

            <ActiveEntriesList entries={activeVisitors} onExit={handleExitGate} exitingIds={exitingGateIds} />
          </div>
        )}

        {/* ── Building Entry Tab ──────────────────────────────────── */}
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
                  className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-95">
                  {savingBuilding ? <Spinner /> : <Icons.Building />} Record Entry
                </RippleButton>
              </form>
            </SectionCard>

            <ActiveEntriesList entries={activeBuildingEntries} onExit={handleExitBuilding} exitingIds={exitingBuildingIds} />
          </div>
        )}

        {/* ── History Tab ─────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="p-4 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-bold text-purple-800">Entry History</p>
                <p className="text-xs text-gray-600">Today's complete log</p>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { id: "all",      label: "All",      count: allGateEntries.length + allBuildingEntries.length },
                { id: "gate",     label: "Gate",     count: allGateEntries.length },
                { id: "building", label: "Building", count: allBuildingEntries.length },
              ].map(f => (
                <button key={f.id} onClick={() => setHistoryFilter(f.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${historyFilter === f.id ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {f.label} <span className="opacity-75">({f.count})</span>
                </button>
              ))}
            </div>

            <SectionCard title="Complete Log">
              {((historyFilter === "all" || historyFilter === "gate") && allGateEntries.length > 0) && (
                <div className="space-y-2 pb-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Gate Entries ({allGateEntries.length})</p>
                  {allGateEntries.map((entry, idx) => (
                    <div key={entry._id || `gate-${idx}`} className="flex items-start justify-between bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-gray-900">{entry.personName}</p>
                        <p className="text-gray-600 mt-0.5">
                          {entry.phone || entry.contactNumber ? `📞 ${entry.phone || entry.contactNumber}` : ""}
                          {entry.category ? ` · ${entry.category}` : ""}
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          {entry.vehicleNumber ? `🚗 ${entry.vehicleNumber}` : ""}
                          {entry.purpose ? ` · ${entry.purpose}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-[10px] whitespace-nowrap ml-2">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold ${entry.entryType === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {entry.entryType}
                        </span>
                        <p className="text-gray-500 mt-1">{formatTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {((historyFilter === "all" || historyFilter === "building") && allBuildingEntries.length > 0) && (
                <div className="space-y-2 pt-3">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Building Entries ({allBuildingEntries.length})</p>
                  {allBuildingEntries.map((entry, idx) => (
                    <div key={entry._id || `building-${idx}`} className="flex items-start justify-between bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                      <div className="flex-1 text-xs">
                        <p className="font-semibold text-gray-900">{entry.personName}</p>
                        <p className="text-gray-600 mt-0.5">
                          {entry.buildingName && <span>🏢 {entry.buildingName}</span>}
                          {entry.flatNumber && <span> · Flat {entry.flatNumber}</span>}
                        </p>
                        <p className="text-gray-600 mt-0.5">
                          {entry.phone ? `📞 ${entry.phone}` : ""}
                          {entry.personType ? ` · ${entry.personType}` : ""}
                        </p>
                        <p className="text-gray-500 mt-0.5">{entry.purpose || ""}</p>
                      </div>
                      <div className="text-right text-[10px] whitespace-nowrap ml-2">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold ${entry.entryType === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {entry.entryType}
                        </span>
                        <p className="text-gray-500 mt-1">{formatTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allGateEntries.length === 0 && allBuildingEntries.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-6">No entries recorded today</p>
              )}
            </SectionCard>
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* Bottom navigation */}
      <nav
        className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-1px_8px_rgba(0,0,0,0.06)] max-w-md mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
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
// import { User } from "lucide-react";
// import { Geolocation } from "@capacitor/geolocation";

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
//   Exit:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>,
//   Key:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4L18.5 2.5z"/></svg>,
//   User:        () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
//   History:     () => <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M7.7 7.7A10 10 0 1 0 12 2"/></svg>,
// };

// // ── Constants ─────────────────────────────────────────────────────
// const GATE_PURPOSE_OPTIONS     = ["Delivery","Visitor","Milk","Newspaper","Maintenance","Guest","Other"];
// const BUILDING_PURPOSE_OPTIONS = ["Cleaning","Repair","Inspection","Delivery","Visitor","Other"];
// const PERSON_TYPES  = ["Milkman","Newspaper","Delivery Person","Guest","Staff","Worker","Resident","Maintenance","Other"];
// const CATEGORIES    = ["Person","Bike","Car","Truck","Other"];

// const EMPTY_GATE_FORM     = { personName:"", phone:"", vehicleNumber:"", category:"Person", purpose:"" };
// const EMPTY_BUILDING_FORM = (buildingName = "") => ({ buildingName, flatId:"", personName:"", personType:"Staff", phone:"", purpose:"" });

// // ── Validators ────────────────────────────────────────────────────
// const validators = {
//   phone: (v) => {
//     if (!v) return null;
//     if (!/^\d+$/.test(v))  return "Only digits allowed";
//     if (v.length < 7)      return "Too short (min 7 digits)";
//     if (v.length > 15)     return "Too long (max 15 digits)";
//     return null;
//   },
//   vehicleNumber: (v) => {
//     if (!v) return null;
//     if (v.length > 20)                       return "Too long (max 20 chars)";
//     if (!/^[A-Za-z0-9\s\-]+$/.test(v))      return "Only letters, numbers & hyphens";
//     return null;
//   },
//   personName: (v) => {
//     if (!v?.trim())                            return "Person name is required";
//     if (v.trim().length < 2)                   return "Too short (min 2 chars)";
//     if (v.trim().length > 60)                  return "Too long (max 60 chars)";
//     if (!/^[A-Za-z\s\-'.]+$/.test(v.trim()))  return "Only letters, spaces & hyphens";
//     return null;
//   },
// };

// // ── Active-entry filter ───────────────────────────────────────────
// function filterActiveEntries(allEntries) {
//   const getContact = (e) => (e.contactNumber || e.phone || "").trim();

//   const inEntries  = allEntries.filter(e => e.entryType === "IN");
//   const outEntries = allEntries.filter(e => e.entryType === "OUT");

//   return inEntries.filter(inE => {
//     const key    = `${(inE.personName || "").trim().toLowerCase()}::${getContact(inE)}`;
//     const inTime = new Date(inE.timestamp).getTime();

//     const hasLaterOut = outEntries.some(outE => {
//       const outKey  = `${(outE.personName || "").trim().toLowerCase()}::${getContact(outE)}`;
//       const outTime = new Date(outE.timestamp).getTime();
//       return outKey === key && outTime > inTime;
//     });

//     return !hasLaterOut;
//   });
// }

// // ── Reusable UI Components ────────────────────────────────────────
// function RippleButton({ children, onClick, className = "", disabled = false, type = "button" }) {
//   const [ripples, setRipples] = useState([]);
//   const handle = (e) => {
//     const r  = e.currentTarget.getBoundingClientRect();
//     const id = Date.now();
//     setRipples(p => [...p, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
//     setTimeout(() => setRipples(p => p.filter(x => x.id !== id)), 600);
//     if (onClick) onClick(e);
//   };
//   return (
//     <button type={type} disabled={disabled} onClick={handle} className={`relative overflow-hidden select-none ${className}`}>
//       {ripples.map(rp => (
//         <span key={rp.id} style={{ left: rp.x, top: rp.y }}
//           className="absolute pointer-events-none rounded-full bg-white/40 animate-ping w-5 h-5 -translate-x-2.5 -translate-y-2.5" />
//       ))}
//       {children}
//     </button>
//   );
// }

// function Spinner({ size = 16 }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none">
//       <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
//       <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
//     </svg>
//   );
// }

// function StatusDot({ active }) {
//   return (
//     <span className="relative flex h-2.5 w-2.5">
//       {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>}
//       <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-500" : "bg-red-400"}`}/>
//     </span>
//   );
// }

// function Toast({ message, onClose }) {
//   useEffect(() => {
//     if (message) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
//   }, [message, onClose]);
//   if (!message) return null;
//   return (
//     <div
//       className={`fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-[90vw] border ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
//       style={{ top: `max(env(safe-area-inset-top, 0px), 16px)` }}
//     >
//       {message.type === "success" ? <Icons.Check /> : <Icons.Alert />}
//       {message.text}
//       <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100"><Icons.X /></button>
//     </div>
//   );
// }

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

// function Input({ value, onChange, placeholder, type = "text", icon, error, onBlur, className = "" }) {
//   const [focused, setFocused] = useState(false);
//   const handleChange = (e) => {
//     let v = e.target.value;
//     if (type === "tel") v = v.replace(/\D/g, "");
//     onChange({ target: { value: v } });
//   };
//   return (
//     <div className={`relative rounded-xl border transition-all duration-150
//       ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
//       ${error ? "border-red-400 ring-2 ring-red-50" : ""} bg-white`}>
//       {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
//       <input
//         type={type === "tel" ? "tel" : "text"}
//         value={value}
//         onChange={handleChange}
//         placeholder={placeholder}
//         onFocus={() => setFocused(true)}
//         onBlur={(e) => { setFocused(false); if (onBlur) onBlur(e); }}
//         className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400 py-3 pr-3 rounded-xl outline-none border-0 ${icon ? "pl-9" : "pl-3.5"} ${className}`}
//       />
//     </div>
//   );
// }

// function Select({ value, onChange, options, placeholder, error, icon }) {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div className={`relative rounded-xl border bg-white transition-all duration-150
//       ${focused ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300"}
//       ${error ? "border-red-400 ring-2 ring-red-50" : ""}`}>
//       {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{icon}</div>}
//       <select
//         value={value}
//         onChange={onChange}
//         onFocus={() => setFocused(true)}
//         onBlur={() => setFocused(false)}
//         className={`w-full appearance-none bg-transparent text-sm py-3 pr-8 rounded-xl outline-none border-0 ${value ? "text-gray-900" : "text-gray-400"} ${icon ? "pl-9" : "pl-3.5"}`}>
//         {placeholder && <option value="">{placeholder}</option>}
//         {options.map(o => (
//           <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
//             {typeof o === "string" ? o : o.label}
//           </option>
//         ))}
//       </select>
//       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Icons.ChevronDown /></div>
//     </div>
//   );
// }

// function AutoSuggestInput({ value, onChange, suggestions = [], placeholder, error, onSelect, icon, onBlur }) {
//   const [open, setOpen] = useState(false);
//   const [focused, setFocused] = useState(false);
//   const ref = useRef(null);

//   const filtered = value.trim()
//     ? suggestions.filter(s => (s.label || s).toLowerCase().includes(value.toLowerCase()))
//     : suggestions.slice(0, 8);

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
//         ${error ? "border-red-400 ring-2 ring-red-50" : ""}`}>
//         {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>}
//         <input
//           type="text"
//           value={value}
//           onChange={onChange}
//           placeholder={placeholder}
//           onFocus={() => { setFocused(true); setOpen(true); }}
//           onBlur={(e) => { setFocused(false); if (onBlur) onBlur(e); }}
//           className={`w-full bg-transparent text-gray-900 text-sm placeholder:text-gray-400 py-3 pr-3 rounded-xl outline-none border-0 ${icon ? "pl-9" : "pl-3.5"}`}
//         />
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

// function FlatSelector({ flats, selectedFlatId, onSelect }) {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");
//   const ref = useRef(null);

//   useEffect(() => {
//     const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener("mousedown", h);
//     return () => document.removeEventListener("mousedown", h);
//   }, []);

//   const filtered      = flats.filter(f => f.label.toLowerCase().includes(search.toLowerCase()));
//   const selectedLabel = selectedFlatId ? flats.find(f => f.value === selectedFlatId)?.label : null;

//   return (
//     <div className="relative" ref={ref}>
//       <button type="button" onClick={() => setOpen(!open)}
//         className={`w-full flex items-center justify-between px-3.5 py-3 bg-white rounded-xl border text-sm transition-all duration-150 ${open ? "border-indigo-400 ring-3 ring-indigo-100 shadow-sm" : "border-gray-300 hover:border-gray-400"}`}>
//         <span className={selectedLabel ? "text-gray-900 font-medium" : "text-gray-400"}>{selectedLabel || "Select flat number"}</span>
//         <div className="flex items-center gap-1.5">
//           {selectedFlatId && (
//             <span onClick={e => { e.stopPropagation(); onSelect(""); }} className="text-gray-400 hover:text-red-400 transition-colors p-0.5">
//               <Icons.X />
//             </span>
//           )}
//           <span className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}><Icons.ChevronDown /></span>
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
//                   <button key={flat.value} type="button" onClick={() => { onSelect(flat.value); setOpen(false); }}
//                     className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all text-center ${selectedFlatId === flat.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"}`}>
//                     {flat.label}
//                   </button>
//                 ))
//             }
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

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

// function ErrorSummary({ errors }) {
//   if (!errors || !Object.keys(errors).length) return null;
//   return (
//     <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5">
//       <div className="text-red-500 mt-0.5 flex-shrink-0"><Icons.Alert /></div>
//       <div>
//         <p className="text-xs font-bold text-red-600 mb-1">Please fix the following:</p>
//         <ul className="space-y-0.5">
//           {Object.values(errors).map((e, i) => <li key={i} className="text-[11px] text-red-600">· {e}</li>)}
//         </ul>
//       </div>
//     </div>
//   );
// }

// // ActiveEntriesList — shows every currently-inside person with an OUT button
// function ActiveEntriesList({ entries, onExit, exitingIds = new Set() }) {
//   if (!entries || entries.length === 0) return null;
//   return (
//     <div className="mt-4">
//       <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
//         Currently Inside ({entries.length})
//       </p>
//       <div className="space-y-2">
//         {entries.map((entry, idx) => (
//           <div key={entry._id || `entry-${idx}`}
//             className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
//             <div>
//               <p className="text-sm font-semibold text-gray-800">{entry.personName}</p>
//               <p className="text-[11px] text-gray-500">
//                 {entry.flatNumber ? `Flat ${entry.flatNumber} · ` : ""}
//                 {(entry.phone || entry.contactNumber) ? `📞 ${entry.phone || entry.contactNumber}` : ""}
//                 {entry.category ? ` · ${entry.category}` : ""}
//                 {entry.personType ? ` · ${entry.personType}` : ""}
//               </p>
//               <p className="text-[10px] text-gray-400">
//                 {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true })}
//               </p>
//             </div>
//             <RippleButton
//               disabled={exitingIds.has(entry._id)}
//               onClick={() => onExit(entry._id)}
//               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm">
//               {exitingIds.has(entry._id) ? <Spinner size={12}/> : <Icons.Exit />} OUT
//             </RippleButton>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ── Main Guard Page ───────────────────────────────────────────────
// export default function GuardPage() {
//   // ── Auth ───────────────────────────────────────────────────────
//   const [token, setToken] = useState(null);
//   useEffect(() => {
//     // Safe localStorage access after mount
//     setToken(localStorage.getItem("token") || null);
//   }, []);

//   // ── Core state ─────────────────────────────────────────────────
//   const [user,                  setUser]                  = useState(null);
//   const [assignment,            setAssignment]            = useState(null);
//   const [society,               setSociety]               = useState(null);
//   const [assignedBuildingName,  setAssignedBuildingName]  = useState("");
//   const [assignedBuildingId,    setAssignedBuildingId]    = useState(null);
//   const [shiftInfo,             setShiftInfo]             = useState("General");
//   const [isClockedIn,           setIsClockedIn]           = useState(false);
//   const [loading,               setLoading]               = useState(true);
//   const [todayPunches,          setTodayPunches]          = useState([]);
//   const [punchLoading,          setPunchLoading]          = useState(null);   // "CheckpointNameIN" | "CheckpointNameOUT" | null

//   // ── Gate entry state ───────────────────────────────────────────
//   const [gateForm,      setGateForm]      = useState(EMPTY_GATE_FORM);
//   const [gateErrors,    setGateErrors]    = useState({});
//   const [gateTouched,   setGateTouched]   = useState({});
//   const [savingGate,    setSavingGate]    = useState(false);
//   const [exitingGateIds, setExitingGateIds] = useState(new Set());
//   const [activeVisitors, setActiveVisitors] = useState([]);
//   const [recentVisitors, setRecentVisitors] = useState([]);

//   // ── Building entry state ───────────────────────────────────────
//   const [buildingForm,          setBuildingForm]          = useState(EMPTY_BUILDING_FORM());
//   const [buildingErrors,        setBuildingErrors]        = useState({});
//   const [buildingTouched,       setBuildingTouched]       = useState({});
//   const [savingBuilding,        setSavingBuilding]        = useState(false);
//   const [exitingBuildingIds,    setExitingBuildingIds]    = useState(new Set());
//   const [activeBuildingEntries, setActiveBuildingEntries] = useState([]);
//   const [recentBuildingPersons, setRecentBuildingPersons] = useState([]);

//   const [flats,       setFlats]       = useState([]);
//   const [message,     setMessage]     = useState(null);
//   const [profileOpen, setProfileOpen] = useState(false);
//   const [activeTab,   setActiveTab]   = useState("attendance");
//   const [allGateEntries,     setAllGateEntries]     = useState([]);
//   const [allBuildingEntries, setAllBuildingEntries] = useState([]);
//   const [historyFilter, setHistoryFilter] = useState("all"); // "all", "gate", "building"

//   const showMsg = useCallback((text, type = "success") => setMessage({ text, type }), []);

//   const isGuard = user?.roles?.includes("Guard");

//   // ── Bootstrap: load persisted data ────────────────────────────
//   useEffect(() => {
//     try { const s = localStorage.getItem("user"); if (s) setUser(JSON.parse(s)); } catch {}
//     try { const s = localStorage.getItem("guardRecentVisitors");       if (s) setRecentVisitors(JSON.parse(s)); }       catch {}
//     try { const s = localStorage.getItem("guardRecentBuildingPersons"); if (s) setRecentBuildingPersons(JSON.parse(s)); } catch {}
//   }, []);

//   // ── Recent-visitor helpers ─────────────────────────────────────
//   const saveRecentVisitor = (v) => {
//     if (!v.personName) return;
//     setRecentVisitors(prev => {
//       const list = [...prev];
//       const idx  = list.findIndex(x => x.phone && x.phone === v.phone);
//       if (idx >= 0) list[idx] = v; else list.unshift(v);
//       const trimmed = list.slice(0, 20);
//       localStorage.setItem("guardRecentVisitors", JSON.stringify(trimmed));
//       return trimmed;
//     });
//   };

//   const saveRecentBuildingPerson = (p) => {
//     if (!p.personName) return;
//     setRecentBuildingPersons(prev => {
//       const list = [...prev];
//       const idx  = list.findIndex(x => x.phone && x.phone === p.phone);
//       if (idx >= 0) list[idx] = p; else list.unshift(p);
//       const trimmed = list.slice(0, 20);
//       localStorage.setItem("guardRecentBuildingPersons", JSON.stringify(trimmed));
//       return trimmed;
//     });
//   };

//   // ── Fetch flats ────────────────────────────────────────────────
//   const fetchFlats = useCallback(async (societyId, buildingId) => {
//     if (!societyId || !token) return;
//     try {
//       let url = `/api/societymanagement/flat?societyId=${societyId}&limit=200`;
//       if (buildingId) url += `&buildingId=${buildingId}`;
//       const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
//       if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
//     } catch { setFlats([]); }
//   }, [token]);

//   // ── Fetch active entries ───────────────────────────────────────
//   const loadActiveGateEntries = useCallback(async (soc) => {
//     if (!soc || !token) return;
//     try {
//       const today = new Date().toISOString().split("T")[0];
//       const { data } = await axios.get(
//         `/api/societymanagement/gate-entry?societyId=${soc._id}&date=${today}&limit=200`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setActiveVisitors(filterActiveEntries(data.data));
//         setAllGateEntries(data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
//       }
//     } catch (err) { console.error("[loadActiveGateEntries]", err); }
//   }, [token]);

//   const loadActiveBuildingEntries = useCallback(async (soc) => {
//     if (!soc || !token) return;
//     try {
//       const today = new Date().toISOString().split("T")[0];
//       const { data } = await axios.get(
//         `/api/societymanagement/building-entry?societyId=${soc._id}&date=${today}&limit=200`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setActiveBuildingEntries(filterActiveEntries(data.data));
//         setAllBuildingEntries(data.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
//       }
//     } catch (err) { console.error("[loadActiveBuildingEntries]", err); }
//   }, [token]);

//   // ── Load duty + society ────────────────────────────────────────
//   const loadDuty = useCallback(async () => {
//     if (!token || !user?._id) return;
//     try {
//       const { data: a } = await axios.get(
//         `/api/societymanagement/guard-assignment?userId=${user._id}&isActive=true`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (a.success && a.data.length > 0) {
//         const asgn  = a.data[0];
//         setAssignment(asgn);
//         setShiftInfo(asgn.shiftId?.name || (asgn.customShiftStart ? `${asgn.customShiftStart} – ${asgn.customShiftEnd}` : "General"));

//         const bName = asgn.buildingId?.name || "";
//         const bId   = asgn.buildingId?._id  || null;
//         setAssignedBuildingName(bName);
//         setAssignedBuildingId(bId);

//         const { data: s } = await axios.get(
//           `/api/societymanagement/society?id=${asgn.societyId?._id || asgn.societyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (s.success) {
//           const soc = s.data;
//           setSociety(soc);
//           // Pre-fill building name if assigned
//           if (bName) setBuildingForm(EMPTY_BUILDING_FORM(bName));
//           await fetchFlats(soc._id, bId);
//           await Promise.all([loadActiveGateEntries(soc), loadActiveBuildingEntries(soc)]);
//         }
//       } else {
//         setAssignment(null);
//         setSociety(null);
//       }
//     } catch (e) { console.error("[loadDuty]", e); }
//   }, [token, user, fetchFlats, loadActiveGateEntries, loadActiveBuildingEntries]);

//   // ── Load today's punches ───────────────────────────────────────
//   const loadPunches = useCallback(async (soc) => {
//     const target = soc || society;
//     if (!target || !isGuard || !token) return;
//     const today = new Date().toISOString().split("T")[0];
//     try {
//       const { data } = await axios.get(
//         `/api/societymanagement/guard-entry?date=${today}&societyId=${target._id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) {
//         setTodayPunches(data.data);
//         const last = data.data[data.data.length - 1];
//         setIsClockedIn(!!last && last.checkpointType === "IN");
//       }
//     } catch {}
//   }, [society, isGuard, token]);

//   // ── Effects ────────────────────────────────────────────────────
//   useEffect(() => {
//     if (token && user?._id) {
//       setLoading(true);
//       loadDuty().finally(() => setLoading(false));
//     }
//   }, [loadDuty, token, user?._id]);

//   useEffect(() => {
//     if (society && isGuard) loadPunches(society);
//   }, [society, isGuard]);

//   // ── Live validation: gate form ─────────────────────────────────
//   useEffect(() => {
//     const e = {};
//     if (gateTouched.personName) {
//       const err = validators.personName(gateForm.personName); if (err) e.personName = err;
//     }
//     if (gateTouched.phone && gateForm.phone) {
//       const err = validators.phone(gateForm.phone); if (err) e.phone = err;
//     }
//     if (gateTouched.vehicleNumber && gateForm.vehicleNumber) {
//       const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) e.vehicleNumber = err;
//     }
//     setGateErrors(e);
//   }, [gateForm, gateTouched]);

//   // ── Live validation: building form ────────────────────────────
//   useEffect(() => {
//     const e = {};
//     if (buildingTouched.buildingName && !buildingForm.buildingName) e.buildingName = "Building is required";
//     if (buildingTouched.personName) {
//       const err = validators.personName(buildingForm.personName); if (err) e.personName = err;
//     }
//     if (buildingTouched.phone && buildingForm.phone) {
//       const err = validators.phone(buildingForm.phone); if (err) e.phone = err;
//     }
//     setBuildingErrors(e);
//   }, [buildingForm, buildingTouched]);

//   const getCurrentLocation = async () => {
//     const status = await Geolocation.checkPermissions();
//     if (status.location === "denied" || status.location === "prompt") {
//       const request = await Geolocation.requestPermissions();
//       if (request.location === "denied" || request.location === "restricted") {
//         throw { code: "PermissionDenied" };
//       }
//     }

//     return Geolocation.getCurrentPosition({
//       enableHighAccuracy: true,
//       timeout: 15000,
//       maximumAge: 0,
//     });
//   };

//   const punch = async (cpName, cpType) => {
//     const key = cpName + cpType;
//     setPunchLoading(key);

//     try {
//       const coordinates = await getCurrentLocation();
//       await axios.post(
//         "/api/societymanagement/guard-entry",
//         {
//           companyUserId:  user._id,
//           checkpointName: cpName,
//           checkpointType: cpType,
//           latitude:  coordinates.coords.latitude,
//           longitude: coordinates.coords.longitude,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       showMsg(`${cpType} recorded at ${cpName}`);
//       await loadPunches(society);
//     } catch (err) {
//       const code = err?.code || err?.message || "UNKNOWN";
//       if (code === "PermissionDenied" || code === "NOT_AUTHORIZED" || code === "PERMISSION_DENIED") {
//         showMsg("Location permission denied. Please enable location permission in app settings.", "error");
//       } else if (code === "TIMEOUT") {
//         showMsg("Location request timed out. Please enable GPS and try again.", "error");
//       } else if (code === "POSITION_UNAVAILABLE" || code === "NOT_AVAILABLE") {
//         showMsg("Location unavailable. Please check your GPS and try again.", "error");
//       } else if (typeof navigator !== "undefined" && navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           async (pos) => {
//             try {
//               await axios.post(
//                 "/api/societymanagement/guard-entry",
//                 {
//                   companyUserId:  user._id,
//                   checkpointName: cpName,
//                   checkpointType: cpType,
//                   latitude:  pos.coords.latitude,
//                   longitude: pos.coords.longitude,
//                 },
//                 { headers: { Authorization: `Bearer ${token}` } }
//               );
//               showMsg(`${cpType} recorded at ${cpName}`);
//               await loadPunches(society);
//             } catch (err) {
//               showMsg(err.response?.data?.message || "Punch failed", "error");
//             } finally {
//               setPunchLoading(null);
//             }
//           },
//           (geoErr) => {
//             showMsg("Unable to get location. Please check your GPS and try again.", "error");
//             console.error("[Browser Geolocation Error]", geoErr);
//             setPunchLoading(null);
//           },
//           { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
//         );
//         return;
//       } else {
//         showMsg("Unable to get location. Please check your GPS", "error");
//       }
//       console.error("[Geolocation Error]", err);
//     } finally {
//       setPunchLoading(null);
//     }
//   };

//   // ── Submit gate entry IN (with optimistic UI) ─────────────────
//   const submitGate = async (e) => {
//     e.preventDefault();
//     // Touch all fields
//     setGateTouched({ personName: true, phone: true, vehicleNumber: true, category: true, purpose: true });

//     const errs = {};
//     const nameErr = validators.personName(gateForm.personName);
//     if (nameErr) errs.personName = nameErr;
//     if (gateForm.phone) { const err = validators.phone(gateForm.phone); if (err) errs.phone = err; }
//     if (gateForm.vehicleNumber) { const err = validators.vehicleNumber(gateForm.vehicleNumber); if (err) errs.vehicleNumber = err; }
//     if (!gateForm.category) errs.category = "Category is required";
//     setGateErrors(errs);
//     if (Object.keys(errs).length) return showMsg("Please fix the errors", "error");
//     if (!society?._id) return showMsg("Society data not loaded", "error");

//     setSavingGate(true);

//     const payload = {
//       societyId:     society._id,
//       gateName:      "Main Gate",
//       entryType:     "IN",
//       category:      gateForm.category,
//       personName:    gateForm.personName.trim(),
//       contactNumber: gateForm.phone,
//       vehicleNumber: gateForm.vehicleNumber,
//       purpose:       gateForm.purpose,
//     };

//     // Optimistic entry
//     const tempId = "temp_" + Date.now();
//     const optimistic = { ...payload, timestamp: new Date().toISOString(), _id: tempId };
//     setActiveVisitors(prev => [optimistic, ...prev]);

//     try {
//       const res = await axios.post(
//         "/api/societymanagement/gate-entry",
//         payload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       // Replace optimistic entry with real one
//       setActiveVisitors(prev => prev.map(e => e._id === tempId ? res.data.data : e));
//       saveRecentVisitor({ personName: gateForm.personName, phone: gateForm.phone, vehicleNumber: gateForm.vehicleNumber, category: gateForm.category, purpose: gateForm.purpose });
//       setGateForm(EMPTY_GATE_FORM);
//       setGateErrors({}); setGateTouched({});
//       showMsg("Entry recorded");
//     } catch {
//       // Roll back optimistic entry
//       setActiveVisitors(prev => prev.filter(e => e._id !== tempId));
//       showMsg("Failed to record entry", "error");
//     } finally {
//       setSavingGate(false);
//     }
//   };

//   // ── Gate OUT ────────────────────────────────────────────────────
//   const handleExitGate = async (entryId) => {
//     const entry = activeVisitors.find(e => e._id === entryId);
//     if (!entry || exitingGateIds.has(entryId)) return;

//     // Mark as exiting (disables button, shows spinner)
//     setExitingGateIds(prev => new Set([...prev, entryId]));

//     try {
//       await axios.post(
//         "/api/societymanagement/gate-entry",
//         {
//           societyId:     society._id,
//           gateName:      entry.gateName || "Main Gate",
//           entryType:     "OUT",
//           category:      entry.category,
//           personName:    entry.personName,
//           contactNumber: entry.contactNumber || "",
//           vehicleNumber: entry.vehicleNumber || "",
//           purpose:       "Exit",
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       // Remove from active list
//       setActiveVisitors(prev => prev.filter(e => e._id !== entryId));
//       showMsg("Exit recorded");
//     } catch {
//       showMsg("Failed to record exit", "error");
//     } finally {
//       setExitingGateIds(prev => { const n = new Set(prev); n.delete(entryId); return n; });
//     }
//   };

//   // ── Submit building entry IN ────────────────────────────────────
//   const submitBuilding = async (e) => {
//     e.preventDefault();
//     setBuildingTouched({ buildingName: true, personName: true, phone: true, purpose: true });

//     const errs = {};
//     if (!buildingForm.buildingName) errs.buildingName = "Building is required";
//     const nameErr = validators.personName(buildingForm.personName);
//     if (nameErr) errs.personName = nameErr;
//     if (buildingForm.phone) { const err = validators.phone(buildingForm.phone); if (err) errs.phone = err; }
//     setBuildingErrors(errs);
//     if (Object.keys(errs).length) return showMsg("Please fix the errors", "error");
//     if (!society?._id) return showMsg("Society data not loaded", "error");

//     setSavingBuilding(true);

//     const payload = {
//       societyId:    society._id,
//       buildingName: buildingForm.buildingName,
//       personName:   buildingForm.personName.trim(),
//       personType:   buildingForm.personType || "Staff",
//       entryType:    "IN",
//       purpose:      buildingForm.purpose,
//       phone:        buildingForm.phone,
//       flatId:       buildingForm.flatId || undefined,
//     };

//     const tempId = "temp_" + Date.now();
//     const optimistic = { ...payload, timestamp: new Date().toISOString(), _id: tempId };
//     setActiveBuildingEntries(prev => [optimistic, ...prev]);

//     try {
//       const res = await axios.post(
//         "/api/societymanagement/building-entry",
//         payload,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setActiveBuildingEntries(prev => prev.map(e => e._id === tempId ? res.data.data : e));
//       saveRecentBuildingPerson({ personName: buildingForm.personName, phone: buildingForm.phone, personType: buildingForm.personType, purpose: buildingForm.purpose });
//       setBuildingForm(EMPTY_BUILDING_FORM(assignedBuildingName));
//       setBuildingErrors({}); setBuildingTouched({});
//       showMsg("Entry recorded");
//     } catch {
//       setActiveBuildingEntries(prev => prev.filter(e => e._id !== tempId));
//       showMsg("Failed to record entry", "error");
//     } finally {
//       setSavingBuilding(false);
//     }
//   };

//   // ── Building OUT ───────────────────────────────────────────────
//   const handleExitBuilding = async (entryId) => {
//     const entry = activeBuildingEntries.find(e => e._id === entryId);
//     if (!entry || exitingBuildingIds.has(entryId)) return;

//     setExitingBuildingIds(prev => new Set([...prev, entryId]));

//     try {
//       await axios.post(
//         "/api/societymanagement/building-entry",
//         {
//           societyId:    society._id,
//           buildingName: entry.buildingName,
//           personName:   entry.personName,
//           personType:   entry.personType,
//           entryType:    "OUT",
//           purpose:      "Exit",
//           phone:        entry.phone || "",
//           flatId:       entry.flatId || undefined,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setActiveBuildingEntries(prev => prev.filter(e => e._id !== entryId));
//       showMsg("Exit recorded");
//     } catch {
//       showMsg("Failed to record exit", "error");
//     } finally {
//       setExitingBuildingIds(prev => { const n = new Set(prev); n.delete(entryId); return n; });
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     window.location.href = "/signin";
//   };

//   const fillGateFromVisitor     = (v) => setGateForm({ personName: v.personName||"", phone: v.phone||"", vehicleNumber: v.vehicleNumber||"", category: v.category||"Person", purpose: v.purpose||"" });
//   const fillBuildingFromPerson  = (p) => setBuildingForm(prev => ({ ...prev, personName: p.personName||"", phone: p.phone||"", personType: p.personType||"Staff", purpose: p.purpose||"" }));
//   const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });

//   const isBuildingAssigned = !!assignedBuildingName;
//   const gateSuggestions    = recentVisitors.map(v => ({ label: v.personName, data: v }));
//   const buildingSuggestions = recentBuildingPersons.map(p => ({ label: p.personName, data: p }));

//   const tabs = [
//     { id:"attendance", label:"Attendance", icon:Icons.Clock    },
//     { id:"gate",       label:"Gate Entry", icon:Icons.Truck    },
//     { id:"building",   label:"Building",   icon:Icons.Building },
//     { id:"history",    label:"History",    icon:Icons.History  },
//   ];

//   // ── Loading / No assignment screens ───────────────────────────
//   if (loading || !user) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="flex flex-col items-center gap-4">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
//             <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
//           </div>
//           <p className="text-gray-500 text-sm font-medium">Loading duty information…</p>
//         </div>
//       </div>
//     );
//   }

//   if (!assignment || !society) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//         <div className="text-center max-w-xs">
//           <div className="w-20 h-20 rounded-3xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto mb-5">
//             <span className="text-4xl">🔒</span>
//           </div>
//           <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Assignment</h2>
//           <p className="text-gray-500 text-sm leading-relaxed">You are not assigned to any society. Contact your supervisor.</p>
//           <button onClick={handleLogout} className="mt-6 px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
//             Sign Out
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ── Main render with safe-area support ─────────────────────────
//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col">
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
//         * { font-family: 'Plus Jakarta Sans', sans-serif; }
//         .mono { font-family: 'JetBrains Mono', monospace; }
//         ::-webkit-scrollbar { width: 4px; height: 4px; }
//         ::-webkit-scrollbar-track { background: #f1f5f9; }
//         ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
//         .ring-3 {
//           --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
//           --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);
//           box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
//         }
//       `}</style>

//       <Toast message={message} onClose={() => setMessage(null)} />

//       {/* Header – adds top safe-area padding */}
//       <header
//         className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 shadow-sm max-w-md mx-auto"
//         style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
//       >
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

//           {/* Profile dropdown */}
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
//                 {/* link change password and profile settings */}
//                 <button onClick={() => { setProfileOpen(false); window.location.href = "/societymanagement/profile"; }}
//                   className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
//                   <Icons.User /> Profile Settings
//                 </button>
//                 <button onClick={() => { setProfileOpen(false); window.location.href = "/societymanagement/change-password"; }}
//                   className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
//                   <Icons.Key /> Change Password
//                 </button> 
//                 <button onClick={() => { setProfileOpen(false); handleLogout(); }}
//                   className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
//                   <Icons.LogOut /> Sign Out
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </header>

//       {/* Main scrollable content – adds horizontal safe-area padding */}
//       <div
//         className="max-w-md mx-auto w-full overflow-y-auto"
//         style={{
//           paddingLeft: "env(safe-area-inset-left, 0px)",
//           paddingRight: "env(safe-area-inset-right, 0px)",
//           marginTop: "64px",
//           marginBottom: "80px",
//           minHeight: "calc(100vh - 144px)"
//         }}
//       >
//         {/* Attendance Tab */}
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
//                 <button onClick={() => loadPunches(society)} className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
//                   <Icons.Refresh /> Refresh
//                 </button>
//               </div>
//               {(!society.checkpoints || society.checkpoints.length === 0)
//                 ? <p className="text-xs text-gray-500 text-center py-3">No checkpoints configured</p>
//                 : society.checkpoints.map(cp => (
//                     <div key={cp.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
//                       <div>
//                         <p className="text-sm font-bold text-gray-800">{cp.name}</p>
//                         {cp.latitude && <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><Icons.MapPin /> GPS verified</p>}
//                       </div>
//                       <div className="flex gap-2">
//                         <RippleButton onClick={() => punch(cp.name, "IN")} disabled={punchLoading === cp.name + "IN"}
//                           className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200">
//                           {punchLoading === cp.name + "IN" ? <Spinner size={13}/> : <Icons.LogIn />} IN
//                         </RippleButton>
//                         <RippleButton onClick={() => punch(cp.name, "OUT")} disabled={punchLoading === cp.name + "OUT"}
//                           className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md shadow-red-200">
//                           {punchLoading === cp.name + "OUT" ? <Spinner size={13}/> : <Icons.LogOut />} OUT
//                         </RippleButton>
//                       </div>
//                     </div>
//                   ))
//               }
//             </SectionCard>

//             {/* Today's punch log */}
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
//                       <span className={`text-[11px] font-bold mono px-2 py-1 rounded-lg ${e.checkpointType === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
//                         {formatTime(e.timestamp)}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               </SectionCard>
//             )}
//           </div>
//         )}

//         {/* Gate Entry Tab */}
//         {activeTab === "gate" && isGuard && (
//           <div className="p-4 space-y-4">
//             <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
//               <span className="text-2xl">🚪</span>
//               <div>
//                 <p className="text-sm font-bold text-amber-800">Gate Entry</p>
//                 <p className="text-xs text-gray-600">Record visitor entry / exit</p>
//               </div>
//             </div>

//             <SectionCard title="New Entry (IN)">
//               <form onSubmit={submitGate} className="space-y-3">
//                 <Field label="Person Name" required error={gateErrors.personName}>
//                   <AutoSuggestInput
//                     value={gateForm.personName}
//                     onChange={e => setGateForm({ ...gateForm, personName: e.target.value })}
//                     suggestions={gateSuggestions}
//                     placeholder="Visitor name"
//                     error={gateErrors.personName}
//                     icon={<Icons.User />}
//                     onSelect={fillGateFromVisitor}
//                     onBlur={() => setGateTouched(p => ({ ...p, personName: true }))}
//                   />
//                 </Field>

//                 <div className="grid grid-cols-2 gap-3">
//                   <Field label="Phone" error={gateErrors.phone}>
//                     <Input type="tel" value={gateForm.phone}
//                       onChange={e => setGateForm({ ...gateForm, phone: e.target.value })}
//                       placeholder="Phone" icon={<Icons.Phone />} error={gateErrors.phone}
//                       onBlur={() => setGateTouched(p => ({ ...p, phone: true }))} />
//                   </Field>
//                   <Field label="Vehicle" error={gateErrors.vehicleNumber}>
//                     <Input value={gateForm.vehicleNumber}
//                       onChange={e => setGateForm({ ...gateForm, vehicleNumber: e.target.value.toUpperCase() })}
//                       placeholder="Number" icon={<Icons.Car />} error={gateErrors.vehicleNumber}
//                       onBlur={() => setGateTouched(p => ({ ...p, vehicleNumber: true }))} />
//                   </Field>
//                 </div>

//                 <div className="flex gap-3">
//                   <div className="flex-1">
//                     <Field label="Category" required error={gateErrors.category}>
//                       <Select value={gateForm.category}
//                         onChange={e => { setGateForm({ ...gateForm, category: e.target.value }); setGateTouched(p => ({ ...p, category: true })); }}
//                         options={CATEGORIES} error={gateErrors.category} />
//                     </Field>
//                   </div>
//                   <div className="flex-1">
//                     <Field label="Purpose">
//                       <Select value={gateForm.purpose}
//                         onChange={e => setGateForm({ ...gateForm, purpose: e.target.value })}
//                         options={GATE_PURPOSE_OPTIONS} placeholder="Select…" />
//                     </Field>
//                   </div>
//                 </div>

//                 <ErrorSummary errors={gateErrors} />

//                 <RippleButton type="submit" disabled={savingGate}
//                   className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
//                   {savingGate ? <Spinner /> : <Icons.LogIn />} Record Entry
//                 </RippleButton>
//               </form>
//             </SectionCard>

//             <ActiveEntriesList entries={activeVisitors} onExit={handleExitGate} exitingIds={exitingGateIds} />
//           </div>
//         )}

//         {/* Building Entry Tab */}
//         {activeTab === "building" && (
//           <div className="p-4 space-y-4">
//             <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3">
//               <span className="text-2xl">🏢</span>
//               <div>
//                 <p className="text-sm font-bold text-blue-800">Building Entry</p>
//                 <p className="text-xs text-gray-600">Record person entry / exit</p>
//               </div>
//             </div>

//             <SectionCard title="New Entry (IN)">
//               <form onSubmit={submitBuilding} className="space-y-3">
//                 {/* Building field */}
//                 <Field label="Building" required error={buildingErrors.buildingName}>
//                   {isBuildingAssigned
//                     ? (
//                       <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gray-50 border border-gray-300 rounded-xl">
//                         <Icons.Building />
//                         <span className="text-sm font-semibold text-gray-800">{assignedBuildingName}</span>
//                         <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">Assigned</span>
//                       </div>
//                     ) : (
//                       <Input value={buildingForm.buildingName}
//                         onChange={e => { setBuildingForm({ ...buildingForm, buildingName: e.target.value }); setBuildingTouched(p => ({ ...p, buildingName: true })); }}
//                         placeholder="Building name" error={buildingErrors.buildingName} />
//                     )
//                   }
//                 </Field>

//                 <Field label="Flat Number">
//                   <FlatSelector flats={flats} selectedFlatId={buildingForm.flatId} onSelect={v => setBuildingForm({ ...buildingForm, flatId: v })} />
//                 </Field>

//                 <Field label="Person Name" required error={buildingErrors.personName}>
//                   <AutoSuggestInput
//                     value={buildingForm.personName}
//                     onChange={e => setBuildingForm({ ...buildingForm, personName: e.target.value })}
//                     suggestions={buildingSuggestions}
//                     placeholder="Name"
//                     error={buildingErrors.personName}
//                     icon={<Icons.User />}
//                     onSelect={fillBuildingFromPerson}
//                     onBlur={() => setBuildingTouched(p => ({ ...p, personName: true }))}
//                   />
//                 </Field>

//                 <div className="grid grid-cols-2 gap-3">
//                   <Field label="Person Type">
//                     <Select value={buildingForm.personType}
//                       onChange={e => setBuildingForm({ ...buildingForm, personType: e.target.value })}
//                       options={PERSON_TYPES} />
//                   </Field>
//                   <Field label="Phone" error={buildingErrors.phone}>
//                     <Input type="tel" value={buildingForm.phone}
//                       onChange={e => { setBuildingForm({ ...buildingForm, phone: e.target.value }); setBuildingTouched(p => ({ ...p, phone: true })); }}
//                       placeholder="Phone" icon={<Icons.Phone />} error={buildingErrors.phone} />
//                   </Field>
//                 </div>

//                 <Field label="Purpose">
//                   <Select value={buildingForm.purpose}
//                     onChange={e => setBuildingForm({ ...buildingForm, purpose: e.target.value })}
//                     options={BUILDING_PURPOSE_OPTIONS} placeholder="Select…" />
//                 </Field>

//                 <ErrorSummary errors={buildingErrors} />

//                 <RippleButton type="submit" disabled={savingBuilding}
//                   className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
//                   {savingBuilding ? <Spinner /> : <Icons.Building />} Record Entry
//                 </RippleButton>
//               </form>
//             </SectionCard>

//             <ActiveEntriesList entries={activeBuildingEntries} onExit={handleExitBuilding} exitingIds={exitingBuildingIds} />
//           </div>
//         )}

//         {/* History Tab */}
//         {activeTab === "history" && (
//           <div className="p-4 space-y-4">
//             <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center gap-3">
//               <span className="text-2xl">📋</span>
//               <div>
//                 <p className="text-sm font-bold text-purple-800">Entry History</p>
//                 <p className="text-xs text-gray-600">Today's complete log</p>
//               </div>
//             </div>

//             <div className="flex gap-2">
//               {[
//                 { id: "all", label: "All", count: allGateEntries.length + allBuildingEntries.length },
//                 { id: "gate", label: "Gate", count: allGateEntries.length },
//                 { id: "building", label: "Building", count: allBuildingEntries.length },
//               ].map(f => (
//                 <button key={f.id} onClick={() => setHistoryFilter(f.id)}
//                   className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
//                     historyFilter === f.id
//                       ? "bg-indigo-600 text-white shadow-md"
//                       : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                   }`}>
//                   {f.label} <span className="opacity-75">({f.count})</span>
//                 </button>
//               ))}
//             </div>

//             <SectionCard title="Complete Log">
//               {((historyFilter === "all" || historyFilter === "gate") && allGateEntries.length > 0) && (
//                 <div className="space-y-2 pb-3 border-b border-gray-100">
//                   <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Gate Entries ({allGateEntries.length})</p>
//                   {allGateEntries.map((entry, idx) => (
//                     <div key={entry._id || `gate-${idx}`} className="flex items-start justify-between bg-amber-50 rounded-lg p-2.5 border border-amber-100">
//                       <div className="flex-1 text-xs">
//                         <p className="font-semibold text-gray-900">{entry.personName}</p>
//                         <p className="text-gray-600 mt-0.5">
//                           {entry.phone || entry.contactNumber ? `📞 ${entry.phone || entry.contactNumber}` : ""}
//                           {entry.category ? ` · ${entry.category}` : ""}
//                         </p>
//                         <p className="text-gray-500 mt-0.5">
//                           {entry.vehicleNumber ? `🚗 ${entry.vehicleNumber}` : ""}
//                           {entry.purpose ? ` · ${entry.purpose}` : ""}
//                         </p>
//                       </div>
//                       <div className="text-right text-[10px] whitespace-nowrap ml-2">
//                         <span className={`inline-block px-2 py-0.5 rounded font-bold ${
//                           entry.entryType === "IN"
//                             ? "bg-emerald-100 text-emerald-700"
//                             : "bg-red-100 text-red-600"
//                         }`}>
//                           {entry.entryType}
//                         </span>
//                         <p className="text-gray-500 mt-1">{formatTime(entry.timestamp)}</p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {((historyFilter === "all" || historyFilter === "building") && allBuildingEntries.length > 0) && (
//                 <div className="space-y-2 pt-3">
//                   <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Building Entries ({allBuildingEntries.length})</p>
//                   {allBuildingEntries.map((entry, idx) => (
//                     <div key={entry._id || `building-${idx}`} className="flex items-start justify-between bg-blue-50 rounded-lg p-2.5 border border-blue-100">
//                       <div className="flex-1 text-xs">
//                         <p className="font-semibold text-gray-900">{entry.personName}</p>
//                         <p className="text-gray-600 mt-0.5">
//                           {entry.buildingName && <span>🏢 {entry.buildingName}</span>}
//                           {entry.flatNumber && <span> · Flat {entry.flatNumber}</span>}
//                         </p>
//                         <p className="text-gray-600 mt-0.5">
//                           {entry.phone ? `📞 ${entry.phone}` : ""}
//                           {entry.personType ? ` · ${entry.personType}` : ""}
//                         </p>
//                         <p className="text-gray-500 mt-0.5">{entry.purpose || ""}</p>
//                       </div>
//                       <div className="text-right text-[10px] whitespace-nowrap ml-2">
//                         <span className={`inline-block px-2 py-0.5 rounded font-bold ${
//                           entry.entryType === "IN"
//                             ? "bg-emerald-100 text-emerald-700"
//                             : "bg-red-100 text-red-600"
//                         }`}>
//                           {entry.entryType}
//                         </span>
//                         <p className="text-gray-500 mt-1">{formatTime(entry.timestamp)}</p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {allGateEntries.length === 0 && allBuildingEntries.length === 0 && (
//                 <p className="text-xs text-gray-500 text-center py-6">No entries recorded today</p>
//               )}
//             </SectionCard>
//           </div>
//         )}

//         <div className="h-20" />
//       </div>

//       {/* Bottom navigation – adds safe-area bottom padding */}
//       <nav
//         className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-1px_8px_rgba(0,0,0,0.06)] max-w-md mx-auto"
//         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
//       >
//         <div className="max-w-md mx-auto flex">
//           {tabs.map(tab => {
//             const Icon   = tab.icon;
//             const active = activeTab === tab.id;
//             return (
//               <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//                 className={`flex-1 flex flex-col items-center justify-center py-2.5 relative transition-colors ${active ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
//                 {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full"/>}
//                 <span className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}><Icon /></span>
//                 <span className={`text-[10px] mt-1 font-bold ${active ? "text-indigo-600" : ""}`}>{tab.label}</span>
//               </button>
//             );
//           })}
//         </div>
//       </nav>
//     </div>
//   );
// }
