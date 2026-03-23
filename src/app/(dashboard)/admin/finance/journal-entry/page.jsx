"use client";
import { useEffect, useState, useRef, useMemo } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0a1628":"#1a0a0a",border:`1px solid ${t.type==="success"?"#22c55e55":"#ef444455"}`,color:t.type==="success"?"#22c55e":"#ef4444",padding:"12px 20px",borderRadius:12,fontSize:13,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:10,minWidth:260,animation:"je-slide 0.3s ease" }}>
          <span>{t.type==="success"?"✦":"✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

const INPUT_STYLE = { width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" };
const SELECT_STYLE = { ...INPUT_STYLE, colorScheme:"dark" };

export default function JournalEntryPage() {
  const token = ()=>typeof window!=="undefined"?localStorage.getItem("token")||"":"";
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toasts, setToasts]     = useState([]);
  const [search, setSearch]     = useState("");
  const [tab, setTab]           = useState("list"); // "list" | "new"
  const toastId = useRef(0);

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    narration: "",
    lines: [
      { accountId:"", type:"Debit",  amount:"", description:"" },
      { accountId:"", type:"Credit", amount:"", description:"" },
    ],
  });

  const addToast = (msg, type="success") => {
    const id=++toastId.current;
    setToasts(p=>[...p,{id,message:msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  useEffect(()=>{ fetchAccounts(); fetchEntries(); },[]);

  const fetchAccounts = async () => {
    const res  = await fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}});
    const data = await res.json();
    if (data.success) setAccounts(data.data||[]);
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/accounts/transactions?type=Journal+Entry",{headers:{Authorization:`Bearer ${token()}`}});
      const data = await res.json();
      if (data.success) setEntries(data.data||[]);
    } catch { addToast("Failed to load entries","error"); }
    finally { setLoading(false); }
  };

  // ── Line helpers ──
  const updateLine = (i, field, val) => {
    setForm(p => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], [field]: val };
      return { ...p, lines };
    });
  };

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { accountId:"", type:"Debit", amount:"", description:"" }] }));
  const removeLine = (i) => { if (form.lines.length <= 2) return; setForm(p => ({ ...p, lines: p.lines.filter((_,idx)=>idx!==i) })); };

  // ── Totals ──
  const totalDebit  = form.lines.filter(l=>l.type==="Debit").reduce((s,l)=>s+Number(l.amount||0),0);
  const totalCredit = form.lines.filter(l=>l.type==="Credit").reduce((s,l)=>s+Number(l.amount||0),0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) { addToast("Entry is not balanced — Debit must equal Credit","error"); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/accounts/transactions",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ type:"Journal Entry", date:form.date, lines:form.lines.map(l=>({...l,amount:Number(l.amount)})), narration:form.narration }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("Journal entry posted successfully");
        setForm({ date:new Date().toISOString().slice(0,10), narration:"", lines:[{accountId:"",type:"Debit",amount:"",description:""},{accountId:"",type:"Credit",amount:"",description:""}] });
        setTab("list"); fetchEntries();
      } else addToast(data.message||"Failed","error");
    } catch { addToast("Failed to post entry","error"); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(()=>entries.filter(e=>!search.trim()||e.transactionNumber?.toLowerCase().includes(search.toLowerCase())||e.narration?.toLowerCase().includes(search.toLowerCase())),[entries,search]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes je-slide { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes je-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes je-spin { to{transform:rotate(360deg)} }
        @keyframes je-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .je-page * { box-sizing:border-box; }
        .je-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .je-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:je-shimmer 1.4s infinite; border-radius:8px; }
        .je-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .je-row:hover { background:rgba(255,255,255,0.025); }
        .je-tab { padding:9px 20px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:12px; cursor:pointer; transition:all 0.2s; }
        .je-tab.active { background:rgba(99,102,241,0.12); border-color:#6366f155; color:#818cf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>
      <Toast toasts={toasts} />

      <div className="je-page">
        <div style={{ maxWidth:1000,margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28,flexWrap:"wrap",gap:16,animation:"je-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>Accounts</div>
              <h1 style={{ fontSize:32,fontWeight:800,color:"#f8fafc",margin:0 }}>Journal Entry</h1>
              <p style={{ margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569" }}>Manual double-entry bookkeeping</p>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button className={`je-tab${tab==="list"?" active":""}`} onClick={()=>setTab("list")}>≡ All Entries</button>
              <button className={`je-tab${tab==="new"?" active":""}`} onClick={()=>setTab("new")}
                style={{ background:tab==="new"?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"transparent",color:tab==="new"?"#fff":"#64748b",border:tab==="new"?"none":"1px solid rgba(255,255,255,0.08)" }}>
                + New Entry
              </button>
            </div>
          </div>

          {/* ── NEW ENTRY FORM ── */}
          {tab==="new" && (
            <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"28px",marginBottom:20,animation:"je-fadeUp 0.4s ease" }}>
              <form onSubmit={handleSubmit}>
                {/* Date + Narration */}
                <div style={{ display:"grid",gridTemplateColumns:"200px 1fr",gap:14,marginBottom:20 }}>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Date *</label>
                    <input type="date" required value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{ ...INPUT_STYLE,colorScheme:"dark" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Narration</label>
                    <input value={form.narration} onChange={e=>setForm(p=>({...p,narration:e.target.value}))} placeholder="e.g. Office rent paid for March 2026" style={INPUT_STYLE} />
                  </div>
                </div>

                {/* Lines table */}
                <div style={{ background:"rgba(255,255,255,0.02)",borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)",marginBottom:16 }}>
                  <div style={{ display:"grid",gridTemplateColumns:"2fr 100px 140px 1fr 36px",gap:0,padding:"9px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                    {["Account","Dr/Cr","Amount","Description",""].map(h=>(
                      <div key={h} style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5 }}>{h}</div>
                    ))}
                  </div>
                  {form.lines.map((line,i)=>(
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 100px 140px 1fr 36px",gap:8,padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center" }}>
                      <select required value={line.accountId} onChange={e=>updateLine(i,"accountId",e.target.value)} style={SELECT_STYLE}>
                        <option value="">-- Select Account --</option>
                        {accounts.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
                      </select>
                      <select value={line.type} onChange={e=>updateLine(i,"type",e.target.value)} style={{ ...SELECT_STYLE,color:line.type==="Debit"?"#38bdf8":"#a78bfa" }}>
                        <option value="Debit">Debit</option>
                        <option value="Credit">Credit</option>
                      </select>
                      <input type="number" min="0" required value={line.amount} onChange={e=>updateLine(i,"amount",e.target.value)} placeholder="0" style={{ ...INPUT_STYLE,textAlign:"right" }} />
                      <input value={line.description} onChange={e=>updateLine(i,"description",e.target.value)} placeholder="Optional note" style={INPUT_STYLE} />
                      <button type="button" onClick={()=>removeLine(i)} disabled={form.lines.length<=2}
                        style={{ width:28,height:28,borderRadius:7,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.08)",color:"#ef4444",cursor:form.lines.length<=2?"not-allowed":"pointer",opacity:form.lines.length<=2?0.3:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>✕</button>
                    </div>
                  ))}
                </div>

                {/* Add line + totals */}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10 }}>
                  <button type="button" onClick={addLine}
                    style={{ padding:"8px 16px",borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer" }}>
                    + Add Line
                  </button>
                  <div style={{ display:"flex",gap:20,alignItems:"center" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569" }}>Total Debit</div>
                      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#38bdf8" }}>{fmtINR(totalDebit)}</div>
                    </div>
                    <div style={{ color:"#334155",fontSize:18 }}>=</div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569" }}>Total Credit</div>
                      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#a78bfa" }}>{fmtINR(totalCredit)}</div>
                    </div>
                    <div style={{ padding:"6px 14px",borderRadius:8,background:isBalanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${isBalanced?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,color:isBalanced?"#22c55e":"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12 }}>
                      {isBalanced?"✓ Balanced":"✕ Unbalanced"}
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
                  <button type="button" onClick={()=>setTab("list")} style={{ padding:"11px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving||!isBalanced}
                    style={{ padding:"11px 28px",borderRadius:10,border:"none",background:isBalanced?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"rgba(255,255,255,0.05)",color:isBalanced?"#fff":"#334155",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:saving||!isBalanced?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8 }}>
                    {saving?<span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"je-spin 0.7s linear infinite" }} />:"✦ Post Entry"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── ENTRIES LIST ── */}
          {tab==="list" && (
            <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,overflow:"hidden",animation:"je-fadeUp 0.4s ease 0.05s both" }}>
              <div style={{ padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                <div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f1f5f9",margin:0 }}>Journal Entries</h2>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",marginTop:3 }}>{filtered.length} entries</div>
                </div>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:13 }}>⌕</span>
                  <input placeholder="Search entries..." value={search} onChange={e=>setSearch(e.target.value)}
                    style={{ paddingLeft:28,paddingRight:12,paddingTop:7,paddingBottom:7,borderRadius:8,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",width:200 }} />
                </div>
              </div>

              {loading ? (
                <div style={{ padding:20,display:"flex",flexDirection:"column",gap:10 }}>
                  {[1,2,3].map(i=><div key={i} className="je-skeleton" style={{height:52}} />)}
                </div>
              ) : filtered.length===0 ? (
                <div style={{ padding:"60px 20px",textAlign:"center" }}>
                  <div style={{fontSize:36,marginBottom:12}}>◎</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No journal entries yet</div>
                  <button onClick={()=>setTab("new")} style={{ marginTop:16,padding:"9px 20px",borderRadius:10,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.08)",color:"#818cf8",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer" }}>+ Post First Entry</button>
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        {["Ref No","Date","Narration","Debit","Credit","Lines","Status"].map(h=>(
                          <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e,i)=>{
                        const dr = e.lines?.filter(l=>l.type==="Debit").reduce((s,l)=>s+l.amount,0)||0;
                        const cr = e.lines?.filter(l=>l.type==="Credit").reduce((s,l)=>s+l.amount,0)||0;
                        return (
                          <tr key={e._id} className="je-row" style={{animation:`je-fadeUp 0.4s ease ${i*0.04}s both`}}>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#38bdf8"}}>{e.transactionNumber}</td>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b"}}>{new Date(e.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                            <td style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.narration||"—"}</td>
                            <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{fmtINR(dr)}</td>
                            <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{fmtINR(cr)}</td>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#475569"}}>{e.lines?.length||0} lines</td>
                            <td style={{padding:"12px 16px"}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 9px",borderRadius:20,background:e.status==="Posted"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:e.status==="Posted"?"#22c55e":"#ef4444",border:`1px solid ${e.status==="Posted"?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`}}>
                                {e.status==="Posted"?"✓ Posted":"✕ Cancelled"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}