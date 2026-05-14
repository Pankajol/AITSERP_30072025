"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function SupportMailboxManager() {
  const [mailboxes, setMailboxes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    type: "gmail",
    appPassword: "",
  });

  const [editingEmail, setEditingEmail] = useState(null);

  /* ================= TOKEN ================= */
  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again");
      return null;
    }
    return token;
  };

  /* ================= LOAD ================= */
  useEffect(() => {
    loadMailboxes();
  }, []);

  async function loadMailboxes() {
    try {
      const token = getToken();
      if (!token) return;

      setLoading(true);
      const res = await axios.get("/api/company/support-emails", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMailboxes(res.data.supportEmails || []);
    } catch {
      toast.error("Failed to load support mailboxes");
    } finally {
      setLoading(false);
    }
  }

  /* ================= ADD / UPDATE ================= */
  async function submitForm() {
    if (!form.email || (!editingEmail && !form.appPassword)) {
      toast.error("Email & App Password required");
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      setLoading(true);

      if (editingEmail) {
        await axios.put(
          "/api/company/support-emails",
          {
            email: editingEmail,
            updates: {
              type: form.type,
              appPassword: form.appPassword || undefined,
            },
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success("Mailbox updated");
      } else {
        const res = await axios.post(
          "/api/company/support-emails",
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setMailboxes(res.data.supportEmails);
        toast.success("Mailbox added");
      }

      resetForm();
      loadMailboxes();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  /* ================= DELETE ================= */
  async function removeMailbox(email) {
    if (!confirm("Delete this support mailbox?")) return;

    try {
      const token = getToken();
      if (!token) return;

      const res = await axios.delete("/api/company/support-emails", {
        data: { email },
        headers: { Authorization: `Bearer ${token}` },
      });

      setMailboxes(res.data.supportEmails);
      toast.warn("Mailbox removed");
    } catch {
      toast.error("Delete failed");
    }
  }

  /* ================= TOGGLE ================= */
  async function toggle(email, field, value) {
    try {
      const token = getToken();
      if (!token) return;

      await axios.put(
        "/api/company/support-emails",
        {
          email,
          updates: { [field]: value },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      loadMailboxes();
    } catch {
      toast.error("Update failed");
    }
  }

  /* ================= EDIT ================= */
  function startEdit(box) {
    setEditingEmail(box.email);
    setForm({
  email: box.email,
  type: box.type || "gmail",
  appPassword: "",
});

  }

  function resetForm() {
    setEditingEmail(null);
    setForm({ email: "", type: "gmail", appPassword: "" });
  }

  /* ================= UI ================= */
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        📮 Support Mailboxes
      </h2>

      {/* FORM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <input
          type="email"
          placeholder="support@company.com"
          className="border rounded p-2"
          value={form.email}
          disabled={!!editingEmail}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <select
          className="border rounded p-2"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value })
          }
        >
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook</option>
          <option value="smtp">Custom SMTP</option>
        </select>

        <input
          type="password"
          placeholder={
            editingEmail
              ? "New app password (optional)"
              : "App password"
          }
          className="border rounded p-2"
          value={form.appPassword}
          onChange={(e) =>
            setForm({ ...form, appPassword: e.target.value })
          }
        />
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={submitForm}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          {editingEmail ? "Update Mailbox" : "Add Mailbox"}
        </button>

        {editingEmail && (
          <button
            onClick={resetForm}
            className="text-gray-600 underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : mailboxes.length === 0 ? (
        <p className="text-gray-500">No support mailboxes added</p>
      ) : (
        <div className="space-y-3">
       {mailboxes.map((box) => {
  const mailType = (box.type || "gmail").toUpperCase();

  return (
    <div key={box.email}>
      <p>{box.email}</p>
      <p className="text-sm text-gray-500">{mailType}</p>
    </div>
  );
})}

        </div>
      )}
    </div>
  );
}
