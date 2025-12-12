"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

import {
  Paperclip,
  X,
  CheckCircle,
  UploadCloud,
  FileSpreadsheet,
  MessageCircle,
  Mail,
  List,
  Download,
} from "lucide-react";

export default function CampaignPage() {
  const router = useRouter();
  const excelInputRef = useRef(null);

  // main state
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // channel
  const [channel, setChannel] = useState("email"); // 'email' | 'whatsapp'

  // basic details
  const [campaignName, setCampaignName] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sender, setSender] = useState("Marketing Team");
  const [emailSubject, setEmailSubject] = useState("");
  const [ctaText, setCtaText] = useState("");

  // content
  const [emailContent, setEmailContent] = useState("<p></p>");
  const [whatsappContent, setWhatsappContent] = useState("");
  const [wordCount, setWordCount] = useState(0);

  // attachments
  const [attachments, setAttachments] = useState([]);

  // recipients
  const [recipientSource, setRecipientSource] = useState("segment"); // 'segment'|'excel'|'manual'
  const [segments, setSegments] = useState([]); // meta segments: {id,label,count,desc}
  const [selectedSegment, setSelectedSegment] = useState(""); // single segment like original

  // lists
  const [customersList, setCustomersList] = useState([]); // normalized customers
  const [leadsList, setLeadsList] = useState([]); // normalized leads

  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // manual
  const [manualInput, setManualInput] = useState("");

  // excel
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreviewRows, setExcelPreviewRows] = useState([]); // [{id,email,valid,isSent,raw}]
  const [excelValidCount, setExcelValidCount] = useState(0);
  const [excelInvalidCount, setExcelInvalidCount] = useState(0);
  const [excelSentCount, setExcelSentCount] = useState(0);

  // templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // email masters
  const [emailMasters, setEmailMasters] = useState([]);
  const [selectedEmailMasterId, setSelectedEmailMasterId] = useState("");

  // loading flags
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // helper: token
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  // -------------------------
  // fetch segments (counts), customers list, templates, leads, email masters
  // -------------------------
  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingSegments(true);
      setLoadingTemplates(true);
      try {
        const token = getToken();
        if (!token) {
          setSegments([]);
          setTemplates([]);
          setEmailMasters([]);
          setLoadingSegments(false);
          setLoadingTemplates(false);
          return;
        }

        const [customersRes, leadsRes, templatesRes, emailMastersRes] = await Promise.all([
          fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/email-templates", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/email-masters", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const customersData = customersRes.ok ? await customersRes.json() : [];
        const leadsData = leadsRes.ok ? await leadsRes.json() : [];

        let templatesData = [];
        if (templatesRes.ok) {
          const parsed = await templatesRes.json();
          templatesData = Array.isArray(parsed) ? parsed : parsed?.data || [];
        }

        const emailMastersDataRaw = emailMastersRes.ok ? await emailMastersRes.json() : [];
        const emailMastersData = Array.isArray(emailMastersDataRaw) ? emailMastersDataRaw : emailMastersDataRaw?.data || [];

        const countOf = (d) => {
          if (!d) return 0;
          if (Array.isArray(d)) return d.length;
          if (d.data && Array.isArray(d.data)) return d.data.length;
          return 0;
        };

        setSegments([
          { id: "source_customers", label: "All Customers", count: countOf(customersData), desc: "Fetched from /api/customers" },
          { id: "source_leads", label: "New Leads", count: countOf(leadsData), desc: "Fetched from /api/lead" },
        ]);

        setTemplates(templatesData || []);
        setEmailMasters(emailMastersData || []);
      } catch (err) {
        console.error("fetch initial:", err);
        setSegments([{ id: "error", label: "Error loading", count: 0, desc: "Check API" }]);
      } finally {
        setLoadingSegments(false);
        setLoadingTemplates(false);
      }
    };

    fetchInitial();
  }, []);

  // when user selects "All Customers" or "New Leads" segment, fetch full list to allow per-item select
  useEffect(() => {
    const fetchCustomersList = async () => {
      if (selectedSegment !== "source_customers") {
        setCustomersList([]);
        setSelectedCustomerIds(new Set());
        return;
      }
      setLoadingCustomers(true);
      try {
        const token = getToken();
        if (!token) throw new Error("Unauthorized");
        const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json.data || [];
        const normalized = arr.map((c) => ({
          _id: c._id || c.id || c.emailId || Math.random().toString(36).slice(2, 9),
          name: c.customerName || c.name || c.fullName || c.companyName || "—",
          email: c.emailId || c.email || c.emailAddress || "",
        }));
        setCustomersList(normalized);
      } catch (err) {
        console.error("fetch customers list:", err);
        setCustomersList([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const fetchLeadsList = async () => {
      if (selectedSegment !== "source_leads") {
        setLeadsList([]);
        setSelectedLeadIds(new Set());
        return;
      }
      setLoadingLeads(true);
      try {
        const token = getToken();
        if (!token) throw new Error("Unauthorized");
        const res = await fetch("/api/lead", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json.data || [];
        const normalized = arr.map((l) => ({
          _id: l._id || l.id || Math.random().toString(36).slice(2, 9),
          name: l.leadName || l.name || l.fullName || l.companyName || "—",
          email: l.email || l.emailId || l.emailAddress || "",
        }));
        setLeadsList(normalized);
      } catch (err) {
        console.error("fetch leads list:", err);
        setLeadsList([]);
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchCustomersList();
    fetchLeadsList();
  }, [selectedSegment]);

  // when email master selected, load into editor/fields
  useEffect(() => {
    if (!selectedEmailMasterId) return;
    const m = emailMasters.find((x) => x._id === selectedEmailMasterId || x.id === selectedEmailMasterId);
    if (!m) return;
    const html = m.contentHtml || m.content || m.html || "<p></p>";
    const subj = m.subject || m.title || "";
    const from = m.fromName || m.sender || m.from || sender;
    const cta = m.ctaText || m.cta || "";

    setEmailContent(html);
    setEmailSubject(subj);
    setSender(from);
    setCtaText(cta);
    const textOnly = html.replace(/<[^>]*>/g, " ").trim();
    setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
  }, [selectedEmailMasterId, emailMasters]);

  // when template selected, load into editor/whatsapp AND fill subject/sender/cta
  useEffect(() => {
    if (!selectedTemplateId) return;
    const t = templates.find((x) => x._id === selectedTemplateId || x.id === selectedTemplateId);
    if (!t) return;

    const html = t.contentHtml || t.content || t.html || "<p></p>";
    const text = t.text || t.plain || html.replace(/<[^>]*>/g, " ");
    const subj = t.subject || t.title || "";
    const from = t.fromName || t.sender || t.from || sender;
    const cta = t.ctaText || t.cta || "";

    if (channel === "email") {
      setEmailContent(html);
      setEmailSubject(subj);
      setSender(from);
      setCtaText(cta);
      const textOnly = html.replace(/<[^>]*>/g, " ").trim();
      setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
    } else {
      setWhatsappContent(text);
    }
  }, [selectedTemplateId, templates, channel]);

  // editor change
  const handleEmailEditorChange = (html) => {
    setEmailContent(html);
    const textOnly = html.replace(/<[^>]*>/g, " ").trim();
    setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
  };

  // attachments
  const handleAttachmentChange = (e) => {
    if (e.target.files && e.target.files.length > 0) setAttachments((p) => [...p, ...Array.from(e.target.files)]);
  };
  const removeAttachment = (i) => setAttachments((p) => p.filter((_, idx) => idx !== i));

  // ---------------------
  // Excel parse -> build preview rows (valid/invalid/sent detection)
  // ---------------------
  const clearExcel = () => {
    setExcelFile(null);
    setExcelPreviewRows([]);
    setExcelValidCount(0);
    setExcelInvalidCount(0);
    setExcelSentCount(0);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());
  const normalizeEmail = (email) => email?.toString().trim().replace(/,+$/, "").toLowerCase();

  const handleExcelChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    // use ArrayBuffer for more robust parsing
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rows || rows.length === 0) {
          alert("Excel empty or not parseable");
          clearExcel();
          return;
        }

        // detect best email column (more candidates)
        const firstRowKeys = Object.keys(rows[0] || {});
        const lowered = firstRowKeys.map((k) => (k || "").toString().toLowerCase());
        const possible = [
          "email",
          "e-mail",
          "email address",
          "emailaddress",
          "emailid",
          "email_id",
          "e mail",
          "contact",
          "contact email",
        ];
        let emailKey = null;
        for (let candidate of possible) {
          const idx = lowered.findIndex((lk) => lk === candidate || lk.includes(candidate));
          if (idx !== -1) {
            emailKey = firstRowKeys[idx];
            break;
          }
        }
        if (!emailKey) {
          // fallback: prefer a column that contains the word 'email' anywhere
          const idxAny = lowered.findIndex((lk) => lk.includes("email"));
          if (idxAny !== -1) emailKey = firstRowKeys[idxAny];
        }
        if (!emailKey) emailKey = firstRowKeys[0]; // final fallback

        // detect sent/status column
        let sentKey = null;
        for (let i = 0; i < firstRowKeys.length; i++) {
          const k = (firstRowKeys[i] || "").toString().toLowerCase();
          if (["sent", "status", "is_sent", "mailed", "delivered"].includes(k) || k.includes("sent")) {
            sentKey = firstRowKeys[i];
            break;
          }
        }

        const preview = rows.map((r, idx) => {
          const raw = r;
          const candidateValue = r[emailKey] ?? r.email ?? r.Email ?? "";
          const rawEmail = normalizeEmail(candidateValue);
          const valid = isValidEmail(rawEmail);
          const sentRaw = sentKey ? String(r[sentKey] ?? "").toLowerCase() : "";
          const isSent = sentKey ? (["1", "true", "yes", "sent", "delivered"].includes(sentRaw) ? true : false) : false;
          return { id: idx + 1, email: rawEmail || "", raw, valid, isSent };
        });

        const validCount = preview.filter((p) => p.valid).length;
        const invalidCount = preview.filter((p) => !p.valid).length;
        const sentCount = preview.filter((p) => p.isSent).length;

        setExcelPreviewRows(preview);
        setExcelValidCount(validCount);
        setExcelInvalidCount(invalidCount);
        setExcelSentCount(sentCount);

        alert(`Excel parsed: ${validCount} valid, ${invalidCount} invalid, ${sentCount} already sent`);
      } catch (err) {
        console.error("Excel parse error", err);
        alert("Failed to parse Excel file.");
        clearExcel();
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ---------------------
  // Customers/Leads helpers
  // ---------------------
  const toggleCustomerSelect = (id) => {
    setSelectedCustomerIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };
  const selectAllCustomers = () => {
    const all = new Set(customersList.filter((c) => c.email && isValidEmail(c.email)).map((c) => c._id));
    setSelectedCustomerIds(all);
  };
  const clearAllCustomersSelection = () => setSelectedCustomerIds(new Set());

  const toggleLeadSelect = (id) => {
    setSelectedLeadIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };
  const selectAllLeads = () => {
    const all = new Set(leadsList.filter((c) => c.email && isValidEmail(c.email)).map((c) => c._id));
    setSelectedLeadIds(all);
  };
  const clearAllLeadsSelection = () => setSelectedLeadIds(new Set());

  // ---------------------
  // download template CSV (one-column)
  // ---------------------
  const downloadTemplate = () => {
    const csv = "email\nexample@example.com\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // parse manual
  const parsedManualEmails = useCallback(() => {
    if (!manualInput) return [];
    return [...new Set(manualInput.split(/[\n,]+/).map((m) => normalizeEmail(m)).filter(Boolean))];
  }, [manualInput]);

  // ---------------------
  // form submit
  // ---------------------
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    // basic validation
    if (channel === "email" && (!emailContent || emailContent === "<p></p>")) {
      alert("Email body cannot be empty.");
      setLoading(false);
      return;
    }
    if (channel === "whatsapp" && !whatsappContent.trim()) {
      alert("WhatsApp message cannot be empty.");
      setLoading(false);
      return;
    }

    if (recipientSource === "segment" && !selectedSegment) {
      alert("Please select a segment.");
      setLoading(false);
      return;
    }

    if (recipientSource === "segment" && selectedSegment === "source_customers" && selectedCustomerIds.size === 0) {
      if (!confirm("No customers selected inside All Customers. Do you want to send to all customers?")) {
        setLoading(false);
        return;
      }
    }

    if (recipientSource === "segment" && selectedSegment === "source_leads" && selectedLeadIds.size === 0) {
      if (!confirm("No leads selected inside New Leads. Do you want to send to all leads?")) {
        setLoading(false);
        return;
      }
    }

    // If Excel source, ensure we have preview rows, derive valid emails
    let excelEmailsToSend = [];
    if (recipientSource === "excel") {
      // derive from preview rows (if user uploaded)
      if (excelPreviewRows && excelPreviewRows.length > 0) {
        excelEmailsToSend = excelPreviewRows.filter((r) => r.valid).map((r) => r.email);
      }

      // if still empty, try to parse manualInput as fallback (rare)
      if (!excelEmailsToSend.length) {
        alert("Excel must contain at least one valid email.");
        setLoading(false);
        return;
      }
    }

    if (recipientSource === "manual" && parsedManualEmails().length === 0) {
      alert("Manual entry must have at least one valid email.");
      setLoading(false);
      return;
    }

    // attachments -> base64
    const attachmentBase64 = await Promise.all(
      attachments.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    );

    // build recipient arrays:
    let recipientListPayload;
    if (recipientSource === "excel") {
      recipientListPayload = excelEmailsToSend;
    } else if (recipientSource === "manual") {
      recipientListPayload = parsedManualEmails().filter((e) => isValidEmail(e));
    } else {
      // segment
      if (selectedSegment === "source_customers") {
        const sel = Array.from(selectedCustomerIds);
        recipientListPayload = sel.length
          ? customersList.filter((c) => sel.includes(c._id) && isValidEmail(c.email)).map((c) => c.email)
          : "ALL_CUSTOMERS";
      } else if (selectedSegment === "source_leads") {
        const sel = Array.from(selectedLeadIds);
        recipientListPayload = sel.length
          ? leadsList.filter((c) => sel.includes(c._id) && isValidEmail(c.email)).map((c) => c.email)
          : "ALL_LEADS";
      } else {
        recipientListPayload = selectedSegment;
      }
    }

    // BUILD PAYLOAD — IMPORTANT: use recipientExcelEmails when excel source
    const payload = {
      campaignName: e.target.campaignName.value,
      scheduledTime: e.target.scheduledTime.value || scheduledTime,
      channel,
      sender: channel === "email" ? e.target.sender.value : "WhatsApp API",
      content: channel === "email" ? emailContent : whatsappContent,
      emailSubject: channel === "email" ? e.target.emailSubject?.value || emailSubject : undefined,
      ctaText: channel === "email" ? e.target.ctaText?.value || ctaText : undefined,
      recipientSource,
      recipientList: recipientSource === "segment" ? recipientListPayload : undefined,
      recipientManual: recipientSource === "manual" ? (e.target.manual?.value || manualInput) : undefined,
      recipientExcelEmails: recipientSource === "excel" ? recipientListPayload : undefined,
      templateId: selectedTemplateId || undefined,
      emailMasterId: selectedEmailMasterId || undefined,
      attachments: attachmentBase64,
    };

    try {
      const token = getToken();
      if (!token) throw new Error("Unauthorized");

      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Server error");

      setStatusMessage({ type: "success", html: `<p class="font-bold">Campaign Scheduled</p><p>ID: ${json.data?._id || "—"}</p>` });
      // reset relevant states
      e.target.reset();
      setCampaignName("");
      setScheduledTime("");
      setSelectedSegment("");
      setCustomersList([]);
      setSelectedCustomerIds(new Set());
      setLeadsList([]);
      setSelectedLeadIds(new Set());
      setManualInput("");
      clearExcel();
      setAttachments([]);
      setEmailContent("<p></p>");
      setWhatsappContent("");
      setSelectedTemplateId("");
      setSelectedEmailMasterId("");
      setWordCount(0);

      router.push("/admin/crm/campaign");
    } catch (err) {
      console.error("submit error", err);
      setStatusMessage({ type: "error", html: `<p class="font-bold">Error</p><p>${err.message}</p>` });
    } finally {
      setLoading(false);
    }
  };

  // helper format
  function formatStringToAMPM(dateString) {
    if (!dateString) return "";
    const [date, timePart] = dateString.split("T");
    if (!timePart) return dateString;
    let [hour, minute] = timePart.split(":");
    hour = parseInt(hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${date.split("-").reverse().join("/")} ${hour}:${minute} ${ampm}`;
  }

  // ---------------------
  // Render
  // ---------------------
  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen font-inter">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-8 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-extrabold text-gray-900">Create Campaign</h1>
          <p className="text-gray-500 mt-1">Reach your audience via Email or WhatsApp. You can pick a saved Email Master (from <code>/api/email-masters</code>) and send using that configuration.</p>
        </header>

        {/* CHANNEL SELECTOR */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button type="button" onClick={() => setChannel("email")} className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${channel === "email" ? "border-blue-600 bg-white text-blue-700 shadow-md ring-1 ring-blue-200" : "border-gray-100 bg-white text-gray-600 hover:bg-gray-50"}`}>
            <Mail className={`w-8 h-8 ${channel === "email" ? "text-blue-600" : "text-gray-400"}`} />
            <div className="text-left">
              <span className="block font-bold text-lg">Email Campaign</span>
              <span className="text-xs opacity-80">Rich text, images, scheduled sends</span>
            </div>
          </button>

          <button type="button" onClick={() => setChannel("whatsapp")} className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${channel === "whatsapp" ? "border-green-600 bg-white text-green-700 shadow-md ring-1 ring-green-200" : "border-gray-100 bg-white text-gray-600 hover:bg-gray-50"}`}>
            <MessageCircle className={`w-8 h-8 ${channel === "whatsapp" ? "text-green-600" : "text-gray-400"}`} />
            <div className="text-left">
              <span className="block font-bold text-lg">WhatsApp Blast</span>
              <span className="text-xs opacity-80">High open rates, short messages</span>
            </div>
          </button>
        </div>

        {/* STATUS */}
        {statusMessage && (
          <div className={`p-4 mb-6 rounded-lg shadow-md ${statusMessage.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`} dangerouslySetInnerHTML={{ __html: statusMessage.html }} />
        )}

        <form onSubmit={handleFormSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-100 space-y-8">
          {/* SECTION 1: DETAILS */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span> Basic Details
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Campaign Name</label>
                <input type="text" name="campaignName" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Diwali Promo 2025" />
              </div>

              {channel === "email" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Email Subject</label>
                  <input type="text" name="emailSubject" required value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Don't miss out!" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channel === "email" && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Sender Name</label>
                  <input type="text" name="sender" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={sender} onChange={(e) => setSender(e.target.value)} />
                </div>
              )}

              <div className={channel === "whatsapp" ? "col-span-2" : ""}>
                <label className="block text-sm font-medium mb-1 text-gray-600">Schedule Time</label>

                <input type="datetime-local" name="scheduledTime" required value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" />

                {scheduledTime && <p className="text-sm text-gray-600 mt-2">📅 Scheduled: <b>{formatStringToAMPM(scheduledTime)}</b></p>}
              </div>
            </div>

            {/* NEW: Email Master selector */}
            {channel === "email" && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1 text-gray-600">Use saved Email</label>
                <div className="flex gap-2 items-center">
                  <select value={selectedEmailMasterId} onChange={(e) => setSelectedEmailMasterId(e.target.value)} className="p-2 border rounded w-full">
                    <option value="">— Select saved email (email-master) —</option>
                    {emailMasters.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id}>{m.name || m.subject || m.from || m.title || (m.email || "Saved Email")}</option>
                    ))}
                  </select>

                  <button type="button" onClick={() => { setSelectedEmailMasterId(""); setEmailSubject(""); setSender("Marketing Team"); setEmailContent("<p></p>"); setCtaText(""); }} className="px-3 py-2 text-sm bg-gray-100 rounded">Clear</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Selecting an Email Master will prefill subject, sender and html content.</p>
              </div>
            )}
          </div>

          {/* SECTION 2: AUDIENCE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span> Audience
              </h2>

              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => setRecipientSource("segment")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "segment" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Segment</button>
                <button type="button" onClick={() => setRecipientSource("excel")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "excel" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Upload Excel</button>
                <button type="button" onClick={() => setRecipientSource("manual")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "manual" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Manual Entry</button>
              </div>
            </div>

            {/* SEGMENTS */}
            {recipientSource === "segment" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loadingSegments ? (
                  <div className="col-span-2 py-8 text-center text-gray-400 animate-pulse">Fetching data from CRM...</div>
                ) : (
                  segments.map((segment) => (
                    <div key={segment.id} onClick={() => setSelectedSegment(segment.id)} className={`cursor-pointer p-4 rounded-xl border-2 relative transition-all ${selectedSegment === segment.id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200"}`}>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-700">{segment.label}</span>
                        {selectedSegment === segment.id && <CheckCircle className="w-5 h-5 text-blue-500" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{segment.desc}</p>
                      <div className="mt-2 inline-block bg-white px-2 py-1 rounded border text-xs font-bold text-gray-600">{segment.count} Contacts</div>

                      {/* Customers list */}
                      {segment.id === "source_customers" && selectedSegment === "source_customers" && (
                        <div className="mt-3 border-t pt-3">
                          {loadingCustomers ? (
                            <div className="text-sm text-gray-500">Loading customers...</div>
                          ) : (
                            <>
                              <div className="flex gap-2 items-center mb-2">
                                <button type="button" onClick={selectAllCustomers} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded">Select All</button>
                                <button type="button" onClick={clearAllCustomersSelection} className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded">Clear</button>
                                <div className="text-xs text-gray-500 ml-auto">{selectedCustomerIds.size} selected</div>
                              </div>

                              <div className="max-h-48 overflow-auto border rounded p-2 bg-white">
                                {customersList.length === 0 ? (
                                  <div className="text-xs text-gray-500">No customers found</div>
                                ) : (
                                  customersList.map((c) => (
                                    <label key={c._id} className="flex items-center gap-2 text-sm py-1 border-b last:border-b-0">
                                      <input type="checkbox" checked={selectedCustomerIds.has(c._id)} onChange={() => toggleCustomerSelect(c._id)} className="w-4 h-4" />
                                      <div className="flex-1">
                                        <div className="font-medium">{c.name || "—"}</div>
                                        <div className="text-xs text-gray-500 font-mono">{c.email || "—"}</div>
                                      </div>
                                    </label>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Leads list */}
                      {segment.id === "source_leads" && selectedSegment === "source_leads" && (
                        <div className="mt-3 border-t pt-3">
                          {loadingLeads ? (
                            <div className="text-sm text-gray-500">Loading leads...</div>
                          ) : (
                            <>
                              <div className="flex gap-2 items-center mb-2">
                                <button type="button" onClick={selectAllLeads} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded">Select All</button>
                                <button type="button" onClick={clearAllLeadsSelection} className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded">Clear</button>
                                <div className="text-xs text-gray-500 ml-auto">{selectedLeadIds.size} selected</div>
                              </div>

                              <div className="max-h-48 overflow-auto border rounded p-2 bg-white">
                                {leadsList.length === 0 ? (
                                  <div className="text-xs text-gray-500">No leads found</div>
                                ) : (
                                  leadsList.map((c) => (
                                    <label key={c._id} className="flex items-center gap-2 text-sm py-1 border-b last:border-b-0">
                                      <input type="checkbox" checked={selectedLeadIds.has(c._id)} onChange={() => toggleLeadSelect(c._id)} className="w-4 h-4" />
                                      <div className="flex-1">
                                        <div className="font-medium">{c.name || "—"}</div>
                                        <div className="text-xs text-gray-500 font-mono">{c.email || "—"}</div>
                                      </div>
                                    </label>
                                  ))
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* EXCEL */}
            {recipientSource === "excel" && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:border-blue-400 transition relative">
                  {excelFile ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600"><FileSpreadsheet /> {excelFile.name}</div>
                  ) : (
                    <div className="text-gray-400"><UploadCloud className="w-10 h-10 mx-auto mb-2" /><span className="text-sm">Upload .xlsx or .csv</span></div>
                  )}

                  <input type="file" accept=".xlsx,.csv" ref={excelInputRef} onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {excelFile && (
                  <div className="flex justify-between items-center px-1">
                    <p className="text-sm text-gray-500">{excelValidCount} valid emails detected • {excelInvalidCount} invalid • {excelSentCount} already sent</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={downloadTemplate} className="px-3 py-2 text-sm bg-gray-100 rounded">Download template</button>
                      <button type="button" onClick={clearExcel} className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded">Clear</button>
                    </div>
                  </div>
                )}

                {excelPreviewRows.length > 0 && (
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr><th className="p-2">#</th><th className="p-2">Email</th><th className="p-2">Status</th><th className="p-2">Raw</th></tr>
                      </thead>
                      <tbody>
                        {excelPreviewRows.map((r) => (
                          <tr key={r.id} className={`border-t ${r.valid ? "" : "bg-red-50"}`}>
                            <td className="p-2">{r.id}</td>
                            <td className="p-2 font-mono">{r.email || <span className="text-xs text-gray-400">—</span>}</td>
                            <td className="p-2">{r.valid ? (r.isSent ? <span className="text-xs text-amber-700">Sent</span> : <span className="text-xs text-green-700">Valid</span>) : <span className="text-xs text-red-600">Invalid</span>}</td>
                            <td className="p-2">{JSON.stringify(Object.fromEntries(Object.entries(r.raw).slice(0, 3)))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL */}
            {recipientSource === "manual" && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2 items-center gap-2"><List className="w-4 h-4" />{channel === "email" ? "Enter Email Addresses" : "Enter Phone Numbers"}</label>
                <p className="text-xs text-gray-500 mb-2">Enter a single {channel === "email" ? "email" : "number"}, or paste a list separated by commas or new lines.</p>
                <textarea rows="5" name="manual" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder={channel === "email" ? "john@example.com, jane@test.com\nsupport@company.com" : "+919876543210\n+1234567890"} value={manualInput} onChange={(e) => setManualInput(e.target.value)}></textarea>
                <div className="text-right text-xs text-gray-500 mt-1">{manualInput.length > 0 ? `${manualInput.split(/[\n,]+/).filter((x) => x.trim()).length} Recipients detected` : "0 Recipients"}</div>
              </div>
            )}
          </div>

          {/* SECTION 3: CONTENT */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">3</span>
              {channel === "email" ? "Email Content" : "WhatsApp Message"}
            </h2>

            {channel === "email" && (
              <div>
                <div className="min-h-[250px] border rounded p-2">
                  <TiptapEditor
                    key={`editor-${channel}-${selectedTemplateId || selectedEmailMasterId || "manual"}`}
                    content={emailContent}
                    onChange={handleEmailEditorChange}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input name="ctaText" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="p-3 border rounded-lg" placeholder="CTA (Shop Now)" />
                  <input name="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="p-3 border rounded-lg" placeholder="Email subject" />
                  <div className="flex items-center gap-2">
                    <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="p-2 border rounded w-full">
                      <option value="">— Select Template (optional) —</option>
                      {templates.map((t) => <option key={t._id || t.id} value={t._id || t.id}>{t.name || t.subject || `Template ${t._id?.slice?.(0,6)}`}</option>)}
                    </select>
                    <button type="button" onClick={downloadTemplate} className="px-3 py-2 bg-gray-100 rounded"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}

            {channel === "whatsapp" && (
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <label className="block text-sm font-bold text-green-800 mb-2">Message Template</label>
                <textarea rows="6" value={whatsappContent} onChange={(e) => setWhatsappContent(e.target.value)} className="w-full p-4 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm" placeholder="Hello {{name}}, our Diwali sale is live! Get 50% off now."></textarea>
                <div className="flex justify-between text-xs text-green-700 mt-2"><span>Supports: *bold*, _italic_, ~strike~</span><span>{whatsappContent.length} chars</span></div>

                {/* also show template selector for whatsapp */}
                <div className="mt-3 flex gap-2 items-center">
                  <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="p-2 border rounded w-full">
                    <option value="">— Select Template (optional) —</option>
                    {templates.map((t) => <option key={t._id || t.id} value={t._id || t.id}>{t.name || t.title}</option>)}
                  </select>
                  <button type="button" onClick={downloadTemplate} className="px-3 py-2 bg-gray-100 rounded"><Download className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="relative inline-block">
                <input type="file" id="file-upload" multiple className="hidden" onChange={handleAttachmentChange} />
                <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition"><Paperclip className="w-4 h-4" /> Attach Files</label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attachments.map((f, i) => (<span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1">{f.name} <X className="w-3 h-3 cursor-pointer" onClick={() => removeAttachment(i)} /></span>))}
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:-translate-y-1 ${loading ? "bg-gray-400" : channel === "email" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}>
            {loading ? "Scheduling..." : `Schedule ${channel === "email" ? "Email" : "WhatsApp"} Campaign`}
          </button>
        </form>
      </div>
    </div>
  );
}




// "use client";

// import { useState, useEffect } from "react";
// // FIX: Changed from "@/components/TiptapEditor" to "./TiptapEditor" to resolve build error
// import TiptapEditor from "@/components/TiptapEditor";
// import { useRef } from "react";
// import * as XLSX from "xlsx"; 
// import { useRouter } from "next/navigation";

// import {
//   Paperclip,
//   X,
//   Users,
//   CheckCircle,
//   FileText,
//   UploadCloud,
//   FileSpreadsheet,
//   MessageCircle,
//   Mail,
//   List,
// } from "lucide-react";

// export default function CampaignPage() {
//   const [statusMessage, setStatusMessage] = useState(null);
//   const [loading, setLoading] = useState(false);

//   // --- 1. CHANNEL SELECTION STATE ---
//   const [channel, setChannel] = useState("email"); // Options: 'email' | 'whatsapp'
//   const excelInputRef = useRef(null);
//   // --- DATA STATES ---
//   const [segments, setSegments] = useState([]);
//   const [campaignName, setCampaignName] = useState("");
//   const [scheduledTime, setScheduledTime] = useState("");
//   const [sender, setSender] = useState("");
//   const [excelFilePathFromUpload, setExcelFilePathFromUpload] = useState("");
//   const [emailSubject, setEmailSubject] = useState("");
//   const [ctaText, setCtaText] = useState("");

//   const [loadingSegments, setLoadingSegments] = useState(true);
//   const router = useRouter();
//   // --- FORM STATES ---
//   const [wordCount, setWordCount] = useState(0);
//   const [emailContent, setEmailContent] = useState("<p></p>"); // For Email (HTML)
//   const [whatsappContent, setWhatsappContent] = useState(""); // For WhatsApp (Plain Text)

//   // Updated options: 'segment' | 'excel' | 'manual'
//   const [recipientSource, setRecipientSource] = useState("segment");
//   const [selectedSegment, setSelectedSegment] = useState("");
//   const [excelFile, setExcelFile] = useState(null);
//   const [manualInput, setManualInput] = useState(""); // State for manual entry

//   const [attachments, setAttachments] = useState([]);

//   // -----------------------------------------------------------
//   // FETCH SEGMENTS FROM API ENDPOINTS
//   // -----------------------------------------------------------
//   useEffect(() => {
//     const fetchSegments = async () => {
//       try {
//         setLoadingSegments(true);
//         const token = localStorage.getItem("token");

//         // 1. Fetch both endpoints in parallel
//         const [customersRes, leadsRes] = await Promise.all([
//           fetch("/api/customers", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           fetch("/api/lead", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);

//         // 2. Parse JSON
//         const customersData = await customersRes.json();
//         const leadsData = await leadsRes.json();

//         // 3. Calculate Counts
//         const getCount = (data) => {
//           if (Array.isArray(data)) return data.length;
//           if (data && Array.isArray(data.data)) return data.data.length;
//           return 0;
//         };

//         const customerCount = getCount(customersData);
//         const leadsCount = getCount(leadsData);

//         // 4. Map to UI Structure
//         setSegments([
//           {
//             id: "source_customers",
//             label: "All Customers",
//             count: customerCount.toLocaleString(),
//             desc: "Fetched from /api/customers",
//           },
//           {
//             id: "source_leads",
//             label: "New Leads",
//             count: leadsCount.toLocaleString(),
//             desc: "Fetched from /api/lead",
//           },
//         ]);
//       } catch (error) {
//         console.error("Error fetching segments:", error);
//         setSegments([
//           {
//             id: "error",
//             label: "Error Loading Data",
//             count: "0",
//             desc: "Check API connection",
//           },
//         ]);
//       } finally {
//         setLoadingSegments(false);
//       }
//     };

//     fetchSegments();
//   }, []);

//   // --- HANDLERS ---

//   const clearExcel = () => {
//   setExcelFile(null);
//   setExcelFilePathFromUpload([]);

//   if (excelInputRef.current) {
//     excelInputRef.current.value = "";
//   }
// };


//   const isValidEmail = (email) => {
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// };

// const normalizeEmail = (email) =>
//   email?.toString().trim().replace(/,+$/, ""); // last comma hatao

//   const handleAttachmentChange = (e) => {
//     if (e.target.files && e.target.files.length > 0) {
//       setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
//     }
//   };


// const handleExcelChange = (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   setExcelFile(file);

//   const reader = new FileReader();

//   reader.onload = (evt) => {
//     const data = evt.target.result;
//     const workbook = XLSX.read(data, { type: "binary" });

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     let rawEmails = [];

//     if (rows.length > 0) {
//       // ✅ firstKey = column name, jo tumhari file me email hi hai
//       const firstKey = Object.keys(rows[0])[0];

//       if (isValidEmail(firstKey)) {
//         // 👉 Header bhi email hai, niche values bhi
//         rawEmails = [
//           firstKey,
//           ...rows.map((r) => r[firstKey]),
//         ];
//       } else {
//         // Normal case: header = "email" / "Email" / "EMAIL"
//         rawEmails = rows.flatMap((r) => [
//           r.email,
//           r.Email,
//           r.EMAIL,
//         ]);
//       }
//     }

//     const normalized = rawEmails
//       .map((e) => normalizeEmail(e))
//       .filter(Boolean);

//     const validEmails = [
//       ...new Set(normalized.filter((e) => isValidEmail(e))),
//     ];

//     const invalidEmails = normalized.filter((e) => !isValidEmail(e));

//     console.log("✅ Valid emails from Excel:", validEmails);
//     console.log("❌ Invalid emails skipped:", invalidEmails);

//     if (!validEmails.length) {
//       alert("Excel me koi valid email nahi mila ❌");
//       setExcelFilePathFromUpload([]); // just to be sure
//       return;
//     }

//     alert(
//       `✅ ${validEmails.length} valid emails\n❌ ${invalidEmails.length} invalid skipped`
//     );

//     // 👈 YAHI ARRAY DB me jaayega
//     setExcelFilePathFromUpload(validEmails);
//   };

//   reader.readAsBinaryString(file);
// };



//   const removeAttachment = (indexToRemove) => {
//     setAttachments((prev) =>
//       prev.filter((_, index) => index !== indexToRemove)
//     );
//   };

//   const handleEmailEditorChange = (html) => {
//     setEmailContent(html);
//     const textOnly = html.replace(/<[^>]*>/g, " ").trim();
//     setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
//   };

//   const handleFormSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setStatusMessage(null);

//     const form = e.target;

//     // ---------------- VALIDATION ----------------
//     if (channel === "email" && (!emailContent || emailContent === "<p></p>")) {
//       alert("Email body cannot be empty.");
//       setLoading(false);
//       return;
//     }

//     if (channel === "whatsapp" && !whatsappContent.trim()) {
//       alert("WhatsApp message cannot be empty.");
//       setLoading(false);
//       return;
//     }

//     if (recipientSource === "segment" && !selectedSegment) {
//       alert("Please select a segment.");
//       setLoading(false);
//       return;
//     }

//     let excelPath = "";
//     if (
//   recipientSource === "excel" &&
//   (!excelFilePathFromUpload || excelFilePathFromUpload.length === 0)
// ) {
//   setStatusMessage({
//     type: "error",
//     html: `<p class="font-bold">Please upload a valid Excel file with emails.</p>`,
//   });
//   setLoading(false);
//   return;
// }


//     if (recipientSource === "manual" && !manualInput.trim()) {
//       alert("Manual recipient list required.");
//       setLoading(false);
//       return;
//     }

//     // ---------------- PROCESS ATTACHMENTS ----------------
//     const attachmentBase64 = await Promise.all(
//       attachments.map(
//         (file) =>
//           new Promise((resolve) => {
//             const reader = new FileReader();
//             reader.onload = () => resolve(reader.result);
//             reader.readAsDataURL(file);
//           })
//       )
//     );

//     // ---------------- PAYLOAD ----------------
//     const payload = {
//       campaignName: form.campaignName.value,
//       scheduledTime: form.scheduledTime.value,

//       channel,
//       sender: channel === "email" ? form.sender.value : "WhatsApp Business API",

//       content: channel === "email" ? emailContent : whatsappContent,
//       emailSubject: channel === "email" ? form.emailSubject.value : undefined,
//       ctaText: channel === "email" ? form.ctaText.value : undefined,

//       recipientSource,
//       recipientList:
//         recipientSource === "segment" ? selectedSegment : undefined,
//       recipientManual: recipientSource === "manual" ? manualInput : undefined,
//       recipientExcelEmails:
//   recipientSource === "excel" ? excelFilePathFromUpload : undefined,


//       attachments: attachmentBase64,
//     };

//     try {
//       const token = localStorage.getItem("token");

//       const response = await fetch("/api/campaign", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       const result = await response.json();

//       if (!response.ok || !result.success)
//         throw new Error(result.error || "Failed to schedule.");

//       // ---------------- SUCCESS ----------------
//       setStatusMessage({
//         type: "success",
//         html: `
//         <p class="font-bold">${channel.toUpperCase()} Campaign Scheduled!</p>
//         <p>ID: ${result.data._id}</p>
//         <p>Type: ${channel}</p>
//       `,
//       });

//       form.reset();
//       setEmailContent("<p></p>");
//       setWhatsappContent("");
//       setManualInput("");
//       setSelectedSegment("");
//       setAttachments([]);
//       setExcelFile(null);
//       setWordCount(0);
//     } catch (err) {
//       setStatusMessage({
//         type: "error",
//         html: `
//         <p class="font-bold">Error!</p>
//         <p>${err.message}</p>
//       `,
//       });
//     }

//     setLoading(false);
//     router.push("/admin/crm/campaign");
//   };

// function formatStringToAMPM(dateString) {
//   if (!dateString) return "";

//   const [date, time] = dateString.split("T");
//   const [year, month, day] = date.split("-");
//   let [hour, minute] = time.split(":");

//   hour = parseInt(hour);

//   const ampm = hour >= 12 ? "PM" : "AM";
//   hour = hour % 12 || 12;

//   return `${day}/${month}/${year} ${hour}:${minute} ${ampm}`;
// }



//   return (
//     <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-inter">
//       <div className="max-w-5xl mx-auto">
//         {/* HEADER */}
//         <header className="mb-8 pb-4 border-b border-gray-200">
//           <h1 className="text-3xl font-extrabold text-gray-900">
//             Create Campaign
//           </h1>
//           <p className="text-gray-500 mt-1">
//             Reach your audience via Email or WhatsApp.
//           </p>
//         </header>

//         {/* CHANNEL SELECTOR */}
//         <div className="grid grid-cols-2 gap-4 mb-8">
//           <button
//             type="button"
//             onClick={() => setChannel("email")}
//             className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
//               channel === "email"
//                 ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-200"
//                 : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
//             }`}
//           >
//             <Mail
//               className={`w-8 h-8 ${
//                 channel === "email" ? "text-blue-600" : "text-gray-400"
//               }`}
//             />
//             <div className="text-left">
//               <span className="block font-bold text-lg">Email Campaign</span>
//               <span className="text-xs opacity-80">
//                 Rich text, images, long form
//               </span>
//             </div>
//           </button>

//           <button
//             type="button"
//             onClick={() => setChannel("whatsapp")}
//             className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
//               channel === "whatsapp"
//                 ? "border-green-500 bg-green-50 text-green-700 shadow-md ring-1 ring-green-200"
//                 : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
//             }`}
//           >
//             <MessageCircle
//               className={`w-8 h-8 ${
//                 channel === "whatsapp" ? "text-green-600" : "text-gray-400"
//               }`}
//             />
//             <div className="text-left">
//               <span className="block font-bold text-lg">WhatsApp Blast</span>
//               <span className="text-xs opacity-80">
//                 High open rates, short messages
//               </span>
//             </div>
//           </button>
//         </div>

//         {/* STATUS MESSAGE */}
//         {statusMessage && (
//           <div
//             className={`p-4 mb-6 rounded-lg shadow-md ${
//               statusMessage.type === "success"
//                 ? "bg-emerald-100 text-emerald-800"
//                 : "bg-red-100 text-red-800"
//             }`}
//             dangerouslySetInnerHTML={{ __html: statusMessage.html }}
//           ></div>
//         )}

//         <form
//           onSubmit={handleFormSubmit}
//           className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-100 space-y-8"
//         >
//           {/* SECTION 1: DETAILS */}
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
//               <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
//                 1
//               </span>
//               Basic Details
//             </h2>

//             <div className="grid grid-cols-1 gap-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-600">
//                   Campaign Name
//                 </label>
//                 <input
//                   type="text"
//                   name="campaignName"
//                   required
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                   placeholder="e.g., Diwali Promo 2025"
//                 />
//               </div>

//               {channel === "email" && (
//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-600">
//                     Email Subject
//                   </label>
//                   <input
//                     type="text"
//                     name="emailSubject"
//                     required
//                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                     placeholder="e.g., Don't miss out!"
//                   />
//                 </div>
//               )}
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {channel === "email" && (
//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-600">
//                     Sender Name
//                   </label>
//                   <input
//                     type="text"
//                     name="sender"
//                     required
//                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                     defaultValue="Marketing Team"
//                   />
//                 </div>
//               )}

//               <div className={channel === "whatsapp" ? "col-span-2" : ""}>
//                 <label className="block text-sm font-medium mb-1 text-gray-600">
//                   Schedule Time
//                 </label>

//             <input
//   type="datetime-local"
//   name="scheduledTime"
//   required
//   value={scheduledTime}
//   onChange={(e) => setScheduledTime(e.target.value)}
//   className="w-full p-3 border border-gray-300 rounded-lg"
// />


// {/* Preview - LOCAL AM/PM */}
// {scheduledTime && (
//   <p className="text-sm text-gray-600 mt-2">
//     📅 Scheduled: <b>{formatStringToAMPM(scheduledTime)}</b>
//   </p>
// )}

//               </div>
//             </div>
//           </div>

//           {/* SECTION 2: AUDIENCE */}
//           <div className="space-y-4">
//             <div className="flex items-center justify-between border-b pb-2 mb-4">
//               <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
//                 <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
//                   2
//                 </span>
//                 Audience
//               </h2>

//               {/* TOGGLE: Segment | Excel | Manual */}
//               <div className="flex bg-gray-100 p-1 rounded-lg">
//                 <button
//                   type="button"
//                   onClick={() => setRecipientSource("segment")}
//                   className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
//                     recipientSource === "segment"
//                       ? "bg-white shadow text-gray-900"
//                       : "text-gray-500"
//                   }`}
//                 >
//                   Segment
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setRecipientSource("excel")}
//                   className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
//                     recipientSource === "excel"
//                       ? "bg-white shadow text-gray-900"
//                       : "text-gray-500"
//                   }`}
//                 >
//                   Upload Excel
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setRecipientSource("manual")}
//                   className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
//                     recipientSource === "manual"
//                       ? "bg-white shadow text-gray-900"
//                       : "text-gray-500"
//                   }`}
//                 >
//                   Manual Entry
//                 </button>
//               </div>
//             </div>

//             {/* OPTION A: SEGMENTS */}
//             {recipientSource === "segment" && (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                 {loadingSegments ? (
//                   <div className="col-span-2 py-8 text-center text-gray-400 animate-pulse">
//                     Fetching data from CRM...
//                   </div>
//                 ) : (
//                   segments.map((segment) => (
//                     <div
//                       key={segment.id}
//                       onClick={() => setSelectedSegment(segment.id)}
//                       className={`cursor-pointer p-4 rounded-xl border-2 relative transition-all ${
//                         selectedSegment === segment.id
//                           ? "border-blue-500 bg-blue-50"
//                           : "border-gray-100 hover:border-blue-200"
//                       }`}
//                     >
//                       <div className="flex justify-between">
//                         <span className="font-bold text-gray-700">
//                           {segment.label}
//                         </span>
//                         {selectedSegment === segment.id && (
//                           <CheckCircle className="w-5 h-5 text-blue-500" />
//                         )}
//                       </div>
//                       <p className="text-xs text-gray-500 mt-1">
//                         {segment.desc}
//                       </p>
//                       <div className="mt-2 inline-block bg-white px-2 py-1 rounded border text-xs font-bold text-gray-600">
//                         {segment.count} Contacts
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             )}

//             {/* OPTION B: EXCEL */}
//         {recipientSource === "excel" && (
//   <div className="space-y-3">

//     {/* ===== Upload Box ===== */}
//     <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:border-blue-400 transition relative">
//       {excelFile ? (
//         <div className="flex items-center justify-center gap-2 text-blue-600">
//           <FileSpreadsheet /> {excelFile.name}
//         </div>
//       ) : (
//         <div className="text-gray-400">
//           <UploadCloud className="w-10 h-10 mx-auto mb-2" />
//           <span className="text-sm">Upload .xlsx or .csv</span>
//         </div>
//       )}

//       <input
//         type="file"
//         accept=".xlsx,.csv"
//         ref={excelInputRef}
//         onChange={handleExcelChange}
//         className="absolute inset-0 opacity-0 cursor-pointer"
//       />
//     </div>

//     {/* ===== Clear Button (OUTSIDE) ===== */}
//     {excelFile && (
//       <div className="flex justify-between items-center px-1">
//         <p className="text-sm text-gray-500">
//           {excelFilePathFromUpload.length} valid emails detected
//         </p>

//         <button
//           type="button"
//           onClick={clearExcel}
//           className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-500 rounded-md hover:bg-red-50 transition"
//         >
//           ❌ Clear Excel
//         </button>
//       </div>
//     )}

//   </div>
// )}



//             {/* OPTION C: MANUAL ENTRY */}
//             {recipientSource === "manual" && (
//               <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
//                 <label className="block text-sm font-bold text-gray-700 mb-2  items-center gap-2">
//                   <List className="w-4 h-4" />
//                   {channel === "email"
//                     ? "Enter Email Addresses"
//                     : "Enter Phone Numbers"}
//                 </label>
//                 <p className="text-xs text-gray-500 mb-2">
//                   Enter a single {channel === "email" ? "email" : "number"}, or
//                   paste a list separated by commas or new lines.
//                 </p>
//                 <textarea
//                   rows="5"
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
//                   placeholder={
//                     channel === "email"
//                       ? "john@example.com, jane@test.com\nsupport@company.com"
//                       : "+919876543210\n+1234567890"
//                   }
//                   value={manualInput}
//                   onChange={(e) => setManualInput(e.target.value)}
//                 ></textarea>
//                 <div className="text-right text-xs text-gray-500 mt-1">
//                   {manualInput.length > 0
//                     ? `${
//                         manualInput.split(/[\n,]+/).filter((x) => x.trim())
//                           .length
//                       } Recipients detected`
//                     : "0 Recipients"}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* SECTION 3: CONTENT */}
//           <div className="space-y-4">
//             <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
//               <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
//                 3
//               </span>
//               {channel === "email" ? "Email Content" : "WhatsApp Message"}
//             </h2>

//             {channel === "email" && (
//               <div>
//                 <div className="min-h-[250px]">
//                   <TiptapEditor
//                     content={emailContent}
//                     onChange={handleEmailEditorChange}
//                   />
//                 </div>
//                 <div className="mt-4">
//                   <label className="block text-sm font-medium mb-1 text-gray-600">
//                     CTA Button Text
//                   </label>
//                   <input
//                     name="ctaText"
//                     type="text"
//                     className="w-full p-3 border border-gray-300 rounded-lg"
//                     placeholder="Shop Now"
//                   />
//                 </div>
//               </div>
//             )}

//             {channel === "whatsapp" && (
//               <div className="bg-green-50 p-4 rounded-xl border border-green-200">
//                 <label className="block text-sm font-bold text-green-800 mb-2">
//                   Message Template
//                 </label>
//                 <textarea
//                   rows="6"
//                   value={whatsappContent}
//                   onChange={(e) => setWhatsappContent(e.target.value)}
//                   className="w-full p-4 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
//                   placeholder="Hello {{name}}, our Diwali sale is live! Get 50% off now."
//                 ></textarea>
//                 <div className="flex justify-between text-xs text-green-700 mt-2">
//                   <span>Supports: *bold*, _italic_, ~strike~</span>
//                   <span>{whatsappContent.length} chars</span>
//                 </div>
//               </div>
//             )}

//             <div className="mt-4">
//               <div className="relative inline-block">
//                 <input
//                   type="file"
//                   id="file-upload"
//                   multiple
//                   className="hidden"
//                   onChange={handleAttachmentChange}
//                 />
//                 <label
//                   htmlFor="file-upload"
//                   className="cursor-pointer flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition"
//                 >
//                   <Paperclip className="w-4 h-4" /> Attach Files
//                 </label>
//               </div>
//               {attachments.length > 0 && (
//                 <div className="mt-2 flex flex-wrap gap-2">
//                   {attachments.map((f, i) => (
//                     <span
//                       key={i}
//                       className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
//                     >
//                       {f.name}{" "}
//                       <X
//                         className="w-3 h-3 cursor-pointer"
//                         onClick={() => removeAttachment(i)}
//                       />
//                     </span>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:-translate-y-1 ${
//               loading
//                 ? "bg-gray-400"
//                 : channel === "email"
//                 ? "bg-blue-600 hover:bg-blue-700"
//                 : "bg-green-600 hover:bg-green-700"
//             }`}
//           >
//             {loading
//               ? "Scheduling..."
//               : `Schedule ${
//                   channel === "email" ? "Email" : "WhatsApp"
//                 } Campaign`}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
