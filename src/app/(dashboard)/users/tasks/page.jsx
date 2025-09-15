"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState("");
  const [progress, setProgress] = useState("");

  // Token
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await api.get("/project/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
      // auto-refresh selectedTask
      if (selectedTask) {
        const fresh = res.data.find((t) => t._id === selectedTask._id);
        console.log(fresh);
        if (fresh) {
          setSelectedTask(fresh);
          setProgress(fresh.progress || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    // ⏱ auto refresh every 10s
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update task (status/progress)
  const updateTask = async (id, newStatus, newProgress) => {
    try {
      const res = await api.put(
        `/project/tasks/${id}`,
        { status: newStatus, progress: newProgress },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data;

      setTasks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, ...updated } : t))
      );

      if (selectedTask && selectedTask._id === id) {
        setSelectedTask(updated);
        setProgress(updated.progress);
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  // Add comment
  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      const res = await api.post(
        `/project/comments`,
        { text: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newComment = res.data;

      setSelectedTask((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment],
      }));

      setComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">📋 My Tasks</h1>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task._id}
            onClick={() => {
              setSelectedTask(task);
              setProgress(task.progress || 0);
            }}
            className="p-5 bg-white border rounded-lg shadow hover:shadow-lg flex justify-between items-center cursor-pointer transition"
          >
            <div>
              <p className="font-semibold text-blue-600 text-lg">
                {task.title}
              </p>
              <p className="text-gray-500 text-sm">{task.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                Progress: {task.progress || 0}% | Status: {task.status}
              </p>
            </div>

            <select
              value={task.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateTask(task._id, e.target.value, task.progress)
              }
              className="border rounded px-3 py-2 text-sm cursor-pointer focus:ring focus:ring-blue-300"
            >
              <option value="todo">📝 Todo</option>
              <option value="in-progress">🚧 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="text-center text-gray-500">No tasks found 🚀</p>
        )}
      </div>

      {/* Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-lg relative animate-fadeIn">
            {/* Close */}
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
            >
              ✖
            </button>

            {/* Task Details */}
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {selectedTask.title}
            </h2>
            <p className="text-gray-600 mb-4">{selectedTask.description}</p>

            {/* Status */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedTask.status}
              onChange={(e) =>
                updateTask(selectedTask._id, e.target.value, progress)
              }
              className="w-full border rounded px-3 py-2 mb-4 focus:ring focus:ring-blue-300"
            >
              <option value="todo">📝 Todo</option>
              <option value="in-progress">🚧 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>

            {/* Progress */}
            <h3 className="font-semibold text-gray-700 mt-4 mb-2">Progress</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="Enter progress %"
                min="0"
                max="100"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-300"
              />
              <button
                onClick={() =>
                  updateTask(selectedTask._id, selectedTask.status, progress)
                }
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Save
              </button>
            </div>

            {/* Comments */}
            <h3 className="font-semibold text-gray-700 mt-4 mb-2">
              💬 Comments
            </h3>
            <ul className="mb-3 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {(selectedTask.comments || []).length > 0 ? (
                selectedTask.comments.map((c, i) => (
                  <li
                    key={i}
                    className="bg-white p-2 rounded shadow mb-2 text-sm"
                  >
                    {c.text}
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No comments yet.</p>
              )}
            </ul>

            {/* Add comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring focus:ring-blue-300"
              />
              <button
                onClick={addComment}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/////////////////////////////////////////////////////////////


// "use client";
// import { useEffect, useState } from "react";
// // import DashboardLayout from "@/components/DashboardLayout";
// import axios from "axios";
// import api from "@/lib/api";
// import Link from "next/link";
// export default function TasksPage() {
//   const [tasks, setTasks] = useState([]);

//   useEffect(() => {
//     api.get("/project/tasks").then((res) => setTasks(res.data));
//   }, []);

//   const updateStatus = async (id, newStatus) => {
//     await api.put(`/project/tasks/${id}`, { status: newStatus });
//     setTasks(tasks.map((t) => (t._id === id ? { ...t, status: newStatus } : t)));
//   };

//   return (
//     <>
//       <h1 className="text-xl font-bold mb-4">My Tasks</h1>
//       <div className="space-y-4">
//         {tasks.map((task) => (
//           <div key={task._id} className="p-4 bg-white shadow rounded flex justify-between items-center">
//             <div>
//                 <div>
//       {tasks.map((task) => (
//         <div key={task._id} className="p-2 border-b">
//           <Link href={`/users/tasks/${task._id}`}>
//             {task.title}
//           </Link>
//         </div>
//       ))}
//     </div>
//               <p className="text-gray-600">{task.description}</p>
//             </div>
//             <select
//               value={task.status}
//               onChange={(e) => updateStatus(task._id, e.target.value)}
//               className="border rounded px-2 py-1"
//             >
//               <option value="todo">Todo</option>
//               <option value="in-progress">In Progress</option>
//               <option value="completed">Completed</option>
//             </select>
//           </div>
//         ))}
//       </div>
//     </>
//   );
// }
