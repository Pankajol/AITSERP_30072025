"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#4ade80", "#f87171"]; // green = done, red = pending

export default function TaskProgressChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get("/task/tasks");
        const tasks = res.data;

        const completed = tasks.filter((t) => t.status === "done").length;
        const pending = tasks.length - completed;

        setData([
          { name: "Completed", value: completed },
          { name: "Pending", value: pending },
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div className="bg-white shadow p-4 rounded mb-6">
      <h2 className="text-lg font-bold mb-4">Task Completion</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            dataKey="value"
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
