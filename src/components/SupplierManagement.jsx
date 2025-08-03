// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";
// import AccountSearch from "@/components/AccountSearch";
// import toast from "react-hot-toast";

// const initialAddress = { address1: "", address2: "", city: "", state: "", country: "", pin: "" };
// const initialSupplier = {
//   supplierCode: "",
//   supplierName: "",
//   supplierType: "",
//   supplierGroup: "",
//   supplierCategory: "",
//   emailId: "",
//   mobileNumber: "",
//   contactPersonName: "",
//   billingAddresses: [initialAddress],
//   shippingAddresses: [initialAddress],
//   paymentTerms: "",
//   gstNumber: "",
//   gstCategory: "",
//   pan: "",
//   bankName: "",
//   branch: "",
//   bankAccountNumber: "",
//   ifscCode: "",
//   leadTime: "",
//   qualityRating: "B",
//   glAccount: null,
// };

// export default function SupplierManagement() {
//   const [view, setView] = useState("list");
//   const [suppliers, setSuppliers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [supplierDetails, setSupplierDetails] = useState(initialSupplier);
//   const [errors, setErrors] = useState({});

//   useEffect(() => {
//     fetchSuppliers();
//   }, []);

//   const fetchSuppliers = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/suppliers", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) setSuppliers(res.data.data);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to fetch suppliers");
//     }
//   };

//   const validate = () => {
//     const errs = {};
//     const f = supplierDetails;
//     if (!f.supplierName) errs.supplierName = "Supplier Name is required";
//     if (!f.supplierType) errs.supplierType = "Supplier Type is required";
//     if (!f.supplierGroup) errs.supplierGroup = "Supplier Group is required";
//     if (!f.pan) errs.pan = "PAN is required";
//     if (!f.gstCategory) errs.gstCategory = "GST Category is required";
//     if (!f.glAccount || !f.glAccount._id) errs.glAccount = "GL Account is required";
//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     const token = localStorage.getItem("token");
//     const payload = {
//       ...supplierDetails,
//       glAccount: supplierDetails.glAccount?._id || null,
//     };

//     try {
//       let res;
//       if (supplierDetails._id) {
//         res = await axios.put(`/api/suppliers/${supplierDetails._id}`, payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setSuppliers((prev) =>
//           prev.map((s) => (s._id === res.data.data._id ? res.data.data : s))
//         );
//         toast.success("Supplier updated successfully");
//       } else {
//         res = await axios.post("/api/suppliers", payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setSuppliers((prev) => [...prev, res.data.data]);
//         toast.success("Supplier created successfully");
//       }
//       setSupplierDetails(initialSupplier);
//       setView("list");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error saving supplier");
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/suppliers/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setSuppliers((prev) => prev.filter((s) => s._id !== id));
//       toast.success("Supplier deleted");
//     } catch (err) {
//       toast.error("Failed to delete supplier");
//     }
//   };

//   const getFieldError = (field) => errors[field] && (
//     <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
//   );

//   const handleEdit = (s) => {
//     setSupplierDetails(s);
//     setView("form");
//   };

//   const filtered = suppliers.filter((s) =>
//     [s.supplierCode, s.supplierName, s.emailId, s.supplierType, s.supplierGroup]
//       .some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
//   );

//   return (
//     <div className="p-6">
//       {view === "list" ? (
//         <>
//           <div className="flex justify-between mb-4">
//             <h1 className="text-2xl font-bold">Supplier Management</h1>
//             <button
//               onClick={() => setView("form")}
//               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
//             >
//               <FaPlus /> Add Supplier
//             </button>
//           </div>

//           <input
//             className="border p-2 rounded mb-4 w-full max-w-md"
//             placeholder="Search suppliers..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />

//           <table className="w-full table-auto border">
//             <thead>
//               <tr className="bg-gray-200 text-left">
//                 <th className="p-2">Code</th>
//                 <th className="p-2">Name</th>
//                 <th className="p-2">Email</th>
//                 <th className="p-2">Type</th>
//                 <th className="p-2">Group</th>
//                 <th className="p-2">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((s) => (
//                 <tr key={s._id} className="border-t hover:bg-gray-50">
//                   <td className="p-2">{s.supplierCode}</td>
//                   <td className="p-2">{s.supplierName}</td>
//                   <td className="p-2">{s.emailId}</td>
//                   <td className="p-2">{s.supplierType}</td>
//                   <td className="p-2">{s.supplierGroup}</td>
//                   <td className="p-2 flex gap-2">
//                     <button onClick={() => handleEdit(s)} className="text-blue-600">
//                       <FaEdit />
//                     </button>
//                     <button onClick={() => handleDelete(s._id)} className="text-red-600">
//                       <FaTrash />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </>
//       ) : (
//         <div className="max-w-3xl mx-auto">
//           <h2 className="text-xl font-semibold mb-4">
//             {supplierDetails._id ? "Edit Supplier" : "New Supplier"}
//           </h2>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="block">Supplier Name *</label>
//               <input
//                 name="supplierName"
//                 value={supplierDetails.supplierName}
//                 onChange={(e) => setSupplierDetails({ ...supplierDetails, supplierName: e.target.value })}
//                 className="w-full border rounded p-2"
//               />
//               {getFieldError("supplierName")}
//             </div>
//             <div>
//               <label className="block">Supplier Group *</label>
//               <GroupSearch
//                 value={supplierDetails.supplierGroup}
//                 onSelectGroup={(name) => setSupplierDetails((prev) => ({ ...prev, supplierGroup: name }))}
//               />
//               {getFieldError("supplierGroup")}
//             </div>
//             <div>
//               <label className="block">Supplier Type *</label>
//               <select
//                 value={supplierDetails.supplierType}
//                 onChange={(e) => setSupplierDetails({ ...supplierDetails, supplierType: e.target.value })}
//                 className="w-full border rounded p-2"
//               >
//                 <option value="">Select Type</option>
//                 <option>Manufacturer</option>
//                 <option>Distributor</option>
//                 <option>Retailer</option>
//                 <option>Service Provider</option>
//               </select>
//               {getFieldError("supplierType")}
//             </div>
//             <div>
//               <label className="block">PAN *</label>
//               <input
//                 name="pan"
//                 value={supplierDetails.pan}
//                 onChange={(e) => setSupplierDetails({ ...supplierDetails, pan: e.target.value })}
//                 className="w-full border rounded p-2"
//               />
//               {getFieldError("pan")}
//             </div>
//             <div>
//               <label className="block">GST Category *</label>
//               <select
//                 value={supplierDetails.gstCategory}
//                 onChange={(e) => setSupplierDetails({ ...supplierDetails, gstCategory: e.target.value })}
//                 className="w-full border rounded p-2"
//               >
//                 <option value="">Select GST Category</option>
//                 <option value="Registered Regular">Registered Regular</option>
//                 <option value="Unregistered">Unregistered</option>
//                 <option value="SEZ">SEZ</option>
//               </select>
//               {getFieldError("gstCategory")}
//             </div>
//             <div>
//               <AccountSearch
//                 value={supplierDetails.glAccount}
//                 onSelect={(selected) => setSupplierDetails({ ...supplierDetails, glAccount: selected })}
//               />
//               {getFieldError("glAccount")}
//             </div>
//             <div className="flex justify-end gap-3 mt-4">
//               <button type="button" onClick={() => setView("list")} className="px-4 py-2 bg-gray-500 text-white rounded">
//                 Cancel
//               </button>
//               <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
//                 {supplierDetails._id ? "Update" : "Create"}
//               </button>
//             </div>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
import { toast } from "react-toastify";

export default function SupplierManagement() {
  const [view, setView] = useState("list");
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState({
    supplierCode: "",
    supplierName: "",
    supplierType: "",
    supplierGroup: "",
    supplierCategory: "",
    emailId: "",
    mobileNumber: "",
    contactPersonName: "",
    billingAddresses: [
      { address1: "", address2: "", city: "", state: "", country: "", pin: "" },
    ],
    shippingAddresses: [
      { address1: "", address2: "", city: "", state: "", country: "", pin: "" },
    ],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    bankName: "",
    branch: "",
    bankAccountNumber: "",
    ifscCode: "",
    leadTime: "",
    qualityRating: "B",
    glAccount: null,
  });

  const fetchSuppliers = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await axios.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setSuppliers(res.data.data || []);
      } else {
        setError(res.data.message || "Failed to load suppliers.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const generateSupplierCode = async () => {
    try {
      const token = localStorage.getItem("token"); // Make sure this is how you store your token

      const response = await axios.get("/api/lastSupplierCode", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const lastCode = response.data.lastSupplierCode || "SUPP-0000";
      const num = parseInt(lastCode.split("-")[1] || "0", 10) + 1;

      setSupplierDetails((prev) => ({
        ...prev,
        supplierCode: `SUPP-${num.toString().padStart(4, "0")}`,
      }));
    } catch (err) {
      console.error("Error generating supplier code:", err);
    }
  };

  // const generateSupplierCode = async () => {
  //   try {
  //     const { data } = await axios.get("/api/lastSupplierCode");
  //     const num = parseInt(data.lastSupplierCode.split("-")[1] || "0", 10) + 1;
  //     setSupplierDetails(prev => ({ ...prev, supplierCode: `SUPP-${num.toString().padStart(4, "0")}` }));
  //   } catch {}
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSupplierDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...supplierDetails[key]];
    arr[idx][field] = value;
    setSupplierDetails((prev) => ({ ...prev, [key]: arr }));
  };

  const addAddress = (type) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setSupplierDetails((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          address1: "",
          address2: "",
          city: "",
          state: "",
          country: "",
          pin: "",
        },
      ],
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (supplierDetails[key].length === 1) return;
    setSupplierDetails((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const validate = () => {
    const errs = {};
    const {
      supplierName,
      supplierType,
      supplierGroup,
      pan,
      gstCategory,
      emailId,
      gstNumber,
      mobileNumber,
      glAccount,
    } = supplierDetails;

    if (!supplierName) {
      errs.supplierName = "Supplier Name is required";
      toast.error(errs.supplierName);
    }

    if (!supplierType) {
      errs.supplierType = "Supplier Type is required";
      toast.error(errs.supplierType);
    }

    if (!supplierGroup) {
      errs.supplierGroup = "Supplier Group is required";
      toast.error(errs.supplierGroup);
    }

    if (!gstCategory) {
      errs.gstCategory = "GST Category is required";
      toast.error(errs.gstCategory);
    }

    if (!pan) {
      errs.pan = "PAN is required";
      toast.error(errs.pan);
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      errs.pan = "Invalid PAN format. Example: ABCDE1234F";
      toast.error(errs.pan);
    }

    if (emailId && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(emailId)) {
      errs.emailId = "Invalid email format";
      toast.error(errs.emailId);
    }

    if (
      gstNumber &&
      !/^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
        gstNumber
      )
    ) {
      errs.gstNumber = "Invalid GST Number. Example: 22ABCDE1234F1Z5";
      toast.error(errs.gstNumber);
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      errs.mobileNumber = "Mobile Number must be exactly 10 digits";
      toast.error(errs.mobileNumber);
    }

    if (!glAccount || !glAccount._id) {
      errs.glAccount = "GL Account is required";
      toast.error(errs.glAccount);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // const validate = () => {
  //   const errs = {};
  //   if (!supplierDetails.supplierName) errs.supplierName = "Supplier Name is required";
  //   if (!supplierDetails.supplierType) errs.supplierType = "Supplier Type is required";
  //   if (!supplierDetails.supplierGroup) errs.supplierGroup = "Supplier Group is required";
  //   if (!supplierDetails.pan) errs.pan = "PAN is required";
  //   if (!supplierDetails.gstCategory) errs.gstCategory = "GST Category is required";
  //   if (!supplierDetails.glAccount || !supplierDetails.glAccount._id) errs.glAccount = "GL Account is required";
  //   setErrors(errs);
  //   return Object.keys(errs).length === 0;
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Please log in again.");
      return;
    }

    const payload = {
      ...supplierDetails,
      glAccount: supplierDetails.glAccount?._id || null,
    };

    try {
      let res;

      if (supplierDetails._id) {
        // ✅ Update supplier
        res = await axios.put(
          `/api/suppliers/${supplierDetails._id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // ✅ Update state with updated supplier
        setSuppliers((prev) =>
          prev.map((s) => (s._id === res.data.data._id ? res.data.data : s))
        );
      } else {
        // ✅ Create supplier
        res = await axios.post("/api/suppliers", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        // ✅ Add new supplier to state
        setSuppliers((prev) => [...prev, res.data.data]);
      }

      setView("list"); // ✅ Go back to list view after save
    } catch (err) {
      console.error(
        "Error saving supplier:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Failed to save supplier");
    }
  };

  const getFieldError = (field) =>
    errors[field] && (
      <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
    );
  const handleEdit = (s) => {
    setSupplierDetails(s);
    setView("form");
  };
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await axios.delete(`/api/suppliers/${id}`);
    setSuppliers((prev) => prev.filter((s) => s._id !== id));
  };

  const filtered = suppliers.filter((s) =>
    [
      s.supplierCode,
      s.supplierName,
      s.emailId,
      s.supplierType,
      s.supplierGroup,
    ].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderListView = () => (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Supplier Management</h1>
        <button
          onClick={() => {
            generateSupplierCode();
            setView("form");
          }}
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <FaPlus className="mr-2" /> Add Supplier
        </button>
      </div>
      <div className="mb-4 relative max-w-md">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
        />
        <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Code", "Name", "Email", "Type", "Group", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{s.supplierCode}</td>
                <td className="px-4 py-2">{s.supplierName}</td>
                <td className="px-4 py-2">{s.emailId}</td>
                <td className="px-4 py-2">{s.supplierType}</td>
                <td className="px-4 py-2">{s.supplierGroup}</td>
                <td className="px-4 py-2 flex space-x-3">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-blue-600"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFormView = () => (
    <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        {supplierDetails._id ? "Edit Supplier" : "New Supplier"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              name="supplierCode"
              value={supplierDetails.supplierCode}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-100"
            />
            {getFieldError("supplierCode")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              name="supplierName"
              value={supplierDetails.supplierName}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
            {getFieldError("supplierName")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Group <span className="text-red-500">*</span>
            </label>
            <GroupSearch
              value={supplierDetails.supplierGroup}
              onSelectGroup={(name) =>
                setSupplierDetails((prev) => ({ ...prev, supplierGroup: name }))
              }
            />
            {!supplierDetails.supplierGroup && (
              <p className="text-red-500 text-sm mt-1">
                Supplier Group is required
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Type <span className="text-red-500">*</span>
            </label>
            <select
              name="supplierType"
              value={supplierDetails.supplierType}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option>Manufacturer</option>
              <option>Distributor</option>
              <option>Wholesaler</option>
              <option>Service Provider</option>
            </select>
            {getFieldError("supplierType")}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email ID <span className="text-red-500">*</span>
            </label>
            <input
              name="emailId"
              type="email"
              value={supplierDetails.emailId}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              name="mobileNumber"
              type="text"
              placeholder="Mobile Number"
              maxLength={10}
              value={supplierDetails.mobileNumber || ""}
              onChange={(e) => {
                const input = e.target.value;
                if (/^\d{0,10}$/.test(input)) {
                  handleChange(e); // only allow up to 10 digits
                }
              }}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              name="contactPersonName"
              value={supplierDetails.contactPersonName}
              onChange={handleChange}
              placeholder="Contact Person"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold">Billing Addresses</h3>
        {supplierDetails.billingAddresses.map((addr, i) => (
          <div key={i} className="border p-4 rounded mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Billing Address {i + 1}</span>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => removeAddress("billing", i)}
                  className="text-red-600"
                >
                  <FaMinus />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                value={addr.address1}
                onChange={(e) =>
                  handleAddressChange("billing", i, "address1", e.target.value)
                }
                placeholder="Line 1"
                className="border p-2 rounded"
              />
              <input
                value={addr.address2}
                onChange={(e) =>
                  handleAddressChange("billing", i, "address2", e.target.value)
                }
                placeholder="Line 2"
                className="border p-2 rounded"
              />
              <input
                value={addr.city}
                onChange={(e) =>
                  handleAddressChange("billing", i, "city", e.target.value)
                }
                placeholder="City"
                className="border p-2 rounded"
              />
              <input
                value={addr.pin}
                onChange={(e) =>
                  handleAddressChange("billing", i, "pin", e.target.value)
                }
                placeholder="PIN"
                className="border p-2 rounded"
              />
              <CountryStateSearch
                valueCountry={addr.country ? { name: addr.country } : null}
                valueState={addr.state ? { name: addr.state } : null}
                onSelectCountry={(c) =>
                  handleAddressChange("billing", i, "country", c?.name || "")
                }
                onSelectState={(s) =>
                  handleAddressChange("billing", i, "state", s?.name || "")
                }
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addAddress("billing")}
          className="inline-flex items-center text-blue-600 mb-6"
        >
          <FaPlus className="mr-1" /> Add Billing Address
        </button>

        <h3 className="text-lg font-semibold">Shipping Addresses</h3>
        {supplierDetails.shippingAddresses.map((addr, i) => (
          <div key={i} className="border p-4 rounded mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Shipping Address {i + 1}</span>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => removeAddress("shipping", i)}
                  className="text-red-600"
                >
                  <FaMinus />
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                value={addr.address1}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "address1", e.target.value)
                }
                placeholder="Line 1"
                className="border p-2 rounded"
              />
              <input
                value={addr.address2}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "address2", e.target.value)
                }
                placeholder="Line 2"
                className="border p-2 rounded"
              />
              <input
                value={addr.city}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "city", e.target.value)
                }
                placeholder="City"
                className="border p-2 rounded"
              />
              <input
                value={addr.pin}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "pin", e.target.value)
                }
                placeholder="PIN"
                className="border p-2 rounded"
              />
              <CountryStateSearch
                valueCountry={addr.country ? { name: addr.country } : null}
                valueState={addr.state ? { name: addr.state } : null}
                onSelectCountry={(c) =>
                  handleAddressChange("shipping", i, "country", c?.name || "")
                }
                onSelectState={(s) =>
                  handleAddressChange("shipping", i, "state", s?.name || "")
                }
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addAddress("shipping")}
          className="inline-flex items-center text-blue-600 mb-6"
        >
          <FaPlus className="mr-1" /> Add Shipping Address
        </button>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <input
              name="paymentTerms"
              value={supplierDetails.paymentTerms}
              onChange={handleChange}
              placeholder="Payment Terms"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number
            </label>
            <input
              name="gstNumber"
              type="text"
              placeholder="Enter GST Number"
              value={supplierDetails.gstNumber || ""}
              onChange={(e) => {
                const input = e.target.value.toUpperCase();
                if (/^[A-Z0-9]{0,15}$/.test(input)) {
                  handleChange({ target: { name: "gstNumber", value: input } });
                }
              }}
              maxLength={15}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Category <span className="text-red-500">*</span>
            </label>
            <select
              name="gstCategory"
              value={supplierDetails.gstCategory}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select GST Category</option>
              <option value="Registered Regular">Registered Regular</option>
              <option value="Registered Composition">
                Registered Composition
              </option>
              <option value="Unregistered">Unregistered</option>
              <option value="SEZ">SEZ</option>
              <option value="Overseas">Overseas</option>
              <option value="Deemed Export">Deemed Export</option>
              <option value="UIN Holders">UIN Holders</option>
              <option value="Tax Deductor">Tax Deductor</option>
              <option value="Tax Collector">Tax Collector</option>
              <option value="Input Service Distributor">
                Input Service Distributor
              </option>
            </select>
            {getFieldError("gstCategory")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Number
            </label>
            <input
              name="pan"
              type="text"
              placeholder="Enter PAN Number"
              value={supplierDetails.pan || ""}
              onChange={(e) => {
                const input = e.target.value.toUpperCase();
                if (/^[A-Z0-9]{0,10}$/.test(input)) {
                  handleChange({ target: { name: "pan", value: input } });
                }
              }}
              maxLength={10}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <AccountSearch
              value={supplierDetails.glAccount}
              onSelect={(selected) => {
                setSupplierDetails((prev) => ({
                  ...prev,
                  glAccount: selected,
                }));
              }}
            />
            {getFieldError("glAccount")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <input
              name="bankName"
              value={supplierDetails.bankName}
              onChange={handleChange}
              placeholder="Bank Name"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              name="branch"
              value={supplierDetails.branch}
              onChange={handleChange}
              placeholder="Branch"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            name="accountNumber"
            type="text"
            placeholder="Enter Account Number"
            maxLength={18}
            required
            className="border rounded px-3 py-2 w-full"
            pattern="\d{9,18}"
            title="Account Number must be 9 to 18 digits"
            onChange={(e) => {
              const input = e.target.value.replace(/\D/g, ""); // Only digits
              if (/^\d{0,18}$/.test(input)) {
                handleChange({
                  target: { name: "accountNumber", value: input },
                });
              }
            }}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code
          </label>
          <input
            name="ifscCode"
            type="text"
            placeholder="Enter IFSC Code"
            maxLength={11}
            required
            className="uppercase border rounded px-3 py-2 w-full"
            pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
            title="Enter valid IFSC like SBIN0001234"
            onChange={(e) => {
              const input = e.target.value.toUpperCase();
              if (/^[A-Z0-9]{0,11}$/.test(input)) {
                handleChange({ target: { name: "ifscCode", value: input } });
              }
            }}
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            {supplierDetails._id ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
  return view === "list" ? renderListView() : renderFormView();
}
