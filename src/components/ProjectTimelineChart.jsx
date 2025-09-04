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
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProjectTimelineChart() {
  const [data, setData] = useState([]);
  const [view, setView] = useState("daily");
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get("/workspace/workspaces");
        setWorkspaces(res.data);
        if (res.data.length > 0) setSelectedWorkspace(res.data[0]._id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!selectedWorkspace) return;
      try {
        const [pRes, tRes] = await Promise.all([
          api.get("/project/projects"),
          api.get("/task/tasks"),
        ]);

        const projects = pRes.data.filter(
          (p) => p.workspace?._id === selectedWorkspace
        );
        const tasks = tRes.data.filter(
          (t) =>
            t.status === "done" &&
            t.project?.workspace?._id === selectedWorkspace
        );

        const grouped = {};
        tasks.forEach((task) => {
          if (!task.updatedAt || !task.project?._id) return;
          const dateObj = new Date(task.updatedAt);
          let key = "";

          if (view === "daily") {
            key = dateObj.toISOString().split("T")[0];
          } else if (view === "weekly") {
            const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
            const pastDaysOfYear =
              (dateObj - firstDayOfYear) / (1000 * 60 * 60 * 24);
            const week = Math.ceil(
              (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
            );
            key = `${dateObj.getFullYear()}-W${week}`;
          } else if (view === "monthly") {
            key = `${dateObj.getFullYear()}-${String(
              dateObj.getMonth() + 1
            ).padStart(2, "0")}`;
          }

          if (!grouped[key]) grouped[key] = {};
          const projName =
            projects.find((p) => p._id === task.project._id)?.name || "Unknown";
          grouped[key][projName] = (grouped[key][projName] || 0) + 1;
        });

        const chartData = Object.keys(grouped)
          .sort()
          .map((date) => ({ date, ...grouped[date] }));

        setData(chartData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchTimeline();
  }, [view, selectedWorkspace]);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Projects Task Timeline</h2>
        <div className="flex gap-2">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="border p-2 rounded"
          >
            {workspaces.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name}
              </option>
            ))}
          </select>
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
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {data.length > 0 &&
            Object.keys(data[0])
              .filter((key) => key !== "date")
              .map((projName, idx) => (
                <Line
                  key={projName}
                  type="monotone"
                  dataKey={projName}
                  strokeWidth={2}
                  stroke={["#3b82f6", "#22c55e", "#f97316", "#e11d48"][
                    idx % 4
                  ]}
                />
              ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
