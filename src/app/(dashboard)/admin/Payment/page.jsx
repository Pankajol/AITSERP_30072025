
"use client";
import { useEffect, useState, useRef, useMemo } from "react";

const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:10 }}>
      {toasts.map(t=>(
        <div key={t.id} style={{ background:t.type==="success"?"#0a1628":"#1a0a0a",border:`1px solid ${t.type==="success"?"#22c55e55":"#ef444455"}`,color:t.type==="success"?"#22c55e":"#ef4444",padding:"12px 20px",borderRadius:12,fontSize:13,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:10,minWidth:260,animation:"pe-slide 0.3s ease" }}>
          <span>{t.type==="success"?"✦":"✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

const TYPE_CFG = {
  Payment: { color:"#ef4444", bg:"rgba(239,68,68,0.1)",  icon:"↓", label:"Payment (Money Out)" },
  Receipt: { color:"#22c55e", bg:"rgba(34,197,94,0.1)",  icon:"↑", label:"Receipt (Money In)"  },
};

const PAYMENT_MODES = ["Cash","Bank Transfer","Cheque","UPI","Card","Other"];

const INPUT_STYLE = { width:"100%",padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none" };

export default function PaymentEntryPage() {
  const token = ()=>typeof window!=="undefined"?localStorage.getItem("token")||"":"";
  const [accounts, setAccounts]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [toasts, setToasts]       = useState([]);
  const [tab, setTab]             = useState("list");
  const [filterType, setFilterType] = useState("All");
  const toastId = useRef(0);

  const [form, setForm] = useState({
    type:           "Payment",
    date:           new Date().toISOString().slice(0,10),
    amount:         "",
    bankAccountId:  "",
    partyAccountId: "",
    partyType:      "Supplier",
    partyName:      "",
    paymentMode:    "Bank Transfer",
    narration:      "",
    chequeNumber:   "",
    utrNumber:      "",
    referenceNumber:"",
  });

  const addToast = (msg, type="success") => {
    const id=++toastId.current;
    setToasts(p=>[...p,{id,message:msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500);
  };

  useEffect(()=>{ fetchAccounts(); fetchPayments(); },[]);

  const fetchAccounts = async () => {
    const res  = await fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}});
    const data = await res.json();
    if (data.success) setAccounts(data.data||[]);
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [pRes,rRes] = await Promise.all([
        fetch("/api/accounts/payment?type=Payment",{headers:{Authorization:`Bearer ${token()}`}}),
        fetch("/api/accounts/payment?type=Receipt",{headers:{Authorization:`Bearer ${token()}`}}),
      ]);
      const [p,r] = await Promise.all([pRes.json(),rRes.json()]);
      setPayments([...(p.data||[]),...(r.data||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)));
    } catch { addToast("Failed to load","error"); }
    finally { setLoading(false); }
  };

  const bankAccounts    = accounts.filter(a=>a.group==="Current Asset"&&(a.name.toLowerCase().includes("bank")||a.name.toLowerCase().includes("cash")));
  const payableAccounts = accounts.filter(a=>a.group==="Current Liability"||a.group==="Current Asset");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount||Number(form.amount)<=0) { addToast("Amount must be greater than 0","error"); return; }
    if (!form.bankAccountId)  { addToast("Select a bank/cash account","error"); return; }
    if (!form.partyAccountId) { addToast("Select a party account","error"); return; }
    setSaving(true);
    try {
      const res  = await fetch("/api/accounts/payment",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},
        body: JSON.stringify({ ...form, amount:Number(form.amount) }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`${form.type} entry posted successfully`);
        setForm({ type:"Payment",date:new Date().toISOString().slice(0,10),amount:"",bankAccountId:"",partyAccountId:"",partyType:"Supplier",partyName:"",paymentMode:"Bank Transfer",narration:"",chequeNumber:"",utrNumber:"",referenceNumber:"" });
        setTab("list"); fetchPayments();
      } else addToast(data.message||"Failed","error");
    } catch { addToast("Failed to save","error"); }
    finally { setSaving(false); }
  };

  const typeCfg = TYPE_CFG[form.type];
  const filtered = useMemo(()=>payments.filter(p=>filterType==="All"||p.type===filterType),[payments,filterType]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes pe-slide { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pe-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pe-spin { to{transform:rotate(360deg)} }
        @keyframes pe-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .pe-page * { box-sizing:border-box; }
        .pe-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .pe-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:pe-shimmer 1.4s infinite; border-radius:8px; }
        .pe-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .pe-row:hover { background:rgba(255,255,255,0.025); }
        .pe-tab { padding:9px 20px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:12px; cursor:pointer; transition:all 0.2s; }
        .pe-tab.active { background:rgba(99,102,241,0.12); border-color:#6366f155; color:#818cf8; }
        .pe-filter { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .pe-filter.active { background:rgba(99,102,241,0.1); border-color:#6366f155; color:#818cf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>
      <Toast toasts={toasts} />

      <div className="pe-page">
        <div style={{ maxWidth:1000,margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28,flexWrap:"wrap",gap:16,animation:"pe-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4 }}>Accounts</div>
              <h1 style={{ fontSize:32,fontWeight:800,color:"#f8fafc",margin:0 }}>Payment Entry</h1>
              <p style={{ margin:"6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#475569" }}>Record payments & receipts</p>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button className={`pe-tab${tab==="list"?" active":""}`} onClick={()=>setTab("list")}>≡ All Entries</button>
              <button className={`pe-tab${tab==="new"?" active":""}`} onClick={()=>setTab("new")}
                style={{ background:tab==="new"?"linear-gradient(135deg,#1d4ed8,#3b82f6)":"transparent",color:tab==="new"?"#fff":"#64748b",border:tab==="new"?"none":"1px solid rgba(255,255,255,0.08)" }}>
                + New Entry
              </button>
            </div>
          </div>

          {/* ── NEW ENTRY FORM ── */}
          {tab==="new" && (
            <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"28px",marginBottom:20,animation:"pe-fadeUp 0.4s ease" }}>
              <form onSubmit={handleSubmit}>

                {/* Type toggle */}
                <div style={{ marginBottom:22 }}>
                  <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:10 }}>Type *</label>
                  <div style={{ display:"flex",gap:10 }}>
                    {Object.entries(TYPE_CFG).map(([t,c])=>(
                      <button type="button" key={t} onClick={()=>setForm(p=>({...p,type:t,partyType:t==="Payment"?"Supplier":"Customer"}))}
                        style={{ flex:1,padding:"14px",borderRadius:12,border:`1px solid ${form.type===t?c.color:"rgba(255,255,255,0.07)"}`,background:form.type===t?c.bg:"transparent",color:form.type===t?c.color:"#475569",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                        <span style={{fontSize:22}}>{c.icon}</span>{c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Date *</label>
                    <input type="date" required value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{ ...INPUT_STYLE,colorScheme:"dark" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Amount ₹ *</label>
                    <input type="number" min="1" required value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0"
                      style={{ ...INPUT_STYLE,border:`1px solid ${typeCfg.color}33`,fontSize:16,fontWeight:700 }} />
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Bank / Cash Account *</label>
                    <select required value={form.bankAccountId} onChange={e=>setForm(p=>({...p,bankAccountId:e.target.value}))} style={{ ...INPUT_STYLE,colorScheme:"dark" }}>
                      <option value="">-- Select Bank/Cash --</option>
                      {bankAccounts.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
                      {bankAccounts.length===0&&accounts.filter(a=>a.type==="Asset").map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>
                      {form.type==="Payment"?"Payable Account *":"Receivable Account *"}
                    </label>
                    <select required value={form.partyAccountId} onChange={e=>setForm(p=>({...p,partyAccountId:e.target.value}))} style={{ ...INPUT_STYLE,colorScheme:"dark" }}>
                      <option value="">-- Select Account --</option>
                      {accounts.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Party Name</label>
                    <input value={form.partyName} onChange={e=>setForm(p=>({...p,partyName:e.target.value}))} placeholder="Customer / Supplier name" style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Payment Mode</label>
                    <select value={form.paymentMode} onChange={e=>setForm(p=>({...p,paymentMode:e.target.value}))} style={{ ...INPUT_STYLE,colorScheme:"dark" }}>
                      {PAYMENT_MODES.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {form.paymentMode==="Cheque"&&(
                    <div>
                      <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Cheque No.</label>
                      <input value={form.chequeNumber} onChange={e=>setForm(p=>({...p,chequeNumber:e.target.value}))} placeholder="e.g. 123456" style={INPUT_STYLE} />
                    </div>
                  )}
                  {form.paymentMode==="Bank Transfer"&&(
                    <div>
                      <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>UTR / Ref No.</label>
                      <input value={form.utrNumber} onChange={e=>setForm(p=>({...p,utrNumber:e.target.value}))} placeholder="e.g. UTR123456789" style={INPUT_STYLE} />
                    </div>
                  )}
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:7 }}>Narration</label>
                    <input value={form.narration} onChange={e=>setForm(p=>({...p,narration:e.target.value}))} placeholder={`e.g. ${form.type==="Payment"?"Payment to supplier for Invoice #123":"Received from customer against Invoice #456"}`} style={INPUT_STYLE} />
                  </div>
                </div>

                {/* Entry preview */}
                {form.amount>0&&form.bankAccountId&&form.partyAccountId&&(
                  <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"14px 16px",marginBottom:20 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>Entry Preview</div>
                    {(form.type==="Payment"
                      ?[{t:"Debit",a:accounts.find(a=>a._id===form.partyAccountId)?.name,c:"#38bdf8"},{t:"Credit",a:accounts.find(a=>a._id===form.bankAccountId)?.name,c:"#a78bfa"}]
                      :[{t:"Debit",a:accounts.find(a=>a._id===form.bankAccountId)?.name,c:"#38bdf8"},{t:"Credit",a:accounts.find(a=>a._id===form.partyAccountId)?.name,c:"#a78bfa"}]
                    ).map((row,i)=>(
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i===0?"1px solid rgba(255,255,255,0.04)":"none" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:13,color:row.c }}>{row.t}: {row.a||"—"}</span>
                        <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:row.c }}>{fmtINR(Number(form.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
                  <button type="button" onClick={()=>setTab("list")} style={{ padding:"11px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving}
                    style={{ padding:"11px 28px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${typeCfg.color}cc,${typeCfg.color})`,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,display:"flex",alignItems:"center",gap:8 }}>
                    {saving?<span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"pe-spin 0.7s linear infinite" }} />:`${typeCfg.icon} Post ${form.type}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── LIST ── */}
          {tab==="list" && (
            <div style={{ background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,overflow:"hidden",animation:"pe-fadeUp 0.4s ease 0.05s both" }}>
              <div style={{ padding:"18px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
                <div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:"#f1f5f9",margin:0 }}>Payment & Receipt Entries</h2>
                  <div style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",marginTop:3 }}>{filtered.length} entries</div>
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  {["All","Payment","Receipt"].map(f=>(
                    <button key={f} className={`pe-filter${filterType===f?" active":""}`} onClick={()=>setFilterType(f)}>{f}</button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
                  {[1,2,3].map(i=><div key={i} className="pe-skeleton" style={{height:52}} />)}
                </div>
              ) : filtered.length===0 ? (
                <div style={{padding:"60px 20px",textAlign:"center"}}>
                  <div style={{fontSize:36,marginBottom:12}}>◎</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No entries yet</div>
                </div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table>
                    <thead>
                      <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        {["Ref No","Date","Type","Party","Mode","Amount","Status"].map(h=>(
                          <th key={h} style={{padding:"11px 16px",textAlign:h==="Amount"?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p,i)=>{
                        const cfg=TYPE_CFG[p.type]||TYPE_CFG.Payment;
                        return (
                          <tr key={p._id} className="pe-row" style={{animation:`pe-fadeUp 0.4s ease ${i*0.04}s both`}}>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#38bdf8"}}>{p.transactionNumber}</td>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b"}}>{new Date(p.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                            <td style={{padding:"12px 16px"}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}33`}}>{cfg.icon} {p.type}</span>
                            </td>
                            <td style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0"}}>{p.partyName||"—"}</td>
                            <td style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#475569"}}>{p.paymentMode||"—"}</td>
                            <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:cfg.color}}>{fmtINR(p.totalAmount)}</td>
                            <td style={{padding:"12px 16px"}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"2px 9px",borderRadius:20,background:p.status==="Posted"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:p.status==="Posted"?"#22c55e":"#ef4444"}}>
                                {p.status==="Posted"?"✓ Posted":"✕ Cancelled"}
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
  

//   "use client";
//   import React, { useState, useEffect } from "react";
//   import { toast, ToastContainer } from "react-toastify";
//   import "react-toastify/dist/ReactToastify.css";

//   import CustomerSearch from "@/components/CustomerSearch";
//   import SupplierSearch from "@/components/SupplierSearch";
//   import BankComponent from "@/components/BankComponent";

//   // Helper to generate a unique key for an invoice.
//   const getInvoiceKey = (invoice, index) => {
//     return invoice._id ? invoice._id : index;
//   };

//   const InvoiceRow = ({
//     invoice,
//     invoiceKey,
//     isSelected,
//     onSelect,
//     currentAmount,
//     onAmountChange,
//   }) => {
//     // Use remainingAmount from backend (fallback to computed value if undefined)
//     const defaultEditableValue =
//       invoice.remainingAmount !== undefined
//         ? invoice.remainingAmount
//         : invoice.grandTotal - (invoice.paidAmount || 0);
//     // Compute new remaining amount based on entered amount.
//     const newRemaining =
//       isSelected && currentAmount !== undefined
//         ? defaultEditableValue - Number(currentAmount)
//         : defaultEditableValue;
//     return (
//       <tr key={invoiceKey}>
//         <td className="px-4 py-2 text-center">
//           <input
//             type="checkbox"
//             onChange={() => onSelect(invoiceKey, defaultEditableValue)}
//             checked={isSelected}
//             className="form-checkbox h-5 w-5 text-blue-600"
//           />
//         </td>
//         <td className="px-4 py-2">{invoice.refNumber}</td>
//         <td className="px-4 py-2">
//           {new Date(invoice.orderDate).toLocaleDateString()}
//         </td>
//         <td className="px-4 py-2">${invoice.grandTotal}</td>
//         <td className="px-4 py-2">${defaultEditableValue}</td>
//         <td className="px-4 py-2">
//           <input
//             type="number"
//             value={currentAmount ?? defaultEditableValue}
//             onChange={(e) =>
//               onAmountChange(invoiceKey, e.target.value, defaultEditableValue)
//             }
//             disabled={!isSelected}
//             className="w-full p-1 border rounded-md text-sm"
//           />
//         </td>
//         <td className="px-4 py-2">${newRemaining}</td>
//       </tr>
//     );
//   };

//   const PaymentForm = () => {
//     const initialFormData = {
//       paymentType: "", // "Incoming" or "Outgoing"
//       code: "",
//       customerVendor: "",
//       name: "",
//       postDate: "",
//       modeOfPayment: "",
//       bankName: "",
//       ledgerAccount: "",
//       paidTo: "",
//       paymentDate: "",
//       remarks: "",
//       selectedInvoices: [],
//     };

//     const [purchaseInvoices, setPurchaseInvoices] = useState([]);
//     const [salesInvoices, setSalesInvoices] = useState([]);
//     const [formData, setFormData] = useState(initialFormData);
//     const [invoiceAmounts, setInvoiceAmounts] = useState({});

//     // Render Customer or Supplier search based on payment type.
//     const renderMasterComponent = () => {
//       if (formData.paymentType === "Incoming") {
//         return (
//           <CustomerSearch
//             onSelectCustomer={(selectedMaster) => {
//               setFormData((prev) => ({
//                 ...prev,
//                 code: selectedMaster.customerCode,
//                 customerVendor: selectedMaster.customerName,
//               }));
//             }}
//           />
//         );
//       } else if (formData.paymentType === "Outgoing") {
//         return (
//           <SupplierSearch
//             onSelectSupplier={(selectedMaster) => {
//               setFormData((prev) => ({
//                 ...prev,
//                 code: selectedMaster.supplierCode,
//                 customerVendor: selectedMaster.supplierName,
//               }));
//             }}
//           />
//         );
//       }
//       return null;
//     };

//     // Fetch invoices when code and payment type change.
//     useEffect(() => {
//       if (!formData.code || !formData.paymentType) return;
//       const token = localStorage.getItem("token");

//       const fetchInvoices = async () => {
//         try {
//           if (formData.paymentType === "Outgoing" ) {
//             const response = await fetch(
//               `/api/purchaseInvoice?supplierCode=${formData.code}` ,
//                 {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   }
//             );
//             if (response.status === 404) {
//               setPurchaseInvoices([]);
//             } else {
//               const json = await response.json();
//               console.log("JSON Response:", json);
//               const invoiceData = json.data;
//               console.log("Invoice Data:", invoiceData);
//               setPurchaseInvoices(Array.isArray(invoiceData) ? invoiceData : []);
//             }
//           } else if (formData.paymentType === "Incoming") {
//          const response = await fetch(
//   `/api/sales-invoice?customerCode=${formData.code}`,
//   {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   }
// );

//             if (response.status === 404) {
//               setSalesInvoices([]);
//             } else {

//               const json = await response.json();
//               console.log("JSON Response:", json);
//               const invoiceData = json.data;
//               console.log("Invoice Data:", invoiceData);

//              setSalesInvoices(Array.isArray(invoiceData) ? invoiceData : []);
//               console.log("Sales Invoices:", invoiceData);
//             }
//           }
//         } catch (error) {
//           console.error("Error fetching invoices:", error);
//         }
//       };

//       fetchInvoices();
//     }, [formData.code, formData.paymentType]);

//     console.log("Fetching invoices for code:", formData.code, "type:", formData.paymentType);


//     // Filter invoices to show only those that are not fully paid.
//     // Using remainingAmount from backend.
//     const displayedInvoices =
//       formData.paymentType === "Incoming"
//         ? Array.isArray(salesInvoices)
//           ? salesInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//           : []
//         : formData.paymentType === "Outgoing"
//         ? Array.isArray(purchaseInvoices)
//           ? purchaseInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//           : []
//         : [];

//     const handleInputChange = (e) => {
//       const { name, value } = e.target;
//       if (name === "paymentType") {
//         setFormData((prev) => ({
//           ...prev,
//           paymentType: value,
//           code: "",
//           customerVendor: "",
//           selectedInvoices: [],
//         }));
//         setPurchaseInvoices([]);
//         setSalesInvoices([]);
//         setInvoiceAmounts({});
//       } else {
//         setFormData((prev) => ({ ...prev, [name]: value }));
//       }
//     };

//     const handleCheckboxChange = (invoiceKey, invoiceDefaultValue) => {
//       const { selectedInvoices } = formData;
//       let newSelected;
//       if (selectedInvoices.includes(invoiceKey)) {
//         newSelected = selectedInvoices.filter((key) => key !== invoiceKey);
//       } else {
//         if (invoiceAmounts[invoiceKey] === undefined) {
//           setInvoiceAmounts((prev) => ({
//             ...prev,
//             [invoiceKey]: invoiceDefaultValue,
//           }));
//         }
//         newSelected = [...selectedInvoices, invoiceKey];
//       }
//       setFormData((prev) => ({
//         ...prev,
//         selectedInvoices: newSelected,
//       }));
//     };

//     const handleInvoiceAmountChange = (invoiceKey, newAmount, invoiceDefaultValue) => {
//       const numericValue = Number(newAmount);
//       if (numericValue > Number(invoiceDefaultValue)) {
//         toast.error(`Amount cannot exceed ${invoiceDefaultValue}`);
//         return;
//       }
//       setInvoiceAmounts((prev) => ({
//         ...prev,
//         [invoiceKey]: newAmount,
//       }));
//     };

//     const totalSelectedAmount = displayedInvoices.reduce((acc, invoice, index) => {
//       const invoiceKey = getInvoiceKey(invoice, index);
//       if (formData.selectedInvoices.includes(invoiceKey)) {
//         const defaultEditableValue = invoice.remainingAmount !== undefined
//           ? invoice.remainingAmount
//           : invoice.grandTotal - (invoice.paidAmount || 0);
//         const amount =
//           invoiceAmounts[invoiceKey] !== undefined
//             ? Number(invoiceAmounts[invoiceKey])
//             : Number(defaultEditableValue);
//         return acc + amount;
//       }
//       return acc;
//     }, 0);

//     const validateForm = () => {
//       if (!formData.paymentType) {
//         toast.error("Please select a payment type");
//         return false;
//       }
//       if (!formData.customerVendor) {
//         toast.error("Please select a customer or supplier");
//         return false;
//       }
//       if (formData.selectedInvoices.length === 0) {
//         toast.error("Please select at least one invoice");
//         return false;
//       }
//       return true;
//     };

//     const handleSubmit = async () => {
//       const token = localStorage.getItem("token");
//       if (!validateForm()) return;
//       const invoiceModel =
//         formData.paymentType === "Incoming" ? "SalesInvoice" : "PurchaseInvoice";
//       const references = formData.selectedInvoices.map((invoiceId) => ({
//         invoiceId,
//         model: invoiceModel,
//         paidAmount: Number(invoiceAmounts[invoiceId] ?? 0),
//       }));

//       const submissionData = {
//         paymentType: formData.paymentType === "Incoming" ? "Customer" : "Supplier",
//         code: formData.code,
//         customerVendor: formData.customerVendor,
//         postDate: formData.postDate,
//         paymentDate: formData.paymentDate,
//         modeOfPayment: formData.modeOfPayment,
//         bankName: formData.bankName,
//         ledgerAccount: formData.ledgerAccount,
//         paidTo: formData.paidTo,
//         remarks: formData.remarks,
//         amount: totalSelectedAmount,
//         references,
//       };

//       try {
//         const res = await fetch("/api/payment", {
//           method: "POST",
//           headers: { "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//            },
//           body: JSON.stringify(submissionData),
//         });
//         const result = await res.json();
//         if (res.ok) {
//           toast.success(result.message || "Payment submitted successfully!");
//           // Clear the form after successful submission.
//           setFormData(initialFormData);
//           setInvoiceAmounts({});
//         } else {
//           toast.error(result.message || "Payment submission failed.");
//         }
//       } catch (err) {
//         toast.error("Network error during payment submission.");
//         console.error(err);
//       }
//     };

//     const handleClose = () => {
//       console.log("Form closed");
//       toast.info("Form closed");
//     };

//     return (
//       <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
//         <ToastContainer />
//         <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Form</h2>
//         <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
//           <h3 className="text-lg font-semibold text-gray-800 mb-2">
//             Purchase & Sales Payment Details
//           </h3>
//         </div>
//         <div className="space-y-4">
//           {/* Payment Type */}
//           <div className="grid grid-cols-1 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">
//                 Payment Type (Incoming / Outgoing)
//               </label>
//               <select
//                 name="paymentType"
//                 value={formData.paymentType}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               >
//                 <option value="">Select Payment Type</option>
//                 <option value="Incoming">Incoming</option>
//                 <option value="Outgoing">Outgoing</option>
//               </select>
//             </div>
//           </div>
//           {/* Render Customer or Supplier Selection */}
//           {formData.paymentType && renderMasterComponent()}
//           {/* Auto-filled Code and Customer/Supplier Name */}
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Code</label>
//               <input
//                 type="text"
//                 name="code"
//                 value={formData.code}
//                 readOnly
//                 className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//                 placeholder="Auto-filled code"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">
//                 {formData.paymentType === "Incoming" ? "Customer Name" : "Supplier Name"}
//               </label>
//               <input
//                 type="text"
//                 name="customerVendor"
//                 value={formData.customerVendor}
//                 readOnly
//                 className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//                 placeholder="Auto-filled name"
//               />
//             </div>
//           </div>
//           {/* Additional Dates and Payment Details */}
//           <div className="grid grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Post Date</label>
//               <input
//                 type="date"
//                 name="postDate"
//                 value={formData.postDate}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Payment Date</label>
//               <input
//                 type="date"
//                 name="paymentDate"
//                 value={formData.paymentDate}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Mode of Payment</label>
//               <select
//                 name="modeOfPayment"
//                 value={formData.modeOfPayment}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               >
//                 <option value="">Select Mode</option>
//                 <option value="Cash">Cash</option>
//                 <option value="Bank">Bank</option>
//                 <option value="NEFT">NEFT</option>
//                 <option value="RTGS">RTGS</option>
//                 <option value="Cheque">Cheque</option>
//               </select>
//             </div>
//           </div>
//           {/* Additional Payment Details using BankComponent */}
//           <div className="grid grid-cols-3 gap-4">
//             <BankComponent bankName={formData.bankName} onChange={handleInputChange} />
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Ledger Account</label>
//               <input
//                 type="text"
//                 name="ledgerAccount"
//                 value={formData.ledgerAccount}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 placeholder="Enter ledger account"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Paid To (Cheque/Reference)</label>
//               <input
//                 type="text"
//                 name="paidTo"
//                 value={formData.paidTo}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 placeholder="Enter cheque/reference"
//               />
//             </div>
//           </div>
//           {/* Invoice Table with Multiple Selection */}
//           {formData.paymentType && (
//             <div>
//               <h3 className="text-md font-medium text-gray-800 mb-2">
//                 {formData.paymentType === "Incoming"
//                   ? "Select Sales Invoices"
//                   : "Select Purchase Invoices"}
//               </h3>
//               {formData.code ? (
//                 displayedInvoices.length > 0 ? (
//                   <table className="w-full text-sm text-left text-gray-700 border-collapse">
//                     <thead className="bg-gray-100 border-b">
//                       <tr>
//                         <th className="px-4 py-2">Select</th>
//                         <th className="px-4 py-2">Invoice Number</th>
//                         <th className="px-4 py-2">Invoice Date</th>
//                         <th className="px-4 py-2">Invoice Amount</th>
//                         <th className="px-4 py-2">Remaining Amount</th>
//                         <th className="px-4 py-2">Editable Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {displayedInvoices.map((invoice, index) => {
//                         const invoiceKey = getInvoiceKey(invoice, index);
//                         // Use remainingAmount from the DB as the default editable value.
//                         const defaultEditableValue =
//                           invoice.remainingAmount !== undefined
//                             ? invoice.remainingAmount
//                             : invoice.grandTotal - (invoice.paidAmount || 0);
//                         const currentAmount =
//                           invoiceAmounts[invoiceKey] !== undefined
//                             ? invoiceAmounts[invoiceKey]
//                             : defaultEditableValue;
//                         return (
//                           <InvoiceRow
//                             key={invoiceKey}
//                             invoice={invoice}
//                             invoiceKey={invoiceKey}
//                             isSelected={formData.selectedInvoices.includes(invoiceKey)}
//                             onSelect={handleCheckboxChange}
//                             currentAmount={currentAmount}
//                             onAmountChange={handleInvoiceAmountChange}
//                           />
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 ) : (
//                   <p className="text-sm text-gray-500">No invoices available.</p>
//                 )
//               ) : (
//                 <p className="text-sm text-gray-500">
//                   Please select a customer or supplier to view invoices.
//                 </p>
//               )}
//             </div>
//           )}
//           {/* Total Amount to Pay */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Amount to Pay</label>
//             <input
//               type="number"
//               name="amountToPay"
//               value={totalSelectedAmount}
//               readOnly
//               className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//               placeholder="Amount to pay"
//             />
//           </div>
//           {/* Form Buttons */}
//           <div className="flex justify-end space-x-4">
//             <button
//               onClick={handleSubmit}
//               className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//             >
//               Add
//             </button>
//             <button
//               onClick={handleClose}
//               className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//         <ToastContainer />
//       </div>
//     );
//   };

//   export default PaymentForm;