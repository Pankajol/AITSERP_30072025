"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

/**
 * Props:
 * - onEdit(item) optional callback when user clicks Edit (page wrapper handles modal)
 */
export default function EmailList({ onEdit }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unmaskCache, setUnmaskCache] = useState({});

  // decode companyId from token
  const getCompanyId = () => {
    try {
      if (typeof window === "undefined") return "";
      const token = localStorage.getItem("token");
      if (!token) return "";
      const payload = token.split(".")[1];
      const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const obj = JSON.parse(atob(padded));
      return obj.companyId || obj.cid || obj.company || "";
    } catch {
      return "";
    }
  };

  const companyId = getCompanyId();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setError("Unauthorized: token missing");
        toast.error("Unauthorized! Please log in.");
        setLoading(false);
        return;
      }
      if (!companyId) {
        setError("companyId missing in token");
        toast.error("companyId missing");
        setLoading(false);
        return;
      }

      const params = { companyId };
      if (q) params.search = q;

      const res = await api.get("/email-masters", { params });
      setItems(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Fetch failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [companyId, q]);

  useEffect(() => {
    // refresh on global event
    const onRefresh = () => fetchItems();
    window.addEventListener("emails:refresh", onRefresh);
    fetchItems();
    return () => window.removeEventListener("emails:refresh", onRefresh);
  }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    try {
      if (!companyId) {
        toast.error("companyId missing");
        return;
      }
      await api.delete("/email-masters", { params: { id, companyId } });
      setItems((p) => p.filter((it) => it._id !== id));
      toast.success("Deleted");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Delete failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleUnmask = async (id) => {
    try {
      if (!companyId) {
        toast.error("companyId missing");
        return;
      }
      if (unmaskCache[id]) {
        setUnmaskCache((p) => {
          const cp = { ...p };
          delete cp[id];
          return cp;
        });
        return;
      }
      const res = await api.patch("/email-masters", null, { params: { op: "unmask", id, companyId } });
      if (res?.data?.password !== undefined) {
        setUnmaskCache((p) => ({ ...p, [id]: res.data.password }));
        toast.success("Password revealed (auto-hide in 15s)");
        setTimeout(() => {
          setUnmaskCache((p) => {
            const cp = { ...p };
            delete cp[id];
            return cp;
          });
        }, 15000);
      } else {
        toast.error("Unmask failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Unmask failed";
      toast.error(msg);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input placeholder="Search email / purpose / owner" value={q} onChange={(e) => setQ(e.target.value)} className="border p-2 rounded flex-1" />
        <button onClick={fetchItems} className="px-4 py-2 bg-gray-800 text-white rounded">Search</button>
        <button onClick={() => router.push("/email-masters/add")} className="px-4 py-2 bg-indigo-600 text-white rounded">Add New</button>
      </div>

      {loading ? <div className="p-6 text-center">Loading...</div> : null}
      {error ? <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div> : null}

      {!loading && !error && (
        <div className="overflow-auto bg-white rounded shadow">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Owner</th>
                <th className="p-2 text-left">Purpose</th>
                <th className="p-2 text-left">Service</th>
                <th className="p-2 text-left">App Password</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td className="p-4" colSpan={7}>No entries found.</td></tr>}
              {items.map((it) => (
                <tr key={it._id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{it.email}</td>
                  <td className="p-2">{it.owner || "—"}</td>
                  <td className="p-2">{it.purpose || "—"}</td>
                  <td className="p-2">{it.service}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{unmaskCache[it._id] ? unmaskCache[it._id] : (it.maskedAppPassword || "—")}</code>
                      <button onClick={() => handleUnmask(it._id)} className="text-sm text-indigo-600 hover:underline">{unmaskCache[it._id] ? "Hide" : "Unmask"}</button>
                    </div>
                  </td>
                  <td className="p-2">{it.status}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit ? onEdit(it) : router.push(`/email-masters/${it._id}/edit`)} className="text-indigo-600">Edit</button>
                      <button onClick={() => handleDelete(it._id)} className="text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
