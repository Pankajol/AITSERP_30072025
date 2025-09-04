"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function TaskTimelineChart() {
  const [data, setData] = useState([]);
  const [view, setView] = useState("daily"); // daily | weekly | monthly

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await api.get("/task/tasks");
        const tasks = res.data;

        const completedTasks = tasks.filter((t) => t.status === "done");

        // Group based on view
        const grouped = {};

        completedTasks.forEach((task) => {
          if (!task.updatedAt) return;
          const dateObj = new Date(task.updatedAt);

          let key = "";

          if (view === "daily") {
            key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
          } else if (view === "weekly") {
            // get ISO week number
            const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
            const pastDaysOfYear =
              (dateObj - firstDayOfYear) / (1000 * 60 * 60 * 24);
            const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            key = `${dateObj.getFullYear()}-W${week}`;
          } else if (view === "monthly") {
            key = `${dateObj.getFullYear()}-${String(
              dateObj.getMonth() + 1
            ).padStart(2, "0")}`; // YYYY-MM
          }

          grouped[key] = (grouped[key] || 0) + 1;
        });

        // Convert into recharts format (sorted by key)
        const chartData = Object.keys(grouped)
          .sort()
          .map((k) => ({
            date: k,
            completed: grouped[k],
          }));

        setData(chartData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTimeline();
  }, [view]);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Tasks Completed Over Time</h2>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#3b82f6"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
