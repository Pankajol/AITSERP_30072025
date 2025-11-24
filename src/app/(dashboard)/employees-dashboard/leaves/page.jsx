"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import PageHeader from "@/components/hr/PageHeader";
import Link from "next/link";

export default function LeavesPage() {
  const [role, setRole] = useState("Employee");
  const [myLeaves, setMyLeaves] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my");
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fromDate: "",
    toDate: "",
    leaveType: "Casual",
    reason: "",
    attachmentUrl: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Decode role from token
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role || "Employee");
      } catch (e) {
        console.error(e);
      }
    }
  }, [token]);

  const isManager = ["Admin", "HR", "Manager"].includes(role);

  // Load data
  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);

      const headers = { Authorization: `Bearer ${token}` };

      const promises = [
        axios.get("/api/hr/leaves/my", { headers }),
        axios.get("/api/hr/leaves/balance", { headers }),
      ];

      if (isManager) {
        promises.push(axios.get("/api/hr/leaves", { headers }));
        promises.push(axios.get("/api/hr/leaves/analytics", { headers }));
      }

      const [myRes, balRes, teamRes, analyticsRes] = await Promise.allSettled(promises);

      if (myRes.status === "fulfilled") setMyLeaves(myRes.value.data.data || []);
      if (balRes.status === "fulfilled") setBalance(balRes.value.data.data || null);

      if (isManager && teamRes?.status === "fulfilled") {
        setTeamLeaves(teamRes.value.data.data || []);
      }

      if (isManager && analyticsRes?.status === "fulfilled") {
        setAnalytics(analyticsRes.value.data || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const list = tab === "my" ? myLeaves : teamLeaves;

  const getBadge = (status) => {
    if (status === "Approved") return "bg-green-100 text-green-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  async function handleApply() {
    if (!form.fromDate || !form.toDate || !form.reason) {
      return alert("All fields are required");
    }

    try {
      setSubmitting(true);

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      await axios.post("/api/hr/leaves", form, { headers });

      setForm({
        fromDate: "",
        toDate: "",
        leaveType: "Casual",
        reason: "",
        attachmentUrl: "",
      });
      setOpenForm(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to apply leave");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      await axios.patch(
        `/api/hr/leaves/${id}/status`,
        { status },
        { headers }
      );
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle={
          role === "Employee"
            ? "View your leaves, balance and apply easily."
            : "Manage team leaves, approvals & insights."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/hr/leaves/calendar"
              className="rounded-lg border px-3 py-2 text-xs md:text-sm"
            >
              📅 Calendar
            </Link>

            <button
              onClick={() => setOpenForm(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs md:text-sm font-medium text-white shadow hover:bg-indigo-700"
            >
              ＋ Apply Leave
            </button>
          </div>
        }
      />

      {/* Top cards: Balance & AI analytics (for manager) */}
      <div className="grid gap-3 md:grid-cols-3">
        {balance && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2">
            <div className="text-xs font-semibold text-slate-500">
              My Leave Balance
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span>Casual: {balance.casual}</span>
              <span>Sick: {balance.sick}</span>
              <span>Paid: {balance.paid}</span>
              <span>Unpaid: {balance.unpaid}</span>
            </div>
          </div>
        )}

        {isManager && analytics && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-2 md:col-span-2">
            <div className="text-xs font-semibold text-slate-500">
              AI-style Insights ({analytics.year})
            </div>
            <p className="text-xs text-slate-600">
              Predicted leave days next month:{" "}
              <span className="font-semibold">
                {analytics.predictedNextMonthDays}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-1.5 rounded-full text-xs md:text-sm ${
            tab === "my"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          My Leaves
        </button>
        {isManager && (
          <button
            onClick={() => setTab("team")}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm ${
              tab === "team"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Team Leaves
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {tab === "team" && (
                <th className="px-4 py-3 text-left font-semibold">
                  Employee
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">
                Attachment
              </th>
              {isManager && tab === "team" && (
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={tab === "team" ? 6 : 5}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Loading...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td
                  colSpan={tab === "team" ? 6 : 5}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No leave records
                </td>
              </tr>
            ) : (
              list.map((item) => (
                <tr
                  key={item._id}
                  className="border-b last:border-0 hover:bg-slate-50"
                >
                  {tab === "team" && (
                    <td className="px-4 py-3">
                      {item.employeeId?.fullName || "-"}
                    </td>
                  )}

                  <td className="px-4 py-3 text-slate-600">
                    {item.fromDate?.slice(0, 10)} →{" "}
                    {item.toDate?.slice(0, 10)}
                  </td>

                  <td className="px-4 py-3">{item.leaveType}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] ${getBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {item.attachmentUrl ? (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        className="text-blue-600 underline text-[11px]"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        None
                      </span>
                    )}
                  </td>

                  {isManager && tab === "team" && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() =>
                          handleStatusChange(item._id, "Approved")
                        }
                        className="bg-green-100 hover:bg-green-200 px-2 py-1 rounded-md text-[11px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(item._id, "Rejected")
                        }
                        className="bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md text-[11px]"
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Modal */}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Apply for Leave
              </h2>
              <button
                onClick={() => setOpenForm(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500">
                  From Date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                  value={form.fromDate}
                  onChange={(e) =>
                    setForm({ ...form, fromDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">To Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                  value={form.toDate}
                  onChange={(e) =>
                    setForm({ ...form, toDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-500">
                Leave Type
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs bg-white"
                value={form.leaveType}
                onChange={(e) =>
                  setForm({ ...form, leaveType: e.target.value })
                }
              >
                <option>Casual</option>
                <option>Sick</option>
                <option>Paid</option>
                <option>Unpaid</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Reason</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">
                Attachment URL (optional)
              </label>
              <input
                type="text"
                placeholder="Paste Google Drive / image / PDF URL"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
                value={form.attachmentUrl}
                onChange={(e) =>
                  setForm({ ...form, attachmentUrl: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setOpenForm(false)}
                className="rounded-lg border px-4 py-2 text-xs md:text-sm"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleApply}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs md:text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
