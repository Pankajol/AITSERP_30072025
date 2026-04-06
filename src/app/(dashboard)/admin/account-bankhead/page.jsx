"use client";
import { useEffect, useState, useMemo, useRef } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const TYPE_CFG = {
  Asset:     { color: "#0ea5e9", icon: "◈", bg: "rgba(14,165,233,0.08)"  },
  Liability: { color: "#ec4899", icon: "▼", bg: "rgba(236,72,153,0.08)" },
  Equity:    { color: "#8b5cf6", icon: "◎", bg: "rgba(139,92,246,0.08)" },
  Income:    { color: "#10b981", icon: "↑", bg: "rgba(16,185,129,0.08)"   },
  Expense:   { color: "#f59e0b", icon: "↓", bg: "rgba(245,158,11,0.08)"  },
};

const GROUPS = {
  Asset:     ["Current Asset","Fixed Asset","Other Asset"],
  Liability: ["Current Liability","Long Term Liability"],
  Equity:    ["Capital","Reserve"],
  Income:    ["Direct Income","Indirect Income"],
  Expense:   ["Direct Expense","Indirect Expense"],
};

function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ 
          background: t.type==="success" ? "#f0fdf4" : "#fef2f2",
          borderLeft: `4px solid ${t.type==="success" ? "#22c55e" : "#ef4444"}`,
          color: t.type==="success" ? "#166534" : "#991b1b",
          padding:"12px 20px",
          borderRadius:12,
          fontSize:13,
          fontFamily:"'DM Mono', monospace",
          display:"flex",
          alignItems:"center",
          gap:10,
          minWidth:260,
          boxShadow:"0 4px 12px rgba(0,0,0,0.05)",
          animation:"ah-slide 0.3s ease"
        }}>
          <span>{t.type==="success" ? "✓" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, onSave, editData, heads }) {
  const [form, setForm] = useState({ name:"", type:"Asset", group:"Current Asset", balanceType:"Debit", openingBalance:"", code:"", description:"", parentId:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) setForm({ name:editData.name||"", type:editData.type||"Asset", group:editData.group||"", balanceType:editData.balanceType||"Debit", openingBalance:editData.openingBalance||"", code:editData.code||"", description:editData.description||"", parentId:editData.parentId?._id||"", _id:editData._id });
    else setForm({ name:"", type:"Asset", group:"Current Asset", balanceType:"Debit", openingBalance:"", code:"", description:"", parentId:"" });
  }, [editData, open]);

  const handleTypeChange = (type) => {
    const bt = ["Asset","Expense"].includes(type) ? "Debit" : "Credit";
    setForm(p=>({ ...p, type, balanceType:bt, group:GROUPS[type]?.[0]||"" }));
  };

  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(3px)", zIndex:100, opacity:open?1:0, pointerEvents:open?"all":"none", transition:"opacity 0.3s" }} />
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:open?"translate(-50%,-50%) scale(1)":"translate(-50%,-50%) scale(0.95)", width:"min(500px,94vw)", background:"white", borderRadius:24, zIndex:101, opacity:open?1:0, pointerEvents:open?"all":"none", transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)", boxShadow:"0 24px 48px -12px rgba(0,0,0,0.2)", border:"1px solid #e2e8f0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:2 }}>Chart of Accounts</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:19, color:"#0f172a", margin:"4px 0 0" }}>{editData?"Edit Account":"New Account Head"}</h3>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", color:"#475569", width:34, height:34, borderRadius:10, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:8 }}>Account Type *</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(TYPE_CFG).map(([t,c])=>(
                <button type="button" key={t} onClick={()=>handleTypeChange(t)}
                  style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${form.type===t ? c.color : "#cbd5e1"}`, background:form.type===t ? c.bg : "transparent", color:form.type===t ? c.color : "#475569", fontFamily:"'DM Mono',monospace", fontSize:12, cursor:"pointer", transition:"all 0.2s" }}>
                  {c.icon} {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:7 }}>Account Name *</label>
              <input required value={form.name} onChange={e=>setForm(p=>({...p, name:e.target.value}))} placeholder="e.g. HDFC Savings Account"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none", transition:"0.2s" }} />
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:7 }}>Group</label>
              <select value={form.group} onChange={e=>setForm(p=>({...p, group:e.target.value}))}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none" }}>
                {(GROUPS[form.type]||[]).map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:7 }}>Account Code</label>
              <input value={form.code} onChange={e=>setForm(p=>({...p, code:e.target.value}))} placeholder="e.g. 1001"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none" }} />
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:7 }}>Opening Balance ₹</label>
              <input type="number" value={form.openingBalance} onChange={e=>setForm(p=>({...p, openingBalance:e.target.value}))} placeholder="0"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none" }} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:1.5, display:"block", marginBottom:7 }}>Description</label>
              <input value={form.description} onChange={e=>setForm(p=>({...p, description:e.target.value}))} placeholder="Optional notes"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"12px", borderRadius:10, border:"1px solid #cbd5e1", background:"white", color:"#475569", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {saving ? <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"ah-spin 0.7s linear infinite" }} /> : `${editData?"Update":"Create"} Account`}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function AccountHeadPage() {
  const token = ()=>typeof window!=="undefined"?localStorage.getItem("token")||"":"";
  const [heads, setHeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [search, setSearch]   = useState("");
  const [filterType, setFilterType] = useState("All");
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const addToast = (msg, type="success") => {
    const id = ++toastId.current;
    setToasts(p=>[...p,{id,message:msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  useEffect(()=>{ fetchHeads(); },[]);

  const fetchHeads = async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/accounts/heads?init=true",{headers:{Authorization:`Bearer ${token()}`}});
      const data = await res.json();
      if (data.success) setHeads(data.data||[]);
      else addToast(data.message||"Failed to load","error");
    } catch { addToast("Failed to load accounts","error"); }
    finally { setLoading(false); }
  };

  const handleSave = async (form) => {
    const trimmedName = form.name?.trim().toLowerCase();
    const trimmedCode = form.code?.trim();

    const isDupName = heads.some(h =>
      h._id !== form._id &&
      h.name.trim().toLowerCase() === trimmedName &&
      h.isActive !== false
    );
    if (isDupName) {
      addToast(`"${form.name.trim()}" naam ka account pehle se exist karta hai`, "error");
      return;
    }

    if (trimmedCode) {
      const isDupCode = heads.some(h =>
        h._id !== form._id &&
        h.code?.trim() === trimmedCode &&
        h.isActive !== false
      );
      if (isDupCode) {
        addToast(`Code "${trimmedCode}" pehle se use ho raha hai`, "error");
        return;
      }
    }

    const url    = form._id ? `/api/accounts/heads/${form._id}` : "/api/accounts/heads";
    const method = form._id ? "PUT" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        addToast(form._id ? "Account update ho gaya ✓" : "Account create ho gaya ✓");
        setShowModal(false);
        setEditData(null);
        fetchHeads();
      } else {
        addToast(data.message || "Kuch error aaya, dobara try karo", "error");
      }
    } catch {
      addToast("Network error — dobara try karo", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this account?")) return;
    const res  = await fetch(`/api/accounts/heads/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}});
    const data = await res.json();
    if (data.success) { addToast("Account deactivate ho gaya"); fetchHeads(); }
    else addToast(data.message||"Failed","error");
  };

  const filtered = useMemo(()=>heads.filter(h=>{
    const matchSearch = !search.trim()||h.name.toLowerCase().includes(search.toLowerCase())||h.code?.includes(search);
    const matchType   = filterType==="All"||h.type===filterType;
    return matchSearch&&matchType;
  }),[heads,search,filterType]);

  const grouped = useMemo(()=>filtered.reduce((acc,h)=>{ if(!acc[h.type]) acc[h.type]=[]; acc[h.type].push(h); return acc; },{}),[filtered]);

  const totalByType = useMemo(()=>heads.reduce((acc,h)=>{ acc[h.type]=(acc[h.type]||0)+1; return acc; },{}),[heads]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes ah-slide { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ah-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ah-spin { to{transform:rotate(360deg)} }
        @keyframes ah-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ah-page * { box-sizing:border-box; }
        .ah-page { min-height:100vh; background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #eef2ff 100%); font-family:'Syne',sans-serif; color:#0f172a; padding:32px 20px 60px; }
        .ah-skeleton { background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size:400px 100%; animation:ah-shimmer 1.4s infinite; border-radius:12px; }
        .ah-row { border-bottom:1px solid #e2e8f0; transition:background 0.15s; }
        .ah-row:hover { background:#f8fafc; }
        .ah-filter { padding:6px 14px; border-radius:20px; border:1px solid #cbd5e1; background:white; color:#475569; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .ah-filter.active { background:rgba(99,102,241,0.08); border-color:#6366f1; color:#4f46e5; }
        table { border-collapse:collapse; width:100%; }
      `}</style>
      <Toast toasts={toasts} />
      <Modal open={showModal} onClose={()=>{setShowModal(false);setEditData(null);}} onSave={handleSave} editData={editData} heads={heads} />

      <div className="ah-page">
        <div style={{ maxWidth:1000, margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28, flexWrap:"wrap", gap:16, animation:"ah-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:2, marginBottom:4 }}>Accounts</div>
              <h1 style={{ fontSize:32, fontWeight:800, color:"#0f172a", margin:0 }}>Chart of Accounts</h1>
              <p style={{ margin:"6px 0 0", fontFamily:"'DM Mono',monospace", fontSize:13, color:"#475569" }}>{heads.length} accounts · Double-entry bookkeeping</p>
            </div>
            <button onClick={()=>{setEditData(null);setShowModal(true);}}
              style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#2563eb,#3b82f6)", border:"none", color:"#fff", padding:"11px 20px", borderRadius:12, fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:"0 4px 12px rgba(37,99,235,0.2)", transition:"transform 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <span style={{fontSize:18}}>+</span> Add Account
            </button>
          </div>

          {/* Type summary pills */}
          <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", animation:"ah-fadeUp 0.4s ease 0.05s both" }}>
            <button className={`ah-filter${filterType==="All" ? " active" : ""}`} onClick={()=>setFilterType("All")}>All ({heads.length})</button>
            {Object.entries(TYPE_CFG).map(([t,c])=>(
              <button key={t} onClick={()=>setFilterType(filterType===t ? "All" : t)}
                style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filterType===t ? c.color : "#cbd5e1"}`, background:filterType===t ? c.bg : "white", color:filterType===t ? c.color : "#475569", fontFamily:"'DM Mono',monospace", fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>
                {c.icon} {t} ({totalByType[t]||0})
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position:"relative", marginBottom:20, maxWidth:320, animation:"ah-fadeUp 0.4s ease 0.08s both" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", fontSize:13 }}>⌕</span>
            <input placeholder="Search accounts..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:28, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:10, background:"white", border:"1px solid #cbd5e1", color:"#0f172a", fontFamily:"'DM Mono',monospace", fontSize:13, outline:"none", width:"100%" }} />
          </div>

          {/* Grouped tables */}
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[1,2,3].map(i=><div key={i} className="ah-skeleton" style={{height:160}} />)}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {Object.entries(grouped).map(([type, items], gi)=>{
                const cfg = TYPE_CFG[type]||TYPE_CFG.Asset;
                return (
                  <div key={type} style={{ background:"white", borderRadius:16, overflow:"hidden", border:`1px solid ${cfg.color}30`, boxShadow:"0 2px 8px rgba(0,0,0,0.02)", animation:`ah-fadeUp 0.5s ease ${gi*0.07}s both` }}>
                    <div style={{ padding:"14px 20px", background:`${cfg.color}08`, borderBottom:`1px solid ${cfg.color}20`, display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ color:cfg.color, fontSize:18 }}>{cfg.icon}</span>
                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:cfg.color }}>{type}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:`${cfg.color}99`, marginLeft:4 }}>{items.length} accounts</span>
                    </div>
                    <table style={{ width:"100%" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #e2e8f0" }}>
                          {["Code","Name","Group","Balance Type","Opening Balance",""].map(h=>(
                            <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:1.5, fontWeight:500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(h=>(
                          <tr key={h._id} className="ah-row">
                            <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#64748b" }}>{h.code||"—"}</td>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:14, color:"#0f172a" }}>{h.name}</div>
                              {h.isSystemAccount && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#64748b", marginTop:2 }}>system</div>}
                              {h.description && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#64748b", marginTop:2 }}>{h.description}</div>}
                            </td>
                            <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#475569" }}>{h.group||"—"}</td>
                            <td style={{ padding:"12px 16px" }}>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, padding:"2px 8px", borderRadius:6, background:h.balanceType==="Debit" ? "rgba(14,165,233,0.1)" : "rgba(139,92,246,0.1)", color:h.balanceType==="Debit" ? "#0ea5e9" : "#8b5cf6" }}>{h.balanceType}</span>
                            </td>
                            <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", fontSize:13, color:h.openingBalance>0 ? "#10b981" : "#64748b" }}>
                              {h.openingBalance>0 ? fmtINR(h.openingBalance) : "—"}
                            </td>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", gap:6 }}>
                                <button onClick={()=>{setEditData(h);setShowModal(true);}}
                                  style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #cbd5e1", background:"#f1f5f9", color:"#4f46e5", fontFamily:"'DM Mono',monospace", fontSize:11, cursor:"pointer" }}>✎</button>
                                {!h.isSystemAccount && (
                                  <button onClick={()=>handleDelete(h._id)}
                                    style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontFamily:"'DM Mono',monospace", fontSize:11, cursor:"pointer" }}>✕</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {Object.keys(grouped).length===0 && (
                <div style={{ padding:"60px 20px", textAlign:"center", background:"white", borderRadius:16, border:"1px solid #e2e8f0" }}>
                  <div style={{fontSize:36, marginBottom:12, color:"#94a3b8"}}>◈</div>
                  <div style={{fontFamily:"'DM Mono',monospace", fontSize:13, color:"#64748b"}}>No accounts found</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}