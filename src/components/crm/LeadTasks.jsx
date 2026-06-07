"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaTasks, FaUser, FaCalendarAlt, FaCheckCircle, FaClock, FaTrash, FaEdit } from "react-icons/fa";
import Select from "react-select";
import { toast } from "react-toastify";

export default function LeadTasks({ leadId, leadName, onTaskUpdate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignees: [],
    dueDate: "",
    reminderAt: "",
    priority: "medium",
    status: "todo",
  });

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/tasks?relatedModel=Lead&relatedId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
      if (onTaskUpdate) onTaskUpdate(res.data.length);
    } catch (err) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.filter((u) => u.roles?.includes("Employee")));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [leadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        relatedTo: { model: "Lead", id: leadId },
      };
      if (editingTask) {
        await axios.put(`/api/tasks/${editingTask._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Task updated");
      } else {
        await axios.post("/api/tasks", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Task created");
      }
      setShowForm(false);
      setEditingTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save task");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignees: [],
      dueDate: "",
      reminderAt: "",
      priority: "medium",
      status: "todo",
    });
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assignees: task.assignees?.map((a) => a._id || a) || [],
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      reminderAt: task.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : "",
      priority: task.priority,
      status: task.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Task deleted");
      fetchTasks();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/tasks/${taskId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
      toast.success("Status updated");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const getPriorityColor = (p) => {
    if (p === "high") return "text-red-600 bg-red-50";
    if (p === "medium") return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  const getStatusIcon = (status) => {
    if (status === "done") return <FaCheckCircle className="text-green-500" />;
    if (status === "in-progress") return <FaClock className="text-blue-500" />;
    return <FaTasks className="text-gray-400" />;
  };

  if (loading) return <div className="p-4 text-center text-gray-400">Loading tasks...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FaTasks className="text-indigo-500" /> Tasks & Follow-ups
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{tasks.length}</span>
        </h3>
        <button
          onClick={() => {
            setEditingTask(null);
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          <FaPlus size={12} /> Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No tasks for this lead. Click "Add Task" to create one.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task._id} className="border border-gray-100 rounded-lg p-3 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusIcon(task.status)}
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.status === "done" && task.completedAt && (
                      <span className="text-[10px] text-green-500">Completed {new Date(task.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt /> Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignees?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <FaUser /> {task.assignees.map((a) => a.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-gray-50"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <button onClick={() => handleEdit(task)} className="text-blue-500 hover:text-blue-700 p-1">
                    <FaEdit size={14} />
                  </button>
                  <button onClick={() => handleDelete(task._id)} className="text-red-500 hover:text-red-700 p-1">
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit Task */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold">{editingTask ? "Edit Task" : "New Task"} for {leadName}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows="3"
                  className="w-full border rounded-lg p-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reminder At</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded-lg p-2"
                    value={formData.reminderAt}
                    onChange={(e) => setFormData({ ...formData, reminderAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assignees</label>
                <Select
                  isMulti
                  options={users.map((u) => ({ value: u._id, label: u.name }))}
                  value={formData.assignees.map((id) => ({ value: id, label: users.find((u) => u._id === id)?.name || id }))}
                  onChange={(selected) => setFormData({ ...formData, assignees: selected.map((s) => s.value) })}
                  className="text-sm"
                  placeholder="Select team members..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {editingTask ? "Update" : "Create"} Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}