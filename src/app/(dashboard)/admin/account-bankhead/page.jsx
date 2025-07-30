"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AccountHeadPage() {
  const [accountHeads, setAccountHeads] = useState([]);
  const [accountHeadCode, setAccountHeadCode] = useState("");
  const [accountHeadDescription, setAccountHeadDescription] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ✅ Fetch all account heads
  const fetchAccountHeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/account-head", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setAccountHeads(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to fetch data");
      }
    } catch (error) {
      toast.error("Error fetching account heads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountHeads();
  }, []);

  // ✅ Handle Submit (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token");
    const payload = { accountHeadCode, accountHeadDescription, status };

    try {
      if (editingId) {
        // ✅ Update
        const res = await axios.put(`/api/account-head/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Account head updated");
          setAccountHeads((prev) =>
            prev.map((item) => (item._id === editingId ? res.data.data : item))
          );
          setEditingId(null);
        } else {
          toast.error(res.data.message);
        }
      } else {
        // ✅ Create
        const res = await axios.post("/api/account-head", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Account head created");
          setAccountHeads([...accountHeads, res.data.data]);
        } else {
          toast.error(res.data.message);
        }
      }

      // Reset form
      setAccountHeadCode("");
      setAccountHeadDescription("");
      setStatus("");
    } catch (error) {
      toast.error("Error saving account head");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Edit Handler
  const handleEdit = (head) => {
    setAccountHeadCode(head.accountHeadCode);
    setAccountHeadDescription(head.accountHeadDescription);
    setStatus(head.status);
    setEditingId(head._id);
  };

  // ✅ Delete Handler
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this account head?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/account-head/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Deleted successfully");
        setAccountHeads(accountHeads.filter((item) => item._id !== id));
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Error deleting account head");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg">
      <ToastContainer />
      <h2 className="text-2xl font-bold mb-4">
        {editingId ? "Edit Account Head" : "Add Account Head"}
      </h2>

      {/* ✅ Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Account Head Code"
          value={accountHeadCode}
          onChange={(e) => setAccountHeadCode(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
        <input
          type="text"
          placeholder="Account Head Description"
          value={accountHeadDescription}
          onChange={(e) => setAccountHeadDescription(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border rounded p-2"
          required
        >
          <option value="">Select Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 text-white rounded ${
              editingId ? "bg-green-600" : "bg-blue-600"
            }`}
          >
            {saving ? "Saving..." : editingId ? "Update" : "Create"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setAccountHeadCode("");
                setAccountHeadDescription("");
                setStatus("");
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ✅ List */}
      <h3 className="text-xl font-semibold mb-3">Account Heads</h3>
      {loading ? (
        <p className="text-blue-500">Loading...</p>
      ) : accountHeads.length === 0 ? (
        <p>No account heads found.</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Code</th>
              <th className="border px-4 py-2">Description</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accountHeads.map((head) => (
              <tr key={head._id}>
                <td className="border px-4 py-2">{head.accountHeadCode}</td>
                <td className="border px-4 py-2">{head.accountHeadDescription}</td>
                <td className="border px-4 py-2">{head.status}</td>
                <td className="border px-4 py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(head)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(head._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}





// "use client";
// import React, { useState } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const AccountHeadDetails = () => {
//   const [formData, setFormData] = useState({
//     accountHeadCode: "",
//     accountHeadDescription: "",
//     status: "",
//   });

//   const validateForm = () => {
//     if (!formData.accountHeadCode.trim()) {
//       toast.error("Account head code is required");
//       return false;
//     }
//     if (!formData.accountHeadDescription.trim()) {
//       toast.error("Account head description is required");
//       return false;
//     }
//     if (!formData.status) {
//       toast.error("Please select a status");
//       return false;
//     }
//     return true;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/account-head", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
          
//         },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok) {
//         console.log("Submitted Account Head Details:", result.data);
//         toast.success("Account head details submitted successfully!");
//         // Optionally clear the form after successful submission:
//         setFormData({
//           accountHeadCode: "",
//           accountHeadDescription: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting form");
//       }
//     } catch (error) {
//       console.error("Error submitting account head details:", error);
//       toast.error("Error submitting account head details");
//     }
//   };
  

//   const handleClear = () => {
//     setFormData({ accountHeadCode: "", accountHeadDescription: "", status: "" });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Head Details</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Head Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Code
//           </label>
//           <input
//             type="text"
//             name="accountHeadCode"
//             value={formData.accountHeadCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head code"
//           />
//         </div>
//         {/* Account Head Description */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Description
//           </label>
//           <input
//             type="text"
//             name="accountHeadDescription"
//             value={formData.accountHeadDescription}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head description"
//           />
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Status
//           </label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select status</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             type="submit"
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Submit
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Clear
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default AccountHeadDetails;
