// src/app/helpdesk/new/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/helpdesk/FileUploader";

/**
 * Create Ticket page used by Customers and Employees.
 * - fetches categories from /api/helpdesk/category/list
 * - posts to /api/helpdesk/create
 * - supports file upload via FileUploader component
 *
 * NOTE: page expects token in localStorage.token and user in localStorage.user
 */

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    subject: "",
    category: "",
    message: "",
  });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // sample local file you uploaded earlier (for quick visual testing)
// sample test image (your uploaded file)
const sampleImageUrl = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

useEffect(() => {
  // Role guard: allow employee, customer, user, agent, admin
  const token = localStorage.getItem("token");
  const raw = localStorage.getItem("user");

  if (!token || !raw) {
    router.push("/login");
    return;
  }

  let u;
  try { u = JSON.parse(raw); } catch (e) {
    // malformed user object — force login
    router.push("/login");
    return;
  }

  // role might be stored as: user.role.name OR user.role OR user.roles (array)

  

  // load categories
  setLoading(true);
  fetch("/api/helpdesk/category/list", {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => r.json())
    .then((res) => {
      if (res.success) setCategories(res.categories || []);
      else {
        console.error("categories load:", res);
        setCategories([]);
      }
    })
    .catch((err) => {
      console.error("categories fetch error:", err);
      setCategories([]);
    })
    .finally(() => setLoading(false));
}, [router]);

  if (loading) return <div className="p-6">Loading…</div>;
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!form.subject.trim() || !form.message.trim() || !form.category) {
      setErr("Subject, category and message are required.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/helpdesk/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setErr(data.msg || "Failed to create ticket");
        setSubmitting(false);
        return;
      }

      const created = data.ticket;
      // If there are attachments uploaded before create (FileUploader returns attachment object),
      // optionally you can link them server-side by sending ticketId in the upload call.
      // Our upload handler supports "ticketId" form field — if you want to attach after create,
      // you can call the upload endpoint with ticketId. For simplicity we assume files were uploaded with ticketId already.

      // Redirect to the ticket view for the user area
      // Employee => /users/tickets/:id ; Customer => /helpdesk/tickets/:id
      const raw = localStorage.getItem("user");
      const u = JSON.parse(raw || "{}");
      const role = u?.role?.name || u?.role || (u.roles && u.roles[0]) || "customer";
      if (role === "employee") router.push(`/users/helpdesk/tickets/${created._id}`);
      else if (role === "agent") router.push(`/agent/helpdesk/tickets/${created._id}`);
      else if (role === "admin") router.push(`/admin/helpdesk/tickets/${created._id}`);
      else router.push(`/users/helpdesk/tickets/${created._id}`);
    } catch (err) {
      console.error(err);
      setErr(err?.message || "Error creating ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create New Ticket</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={submit} className="col-span-2 space-y-4 bg-white p-4 rounded shadow">
          <div>
            <label className="block text-sm font-medium">Subject</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handle}
              className="w-full p-2 border rounded mt-1"
              placeholder="Short summary of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handle}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name} {c.type === "default" ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Message</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handle}
              className="w-full p-2 border rounded mt-1 h-40"
              placeholder="Describe your problem in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Attachments (optional)</label>
            <div className="mt-2">
              {/* FileUploader component will POST to /api/helpdesk/upload */}
              <FileUploader
                ticketId={null /* you may upload after create by passing ticketId; or upload now and attach later */}
                onUploaded={(att) => {
                  // store attachments in local state. In production you'd attach them to the ticket (upload with ticketId).
                  setAttachments((s) => [...s, att]);
                }}
              />
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((a) => (
                    <li key={a._id} className="text-sm">
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        {a.filename}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded text-white ${submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {submitting ? "Creating…" : "Create Ticket"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForm({ subject: "", category: "", message: "" });
                setAttachments([]);
              }}
              className="px-4 py-2 rounded border"
            >
              Reset
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold">Tips</h3>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600">
              <li>Provide a clear subject and reproduction steps.</li>
              <li>Attach screenshots or logs if possible.</li>
              <li>Choose the correct category to get faster help.</li>
            </ul>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-semibold">Sample uploaded file (test)</h3>
            <p className="text-sm text-gray-500 mb-2">This is the sample file you uploaded earlier — useful to test the upload/viewer flow.</p>
            <img src={sampleImageUrl} alt="sample" className="w-full rounded" />
          </div>
        </aside>
      </div>
    </div>
  );
}
