"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function TaskProgress() {
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percent: 0,
  });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get("/task/tasks"); // fetch all tasks
        const tasks = res.data;

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === "done").length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        setProgress({ total, completed, percent });
      } catch (err) {
        console.error(err);
      }
    };

    fetchProgress();
  }, []);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <h2 className="text-lg font-bold mb-2">Task Completion</h2>
      <p>
        Completed: {progress.completed}/{progress.total} (
        {progress.percent}%)
      </p>
      <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
        <div
          className="bg-green-600 h-4 rounded-full"
          style={{ width: `${progress.percent}%` }}
        ></div>
      </div>
    </div>
  );
}
