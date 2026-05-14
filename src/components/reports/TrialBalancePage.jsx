"use client";
import { useEffect, useState, useRef } from "react";
const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const TYPE_COLOR = {Asset:"#38bdf8",Liability:"#f472b6",Equity:"#a78bfa",Income:"#22c55e",Expense:"#f59e0b"};

export default function TrialBalancePage() {
  const token = ()=>localStorage.getItem("token")||"";
  const [data,setData]=useState([]);const [totals,setTotals]=useState({});const [loading,setLoading]=useState(true);
  const [fy,setFy]=useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [from,setFrom]=useState("");const [to,setTo]=useState("");

  const fetch_ = async()=>{
    setLoading(true);
    let url=`/api/accounts/reports/trial-balance?fiscalYear=${fy}`;
    if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
    const d=await res.json();
    if(d.success){setData(d.data||[]);setTotals(d.totals||{});}
    setLoading(false);
  };
  useEffect(()=>{fetch_();},[fy,from,to]);

  const TYPES=["Asset","Liability","Equity","Income","Expense"];
  const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,overflow:"hidden"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"}};

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse;width:100%}`}</style>
    <div style={S.page}><div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>Trial Balance</h1>
      </div>
      {/* Filters */}
      <div style={{...S.card,padding:"18px 20px",marginBottom:18,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",borderRadius:14}}>
        {[["Fiscal Year",<select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>{[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}</select>],
          ["From Date",<input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.inp}/>],
          ["To Date",<input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.inp}/>]
        ].map(([l,el])=>(
          <div key={l}><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>{l}</div>{el}</div>
        ))}
        <button onClick={fetch_} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",alignSelf:"flex-end"}}>↻ Refresh</button>
      </div>

      <div style={S.card}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9"}}>Trial Balance — FY {fy}</div>
          <div style={{padding:"5px 14px",borderRadius:8,background:totals.isBalanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${totals.isBalanced?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,color:totals.isBalanced?"#22c55e":"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12}}>
            {totals.isBalanced?"✓ Balanced":"✕ Unbalanced"}
          </div>
        </div>
        {loading?(<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>{[1,2,3,4,5].map(i=><div key={i} style={{...S.sk,height:44}}/>)}</div>):(
          <div style={{overflowX:"auto"}}>
            <table>
              <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                {["Code","Account","Type","Group","Debit","Credit","Balance"].map(h=>(
                  <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {TYPES.map(type=>{
                  const rows=data.filter(d=>d.type===type);
                  if(!rows.length)return null;
                  const c=TYPE_COLOR[type];
                  return[
                    <tr key={`h-${type}`} style={{background:`${c}08`}}><td colSpan={7} style={{padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:10,color:c,textTransform:"uppercase",letterSpacing:2}}>{type}</td></tr>,
                    ...rows.map(r=>(
                      <tr key={r._id} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{padding:"10px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#334155"}}>{r.code||"—"}</td>
                        <td style={{padding:"10px 16px",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0"}}>{r.accountName}</td>
                        <td style={{padding:"10px 16px"}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 8px",borderRadius:6,background:`${c}18`,color:c}}>{type}</span></td>
                        <td style={{padding:"10px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{r.group||"—"}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{r.totalDebit>0?fmtINR(r.totalDebit):"—"}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{r.totalCredit>0?fmtINR(r.totalCredit):"—"}</td>
                        <td style={{padding:"10px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:r.closingBalance>=0?c:"#ef4444"}}>{fmtINR(Math.abs(r.closingBalance))}</td>
                      </tr>
                    ))
                  ];
                })}
              </tbody>
              <tfoot><tr style={{borderTop:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)"}}>
                <td colSpan={4} style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>TOTAL</td>
                <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#38bdf8"}}>{fmtINR(totals.totalDebit)}</td>
                <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#a78bfa"}}>{fmtINR(totals.totalCredit)}</td>
                <td style={{padding:"12px 16px"}}></td>
              </tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </div></div>
  </>);
}