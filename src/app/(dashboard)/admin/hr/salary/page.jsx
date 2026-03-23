"use client";
import { useEffect, useState, useRef, useMemo } from "react";

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
          animation: "as-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✦" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthLabel = s => s?.month && s?.year ? `${MONTHS[s.month - 1]} ${s.year}` : "—";

const STATUS_CFG = {
  Paid:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: "✓" },
  Pending: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "◷" },
  Hold:    { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "⏸" },
};

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub, delay }) {
  return (
    <div style={{
      background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px",
      animation: `as-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155", marginTop: 5 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Breakdown Bar ────────────────────────────────────────────
function BreakdownBar({ label, amount, total, color, delay }) {
  const pct = total ? Math.min((amount / total) * 100, 100) : 0;
  return (
    <div style={{ animation: `as-fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color, fontWeight: 500 }}>{fmtINR(amount)}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Slip Detail Drawer ───────────────────────────────────────
function SlipDrawer({ slip, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  if (!slip) return null;

  const earnings = [
    { label: "Basic Salary",     amount: slip.basicSalary,     color: "#38bdf8" },
    { label: "HRA",              amount: slip.hra,              color: "#a78bfa" },
    { label: "DA",               amount: slip.da,               color: "#34d399" },
    { label: "Special Allowance",amount: slip.specialAllowance, color: "#fbbf24" },
    { label: "Bonus",            amount: slip.bonus,            color: "#f472b6" },
    { label: "Overtime",         amount: slip.overtime,         color: "#fb923c" },
  ].filter(e => e.amount > 0);

  const deductions = [
    { label: "PF (Employee)",    amount: slip.pfEmployee,      color: "#ef4444" },
    { label: "PF (Employer)",    amount: slip.pfEmployer,      color: "#f97316" },
    { label: "ESI",              amount: slip.esi,             color: "#ef4444" },
    { label: "TDS",              amount: slip.tds,             color: "#ef4444" },
    { label: "Other Deductions", amount: slip.otherDeductions, color: "#f87171" },
  ].filter(d => d.amount > 0);

  const grossPay = slip.grossPay || earnings.reduce((s, e) => s + e.amount, 0);
  const totalDed = slip.totalDeductions || deductions.reduce((s, d) => s + d.amount, 0);

  const handleStatus = async (status) => {
    setUpdating(true);
    await onStatusChange(slip._id, status);
    setUpdating(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(480px, 95vw)",
        background: "#0a0f1e", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 101, overflowY: "auto", padding: "28px 24px",
        animation: "as-slideIn 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>Salary Slip</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "4px 0 2px" }}>
              {slip.employeeId?.fullName || "Employee"}
            </h2>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>{monthLabel(slip)}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 34, height: 34, borderRadius: 10, cursor: "pointer" }}>✕</button>
        </div>

        {/* Employee info */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["Employee Code", slip.employeeId?.employeeCode],
            ["Department",    slip.employeeId?.department?.name],
            ["Month",         monthLabel(slip)],
            ["Paid At",       slip.paidAt ? new Date(slip.paidAt).toLocaleDateString("en-IN") : "—"],
          ].map(([l, v]) => v ? (
            <div key={l}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8", marginTop: 3 }}>{v}</div>
            </div>
          ) : null)}
        </div>

        {/* Net pay highlight */}
        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#94a3b8" }}>Net Pay</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: "#22c55e" }}>{fmtINR(slip.netPay)}</span>
        </div>

        {/* Attendance */}
        {(slip.presentDays != null || slip.totalDays != null) && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[["Working Days", slip.totalDays, "#475569"],["Present", slip.presentDays, "#22c55e"],["Absent", (slip.totalDays||0)-(slip.presentDays||0), "#ef4444"],["LOP", slip.lopDays||0, "#f59e0b"]].map(([l,v,c]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: c }}>{v ?? "—"}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Earnings */}
        {earnings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Earnings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {earnings.map((e, i) => <BreakdownBar key={e.label} {...e} total={grossPay} delay={i * 0.03} />)}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Gross Pay</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{fmtINR(grossPay)}</span>
            </div>
          </div>
        )}

        {/* Deductions */}
        {deductions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Deductions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deductions.map((d, i) => <BreakdownBar key={d.label} {...d} total={grossPay} delay={i * 0.03} />)}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Total Deductions</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#ef4444", fontWeight: 500 }}>-{fmtINR(totalDed)}</span>
            </div>
          </div>
        )}

        {/* Status change */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Change Status</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Paid", "Pending", "Hold"].map(s => {
              const cfg = STATUS_CFG[s];
              const isActive = slip.status === s;
              return (
                <button key={s} onClick={() => handleStatus(s)} disabled={updating || isActive}
                  style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${isActive ? cfg.color + "55" : "rgba(255,255,255,0.08)"}`, background: isActive ? cfg.bg : "transparent", color: isActive ? cfg.color : "#475569", fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: isActive ? "default" : "pointer", transition: "all 0.2s", fontWeight: isActive ? 600 : 400 }}>
                  {cfg.icon} {s}
                </button>
              );
            })}
          </div>
        </div>

        {slip.remarks && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f59e0b", marginBottom: 4 }}>REMARKS</div>
            <div style={{ fontSize: 13, color: "#fbbf24" }}>{slip.remarks}</div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Admin Salary Page ────────────────────────────────────
export default function AdminSalaryPage() {
  const token = () => typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const [slips, setSlips]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [toasts, setToasts]     = useState([]);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth]   = useState("");
  const toastId = useRef(0);

  const addToast = (msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => { fetchSlips(); }, []);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/hr/salary", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setSlips(data.data || []);
      else addToast(data.message || "Failed to load", "error");
    } catch {
      addToast("Failed to load salary data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res  = await fetch(`/api/hr/salary/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Status updated to ${status}`);
        // Update local state
        setSlips(p => p.map(s => s._id === id ? { ...s, status } : s));
        setSelected(p => p ? { ...p, status } : p);
      } else {
        addToast(data.message || "Failed to update", "error");
      }
    } catch {
      addToast("Failed to update status", "error");
    }
  };

  // Stats
  const totalPaid    = slips.filter(s => s.status === "Paid").reduce((a, s) => a + (s.netPay || 0), 0);
  const totalPending = slips.filter(s => s.status === "Pending").reduce((a, s) => a + (s.netPay || 0), 0);
  const totalSlips   = slips.length;
  const uniqueEmps   = new Set(slips.map(s => s.employeeId?._id || s.employeeId)).size;

  // Unique months for filter
  const months = useMemo(() => {
    const seen = new Set();
    return slips
      .map(s => s.month && s.year ? `${s.year}-${String(s.month).padStart(2, "0")}` : null)
      .filter(m => m && !seen.has(m) && seen.add(m))
      .sort((a, b) => b.localeCompare(a));
  }, [slips]);

  // Filtered
  const filtered = useMemo(() => slips.filter(s => {
    const name = s.employeeId?.fullName?.toLowerCase() || "";
    const matchSearch = !search.trim() || name.includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || s.status === filterStatus;
    const slipMonth   = s.month && s.year ? `${s.year}-${String(s.month).padStart(2, "0")}` : "";
    const matchMonth  = !filterMonth || slipMonth === filterMonth;
    return matchSearch && matchStatus && matchMonth;
  }), [slips, search, filterStatus, filterMonth]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes as-slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes as-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes as-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .as-page * { box-sizing:border-box; }
        .as-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .as-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:as-shimmer 1.4s infinite; border-radius:8px; }
        .as-row { border-bottom:1px solid rgba(255,255,255,0.04); cursor:pointer; transition:background 0.15s; }
        .as-row:hover { background:rgba(255,255,255,0.025); }
        .as-row.active { background:rgba(59,130,246,0.06); }
        .as-filter { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .as-filter:hover { border-color:rgba(255,255,255,0.2); color:#94a3b8; }
        .as-filter.active { background:rgba(99,102,241,0.1); border-color:#6366f155; color:#818cf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts} />
      <SlipDrawer slip={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />

      <div className="as-page">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 28, animation: "as-fadeUp 0.4s ease" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0 }}>Salary Management</h1>
            <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#475569" }}>
              All employee salary slips — view, manage & update status
            </p>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
            {loading ? [0,1,2,3].map(i => <div key={i} className="as-skeleton" style={{ height: 100 }} />) : (
              <>
                <SummaryCard label="Total Slips"     value={totalSlips}        icon="◈" color="#38bdf8" sub={`${uniqueEmps} employees`} delay={0.05} />
                <SummaryCard label="Total Paid"       value={fmtINR(totalPaid)} icon="✓" color="#22c55e" sub={`${slips.filter(s=>s.status==="Paid").length} slips`} delay={0.1} />
                <SummaryCard label="Pending Amount"   value={fmtINR(totalPending)} icon="◷" color="#f59e0b" sub={`${slips.filter(s=>s.status==="Pending").length} pending`} delay={0.15} />
                <SummaryCard label="On Hold"          value={slips.filter(s=>s.status==="Hold").length} icon="⏸" color="#ef4444" sub="slips on hold" delay={0.2} />
              </>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", animation: "as-fadeUp 0.5s ease 0.2s both" }}>

            {/* Toolbar */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#f1f5f9", margin: 0 }}>Salary Slips</h2>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 3 }}>
                  {filtered.length} of {slips.length} records · Click row to view details
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>⌕</span>
                  <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none", width: 180 }} />
                </div>
                {/* Month filter */}
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: filterMonth ? "#e2e8f0" : "#475569", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none", colorScheme: "dark" }}>
                  <option value="">All Months</option>
                  {months.map(m => {
                    const [y, mo] = m.split("-");
                    return <option key={m} value={m}>{MONTHS[parseInt(mo)-1]} {y}</option>;
                  })}
                </select>
                {/* Status pills */}
                {["All","Paid","Pending","Hold"].map(f => (
                  <button key={f} className={`as-filter${filterStatus === f ? " active" : ""}`} onClick={() => setFilterStatus(f)}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4,5].map(i => <div key={i} className="as-skeleton" style={{ height: 52 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#334155" }}>
                  {slips.length === 0 ? "No salary slips found — generate payroll first" : "No records match filter"}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Employee", "Month", "Gross Pay", "Deductions", "Net Pay", "Status", "Paid At"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const st = STATUS_CFG[s.status] || STATUS_CFG.Pending;
                      const isActive = selected?._id === s._id;
                      return (
                        <tr key={s._id} onClick={() => setSelected(s)}
                          className={`as-row${isActive ? " active" : ""}`}
                          style={{ animation: `as-fadeUp 0.4s ease ${i * 0.03}s both` }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>
                              {s.employeeId?.fullName || "—"}
                            </div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 2 }}>
                              {s.employeeId?.employeeCode || ""}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8" }}>
                            {monthLabel(s)}
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8" }}>
                            {fmtINR(s.grossPay || s.basicSalary)}
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#ef4444" }}>
                            -{fmtINR(s.totalDeductions)}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#22c55e" }}>
                              {fmtINR(s.netPay)}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}33`, fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {st.icon} {s.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#475569" }}>
                            {s.paidAt ? new Date(s.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
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