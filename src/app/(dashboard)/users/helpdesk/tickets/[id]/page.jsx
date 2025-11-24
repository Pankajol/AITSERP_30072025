// src/app/users/tickets/[id]/page.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

const SAMPLE_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png"; // use uploaded file path as fallback

export default function UserTicketView({ params }) {
  const ticketId = params?.id;
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [error, setError] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]); // { url, name, type, preview }
  const [dragging, setDragging] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const containerRef = useRef(null);

  // axios helper using latest token
  function api() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return axios.create({
      headers: { Authorization: token ? "Bearer " + token : "" },
      validateStatus: () => true,
    });
  }

  async function load() {
    if (!ticketId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api().get(`/api/helpdesk/details/${ticketId}`);
      if (res.status === 401) {
        setError("Not authenticated. Please login.");
        setTicket(null);
      } else if (!res.data || !res.data.success) {
        setError(res.data?.msg || "Ticket not found.");
        setTicket(null);
      } else {
        setTicket(res.data.ticket);
        // auto-scroll a bit after render
        setTimeout(() => {
          if (autoScrollEnabled) scrollToBottom();
        }, 100);
      }
    } catch (err) {
      console.error("load ticket error:", err);
      setError("Server error while loading ticket.");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 30000); // optional polling
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // scroll helpers
  function scrollToBottom(behavior = "smooth") {
    try {
      if (!containerRef.current) return;
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior });
    } catch {}
  }

  function onUserScroll() {
    if (!containerRef.current) return;
    const bottom = containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight;
    setAutoScrollEnabled(bottom < 120);
  }

  // handle file selection (local previews) and upload
  function handleFilesSelected(files) {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 6); // limit to 6 at once
    // create local previews first
    const newAttachments = list.map((f) => {
      const preview = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
      return { file: f, preview, name: f.name, type: f.type, url: null, uploading: true, id: `local-${Date.now()}-${Math.random()}` };
    });

    setAttachments((a) => [...a, ...newAttachments]);

    // upload each file
    newAttachments.forEach(uploadAttachment);
  }

  async function uploadAttachment(att) {
    // att: { file, ... }
    try {
      const form = new FormData();
      form.append("file", att.file);
      form.append("ticketId", ticketId);

      // POST to your upload endpoint
      const resp = await fetch("/api/helpdesk/upload", {
        method: "POST",
        body: form,
        headers: { Authorization: "Bearer " + (localStorage.getItem("token") || "") },
      });

      const dataText = await resp.text();
      let data;
      try {
        data = JSON.parse(dataText);
      } catch {
        // server returned HTML or text; show error
        console.error("Upload response not JSON:", dataText);
        setError("Upload failed (invalid server response).");
        setAttachments((a) => a.map(x => (x.id === att.id ? { ...x, uploading: false } : x)));
        return;
      }

      if (!data || data.success === false) {
        console.error("Upload failed:", data);
        setError(data?.msg || "Upload failed");
        setAttachments((a) => a.map(x => (x.id === att.id ? { ...x, uploading: false } : x)));
        return;
      }

      // assume server returns { success: true, url: "<public-url>", name, type }
      const url = data.url || (data.urls && data.urls[0]);
      if (!url) {
        setError("Upload did not return file URL.");
        setAttachments((a) => a.map(x => (x.id === att.id ? { ...x, uploading: false } : x)));
        return;
      }

      // update attachments: set url and remove 'file' to reduce memory
      setAttachments((a) =>
        a.map((x) =>
          x.id === att.id ? { ...x, url, uploading: false, file: undefined } : x
        )
      );
    } catch (err) {
      console.error("uploadAttachment error:", err);
      setError("Upload error");
      setAttachments((a) => a.map(x => (x.id === att.id ? { ...x, uploading: false } : x)));
    }
  }

  // remove attachment (local or uploaded)
  function removeAttachment(idx) {
    setAttachments((a) => {
      const copy = [...a];
      const removed = copy.splice(idx, 1)[0];
      // revoke object URL if any
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  }

  // drop handlers
  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files) handleFilesSelected(e.dataTransfer.files);
  }

  // send reply together with attachments (uses uploaded file URLs)
  async function sendReply(e) {
    e?.preventDefault();
    // require message or at least one uploaded attachment url
    const hasUrls = attachments.some((a) => !!a.url);
    if (!reply.trim() && !hasUrls) {
      setError("Please write a message or upload a file.");
      return;
    }

    setSending(true);
    setError(null);

    // prepare attachments to send (only those with urls)
    const toSendAttachments = attachments
      .filter((a) => !!a.url)
      .map((a) => ({ url: a.url, name: a.name, type: a.type }));

    try {
      const res = await api().post("/api/helpdesk/reply", {
        ticketId,
        message: reply,
        attachments: toSendAttachments,
      });

      if (res.status === 401) {
        setError("Not authenticated. Please login.");
        return;
      }
      if (!res.data || !res.data.success) {
        setError(res.data?.msg || "Failed to send reply");
        return;
      }

      // on success: clear attachments (only the ones we sent) and reply, set ticket from server
      setReply("");
      setAttachments((a) => a.filter((att) => !toSendAttachments.find((s) => s.url === att.url)));
      setTicket(res.data.ticket || null);

      // scroll to bottom
      setTimeout(() => scrollToBottom(), 120);
    } catch (err) {
      console.error("sendReply error:", err);
      setError("Server error sending reply.");
      // reload to keep consistent
      await load();
    } finally {
      setSending(false);
    }
  }

  // cleanup local previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a?.preview) URL.revokeObjectURL(a.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-scroll when ticket changes (new messages)
  useEffect(() => {
    if (!ticket) return;
    if (autoScrollEnabled) {
      setTimeout(() => scrollToBottom("auto"), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.messages?.length]);

  // helper to get current user (best-effort)
  function getCurrentUser() {
    try {
      const u = localStorage.getItem("user");
      if (!u) return null;
      return JSON.parse(u);
    } catch {
      return null;
    }
  }

  // UI helpers
  function renderBadge(status) {
    const map = {
      open: "bg-green-100 text-green-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      pending: "bg-orange-100 text-orange-800",
      "on-hold": "bg-purple-100 text-purple-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return <span className={`px-2 py-1 rounded text-xs ${map[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="p-6 bg-white rounded shadow">
          <div className="text-red-600 font-semibold mb-2">Ticket not found</div>
          {error && <div className="text-sm text-gray-600 mb-3">{error}</div>}
          <button onClick={load} className="px-4 py-2 bg-gray-200 rounded">Retry</button>
        </div>
      </div>
    );
  }

  const me = getCurrentUser();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <div className="text-sm text-gray-500">
            {ticket.customerId?.name || ticket.customerId?.email} • Created {new Date(ticket.createdAt).toLocaleString()}
          </div>
          <div className="mt-2">{renderBadge(ticket.status)} <span className="ml-3 text-xs text-gray-500">Priority: {ticket.priority}</span></div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </header>

      {/* Conversation */}
      <section className="bg-white rounded shadow p-3">
        <div
          ref={containerRef}
          onScroll={onUserScroll}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="max-h-[60vh] sm:max-h-[70vh] overflow-auto space-y-3 p-3"
          aria-live="polite"
        >
          {(ticket.messages || []).map((m) => {
            const sender = m.sender || {};
            const senderId = sender._id || sender.id || sender;
            const isMe = String(senderId) === String(me?.id);
            const avatar = sender.avatar || SAMPLE_AVATAR;

            return (
              <div key={m._id || m.createdAt} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                {!isMe && (
                  <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border" onError={(e)=> e.currentTarget.src = SAMPLE_AVATAR} />
                )}

                <div className={`max-w-[85%] ${isMe ? "text-right" : "text-left"}`}>
                  <div className={`inline-block p-3 rounded-lg ${isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.message}</div>

                    {m.attachments?.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {m.attachments.map((att, i) => {
                          const href = att.url || att;
                          const name = att.name || (typeof att === "string" ? href.split("/").pop() : "attachment");
                          const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(href);
                          return (
                            <div key={i} className="text-xs">
                              {isImage ? (
                                <a href={href} target="_blank" rel="noreferrer" className="block">
                                  <img src={href} alt={name} className="max-h-40 rounded object-cover border" />
                                  <div className="mt-1 text-xs text-gray-600">{name}</div>
                                </a>
                              ) : (
                                <a href={href} target="_blank" rel="noreferrer" className="underline text-xs text-blue-600">
                                  {name}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 mt-1">
                    {!isMe && <span className="font-medium mr-2">{sender.name || sender.email}</span>}
                    <span>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</span>
                    {m.optimistic && <span className="ml-2 italic text-xs text-gray-500">(Sending…)</span>}
                  </div>
                </div>

                {isMe && (
                  <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border" onError={(e)=> e.currentTarget.src = SAMPLE_AVATAR} />
                )}
              </div>
            );
          })}

          {/* drag hint */}
          {dragging && (
            <div className="p-3 text-center text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded">Drop files here to upload</div>
          )}
        </div>

        {/* attachments preview area (files waiting or uploaded) */}
        {attachments.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((a, i) => (
              <div key={a.id || i} className="flex items-center justify-between gap-3 bg-white p-2 rounded shadow-sm">
                <div className="flex items-center gap-2">
                  {a.preview ? (
                    <img src={a.preview} alt={a.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs">{(a.name || "").slice(0,2)}</div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.uploading ? "Uploading…" : (a.url ? "Uploaded" : "Ready")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">View</a>}
                  <button onClick={() => removeAttachment(i)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* composer */}
        <div className="mt-3">
          <form onSubmit={sendReply} className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="flex-1 w-full border rounded p-2"
                placeholder="Write a reply..."
              />

              {/* file selector */}
              <div className="flex-shrink-0">
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <span className="text-sm">Attach</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">You can drag & drop files into the conversation area.</div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input type="checkbox" checked={autoScrollEnabled} onChange={(e) => setAutoScrollEnabled(e.target.checked)} />
                  Auto-scroll
                </label>

                <button type="button" onClick={() => { setReply(""); setAttachments([]); }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
                <button type="submit" disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded">
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* CSAT when closed */}
      {ticket.status === "closed" && (
        <section className="bg-white rounded shadow p-4">
          {/* Placeholder for CSAT widget — replace with your component */}
          <div className="text-sm text-gray-700">Thanks for using support. Please rate your experience.</div>
        </section>
      )}
    </div>
  );
}



// // src/app/users/tickets/[id]/page.jsx
// "use client";
// import { useEffect, useState } from "react";
// import MessageBubble from "@/components/helpdesk/MessageBubble";
// import AIReplyPanel from "@/components/helpdesk/AIReplyPanel";
// import FileUploader from "@/components/helpdesk/FileUploader";
// import CSATWidget from "@/components/helpdesk/CSATWidget";

// export default function UserTicketView({ params }) {
//   const id = params.id;
//   const [ticket, setTicket] = useState(null);
//   const [reply, setReply] = useState("");

//   async function load() {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     const res = await fetch(`/api/helpdesk/details/${id}`, { headers: { Authorization: "Bearer " + token } });
//     const data = await res.json();
//     if (data.success) setTicket(data.ticket);
//   }

//   useEffect(() => { load(); }, []);

//   async function sendReply() {
//     const token = localStorage.getItem("token");
//     if (!token) return alert("Not authenticated");
//     await fetch("/api/helpdesk/reply", {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
//       body: JSON.stringify({ ticketId: id, message: reply }),
//     });
//     setReply("");
//     load();
//   }

//   if (!ticket) return <div className="p-6">Loading…</div>;

//   return (
//     <div className="p-6 space-y-4">
//       <h1 className="text-2xl font-bold">{ticket.subject}</h1>

//       <div className="space-y-3 bg-gray-200 p-4 rounded">
//         {ticket.messages.map(m => <MessageBubble key={m._id} msg={m} meId={JSON.parse(localStorage.getItem("user") || "{}").id} />)}
//       </div>

//       <FileUploader ticketId={id} onUploaded={() => load()} />

//       <textarea className="w-full p-2 border rounded h-24" placeholder="Write your reply..." value={reply} onChange={e => setReply(e.target.value)} />
//       <div className="flex gap-3">
//         <button onClick={sendReply} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
//         {/* <AIReplyPanel ticketId={id} onSelect={(txt) => setReply(txt)} /> */}
//       </div>

//       {ticket.status === "closed" && <CSATWidget ticketId={id} />}
//     </div>
//   );
// }
