// 📁 src/app/admin/finance/report/balance-sheet/page.jsx
"use client";
import { useEffect, useState } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);

const S = {
  page: {minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},
  card: {background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"},
  inp:  {padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},
  sk:   {background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8},
  lbl:  {fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:6},
};

function BSSection({ title, grouped, total, color, extra }) {
  return (
    <div style={{...S.card,border:`1px solid ${color}20`}}>
      <div style={{padding:"13px 18px",borderBottom:`1px solid ${color}20`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color}}>{title}</span>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:`${color}88`}}>
          {Object.values(grouped||{}).reduce((s,g)=>s+g.items.length,0)} accounts
        </span>
      </div>
      {Object.entries(grouped||{}).map(([group,{items,total:gt}])=>(
        <div key={group}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,padding:"8px 18px 3px"}}>{group}</div>
          {items.map(item=>(
            <div key={item._id} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              style={{display:"flex",justifyContent:"space-between",padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)",transition:"background 0.15s",cursor:"default"}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,color:"#94a3b8"}}>{item.accountName}</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color,fontWeight:500}}>{fmtINR(Math.abs(item.closingBalance))}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 18px",background:`${color}08`,borderTop:"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b"}}>Subtotal — {group}</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color}}>{fmtINR(gt)}</span>
          </div>
        </div>
      ))}
      {extra}
      <div style={{display:"flex",justifyContent:"space-between",padding:"14px 18px",background:`${color}0c`,borderTop:`2px solid ${color}30`}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9"}}>Total {title}</span>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color}}>{fmtINR(total||0)}</span>
      </div>
    </div>
  );
}

export default function BalanceSheetPage() {
  const token = () => typeof window !== "undefined" ? localStorage.getItem("token")||"" : "";
  const [data,   setData]   = useState(null);
  const [totals, setTotals] = useState({});
  const [loading,setLoading]= useState(true);
  const [fy,     setFy]     = useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/accounts/reports/balance-sheet?fiscalYear=${fy}`, { headers: { Authorization: `Bearer ${token()}` } });
    const d   = await res.json();
    if (d.success) { setData(d.data); setTotals(d.totals||{}); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [fy]);

  const totalLE = (totals.totalLiabilities||0) + (totals.totalEquity||0);
  const diff    = Math.abs((totals.totalAssets||0) - totalLE);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        @keyframes sk { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes fu { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={S.page}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>

          {/* Header */}
          <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
            <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:"0 0 6px"}}>Balance Sheet</h1>
            <p style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569"}}>Assets = Liabilities + Equity · Snapshot as of FY {fy}</p>
          </div>

          {/* Filters + Status */}
          <div style={{...S.card,padding:"16px 20px",marginBottom:20,display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",borderRadius:14,justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <label style={S.lbl}>Fiscal Year</label>
                <select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>
                  {[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}–{String(y+1).slice(2)}</option>)}
                </select>
              </div>
              <button onClick={load} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer"}}>↻ Refresh</button>
            </div>
            {!loading && (
              <div style={{padding:"8px 18px",borderRadius:10,background:totals.balanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${totals.balanced?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,color:totals.balanced?"#22c55e":"#ef4444",fontFamily:"'DM Mono',monospace",fontSize:12}}>
                {totals.balanced ? "✓ Assets = Liabilities + Equity" : `✕ Difference: ${fmtINR(diff)}`}
              </div>
            )}
          </div>

          {loading ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[1,2,3].map(i=><div key={i} style={{...S.sk,height:280}}/>)}
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:16,animation:"fu 0.5s ease"}}>

              {/* Main grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* Left — Assets */}
                <BSSection title="Assets" grouped={data?.assets?.grouped} total={totals.totalAssets} color="#38bdf8"/>

                {/* Right — Liabilities + Equity stacked */}
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <BSSection title="Liabilities" grouped={data?.liabilities?.grouped} total={totals.totalLiabilities} color="#f472b6"/>
                  <BSSection title="Equity" grouped={data?.equity?.grouped} total={totals.totalEquity} color="#a78bfa"
                    extra={
                      totals.retainedEarnings != null && (
                        <div style={{display:"flex",justifyContent:"space-between",padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)",background:"rgba(167,139,250,0.04)"}}>
                          <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,color:"#94a3b8"}}>Retained Earnings (Net Profit/Loss)</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:totals.retainedEarnings>=0?"#a78bfa":"#ef4444",fontWeight:500}}>
                            {fmtINR(Math.abs(totals.retainedEarnings))}
                          </span>
                        </div>
                      )
                    }
                  />
                </div>
              </div>

              {/* Footer totals */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div style={{padding:"16px 20px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9"}}>Total Assets</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#38bdf8"}}>{fmtINR(totals.totalAssets)}</span>
                </div>
                <div style={{padding:"16px 20px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9"}}>Total L + E</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#a78bfa"}}>{fmtINR(totalLE)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}