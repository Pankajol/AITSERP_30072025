"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the gantt so it only runs on client
const Gantt = dynamic(() => import("frappe-gantt-react"), {
  ssr: false,
  loading: () => <p>Loading Gantt chart...</p>,
});

export default function ProjectTasksModal({ project, onClose }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (project?.tasks) {
      const formatted = project.tasks.map((t) => ({
        id: t._id,
        name: t.title,
        start: t.startDate ? new Date(t.startDate) : new Date(),
        end: t.dueDate ? new Date(t.dueDate) : new Date(),
        progress: t.progress ?? 0,
        dependencies: t.dependencies?.join(",") || "",
      }));
      setTasks(formatted);
    }
  }, [project]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-5xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{project.name} - Tasks</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Gantt Chart */}
        <div className="overflow-x-auto">
          {tasks.length > 0 ? (
            <Gantt
              tasks={tasks}
              viewMode="Day" // Day | Week | Month
              onClick={(task) => console.log("Clicked task:", task)}
              onDateChange={(task, start, end) =>
                console.log("Date changed:", task, start, end)
              }
              onProgressChange={(task, progress) =>
                console.log("Progress changed:", task, progress)
              }
            />
          ) : (
            <p className="text-gray-500">No tasks available for this project.</p>
          )}
        </div>
      </div>
    </div>
  );
}
