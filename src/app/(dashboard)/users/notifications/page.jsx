"use client";
import { useEffect, useState } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
import axios from "axios";
import api from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get("/project/notifications").then((res) => setNotifications(res.data));
  }, []);

  return (

    <>
      <h1 className="text-xl font-bold mb-4">Notifications</h1>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n._id} className="p-3 bg-white shadow rounded">
            <p>{n.message}</p>
            <span className="text-xs text-gray-500">{n.type}</span>
          </div>
        ))}
      </div>
    </>
   
  );
}
