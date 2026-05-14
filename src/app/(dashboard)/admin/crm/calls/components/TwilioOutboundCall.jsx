"use client";

import { useState, useEffect, useRef } from "react";

export default function TwilioOutboundCall({ onCallLog }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callSid, setCallSid] = useState(null);
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

  useEffect(() => {
    if (callSid && (callState === "calling" || callState === "active")) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/crm/calls/twilio/status?callSid=${callSid}`);
          const data = await res.json();
          if (data.status === "ringing" || data.status === "in-progress") {
            setCallState("active");
            setStatusMsg("Call connected...");
          } else if (data.status === "completed") {
            setCallState("ended");
            setStatusMsg("Call ended");
            clearInterval(pollRef.current);
            const log = {
              id: Date.now(),
              callSid: data.sid,
              customer: customerName || phoneNumber,
              phone: phoneNumber,
              duration: callDuration,
              status: "completed",
              timestamp: new Date().toLocaleString("en-IN"),
            };
            setCallLogs(prev => [log, ...prev]);
            onCallLog?.(log);
            setTimeout(() => setCallState("idle"), 2000);
          } else if (data.status === "failed" || data.status === "busy" || data.status === "no-answer") {
            setCallState("failed");
            setError(`Call ${data.status}`);
            clearInterval(pollRef.current);
            setTimeout(() => setCallState("idle"), 3000);
          }
        } catch (err) {
          console.error("Poll error", err);
        }
      }, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [callSid, callState]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const formatToE164 = (num) => {
    let digits = num.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.startsWith("+")) return num.replace(/\s/g, "");
    return `+${digits}`;
  };

  const makeCall = async () => {
    if (!phoneNumber.trim()) {
      setError("Phone number daalo");
      return;
    }
    setError("");
    setCallState("calling");
    setStatusMsg("Dialing...");

    const formatted = formatToE164(phoneNumber);

    try {
      const res = await fetch("/api/crm/calls/twilio/make-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formatted,
          customerName: customerName || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Call failed");
      }

      setCallSid(data.callSid);
      setCallState("active");
      setStatusMsg(`Call initiated! SID: ${data.callSid.slice(0, 8)}...`);
    } catch (err) {
      setError(err.message);
      setCallState("failed");
      setTimeout(() => setCallState("idle"), 3000);
    }
  };

  const endCall = async () => {
    if (!callSid) return;
    try {
      await fetch("/api/crm/calls/twilio/end-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callSid }),
      });
      clearInterval(pollRef.current);
      setCallState("ended");
      setStatusMsg("Call ended by agent");
      const log = {
        id: Date.now(),
        callSid,
        customer: customerName || phoneNumber,
        phone: phoneNumber,
        duration: callDuration,
        status: "ended-by-agent",
        timestamp: new Date().toLocaleString("en-IN"),
      };
      setCallLogs(prev => [log, ...prev]);
      onCallLog?.(log);
      setTimeout(() => {
        setCallState("idle");
        setCallSid(null);
      }, 1800);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="twilio-wrap">
      {/* Setup Warning */}
      <div className="setup-banner">
        <span className="sb-icon">📞</span>
        <div>
          <strong>Twilio Setup Required</strong> — 
          <span> .env.local mein </span>
          <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_PHONE_NUMBER</code> daalo.
          <a href="https://console.twilio.com" target="_blank" rel="noreferrer"> Twilio Console ↗</a>
        </div>
      </div>

      <div className="india-note">
        <span>🇮🇳</span>
        <div>
          <strong>Indian Numbers:</strong> Twilio ke saath verified caller ID ya purchased Indian number chahiye. 
          Demo ke liye trial account se sirf verified numbers pe call ho sakta hai.
        </div>
      </div>

      <div className="twilio-grid">
        <div className="dialer-panel">
          <div className="dialer-header">
            <div className="dh-icon">📞</div>
            <div>
              <div className="dh-title">Twilio Outbound Dialer</div>
              <div className="dh-sub">Real Phone Calls · Programmable Voice</div>
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
                placeholder="9876543210"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                disabled={callState !== "idle"}
                maxLength={15}
                onKeyDown={e => e.key === "Enter" && callState === "idle" && makeCall()}
              />
            </div>
            <div className="fhint">10-digit Indian number (auto +91 prefix)</div>
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
                  <div className="li-icon">📞</div>
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
        .twilio-wrap { display: flex; flex-direction: column; gap: 16px; font-family: 'Segoe UI', sans-serif; color: #e8e8f0; }
        .setup-banner { display: flex; align-items: flex-start; gap: 10px; background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.25); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #c0b8ff; line-height: 1.5; }
        .sb-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .setup-banner code { background: rgba(108,99,255,0.2); padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #a89fff; }
        .setup-banner a { color: #6c63ff; margin-left: 4px; }
        .india-note { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,160,50,0.07); border: 1px solid rgba(255,160,50,0.22); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #ffcc88; line-height: 1.5; }
        .india-note code { background: rgba(255,160,50,0.15); padding: 1px 6px; border-radius: 4px; }
        .twilio-grid { display: grid; grid-template-columns: 360px 1fr; gap: 20px; min-height: 500px; }
        .dialer-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 24px; display: flex; flex-direction: column; gap: 18px; }
        .dialer-header { display: flex; align-items: center; gap: 14px; }
        .dh-icon { width: 46px; height: 46px; border-radius: 13px; background: linear-gradient(135deg, #6c63ff22, #3ecfcf22); border: 1px solid rgba(108,99,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .dh-title { font-size: 16px; font-weight: 700; }
        .dh-sub { font-size: 12px; color: #5a5a7a; margin-top: 2px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .flabel { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #5a5a7a; }
        .finput { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 11px; padding: 11px 14px; color: #e8e8f0; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box; }
        .finput:focus { border-color: rgba(108,99,255,0.45); }
        .finput:disabled { opacity: 0.4; cursor: not-allowed; }
        .fhint { font-size: 11px; color: #4a4a6a; }
        .phone-row { display: flex; align-items: center; gap: 0; }
        .country-code { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-right: none; border-radius: 11px 0 0 11px; padding: 11px 13px; font-size: 14px; color: #7a7a9a; flex-shrink: 0; }
        .phone-input { border-radius: 0 11px 11px 0 !important; flex: 1; }
        .call-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 15px; border-radius: 13px; border: none; background: linear-gradient(135deg, #3ecfcf, #6c63ff); color: white; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px; }
        .call-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(108,99,255,0.3); }
        .call-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .cbicon { font-size: 20px; }
        .status-box { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 13px; }
        .status-box.calling { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); }
        .status-box.ended { background: rgba(62,207,207,0.06); border: 1px solid rgba(62,207,207,0.15); }
        .status-box.failed { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.2); color: #ff9999; justify-content: center; }
        .spin-ring { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; border: 3px solid rgba(108,99,255,0.2); border-top-color: #6c63ff; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sb-title { font-size: 14px; font-weight: 600; }
        .sb-num { font-size: 12px; color: #6b6b88; margin-top: 2px; }
        .sb-check { font-size: 28px; }
        .active-box { background: rgba(62,207,207,0.06); border: 1px solid rgba(62,207,207,0.2); border-radius: 13px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .active-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #3ecfcf; }
        .pulse-dot { width: 10px; height: 10px; border-radius: 50%; background: #3ecfcf; animation: pdot 1s ease infinite alternate; }
        @keyframes pdot { from { box-shadow: 0 0 0 0 rgba(62,207,207,0.5); } to { box-shadow: 0 0 0 6px rgba(62,207,207,0); } }
        .timer-live { margin-left: auto; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
        .active-num { font-size: 15px; font-weight: 600; color: #e8e8f0; }
        .status-msg { font-size: 12px; color: #6b6b88; }
        .end-btn { padding: 11px; border-radius: 11px; border: 1px solid rgba(255,107,107,0.3); background: rgba(255,107,107,0.1); color: #ff6b6b; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .end-btn:hover { background: rgba(255,107,107,0.2); }
        .err-box { background: rgba(255,107,107,0.07); border: 1px solid rgba(255,107,107,0.2); border-radius: 11px; padding: 10px 13px; font-size: 12px; color: #ff9999; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
        .clr-err { margin-left: auto; background: none; border: none; color: #ff6b6b; cursor: pointer; }
        .logs-panel { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; display: flex; flex-direction: column; overflow: hidden; }
        .logs-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .logs-count { background: rgba(108,99,255,0.2); color: #a89fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; }
        .logs-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #5a5a7a; text-align: center; gap: 4px; padding: 40px; }
        .logs-empty p { font-size: 15px; font-weight: 500; margin: 0; }
        .logs-empty small { font-size: 12px; }
        .log-list { overflow-y: auto; flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .log-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
        .li-icon { font-size: 20px; flex-shrink: 0; }
        .li-info { flex: 1; min-width: 0; }
        .li-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .li-phone { font-size: 12px; color: #6b6b88; margin-bottom: 4px; }
        .li-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #5a5a7a; }
        .li-status { padding: 2px 7px; border-radius: 6px; font-weight: 600; font-size: 10px; }
        .s-ok  { background: rgba(62,207,207,0.12); color: #3ecfcf; }
        .s-end { background: rgba(255,107,107,0.1); color: #ff9999; }
        .li-time { font-size: 11px; color: #4a4a6a; flex-shrink: 0; }
        @media(max-width:768px) { .twilio-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}