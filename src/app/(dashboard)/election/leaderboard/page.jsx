"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { FiTrophy, FiUserCheck } from "react-icons/fi";

export default function LeaderboardPage() {
  const [workers, setWorkers] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.get("/api/election/worker/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setWorkers(res.data.data);
    };
    fetchData();
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-6">🏆 Worker Leaderboard</h1>
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contacts</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Surveys</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workers.map((w, idx) => (
              <tr key={w._id}>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700">{idx+1}</td>
                <td className="px-6 py-4">
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.workerRole}</p>
                </td>
                <td className="px-6 py-4 text-center">{w.totalContacts}</td>
                <td className="px-6 py-4 text-center">{w.totalSurveys}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}