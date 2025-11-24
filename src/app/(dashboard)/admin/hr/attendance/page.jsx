"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState([]);
  const [userId, setUserId] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const isAdmin = roles.includes("Admin");
  const isHR = roles.includes("HR");
  const isManager = roles.includes("Manager");
  const isManagement = isAdmin || isHR || isManager; // ✅ shortcut

  /* ================ LOAD USER FROM TOKEN ================ */
  useEffect(() => {
    if (!token) return;

    const decoded = jwtDecode(token);
    setRoles(decoded.roles || []);
    setUserId(decoded.id);
  }, [token]);

  /* ================ FETCH EMPLOYEES (ADMIN / HR / MANAGER) ================ */
  async function fetchEmployees() {
    if (!isManagement) return;

    try {
      const res = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEmployees(res.data?.users || []);
    } catch (err) {
      console.error("Employee fetch error:", err);
    }
  }

  /* ================ FETCH ATTENDANCE ================ */
  async function fetchAttendance() {
    if (!token) return;

    try {
      setLoading(true);

      // Admin / HR / Manager → all employees; Employee → only self
      const url = isManagement
        ? `/api/hr/attendance?date=${date}`
        : `/api/hr/attendance/my?date=${date}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecords(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchAttendance();
      fetchEmployees();
    }
  }, [date, token, isManagement]);

  /* ================ SELECT EMPLOYEES (ADMIN UI) ================ */
  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map((e) => e._id));
  };

  const clearSelection = () => setSelectedEmployees([]);

  /* ================ GEOLOCATION HELPER ================ */
  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        alert("Location permission not supported in this browser");
        return reject(new Error("No geolocation"));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.error("Geo error:", err);
          alert("Location permission required for punch in/out");
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /* ================ BULK STATUS UPDATE (ADMIN / HR) ================ */
  async function bulkUpdate(status) {
    if (selectedEmployees.length === 0)
      return alert("Select employees first");

    try {
      await axios.patch(
        "/api/hr/attendance/bulk",
        { employees: selectedEmployees, date, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      clearSelection();
      fetchAttendance();
      alert("Updated successfully");
    } catch (err) {
      console.error(err);
      alert("Bulk update failed");
    }
  }

  /* ================ SELF PUNCH (ADMIN + EMPLOYEE DONO) ================ */
  async function punchIn() {
    try {
      const { latitude, longitude } = await getCurrentLocation();

      await axios.post(
        "/api/hr/attendance/punch-in",
        { date, latitude, longitude },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchAttendance();
    } catch (err) {
      // error already handled in getCurrentLocation or response
      if (err?.response?.data?.error) {
        alert(err.response.data.error);
      }
    }
  }

  async function punchOut() {
    try {
      const { latitude, longitude } = await getCurrentLocation();

      await axios.post(
        "/api/hr/attendance/punch-out",
        { date, latitude, longitude },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchAttendance();
    } catch (err) {
      if (err?.response?.data?.error) {
        alert(err.response.data.error);
      }
    }
  }

  const badge = (status) => {
    if (status === "Present") return "bg-green-100 text-green-700";
    if (status === "Absent") return "bg-red-100 text-red-700";
    if (status === "Half Day") return "bg-yellow-100 text-yellow-700";
    if (status === "Geo-Violation") return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Attendance Management</h1>
        <p className="text-sm text-gray-500">
          {isManagement ? "Admin / HR / Manager Panel" : "Employee Panel"}
        </p>
      </div>

      {/* DATE + REFRESH */}
      <div className="flex gap-2 bg-white p-4 rounded-lg shadow">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={fetchAttendance}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {/* SELF PUNCH (SAB KO DIKHEGA – ADMIN + HR + EMPLOYEE) */}
      <div className="bg-white p-4 rounded-lg shadow flex gap-3">
        <button
          onClick={punchIn}
          className="bg-blue-600 text-white px-5 py-2 rounded"
        >
          Punch In (GPS)
        </button>

        <button
          onClick={punchOut}
          className="bg-gray-900 text-white px-5 py-2 rounded"
        >
          Punch Out (GPS)
        </button>
      </div>

      {/* ADMIN CONTROLS – SIRF ADMIN / HR / MANAGER */}
      {isManagement && (
        <div className="bg-white p-4 rounded-lg shadow space-y-3">
          <h2 className="font-semibold">Bulk Attendance – Select Employees</h2>

          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {employees.map((emp) => (
              <label
                key={emp._id}
                className="flex items-center gap-2 border px-3 py-1 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(emp._id)}
                  onChange={() => toggleEmployee(emp._id)}
                />
                {emp.fullName} ({emp.email})
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={selectAllEmployees}
              className="border px-3 py-1 rounded"
            >
              Select All
            </button>

            <button
              onClick={clearSelection}
              className="border px-3 py-1 rounded"
            >
              Clear
            </button>

            <button
              onClick={() => bulkUpdate("Present")}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Mark Present
            </button>

            <button
              onClick={() => bulkUpdate("Half Day")}
              className="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              Mark Half Day
            </button>

            <button
              onClick={() => bulkUpdate("Absent")}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Mark Absent
            </button>
          </div>
        </div>
      )}

      {/* TABLE – COMMON FOR SAB */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">In</th>
              <th className="px-4 py-3">Out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400">
                  No records found
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {r.employeeId?.fullName || "You"}
                  </td>
                  <td className="px-4 py-2 text-center">{r.date}</td>
                  <td className="px-4 py-2 text-center">
                    {r.punchIn?.time || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {r.punchOut?.time || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {r.totalHours || 0}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${badge(
                        r.status
                      )}`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
