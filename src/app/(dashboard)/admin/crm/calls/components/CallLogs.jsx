"use client";

import { useState } from "react";

export default function CallLogs({ logs }) {
  const [selected, setSelected] = useState(null);

  if (logs.length === 0) {
    return (
      <div className="empty-logs">
        <div className="empty-icon">📋</div>
        <p>No call logs yet</p>
        <small>Completed calls will appear here</small>
        <style jsx>{`
          .empty-logs {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: #5a5a7a;
            gap: 8px;
          }
          .empty-icon { font-size: 48px; margin-bottom: 8px; }
          p { font-size: 16px; font-weight: 500; margin: 0; }
          small { font-size: 13px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="logs-wrap">
      <div className="logs-grid">
        {/* Log List */}
        <div className="log-list">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`log-item ${selected?.id === log.id ? "active" : ""}`}
              onClick={() => setSelected(log)}
            >
              <div className="log-icon">
                {log.type === "incoming" ? "📞" : "📲"}
              </div>
              <div className="log-info">
                <div className="log-customer">{log.customer}</div>
                <div className="log-meta">
                  <span className={`log-type ${log.type}`}>
                    {log.type === "incoming" ? "Incoming" : "Outgoing"}
                  </span>
                  <span className="log-time">{log.timestamp}</span>
                </div>
              </div>
              <div className="log-dur">{formatDur(log.duration)}</div>
            </div>
          ))}
        </div>

        {/* Log Detail */}
        <div className="log-detail">
          {selected ? (
            <>
              <div className="detail-header">
                <div>
                  <h3>{selected.customer}</h3>
                  <div className="detail-meta">
                    <span className={`log-type ${selected.type}`}>
                      {selected.type === "incoming" ? "📞 Incoming" : "📲 Outgoing"}
                    </span>
                    <span>·</span>
                    <span>{formatDur(selected.duration)}</span>
                    <span>·</span>
                    <span>{selected.timestamp}</span>
                  </div>
                  {selected.phone !== "—" && (
                    <div className="detail-phone">📱 {selected.phone}</div>
                  )}
                </div>
                <div className="msg-count">
                  {selected.messages.length} messages
                </div>
              </div>

              <div className="detail-transcript">
                {selected.messages.map((msg, i) => (
                  <div key={i} className={`d-msg ${msg.role}`}>
                    <div className="d-label">
                      {msg.role === "assistant" ? "🤖 AI Agent" : "👤 Customer"}
                    </div>
                    <div className="d-bubble">{msg.content}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-select">
              <span>👆</span>
              <p>Select a call to view transcript</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .logs-wrap { }

        .logs-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          min-height: 500px;
        }

        .log-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .log-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .log-item:hover, .log-item.active {
          background: rgba(108,99,255,0.08);
          border-color: rgba(108,99,255,0.25);
        }

        .log-icon { font-size: 22px; flex-shrink: 0; }

        .log-info { flex: 1; min-width: 0; }

        .log-customer {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .log-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #5a5a7a;
        }

        .log-type {
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 600;
        }

        .log-type.incoming {
          background: rgba(62,207,207,0.12);
          color: #3ecfcf;
        }

        .log-type.outgoing {
          background: rgba(108,99,255,0.12);
          color: #a89fff;
        }

        .log-dur {
          font-size: 13px;
          font-weight: 600;
          color: #6b6b88;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        /* Detail panel */
        .log-detail {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .detail-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .detail-header h3 {
          font-size: 18px;
          margin: 0 0 6px;
        }

        .detail-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #6b6b88;
        }

        .detail-phone {
          margin-top: 6px;
          font-size: 13px;
          color: #6b6b88;
        }

        .msg-count {
          background: rgba(108,99,255,0.1);
          border: 1px solid rgba(108,99,255,0.2);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          color: #a89fff;
          white-space: nowrap;
        }

        .detail-transcript {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 450px;
        }

        .d-msg { display: flex; flex-direction: column; gap: 3px; }
        .d-msg.user { align-items: flex-end; }
        .d-msg.assistant { align-items: flex-start; }

        .d-label {
          font-size: 10px;
          color: #5a5a7a;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .d-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
        }

        .d-msg.assistant .d-bubble {
          background: rgba(108,99,255,0.1);
          border: 1px solid rgba(108,99,255,0.18);
          border-bottom-left-radius: 4px;
          color: #c8c8e8;
        }

        .d-msg.user .d-bubble {
          background: rgba(62,207,207,0.08);
          border: 1px solid rgba(62,207,207,0.18);
          border-bottom-right-radius: 4px;
          color: #c8eeee;
        }

        .no-select {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #5a5a7a;
          gap: 8px;
          font-size: 13px;
        }

        .no-select span { font-size: 32px; }

        @media (max-width: 768px) {
          .logs-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function formatDur(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}