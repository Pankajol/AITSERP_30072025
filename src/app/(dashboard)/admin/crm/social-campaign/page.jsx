"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Instagram, Youtube, Twitter, Linkedin, Facebook,
  Sparkles, TrendingUp, Clock, Hash, Video, Image,
  Send, Calendar, Loader2, CheckCircle, X, ChevronRight,
  Zap, Globe, BarChart2, Plus, Trash2, Eye, RefreshCw,
  MessageCircle, Mail, Play, FileImage, Wand2, AlarmClock,
  AlertCircle, ArrowLeft, Settings, Link2
} from "lucide-react";

const PLATFORMS = [
  { id: "instagram", label: "Instagram",   Icon: Instagram,  color: "#E1306C" },
  { id: "facebook",  label: "Facebook",    Icon: Facebook,   color: "#1877F2" },
  { id: "youtube",   label: "YouTube",     Icon: Youtube,    color: "#FF0000" },
  { id: "twitter",   label: "Twitter / X", Icon: Twitter,    color: "#1DA1F2" },
  { id: "linkedin",  label: "LinkedIn",    Icon: Linkedin,   color: "#0A66C2" },
];

const CONTENT_TYPES = [
  { id: "post",  label: "Post",         icon: <FileImage size={16}/> },
  { id: "video", label: "Short Video",  icon: <Play size={16}/>      },
  { id: "story", label: "Story",        icon: <Eye size={16}/>       },
  { id: "reel",  label: "Reel / Short", icon: <Video size={16}/>     },
];

const SEND_MODES = [
  { id: "schedule", label: "Schedule",    icon: <AlarmClock size={16}/> },
  { id: "instant",  label: "Send Now",    icon: <Zap size={16}/>        },
  { id: "email",    label: "+ Email",     icon: <Mail size={16}/>       },
  { id: "whatsapp", label: "+ WhatsApp",  icon: <MessageCircle size={16}/> },
];

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

async function callAI(prompt, maxTokens = 800) {
  const res = await fetch("/api/ai-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "AI call failed");
  return data.text || "";
}

// Robust JSON extractor — handles markdown fences, extra text before/after
function extractJSON(text) {
  if (!text) return null;
  // Try direct parse first
  try { return JSON.parse(text.trim()); } catch {}
  // Strip markdown fences
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  // Find first [ or { and last ] or }
  const arrMatch = stripped.match(/\[\s*[\s\S]*\s*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  const objMatch = stripped.match(/\{\s*[\s\S]*\s*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
}

export default function SocialCampaignStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit"); // ?edit=campaignId for editing

  const [step, setStep]                     = useState(1);
  const [isEdit, setIsEdit]                 = useState(false);
  const [selectedPlatforms, setSelected]    = useState([]);
  const [contentType, setContentType]       = useState("post");
  const [sendModes, setSendModes]           = useState(["schedule"]);
  const [campaignName, setCampaignName]     = useState("");
  const [topic, setTopic]                   = useState("");
  const [industry, setIndustry]             = useState("");
  const [scheduledTime, setScheduledTime]   = useState("");
  const [caption, setCaption]               = useState("");
  const [hashtags, setHashtags]             = useState([]);
  const [mediaFiles, setMediaFiles]         = useState([]);
  const [emailRecipients, setEmailRecip]    = useState("");
  const [whatsappNumbers, setWhatsapp]      = useState("");
  const [statusMsg, setStatusMsg]           = useState(null);
  const [loading, setLoading]               = useState(false);
  const [socialMaster, setSocialMaster]     = useState(null); // from DB

  // AI
  const [aiLoading, setAiLoading]           = useState({});
  const [trendingTopics, setTrending]       = useState([]);
  const [suggestedTimes, setSugTimes]       = useState([]);
  const [genCaptions, setGenCaptions]       = useState([]);
  const [genHashtags, setGenHashtags]       = useState([]);
  const [videoScript, setVideoScript]       = useState("");
  const [imagePrompt, setImagePrompt]       = useState("");

  const fileRef = useRef(null);

  // ── Load social master & edit data on mount ────────
  useEffect(() => {
    const init = async () => {
      // Fetch social master to know which platforms are connected
      try {
        const res  = await fetch("/api/social-media-master", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data?.data) setSocialMaster(data.data);
      } catch {}

      // If editing, fetch existing campaign
      if (editId) {
        try {
          const res  = await fetch(`/api/social-campaign/${editId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json();
          if (data?.data) {
            const c = data.data;
            setIsEdit(true);
            setCampaignName(c.campaignName || "");
            setSelected(c.platforms || []);
            setContentType(c.contentType || "post");
            setSendModes(c.sendModes || ["schedule"]);
            setTopic(c.topic || "");
            setIndustry(c.industry || "");
            setCaption(c.caption || "");
            setHashtags(c.hashtags || []);
            setScheduledTime(
              c.scheduledTime ? new Date(c.scheduledTime).toISOString().slice(0, 16) : ""
            );
            setEmailRecip((c.emailRecipients || []).join("\n"));
            setWhatsapp((c.whatsappNumbers || []).join("\n"));
            setVideoScript(c.videoScript || "");
            setImagePrompt(c.imagePrompt || "");
          }
        } catch {}
      }
    };
    init();
  }, [editId]);

  const togglePlatform = (id) =>
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const toggleMode = (id) =>
    setSendModes((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // ── Platform connected check ────────────────────────
  const isPlatformConnected = (id) => {
    if (!socialMaster) return false;
    return socialMaster[id]?.enabled === true;
  };

  // ── AI helpers ─────────────────────────────────────
  const fetchTrending = async () => {
    if (!industry) return;
    setAiLoading((p) => ({ ...p, trending: true }));
    setStatusMsg(null);
    try {
      const text = await callAI(
        `Give me 8 trending topics right now for ${industry} industry, perfect for social media in 2025.
         JSON array: [{topic, reason, platforms:[instagram/youtube/twitter/linkedin/facebook]}]
         Only JSON, no extra text.`
      );
      const tp = extractJSON(text); if (tp) setTrending(tp); else throw new Error('Could not parse trending topics');
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, trending: false }));
  };

  const generateCaption = async () => {
    if (!topic) return;
    setAiLoading((p) => ({ ...p, caption: true }));
    try {
      const text = await callAI(
        `3 social media captions for topic: "${topic}", platforms: ${selectedPlatforms.join(", ")}, industry: ${industry || "general"}.
         Tones: Professional, Casual/fun, Story-telling. Each max 150 words, 1-2 emojis, strong CTA.
         JSON array: [{tone, caption}]. Only JSON.`
      );
      const cp = extractJSON(text); if (cp) setGenCaptions(cp); else throw new Error('Could not parse captions');
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, caption: false }));
  };

  const generateHashtags = async () => {
    if (!topic) return;
    setAiLoading((p) => ({ ...p, hashtags: true }));
    try {
      const text = await callAI(
        `20 high-performing hashtags for: "${topic}" on ${selectedPlatforms.join(", ")}.
         Mix: 5 mega(1M+), 8 mid(100K-1M), 7 niche(<100K).
         JSON array: [{tag(no #), size:"mega"|"mid"|"niche"}]. Only JSON.`
      );
      const hp = extractJSON(text); if (hp) setGenHashtags(hp); else throw new Error('Could not parse hashtags');
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, hashtags: false }));
  };

  const suggestTimes = async () => {
    setAiLoading((p) => ({ ...p, times: true }));
    try {
      const text = await callAI(
        `Best posting times on ${selectedPlatforms.join(", ")} for ${industry || "general"} in India (IST).
         JSON array: [{platform, times:["HH:MM IST"], reason, engagement}]. Only JSON.`
      );
      const stp = extractJSON(text); if (stp) setSugTimes(stp); else throw new Error('Could not parse times');
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, times: false }));
  };

  const generateVideoScript = async () => {
    if (!topic) return;
    setAiLoading((p) => ({ ...p, video: true }));
    try {
      const t = await callAI(
        `15-second short video script for: "${topic}" on ${selectedPlatforms.join(", ")}, industry: ${industry || "general"}.
         Format: [0-3s] Hook / [3-8s] Value / [8-13s] CTA / [13-15s] End card.
         Include voiceover text, on-screen overlays, background music mood.`, 600
      );
      setVideoScript(t);
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, video: false }));
  };

  const generateImagePrompt = async () => {
    if (!topic) return;
    setAiLoading((p) => ({ ...p, image: true }));
    try {
      const t = await callAI(
        `Detailed image generation prompt for social media post about "${topic}".
         Platform: ${selectedPlatforms[0] || "instagram"}. Style: photorealistic, professional.
         Include composition, lighting, colors, mood, aspect ratio. Also 3 style alternatives. Under 200 words.`
      );
      setImagePrompt(t);
    } catch (e) { setStatusMsg({ type: 'error', text: '❌ AI Error: ' + (e.message || 'Try again') }); }
    setAiLoading((p) => ({ ...p, image: false }));
  };

  // ── Media upload ───────────────────────────────────
  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "application");
    const res  = await fetch("https://api.cloudinary.com/v1_1/dz1gfppll/auto/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlatforms.length) return setStatusMsg({ type: "error", text: "Select at least one platform" });
    if (!caption) return setStatusMsg({ type: "error", text: "Caption is required" });

    setLoading(true);
    setStatusMsg(null);
    try {
      let uploadedUrls = [];
      if (mediaFiles.length) {
        setStatusMsg({ type: "info", text: "Uploading media..." });
        uploadedUrls = await Promise.all(mediaFiles.map(uploadToCloudinary));
      }

      const payload = {
        campaignName, platforms: selectedPlatforms, contentType, sendModes,
        topic, industry, caption,
        hashtags: hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)),
        mediaUrls: uploadedUrls,
        scheduledTime: sendModes.includes("schedule") ? scheduledTime : null,
        emailRecipients: sendModes.includes("email")
          ? emailRecipients.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean) : [],
        whatsappNumbers: sendModes.includes("whatsapp")
          ? whatsappNumbers.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean) : [],
        videoScript: (contentType === "video" || contentType === "reel") ? videoScript : null,
        imagePrompt: (contentType === "post" || contentType === "story") ? imagePrompt : null,
      };

      const url    = isEdit ? `/api/social-campaign/${editId}` : "/api/social-campaign";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setStatusMsg({ type: "success", text: isEdit ? "✅ Campaign updated!" : "🎉 Campaign launched!" });
        setTimeout(() => router.push("/admin/crm/campaign"), 1500);
      } else {
        setStatusMsg({ type: "error", text: data?.error || "Something went wrong" });
      }
    } catch (err) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, label: "Platforms"  },
    { n: 2, label: "Content"    },
    { n: 3, label: "AI Studio"  },
    { n: 4, label: "Schedule"   },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]"/>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[120px]"/>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-3 transition">
              <ArrowLeft size={16}/> Back
            </button>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-violet-200 to-cyan-300 bg-clip-text text-transparent">
              {isEdit ? "Edit Campaign" : "New Social Campaign"}
            </h1>
            <p className="text-slate-400 mt-1">AI-powered • All platforms • Schedule & Send</p>
          </div>
          {/* Social master status */}
          <button
            onClick={() => router.push("/admin/masters/social-media")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition ${
              socialMaster
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <Settings size={14}/>
            {socialMaster ? "Master Connected" : "Setup Social Master"}
          </button>
        </div>

        {/* Social master warning */}
        {!socialMaster && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="text-amber-400 shrink-0"/>
            <div>
              <span className="text-amber-300 font-bold">Social Media Master not configured. </span>
              <span className="text-amber-400/70">Platform posting, WhatsApp & Email will not work. </span>
              <button onClick={() => router.push("/admin/masters/social-media")}
                className="text-amber-300 underline font-bold hover:text-white">Set it up →</button>
            </div>
          </div>
        )}

        {/* Step bar */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <button type="button" onClick={() => setStep(s.n)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  step === s.n ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                  : step > s.n ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-slate-500 border border-white/10"
                }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${step === s.n ? "bg-white text-violet-600" : ""}`}>
                  {step > s.n ? "✓" : s.n}
                </span>
                {s.label}
              </button>
              {i < steps.length - 1 && <div className={`w-8 h-px mx-1 ${step > s.n ? "bg-emerald-500/50" : "bg-white/10"}`}/>}
            </div>
          ))}
        </div>

        {/* Status */}
        {statusMsg && (
          <div className={`mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
            statusMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            : statusMsg.type === "info"  ? "bg-blue-500/10 border border-blue-500/30 text-blue-300"
            : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
          }`}>
            {statusMsg.type === "success" ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
            {statusMsg.text}
            <button onClick={() => setStatusMsg(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ══ STEP 1: PLATFORMS ══ */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Globe size={18} className="text-violet-400"/> Campaign Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Campaign Name *</label>
                    <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-semibold"
                      placeholder="Summer Launch 2025" required/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Industry / Niche</label>
                    <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-semibold"
                      placeholder="Fashion, Tech, Food, Fitness..."/>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-cyan-400"/> Select Platforms</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {PLATFORMS.map(({ id, label, Icon, color }) => {
                    const connected = isPlatformConnected(id);
                    const selected  = selectedPlatforms.includes(id);
                    return (
                      <button key={id} type="button" onClick={() => togglePlatform(id)}
                        className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${
                          selected ? "border-violet-500 bg-violet-500/10 scale-105 shadow-lg shadow-violet-500/20"
                          : "border-white/10 bg-white/3 hover:border-white/20"
                        }`}>
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                            <CheckCircle size={10}/>
                          </div>
                        )}
                        {/* Connected indicator */}
                        <div className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-700"}`}
                          title={connected ? "Connected" : "Not connected in master"}/>
                        <Icon size={28} style={{ color: selected ? color : "#64748b" }}/>
                        <span className={`text-[11px] font-black ${selected ? "text-white" : "text-slate-500"}`}>{label}</span>
                        {!connected && (
                          <span className="text-[9px] text-slate-700 font-bold">Not linked</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedPlatforms.some((p) => !isPlatformConnected(p)) && socialMaster && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                    <Link2 size={12}/> Some selected platforms are not connected in Social Master. Post will be saved but not auto-published.
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Video size={18} className="text-pink-400"/> Content Type</h2>
                <div className="flex flex-wrap gap-3">
                  {CONTENT_TYPES.map((ct) => (
                    <button key={ct.id} type="button" onClick={() => setContentType(ct.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                        contentType === ct.id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                        : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                      }`}>
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => setStep(2)}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:opacity-90 transition">
                Next: Content <ChevronRight size={20}/>
              </button>
            </div>
          )}

          {/* ══ STEP 2: CONTENT ══ */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Wand2 size={18} className="text-violet-400"/> Post Topic</h2>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-semibold"
                  placeholder="e.g. New product launch, Diwali offer, Company milestone..."/>
              </div>

              {/* Caption */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black flex items-center gap-2"><FileImage size={18} className="text-cyan-400"/> Caption *</h2>
                  <button type="button" onClick={generateCaption} disabled={!topic || aiLoading.caption}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-xl text-xs font-bold hover:bg-violet-600/30 disabled:opacity-40">
                    {aiLoading.caption ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>} AI Generate
                  </button>
                </div>
                {genCaptions.length > 0 && (
                  <div className="grid gap-2 mb-4">
                    {genCaptions.map((c, i) => (
                      <div key={i} onClick={() => setCaption(c.caption)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          caption === c.caption ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/20"
                        }`}>
                        <div className="text-[9px] font-black uppercase text-violet-400 tracking-widest mb-1">{c.tone}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{c.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
                <textarea rows="5" value={caption} onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm leading-relaxed resize-none"
                  placeholder="Write or AI-generate your caption..."/>
                <p className="text-right text-xs text-slate-700 mt-1">{caption.length} chars</p>
              </div>

              {/* Hashtags */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black flex items-center gap-2"><Hash size={18} className="text-emerald-400"/> Hashtags</h2>
                  <button type="button" onClick={generateHashtags} disabled={!topic || aiLoading.hashtags}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-600/30 disabled:opacity-40">
                    {aiLoading.hashtags ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>} AI Generate
                  </button>
                </div>
                {genHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {genHashtags.map((h, i) => (
                      <button key={i} type="button"
                        onClick={() => setHashtags((p) => p.includes(h.tag) ? p.filter((x) => x !== h.tag) : [...p, h.tag])}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          hashtags.includes(h.tag) ? "bg-emerald-600 text-white"
                          : h.size === "mega" ? "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
                          : h.size === "mid"  ? "bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                          : "bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                        }`}>
                        #{h.tag} <span className="opacity-50">{h.size}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {hashtags.map((h, i) => (
                    <span key={i} className="flex items-center gap-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 px-2.5 py-1 rounded-full text-xs font-bold">
                      #{h} <button type="button" onClick={() => setHashtags((p) => p.filter((_, idx) => idx !== i))}><X size={9}/></button>
                    </span>
                  ))}
                </div>
                <input type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-sm"
                  placeholder="Type hashtag + Enter to add manually..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = e.target.value.replace("#", "").trim();
                      if (val) { setHashtags((p) => [...new Set([...p, val])]); e.target.value = ""; }
                    }
                  }}/>
              </div>

              {/* Media */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Image size={18} className="text-pink-400"/> Media</h2>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Plus size={22} className="text-slate-600"/>
                  </div>
                  <p className="text-slate-500 font-semibold text-sm">Click to upload images or videos</p>
                  <p className="text-slate-700 text-xs mt-1">PNG, JPG, MP4 up to 100MB</p>
                  <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setMediaFiles((p) => [...p, ...Array.from(e.target.files || [])])}/>
                </div>
                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {mediaFiles.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                        {f.type.startsWith("image/")
                          ? <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full bg-white/10 flex items-center justify-center text-[10px] text-slate-500 font-bold p-1 text-center leading-tight">{f.name}</div>
                        }
                        <button type="button" onClick={() => setMediaFiles((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-400 hover:bg-white/10 transition">← Back</button>
                <button type="button" onClick={() => setStep(3)} className="flex-[2] py-4 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition">
                  Next: AI Studio <Sparkles size={18}/>
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: AI STUDIO ══ */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

              {/* Trending */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black flex items-center gap-2"><TrendingUp size={18} className="text-orange-400"/> Trending Topics</h2>
                  <button type="button" onClick={fetchTrending} disabled={!industry || aiLoading.trending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-bold hover:bg-orange-600/30 disabled:opacity-40">
                    {aiLoading.trending ? <Loader2 size={11} className="animate-spin"/> : <RefreshCw size={11}/>} Fetch Trends
                  </button>
                </div>
                {!industry && <p className="text-slate-600 text-sm">Add your industry in Step 1 first</p>}
                {trendingTopics.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trendingTopics.map((t, i) => (
                      <div key={i} onClick={() => setTopic(t.topic)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          topic === t.topic ? "border-orange-500 bg-orange-500/10" : "border-white/10 hover:border-white/20"
                        }`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-white text-sm">{t.topic}</span>
                          <div className="flex gap-1">
                            {(t.platforms || []).map((pl) => {
                              const plat = PLATFORMS.find((p) => p.id === pl);
                              return plat ? <plat.Icon key={pl} size={11} style={{ color: plat.color }}/> : null;
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">{t.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Best times */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-black flex items-center gap-2"><Clock size={18} className="text-cyan-400"/> Best Times to Post</h2>
                  <button type="button" onClick={suggestTimes} disabled={!selectedPlatforms.length || aiLoading.times}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold hover:bg-cyan-600/30 disabled:opacity-40">
                    {aiLoading.times ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>} Suggest Times
                  </button>
                </div>
                {suggestedTimes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestedTimes.map((s, i) => {
                      const plat = PLATFORMS.find((p) => p.id === s.platform?.toLowerCase());
                      return (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {plat && <plat.Icon size={14} style={{ color: plat.color }}/>}
                            <span className="font-bold text-sm capitalize">{s.platform}</span>
                            <span className="ml-auto text-xs text-emerald-400 font-bold">{s.engagement}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {(s.times || []).map((t, j) => (
                              <button key={j} type="button"
                                onClick={() => { const d = new Date().toISOString().split("T")[0]; setScheduledTime(`${d}T${t.split(" ")[0]}`); }}
                                className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-500/20 transition">
                                {t}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600">{s.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Video script */}
              {(contentType === "video" || contentType === "reel") && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black flex items-center gap-2"><Play size={18} className="text-red-400"/> 15-sec Video Script</h2>
                    <button type="button" onClick={generateVideoScript} disabled={!topic || aiLoading.video}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold hover:bg-red-600/30 disabled:opacity-40">
                      {aiLoading.video ? <Loader2 size={11} className="animate-spin"/> : <Wand2 size={11}/>} Generate
                    </button>
                  </div>
                  {videoScript && (
                    <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-white/3 border border-white/10 rounded-2xl p-4 font-mono">{videoScript}</pre>
                  )}
                </div>
              )}

              {/* Image prompt */}
              {(contentType === "post" || contentType === "story") && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-black flex items-center gap-2"><Image size={18} className="text-pink-400"/> AI Image Prompt</h2>
                    <button type="button" onClick={generateImagePrompt} disabled={!topic || aiLoading.image}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-600/20 border border-pink-500/30 text-pink-300 rounded-xl text-xs font-bold hover:bg-pink-600/30 disabled:opacity-40">
                      {aiLoading.image ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>} Generate
                    </button>
                  </div>
                  {imagePrompt && (
                    <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{imagePrompt}</p>
                      <p className="text-xs text-slate-600 mt-2">Use in Midjourney, DALL-E, Firefly, or Stable Diffusion</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-400 hover:bg-white/10 transition">← Back</button>
                <button type="button" onClick={() => setStep(4)} className="flex-[2] py-4 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition">
                  Next: Schedule <Calendar size={18}/>
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 4: SCHEDULE ══ */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

              <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4 flex items-center gap-2"><Send size={18} className="text-violet-400"/> Send Options</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SEND_MODES.map((sm) => (
                    <button key={sm.id} type="button" onClick={() => toggleMode(sm.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        sendModes.includes(sm.id) ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/20"
                      }`}>
                      <span className={sendModes.includes(sm.id) ? "text-violet-400" : "text-slate-600"}>{sm.icon}</span>
                      <span className={`text-xs font-black ${sendModes.includes(sm.id) ? "text-white" : "text-slate-500"}`}>{sm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {sendModes.includes("schedule") && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2"><AlarmClock size={18} className="text-cyan-400"/> Schedule Time</h2>
                  <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500 font-semibold"/>
                </div>
              )}

              {sendModes.includes("email") && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <h2 className="text-lg font-black mb-3 flex items-center gap-2"><Mail size={18} className="text-blue-400"/> Email Recipients</h2>
                  {!socialMaster?.customPlatforms?.some((c) => c.platformName?.toLowerCase() === "email" && c.enabled) && (
                    <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                      <AlertCircle size={12}/> Email not configured in Social Master. Add an "email" custom platform first.
                    </div>
                  )}
                  <textarea rows="3" value={emailRecipients} onChange={(e) => setEmailRecip(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono text-sm resize-none"
                    placeholder="john@example.com, sara@test.com&#10;one per line or comma separated"/>
                </div>
              )}

              {sendModes.includes("whatsapp") && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <h2 className="text-lg font-black mb-3 flex items-center gap-2"><MessageCircle size={18} className="text-emerald-400"/> WhatsApp Numbers</h2>
                  {!socialMaster?.whatsapp?.enabled && (
                    <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                      <AlertCircle size={12}/> WhatsApp not enabled in Social Master.
                    </div>
                  )}
                  <textarea rows="3" value={whatsappNumbers} onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono text-sm resize-none"
                    placeholder="+91 98765 43210&#10;one per line or comma separated"/>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gradient-to-br from-violet-600/10 to-cyan-600/10 border border-violet-500/20 rounded-3xl p-7">
                <h2 className="text-lg font-black mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: "Campaign", value: campaignName || "—" },
                    { label: "Content Type", value: contentType },
                    { label: "Hashtags", value: `${hashtags.length} tags` },
                    { label: "Media", value: `${mediaFiles.length} files` },
                    { label: "Schedule", value: sendModes.includes("instant") ? "Instant" : scheduledTime ? new Date(scheduledTime).toLocaleString("en-IN") : "Not set" },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">{item.label}</span>
                      <p className="text-white font-bold mt-0.5 capitalize">{item.value}</p>
                    </div>
                  ))}
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Platforms</span>
                    <div className="flex gap-1.5 mt-1">
                      {selectedPlatforms.map((id) => {
                        const p = PLATFORMS.find((x) => x.id === id);
                        return p ? <p.Icon key={id} size={16} style={{ color: p.color }}/> : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-slate-400 hover:bg-white/10 transition">← Back</button>
                <button type="submit" disabled={loading}
                  className="flex-[2] py-5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={22}/>
                    : isEdit ? <><CheckCircle size={22}/> Update Campaign</>
                    : <><Send size={22}/> Launch Campaign</>
                  }
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}