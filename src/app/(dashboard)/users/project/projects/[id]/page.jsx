"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/lib/api"; // your axios wrapper
import "gantt-task-react/dist/index.css";

// Load Gantt dynamically (no SSR)
const Gantt = dynamic(() => import("gantt-task-react").then((m) => m.Gantt), {
  ssr: false,
  loading: () => <p>Loading Gantt chart...</p>,
});

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch project details (with tasks inside)
        const res = await api.get(`/project/projects/${id}`, { headers });
        setProject(res.data);

        if (res.data.tasks) {
          const formatted = res.data.tasks.map((t) => ({
            id: t._id,
            name: t.title,
            start: t.startDate ? new Date(t.startDate) : new Date(),
            end: t.dueDate ? new Date(t.dueDate) : new Date(),
            type: "task",
            progress: t.progress ?? 0,
            isDisabled: false,
            dependencies: t.dependencies || [],
          }));
          setTasks(formatted);
        }
      } catch (err) {
        console.error("Error fetching project:", err);
      }
    };

    fetchData();
  }, [id]);

  if (!project) return <p className="p-6">Loading project...</p>;

  return (
    <div className="p-6 space-y-6">
      {/* Project Info */}
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-gray-600">{project.description || "No description"}</p>
      </div>

      {/* Task List */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Tasks</h2>
        {project.tasks?.length > 0 ? (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Assignees</th>
                <th className="p-2 border">Start</th>
                <th className="p-2 border">Due</th>
                <th className="p-2 border">Progress</th>
              </tr>
            </thead>
            <tbody>
              {project.tasks.map((t) => (
                <tr key={t._id}>
                  <td className="p-2 border">{t.title}</td>
                  <td className="p-2 border">
                    {t.assignees?.map((u) => u.name).join(", ") || "-"}
                  </td>
                  <td className="p-2 border">
                    {t.startDate ? new Date(t.startDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 border">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 border">{t.progress ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No tasks for this project.</p>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Gantt Chart</h2>
        {tasks.length > 0 ? (
          <Gantt
            tasks={tasks}
            viewMode="Week" // Day | Week | Month
            onClick={(task) => console.log("Clicked task:", task)}
            onDateChange={(task, start, end) =>
              console.log("Date changed:", task, start, end)
            }
            onProgressChange={(task, progress) =>
              console.log("Progress changed:", task, progress)
            }
          />
        ) : (
          <p>No tasks to show in Gantt chart.</p>
        )}
      </div>
    </div>
  );
}
