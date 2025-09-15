"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const token = localStorage.getItem("token");
      if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const res = await api.get("/project/projects");
      setProjects(res.data);
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Projects</h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p._id} className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-gray-600">{p.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
