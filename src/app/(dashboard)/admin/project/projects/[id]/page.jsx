"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/tasks?projectId=${id}`), // fetch tasks linked to project
        ]);
        setProject(pRes.data);
        setTasks(tRes.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load project details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${id}`);
      router.push("/projects");
    } catch (err) {
      console.error(err);
      setError("Failed to delete project");
    }
  };

  if (loading) return <p className="p-6">Loading project...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!project) return <p className="p-6">Project not found</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
      <p className="mb-4 text-gray-600">
        Status: <span className="font-medium">{project.status}</span>
      </p>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => router.push(`/projects/${id}/edit`)}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Delete
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Tasks</h2>
      <button
        onClick={() => router.push(`/tasks/new?projectId=${id}`)}
        className="bg-green-600 text-white px-4 py-2 rounded mb-4"
      >
        + Add Task
      </button>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Task</th>
            <th className="p-2 border">Assignee</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length > 0 ? (
            tasks.map((t) => (
              <tr key={t._id}>
                <td className="p-2 border">{t.title}</td>
                <td className="p-2 border">{t.assignee?.name || "Unassigned"}</td>
                <td className="p-2 border">{t.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="p-4 text-center text-gray-500">
                No tasks yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
