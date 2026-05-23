"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiSave, FiPlus, FiTrash2 } from "react-icons/fi";

export default function WorkerActivityPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [activities, setActivities] = useState([
    { type: "DoorToDoor", votersContacted: 0, newSurveys: 0, summary: "" }
  ]);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // अपनी पिछली रिपोर्ट्स लोड करें
  useEffect(() => {
    if (!token) return;
    const fetchReports = async () => {
      try {
        const { data } = await axios.get("/api/election/worker/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success && data.data.workerReports) {
          setReports(data.data.workerReports.reverse());
        }
      } catch (e) { console.error(e); }
      finally { setLoadingReports(false); }
    };
    fetchReports();
  }, [token]);

  const addActivity = () => {
    setActivities([...activities, { type: "DoorToDoor", votersContacted: 0, newSurveys: 0, summary: "" }]);
  };

  const removeActivity = (idx) => {
    setActivities(activities.filter((_, i) => i !== idx));
  };

  const updateActivity = (idx, field, value) => {
    const updated = [...activities];
    updated[idx][field] = value;
    setActivities(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await axios.post("/api/election/worker/report", {
        date,
        activities: activities.map(a => ({
          ...a,
          votersContacted: Number(a.votersContacted),
          newSurveys: Number(a.newSurveys),
        })),
      }, { headers: { Authorization: `Bearer ${token}` } });
      // रीफ़्रेश रिपोर्ट्स
      const { data } = await axios.get("/api/election/worker/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && data.data.workerReports) {
        setReports(data.data.workerReports.reverse());
      }
      setDate(new Date().toISOString().slice(0, 10));
      setActivities([{ type: "DoorToDoor", votersContacted: 0, newSurveys: 0, summary: "" }]);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save report");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Daily Activity Report</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border mb-8">
        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
            />
          </div>

          {activities.map((act, idx) => (
            <div key={idx} className="border rounded-xl p-4 bg-gray-50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Activity #{idx + 1}</span>
                {activities.length > 1 && (
                  <button type="button" onClick={() => removeActivity(idx)} className="text-red-400 hover:text-red-600">
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={act.type}
                  onChange={(e) => updateActivity(idx, "type", e.target.value)}
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm"
                >
                  <option value="DoorToDoor">Door to Door</option>
                  <option value="PhoneCall">Phone Call</option>
                  <option value="Rally">Rally</option>
                  <option value="Meeting">Meeting</option>
                </select>
                <input
                  type="number"
                  placeholder="Voters contacted"
                  value={act.votersContacted}
                  onChange={(e) => updateActivity(idx, "votersContacted", e.target.value)}
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm"
                />
                <input
                  type="number"
                  placeholder="New surveys"
                  value={act.newSurveys}
                  onChange={(e) => updateActivity(idx, "newSurveys", e.target.value)}
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm"
                />
                <input
                  type="text"
                  placeholder="Summary"
                  value={act.summary}
                  onChange={(e) => updateActivity(idx, "summary", e.target.value)}
                  className="py-2 px-3 rounded-xl border border-gray-200 text-sm col-span-2"
                />
              </div>
            </div>
          ))}

          <button type="button" onClick={addActivity}
            className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:underline">
            <FiPlus /> Add Another Activity
          </button>

          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <FiSave /> {saving ? "Saving..." : "Save Report"}
          </button>
        </form>
      </div>

      {/* Past Reports */}
      <h2 className="text-xl font-bold text-gray-800 mb-4">Your Previous Reports</h2>
      {loadingReports ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-10 text-gray-400">No reports yet</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border">
              <p className="text-sm font-bold text-gray-700">{new Date(report.date).toLocaleDateString()}</p>
              {report.activities.map((act, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>{act.type} – {act.votersContacted} voters, {act.newSurveys} surveys</span>
                  <span className="text-xs text-gray-400">{act.summary}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}