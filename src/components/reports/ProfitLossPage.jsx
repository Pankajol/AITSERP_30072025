"use client";
import { useEffect, useState } from "react";
const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);

export default function ProfitLossPage() {
  const token = ()=>localStorage.getItem("token")||"";
  const [data,setData]=useState(null);const [totals,setTotals]=useState({});const [loading,setLoading]=useState(true);
  const [fy,setFy]=useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [from,setFrom]=useState("");const [to,setTo]=useState("");

  const fetch_ = async()=>{
    setLoading(true);
    let url=`/api/accounts/reports/profit-loss?fiscalYear=${fy}`;
    if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
    const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
    const d=await res.json();
    if(d.success){setData(d.data);setTotals(d.totals||{});}
    setLoading(false);
  };
  useEffect(()=>{fetch_();},[fy,from,to]);

  const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8}};

  const Section = ({title,grouped,total,color})=>(
    <div style={{...S.card,border:`1px solid ${color}18`}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${color}18`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color}}>{title}</div>
      {Object.entries(grouped||{}).map(([group,{items,total:gt}])=>(
        <div key={group}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,padding:"10px 18px 4px"}}>{group}</div>
          {items.map(item=>(
            <div key={item._id} style={{display:"flex",justifyContent:"space-between",padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,color:"#e2e8f0"}}>{item.accountName}</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:13,color,fontWeight:500}}>{fmtINR(Math.abs(item.closingBalance))}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"9px 18px",background:`${color}08`}}>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b"}}>Total {group}</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color}}>{fmtINR(gt)}</span>
          </div>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",padding:"14px 18px",background:`${color}0c`,borderTop:`1px solid ${color}25`}}>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f1f5f9"}}>Total {title}</span>
        <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color}}>{fmtINR(total)}</span>
      </div>
    </div>
  );

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div style={S.page}><div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>Profit & Loss</h1>
      </div>
      <div style={{...S.card,padding:"18px 20px",marginBottom:18,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",borderRadius:14}}>
        {[["Fiscal Year",<select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>{[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}</select>],
          ["From Date",<input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.inp}/>],
          ["To Date",<input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.inp}/>]
        ].map(([l,el])=>(
          <div key={l}><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>{l}</div>{el}</div>
        ))}
        <button onClick={fetch_} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer",alignSelf:"flex-end"}}>↻ Refresh</button>
      </div>
      {loading?(<div style={{display:"flex",flexDirection:"column",gap:14}}>{[1,2].map(i=><div key={i} style={{...S.sk,height:200}}/>)}</div>):(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Section title="Income"   grouped={data?.income?.grouped}   total={totals.totalIncome}   color="#22c55e"/>
            <Section title="Expenses" grouped={data?.expenses?.grouped} total={totals.totalExpenses} color="#f59e0b"/>
          </div>
          <div style={{padding:"20px 24px",background:totals.isProfit?"rgba(34,197,94,0.06)":"rgba(239,68,68,0.06)",border:`1px solid ${totals.isProfit?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,borderRadius:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Net {totals.isProfit?"Profit":"Loss"}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#334155"}}>Income {fmtINR(totals.totalIncome)} − Expenses {fmtINR(totals.totalExpenses)}</div>
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,color:totals.isProfit?"#22c55e":"#ef4444"}}>{fmtINR(Math.abs(totals.netProfit||0))}</div>
          </div>
        </div>
      )}
    </div></div>
  </>);
}