"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

import {
  Paperclip, X, CheckCircle, UploadCloud, FileSpreadsheet,
  MessageCircle, Mail, List, Download, Calendar,
  ChevronRight, Layout, Settings, Users, Smartphone, Loader2
} from "lucide-react";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());

export default function CampaignPage() {
  const router = useRouter();
  const excelInputRef = useRef(null);

  // ── State ──────────────────────────────────────────
  const [statusMessage, setStatusMessage]         = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [channel, setChannel]                     = useState("email");
  const [campaignName, setCampaignName]           = useState("");
  const [scheduledTime, setScheduledTime]         = useState("");
  const [sender, setSender]                       = useState("Marketing Team");
  const [emailSubject, setEmailSubject]           = useState("");
  const [ctaText, setCtaText]                     = useState("");
  const [ctaLink, setCtaLink]                     = useState("");
  const [emailContent, setEmailContent]           = useState("<p></p>");
  const [whatsappContent, setWhatsappContent]     = useState("");
  const [wordCount, setWordCount]                 = useState(0);
  const [attachments, setAttachments]             = useState([]);
  const [previewFile, setPreviewFile]             = useState(null);
  const [previewUrl, setPreviewUrl]               = useState(null);
  const [recipientSource, setRecipientSource]     = useState("segment");
  const [segments, setSegments]                   = useState([]);
  const [selectedSegment, setSelectedSegment]     = useState("");
  const [customersList, setCustomersList]         = useState([]);
  const [leadsList, setLeadsList]                 = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [selectedLeadIds, setSelectedLeadIds]     = useState(new Set());
  const [manualInput, setManualInput]             = useState("");
  const [excelFile, setExcelFile]                 = useState(null);
  const [excelPreviewRows, setExcelPreviewRows]   = useState([]);
  const [excelValidCount, setExcelValidCount]     = useState(0);
  const [excelInvalidCount, setExcelInvalidCount] = useState(0);
  const [templates, setTemplates]                 = useState([]);
  const [selectedTemplateId, setSelectedTemplateId]   = useState("");
  const [emailMasters, setEmailMasters]           = useState([]);
  const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");
  const [loadingSegments, setLoadingSegments]     = useState(true);
  const [loadingTemplates, setLoadingTemplates]   = useState(true);
  const [loadingCustomers, setLoadingCustomers]   = useState(false);
  const [loadingLeads, setLoadingLeads]           = useState(false);

  // 🔁 ADDED CC: state for CC emails (comma or newline separated)
  const [ccEmails, setCcEmails] = useState("");

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ── Initial fetch ──────────────────────────────────
  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingSegments(true);
      setLoadingTemplates(true);
      try {
        const token = getToken();
        if (!token) {
          setSegments([]); setTemplates([]); setEmailMasters([]);
          return;
        }
        const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
          fetch("/api/customers",      { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/lead",           { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/email-templates",{ headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/email-masters",  { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const customersData    = customersRes.ok    ? await customersRes.json()    : [];
        const leadsData        = leadsRes.ok        ? await leadsRes.json()        : [];
        const templatesRaw     = templatesRes.ok    ? await templatesRes.json()    : [];
        const emailMastersRaw  = emailMastersRes.ok ? await emailMastersRes.json() : [];

        const countOf = (d) => {
          if (!d) return 0;
          if (Array.isArray(d)) return d.length;
          if (d.data && Array.isArray(d.data)) return d.data.length;
          return 0;
        };

        setSegments([
          { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
          { id: "source_leads",     label: "New Leads",     count: countOf(leadsData),     desc: "Fetched from /api/lead" },
        ]);
        setTemplates(Array.isArray(templatesRaw) ? templatesRaw : templatesRaw?.data || []);
        setEmailMasters(Array.isArray(emailMastersRaw) ? emailMastersRaw : emailMastersRaw?.data || []);
      } catch (err) {
        console.error("fetch initial:", err);
        setSegments([{ id: "error", label: "Error loading", count: 0 }]);
      } finally {
        setLoadingSegments(false);
        setLoadingTemplates(false);
      }
    };
    fetchInitial();
  }, []);

  // ── Fetch customers / leads on segment change ──────
  useEffect(() => {
    const fetchCustomersList = async () => {
      if (selectedSegment !== "source_customers") {
        setCustomersList([]); setSelectedCustomerIds(new Set()); return;
      }
      setLoadingCustomers(true);
      try {
        const res  = await fetch("/api/customers", { headers: { Authorization: `Bearer ${getToken()}` } });
        const json = await res.json();
        const arr  = Array.isArray(json) ? json : json.data || [];
        setCustomersList(arr.map((c) => ({
          _id:   c.name,
          name:  c.customer_name || c.name || "—",
          email: c.email_id || "",
        })));
      } catch (err) { console.error(err); } finally { setLoadingCustomers(false); }
    };

    const fetchLeadsList = async () => {
      if (selectedSegment !== "source_leads") {
        setLeadsList([]); setSelectedLeadIds(new Set()); return;
      }
      setLoadingLeads(true);
      try {
        const res  = await fetch("/api/lead", { headers: { Authorization: `Bearer ${getToken()}` } });
        const json = await res.json();
        const arr  = Array.isArray(json) ? json : json.data || [];
        setLeadsList(arr.map((l) => ({
          _id:   l.name,
          name:  l.lead_name || l.name || "—",
          email: l.email_id || "",
        })));
      } catch (err) { console.error(err); } finally { setLoadingLeads(false); }
    };

    fetchCustomersList();
    fetchLeadsList();
  }, [selectedSegment]);

  // ── Sync email master preset ───────────────────────
  useEffect(() => {
    if (!selectedEmailMasterId) return;
    const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
    if (!m) return;
    const html = m.contentHtml || m.content || m.html || "<p></p>";
    setEmailContent(html);
    setEmailSubject(m.subject || "");
    setSender(m.fromName || m.sender || sender);
    setCtaText(m.ctaText || "");
    setCtaLink(m.ctaLink || "");
    setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
  }, [selectedEmailMasterId, emailMasters]);

  // ── Sync template ──────────────────────────────────
  useEffect(() => {
    if (!selectedTemplateId) return;
    const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
    if (!t) return;
    const html = t.contentHtml || t.content || t.html || "<p></p>";
    const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
    if (channel === "email") {
      setEmailContent(html);
      setEmailSubject(t.subject || "");
      setSender(t.fromName || sender);
      setCtaText(t.ctaText || "");
      setCtaLink(t.ctaLink || "");
      setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
    } else {
      setWhatsappContent(text);
    }
  }, [selectedTemplateId, templates, channel]);

  // ── Preview URL ────────────────────────────────────
  useEffect(() => {
    if (!previewFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(previewFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  // ESC key closes preview
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setPreviewFile(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── Handlers ───────────────────────────────────────
  const handleEmailEditorChange = (html) => {
    setEmailContent(html);
    const textOnly = html.replace(/<[^>]*>/g, " ").trim();
    setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
  };

  const handleAttachmentChange = (e) => {
    if (!e.target.files) return;
    const valid = Array.from(e.target.files).filter((f) => f.size <= 100 * 1024 * 1024);
    setAttachments((p) => [...p, ...valid]);
  };

  const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

  const clearExcel = () => {
    setExcelFile(null); setExcelPreviewRows([]);
    setExcelValidCount(0); setExcelInvalidCount(0);
    if (excelInputRef.current) excelInputRef.current.value = null;
  };

  const handleExcelChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb    = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const keys  = Object.keys(rows[0] || {});
        const emailKey = keys.find((k) => k.toLowerCase().includes("email")) || keys[0];
        const preview = rows.map((r, idx) => {
          const raw = (r[emailKey] ?? r.email ?? "").toString().trim();
          return { id: idx + 1, email: raw, valid: isValidEmail(raw) };
        });
        setExcelPreviewRows(preview);
        setExcelValidCount(preview.filter((p) => p.valid).length);
        setExcelInvalidCount(preview.filter((p) => !p.valid).length);
      } catch { clearExcel(); }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleCustomerSelect = (id) =>
    setSelectedCustomerIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const selectAllCustomers = () =>
    setSelectedCustomerIds(new Set(customersList.filter((c) => isValidEmail(c.email)).map((c) => c._id)));

  const toggleLeadSelect = (id) =>
    setSelectedLeadIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
  const selectAllLeads = () =>
    setSelectedLeadIds(new Set(leadsList.filter((l) => isValidEmail(l.email)).map((l) => l._id)));

  const downloadTemplate = () => {
    const blob = new Blob(["email\nexample@example.com\n"], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "template.csv"; a.click();
  };

  const parsedManualEmails = useCallback(() => {
    if (!manualInput) return [];
    return [...new Set(
      manualInput.split(/[\n,]+/)
        .map((m) => m.trim().toLowerCase())
        .filter((m) => isValidEmail(m))
    )];
  }, [manualInput]);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "application");
    const res  = await fetch("https://api.cloudinary.com/v1_1/dz1gfppll/auto/upload", { method: "POST", body: formData });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("Upload failed (invalid response)"); }
    if (!res.ok) throw new Error(data.error?.message || "Upload failed");
    return data.secure_url;
  };

  // ── BUILD RECIPIENT LIST (array of emails) ─────────
  const buildRecipientList = () => {
    if (recipientSource === "segment") {
      let emails = [];
      if (selectedSegment === "source_customers") {
        emails = selectedCustomerIds.size > 0
          ? customersList.filter((c) => selectedCustomerIds.has(c._id)).map((c) => c.email)
          : customersList.map((c) => c.email);
      } else if (selectedSegment === "source_leads") {
        emails = selectedLeadIds.size > 0
          ? leadsList.filter((l) => selectedLeadIds.has(l._id)).map((l) => l.email)
          : leadsList.map((l) => l.email);
      }
      return [...new Set(emails.map((e) => e?.toString().trim().toLowerCase()).filter(isValidEmail))];
    }

    if (recipientSource === "excel") {
      return excelPreviewRows.filter((r) => r.valid).map((r) => r.email);
    }

    if (recipientSource === "manual") {
      return parsedManualEmails();
    }

    return [];
  };

  // ── Submit ─────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      // Upload attachments
      let attachmentUrls = [];
      if (attachments.length > 0) {
        setStatusMessage({ type: "info", html: "Uploading attachments..." });
        attachmentUrls = await Promise.all(attachments.map(uploadToCloudinary));
      }

      const recipientEmails = buildRecipientList();

      if (recipientEmails.length === 0 && recipientSource !== "manual") {
        setStatusMessage({ type: "error", html: "Please select at least one valid recipient." });
        setLoading(false);
        return;
      }
      if (recipientSource === "manual" && parsedManualEmails().length === 0) {
        setStatusMessage({ type: "error", html: "No valid emails in manual input." });
        setLoading(false);
        return;
      }

      // 🔁 ADDED CC: parse CC emails from textarea (comma or newline separated)
      const ccArray = ccEmails
        .split(/[\n,]+/)
        .map(addr => addr.trim().toLowerCase())
        .filter(addr => isValidEmail(addr));
      // Remove duplicates
      const uniqueCC = [...new Set(ccArray)];

      const payload = {
        campaignName,
        scheduledTime,
        channel,
        sender: channel === "email" ? sender : "WhatsApp API",
        content: channel === "email" ? emailContent : whatsappContent,
        emailSubject,
        ctaText,
        ctaLink,
        recipientSource,
        recipientList:        recipientSource === "segment" ? recipientEmails : [],
        recipientExcelEmails: recipientSource === "excel"   ? recipientEmails : [],
        recipientManual:      recipientSource === "manual"  ? manualInput     : null,
        attachments: attachmentUrls,
        cc: uniqueCC,          // 👈 Send CC list as array (backend can handle array or string)
      };

      console.log("PAYLOAD:", payload);

      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", html: "Campaign Scheduled Successfully!" });
        router.push("/admin/crm/campaign");
      } else {
        const errData = await res.json();
        setStatusMessage({ type: "error", html: errData?.error || "Something went wrong." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", html: "Error: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Campaign <span className="text-indigo-600">Studio</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">Design and schedule your next big outreach</p>
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button type="button" onClick={() => setChannel("email")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
              <Mail size={18} /> Email
            </button>
            <button type="button" onClick={() => setChannel("whatsapp")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "whatsapp" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
              <MessageCircle size={18} /> WhatsApp
            </button>
          </div>
        </header>

        {/* Status message */}
        {statusMessage && (
          <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 ${statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : statusMessage.type === "info" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
            {statusMessage.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
            <div dangerouslySetInnerHTML={{ __html: statusMessage.html }} className="text-sm font-bold" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Form ── */}
          <form onSubmit={handleFormSubmit} className="lg:col-span-8 space-y-8">

            {/* 1. Identity & Timing */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity & Timing</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Campaign Name</label>
                  <input type="text" required value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
                    placeholder="Diwali Promo 2026" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Execution Time</label>
                  <input type="datetime-local" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
                </div>
              </div>

              {channel === "email" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sender Brand</label>
                    <input type="text" value={sender} onChange={(e) => setSender(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email Master Preset</label>
                    <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 appearance-none">
                      <option value="">Start from Scratch</option>
                      {emailMasters.map((m) => (
                        <option key={m._id || m.id} value={m._id || m.id}>{m.email || m.subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Audience */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target Audience</h2>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  {["segment", "excel", "manual"].map((src) => (
                    <button key={src} type="button" onClick={() => setRecipientSource(src)}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Segment */}
              {recipientSource === "segment" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {segments.map((s) => (
                    <div key={s.id} onClick={() => setSelectedSegment(s.id)}
                      className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedSegment === s.id ? "border-indigo-600 bg-indigo-50/30" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-800 text-lg">{s.label}</span>
                        {selectedSegment === s.id && <CheckCircle className="text-indigo-600" size={20} />}
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-1">{s.count} Contacts Found</p>

                      {selectedSegment === s.id && (s.id === "source_customers" || s.id === "source_leads") && (
                        <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                          <div className="flex gap-2">
                            <button type="button"
                              onClick={s.id === "source_customers" ? selectAllCustomers : selectAllLeads}
                              className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-indigo-200">
                              Select All
                            </button>
                            <button type="button"
                              onClick={() => s.id === "source_customers" ? setSelectedCustomerIds(new Set()) : setSelectedLeadIds(new Set())}
                              className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-slate-200">
                              Clear
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                            {(s.id === "source_customers" ? customersList : leadsList).map((item) => (
                              <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer group">
                                <input type="checkbox"
                                  checked={s.id === "source_customers" ? selectedCustomerIds.has(item._id) : selectedLeadIds.has(item._id)}
                                  onChange={() => s.id === "source_customers" ? toggleCustomerSelect(item._id) : toggleLeadSelect(item._id)}
                                  className="w-4 h-4 rounded-md border-slate-300 text-indigo-600" />
                                <div className="text-[11px] font-bold text-slate-700 truncate">
                                  {item.name} <span className="text-slate-400 font-normal ml-1">{item.email}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Excel */}
              {recipientSource === "excel" && (
                <div className="space-y-4">
                  <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-indigo-200 hover:bg-indigo-50/30 transition-all relative">
                    <UploadCloud className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-bold">Drop your Excel/CSV or click to browse</p>
                    <input type="file" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  {excelFile && (
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-emerald-400" />
                        <span className="text-sm font-bold">{excelValidCount} Valid Emails Detected</span>
                      </div>
                      <button type="button" onClick={clearExcel} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
                    </div>
                  )}
                  {excelPreviewRows.length > 0 && (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 text-sm font-bold flex justify-between">
                        <span>Email Preview ({excelPreviewRows.length})</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-600 font-bold">Valid: {excelValidCount}</span>
                          <span className="text-red-600 font-bold">Invalid: {excelInvalidCount}</span>
                        </div>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">#</th>
                              <th className="text-left px-3 py-2">Email</th>
                              <th className="text-left px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelPreviewRows.map((row) => (
                              <tr key={row.id} className="border-t">
                                <td className="px-3 py-2">{row.id}</td>
                                <td className="px-3 py-2 break-all">{row.email}</td>
                                <td className="px-3 py-2">
                                  {row.valid
                                    ? <span className="text-green-600 font-semibold">✅ Valid</span>
                                    : <span className="text-red-600 font-semibold">❌ Invalid</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual */}
              {recipientSource === "manual" && (
                <div className="space-y-2">
                  <textarea rows="6" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
                    className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
                    placeholder="john@example.com, sara@test.com..." />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">
                    {parsedManualEmails().length} Emails Parsed
                  </p>
                </div>
              )}

              {/* 🔁 ADDED CC: Carbon Copy section */}
              {channel === "email" && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Mail size={16} /> CC (Carbon Copy)
                  </label>
                  <textarea
                    rows="3"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
                    placeholder="Enter email addresses separated by commas or new lines&#10;e.g.,&#10;manager@company.com, colleague@example.com&#10;support@example.com"
                  />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right mt-1">
                    {ccEmails.split(/[\n,]+/).filter(addr => addr.trim() && isValidEmail(addr.trim())).length} Valid CC addresses
                  </p>
                </div>
              )}
            </div>

            {/* 3. Content */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Creative Content</h2>
                </div>
                <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Select a Template</option>
                  {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              {channel === "email" ? (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Subject Line</label>
                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                      placeholder="e.g., Don't miss your special gift!" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[400px]">
                    <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                      className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800"
                      placeholder="CTA Button Text (Shop Now)" />
                    <input type="url" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)}
                      className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800"
                      placeholder="CTA Destination URL (https://...)" />
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
                    <Download size={14} /> {wordCount} Words Written
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea rows="8" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)}
                    className="w-full px-6 py-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 leading-relaxed"
                    placeholder="Write your WhatsApp blast here..." />
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                    <span>Supports *bold* _italic_ ~strike~</span>
                    <span>{whatsappContent.length} Characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
              <input type="file" id="file-upload" multiple accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden" onChange={handleAttachmentChange} />
              <label htmlFor="file-upload"
                className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-3 rounded-xl hover:bg-gray-200 transition w-fit">
                <Paperclip size={16} /> Attach Files
              </label>

              {attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {attachments.map((file, i) => {
                    const thumbUrl = URL.createObjectURL(file);
                    return (
                      <div key={i} className="relative cursor-pointer">
                        {file.type.startsWith("image/") && (
                          <img src={thumbUrl} alt="" onClick={() => setPreviewFile(file)}
                            className="w-24 h-24 object-cover rounded-lg border" />
                        )}
                        {file.type.startsWith("video/") && (
                          <video src={thumbUrl} onClick={() => setPreviewFile(file)}
                            className="w-24 h-24 object-cover rounded-lg border" />
                        )}
                        {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
                          <div onClick={() => setPreviewFile(file)}
                            className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-lg text-xs text-center p-2">
                            {file.name}
                          </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
                          className="absolute top-1 right-1 bg-black text-white text-xs px-1 rounded">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview Modal */}
            {previewFile && previewUrl && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewFile(null)} />
                <div className="relative z-10 max-w-4xl w-full p-4">
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFile(null); }}
                    className="absolute top-3 right-3 bg-white px-3 py-1 rounded shadow z-[10000]">✕</button>
                  {previewFile.type.startsWith("image/") && <img src={previewUrl} alt="" className="max-h-[80vh] mx-auto rounded" />}
                  {previewFile.type.startsWith("video/") && <video src={previewUrl} controls autoPlay className="max-h-[80vh] mx-auto rounded" />}
                  {previewFile.type === "application/pdf" && <iframe src={previewUrl} className="w-full h-[80vh] bg-white rounded" />}
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={`w-full py-6 rounded-[2rem] text-white font-black text-xl tracking-tight shadow-xl transform transition active:scale-95 flex items-center justify-center gap-3 ${loading ? "bg-slate-400" : channel === "email" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {loading ? <Loader2 className="animate-spin" /> : <><Calendar size={24} /> Schedule {channel.toUpperCase()} Campaign</>}
            </button>
          </form>

          {/* ── Device Preview ── */}
          <div className="lg:col-span-4 sticky top-10 space-y-6">
            <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[12px] border-slate-800 relative aspect-[9/19] max-w-[340px] mx-auto overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-20" />
              <div className="bg-white h-full w-full rounded-[2.5rem] overflow-hidden flex flex-col">
                <div className="bg-slate-50 p-4 pt-10 text-center border-b border-slate-100">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-1">
                    {sender.charAt(0)}
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sender}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {channel === "email" ? (
                    <div>
                      <h4 className="font-black text-slate-800 text-base mb-4">{emailSubject || "Your Subject Line Preview"}</h4>
                      <div className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: emailContent }} />
                      {ctaText && (
                        <div className="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-center text-xs font-black uppercase">{ctaText}</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-100/50 p-4 rounded-3xl rounded-tl-none border border-emerald-100">
                      <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {whatsappContent || "Type a message to see the preview..."}
                      </p>
                      <p className="text-[8px] text-right text-emerald-600 font-bold mt-2 uppercase">12:00 PM ✓✓</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Live Device Preview</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import TiptapEditor from "@/components/TiptapEditor";
// import * as XLSX from "xlsx";
// import { useRouter } from "next/navigation";

// import {
//   Paperclip, X, CheckCircle, UploadCloud, FileSpreadsheet,
//   MessageCircle, Mail, List, Download, Calendar,
//   ChevronRight, Layout, Settings, Users, Smartphone, Loader2
// } from "lucide-react";

// const isValidEmail = (email) =>
//   /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());

// export default function CampaignPage() {
//   const router = useRouter();
//   const excelInputRef = useRef(null);

//   // ── State ──────────────────────────────────────────
//   const [statusMessage, setStatusMessage]         = useState(null);
//   const [loading, setLoading]                     = useState(false);
//   const [channel, setChannel]                     = useState("email");
//   const [campaignName, setCampaignName]           = useState("");
//   const [scheduledTime, setScheduledTime]         = useState("");
//   const [sender, setSender]                       = useState("Marketing Team");
//   const [emailSubject, setEmailSubject]           = useState("");
//   const [ctaText, setCtaText]                     = useState("");
//   const [ctaLink, setCtaLink]                     = useState("");   // ✅ NEW
//   const [emailContent, setEmailContent]           = useState("<p></p>");
//   const [whatsappContent, setWhatsappContent]     = useState("");
//   const [wordCount, setWordCount]                 = useState(0);
//   const [attachments, setAttachments]             = useState([]);
//   const [previewFile, setPreviewFile]             = useState(null);
//   const [previewUrl, setPreviewUrl]               = useState(null);
//   const [recipientSource, setRecipientSource]     = useState("segment");
//   const [segments, setSegments]                   = useState([]);
//   const [selectedSegment, setSelectedSegment]     = useState("");
//   const [customersList, setCustomersList]         = useState([]);
//   const [leadsList, setLeadsList]                 = useState([]);
//   const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
//   const [selectedLeadIds, setSelectedLeadIds]     = useState(new Set());
//   const [manualInput, setManualInput]             = useState("");
//   const [excelFile, setExcelFile]                 = useState(null);
//   const [excelPreviewRows, setExcelPreviewRows]   = useState([]);
//   const [excelValidCount, setExcelValidCount]     = useState(0);
//   const [excelInvalidCount, setExcelInvalidCount] = useState(0);
//   const [templates, setTemplates]                 = useState([]);
//   const [selectedTemplateId, setSelectedTemplateId]   = useState("");
//   const [emailMasters, setEmailMasters]           = useState([]);
//   const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");
//   const [loadingSegments, setLoadingSegments]     = useState(true);
//   const [loadingTemplates, setLoadingTemplates]   = useState(true);
//   const [loadingCustomers, setLoadingCustomers]   = useState(false);
//   const [loadingLeads, setLoadingLeads]           = useState(false);

//   const getToken = () =>
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ── Initial fetch ──────────────────────────────────
//   useEffect(() => {
//     const fetchInitial = async () => {
//       setLoadingSegments(true);
//       setLoadingTemplates(true);
//       try {
//         const token = getToken();
//         if (!token) {
//           setSegments([]); setTemplates([]); setEmailMasters([]);
//           return;
//         }
//         const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
//           fetch("/api/customers",      { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/lead",           { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-templates",{ headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-masters",  { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const customersData    = customersRes.ok    ? await customersRes.json()    : [];
//         const leadsData        = leadsRes.ok        ? await leadsRes.json()        : [];
//         const templatesRaw     = templatesRes.ok    ? await templatesRes.json()    : [];
//         const emailMastersRaw  = emailMastersRes.ok ? await emailMastersRes.json() : [];

//         const countOf = (d) => {
//           if (!d) return 0;
//           if (Array.isArray(d)) return d.length;
//           if (d.data && Array.isArray(d.data)) return d.data.length;
//           return 0;
//         };

//         setSegments([
//           { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
//           { id: "source_leads",     label: "New Leads",     count: countOf(leadsData),     desc: "Fetched from /api/lead" },
//         ]);
//         setTemplates(Array.isArray(templatesRaw) ? templatesRaw : templatesRaw?.data || []);
//         setEmailMasters(Array.isArray(emailMastersRaw) ? emailMastersRaw : emailMastersRaw?.data || []);
//       } catch (err) {
//         console.error("fetch initial:", err);
//         setSegments([{ id: "error", label: "Error loading", count: 0 }]);
//       } finally {
//         setLoadingSegments(false);
//         setLoadingTemplates(false);
//       }
//     };
//     fetchInitial();
//   }, []);

//   // ── Fetch customers / leads on segment change ──────
//   useEffect(() => {
//     const fetchCustomersList = async () => {
//       if (selectedSegment !== "source_customers") {
//         setCustomersList([]); setSelectedCustomerIds(new Set()); return;
//       }
//       setLoadingCustomers(true);
//       try {
//         const res  = await fetch("/api/customers", { headers: { Authorization: `Bearer ${getToken()}` } });
//         const json = await res.json();
//         const arr  = Array.isArray(json) ? json : json.data || [];
//         setCustomersList(arr.map((c) => ({
//           _id:   c.name,
//           name:  c.customer_name || c.name || "—",
//           email: c.email_id || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingCustomers(false); }
//     };

//     const fetchLeadsList = async () => {
//       if (selectedSegment !== "source_leads") {
//         setLeadsList([]); setSelectedLeadIds(new Set()); return;
//       }
//       setLoadingLeads(true);
//       try {
//         const res  = await fetch("/api/lead", { headers: { Authorization: `Bearer ${getToken()}` } });
//         const json = await res.json();
//         const arr  = Array.isArray(json) ? json : json.data || [];
//         setLeadsList(arr.map((l) => ({
//           _id:   l.name,
//           name:  l.lead_name || l.name || "—",
//           email: l.email_id || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingLeads(false); }
//     };

//     fetchCustomersList();
//     fetchLeadsList();
//   }, [selectedSegment]);

//   // ── Sync email master preset ───────────────────────
//   useEffect(() => {
//     if (!selectedEmailMasterId) return;
//     const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
//     if (!m) return;
//     const html = m.contentHtml || m.content || m.html || "<p></p>";
//     setEmailContent(html);
//     setEmailSubject(m.subject || "");
//     setSender(m.fromName || m.sender || sender);
//     setCtaText(m.ctaText || "");
//     setCtaLink(m.ctaLink || "");  // ✅ also sync ctaLink
//     setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//   }, [selectedEmailMasterId, emailMasters]);

//   // ── Sync template ──────────────────────────────────
//   useEffect(() => {
//     if (!selectedTemplateId) return;
//     const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
//     if (!t) return;
//     const html = t.contentHtml || t.content || t.html || "<p></p>";
//     const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
//     if (channel === "email") {
//       setEmailContent(html);
//       setEmailSubject(t.subject || "");
//       setSender(t.fromName || sender);
//       setCtaText(t.ctaText || "");
//       setCtaLink(t.ctaLink || "");   // ✅ also sync ctaLink
//       setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//     } else {
//       setWhatsappContent(text);
//     }
//   }, [selectedTemplateId, templates, channel]);

//   // ── Preview URL ────────────────────────────────────
//   useEffect(() => {
//     if (!previewFile) { setPreviewUrl(null); return; }
//     const url = URL.createObjectURL(previewFile);
//     setPreviewUrl(url);
//     return () => URL.revokeObjectURL(url);
//   }, [previewFile]);

//   // ESC key closes preview
//   useEffect(() => {
//     const h = (e) => { if (e.key === "Escape") setPreviewFile(null); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, []);

//   // ── Handlers ───────────────────────────────────────
//   const handleEmailEditorChange = (html) => {
//     setEmailContent(html);
//     const textOnly = html.replace(/<[^>]*>/g, " ").trim();
//     setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
//   };

//   const handleAttachmentChange = (e) => {
//     if (!e.target.files) return;
//     const valid = Array.from(e.target.files).filter((f) => f.size <= 100 * 1024 * 1024);
//     setAttachments((p) => [...p, ...valid]);
//   };

//   const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

//   const clearExcel = () => {
//     setExcelFile(null); setExcelPreviewRows([]);
//     setExcelValidCount(0); setExcelInvalidCount(0);
//     if (excelInputRef.current) excelInputRef.current.value = null;
//   };

//   const handleExcelChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelFile(file);
//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const wb    = XLSX.read(evt.target.result, { type: "array" });
//         const sheet = wb.Sheets[wb.SheetNames[0]];
//         const rows  = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//         const keys  = Object.keys(rows[0] || {});
//         const emailKey = keys.find((k) => k.toLowerCase().includes("email")) || keys[0];
//         const preview = rows.map((r, idx) => {
//           const raw = (r[emailKey] ?? r.email ?? "").toString().trim();
//           return { id: idx + 1, email: raw, valid: isValidEmail(raw) };
//         });
//         setExcelPreviewRows(preview);
//         setExcelValidCount(preview.filter((p) => p.valid).length);
//         setExcelInvalidCount(preview.filter((p) => !p.valid).length);
//       } catch { clearExcel(); }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const toggleCustomerSelect = (id) =>
//     setSelectedCustomerIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
//   const selectAllCustomers = () =>
//     setSelectedCustomerIds(new Set(customersList.filter((c) => isValidEmail(c.email)).map((c) => c._id)));

//   const toggleLeadSelect = (id) =>
//     setSelectedLeadIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
//   const selectAllLeads = () =>
//     setSelectedLeadIds(new Set(leadsList.filter((l) => isValidEmail(l.email)).map((l) => l._id)));

//   const downloadTemplate = () => {
//     const blob = new Blob(["email\nexample@example.com\n"], { type: "text/csv;charset=utf-8;" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a"); a.href = url; a.download = "template.csv"; a.click();
//   };

//   const parsedManualEmails = useCallback(() => {
//     if (!manualInput) return [];
//     return [...new Set(
//       manualInput.split(/[\n,]+/)
//         .map((m) => m.trim().toLowerCase())
//         .filter((m) => isValidEmail(m))
//     )];
//   }, [manualInput]);

//   const uploadToCloudinary = async (file) => {
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("upload_preset", "application");
//     const res  = await fetch("https://api.cloudinary.com/v1_1/dz1gfppll/auto/upload", { method: "POST", body: formData });
//     const text = await res.text();
//     let data;
//     try { data = JSON.parse(text); } catch { throw new Error("Upload failed (invalid response)"); }
//     if (!res.ok) throw new Error(data.error?.message || "Upload failed");
//     return data.secure_url;
//   };

//   // ── BUILD RECIPIENT LIST (array of emails) ─────────
//   const buildRecipientList = () => {
//     if (recipientSource === "segment") {
//       let emails = [];
//       if (selectedSegment === "source_customers") {
//         emails = selectedCustomerIds.size > 0
//           ? customersList.filter((c) => selectedCustomerIds.has(c._id)).map((c) => c.email)
//           : customersList.map((c) => c.email);
//       } else if (selectedSegment === "source_leads") {
//         emails = selectedLeadIds.size > 0
//           ? leadsList.filter((l) => selectedLeadIds.has(l._id)).map((l) => l.email)
//           : leadsList.map((l) => l.email);
//       }
//       return [...new Set(emails.map((e) => e?.toString().trim().toLowerCase()).filter(isValidEmail))];
//     }

//     if (recipientSource === "excel") {
//       return excelPreviewRows.filter((r) => r.valid).map((r) => r.email);
//     }

//     if (recipientSource === "manual") {
//       return parsedManualEmails();
//     }

//     return [];
//   };

//   // ── Submit ─────────────────────────────────────────
//   const handleFormSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setStatusMessage(null);

//     try {
//       // Upload attachments
//       let attachmentUrls = [];
//       if (attachments.length > 0) {
//         setStatusMessage({ type: "info", html: "Uploading attachments..." });
//         attachmentUrls = await Promise.all(attachments.map(uploadToCloudinary));
//       }

//       const recipientEmails = buildRecipientList();

//       if (recipientEmails.length === 0 && recipientSource !== "manual") {
//         setStatusMessage({ type: "error", html: "Please select at least one valid recipient." });
//         setLoading(false);
//         return;
//       }
//       if (recipientSource === "manual" && parsedManualEmails().length === 0) {
//         setStatusMessage({ type: "error", html: "No valid emails in manual input." });
//         setLoading(false);
//         return;
//       }

//       const payload = {
//         campaignName,
//         scheduledTime,
//         channel,
//         sender: channel === "email" ? sender : "WhatsApp API",
//         content: channel === "email" ? emailContent : whatsappContent,
//         emailSubject,
//         ctaText,
//         ctaLink,                              // ✅ ADDED
//         recipientSource,
//         recipientList:        recipientSource === "segment" ? recipientEmails : [],
//         recipientExcelEmails: recipientSource === "excel"   ? recipientEmails : [],
//         recipientManual:      recipientSource === "manual"  ? manualInput     : null,
//         attachments: attachmentUrls,
//       };

//       console.log("PAYLOAD:", payload);

//       const res = await fetch("/api/campaign", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${getToken()}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (res.ok) {
//         setStatusMessage({ type: "success", html: "Campaign Scheduled Successfully!" });
//         router.push("/admin/crm/campaign");
//       } else {
//         const errData = await res.json();
//         setStatusMessage({ type: "error", html: errData?.error || "Something went wrong." });
//       }
//     } catch (err) {
//       setStatusMessage({ type: "error", html: "Error: " + err.message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Render ─────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans">
//       <div className="max-w-7xl mx-auto">

//         {/* Header */}
//         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">
//               Campaign <span className="text-indigo-600">Studio</span>
//             </h1>
//             <p className="text-slate-500 font-medium mt-1">Design and schedule your next big outreach</p>
//           </div>
//           <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
//             <button type="button" onClick={() => setChannel("email")}
//               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <Mail size={18} /> Email
//             </button>
//             <button type="button" onClick={() => setChannel("whatsapp")}
//               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "whatsapp" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <MessageCircle size={18} /> WhatsApp
//             </button>
//           </div>
//         </header>

//         {/* Status message */}
//         {statusMessage && (
//           <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 ${statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : statusMessage.type === "info" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
//             {statusMessage.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
//             <div dangerouslySetInnerHTML={{ __html: statusMessage.html }} className="text-sm font-bold" />
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

//           {/* ── Form ── */}
//           <form onSubmit={handleFormSubmit} className="lg:col-span-8 space-y-8">

//             {/* 1. Identity & Timing */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
//                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity & Timing</h2>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Campaign Name</label>
//                   <input type="text" required value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
//                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
//                     placeholder="Diwali Promo 2026" />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Execution Time</label>
//                   <input type="datetime-local" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
//                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                 </div>
//               </div>

//               {channel === "email" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sender Brand</label>
//                     <input type="text" value={sender} onChange={(e) => setSender(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email Master Preset</label>
//                     <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 appearance-none">
//                       <option value="">Start from Scratch</option>
//                       {emailMasters.map((m) => (
//                         <option key={m._id || m.id} value={m._id || m.id}>{m.email || m.subject}</option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* 2. Audience */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target Audience</h2>
//                 </div>
//                 <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
//                   {["segment", "excel", "manual"].map((src) => (
//                     <button key={src} type="button" onClick={() => setRecipientSource(src)}
//                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
//                       {src}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Segment */}
//               {recipientSource === "segment" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {segments.map((s) => (
//                     <div key={s.id} onClick={() => setSelectedSegment(s.id)}
//                       className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedSegment === s.id ? "border-indigo-600 bg-indigo-50/30" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}>
//                       <div className="flex justify-between items-start">
//                         <span className="font-black text-slate-800 text-lg">{s.label}</span>
//                         {selectedSegment === s.id && <CheckCircle className="text-indigo-600" size={20} />}
//                       </div>
//                       <p className="text-xs text-slate-400 font-bold mt-1">{s.count} Contacts Found</p>

//                       {selectedSegment === s.id && (s.id === "source_customers" || s.id === "source_leads") && (
//                         <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
//                           <div className="flex gap-2">
//                             <button type="button"
//                               onClick={s.id === "source_customers" ? selectAllCustomers : selectAllLeads}
//                               className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-indigo-200">
//                               Select All
//                             </button>
//                             <button type="button"
//                               onClick={() => s.id === "source_customers" ? setSelectedCustomerIds(new Set()) : setSelectedLeadIds(new Set())}
//                               className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-slate-200">
//                               Clear
//                             </button>
//                           </div>
//                           <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
//                             {(s.id === "source_customers" ? customersList : leadsList).map((item) => (
//                               <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer group">
//                                 <input type="checkbox"
//                                   checked={s.id === "source_customers" ? selectedCustomerIds.has(item._id) : selectedLeadIds.has(item._id)}
//                                   onChange={() => s.id === "source_customers" ? toggleCustomerSelect(item._id) : toggleLeadSelect(item._id)}
//                                   className="w-4 h-4 rounded-md border-slate-300 text-indigo-600" />
//                                 <div className="text-[11px] font-bold text-slate-700 truncate">
//                                   {item.name} <span className="text-slate-400 font-normal ml-1">{item.email}</span>
//                                 </div>
//                               </label>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Excel */}
//               {recipientSource === "excel" && (
//                 <div className="space-y-4">
//                   <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-indigo-200 hover:bg-indigo-50/30 transition-all relative">
//                     <UploadCloud className="mx-auto text-slate-300 mb-4" size={48} />
//                     <p className="text-slate-500 font-bold">Drop your Excel/CSV or click to browse</p>
//                     <input type="file" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
//                   </div>
//                   {excelFile && (
//                     <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
//                       <div className="flex items-center gap-3">
//                         <FileSpreadsheet className="text-emerald-400" />
//                         <span className="text-sm font-bold">{excelValidCount} Valid Emails Detected</span>
//                       </div>
//                       <button type="button" onClick={clearExcel} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
//                     </div>
//                   )}
//                   {excelPreviewRows.length > 0 && (
//                     <div className="border rounded-xl overflow-hidden">
//                       <div className="bg-gray-100 px-4 py-2 text-sm font-bold flex justify-between">
//                         <span>Email Preview ({excelPreviewRows.length})</span>
//                         <div className="flex gap-3 text-xs">
//                           <span className="text-green-600 font-bold">Valid: {excelValidCount}</span>
//                           <span className="text-red-600 font-bold">Invalid: {excelInvalidCount}</span>
//                         </div>
//                       </div>
//                       <div className="max-h-[220px] overflow-y-auto">
//                         <table className="w-full text-sm">
//                           <thead className="bg-gray-50 sticky top-0">
//                             <tr>
//                               <th className="text-left px-3 py-2">#</th>
//                               <th className="text-left px-3 py-2">Email</th>
//                               <th className="text-left px-3 py-2">Status</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {excelPreviewRows.map((row) => (
//                               <tr key={row.id} className="border-t">
//                                 <td className="px-3 py-2">{row.id}</td>
//                                 <td className="px-3 py-2 break-all">{row.email}</td>
//                                 <td className="px-3 py-2">
//                                   {row.valid
//                                     ? <span className="text-green-600 font-semibold">✅ Valid</span>
//                                     : <span className="text-red-600 font-semibold">❌ Invalid</span>}
//                                 </td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Manual */}
//               {recipientSource === "manual" && (
//                 <div className="space-y-2">
//                   <textarea rows="6" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
//                     className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
//                     placeholder="john@example.com, sara@test.com..." />
//                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">
//                     {parsedManualEmails().length} Emails Parsed
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* 3. Content */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Creative Content</h2>
//                 </div>
//                 <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
//                   className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
//                   <option value="">Select a Template</option>
//                   {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
//                 </select>
//               </div>

//               {channel === "email" ? (
//                 <div className="space-y-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Subject Line</label>
//                     <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
//                       placeholder="e.g., Don't miss your special gift!" />
//                   </div>
//                   <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[400px]">
//                     <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
//                   </div>
//                   <div className="grid grid-cols-2 gap-4">
//                     <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
//                       className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800"
//                       placeholder="CTA Button Text (Shop Now)" />
//                     <input type="url" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)}
//                       className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800"
//                       placeholder="CTA Destination URL (https://...)" />
//                   </div>
//                   <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
//                     <Download size={14} /> {wordCount} Words Written
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   <textarea rows="8" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)}
//                     className="w-full px-6 py-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 leading-relaxed"
//                     placeholder="Write your WhatsApp blast here..." />
//                   <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
//                     <span>Supports *bold* _italic_ ~strike~</span>
//                     <span>{whatsappContent.length} Characters</span>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Attachments */}
//             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
//               <input type="file" id="file-upload" multiple accept="image/*,video/*,.pdf,.doc,.docx"
//                 className="hidden" onChange={handleAttachmentChange} />
//               <label htmlFor="file-upload"
//                 className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-3 rounded-xl hover:bg-gray-200 transition w-fit">
//                 <Paperclip size={16} /> Attach Files
//               </label>

//               {attachments.length > 0 && (
//                 <div className="mt-4 flex flex-wrap gap-3">
//                   {attachments.map((file, i) => {
//                     const thumbUrl = URL.createObjectURL(file);
//                     return (
//                       <div key={i} className="relative cursor-pointer">
//                         {file.type.startsWith("image/") && (
//                           <img src={thumbUrl} alt="" onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 object-cover rounded-lg border" />
//                         )}
//                         {file.type.startsWith("video/") && (
//                           <video src={thumbUrl} onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 object-cover rounded-lg border" />
//                         )}
//                         {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
//                           <div onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-lg text-xs text-center p-2">
//                             {file.name}
//                           </div>
//                         )}
//                         <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
//                           className="absolute top-1 right-1 bg-black text-white text-xs px-1 rounded">✕</button>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {/* Preview Modal */}
//             {previewFile && previewUrl && (
//               <div className="fixed inset-0 z-[9999] flex items-center justify-center">
//                 <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewFile(null)} />
//                 <div className="relative z-10 max-w-4xl w-full p-4">
//                   <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFile(null); }}
//                     className="absolute top-3 right-3 bg-white px-3 py-1 rounded shadow z-[10000]">✕</button>
//                   {previewFile.type.startsWith("image/") && <img src={previewUrl} alt="" className="max-h-[80vh] mx-auto rounded" />}
//                   {previewFile.type.startsWith("video/") && <video src={previewUrl} controls autoPlay className="max-h-[80vh] mx-auto rounded" />}
//                   {previewFile.type === "application/pdf" && <iframe src={previewUrl} className="w-full h-[80vh] bg-white rounded" />}
//                 </div>
//               </div>
//             )}

//             {/* Submit */}
//             <button type="submit" disabled={loading}
//               className={`w-full py-6 rounded-[2rem] text-white font-black text-xl tracking-tight shadow-xl transform transition active:scale-95 flex items-center justify-center gap-3 ${loading ? "bg-slate-400" : channel === "email" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//               {loading ? <Loader2 className="animate-spin" /> : <><Calendar size={24} /> Schedule {channel.toUpperCase()} Campaign</>}
//             </button>
//           </form>

//           {/* ── Device Preview ── */}
//           <div className="lg:col-span-4 sticky top-10 space-y-6">
//             <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[12px] border-slate-800 relative aspect-[9/19] max-w-[340px] mx-auto overflow-hidden">
//               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-20" />
//               <div className="bg-white h-full w-full rounded-[2.5rem] overflow-hidden flex flex-col">
//                 <div className="bg-slate-50 p-4 pt-10 text-center border-b border-slate-100">
//                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-1">
//                     {sender.charAt(0)}
//                   </div>
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sender}</p>
//                 </div>
//                 <div className="flex-1 overflow-y-auto p-5">
//                   {channel === "email" ? (
//                     <div>
//                       <h4 className="font-black text-slate-800 text-base mb-4">{emailSubject || "Your Subject Line Preview"}</h4>
//                       <div className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: emailContent }} />
//                       {ctaText && (
//                         <div className="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-center text-xs font-black uppercase">{ctaText}</div>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="bg-emerald-100/50 p-4 rounded-3xl rounded-tl-none border border-emerald-100">
//                       <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
//                         {whatsappContent || "Type a message to see the preview..."}
//                       </p>
//                       <p className="text-[8px] text-right text-emerald-600 font-bold mt-2 uppercase">12:00 PM ✓✓</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//             <div className="text-center">
//               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Live Device Preview</p>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import TiptapEditor from "@/components/TiptapEditor";
// import * as XLSX from "xlsx";
// import { useRouter } from "next/navigation";

// import {
//   Paperclip, X, CheckCircle, UploadCloud, FileSpreadsheet,
//   MessageCircle, Mail, List, Download, Calendar,
//   ChevronRight, Layout, Settings, Users, Smartphone, Loader2
// } from "lucide-react";

// const isValidEmail = (email) =>
//   /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());

// export default function CampaignPage() {
//   const router = useRouter();
//   const excelInputRef = useRef(null);

//   // ── State ──────────────────────────────────────────
//   const [statusMessage, setStatusMessage]         = useState(null);
//   const [loading, setLoading]                     = useState(false);
//   const [channel, setChannel]                     = useState("email");
//   const [campaignName, setCampaignName]           = useState("");
//   const [scheduledTime, setScheduledTime]         = useState("");
//   const [sender, setSender]                       = useState("Marketing Team");
//   const [emailSubject, setEmailSubject]           = useState("");
//   const [ctaText, setCtaText]                     = useState("");
//   const [emailContent, setEmailContent]           = useState("<p></p>");
//   const [whatsappContent, setWhatsappContent]     = useState("");
//   const [wordCount, setWordCount]                 = useState(0);
//   const [attachments, setAttachments]             = useState([]);
//   const [previewFile, setPreviewFile]             = useState(null);
//   const [previewUrl, setPreviewUrl]               = useState(null);
//   const [recipientSource, setRecipientSource]     = useState("segment");
//   const [segments, setSegments]                   = useState([]);
//   const [selectedSegment, setSelectedSegment]     = useState("");
//   const [customersList, setCustomersList]         = useState([]);
//   const [leadsList, setLeadsList]                 = useState([]);
//   const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
//   const [selectedLeadIds, setSelectedLeadIds]     = useState(new Set());
//   const [manualInput, setManualInput]             = useState("");
//   const [excelFile, setExcelFile]                 = useState(null);
//   const [excelPreviewRows, setExcelPreviewRows]   = useState([]);
//   const [excelValidCount, setExcelValidCount]     = useState(0);
//   const [excelInvalidCount, setExcelInvalidCount] = useState(0);
//   const [templates, setTemplates]                 = useState([]);
//   const [selectedTemplateId, setSelectedTemplateId]   = useState("");
//   const [emailMasters, setEmailMasters]           = useState([]);
//   const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");
//   const [loadingSegments, setLoadingSegments]     = useState(true);
//   const [loadingTemplates, setLoadingTemplates]   = useState(true);
//   const [loadingCustomers, setLoadingCustomers]   = useState(false);
//   const [loadingLeads, setLoadingLeads]           = useState(false);

//   const getToken = () =>
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // ── Initial fetch ──────────────────────────────────
//   useEffect(() => {
//     const fetchInitial = async () => {
//       setLoadingSegments(true);
//       setLoadingTemplates(true);
//       try {
//         const token = getToken();
//         if (!token) {
//           setSegments([]); setTemplates([]); setEmailMasters([]);
//           return;
//         }
//         const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
//           fetch("/api/customers",      { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/lead",           { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-templates",{ headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-masters",  { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const customersData    = customersRes.ok    ? await customersRes.json()    : [];
//         const leadsData        = leadsRes.ok        ? await leadsRes.json()        : [];
//         const templatesRaw     = templatesRes.ok    ? await templatesRes.json()    : [];
//         const emailMastersRaw  = emailMastersRes.ok ? await emailMastersRes.json() : [];

//         const countOf = (d) => {
//           if (!d) return 0;
//           if (Array.isArray(d)) return d.length;
//           if (d.data && Array.isArray(d.data)) return d.data.length;
//           return 0;
//         };

//         setSegments([
//           { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
//           { id: "source_leads",     label: "New Leads",     count: countOf(leadsData),     desc: "Fetched from /api/lead" },
//         ]);
//         setTemplates(Array.isArray(templatesRaw) ? templatesRaw : templatesRaw?.data || []);
//         setEmailMasters(Array.isArray(emailMastersRaw) ? emailMastersRaw : emailMastersRaw?.data || []);
//       } catch (err) {
//         console.error("fetch initial:", err);
//         setSegments([{ id: "error", label: "Error loading", count: 0 }]);
//       } finally {
//         setLoadingSegments(false);
//         setLoadingTemplates(false);
//       }
//     };
//     fetchInitial();
//   }, []);

//   // ── Fetch customers / leads on segment change ──────
//   useEffect(() => {
//     const fetchCustomersList = async () => {
//       if (selectedSegment !== "source_customers") {
//         setCustomersList([]); setSelectedCustomerIds(new Set()); return;
//       }
//       setLoadingCustomers(true);
//       try {
//         const res  = await fetch("/api/customers", { headers: { Authorization: `Bearer ${getToken()}` } });
//         const json = await res.json();
//         const arr  = Array.isArray(json) ? json : json.data || [];
//         setCustomersList(arr.map((c) => ({
//           _id:   c.name,
//           name:  c.customer_name || c.name || "—",
//           email: c.email_id || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingCustomers(false); }
//     };

//     const fetchLeadsList = async () => {
//       if (selectedSegment !== "source_leads") {
//         setLeadsList([]); setSelectedLeadIds(new Set()); return;
//       }
//       setLoadingLeads(true);
//       try {
//         const res  = await fetch("/api/lead", { headers: { Authorization: `Bearer ${getToken()}` } });
//         const json = await res.json();
//         const arr  = Array.isArray(json) ? json : json.data || [];
//         setLeadsList(arr.map((l) => ({
//           _id:   l.name,
//           name:  l.lead_name || l.name || "—",
//           email: l.email_id || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingLeads(false); }
//     };

//     fetchCustomersList();
//     fetchLeadsList();
//   }, [selectedSegment]);

//   // ── Sync email master preset ───────────────────────
//   useEffect(() => {
//     if (!selectedEmailMasterId) return;
//     const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
//     if (!m) return;
//     const html = m.contentHtml || m.content || m.html || "<p></p>";
//     setEmailContent(html);
//     setEmailSubject(m.subject || "");
//     setSender(m.fromName || m.sender || sender);
//     setCtaText(m.ctaText || "");
//     setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//   }, [selectedEmailMasterId, emailMasters]);

//   // ── Sync template ──────────────────────────────────
//   useEffect(() => {
//     if (!selectedTemplateId) return;
//     const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
//     if (!t) return;
//     const html = t.contentHtml || t.content || t.html || "<p></p>";
//     const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
//     if (channel === "email") {
//       setEmailContent(html);
//       setEmailSubject(t.subject || "");
//       setSender(t.fromName || sender);
//       setCtaText(t.ctaText || "");
//       setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//     } else {
//       setWhatsappContent(text);
//     }
//   }, [selectedTemplateId, templates, channel]);

//   // ── Preview URL ────────────────────────────────────
//   useEffect(() => {
//     if (!previewFile) { setPreviewUrl(null); return; }
//     const url = URL.createObjectURL(previewFile);
//     setPreviewUrl(url);
//     return () => URL.revokeObjectURL(url);
//   }, [previewFile]);

//   // ESC key closes preview
//   useEffect(() => {
//     const h = (e) => { if (e.key === "Escape") setPreviewFile(null); };
//     window.addEventListener("keydown", h);
//     return () => window.removeEventListener("keydown", h);
//   }, []);

//   // ── Handlers ───────────────────────────────────────
//   const handleEmailEditorChange = (html) => {
//     setEmailContent(html);
//     const textOnly = html.replace(/<[^>]*>/g, " ").trim();
//     setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
//   };

//   const handleAttachmentChange = (e) => {
//     if (!e.target.files) return;
//     const valid = Array.from(e.target.files).filter((f) => f.size <= 100 * 1024 * 1024);
//     setAttachments((p) => [...p, ...valid]);
//   };

//   const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

//   const clearExcel = () => {
//     setExcelFile(null); setExcelPreviewRows([]);
//     setExcelValidCount(0); setExcelInvalidCount(0);
//     if (excelInputRef.current) excelInputRef.current.value = null;
//   };

//   const handleExcelChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelFile(file);
//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const wb    = XLSX.read(evt.target.result, { type: "array" });
//         const sheet = wb.Sheets[wb.SheetNames[0]];
//         const rows  = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//         const keys  = Object.keys(rows[0] || {});
//         const emailKey = keys.find((k) => k.toLowerCase().includes("email")) || keys[0];
//         const preview = rows.map((r, idx) => {
//           const raw = (r[emailKey] ?? r.email ?? "").toString().trim();
//           return { id: idx + 1, email: raw, valid: isValidEmail(raw) };
//         });
//         setExcelPreviewRows(preview);
//         setExcelValidCount(preview.filter((p) => p.valid).length);
//         setExcelInvalidCount(preview.filter((p) => !p.valid).length);
//       } catch { clearExcel(); }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const toggleCustomerSelect = (id) =>
//     setSelectedCustomerIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
//   const selectAllCustomers = () =>
//     setSelectedCustomerIds(new Set(customersList.filter((c) => isValidEmail(c.email)).map((c) => c._id)));

//   const toggleLeadSelect = (id) =>
//     setSelectedLeadIds((p) => { const c = new Set(p); c.has(id) ? c.delete(id) : c.add(id); return c; });
//   const selectAllLeads = () =>
//     setSelectedLeadIds(new Set(leadsList.filter((l) => isValidEmail(l.email)).map((l) => l._id)));

//   const downloadTemplate = () => {
//     const blob = new Blob(["email\nexample@example.com\n"], { type: "text/csv;charset=utf-8;" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a"); a.href = url; a.download = "template.csv"; a.click();
//   };

//   const parsedManualEmails = useCallback(() => {
//     if (!manualInput) return [];
//     return [...new Set(
//       manualInput.split(/[\n,]+/)
//         .map((m) => m.trim().toLowerCase())
//         .filter((m) => isValidEmail(m))
//     )];
//   }, [manualInput]);

//   const uploadToCloudinary = async (file) => {
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("upload_preset", "application");
//     const res  = await fetch("https://api.cloudinary.com/v1_1/dz1gfppll/auto/upload", { method: "POST", body: formData });
//     const text = await res.text();
//     let data;
//     try { data = JSON.parse(text); } catch { throw new Error("Upload failed (invalid response)"); }
//     if (!res.ok) throw new Error(data.error?.message || "Upload failed");
//     return data.secure_url;
//   };

//   // ── BUILD RECIPIENT LIST (array of emails) ─────────
//   // ✅ FIX: Always send array — backend schema now [String]
//   const buildRecipientList = () => {
//     if (recipientSource === "segment") {
//       let emails = [];
//       if (selectedSegment === "source_customers") {
//         emails = selectedCustomerIds.size > 0
//           ? customersList.filter((c) => selectedCustomerIds.has(c._id)).map((c) => c.email)
//           : customersList.map((c) => c.email);
//       } else if (selectedSegment === "source_leads") {
//         emails = selectedLeadIds.size > 0
//           ? leadsList.filter((l) => selectedLeadIds.has(l._id)).map((l) => l.email)
//           : leadsList.map((l) => l.email);
//       }
//       return [...new Set(emails.map((e) => e?.toString().trim().toLowerCase()).filter(isValidEmail))];
//     }

//     if (recipientSource === "excel") {
//       return excelPreviewRows.filter((r) => r.valid).map((r) => r.email);
//     }

//     if (recipientSource === "manual") {
//       return parsedManualEmails();
//     }

//     return [];
//   };

//   // ── Submit ─────────────────────────────────────────
//   const handleFormSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setStatusMessage(null);

//     try {
//       // Upload attachments
//       let attachmentUrls = [];
//       if (attachments.length > 0) {
//         setStatusMessage({ type: "info", html: "Uploading attachments..." });
//         attachmentUrls = await Promise.all(attachments.map(uploadToCloudinary));
//       }

//       // ✅ FIX: recipientList is always an array of email strings
//       const recipientEmails = buildRecipientList();

//       if (recipientEmails.length === 0 && recipientSource !== "manual") {
//         setStatusMessage({ type: "error", html: "Please select at least one valid recipient." });
//         setLoading(false);
//         return;
//       }
//       if (recipientSource === "manual" && parsedManualEmails().length === 0) {
//         setStatusMessage({ type: "error", html: "No valid emails in manual input." });
//         setLoading(false);
//         return;
//       }

//       const payload = {
//         campaignName,
//         scheduledTime,
//         channel,
//         sender: channel === "email" ? sender : "WhatsApp API",
//         content: channel === "email" ? emailContent : whatsappContent,
//         emailSubject,
//         ctaText,
//         recipientSource,

//         // ✅ Always arrays — matches updated schema
//         recipientList:        recipientSource === "segment" ? recipientEmails : [],
//         recipientExcelEmails: recipientSource === "excel"   ? recipientEmails : [],
//         recipientManual:      recipientSource === "manual"  ? manualInput     : null,

//         attachments: attachmentUrls,
//       };

//       console.log("PAYLOAD:", payload);

//       const res = await fetch("/api/campaign", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${getToken()}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (res.ok) {
//         setStatusMessage({ type: "success", html: "Campaign Scheduled Successfully!" });
//         router.push("/admin/crm/campaign");
//       } else {
//         const errData = await res.json();
//         setStatusMessage({ type: "error", html: errData?.error || "Something went wrong." });
//       }
//     } catch (err) {
//       setStatusMessage({ type: "error", html: "Error: " + err.message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Render ─────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans">
//       <div className="max-w-7xl mx-auto">

//         {/* Header */}
//         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">
//               Campaign <span className="text-indigo-600">Studio</span>
//             </h1>
//             <p className="text-slate-500 font-medium mt-1">Design and schedule your next big outreach</p>
//           </div>
//           <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
//             <button type="button" onClick={() => setChannel("email")}
//               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <Mail size={18} /> Email
//             </button>
//             <button type="button" onClick={() => setChannel("whatsapp")}
//               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "whatsapp" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <MessageCircle size={18} /> WhatsApp
//             </button>
//           </div>
//         </header>

//         {/* Status message */}
//         {statusMessage && (
//           <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 ${statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : statusMessage.type === "info" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
//             {statusMessage.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
//             <div dangerouslySetInnerHTML={{ __html: statusMessage.html }} className="text-sm font-bold" />
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

//           {/* ── Form ── */}
//           <form onSubmit={handleFormSubmit} className="lg:col-span-8 space-y-8">

//             {/* 1. Identity & Timing */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
//                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity & Timing</h2>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Campaign Name</label>
//                   <input type="text" required value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
//                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700"
//                     placeholder="Diwali Promo 2026" />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Execution Time</label>
//                   <input type="datetime-local" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
//                     className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                 </div>
//               </div>

//               {channel === "email" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sender Brand</label>
//                     <input type="text" value={sender} onChange={(e) => setSender(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email Master Preset</label>
//                     <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 appearance-none">
//                       <option value="">Start from Scratch</option>
//                       {emailMasters.map((m) => (
//                         <option key={m._id || m.id} value={m._id || m.id}>{m.email || m.subject}</option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* 2. Audience */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target Audience</h2>
//                 </div>
//                 <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
//                   {["segment", "excel", "manual"].map((src) => (
//                     <button key={src} type="button" onClick={() => setRecipientSource(src)}
//                       className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
//                       {src}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* Segment */}
//               {recipientSource === "segment" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {segments.map((s) => (
//                     <div key={s.id} onClick={() => setSelectedSegment(s.id)}
//                       className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedSegment === s.id ? "border-indigo-600 bg-indigo-50/30" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}>
//                       <div className="flex justify-between items-start">
//                         <span className="font-black text-slate-800 text-lg">{s.label}</span>
//                         {selectedSegment === s.id && <CheckCircle className="text-indigo-600" size={20} />}
//                       </div>
//                       <p className="text-xs text-slate-400 font-bold mt-1">{s.count} Contacts Found</p>

//                       {selectedSegment === s.id && (s.id === "source_customers" || s.id === "source_leads") && (
//                         <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
//                           <div className="flex gap-2">
//                             <button type="button"
//                               onClick={s.id === "source_customers" ? selectAllCustomers : selectAllLeads}
//                               className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-indigo-200">
//                               Select All
//                             </button>
//                             <button type="button"
//                               onClick={() => s.id === "source_customers" ? setSelectedCustomerIds(new Set()) : setSelectedLeadIds(new Set())}
//                               className="px-3 py-1.5 bg-white text-[10px] font-black uppercase rounded-lg border border-slate-200">
//                               Clear
//                             </button>
//                           </div>
//                           <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
//                             {(s.id === "source_customers" ? customersList : leadsList).map((item) => (
//                               <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer group">
//                                 <input type="checkbox"
//                                   checked={s.id === "source_customers" ? selectedCustomerIds.has(item._id) : selectedLeadIds.has(item._id)}
//                                   onChange={() => s.id === "source_customers" ? toggleCustomerSelect(item._id) : toggleLeadSelect(item._id)}
//                                   className="w-4 h-4 rounded-md border-slate-300 text-indigo-600" />
//                                 <div className="text-[11px] font-bold text-slate-700 truncate">
//                                   {item.name} <span className="text-slate-400 font-normal ml-1">{item.email}</span>
//                                 </div>
//                               </label>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {/* Excel */}
//               {recipientSource === "excel" && (
//                 <div className="space-y-4">
//                   <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center hover:border-indigo-200 hover:bg-indigo-50/30 transition-all relative">
//                     <UploadCloud className="mx-auto text-slate-300 mb-4" size={48} />
//                     <p className="text-slate-500 font-bold">Drop your Excel/CSV or click to browse</p>
//                     <input type="file" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
//                   </div>
//                   {excelFile && (
//                     <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
//                       <div className="flex items-center gap-3">
//                         <FileSpreadsheet className="text-emerald-400" />
//                         <span className="text-sm font-bold">{excelValidCount} Valid Emails Detected</span>
//                       </div>
//                       <button type="button" onClick={clearExcel} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
//                     </div>
//                   )}
//                   {excelPreviewRows.length > 0 && (
//                     <div className="border rounded-xl overflow-hidden">
//                       <div className="bg-gray-100 px-4 py-2 text-sm font-bold flex justify-between">
//                         <span>Email Preview ({excelPreviewRows.length})</span>
//                         <div className="flex gap-3 text-xs">
//                           <span className="text-green-600 font-bold">Valid: {excelValidCount}</span>
//                           <span className="text-red-600 font-bold">Invalid: {excelInvalidCount}</span>
//                         </div>
//                       </div>
//                       <div className="max-h-[220px] overflow-y-auto">
//                         <table className="w-full text-sm">
//                           <thead className="bg-gray-50 sticky top-0">
//                             <tr>
//                               <th className="text-left px-3 py-2">#</th>
//                               <th className="text-left px-3 py-2">Email</th>
//                               <th className="text-left px-3 py-2">Status</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {excelPreviewRows.map((row) => (
//                               <tr key={row.id} className="border-t">
//                                 <td className="px-3 py-2">{row.id}</td>
//                                 <td className="px-3 py-2 break-all">{row.email}</td>
//                                 <td className="px-3 py-2">
//                                   {row.valid
//                                     ? <span className="text-green-600 font-semibold">✅ Valid</span>
//                                     : <span className="text-red-600 font-semibold">❌ Invalid</span>}
//                                 </td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Manual */}
//               {recipientSource === "manual" && (
//                 <div className="space-y-2">
//                   <textarea rows="6" value={manualInput} onChange={(e) => setManualInput(e.target.value)}
//                     className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed"
//                     placeholder="john@example.com, sara@test.com..." />
//                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">
//                     {parsedManualEmails().length} Emails Parsed
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* 3. Content */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Creative Content</h2>
//                 </div>
//                 <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
//                   className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
//                   <option value="">Select a Template</option>
//                   {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
//                 </select>
//               </div>

//               {channel === "email" ? (
//                 <div className="space-y-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Subject Line</label>
//                     <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
//                       className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
//                       placeholder="e.g., Don't miss your special gift!" />
//                   </div>
//                   <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[400px]">
//                     <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
//                   </div>
//                   <div className="grid grid-cols-2 gap-4">
//                     <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
//                       className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800"
//                       placeholder="CTA Button Text (Shop Now)" />
//                     <div className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
//                       <Download size={14} /> {wordCount} Words Written
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   <textarea rows="8" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)}
//                     className="w-full px-6 py-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 leading-relaxed"
//                     placeholder="Write your WhatsApp blast here..." />
//                   <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
//                     <span>Supports *bold* _italic_ ~strike~</span>
//                     <span>{whatsappContent.length} Characters</span>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Attachments */}
//             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
//               <input type="file" id="file-upload" multiple accept="image/*,video/*,.pdf,.doc,.docx"
//                 className="hidden" onChange={handleAttachmentChange} />
//               <label htmlFor="file-upload"
//                 className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-3 rounded-xl hover:bg-gray-200 transition w-fit">
//                 <Paperclip size={16} /> Attach Files
//               </label>

//               {attachments.length > 0 && (
//                 <div className="mt-4 flex flex-wrap gap-3">
//                   {attachments.map((file, i) => {
//                     const thumbUrl = URL.createObjectURL(file);
//                     return (
//                       <div key={i} className="relative cursor-pointer">
//                         {file.type.startsWith("image/") && (
//                           <img src={thumbUrl} alt="" onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 object-cover rounded-lg border" />
//                         )}
//                         {file.type.startsWith("video/") && (
//                           <video src={thumbUrl} onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 object-cover rounded-lg border" />
//                         )}
//                         {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
//                           <div onClick={() => setPreviewFile(file)}
//                             className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-lg text-xs text-center p-2">
//                             {file.name}
//                           </div>
//                         )}
//                         <button onClick={(e) => { e.stopPropagation(); removeAttachment(i); }}
//                           className="absolute top-1 right-1 bg-black text-white text-xs px-1 rounded">✕</button>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>

//             {/* Preview Modal */}
//             {previewFile && previewUrl && (
//               <div className="fixed inset-0 z-[9999] flex items-center justify-center">
//                 <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewFile(null)} />
//                 <div className="relative z-10 max-w-4xl w-full p-4">
//                   <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFile(null); }}
//                     className="absolute top-3 right-3 bg-white px-3 py-1 rounded shadow z-[10000]">✕</button>
//                   {previewFile.type.startsWith("image/") && <img src={previewUrl} alt="" className="max-h-[80vh] mx-auto rounded" />}
//                   {previewFile.type.startsWith("video/") && <video src={previewUrl} controls autoPlay className="max-h-[80vh] mx-auto rounded" />}
//                   {previewFile.type === "application/pdf" && <iframe src={previewUrl} className="w-full h-[80vh] bg-white rounded" />}
//                 </div>
//               </div>
//             )}

//             {/* Submit */}
//             <button type="submit" disabled={loading}
//               className={`w-full py-6 rounded-[2rem] text-white font-black text-xl tracking-tight shadow-xl transform transition active:scale-95 flex items-center justify-center gap-3 ${loading ? "bg-slate-400" : channel === "email" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//               {loading ? <Loader2 className="animate-spin" /> : <><Calendar size={24} /> Schedule {channel.toUpperCase()} Campaign</>}
//             </button>
//           </form>

//           {/* ── Device Preview ── */}
//           <div className="lg:col-span-4 sticky top-10 space-y-6">
//             <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[12px] border-slate-800 relative aspect-[9/19] max-w-[340px] mx-auto overflow-hidden">
//               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-20" />
//               <div className="bg-white h-full w-full rounded-[2.5rem] overflow-hidden flex flex-col">
//                 <div className="bg-slate-50 p-4 pt-10 text-center border-b border-slate-100">
//                   <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-1">
//                     {sender.charAt(0)}
//                   </div>
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sender}</p>
//                 </div>
//                 <div className="flex-1 overflow-y-auto p-5">
//                   {channel === "email" ? (
//                     <div>
//                       <h4 className="font-black text-slate-800 text-base mb-4">{emailSubject || "Your Subject Line Preview"}</h4>
//                       <div className="text-[11px] text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: emailContent }} />
//                       {ctaText && (
//                         <div className="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-center text-xs font-black uppercase">{ctaText}</div>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="bg-emerald-100/50 p-4 rounded-3xl rounded-tl-none border border-emerald-100">
//                       <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
//                         {whatsappContent || "Type a message to see the preview..."}
//                       </p>
//                       <p className="text-[8px] text-right text-emerald-600 font-bold mt-2 uppercase">12:00 PM ✓✓</p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//             <div className="text-center">
//               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Live Device Preview</p>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }

// ===============================================================================================
// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import TiptapEditor from "@/components/TiptapEditor";
// import * as XLSX from "xlsx";
// import { useRouter } from "next/navigation";

// import {
//   Paperclip, X, CheckCircle, UploadCloud, FileSpreadsheet,
//   MessageCircle, Mail, List, Download, Calendar, 
//   ChevronRight, Layout, Settings, Users, Smartphone, Loader2
// } from "lucide-react";

// export default function CampaignPage() {
//   const router = useRouter();
//   const excelInputRef = useRef(null);

//   // --- ALL YOUR ORIGINAL LOGIC STATES PRESERVED ---
//   const [statusMessage, setStatusMessage] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [channel, setChannel] = useState("email"); 
//   const [campaignName, setCampaignName] = useState("");
//   const [scheduledTime, setScheduledTime] = useState("");
//   const [sender, setSender] = useState("Marketing Team");
//   const [emailSubject, setEmailSubject] = useState("");
//   const [ctaText, setCtaText] = useState("");
//   const [emailContent, setEmailContent] = useState("<p></p>");
//   const [whatsappContent, setWhatsappContent] = useState("");
//   const [wordCount, setWordCount] = useState(0);
//   const [attachments, setAttachments] = useState([]);
//   const [previewFile, setPreviewFile] = useState(null);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [recipientSource, setRecipientSource] = useState("segment"); 
//   const [segments, setSegments] = useState([]); 
//   const [selectedSegment, setSelectedSegment] = useState(""); 
//   const [customersList, setCustomersList] = useState([]); 
//   const [leadsList, setLeadsList] = useState([]); 
//   const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
//   const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
//   const [manualInput, setManualInput] = useState("");
//   const [excelFile, setExcelFile] = useState(null);
//   const [excelPreviewRows, setExcelPreviewRows] = useState([]); 
//   const [excelValidCount, setExcelValidCount] = useState(0);
//   const [excelInvalidCount, setExcelInvalidCount] = useState(0);
//   const [excelSentCount, setExcelSentCount] = useState(0);
//   const [templates, setTemplates] = useState([]);
//   const [selectedTemplateId, setSelectedTemplateId] = useState("");
//   const [emailMasters, setEmailMasters] = useState([]);
//   const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");
//   const [loadingSegments, setLoadingSegments] = useState(true);
//   const [loadingTemplates, setLoadingTemplates] = useState(true);
//   const [loadingCustomers, setLoadingCustomers] = useState(false);
//   const [loadingLeads, setLoadingLeads] = useState(false);

//   const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

//   // --- ALL YOUR ORIGINAL EFFECTS PRESERVED ---
//   useEffect(() => {
//     const fetchInitial = async () => {
//       setLoadingSegments(true);
//       setLoadingTemplates(true);
//       try {
//         const token = getToken();
//         if (!token) {
//           setSegments([]); setTemplates([]); setEmailMasters([]);
//           setLoadingSegments(false); setLoadingTemplates(false);
//           return;
//         }
//         const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
//           fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-templates", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-masters", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const customersData = customersRes.ok ? await customersRes.json() : [];
//         const leadsData = leadsRes.ok ? await leadsRes.json() : [];

//         let templatesData = [];
//         if (templatesRes.ok) {
//           const parsed = await templatesRes.json();
//           templatesData = Array.isArray(parsed) ? parsed : parsed?.data || [];
//         }

//         const emailMastersDataRaw = emailMastersRes.ok ? await emailMastersRes.json() : [];
//         const emailMastersData = Array.isArray(emailMastersDataRaw) ? emailMastersDataRaw : emailMastersDataRaw?.data || [];

//         const countOf = (d) => {
//           if (!d) return 0;
//           if (Array.isArray(d)) return d.length;
//           if (d.data && Array.isArray(d.data)) return d.data.length;
//           return 0;
//         };

//         setSegments([
//           { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
//           { id: "source_leads", label: "New Leads", count: countOf(leadsData), desc: "Fetched from /api/lead" },
//         ]);

//         setTemplates(templatesData || []);
//         setEmailMasters(emailMastersData || []);
//       } catch (err) {
//         console.error("fetch initial:", err);
//         setSegments([{ id: "error", label: "Error loading", count: 0, desc: "Check API" }]);
//       } finally {
//         setLoadingSegments(false);
//         setLoadingTemplates(false);
//       }
//     };
//     fetchInitial();
//   }, []);

//   useEffect(() => {
//     const fetchCustomersList = async () => {
//       if (selectedSegment !== "source_customers") {
//         setCustomersList([]); setSelectedCustomerIds(new Set()); return;
//       }
//       setLoadingCustomers(true);
//       try {
//         const token = getToken();
//         const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
//         const json = await res.json();
//         const arr = Array.isArray(json) ? json : json.data || [];
//         setCustomersList(
//   arr.map((c) => ({
//     _id: c.name,
//     name: c.customer_name || c.name || "—",
//     email: c.email_id || "",
//   }))
// );
//       } catch (err) { console.error(err); } finally { setLoadingCustomers(false); }
//     };

//     const fetchLeadsList = async () => {
//       if (selectedSegment !== "source_leads") {
//         setLeadsList([]); setSelectedLeadIds(new Set()); return;
//       }
//       setLoadingLeads(true);
//       try {
//         const token = getToken();
//         const res = await fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } });
//         const json = await res.json();
//         const arr = Array.isArray(json) ? json : json.data || [];
//        setLeadsList(
//   arr.map((l) => ({
//     _id: l.name, // ERPNext document name is unique
//     name: l.lead_name || l.name || "—",
//     email: l.email_id || "", // ✅ CORRECT FIELD
//   }))
// );
//       } catch (err) { console.error(err); } finally { setLoadingLeads(false); }
//     };

//     fetchCustomersList();
//     fetchLeadsList();
//   }, [selectedSegment]);

//   useEffect(() => {
//     if (!selectedEmailMasterId) return;
//     const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
//     if (!m) return;
//     const html = m.contentHtml || m.content || m.html || "<p></p>";
//     setEmailContent(html); setEmailSubject(m.subject || ""); setSender(m.fromName || m.sender || sender); setCtaText(m.ctaText || "");
//     setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//   }, [selectedEmailMasterId, emailMasters]);

//   useEffect(() => {
//     if (!selectedTemplateId) return;
//     const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
//     if (!t) return;
//     const html = t.contentHtml || t.content || t.html || "<p></p>";
//     const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
//     if (channel === "email") {
//       setEmailContent(html); setEmailSubject(t.subject || ""); setSender(t.fromName || sender); setCtaText(t.ctaText || "");
//       setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//     } else { setWhatsappContent(text); }
//   }, [selectedTemplateId, templates, channel]);

//   // --- ALL YOUR ORIGINAL HANDLERS PRESERVED ---
//   const handleEmailEditorChange = (html) => {
//     setEmailContent(html);
//     const textOnly = html.replace(/<[^>]*>/g, " ").trim();
//     setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
//   };

//   // const handleAttachmentChange = (e) => {
//   //   if (e.target.files) setAttachments((p) => [...p, ...Array.from(e.target.files)]);
//   // };
//   const handleAttachmentChange = (e) => {
//     if (!e.target.files) return;

//     const files = Array.from(e.target.files);

//     // 100MB limit example
//     const validFiles = files.filter(
//       (file) => file.size <= 100 * 1024 * 1024
//     );

//     setAttachments((prev) => [...prev, ...validFiles]);
//   };

//   // Generate Preview URL safely
//   useEffect(() => {
//     if (!previewFile) {
//       setPreviewUrl(null);
//       return;
//     }

//     const url = URL.createObjectURL(previewFile);
//     setPreviewUrl(url);

//     return () => URL.revokeObjectURL(url); // memory cleanup
//   }, [previewFile]);

//   // ESC key close
//   useEffect(() => {
//     const handleEsc = (e) => {
//       if (e.key === "Escape") setPreviewFile(null);
//     };
//     window.addEventListener("keydown", handleEsc);
//     return () => window.removeEventListener("keydown", handleEsc);
//   }, []);
//   const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

//   // const clearExcel = () => {
//   //   setExcelFile(null); setExcelPreviewRows([]); setExcelValidCount(0); setExcelInvalidCount(0); setExcelSentCount(0);
//   //   if (excelInputRef.current) excelInputRef.current.value = "";
//   // };


//   const clearExcel = () => {
//   setExcelFile(null);
//   setExcelPreviewRows([]);
//   setExcelValidCount(0);
//   setExcelInvalidCount(0);
//   setExcelSentCount(0);

//   if (excelInputRef.current) {
//     excelInputRef.current.value = null;
//   }
// };
//   const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());
//   // const isValidEmail = (email) => email?.toString().trim().replace(/,+$/, "").toLowerCase();

//   const handleExcelChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelFile(file);
//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const data = evt.target.result;
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//         const firstRowKeys = Object.keys(rows[0] || {});
//         const emailKey =
//   firstRowKeys.find(k =>
//     k.toLowerCase().includes("email")
//   ) || firstRowKeys[0];
//        const preview = rows.map((r, idx) => {
//   const rawEmail = (r[emailKey] ?? r.email ?? "").toString().trim();

//   return {
//     id: idx + 1,
//     email: rawEmail,
//     raw: r,
//     valid: isValidEmail(rawEmail),
//     isSent: false
//   };
// });
//         setExcelPreviewRows(preview);
//         setExcelValidCount(preview.filter(p => p.valid).length);
//         setExcelInvalidCount(preview.filter(p => !p.valid).length);
//       } catch (err) { clearExcel(); }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const toggleCustomerSelect = (id) => {
//     setSelectedCustomerIds((prev) => {
//       const copy = new Set(prev);
//       copy.has(id) ? copy.delete(id) : copy.add(id);
//       return copy;
//     });
//   };
//   const selectAllCustomers = () => setSelectedCustomerIds(new Set(customersList.filter(c => isValidEmail(c.email)).map(c => c._id)));
  
//   const toggleLeadSelect = (id) => {
//     setSelectedLeadIds((prev) => {
//       const copy = new Set(prev);
//       copy.has(id) ? copy.delete(id) : copy.add(id);
//       return copy;
//     });
//   };
//   const selectAllLeads = () => setSelectedLeadIds(new Set(leadsList.filter(c => isValidEmail(c.email)).map(c => c._id)));

//   const downloadTemplate = () => {
//     const blob = new Blob(["email\nexample@example.com\n"], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a"); a.href = url; a.download = "template.csv"; a.click();
//   };

//   const parsedManualEmails = useCallback(() => {
//   if (!manualInput) return [];

//   return [
//     ...new Set(
//       manualInput
//         .split(/[\n,]+/)
//         .map((m) => m.trim().toLowerCase())
//         .filter((m) => isValidEmail(m))
//     )
//   ];
// }, [manualInput]);


// const uploadToCloudinary = async (file) => {
//   const formData = new FormData();

//   formData.append("file", file);
//   formData.append("upload_preset", "application"); 
//   // 👆 Cloudinary dashboard se lo
//   // Settings → Upload → Upload Preset (Unsigned)

//   const res = await fetch(
//     `https://api.cloudinary.com/v1_1/dz1gfppll/auto/upload`,
//     {
//       method: "POST",
//       body: formData,
//     }
//   );

//   const text = await res.text();

//   let data;
//   try {
//     data = JSON.parse(text);
//   } catch {
//     console.error("Invalid Cloudinary response:", text);
//     throw new Error("Upload failed (invalid response)");
//   }

//   if (!res.ok) {
//     throw new Error(data.error?.message || "Upload failed");
//   }

//   return data.secure_url;
// };

//  const handleFormSubmit = async (e) => {
//   e.preventDefault();
//   setLoading(true);
//   setStatusMessage(null);

//   try {
//     // // ================= ATTACHMENTS =================
//     // const attachmentBase64 = await Promise.all(
//     //   attachments.map(
//     //     (file) =>
//     //       new Promise((resolve) => {
//     //         const reader = new FileReader();
//     //         reader.onload = () => resolve(reader.result);
//     //         reader.readAsDataURL(file);
//     //       })
//     //   )
//     // );

//     // ================= ATTACHMENTS =================
// let attachmentUrls = [];

// if (attachments.length > 0) {
//   setStatusMessage({
//     type: "info",
//     html: "Uploading attachments..."
//   });

//   attachmentUrls = await Promise.all(
//     attachments.map(file => uploadToCloudinary(file))
//   );
// }

//     // ================= BUILD RECIPIENTS =================

// let recipientListPayload = [];

// if (recipientSource === "segment") {
//   if (selectedSegment === "source_customers") {
//     recipientListPayload =
//       selectedCustomerIds.size > 0
//         ? customersList
//             .filter(c => selectedCustomerIds.has(c._id))
//             .map(c => c.email)
//         : customersList.map(c => c.email);
//   }

//   if (selectedSegment === "source_leads") {
//     recipientListPayload =
//       selectedLeadIds.size > 0
//         ? leadsList
//             .filter(l => selectedLeadIds.has(l._id))
//             .map(l => l.email)
//         : leadsList.map(l => l.email);
//   }
// }

// if (recipientSource === "excel") {
//   recipientListPayload = excelPreviewRows
//     .filter(r => r.valid)
//     .map(r => r.email);
// }

// if (recipientSource === "manual") {
//   recipientListPayload = parsedManualEmails();
// }

// // remove duplicates + invalid
// recipientListPayload = [
//   ...new Set(
//     recipientListPayload
//       .map(e => e?.toString().trim().toLowerCase())
//       .filter(e => isValidEmail(e))
//   )
// ];

// if (recipientListPayload.length === 0) {
//   setStatusMessage({
//     type: "error",
//     html: "Please select at least one valid recipient."
//   });
//   setLoading(false);
//   return;
// }

// const payload = {
//   campaignName,
//   scheduledTime,
//   channel,
//   sender: channel === "email" ? sender : "WhatsApp API",
//   content: channel === "email" ? emailContent : whatsappContent,
//   emailSubject,
//   ctaText,

//   recipientSource,
//   recipientList: recipientSource === "segment" ? recipientListPayload : [],
//   recipientExcelEmails: recipientSource === "excel" ? recipientListPayload : [],
//   recipientManual: recipientSource === "manual" ? manualInput : null,

//   attachments: attachmentUrls,
// };

//     console.log("FINAL PAYLOAD:", payload);

//     // ================= API CALL =================
//     const res = await fetch("/api/campaign", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${getToken()}`,
//       },
//       body: JSON.stringify(payload),
//     });

//     if (res.ok) {
//       setStatusMessage({
//         type: "success",
//         html: "Campaign Scheduled Successfully!",
//       });
//       router.push("/admin/crm/campaign");
//     } else {
//       const errData = await res.json();
//       setStatusMessage({
//         type: "error",
//         html: errData?.error || "Something went wrong.",
//       });
//     }

//   } catch (err) {
//     setStatusMessage({
//       type: "error",
//       html: "Error: " + err.message,
//     });
//   } finally {
//     setLoading(false);
//   }
// };

//   function formatStringToAMPM(dateString) {
//     if (!dateString) return "";
//     const date = new Date(dateString);
//     return date.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' });
//   }

//   // --- NEW ADVANCED UI RENDER ---
//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans">
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header Section */}
//         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campaign <span className="text-indigo-600">Studio</span></h1>
//             <p className="text-slate-500 font-medium mt-1">Design and schedule your next big outreach</p>
//           </div>
//           <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
//             <button type="button" onClick={() => setChannel("email")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <Mail size={18} /> Email
//             </button>
//             <button type="button" onClick={() => setChannel("whatsapp")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "whatsapp" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <MessageCircle size={18} /> WhatsApp
//             </button>
//           </div>
//         </header>

//         {statusMessage && (
//           <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
//             {statusMessage.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
//             <div dangerouslySetInnerHTML={{ __html: statusMessage.html }} className="text-sm font-bold" />
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
//           {/* Form Side */}
//           <form onSubmit={handleFormSubmit} className="lg:col-span-8 space-y-8">
            
//             {/* 1. Basic Details */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
//                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity & Timing</h2>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Campaign Name</label>
//                   <input type="text" name="campaignName" required   value={campaignName}
//   onChange={(e) => setCampaignName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" placeholder="Diwali Promo 2026" />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Execution Time</label>
//                   <input type="datetime-local" name="scheduledTime" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                 </div>
//               </div>

//               {channel === "email" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sender Brand</label>
//                     <input type="text" name="sender" value={sender} onChange={(e) => setSender(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email Master Preset</label>
//                     <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 appearance-none">
//                       <option value="">Start from Scratch</option>
//                       {emailMasters.map((m) => <option key={m._id || m.id} value={m._id || m.id}>{m.email || m.subject}</option>)}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* 2. Audience */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target Audience</h2>
//                 </div>
//                 <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
//                   {['segment', 'excel', 'manual'].map(src => (
//                     <button key={src} type="button" onClick={() => setRecipientSource(src)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
//                       {src}
//                     </button>
//                   ))}

//                 </div>
//               </div>

//               {recipientSource === "segment" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {segments.map((s) => (
//                     <div key={s.id} onClick={() => setSelectedSegment(s.id)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden ${selectedSegment === s.id ? "border-indigo-600 bg-indigo-50/30" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}>
//                       <div className="flex justify-between items-start">
//                         <span className="font-black text-slate-800 text-lg leading-tight">{s.label}</span>
//                         {selectedSegment === s.id && <CheckCircle className="text-indigo-600" size={20} />}
//                       </div>
//                       <p className="text-xs text-slate-400 font-bold mt-1">{s.count} Contacts Found</p>
                      
//                       {selectedSegment === s.id && (s.id === "source_customers" || s.id === "source_leads") && (
//                         <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
//                           <div className="flex gap-2">
//                              <button type="button" onClick={s.id === "source_customers" ? selectAllCustomers : selectAllLeads} className="px-3 py-1.5 bg-white text-[10px] font-black uppercase tracking-tighter rounded-lg border border-indigo-200">Select All</button>
//                              <button type="button" onClick={() => s.id === "source_customers" ? setSelectedCustomerIds(new Set()) : setSelectedLeadIds(new Set())} className="px-3 py-1.5 bg-white text-[10px] font-black uppercase tracking-tighter rounded-lg border border-slate-200">Clear</button>
//                           </div>
//                           <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1">
//                             {(s.id === "source_customers" ? customersList : leadsList).map(item => (
//                               <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group">
//                                 <input type="checkbox" checked={s.id === "source_customers" ? selectedCustomerIds.has(item._id) : selectedLeadIds.has(item._id)} onChange={() => s.id === "source_customers" ? toggleCustomerSelect(item._id) : toggleLeadSelect(item._id)} className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" />
//                                 <div className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 truncate">{item.name} <span className="text-slate-400 ml-1 font-normal">{item.email}</span></div>
//                               </label>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {recipientSource === "excel" && (
//                 <div className="space-y-4">
//                   <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all relative">
//                     <UploadCloud className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-500 transition-colors" size={48} />
//                     <p className="text-slate-500 font-bold">Drop your Excel/CSV or click to browse</p>
//                     <input type="file" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
//                   </div>
//                   {excelFile && (
//                     <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
//                       <div className="flex items-center gap-3">
//                         <FileSpreadsheet className="text-emerald-400" />
//                         <span className="text-sm font-bold">{excelValidCount} Valid Emails Detects</span>
//                       </div>
//                       <button type="button" onClick={clearExcel} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
//                     </div>
//                   )}
//                   {excelPreviewRows.length > 0 && (
//   <div className="mt-4 border rounded-xl overflow-hidden">

//     {/* Header */}
//     <div className="bg-gray-100 px-4 py-2 text-sm font-bold flex justify-between">
//       <span>Email Preview ({excelPreviewRows.length})</span>

//       <div className="flex gap-3 text-xs">
//         <span className="text-green-600 font-bold">
//           Valid: {excelValidCount}
//         </span>
//         <span className="text-red-600 font-bold">
//           Invalid: {excelInvalidCount}
//         </span>
//       </div>
//     </div>

//     {/* Scroll after 5 rows */}
//     <div className="max-h-[220px] overflow-y-auto">

//       <table className="w-full text-sm">
//         <thead className="bg-gray-50 sticky top-0">
//           <tr>
//             <th className="text-left px-3 py-2">#</th>
//             <th className="text-left px-3 py-2">Email</th>
//             <th className="text-left px-3 py-2">Status</th>
//           </tr>
//         </thead>

//         <tbody>
//           {excelPreviewRows.map((row) => (
//             <tr key={row.id} className="border-t">
//               <td className="px-3 py-2">{row.id}</td>

//               <td className="px-3 py-2 break-all">
//                 {row.email}
//               </td>

//               <td className="px-3 py-2">
//                 {row.valid ? (
//                   <span className="text-green-600 font-semibold">
//                     ✅ Valid
//                   </span>
//                 ) : (
//                   <span className="text-red-600 font-semibold">
//                     ❌ Invalid
//                   </span>
//                 )}
//               </td>
//             </tr>
//           ))}
//         </tbody>

//       </table>
//     </div>
//   </div>
// )}

//                 </div>
//               )}

//               {recipientSource === "manual" && (
//                 <div className="space-y-2">
//                   <textarea rows="6" value={manualInput} onChange={(e) => setManualInput(e.target.value)} className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed" placeholder="john@example.com, sara@test.com..." />
//                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">{parsedManualEmails().length} Emails Parsed</p>
//                 </div>
//               )}
//             </div>

//             {/* 3. Content */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Creative Content</h2>
//                 </div>
//                 <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
//                   <option value="">Select a Template</option>
//                   {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
//                 </select>
//               </div>

//               {channel === "email" ? (
//                 <div className="space-y-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Subject Line</label>
//                     <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" placeholder="e.g., Don't miss your special gift!" />
//                   </div>
//                   <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[400px]">
//                     <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
//                   </div>
//                   <div className="grid grid-cols-2 gap-4">
//                     <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800" placeholder="CTA Button Text (Shop Now)" />
//                     <div className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
//                         <Download size={14} /> {wordCount} Words Written
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                    <textarea rows="8" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)} className="w-full px-6 py-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 leading-relaxed" placeholder="Write your WhatsApp blast here..." />
//                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
//                       <span>Supports *bold* _italic_ ~strike~</span>
//                       <span>{whatsappContent.length} Characters</span>
//                    </div>
//                 </div>
//               )}
//             </div>
//  <div className="mt-4">
//       {/* FILE INPUT */}
//       <div className="relative inline-block">
//         <input
//           type="file"
//           id="file-upload"
//           multiple
//           accept="image/*,video/*,.pdf,.doc,.docx"
//           className="hidden"
//           onChange={handleAttachmentChange}
//         />
//         <label
//           htmlFor="file-upload"
//           className="cursor-pointer flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition"
//         >
//           📎 Attach Files
//         </label>
//       </div>

//       {/* THUMBNAILS */}
//       {attachments.length > 0 && (
//         <div className="mt-3 flex flex-wrap gap-3">
//           {attachments.map((file, i) => {
//             const thumbUrl = URL.createObjectURL(file);

//             return (
//               <div key={i} className="relative cursor-pointer">
//                 {/* Image */}
//                 {file.type.startsWith("image/") && (
//                   <img
//                     src={thumbUrl}
//                     alt=""
//                     className="w-24 h-24 object-cover rounded-lg border"
//                     onClick={() => setPreviewFile(file)}
//                   />
//                 )}

//                 {/* Video */}
//                 {file.type.startsWith("video/") && (
//                   <video
//                     src={thumbUrl}
//                     className="w-24 h-24 object-cover rounded-lg border"
//                     onClick={() => setPreviewFile(file)}
//                   />
//                 )}

//                 {/* Other Files */}
//                 {!file.type.startsWith("image/") &&
//                   !file.type.startsWith("video/") && (
//                     <div
//                       onClick={() => setPreviewFile(file)}
//                       className="w-24 h-24 flex items-center justify-center bg-gray-200 rounded-lg text-xs text-center p-2"
//                     >
//                       {file.name}
//                     </div>
//                   )}

//                 {/* Remove Button */}
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setAttachments((prev) =>
//                       prev.filter((_, index) => index !== i)
//                     );
//                   }}
//                   className="absolute top-1 right-1 bg-black text-white text-xs px-1 rounded"
//                 >
//                   ✕
//                 </button>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* FULL PREVIEW MODAL */}
//       {previewFile && previewUrl && (
//   <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    
//     {/* Backdrop */}
//     <div
//       className="absolute inset-0 bg-black/80"
//       onClick={() => setPreviewFile(null)}
//     />

//     {/* Modal Content */}
//     <div className="relative z-10 max-w-4xl w-full p-4">
      
//       {/* Close Button */}
//         <button
//           type="button"
//           onClick={(e) => {
//             e.preventDefault();
//             e.stopPropagation();
//             setPreviewFile(null);
//           }}
//           className="absolute top-3 right-3 bg-white px-3 py-1 rounded shadow z-[10000]"
//         >
//           ✕
//         </button>

//       {/* IMAGE */}
//       {previewFile.type.startsWith("image/") && (
//         <img
//           src={previewUrl}
//           alt=""
//           className="max-h-[80vh] mx-auto rounded"
//         />
//       )}

//       {/* VIDEO */}
//       {previewFile.type.startsWith("video/") && (
//         <video
//           src={previewUrl}
//           controls
//           autoPlay
//           className="max-h-[80vh] mx-auto rounded"
//         />
//       )}

//       {/* PDF */}
//       {previewFile.type === "application/pdf" && (
//         <iframe
//           src={previewUrl}
//           className="w-full h-[80vh] bg-white rounded"
//         />
//       )}
//     </div>
//   </div>
// )}
//     </div>
//             <button type="submit" disabled={loading} className={`w-full py-6 rounded-[2rem] text-white font-black text-xl tracking-tight shadow-xl shadow-indigo-200 transform transition active:scale-95 flex items-center justify-center gap-3 ${loading ? "bg-slate-400" : channel === "email" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//               {loading ? <Loader2 className="animate-spin" /> : <><Calendar size={24} /> Schedule {channel.toUpperCase()} Campaign</>}
//             </button>
//           </form>

//           {/* Right Preview Side */}
//           <div className="lg:col-span-4 sticky top-10 space-y-6">
//             <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[12px] border-slate-800 relative aspect-[9/19] max-w-[340px] mx-auto overflow-hidden">
//                 {/* iPhone Notch */}
//                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-20"></div>
                
//                 <div className="bg-white h-full w-full rounded-[2.5rem] overflow-hidden flex flex-col relative">
//                     {/* App Header */}
//                     <div className="bg-slate-50 p-4 pt-10 text-center border-b border-slate-100">
//                         <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-1 shadow-sm">
//                             {sender.charAt(0)}
//                         </div>
//                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sender}</p>
//                     </div>

//                     <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
//                         {channel === "email" ? (
//                           <div className="animate-in fade-in zoom-in-95 duration-500">
//                             <h4 className="font-black text-slate-800 text-base leading-tight mb-4">{emailSubject || "Your Subject Line Preview"}</h4>
//                             <div className="text-[11px] text-slate-600 leading-relaxed preview-html" dangerouslySetInnerHTML={{ __html: emailContent }} />
//                             {ctaText && (
//                               <div className="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-center text-xs font-black uppercase tracking-widest shadow-lg">
//                                 {ctaText}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <div className="space-y-4">
//                             <div className="bg-emerald-100/50 p-4 rounded-3xl rounded-tl-none shadow-sm border border-emerald-100 self-start max-w-[90%] animate-in slide-in-from-left-4">
//                               <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">{whatsappContent || "Type a message to see the preview..."}</p>
//                               <p className="text-[8px] text-right text-emerald-600 font-bold mt-2 uppercase">12:00 PM ✓✓</p>
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//             <div className="text-center">
//               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Live Device Preview</p>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }



// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import TiptapEditor from "@/components/TiptapEditor";
// import * as XLSX from "xlsx";
// import { useRouter } from "next/navigation";

// import {
//   Paperclip, X, CheckCircle, UploadCloud, FileSpreadsheet,
//   MessageCircle, Mail, List, Download, Calendar, 
//   ChevronRight, Layout, Settings, Users, Smartphone, Loader2
// } from "lucide-react";

// export default function CampaignPage() {
//   const router = useRouter();
//   const excelInputRef = useRef(null);

//   // --- ALL YOUR ORIGINAL LOGIC STATES PRESERVED ---
//   const [statusMessage, setStatusMessage] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [channel, setChannel] = useState("email"); 
//   const [campaignName, setCampaignName] = useState("");
//   const [scheduledTime, setScheduledTime] = useState("");
//   const [sender, setSender] = useState("Marketing Team");
//   const [emailSubject, setEmailSubject] = useState("");
//   const [ctaText, setCtaText] = useState("");
//   const [emailContent, setEmailContent] = useState("<p></p>");
//   const [whatsappContent, setWhatsappContent] = useState("");
//   const [wordCount, setWordCount] = useState(0);
//   const [attachments, setAttachments] = useState([]);
//   const [recipientSource, setRecipientSource] = useState("segment"); 
//   const [segments, setSegments] = useState([]); 
//   const [selectedSegment, setSelectedSegment] = useState(""); 
//   const [customersList, setCustomersList] = useState([]); 
//   const [leadsList, setLeadsList] = useState([]); 
//   const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
//   const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
//   const [manualInput, setManualInput] = useState("");
//   const [excelFile, setExcelFile] = useState(null);
//   const [excelPreviewRows, setExcelPreviewRows] = useState([]); 
//   const [excelValidCount, setExcelValidCount] = useState(0);
//   const [excelInvalidCount, setExcelInvalidCount] = useState(0);
//   const [excelSentCount, setExcelSentCount] = useState(0);
//   const [templates, setTemplates] = useState([]);
//   const [selectedTemplateId, setSelectedTemplateId] = useState("");
//   const [emailMasters, setEmailMasters] = useState([]);
//   const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");
//   const [loadingSegments, setLoadingSegments] = useState(true);
//   const [loadingTemplates, setLoadingTemplates] = useState(true);
//   const [loadingCustomers, setLoadingCustomers] = useState(false);
//   const [loadingLeads, setLoadingLeads] = useState(false);

//   const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

//   // --- ALL YOUR ORIGINAL EFFECTS PRESERVED ---
//   useEffect(() => {
//     const fetchInitial = async () => {
//       setLoadingSegments(true);
//       setLoadingTemplates(true);
//       try {
//         const token = getToken();
//         if (!token) {
//           setSegments([]); setTemplates([]); setEmailMasters([]);
//           setLoadingSegments(false); setLoadingTemplates(false);
//           return;
//         }
//         const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
//           fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-templates", { headers: { Authorization: `Bearer ${token}` } }),
//           fetch("/api/email-masters", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const customersData = customersRes.ok ? await customersRes.json() : [];
//         const leadsData = leadsRes.ok ? await leadsRes.json() : [];

//         let templatesData = [];
//         if (templatesRes.ok) {
//           const parsed = await templatesRes.json();
//           templatesData = Array.isArray(parsed) ? parsed : parsed?.data || [];
//         }

//         const emailMastersDataRaw = emailMastersRes.ok ? await emailMastersRes.json() : [];
//         const emailMastersData = Array.isArray(emailMastersDataRaw) ? emailMastersDataRaw : emailMastersDataRaw?.data || [];

//         const countOf = (d) => {
//           if (!d) return 0;
//           if (Array.isArray(d)) return d.length;
//           if (d.data && Array.isArray(d.data)) return d.data.length;
//           return 0;
//         };

//         setSegments([
//           { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
//           { id: "source_leads", label: "New Leads", count: countOf(leadsData), desc: "Fetched from /api/lead" },
//         ]);

//         setTemplates(templatesData || []);
//         setEmailMasters(emailMastersData || []);
//       } catch (err) {
//         console.error("fetch initial:", err);
//         setSegments([{ id: "error", label: "Error loading", count: 0, desc: "Check API" }]);
//       } finally {
//         setLoadingSegments(false);
//         setLoadingTemplates(false);
//       }
//     };
//     fetchInitial();
//   }, []);

//   useEffect(() => {
//     const fetchCustomersList = async () => {
//       if (selectedSegment !== "source_customers") {
//         setCustomersList([]); setSelectedCustomerIds(new Set()); return;
//       }
//       setLoadingCustomers(true);
//       try {
//         const token = getToken();
//         const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
//         const json = await res.json();
//         const arr = Array.isArray(json) ? json : json.data || [];
//         setCustomersList(arr.map((c) => ({
//           _id: c._id || c.id || c.emailId || Math.random().toString(36).slice(2, 9),
//           name: c.customerName || c.name || c.fullName || c.companyName || "—",
//           email: c.emailId || c.email || c.emailAddress || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingCustomers(false); }
//     };

//     const fetchLeadsList = async () => {
//       if (selectedSegment !== "source_leads") {
//         setLeadsList([]); setSelectedLeadIds(new Set()); return;
//       }
//       setLoadingLeads(true);
//       try {
//         const token = getToken();
//         const res = await fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } });
//         const json = await res.json();
//         const arr = Array.isArray(json) ? json : json.data || [];
//         setLeadsList(arr.map((l) => ({
//           _id: l._id || l.id || Math.random().toString(36).slice(2, 9),
//           name: l.leadName || l.name || l.fullName || l.companyName || "—",
//           email: l.email || l.emailId || l.emailAddress || "",
//         })));
//       } catch (err) { console.error(err); } finally { setLoadingLeads(false); }
//     };

//     fetchCustomersList();
//     fetchLeadsList();
//   }, [selectedSegment]);

//   useEffect(() => {
//     if (!selectedEmailMasterId) return;
//     const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
//     if (!m) return;
//     const html = m.contentHtml || m.content || m.html || "<p></p>";
//     setEmailContent(html); setEmailSubject(m.subject || ""); setSender(m.fromName || m.sender || sender); setCtaText(m.ctaText || "");
//     setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//   }, [selectedEmailMasterId, emailMasters]);

//   useEffect(() => {
//     if (!selectedTemplateId) return;
//     const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
//     if (!t) return;
//     const html = t.contentHtml || t.content || t.html || "<p></p>";
//     const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
//     if (channel === "email") {
//       setEmailContent(html); setEmailSubject(t.subject || ""); setSender(t.fromName || sender); setCtaText(t.ctaText || "");
//       setWordCount(html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length);
//     } else { setWhatsappContent(text); }
//   }, [selectedTemplateId, templates, channel]);

//   // --- ALL YOUR ORIGINAL HANDLERS PRESERVED ---
//   const handleEmailEditorChange = (html) => {
//     setEmailContent(html);
//     const textOnly = html.replace(/<[^>]*>/g, " ").trim();
//     setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
//   };

//   const handleAttachmentChange = (e) => {
//     if (e.target.files) setAttachments((p) => [...p, ...Array.from(e.target.files)]);
//   };
//   const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

//   const clearExcel = () => {
//     setExcelFile(null); setExcelPreviewRows([]); setExcelValidCount(0); setExcelInvalidCount(0); setExcelSentCount(0);
//     if (excelInputRef.current) excelInputRef.current.value = "";
//   };

//   const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());
//   const normalizeEmail = (email) => email?.toString().trim().replace(/,+$/, "").toLowerCase();

//   const handleExcelChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelFile(file);
//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const data = evt.target.result;
//         const workbook = XLSX.read(data, { type: "array" });
//         const sheet = workbook.Sheets[workbook.SheetNames[0]];
//         const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//         const firstRowKeys = Object.keys(rows[0] || {});
//         let emailKey = firstRowKeys[0];
//         const preview = rows.map((r, idx) => {
//           const rawEmail = normalizeEmail(r[emailKey] ?? r.email ?? "");
//           return { id: idx + 1, email: rawEmail || "", raw: r, valid: isValidEmail(rawEmail), isSent: false };
//         });
//         setExcelPreviewRows(preview);
//         setExcelValidCount(preview.filter(p => p.valid).length);
//         setExcelInvalidCount(preview.filter(p => !p.valid).length);
//       } catch (err) { clearExcel(); }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   const toggleCustomerSelect = (id) => {
//     setSelectedCustomerIds((prev) => {
//       const copy = new Set(prev);
//       copy.has(id) ? copy.delete(id) : copy.add(id);
//       return copy;
//     });
//   };
//   const selectAllCustomers = () => setSelectedCustomerIds(new Set(customersList.filter(c => isValidEmail(c.email)).map(c => c._id)));
  
//   const toggleLeadSelect = (id) => {
//     setSelectedLeadIds((prev) => {
//       const copy = new Set(prev);
//       copy.has(id) ? copy.delete(id) : copy.add(id);
//       return copy;
//     });
//   };
//   const selectAllLeads = () => setSelectedLeadIds(new Set(leadsList.filter(c => isValidEmail(c.email)).map(c => c._id)));

//   const downloadTemplate = () => {
//     const blob = new Blob(["email\nexample@example.com\n"], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a"); a.href = url; a.download = "template.csv"; a.click();
//   };

//   const parsedManualEmails = useCallback(() => {
//     if (!manualInput) return [];
//     return [...new Set(manualInput.split(/[\n,]+/).map((m) => normalizeEmail(m)).filter(Boolean))];
//   }, [manualInput]);

//   const handleFormSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true); setStatusMessage(null);

//     const attachmentBase64 = await Promise.all(attachments.map(file => new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.readAsDataURL(file);
//     })));

//     let recipientListPayload;
//     if (recipientSource === "excel") recipientListPayload = excelPreviewRows.filter(r => r.valid).map(r => r.email);
//     else if (recipientSource === "manual") recipientListPayload = parsedManualEmails().filter(e => isValidEmail(e));
//     else {
//       if (selectedSegment === "source_customers") recipientListPayload = selectedCustomerIds.size ? customersList.filter(c => selectedCustomerIds.has(c._id)).map(c => c.email) : "ALL_CUSTOMERS";
//       else if (selectedSegment === "source_leads") recipientListPayload = selectedLeadIds.size ? leadsList.filter(c => selectedLeadIds.has(c._id)).map(c => c.email) : "ALL_LEADS";
//       else recipientListPayload = selectedSegment;
//     }

//     const payload = {
//       campaignName: e.target.campaignName.value,
//       scheduledTime: e.target.scheduledTime.value,
//       channel,
//       sender: channel === "email" ? e.target.sender.value : "WhatsApp API",
//       content: channel === "email" ? emailContent : whatsappContent,
//       emailSubject: emailSubject,
//       ctaText: ctaText,
//       recipientSource,
//       recipientList: recipientSource === "segment" ? recipientListPayload : undefined,
//       recipientManual: recipientSource === "manual" ? manualInput : undefined,
//       recipientExcelEmails: recipientSource === "excel" ? recipientListPayload : undefined,
//       attachments: attachmentBase64,
//     };

//     try {
//       const res = await fetch("/api/campaign", {
//         method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
//         body: JSON.stringify(payload),
//       });
//       if (res.ok) {
//         setStatusMessage({ type: "success", html: "Campaign Scheduled Successfully!" });
//         router.push("/admin/crm/campaign");
//       }
//     } catch (err) { setStatusMessage({ type: "error", html: "Error: " + err.message }); } finally { setLoading(false); }
//   };

//   function formatStringToAMPM(dateString) {
//     if (!dateString) return "";
//     const date = new Date(dateString);
//     return date.toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' });
//   }

//   // --- NEW ADVANCED UI RENDER ---
//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-sans">
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header Section */}
//         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campaign <span className="text-indigo-600">Studio</span></h1>
//             <p className="text-slate-500 font-medium mt-1">Design and schedule your next big outreach</p>
//           </div>
//           <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
//             <button type="button" onClick={() => setChannel("email")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "email" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <Mail size={18} /> Email
//             </button>
//             <button type="button" onClick={() => setChannel("whatsapp")} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${channel === "whatsapp" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"}`}>
//               <MessageCircle size={18} /> WhatsApp
//             </button>
//           </div>
//         </header>

//         {statusMessage && (
//           <div className={`p-4 mb-6 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${statusMessage.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
//             {statusMessage.type === "success" ? <CheckCircle size={20} /> : <X size={20} />}
//             <div dangerouslySetInnerHTML={{ __html: statusMessage.html }} className="text-sm font-bold" />
//           </div>
//         )}

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
//           {/* Form Side */}
//           <form onSubmit={handleFormSubmit} className="lg:col-span-8 space-y-8">
            
//             {/* 1. Basic Details */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
//                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">1</div>
//                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Identity & Timing</h2>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Campaign Name</label>
//                   <input type="text" name="campaignName" required className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" placeholder="Diwali Promo 2026" />
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Execution Time</label>
//                   <input type="datetime-local" name="scheduledTime" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                 </div>
//               </div>

//               {channel === "email" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Sender Brand</label>
//                     <input type="text" name="sender" value={sender} onChange={(e) => setSender(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700" />
//                   </div>
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Email Master Preset</label>
//                     <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-700 appearance-none">
//                       <option value="">Start from Scratch</option>
//                       {emailMasters.map((m) => <option key={m._id || m.id} value={m._id || m.id}>{m.email || m.subject}</option>)}
//                     </select>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* 2. Audience */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Target Audience</h2>
//                 </div>
//                 <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
//                   {/* {['segment', 'excel', 'manual'].map(src => (
//                     <button key={src} type="button" onClick={() => setRecipientSource(src)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
//                       {src}
//                     </button>
//                   ))} */}

//                       {[ 'excel', 'manual'].map(src => (
//                     <button key={src} type="button" onClick={() => setRecipientSource(src)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${recipientSource === src ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
//                       {src}
//                     </button>
//                   ))}

//                 </div>
//               </div>

//               {/* {recipientSource === "segment" && (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {segments.map((s) => (
//                     <div key={s.id} onClick={() => setSelectedSegment(s.id)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden ${selectedSegment === s.id ? "border-indigo-600 bg-indigo-50/30" : "border-slate-50 bg-slate-50 hover:border-slate-200"}`}>
//                       <div className="flex justify-between items-start">
//                         <span className="font-black text-slate-800 text-lg leading-tight">{s.label}</span>
//                         {selectedSegment === s.id && <CheckCircle className="text-indigo-600" size={20} />}
//                       </div>
//                       <p className="text-xs text-slate-400 font-bold mt-1">{s.count} Contacts Found</p>
                      
//                       {selectedSegment === s.id && (s.id === "source_customers" || s.id === "source_leads") && (
//                         <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
//                           <div className="flex gap-2">
//                              <button type="button" onClick={s.id === "source_customers" ? selectAllCustomers : selectAllLeads} className="px-3 py-1.5 bg-white text-[10px] font-black uppercase tracking-tighter rounded-lg border border-indigo-200">Select All</button>
//                              <button type="button" onClick={() => s.id === "source_customers" ? setSelectedCustomerIds(new Set()) : setSelectedLeadIds(new Set())} className="px-3 py-1.5 bg-white text-[10px] font-black uppercase tracking-tighter rounded-lg border border-slate-200">Clear</button>
//                           </div>
//                           <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1">
//                             {(s.id === "source_customers" ? customersList : leadsList).map(item => (
//                               <label key={item._id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-colors cursor-pointer group">
//                                 <input type="checkbox" checked={s.id === "source_customers" ? selectedCustomerIds.has(item._id) : selectedLeadIds.has(item._id)} onChange={() => s.id === "source_customers" ? toggleCustomerSelect(item._id) : toggleLeadSelect(item._id)} className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500" />
//                                 <div className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 truncate">{item.name} <span className="text-slate-400 ml-1 font-normal">{item.email}</span></div>
//                               </label>
//                             ))}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )} */}

//               {recipientSource === "excel" && (
//                 <div className="space-y-4">
//                   <div className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all relative">
//                     <UploadCloud className="mx-auto text-slate-300 mb-4 group-hover:text-indigo-500 transition-colors" size={48} />
//                     <p className="text-slate-500 font-bold">Drop your Excel/CSV or click to browse</p>
//                     <input type="file" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
//                   </div>
//                   {excelFile && (
//                     <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
//                       <div className="flex items-center gap-3">
//                         <FileSpreadsheet className="text-emerald-400" />
//                         <span className="text-sm font-bold">{excelValidCount} Valid Emails Detects</span>
//                       </div>
//                       <button type="button" onClick={clearExcel} className="p-2 hover:bg-white/10 rounded-lg"><X size={18} /></button>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {recipientSource === "manual" && (
//                 <div className="space-y-2">
//                   <textarea rows="6" value={manualInput} onChange={(e) => setManualInput(e.target.value)} className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm leading-relaxed" placeholder="john@example.com, sara@test.com..." />
//                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">{parsedManualEmails().length} Emails Parsed</p>
//                 </div>
//               )}
//             </div>

//             {/* 3. Content */}
//             <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 space-y-6">
//               <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
//                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Creative Content</h2>
//                 </div>
//                 <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
//                   <option value="">Select a Template</option>
//                   {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
//                 </select>
//               </div>

//               {channel === "email" ? (
//                 <div className="space-y-6">
//                   <div className="space-y-1">
//                     <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Subject Line</label>
//                     <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" placeholder="e.g., Don't miss your special gift!" />
//                   </div>
//                   <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[400px]">
//                     <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
//                   </div>
//                   <div className="grid grid-cols-2 gap-4">
//                     <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-800" placeholder="CTA Button Text (Shop Now)" />
//                     <div className="flex items-center justify-center gap-2 px-5 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400">
//                         <Download size={14} /> {wordCount} Words Written
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                    <textarea rows="8" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)} className="w-full px-6 py-6 bg-emerald-50/30 border-2 border-emerald-100 rounded-[2rem] focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 leading-relaxed" placeholder="Write your WhatsApp blast here..." />
//                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
//                       <span>Supports *bold* _italic_ ~strike~</span>
//                       <span>{whatsappContent.length} Characters</span>
//                    </div>
//                 </div>
//               )}
//             </div>

//             <button type="submit" disabled={loading} className={`w-full py-6 rounded-[2rem] text-white font-black text-xl tracking-tight shadow-xl shadow-indigo-200 transform transition active:scale-95 flex items-center justify-center gap-3 ${loading ? "bg-slate-400" : channel === "email" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
//               {loading ? <Loader2 className="animate-spin" /> : <><Calendar size={24} /> Schedule {channel.toUpperCase()} Campaign</>}
//             </button>
//           </form>

//           {/* Right Preview Side */}
//           <div className="lg:col-span-4 sticky top-10 space-y-6">
//             <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[12px] border-slate-800 relative aspect-[9/19] max-w-[340px] mx-auto overflow-hidden">
//                 {/* iPhone Notch */}
//                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-800 rounded-b-3xl z-20"></div>
                
//                 <div className="bg-white h-full w-full rounded-[2.5rem] overflow-hidden flex flex-col relative">
//                     {/* App Header */}
//                     <div className="bg-slate-50 p-4 pt-10 text-center border-b border-slate-100">
//                         <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-1 shadow-sm">
//                             {sender.charAt(0)}
//                         </div>
//                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sender}</p>
//                     </div>

//                     <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
//                         {channel === "email" ? (
//                           <div className="animate-in fade-in zoom-in-95 duration-500">
//                             <h4 className="font-black text-slate-800 text-base leading-tight mb-4">{emailSubject || "Your Subject Line Preview"}</h4>
//                             <div className="text-[11px] text-slate-600 leading-relaxed preview-html" dangerouslySetInnerHTML={{ __html: emailContent }} />
//                             {ctaText && (
//                               <div className="mt-8 py-3 bg-indigo-600 text-white rounded-xl text-center text-xs font-black uppercase tracking-widest shadow-lg">
//                                 {ctaText}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <div className="space-y-4">
//                             <div className="bg-emerald-100/50 p-4 rounded-3xl rounded-tl-none shadow-sm border border-emerald-100 self-start max-w-[90%] animate-in slide-in-from-left-4">
//                               <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">{whatsappContent || "Type a message to see the preview..."}</p>
//                               <p className="text-[8px] text-right text-emerald-600 font-bold mt-2 uppercase">12:00 PM ✓✓</p>
//                             </div>
//                           </div>
//                         )}
//                     </div>
//                 </div>
//             </div>
//             <div className="text-center">
//               <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Live Device Preview</p>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }
