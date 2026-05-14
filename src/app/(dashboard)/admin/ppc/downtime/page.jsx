"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Edit, Trash2, Save } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const stopReasons = [
  "Excessive machine set up time",
  "Unplanned machine maintenance",
  "On-machine press checks",
  "Machine operator errors",
  "Machine malfunction",
  "Electricity down",
  "Other",
];

export default function DowntimePage() {
  const [downtimes, setDowntimes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    machine: "",
    operator: "",
    fromTime: "",
    toTime: "",
    stopReason: "",
    remarks: "",
  });

  // ✅ Fetch initial data
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try {
      const [downtimeRes, machineRes, operatorRes] = await Promise.all([
        axios.get("/api/ppc/downtime"),
        axios.get("/api/ppc/machines"),
        axios.get("/api/ppc/operators"),
      ]);
      setDowntimes(downtimeRes.data.data || []);
      setMachines(machineRes.data.data || []);
      setOperators(operatorRes.data.data || []);
    } catch (err) {
      toast.error("Failed to load data");
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({
      machine: "",
      operator: "",
      fromTime: "",
      toTime: "",
      stopReason: "",
      remarks: "",
    });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await axios.put(`/api/ppc/downtime/${editing}`, form);
        if (res.data.success) toast.success("Downtime updated");
      } else {
        const res = await axios.post("/api/ppc/downtime", form);
        if (res.data.success) toast.success("Downtime added");
      }
      resetForm();
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error("Error saving downtime");
    }
  };

  const handleEdit = (item) => {
    setForm({
      machine: item.machine?._id || "",
      operator: item.operator?._id || "",
      fromTime: item.fromTime?.slice(0, 16) || "",
      toTime: item.toTime?.slice(0, 16) || "",
      stopReason: item.stopReason,
      remarks: item.remarks,
    });
    setEditing(item._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this downtime entry?")) return;
    try {
      const res = await axios.delete(`/api/ppc/downtime/${id}`);
      if (res.data.success) {
        toast.success("Deleted successfully");
        fetchAll();
      }
    } catch {
      toast.error("Error deleting downtime");
    }
  };

  const calcDuration = (fromTime, toTime) => {
    const diff = new Date(toTime) - new Date(fromTime);
    return diff > 0 ? Math.round(diff / 60000) : 0;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Downtime Entry</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
        >
          <Plus size={18} /> Add Downtime
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full border">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="p-3 border">Machine</th>
              <th className="p-3 border">Operator</th>
              <th className="p-3 border">From</th>
              <th className="p-3 border">To</th>
              <th className="p-3 border">Duration (min)</th>
              <th className="p-3 border">Reason</th>
              <th className="p-3 border">Remarks</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {downtimes.map((d) => (
              <tr key={d._id} className="text-sm border-t">
                <td className="p-2 border">{d.machine?.name}</td>
                <td className="p-2 border">{d.operator?.name}</td>
                <td className="p-2 border">{new Date(d.fromTime).toLocaleString()}</td>
                <td className="p-2 border">{new Date(d.toTime).toLocaleString()}</td>
                <td className="p-2 border text-center">
                  {calcDuration(d.fromTime, d.toTime)}
                </td>
                <td className="p-2 border">{d.stopReason}</td>
                <td className="p-2 border">{d.remarks}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => handleEdit(d)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {downtimes.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center p-4 text-gray-500">
                  No downtime entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative">
            <h3 className="text-xl font-semibold mb-4">
              {editing ? "Edit Downtime" : "Add Downtime"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Machine *</label>
                  <select
                    name="machine"
                    value={form.machine}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Machine</option>
                    {machines.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Operator *</label>
                  <select
                    name="operator"
                    value={form.operator}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Operator</option>
                    {operators.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">From Time *</label>
                  <input
                    type="datetime-local"
                    name="fromTime"
                    value={form.fromTime}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">To Time *</label>
                  <input
                    type="datetime-local"
                    name="toTime"
                    value={form.toTime}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Stop Reason *</label>
                  <select
                    name="stopReason"
                    value={form.stopReason}
                    onChange={handleChange}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Reason</option>
                    {stopReasons.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    className="w-full border p-2 rounded h-20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
                >
                  <Save size={16} /> {editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
