"use client";
import { useEffect, useState, useRef, useMemo } from "react";

// ─── Toast ────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#f0fdf4" : "#fef2f2",
          borderLeft: `4px solid ${t.type === "success" ? "#22c55e" : "#ef4444"}`,
          color: t.type === "success" ? "#166534" : "#991b1b",
          padding: "12px 20px", borderRadius: 12, fontSize: 13,
          fontFamily: "'Times New Roman', Times, serif",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          animation: "pr-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✓" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const fmtINR = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const STATUS_CFG = {
  Unpaid:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   icon: "○" },
  Processing: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  icon: "◷" },
  Paid:       { color: "#10b981", bg: "rgba(16,185,129,0.08)",   icon: "✓" },
};

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ label, value, icon, color, sub, delay }) {
  return (
    <div style={{
      background: "white", border: "1px solid #e2e8f0",
      borderRadius: 20, padding: "20px", boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      animation: `pr-fadeUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
          <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
          {sub != null && <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b", marginTop: 5 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color, flexShrink: 0 }}>{icon}</div>
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 100, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.95)",
        width: "min(480px, 94vw)", background: "white",
        border: "1px solid #e2e8f0", borderRadius: 24,
        zIndex: 101, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 24px 48px -12px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 2 }}>Payroll</div>
            <h3 style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 800, fontSize: 20, color: "#0f172a", margin: "4px 0 0" }}>
              {editData ? "Edit Payroll" : "Generate Payroll"}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#475569", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Employee */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 8 }}>Employee *</label>
            <select required value={form.employeeId} onChange={e => handleEmpChange(e.target.value)}
              disabled={!!editData}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #cbd5e1", color: form.employeeId ? "#0f172a" : "#64748b", fontFamily: "'Times New Roman', Times, serif", fontSize: 13, outline: "none" }}>
              <option value="">-- Select Employee --</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
            </select>
          </div>

          {/* Earnings + Deductions grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            {[["basic","Basic Salary","#0ea5e9"],["hra","HRA","#8b5cf6"],["allowances","Allowances","#10b981"],["deductions","Deductions","#ef4444"]].map(([k, l, c]) => (
              <div key={k}>
                <label style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 7 }}>{l}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "'Times New Roman', Times, serif", fontSize: 12, color: c }}>₹</span>
                  <input type="number" min="0" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px 10px 28px", borderRadius: 10, background: "#f8fafc", border: `1px solid ${c}40`, color: "#0f172a", fontFamily: "'Times New Roman', Times, serif", fontSize: 13, outline: "none" }}
                    onFocus={e => e.target.style.borderColor = c}
                    onBlur={e => e.target.style.borderColor = c + "40"}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Net salary preview */}
          <div style={{ padding: "14px 18px", background: net >= 0 ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${net >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 12, color: "#64748b" }}>Net Salary</span>
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 800, fontSize: 22, color: net >= 0 ? "#10b981" : "#ef4444" }}>{fmtINR(net)}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", color: "#475569", fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 102, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.95)",
        width: "min(380px, 92vw)", background: "white",
        border: "1px solid #e2e8f0", borderRadius: 24,
        zIndex: 103, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        padding: "28px", textAlign: "center",
        boxShadow: "0 20px 35px -12px rgba(0,0,0,0.15)",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: "#10b981" }}>✓</div>
        <h3 style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 800, fontSize: 18, color: "#0f172a", margin: "0 0 8px" }}>Mark as Paid?</h3>
        <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>{name}</p>
        <p style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 22, color: "#10b981", margin: "0 0 24px" }}>{fmtINR(amount)}</p>
        <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b", margin: "0 0 24px" }}>This will create a salary slip for the employee.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", color: "#475569", fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
  const [confirmPay, setConfirmPay] = useState(null);
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
        @keyframes pr-slideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pr-fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pr-spin    { to{transform:rotate(360deg)} }
        @keyframes pr-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .pr-page * { box-sizing:border-box; }
        .pr-page { min-height:100vh; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); font-family: 'Times New Roman', Times, serif; color: #0f172a; padding: 32px 20px 60px; }
        .pr-skeleton { background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%); background-size:400px 100%; animation:pr-shimmer 1.4s infinite; border-radius:12px; }
        .pr-row { border-bottom:1px solid #f1f5f9; transition:background 0.15s; }
        .pr-row:hover { background:#f8fafc; }
        .pr-action { border:none; border-radius:8px; cursor:pointer; font-family:'Times New Roman', Times, serif; font-size:11px; padding:6px 12px; transition:all 0.2s; font-weight:500; }
        .pr-action:hover { filter:brightness(0.96); transform:translateY(-1px); }
        .pr-filter { padding:6px 14px; border-radius:20px; border:1px solid #cbd5e1; background:white; color:#475569; font-family:'Times New Roman', Times, serif; font-size:11px; cursor:pointer; transition:all 0.2s; }
        .pr-filter:hover { border-color:#94a3b8; color:#0f172a; }
        .pr-filter.active { background:#eef2ff; border-color:#6366f1; color:#4f46e5; }
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
              <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: 0 }}>Payroll</h1>
              <p style={{ margin: "6px 0 0", fontFamily: "'Times New Roman', Times, serif", fontSize: 13, color: "#64748b" }}>
                {new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 10, background: "white", border: "1px solid #cbd5e1", color: "#0f172a", fontFamily: "'Times New Roman', Times, serif", fontSize: 13, outline: "none" }}
              />
              <button onClick={() => { setEditData(null); setShowModal(true); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#2563eb,#3b82f6)", border: "none", color: "#fff", padding: "11px 20px", borderRadius: 12, fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)", transition: "all 0.2s" }}
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
                <SummaryCard label="Total Payroll"  value={fmtINR(totalNet)}  icon="◈" color="#0ea5e9" sub={`${payrolls.length} employees`} delay={0.05} />
                <SummaryCard label="Amount Paid"    value={fmtINR(totalPaid)} icon="✓" color="#10b981" sub={`${payrolls.filter(p=>p.paidStatus==="Paid").length} paid`} delay={0.1} />
                <SummaryCard label="Pending"        value={fmtINR(totalNet - totalPaid)} icon="○" color="#ef4444" sub={`${pending} unpaid`} delay={0.15} />
                <SummaryCard label="Employees"      value={payrolls.length}   icon="◎" color="#8b5cf6" sub={month} delay={0.2} />
              </>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", animation: "pr-fadeUp 0.5s ease 0.2s both" }}>

            {/* Table toolbar */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 17, color: "#0f172a", margin: 0 }}>Payroll Records</h2>
                <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b", marginTop: 3 }}>{filtered.length} records</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>⌕</span>
                  <input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 10, background: "white", border: "1px solid #cbd5e1", color: "#0f172a", fontFamily: "'Times New Roman', Times, serif", fontSize: 12, outline: "none", width: 180 }}
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
                <div style={{ fontSize: 36, marginBottom: 12, color: "#cbd5e1" }}>◎</div>
                <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 13, color: "#64748b" }}>
                  {payrolls.length === 0 ? "No payroll generated for this month" : "No records match filter"}
                </div>
                {payrolls.length === 0 && (
                  <button onClick={() => setShowModal(true)} style={{ marginTop: 16, padding: "9px 20px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", color: "#4f46e5", fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    + Generate First Payroll
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Employee", "Basic", "HRA", "Allowances", "Deductions", "Net Salary", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "'Times New Roman', Times, serif", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
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
                            <div style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{empName}</div>
                            <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b", marginTop: 2 }}>{p.employeeId?.employeeCode || ""}</div>
                          </td>
                          {[p.basic, p.hra, p.allowances, p.deductions].map((v, idx) => (
                            <td key={idx} style={{ padding: "14px 16px", fontFamily: "'Times New Roman', Times, serif", fontSize: 13, color: idx === 3 ? "#ef4444" : "#475569" }}>
                              {idx === 3 ? `-${fmtINR(v)}` : fmtINR(v)}
                            </td>
                          ))}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 700, fontSize: 15, color: "#10b981" }}>{fmtINR(p.netSalary)}</span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: "'Times New Roman', Times, serif", fontSize: 11, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {st.icon} {p.paidStatus}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {p.paidStatus !== "Paid" && (
                                <button className="pr-action"
                                  onClick={() => setConfirmPay({ _id: p._id, name: empName, amount: p.netSalary })}
                                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                                  ✓ Mark Paid
                                </button>
                              )}
                              {p.paidStatus !== "Paid" && (
                                <button className="pr-action"
                                  onClick={() => { setEditData(p); setShowModal(true); }}
                                  style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.2)" }}>
                                  ✎ Edit
                                </button>
                              )}
                              {p.paidStatus === "Paid" && (
                                <span style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: 11, color: "#64748b" }}>
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