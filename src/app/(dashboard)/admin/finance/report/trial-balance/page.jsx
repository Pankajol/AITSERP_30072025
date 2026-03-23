// 📁 src/app/admin/finance/report/trial-balance/page.jsx
"use client";
import { useEffect, useState } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const TYPE_COLOR = {Asset:"#38bdf8",Liability:"#f472b6",Equity:"#a78bfa",Income:"#22c55e",Expense:"#f59e0b"};
const TYPES = ["Asset","Liability","Equity","Income","Expense"];

const S = {
  page: {minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},
  card: {background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,overflow:"hidden"},
  inp:  {padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},
  sk:   {background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8},
  lbl:  {fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:6},
};

export default function TrialBalancePage() {
  const token = () => typeof window !== "undefined" ? localStorage.getItem("token")||"" : "";
  const [data,   setData]   = useState([]);
  const [totals, setTotals] = useState({});
  const [loading,setLoading]= useState(true);
  const [fy,     setFy]     = useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState("");

  const load = async () => {
    setLoading(true);
    let url = `/api/accounts/reports/trial-balance?fiscalYear=${fy}`;
    if (from) url += `&fromDate=${from}`;
    if (to)   url += `&toDate=${to}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    const d   = await res.json();
    if (d.success) { setData(d.data||[]); setTotals(d.totals||{}); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [fy, from, to]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        @keyframes sk  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes fu  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .tb-row:hover { background: rgba(255,255,255,0.025) !important; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <div style={S.page}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>

          {/* Header */}
          <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
            <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:"0 0 6px"}}>Trial Balance</h1>
            <p style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569"}}>All accounts — debit & credit closing balances</p>
          </div>

          {/* Filters */}
          <div style={{...S.card,padding:"18px 20px",marginBottom:18,display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-end",borderRadius:14}}>
            <div>
              <label style={S.lbl}>Fiscal Year</label>
              <select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>
                {[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}–{String(y+1).slice(2)}</option>)}
              </select>
            </div>
            <div>
              <label style={S.lbl}>From Date</label>
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.inp}/>
            </div>
            <div>
              <label style={S.lbl}>To Date</label>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.inp}/>
            </div>
            {(from||to) && (
              <button onClick={()=>{setFrom("");setTo("");}}
                style={{padding:"9px 14px",borderRadius:9,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer"}}>
                ✕ Clear
              </button>
            )}
            <button onClick={load}
              style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",marginLeft:"auto"}}>
              ↻ Refresh
            </button>
          </div>

          {/* Table */}
          <div style={S.card}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f1f5f9"}}>Trial Balance — FY {fy}</div>
                {!loading && <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",marginTop:3}}>{data.length} accounts</div>}
              </div>
              <div style={{padding:"6px 16px",borderRadius:9,background:totals.isBalanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${totals.isBalanced?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,color:totals.isBalanced?"#22c55e":"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12}}>
                {totals.isBalanced ? "✓ Balanced" : "✕ Unbalanced"}
              </div>
            </div>

            {loading ? (
              <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
                {[1,2,3,4,5,6].map(i=><div key={i} style={{...S.sk,height:44}}/>)}
              </div>
            ) : data.length === 0 ? (
              <div style={{padding:"80px 20px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:12,color:"#334155"}}>◎</div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No data — make sure Chart of Accounts is set up</div>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table>
                  <thead>
                    <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      {["Code","Account Name","Type","Group","Debit","Credit","Closing Balance"].map(h=>(
                        <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit","Closing Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TYPES.map(type => {
                      const rows = data.filter(d => d.type === type);
                      if (!rows.length) return null;
                      const c = TYPE_COLOR[type];
                      return [
                        <tr key={`grp-${type}`} style={{background:`${c}08`}}>
                          <td colSpan={7} style={{padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,color:c,textTransform:"uppercase",letterSpacing:2,fontWeight:500}}>
                            {type} — {rows.length} account{rows.length>1?"s":""}
                          </td>
                        </tr>,
                        ...rows.map(r => (
                          <tr key={r._id} className="tb-row" style={{borderBottom:"1px solid rgba(255,255,255,0.03)",transition:"background 0.15s"}}>
                            <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#334155"}}>{r.code||"—"}</td>
                            <td style={{padding:"11px 16px",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0"}}>{r.accountName}</td>
                            <td style={{padding:"11px 16px"}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 8px",borderRadius:6,background:`${c}18`,color:c}}>{type}</span>
                            </td>
                            <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{r.group||"—"}</td>
                            <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{r.totalDebit>0?fmtINR(r.totalDebit):"—"}</td>
                            <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{r.totalCredit>0?fmtINR(r.totalCredit):"—"}</td>
                            <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:r.closingBalance>=0?c:"#ef4444"}}>
                              {fmtINR(Math.abs(r.closingBalance))}
                            </td>
                          </tr>
                        )),
                      ];
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)"}}>
                      <td colSpan={4} style={{padding:"13px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9"}}>TOTAL</td>
                      <td style={{padding:"13px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#38bdf8"}}>{fmtINR(totals.totalDebit)}</td>
                      <td style={{padding:"13px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#a78bfa"}}>{fmtINR(totals.totalCredit)}</td>
                      <td style={{padding:"13px 16px"}}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}