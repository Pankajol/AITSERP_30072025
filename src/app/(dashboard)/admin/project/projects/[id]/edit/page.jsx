"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function EditProjectPage() {
  const { id } = useParams();
  const router = useRouter();

  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("active");
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get("/workspaces"),
        ]);
        setName(pRes.data.name);
        setWorkspaceId(pRes.data.workspace?._id || "");
        setStatus(pRes.data.status);
        setWorkspaces(wRes.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${id}`, {
        name,
        workspace: workspaceId,
        status,
      });
      router.push(`/projects/${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to update project");
    }
  };

  if (loading) return <p className="p-6">Loading project...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Project</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleUpdate} className="space-y-4">
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
          Update Project
        </button>
      </form>
    </div>
  );
}
