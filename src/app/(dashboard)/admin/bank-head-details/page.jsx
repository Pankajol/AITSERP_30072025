// "use client";
// import { useEffect, useState, useMemo, useRef, useCallback } from "react";

// // ── helpers ───────────────────────────────────────────────────
// const fmtINR = n =>
//   new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n || 0));

// const fmtDate = d =>
//   d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");

// function getFiscalYear(date = new Date()) {
//   const d = new Date(date);
//   const y = d.getFullYear();
//   const m = d.getMonth();
//   return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
// }

// const FISCAL_OPTIONS = (() => {
//   const cur = new Date().getFullYear();
//   return [cur - 1, cur, cur + 1].map(y => `${y}-${String(y + 1).slice(-2)}`);
// })();

// // ── Toast ─────────────────────────────────────────────────────
// function Toast({ toasts }) {
//   return (
//     <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
//       {toasts.map(t => (
//         <div key={t.id} style={{
//           background: t.type === "success" ? "#071a0e" : "#1a0707",
//           border: `1px solid ${t.type === "success" ? "#22c55e44" : "#ef444444"}`,
//           color: t.type === "success" ? "#4ade80" : "#f87171",
//           padding: "10px 18px", borderRadius: 10, fontSize: 13,
//           fontFamily: "'IBM Plex Mono', monospace",
//           display: "flex", alignItems: "center", gap: 8, minWidth: 240,
//           animation: "ld-in 0.25s ease",
//         }}>
//           {t.type === "success" ? "✓" : "✗"} {t.message}
//         </div>
//       ))}
//     </div>
//   );
// }

// // ── Add Entry Modal ───────────────────────────────────────────
// function AddEntryModal({ open, onClose, onSave, accounts }) {
//   const emptyLine = () => ({ accountId: "", debit: "", credit: "", narration: "", partyName: "" });
//   const [form, setForm] = useState({
//     transactionNumber: "", transactionType: "Journal Entry", date: new Date().toISOString().slice(0, 10), lines: [emptyLine(), emptyLine()],
//   });
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (open) setForm({ transactionNumber: "", transactionType: "Journal Entry", date: new Date().toISOString().slice(0, 10), lines: [emptyLine(), emptyLine()] });
//   }, [open]);

//   const setLine = (i, key, val) => setForm(p => {
//     const lines = [...p.lines];
//     lines[i] = { ...lines[i], [key]: val };
//     return { ...p, lines };
//   });

//   const addLine    = () => setForm(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
//   const removeLine = (i) => setForm(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }));

//   const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
//   const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
//   const balanced    = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

//   const handleSubmit = async () => {
//     if (!balanced) return;
//     setSaving(true);
//     await onSave({
//       ...form,
//       entries: form.lines.map(l => ({
//         accountId: l.accountId, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
//         narration: l.narration, partyName: l.partyName,
//       })),
//     });
//     setSaving(false);
//   };

//   const TX_TYPES = ["Journal Entry", "Payment", "Receipt", "Invoice", "Credit Note", "Debit Note", "Contra"];

//   return (
//     <>
//       <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 200, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.25s" }} />
//       <div style={{
//         position: "fixed", top: "50%", left: "50%",
//         transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.95)",
//         width: "min(760px, 96vw)", maxHeight: "90vh", overflowY: "auto",
//         background: "#080f1a", border: "1px solid rgba(255,255,255,0.08)",
//         borderRadius: 20, zIndex: 201, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
//         transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 32px 100px rgba(0,0,0,0.8)",
//       }}>
//         {/* Header */}
//         <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <div>
//             <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#3b5a8a", textTransform: "uppercase", letterSpacing: 2 }}>Double Entry</div>
//             <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, fontSize: 20, color: "#e2e8f0", margin: "3px 0 0" }}>Post Ledger Entry</h3>
//           </div>
//           <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#64748b", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
//         </div>

//         <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
//           {/* Meta row */}
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
//             {[
//               { label: "Transaction No.", key: "transactionNumber", placeholder: "TXN-001" },
//               { label: "Date *", key: "date", type: "date" },
//             ].map(f => (
//               <div key={f.key}>
//                 <label style={labelStyle}>{f.label}</label>
//                 <input type={f.type || "text"} value={form[f.key]} placeholder={f.placeholder || ""}
//                   onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
//                   style={inputStyle} />
//               </div>
//             ))}
//             <div>
//               <label style={labelStyle}>Transaction Type</label>
//               <select value={form.transactionType} onChange={e => setForm(p => ({ ...p, transactionType: e.target.value }))} style={inputStyle}>
//                 {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
//               </select>
//             </div>
//           </div>

//           {/* Lines */}
//           <div>
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
//               <label style={labelStyle}>Entries</label>
//               <button onClick={addLine} style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8", padding: "4px 12px", borderRadius: 6, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, cursor: "pointer" }}>+ Add Line</button>
//             </div>

//             {/* Column headers */}
//             <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginBottom: 6 }}>
//               {["Account *", "Debit ₹", "Credit ₹", "Narration", "Party", ""].map(h => (
//                 <div key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 4px" }}>{h}</div>
//               ))}
//             </div>

//             {form.lines.map((line, i) => (
//               <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginBottom: 6 }}>
//                 <select value={line.accountId} onChange={e => setLine(i, "accountId", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }}>
//                   <option value="">Select account</option>
//                   {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
//                 </select>
//                 <input type="number" placeholder="0" value={line.debit} onChange={e => setLine(i, "debit", e.target.value)} style={{ ...inputStyle, padding: "8px 10px", color: "#38bdf8" }} />
//                 <input type="number" placeholder="0" value={line.credit} onChange={e => setLine(i, "credit", e.target.value)} style={{ ...inputStyle, padding: "8px 10px", color: "#a78bfa" }} />
//                 <input placeholder="Narration" value={line.narration} onChange={e => setLine(i, "narration", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }} />
//                 <input placeholder="Party" value={line.partyName} onChange={e => setLine(i, "partyName", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }} />
//                 <button onClick={() => form.lines.length > 2 && removeLine(i)}
//                   style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: form.lines.length > 2 ? "#ef4444" : "#1e293b", width: 32, height: 36, borderRadius: 6, cursor: form.lines.length > 2 ? "pointer" : "default", fontSize: 14 }}>✕</button>
//               </div>
//             ))}

//             {/* Totals */}
//             <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
//               <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#475569", display: "flex", alignItems: "center" }}>Total</div>
//               <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#38bdf8", padding: "8px 10px" }}>{fmtINR(totalDebit)}</div>
//               <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#a78bfa", padding: "8px 10px" }}>{fmtINR(totalCredit)}</div>
//               <div style={{ gridColumn: "span 3", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
//                 <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: balanced ? "#4ade80" : "#f87171" }}>
//                   {balanced ? "✓ Balanced" : `✗ Diff: ${fmtINR(Math.abs(totalDebit - totalCredit))}`}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Actions */}
//           <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
//             <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#64748b", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, cursor: "pointer" }}>Cancel</button>
//             <button onClick={handleSubmit} disabled={saving || !balanced}
//               style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: balanced ? "linear-gradient(135deg,#0f4c8a,#1d6fd8)" : "rgba(255,255,255,0.04)", color: balanced ? "#fff" : "#334155", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, cursor: balanced && !saving ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
//               {saving ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "ld-spin 0.7s linear infinite" }} /> : "Post Entry"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// const labelStyle = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 };
// const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none", colorScheme: "dark" };

// // ── Main Page ─────────────────────────────────────────────────
// export default function LedgerPage() {
//   const [accounts, setAccounts]     = useState([]);
//   const [accountId, setAccountId]   = useState("");
//   const [fiscalYear, setFiscalYear] = useState(getFiscalYear());
//   const [data, setData]             = useState(null);
//   const [loading, setLoading]       = useState(false);
//   const [showModal, setShowModal]   = useState(false);
//   const [toasts, setToasts]         = useState([]);
//   const [page, setPage]             = useState(1);
//   const toastId = useRef(0);

//   const addToast = (msg, type = "success") => {
//     const id = ++toastId.current;
//     setToasts(p => [...p, { id, message: msg, type }]);
//     setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
//   };

//   // Load account list
//   useEffect(() => {
//     fetch("/api/accounts/heads?init=true", { headers: { Authorization: `Bearer ${token()}` } })
//       .then(r => r.json())
//       .then(d => { if (d.success) setAccounts(d.data || []); });
//   }, []);

//   const fetchLedger = useCallback(async (pg = 1) => {
//     if (!accountId) return;
//     setLoading(true);
//     try {
//       const res  = await fetch(`/api/accounts/ledger?accountId=${accountId}&fiscalYear=${fiscalYear}&page=${pg}&limit=50`, { headers: { Authorization: `Bearer ${token()}` } });
//       const json = await res.json();
//       if (json.success) { setData(json.data); setPage(pg); }
//       else addToast(json.message || "Failed to load ledger", "error");
//     } catch { addToast("Network error", "error"); }
//     finally { setLoading(false); }
//   }, [accountId, fiscalYear]);

//   useEffect(() => { if (accountId) fetchLedger(1); }, [accountId, fiscalYear]);

//   const handleSave = async (form) => {
//   try {
//     // ✅ Convert form → API payload (IMPORTANT 🔥)
//     const payload = {
//       type: form.transactionType || "Journal Entry",

//       date: form.date
//         ? new Date(form.date).toISOString()
//         : new Date().toISOString(),

//       narration: form.narration || "",

//       // ✅ Convert lines properly
//       lines: form.entries.map(l => ({
//         accountId: l.accountId,
//         type: Number(l.debit) > 0 ? "Debit" : "Credit",
//         amount: Number(l.debit) || Number(l.credit),
//       })),
//     };

//     // 🔥 DEBUG (must keep for now)
//     console.log("TRANSACTION PAYLOAD:", payload);

//     const res = await fetch("/api/accounts/transactions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token()}`,
//       },
//       body: JSON.stringify(payload),
//     });

//     const json = await res.json();

//     if (json.success) {
//       addToast("Transaction posted successfully ✅");

//       setShowModal(false);

//       // ✅ refresh ledger
//       fetchLedger(1);

//     } else {
//       console.error("API ERROR:", json);
//       addToast(json.message || "Failed to post", "error");
//     }

//   } catch (err) {
//     console.error("NETWORK ERROR:", err);
//     addToast("Network error", "error");
//   }
// };

// // ✅ Step 1: Frontend par total calculate karein agar backend se 0 aa raha ho


//   const summary = data?.summary;
//   const account = data?.account;
//   const entries = data?.entries || [];
//   const pagination = data?.pagination;

//   // Running balance display
//   let runningBal = summary?.openingBalance || 0;
//   const calculatedSummary = useMemo(() => {
//   const opening = Number(data?.summary?.openingBalance) || 0;
  
//   // Entries ka total nikalne ke liye
//   const totalDr = entries.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
//   const totalCr = entries.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  
//   // Account type ke hisab se closing balance (Asset vs Liability)
//   const isAsset = account?.type === "Asset" || account?.type === "Expense";
//   const closing = isAsset 
//     ? (opening + totalDr - totalCr) 
//     : (opening + totalCr - totalDr);

//   return {
//     openingBalance: opening,
//     totalDebit: totalDr,
//     totalCredit: totalCr,
//     closingBalance: closing
//   };
// }, [entries, data?.summary, account]);

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Clash+Display:wght@500;600;700&display=swap');
//         @keyframes ld-in   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
//         @keyframes ld-spin  { to{transform:rotate(360deg)} }
//         @keyframes ld-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
//         .ld-root * { box-sizing:border-box; }
//         .ld-root { min-height:100vh; background:#050c18; color:#e2e8f0; padding:28px 20px 80px; font-family:'IBM Plex Mono',monospace; }
//         .ld-row { border-bottom:1px solid rgba(255,255,255,0.035); transition:background 0.12s; }
//         .ld-row:hover { background:rgba(255,255,255,0.02); }
//         .ld-skeleton { background:linear-gradient(90deg,#0d1829 25%,#1a2c42 50%,#0d1829 75%); background-size:600px 100%; animation:ld-shimmer 1.4s infinite; border-radius:8px; }
//         table { border-collapse:collapse; width:100%; }
//         select option { background:#0d1829; }
//       `}</style>

//       <Toast toasts={toasts} />
//       <AddEntryModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} accounts={accounts} />

//       <div className="ld-root">
//         <div style={{ maxWidth: 1100, margin: "0 auto" }}>

//           {/* ── Header ── */}
//           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 14, animation: "ld-in 0.4s ease" }}>
//             <div>
//               <div style={{ fontSize: 10, color: "#1e3a5a", textTransform: "uppercase", letterSpacing: 3, marginBottom: 4 }}>Accounts</div>
//               <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 30, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Ledger Book</h1>
//               {account && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#334155" }}>{account.name} · {account.type} · {account.group}</p>}
//             </div>
//             <button onClick={() => setShowModal(true)}
//               style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#0f3d7a,#1a6dd8)", border: "none", color: "#fff", padding: "10px 18px", borderRadius: 10, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, cursor: "pointer", boxShadow: "0 4px 20px rgba(26,109,216,0.3)", transition: "transform 0.2s" }}
//               onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
//               onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
//               + Post Entry
//             </button>
//           </div>

//             {/* ── Filters ── */}
//             <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", animation: "ld-in 0.4s ease 0.05s both" }}>
//               <div style={{ flex: "1 1 260px" }}>
//                 <label style={labelStyle}>Account</label>
//                 <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, padding: "10px 14px" }}>
//                   <option value="">— Select Account —</option>
//                   {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.type})</option>)}
//                 </select>
//               </div>
//               <div style={{ flex: "0 1 160px" }}>
//                 <label style={labelStyle}>Fiscal Year</label>
//                 <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} style={{ ...inputStyle, padding: "10px 14px" }}>
//                   {FISCAL_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
//                 </select>
//               </div>
//             </div>

//           {/* ── Summary Cards ── */}
//         {/* ── Summary Cards ── */}
// {calculatedSummary && (
//   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20, animation: "ld-in 0.4s ease 0.1s both" }}>
//     {[
//       { label: "Opening Balance", value: calculatedSummary.openingBalance, color: "#64748b" },
//       { label: "Total Debit",     value: calculatedSummary.totalDebit,     color: "#38bdf8" },
//       { label: "Total Credit",    value: calculatedSummary.totalCredit,    color: "#a78bfa" },
//       { label: "Closing Balance", value: calculatedSummary.closingBalance, color: calculatedSummary.closingBalance >= 0 ? "#4ade80" : "#f87171" },
//     ].map(c => (
//       <div key={c.label} style={{ background: "#0a1628", border: `1px solid ${c.color}22`, borderRadius: 14, padding: "14px 18px" }}>
//         <div style={{ fontSize: 9, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{c.label}</div>
//         <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 600, color: c.color }}>
//           {/* Minus sign logic fix */}
//           {c.value < 0 ? "−" : ""}{fmtINR(c.value)}
//         </div>
//       </div>
//     ))}
//   </div>
// )}

//           {/* ── Ledger Table ── */}
//           {!accountId ? (
//             <div style={{ padding: "80px 20px", textAlign: "center", background: "#0a1628", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
//               <div style={{ fontSize: 32, marginBottom: 12, color: "#1e3a5a" }}>⊟</div>
//               <div style={{ fontSize: 12, color: "#1e3a5a" }}>Select an account to view ledger</div>
//             </div>
//           ) : loading ? (
//             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//               {[...Array(6)].map((_, i) => <div key={i} className="ld-skeleton" style={{ height: 48 }} />)}
//             </div>
//           ) : (
//             <div style={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden", animation: "ld-in 0.4s ease 0.15s both" }}>
//               <table>
//                 <thead>
//                   <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
//                     {["Date", "Txn No.", "Type", "Narration / Party", "Debit", "Credit", "Balance"].map(h => (
//                       <th key={h} style={{ padding: "12px 16px", textAlign: h === "Debit" || h === "Credit" || h === "Balance" ? "right" : "left", fontSize: 9, color: "#1e3a5a", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
               
// <tbody>
//   {/* Opening Balance Row (Same rahegi) */}
//   <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(30,58,90,0.15)" }}>
//     <td style={tdStyle} colSpan={4}><span style={{ fontSize: 10, color: "#334155" }}>Opening Balance</span></td>
//     <td style={{ ...tdStyle, textAlign: "right" }} />
//     <td style={{ ...tdStyle, textAlign: "right" }} />
//     <td style={{ ...tdStyle, textAlign: "right", color: (summary?.openingBalance || 0) >= 0 ? "#4ade80" : "#f87171", fontWeight: 500 }}>
//       {fmtINR(summary?.openingBalance || 0)}
//     </td>
//   </tr>

//   {/* entries.map ka Naya Logic 👇 */}
//   {(() => {
//     let currentBal = Number(summary?.openingBalance) || 0;
//     const isAsset = account?.type === "Asset" || account?.type === "Expense";

//     return entries.map((e) => {
//       // Logic: Asset mein Debit (+) aur Credit (-) hota hai
//       // Liability/Income mein Credit (+) aur Debit (-) hota hai
//       if (isAsset) {
//         currentBal += (Number(e.debit) || 0) - (Number(e.credit) || 0);
//       } else {
//         currentBal += (Number(e.credit) || 0) - (Number(e.debit) || 0);
//       }

//       return (
//         <tr key={e._id} className="ld-row">
//           <td style={tdStyle}>{fmtDate(e.date)}</td>
//           <td style={{ ...tdStyle, color: "#334155" }}>{e.transactionNumber || "—"}</td>
//           <td style={tdStyle}>
//             <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{e.transactionType}</span>
//           </td>
//           <td style={tdStyle}>
//             <div style={{ fontSize: 12 }}>{e.narration || "—"}</div>
//             {e.partyName && <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{e.partyName}</div>}
//           </td>
//           <td style={{ ...tdStyle, textAlign: "right", color: "#38bdf8" }}>{e.debit > 0 ? fmtINR(e.debit) : "—"}</td>
//           <td style={{ ...tdStyle, textAlign: "right", color: "#a78bfa" }}>{e.credit > 0 ? fmtINR(e.credit) : "—"}</td>
//           <td style={{ ...tdStyle, textAlign: "right", color: currentBal >= 0 ? "#e2e8f0" : "#f87171", fontWeight: 600 }}>
//             {fmtINR(currentBal)}
//             <span style={{ fontSize: 9, color: "#334155", marginLeft: 4 }}>
//               {currentBal >= 0 ? (isAsset ? "Dr" : "Cr") : (isAsset ? "Cr" : "Dr")}
//             </span>
//           </td>
//         </tr>
//       );
//     });
//   })()}
// </tbody>
//               </table>

//               {/* Pagination */}
//               {pagination && pagination.pages > 1 && (
//                 <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//                   <span style={{ fontSize: 11, color: "#334155" }}>{pagination.total} entries · Page {page} of {pagination.pages}</span>
//                   <div style={{ display: "flex", gap: 8 }}>
//                     <button disabled={page <= 1} onClick={() => fetchLedger(page - 1)}
//                       style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: page > 1 ? "#64748b" : "#1e293b", fontSize: 12, cursor: page > 1 ? "pointer" : "default" }}>← Prev</button>
//                     <button disabled={page >= pagination.pages} onClick={() => fetchLedger(page + 1)}
//                       style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: page < pagination.pages ? "#64748b" : "#1e293b", fontSize: 12, cursor: page < pagination.pages ? "pointer" : "default" }}>Next →</button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// const tdStyle = { padding: "11px 16px", fontSize: 12, color: "#94a3b8", verticalAlign: "middle" };


"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaCheck,
  FaExclamationCircle, FaArrowLeft, FaUniversity
} from "react-icons/fa";
import { toast } from "react-toastify";

const EMPTY = { accountCode: "", accountName: "", isActualBank: false, accountHead: "", status: "" };

export default function BankHeadPage() {
  const [view,         setView]         = useState("list");
  const [bankHeads,    setBankHeads]    = useState([]);
  const [accountHeads, setAccountHeads] = useState([]);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [fd,           setFd]           = useState({ ...EMPTY }); // fd = formData
  const [errs,         setErrs]         = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [bankRes, headRes] = await Promise.all([
        axios.get("/api/bank-head",    { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/accounts/heads", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBankHeads(bankRes.data.data    || []);
      setAccountHeads(headRes.data.data || []);
    } catch { toast.error("Error fetching data"); }
    setLoading(false);
  };

  const validate = () => {
    const e = {};
    if (!fd.accountCode?.trim()) e.accountCode = "Account Code is required";
    if (!fd.accountName?.trim()) e.accountName = "Account Name is required";
    if (!fd.accountHead)         e.accountHead = "Account Head is required";
    if (!fd.status)              e.status      = "Status is required";
    setErrs(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return false; }
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFd(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (errs[name]) setErrs(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      if (editId) {
        const res = await axios.put(`/api/bank-head/${editId}`, fd, { headers: { Authorization: `Bearer ${token}` } });
        setBankHeads(p => p.map(b => b._id === editId ? res.data.data : b));
        toast.success("Bank Head updated!");
      } else {
        const res = await axios.post("/api/bank-head", fd, { headers: { Authorization: `Bearer ${token}` } });
        setBankHeads(p => [...p, res.data.data]);
        toast.success("Bank Head created!");
      }
      reset();
    } catch { toast.error("Error saving data"); }
    setSaving(false);
  };

  const handleEdit = (item) => {
    setFd({ ...item });
    setEditId(item._id);
    setErrs({});
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this bank head?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/bank-head/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setBankHeads(p => p.filter(b => b._id !== id));
      toast.success("Deleted successfully");
    } catch { toast.error("Error deleting"); }
  };

  const reset = () => { setFd({ ...EMPTY }); setEditId(null); setErrs({}); setView("list"); };

  const filtered = bankHeads.filter(b =>
    b.accountCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountHead?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total:    bankHeads.length,
    actual:   bankHeads.filter(b => b.isActualBank).length,
    active:   bankHeads.filter(b => b.status === "Active").length,
    inactive: bankHeads.filter(b => b.status === "Inactive").length,
  };

  // ── UI helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k]
       ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300"
       : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">General Ledger</h1>
            <p className="text-sm text-gray-400 mt-0.5">{bankHeads.length} total bank heads</p>
          </div>
          <button
            onClick={() => { reset(); setView("form"); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaPlus className="text-xs" /> Add General Ledger
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",        value: stats.total,    emoji: "🏦" },
            { label: "Actual Banks", value: stats.actual,   emoji: "🏛️" },
            { label: "Active",       value: stats.active,   emoji: "✅" },
            { label: "Inactive",     value: stats.inactive, emoji: "⛔" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 border-2 border-transparent shadow-sm hover:-translate-y-0.5 hover:border-indigo-100 transition-all cursor-default">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by code, name or head…"
              />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Code", "Account Name", "Account Head", "Actual Bank", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">🏦</div>
                    <p className="text-sm font-medium text-gray-300">
                      {searchTerm ? "No bank heads match your search" : "No bank heads yet — add your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(b => (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* Avatar */}
                    <td className="px-4 py-3 w-12">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-indigo-100">
                        {(b.accountName || "?")[0].toUpperCase()}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {b.accountCode}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{b.accountName}</p>
                    </td>

                    {/* Account Head */}
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                      {b.accountHead || <span className="text-gray-200">—</span>}
                    </td>

                    {/* Actual Bank */}
                    <td className="px-4 py-3">
                      {b.isActualBank
                        ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">✓ Yes</span>
                        : <span className="text-gray-300 text-xs">No</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${b.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {b.status || "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(b)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(b._id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ════════════════════════════════════════
  // ── FORM VIEW ──
  // ════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Bank Heads
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {editId ? "Edit Bank Head" : "New Bank Head"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {editId ? "Update the bank head details below" : "Fill in the details to add a new bank head"}
        </p>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">

          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <FaUniversity className="text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Bank Head Details</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>

          <div className="space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Account Code" req />
                <input className={fi("accountCode")} name="accountCode" type="text"
                  value={fd.accountCode} onChange={handleChange} placeholder="e.g. BNK001" />
                <Err k="accountCode" />
              </div>
              <div>
                <Lbl text="Account Name" req />
                <input className={fi("accountName")} name="accountName" type="text"
                  value={fd.accountName} onChange={handleChange} placeholder="e.g. HDFC Current Account" />
                <Err k="accountName" />
              </div>
            </div>

            <div>
              <Lbl text="Account Head" req />
              <select className={fi("accountHead")} name="accountHead" value={fd.accountHead} onChange={handleChange}>
                <option value="">Select Account Head…</option>
                {accountHeads.map(h => (
                  <option key={h._id} value={h.accountHeadCode}>
                    {h.name} — {h.code}
                  </option>
                ))}
              </select>
              <Err k="accountHead" />
            </div>

            <div>
              <Lbl text="Status" req />
              <select className={fi("status")} name="status" value={fd.status} onChange={handleChange}>
                <option value="">Select Status…</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <Err k="status" />
            </div>

            {/* Is Actual Bank toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFd(p => ({ ...p, isActualBank: !p.isActualBank }))}
                className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${fd.isActualBank ? "bg-indigo-500" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${fd.isActualBank ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-700">Is Actual Bank?</p>
                <p className="text-xs text-gray-400">Enable if this is a real bank account (not a ledger head)</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaArrowLeft className="text-xs" /> Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><FaCheck className="text-xs" /> {editId ? "Update Bank Head" : "Create Bank Head"}</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}


// "use client";
// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const BankHeadDetails = () => {
//   const [accountHeads, setAccountHeads] = useState([]);
//   const [formData, setFormData] = useState({
//     accountCode: "",
//     accountName: "",
//     accountHead: "", // Use "accountHead" consistently
//     status: "",
//   });

//   useEffect(() => {
//     // Fetch account heads from the API
//     const fetchAccountHeads = async () => {
//       try {
//         const response = await fetch("/api/account-head"); // Adjust the API endpoint as needed
//         if (!response.ok) {
//           throw new Error("Failed to fetch account heads");
//         }
//         const data = await response.json();
//         console.log("Fetched account heads:", data);
//         setAccountHeads(data.data);
//       } catch (error) {
//         console.error("Error fetching account heads:", error);
//       }
//     };

//     fetchAccountHeads();
//   }, []);

//   const validateForm = () => {
//     if (!formData.accountCode.trim()) {
//       toast.error("Account Code is required");
//       return false;
//     }
//     if (!formData.accountName.trim()) {
//       toast.error("Account Name is required");
//       return false;
//     }
//     if (!formData.accountHead) {
//       toast.error("Please select an Account Head From");
//       return false;
//     }
//     if (!formData.status) {
//       toast.error("Please select a status");
//       return false;
//     }
//     return true;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/bank-head", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok && result.success) {
//         toast.success("Bank head details submitted successfully!");
//         setFormData({
//           accountCode: "",
//           accountName: "",
//           accountHead: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting bank head details");
//       }
//     } catch (error) {
//       console.error("Error submitting bank head details:", error);
//       toast.error("Error submitting bank head details");
//     }
//   };

//   const handleClear = () => {
//     setFormData({
//       accountCode: "",
//       accountName: "",
//       accountHead: "",
//       status: "",
//     });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Code</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Code
//           </label>
//           <input
//             type="text"
//             name="accountCode"
//             value={formData.accountCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account code"
//           />
//         </div>
//         {/* Account Name */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Name
//           </label>
//           <input
//             type="text"
//             name="accountName"
//             value={formData.accountName}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account name"
//           />
//         </div>
//         {/* Account Head From (Selectable) */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head From
//           </label>
//           <select
//             name="accountHead"  // Changed from accountHeadFrom to accountHead
//             value={formData.accountHead}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Account Head From</option>
//             {accountHeads.map((option, index) => (
//               <option key={option.accountHeadCode || index} value={option.accountHeadCode}>
//                 {option.accountHeadCode} - {option.accountHeadDescription}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Status
//           </label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Status</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             type="submit"
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Submit
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Clear
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default BankHeadDetails;
