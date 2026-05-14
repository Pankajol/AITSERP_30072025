"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("active");
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get("/workspaces");
        setWorkspaces(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkspaces();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/projects", { name, workspace: workspaceId, status });
      router.push("/projects");
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("Could not create project");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Project</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Project Name"
          className="border p-2 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select
          className="border p-2 rounded w-full"
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          required
        >
          <option value="">Select Workspace</option>
          {workspaces.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>

        <button className="bg-purple-600 text-white px-4 py-2 rounded w-full">
          Create Project
        </button>
      </form>
    </div>
  );
}
