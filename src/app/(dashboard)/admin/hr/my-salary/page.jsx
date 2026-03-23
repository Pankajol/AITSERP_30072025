"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";

// ─── Toast ────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#0a1628" : "#1a0a0a",
          border: `1px solid ${t.type === "success" ? "#22c55e55" : "#ef444455"}`,
          color: t.type === "success" ? "#22c55e" : "#ef4444",
          padding: "12px 20px", borderRadius: 12, fontSize: 13,
          fontFamily: "'DM Mono', monospace",
          boxShadow: `0 8px 32px ${t.type === "success" ? "#22c55e22" : "#ef444422"}`,
          animation: "sl-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✦" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(slip) {
  if (slip?.month && slip?.year) return `${MONTHS[slip.month - 1]} ${slip.year}`;
  if (slip?.date) {
    const d = new Date(slip.date);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return "—";
}

// ─── Ring Progress ────────────────────────────────────────────
function Ring({ pct, color, size = 100, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub, delay }) {
  return (
    <div style={{
      background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px",
      animation: `sl-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155", marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Breakdown Bar ────────────────────────────────────────────
function BreakdownBar({ label, amount, total, color, delay }) {
  const pct = total ? Math.min((amount / total) * 100, 100) : 0;
  return (
    <div style={{ animation: `sl-fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color, fontWeight: 500 }}>{fmtINR(amount)}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Slip Row ─────────────────────────────────────────────────
function SlipRow({ slip, index, onSelect, isActive }) {
  const status = slip.status || "Paid";
  const statusCfg = {
    Paid:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: "✓" },
    Pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "◷" },
    Hold:    { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "⏸" },
  }[status] || { color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "○" };

  return (
    <tr onClick={() => onSelect(slip)}
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
        background: isActive ? "rgba(59,130,246,0.06)" : "transparent",
        transition: "background 0.15s",
        animation: `sl-fadeUp 0.4s ease ${index * 0.04}s both`,
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <td style={{ padding: "14px 20px" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{monthLabel(slip)}</div>
        {slip.presentDays != null && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 2 }}>{slip.presentDays} days worked</div>
        )}
      </td>
      <td style={{ padding: "14px 12px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8" }}>
        {fmtINR(slip.grossPay || slip.basicSalary)}
      </td>
      <td style={{ padding: "14px 12px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#ef4444" }}>
        -{fmtINR(slip.totalDeductions)}
      </td>
      <td style={{ padding: "14px 12px" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#22c55e" }}>
          {fmtINR(slip.netPay)}
        </span>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <span style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}33`, fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>
          {statusCfg.icon} {status}
        </span>
      </td>
      <td style={{ padding: "14px 16px", color: "#334155", fontSize: 12 }}>
        {isActive ? "▲" : "▶"}
      </td>
    </tr>
  );
}

// ─── Payslip Detail Panel ─────────────────────────────────────
function PayslipPanel({ slip, onClose, onDownload }) {
  if (!slip) return null;

  const earnings = [
    { label: "Basic Salary",    amount: slip.basicSalary,     color: "#38bdf8" },
    { label: "HRA",             amount: slip.hra,              color: "#a78bfa" },
    { label: "DA",              amount: slip.da,               color: "#34d399" },
    { label: "Special Allowance", amount: slip.specialAllowance, color: "#fbbf24" },
    { label: "Bonus",           amount: slip.bonus,            color: "#f472b6" },
    { label: "Overtime",        amount: slip.overtime,         color: "#fb923c" },
  ].filter(e => e.amount > 0);

  const deductions = [
    { label: "PF (Employee)",   amount: slip.pfEmployee,       color: "#ef4444" },
    { label: "PF (Employer)",   amount: slip.pfEmployer,       color: "#f97316" },
    { label: "ESI",             amount: slip.esi,              color: "#ef4444" },
    { label: "TDS",             amount: slip.tds,              color: "#ef4444" },
    { label: "Other Deductions",amount: slip.otherDeductions,  color: "#f87171" },
  ].filter(d => d.amount > 0);

  const grossPay = slip.grossPay || earnings.reduce((s, e) => s + e.amount, 0);
  const totalDed = slip.totalDeductions || deductions.reduce((s, d) => s + d.amount, 0);
  const netPct   = grossPay ? Math.round((slip.netPay / grossPay) * 100) : 0;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 95vw)",
        background: "#0a0f1e", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 101, overflowY: "auto", padding: "28px 24px",
        animation: "sl-slideIn 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>Payslip</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "4px 0 0" }}>{monthLabel(slip)}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onDownload} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#38bdf8", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              ↓ Download
            </button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 34, height: 34, borderRadius: 10, cursor: "pointer" }}>✕</button>
          </div>
        </div>

        {/* Net pay ring */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            <Ring pct={netPct} color="#22c55e" size={90} stroke={7} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#22c55e", fontWeight: 500 }}>{netPct}%</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>Net Take Home</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#22c55e", margin: "4px 0" }}>{fmtINR(slip.netPay)}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155" }}>Gross: {fmtINR(grossPay)} · Deductions: {fmtINR(totalDed)}</div>
          </div>
        </div>

        {/* Attendance */}
        {(slip.presentDays != null || slip.totalDays != null) && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", gap: 24 }}>
            {[["Working Days", slip.totalDays, "#475569"],["Present", slip.presentDays, "#22c55e"],["Absent", (slip.totalDays - slip.presentDays) || 0, "#ef4444"],["LOP Days", slip.lopDays || 0, "#f59e0b"]].map(([l, v, c]) => v != null && (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Earnings */}
        {earnings.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Earnings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {earnings.map((e, i) => <BreakdownBar key={e.label} label={e.label} amount={e.amount} total={grossPay} color={e.color} delay={i * 0.04} />)}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Total Earnings</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{fmtINR(grossPay)}</span>
            </div>
          </div>
        )}

        {/* Deductions */}
        {deductions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Deductions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deductions.map((d, i) => <BreakdownBar key={d.label} label={d.label} amount={d.amount} total={grossPay} color={d.color} delay={i * 0.04} />)}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Total Deductions</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#ef4444", fontWeight: 500 }}>-{fmtINR(totalDed)}</span>
            </div>
          </div>
        )}

        {/* Net pay line */}
        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>Net Pay</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "#22c55e" }}>{fmtINR(slip.netPay)}</span>
        </div>

        {slip.remarks && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f59e0b", marginBottom: 4 }}>REMARKS</div>
            <div style={{ fontSize: 13, color: "#fbbf24" }}>{slip.remarks}</div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function MySalaryPage() {
  const [slips, setSlips]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [toasts, setToasts]     = useState([]);
  const [ytdData, setYtdData]   = useState({ grossPay: 0, totalDeductions: 0, netPay: 0 });
  const toastId = useRef(0);

  const addToast = (msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => { fetchSalary(); }, []);

  const fetchSalary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/hr/my-salary", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        const data = res.data.data || [];
        setSlips(data);
        // YTD calculation
        const ytd = data.reduce((acc, s) => ({
          grossPay:        acc.grossPay        + (s.grossPay        || s.basicSalary || 0),
          totalDeductions: acc.totalDeductions + (s.totalDeductions || 0),
          netPay:          acc.netPay          + (s.netPay          || 0),
        }), { grossPay: 0, totalDeductions: 0, netPay: 0 });
        setYtdData(ytd);
        if (data.length > 0) setSelected(data[0]);
      }
    } catch (err) {
      addToast("Failed to load salary data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!selected) return;
    // Print/PDF — opens browser print dialog for the slip
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Payslip - ${monthLabel(selected)}</title>
      <style>
        body { font-family: monospace; padding: 32px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .net { font-size: 18px; font-weight: bold; color: #16a34a; }
        .right { text-align: right; }
      </style></head><body>
      <h1>Salary Slip — ${monthLabel(selected)}</h1>
      <div class="sub">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <table>
        <tr><th>Component</th><th class="right">Amount (₹)</th></tr>
        <tr><td>Basic Salary</td><td class="right">${(selected.basicSalary || 0).toLocaleString("en-IN")}</td></tr>
        ${selected.hra        ? `<tr><td>HRA</td><td class="right">${selected.hra.toLocaleString("en-IN")}</td></tr>` : ""}
        ${selected.da         ? `<tr><td>DA</td><td class="right">${selected.da.toLocaleString("en-IN")}</td></tr>` : ""}
        ${selected.bonus      ? `<tr><td>Bonus</td><td class="right">${selected.bonus.toLocaleString("en-IN")}</td></tr>` : ""}
        <tr><td><b>Gross Pay</b></td><td class="right"><b>${(selected.grossPay || selected.basicSalary || 0).toLocaleString("en-IN")}</b></td></tr>
        ${selected.pfEmployee ? `<tr><td>PF Deduction</td><td class="right">-${selected.pfEmployee.toLocaleString("en-IN")}</td></tr>` : ""}
        ${selected.esi        ? `<tr><td>ESI</td><td class="right">-${selected.esi.toLocaleString("en-IN")}</td></tr>` : ""}
        ${selected.tds        ? `<tr><td>TDS</td><td class="right">-${selected.tds.toLocaleString("en-IN")}</td></tr>` : ""}
        <tr><td><b>Total Deductions</b></td><td class="right"><b>-${(selected.totalDeductions || 0).toLocaleString("en-IN")}</b></td></tr>
        <tr><td class="net">Net Pay</td><td class="right net">₹${(selected.netPay || 0).toLocaleString("en-IN")}</td></tr>
      </table>
      </body></html>
    `);
    win.document.close();
    win.print();
    addToast("Payslip download initiated");
  };

  const latestSlip = slips[0];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes sl-slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes sl-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sl-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .sl-page * { box-sizing:border-box; }
        .sl-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .sl-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:sl-shimmer 1.4s infinite; border-radius:8px; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts.map(t => ({ ...t, message: t.msg }))} />
      <PayslipPanel slip={selected} onClose={() => setSelected(null)} onDownload={handleDownload} />

      <div className="sl-page">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 32, animation: "sl-fadeUp 0.4s ease" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0 }}>My Salary</h1>
            <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#475569" }}>
              {new Date().toLocaleDateString("en-IN", { year: "numeric" })} · Year to Date Overview
            </p>
          </div>

          {/* ── YTD Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
            {loading ? [0,1,2,3].map(i => <div key={i} className="sl-skeleton" style={{ height: 110 }} />) : (
              <>
                <SummaryCard label="Latest Net Pay"    value={fmtINR(latestSlip?.netPay)}           icon="₹" color="#22c55e" sub={latestSlip ? monthLabel(latestSlip) : "—"} delay={0.05} />
                <SummaryCard label="YTD Gross Pay"     value={fmtINR(ytdData.grossPay)}              icon="◈" color="#38bdf8" sub={`${slips.length} slips`}                           delay={0.1}  />
                <SummaryCard label="YTD Deductions"    value={fmtINR(ytdData.totalDeductions)}       icon="▼" color="#ef4444" sub="PF + ESI + TDS"                                    delay={0.15} />
                <SummaryCard label="YTD Net Earned"    value={fmtINR(ytdData.netPay)}                icon="✦" color="#a78bfa" sub="Take home total"                                   delay={0.2}  />
              </>
            )}
          </div>

          {/* ── Salary history table ── */}
          <div style={{ background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", animation: "sl-fadeUp 0.5s ease 0.25s both" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#f1f5f9", margin: 0 }}>Salary History</h2>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 3 }}>
                  Click any row to view full payslip
                </div>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155" }}>
                {slips.length} record{slips.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3,4].map(i => <div key={i} className="sl-skeleton" style={{ height: 56 }} />)}
              </div>
            ) : slips.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>₹</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#334155" }}>No salary records found</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Month", "Gross Pay", "Deductions", "Net Pay", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slips.map((slip, i) => (
                      <SlipRow key={slip._id || i} slip={slip} index={i}
                        onSelect={setSelected}
                        isActive={selected?._id === slip._id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}