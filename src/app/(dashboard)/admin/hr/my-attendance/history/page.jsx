"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function History() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get("/api/hr/my-attendance/history", {
      headers: { Authorization: `Bearer ${token}` },
    });

    setData(res.data.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Attendance History</h1>

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th>Date</th>
            <th>In</th>
            <th>Out</th>
            <th>Hours</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((a) => (
            <tr key={a._id}>
              <td>{a.date}</td>
              <td>{a.punchIn?.time}</td>
              <td>{a.punchOut?.time}</td>
              <td>{a.totalHours}</td>
              <td>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}