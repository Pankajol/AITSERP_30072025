"use client";
import { useEffect, useState, useMemo, useRef } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const TYPE_CFG = {
  Asset:     { color: "#38bdf8", icon: "◈", bg: "rgba(56,189,248,0.1)"  },
  Liability: { color: "#f472b6", icon: "▼", bg: "rgba(244,114,182,0.1)" },
  Equity:    { color: "#a78bfa", icon: "◎", bg: "rgba(167,139,250,0.1)" },
  Income:    { color: "#22c55e", icon: "↑", bg: "rgba(34,197,94,0.1)"   },
  Expense:   { color: "#f59e0b", icon: "↓", bg: "rgba(245,158,11,0.1)"  },
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
    <div style={{ position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0a1628":"#1a0a0a", border:`1px solid ${t.type==="success"?"#22c55e55":"#ef444455"}`, color:t.type==="success"?"#22c55e":"#ef4444", padding:"12px 20px",borderRadius:12,fontSize:13,fontFamily:"'DM Mono',monospace", display:"flex",alignItems:"center",gap:10,minWidth:260, animation:"ah-slide 0.3s ease" }}>
          <span>{t.type==="success"?"✦":"✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, onSave, editData, heads }) {
  const [form, setForm] = useState({ name:"",type:"Asset",group:"Current Asset",balanceType:"Debit",openingBalance:"",code:"",description:"",parentId:"" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (editData) setForm({ name:editData.name||"",type:editData.type||"Asset",group:editData.group||"",balanceType:editData.balanceType||"Debit",openingBalance:editData.openingBalance||"",code:editData.code||"",description:editData.description||"",parentId:editData.parentId?._id||"", _id:editData._id });
    else setForm({ name:"",type:"Asset",group:"Current Asset",balanceType:"Debit",openingBalance:"",code:"",description:"",parentId:"" });
  }, [editData, open]);

  const handleTypeChange = (type) => {
    const bt = ["Asset","Expense"].includes(type) ? "Debit" : "Credit";
    setForm(p=>({ ...p, type, balanceType:bt, group:GROUPS[type]?.[0]||"" }));
  };

  const handleSubmit = async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:100,opacity:open?1:0,pointerEvents:open?"all":"none",transition:"opacity 0.3s" }} />
      <div style={{ position:"fixed",top:"50%",left:"50%",transform:open?"translate(-50%,-50%) scale(1)":"translate(-50%,-50%) scale(0.93)",width:"min(500px,94vw)",background:"#0a0f1e",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,zIndex:101,opacity:open?1:0,pointerEvents:open?"all":"none",transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",boxShadow:"0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 26px 18px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2 }}>Chart of Accounts</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:19,color:"#f1f5f9",margin:"4px 0 0" }}>{editData?"Edit Account":"New Account Head"}</h3>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)",border:"none",color:"#94a3b8",width:34,height:34,borderRadius:10,cursor:"pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding:"22px 26px",display:"flex",flexDirection:"column",gap:16 }}>
          {/* Type selector */}
          <div>
            <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:8 }}>Account Type *</label>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {Object.entries(TYPE_CFG).map(([t,c])=>(
                <button type="button" key={t} onClick={()=>handleTypeChange(t)}
                  style={{ padding:"7px 14px",borderRadius:8,border:`1px solid ${form.type===t?c.color:"rgba(255,255,255,0.07)"}`,background:form.type===t?c.bg:"transparent",color:form.type===t?c.color:"#475569",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",transition:"all 0.2s" }}>
                  {c.icon} {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Account Name *</label>
              <input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. HDFC Savings Account"
                style={{ width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" }} />
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Group</label>
              <select value={form.group} onChange={e=>setForm(p=>({...p,group:e.target.value}))}
                style={{ width:"100%",padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark" }}>
                {(GROUPS[form.type]||[]).map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Account Code</label>
              <input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} placeholder="e.g. 1001"
                style={{ width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" }} />
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Opening Balance ₹</label>
              <input type="number" value={form.openingBalance} onChange={e=>setForm(p=>({...p,openingBalance:e.target.value}))} placeholder="0"
                style={{ width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" }} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Description</label>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Optional notes"
                style={{ width:"100%",padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" }} />
            </div>
          </div>
          <div style={{ display:"flex",gap:10,marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#94a3b8",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              {saving?<span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"ah-spin 0.7s linear infinite" }} />:`${editData?"Update":"Create"} Account`}
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
    const url    = form._id?`/api/accounts/heads/${form._id}`:"/api/accounts/heads";
    const method = form._id?"PUT":"POST";
    const res    = await fetch(url,{method,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(form)});
    const data   = await res.json();
    if (data.success) { addToast(form._id?"Account updated":"Account created"); setShowModal(false); setEditData(null); fetchHeads(); }
    else addToast(data.message||"Failed","error");
  };

  const handleDelete = async (id) => {
    if (!confirm("Deactivate this account?")) return;
    const res  = await fetch(`/api/accounts/heads/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}});
    const data = await res.json();
    if (data.success) { addToast("Account deactivated"); fetchHeads(); }
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
        .ah-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .ah-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:ah-shimmer 1.4s infinite; border-radius:8px; }
        .ah-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .ah-row:hover { background:rgba(255,255,255,0.025); }
        .ah-filter { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .ah-filter.active { background:rgba(99,102,241,0.1); border-color:#6366f155; color:#818cf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>
      <Toast toasts={toasts} />
      <Modal open={showModal} onClose={()=>{setShowModal(false);setEditData(null);}} onSave={handleSave} editData={editData} heads={heads} />

      <div className="ah-page">
        <div style={{ maxWidth:1000,margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28,flexWrap:"wrap",gap:16,animation:"ah-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>Accounts</div>
              <h1 style={{ fontSize:32,fontWeight:800,color:"#f8fafc",margin:0 }}>Chart of Accounts</h1>
              <p style={{ margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569" }}>{heads.length} accounts · Double-entry bookkeeping</p>
            </div>
            <button onClick={()=>{setEditData(null);setShowModal(true);}}
              style={{ display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",border:"none",color:"#fff",padding:"11px 20px",borderRadius:11,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 4px 20px rgba(59,130,246,0.3)",transition:"all 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
              <span style={{fontSize:18}}>+</span> Add Account
            </button>
          </div>

          {/* Type summary pills */}
          <div style={{ display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",animation:"ah-fadeUp 0.4s ease 0.05s both" }}>
            <button className={`ah-filter${filterType==="All"?" active":""}`} onClick={()=>setFilterType("All")}>All ({heads.length})</button>
            {Object.entries(TYPE_CFG).map(([t,c])=>(
              <button key={t} onClick={()=>setFilterType(filterType===t?"All":t)}
                style={{ padding:"6px 14px",borderRadius:20,border:`1px solid ${filterType===t?c.color:"rgba(255,255,255,0.08)"}`,background:filterType===t?c.bg:"transparent",color:filterType===t?c.color:"#64748b",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",transition:"all 0.2s" }}>
                {c.icon} {t} ({totalByType[t]||0})
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position:"relative",marginBottom:20,maxWidth:320,animation:"ah-fadeUp 0.4s ease 0.08s both" }}>
            <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:13 }}>⌕</span>
            <input placeholder="Search accounts..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:28,paddingRight:12,paddingTop:9,paddingBottom:9,borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",width:"100%" }} />
          </div>

          {/* Grouped tables */}
          {loading ? (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {[1,2,3].map(i=><div key={i} className="ah-skeleton" style={{height:160}} />)}
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              {Object.entries(grouped).map(([type, items], gi)=>{
                const cfg = TYPE_CFG[type]||TYPE_CFG.Asset;
                return (
                  <div key={type} style={{ background:"#0d1829",border:`1px solid ${cfg.color}22`,borderRadius:16,overflow:"hidden",animation:`ah-fadeUp 0.5s ease ${gi*0.07}s both` }}>
                    <div style={{ padding:"14px 20px",background:`${cfg.color}08`,borderBottom:`1px solid ${cfg.color}22`,display:"flex",alignItems:"center",gap:10 }}>
                      <span style={{ color:cfg.color,fontSize:18 }}>{cfg.icon}</span>
                      <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:cfg.color }}>{type}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:cfg.color+"99",marginLeft:4 }}>{items.length} accounts</span>
                    </div>
                    <table>
                      <thead>
                        <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                          {["Code","Name","Group","Balance Type","Opening Balance",""].map(h=>(
                            <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(h=>(
                          <tr key={h._id} className="ah-row">
                            <td style={{ padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#475569" }}>{h.code||"—"}</td>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0" }}>{h.name}</div>
                              {h.isSystemAccount&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",marginTop:2 }}>system</div>}
                              {h.description&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#334155",marginTop:2 }}>{h.description}</div>}
                            </td>
                            <td style={{ padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b" }}>{h.group||"—"}</td>
                            <td style={{ padding:"12px 16px" }}>
                              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 8px",borderRadius:6,background:h.balanceType==="Debit"?"rgba(56,189,248,0.1)":"rgba(167,139,250,0.1)",color:h.balanceType==="Debit"?"#38bdf8":"#a78bfa" }}>{h.balanceType}</span>
                            </td>
                            <td style={{ padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:13,color:h.openingBalance>0?"#22c55e":"#334155" }}>
                              {h.openingBalance>0?fmtINR(h.openingBalance):"—"}
                            </td>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex",gap:6 }}>
                                <button onClick={()=>{setEditData(h);setShowModal(true);}}
                                  style={{ padding:"5px 10px",borderRadius:7,border:"1px solid rgba(99,102,241,0.2)",background:"rgba(99,102,241,0.08)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer" }}>✎</button>
                                {!h.isSystemAccount&&(
                                  <button onClick={()=>handleDelete(h._id)}
                                    style={{ padding:"5px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer" }}>✕</button>
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
              {Object.keys(grouped).length===0&&(
                <div style={{ padding:"60px 20px",textAlign:"center",background:"#0d1829",borderRadius:16,border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{fontSize:36,marginBottom:12}}>◈</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No accounts found</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}




// "use client";

// import { useState, useEffect } from "react";
// import axios from "axios";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
//   FaFileUpload, FaDownload, FaCheck, FaTimes, FaUniversity
// } from "react-icons/fa";

// export default function AccountHeadPage() {
//   const [view, setView] = useState("list");
//   const [accountHeads, setAccountHeads] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterType, setFilterType] = useState("All");
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
  
//   const [formData, setFormData] = useState({
//     accountHeadCode: "",
//     accountHeadDescription: "",
//     status: "Active",
//   });
//   const [editingId, setEditingId] = useState(null);

//   useEffect(() => {
//     fetchAccountHeads();
//   }, []);

//   const fetchAccountHeads = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/account-head", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) {
//         setAccountHeads(res.data.data);
//       } else {
//         toast.error(res.data.message || "Failed to fetch data");
//       }
//     } catch (error) {
//       toast.error("Error fetching account heads");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setSubmitting(true);
//     const token = localStorage.getItem("token");

//     try {
//       if (editingId) {
//         const res = await axios.put(`/api/account-head/${editingId}`, formData, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           toast.success("Account head updated");
//           setAccountHeads((prev) =>
//             prev.map((item) => (item._id === editingId ? res.data.data : item))
//           );
//           resetForm();
//         } else {
//           toast.error(res.data.message);
//         }
//       } else {
//         const res = await axios.post("/api/account-head", formData, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           toast.success("Account head created");
//           setAccountHeads([...accountHeads, res.data.data]);
//           resetForm();
//         } else {
//           toast.error(res.data.message);
//         }
//       }
//     } catch (error) {
//       toast.error("Error saving account head");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this account head?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.delete(`/api/account-head/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) {
//         toast.success("Deleted successfully");
//         setAccountHeads(accountHeads.filter((item) => item._id !== id));
//       } else {
//         toast.error(res.data.message);
//       }
//     } catch (error) {
//       toast.error("Error deleting account head");
//     }
//   };

//   const handleEdit = (head) => {
//     setFormData({
//       accountHeadCode: head.accountHeadCode,
//       accountHeadDescription: head.accountHeadDescription,
//       status: head.status,
//     });
//     setEditingId(head._id);
//     setView("form");
//   };

//   const resetForm = () => {
//     setFormData({
//       accountHeadCode: "",
//       accountHeadDescription: "",
//       status: "Active",
//     });
//     setEditingId(null);
//     setView("list");
//   };

//   const handleBulk = async (e) => {
//     const file = e.target.files[0]; if (!file) return;
//     setUploading(true);
//     // Placeholder for bulk upload logic if needed, similar to supplier
//     // For now just simulate delay
//     setTimeout(() => {
//         toast.info("Bulk upload not implemented for Account Heads yet.");
//         setUploading(false);
//         e.target.value = "";
//     }, 1000);
//   };

//   const downloadTemplate = () => {
//     const h = ["accountHeadCode", "accountHeadDescription", "status"];
//     const r = ["AH001", "General Expenses", "Active"];
//     const blob = new Blob([[h, r].map(x => x.join(",")).join("\n")], { type: "text/csv" });
//     const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "account_head_template.csv"; a.click();
//   };

//   const filtered = accountHeads.filter(h => {
//     const q = searchTerm.toLowerCase();
//     const mQ = [h.accountHeadCode, h.accountHeadDescription].some(v => v?.toLowerCase().includes(q));
//     const mT = filterType === "All" || h.status === filterType;
//     return mQ && mT;
//   });

//   const stats = {
//     total: accountHeads.length,
//     active: accountHeads.filter(h => h.status === "Active").length,
//     inactive: accountHeads.filter(h => h.status === "Inactive").length,
//   };

//   const fi = (extra = "") =>
//     `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 ${extra}`;

//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );

//   if (view === "list") return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
//         <ToastContainer />
        
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Account Heads</h1>
//             <p className="text-sm text-gray-400 mt-0.5">{accountHeads.length} total records</p>
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <button onClick={downloadTemplate}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
//               <FaDownload className="text-xs" /> Template
//             </button>
//             <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
//               {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
//               <input type="file" hidden accept=".csv" onChange={handleBulk} />
//             </label>
//             <button onClick={() => { resetForm(); setView("form"); }}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               <FaPlus className="text-xs" /> Add Account Head
//             </button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label: "Total", value: stats.total, emoji: "📊", filter: "All" },
//             { label: "Active", value: stats.active, emoji: "✅", filter: "Active" },
//             { label: "Inactive", value: stats.inactive, emoji: "❌", filter: "Inactive" },
//           ].map(s => (
//             <div key={s.label} onClick={() => setFilterType(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
//                 ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Table Card */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
//           {/* Toolbar */}
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input
//                 className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
//                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All", "Active", "Inactive"].map(t => (
//                 <button key={t} onClick={() => setFilterType(t)}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {t}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Table */}
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["Code", "Description", "Status", "Actions"].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   Array(4).fill(0).map((_, i) => (
//                     <tr key={i} className="border-b border-gray-50">
//                       {Array(4).fill(0).map((__, j) => (
//                         <td key={j} className="px-4 py-3">
//                           <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
//                         </td>
//                       ))}
//                     </tr>
//                   ))
//                 ) : filtered.length === 0 ? (
//                   <tr><td colSpan={4} className="text-center py-16">
//                     <div className="text-4xl mb-2 opacity-20">📇</div>
//                     <p className="text-sm font-medium text-gray-300">No records found</p>
//                   </td></tr>
//                 ) : filtered.map(h => (
//                   <tr key={h._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
//                     <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{h.accountHeadCode}</td>
//                     <td className="px-4 py-3 font-medium text-gray-900">{h.accountHeadDescription}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
//                         ${h.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
//                         {h.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex gap-1.5">
//                         <button onClick={() => handleEdit(h)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaEdit className="text-xs" />
//                         </button>
//                         <button onClick={() => handleDelete(h._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaTrash className="text-xs" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );

//   // Form View
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
//         <ToastContainer />
//         <button onClick={resetForm} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
//           <FaArrowLeft className="text-xs" /> Back to List
//         </button>

//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
//           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
//             <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
//               <FaUniversity className="text-base" />
//             </div>
//             <div>
//               <h3 className="text-base font-bold text-gray-900">{editingId ? "Edit Account Head" : "New Account Head"}</h3>
//               <p className="text-xs text-gray-400">Fill in the details below</p>
//             </div>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <Lbl text="Account Head Code" req />
//               <input
//                 className={fi()}
//                 value={formData.accountHeadCode}
//                 onChange={e => setFormData({ ...formData, accountHeadCode: e.target.value })}
//                 placeholder="e.g. AH001"
//                 required
//               />
//             </div>
//             <div>
//               <Lbl text="Description" req />
//               <input
//                 className={fi()}
//                 value={formData.accountHeadDescription}
//                 onChange={e => setFormData({ ...formData, accountHeadDescription: e.target.value })}
//                 placeholder="e.g. General Expenses"
//                 required
//               />
//             </div>
//             <div>
//               <Lbl text="Status" req />
//               <select
//                 className={fi()}
//                 value={formData.status}
//                 onChange={e => setFormData({ ...formData, status: e.target.value })}
//               >
//                 <option value="Active">Active</option>
//                 <option value="Inactive">Inactive</option>
//               </select>
//             </div>

//             <div className="pt-4 flex gap-3">
//               <button type="button" onClick={resetForm}
//                 className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all">
//                 Cancel
//               </button>
//               <button type="submit" disabled={submitting}
//                 className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 disabled:opacity-60">
//                 {submitting ? "Saving…" : (editingId ? "Update" : "Create")}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }





// "use client";
// import React, { useState } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const AccountHeadDetails = () => {
//   const [formData, setFormData] = useState({
//     accountHeadCode: "",
//     accountHeadDescription: "",
//     status: "",
//   });

//   const validateForm = () => {
//     if (!formData.accountHeadCode.trim()) {
//       toast.error("Account head code is required");
//       return false;
//     }
//     if (!formData.accountHeadDescription.trim()) {
//       toast.error("Account head description is required");
//       return false;
//     }
//     if (!formData.status) {
//       toast.error("Please select a status");
//       return false;
//     }
//     return true;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/account-head", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
          
//         },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok) {
//         console.log("Submitted Account Head Details:", result.data);
//         toast.success("Account head details submitted successfully!");
//         // Optionally clear the form after successful submission:
//         setFormData({
//           accountHeadCode: "",
//           accountHeadDescription: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting form");
//       }
//     } catch (error) {
//       console.error("Error submitting account head details:", error);
//       toast.error("Error submitting account head details");
//     }
//   };
  

//   const handleClear = () => {
//     setFormData({ accountHeadCode: "", accountHeadDescription: "", status: "" });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Head Details</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Head Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Code
//           </label>
//           <input
//             type="text"
//             name="accountHeadCode"
//             value={formData.accountHeadCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head code"
//           />
//         </div>
//         {/* Account Head Description */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Description
//           </label>
//           <input
//             type="text"
//             name="accountHeadDescription"
//             value={formData.accountHeadDescription}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head description"
//           />
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Status
//           </label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select status</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             type="submit"
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Submit
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Clear
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default AccountHeadDetails;
