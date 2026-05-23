// components/election/WorkerLeaderboard.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { FiAward, FiUsers, FiTrendingUp } from "react-icons/fi"; // ✅ FiAward instead of FiTrophy

export default function WorkerLeaderboard() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get("/api/election/worker/leaderboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setWorkers(res.data.data);
      } catch (err) {
        console.error("Leaderboard error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [token]);

  if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />;
  if (workers.length === 0) return <div className="text-gray-400 text-sm">No worker activity yet.</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4">
      <div className="flex items-center gap-2 mb-4">
        <FiAward className="text-yellow-500" size={20} /> {/* ✅ Changed to FiAward */}
        <h3 className="font-semibold text-gray-800">Worker Leaderboard</h3>
      </div>
      <div className="space-y-3">
        {workers.map((worker, idx) => (
          <div key={worker._id} className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-500 w-6">{idx+1}</span>
              <div>
                <p className="font-medium text-gray-800">{worker.name}</p>
                <p className="text-xs text-gray-400">{worker.workerRole || 'Worker'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{worker.totalContacts} contacts</p>
              <p className="text-xs text-gray-500">{worker.totalSurveys} surveys</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}