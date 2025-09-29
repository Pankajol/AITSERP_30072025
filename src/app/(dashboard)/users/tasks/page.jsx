


"use client";

import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import Select from "react-select";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // modals
  const [modalOpen, setModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);

  // edit state
  const [editTask, setEditTask] = useState(null);
  const [editSubtask, setEditSubtask] = useState(null);

  // expanded task for subtasks
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // dropdown menu state
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // const [projectId, setProjectId] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [projectedStartDate, setProjectedStartDate] = useState("");
  const [projectedEndDate, setProjectedEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [progress, setProgress] = useState("");

  // subtask form
  const [subTitle, setSubTitle] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subAssignees, setSubAssignees] = useState([]);
  const [startDateData, setStartDateData] = useState("");
  const [endDateData, setEndDateData] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subPriority, setSubPriority] = useState("medium");
  const [subStatus, setSubStatus] = useState("todo");
  const [subProgress, setSubProgress] = useState("");

  // fetch data
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [tRes,  uRes] = await Promise.all([
        api.get("project/tasks", { headers }),
        // api.get("/project/projects", { headers }),
        api.get("/company/users", { headers }),
      ]);

      setTasks(tRes.data);
      console.log("tasks",tRes.data);
      // setProjects(pRes.data);
      const employees = uRes.data.filter((u) =>
        u.roles?.includes("Employee")
      );
      setUsers(employees);
      console.log("emp",employees);

    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };
  

  useEffect(() => {
    fetchData();
  }, []);

  // close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // toggle subtasks
  const toggleExpand = async (taskId) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null); // collapse
    } else {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const res = await api.get(`/tasks/${taskId}/subtasks`, {
          headers,
        });

        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? { ...t, subtasks: res.data } : t
          )
        );

        setExpandedTaskId(taskId);
      } catch (err) {
        console.error("Error fetching subtasks:", err);
      }
    }
  };

  // reset task form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    // setProjectId("");
    setAssignees([]);
    setProjectedStartDate("");
    setProjectedEndDate("");
    setStartDate("");
    setEndDate("");
    setDueDate("");
    setPriority("medium");
    setStatus("todo");
    setProgress("");
    setEditTask(null);
  };

  // open/close task modal
  const openModal = (task = null) => {
    if (task) {
      setEditTask(task);
      setTitle(task.title);
      setDescription(task.description || "");
      // setProjectId(task.project?._id || "");
      setAssignees(task.assignees?.map((u) => u._id || u) || []);
      setProjectedStartDate(task.projectedStartDate?.split("T")[0] || "");
      setProjectedEndDate(task.projectedEndDate?.split("T")[0] || "");
      setStartDate(task.startDate?.split("T")[0] || "");
      setEndDate(task.endDate?.split("T")[0] || "");
      setDueDate(task.dueDate?.split("T")[0] || "");
      setPriority(task.priority);
      setStatus(task.status);
      setProgress(task.progress);
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // create/update task
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
      
        assignees,
        projectedStartDate: projectedStartDate
          ? new Date(projectedStartDate).toISOString()
          : null,
        projectedEndDate: projectedEndDate
          ? new Date(projectedEndDate).toISOString()
          : null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status,
        progress,
      };

      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editTask) {
        await api.put(`/tasks/${editTask._id}`, payload, { headers });
      } else {
        await api.post("/tasks", payload, { headers });
      }

      await fetchData();
      closeModal();
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // open/close subtask modal
  const openSubtaskModal = (task, subtask = null) => {
    setEditTask(task);
    if (subtask) {
      setEditSubtask(subtask);
      setSubTitle(subtask.title || "");
      setSubDescription(subtask.description || "");
      setSubAssignees(subtask.assignees?.map((a) => a._id || a) || []);
      setStartDateData(subtask.startDate?.split("T")[0] || "");
      setEndDateData(subtask.endDate?.split("T")[0] || "");
      setSubDueDate(subtask.dueDate?.split("T")[0] || "");
      setSubPriority(subtask.priority || "medium");
      setSubStatus(subtask.status || "todo");
      setSubProgress(subtask.progress || "");
    } else {
      setEditSubtask(null);
      setSubTitle("");
      setSubDescription("");
      setSubAssignees([]);
      setStartDateData("");
      setEndDateData("");
      setSubDueDate("");
      setSubPriority("medium");
      setSubStatus("todo");
      setSubProgress("");
    }
    setSubModalOpen(true);
  };

  const closeSubtaskModal = () => {
    setSubModalOpen(false);
    setEditSubtask(null);
  };

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (editSubtask) {
        await api.put(
          `/tasks/${editTask._id}/subtasks/${editSubtask._id}`,
          {
            title: subTitle,
            description: subDescription,
            assignees: subAssignees,
            startDate: startDateData,
            endDate: endDateData,
            dueDate: subDueDate,
            priority: subPriority,
            status: subStatus,
            progress: subProgress,
          },
          { headers }
        );
      } else {
        await api.post(
          `/tasks/${editTask._id}/subtasks`,
          {
            title: subTitle,
            description: subDescription,
            assignees: subAssignees,
            startDate: startDateData,
            endDate: endDateData,
            dueDate: subDueDate,
            priority: subPriority,
            status: subStatus,
            progress: subProgress,
          },
          { headers }
        );
      }
      await fetchData();
      closeSubtaskModal();
    } catch (err) {
      console.error("Subtask Submit Error:", err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + New Task
        </button>
      </div>

      {/* Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Title</th>
            {/* <th className="p-2 border">Project</th> */}
            <th className="p-2 border">Assignees</th>
            <th className="p-2 border">Start Date</th>
            <th className="p-2 border">End Date</th>
            <th className="p-2 border">Priority</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <React.Fragment key={t._id}>
              {/* Task Row */}
              <tr
                className="bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleExpand(t._id)}
              >
                <td className="p-2 border font-medium">
                  {t.title}{" "}
                  {t.subtasks?.length > 0 && (
                    <span className="text-xs text-blue-600 ml-2">
                      ({t.subtasks.length} subtasks)
                    </span>
                  )}
                </td>
                {/* <td className="p-2 border">{t.project?.name}</td> */}
                <td className="p-2 border">
                  {t.assignees?.map((u) => u.name || u).join(", ")}
                </td>
                <td className="p-2 border">
                  {t.startDate ? new Date(t.startDate).toLocaleDateString("en-IN") : "-"}
                </td>
                
                <td className="p-2 border">
                  {t.endDate ? new Date(t.endDate).toLocaleDateString("en-IN") : "-"}
                </td>
                <td className="p-2 border">{t.priority}</td>
                <td className="p-2 border">{t.status}</td>
                <td
                className="p-2 border relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    setOpenMenuId(openMenuId === t._id ? null : t._id)
                  }
                  className="p-1 rounded hover:bg-gray-200"
                >
                  ⋮
                </button>

                {openMenuId === t._id && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 mt-1 w-32 bg-white border rounded shadow-md z-10"
                  >
                    <button
                      onClick={() => {
                        openSubtaskModal(t);
                        setOpenMenuId(null);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-green-600"
                    >
                      + Subtask
                    </button>
                    <button
                      onClick={() => {
                        openModal(t);
                        setOpenMenuId(null);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(t._id);
                        setOpenMenuId(null);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
      

              </tr>

              {/* Subtasks Row (collapsible) */}
              {expandedTaskId === t._id && t.subtasks?.length > 0 && (
                <tr key={`${t._id}-subtasks`}>
                  <td colSpan="7" className="p-2 bg-gray-50">
                    <div className="ml-6 space-y-2">
                      {t.subtasks.map((s) => (
                        <div
                          key={s._id}
                          className="flex justify-between items-center border-b pb-1"
                        >
                          <div>
                            <p className="text-sm font-medium">{s.title}</p>
                            <p className="text-xs text-gray-500">
                              {s.status} • {s.priority}
                            </p>
                          </div>
                          <div className="space-x-2">
                            <button
                              onClick={() => openSubtaskModal(t, s)}
                              className="text-blue-600 text-sm hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                console.log("Delete subtask", s._id)
                              }
                              className="text-red-600 text-sm hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Modals (Task + Subtask) */}
      {/* Task Modal */}
      {modalOpen && (
             <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center  z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editTask ? "Edit Task" : "New Task"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title - Full width */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Task Title"
                  className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description - Full width */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Task Description"
                  className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Two-column grid for other fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project */}
                {/* <div className="flex flex-col">
                  <label className="font-semibold mb-1">Project</label>
                  <Select
                    options={projects.map((p) => ({
                      value: p._id,
                      label: p.name,
                    }))}
                    value={projects
                      .filter((p) => p._id === projectId)
                      .map((p) => ({ value: p._id, label: p.name }))}
                    onChange={(selected) => setProjectId(selected?.value || "")}
                    placeholder="Search & select project"
                    className="text-sm"
                    classNamePrefix="select"
                    isSearchable
                  />
                </div> */}

                {/* Assignees */}
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Assignees</label>
                  <Select
                    isMulti
                    options={users.map((u) => ({
                      value: u._id,
                      label: u.name,
                    }))}
                    value={assignees.map((id) => {
                      const user = users.find((u) => u._id === id);
                      return { value: id, label: user?.name || id };
                    })}
                    onChange={(selected) =>
                      setAssignees(selected.map((s) => s.value))
                    }
                    placeholder="Search & select users"
                    className="text-sm"
                    classNamePrefix="select"
                  />
                </div>

                {/* Dates */}
                {/* <div className="flex flex-col">
                  <label className="font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div> */}

                {/* <div className="flex flex-col">
                  <label className="font-semibold mb-1">
                    Projected Start Date
                  </label>
                  <input
                    type="date"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={projectedStartDate}
                    onChange={(e) => setProjectedStartDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-1">
                    Projected End Date
                  </label>
                  <input
                    type="date"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={projectedEndDate}
                    onChange={(e) => setProjectedEndDate(e.target.value)}
                  />
                </div> */}

                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Priority</label>
                  <select
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Status</label>
                  <select
                    className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Progress</label>
                  <input
                    type="number"
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="px-5 py-2 border rounded hover:bg-gray-100 transition"
                  />
                </div>
              

              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 border rounded hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {editTask ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtask Modal */}
      {subModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editSubtask ? "Edit Subtask" : "New Subtask"}
            </h2>

            <form onSubmit={handleSubtaskSubmit} className="space-y-4">
              {/* Title */}
              <h1>Subtask Title</h1>
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Title </label>
                <input
                  type="text"
                  className="border p-2 rounded w-full"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Description</label>
                <textarea
                  className="border p-2 rounded w-full"
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                />
              </div>

              {/* Assignees */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Assignees</label>
                <Select
                  isMulti
                  options={users.map((u) => ({ value: u._id, label: u.name }))}
                  value={subAssignees.map((id) => {
                    const user = users.find((u) => u._id === id);
                    return { value: id, label: user?.name || id };
                  })}
                  onChange={(selected) =>
                    setSubAssignees(selected.map((s) => s.value))
                  }
                />
              </div>
              {/* <div className="flex flex-col"> 
                <label className="font-semibold mb-1">Projected Start Date</label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={projecStarttData}
                  onChange={(e) => setProjectStartData(e.target.value)}
                />

              </div>
              <div className="flex flex-col"> 
                <label className="font-semibold mb-1"> Projected End Date </label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={projectEndData}
                  onChange={(e) => setProjectEndData(e.target.value)}
                />

              </div> */}
                <div className="flex flex-col"> 
                <label className="font-semibold mb-1"> Start Date  </label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={startDateData}
                  onChange={(e) => setStartDateData(e.target.value)}
                />

              </div>
              <div className="flex flex-col"> 
                <label className="font-semibold mb-1"> End Date </label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={endDateData}
                  onChange={(e) => setEndDateData(e.target.value)}
                />

              </div>
           

              {/* Due Date */}
              {/* <div className="flex flex-col">
                <label className="font-semibold mb-1">Due Date</label>
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={subDueDate}
                  onChange={(e) => setSubDueDate(e.target.value)}
                />
              </div> */}

              {/* Priority + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Priority</label>
                  <select
                    className="border p-2 rounded"
                    value={subPriority}
                    onChange={(e) => setSubPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Status</label>
                  <select
                    className="border p-2 rounded"
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                  <label className="font-semibold mb-1">Progress</label>
                  <input
                    type="number"
                    value={subProgress}
                    onChange={(e) => setSubProgress(e.target.value)}
                    className="px-5 py-2 border rounded hover:bg-gray-100 transition"
                    />
              </div>
            


              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeSubtaskModal}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {editSubtask ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




