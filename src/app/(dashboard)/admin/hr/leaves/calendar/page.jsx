"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from "@/components/hr/PageHeader";

export default function LeaveCalendarPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("/api/hr/leaves", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data.data || [];
        setEvents(data);
      });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Calendar"
        subtitle="Simple month view of leave ranges"
      />

      <div className="bg-white rounded-2xl border p-4 text-sm text-slate-700 space-y-2">
        {events.length === 0 ? (
          <p className="text-center text-slate-400">
            No records to show.
          </p>
        ) : (
          events.map((l) => (
            <div
              key={l._id}
              className="flex justify-between border-b last:border-0 py-2"
            >
              <span>
                {l.employeeId?.fullName || "Employee"} – {l.leaveType}
              </span>
              <span className="text-xs text-slate-500">
                {l.fromDate?.slice(0, 10)} → {l.toDate?.slice(0, 10)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
