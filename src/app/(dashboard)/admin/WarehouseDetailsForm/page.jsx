"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import CountryStateSearch from "@/components/CountryStateSearch";

const WarehouseDetailsForm = () => {
  const initialFormData = {
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

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]); // ✅ For list view
  const [listLoading, setListLoading] = useState(false);

  // ✅ Fetch Warehouse List
  const fetchWarehouses = async () => {
    setListLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/warehouse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setWarehouses(res.data.data);
      } else {
        alert(res.data.message || "Failed to fetch warehouses");
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // ✅ Handle Form Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

const handleSelectCountry = (country) => {
  setFormData((prev) => ({
    ...prev,
    country: country?._id || "",
    state: "", // reset state if country changes
  }));
};

const handleSelectState = (state) => {
  setFormData((prev) => ({
    ...prev,
    state: state?._id || "",
  }));
};




  const validateForm = () => {
    const newErrors = {};
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
    requiredFields.forEach((field) => {
      if (!formData[field]) newErrors[field] = "This field is required.";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle Submit (Create Warehouse)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("/api/warehouse", formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        alert("Warehouse added successfully!");
        setFormData(initialFormData);
        fetchWarehouses();
      } else {
        alert(response.data.message || "Failed to add warehouse");
      }
    } catch (error) {
      console.error("Error submitting warehouse details:", error);
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Warehouse
  const deleteWarehouse = async (id) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/warehouse?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        alert("Warehouse deleted successfully!");
        fetchWarehouses();
      } else {
        alert(res.data.message || "Failed to delete warehouse");
      }
    } catch (error) {
      console.error("Error deleting warehouse:", error.message);
    }
  };


  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

      {/* ✅ Form Section */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField label="Warehouse Code" name="warehouseCode" value={formData.warehouseCode} onChange={handleChange} error={errors.warehouseCode} />
        <InputField label="Warehouse Name" name="warehouseName" value={formData.warehouseName} onChange={handleChange} error={errors.warehouseName} />
        <InputField label="Parent Warehouse" name="parentWarehouse" value={formData.parentWarehouse} onChange={handleChange} />
        <InputField label="Account" name="account" value={formData.account} onChange={handleChange} error={errors.account} />
        <InputField label="Company" name="company" value={formData.company} onChange={handleChange} error={errors.company} />
        <InputField label="Phone No" name="phoneNo" value={formData.phoneNo} onChange={handleChange} error={errors.phoneNo} />
        <InputField label="Mobile No" name="mobileNo" value={formData.mobileNo} onChange={handleChange} />
        <InputField label="Address Line 1" name="addressLine1" value={formData.addressLine1} onChange={handleChange} error={errors.addressLine1} />
        <InputField label="Address Line 2" name="addressLine2" value={formData.addressLine2} onChange={handleChange} />
        <InputField label="City" name="city" value={formData.city} onChange={handleChange} error={errors.city} />
        <InputField label="PIN" name="pin" value={formData.pin} onChange={handleChange} error={errors.pin} />

        {/* ✅ Country & State */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Country & State</label>
          {/* <CountryStateSearch
            selectedCountry={formData.country}
            selectedState={formData.state}
            onSelectCountry={handleSelectCountry}
            onSelectState={handleSelectState}
          /> */}

            <CountryStateSearch
  valueCountry={formData.country}
  valueState={formData.state}
  onSelectCountry={handleSelectCountry}
  onSelectState={handleSelectState}
/>

                    
          {errors.country && <span className="text-red-500 text-sm">{errors.country}</span>}
          {errors.state && <span className="text-red-500 text-sm">{errors.state}</span>}
        </div>

        <InputField label="Warehouse Type" name="warehouseType" value={formData.warehouseType} onChange={handleChange} error={errors.warehouseType} />

        {/* ✅ Checkbox */}
        <div className="flex items-center">
          <input type="checkbox" name="defaultInTransit" checked={formData.defaultInTransit} onChange={handleChange} className="mr-2" />
          <label className="text-sm font-medium text-gray-700">Default In Transit</label>
        </div>

        {/* ✅ Submit */}
        <div className="col-span-2 flex justify-end mt-4">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      {/* ✅ Warehouse List */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Warehouse List</h2>
        {listLoading ? (
          <p>Loading warehouses...</p>
        ) : warehouses.length > 0 ? (
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Code</th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Country</th>
                <th className="px-4 py-2 border">State</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh._id}>
                  <td className="border px-4 py-2">{wh.warehouseCode}</td>
                  <td className="border px-4 py-2">{wh.warehouseName}</td>
                <td className="border px-4 py-2">{wh.country?.name || "N/A"}</td>
<td className="border px-4 py-2">{wh.state?.name || "N/A"}</td>
                  <td className="border px-4 py-2 text-center">
                    <button onClick={() => deleteWarehouse(wh._id)} className="bg-red-500 text-white px-3 py-1 rounded">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No warehouses found.</p>
        )}
      </div>
    </div>
  );
};

/** ✅ Reusable Input Component */
const InputField = ({ label, name, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input type="text" name={name} value={value} onChange={onChange} className="mt-1 p-2 w-full border rounded" />
    {error && <span className="text-red-500 text-sm">{error}</span>}
  </div>
);

export default WarehouseDetailsForm;







// "use client";
// import React, { useState } from "react";
// import axios from "axios";
// import CountryStateSearch from "@/components/CountryStateSearch";

// const WarehouseDetailsForm = () => {
//   const initialFormData = {
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

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});


//   const [loading, setLoading] = useState(false);
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const handleSelectCountry = (country) => {
//     setFormData({ ...formData, country, state: "" });
//   };

//   const handleSelectState = (state) => {
//     setFormData({ ...formData, state });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     const requiredFields = [
//       "warehouseCode",
//       "warehouseName",
//       "account",
//       "company",
//       "phoneNo",
//       "addressLine1",
//       // "addressLine2",
//       "city",
//       "state",
//       "pin",
//       "country",
//       "warehouseType",
//     ];
//     requiredFields.forEach((field) => {
//       if (!formData[field]) newErrors[field] = "This field is required.";
//     });
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   // const handleSubmit = (e) => {
//   //   e.preventDefault();
//   //   if (validateForm()) {
//   //     console.log("Warehouse details submitted successfully:", formData);
//   //     alert("Warehouse details submitted successfully!");
//   //     setFormData(initialFormData);
//   //   }
//   // };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const token = localStorage.getItem('token');
//       const response = await axios.post("/api/warehouse", formData, {
//         headers: {
//     'Content-Type': 'application/json',
//     Authorization: `Bearer ${token}`,  // ✅ Must include token
//   },
//       });
//       alert("Warehouse details submitted successfully!");
//       setFormData(initialFormData);
//     } catch (error) {
//       console.error("Error submitting warehouse details:", error);
//       alert(error.response?.data?.message || "Something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg"
//     >
//       <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/** Warehouse Code */}
//         <InputField
//           label="Warehouse Code"
//           name="warehouseCode"
//           value={formData.warehouseCode}
//           onChange={handleChange}
//           error={errors.warehouseCode}
//         />

//         {/** Warehouse Name */}
//         <InputField
//           label="Warehouse Name"
//           name="warehouseName"
//           value={formData.warehouseName}
//           onChange={handleChange}
//           error={errors.warehouseName}
//         />

//         {/** Parent Warehouse */}
//         <InputField
//           label="Parent Warehouse"
//           name="parentWarehouse"
//           value={formData.parentWarehouse}
//           onChange={handleChange}
//         />

//         {/** Account */}
//         <InputField
//           label="Account"
//           name="account"
//           value={formData.account}
//           onChange={handleChange}
//           error={errors.account}
//         />

//         {/** Company */}
//         <InputField
//           label="Company"
//           name="company"
//           value={formData.company}
//           onChange={handleChange}
//           error={errors.company}
//         />

//         {/** Phone No */}
//         <InputField
//           label="Phone No"
//           name="phoneNo"
//           value={formData.phoneNo}
//           onChange={handleChange}
//           error={errors.phoneNo}
//         />

//         {/** Mobile No */}
//         <InputField
//           label="Mobile No"
//           name="mobileNo"
//           value={formData.mobileNo}
//           onChange={handleChange}
//         />

//         {/** Address Line 1 */}
//         <InputField
//           label="Address Line 1"
//           name="addressLine1"
//           value={formData.addressLine1}
//           onChange={handleChange}
//           error={errors.addressLine1}
//         />

//         {/** Address Line 2 */}
//         <InputField
//           label="Address Line 2"
//           name="addressLine2"
//           value={formData.addressLine2}
//           onChange={handleChange}
//         />

//         {/** City */}
//         <InputField
//           label="City"
//           name="city"
//           value={formData.city}
//           onChange={handleChange}
//           error={errors.city}
//         />

//         {/** PIN */}
//         <InputField
//           label="PIN"
//           name="pin"
//           value={formData.pin}
//           onChange={handleChange}
//           error={errors.pin}
//         />

//         {/** Country & State Selection */}
//         <div className="col-span-2">
//           <label className="block text-sm font-medium text-gray-700">
//             Country & State
//           </label>
//           <CountryStateSearch
//             selectedCountry={formData.country}
//             selectedState={formData.state}
//             onSelectCountry={handleSelectCountry}
//             onSelectState={handleSelectState}
//           />
//           {errors.country && (
//             <span className="text-red-500 text-sm">{errors.country}</span>
//           )}
//           {errors.state && (
//             <span className="text-red-500 text-sm">{errors.state}</span>
//           )}
//         </div>

//         {/** Warehouse Type */}
//         <InputField
//           label="Warehouse Type"
//           name="warehouseType"
//           value={formData.warehouseType}
//           onChange={handleChange}
//           error={errors.warehouseType}
//         />

//         {/** Default In Transit */}
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             name="defaultInTransit"
//             checked={formData.defaultInTransit}
//             onChange={handleChange}
//             className="mr-2"
//           />
//           <label className="text-sm font-medium text-gray-700">
//             Default In Transit
//           </label>
//         </div>
//       </div>

//    {/* Submit Button */}
//    <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//           disabled={loading}
//         >
//           {loading ? "Saving..." : "Save"}
//         </button>
//       </div>
//     </form>
//   );
// };

// /** Reusable Input Field Component */
// const InputField = ({ label, name, value, onChange, error }) => (
//   <div>
//     <label className="block text-sm font-medium text-gray-700">{label}</label>
//     <input
//       type="text"
//       name={name}
//       value={value}
//       onChange={onChange}
//       className="mt-1 p-2 w-full border rounded"
//     />
//     {error && <span className="text-red-500 text-sm">{error}</span>}
//   </div>
// );

// export default WarehouseDetailsForm;



// "use client";
// import React, { useState } from "react";
// import CountryStateSearch from "@/components/CountryStateSearch";

// const WarehouseDetailsForm = () => {
//   const initialFormData = {
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
//     country: "",  // Added country field
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const handleCountryStateChange = (selected, field) => {
//     setFormData({ ...formData, [field]: selected });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.warehouseCode) newErrors.warehouseCode = "This field is required.";
//     if (!formData.warehouseName) newErrors.warehouseName = "This field is required.";
//     if (!formData.account) newErrors.account = "This field is required.";
//     if (!formData.phoneNo) newErrors.phoneNo = "This field is required.";
//     if (!formData.addressLine1) newErrors.addressLine1 = "This field is required.";
//     if (!formData.city) newErrors.city = "This field is required.";
//     if (!formData.state) newErrors.state = "This field is required.";
//     if (!formData.country) newErrors.country = "This field is required.";
//     if (!formData.pin) newErrors.pin = "This field is required.";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       const response = await fetch("/api/warehouse", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       if (!response.ok) throw new Error("Failed to save warehouse details.");
      
//       alert("Warehouse details submitted successfully!");
//       setFormData(initialFormData);
//     } catch (error) {
//       console.error(error);
//       alert("Error saving warehouse details.");
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Warehouse Code", name: "warehouseCode", type: "text", required: true },
//           { label: "Warehouse Name", name: "warehouseName", type: "text", required: true },
//           { label: "Parent Warehouse", name: "parentWarehouse", type: "text" },
//           { label: "Account", name: "account", type: "text", required: true },
//           { label: "Company", name: "company", type: "text" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}

//         {/* Country and State Fields with Searchable Dropdowns */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">Country</label>
//           <CountryStateSearch
//             field="country"
//             value={formData.country}
//             onChange={handleCountryStateChange}
//           />
//           {errors.country && <span className="text-red-500 text-sm">{errors.country}</span>}
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700">State</label>
//           <CountryStateSearch
//             field="state"
//             value={formData.state}
//             onChange={handleCountryStateChange}
//           />
//           {errors.state && <span className="text-red-500 text-sm">{errors.state}</span>}
//         </div>
//       </div>

//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Save
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={() => setFormData(initialFormData)}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default WarehouseDetailsForm;


//////////////////////////////////////////////////////////////////////////////////////////


// "use client"
// import React, { useState } from "react";
// import CountryStateSearch from "@/components/CountryStateSearch";
// const WarehouseDetailsForm = () => {
//   const initialFormData = {
//     warehouseCode:"",
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
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.warehouseCode) newErrors.warehouseCode = "This field is required.";
//     if (!formData.warehouseName) newErrors.warehouseName = "This field is required.";
//     if (!formData.account) newErrors.account = "This field is required.";
//     if (!formData.phoneNo) newErrors.phoneNo = "This field is required.";
//     if (!formData.addressLine1) newErrors.addressLine1 = "This field is required.";
//     if (!formData.city) newErrors.city = "This field is required.";
//     if (!formData.state) newErrors.state = "This field is required.";
//     if (!formData.pin) newErrors.pin = "This field is required.";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log("Warehouse details submitted successfully:", formData);
//       alert("Warehouse details submitted successfully!");
//       setFormData(initialFormData); // Reset form data after successful submission
//     }
//   };

//   const handleCancel = () => {
//     setFormData(initialFormData); // Reset form data when canceling
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

//       {/* Warehouse Details Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[ 
//           { label: "Warehouse Code", name: "warehouseCode", type: "text", required: true },
//           { label: "Warehouse Name", name: "warehouseName", type: "text", required: true },
//           { label: "Parent Warehouse", name: "parentWarehouse", type: "text" },
//           { label: "Account", name: "account", type: "text", required: true },
//           { label: "Company", name: "company", type: "text" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>

//       {/* Warehouse Contact Info Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//         {[ 
//           { label: "Phone No", name: "phoneNo", type: "text", required: true },
//           { label: "Mobile No", name: "mobileNo", type: "text" },
//           { label: "Address Line 1", name: "addressLine1", type: "text", required: true },
//           { label: "Address Line 2", name: "addressLine2", type: "text" },
//           { label: "City", name: "city", type: "text", required: true },
//           { label: "State", name: "state", type: "text", required: true },
//           { label: "Pin", name: "pin", type: "text", required: true },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>

//       {/* Warehouse Transit Section */}
//       <div className="mt-6">
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             name="defaultInTransit"
//             checked={formData.defaultInTransit}
//             onChange={handleChange}
//             className="mr-2"
//           />
//           <label className="text-sm font-medium text-gray-700">Default in Transit Warehouse</label>
//         </div>
//       </div>

//       {/* Submit and Cancel Buttons */}
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//         onClick={handleSubmit}
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Save
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={handleCancel}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default WarehouseDetailsForm;
