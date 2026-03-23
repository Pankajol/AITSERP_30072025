"use client";
// Works for Customer Statement, Supplier Statement, Bank Statement
// Pass: type="customer" | "supplier" | "bank"
import { useEffect, useState, useMemo } from "react";
const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);

const TYPE_CFG = {
  customer: { label:"Customer Statement", color:"#38bdf8", partyLabel:"Customer",  apiPath:"customer", txnTypes:["Sales Invoice","Receipt","Credit Note"] },
  supplier: { label:"Supplier Statement", color:"#f472b6", partyLabel:"Supplier",  apiPath:"supplier", txnTypes:["Purchase Invoice","Payment","Debit Note"]  },
  bank:     { label:"Bank Statement",     color:"#22c55e", partyLabel:"Bank Account", apiPath:"bank",  txnTypes:["Payment","Receipt","Contra","Journal Entry"] },
};

export default function StatementPage({ type = "customer" }) {
  const token = ()=>localStorage.getItem("token")||"";
  const cfg = TYPE_CFG[type]||TYPE_CFG.customer;
  const [accounts,setAccounts]=useState([]);
  const [entries,setEntries]=useState([]);
  const [selectedParty,setSelectedParty]=useState("");
  const [loading,setLoading]=useState(false);
  const [fy,setFy]=useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [from,setFrom]=useState("");const [to,setTo]=useState("");

  useEffect(()=>{
    fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}})
      .then(r=>r.json()).then(d=>{ if(d.success) setAccounts(d.data||[]); });
  },[]);

  useEffect(()=>{ if(selectedParty) fetch_(); },[selectedParty,fy,from,to]);

  const fetch_ = async()=>{
    setLoading(true);setEntries([]);
    // For customer/supplier: fetch transactions by partyId
    // For bank: fetch ledger of the selected bank account
    let url;
    if(type==="bank") {
      url=`/api/accounts/ledger/${selectedParty}?fiscalYear=${fy}`;
      if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
      const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
      const d=await res.json();
      if(d.success) setEntries(d.entries||[]);
    } else {
      url=`/api/accounts/transactions?partyId=${selectedParty}&fiscalYear=${fy}`;
      if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
      const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
      const d=await res.json();
      if(d.success) setEntries(d.data||[]);
    }
    setLoading(false);
  };

  // Filter accounts for party selector
  const partyAccounts = useMemo(()=>{
    if(type==="bank") return accounts.filter(a=>a.group==="Current Asset"&&(a.name.toLowerCase().includes("bank")||a.name.toLowerCase().includes("cash")));
    if(type==="customer") return accounts.filter(a=>a.type==="Asset"&&a.name.toLowerCase().includes("receiv"));
    return accounts.filter(a=>a.type==="Liability"&&a.name.toLowerCase().includes("pay"));
  },[accounts,type]);

  // Summary
  const totalDebit  = entries.reduce((s,e)=>s+(e.debit||e.totalAmount||0),0);
  const totalCredit = entries.reduce((s,e)=>s+(e.credit||0),0);
  const closing     = entries.at(-1)?.balance??0;

  const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8}};

  return(<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse;width:100%}`}</style>
    <div style={S.page}><div style={{maxWidth:1100,margin:"0 auto"}}>
      <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
        <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>{cfg.label}</h1>
      </div>

      {/* Filters */}
      <div style={{...S.card,padding:"16px 18px",marginBottom:18,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",borderRadius:12}}>
        <div style={{flex:"2 1 220px"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>{cfg.partyLabel} *</div>
          <select value={selectedParty} onChange={e=>setSelectedParty(e.target.value)} style={{...S.inp,width:"100%"}}>
            <option value="">-- Select {cfg.partyLabel} --</option>
            {(partyAccounts.length>0?partyAccounts:accounts).map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>
        <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Fiscal Year</div>
          <select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>{[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}</select>
        </div>
        <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>From</div>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.inp}/>
        </div>
        <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>To</div>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.inp}/>
        </div>
        <button onClick={fetch_} disabled={!selectedParty} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:selectedParty?"pointer":"not-allowed",opacity:selectedParty?1:0.5}}>↻ Refresh</button>
      </div>

      {/* Summary cards */}
      {entries.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
          {[["Total Debit",totalDebit,"#38bdf8"],["Total Credit",totalCredit,"#a78bfa"],["Closing Balance",Math.abs(closing),cfg.color]].map(([l,v,c])=>(
            <div key={l} style={{background:`${c}10`,border:`1px solid ${c}25`,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:c}}>{fmtINR(v)}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={S.card}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9"}}>{cfg.label}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{entries.length} transactions</div>
        </div>

        {!selectedParty?(<div style={{padding:"80px 20px",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>Select a {cfg.partyLabel.toLowerCase()} to view statement</div>)
        :loading?(<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>{[1,2,3,4].map(i=><div key={i} style={{...S.sk,height:44}}/>)}</div>)
        :entries.length===0?(<div style={{padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>◎</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No transactions found</div></div>):(
          <div style={{overflowX:"auto"}}><table>
            <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              {["Date","Ref No","Type","Narration","Debit","Credit","Balance"].map(h=>(
                <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {entries.map((e,i)=>{
                const debit  = e.debit  ?? (e.type==="Payment"?e.totalAmount:0);
                const credit = e.credit ?? (e.type==="Receipt"?e.totalAmount:0);
                const bal    = e.balance ?? 0;
                return(
                  <tr key={e._id||i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={ev=>ev.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                    <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{new Date(e.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                    <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:cfg.color}}>{e.transactionId?.transactionNumber||e.transactionNumber||"—"}</td>
                    <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{e.transactionType||e.type||"—"}</td>
                    <td style={{padding:"11px 16px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.narration||e.referenceNumber||"—"}</td>
                    <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{debit>0?fmtINR(debit):"—"}</td>
                    <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{credit>0?fmtINR(credit):"—"}</td>
                    <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:bal>=0?cfg.color:"#ef4444"}}>{fmtINR(Math.abs(bal))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{borderTop:"2px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)"}}>
              <td colSpan={4} style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Closing Balance</td>
              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#38bdf8"}}>{fmtINR(totalDebit)}</td>
              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#a78bfa"}}>{fmtINR(totalCredit)}</td>
              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:cfg.color}}>{fmtINR(Math.abs(closing))}</td>
            </tr></tfoot>
          </table></div>
        )}
      </div>
    </div></div>
  </>);
}

export function CustomerStatementPage() { return <StatementPage type="customer"/>; }
export function SupplierStatementPage() { return <StatementPage type="supplier"/>; }
export function BankStatementPage()     { return <StatementPage type="bank"/>; }