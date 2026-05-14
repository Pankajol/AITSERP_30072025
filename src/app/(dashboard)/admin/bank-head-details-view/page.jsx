"use client";
import { useEffect, useState, useRef } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const TYPE_COLOR = { Asset:"#38bdf8",Liability:"#f472b6",Equity:"#a78bfa",Income:"#22c55e",Expense:"#f59e0b" };

function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0a1628":"#1a0a0a",border:`1px solid ${t.type==="success"?"#22c55e55":"#ef444455"}`,color:t.type==="success"?"#22c55e":"#ef4444",padding:"12px 20px",borderRadius:12,fontSize:13,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:10,minWidth:260 }}>
          <span>{t.type==="success"?"✦":"✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

export default function GeneralLedgerPage() {
  const token = ()=>typeof window!=="undefined"?localStorage.getItem("token")||"":"";
  const [accounts, setAccounts]   = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledger, setLedger]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [toasts, setToasts]       = useState([]);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const toastId = useRef(0);

  const addToast = (msg, type="success")=>{
    const id=++toastId.current;
    setToasts(p=>[...p,{id,message:msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  useEffect(()=>{
    fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}})
      .then(r=>r.json()).then(d=>{ if(d.success) setAccounts(d.data||[]); });
  },[]);

  useEffect(()=>{ if(selectedId) fetchLedger(); },[selectedId,fiscalYear,fromDate,toDate]);

  const fetchLedger = async () => {
    setLoading(true);
    setLedger(null);
    try {
      let url = `/api/accounts/ledger/${selectedId}?fiscalYear=${fiscalYear}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate)   url += `&toDate=${toDate}`;
      const res  = await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
      const data = await res.json();
      if (data.success) setLedger(data);
      else addToast(data.message||"Failed to load ledger","error");
    } catch { addToast("Failed to load","error"); }
    finally { setLoading(false); }
  };

  const account = ledger?.account;
  const entries = ledger?.entries || [];
  const summary = ledger?.summary || {};
  const typeColor = TYPE_COLOR[account?.type] || "#64748b";

  // Group by month for mini chart
  const monthly = entries.reduce((acc,e)=>{
    const key = new Date(e.date).toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
    if (!acc[key]) acc[key]={ debit:0,credit:0 };
    acc[key].debit  += e.debit;
    acc[key].credit += e.credit;
    return acc;
  },{});

  const INPUT_STYLE = { padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes gl-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gl-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .gl-page * { box-sizing:border-box; }
        .gl-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .gl-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:gl-shimmer 1.4s infinite; border-radius:8px; }
        .gl-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .gl-row:hover { background:rgba(255,255,255,0.025); }
        table { border-collapse:collapse; width:100%; }
      `}</style>
      <Toast toasts={toasts} />

      <div className="gl-page">
        <div style={{ maxWidth:1100,margin:"0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom:28,animation:"gl-fadeUp 0.4s ease" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>Accounts</div>
            <h1 style={{ fontSize:32,fontWeight:800,color:"#f8fafc",margin:0 }}>General Ledger</h1>
            <p style={{ margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569" }}>Account-wise transaction statement with running balance</p>
          </div>

          {/* Filters */}
          <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"20px",marginBottom:20,display:"flex",flexWrap:"wrap",gap:14,alignItems:"flex-end",animation:"gl-fadeUp 0.4s ease 0.05s both" }}>
            <div style={{ flex:"2 1 240px" }}>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Account *</label>
              <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} style={{ ...INPUT_STYLE,width:"100%" }}>
                <option value="">-- Select Account --</option>
                {["Asset","Liability","Equity","Income","Expense"].map(type=>(
                  <optgroup key={type} label={`── ${type} ──`}>
                    {accounts.filter(a=>a.type===type).map(a=>(
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Fiscal Year</label>
              <select value={fiscalYear} onChange={e=>setFiscalYear(e.target.value)} style={INPUT_STYLE}>
                {[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>From Date</label>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>To Date</label>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={INPUT_STYLE} />
            </div>
            {(fromDate||toDate)&&(
              <button onClick={()=>{setFromDate("");setToDate("");}} style={{ padding:"9px 14px",borderRadius:9,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",alignSelf:"flex-end" }}>✕ Clear</button>
            )}
          </div>

          {/* Account Info + Summary */}
          {account && (
            <div style={{ background:"#0d1829",border:`1px solid ${typeColor}22`,borderRadius:16,padding:"20px",marginBottom:20,animation:"gl-fadeUp 0.4s ease" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:typeColor,textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>{account.type} · {account.group}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#f1f5f9" }}>{account.name}</div>
                  {account.code&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:12,color:"#475569",marginTop:2 }}>Code: {account.code}</div>}
                </div>
                <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                  {[["Opening",summary.openingBalance,"#64748b"],["Total Debit",summary.totalDebit,"#38bdf8"],["Total Credit",summary.totalCredit,"#a78bfa"],["Closing",summary.closingBalance,typeColor]].map(([l,v,c])=>(
                    <div key={l} style={{ background:`${c}10`,border:`1px solid ${c}25`,borderRadius:10,padding:"12px 16px",textAlign:"center",minWidth:110 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:c }}>{fmtINR(v)}</div>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ledger table */}
          <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,overflow:"hidden",animation:"gl-fadeUp 0.4s ease 0.1s both" }}>
            <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f1f5f9",margin:0 }}>
                  {account?`${account.name} — Ledger`:"Select an account to view ledger"}
                </h2>
                {entries.length>0&&<div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",marginTop:3 }}>{entries.length} transactions · FY {fiscalYear}</div>}
              </div>
              {ledger&&<button onClick={fetchLedger} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer" }}>↻ Refresh</button>}
            </div>

            {!selectedId ? (
              <div style={{padding:"80px 20px",textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12,color:"#334155"}}>≡</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>Select an account from above to view its ledger statement</div>
              </div>
            ) : loading ? (
              <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
                {[1,2,3,4,5].map(i=><div key={i} className="gl-skeleton" style={{height:44}} />)}
              </div>
            ) : entries.length===0 ? (
              <div style={{padding:"60px 20px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:12}}>◎</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No transactions found for this account</div>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table>
                  <thead>
                    <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      {["Date","Ref No","Type","Narration","Debit","Credit","Balance"].map(h=>(
                        <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening balance row */}
                    <tr style={{background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      <td colSpan={4} style={{padding:"10px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#475569",fontStyle:"italic"}}>Opening Balance</td>
                      <td colSpan={2} style={{padding:"10px 16px"}}></td>
                      <td style={{padding:"10px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#64748b",fontWeight:500}}>{fmtINR(summary.openingBalance)}</td>
                    </tr>
                    {entries.map((e,i)=>(
                      <tr key={e._id} className="gl-row" style={{animation:`gl-fadeUp 0.4s ease ${i*0.03}s both`}}>
                        <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{new Date(e.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                        <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#38bdf8"}}>{e.transactionId?.transactionNumber||e.transactionNumber||"—"}</td>
                        <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{e.transactionType||"—"}</td>
                        <td style={{padding:"11px 16px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.narration||"—"}</td>
                        <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{e.debit>0?fmtINR(e.debit):"—"}</td>
                        <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{e.credit>0?fmtINR(e.credit):"—"}</td>
                        <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:e.balance>=0?typeColor:"#ef4444"}}>{fmtINR(Math.abs(e.balance))}</td>
                      </tr>
                    ))}
                    {/* Closing balance row */}
                    <tr style={{background:"rgba(255,255,255,0.03)",borderTop:"2px solid rgba(255,255,255,0.08)"}}>
                      <td colSpan={4} style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Closing Balance</td>
                      <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#38bdf8"}}>{fmtINR(summary.totalDebit)}</td>
                      <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#a78bfa"}}>{fmtINR(summary.totalCredit)}</td>
                      <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:typeColor}}>{fmtINR(Math.abs(summary.closingBalance))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}