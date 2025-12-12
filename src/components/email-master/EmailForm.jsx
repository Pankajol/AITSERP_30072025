"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

/**
 * Props:
 * - initial: object for edit (optional)
 * - onSaved(data): callback after save (optional)
 * - onCancel(): optional
 *
 * Uses local JWT from localStorage to fill companyId if missing.
 */
export default function EmailForm({ initial = {}, onSaved, onCancel }) {
  const router = useRouter();
  const [form, setForm] = useState({
    companyId: initial.companyId || "",
    email: initial.email || "",
    purpose: initial.purpose || "",
    service: initial.service || "gmail",
    recoveryEmail: initial.recoveryEmail || "",
    owner: initial.owner || "",
    appPassword: "",
    status: initial.status || "Active",
    notes: initial.notes || "",
    _id: initial._id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // if companyId missing, extract from token
    if (!form.companyId && typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = token.split(".")[1];
          const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
          const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
          const obj = JSON.parse(atob(padded));
          const cid = obj.companyId || obj.cid || obj.company || "";
          if (cid) setForm((f) => ({ ...f, companyId: cid }));
        } catch {
          // ignore decode errors
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    if (!form.companyId) return "companyId missing (token missing or invalid)";
    if (!form.email) return "Email is required";
    const re = /\S+@\S+\.\S+/;
    if (!re.test(form.email)) return "Invalid email";
    return null;
  };

  const submit = async (e) => {
    e?.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      toast.error(v);
      return;
    }
    // ensure token exists
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      toast.error("Unauthorized! Please log in.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (form._id) {
        await api.put("/email-masters", form);
      } else {
        await api.post("/email-masters", form);
      }
      // trigger global refresh
      window.dispatchEvent(new Event("emails:refresh"));
      onSaved && onSaved();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" value={form.companyId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input name="email" value={form.email} onChange={handle("email")} className="mt-1 w-full p-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Owner</label>
          <input name="owner" value={form.owner} onChange={handle("owner")} className="mt-1 w-full p-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Service</label>
          <select name="service" value={form.service} onChange={handle("service")} className="mt-1 w-full p-2 border rounded">
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700">Status</label>
          <select name="status" value={form.status} onChange={handle("status")} className="mt-1 w-full p-2 border rounded">
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700">Recovery Email</label>
          <input name="recoveryEmail" value={form.recoveryEmail} onChange={handle("recoveryEmail")} className="mt-1 w-full p-2 border rounded" />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Purpose</label>
          <input name="purpose" value={form.purpose} onChange={handle("purpose")} className="mt-1 w-full p-2 border rounded" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700">App Password (enter only to set/change)</label>
          <input name="appPassword" value={form.appPassword} onChange={handle("appPassword")} className="mt-1 w-full p-2 border rounded font-mono" autoComplete="new-password" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handle("notes")} className="mt-1 w-full p-2 border rounded" />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end gap-3 mt-4">
        <button type="button" onClick={() => onCancel ? onCancel() : router.push("/email-master")} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded">
          {saving ? "Saving..." : (form._id ? "Update" : "Save")}
        </button>
      </div>
    </form>
  );
}
