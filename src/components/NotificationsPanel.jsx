"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/project/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ✅ Mark single as read
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        "/project/notifications",
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await api.put(
        "/project/notifications",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  return (
    <div className="p-4 bg-white shadow rounded">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold">Notifications</h2>
        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-500 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p>No notifications yet</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`border-b pb-2 ${
                n.read ? "opacity-60" : "font-bold"
              }`}
            >
              <p className="text-sm">{n.message}</p>
              {n.task && <p className="text-xs">Task: {n.task.title}</p>}
              {n.project && <p className="text-xs">Project: {n.project.name}</p>}
              {!n.read && (
                <button
                  onClick={() => markAsRead(n._id)}
                  className="text-xs text-green-500 hover:underline mt-1"
                >
                  Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
