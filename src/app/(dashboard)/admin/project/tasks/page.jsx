"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { 
  FaPlus, FaTasks, FaUserCircle, FaCalendarAlt, FaEllipsisV, 
  FaEdit, FaTrash, FaLevelDownAlt, FaClock, FaCheckCircle, FaProjectDiagram 
} from "react-icons/fa";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Menu State
  const [modalOpen, setModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [editSubtask, setEditSubtask] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Task Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [progress, setProgress] = useState(0);

  // Subtask Form State
  const [subTitle, setSubTitle] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subAssignees, setSubAssignees] = useState([]);
  const [startDateData, setStartDateData] = useState("");
  const [endDateData, setEndDateData] = useState("");
  const [subPriority, setSubPriority] = useState("medium");
  const [subStatus, setSubStatus] = useState("todo");
  const [subProgress, setSubProgress] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [tRes, pRes, uRes] = await Promise.all([
        api.get("/project/tasks", { headers }),
        api.get("/project/projects", { headers }),
        api.get("/company/users", { headers }),
      ]);
      setTasks(tRes.data);
      setProjects(pRes.data);
      setUsers(uRes.data.filter((u) => u.roles?.includes("Employee")));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── UI Styles ──
  const Lbl = ({ text }) => <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{text}</label>;
  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";
  
  const PriorityBadge = ({ level }) => {
    const map = {
      high: "bg-red-50 text-red-600 border-red-100",
      medium: "bg-amber-50 text-amber-600 border-amber-100",
      low: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${map[level]}`}>{level}</span>;
  };

  const StatusBadge = ({ state }) => {
    const map = {
      todo: "bg-gray-100 text-gray-500",
      "in-progress": "bg-indigo-50 text-indigo-600",
      done: "bg-emerald-50 text-emerald-600"
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${map[state]}`}>{state.replace("-", " ")}</span>;
  };

  // ── Handlers ──
  const toggleExpand = async (taskId) => {
    if (expandedTaskId === taskId) { setExpandedTaskId(null); } 
    else {
      const token = localStorage.getItem("token");
      const res = await api.get(`/project/tasks/${taskId}/subtasks`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, subtasks: res.data } : t));
      setExpandedTaskId(taskId);
    }
  };

  const openModal = (task = null) => {
    if (task) {
      setEditTask(task); setTitle(task.title); setDescription(task.description || "");
      setProjectId(task.project?._id || "");
      setAssignees(task.assignees?.map(u => u._id || u) || []);
      setStartDate(task.startDate?.split("T")[0] || "");
      setEndDate(task.endDate?.split("T")[0] || "");
      setPriority(task.priority); setStatus(task.status); setProgress(task.progress || 0);
    } else {
      setEditTask(null); setTitle(""); setDescription(""); setProjectId(""); setAssignees([]);
      setStartDate(""); setEndDate(""); setPriority("medium"); setStatus("todo"); setProgress(0);
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { title, description, project: projectId, assignees, startDate, endDate, priority, status, progress };
    const token = localStorage.getItem("token");
    if (editTask) await api.put(`/project/tasks/${editTask._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
    else await api.post("/project/tasks", payload, { headers: { Authorization: `Bearer ${token}` } });
    await fetchData(); setModalOpen(false);
  };

  const openSubtaskModal = (task, sub = null) => {
    setEditTask(task);
    if (sub) {
      setEditSubtask(sub); setSubTitle(sub.title); setSubDescription(sub.description || "");
      setSubAssignees(sub.assignees?.map(a => a._id || a) || []);
      setStartDateData(sub.startDate?.split("T")[0] || "");
      setEndDateData(sub.endDate?.split("T")[0] || "");
      setSubPriority(sub.priority); setSubStatus(sub.status); setSubProgress(sub.progress || 0);
    } else {
      setEditSubtask(null); setSubTitle(""); setSubDescription(""); setSubAssignees([]);
      setStartDateData(""); setEndDateData(""); setSubPriority("medium"); setSubStatus("todo"); setSubProgress(0);
    }
    setSubModalOpen(true);
  };

  const handleSubtaskSubmit = async (e) => {
    e.preventDefault();
    const payload = { title: subTitle, description: subDescription, assignees: subAssignees, startDate: startDateData, endDate: endDateData, priority: subPriority, status: subStatus, progress: subProgress };
    const token = localStorage.getItem("token");
    if (editSubtask) await api.put(`/project/tasks/${editTask._id}/subtasks/${editSubtask._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
    else await api.post(`/project/tasks/${editTask._id}/subtasks`, payload, { headers: { Authorization: `Bearer ${token}` } });
    await fetchData(); setSubModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaTasks className="text-indigo-600" /> Task Management
            </h1>
            <p className="text-sm text-gray-400 mt-1">Organize workflows and monitor team deliverables</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
            <FaPlus size={12} /> New Task
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Task Details</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Timeline</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Priority</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 w-32">Progress</th>
                  <th className="px-6 py-4 text-center w-16 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 font-medium italic">Syncing tasks...</td></tr>
                ) : tasks.map((t) => (
                  <React.Fragment key={t._id}>
                    <tr onClick={() => toggleExpand(t._id)} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-1 h-8 rounded-full ${expandedTaskId === t._id ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-gray-200'}`} />
                          <div>
                            <p className="font-bold text-gray-900">{t.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <FaUserCircle className="text-gray-300" />
                              <span className="text-[10px] text-gray-400 font-medium">{t.assignees?.map(u => u.name || u).join(", ") || "Unassigned"}</span>
                              {t.subtasks?.length > 0 && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 rounded-md font-bold">{t.subtasks.length} Subtasks</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <FaProjectDiagram className="text-gray-300 text-xs" />
                          {t.project?.name || "No Project"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5"><FaCalendarAlt className="text-gray-300" /> {t.startDate ? new Date(t.startDate).toLocaleDateString("en-IN") : "-"}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-gray-300"><FaClock /> {t.endDate ? new Date(t.endDate).toLocaleDateString("en-IN") : "-"}</div>
                      </td>
                      <td className="px-6 py-4"><PriorityBadge level={t.priority} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 w-8">{t.progress}%</span>
                        </div>
                        <div className="mt-1"><StatusBadge state={t.status} /></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t._id ? null : t._id); }} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                          <FaEllipsisV />
                        </button>
                        {openMenuId === t._id && (
                          <div className="absolute right-12 bg-white border border-gray-100 rounded-xl shadow-xl z-20 w-44 text-left overflow-hidden animate-in fade-in zoom-in duration-100">
                            <button onClick={() => openSubtaskModal(t)} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-emerald-600 hover:bg-emerald-50 font-bold"><FaPlus /> Add Activity</button>
                            <button onClick={() => openModal(t)} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 font-bold"><FaEdit /> Edit Task</button>
                            <button onClick={() => { if(confirm("Delete?")) api.delete(`/project/tasks/${t._id}`).then(() => fetchData()); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold"><FaTrash /> Delete Task</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Collapsible Subtasks UI */}
                    {expandedTaskId === t._id && t.subtasks?.map(s => (
                      <tr key={s._id} className="bg-gray-50/50 border-l-4 border-indigo-400">
                        <td colSpan="4" className="px-14 py-3">
                          <div className="flex items-center gap-3">
                            <FaLevelDownAlt className="text-gray-300 rotate-90" />
                            <div>
                              <p className="text-sm font-bold text-gray-700">{s.title}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.status} • {s.priority}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                           <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-indigo-400 h-full" style={{width:`${s.progress}%`}} />
                            </div>
                            <span className="text-[9px] font-bold text-gray-400">{s.progress}%</span>
                           </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                           <button onClick={() => openSubtaskModal(t, s)} className="text-indigo-400 hover:text-indigo-600 p-1"><FaEdit /></button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- Task Modal --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{editTask ? "Update Task" : "New Project Task"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
              <div><Lbl text="Project Association" /><Select options={projects.map(p => ({ value: p._id, label: p.name }))} value={projects.filter(p => p._id === projectId).map(p => ({ value: p._id, label: p.name }))} onChange={s => setProjectId(s?.value || "")} className="text-sm" placeholder="Select project..." /></div>
              <div><Lbl text="Task Title" /><input type="text" className={fi} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prototype Development" required /></div>
              <div><Lbl text="Detailed Description" /><textarea className={`${fi} h-24 resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Objectives and instructions..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl text="Start Date" /><input type="date" className={fi} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                <div><Lbl text="End Date" /><input type="date" className={fi} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl text="Priority" /><select className={fi} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><Lbl text="Current Status" /><select className={fi} value={status} onChange={(e) => setStatus(e.target.value)}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div>
              </div>
              <div>
                <Lbl text="Assigned Members" />
                <Select isMulti options={users.map(u => ({ value: u._id, label: u.name }))} value={assignees.map(id => ({ value: id, label: users.find(u => u._id === id)?.name || id }))} onChange={s => setAssignees(s.map(x => x.value))} className="text-sm" />
              </div>
              <div>
                <Lbl text={`Completion Percentage (${progress}%)`} />
                <input type="range" className="w-full accent-indigo-600 h-1.5" value={progress} onChange={(e) => setProgress(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Subtask Modal --- */}
      {subModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Add Activity to Parent Task</h2>
            </div>
            <form onSubmit={handleSubtaskSubmit} className="p-8 space-y-5">
              <div><Lbl text="Activity Title" /><input type="text" className={fi} value={subTitle} onChange={(e) => setSubTitle(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Lbl text="Priority" /><select className={fi} value={subPriority} onChange={(e) => setSubPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><Lbl text="Progress %" /><input type="number" className={fi} value={subProgress} onChange={(e) => setSubProgress(e.target.value)} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setSubModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-xs uppercase tracking-widest">Close</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100">Add Subtask</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// "use client";

// import React, { useEffect, useState, useRef } from "react";
// import api from "@/lib/api";
// import Select from "react-select";

// export default function TasksPage() {
//   const [tasks, setTasks] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [users, setUsers] = useState([]);

//   // modals
//   const [modalOpen, setModalOpen] = useState(false);
//   const [subModalOpen, setSubModalOpen] = useState(false);

//   // edit state
//   const [editTask, setEditTask] = useState(null);
//   const [editSubtask, setEditSubtask] = useState(null);

//   // expanded task for subtasks
//   const [expandedTaskId, setExpandedTaskId] = useState(null);

//   // dropdown menu state
//   const [openMenuId, setOpenMenuId] = useState(null);
//   const menuRef = useRef(null);

//   // task form
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [projectId, setProjectId] = useState("");
//   const [assignees, setAssignees] = useState([]);
//   const [dueDate, setDueDate] = useState("");
//   const [projectedStartDate, setProjectedStartDate] = useState("");
//   const [projectedEndDate, setProjectedEndDate] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [priority, setPriority] = useState("medium");
//   const [status, setStatus] = useState("todo");
//   const [progress, setProgress] = useState("");

//   // subtask form
//   const [subTitle, setSubTitle] = useState("");
//   const [subDescription, setSubDescription] = useState("");
//   const [subAssignees, setSubAssignees] = useState([]);
//   const [startDateData, setStartDateData] = useState("");
//   const [endDateData, setEndDateData] = useState("");
//   const [subDueDate, setSubDueDate] = useState("");
//   const [subPriority, setSubPriority] = useState("medium");
//   const [subStatus, setSubStatus] = useState("todo");
//   const [subProgress, setSubProgress] = useState("");

//   // fetch data
//   const fetchData = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (token) {
//         api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
//       }
//       const headers = { Authorization: `Bearer ${token}` };

//       const [tRes, pRes, uRes] = await Promise.all([
//         api.get("/project/tasks", { headers }),
//         api.get("/project/projects", { headers }),
//         api.get("/company/users", { headers }),
//       ]);

//       setTasks(tRes.data);
//       setProjects(pRes.data);
//       const employees = uRes.data.filter((u) =>
//         u.roles?.includes("Employee")
//       );
//       setUsers(employees);
//     } catch (err) {
//       console.error("Error fetching data:", err);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   // close dropdown when clicked outside
//   useEffect(() => {
//     function handleClickOutside(e) {
//       if (menuRef.current && !menuRef.current.contains(e.target)) {
//         setOpenMenuId(null);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // toggle subtasks
//   const toggleExpand = async (taskId) => {
//     if (expandedTaskId === taskId) {
//       setExpandedTaskId(null); // collapse
//     } else {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { Authorization: `Bearer ${token}` };

//         const res = await api.get(`/project/tasks/${taskId}/subtasks`, {
//           headers,
//         });

//         setTasks((prev) =>
//           prev.map((t) =>
//             t._id === taskId ? { ...t, subtasks: res.data } : t
//           )
//         );

//         setExpandedTaskId(taskId);
//       } catch (err) {
//         console.error("Error fetching subtasks:", err);
//       }
//     }
//   };

//   // reset task form
//   const resetForm = () => {
//     setTitle("");
//     setDescription("");
//     setProjectId("");
//     setAssignees([]);
//     setProjectedStartDate("");
//     setProjectedEndDate("");
//     setStartDate("");
//     setEndDate("");
//     setDueDate("");
//     setPriority("medium");
//     setStatus("todo");
//     setProgress("");
//     setEditTask(null);
//   };

//   // open/close task modal
//   const openModal = (task = null) => {
//     if (task) {
//       setEditTask(task);
//       setTitle(task.title);
//       setDescription(task.description || "");
//       setProjectId(task.project?._id || "");
//       setAssignees(task.assignees?.map((u) => u._id || u) || []);
//       setProjectedStartDate(task.projectedStartDate?.split("T")[0] || "");
//       setProjectedEndDate(task.projectedEndDate?.split("T")[0] || "");
//       setStartDate(task.startDate?.split("T")[0] || "");
//       setEndDate(task.endDate?.split("T")[0] || "");
//       setDueDate(task.dueDate?.split("T")[0] || "");
//       setPriority(task.priority);
//       setStatus(task.status);
//       setProgress(task.progress);
//     } else {
//       resetForm();
//     }
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setModalOpen(false);
//     resetForm();
//   };

//   // create/update task
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         title,
//         description,
//         project: projectId,
//         assignees,
//         projectedStartDate: projectedStartDate
//           ? new Date(projectedStartDate).toISOString()
//           : null,
//         projectedEndDate: projectedEndDate
//           ? new Date(projectedEndDate).toISOString()
//           : null,
//         startDate: startDate ? new Date(startDate).toISOString() : null,
//         endDate: endDate ? new Date(endDate).toISOString() : null,
//         dueDate: dueDate ? new Date(dueDate).toISOString() : null,
//         priority,
//         status,
//         progress,
//       };

//       const token = localStorage.getItem("token");
//       const headers = { Authorization: `Bearer ${token}` };

//       if (editTask) {
//         await api.put(`/project/tasks/${editTask._id}`, payload, { headers });
//       } else {
//         await api.post("/project/tasks", payload, { headers });
//       }

//       await fetchData();
//       closeModal();
//     } catch (err) {
//       console.error("Error saving task:", err);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this task?")) return;
//     try {
//       await api.delete(`/project/tasks/${id}`);
//       setTasks(tasks.filter((t) => t._id !== id));
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // open/close subtask modal
//   const openSubtaskModal = (task, subtask = null) => {
//     setEditTask(task);
//     if (subtask) {
//       setEditSubtask(subtask);
//       setSubTitle(subtask.title || "");
//       setSubDescription(subtask.description || "");
//       setSubAssignees(subtask.assignees?.map((a) => a._id || a) || []);
//       setStartDateData(subtask.startDate?.split("T")[0] || "");
//       setEndDateData(subtask.endDate?.split("T")[0] || "");
//       setSubDueDate(subtask.dueDate?.split("T")[0] || "");
//       setSubPriority(subtask.priority || "medium");
//       setSubStatus(subtask.status || "todo");
//       setSubProgress(subtask.progress || "");
//     } else {
//       setEditSubtask(null);
//       setSubTitle("");
//       setSubDescription("");
//       setSubAssignees([]);
//       setStartDateData("");
//       setEndDateData("");
//       setSubDueDate("");
//       setSubPriority("medium");
//       setSubStatus("todo");
//       setSubProgress("");
//     }
//     setSubModalOpen(true);
//   };

//   const closeSubtaskModal = () => {
//     setSubModalOpen(false);
//     setEditSubtask(null);
//   };

//   const handleSubtaskSubmit = async (e) => {
//     e.preventDefault();
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };

//     try {
//       if (editSubtask) {
//         await api.put(
//           `/project/tasks/${editTask._id}/subtasks/${editSubtask._id}`,
//           {
//             title: subTitle,
//             description: subDescription,
//             assignees: subAssignees,
//             startDate: startDateData,
//             endDate: endDateData,
//             dueDate: subDueDate,
//             priority: subPriority,
//             status: subStatus,
//             progress: subProgress,
//           },
//           { headers }
//         );
//       } else {
//         await api.post(
//           `/project/tasks/${editTask._id}/subtasks`,
//           {
//             title: subTitle,
//             description: subDescription,
//             assignees: subAssignees,
//             startDate: startDateData,
//             endDate: endDateData,
//             dueDate: subDueDate,
//             priority: subPriority,
//             status: subStatus,
//             progress: subProgress,
//           },
//           { headers }
//         );
//       }
//       await fetchData();
//       closeSubtaskModal();
//     } catch (err) {
//       console.error("Subtask Submit Error:", err.message);
//     }
//   };

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Tasks</h1>
//         <button
//           onClick={() => openModal()}
//           className="bg-blue-600 text-white px-4 py-2 rounded"
//         >
//           + New Task
//         </button>
//       </div>

//       {/* Table */}
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Title</th>
//             <th className="p-2 border">Project</th>
//             <th className="p-2 border">Assignees</th>
//             <th className="p-2 border">Start Date</th>
//             <th className="p-2 border">End Date</th>
//             <th className="p-2 border">Priority</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {tasks.map((t) => (
//             <React.Fragment key={t._id}>
//               {/* Task Row */}
//               <tr
//                 className="bg-white hover:bg-gray-50 cursor-pointer"
//                 onClick={() => toggleExpand(t._id)}
//               >
//                 <td className="p-2 border font-medium">
//                   {t.title}{" "}
//                   {t.subtasks?.length > 0 && (
//                     <span className="text-xs text-blue-600 ml-2">
//                       ({t.subtasks.length} subtasks)
//                     </span>
//                   )}
//                 </td>
//                 <td className="p-2 border">{t.project?.name}</td>
//                 <td className="p-2 border">
//                   {t.assignees?.map((u) => u.name || u).join(", ")}
//                 </td>
//                 <td className="p-2 border">
//                   {t.startDate ? new Date(t.startDate).toLocaleDateString("en-IN") : "-"}
//                 </td>
                
//                 <td className="p-2 border">
//                   {t.endDate ? new Date(t.endDate).toLocaleDateString("en-IN") : "-"}
//                 </td>
//                 <td className="p-2 border">{t.priority}</td>
//                 <td className="p-2 border">{t.status}</td>
//                 <td
//                 className="p-2 border relative"
//                 onClick={(e) => e.stopPropagation()}
//               >
//                 <button
//                   onClick={() =>
//                     setOpenMenuId(openMenuId === t._id ? null : t._id)
//                   }
//                   className="p-1 rounded hover:bg-gray-200"
//                 >
//                   ⋮
//                 </button>

//                 {openMenuId === t._id && (
//                   <div
//                     ref={menuRef}
//                     className="absolute right-2 mt-1 w-32 bg-white border rounded shadow-md z-10"
//                   >
//                     <button
//                       onClick={() => {
//                         openSubtaskModal(t);
//                         setOpenMenuId(null);
//                       }}
//                       className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-green-600"
//                     >
//                       + Subtask
//                     </button>
//                     <button
//                       onClick={() => {
//                         openModal(t);
//                         setOpenMenuId(null);
//                       }}
//                       className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-blue-600"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => {
//                         handleDelete(t._id);
//                         setOpenMenuId(null);
//                       }}
//                       className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 )}
//               </td>
      

//               </tr>

//               {/* Subtasks Row (collapsible) */}
//               {expandedTaskId === t._id && t.subtasks?.length > 0 && (
//                 <tr key={`${t._id}-subtasks`}>
//                   <td colSpan="7" className="p-2 bg-gray-50">
//                     <div className="ml-6 space-y-2">
//                       {t.subtasks.map((s) => (
//                         <div
//                           key={s._id}
//                           className="flex justify-between items-center border-b pb-1"
//                         >
//                           <div>
//                             <p className="text-sm font-medium">{s.title}</p>
//                             <p className="text-xs text-gray-500">
//                               {s.status} • {s.priority}
//                             </p>
//                           </div>
//                           <div className="space-x-2">
//                             <button
//                               onClick={() => openSubtaskModal(t, s)}
//                               className="text-blue-600 text-sm hover:underline"
//                             >
//                               Edit
//                             </button>
//                             <button
//                               onClick={() =>
//                                 console.log("Delete subtask", s._id)
//                               }
//                               className="text-red-600 text-sm hover:underline"
//                             >
//                               Delete
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </td>
//                 </tr>
//               )}
//             </React.Fragment>
//           ))}
//         </tbody>
//       </table>

//       {/* Modals (Task + Subtask) */}
//       {/* Task Modal */}
//       {modalOpen && (
//              <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center  z-50">
//           <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
//             <h2 className="text-xl font-bold mb-4">
//               {editTask ? "Edit Task" : "New Task"}
//             </h2>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               {/* Title - Full width */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Title</label>
//                 <input
//                   type="text"
//                   placeholder="Task Title"
//                   className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   required
//                 />
//               </div>

//               {/* Description - Full width */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Description</label>
//                 <textarea
//                   placeholder="Task Description"
//                   className="border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                   value={description}
//                   onChange={(e) => setDescription(e.target.value)}
//                 />
//               </div>

//               {/* Two-column grid for other fields */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 {/* Project */}
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Project</label>
//                   <Select
//                     options={projects.map((p) => ({
//                       value: p._id,
//                       label: p.name,
//                     }))}
//                     value={projects
//                       .filter((p) => p._id === projectId)
//                       .map((p) => ({ value: p._id, label: p.name }))}
//                     onChange={(selected) => setProjectId(selected?.value || "")}
//                     placeholder="Search & select project"
//                     className="text-sm"
//                     classNamePrefix="select"
//                     isSearchable
//                   />
//                 </div>

//                 {/* Assignees */}
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Assignees</label>
//                   <Select
//                     isMulti
//                     options={users.map((u) => ({
//                       value: u._id,
//                       label: u.name,
//                     }))}
//                     value={assignees.map((id) => {
//                       const user = users.find((u) => u._id === id);
//                       return { value: id, label: user?.name || id };
//                     })}
//                     onChange={(selected) =>
//                       setAssignees(selected.map((s) => s.value))
//                     }
//                     placeholder="Search & select users"
//                     className="text-sm"
//                     classNamePrefix="select"
//                   />
//                 </div>

//                 {/* Dates */}
//                 {/* <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Due Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={dueDate}
//                     onChange={(e) => setDueDate(e.target.value)}
//                   />
//                 </div> */}

//                 {/* <div className="flex flex-col">
//                   <label className="font-semibold mb-1">
//                     Projected Start Date
//                   </label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={projectedStartDate}
//                     onChange={(e) => setProjectedStartDate(e.target.value)}
//                   />
//                 </div>

//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">
//                     Projected End Date
//                   </label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={projectedEndDate}
//                     onChange={(e) => setProjectedEndDate(e.target.value)}
//                   />
//                 </div> */}

//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Start Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={startDate}
//                     onChange={(e) => setStartDate(e.target.value)}
//                   />
//                 </div>

//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">End Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={endDate}
//                     onChange={(e) => setEndDate(e.target.value)}
//                   />
//                 </div>

//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Priority</label>
//                   <select
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={priority}
//                     onChange={(e) => setPriority(e.target.value)}
//                   >
//                     <option value="low">Low</option>
//                     <option value="medium">Medium</option>
//                     <option value="high">High</option>
//                   </select>
//                 </div>

//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Status</label>
//                   <select
//                     className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//                     value={status}
//                     onChange={(e) => setStatus(e.target.value)}
//                   >
//                     <option value="todo">To Do</option>
//                     <option value="in-progress">In Progress</option>
//                     <option value="done">Done</option>
//                   </select>
//                 </div>
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Progress</label>
//                   <input
//                     type="number"
//                     value={progress}
//                     onChange={(e) => setProgress(e.target.value)}
//                     className="px-5 py-2 border rounded hover:bg-gray-100 transition"
//                   />
//                 </div>
              

//               </div>

//               {/* Buttons */}
//               <div className="flex justify-end gap-3 mt-4">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="px-5 py-2 border rounded hover:bg-gray-100 transition"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//                 >
//                   {editTask ? "Update" : "Create"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Subtask Modal */}
//       {subModalOpen && (
//          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
//           <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
//             <h2 className="text-xl font-bold mb-4">
//               {editSubtask ? "Edit Subtask" : "New Subtask"}
//             </h2>

//             <form onSubmit={handleSubtaskSubmit} className="space-y-4">
//               {/* Title */}
//               <h1>Subtask Title</h1>
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Title </label>
//                 <input
//                   type="text"
//                   className="border p-2 rounded w-full"
//                   value={subTitle}
//                   onChange={(e) => setSubTitle(e.target.value)}
//                   required
//                 />
//               </div>

//               {/* Description */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Description</label>
//                 <textarea
//                   className="border p-2 rounded w-full"
//                   value={subDescription}
//                   onChange={(e) => setSubDescription(e.target.value)}
//                 />
//               </div>

//               {/* Assignees */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Assignees</label>
//                 <Select
//                   isMulti
//                   options={users.map((u) => ({ value: u._id, label: u.name }))}
//                   value={subAssignees.map((id) => {
//                     const user = users.find((u) => u._id === id);
//                     return { value: id, label: user?.name || id };
//                   })}
//                   onChange={(selected) =>
//                     setSubAssignees(selected.map((s) => s.value))
//                   }
//                 />
//               </div>
//               {/* <div className="flex flex-col"> 
//                 <label className="font-semibold mb-1">Projected Start Date</label>
//                 <input
//                   type="date"
//                   className="border p-2 rounded"
//                   value={projecStarttData}
//                   onChange={(e) => setProjectStartData(e.target.value)}
//                 />

//               </div>
//               <div className="flex flex-col"> 
//                 <label className="font-semibold mb-1"> Projected End Date </label>
//                 <input
//                   type="date"
//                   className="border p-2 rounded"
//                   value={projectEndData}
//                   onChange={(e) => setProjectEndData(e.target.value)}
//                 />

//               </div> */}
//                 <div className="flex flex-col"> 
//                 <label className="font-semibold mb-1"> Start Date  </label>
//                 <input
//                   type="date"
//                   className="border p-2 rounded"
//                   value={startDateData}
//                   onChange={(e) => setStartDateData(e.target.value)}
//                 />

//               </div>
//               <div className="flex flex-col"> 
//                 <label className="font-semibold mb-1"> End Date </label>
//                 <input
//                   type="date"
//                   className="border p-2 rounded"
//                   value={endDateData}
//                   onChange={(e) => setEndDateData(e.target.value)}
//                 />

//               </div>
           

//               {/* Due Date */}
//               {/* <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Due Date</label>
//                 <input
//                   type="date"
//                   className="border p-2 rounded"
//                   value={subDueDate}
//                   onChange={(e) => setSubDueDate(e.target.value)}
//                 />
//               </div> */}

//               {/* Priority + Status */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Priority</label>
//                   <select
//                     className="border p-2 rounded"
//                     value={subPriority}
//                     onChange={(e) => setSubPriority(e.target.value)}
//                   >
//                     <option value="low">Low</option>
//                     <option value="medium">Medium</option>
//                     <option value="high">High</option>
//                   </select>
//                 </div>
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Status</label>
//                   <select
//                     className="border p-2 rounded"
//                     value={subStatus}
//                     onChange={(e) => setSubStatus(e.target.value)}
//                   >
//                     <option value="todo">To Do</option>
//                     <option value="in-progress">In Progress</option>
//                     <option value="done">Done</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Progress</label>
//                   <input
//                     type="number"
//                     value={subProgress}
//                     onChange={(e) => setSubProgress(e.target.value)}
//                     className="px-5 py-2 border rounded hover:bg-gray-100 transition"
//                     />
//               </div>
            


//               {/* Buttons */}
//               <div className="flex justify-end gap-2 mt-4">
//                 <button
//                   type="button"
//                   onClick={closeSubtaskModal}
//                   className="px-4 py-2 border rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-blue-600 text-white rounded"
//                 >
//                   {editSubtask ? "Update" : "Add"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




