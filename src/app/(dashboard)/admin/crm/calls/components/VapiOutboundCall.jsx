"use client";

import { useState, useEffect, useRef } from "react";

export default function VapiOutboundCall({ onCallLog }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [callState, setCallState] = useState("idle"); // idle | calling | active | ended | failed
  const [callId, setCallId] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState("");
  const [callLogs, setCallLogs] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Poll call status every 5s while active
  useEffect(() => {
    if (callId && (callState === "calling" || callState === "active")) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/crm/calls/vapi/make-call?callId=${callId}`);
          const data = await res.json();
          if (data.status === "in-progress") {
            setCallState("active");
            setStatusMsg("Call in progress...");
          } else if (["ended", "completed"].includes(data.status)) {
            setCallState("ended");
            setStatusMsg("Call ended");
            clearInterval(pollRef.current);
            const log = {
              id: Date.now(),
              callId: data.id,
              customer: customerName || phoneNumber,
              phone: phoneNumber,
              duration: callDuration,
              status: data.endedReason || "completed",
              timestamp: new Date().toLocaleString("en-IN"),
            };
            setCallLogs(prev => [log, ...prev]);
            onCallLog?.(log);
            setTimeout(() => setCallState("idle"), 2000);
          } else if (data.status === "failed") {
            setCallState("failed");
            setError("Call failed: " + (data.endedReason || "unknown reason"));
            clearInterval(pollRef.current);
            setTimeout(() => setCallState("idle"), 3000);
          }
        } catch { /* silent poll error */ }
      }, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [callId, callState]); // eslint-disable-line

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Format Indian number to E.164
  const formatToE164 = (num) => {
    const digits = num.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith("+")) return num.replace(/\s/g, "");
    return `+${digits}`;
  };

  const makeCall = async () => {
    if (!phoneNumber.trim()) { setError("Phone number daalo"); return; }
    setError("");
    setCallState("calling");
    setStatusMsg("Connecting...");

    const formatted = formatToE164(phoneNumber);

    try {
      const res = await fetch("/api/crm/calls/vapi/make-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerNumber: formatted,
          customerName: customerName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Call failed");
      }

      setCallId(data.callId);
      setCallState("active");
      setStatusMsg(`Call initiated! ID: ${data.callId?.slice(0, 8)}...`);
    } catch (err) {
      setError(err.message);
      setCallState("failed");
      setTimeout(() => setCallState("idle"), 3000);
    }
  };

  const endCall = async () => {
    if (!callId) return;
    try {
      // VAPI doesn't have a direct "end call" REST endpoint — 
      // calls end via maxDuration or customer hangup
      // We just update UI state
      clearInterval(pollRef.current);
      setCallState("ended");
      setStatusMsg("Call ended by agent");
      const log = {
        id: Date.now(), callId,
        customer: customerName || phoneNumber,
        phone: phoneNumber,
        duration: callDuration,
        status: "ended-by-agent",
        timestamp: new Date().toLocaleString("en-IN"),
      };
      setCallLogs(prev => [log, ...prev]);
      onCallLog?.(log);
      setTimeout(() => { setCallState("idle"); setCallId(null); }, 1800);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="vapi-wrap">

      {/* Setup Warning */}
      <div className="setup-banner">
        <span className="sb-icon">⚙️</span>
        <div>
          <strong>VAPI Setup Required</strong> — 
          <span> .env.local mein </span>
          <code>VAPI_API_KEY</code> aur <code>VAPI_PHONE_NUMBER_ID</code> daalo.
          <a href="https://dashboard.vapi.ai" target="_blank" rel="noreferrer"> dashboard.vapi.ai ↗</a>
        </div>
      </div>

      {/* India Note */}
      <div className="india-note">
        <span>🇮🇳</span>
        <div>
          <strong>Indian Numbers ke liye:</strong> Free VAPI number sirf US calls kar sakta hai. 
          Indian numbers ke liye <strong>Twilio number import</strong> karo VAPI dashboard mein — 
          phir <code>VAPI_PHONE_NUMBER_ID</code> update karo.
        </div>
      </div>

      <div className="vapi-grid">

        {/* LEFT — Dialer */}
        <div className="dialer-panel">
          <div className="dialer-header">
            <div className="dh-icon">📲</div>
            <div>
              <div className="dh-title">VAPI Outbound Dialer</div>
              <div className="dh-sub">AI Voice Agent · Real Phone Call</div>
            </div>
          </div>

          <div className="form-group">
            <label className="flabel">Customer Name</label>
            <input
              className="finput"
              placeholder="Rahul Sharma"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              disabled={callState !== "idle"}
            />
          </div>

          <div className="form-group">
            <label className="flabel">Phone Number</label>
            <div className="phone-row">
              <span className="country-code">+91</span>
              <input
                className="finput phone-input"
                placeholder="7738961799"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                disabled={callState !== "idle"}
                maxLength={15}
                onKeyDown={e => e.key === "Enter" && callState === "idle" && makeCall()}
              />
            </div>
            <div className="fhint">10-digit Indian number daalo (auto +91 prefix hoga)</div>
          </div>

          {callState === "idle" && (
            <button className="call-btn" onClick={makeCall} disabled={!phoneNumber.trim()}>
              <span className="cbicon">📞</span>
              Call Karo
            </button>
          )}

          {callState === "calling" && (
            <div className="status-box calling">
              <div className="spin-ring" />
              <div>
                <div className="sb-title">Connecting...</div>
                <div className="sb-num">{formatToE164(phoneNumber)}</div>
              </div>
            </div>
          )}

          {callState === "active" && (
            <div className="active-box">
              <div className="active-header">
                <div className="pulse-dot" />
                <span>Live Call</span>
                <span className="timer-live">{formatTime(callDuration)}</span>
              </div>
              <div className="active-num">{formatToE164(phoneNumber)}</div>
              {statusMsg && <div className="status-msg">{statusMsg}</div>}
              <button className="end-btn" onClick={endCall}>📵 End Call</button>
            </div>
          )}

          {callState === "ended" && (
            <div className="status-box ended">
              <span className="sb-check">✅</span>
              <div>
                <div className="sb-title">Call Ended</div>
                <div className="sb-num">Duration: {formatTime(callDuration)}</div>
              </div>
            </div>
          )}

          {callState === "failed" && (
            <div className="status-box failed">
              <span>❌</span>
              <div className="sb-title">Call Failed</div>
            </div>
          )}

          {error && (
            <div className="err-box">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")} className="clr-err">✕</button>
            </div>
          )}
        </div>

        {/* RIGHT — Call Logs */}
        <div className="logs-panel">
          <div className="logs-header">
            📋 Recent Calls
            {callLogs.length > 0 && <span className="logs-count">{callLogs.length}</span>}
          </div>

          {callLogs.length === 0 ? (
            <div className="logs-empty">
              <div style={{ fontSize: 36, marginBottom: 8 }}>📵</div>
              <p>Koi call nahi abhi tak</p>
              <small>Call karo — yahan log dikhega</small>
            </div>
          ) : (
            <div className="log-list">
              {callLogs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="li-icon">📲</div>
                  <div className="li-info">
                    <div className="li-name">{log.customer}</div>
                    <div className="li-phone">{log.phone}</div>
                    <div className="li-meta">
                      <span className={`li-status ${log.status.includes("ended") ? "s-end" : "s-ok"}`}>
                        {log.status}
                      </span>
                      <span>·</span>
                      <span>{formatTime(log.duration)}</span>
                    </div>
                  </div>
                  <div className="li-time">{log.timestamp.split(",")[1]?.trim()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .vapi-wrap {
          display: flex; flex-direction: column; gap: 16px;
          font-family: 'Segoe UI', sans-serif; color: #e8e8f0;
        }

        /* Banners */
        .setup-banner {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.25);
          border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #c0b8ff;
          line-height: 1.5;
        }
        .sb-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .setup-banner code {
          background: rgba(108,99,255,0.2); padding: 1px 6px;
          border-radius: 4px; font-size: 12px; color: #a89fff;
        }
        .setup-banner a { color: #6c63ff; margin-left: 4px; }

        .india-note {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(255,160,50,0.07); border: 1px solid rgba(255,160,50,0.22);
          border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #ffcc88;
          line-height: 1.5;
        }
        .india-note code {
          background: rgba(255,160,50,0.15); padding: 1px 6px;
          border-radius: 4px; font-size: 12px;
        }

        /* Grid */
        .vapi-grid {
          display: grid; grid-template-columns: 360px 1fr; gap: 20px; min-height: 500px;
        }

        /* Dialer Panel */
        .dialer-panel {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 18px;
        }

        .dialer-header { display: flex; align-items: center; gap: 14px; }
        .dh-icon {
          width: 46px; height: 46px; border-radius: 13px;
          background: linear-gradient(135deg, #6c63ff22, #3ecfcf22);
          border: 1px solid rgba(108,99,255,0.3);
          display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .dh-title { font-size: 16px; font-weight: 700; }
        .dh-sub { font-size: 12px; color: #5a5a7a; margin-top: 2px; }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .flabel { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #5a5a7a; }
        .finput {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px; padding: 11px 14px; color: #e8e8f0; font-size: 14px; outline: none;
          transition: border-color 0.2s; width: 100%; box-sizing: border-box;
        }
        .finput:focus { border-color: rgba(108,99,255,0.45); }
        .finput:disabled { opacity: 0.4; cursor: not-allowed; }
        .fhint { font-size: 11px; color: #4a4a6a; }

        .phone-row { display: flex; align-items: center; gap: 0; }
        .country-code {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          border-right: none; border-radius: 11px 0 0 11px; padding: 11px 13px;
          font-size: 14px; color: #7a7a9a; flex-shrink: 0;
        }
        .phone-input { border-radius: 0 11px 11px 0 !important; flex: 1; }

        .call-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #3ecfcf, #6c63ff);
          color: white; font-size: 16px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.3px;
        }
        .call-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(108,99,255,0.3); }
        .call-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .cbicon { font-size: 20px; }

        /* Status boxes */
        .status-box {
          display: flex; align-items: center; gap: 14px;
          padding: 16px; border-radius: 13px;
        }
        .status-box.calling {
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2);
        }
        .status-box.ended {
          background: rgba(62,207,207,0.06); border: 1px solid rgba(62,207,207,0.15);
        }
        .status-box.failed {
          background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2);
          color: #ff9999; justify-content: center;
        }

        .spin-ring {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          border: 3px solid rgba(108,99,255,0.2);
          border-top-color: #6c63ff;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sb-title { font-size: 14px; font-weight: 600; }
        .sb-num { font-size: 12px; color: #6b6b88; margin-top: 2px; }
        .sb-check { font-size: 28px; }

        .active-box {
          background: rgba(62,207,207,0.06); border: 1px solid rgba(62,207,207,0.2);
          border-radius: 13px; padding: 16px; display: flex; flex-direction: column; gap: 10px;
        }
        .active-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 600; color: #3ecfcf;
        }
        .pulse-dot {
          width: 10px; height: 10px; border-radius: 50%; background: #3ecfcf;
          animation: pdot 1s ease infinite alternate;
        }
        @keyframes pdot {
          from { box-shadow: 0 0 0 0 rgba(62,207,207,0.5); }
          to   { box-shadow: 0 0 0 6px rgba(62,207,207,0); }
        }
        .timer-live {
          margin-left: auto; font-size: 18px; font-weight: 700;
          font-variant-numeric: tabular-nums; letter-spacing: 1px;
        }
        .active-num { font-size: 15px; font-weight: 600; color: #e8e8f0; }
        .status-msg { font-size: 12px; color: #6b6b88; }
        .end-btn {
          padding: 11px; border-radius: 11px;
          border: 1px solid rgba(255,107,107,0.3); background: rgba(255,107,107,0.1);
          color: #ff6b6b; cursor: pointer; font-size: 13px; font-weight: 600;
          transition: all 0.2s;
        }
        .end-btn:hover { background: rgba(255,107,107,0.2); }

        .err-box {
          background: rgba(255,107,107,0.07); border: 1px solid rgba(255,107,107,0.2);
          border-radius: 11px; padding: 10px 13px; font-size: 12px; color: #ff9999;
          display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
        }
        .clr-err { margin-left: auto; background: none; border: none; color: #ff6b6b; cursor: pointer; }

        /* Logs Panel */
        .logs-panel {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px; display: flex; flex-direction: column; overflow: hidden;
        }
        .logs-header {
          padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
        }
        .logs-count {
          background: rgba(108,99,255,0.2); color: #a89fff;
          font-size: 11px; padding: 2px 8px; border-radius: 10px;
        }
        .logs-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: #5a5a7a; text-align: center; gap: 4px; padding: 40px;
        }
        .logs-empty p { font-size: 15px; font-weight: 500; margin: 0; }
        .logs-empty small { font-size: 12px; }

        .log-list { overflow-y: auto; flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .log-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
        }
        .li-icon { font-size: 20px; flex-shrink: 0; }
        .li-info { flex: 1; min-width: 0; }
        .li-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .li-phone { font-size: 12px; color: #6b6b88; margin-bottom: 4px; }
        .li-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #5a5a7a; }
        .li-status { padding: 2px 7px; border-radius: 6px; font-weight: 600; font-size: 10px; }
        .s-ok  { background: rgba(62,207,207,0.12); color: #3ecfcf; }
        .s-end { background: rgba(255,107,107,0.1);  color: #ff9999; }
        .li-time { font-size: 11px; color: #4a4a6a; flex-shrink: 0; }

        @media(max-width:768px) {
          .vapi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}