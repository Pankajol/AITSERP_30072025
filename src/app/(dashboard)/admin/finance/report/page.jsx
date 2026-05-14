"use client";
import { useState, useEffect, useRef } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0a1628":"#1a0a0a",border:`1px solid ${t.type==="success"?"#22c55e55":"#ef444455"}`,color:t.type==="success"?"#22c55e":"#ef4444",padding:"12px 20px",borderRadius:12,fontSize:13,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:10,minWidth:260,animation:"rp-slide 0.3s ease" }}>
          <span>{t.type==="success"?"✦":"✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Trial Balance Table ──────────────────────────────────────
function TrialBalance({ data, totals }) {
  const types = ["Asset","Liability","Equity","Income","Expense"];
  const TYPE_COLOR = { Asset:"#38bdf8",Liability:"#f472b6",Equity:"#a78bfa",Income:"#22c55e",Expense:"#f59e0b" };
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ borderCollapse:"collapse",width:"100%" }}>
        <thead>
          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            {["Code","Account Name","Type","Debit","Credit","Balance"].map(h=>(
              <th key={h} style={{ padding:"11px 16px",textAlign:h==="Debit"||h==="Credit"||h==="Balance"?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map(type => {
            const rows = data.filter(d=>d.type===type);
            if (!rows.length) return null;
            return [
              <tr key={`h-${type}`} style={{ background:`${TYPE_COLOR[type]}08` }}>
                <td colSpan={6} style={{ padding:"8px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:TYPE_COLOR[type],textTransform:"uppercase",letterSpacing:2 }}>{type}</td>
              </tr>,
              ...rows.map(r=>(
                <tr key={r._id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#334155" }}>{r.code||"—"}</td>
                  <td style={{ padding:"10px 16px",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0" }}>{r.accountName}</td>
                  <td style={{ padding:"10px 16px" }}><span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 8px",borderRadius:6,background:`${TYPE_COLOR[type]}18`,color:TYPE_COLOR[type] }}>{type}</span></td>
                  <td style={{ padding:"10px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#94a3b8" }}>{r.totalDebit>0?fmtINR(r.totalDebit):"—"}</td>
                  <td style={{ padding:"10px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#94a3b8" }}>{r.totalCredit>0?fmtINR(r.totalCredit):"—"}</td>
                  <td style={{ padding:"10px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:r.closingBalance>=0?"#22c55e":"#ef4444" }}>{fmtINR(Math.abs(r.closingBalance))}</td>
                </tr>
              )),
            ];
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)" }}>
            <td colSpan={3} style={{ padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9" }}>TOTAL</td>
            <td style={{ padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#38bdf8" }}>{fmtINR(totals?.totalDebit)}</td>
            <td style={{ padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#38bdf8" }}>{fmtINR(totals?.totalCredit)}</td>
            <td style={{ padding:"12px 16px",textAlign:"right" }}>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,padding:"3px 10px",borderRadius:8,background:totals?.isBalanced?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:totals?.isBalanced?"#22c55e":"#ef4444" }}>
                {totals?.isBalanced?"✓ Balanced":"✕ Unbalanced"}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── P&L Table ────────────────────────────────────────────────
function ProfitLoss({ data, totals }) {
  if (!data) return null;
  const { income, expenses } = data;
  const renderGroup = (grouped, color) =>
    Object.entries(grouped).map(([group, { items, total }]) => (
      <div key={group} style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:8,paddingLeft:16 }}>{group}</div>
        {items.map(item=>(
          <div key={item._id} style={{ display:"flex",justifyContent:"space-between",padding:"9px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontSize:14,color:"#e2e8f0" }}>{item.accountName}</span>
            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color,fontWeight:500 }}>{fmtINR(Math.abs(item.closingBalance))}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 16px",background:`${color}08` }}>
          <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#64748b" }}>Total {group}</span>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color }}>{fmtINR(total)}</span>
        </div>
      </div>
    ));

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div style={{ background:"rgba(34,197,94,0.03)",border:"1px solid rgba(34,197,94,0.1)",borderRadius:12,overflow:"hidden" }}>
        <div style={{ padding:"14px 16px",borderBottom:"1px solid rgba(34,197,94,0.1)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#22c55e" }}>↑ Income</div>
        {renderGroup(income?.grouped||{}, "#22c55e")}
        <div style={{ padding:"14px 16px",background:"rgba(34,197,94,0.06)",display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9" }}>Total Income</span>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#22c55e" }}>{fmtINR(totals?.totalIncome)}</span>
        </div>
      </div>
      <div style={{ background:"rgba(245,158,11,0.03)",border:"1px solid rgba(245,158,11,0.1)",borderRadius:12,overflow:"hidden" }}>
        <div style={{ padding:"14px 16px",borderBottom:"1px solid rgba(245,158,11,0.1)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f59e0b" }}>↓ Expenses</div>
        {renderGroup(expenses?.grouped||{}, "#f59e0b")}
        <div style={{ padding:"14px 16px",background:"rgba(245,158,11,0.06)",display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9" }}>Total Expenses</span>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#f59e0b" }}>{fmtINR(totals?.totalExpenses)}</span>
        </div>
      </div>
      <div style={{ gridColumn:"1/-1",background:totals?.isProfit?"rgba(34,197,94,0.06)":"rgba(239,68,68,0.06)",border:`1px solid ${totals?.isProfit?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,borderRadius:12,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9" }}>{totals?.isProfit?"Net Profit ✦":"Net Loss ▼"}</span>
        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:totals?.isProfit?"#22c55e":"#ef4444" }}>{fmtINR(Math.abs(totals?.netProfit||0))}</span>
      </div>
    </div>
  );
}

// ─── Balance Sheet ────────────────────────────────────────────
function BalanceSheet({ data, totals }) {
  if (!data) return null;
  const { assets, liabilities, equity } = data;

  const renderSection = (grouped, color, label) => (
    <div style={{ background:`${color}03`,border:`1px solid ${color}15`,borderRadius:12,overflow:"hidden",marginBottom:12 }}>
      <div style={{ padding:"12px 16px",borderBottom:`1px solid ${color}15`,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color }}>{label}</div>
      {Object.entries(grouped||{}).map(([group,{items,total}])=>(
        <div key={group}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,padding:"8px 16px 4px" }}>{group}</div>
          {items.map(item=>(
            <div key={item._id} style={{ display:"flex",justifyContent:"space-between",padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.02)" }}>
              <span style={{ fontFamily:"'Syne',sans-serif",fontSize:13,color:"#94a3b8" }}>{item.accountName}</span>
              <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color,fontWeight:500 }}>{fmtINR(Math.abs(item.closingBalance))}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>Assets</div>
        {renderSection(assets?.grouped, "#38bdf8", "Assets")}
        <div style={{ padding:"14px 16px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10,display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9" }}>Total Assets</span>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#38bdf8" }}>{fmtINR(totals?.totalAssets)}</span>
        </div>
      </div>
      <div>
        <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>Liabilities + Equity</div>
        {renderSection(liabilities?.grouped, "#f472b6", "Liabilities")}
        {renderSection(equity?.grouped, "#a78bfa", "Equity")}
        {totals?.retainedEarnings!=null&&(
          <div style={{ padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between" }}>
            <span style={{ fontFamily:"'Syne',sans-serif",fontSize:13,color:"#a78bfa" }}>Retained Earnings (Net Profit)</span>
            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa",fontWeight:500 }}>{fmtINR(totals.retainedEarnings)}</span>
          </div>
        )}
        <div style={{ padding:"14px 16px",marginTop:8,background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#f1f5f9" }}>Total L + E</span>
          <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,color:"#a78bfa" }}>{fmtINR((totals?.totalLiabilities||0)+(totals?.totalEquity||0))}</span>
        </div>
      </div>
      <div style={{ gridColumn:"1/-1",textAlign:"center",padding:"12px",background:totals?.balanced?"rgba(34,197,94,0.05)":"rgba(239,68,68,0.05)",border:`1px solid ${totals?.balanced?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,borderRadius:10 }}>
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:totals?.balanced?"#22c55e":"#ef4444" }}>
          {totals?.balanced?"✓ Balance Sheet is Balanced — Assets = Liabilities + Equity":"✕ Unbalanced — Check your entries"}
        </span>
      </div>
    </div>
  );
}

// ─── Ageing Table ─────────────────────────────────────────────
function AgeingTable({ data, buckets, type }) {
  if (!data?.length) return <div style={{ padding:"40px",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155" }}>No outstanding {type.toLowerCase()} invoices</div>;
  const BUCKET_COLORS = { "0-30":"#22c55e","31-60":"#f59e0b","61-90":"#f97316","90+":"#ef4444" };
  return (
    <div>
      {/* Summary */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20 }}>
        {Object.entries(BUCKET_COLORS).map(([b,c])=>(
          <div key={b} style={{ background:`${c}10`,border:`1px solid ${c}30`,borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:c }}>{fmtINR(buckets[b])}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3 }}>{b} days</div>
          </div>
        ))}
        <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9" }}>{fmtINR(buckets.total)}</div>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3 }}>Total</div>
        </div>
      </div>
      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse",width:"100%" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {["Party","Total","0-30","31-60","61-90","90+"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:h==="Party"?"left":"right",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row=>(
              <tr key={row.partyId||row.partyName} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"11px 14px",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,color:"#e2e8f0" }}>{row.partyName}</td>
                <td style={{ padding:"11px 14px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9" }}>{fmtINR(row.total)}</td>
                {["0-30","31-60","61-90","90+"].map(b=>(
                  <td key={b} style={{ padding:"11px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:row[b]>0?BUCKET_COLORS[b]:"#334155" }}>
                    {row[b]>0?fmtINR(row[b]):"—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Ledger Statement ─────────────────────────────────────────
function LedgerStatement({ data }) {
  if (!data) return null;
  const { account, entries, summary } = data;
  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
        {[["Opening Balance",summary?.openingBalance,"#64748b"],["Total Debit",summary?.totalDebit,"#38bdf8"],["Total Credit",summary?.totalCredit,"#a78bfa"],["Closing Balance",summary?.closingBalance,"#22c55e"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`${c}10`,border:`1px solid ${c}25`,borderRadius:10,padding:"14px",textAlign:"center" }}>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:c }}>{fmtINR(v)}</div>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse",width:"100%" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {["Date","Narration","Ref","Debit","Credit","Balance"].map(h=>(
                <th key={h} style={{ padding:"10px 14px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries?.map(e=>(
              <tr key={e._id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}
                onMouseEnter={ev=>ev.currentTarget.style.background="rgba(255,255,255,0.02)"}
                onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{ padding:"10px 14px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b",whiteSpace:"nowrap" }}>{new Date(e.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                <td style={{ padding:"10px 14px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0" }}>{e.narration||"—"}</td>
                <td style={{ padding:"10px 14px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569" }}>{e.transactionId?.transactionNumber||"—"}</td>
                <td style={{ padding:"10px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8" }}>{e.debit>0?fmtINR(e.debit):"—"}</td>
                <td style={{ padding:"10px 14px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa" }}>{e.credit>0?fmtINR(e.credit):"—"}</td>
                <td style={{ padding:"10px 14px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:e.balance>=0?"#22c55e":"#ef4444" }}>{fmtINR(Math.abs(e.balance))}</td>
              </tr>
            ))}
            {!entries?.length&&<tr><td colSpan={6} style={{ padding:"40px",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155" }}>No entries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Reports Page ─────────────────────────────────────────
export default function ReportsPage() {
  const token = ()=>typeof window!=="undefined"?localStorage.getItem("token")||"":"";
  const [activeReport, setActiveReport] = useState("trial-balance");
  const [fiscalYear, setFiscalYear]     = useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [reportData, setReportData]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [toasts, setToasts]             = useState([]);
  const [accounts, setAccounts]         = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const toastId = useRef(0);

  const addToast = (msg, type="success")=>{
    const id=++toastId.current;
    setToasts(p=>[...p,{id,message:msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  const REPORTS = [
    { id:"trial-balance",  label:"Trial Balance",    icon:"⊞", url:"/api/accounts/reports/trial-balance" },
    { id:"profit-loss",    label:"Profit & Loss",    icon:"↕", url:"/api/accounts/reports/profit-loss" },
    { id:"balance-sheet",  label:"Balance Sheet",    icon:"◈", url:"/api/accounts/reports/balance-sheet" },
    { id:"ledger",         label:"General Ledger",   icon:"≡", url:"/api/accounts/ledger" },
    { id:"ageing-customer",label:"Customer Ageing",  icon:"👤",url:"/api/accounts/reports/ageing/customer" },
    { id:"ageing-supplier",label:"Supplier Ageing",  icon:"🏭",url:"/api/accounts/reports/ageing/supplier" },
  ];

  useEffect(()=>{
    fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}})
      .then(r=>r.json()).then(d=>{ if(d.success) setAccounts(d.data||[]); });
  },[]);

  const loadReport = async () => {
    setLoading(true); setReportData(null);
    try {
      const rpt = REPORTS.find(r=>r.id===activeReport);
      let url   = rpt.url;
      if (activeReport==="ledger") {
        if (!selectedAccount) { addToast("Please select an account","error"); setLoading(false); return; }
        url = `${url}/${selectedAccount}?fiscalYear=${fiscalYear}`;
      } else {
        url = `${url}?fiscalYear=${fiscalYear}`;
      }
      const res  = await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
      const data = await res.json();
      if (data.success) setReportData(data);
      else addToast(data.message||"Failed to load report","error");
    } catch { addToast("Failed to load report","error"); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadReport(); },[activeReport, fiscalYear, selectedAccount]);

  const currentReport = REPORTS.find(r=>r.id===activeReport);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes rp-slide { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rp-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rp-spin { to{transform:rotate(360deg)} }
        @keyframes rp-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .rp-page * { box-sizing:border-box; }
        .rp-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .rp-tab { padding:9px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:12px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:7px; white-space:nowrap; }
        .rp-tab:hover { border-color:rgba(255,255,255,0.2); color:#94a3b8; }
        .rp-tab.active { background:rgba(99,102,241,0.12); border-color:#6366f155; color:#818cf8; }
        .rp-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:rp-shimmer 1.4s infinite; border-radius:8px; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts} />

      <div className="rp-page">
        <div style={{ maxWidth:1200,margin:"0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom:28,animation:"rp-fadeUp 0.4s ease" }}>
            <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>Accounts</div>
            <h1 style={{ fontSize:32,fontWeight:800,color:"#f8fafc",margin:0 }}>Financial Reports</h1>
            <p style={{ margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569" }}>Trial Balance · P&L · Balance Sheet · Ageing · Ledger</p>
          </div>

          {/* Controls */}
          <div style={{ display:"flex",gap:10,marginBottom:20,alignItems:"center",flexWrap:"wrap",animation:"rp-fadeUp 0.4s ease 0.05s both" }}>
            {/* Report tabs */}
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {REPORTS.map(r=>(
                <button key={r.id} className={`rp-tab${activeReport===r.id?" active":""}`} onClick={()=>setActiveReport(r.id)}>
                  <span>{r.icon}</span>{r.label}
                </button>
              ))}
            </div>
            {/* Fiscal year */}
            <select value={fiscalYear} onChange={e=>setFiscalYear(e.target.value)}
              style={{ padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",colorScheme:"dark",marginLeft:"auto" }}>
              {[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}
            </select>
            {/* Account selector for ledger */}
            {activeReport==="ledger"&&(
              <select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)}
                style={{ padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:selectedAccount?"#e2e8f0":"#475569",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none",colorScheme:"dark",minWidth:200 }}>
                <option value="">-- Select Account --</option>
                {accounts.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            )}
          </div>

          {/* Report card */}
          <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,overflow:"hidden",animation:"rp-fadeUp 0.5s ease 0.1s both" }}>
            {/* Card header */}
            <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#f1f5f9",margin:0 }}>
                  {currentReport?.icon} {currentReport?.label}
                </h2>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",marginTop:3 }}>FY {fiscalYear}</div>
              </div>
              <button onClick={loadReport} disabled={loading}
                style={{ padding:"8px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6 }}>
                {loading?<span style={{ width:14,height:14,border:"2px solid rgba(129,140,248,0.3)",borderTopColor:"#818cf8",borderRadius:"50%",display:"inline-block",animation:"rp-spin 0.7s linear infinite" }} />:"↻"} Refresh
              </button>
            </div>

            {/* Report body */}
            <div style={{ padding:"20px" }}>
              {loading ? (
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {[1,2,3,4,5].map(i=><div key={i} className="rp-skeleton" style={{height:44}} />)}
                </div>
              ) : !reportData ? (
                <div style={{ padding:"60px",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155" }}>Select a report and fiscal year to load data</div>
              ) : (
                <>
                  {activeReport==="trial-balance"  && <TrialBalance  data={reportData.data}  totals={reportData.totals} />}
                  {activeReport==="profit-loss"    && <ProfitLoss    data={reportData.data}  totals={reportData.totals} />}
                  {activeReport==="balance-sheet"  && <BalanceSheet  data={reportData.data}  totals={reportData.totals} />}
                  {activeReport==="ledger"         && <LedgerStatement data={reportData} />}
                  {(activeReport==="ageing-customer"||activeReport==="ageing-supplier") && <AgeingTable data={reportData.data} buckets={reportData.buckets} type={activeReport==="ageing-customer"?"Customer":"Supplier"} />}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}