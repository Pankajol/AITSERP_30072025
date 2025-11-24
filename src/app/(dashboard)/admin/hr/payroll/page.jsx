"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/hr/PageHeader";

export default function PayrollPage() {
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [records, setRecords] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/hr/payroll?month=${month}`);
      const json = await res.json();
      setRecords(json.data || []);
    }
    load();
  }, [month]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle="Salary overview"
        actions={
          <input
            type="month"
            className="border px-2 py-1 rounded"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        }
      />

      <table className="w-full border bg-white rounded-xl">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left">Employee</th>
            <th className="px-4 py-2">Net Salary</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r._id} className="border-t">
              <td className="px-4 py-2">{r.employee?.fullName}</td>
              <td className="px-4 py-2">₹{r.netSalary}</td>
              <td className="px-4 py-2">{r.paidStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
