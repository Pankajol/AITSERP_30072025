"use client";

import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function AdminAttendanceDashboard() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [search, setSearch] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("all");

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const perPage = 12;

  const [events, setEvents] = useState([]);

  // ----- FETCH EMPLOYEES -------
  useEffect(() => {
    fetchEmployees();
    fetchReport();
  }, []);

  async function fetchEmployees() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEmployees(data.users || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  }

  // ----- FETCH REPORT -------
  async function fetchReport() {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const url = new URL("/api/hr/attendance/report", location.origin);

      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);
      if (employeeIdFilter !== "all")
        url.searchParams.set("employeeId", employeeIdFilter);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to fetch report");
        setRows([]);
      } else {
        let report = data.report || [];

        if (search.trim()) {
          const s = search.toLowerCase();
          report = report.filter((r) =>
            JSON.stringify(r).toLowerCase().includes(s)
          );
        }

        setRows(report);
        setEvents(
          report.map((r) => ({
            date: r.date,
            status: r.status,
            totalHours: r.totalHours,
          }))
        );

        setPage(1);
      }
    } catch (err) {
      setError("Server error while fetching report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // ----- EDIT -----
  async function handleEdit(row) {
    const newHours = prompt("Enter new total hours:", row.totalHours);
    if (!newHours) return;

    const token = localStorage.getItem("token");

    await fetch("/api/hr/attendance/edit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: row._id, updates: { totalHours: newHours } }),
    });

    fetchReport();
  }

  // ----- DELETE -----
  async function handleDelete(id) {
    if (!confirm("Delete this attendance entry?")) return;

    const token = localStorage.getItem("token");

    await fetch(`/api/hr/attendance/delete?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchReport();
  }

  // pagination
  const start = (page - 1) * perPage;
  const paginated = rows.slice(start, start + perPage);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));

  function renderGeofence(statusIn, statusOut) {
    const isInside =
      statusIn?.withinGeofence !== false &&
      statusOut?.withinGeofence !== false;

    return (
      <span
        className={`px-2 py-1 text-xs rounded ${
          isInside
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {isInside ? "Inside Zone" : "Out of Zone"}
      </span>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER + PRESETS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Attendance Dashboard</h2>
          <p className="text-sm text-gray-500">
            Monitor and manage employee attendance
          </p>
        </div>

        <div className="flex gap-2 mt-3 sm:mt-0">
          <button
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              setFrom(today);
              setTo(today);
            }}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            Today
          </button>

          <button
            onClick={() => {
              const d = new Date();
              const start = new Date(d.setDate(d.getDate() - d.getDay() + 1))
                .toISOString()
                .slice(0, 10);
              const end = new Date(d.setDate(d.getDate() + 5))
                .toISOString()
                .slice(0, 10);
              setFrom(start);
              setTo(end);
            }}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            This Week
          </button>

          <button
            onClick={() => {
              const d = new Date();
              const start = new Date(d.getFullYear(), d.getMonth(), 1)
                .toISOString()
                .slice(0, 10);
              const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
                .toISOString()
                .slice(0, 10);
              setFrom(start);
              setTo(end);
            }}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            This Month
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs">From</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs">To</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs mb-1">Employee</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={employeeIdFilter}
              onChange={(e) => setEmployeeIdFilter(e.target.value)}
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6 flex justify-end gap-2">
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR + TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">Monthly Calendar</h3>
          <Calendar
            tileContent={({ date }) => {
              const d = date.toISOString().slice(0, 10);
              const ev = events.find((e) => e.date === d);
              if (!ev) return null;

              return (
                <div
                  className={`mt-1 text-xs text-center rounded ${
                    ev.status === "Present"
                      ? "bg-green-200"
                      : ev.status === "Geo-Violation"
                      ? "bg-red-200"
                      : "bg-gray-200"
                  }`}
                >
                  {ev.totalHours}
                </div>
              );
            }}
            onClickDay={(d) => {
              const day = d.toISOString().slice(0, 10);
              setFrom(day);
              setTo(day);
              fetchReport();
            }}
          />
        </div>

        {/* TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Punch In</th>
                  <th className="px-4 py-3">Punch Out</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      {loading ? "Loading..." : "No records found"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => (
                    <tr key={r._id} className="border-b">
                      <td className="px-4 py-3">{r.date}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{r.employeeName}</div>
                        <div className="text-xs text-gray-500">
                          {r.employee?.designation}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.punchIn?.time || "—"}
                        <br />
                        <span className="text-xs text-gray-500">
                          {r.punchIn?.latitude}, {r.punchIn?.longitude}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {r.punchOut?.time || "—"}
                        <br />
                        <span className="text-xs text-gray-500">
                          {r.punchOut?.latitude}, {r.punchOut?.longitude}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {r.totalHours}
                      </td>

                      <td className="px-4 py-3">
                        {renderGeofence(r.punchIn, r.punchOut)}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-blue-600 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="text-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between mt-4 text-sm">
            <span>
              Showing {start + 1} -{" "}
              {Math.min(start + perPage, rows.length)} of {rows.length}
            </span>

            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </button>

              <span className="px-3 py-1 border rounded">
                {page} / {totalPages}
              </span>

              <button
                className="px-3 py-1 border rounded"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 mt-4">{error}</div>}
    </div>
  );
}



// "use client";

// import React, { useEffect, useState } from "react";

// /**
//  * Admin Attendance Dashboard
//  *
//  * Expects backend API:
//  *  GET /api/hr/attendance/report?from=YYYY-MM-DD&to=YYYY-MM-DD
//  *  - uses authenticated JWT in Authorization header
//  *
//  * If you want to fetch all employees (admin scenario), backend should return
//  * attendance rows for the requesting company (decoded.companyId) and optionally
//  * allow employeeId query param to filter by employee.
//  */

// export default function AdminAttendanceDashboard() {
//   // filters / UI state
//   const [from, setFrom] = useState(() => {
//     const d = new Date();
//     d.setDate(1); // default to 1st of current month
//     return d.toISOString().slice(0, 10);
//   });
//   const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
//   const [search, setSearch] = useState("");
//   const [employeeIdFilter, setEmployeeIdFilter] = useState("");
//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // pagination
//   const [page, setPage] = useState(1);
//   const perPage = 12;

//   // stats
//   const [stats, setStats] = useState({ days: 0, totalHours: 0 });

//   useEffect(() => {
//     fetchReport();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   async function fetchReport() {
//     setLoading(true);
//     setError(null);

//     try {
//       const token = localStorage.getItem("token");
//       const url = new URL("/api/hr/attendance/report", location.origin);
//       if (from) url.searchParams.set("from", from);
//       if (to) url.searchParams.set("to", to);
//       if (employeeIdFilter) url.searchParams.set("employeeId", employeeIdFilter);

//       const res = await fetch(url.toString(), {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const data = await res.json();
//       if (!res.ok || !data.success) {
//         setError(data.message || "Failed to fetch report");
//         setRows([]);
//       } else {
//         // data.report is expected to be an array of attendance documents
//         // allow local search by employee name/id if backend returns employee info
//         let report = data.report || [];

//         if (search.trim()) {
//           const s = search.toLowerCase();
//           report = report.filter((r) => {
//             // possible fields: r.employeeName, r.employeeId, r.date
//             // fallback: stringify
//             const str =
//               (r.employeeName || "") +
//               " " +
//               (r.employeeId || "") +
//               " " +
//               (r.date || "");
//             return str.toLowerCase().includes(s);
//           });
//         }

//         setRows(report);
//         computeStats(report);
//         setPage(1);
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Server error while fetching report");
//       setRows([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function computeStats(report) {
//     const days = report.length;
//     const totalHours = report.reduce((acc, r) => {
//       const h = Number(r.totalHours) || 0;
//       return acc + h;
//     }, 0);
//     setStats({ days, totalHours: totalHours.toFixed(2) });
//   }

//   // client-side pagination slice
//   const start = (page - 1) * perPage;
//   const paginated = rows.slice(start, start + perPage);
//   const totalPages = Math.max(1, Math.ceil(rows.length / perPage));

//   function downloadCSV() {
//     if (!rows.length) return alert("No data to export");
//     const headers = [
//       "date",
//       "employeeId",
//       "employeeName",
//       "punchInTime",
//       "punchInLat",
//       "punchInLng",
//       "punchOutTime",
//       "punchOutLat",
//       "punchOutLng",
//       "totalHours",
//     ];
//     const csvRows = [headers.join(",")];

//     rows.forEach((r) => {
//       const values = [
//         r.date || "",
//         r.employeeId || r.employee?._id || "",
//         (r.employeeName || r.employee?.name) || "",
//         r.punchIn?.time || "",
//         r.punchIn?.latitude ?? "",
//         r.punchIn?.longitude ?? "",
//         r.punchOut?.time || "",
//         r.punchOut?.latitude ?? "",
//         r.punchOut?.longitude ?? "",
//         r.totalHours ?? "",
//       ];
//       csvRows.push(
//         values
//           .map((v) =>
//             typeof v === "string" && v.includes(",") ? `"${v.replace(/"/g, '""')}"` : v
//           )
//           .join(",")
//       );
//     });

//     const csv = csvRows.join("\n");
//     const blob = new Blob([csv], { type: "text/csv" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = `attendance_report_${from || "all"}_${to || "all"}.csv`;
//     link.click();
//     URL.revokeObjectURL(link.href);
//   }

//   // quick jump presets
//   function applyPreset(range) {
//     const now = new Date();
//     if (range === "month") {
//       const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
//       const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
//       setFrom(start);
//       setTo(end);
//     } else if (range === "week") {
//       const day = now.getDay();
//       const start = new Date(now);
//       start.setDate(now.getDate() - day + 1); // monday
//       const end = new Date(start);
//       end.setDate(start.getDate() + 6);
//       setFrom(start.toISOString().slice(0, 10));
//       setTo(end.toISOString().slice(0, 10));
//     } else if (range === "today") {
//       const d = now.toISOString().slice(0, 10);
//       setFrom(d);
//       setTo(d);
//     }
//   }

//   return (
//     <div className="p-6 max-w-7xl mx-auto">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//         <div>
//           <h2 className="text-2xl font-semibold">Attendance Report</h2>
//           <p className="text-sm text-gray-500">Filter, view and export attendance data</p>
//         </div>

//         <div className="flex gap-2">
//           <button
//             onClick={() => applyPreset("today")}
//             className="px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
//           >
//             Today
//           </button>
//           <button
//             onClick={() => applyPreset("week")}
//             className="px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
//           >
//             This Week
//           </button>
//           <button
//             onClick={() => applyPreset("month")}
//             className="px-3 py-2 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
//           >
//             This Month
//           </button>
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="bg-white rounded-lg shadow p-4 mb-6">
//         <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
//           <div className="sm:col-span-2">
//             <label className="block text-xs text-gray-600 mb-1">From</label>
//             <input
//               type="date"
//               className="w-full border rounded px-3 py-2"
//               value={from}
//               onChange={(e) => setFrom(e.target.value)}
//             />
//           </div>

//           <div className="sm:col-span-2">
//             <label className="block text-xs text-gray-600 mb-1">To</label>
//             <input
//               type="date"
//               className="w-full border rounded px-3 py-2"
//               value={to}
//               onChange={(e) => setTo(e.target.value)}
//             />
//           </div>

//           <div className="sm:col-span-1">
//             <label className="block text-xs text-gray-600 mb-1">Employee ID</label>
//             <input
//               type="text"
//               placeholder="Employee ID"
//               className="w-full border rounded px-3 py-2"
//               value={employeeIdFilter}
//               onChange={(e) => setEmployeeIdFilter(e.target.value)}
//             />
//           </div>

//           <div className="sm:col-span-1">
//             <label className="block text-xs text-gray-600 mb-1">Search</label>
//             <input
//               type="text"
//               placeholder="Name / ID / Date"
//               className="w-full border rounded px-3 py-2"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//           </div>

//           <div className="sm:col-span-6 flex gap-2 justify-end mt-1">
//             <button
//               onClick={fetchReport}
//               className="px-4 py-2 bg-indigo-600 text-white rounded shadow-sm"
//               disabled={loading}
//             >
//               {loading ? "Loading..." : "Apply"}
//             </button>

//             <button
//               onClick={downloadCSV}
//               className="px-4 py-2 bg-gray-800 text-white rounded shadow-sm"
//             >
//               Export CSV
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="flex gap-4 mb-4">
//         <div className="bg-white p-4 rounded-lg shadow flex-1">
//           <div className="text-sm text-gray-500">Total rows</div>
//           <div className="text-xl font-semibold">{rows.length}</div>
//         </div>
//         <div className="bg-white p-4 rounded-lg shadow w-48">
//           <div className="text-sm text-gray-500">Days in range</div>
//           <div className="text-xl font-semibold">{stats.days}</div>
//           <div className="text-xs text-gray-400 mt-1">Total Hours: {stats.totalHours}</div>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-lg shadow overflow-x-auto">
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="px-4 py-3 text-left">Date</th>
//               <th className="px-4 py-3 text-left">Employee</th>
//               <th className="px-4 py-3 text-left">Punch In</th>
//               <th className="px-4 py-3 text-left">Punch Out</th>
//               <th className="px-4 py-3 text-left">Total Hours</th>
//               <th className="px-4 py-3 text-left">Location (In / Out)</th>
//             </tr>
//           </thead>

//           <tbody>
//             {paginated.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
//                   {loading ? "Loading..." : "No attendance found for this range"}
//                 </td>
//               </tr>
//             ) : (
//               paginated.map((r, idx) => (
//                 <tr key={r._id || `${r.employeeId}_${r.date}_${idx}`} className="border-b">
//                   <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>
//                   <td className="px-4 py-3 whitespace-nowrap">
//                     <div className="font-medium">{r.employeeName || r.employee?.name || r.employeeId}</div>
//                     <div className="text-xs text-gray-500">{r.employee?.department || ""}</div>
//                   </td>
//                   <td className="px-4 py-3 whitespace-nowrap">
//                     <div>{r.punchIn?.time || "—"}</div>
//                     <div className="text-xs text-gray-400">{r.punchIn?.latitude || ""}, {r.punchIn?.longitude || ""}</div>
//                   </td>
//                   <td className="px-4 py-3 whitespace-nowrap">
//                     <div>{r.punchOut?.time || "—"}</div>
//                     <div className="text-xs text-gray-400">{r.punchOut?.latitude || ""}, {r.punchOut?.longitude || ""}</div>
//                   </td>
//                   <td className="px-4 py-3 whitespace-nowrap">{r.totalHours ?? "0.00"}</td>
//                   <td className="px-4 py-3 whitespace-nowrap">
//                     <div className="text-xs text-gray-500">
//                       In: {r.punchIn ? `${r.punchIn.latitude}, ${r.punchIn.longitude}` : "—"}
//                     </div>
//                     <div className="text-xs text-gray-500 mt-1">
//                       Out: {r.punchOut ? `${r.punchOut.latitude}, ${r.punchOut.longitude}` : "—"}
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-between mt-4">
//         <div className="text-sm text-gray-600">Showing {start + 1} - {Math.min(start + perPage, rows.length)} of {rows.length}</div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setPage((p) => Math.max(1, p - 1))}
//             className="px-3 py-1 border rounded disabled:opacity-50"
//             disabled={page <= 1}
//           >
//             Prev
//           </button>
//           <div className="px-3 py-1 border rounded">
//             {page} / {totalPages}
//           </div>
//           <button
//             onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//             className="px-3 py-1 border rounded disabled:opacity-50"
//             disabled={page >= totalPages}
//           >
//             Next
//           </button>
//         </div>
//       </div>

//       {error && <div className="mt-4 text-red-600">{error}</div>}
//     </div>
//   );
// }
