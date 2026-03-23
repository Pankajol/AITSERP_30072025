"use client";
// Works for both Customer (/ageing/customer) and Supplier (/ageing/supplier)
// Pass partyType prop: "Customer" | "Supplier"
import { useEffect, useState } from "react";
const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);
const BUCKET_COLORS = {"0-30":"#22c55e","31-60":"#f59e0b","61-90":"#f97316","90+":"#ef4444"};

export default function AgeingPage({ partyType = "Customer" }) {
  const token = ()=>localStorage.getItem("token")||"";
  const [data,setData]=useState([]);const [buckets,setBuckets]=useState({});const [loading,setLoading]=useState(true);
  const [asOf,setAsOf]=useState(new Date().toISOString().slice(0,10));
  const [search,setSearch]=useState("");

  const fetch_ = async()=>{
    setLoading(true);
    const type=partyType.toLowerCase();
    const res=await fetch(`/api/accounts/reports/ageing/${type}?asOfDate=${asOf}`,{headers:{Authorization:`Bearer ${token()}`}});
    const d=await res.json();
    if(d.success){setData(d.data||[]);setBuckets(d.buckets||{});}
    setLoading(false);
  };
  useEffect(()=>{fetch_();},[asOf,partyType]);

  const color = partyType==="Customer"?"#38bdf8":"#f472b6";
  const filtered = data.filter(r=>!search.trim()||r.partyName?.toLowerCase().includes(search.toLowerCase()));

  const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8}};

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse;width:100%}`}</style>
    <div style={S.page}><div style={{maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>{partyType} Ageing</h1>
        <p style={{margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569"}}>Outstanding {partyType==="Customer"?"receivables":"payables"} — bucket-wise breakdown</p>
      </div>

      {/* Filters */}
      <div style={{...S.card,padding:"16px 18px",marginBottom:18,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",borderRadius:12}}>
        <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>As Of Date</div>
          <input type="date" value={asOf} onChange={e=>setAsOf(e.target.value)} style={S.inp}/>
        </div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#475569",fontSize:13}}>⌕</span>
          <input placeholder={`Search ${partyType}...`} value={search} onChange={e=>setSearch(e.target.value)}
            style={{...S.inp,paddingLeft:28,width:200}}/>
        </div>
        <button onClick={fetch_} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:"pointer"}}>↻ Refresh</button>
      </div>

      {/* Bucket summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
        {Object.entries(BUCKET_COLORS).map(([b,c])=>(
          <div key={b} style={{background:`${c}10`,border:`1px solid ${c}30`,borderRadius:12,padding:"14px",textAlign:"center",animation:"fu 0.5s ease"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:c}}>{fmtINR(buckets[b])}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:4}}>{b} days</div>
          </div>
        ))}
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"14px",textAlign:"center"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#f1f5f9"}}>{fmtINR(buckets.total)}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:4}}>Total</div>
        </div>
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9"}}>{partyType} Ageing Report</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{filtered.length} {partyType.toLowerCase()}s · As of {new Date(asOf).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div>
        </div>
        {loading?(<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>{[1,2,3,4].map(i=><div key={i} style={{...S.sk,height:44}}/>)}</div>)
        :filtered.length===0?(<div style={{padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>◎</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No outstanding {partyType.toLowerCase()} invoices</div></div>):(
          <div style={{overflowX:"auto"}}><table>
            <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              {[partyType,"Total","0-30 days","31-60 days","61-90 days","90+ days"].map(h=>(
                <th key={h} style={{padding:"11px 16px",textAlign:h===partyType?"left":"right",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((row,i)=>(
                <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0"}}>{row.partyName}</td>
                  <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color}}>{fmtINR(row.total)}</td>
                  {["0-30","31-60","61-90","90+"].map(b=>(
                    <td key={b} style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:row[b]>0?BUCKET_COLORS[b]:"#334155"}}>{row[b]>0?fmtINR(row[b]):"—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{borderTop:"2px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)"}}>
              <td style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>TOTAL</td>
              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color}}>{fmtINR(buckets.total)}</td>
              {["0-30","31-60","61-90","90+"].map(b=>(
                <td key={b} style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color:BUCKET_COLORS[b]}}>{fmtINR(buckets[b])}</td>
              ))}
            </tr></tfoot>
          </table></div>
        )}
      </div>
    </div></div>
  </>);
}

// Customer ageing
export function CustomerAgeingPage() { return <AgeingPage partyType="Customer"/>; }
// Supplier ageing
export function SupplierAgeingPage() { return <AgeingPage partyType="Supplier"/>; }