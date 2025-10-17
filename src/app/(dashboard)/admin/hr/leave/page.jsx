"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import { FaEdit, FaTrash } from "react-icons/fa";
import api from "@/lib/api"; // ✅ make sure you have your custom api instance (like axios.create)

export default function LeaveMaster() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    employee: "",
    description: "",
    startDate: "",
    endDate: "",
    maxDays: 0,
    status: "Active",
  });
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  /* ---------- Setup token once ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  /* ---------- Fetch Leaves ---------- */
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hr/leave");
      setLeaves(res.data.data || []);
    } catch (err) {
      console.error("Error fetching leaves:", err);
      toast.error("Failed to fetch leaves.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Fetch Employees ---------- */
const fetchEmployees = async () => {
  try {
    const res = await api.get("/company/users");

    const rawUsers = Array.isArray(res.data.data) ? res.data.data : res.data; // ✅ handle both shapes

    const employeeOptions = rawUsers
      .filter((u) => u.roles?.includes("Employee"))
      .map((emp) => ({
        value: emp._id,
        label: emp.name || `${emp.firstName} ${emp.lastName}` || "Unnamed",
      }));

    setEmployees(employeeOptions);
  } catch (err) {
    console.error("Error fetching employees:", err);
    toast.error("Failed to load employees.");
  } finally {
    setLoadingEmployees(false);
  }
};


  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  /* ---------- Auto Calculate Max Days ---------- */
  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      const diff = (end - start) / (1000 * 60 * 60 * 24);
      setForm((prev) => ({ ...prev, maxDays: diff >= 0 ? diff + 1 : 0 }));
    }
  }, [form.startDate, form.endDate]);

  /* ---------- Save / Update ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/hr/leave/${editId}`, form);
        toast.success("Leave updated successfully");
      } else {
        await api.post("/hr/leave", form);
        toast.success("Leave added successfully");
      }

      setForm({
        employee: "",
        description: "",
        startDate: "",
        endDate: "",
        maxDays: 0,
        status: "Active",
      });
      setEditId(null);
      setShowModal(false);
      fetchLeaves();
    } catch (err) {
      console.error("Error saving leave:", err);
      toast.error(err.response?.data?.message || "Error saving leave.");
    }
  };

  /* ---------- Edit ---------- */
  const handleEdit = (leave) => {
    setForm({
      employee: leave.employee?._id || "",
      description: leave.description,
      startDate: leave.startDate?.split("T")[0],
      endDate: leave.endDate?.split("T")[0],
      maxDays: leave.maxDays,
      status: leave.status,
    });
    setEditId(leave._id);
    setShowModal(true);
  };

  /* ---------- Delete ---------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this leave?")) return;
    try {
      await api.delete(`/hr/leave/${id}`);
      toast.success("Leave deleted");
      fetchLeaves();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete leave");
    }
  };

  /* ---------- Modal ---------- */
  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({
      employee: "",
      description: "",
      startDate: "",
      endDate: "",
      maxDays: 0,
      status: "Active",
    });
  };

  /* ---------- UI ---------- */
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Leave Master</h1>

      <button
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow"
        onClick={() => setShowModal(true)}
      >
        Add New Leave
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editId ? "Edit Leave" : "Add Leave"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="block font-semibold">Employee</label>
                <Select
                  options={employees}
                  isSearchable
                  isLoading={loadingEmployees}
                  value={
                    employees.find((e) => e.value === form.employee) || null
                  }
                  onChange={(selected) =>
                    setForm({ ...form, employee: selected?.value || "" })
                  }
                  placeholder="Select employee"
                />
              </div>

              <div className="mb-2">
                <label className="block font-semibold">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  placeholder="Enter description"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block font-semibold">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="w-full border p-2 rounded"
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="block font-semibold">Max Days</label>
                <input
                  type="number"
                  readOnly
                  value={form.maxDays}
                  className="w-full border p-2 rounded bg-gray-100"
                />
              </div>

              <div className="mb-2">
                <label className="block font-semibold">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  {editId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-400 text-white rounded"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2">#</th>
              <th className="p-2">Employee</th>
              <th className="p-2">Start Date</th>
              <th className="p-2">End Date</th>
              <th className="p-2">Max Days</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l, i) => (
              <tr key={l._id} className="border-t hover:bg-gray-50">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{l.employee?.name || "—"}</td>
                <td className="p-2">
                  {new Date(l.startDate).toLocaleDateString("en-GB")}
                </td>
                <td className="p-2">
                  {new Date(l.endDate).toLocaleDateString("en-GB")}
                </td>
                <td className="p-2">{l.maxDays}</td>
                <td className="p-2">{l.status}</td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(l)}
                    className="text-blue-600"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(l._id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
