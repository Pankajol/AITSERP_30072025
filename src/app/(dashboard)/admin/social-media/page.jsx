"use client";

import { useState, useEffect } from "react";
import {
  Instagram, Youtube, Facebook, Linkedin, Twitter,
  MessageCircle, ShoppingBag, Plus, Trash2, CheckCircle,
  Eye, EyeOff, Save, Loader2, AlertCircle, X, Zap,
  RefreshCw, Globe, Lock, ChevronDown, ChevronUp
} from "lucide-react";

// ── Platform definitions ──────────────────────────────
const PLATFORMS = [
  {
    id: "whatsapp", label: "WhatsApp", Icon: MessageCircle, color: "#25D366",
    gradient: "from-green-600/20 to-emerald-600/10",
    border: "border-green-500/30",
    fields: [
      { key: "accountName",  label: "Business Name",    placeholder: "My Business" },
      { key: "phoneNumberId",label: "Phone Number ID",  placeholder: "1234567890",     secret: false },
      { key: "token",        label: "WABA Token",       placeholder: "EAAxxxxxxxx...", secret: true  },
    ],
  },
  {
    id: "instagram", label: "Instagram", Icon: Instagram, color: "#E1306C",
    gradient: "from-pink-600/20 to-rose-600/10",
    border: "border-pink-500/30",
    fields: [
      { key: "accountName", label: "Account Name",        placeholder: "@mybusiness"      },
      { key: "accountId",   label: "Business Account ID", placeholder: "17841400000000"   },
      { key: "token",       label: "Access Token",        placeholder: "EAAxxxxxxxx...", secret: true },
    ],
  },
  {
    id: "facebook", label: "Facebook", Icon: Facebook, color: "#1877F2",
    gradient: "from-blue-600/20 to-indigo-600/10",
    border: "border-blue-500/30",
    fields: [
      { key: "accountName", label: "Page Name",         placeholder: "My Facebook Page"   },
      { key: "accountId",   label: "Page ID",           placeholder: "1234567890"         },
      { key: "token",       label: "Page Access Token", placeholder: "EAAxxxxxxxx...", secret: true },
      { key: "appId",       label: "App ID",            placeholder: "1234567890"         },
      { key: "appSecret",   label: "App Secret",        placeholder: "abc123...",      secret: true },
    ],
  },
  {
    id: "youtube", label: "YouTube", Icon: Youtube, color: "#FF0000",
    gradient: "from-red-600/20 to-orange-600/10",
    border: "border-red-500/30",
    fields: [
      { key: "accountName", label: "Channel Name",     placeholder: "My YouTube Channel" },
      { key: "accountId",   label: "Channel ID",       placeholder: "UCxxxxxxxxxxxxxxxx" },
      { key: "clientId",    label: "OAuth Client ID",  placeholder: "xxxxx.apps.googleusercontent.com" },
      { key: "token",       label: "API Key",          placeholder: "AIzaxxxxxxxx...", secret: true },
      { key: "secret",      label: "Client Secret",    placeholder: "GOCSPX-xxxx...", secret: true },
    ],
  },
  {
    id: "twitter", label: "Twitter / X", Icon: Twitter, color: "#1DA1F2",
    gradient: "from-sky-600/20 to-cyan-600/10",
    border: "border-sky-500/30",
    fields: [
      { key: "accountName",        label: "Username",            placeholder: "@mybusiness"     },
      { key: "token",              label: "API Key",             placeholder: "xxxxxxxx...", secret: true },
      { key: "secret",             label: "API Secret",          placeholder: "xxxxxxxx...", secret: true },
      { key: "accessToken",        label: "Access Token",        placeholder: "xxxxxxxx...", secret: true },
      { key: "accessTokenSecret",  label: "Access Token Secret", placeholder: "xxxxxxxx...", secret: true },
    ],
  },
  {
    id: "linkedin", label: "LinkedIn", Icon: Linkedin, color: "#0A66C2",
    gradient: "from-indigo-600/20 to-blue-600/10",
    border: "border-indigo-500/30",
    fields: [
      { key: "accountName",  label: "Page / Profile Name", placeholder: "My Company"       },
      { key: "accountId",    label: "Organization URN",    placeholder: "urn:li:organization:12345" },
      { key: "token",        label: "Client ID",           placeholder: "xxxxxxxx..."              },
      { key: "secret",       label: "Client Secret",       placeholder: "xxxxxxxx...", secret: true },
      { key: "accessToken",  label: "OAuth Access Token",  placeholder: "AQxxxxxxxx...", secret: true },
    ],
  },
];

const CUSTOM_DEFAULTS = {
  platformName: "", accountName: "", accountId: "",
  token: "", secret: "", webhookUrl: "", apiEndpoint: "",
  extra: "", enabled: false, status: "Active",
};

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

// ── Field Input ───────────────────────────────────────
function SecretField({ value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false);
  const isMasked = value === "••••••••••••";
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={isMasked ? "" : value}
        onChange={onChange}
        placeholder={isMasked ? "Leave blank to keep existing" : placeholder}
        className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 pr-10"
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
        {show ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────
function PlatformCard({ platform, data, onChange }) {
  const [open, setOpen] = useState(false);
  const { id, label, Icon, color, gradient, border, fields } = platform;
  const enabled = data?.enabled || false;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${gradient} ${border} overflow-hidden transition-all`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
            <Icon size={22} style={{ color }} />
          </div>
          <div>
            <p className="font-black text-white text-sm">{label}</p>
            <p className="text-xs text-slate-500">
              {data?.accountName || "Not configured"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Enable toggle */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(id, "enabled", !enabled); }}
            className={`relative w-11 h-6 rounded-full transition-all ${enabled ? "bg-violet-600" : "bg-white/10"}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-6" : "left-1"}`}/>
          </button>
          <span className={`text-xs font-bold ${enabled ? "text-violet-400" : "text-slate-600"}`}>
            {enabled ? "Active" : "Off"}
          </span>
          {open ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
        </div>
      </div>

      {/* Fields */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5 flex items-center gap-1">
                {f.secret && <Lock size={9} className="text-slate-600"/>} {f.label}
              </label>
              {f.secret ? (
                <SecretField
                  value={data?.[f.key] || ""}
                  onChange={(e) => onChange(id, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  label={f.label}
                />
              ) : (
                <input
                  type="text"
                  value={data?.[f.key] || ""}
                  onChange={(e) => onChange(id, f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500"
                />
              )}
            </div>
          ))}

          {/* Status */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">Status</label>
            <select
              value={data?.status || "Active"}
              onChange={(e) => onChange(id, "status", e.target.value)}
              className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function SocialMediaMasterPage() {
  const [masterName, setMasterName] = useState("Social Media Master");
  const [platforms, setPlatforms]   = useState({});
  const [customs, setCustoms]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(true);
  const [status, setStatus]         = useState(null);
  const [isNew, setIsNew]           = useState(true);

  // ── Fetch existing master ─────────────────────────
  useEffect(() => {
    const fetchMaster = async () => {
      setFetching(true);
      try {
        const res  = await fetch("/api/social-media-master", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data?.data) {
          setIsNew(false);
          setMasterName(data.data.masterName || "Social Media Master");
          const p = {};
          PLATFORMS.forEach(({ id }) => { if (data.data[id]) p[id] = data.data[id]; });
          setPlatforms(p);
          setCustoms(data.data.customPlatforms || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    fetchMaster();
  }, []);

  // ── Handle platform field change ──────────────────
  const handlePlatformChange = (platformId, field, value) => {
    setPlatforms((prev) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] || {}),
        [field]: value,
      },
    }));
  };

  // ── Custom platforms ──────────────────────────────
  const addCustom = () => setCustoms((p) => [...p, { ...CUSTOM_DEFAULTS }]);
  const removeCustom = (i) => setCustoms((p) => p.filter((_, idx) => idx !== i));
  const updateCustom = (i, field, value) =>
    setCustoms((p) => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        masterName,
        status: "Active",
        ...platforms,
        customPlatforms: customs,
      };

      const res = await fetch("/api/social-media-master", {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsNew(false);
        setStatus({ type: "success", text: "✅ Social Media Master saved successfully!" });
      } else {
        setStatus({ type: "error", text: data?.error || "Something went wrong." });
      }
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Count enabled platforms ───────────────────────
  const enabledCount = Object.values(platforms).filter((p) => p?.enabled).length
    + customs.filter((c) => c?.enabled).length;

  if (fetching) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-violet-400" size={36}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      {/* BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[120px]"/>
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-600/8 blur-[120px]"/>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-violet-300 uppercase tracking-widest mb-4">
            <Globe size={12}/> Social Media Master
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-transparent">
                Connect Your Platforms
              </h1>
              <p className="text-slate-400 mt-2">
                Store all social media credentials securely in one place
              </p>
            </div>
            {!isNew && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2">
                <CheckCircle size={16} className="text-emerald-400"/>
                <span className="text-emerald-400 text-sm font-bold">{enabledCount} Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
            status.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}>
            {status.type === "success" ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
            {status.text}
            <button onClick={() => setStatus(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Master name */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Master Name</label>
            <input
              type="text" value={masterName} onChange={(e) => setMasterName(e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-semibold"
              placeholder="Social Media Master"
            />
          </div>

          {/* Platform cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Zap size={18} className="text-violet-400"/> Platform Credentials
              <span className="text-xs font-normal text-slate-500 ml-1">Click to expand • Toggle to enable</span>
            </h2>
            {PLATFORMS.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                data={platforms[platform.id] || {}}
                onChange={handlePlatformChange}
              />
            ))}
          </div>

          {/* Custom platforms */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingBag size={18} className="text-orange-400"/> Custom Platforms
                <span className="text-xs font-normal text-slate-500">Shopify, TikTok, Pinterest etc.</span>
              </h2>
              <button type="button" onClick={addCustom}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-bold hover:bg-orange-600/30 transition">
                <Plus size={14}/> Add Platform
              </button>
            </div>

            {customs.map((cp, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <input
                    type="text" value={cp.platformName}
                    onChange={(e) => updateCustom(i, "platformName", e.target.value)}
                    placeholder="Platform name (e.g. Shopify, TikTok)"
                    className="bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-bold flex-1 mr-3"
                  />
                  <button type="button" onClick={() => removeCustom(i)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition">
                    <Trash2 size={16}/>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "accountName", label: "Account Name",   ph: "My Store",          secret: false },
                    { key: "accountId",   label: "Account ID",     ph: "store.myshopify.com",secret: false },
                    { key: "token",       label: "API Key / Token", ph: "shpat_xxxxxxx...", secret: true  },
                    { key: "secret",      label: "API Secret",     ph: "shpss_xxxxxxx...", secret: true  },
                    { key: "webhookUrl",  label: "Webhook URL",    ph: "https://...",       secret: false },
                    { key: "apiEndpoint", label: "API Endpoint",   ph: "https://api.example.com", secret: false },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">
                        {f.secret && <Lock size={9} className="inline mr-1 text-slate-600"/>}{f.label}
                      </label>
                      {f.secret ? (
                        <SecretField
                          value={cp[f.key] || ""}
                          onChange={(e) => updateCustom(i, f.key, e.target.value)}
                          placeholder={f.ph}
                        />
                      ) : (
                        <input type="text" value={cp[f.key] || ""}
                          onChange={(e) => updateCustom(i, f.key, e.target.value)}
                          placeholder={f.ph}
                          className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={cp.enabled}
                      onChange={(e) => updateCustom(i, "enabled", e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600"/>
                    <span className="text-xs font-bold text-slate-400">Enable this platform</span>
                  </label>
                  <select value={cp.status}
                    onChange={(e) => updateCustom(i, "status", e.target.value)}
                    className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            ))}

            {customs.length === 0 && (
              <div className="text-center py-8 text-slate-600 border border-dashed border-white/5 rounded-2xl">
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No custom platforms yet. Click "Add Platform" to add Shopify, TikTok etc.</p>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex gap-3">
            <Lock size={18} className="text-amber-400 shrink-0 mt-0.5"/>
            <div>
              <p className="text-amber-300 font-bold text-sm">Credentials are encrypted</p>
              <p className="text-amber-300/60 text-xs mt-1 leading-relaxed">
                All tokens and secrets are encrypted using AES-256-CBC before storing in the database.
                They are never sent back to the frontend in plain text.
              </p>
            </div>
          </div>

          {/* Save button */}
          <button type="submit" disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:opacity-90 transition disabled:opacity-50 shadow-xl shadow-violet-500/20">
            {loading
              ? <><Loader2 className="animate-spin" size={22}/> Saving...</>
              : <><Save size={22}/> {isNew ? "Create" : "Update"} Social Media Master</>
            }
          </button>

        </form>
      </div>
    </div>
  );
}