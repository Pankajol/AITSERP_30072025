"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const token = localStorage.getItem("token");
      if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const res = await api.get("/auth/me");
      setUser(res.data);
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      {user && (
        <div className="bg-white p-6 rounded shadow">
          <p><b>Name:</b> {user.name}</p>
          <p><b>Email:</b> {user.email}</p>
        </div>
      )}
    </div>
  );
}
