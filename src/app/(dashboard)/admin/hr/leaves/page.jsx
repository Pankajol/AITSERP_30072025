"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/hr/leaves", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setLeaves(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
  const reason = prompt("Enter rejection reason:");

  if (!reason) return;

  updateStatus(id, "Rejected", reason);
};
const updateStatus = async (id, status, reason = "") => {
  try {
    const token = localStorage.getItem("token");

    await axios.patch(
      `/api/hr/leaves/${id}`,
      { status, reason },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    fetchLeaves();
  } catch (err) {
    alert("Failed to update status");
  }
};

  const StatusBadge = ({ status }) => {
    if (status === "Approved")
      return <span className="text-green-600 font-bold">Approved</span>;
    if (status === "Rejected")
      return <span className="text-red-600 font-bold">Rejected</span>;
    return <span className="text-yellow-600 font-bold">Pending</span>;
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-6">
        Leave Management (Admin)
      </h1>

      {/* TABLE */}
      <div className="bg-white shadow rounded-xl overflow-hidden">

        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : (
          <table className="w-full text-sm">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Dates</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {leaves.map((leave) => (
                <tr key={leave._id} className="border-t">

                  {/* EMPLOYEE */}
                  <td className="p-3">
                    <div className="font-semibold">
                      {leave.employeeId?.fullName}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {leave.employeeId?.email}
                    </div>
                  </td>

                  {/* DATES */}
                  <td className="p-3">
                    {new Date(leave.fromDate).toLocaleDateString()} <br />
                    <span className="text-gray-400 text-xs">
                      to {new Date(leave.toDate).toLocaleDateString()}
                    </span>
                  </td>

                  {/* TYPE */}
                  <td className="p-3">{leave.leaveType}</td>

                  {/* REASON */}
                  <td className="p-3 max-w-xs truncate">
                    {leave.reason}
                  </td>

                  {/* STATUS */}
                  <td className="p-3">
                    <StatusBadge status={leave.status} />
                  </td>

                  {/* ACTION */}
                  <td className="p-3 flex gap-2">

                    {leave.status === "Pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateStatus(leave._id, "Approved")
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Approve
                        </button>

                        <button
                           onClick={() => handleReject(leave._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>
    </div>
  );
}