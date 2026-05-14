"use client";

import { useEffect, useState } from "react";

// ---------- Indian Holidays Generator (improved) ----------
function getIndianHolidays(year) {
  // Fixed national holidays
  const fixed = [
    { date: `${year}-01-26`, title: "Republic Day", description: "National holiday" },
    { date: `${year}-08-15`, title: "Independence Day", description: "National holiday" },
    { date: `${year}-10-02`, title: "Gandhi Jayanti", description: "National holiday" },
    { date: `${year}-05-01`, title: "Labour Day", description: "International Workers' Day" },
    { date: `${year}-01-01`, title: "New Year's Day", description: "Gregorian New Year" },
    { date: `${year}-12-25`, title: "Christmas", description: "Birth of Jesus Christ" },
    { date: `${year}-04-14`, title: "Ambedkar Jayanti", description: "Birth anniversary of Dr. B.R. Ambedkar" },
  ];

  // Festival dates – approximate but yearly adjusted for key festivals
  // In production, replace with a proper library like 'indian-holidays'
  const festivals = [
    { date: `${year}-01-14`, title: "Makar Sankranti / Pongal", description: "Harvest festival" },
    { date: `${year}-03-08`, title: "Maha Shivaratri", description: "Lord Shiva festival" },
    { date: `${year}-03-25`, title: "Holi", description: "Festival of colours" },
    { date: `${year}-04-02`, title: "Ram Navami", description: "Birth of Lord Rama" },
    { date: `${year}-05-13`, title: "Eid-ul-Fitr", description: "End of Ramadan (approx)" },
    { date: `${year}-08-19`, title: "Raksha Bandhan", description: "Brother-sister festival" },
    { date: `${year}-08-26`, title: "Janmashtami", description: "Birth of Lord Krishna" },
    { date: `${year}-09-07`, title: "Ganesh Chaturthi", description: "Birth of Lord Ganesha" },
    { date: `${year}-10-12`, title: "Dussehra (Vijayadashami)", description: "Victory of good over evil" },
    { date: `${year}-11-12`, title: "Diwali", description: "Festival of lights (main)" },
    { date: `${year}-11-15`, title: "Bhai Dooj", description: "Brother-sister festival" },
    { date: `${year}-09-27`, title: "Milad-un-Nabi", description: "Prophet Muhammad's birthday (approx)" },
  ];

  // Remove duplicates by date (some festivals may overlap with fixed holidays)
  const all = [...fixed, ...festivals];
  const unique = all.filter((h, idx, self) => self.findIndex(h2 => h2.date === h.date) === idx);
  return unique;
}

export default function HolidaysPage() {
  const token = () => localStorage.getItem("token") || "";
  const [user, setUser] = useState(null);
  const can = (action) => {
    if (!user) return false;
    if (user.role === "Admin" || user.type === "company") return true;
    return user.permissions?.holidays?.includes(action);
  };
  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [addingHolidays, setAddingHolidays] = useState(false);
  const [autoLoadAsked, setAutoLoadAsked] = useState(false); // avoid repeated prompts

  useEffect(() => {
    load();
  }, [year]);

  // Auto-load Indian holidays when year changes and no holidays exist (ask once)
  useEffect(() => {
    if (!loading && items.length === 0 && can("create") && !autoLoadAsked) {
      const shouldLoad = confirm(`No holidays found for ${year}. Load Indian holidays automatically?`);
      if (shouldLoad) {
        addIndianHolidays();
      }
      setAutoLoadAsked(true);
    } else if (items.length > 0) {
      setAutoLoadAsked(false); // reset if user adds manually later
    }
  }, [loading, items, year]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/hr/holidays?year=${year}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    setItems(data.data || []);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const url = form._id ? `/api/hr/holidays/${form._id}` : "/api/hr/holidays";
    const res = await fetch(url, {
      method: form._id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShow(false);
      load();
    } else {
      alert(data.message);
    }
    setSaving(false);
  }

  async function del(id) {
    if (!confirm("Delete this holiday?")) return;
    await fetch(`/api/hr/holidays/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    load();
  }

  async function addIndianHolidays() {
    const holidays = getIndianHolidays(parseInt(year));
    const existingDates = new Set(items.map(h => h.date));
    const toAdd = holidays.filter(h => !existingDates.has(h.date));
    if (toAdd.length === 0) {
      alert("All Indian holidays for this year are already added.");
      return;
    }
    setAddingHolidays(true);
    let successCount = 0;
    for (const h of toAdd) {
      const res = await fetch("/api/hr/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(h),
      });
      const data = await res.json();
      if (data.success) successCount++;
    }
    setAddingHolidays(false);
    alert(`${successCount} Indian holidays added for ${year}.`);
    load();
  }

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div>
          <p style={S.bc}>HR / Holidays</p>
          <h1 style={S.title}>Holiday Calendar</h1>
        </div>
        <div style={S.acts}>
          <select style={S.inp} value={year} onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          {can("create") && (
            <>
              <button
                style={{ ...S.btn, background: "#10b981" }}
                onClick={addIndianHolidays}
                disabled={addingHolidays}
              >
                {addingHolidays ? "Adding..." : "🇮🇳 Load Indian Holidays"}
              </button>
              <button
                style={{ ...S.btn, background: "#ef4444" }}
                onClick={() => {
                  setForm({});
                  setShow(true);
                }}
              >
                + Add Holiday
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>Loading holidays…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {items
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((h) => {
              const d = new Date(h.date);
              const months = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
              ];
              return (
                <div
                  key={h._id}
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    border: "1px solid #e2e8f0",
                    padding: "1.25rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "flex-start",
                    position: "relative",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      background: "#fef2f2",
                      borderRadius: "16px",
                      padding: "0.75rem",
                      textAlign: "center",
                      minWidth: 60,
                    }}
                  >
                    <div style={{ color: "#ef4444", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>
                      {d.getDate()}
                    </div>
                    <div style={{ color: "#ef4444", fontSize: "0.7rem", fontWeight: 600 }}>
                      {months[d.getMonth()]}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{h.title}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {h.description || "Public Holiday"}
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: "0.75rem",
                      right: "0.75rem",
                      display: "flex",
                      gap: "0.4rem",
                    }}
                  >
                    {can("update") && (
                      <button
                        style={S.ib}
                        onClick={() => {
                          setForm(h);
                          setShow(true);
                        }}
                      >
                        ✏️
                      </button>
                    )}
                    {can("delete") && (
                      <button
                        style={{ ...S.ib, color: "#ef4444" }}
                        onClick={() => del(h._id)}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          {!items.length && (
            <div style={{ color: "#64748b", padding: "2rem", textAlign: "center" }}>
              No holidays for {year}. Click "Load Indian Holidays" to populate.
            </div>
          )}
        </div>
      )}

      {show && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.mHead}>
              <h2 style={{ margin: 0, color: "#0f172a" }}>{form._id ? "Edit" : "Add"} Holiday</h2>
              <button style={S.cls} onClick={() => setShow(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
              <div>
                <label style={S.lbl}>Title *</label>
                <input
                  style={S.inp2}
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label style={S.lbl}>Date *</label>
                <input
                  type="date"
                  style={S.inp2}
                  value={form.date || ""}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label style={S.lbl}>Description</label>
                <input
                  style={S.inp2}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                padding: "0 1.5rem 1.5rem",
              }}
            >
              <button style={S.cancelBtn} onClick={() => setShow(false)}>
                Cancel
              </button>
              <button
                style={{ ...S.btn, background: "#ef4444" }}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Light Theme Styles (Times New Roman) ─────────────────────────────
const S = {
  page: {
    padding: "2rem",
    background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
    minHeight: "100vh",
    fontFamily: "'Times New Roman', Times, serif",
    color: "#0f172a",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  bc: {
    fontSize: "0.72rem",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: 0,
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
  },
  acts: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    alignItems: "center",
  },
  btn: {
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0.5rem 1.25rem",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "transform 0.1s",
  },
  inp: {
    background: "white",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    borderRadius: "10px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.85rem",
    outline: "none",
  },
  ib: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "0.3rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "background 0.2s",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    borderRadius: "24px",
    border: "1px solid #e2e8f0",
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 20px 35px -12px rgba(0,0,0,0.15)",
  },
  mHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem 1.5rem",
    borderBottom: "1px solid #e2e8f0",
  },
  cls: {
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "1.2rem",
  },
  lbl: {
    display: "block",
    fontSize: "0.7rem",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.35rem",
    fontWeight: 600,
  },
  inp2: {
    width: "100%",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    borderRadius: "10px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #cbd5e1",
    color: "#475569",
    borderRadius: "10px",
    padding: "0.5rem 1.25rem",
    cursor: "pointer",
  },
};