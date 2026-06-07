"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { FaTasks, FaUser, FaCalendarAlt, FaCheckCircle, FaClock, FaComment, FaFileAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import Link from "next/link";

export default function ActivityTimeline({ entityType, entityId, entityName }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, tasks, comments

  useEffect(() => {
    fetchActivities();
  }, [entityType, entityId]);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/activities?entity=${entityType}&entityId=${entityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivities(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load activity timeline");
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "task":
        return <FaTasks className="text-indigo-500" />;
      case "comment":
        return <FaComment className="text-green-500" />;
      case "attachment":
        return <FaFileAlt className="text-amber-500" />;
      default:
        return <FaCalendarAlt className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === "done") return <span className="text-green-600 bg-green-50 text-[10px] px-2 py-0.5 rounded-full">Completed</span>;
    if (status === "in-progress") return <span className="text-blue-600 bg-blue-50 text-[10px] px-2 py-0.5 rounded-full">In Progress</span>;
    return <span className="text-gray-500 bg-gray-100 text-[10px] px-2 py-0.5 rounded-full">Pending</span>;
  };

  const filteredActivities = activities.filter((act) => {
    if (filter === "all") return true;
    return act.type === filter;
  });

  if (loading) return <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400">Loading timeline...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FaCalendarAlt className="text-indigo-500" /> Activity Timeline
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1 rounded-full transition ${filter === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("task")}
            className={`text-xs px-3 py-1 rounded-full transition ${filter === "task" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Tasks
          </button>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No activities yet. Create tasks or add comments to see timeline.</p>
      ) : (
        <div className="relative pl-6 border-l-2 border-gray-100 space-y-6">
          {filteredActivities.map((activity, idx) => (
            <div key={activity._id || idx} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-300 flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.type)}
                    <span className="font-semibold text-gray-800">
                      {activity.type === "task" ? "Task" : activity.type === "comment" ? "Comment" : "Activity"}
                    </span>
                    {activity.status && getStatusBadge(activity.status)}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(activity.createdAt).toLocaleString()}</span>
                </div>

                <div className="mt-2">
                  {activity.type === "task" ? (
                    <>
                      <Link
                        href={`/admin/tasks/${activity._id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {activity.title}
                      </Link>
                      {activity.description && <p className="text-sm text-gray-500 mt-1">{activity.description}</p>}
                      {activity.assignees?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <FaUser size={10} /> {activity.assignees.map((a) => a.name).join(", ")}
                        </div>
                      )}
                      {activity.dueDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <FaClock size={10} /> Due: {new Date(activity.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </>
                  ) : activity.type === "comment" ? (
                    <>
                      <p className="text-sm text-gray-700">{activity.text}</p>
                      <p className="text-xs text-gray-400 mt-1">By: {activity.user?.name || "Unknown"}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">{activity.description || "Activity recorded"}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}