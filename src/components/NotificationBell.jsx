"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react"; // bell icon

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/project/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // adjust if you store token differently
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    try {
      const ids = notifications.filter((n) => !n.read).map((n) => n._id);
      if (!ids.length) return;

      await fetch("/api/project/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ids }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-gray-200"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-center px-3 py-2 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No notifications
              </p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <li
                    key={n._id}
                    className={`p-2 rounded-md text-sm ${
                      n.read ? "bg-gray-50" : "bg-blue-50"
                    }`}
                  >
                    <p>{n.message}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
