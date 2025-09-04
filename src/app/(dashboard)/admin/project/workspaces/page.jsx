"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get("/project/workspaces");
        setWorkspaces(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkspaces();
  }, []);

  // open modal (add/edit)
  const openModal = (workspace = null) => {
    setEditWorkspace(workspace);
    setName(workspace ? workspace.name : "");
    setDescription(workspace ? workspace.description : "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditWorkspace(null);
    setName("");
    setDescription("");
  };

  // add / edit workspace
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editWorkspace) {
        // update
        const res = await api.put(`/project/workspaces/${editWorkspace._id}`, {
          name,
          description,
        });
        setWorkspaces((prev) =>
          prev.map((w) => (w._id === editWorkspace._id ? res.data : w))
        );
      } else {
        // create
        const res = await api.post("/project/workspaces", { name, description });
        setWorkspaces([...workspaces, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // delete workspace
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter((w) => w._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workspaces</h1>
        <button
          onClick={() => openModal()}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Workspace
        </button>
      </div>

      {/* Workspaces Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((w) => (
            <tr key={w._id}>
              <td className="p-2 border">{w.name}</td>
              <td className="p-2 border">{w.description || "-"}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => openModal(w)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(w._id)}
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
              {editWorkspace ? "Edit Workspace" : "Add Workspace"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <input
                type="text"
                placeholder="Workspace Name"
                className="border p-2 rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description"
                className="border p-2 rounded"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  {editWorkspace ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
