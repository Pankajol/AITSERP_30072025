"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("active");

  // fetch projects + workspaces
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          api.get("/project/projects"),
          api.get("/project/workspaces"),
        ]);
        console.log("all project data",pRes.data);
        console.log(wRes.data);
        setProjects(pRes.data);
        setWorkspaces(wRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // open modal
  const openModal = (project = null) => {
    setEditProject(project);
    setName(project ? project.name : "");
    setWorkspaceId(project ? project.workspace?._id : "");
    setStatus(project ? project.status : "active");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditProject(null);
    setName("");
    setWorkspaceId("");
    setStatus("active");
  };

  // add / edit project
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProject) {
        // update
        const res = await api.put(`/project/projects/${editProject._id}`, {
          name,
          workspace: workspaceId,
          status,
        });
        setProjects((prev) =>
          prev.map((p) => (p._id === editProject._id ? res.data : p))
        );
      } else {
        // create
        const res = await api.post("/project/projects", {
          name,
          workspace: workspaceId,
          status,
        });
        setProjects([...projects, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // delete
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/project/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => openModal()}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          + Add Project
        </button>
      </div>

      {/* Projects Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Workspace</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p._id}>
              <td className="p-2 border">{p.name}</td>
              <td className="p-2 border">{p.workspace?.name}</td>
              <td className="p-2 border">{p.status}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => openModal(p)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">
              {editProject ? "Edit Project" : "Add Project"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <input
                type="text"
                placeholder="Project Name"
                className="border p-2 rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <select
                className="border p-2 rounded"
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
                className="border p-2 rounded"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                >
                  {editProject ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
