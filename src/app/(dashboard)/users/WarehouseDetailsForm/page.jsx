"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import CountryStateSearch from "@/components/CountryStateSearch";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const WarehouseDetailsForm = () => {
  const initialWarehouseData = {
    warehouseCode: "",
    warehouseName: "",
    parentWarehouse: "",
    account: "",
    company: "",
    phoneNo: "",
    mobileNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pin: "",
    warehouseType: "",
    defaultInTransit: false,
    country: "",
  };

  const initialBinData = {
    code: "",
    aisle: "",
    rack: "",
    bin: "",
    maxCapacity: "",
    parentWarehouse: "",
  };

  const [formData, setFormData] = useState(initialWarehouseData);
  const [isBinForm, setIsBinForm] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Add Warehouse");
  const [selectedParent, setSelectedParent] = useState(null);
  const [expanded, setExpanded] = useState({});

  // Fetch warehouses
  const fetchWarehouses = async () => {
    setListLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/warehouse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setWarehouses(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch warehouses");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Form change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectCountry = (country) =>
    setFormData((prev) => ({ ...prev, country: country?._id || "", state: "" }));

  const handleSelectState = (state) =>
    setFormData((prev) => ({ ...prev, state: state?._id || "" }));

  const validateForm = () => {
    if (isBinForm) {
      const required = ["code", "aisle", "rack", "bin", "maxCapacity"];
      const missing = required.filter((f) => !formData[f]);
      if (missing.length) {
        toast.error("Please fill all bin fields.");
        return false;
      }
      return true;
    } else {
      const requiredFields = [
        "warehouseCode",
        "warehouseName",
        "account",
        "company",
        "phoneNo",
        "addressLine1",
        "city",
        "state",
        "pin",
        "country",
        "warehouseType",
      ];
      const missing = requiredFields.filter((f) => !formData[f]);
      if (missing.length) {
        toast.error("Please fill all required fields.");
        return false;
      }
      if (!/^\d{10}$/.test(formData.phoneNo)) {
        toast.error("Phone must be 10 digits.");
        return false;
      }
      if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
        toast.error("Mobile must be 10 digits.");
        return false;
      }
      if (!/^\d{6}$/.test(formData.pin)) {
        toast.error("PIN must be 6 digits.");
        return false;
      }
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      if (isBinForm) {
        const res = await axios.post(
          `/api/warehouse/${formData.warehouseCode}/bins`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          toast.success("Bin added successfully!");
          setFormData(initialBinData);
          setModalOpen(false);
          fetchWarehouses();
        }
      } else {
        const res = await axios.post("/api/warehouse", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Warehouse added successfully!");
          setFormData(initialWarehouseData);
          setModalOpen(false);
          fetchWarehouses();
        }
      }
      setSelectedParent(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const deleteWarehouse = async (id) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/warehouse?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted successfully!");
      fetchWarehouses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete warehouse");
    }
  };

  const openMainModal = () => {
    setModalTitle("Add Warehouse");
    setFormData(initialWarehouseData);
    setIsBinForm(false);
    setSelectedParent(null);
    setModalOpen(true);
  };

  const openSubModal = (parent) => {
    setModalTitle(`Add Bin for ${parent.warehouseName}`);
    setFormData({ ...initialBinData, warehouseCode: parent.warehouseCode}); 
    setSelectedParent(parent);
    setIsBinForm(true);
    setModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={openMainModal}
        className="px-5 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition"
      >
        + Add Warehouse
      </button>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-3xl p-6 rounded shadow-lg relative max-h-[80vh] overflow-y-auto animate-fadeIn">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-lg"
            >
              ✕
            </button>
            <h2 className="text-2xl font-semibold mb-6">{modalTitle}</h2>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {isBinForm ? (
                <>
                  <InputField label="Bin Code" name="code" value={formData.code} onChange={handleChange} />
                  <InputField label="Aisle" name="aisle" value={formData.aisle} onChange={handleChange} />
                  <InputField label="Rack" name="rack" value={formData.rack} onChange={handleChange} />
                  <InputField label="Bin" name="bin" value={formData.bin} onChange={handleChange} />
                  <InputField label="Max Capacity" name="maxCapacity" value={formData.maxCapacity} onChange={handleChange} />
                </>
              ) : (
                <>
                  <InputField label="Warehouse Code" name="warehouseCode" value={formData.warehouseCode} onChange={handleChange} />
                  <InputField label="Warehouse Name" name="warehouseName" value={formData.warehouseName} onChange={handleChange} />
                  <InputField label="Account" name="account" value={formData.account} onChange={handleChange} />
                  <InputField label="Company" name="company" value={formData.company} onChange={handleChange} />
                  <InputField label="Phone" name="phoneNo" value={formData.phoneNo} onChange={handleChange} />
                  <InputField label="Mobile" name="mobileNo" value={formData.mobileNo} onChange={handleChange} />
                  <InputField label="Address Line 1" name="addressLine1" value={formData.addressLine1} onChange={handleChange} />
                  <InputField label="Address Line 2" name="addressLine2" value={formData.addressLine2} onChange={handleChange} />
                  <InputField label="City" name="city" value={formData.city} onChange={handleChange} />
                  <InputField label="PIN" name="pin" value={formData.pin} onChange={handleChange} />
                  <div className="col-span-2">
                    <CountryStateSearch
                      valueCountry={formData.country}
                      valueState={formData.state}
                      onSelectCountry={handleSelectCountry}
                      onSelectState={handleSelectState}
                    />
                  </div>
                  <InputField label="Warehouse Type" name="warehouseType" value={formData.warehouseType} onChange={handleChange} />
                  <div className="flex items-center col-span-2">
                    <input type="checkbox" name="defaultInTransit" checked={formData.defaultInTransit} onChange={handleChange} className="mr-2" />
                    <label className="text-sm">Default In Transit</label>
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={loading}
                className="col-span-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 font-semibold transition"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse List */}
      <h2 className="text-2xl font-semibold mt-8 mb-4">Warehouse List</h2>
      {listLoading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Code</th>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((wh) => (
              <React.Fragment key={wh._id}>
                <tr className="bg-white hover:bg-gray-50 cursor-pointer transition">
                  <td onClick={() => toggleExpand(wh._id)} className="border px-4 py-2 flex items-center gap-2">
                    {expanded[wh._id] ? "▼" : "▶"} {wh.warehouseCode}
                  </td>
                  <td onClick={() => toggleExpand(wh._id)} className="border px-4 py-2">{wh.warehouseName}</td>
                  <td className="border px-4 py-2 flex gap-2">
                    <button onClick={() => openSubModal(wh)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition">Add Bin</button>
                    <button onClick={() => deleteWarehouse(wh._id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition">Delete</button>
                  </td>
                </tr>

                {/* Expanded Bins */}
                {expanded[wh._id] && wh.binLocations && wh.binLocations.length > 0 && (
                  <tr>
                    <td colSpan="3" className="p-0 bg-gray-50">
                      <table className="w-full border border-gray-200 ml-6">
                        <thead className="bg-gray-600 text-sm text-white">
                          <tr>
                            <th className="border px-2 py-1">Bin Code</th>
                            <th className="border px-2 py-1">Aisle</th>
                            <th className="border px-2 py-1">Rack</th>
                            <th className="border px-2 py-1">Bin</th>
                            <th className="border px-2 py-1">Max Capacity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wh.binLocations.map((bin) => (
                            <tr key={bin._id} className="text-sm hover:bg-gray-100 transition items-center">
                              <td className="border px-2 py-1 align-middle text-center">{bin.code}</td>
                              <td className="border px-2 py-1 align-middle text-center">{bin.aisle || "-"}</td>
                              <td className="border px-2 py-1 align-middle text-center">{bin.rack || "-"}</td>
                              <td className="border px-2 py-1 align-middle text-center">{bin.bin || "-"}</td>
                              <td className="border px-2 py-1 align-middle text-center">{bin.maxCapacity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Reusable Input Component
const InputField = ({ label, name, value, onChange, disabled }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium mb-1">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-400 transition ${disabled ? "bg-gray-100" : "bg-white"}`}
    />
  </div>
);

export default WarehouseDetailsForm;


// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const WarehouseDetailsForm = () => {
//   const initialWarehouseData = {
//     warehouseCode: "",
//     warehouseName: "",
//     parentWarehouse: "",
//     account: "",
//     company: "",
//     phoneNo: "",
//     mobileNo: "",
//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//     country: "",
//   };

//   const initialBinData = {
//     code: "",
//     aisle: "",
//     rack: "",
//     bin: "",
//     maxCapacity: "",
//     parentWarehouse: "",
//   };

//   const [formData, setFormData] = useState(initialWarehouseData);
//   const [isBinForm, setIsBinForm] = useState(false);

//   const [warehouses, setWarehouses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [listLoading, setListLoading] = useState(false);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalTitle, setModalTitle] = useState("Add Warehouse");

//   const [selectedParent, setSelectedParent] = useState(null);
//    const [expanded, setExpanded] = useState({});
//   // Fetch warehouses
//   const fetchWarehouses = async () => {
//     setListLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/warehouse", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) setWarehouses(res.data.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setListLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchWarehouses();
//   }, []);

//   // Form change
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
//   };


//    const toggleExpand = (id) => {
//     setExpanded((prev) => ({
//       ...prev,
//       [id]: !prev[id],
//     }));
//   };

//   const handleSelectCountry = (country) =>
//     setFormData((prev) => ({ ...prev, country: country?._id || "", state: "" }));

//   const handleSelectState = (state) =>
//     setFormData((prev) => ({ ...prev, state: state?._id || "" }));

//   const validateForm = () => {
//     if (isBinForm) {
//       const required = ["code", "aisle", "rack", "bin", "maxCapacity"];
//       const missing = required.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all bin fields.");
//         return false;
//       }
//       return true;
//     } else {
//       const requiredFields = [
//         "warehouseCode",
//         "warehouseName",
//         "account",
//         "company",
//         "phoneNo",
//         "addressLine1",
//         "city",
//         "state",
//         "pin",
//         "country",
//         "warehouseType",
//       ];
//       const missing = requiredFields.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all required fields.");
//         return false;
//       }
//       if (!/^\d{10}$/.test(formData.phoneNo)) {
//         toast.error("Phone must be 10 digits.");
//         return false;
//       }
//       if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
//         toast.error("Mobile must be 10 digits.");
//         return false;
//       }
//       if (!/^\d{6}$/.test(formData.pin)) {
//         toast.error("PIN must be 6 digits.");
//         return false;
//       }
//       return true;
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");

//       if (isBinForm) {
//         // 👉 Save Bin
//         const res = await axios.post(
//           `/api/warehouse/${formData.parentWarehouse}/bins`,
//           formData,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (res.data.success) {
//           toast.success("Bin added successfully!");
//           setFormData(initialBinData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       } else {
//         // 👉 Save Main Warehouse
//         const res = await axios.post("/api/warehouse", formData, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           toast.success("Warehouse added successfully!");
//           setFormData(initialWarehouseData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       }
//       setSelectedParent(null);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deleteWarehouse = async (id) => {
//     if (!confirm("Are you sure you want to delete this warehouse?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/warehouse?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       toast.success("Deleted successfully!");
//       fetchWarehouses();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete warehouse");
//     }
//   };

//   // Open modal for main warehouse
//   const openMainModal = () => {
//     setModalTitle("Add Warehouse");
//     setFormData(initialWarehouseData);
//     setIsBinForm(false);
//     setSelectedParent(null);
//     setModalOpen(true);
//   };

//   // Open modal for sub-warehouse/bin
//   const openSubModal = (parent) => {
//     setModalTitle(`Add Bin for ${parent.warehouseName}`);
//     setFormData({ ...initialBinData, parentWarehouse: parent._id });
//     setSelectedParent(parent);
//     setIsBinForm(true);
//     setModalOpen(true);
//   };

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <button
//         onClick={openMainModal}
//         className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
//       >
//         Add Warehouse
//       </button>

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//           <div className="bg-white w-full max-w-3xl p-6 m-48 rounded shadow-lg relative max-h-[80vh] overflow-y-auto">
//             <button
//               onClick={() => setModalOpen(false)}
//               className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-semibold mb-4">{modalTitle}</h2>

//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-1 md:grid-cols-2 gap-4"
//             >
//               {isBinForm ? (
//                 <>
//                   <InputField
//                     label="Bin Code"
//                     name="code"
//                     value={formData.code}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Aisle"
//                     name="aisle"
//                     value={formData.aisle}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Rack"
//                     name="rack"
//                     value={formData.rack}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Bin"
//                     name="bin"
//                     value={formData.bin}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Max Capacity"
//                     name="maxCapacity"
//                     value={formData.maxCapacity}
//                     onChange={handleChange}
//                   />
//                 </>
//               ) : (
//                 <>
//                   <InputField
//                     label="Warehouse Code"
//                     name="warehouseCode"
//                     value={formData.warehouseCode}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Warehouse Name"
//                     name="warehouseName"
//                     value={formData.warehouseName}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Account"
//                     name="account"
//                     value={formData.account}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Company"
//                     name="company"
//                     value={formData.company}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Phone"
//                     name="phoneNo"
//                     value={formData.phoneNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Mobile"
//                     name="mobileNo"
//                     value={formData.mobileNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 1"
//                     name="addressLine1"
//                     value={formData.addressLine1}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 2"
//                     name="addressLine2"
//                     value={formData.addressLine2}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="City"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="PIN"
//                     name="pin"
//                     value={formData.pin}
//                     onChange={handleChange}
//                   />
//                   <div className="col-span-2">
//                     <CountryStateSearch
//                       valueCountry={formData.country}
//                       valueState={formData.state}
//                       onSelectCountry={handleSelectCountry}
//                       onSelectState={handleSelectState}
//                     />
//                   </div>
//                   <InputField
//                     label="Warehouse Type"
//                     name="warehouseType"
//                     value={formData.warehouseType}
//                     onChange={handleChange}
//                   />
//                   <div className="flex items-center col-span-2">
//                     <input
//                       type="checkbox"
//                       name="defaultInTransit"
//                       checked={formData.defaultInTransit}
//                       onChange={handleChange}
//                       className="mr-2"
//                     />
//                     <label>Default In Transit</label>
//                   </div>
//                 </>
//               )}
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="col-span-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
//               >
//                 {loading ? "Saving..." : "Save"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Warehouse List */}
//   <h2 className="text-xl font-semibold mt-6 mb-2">Warehouse List</h2>
//       {listLoading ? (
//         <p>Loading...</p>
//       ) : (
//         <table className="min-w-full border border-gray-300">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="border px-3 py-1">Code</th>
//               <th className="border px-3 py-1">Name</th>
//               <th className="border px-3 py-1">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {warehouses.map((wh) => (
//               <React.Fragment key={wh._id}>
//                 {/* Warehouse row */}
//                 <tr className="bg-white">
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {expanded[wh._id] ? "▼ " : "▶ "} {wh.warehouseCode}
//                   </td>
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {wh.warehouseName}
//                   </td>
//                   <td className="border px-3 py-1 flex gap-2">
//                     <button
//                       onClick={() => openSubModal(wh)}
//                       className="bg-green-500 text-white px-2 py-1 rounded"
//                     >
//                       Add Bin
//                     </button>
//                     <button
//                       onClick={() => deleteWarehouse(wh._id)}
//                       className="bg-red-500 text-white px-2 py-1 rounded"
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>

//                 {/* Expanded Bin rows */}
//                 {expanded[wh._id] && wh.binLocations && wh.binLocations.length > 0 && (
//                   <tr>
//                     <td colSpan="3" className="p-0">
//                       <table className="w-full border border-gray-200 ml-6">
//                         <thead>
//                           <tr className="bg-gray-50 text-sm">
//                             <th className="border px-2 py-1">Bin Code</th>
//                             <th className="border px-2 py-1">Aisle</th>
//                             <th className="border px-2 py-1">Rack</th>
//                             <th className="border px-2 py-1">Bin</th>
//                             <th className="border px-2 py-1">Max Capacity</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {wh.binLocations.map((bin) => (
//                             <tr key={bin._id} className="text-sm">
//                               <td className="border px-2 py-1">{bin.code}</td>
//                               <td className="border px-2 py-1">{bin.aisle || "-"}</td>
//                               <td className="border px-2 py-1">{bin.rack || "-"}</td>
//                               <td className="border px-2 py-1">{bin.bin || "-"}</td>
//                               <td className="border px-2 py-1">{bin.maxCapacity}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             ))}
//           </tbody>
//         </table>
//       )}

//     </div>
//   );
// };

// // Reusable Input Component
// const InputField = ({ label, name, value, onChange, disabled }) => (
//   <div>
//     <label className="block text-sm font-medium">{label}</label>
//     <input
//       type="text"
//       name={name}
//       value={value}
//       onChange={onChange}
//       disabled={disabled}
//       className={`mt-1 p-2 w-full border rounded ${disabled ? "bg-gray-100" : ""}`}
//     />
//   </div>
// );

// export default WarehouseDetailsForm;
