"use client";

import { useState } from "react";
import AICallingAgent from "./components/AICallingAgent";
import CallLogs from "./components/CallLogs";
import TwilioOutboundCall from "./components/TwilioOutboundCall";   // 👈 Twilio instead of Vapi

export default function CallsPage() {
  const [activeTab, setActiveTab] = useState("twilio");   // default to Twilio tab
  const [callLogs, setCallLogs] = useState([]);

  const addCallLog = (log) => setCallLogs((prev) => [log, ...prev]);

  const tabs = [
    { id: "twilio", label: "📞 Twilio Calls" },           // 👈 changed from "vapi"
    { id: "agent",  label: "🤖 AI Simulator" },
    { id: "logs",   label: "📋 Call Logs", badge: callLogs.length || null },
  ];

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="header-left">
          <div className="hicon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.87 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012.77 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.72a16 16 0 006.37 6.37l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="htitle">AI Calling Agent</h1>
            <p className="hsub">Twilio Real Calls · Groq LLaMA3 · Free Stack</p>
          </div>
        </div>
        <div className="tab-bar">
          {tabs.map((t) => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
              {t.badge ? <span className="tbadge">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="page-body">
        {activeTab === "twilio" && <TwilioOutboundCall onCallLog={addCallLog} />}
        {activeTab === "agent"  && <AICallingAgent onCallEnd={addCallLog} />}
        {activeTab === "logs"   && <CallLogs logs={callLogs} />}
      </div>
      <style jsx>{`
        .page-root { min-height:100vh; background:#0a0a0f; color:#e8e8f0; font-family:'Segoe UI',sans-serif; }
        .page-header { display:flex; align-items:center; justify-content:space-between; padding:18px 32px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); position:sticky; top:0; z-index:10; }
        .header-left { display:flex; align-items:center; gap:14px; }
        .hicon { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,#6c63ff,#3ecfcf); display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0; }
        .htitle { font-size:20px; font-weight:700; margin:0; }
        .hsub { font-size:12px; color:#5a5a7a; margin:2px 0 0; }
        .tab-bar { display:flex; gap:4px; background:rgba(255,255,255,0.03); padding:4px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); }
        .tab-btn { padding:8px 16px; border-radius:8px; border:none; background:transparent; color:#5a5a7a; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.2s; display:flex; align-items:center; gap:6px; }
        .tab-btn.active { background:rgba(108,99,255,0.15); color:#a89fff; border:1px solid rgba(108,99,255,0.25); }
        .tbadge { background:#6c63ff; color:white; font-size:10px; padding:1px 6px; border-radius:10px; font-weight:700; }
        .page-body { padding:28px 32px; max-width:1100px; margin:0 auto; }
        @media(max-width:768px){ .page-header{flex-direction:column;gap:14px;padding:16px 20px;} .page-body{padding:20px 16px;} }
      `}</style>
    </div>
  );
}





// "use client";

// import { useState } from "react";
// import AICallingAgent from "./components/AICallingAgent";
// import CallLogs from "./components/CallLogs";
// import VapiOutboundCall from "./components/VapiOutboundCall";
// import TwilioOutboundCall from "./components/TwilioOutboundCall";

// export default function CallsPage() {
//   const [activeTab, setActiveTab] = useState("vapi");
//   const [callLogs, setCallLogs] = useState([]);

//   const addCallLog = (log) => setCallLogs((prev) => [log, ...prev]);

//   const tabs = [
//     { id: "vapi",  label: "📞 Real Calls" },
//     { id: "agent", label: "🤖 AI Simulator" },
//     { id: "logs",  label: "📋 Call Logs", badge: callLogs.length || null },
//   ];

//   return (
//     <div className="page-root">
//       <div className="page-header">
//         <div className="header-left">
//           <div className="hicon">
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
//               <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.87 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012.77 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.72a16 16 0 006.37 6.37l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//             </svg>
//           </div>
//           <div>
//             <h1 className="htitle">AI Calling Agent</h1>
//             <p className="hsub">VAPI Real Calls · Groq LLaMA3 · Free Stack</p>
//           </div>
//         </div>
//         <div className="tab-bar">
//           {tabs.map((t) => (
//             <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
//               {t.label}
//               {t.badge ? <span className="tbadge">{t.badge}</span> : null}
//             </button>
//           ))}
//         </div>
//       </div>
//       <div className="page-body">
//         {activeTab === "vapi"  && <VapiOutboundCall onCallLog={addCallLog} />}
//         {activeTab === "agent" && <AICallingAgent onCallEnd={addCallLog} />}
//         {activeTab === "logs"  && <CallLogs logs={callLogs} />}
//       </div>
//       <style jsx>{`
//         .page-root { min-height:100vh; background:#0a0a0f; color:#e8e8f0; font-family:'Segoe UI',sans-serif; }
//         .page-header { display:flex; align-items:center; justify-content:space-between; padding:18px 32px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); position:sticky; top:0; z-index:10; }
//         .header-left { display:flex; align-items:center; gap:14px; }
//         .hicon { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,#6c63ff,#3ecfcf); display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0; }
//         .htitle { font-size:20px; font-weight:700; margin:0; }
//         .hsub { font-size:12px; color:#5a5a7a; margin:2px 0 0; }
//         .tab-bar { display:flex; gap:4px; background:rgba(255,255,255,0.03); padding:4px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); }
//         .tab-btn { padding:8px 16px; border-radius:8px; border:none; background:transparent; color:#5a5a7a; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.2s; display:flex; align-items:center; gap:6px; }
//         .tab-btn.active { background:rgba(108,99,255,0.15); color:#a89fff; border:1px solid rgba(108,99,255,0.25); }
//         .tbadge { background:#6c63ff; color:white; font-size:10px; padding:1px 6px; border-radius:10px; font-weight:700; }
//         .page-body { padding:28px 32px; max-width:1100px; margin:0 auto; }
//         @media(max-width:768px){ .page-header{flex-direction:column;gap:14px;padding:16px 20px;} .page-body{padding:20px 16px;} }
//       `}</style>
//     </div>
//   );
// }
// "use client";

// import { useState } from "react";
// import AICallingAgent from "./components/AICallingAgent";
// import CallLogs from "./components/CallLogs";

// export default function CallsPage() {
//   const [activeTab, setActiveTab] = useState("agent");
//   const [callLogs, setCallLogs] = useState([]);

//   const addCallLog = (log) => {
//     setCallLogs((prev) => [log, ...prev]);
//   };

//   return (
//     <div className="calls-root">
//       <div className="calls-header">
//         <div className="header-left">
//           <div className="header-icon">
//             <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
//               <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.87 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012.77 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.72a16 16 0 006.37 6.37l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
//             </svg>
//           </div>
//           <div>
//             <h1 className="header-title">AI Calling Agent</h1>
//             <p className="header-sub">Powered by Groq LLaMA3 · Free &amp; Open Source</p>
//           </div>
//         </div>
//         <div className="tab-bar">
//           <button
//             className={`tab-btn ${activeTab === "agent" ? "active" : ""}`}
//             onClick={() => setActiveTab("agent")}
//           >
//             Live Agent
//           </button>
//           <button
//             className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
//             onClick={() => setActiveTab("logs")}
//           >
//             Call Logs
//             {callLogs.length > 0 && (
//               <span className="badge">{callLogs.length}</span>
//             )}
//           </button>
//         </div>
//       </div>

//       <div className="calls-body">
//         {activeTab === "agent" ? (
//           <AICallingAgent onCallEnd={addCallLog} />
//         ) : (
//           <CallLogs logs={callLogs} />
//         )}
//       </div>

//       <style jsx>{`
//         .calls-root {
//           min-height: 100vh;
//           background: #0a0a0f;
//           font-family: 'Syne', 'Segoe UI', sans-serif;
//           color: #e8e8f0;
//         }

//         .calls-header {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           padding: 20px 32px;
//           border-bottom: 1px solid rgba(255,255,255,0.06);
//           background: rgba(255,255,255,0.02);
//           backdrop-filter: blur(10px);
//           position: sticky;
//           top: 0;
//           z-index: 10;
//         }

//         .header-left {
//           display: flex;
//           align-items: center;
//           gap: 14px;
//         }

//         .header-icon {
//           width: 44px;
//           height: 44px;
//           border-radius: 12px;
//           background: linear-gradient(135deg, #6c63ff, #3ecfcf);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           color: white;
//           flex-shrink: 0;
//         }

//         .header-title {
//           font-size: 20px;
//           font-weight: 700;
//           margin: 0;
//           letter-spacing: -0.3px;
//         }

//         .header-sub {
//           font-size: 12px;
//           color: #6b6b88;
//           margin: 2px 0 0;
//         }

//         .tab-bar {
//           display: flex;
//           gap: 4px;
//           background: rgba(255,255,255,0.04);
//           padding: 4px;
//           border-radius: 10px;
//           border: 1px solid rgba(255,255,255,0.06);
//         }

//         .tab-btn {
//           padding: 7px 18px;
//           border-radius: 7px;
//           border: none;
//           background: transparent;
//           color: #6b6b88;
//           cursor: pointer;
//           font-size: 13px;
//           font-weight: 500;
//           transition: all 0.2s;
//           position: relative;
//           display: flex;
//           align-items: center;
//           gap: 6px;
//         }

//         .tab-btn.active {
//           background: linear-gradient(135deg, #6c63ff22, #3ecfcf22);
//           color: #a89fff;
//           border: 1px solid rgba(108,99,255,0.3);
//         }

//         .badge {
//           background: #6c63ff;
//           color: white;
//           font-size: 10px;
//           padding: 1px 6px;
//           border-radius: 10px;
//           font-weight: 600;
//         }

//         .calls-body {
//           padding: 32px;
//           max-width: 1100px;
//           margin: 0 auto;
//         }

//         @media (max-width: 768px) {
//           .calls-header {
//             flex-direction: column;
//             gap: 16px;
//             padding: 16px 20px;
//           }
//           .calls-body {
//             padding: 20px 16px;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }