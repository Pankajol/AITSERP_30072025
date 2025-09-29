"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function BankHeadPage() {
  const [bankHeads, setBankHeads] = useState([]);
  const [accountHeads, setAccountHeads] = useState([]);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    isActualBank: false,
    accountHead: "",
    status: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ✅ Fetch Bank Heads & Account Heads
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [bankRes, headRes] = await Promise.all([
        axios.get("/api/bank-head", { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/account-head", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBankHeads(bankRes.data.data || []);
      setAccountHeads(headRes.data.data || []);
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Handle Input Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (editingId) {
        const res = await axios.put(`/api/bank-head/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Updated successfully");
        setBankHeads((prev) => prev.map((b) => (b._id === editingId ? res.data.data : b)));
        setEditingId(null);
      } else {
        const res = await axios.post("/api/bank-head", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Created successfully");
        setBankHeads([...bankHeads, res.data.data]);
      }
      setFormData({ accountCode: "", accountName: "", isActualBank: false, accountHead: "", status: "" });
    } catch (err) {
      toast.error("Error saving data");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Edit
  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item._id);
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/bank-head/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Deleted successfully");
      setBankHeads(bankHeads.filter((b) => b._id !== id));
    } catch (err) {
      toast.error("Error deleting");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow rounded-lg">
      <ToastContainer />
      <h2 className="text-2xl font-bold mb-4">{editingId ? "Edit Bank Head" : "Add Bank Head"}</h2>

      {/* ✅ Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input type="text" name="accountCode" value={formData.accountCode} onChange={handleChange} placeholder="Account Code" className="border p-2 w-full" />
        <input type="text" name="accountName" value={formData.accountName} onChange={handleChange} placeholder="Account Name" className="border p-2 w-full" />
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActualBank" checked={formData.isActualBank} onChange={handleChange} />
          <span>Is Actual Bank?</span>
        </div>
        <select name="accountHead" value={formData.accountHead} onChange={handleChange} className="border p-2 w-full">
          <option value="">Select Account Head</option>
          {accountHeads.map((head) => (
            <option key={head._id} value={head.accountHeadCode}>
              {head.accountHeadCode} - {head.accountHeadDescription}
            </option>
          ))}
        </select>
        <select name="status" value={formData.status} onChange={handleChange} className="border p-2 w-full">
          <option value="">Select Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
          {saving ? "Saving..." : editingId ? "Update" : "Create"}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setEditingId(null); setFormData({ accountCode: "", accountName: "", isActualBank: false, accountHead: "", status: "" }); }} className="bg-gray-500 text-white px-4 py-2 rounded ml-2">
            Cancel
          </button>
        )}
      </form>

      {/* ✅ Table */}
      {loading ? (
        <p>Loading...</p>
      ) : bankHeads.length === 0 ? (
        <p>No bank heads found</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Code</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Head</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bankHeads.map((item) => (
              <tr key={item._id}>
                <td className="border p-2">{item.accountCode}</td>
                <td className="border p-2">{item.accountName}</td>
                <td className="border p-2">{item.accountHead}</td>
                <td className="border p-2">{item.status}</td>
                <td className="border p-2 flex gap-2">
                  <button onClick={() => handleEdit(item)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                  <button onClick={() => handleDelete(item._id)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
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
// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const BankHeadDetails = () => {
//   const [accountHeads, setAccountHeads] = useState([]);
//   const [formData, setFormData] = useState({
//     accountCode: "",
//     accountName: "",
//     accountHead: "", // Use "accountHead" consistently
//     status: "",
//   });

//   useEffect(() => {
//     // Fetch account heads from the API
//     const fetchAccountHeads = async () => {
//       try {
//         const response = await fetch("/api/account-head"); // Adjust the API endpoint as needed
//         if (!response.ok) {
//           throw new Error("Failed to fetch account heads");
//         }
//         const data = await response.json();
//         console.log("Fetched account heads:", data);
//         setAccountHeads(data.data);
//       } catch (error) {
//         console.error("Error fetching account heads:", error);
//       }
//     };

//     fetchAccountHeads();
//   }, []);

//   const validateForm = () => {
//     if (!formData.accountCode.trim()) {
//       toast.error("Account Code is required");
//       return false;
//     }
//     if (!formData.accountName.trim()) {
//       toast.error("Account Name is required");
//       return false;
//     }
//     if (!formData.accountHead) {
//       toast.error("Please select an Account Head From");
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
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/bank-head", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok && result.success) {
//         toast.success("Bank head details submitted successfully!");
//         setFormData({
//           accountCode: "",
//           accountName: "",
//           accountHead: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting bank head details");
//       }
//     } catch (error) {
//       console.error("Error submitting bank head details:", error);
//       toast.error("Error submitting bank head details");
//     }
//   };

//   const handleClear = () => {
//     setFormData({
//       accountCode: "",
//       accountName: "",
//       accountHead: "",
//       status: "",
//     });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Code</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Code
//           </label>
//           <input
//             type="text"
//             name="accountCode"
//             value={formData.accountCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account code"
//           />
//         </div>
//         {/* Account Name */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Name
//           </label>
//           <input
//             type="text"
//             name="accountName"
//             value={formData.accountName}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account name"
//           />
//         </div>
//         {/* Account Head From (Selectable) */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head From
//           </label>
//           <select
//             name="accountHead"  // Changed from accountHeadFrom to accountHead
//             value={formData.accountHead}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Account Head From</option>
//             {accountHeads.map((option, index) => (
//               <option key={option.accountHeadCode || index} value={option.accountHeadCode}>
//                 {option.accountHeadCode} - {option.accountHeadDescription}
//               </option>
//             ))}
//           </select>
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
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Status</option>
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

// export default BankHeadDetails;
