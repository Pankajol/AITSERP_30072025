"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProjectProgressChart() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const pRes = await api.get("/project/projects");
        const tRes = await api.get("/project/tasks");

        const allProjects = pRes.data;
        const tasks = tRes.data;

        const chartData = allProjects.map((proj) => {
          const projTasks = tasks.filter((t) => t.project?._id === proj._id);
          const total = projTasks.length;
          const completed = projTasks.filter((t) => t.status === "completed").length;
          const pending = total - completed;

          return {
            name: proj.name,
            Completed: completed,
            Pending: pending,
          };
        });

        setProjects(chartData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <h2 className="text-lg font-bold mb-4">Projects Progress</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={projects}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Completed" fill="#4ade80" />
          <Bar dataKey="Pending" fill="#f87171" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
