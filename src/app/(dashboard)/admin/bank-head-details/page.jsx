"use client";
import { useEffect, useState, useRef, useCallback } from "react";

// ── helpers ───────────────────────────────────────────────────
const fmtINR = n =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n || 0));

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");

function getFiscalYear(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

const FISCAL_OPTIONS = (() => {
  const cur = new Date().getFullYear();
  return [cur - 1, cur, cur + 1].map(y => `${y}-${String(y + 1).slice(-2)}`);
})();

// ── Toast (light) ─────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#e6f7e6" : "#ffe6e6",
          border: `1px solid ${t.type === "success" ? "#2e7d32" : "#c62828"}`,
          color: t.type === "success" ? "#1b5e20" : "#b71c1c",
          padding: "10px 18px", borderRadius: 10, fontSize: 13,
          fontFamily: "'IBM Plex Mono', monospace",
          display: "flex", alignItems: "center", gap: 8, minWidth: 240,
          animation: "ld-in 0.25s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}>
          {t.type === "success" ? "✓" : "✗"} {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Add Entry Modal (light) ───────────────────────────────────
function AddEntryModal({ open, onClose, onSave, accounts }) {
  const emptyLine = () => ({ accountId: "", debit: "", credit: "", narration: "", partyName: "" });
  const [form, setForm] = useState({
    transactionNumber: "", transactionType: "Journal Entry", date: new Date().toISOString().slice(0, 10), lines: [emptyLine(), emptyLine()],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ transactionNumber: "", transactionType: "Journal Entry", date: new Date().toISOString().slice(0, 10), lines: [emptyLine(), emptyLine()] });
  }, [open]);

  const setLine = (i, key, val) => setForm(p => {
    const lines = [...p.lines];
    lines[i] = { ...lines[i], [key]: val };
    return { ...p, lines };
  });

  const addLine    = () => setForm(p => ({ ...p, lines: [...p.lines, emptyLine()] }));
  const removeLine = (i) => setForm(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }));

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async () => {
    if (!balanced) return;
    setSaving(true);
    await onSave({
      ...form,
      entries: form.lines.map(l => ({
        accountId: l.accountId, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
        narration: l.narration, partyName: l.partyName,
      })),
    });
    setSaving(false);
  };

  const TX_TYPES = ["Journal Entry", "Payment", "Receipt", "Invoice", "Credit Note", "Debit Note", "Contra"];

  const labelStyle = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#5f6c80", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 };
  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none", transition: "0.2s" };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 200, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.25s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.95)",
        width: "min(760px, 96vw)", maxHeight: "90vh", overflowY: "auto",
        background: "#ffffff", borderRadius: 20, zIndex: 201, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #eef2f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#0f6bff", textTransform: "uppercase", letterSpacing: 2 }}>Double Entry</div>
            <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontWeight: 700, fontSize: 20, color: "#0f172a", margin: "3px 0 0" }}>Post Ledger Entry</h3>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#64748b", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Transaction No.", key: "transactionNumber", placeholder: "TXN-001" },
              { label: "Date *", key: "date", type: "date" },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type || "text"} value={form[f.key]} placeholder={f.placeholder || ""}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Transaction Type</label>
              <select value={form.transactionType} onChange={e => setForm(p => ({ ...p, transactionType: e.target.value }))} style={inputStyle}>
                {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={labelStyle}>Entries</label>
              <button onClick={addLine} style={{ background: "#eef2ff", border: "1px solid #cbd5e1", color: "#2563eb", padding: "4px 12px", borderRadius: 6, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, cursor: "pointer" }}>+ Add Line</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginBottom: 6 }}>
              {["Account *", "Debit ₹", "Credit ₹", "Narration", "Party", ""].map(h => (
                <div key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 4px" }}>{h}</div>
              ))}
            </div>

            {form.lines.map((line, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginBottom: 6 }}>
                <select value={line.accountId} onChange={e => setLine(i, "accountId", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }}>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <input type="number" placeholder="0" value={line.debit} onChange={e => setLine(i, "debit", e.target.value)} style={{ ...inputStyle, padding: "8px 10px", color: "#2563eb" }} />
                <input type="number" placeholder="0" value={line.credit} onChange={e => setLine(i, "credit", e.target.value)} style={{ ...inputStyle, padding: "8px 10px", color: "#9333ea" }} />
                <input placeholder="Narration" value={line.narration} onChange={e => setLine(i, "narration", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }} />
                <input placeholder="Party" value={line.partyName} onChange={e => setLine(i, "partyName", e.target.value)} style={{ ...inputStyle, padding: "8px 10px" }} />
                <button onClick={() => form.lines.length > 2 && removeLine(i)}
                  style={{ background: "#fee2e2", border: "1px solid #fecaca", color: form.lines.length > 2 ? "#dc2626" : "#cbd5e1", width: 32, height: 36, borderRadius: 6, cursor: form.lines.length > 2 ? "pointer" : "default", fontSize: 14 }}>✕</button>
              </div>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr auto", gap: 6, marginTop: 8, paddingTop: 10, borderTop: "1px solid #eef2f6" }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#64748b", display: "flex", alignItems: "center" }}>Total</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#2563eb", padding: "8px 10px" }}>{fmtINR(totalDebit)}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: "#9333ea", padding: "8px 10px" }}>{fmtINR(totalCredit)}</div>
              <div style={{ gridColumn: "span 3", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: balanced ? "#16a34a" : "#dc2626" }}>
                  {balanced ? "✓ Balanced" : `✗ Diff: ${fmtINR(Math.abs(totalDebit - totalCredit))}`}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#ffffff", color: "#475569", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !balanced}
              style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: balanced ? "linear-gradient(135deg,#2563eb,#0f6bff)" : "#e2e8f0", color: balanced ? "#fff" : "#94a3b8", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, cursor: balanced && !saving ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "ld-spin 0.7s linear infinite" }} /> : "Post Entry"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page (Light theme) ───────────────────────────────────
export default function LedgerPage() {
  const [accounts, setAccounts]     = useState([]);
  const [accountId, setAccountId]   = useState("");
  const [fiscalYear, setFiscalYear] = useState(getFiscalYear());
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [toasts, setToasts]         = useState([]);
  const [page, setPage]             = useState(1);
  const toastId = useRef(0);

  const addToast = (msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    fetch("/api/accounts/heads?init=true", { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAccounts(d.data || []); });
  }, []);

  const fetchLedger = useCallback(async (pg = 1) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/accounts/ledger?accountId=${accountId}&fiscalYear=${fiscalYear}&page=${pg}&limit=50`, { headers: { Authorization: `Bearer ${token()}` } });
      const json = await res.json();
      if (json.success) { setData(json.data); setPage(pg); }
      else addToast(json.message || "Failed to load ledger", "error");
    } catch { addToast("Network error", "error"); }
    finally { setLoading(false); }
  }, [accountId, fiscalYear]);

  useEffect(() => { if (accountId) fetchLedger(1); }, [accountId, fiscalYear]);

  const handleSave = async (form) => {
    try {
      const payload = {
        type: form.transactionType || "Journal Entry",
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        narration: form.narration || "",
        lines: form.entries.map(l => ({
          accountId: l.accountId,
          type: Number(l.debit) > 0 ? "Debit" : "Credit",
          amount: Number(l.debit) || Number(l.credit),
        })),
      };
      const res = await fetch("/api/accounts/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        addToast("Transaction posted successfully ✅");
        setShowModal(false);
        fetchLedger(1);
      } else {
        addToast(json.message || "Failed to post", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Network error", "error");
    }
  };

  const summary = data?.summary;
  const account = data?.account;
  const entries = data?.entries || [];
  const pagination = data?.pagination;
  const pageOpeningBalance = data?.pageOpeningBalance ?? summary?.openingBalance ?? 0;

  const labelStyle = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#5f6c80", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 };
  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none" };
  const tdStyle = { padding: "11px 16px", fontSize: 12, color: "#334155", verticalAlign: "middle", borderBottom: "1px solid #f1f5f9" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Clash+Display:wght@500;600;700&display=swap');
        @keyframes ld-in   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ld-spin  { to{transform:rotate(360deg)} }
        @keyframes ld-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .ld-root * { box-sizing:border-box; }
        .ld-root { min-height:100vh; background:#f8fafc; color:#0f172a; padding:28px 20px 80px; font-family:'IBM Plex Mono',monospace; }
        .ld-row { border-bottom:1px solid #eef2f6; transition:background 0.12s; }
        .ld-row:hover { background:#f1f5f9; }
        .ld-skeleton { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:600px 100%; animation:ld-shimmer 1.4s infinite; border-radius:8px; }
        table { border-collapse:collapse; width:100%; }
        select option { background:#fff; }
      `}</style>

      <Toast toasts={toasts} />
      <AddEntryModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} accounts={accounts} />

      <div className="ld-root">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 14, animation: "ld-in 0.4s ease" }}>
            <div>
              <div style={{ fontSize: 10, color: "#0f6bff", textTransform: "uppercase", letterSpacing: 3, marginBottom: 4 }}>Accounts</div>
              <h1 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 30, fontWeight: 700, color: "#0f172a", margin: 0 }}>Ledger Book</h1>
              {account && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#5f6c80" }}>{account.name} · {account.type} · {account.group}</p>}
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#2563eb,#0f6bff)", border: "none", color: "#fff", padding: "10px 18px", borderRadius: 10, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.3)", transition: "transform 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              + Post Entry
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", animation: "ld-in 0.4s ease 0.05s both" }}>
            <div style={{ flex: "1 1 260px" }}>
              <label style={labelStyle}>Account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...inputStyle, padding: "10px 14px" }}>
                <option value="">— Select Account —</option>
                {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.type})</option>)}
              </select>
            </div>
            <div style={{ flex: "0 1 160px" }}>
              <label style={labelStyle}>Fiscal Year</label>
              <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} style={{ ...inputStyle, padding: "10px 14px" }}>
                {FISCAL_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          </div>

          {/* Summary Cards (Light) */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20, animation: "ld-in 0.4s ease 0.1s both" }}>
              {[
                { label: "Opening Balance", value: summary.openingBalance, color: "#5f6c80" },
                { label: "Total Debit",     value: summary.totalDebit,     color: "#2563eb" },
                { label: "Total Credit",    value: summary.totalCredit,    color: "#9333ea" },
                { label: "Closing Balance", value: summary.closingBalance, color: summary.closingBalance >= 0 ? "#16a34a" : "#dc2626" },
              ].map(c => (
                <div key={c.label} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontSize: 9, color: "#5f6c80", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 600, color: c.color }}>
                    {c.value < 0 ? "−" : ""}{fmtINR(c.value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ledger Table */}
          {!accountId ? (
            <div style={{ padding: "80px 20px", textAlign: "center", background: "#ffffff", borderRadius: 16, border: "1px solid #eef2f6" }}>
              <div style={{ fontSize: 32, marginBottom: 12, color: "#cbd5e1" }}>⊟</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Select an account to view ledger</div>
            </div>
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(6)].map((_, i) => <div key={i} className="ld-skeleton" style={{ height: 48 }} />)}
            </div>
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid #eef2f6", borderRadius: 16, overflow: "hidden", animation: "ld-in 0.4s ease 0.15s both", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #eef2f6", background: "#f8fafc" }}>
                    {["Date", "Txn No.", "Type", "Narration / Party", "Debit", "Credit", "Balance"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: h === "Debit" || h === "Credit" || h === "Balance" ? "right" : "left", fontSize: 9, color: "#5f6c80", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page === 1 && (
                    <tr style={{ borderBottom: "1px solid #eef2f6", background: "#f1f5f9" }}>
                      <td style={tdStyle} colSpan={4}><span style={{ fontSize: 10, color: "#5f6c80" }}>Opening Balance</span></td>
                      <td style={{ ...tdStyle, textAlign: "right" }} />
                      <td style={{ ...tdStyle, textAlign: "right" }} />
                      <td style={{ ...tdStyle, textAlign: "right", color: (summary?.openingBalance || 0) >= 0 ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                        {fmtINR(summary?.openingBalance || 0)}
                      </td>
                    </tr>
                  )}

                  {(() => {
                    let runningBal = pageOpeningBalance;
                    const isAsset = account?.type === "Asset" || account?.type === "Expense";

                    return entries.map((e) => {
                      if (isAsset)
                        runningBal += (Number(e.debit) || 0) - (Number(e.credit) || 0);
                      else
                        runningBal += (Number(e.credit) || 0) - (Number(e.debit) || 0);

                      return (
                        <tr key={e._id} className="ld-row">
                          <td style={tdStyle}>{fmtDate(e.date)}</td>
                          <td style={{ ...tdStyle, color: "#5f6c80" }}>{e.transactionNumber || "—"}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "#f1f5f9", color: "#475569" }}>{e.transactionType}</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 12 }}>{e.narration || "—"}</div>
                            {e.partyName && <div style={{ fontSize: 10, color: "#5f6c80", marginTop: 2 }}>{e.partyName}</div>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: "#2563eb" }}>{e.debit > 0 ? fmtINR(e.debit) : "—"}</td>
                          <td style={{ ...tdStyle, textAlign: "right", color: "#9333ea" }}>{e.credit > 0 ? fmtINR(e.credit) : "—"}</td>
                          <td style={{ ...tdStyle, textAlign: "right", color: runningBal >= 0 ? "#0f172a" : "#dc2626", fontWeight: 600 }}>
                            {fmtINR(runningBal)}
                            <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>
                              {runningBal >= 0 ? (isAsset ? "Dr" : "Cr") : (isAsset ? "Cr" : "Dr")}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {pagination && pagination.pages > 1 && (
                <div style={{ padding: "14px 20px", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                  <span style={{ fontSize: 11, color: "#5f6c80" }}>{pagination.total} entries · Page {page} of {pagination.pages}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={page <= 1} onClick={() => fetchLedger(page - 1)}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: page > 1 ? "#2563eb" : "#cbd5e1", fontSize: 12, cursor: page > 1 ? "pointer" : "default" }}>← Prev</button>
                    <button disabled={page >= pagination.pages} onClick={() => fetchLedger(page + 1)}
                      style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: page < pagination.pages ? "#2563eb" : "#cbd5e1", fontSize: 12, cursor: page < pagination.pages ? "pointer" : "default" }}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}