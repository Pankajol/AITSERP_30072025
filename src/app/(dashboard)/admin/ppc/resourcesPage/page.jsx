"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";

const ResourcePage = () => {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentResource, setCurrentResource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/ppc/resources?searchQuery=${searchQuery}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error("Failed to fetch resources");
      const data = await response.json();
      setResources(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const openModal = (resource = null) => {
    setCurrentResource(resource ? { ...resource } : { code: "", name: "", unitPrice: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentResource(null);
  };

  const handleSave = async () => {
    const method = currentResource._id ? "PUT" : "POST";
    const url = currentResource._id
      ? `/api/ppc/resources/${currentResource._id}`
      : "/api/ppc/resources"; // ✅ fixed wrong path

    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(currentResource),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to save resource");
      }
      await fetchResources();
      closeModal();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      try {
        const response = await fetch(`/api/ppc/resources/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "Failed to delete resource");
        }
        await fetchResources();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Resource Management
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or code..."
              className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Search
            </button>
          </form>
          <button
            onClick={() => openModal()}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Resource
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Cost</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{resource.code}</td>
                  <td className="p-4">{resource.name}</td>
                  <td className="p-4">{`$${resource.unitPrice}`}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => openModal(resource)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {currentResource?._id ? "Edit Resource" : "Add Resource"}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Code"
                value={currentResource.code}
                onChange={(e) =>
                  setCurrentResource({ ...currentResource, code: e.target.value })
                }
                className="w-full p-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Name"
                value={currentResource.name}
                onChange={(e) =>
                  setCurrentResource({ ...currentResource, name: e.target.value })
                }
                className="w-full p-2 border rounded-md"
              />
              <input
                type="number"
                placeholder="Cost"
                value={currentResource.unitPrice}
                onChange={(e) =>
                  setCurrentResource({ ...currentResource, unitPrice: e.target.value })
                }
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcePage;
