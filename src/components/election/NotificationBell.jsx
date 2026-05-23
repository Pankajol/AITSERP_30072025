// components/election/NotificationBell.jsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiBell } from "react-icons/fi";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/election/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const notifs = res.data.data;
        setUnreadCount(notifs.length);
        notifs.forEach(notif => {
          toast.info(notif.message, {
            onClick: () => {
              // mark as read
              axios.put("/api/election/notifications", { notificationId: notif._id }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              // redirect if survey
              if (notif.data?.surveyId) {
                window.location.href = `/election/survey-response?surveyId=${notif.data.surveyId}`;
              }
            }
          });
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="relative">
      <FiBell className="text-gray-500 hover:text-indigo-600 cursor-pointer" size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
}