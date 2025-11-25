"use client";

import { useState, useEffect } from "react";
// FIX: Changed from "@/components/TiptapEditor" to "./TiptapEditor" to resolve build error
import TiptapEditor from "@/components/TiptapEditor";
import { Paperclip, X, Users, CheckCircle, FileText, UploadCloud, FileSpreadsheet, MessageCircle, Mail, List } from "lucide-react"; 

export default function CampaignPage() {
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // --- 1. CHANNEL SELECTION STATE ---
  const [channel, setChannel] = useState("email"); // Options: 'email' | 'whatsapp'

  // --- DATA STATES ---
  const [segments, setSegments] = useState([]); 
  const [campaignName, setCampaignName] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sender, setSender] = useState("");
  const [excelFilePathFromUpload, setExcelFilePathFromUpload] = useState(""); 
  const [emailSubject, setEmailSubject] = useState("");
  const [ctaText, setCtaText] = useState("");

  const [loadingSegments, setLoadingSegments] = useState(true);

  // --- FORM STATES ---
  const [wordCount, setWordCount] = useState(0);
  const [emailContent, setEmailContent] = useState("<p></p>"); // For Email (HTML)
  const [whatsappContent, setWhatsappContent] = useState("");  // For WhatsApp (Plain Text)
  
  // Updated options: 'segment' | 'excel' | 'manual'
  const [recipientSource, setRecipientSource] = useState("segment"); 
  const [selectedSegment, setSelectedSegment] = useState("");
  const [excelFile, setExcelFile] = useState(null); 
  const [manualInput, setManualInput] = useState(""); // State for manual entry
  
  const [attachments, setAttachments] = useState([]);

  // -----------------------------------------------------------
  // FETCH SEGMENTS FROM API ENDPOINTS
  // -----------------------------------------------------------
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        setLoadingSegments(true);
        const token = localStorage.getItem("token");

        // 1. Fetch both endpoints in parallel
        const [customersRes, leadsRes] = await Promise.all([
          fetch('/api/customers', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/lead', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        // 2. Parse JSON
        const customersData = await customersRes.json();
        const leadsData = await leadsRes.json();

        // 3. Calculate Counts
        const getCount = (data) => {
            if (Array.isArray(data)) return data.length;
            if (data && Array.isArray(data.data)) return data.data.length;
            return 0;
        };

        const customerCount = getCount(customersData);
        const leadsCount = getCount(leadsData);

        // 4. Map to UI Structure
        setSegments([
          { 
            id: "source_customers", 
            label: "All Customers", 
            count: customerCount.toLocaleString(), 
            desc: "Fetched from /api/customers" 
          },
          { 
            id: "source_leads", 
            label: "New Leads", 
            count: leadsCount.toLocaleString(), 
            desc: "Fetched from /api/lead" 
          }
        ]);

      } catch (error) {
        console.error("Error fetching segments:", error);
        setSegments([
          { id: "error", label: "Error Loading Data", count: "0", desc: "Check API connection" }
        ]);
      } finally {
        setLoadingSegments(false);
      }
    };

    fetchSegments();
  }, []);

  // --- HANDLERS ---

  const handleAttachmentChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

 const handleExcelChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setExcelFile(file);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload/excel", {
      method: "POST",
      body: formData,
    });

    const result = await uploadRes.json();

    if (!uploadRes.ok || !result.success) {
      throw new Error(result.error || "Excel upload failed");
    }

    console.log("Excel Uploaded Path:", result.filePath);

    setExcelFilePathFromUpload(result.filePath); // << STORE PATH HERE

  } catch (err) {
    console.error("UPLOAD ERROR", err);
    alert("Excel Upload Failed: " + err.message);
  }
};


  const removeAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleEmailEditorChange = (html) => {
    setEmailContent(html);
    const textOnly = html.replace(/<[^>]*>/g, " ").trim();
    setWordCount(textOnly ? textOnly.split(/\s+/).length : 0);
  };





const handleFormSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setStatusMessage(null);

  const form = e.target;

  // ---------------- VALIDATION ----------------
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

let excelPath = "";
if (recipientSource === "excel") {
  if (!excelFilePathFromUpload) {
    setStatusMessage({
      type: "error",
      html: `<p class="font-bold">Please upload Excel file first.</p>`,
    });
    setLoading(false);
    return;
  }
  excelPath = excelFilePathFromUpload;
}


  if (recipientSource === "manual" && !manualInput.trim()) {
    alert("Manual recipient list required.");
    setLoading(false);
    return;
  }

  // ---------------- PROCESS ATTACHMENTS ----------------
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

  // ---------------- PAYLOAD ----------------
const payload = {
  campaignName: form.campaignName.value,
  scheduledTime: form.scheduledTime.value,

  channel,
  sender: channel === "email" ? form.sender.value : "WhatsApp Business API",

  content: channel === "email" ? emailContent : whatsappContent,
  emailSubject: channel === "email" ? form.emailSubject.value : undefined,
  ctaText: channel === "email" ? form.ctaText.value : undefined,

  recipientSource,
  recipientList: recipientSource === "segment" ? selectedSegment : undefined,
  recipientManual: recipientSource === "manual" ? manualInput : undefined,
  recipientExcelPath:
    recipientSource === "excel" ? excelFilePathFromUpload : undefined,

  attachments: attachmentBase64,
};


  try {
    const token = localStorage.getItem("token");

    const response = await fetch("/api/campaign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success)
      throw new Error(result.error || "Failed to schedule.");

    // ---------------- SUCCESS ----------------
    setStatusMessage({
      type: "success",
      html: `
        <p class="font-bold">${channel.toUpperCase()} Campaign Scheduled!</p>
        <p>ID: ${result.data._id}</p>
        <p>Type: ${channel}</p>
      `,
    });

    form.reset();
    setEmailContent("<p></p>");
    setWhatsappContent("");
    setManualInput("");
    setSelectedSegment("");
    setAttachments([]);
    setExcelFile(null);
    setWordCount(0);
  } catch (err) {
    setStatusMessage({
      type: "error",
      html: `
        <p class="font-bold">Error!</p>
        <p>${err.message}</p>
      `,
    });
  }

  setLoading(false);
};


  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-inter">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-8 pb-4 border-b border-gray-200">
            <h1 className="text-3xl font-extrabold text-gray-900">Create Campaign</h1>
            <p className="text-gray-500 mt-1">Reach your audience via Email or WhatsApp.</p>
        </header>

        {/* CHANNEL SELECTOR */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                    channel === "email" 
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-200" 
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
            >
                <Mail className={`w-8 h-8 ${channel === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                    <span className="block font-bold text-lg">Email Campaign</span>
                    <span className="text-xs opacity-80">Rich text, images, long form</span>
                </div>
            </button>

            <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                    channel === "whatsapp" 
                    ? "border-green-500 bg-green-50 text-green-700 shadow-md ring-1 ring-green-200" 
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
            >
                <MessageCircle className={`w-8 h-8 ${channel === 'whatsapp' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                    <span className="block font-bold text-lg">WhatsApp Blast</span>
                    <span className="text-xs opacity-80">High open rates, short messages</span>
                </div>
            </button>
        </div>

        {/* STATUS MESSAGE */}
        {statusMessage && (
          <div className={`p-4 mb-6 rounded-lg shadow-md ${statusMessage.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`} dangerouslySetInnerHTML={{ __html: statusMessage.html }}></div>
        )}

        <form onSubmit={handleFormSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-xl border border-gray-100 space-y-8">
          
          {/* SECTION 1: DETAILS */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
              Basic Details
            </h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Campaign Name</label>
                <input type="text" name="campaignName" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Diwali Promo 2025" />
              </div>
              
              {channel === "email" && (
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Email Subject</label>
                    <input type="text" name="emailSubject" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Don't miss out!" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channel === "email" && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-600">Sender Name</label>
                    <input type="text" name="sender" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" defaultValue="Marketing Team" />
                  </div>
              )}
              
              <div className={channel === 'whatsapp' ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium mb-1 text-gray-600">Schedule Time</label>
                <input type="datetime-local" name="scheduledTime" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* SECTION 2: AUDIENCE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
                Audience
              </h2>
              
              {/* TOGGLE: Segment | Excel | Manual */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => setRecipientSource("segment")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "segment" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Segment</button>
                <button type="button" onClick={() => setRecipientSource("excel")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "excel" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Upload Excel</button>
                <button type="button" onClick={() => setRecipientSource("manual")} className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${recipientSource === "manual" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>Manual Entry</button>
              </div>
            </div>

            {/* OPTION A: SEGMENTS */}
            {recipientSource === "segment" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loadingSegments ? (
                    <div className="col-span-2 py-8 text-center text-gray-400 animate-pulse">
                        Fetching data from CRM...
                    </div>
                ) : (
                    segments.map((segment) => (
                        <div key={segment.id} onClick={() => setSelectedSegment(segment.id)} className={`cursor-pointer p-4 rounded-xl border-2 relative transition-all ${selectedSegment === segment.id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200"}`}>
                            <div className="flex justify-between"><span className="font-bold text-gray-700">{segment.label}</span>{selectedSegment === segment.id && <CheckCircle className="w-5 h-5 text-blue-500" />}</div>
                            <p className="text-xs text-gray-500 mt-1">{segment.desc}</p>
                            <div className="mt-2 inline-block bg-white px-2 py-1 rounded border text-xs font-bold text-gray-600">{segment.count} Contacts</div>
                        </div>
                    ))
                )}
              </div>
            )}

            {/* OPTION B: EXCEL */}
            {recipientSource === "excel" && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:border-blue-400 transition relative">
                  {excelFile ? (
                    <div className="flex items-center justify-center gap-2 text-blue-600"><FileSpreadsheet /> {excelFile.name}</div>
                  ) : (
                    <div className="text-gray-400"><UploadCloud className="w-10 h-10 mx-auto mb-2"/> <span className="text-sm">Upload .xlsx or .csv</span></div>
                  )}
                  <input type="file" accept=".xlsx,.csv" onChange={handleExcelChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            )}

            {/* OPTION C: MANUAL ENTRY */}
            {recipientSource === "manual" && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                 <label className="block text-sm font-bold text-gray-700 mb-2  items-center gap-2">
                    <List className="w-4 h-4"/>
                    {channel === 'email' ? 'Enter Email Addresses' : 'Enter Phone Numbers'}
                 </label>
                 <p className="text-xs text-gray-500 mb-2">
                    Enter a single {channel === 'email' ? 'email' : 'number'}, or paste a list separated by commas or new lines.
                 </p>
                 <textarea
                    rows="5"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    placeholder={channel === 'email' ? "john@example.com, jane@test.com\nsupport@company.com" : "+919876543210\n+1234567890"}
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                 ></textarea>
                 <div className="text-right text-xs text-gray-500 mt-1">
                    {manualInput.length > 0 ? `${manualInput.split(/[\n,]+/).filter(x => x.trim()).length} Recipients detected` : '0 Recipients'}
                 </div>
              </div>
            )}
          </div>

          {/* SECTION 3: CONTENT */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">3</span>
              {channel === 'email' ? 'Email Content' : 'WhatsApp Message'}
            </h2>

            {channel === 'email' && (
                <div>
                    <div className="min-h-[250px]">
                        <TiptapEditor content={emailContent} onChange={handleEmailEditorChange} />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium mb-1 text-gray-600">CTA Button Text</label>
                        <input name="ctaText" type="text" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Shop Now" />
                    </div>
                </div>
            )}

            {channel === 'whatsapp' && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <label className="block text-sm font-bold text-green-800 mb-2">Message Template</label>
                    <textarea
                        rows="6"
                        value={whatsappContent}
                        onChange={(e) => setWhatsappContent(e.target.value)}
                        className="w-full p-4 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm"
                        placeholder="Hello {{name}}, our Diwali sale is live! Get 50% off now."
                    ></textarea>
                    <div className="flex justify-between text-xs text-green-700 mt-2">
                        <span>Supports: *bold*, _italic_, ~strike~</span>
                        <span>{whatsappContent.length} chars</span>
                    </div>
                </div>
            )}

            <div className="mt-4">
                <div className="relative inline-block">
                  <input type="file" id="file-upload" multiple className="hidden" onChange={handleAttachmentChange} />
                  <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200 transition">
                    <Paperclip className="w-4 h-4" /> Attach Files
                  </label>
                </div>
                {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((f, i) => <span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1">{f.name} <X className="w-3 h-3 cursor-pointer" onClick={() => removeAttachment(i)}/></span>)}
                    </div>
                )}
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition hover:-translate-y-1 ${loading ? "bg-gray-400" : channel === 'email' ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}>
            {loading ? "Scheduling..." : `Schedule ${channel === 'email' ? 'Email' : 'WhatsApp'} Campaign`}
          </button>

        </form>
      </div>
    </div>
  );
}