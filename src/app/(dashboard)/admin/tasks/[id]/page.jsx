"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function TaskDetails() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newComment, setNewComment] = useState("");

  // fetch task, comments, logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, cRes, lRes] = await Promise.all([
          api.get(`/project/tasks/${id}`),
          api.get(`/project/comments?task=${id}`),
          api.get(`/project/activitylogs?task=${id}`),
        ]);
        setTask(tRes.data);
        setComments(cRes.data);
        setLogs(lRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [id]);

  // add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/project/comments", {
        task: id,
        text: newComment,
      });
      setComments([...comments, res.data]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
  };

  if (!task) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 grid grid-cols-3 gap-6">
      {/* Task Info */}
      <div className="col-span-2 bg-white shadow rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
        <p className="text-gray-600 mb-2">
          Project: {task.project?.name || "—"}
        </p>
        <p className="text-gray-600 mb-2">
          Assigned: {task.assignedTo?.name || "Unassigned"}
        </p>
        <p className="text-gray-600 mb-2">Status: {task.status}</p>
        <p className="text-gray-600 mb-2">Priority: {task.priority}</p>
        <p className="text-gray-600 mb-2">
          Due:{" "}
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
        </p>
      </div>

      {/* Comments */}
      <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Comments</h2>

        <div className="flex-1 overflow-y-auto mb-3 space-y-2">
          {comments.map((c) => (
            <div key={c._id} className="border-b pb-2">
              <p className="text-sm">
                <span className="font-semibold">{c.user?.name}:</span> {c.text}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            className="border p-2 rounded flex-1"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            required
          />
          <button className="bg-blue-600 text-white px-3 py-1 rounded">
            Send
          </button>
        </form>
      </div>

      {/* Activity Logs */}
      <div className="col-span-3 bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Activity Log</h2>
        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
          {logs.map((log) => (
            <li key={log._id} className="text-sm">
              <span className="font-semibold">{log.user?.name}</span>{" "}
              {log.action} → <span className="italic">{log.details}</span>{" "}
              <span className="text-gray-400 text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
