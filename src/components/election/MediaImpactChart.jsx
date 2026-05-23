// components/election/MediaImpactChart.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MediaImpactChart() {
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCampaigns = async () => {
      const res = await axios.get("/api/election/media?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const chartData = res.data.data.map(c => ({
          name: c.title.slice(0, 15),
          reach: c.reach,
          engagement: c.engagement,
        }));
        setData(chartData);
      }
    };
    fetchCampaigns();
  }, [token]);

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="font-bold mb-4">Media Campaign Impact</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="reach" fill="#3b5998" name="Reach" />
          <Bar dataKey="engagement" fill="#1da1f2" name="Engagement" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}