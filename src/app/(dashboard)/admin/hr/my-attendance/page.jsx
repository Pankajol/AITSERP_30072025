"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";

// ─── Live Clock ───────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Format helpers ───────────────────────────────────────────
function fmt12(date) {
  if (!date) return "--:--:-- --";
  return new Date(date instanceof Date ? date : Date.now())
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function fmtDate(date) {
  return date.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function msToHMS(ms) {
  if (!ms || ms <= 0) return "0h 0m 0s";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

// ─── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  Present:       { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  icon: "✦" },
  "Half Day":    { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "◑" },
  Absent:        { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: "✕" },
  "Geo-Violation":{ color: "#a855f7", bg: "rgba(168,85,247,0.12)", icon: "⚠" },
  "Not Marked":  { color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "○" },
};

// ─── Toast component ───────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#0f172a" : "#1e0a0a",
          border: `1px solid ${t.type === "success" ? "#22c55e44" : "#ef444444"}`,
          color: t.type === "success" ? "#22c55e" : "#ef4444",
          padding: "12px 20px", borderRadius: 12, fontSize: 14, fontFamily: "'DM Mono', monospace",
          boxShadow: `0 8px 32px ${t.type === "success" ? "#22c55e22" : "#ef444422"}`,
          animation: "slideIn 0.3s ease",
          display: "flex", alignItems: "center", gap: 10, minWidth: 260,
        }}>
          <span style={{ fontSize: 18 }}>{t.type === "success" ? "✦" : "✕"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Animated ring progress ────────────────────────────────────
function RingProgress({ percent, color, size = 160, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function MyAttendancePage() {
  const now = useLiveClock();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [location, setLocation] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [punchAnim, setPunchAnim] = useState(null); // "in" | "out" | null
  const toastId = useRef(0);

  useEffect(() => { getTodayAttendance(); }, []);

  // ─ Live elapsed time while working ─
  const elapsedMs = (() => {
    if (!attendance?.punchIn?.timestamp) return 0;
    if (attendance?.punchOut?.timestamp) return attendance.punchOut.timestamp - attendance.punchIn.timestamp;
    return now.getTime() - attendance.punchIn.timestamp;
  })();

  const totalHoursGoal = 9;
  const workedHours = elapsedMs / (1000 * 60 * 60);
  const ringPercent = Math.min((workedHours / totalHoursGoal) * 100, 100);

  const isPunchedIn  = !!attendance?.punchIn?.time;
  const isPunchedOut = !!attendance?.punchOut?.time;
  const isWorking    = isPunchedIn && !isPunchedOut;
  const status       = attendance?.status || "Not Marked";
  const statusCfg    = STATUS_CONFIG[status] || STATUS_CONFIG["Not Marked"];

  // ─ Toast helper ─
  const addToast = (message, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  // ─ Geolocation ─
  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      pos => { const l = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setLocation(l); resolve(l); },
      err => reject(err.message || "Location denied")
    );
  });

  // ─ Fetch attendance ─
  const getTodayAttendance = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/hr/my-attendance", { headers: { Authorization: `Bearer ${token}` } });
      setAttendance(res.data.data || null);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setFetching(false);
    }
  };

  // ─ Punch In ─
  const handlePunchIn = async () => {
    try {
      setLoading(true);
      setPunchAnim("in");
      const loc = await getLocation();
      const token = localStorage.getItem("token");
      await axios.post("/api/hr/my-attendance",
        { type: "in", latitude: loc.lat, longitude: loc.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast("Punch In recorded successfully", "success");
      await getTodayAttendance();
    } catch (err) {
      addToast(err?.response?.data?.message || err.message || "Punch In failed", "error");
    } finally {
      setLoading(false);
      setTimeout(() => setPunchAnim(null), 800);
    }
  };

  // ─ Punch Out ─
  const handlePunchOut = async () => {
    try {
      setLoading(true);
      setPunchAnim("out");
      const loc = await getLocation();
      const token = localStorage.getItem("token");
      await axios.post("/api/hr/my-attendance",
        { type: "out", latitude: loc.lat, longitude: loc.lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast("Punch Out recorded successfully", "success");
      await getTodayAttendance();
    } catch (err) {
      addToast(err?.response?.data?.message || err.message || "Punch Out failed", "error");
    } finally {
      setLoading(false);
      setTimeout(() => setPunchAnim(null), 800);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70%  { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes popIn {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }

        .att-page * { box-sizing: border-box; }

        .att-page {
          min-height: 100vh;
          background: #060b14;
          font-family: 'Syne', sans-serif;
          color: #e2e8f0;
          padding: 32px 20px 60px;
        }

        .skeleton {
          background: linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%);
          background-size: 400px 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }

        .card {
          background: #0d1829;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          animation: fadeUp 0.5s ease both;
        }

        .punch-btn {
          position: relative;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.5px;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .punch-btn:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.1); }
        .punch-btn:not(:disabled):active { transform: translateY(0) scale(0.97); }
        .punch-btn:disabled { opacity: 0.38; cursor: not-allowed; }

        .btn-in  { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff;
                   box-shadow: 0 4px 20px rgba(34,197,94,0.3); }
        .btn-out { background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff;
                   box-shadow: 0 4px 20px rgba(239,68,68,0.3); }

        .live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
          animation: blink 1.4s ease-in-out infinite;
        }

        .info-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .info-row:last-child { border-bottom: none; }

        .tag {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.3px;
        }
      `}</style>

      <Toast toasts={toasts} />

      <div className="att-page">
        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              {isWorking && <div className="live-dot" />}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase" }}>
                {isWorking ? "Currently Working" : "Attendance"}
              </span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f8fafc", margin: 0, lineHeight: 1.1 }}>
              My Attendance
            </h1>
            <p style={{ margin: "6px 0 0", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#64748b" }}>
              {fmtDate(now)}
            </p>
          </div>

          {/* ── Clock Card ── */}
          <div className="card" style={{ padding: "28px 24px", marginBottom: 16, textAlign: "center", animationDelay: "0.05s" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 46, fontWeight: 500, color: "#f1f5f9", letterSpacing: -1, lineHeight: 1 }}>
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
            <div style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#475569" }}>
              {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          {/* ── Progress + Status ── */}
          <div className="card" style={{ padding: "28px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 24, animationDelay: "0.1s" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <RingProgress percent={ringPercent} color={statusCfg.color} size={120} stroke={8} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 22, color: statusCfg.color }}>{statusCfg.icon}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
                  {Math.round(ringPercent)}%
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
                Time Worked
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}>
                {fetching ? <div className="skeleton" style={{ width: 120, height: 32 }} /> : msToHMS(elapsedMs)}
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="tag" style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}33` }}>
                  {statusCfg.icon} {status}
                </span>
              </div>
              <div style={{ marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#334155" }}>
                Goal: {totalHoursGoal}h workday
              </div>
            </div>
          </div>

          {/* ── Punch Info ── */}
          <div className="card" style={{ padding: "8px 24px", marginBottom: 16, animationDelay: "0.15s" }}>
            {fetching ? (
              [1,2,3].map(i => (
                <div key={i} style={{ padding: "16px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div className="skeleton" style={{ width: "60%", height: 16 }} />
                </div>
              ))
            ) : (
              <>
                <div className="info-row">
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5 }}>Punch In</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: attendance?.punchIn?.time ? "#22c55e" : "#334155", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                      {attendance?.punchIn?.time || "--:-- --"}
                    </div>
                  </div>
                  {attendance?.punchIn?.time && (
                    <span className="tag" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11 }}>
                      ✓ Recorded
                    </span>
                  )}
                </div>

                <div className="info-row">
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5 }}>Punch Out</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: attendance?.punchOut?.time ? "#ef4444" : "#334155", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                      {attendance?.punchOut?.time || "--:-- --"}
                    </div>
                  </div>
                  {attendance?.punchOut?.time && (
                    <span className="tag" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11 }}>
                      ✓ Recorded
                    </span>
                  )}
                </div>

                <div className="info-row">
                  <div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5 }}>Total Hours</div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: "#f1f5f9", marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                      {attendance?.totalHours ? `${attendance.totalHours}h` : isWorking ? msToHMS(elapsedMs) : "0h"}
                    </div>
                  </div>
                  {location && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569" }}>
                      📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Punch Buttons ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, animationDelay: "0.2s", animation: "fadeUp 0.5s ease both" }}>
            <button
              className="punch-btn btn-in"
              onClick={handlePunchIn}
              disabled={loading || !!attendance?.punchIn?.time}
              style={{ padding: "18px 0", animationDelay: "0.2s",
                ...(punchAnim === "in" ? { animation: "popIn 0.4s ease" } : {}) }}
            >
              {loading && punchAnim === "in" ? (
                <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                  Punch In
                </>
              )}
            </button>

            <button
              className="punch-btn btn-out"
              onClick={handlePunchOut}
              disabled={loading || !attendance?.punchIn?.time || !!attendance?.punchOut?.time}
              style={{ padding: "18px 0",
                ...(punchAnim === "out" ? { animation: "popIn 0.4s ease" } : {}),
                ...(isWorking ? { animation: "pulse-ring 2s ease infinite" } : {}) }}
            >
              {loading && punchAnim === "out" ? (
                <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12l7 7 7-7"/>
                  </svg>
                  Punch Out
                </>
              )}
            </button>
          </div>

          {/* ── State hint ── */}
          <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#334155", animation: "fadeUp 0.5s ease 0.25s both" }}>
            {!isPunchedIn && !isPunchedOut && "Tap Punch In to start your workday"}
            {isWorking && "You're clocked in — tap Punch Out when done"}
            {isPunchedIn && isPunchedOut && "✦ Workday complete — see you tomorrow!"}
          </div>

        </div>
      </div>
    </>
  );
}