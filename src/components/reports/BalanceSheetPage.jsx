"use client";
import { useEffect, useState } from "react";
const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);

export default function BalanceSheetPage() {
  const token = ()=>localStorage.getItem("token")||"";
  const [data,setData]=useState(null);const [totals,setTotals]=useState({});const [loading,setLoading]=useState(true);
  const [fy,setFy]=useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);

  const fetch_ = async()=>{
    setLoading(true);
    const res=await fetch(`/api/accounts/reports/balance-sheet?fiscalYear=${fy}`,{headers:{Authorization:`Bearer ${localStorage.getItem("token")||""}`}});
    const d=await res.json();
    if(d.success){setData(d.data);setTotals(d.totals||{});}
    setLoading(false);
  };
  useEffect(()=>{fetch_();},[fy]);

  const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden"},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8}};

  const Section=({title,grouped,total,color,extra})=>(
    <div style={{...S.card,border:`1px solid ${color}18`,height:"fit-content"}}>
      <div style={{padding:"13px 16px",borderBottom:`1px solid ${color}18`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color}}>{title}</div>
      {Object.entries(grouped||{}).map(([group,{items,total:gt}])=>(
        <div key={group}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,padding:"8px 16px 3px"}}>{group}</div>
          {items.map(item=>(
            <div key={item._id} style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,color:"#94a3b8"}}>{item.accountName}</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color,fontWeight:500}}>{fmtINR(Math.abs(item.closingBalance))}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",background:`${color}08`}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b"}}>Total {group}</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color}}>{fmtINR(gt)}</span>
          </div>
        </div>
      ))}
      {extra}
      <div style={{display:"flex",justifyContent:"space-between",padding:"13px 16px",background:`${color}0c`,borderTop:`1px solid ${color}25`}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Total {title}</span>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color}}>{fmtINR(total)}</span>
      </div>
    </div>
  );

  const totalLE = (totals.totalLiabilities||0)+(totals.totalEquity||0);

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div style={S.page}><div style={{maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>Balance Sheet</h1>
      </div>
      <div style={{...S.card,padding:"16px 18px",marginBottom:18,display:"flex",gap:12,alignItems:"center",borderRadius:12,justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Fiscal Year</div>
            <select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>{[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}</select>
          </div>
          <button onClick={fetch_} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer"}}>↻ Refresh</button>
        </div>
        <div style={{padding:"7px 16px",borderRadius:9,background:totals.balanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${totals.balanced?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,color:totals.balanced?"#22c55e":"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12}}>
          {totals.balanced?"✓ Assets = Liabilities + Equity":"✕ Unbalanced — Check entries"}
        </div>
      </div>
      {loading?(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{[1,2].map(i=><div key={i} style={{...S.sk,height:300}}/>)}</div>):(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Section title="Assets" grouped={data?.assets?.grouped} total={totals.totalAssets} color="#38bdf8"/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Section title="Liabilities" grouped={data?.liabilities?.grouped} total={totals.totalLiabilities} color="#f472b6"/>
              <Section title="Equity" grouped={data?.equity?.grouped} total={totals.totalEquity} color="#a78bfa"
                extra={totals.retainedEarnings!=null&&(
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                    <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,color:"#94a3b8"}}>Retained Earnings (Net Profit)</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa",fontWeight:500}}>{fmtINR(totals.retainedEarnings)}</span>
                  </div>
                )}
              />
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{padding:"14px 18px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9"}}>Total Assets</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#38bdf8"}}>{fmtINR(totals.totalAssets)}</span>
            </div>
            <div style={{padding:"14px 18px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9"}}>Total L + E</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#a78bfa"}}>{fmtINR(totalLE)}</span>
            </div>
          </div>
        </div>
      )}
    </div></div>
  </>);
}