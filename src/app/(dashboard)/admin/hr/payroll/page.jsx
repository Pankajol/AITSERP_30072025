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
          animation: "pr-slideIn 0.3s ease",
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

const STATUS_CFG = {
  Unpaid:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "○" },
  Processing: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "◷" },
  Paid:       { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: "✓" },
};

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub, delay }) {
  return (
    <div style={{
      background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px",
      animation: `pr-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</div>
          {sub != null && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155", marginTop: 5 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color, flexShrink: 0 }}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Generate/Edit Modal ──────────────────────────────────────
function PayrollModal({ open, onClose, employees, month, editData, onSave }) {
  const [form, setForm] = useState({ employeeId: "", basic: "", hra: "", allowances: "", deductions: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        employeeId: editData.employeeId?._id || editData.employeeId || "",
        basic:      editData.basic      || "",
        hra:        editData.hra        || "",
        allowances: editData.allowances || "",
        deductions: editData.deductions || "",
        _id:        editData._id,
      });
    } else {
      setForm({ employeeId: "", basic: "", hra: "", allowances: "", deductions: "" });
    }
  }, [editData, open]);

  const net = (Number(form.basic || 0) + Number(form.hra || 0) + Number(form.allowances || 0)) - Number(form.deductions || 0);

  const handleEmpChange = (id) => {
    const emp = employees.find(e => e._id === id);
    setForm(p => ({
      ...p,
      employeeId: id,
      basic:      emp?.salary?.basic      || p.basic      || "",
      hra:        emp?.salary?.hra        || p.hra        || "",
      allowances: emp?.salary?.allowances || p.allowances || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, netSalary: net, month });
    setSaving(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 100, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.93)",
        width: "min(480px, 94vw)", background: "#0a0f1e",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
        zIndex: 101, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>Payroll</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#f1f5f9", margin: "4px 0 0" }}>
              {editData ? "Edit Payroll" : "Generate Payroll"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
          {/* Employee */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Employee *</label>
            <select required value={form.employeeId} onChange={e => handleEmpChange(e.target.value)}
              disabled={!!editData}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: form.employeeId ? "#e2e8f0" : "#475569", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none", colorScheme: "dark" }}>
              <option value="">-- Select Employee --</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
            </select>
          </div>

          {/* Earnings + Deductions grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            {[["basic","Basic Salary","#38bdf8"],["hra","HRA","#a78bfa"],["allowances","Allowances","#34d399"],["deductions","Deductions","#ef4444"]].map(([k, l, c]) => (
              <div key={k}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 7 }}>{l}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "'DM Mono', monospace", fontSize: 12, color: c }}>₹</span>
                  <input type="number" min="0" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px 10px 28px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${c}22`, color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
                    onFocus={e => e.target.style.borderColor = c + "66"}
                    onBlur={e => e.target.style.borderColor = c + "22"}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Net salary preview */}
          <div style={{ padding: "14px 18px", background: net >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${net >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#64748b" }}>Net Salary</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: net >= 0 ? "#22c55e" : "#ef4444" }}>{fmtINR(net)}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving
                ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "pr-spin 0.7s linear infinite" }} />
                : `${editData ? "Update" : "Generate"} Payroll`}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Mark Paid Confirm ────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, name, amount }) {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 102, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.93)",
        width: "min(380px, 92vw)", background: "#0a0f1e",
        border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20,
        zIndex: 103, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        padding: "28px", textAlign: "center",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: "#22c55e" }}>✓</div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#f1f5f9", margin: "0 0 8px" }}>Mark as Paid?</h3>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>{name}</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: "#22c55e", margin: "0 0 24px" }}>{fmtINR(amount)}</p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155", margin: "0 0 24px" }}>This will create a salary slip for the employee.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "pr-spin 0.7s linear infinite" }} /> : "✓ Confirm & Mark Paid"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function PayrollPage() {
  const token = () => typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  const [payrolls, setPayrolls]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [month, setMonth]         = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [confirmPay, setConfirmPay] = useState(null); // { _id, name, amount }
  const [toasts, setToasts]       = useState([]);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const toastId = useRef(0);

  const addToast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => { load(); }, [month]);

  async function load() {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch(`/api/hr/payroll?month=${month}`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`/api/hr/employees?status=Active`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [p, e] = await Promise.all([pRes.json(), eRes.json()]);
      setPayrolls(p.data || []);
      setEmployees(e.data || []);
    } catch (err) {
      addToast("Failed to load payroll data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(body) {
    const url    = body._id ? `/api/hr/payroll/${body._id}` : "/api/hr/payroll";
    const method = body._id ? "PUT" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
    const data   = await res.json();
    if (data.success) {
      addToast(body._id ? "Payroll updated" : "Payroll generated successfully");
      setShowModal(false); setEditData(null); load();
    } else {
      addToast(data.message || "Failed to save", "error");
    }
  }

  async function handleMarkPaid() {
    if (!confirmPay) return;
    const res  = await fetch(`/api/hr/payroll/${confirmPay._id}/mark-paid`, { method: "PATCH", headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) {
      addToast(`${confirmPay.name} salary marked as paid ✓`);
      setConfirmPay(null); load();
    } else {
      addToast(data.message || "Failed to mark paid", "error");
      setConfirmPay(null);
    }
  }

  // Stats
  const totalNet  = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalPaid = payrolls.filter(p => p.paidStatus === "Paid").reduce((s, p) => s + (p.netSalary || 0), 0);
  const pending   = payrolls.filter(p => p.paidStatus !== "Paid").length;

  // Filtered rows
  const filtered = useMemo(() =>
    payrolls.filter(p => {
      const name = p.employeeId?.fullName?.toLowerCase() || "";
      const matchSearch = !search.trim() || name.includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || p.paidStatus === filterStatus;
      return matchSearch && matchStatus;
    }), [payrolls, search, filterStatus]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes pr-slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pr-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pr-spin    { to{transform:rotate(360deg)} }
        @keyframes pr-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .pr-page * { box-sizing:border-box; }
        .pr-page { min-height:100vh; background:#060b14; font-family:'Syne',sans-serif; color:#e2e8f0; padding:32px 20px 60px; }
        .pr-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:pr-shimmer 1.4s infinite; border-radius:8px; }
        .pr-row { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.15s; }
        .pr-row:hover { background:rgba(255,255,255,0.025); }
        .pr-action { border:none; border-radius:8px; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; padding:6px 12px; transition:all 0.2s; font-weight:500; }
        .pr-action:hover { filter:brightness(1.15); transform:translateY(-1px); }
        .pr-filter { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.08); background:transparent; color:#64748b; font-family:'DM Mono',monospace; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .pr-filter:hover { border-color:rgba(255,255,255,0.2); color:#94a3b8; }
        .pr-filter.active { background:rgba(99,102,241,0.1); border-color:#6366f155; color:#818cf8; }
        table { border-collapse:collapse; width:100%; }
      `}</style>

      <Toast toasts={toasts} />
      <PayrollModal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }} employees={employees} month={month} editData={editData} onSave={handleSave} />
      <ConfirmModal open={!!confirmPay} onClose={() => setConfirmPay(null)} onConfirm={handleMarkPaid} name={confirmPay?.name} amount={confirmPay?.amount} />

      <div className="pr-page">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16, animation: "pr-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0 }}>Payroll</h1>
              <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#475569" }}>
                {new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none", colorScheme: "dark" }}
              />
              <button onClick={() => { setEditData(null); setShowModal(true); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", color: "#fff", padding: "11px 20px", borderRadius: 11, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 20px rgba(59,130,246,0.3)", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <span style={{ fontSize: 18 }}>+</span> Generate Payroll
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
            {loading ? [0,1,2,3].map(i => <div key={i} className="pr-skeleton" style={{ height: 100 }} />) : (
              <>
                <SummaryCard label="Total Payroll"  value={fmtINR(totalNet)}  icon="◈" color="#38bdf8" sub={`${payrolls.length} employees`} delay={0.05} />
                <SummaryCard label="Amount Paid"    value={fmtINR(totalPaid)} icon="✓" color="#22c55e" sub={`${payrolls.filter(p=>p.paidStatus==="Paid").length} paid`} delay={0.1} />
                <SummaryCard label="Pending"        value={fmtINR(totalNet - totalPaid)} icon="○" color="#ef4444" sub={`${pending} unpaid`} delay={0.15} />
                <SummaryCard label="Employees"      value={payrolls.length}   icon="◎" color="#a78bfa" sub={month} delay={0.2} />
              </>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", animation: "pr-fadeUp 0.5s ease 0.2s both" }}>

            {/* Table toolbar */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#f1f5f9", margin: 0 }}>Payroll Records</h2>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 3 }}>{filtered.length} records</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>⌕</span>
                  <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none", width: 180 }}
                  />
                </div>
                {/* Filter pills */}
                {["All", "Unpaid", "Processing", "Paid"].map(f => (
                  <button key={f} className={`pr-filter${filterStatus === f ? " active" : ""}`} onClick={() => setFilterStatus(f)}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} className="pr-skeleton" style={{ height: 52 }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#334155" }}>
                  {payrolls.length === 0 ? "No payroll generated for this month" : "No records match filter"}
                </div>
                {payrolls.length === 0 && (
                  <button onClick={() => setShowModal(true)} style={{ marginTop: 16, padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", color: "#38bdf8", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    + Generate First Payroll
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Employee", "Basic", "HRA", "Allowances", "Deductions", "Net Salary", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const st = STATUS_CFG[p.paidStatus] || STATUS_CFG.Unpaid;
                      const empName = p.employeeId?.fullName || "—";
                      return (
                        <tr key={p._id} className="pr-row" style={{ animation: `pr-fadeUp 0.4s ease ${i * 0.04}s both` }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{empName}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", marginTop: 2 }}>{p.employeeId?.employeeCode || ""}</div>
                          </td>
                          {[p.basic, p.hra, p.allowances, p.deductions].map((v, idx) => (
                            <td key={idx} style={{ padding: "14px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: idx === 3 ? "#ef4444" : "#94a3b8" }}>
                              {idx === 3 ? `-${fmtINR(v)}` : fmtINR(v)}
                            </td>
                          ))}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#22c55e" }}>{fmtINR(p.netSalary)}</span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}33`, fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {st.icon} {p.paidStatus}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {p.paidStatus !== "Paid" && (
                                <button className="pr-action"
                                  onClick={() => setConfirmPay({ _id: p._id, name: empName, amount: p.netSalary })}
                                  style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                                  ✓ Mark Paid
                                </button>
                              )}
                              {p.paidStatus !== "Paid" && (
                                <button className="pr-action"
                                  onClick={() => { setEditData(p); setShowModal(true); }}
                                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                                  ✎ Edit
                                </button>
                              )}
                              {p.paidStatus === "Paid" && (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155" }}>
                                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : "—"}
                                </span>
                              )}
                            </div>
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