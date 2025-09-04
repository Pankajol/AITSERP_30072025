"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignees, setAssignees] = useState([]); // ✅ always array
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");

  // fetch tasks, projects, users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        const [tRes, pRes, uRes] = await Promise.all([
          api.get("/project/tasks"),
          api.get("/project/projects"),
          api.get("/company/users"),
          { headers: { Authorization: `Bearer ${token}` } }
        ]);
        console.log("task data", tRes.data);
        setTasks(tRes.data);
        setProjects(pRes.data);
        setUsers(uRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectId("");
    setAssignees([]); // ✅ reset array
    setDueDate("");
    setPriority("medium");
    setStatus("todo");
    setEditTask(null);
  };

  // open modal (new or edit)
  const openModal = (task = null) => {
    if (task) {
      setEditTask(task);
      setTitle(task.title);
      setDescription(task.description || "");
      setProjectId(task.project?._id || "");
      setAssignees(
        Array.isArray(task.assignees)
          ? task.assignees.map((user) => user._id || user)
          : []
      );
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setPriority(task.priority);
      setStatus(task.status);
    } else {
      resetForm();
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // add or update task
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        project: projectId,
        assignees, // ✅ array
        dueDate,
        priority,
        status,
      };

      if (editTask) {
        const res = await api.put(`/project/tasks/${editTask._id}`, payload);
        setTasks((prev) =>
          prev.map((t) => (t._id === editTask._id ? res.data : t))
        );
      } else {
        const res = await api.post("/project/tasks", payload);
        setTasks([...tasks, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // delete task
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/project/tasks/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
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

      {/* Tasks Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Title</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Project</th>
            <th className="p-2 border">Assignees</th>
            <th className="p-2 border">Due Date</th>
            <th className="p-2 border">Priority</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t._id}>
              <td className="p-2 border">{t.title}</td>
              <td className="p-2 border">{t.description || "-"}</td>
              <td className="p-2 border">{t.project?.name}</td>
              <td className="p-2 border">
                {Array.isArray(t.assignees) && t.assignees.length
                  ? t.assignees.map((u) => (u.name ? u.name : u)).join(", ")
                  : "-"}
              </td>
              <td className="p-2 border">
                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}
              </td>
              <td className="p-2 border capitalize">{t.priority}</td>
              <td className="p-2 border capitalize">{t.status}</td>
              <td className="p-2 border text-center space-x-2">
                <button
                  onClick={() => openModal(t)}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t._id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-[600px] relative">
            <h2 className="text-xl font-bold mb-4">
              {editTask ? "Edit Task" : "New Task"}
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-4 gap-2 mb-4"
            >
              <label className="col-span-2 font-semibold">Title</label>
              <input
                type="text"
                placeholder="Task Title"
                className="border p-2 rounded col-span-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label className="col-span-2 font-semibold">Description</label>
              <textarea
                placeholder="Task Description"
                className="border p-2 rounded col-span-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>

              <label className="col-span-2 font-semibold">Project</label>
              <select
                className="border p-2 rounded"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label className="col-span-2 font-semibold">Assignees</label>
              <div className="col-span-2">
                <Select
                  isMulti
                  options={users.map((u) => ({ value: u._id, label: u.name }))}
                  value={assignees.map((id) => {
                    const user = users.find((u) => u._id === id);
                    return { value: id, label: user?.name || id };
                  })}
                  onChange={(selected) =>
                    setAssignees(selected.map((s) => s.value))
                  }
                  placeholder="Search & select users"
                  className="text-sm"
                />
              </div>

              <label className="col-span-2 font-semibold">Due Date</label>
              <input
                type="date"
                className="border p-2 rounded"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              <label className="col-span-2 font-semibold">Priority</label>
              <select
                className="border p-2 rounded"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <label className="col-span-2 font-semibold">Status</label>
              <select
                className="border p-2 rounded"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>

              <div className="col-span-2 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {editTask ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}




// "use client";
// import { useEffect, useState } from "react";
// import api from "@/lib/api";
// import Select from "react-select"; 

// export default function TasksPage() {
//   const [tasks, setTasks] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [users, setUsers] = useState([]);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [editTask, setEditTask] = useState(null);

//   // form state
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");

//   const [projectId, setProjectId] = useState([]);
//   const [assignedTo, setAssignedTo] = useState("");
//   const [dueDate, setDueDate] = useState("");
//   const [priority, setPriority] = useState("medium");
//   const [status, setStatus] = useState("todo");

//   // fetch tasks, projects, users
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [tRes, pRes, uRes] = await Promise.all([
//           api.get("/project/tasks"),
//           api.get("/project/projects"),
//           api.get("/company/users"),
//         ]);
//         console.log("task data", tRes.data);
//         console.log("project data", pRes.data);
//         console.log("user data", uRes.data);
//         setTasks(tRes.data);
//         setProjects(pRes.data);
//         setUsers(uRes.data);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchData();
//   }, []);

//   const resetForm = () => {
//     setTitle("");
//     setDescription("");

//     setProjectId("");
//     setAssignedTo("");
//     setDueDate("");
//     setPriority("medium");
//     setStatus("todo");
//     setEditTask(null);
//   };

//   // open modal (new or edit)
//   const openModal = (task = null) => {
//     if (task) {
//       setEditTask(task);
//       setTitle(task.title);
//       setDescription(task.description || "");
//       setProjectId(task.project?._id || "");
//       setAssignedTo(
//   Array.isArray(task.assignedTo)
//     ? task.assignedTo.map((user) => user._id || user) // handles populated objects or raw ids
//     : task.assignedTo
//     ? [task.assignedTo._id || task.assignedTo] // if single object or string
//     : []
// );


//       setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
//       setPriority(task.priority);
//       setStatus(task.status);
//     } else {
//       resetForm();
//     }
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setModalOpen(false);
//     resetForm();
//   };

//   // add or update task
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (editTask) {
//         // update
//         const res = await api.put(`/project/tasks/${editTask._id}`, {
//           title,
//           description,
//           project: projectId,
//           assignedTo,
//           dueDate,
//           priority,
//           status,
//         });
//         setTasks((prev) =>
//           prev.map((t) => (t._id === editTask._id ? res.data : t))
//         );
//       } else {
//         // create
//         const res = await api.post("/project/tasks", {
//           title,
//           description,
//           project: projectId,
//           assignedTo,
//           dueDate,
//           priority,
//           status,
//         });
//         setTasks([...tasks, res.data]);
//       }
//       closeModal();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // delete task
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this task?")) return;
//     try {
//       await api.delete(`/project/tasks/${id}`);
//       setTasks(tasks.filter((t) => t._id !== id));
//     } catch (err) {
//       console.error(err);
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

//       {/* Tasks Table */}
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Title</th>
//             <th className="p-2 border">Description</th>
//             <th className="p-2 border">Project</th>
//             <th className="p-2 border">Assigned To</th>
//             <th className="p-2 border">Due Date</th>
//             <th className="p-2 border">Priority</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {tasks.map((t) => (
//             <tr key={t._id}>
//               <td className="p-2 border">{t.title}</td>
//               <td className="p-2 border">{t.description || "-"}</td>
//               <td className="p-2 border">{t.project?.name}</td>
//               <td className="p-2 border">
//                 {t.assignedTo?.length
//                   ? t.assignedTo.map((u) => u.name).join(", ")
//                   : "-"}
//               </td>
//               <td className="p-2 border">
//                 {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}
//               </td>
//               <td className="p-2 border capitalize">{t.priority}</td>
//               <td className="p-2 border capitalize">{t.status}</td>
//               <td className="p-2 border text-center space-x-2">
//                 <button
//                   onClick={() => openModal(t)}
//                   className="text-blue-600 hover:underline"
//                 >
//                   Edit
//                 </button>
//                 <button
//                   onClick={() => handleDelete(t._id)}
//                   className="text-red-600 hover:underline"
//                 >
//                   Delete
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
//           <div className="bg-white rounded-lg p-6 w-[600px] relative">
//             <h2 className="text-xl font-bold mb-4">
//               {editTask ? "Edit Task" : "New Task"}
//             </h2>
//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-4 gap-2 mb-4"
//             >
//               <label className="col-span-2 font-semibold">Title</label>
//               <input
//                 type="text"
//                 placeholder="Task Title"
//                 className="border p-2 rounded col-span-2"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 required
//               />
//               <label className="col-span-2 font-semibold">Description</label>
//               <textarea
//                 placeholder="Task Description"
//                 className="border p-2 rounded col-span-2"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//               ></textarea>
//               <label className="col-span-2 font-semibold">Project</label>
//               <select
//                 className="border p-2 rounded"
//                 value={projectId}
//                 onChange={(e) => setProjectId(e.target.value)}
//                 required
//               >
//                 <option value="">Select Project</option>
//                 {projects.map((p) => (
//                   <option key={p._id} value={p._id}>
//                     {p.name}
//                   </option>
//                 ))}
//               </select>
       
//   <label className="col-span-2 font-semibold">Assigned To</label>
//   <div className="col-span-2">
//     <Select
//       isMulti
//       options={users.map((u) => ({ value: u._id, label: u.name }))}
//       value={assignedTo.map((id) => {
//         const user = users.find((u) => u._id === id);
//         return { value: id, label: user?.name || "" };
//       })}
//       onChange={(selected) => setAssignedTo(selected.map((s) => s.value))}
//       placeholder="Search & select users"
//       className="text-sm"
//     />
//   </div>

//               <label className="col-span-2 font-semibold">Due Date</label>
//               <input
//                 type="date"
//                 className="border p-2 rounded"
//                 value={dueDate}
//                 onChange={(e) => setDueDate(e.target.value)}
//               />
//               <label className="col-span-2 font-semibold">Priority</label>
//               <select
//                 className="border p-2 rounded"
//                 value={priority}
//                 onChange={(e) => setPriority(e.target.value)}
//               >
//                 <option value="low">Low</option>
//                 <option value="medium">Medium</option>
//                 <option value="high">High</option>
//               </select>
//               <label className="col-span-2 font-semibold">Status</label>
//               <select
//                 className="border p-2 rounded"
//                 value={status}
//                 onChange={(e) => setStatus(e.target.value)}
//               >
//                 <option value="todo">To Do</option>
//                 <option value="in-progress">In Progress</option>
//                 <option value="done">Done</option>
//               </select>

//               <div className="col-span-2 flex justify-end gap-2 mt-4">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="px-4 py-2 border rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-blue-600 text-white rounded"
//                 >
//                   {editTask ? "Update" : "Create"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
