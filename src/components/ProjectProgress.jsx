"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProjectProgress() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get("/project/projects"); // fetch projects
        const allProjects = res.data;

        // Fetch tasks and map them by project
        const tRes = await api.get("/task/tasks");
        const tasks = tRes.data;

        const projectsWithProgress = allProjects.map((proj) => {
          const projTasks = tasks.filter((t) => t.project?._id === proj._id);
          const total = projTasks.length;
          const completed = projTasks.filter((t) => t.status === "done").length;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            ...proj,
            total,
            completed,
            percent,
          };
        });

        setProjects(projectsWithProgress);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProgress();
  }, []);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <h2 className="text-lg font-bold mb-4">Projects Progress</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Project</th>
            <th className="p-2 border">Completed</th>
            <th className="p-2 border">Progress</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p._id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">
                {p.completed}/{p.total}
              </td>
              <td className="p-2 border">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${p.percent}%` }}
                  ></div>
                </div>
                <span className="text-sm">{p.percent}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
