"use client";
import React, { useState, useEffect, useRef } from "react";
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
          animation: "lm-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✦" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Leave type config ────────────────────────────────────────
const LEAVE_TYPES = {
  Casual:  { color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  icon: "☀", label: "Casual" },
  Sick:    { color: "#f472b6", bg: "rgba(244,114,182,0.1)", icon: "♥", label: "Sick" },
  Paid:    { color: "#a78bfa", bg: "rgba(167,139,250,0.1)", icon: "★", label: "Paid" },
  Unpaid:  { color: "#fb923c", bg: "rgba(251,146,60,0.1)",  icon: "◎", label: "Unpaid" },
};

const STATUS_CONFIG = {
  Approved: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   label: "Approved", icon: "✓" },
  Rejected: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "Rejected", icon: "✕" },
  Pending:  { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Pending",  icon: "◷" },
};

// ─── Balance Card ─────────────────────────────────────────────
function BalanceCard({ type, count, delay }) {
  const cfg = LEAVE_TYPES[type] || LEAVE_TYPES.Casual;
  const max = 12;
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div style={{
      background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px 20px 16px",
      animation: `lm-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>
            {count}
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155", marginTop: 3 }}>days left</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: cfg.color }}>
          {cfg.icon}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: cfg.color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

// ─── Leave Row ────────────────────────────────────────────────
function LeaveRow({ leave, index }) {
  const type   = LEAVE_TYPES[leave.leaveType]  || LEAVE_TYPES.Casual;
  const status = STATUS_CONFIG[leave.status]   || STATUS_CONFIG.Pending;
  const [open, setOpen] = useState(false);

  const fromDate = new Date(leave.fromDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const toDate   = new Date(leave.toDate).toLocaleDateString("en-IN",   { day: "2-digit", month: "short", year: "numeric" });

  const days = Math.round((new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <>
      <tr onClick={() => setOpen(!open)} style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
        transition: "background 0.15s",
        background: open ? "rgba(255,255,255,0.03)" : "transparent",
        animation: `lm-fadeUp 0.4s ease ${index * 0.05}s both`,
      }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
        onMouseLeave={e => e.currentTarget.style.background = open ? "rgba(255,255,255,0.03)" : "transparent"}
      >
        <td style={{ padding: "14px 20px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#cbd5e1" }}>{fromDate}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 2 }}>to {toDate}</div>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <span style={{ background: type.bg, color: type.color, border: `1px solid ${type.color}33`,
            fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>
            {type.icon} {leave.leaveType}
          </span>
        </td>
        <td style={{ padding: "14px 12px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>
            {days}d
          </span>
        </td>
        <td style={{ padding: "14px 20px" }}>
          <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}33`,
            fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20,
            display: "inline-flex", alignItems: "center", gap: 5 }}>
            {status.icon} {leave.status || "Pending"}
          </span>
        </td>
        <td style={{ padding: "14px 16px", color: "#334155", fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </td>
      </tr>
      {open && (
        <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <td colSpan={5} style={{ padding: "12px 20px 16px" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              REASON
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8" }}>{leave.reason || "—"}</div>
            {leave.status === "Rejected" && leave.rejectionReason && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#ef4444", marginBottom: 4 }}>REJECTION REASON</div>
                <div style={{ fontSize: 13, color: "#fca5a5" }}>{leave.rejectionReason}</div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Apply Leave Drawer ───────────────────────────────────────
function ApplyDrawer({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ fromDate: "", toDate: "", leaveType: "Casual", reason: "" });
  const [loading, setLoading] = useState(false);

  const days = formData.fromDate && formData.toDate
    ? Math.max(0, Math.round((new Date(formData.toDate) - new Date(formData.fromDate)) / (1000*60*60*24)) + 1)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/hr/my-leaves", formData, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setFormData({ fromDate: "", toDate: "", leaveType: "Casual", reason: "" });
        onSuccess("Leave application submitted successfully");
        onClose();
      }
    } catch (err) {
      onSuccess(err?.response?.data?.message || "Failed to apply leave", "error");
    } finally {
      setLoading(false);
    }
  };

  const cfg = LEAVE_TYPES[formData.leaveType] || LEAVE_TYPES.Casual;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        zIndex: 100, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "opacity 0.3s ease",
      }} />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 95vw)",
        background: "#0a0f1e", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 101, padding: "32px 28px", overflowY: "auto",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>New Request</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: "4px 0 0" }}>Apply Leave</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Leave type selector */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 10 }}>Leave Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(LEAVE_TYPES).map(([key, c]) => (
                <button type="button" key={key}
                  onClick={() => setFormData(p => ({ ...p, leaveType: key }))}
                  style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${formData.leaveType === key ? c.color : "rgba(255,255,255,0.07)"}`,
                    background: formData.leaveType === key ? c.bg : "rgba(255,255,255,0.02)",
                    color: formData.leaveType === key ? c.color : "#64748b",
                    fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13,
                    transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <span>{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["fromDate", "From Date"], ["toDate", "To Date"]].map(([field, label]) => (
              <div key={field}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>{label}</label>
                <input type="date" required value={formData[field]}
                  onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13,
                    outline: "none", colorScheme: "dark",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Days preview */}
          {days > 0 && (
            <div style={{ padding: "12px 16px", background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Duration</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: cfg.color }}>{days} day{days > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Reason</label>
            <textarea required rows={4} placeholder="Briefly describe your reason..."
              value={formData.reason}
              onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13,
                outline: "none", resize: "vertical",
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            padding: "14px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color})`,
            color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading ? (
              <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "lm-spin 0.7s linear infinite" }} />
            ) : `${cfg.icon} Submit Leave Request`}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function LeaveManagement() {
  const [balance, setBalance] = useState({ casual: 0, sick: 0, paid: 0, unpaid: 0 });
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [toasts, setToasts]   = useState([]);
  const [filter, setFilter]   = useState("All");
  const toastId = useRef(0);

  useEffect(() => { fetchData(); }, []);

  const addToast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/hr/my-leaves", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setBalance(res.data.balance || {});
        setLeaves(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching leave data", err);
    } finally {
      setLoading(false);
    }
  };

  const filters = ["All", "Pending", "Approved", "Rejected"];
  const filtered = filter === "All" ? leaves : leaves.filter(l => l.status === filter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes lm-slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes lm-fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lm-spin    { to { transform:rotate(360deg); } }
        @keyframes lm-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .lm-page * { box-sizing: border-box; }
        .lm-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .lm-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:lm-shimmer 1.4s infinite; border-radius:8px; }
        .lm-filter-btn { padding:6px 16px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:12px; cursor:pointer; transition:all 0.2s; }
        .lm-filter-btn:hover { border-color:rgba(255,255,255,0.2); color:#94a3b8; }
        .lm-filter-btn.active { background:rgba(56,189,248,0.1); border-color:#38bdf855; color:#38bdf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts} />
      <ApplyDrawer open={showDrawer} onClose={() => setShowDrawer(false)} onSuccess={(msg, type) => { addToast(msg, type); fetchData(); }} />

      <div className="lm-page">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, animation: "lm-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0 }}>My Leaves</h1>
              <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#475569" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <button onClick={() => setShowDrawer(true)} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              border: "none", color: "#fff", padding: "12px 20px", borderRadius: 12,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <span style={{ fontSize: 18 }}>+</span> Apply Leave
            </button>
          </div>

          {/* ── Balance Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            {loading ? [0,1,2,3].map(i => (
              <div key={i} className="lm-skeleton" style={{ height: 110 }} />
            )) : (
              <>
                <BalanceCard type="Casual" count={balance.casual || 0} delay={0.05} />
                <BalanceCard type="Sick"   count={balance.sick   || 0} delay={0.1}  />
                <BalanceCard type="Paid"   count={balance.paid   || 0} delay={0.15} />
                <BalanceCard type="Unpaid" count={balance.unpaid || 0} delay={0.2}  />
              </>
            )}
          </div>

          {/* ── Leave History ── */}
          <div style={{ background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", animation: "lm-fadeUp 0.5s ease 0.25s both" }}>

            {/* Table header */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#f1f5f9", margin: 0 }}>Leave History</h2>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 3 }}>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                </div>
              </div>
              {/* Filter pills */}
              <div style={{ display: "flex", gap: 6 }}>
                {filters.map(f => (
                  <button key={f} className={`lm-filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {[1,2,3].map(i => <div key={i} className="lm-skeleton" style={{ height: 52 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#334155" }}>No {filter !== "All" ? filter.toLowerCase() : ""} leave records found</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Date Range", "Type", "Days", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l, i) => <LeaveRow key={l._id} leave={l} index={i} />)}
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