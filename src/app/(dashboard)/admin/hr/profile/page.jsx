"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
          animation: "pr-slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span>{t.type === "success" ? "✦" : "✕"}</span>{t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Avatar with initials ─────────────────────────────────────
function Avatar({ name, size = 96 }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";
  const colors = [
    ["#1d4ed8","#3b82f6"], ["#7c3aed","#a78bfa"],
    ["#0f766e","#2dd4bf"], ["#b45309","#fbbf24"],
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  const [from, to] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${from}, ${to})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 800, color: "#fff",
      fontFamily: "'Syne', sans-serif",
      boxShadow: `0 8px 32px ${from}55`,
      flexShrink: 0,
      border: "3px solid rgba(255,255,255,0.08)",
    }}>
      {initials}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────
function InfoRow({ label, value, icon, editable, editValue, onChange, delay }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", animation: `pr-fadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        {label}
      </div>
      {editable && onChange ? (
        <input
          type="text"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
            color: "#e2e8f0", fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600,
            outline: "none", transition: "border 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.7)"}
          onBlur={e => e.target.style.borderColor = "rgba(59,130,246,0.3)"}
        />
      ) : (
        <div style={{ fontSize: 15, fontWeight: 600, color: value ? "#e2e8f0" : "#334155" }}>
          {value || "—"}
        </div>
      )}
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────
function PasswordModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPass !== form.confirm) {
      onSuccess("Passwords do not match", "error"); return;
    }
    if (form.newPass.length < 6) {
      onSuccess("Password must be at least 6 characters", "error"); return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put("/api/hr/my-profile/password", { currentPassword: form.current, newPassword: form.newPass }, { headers: { Authorization: `Bearer ${token}` } });
      onSuccess("Password changed successfully");
      setForm({ current: "", newPass: "", confirm: "" });
      onClose();
    } catch (err) {
      onSuccess(err?.response?.data?.message || "Failed to change password", "error");
    } finally { setLoading(false); }
  };

  const eyeBtn = (field) => (
    <button type="button" onClick={() => setShow(p => ({ ...p, [field]: !p[field] }))}
      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>
      {show[field] ? "◎" : "●"}
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)", zIndex: 100, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: open ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.92)",
        width: "min(420px, 92vw)", background: "#0a0f1e",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
        padding: "32px 28px", zIndex: 101,
        opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 2 }}>Security</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#f1f5f9", margin: "4px 0 0" }}>Change Password</h3>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8", width: 34, height: 34, borderRadius: 8, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[["current","Current Password"],["newPass","New Password"],["confirm","Confirm Password"]].map(([field, label]) => (
            <div key={field}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 7 }}>{label}</label>
              <div style={{ position: "relative" }}>
                <input type={show[field] ? "text" : "password"} required value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 40px 10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }}
                />
                {eyeBtn(field)}
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ marginTop: 6, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "pr-spin 0.7s linear infinite" }} /> : "🔒 Update Password"}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({ name: "", email: "" });
  const [saving, setSaving]     = useState(false);
  const [pwModal, setPwModal]   = useState(false);
  const [toasts, setToasts]     = useState([]);
  const toastId = useRef(0);

  const addToast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    axios.get("/api/hr/my-profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const d = res.data.data;
        setUser(d);
        setForm({ name: d.fullName || "", email: d.email || "" });
      })
      .catch(() => router.push("/login"));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      await axios.put("/api/hr/my-profile", { fullName: form.name }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(p => ({ ...p, fullName: form.name }));
      setEditMode(false);
      addToast("Profile updated successfully");
    } catch {
      addToast("Failed to update profile", "error");
    } finally { setSaving(false); }
  };

  const handleLogout = () => { localStorage.clear(); router.push("/login"); };

  // ─ Skeleton loader ─
  if (!user) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        @keyframes pr-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .pr-skeleton { background:linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%); background-size:400px 100%; animation:pr-shimmer 1.4s infinite; border-radius:8px; }
        .pr-page * { box-sizing:border-box; }
        .pr-page { min-height:100vh; background:#060b14; padding:32px 20px; }
      `}</style>
      <div className="pr-page">
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 32 }}>
            <div className="pr-skeleton" style={{ width: 96, height: 96, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="pr-skeleton" style={{ width: "50%", height: 28, marginBottom: 10 }} />
              <div className="pr-skeleton" style={{ width: "30%", height: 18 }} />
            </div>
          </div>
          {[1,2,3,4,5].map(i => <div key={i} className="pr-skeleton" style={{ height: 56, marginBottom: 12 }} />)}
        </div>
      </div>
    </>
  );

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : null;

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
        .pr-action-btn { display:flex; align-items:center; gap:8px; padding:11px 20px; border-radius:11px; border:none; font-family:'Syne',sans-serif; font-weight:700; font-size:14px; cursor:pointer; transition:all 0.2s; }
        .pr-action-btn:hover { transform:translateY(-2px); filter:brightness(1.1); }
        .pr-action-btn:active { transform:translateY(0) scale(0.97); }
      `}</style>

      <Toast toasts={toasts} />
      <PasswordModal open={pwModal} onClose={() => setPwModal(false)} onSuccess={addToast} />

      <div className="pr-page">
        <div style={{ maxWidth: 700, margin: "0 auto" }}>

          {/* ── Page header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, animation: "pr-fadeUp 0.4s ease" }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>HR Portal</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0 }}>My Profile</h1>
            </div>
            <button className="pr-action-btn" onClick={handleLogout}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              <span>⏻</span> Logout
            </button>
          </div>

          {/* ── Profile hero card ── */}
          <div style={{
            background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20, padding: "28px 28px 24px",
            marginBottom: 16, animation: "pr-fadeUp 0.5s ease 0.05s both",
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          }}>
            <Avatar name={user.fullName} size={88} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2 }}>{user.fullName}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#64748b", marginTop: 5 }}>{user.email}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {user.department?.name && (
                  <span style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>
                    ◈ {user.department.name}
                  </span>
                )}
                {user.designation?.title && (
                  <span style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>
                    ✦ {user.designation.title}
                  </span>
                )}
                <span style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "4px 12px", borderRadius: 20 }}>
                  ● Active
                </span>
              </div>
            </div>
            {joinDate && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#334155", textTransform: "uppercase", letterSpacing: 1.5 }}>Joined</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#64748b", marginTop: 4 }}>{joinDate}</div>
              </div>
            )}
          </div>

          {/* ── Details card ── */}
          <div style={{ background: "#0d1829", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "8px 28px 20px", marginBottom: 16, animation: "pr-fadeUp 0.5s ease 0.1s both" }}>
            <InfoRow label="Full Name" icon="◈" delay={0.12}
              value={user.fullName}
              editable={editMode} editValue={form.name}
              onChange={v => setForm(p => ({ ...p, name: v }))}
            />
            <InfoRow label="Email Address" icon="✉" delay={0.15} value={user.email} />
            <InfoRow label="Department"    icon="◎" delay={0.18} value={user.department?.name} />
            <InfoRow label="Designation"   icon="✦" delay={0.21} value={user.designation?.title} />
            <InfoRow label="Employee Code" icon="⊞" delay={0.24}
              value={user.employeeCode}
            />
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "pr-fadeUp 0.5s ease 0.28s both" }}>
            {editMode ? (
              <>
                <button className="pr-action-btn" onClick={handleSave} disabled={saving}
                  style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", boxShadow: "0 4px 20px rgba(34,197,94,0.3)", opacity: saving ? 0.7 : 1 }}>
                  {saving
                    ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "pr-spin 0.7s linear infinite" }} />
                    : <span>✓</span>
                  }
                  Save Changes
                </button>
                <button className="pr-action-btn" onClick={() => { setEditMode(false); setForm({ name: user.fullName, email: user.email }); }}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
                  ✕ Cancel
                </button>
              </>
            ) : (
              <button className="pr-action-btn" onClick={() => setEditMode(true)}
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}>
                <span>✎</span> Edit Profile
              </button>
            )}

            <button className="pr-action-btn" onClick={() => setPwModal(true)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
              🔒 Change Password
            </button>
          </div>

        </div>
      </div>
    </>
  );
}