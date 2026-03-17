"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `You are an Advanced AI Voice Calling Agent for the company.

Your role is to manage both Incoming and Outgoing phone calls with customers professionally, intelligently, and efficiently.

PERSONALITY: Friendly, Professional, Confident, Calm, Helpful.
Speak in natural conversational language.
Primary language: Hinglish (Hindi + English). Adapt to customer's language automatically.
Never sound robotic. Keep responses SHORT (2-3 sentences max) since this is a voice call.

INCOMING CALL FLOW:
- Greet: "Namaste! Main AI assistant bol raha hoon. Aapki kaise madad kar sakta hoon?"
- Identify intent: Service Request, Complaint, Order Status, Appointment Booking, Sales Inquiry, Technical Support
- Collect info if needed: Name, Phone, Email, Order ID
- Provide solution or escalate

COMPLAINT HANDLING: Apologize first, listen, collect details, escalate if needed.

SALES MODE: If customer shows interest, explain benefits clearly and encourage next action.

TOOLS AVAILABLE (mention these when appropriate):
- Book appointment
- Check order status  
- Create support ticket
- Transfer to human agent
- Schedule callback

RULES:
- Never provide false info
- If unsure, say you will check and connect to human
- Keep responses conversational and brief for voice (2-3 sentences max)`;

export default function AICallingAgent({ onCallEnd }) {
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("incoming");
  const [messages, setMessages] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [inputMode, setInputMode] = useState("voice");
  const [textInput, setTextInput] = useState("");
  const [micPermission, setMicPermission] = useState("unknown");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAgent, setTransferAgent] = useState("");

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      const saved = localStorage.getItem("groq_api_key");
      if (saved) setGroqApiKey(saved);
      navigator.permissions?.query({ name: "microphone" }).then((result) => {
        setMicPermission(result.state);
        result.onchange = () => setMicPermission(result.state);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }
      synthRef.current.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "hi-IN";
      utt.rate = 0.95;
      utt.pitch = 1.0;
      const voices = synthRef.current.getVoices();
      const hindi = voices.find(v => v.lang === "hi-IN") ||
                    voices.find(v => v.lang.startsWith("hi")) ||
                    voices.find(v => v.name.toLowerCase().includes("india"));
      if (hindi) utt.voice = hindi;
      setIsSpeaking(true);
      utt.onend = () => { setIsSpeaking(false); resolve(); };
      utt.onerror = () => { setIsSpeaking(false); resolve(); };
      synthRef.current.speak(utt);
    });
  }, []);

  const callGroq = useCallback(async (conversationMessages) => {
    if (!groqApiKey) {
      setError("Groq API key required! Get free key from console.groq.com");
      return null;
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversationMessages],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Groq API error");
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }, [groqApiKey]);

  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission("granted");
      setError("");
      return true;
    } catch {
      setMicPermission("denied");
      setError("Mic permission denied. Browser mein address bar ke paas lock icon click karo → Microphone → Allow karo. Ya neeche Text mode use karo.");
      setInputMode("text");
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (micPermission !== "granted") {
      const ok = await requestMicPermission();
      if (!ok) return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported. Chrome use karo, ya Text mode use karo.");
      setInputMode("text");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setCurrentTranscript(""); setError(""); };
    recognition.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setCurrentTranscript(final || interim);
      if (final) handleUserMessage(final);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setMicPermission("denied");
        setInputMode("text");
        setError("Microphone blocked! Browser settings mein Microphone Allow karo, ya Text mode use karo.");
      } else if (e.error !== "no-speech") {
        setError(`Speech error: ${e.error}. Text mode try karo.`);
      }
    };
    recognition.onend = () => { setIsListening(false); setCurrentTranscript(""); };
    recognitionRef.current = recognition;
    recognition.start();
  }, [micPermission, requestMicPermission]); // eslint-disable-line

  const handleUserMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    setIsListening(false);
    setCurrentTranscript("");
    setTextInput("");
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsThinking(true);
    try {
      const reply = await callGroq(newMessages);
      if (reply) {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
        setIsThinking(false);
        await speak(reply);
      }
    } catch (err) {
      setError(err.message);
      setIsThinking(false);
    }
  }, [messages, callGroq, speak]);

  const handleTextSend = () => {
    if (textInput.trim()) handleUserMessage(textInput.trim());
  };

  const startCall = useCallback(async (type) => {
    if (!groqApiKey) { setShowApiInput(true); return; }
    setCallType(type);
    setCallState("ringing");
    setMessages([]);
    setError("");
    await new Promise(r => setTimeout(r, type === "incoming" ? 2000 : 1500));
    setCallState("active");
    const greeting = type === "incoming"
      ? "Namaste! Thank you for calling. Main AI assistant bol raha hoon. Aapki kaise madad kar sakta hoon?"
      : `Hello! Main company ki taraf se AI assistant bol raha hoon. Kya main ${customerName || "aapse"} ek minute baat kar sakta hoon?`;
    setMessages([{ role: "assistant", content: greeting }]);
    await speak(greeting);
  }, [groqApiKey, customerName, speak]);

  const endCall = useCallback((reason = "normal") => {
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    setIsListening(false); setIsSpeaking(false); setIsThinking(false);
    setCallState("ended");
    const log = {
      id: Date.now(), type: callType, duration: callDuration, messages,
      customer: customerName || "Unknown", phone: phoneNumber || "—",
      timestamp: new Date().toLocaleString("en-IN"), endReason: reason,
    };
    setTimeout(() => { onCallEnd?.(log); setCallState("idle"); setMessages([]); }, 1800);
  }, [callType, callDuration, messages, customerName, phoneNumber, onCallEnd]);

  const handleTransferToHuman = useCallback(async () => {
    setShowTransferModal(false);
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    setIsListening(false);
    const agentName = transferAgent || "Human Agent";
    const transferMsg = {
      role: "assistant",
      content: `Ek second ruko, main aapko ${agentName} se connect kar raha hoon. Aapki saari details share kar di jaayengi.`,
    };
    setMessages(prev => [...prev, transferMsg]);
    await speak(transferMsg.content);
    setCallState("transferred");
    const log = {
      id: Date.now(), type: callType, duration: callDuration,
      messages: [...messages, transferMsg],
      customer: customerName || "Unknown", phone: phoneNumber || "—",
      timestamp: new Date().toLocaleString("en-IN"),
      endReason: `transferred to ${agentName}`,
    };
    setTimeout(() => {
      onCallEnd?.(log); setCallState("idle"); setMessages([]); setTransferAgent("");
    }, 2500);
  }, [callType, callDuration, messages, customerName, phoneNumber, transferAgent, onCallEnd, speak]);

  const saveApiKey = () => {
    localStorage.setItem("groq_api_key", groqApiKey);
    setShowApiInput(false);
    setError("");
  };

  return (
    <div className="aw">

      {showApiInput && (
        <div className="overlay">
          <div className="modal">
            <div className="micon">🔑</div>
            <h3>Groq API Key Required</h3>
            <p>Free key lo: <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a></p>
            <p className="mnote">Free tier: 6,000 req/day · LLaMA3 8B · No Credit Card</p>
            <input type="password" placeholder="gsk_..." value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)} className="ainput" />
            <div className="mbtns">
              <button className="bsec" onClick={() => setShowApiInput(false)}>Cancel</button>
              <button className="bpri" onClick={saveApiKey} disabled={!groqApiKey}>Save Key</button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="overlay">
          <div className="modal">
            <div className="micon">👨‍💼</div>
            <h3>Transfer to Human Agent</h3>
            <p>Call ko human agent ko transfer karein?</p>
            <input type="text" placeholder="Agent ka naam (optional)" value={transferAgent}
              onChange={(e) => setTransferAgent(e.target.value)} className="ainput" />
            <div className="tsummary">
              <div className="trow"><span>Customer</span><span>{customerName || "Unknown"}</span></div>
              <div className="trow"><span>Duration</span><span>{formatTime(callDuration)}</span></div>
              <div className="trow"><span>Messages</span><span>{messages.length}</span></div>
            </div>
            <div className="mbtns">
              <button className="bsec" onClick={() => setShowTransferModal(false)}>Cancel</button>
              <button className="btrans" onClick={handleTransferToHuman}>📞 Transfer Now</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        {/* LEFT */}
        <div className="left">

          <div className="sect">
            <div className="stitle">Customer Info</div>
            <input className="fi" placeholder="Customer Name" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} disabled={callState !== "idle"} />
            <input className="fi" placeholder="Phone Number" value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)} disabled={callState !== "idle"} />
          </div>

          <div className="sect">
            <div className="stitle">API Settings</div>
            <div className="apist" onClick={() => setShowApiInput(true)}>
              <div className={`sdot ${groqApiKey ? "g" : "r"}`} />
              <span>{groqApiKey ? "Groq Connected" : "API Key Missing"}</span>
              <span className="ei">✏️</span>
            </div>
            <div className="mbadge">🦙 llama-3.1-8b-instant · Free</div>
          </div>

          {callState === "idle" && (
            <div className="sect">
              <div className="stitle">Start Call</div>
              <button className="cbtn inc" onClick={() => startCall("incoming")}>📞 Incoming Call</button>
              <button className="cbtn out" onClick={() => startCall("outgoing")}>📲 Outgoing Call</button>
            </div>
          )}

          {callState === "active" && (
            <div className="sect">
              <div className="csbox">
                <div className="pring" />
                <div className="ctbadge">{callType === "incoming" ? "📞 Incoming" : "📲 Outgoing"}</div>
                <div className="timer">{formatTime(callDuration)}</div>
              </div>

              <div className="mtoggle">
                <button className={`mbtn ${inputMode === "voice" ? "ma" : ""}`}
                  onClick={() => setInputMode("voice")}>🎤 Voice</button>
                <button className={`mbtn ${inputMode === "text" ? "ma" : ""}`}
                  onClick={() => setInputMode("text")}>⌨️ Text</button>
              </div>

              {inputMode === "voice" && (
                <>
                  {micPermission === "denied" && (
                    <div className="mhint">
                      🔒 Mic blocked → Browser lock icon → Microphone → Allow<br/>
                      Ya Text mode use karo ⬇️
                    </div>
                  )}
                  <button
                    className={`micbtn ${isListening ? "ml" : ""} ${isSpeaking || isThinking ? "md" : ""}`}
                    onClick={startListening}
                    disabled={isSpeaking || isThinking}
                  >
                    {isListening ? "🎤 Listening..."
                      : isThinking ? "💭 Thinking..."
                      : isSpeaking ? "🔊 Speaking..."
                      : "🎤 Press to Speak"}
                  </button>
                </>
              )}

              {inputMode === "text" && (
                <div className="tirow">
                  <input
                    className="fi timsg"
                    placeholder="Type your message... (Enter to send)"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); handleTextSend();
                      }
                    }}
                    disabled={isThinking || isSpeaking}
                    autoFocus
                  />
                  <button className="sndbtn" onClick={handleTextSend}
                    disabled={!textInput.trim() || isThinking || isSpeaking}>➤</button>
                </div>
              )}

              <button className="trbtn" onClick={() => setShowTransferModal(true)}>
                👨‍💼 Transfer to Human
              </button>
              <button className="endbtn" onClick={() => endCall("normal")}>
                📵 End Call
              </button>
            </div>
          )}

          {callState === "ringing" && (
            <div className="rbox">
              <div className="rani">
                <div className="ring r1"/><div className="ring r2"/><div className="ring r3"/>
                <span className="pe">📞</span>
              </div>
              <p>{callType === "incoming" ? "Incoming call..." : "Calling..."}</p>
            </div>
          )}

          {callState === "transferred" && (
            <div className="ebox tbox">
              <span className="ei2">👨‍💼</span>
              <p>Transferred!</p>
              <small>Human agent ko connect kiya</small>
            </div>
          )}

          {callState === "ended" && (
            <div className="ebox">
              <span className="ei2">✅</span>
              <p>Call Ended</p>
              <small>Log saved</small>
            </div>
          )}

          {error && (
            <div className="errbox">
              <span>⚠️ {error}</span>
              <button className="ce" onClick={() => setError("")}>✕</button>
            </div>
          )}
        </div>

        {/* RIGHT - Chat */}
        <div className="chat">
          <div className="chatheader">
            <span>💬 Live Transcript</span>
            <div className="chr">
              {callState === "active" && (
                <span className="ldot">
                  {isListening ? "🔴 Listening" : isSpeaking ? "🟢 Speaking" : "🟡 Idle"}
                </span>
              )}
              <span className="cmeta">Hinglish · Voice AI</span>
            </div>
          </div>
          <div className="msgs">
            {messages.length === 0 && callState === "idle" && (
              <div className="empty">
                <div style={{fontSize:44}}>🤖</div>
                <p>AI Calling Agent Ready</p>
                <small>Start a call to begin</small>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`msg ${msg.role}`}>
                <div className="mlabel">{msg.role === "assistant" ? "🤖 AI Agent" : "👤 Customer"}</div>
                <div className="mbubble">{msg.content}</div>
              </div>
            ))}
            {currentTranscript && (
              <div className="msg user interim">
                <div className="mlabel">👤 Customer (live)</div>
                <div className="mbubble">{currentTranscript}</div>
              </div>
            )}
            {isThinking && (
              <div className="msg assistant">
                <div className="mlabel">🤖 AI Agent</div>
                <div className="mbubble thinking"><span/><span/><span/></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .aw { position: relative; color: #e8e8f0; font-family: 'Segoe UI', sans-serif; }
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.78);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; backdrop-filter: blur(5px);
        }
        .modal {
          background: #13131f; border: 1px solid rgba(108,99,255,0.35);
          border-radius: 20px; padding: 32px; width: 400px; text-align: center;
        }
        .micon { font-size: 38px; margin-bottom: 10px; }
        .modal h3 { font-size: 18px; margin: 0 0 8px; }
        .modal p { color: #9999bb; font-size: 14px; margin: 4px 0; }
        .modal a { color: #6c63ff; }
        .mnote { font-size: 12px; background: rgba(108,99,255,0.1); border-radius: 8px; padding: 6px 10px; display: inline-block; margin: 6px 0; }
        .ainput { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; color: #e8e8f0; font-size: 14px; margin: 10px 0; outline: none; box-sizing: border-box; }
        .mbtns { display: flex; gap: 10px; justify-content: center; margin-top: 4px; }
        .bpri { background: linear-gradient(135deg,#6c63ff,#3ecfcf); color: #fff; border: none; padding: 10px 22px; border-radius: 10px; cursor: pointer; font-weight: 600; }
        .bpri:disabled { opacity: 0.4; cursor: not-allowed; }
        .bsec { background: rgba(255,255,255,0.06); color: #9999bb; border: 1px solid rgba(255,255,255,0.1); padding: 10px 22px; border-radius: 10px; cursor: pointer; }
        .btrans { background: rgba(255,160,50,0.15); border: 1px solid rgba(255,160,50,0.35); color: #ffaa44; padding: 10px 22px; border-radius: 10px; cursor: pointer; font-weight: 600; }
        .tsummary { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 12px 14px; margin: 10px 0; text-align: left; }
        .trow { display: flex; justify-content: space-between; font-size: 13px; color: #9999bb; padding: 3px 0; }
        .trow span:last-child { color: #e8e8f0; font-weight: 500; }

        .grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; min-height: 600px; }
        .left { display: flex; flex-direction: column; gap: 14px; }
        .sect { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .stitle { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #4a4a6a; }
        .fi { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 13px; color: #e8e8f0; font-size: 13px; outline: none; transition: border-color 0.2s; }
        .fi:focus { border-color: rgba(108,99,255,0.4); }
        .fi:disabled { opacity: 0.4; cursor: not-allowed; }
        .apist { display: flex; align-items: center; gap: 8px; padding: 10px 13px; background: rgba(255,255,255,0.04); border-radius: 10px; cursor: pointer; font-size: 13px; border: 1px solid rgba(255,255,255,0.06); }
        .sdot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sdot.g { background: #3ecfcf; box-shadow: 0 0 6px #3ecfcf88; }
        .sdot.r { background: #ff6b6b; box-shadow: 0 0 6px #ff6b6b88; }
        .ei { margin-left: auto; font-size: 12px; }
        .mbadge { font-size: 12px; color: #6b6b88; background: rgba(108,99,255,0.08); border-radius: 8px; padding: 6px 10px; text-align: center; }
        .cbtn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 13px 16px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
        .cbtn.inc { background: rgba(62,207,207,0.1); border: 1px solid rgba(62,207,207,0.25); color: #3ecfcf; }
        .cbtn.out { background: rgba(108,99,255,0.1); border: 1px solid rgba(108,99,255,0.25); color: #a89fff; }
        .cbtn:hover { transform: translateY(-1px); filter: brightness(1.15); }

        .csbox { text-align: center; padding: 14px; background: rgba(62,207,207,0.04); border-radius: 12px; border: 1px solid rgba(62,207,207,0.12); }
        .pring { width: 44px; height: 44px; border-radius: 50%; border: 2px solid #3ecfcf; margin: 0 auto 8px; animation: pulse 1.5s ease infinite; }
        @keyframes pulse { 0% { transform:scale(1);opacity:1; } 100% { transform:scale(1.7);opacity:0; } }
        .ctbadge { font-size: 12px; color: #3ecfcf; font-weight: 600; margin-bottom: 2px; }
        .timer { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 2px; }

        .mtoggle { display: flex; background: rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
        .mbtn { flex: 1; padding: 9px; border: none; background: transparent; color: #5a5a7a; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .mbtn.ma { background: rgba(108,99,255,0.18); color: #a89fff; }

        .mhint { font-size: 11px; color: #ff9966; background: rgba(255,100,50,0.08); border: 1px solid rgba(255,100,50,0.2); border-radius: 8px; padding: 8px 10px; line-height: 1.5; }

        .micbtn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border-radius: 12px; border: 2px solid rgba(108,99,255,0.35); background: rgba(108,99,255,0.1); color: #a89fff; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; width: 100%; }
        .micbtn:hover:not(.md) { filter: brightness(1.15); }
        .micbtn.ml { border-color: #ff6b6b; background: rgba(255,107,107,0.15); color: #ff6b6b; animation: mpulse 1s ease infinite alternate; }
        @keyframes mpulse { from { box-shadow:0 0 0 0 rgba(255,107,107,0.3); } to { box-shadow:0 0 0 10px rgba(255,107,107,0); } }
        .micbtn.md { opacity: 0.45; cursor: not-allowed; }

        .tirow { display: flex; gap: 8px; align-items: center; }
        .timsg { flex: 1; margin: 0; }
        .sndbtn { width: 42px; height: 42px; border-radius: 10px; border: none; flex-shrink: 0; background: linear-gradient(135deg,#6c63ff,#3ecfcf); color: white; cursor: pointer; font-size: 16px; transition: opacity 0.2s; }
        .sndbtn:disabled { opacity: 0.4; cursor: not-allowed; }

        .trbtn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 12px; border: 1px solid rgba(255,160,50,0.3); background: rgba(255,160,50,0.07); color: #ffaa44; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .trbtn:hover { background: rgba(255,160,50,0.15); }
        .endbtn { padding: 11px; border-radius: 12px; border: 1px solid rgba(255,107,107,0.25); background: rgba(255,107,107,0.07); color: #ff6b6b; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .endbtn:hover { background: rgba(255,107,107,0.15); }

        .rbox { text-align: center; padding: 24px 18px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); color: #9999bb; }
        .rani { position: relative; width: 70px; height: 70px; margin: 0 auto 12px; }
        .ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #6c63ff; animation: ripple 1.5s ease-out infinite; }
        .r2 { animation-delay: 0.5s; }
        .r3 { animation-delay: 1s; }
        @keyframes ripple { 0% { transform:scale(0.4);opacity:1; } 100% { transform:scale(1.7);opacity:0; } }
        .pe { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 28px; animation: shake 0.4s ease infinite alternate; }
        @keyframes shake { from{transform:rotate(-12deg);} to{transform:rotate(12deg);} }

        .ebox { text-align: center; padding: 22px 18px; background: rgba(62,207,207,0.04); border-radius: 16px; border: 1px solid rgba(62,207,207,0.12); }
        .tbox { background: rgba(255,160,50,0.04); border-color: rgba(255,160,50,0.15); }
        .ei2 { font-size: 34px; }
        .ebox p { font-weight: 600; margin: 8px 0 4px; }
        .ebox small { color: #5a5a7a; font-size: 12px; }

        .errbox { background: rgba(255,107,107,0.07); border: 1px solid rgba(255,107,107,0.22); border-radius: 12px; padding: 10px 13px; font-size: 12px; color: #ff9999; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
        .ce { margin-left: auto; background: none; border: none; color: #ff6b6b; cursor: pointer; flex-shrink: 0; }

        .chat { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; }
        .chatheader { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; font-weight: 600; }
        .chr { display: flex; align-items: center; gap: 12px; }
        .ldot { font-size: 11px; }
        .cmeta { color: #5a5a7a; font-weight: 400; font-size: 11px; }
        .msgs { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; min-height: 480px; max-height: 580px; }
        .empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#5a5a7a; gap:8px; margin:auto; text-align:center; }
        .empty p { font-size:15px; font-weight:500; margin:4px 0 0; }
        .empty small { font-size:12px; }
        .msg { display:flex; flex-direction:column; gap:3px; }
        .msg.user { align-items:flex-end; }
        .msg.assistant { align-items:flex-start; }
        .mlabel { font-size:10px; color:#5a5a7a; font-weight:600; letter-spacing:0.3px; }
        .mbubble { max-width:78%; padding:11px 15px; border-radius:16px; font-size:14px; line-height:1.55; }
        .msg.assistant .mbubble { background:rgba(108,99,255,0.1); border:1px solid rgba(108,99,255,0.18); border-bottom-left-radius:4px; color:#c8c8e8; }
        .msg.user .mbubble { background:rgba(62,207,207,0.08); border:1px solid rgba(62,207,207,0.18); border-bottom-right-radius:4px; color:#c8eeee; }
        .msg.interim .mbubble { opacity:0.6; border-style:dashed; }
        .thinking { display:flex; gap:5px; align-items:center; padding:14px 18px !important; }
        .thinking span { width:7px; height:7px; border-radius:50%; background:#6c63ff; animation:db 1.2s ease infinite; }
        .thinking span:nth-child(2){animation-delay:0.2s;}
        .thinking span:nth-child(3){animation-delay:0.4s;}
        @keyframes db { 0%,80%,100%{transform:scale(0.8);opacity:0.5;} 40%{transform:scale(1.3);opacity:1;} }

        @media(max-width:768px){ .grid{grid-template-columns:1fr;} .msgs{min-height:280px;} }
      `}</style>
    </div>
  );
}