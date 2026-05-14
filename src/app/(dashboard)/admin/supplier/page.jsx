"use client"
import SupplierManagement from '@/components/SupplierManagement'
import React from 'react'

function supplier() {
  return (
    <div>
      <SupplierManagement />
    </div>
  )
}

export default supplier


// new code

// "use client";
// import React, { useState,useEffect } from "react";
// import axios from "axios";
// import CountryStateSearch from "@/components/CountryStateSearch"; // Adjust the path if needed
// import GroupSearch from "@/components/groupmaster";

// export default function SupplierPage() {
//   const [supplierDetails, setSupplierDetails] = useState({
//     supplierCode: "",
//     supplierName: "",
//     supplierGroup: '',
//     supplierType: "",
//     emailId: "",
//     fromLead: "",
//     mobileNumber: "",
//     fromOpportunity: "",
//     billingAddress1: "",
//     billingAddress2: "",
//     billingCity: "",
//     billingState: null,
//     billingZip: "",
//     billingCountry: null,
//     shippingAddress1: "",
//     shippingAddress2: "",
//     shippingCity: "",
//     shippingState: null,
//     shippingZip: "",
//     shippingCountry: null,
//     paymentTerms: "",
//     gstNumber: "",
//     gstCategory: "",
//     pan: "",
//     contactPersonName: "",
//     commissionRate: "",
//     glAccount: "",
//   });
 
  
//   const handleGroupSelect = (group) => {
//     setSupplierDetails((prev) => ({
//       ...prev,
//       supplierGroup: group, // Store the selected group
//     }));

//     alert(`Selected Group: ${group.name}`);
//   };
//   // const handelSelectedGroup = (group) => {
//   //   setSupplierDetails((prev) => ({ ...prev, supplierGroup: group }));
//   // };
//   const handleSelectBillingCountry = (country) => {
//     setSupplierDetails((prev) => ({ ...prev, billingCountry: country }));
//   };

//   const handleSelectBillingState = (state) => {
//     setSupplierDetails((prev) => ({ ...prev, billingState: state }));
//   };

//   const handleSelectShippingCountry = (country) => {
//     setSupplierDetails((prev) => ({ ...prev, shippingCountry: country }));
//   };

//   const handleSelectShippingState = (state) => {
//     setSupplierDetails((prev) => ({ ...prev, shippingState: state }));
//   };

//   const validate = () => {
//     const requiredFields = [
//       "supplierName",
//       "emailId",
//       "billingAddress1",
//       "billingCity",
//       "billingCountry",
//       "billingState",
//       "billingZip",
//       "shippingAddress1",
//       "shippingCity",
//       "shippingCountry",
//       "shippingState",
//       "shippingZip",
//     ];

//     for (const field of requiredFields) {
//       if (!supplierDetails[field]) {
//         alert(`Please fill the required field: ${field}`);
//         return false;
//       }
//     }
//     return true;
//   };
//   const handleCancel = () => {
//     setFormData({ ...supplierDetails });
//     setErrors({});
//   };
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (validate()) {
//       const customerData = { ...supplierDetails };

//       try {
//         const response = await axios.post("/api/supplier", supplierData);
//         console.log("Customer data submitted successfully:", response.data);
//         alert("Customer created successfully!");
//       } catch (error) {
//         console.error(
//           "Error submitting customer data:",
//           error.response || error.message
//         );
//         alert("There was an error submitting the form. Please try again.");
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
//       <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
//         <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//           Create Supplier
//         </h1>

//         <form className="space-y-6" onSubmit={handleSubmit}>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Supplier Code
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.supplierCode}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     supplierCode: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Supplier Name <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.supplierName}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     supplierName: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Supplier Group <span className="text-red-500">*</span>
//               </label>
           
//               <div>
//                  {/* Group Search Component */}
//       <GroupSearch onSelectGroup={handleGroupSelect} />

// {/* Display selected group */}

// </div>
             

//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Supplier Type <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.supplierType}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     supplierType: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Email ID <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="email"
//                 value={supplierDetails.emailId}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     emailId: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Mobile Number
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.mobileNumber}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     mobileNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Billing Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={supplierDetails.billingAddress1}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={supplierDetails.billingAddress2}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={supplierDetails.billingCity}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectBillingCountry}
//                 onSelectState={handleSelectBillingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <br></br>
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={supplierDetails.billingZip}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Shipping Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={supplierDetails.shippingAddress1}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={supplierDetails.shippingAddress2}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={supplierDetails.shippingCity}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectShippingCountry}
//                 onSelectState={handleSelectShippingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <br></br>
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={supplierDetails.shippingZip}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Payment Terms<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.paymentTerms}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     paymentTerms: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Contact Person Name<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.contactPersonName}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     contactPersonName: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST NUMBER<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.gstNumber}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     gstNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Commission Rate<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.commissionRate}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     commissionRate: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GL ACCT<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.glAccount}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     glAccount: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 PAN<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.pan}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     pan: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST Category<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.gstCategory}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     gstCategory: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//           </div>

//           <div className="flex gap-3">
        
//             <button
//               type="submit"
//               className="bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition duration-300"
//             >
//               Submit
//             </button>
//             <button
//               type="submit"
//               onClick={handleCancel}
//               className="bg-gray-400 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition duration-300"
//             >
//               Cancel
//             </button>
          
//           </div>
//           <div className="flex justify-center">
        
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// is working  countries
//  'use client';

// import { useState, useEffect } from 'react';

// export default function SupplierForm() {
//   const [countries, setCountries] = useState([]);
//   const [searchTerm, setSearchTerm] = useState({ billing: '', shipping: '' });
//   const [filteredCountries, setFilteredCountries] = useState({ billing: [], shipping: [] });
//   const [isDropdownOpen, setIsDropdownOpen] = useState({ billing: false, shipping: false });

//   const initialFormData = {
//     customerCode: '',
//     customerName: '',
//     customerGroup: '',
//     customerType: '',
//     emailId: '',
//     mobileNumber: '',
//     telephone: '',
//     telephone2: '',
//     billingAddress1: '',
//     billingAddress2: '',
//     billingCity: '',
//     billingState: '',
//     billingZip: '',
//     billingCountry: '',
//     shippingAddress1: '',
//     shippingAddress2: '',
//     shippingCity: '',
//     shippingState: '',
//     shippingZip: '',
//     shippingCountry: '',
//     paymentTerms: '',
//     gstNumber: '',
//     gstCategory: '',
//     pan: '',
//     purchasePersonName: '',
//     commissionRate: '',
//     glAccount: '',
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});

//   const fetchCountries = async () => {
//     const res = await fetch('/api/countries');
//     const data = await res.json();
//     setCountries(data);
//     setFilteredCountries({
//       billing: data,
//       shipping: data,
//     });
//   };

//   const handleSelectCountry = (country, type) => {
//     // Set the selected country value
//     setFormData((prev) => ({
//       ...prev,
//       [`${type}Country`]: country.name,
//     }));
//     // Clear the search term
//     setSearchTerm((prev) => ({ ...prev, [type]: country.name }));
//     // Close the dropdown
//     setIsDropdownOpen((prev) => ({ ...prev, [type]: false }));
//   };

//   const handleSearch = (e, type) => {
//     const value = e.target.value.toLowerCase();
//     setSearchTerm((prev) => ({ ...prev, [type]: value }));

//     const filtered = countries.filter((country) =>
//       country.name.toLowerCase().includes(value) || country.code.toLowerCase().includes(value)
//     );
//     setFilteredCountries((prev) => ({
//       ...prev,
//       [type]: filtered,
//     }));
//     // Open the dropdown when searching
//     setIsDropdownOpen((prev) => ({ ...prev, [type]: true }));
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     Object.keys(formData).forEach((key) => {
//       if (!formData[key].trim()) {
//         newErrors[key] = 'This field is required';
//       }
//     });
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log('Form Data:', formData);
//       alert('Form Submitted Successfully!');
//       setFormData(initialFormData);
//       setErrors({});
//     } else {
//       alert('Please fill out all required fields.');
//     }
//   };

//   const handleCancel = () => {
//     setFormData({ ...initialFormData });
//     setErrors({});
//   };

//   useEffect(() => {
//     fetchCountries();
//   }, []);

//   return (
//     <div className="p-4 bg-gray-100 min-h-screen flex items-center justify-center">
//       <div className="bg-white shadow-lg rounded-lg p-8 md:p-10 max-w-6xl w-full">
//         <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">Supplier Form</h2>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Supplier Section */}
//           <SectionTitle title="Supplier" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Customer Code" name="customerCode" value={formData.customerCode} onChange={handleChange} error={errors.customerCode} />
//             <InputField label="Customer Group" name="customerGroup" value={formData.customerGroup} onChange={handleChange} error={errors.customerGroup} />
//             <InputField label="Customer Name" name="customerName" value={formData.customerName} onChange={handleChange} error={errors.customerName} />
//             <InputField label="Customer Type" name="customerType" value={formData.customerType} onChange={handleChange} error={errors.customerType} />
//           </div>

//           {/* Contact Detail Section */}
//           <SectionTitle title="Contact Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Email ID" name="emailId" value={formData.emailId} onChange={handleChange} error={errors.emailId} />
//             <InputField label="Telephone" name="telephone" value={formData.telephone} onChange={handleChange} error={errors.telephone} />
//             <InputField label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} />
//             <InputField label="Telephone 2" name="telephone2" value={formData.telephone2} onChange={handleChange} error={errors.telephone2} />
//           </div>

//           {/* Address Detail Section */}
//           <SectionTitle title="Address Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//             <div>
//               <h4 className="font-medium mb-2">Address - Bill To</h4>
//               <AddressFields
//                 prefix="billing"
//                 formData={formData}
//                 handleChange={handleChange}
//                 errors={errors}
//                 searchTerm={searchTerm.billing}
//                 handleSearch={(e) => handleSearch(e, 'billing')}
//                 filteredCountries={filteredCountries.billing}
//                 handleSelectCountry={handleSelectCountry}
//                 isDropdownOpen={isDropdownOpen.billing}
//               />
//             </div>
//             <div>
//               <h4 className="font-medium mb-2">Address - Ship To</h4>
//               <AddressFields
//                 prefix="shipping"
//                 formData={formData}
//                 handleChange={handleChange}
//                 errors={errors}
//                 searchTerm={searchTerm.shipping}
//                 handleSearch={(e) => handleSearch(e, 'shipping')}
//                 filteredCountries={filteredCountries.shipping}
//                 handleSelectCountry={handleSelectCountry}
//                 isDropdownOpen={isDropdownOpen.shipping}
//               />
//             </div>

//           </div>

//           {/* Other Detail Section */}
//           <SectionTitle title="Other Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Payment Terms" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} error={errors.paymentTerms} />
//             <InputField label="Purchase Person Name" name="purchasePersonName" value={formData.purchasePersonName} onChange={handleChange} error={errors.purchasePersonName} />
//             <InputField label="GST NUMBER" name="gstNumber" value={formData.gstNumber} onChange={handleChange} error={errors.gstNumber} />
//             <InputField label="Commission Rate" name="commissionRate" value={formData.commissionRate} onChange={handleChange} error={errors.commissionRate} />
//             <InputField label="GST Category" name="gstCategory" value={formData.gstCategory} onChange={handleChange} error={errors.gstCategory} />
//             <InputField label="GL ACCT" name="glAccount" value={formData.glAccount} onChange={handleChange} error={errors.glAccount} />
//             <InputField label="PAN" name="pan" value={formData.pan} onChange={handleChange} error={errors.pan} />
//           </div>

//           {/* Buttons */}
//           <div className="flex justify-end gap-4 mt-4">
//             <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition duration-200">Add</button>
//             <button type="button" onClick={handleCancel} className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition duration-200">Cancel</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// // Section Title Component
// function SectionTitle({ title }) {
//   return <h3 className="text-xl font-semibold mb-4 border-b pb-2">{title}</h3>;
// }

// // Reusable InputField Component with Error Handling
// function InputField({ label, name, value, onChange, error }) {
//   return (
//     <div>
//       <label className="block text-gray-700 font-medium mb-2">{label}</label>
//       <input
//         name={name}
//         value={value}
//         onChange={onChange}
//         placeholder={`Enter ${label}`}
//         className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400`}
//       />
//       {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//     </div>
//   );
// }

// // Address Fields Component
// function AddressFields({
//   prefix,
//   formData,
//   handleChange,
//   errors,
//   searchTerm,
//   handleSearch,
//   filteredCountries,
//   handleSelectCountry,
//   isDropdownOpen,
// }) {
//   return (
//     <>
//       <InputField label="Address 1" name={`${prefix}Address1`} value={formData[`${prefix}Address1`]} onChange={handleChange} error={errors[`${prefix}Address1`]} />
//       <InputField label="Address 2" name={`${prefix}Address2`} value={formData[`${prefix}Address2`]} onChange={handleChange} error={errors[`${prefix}Address2`]} />
//       <div className="relative">
//         <InputField
//           label="Country"
//           type="text"
//           value={searchTerm}
//           onChange={(e) => handleSearch(e, prefix)}
//           placeholder="Search Country"
//           className={`w-full border ${errors[`${prefix}Country`] ? 'border-red-500' : 'border-gray-300'} rounded-md p-3`}
//         />
//         {isDropdownOpen && searchTerm && (
//           <ul className="absolute w-full mt-1 bg-white shadow-lg rounded-md max-h-60 overflow-auto z-10">
//             {filteredCountries.map((country) => (
//               <li
//                 key={country.code}
//                 className="p-2 cursor-pointer hover:bg-gray-100"
//                 onClick={() => handleSelectCountry(country, prefix)}
//               >
//                 {country.name}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//       <InputField label="City" name={`${prefix}City`} value={formData[`${prefix}City`]} onChange={handleChange} error={errors[`${prefix}City`]} />
//       <InputField label="State" name={`${prefix}State`} value={formData[`${prefix}State`]} onChange={handleChange} error={errors[`${prefix}State`]} />
//       <InputField label="Zip" name={`${prefix}Zip`} value={formData[`${prefix}Zip`]} onChange={handleChange} error={errors[`${prefix}Zip`]} />

//     </>
//   );
// }

//old code

// 'use client';

// import { useState ,useEffect} from 'react';

// export default function SupplierForm() {
//   const [countries, setCountries] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filteredCountries, setFilteredCountries] = useState([]);
//   const initialFormData = {
//     supplierCode: '',
//     supplierName: '',
//     supplierGroup: '',
//     supplierType: '',
//     emailId: '',
//     mobileNumber: '',
//     telephone: '',
//     telephone2: '',
//     billingAddress1: '',
//     billingAddress2: '',
//     billingCity: '',
//     billingState: '',
//     billingZip: '',
//     billingCountry: '',
//     shippingAddress1: '',
//     shippingAddress2: '',
//     shippingCity: '',
//     shippingState: '',
//     shippingZip: '',
//     shippingCountry: '',
//     paymentTerms: '',
//     gstNumber: '',
//     gstCategory: '',
//     pan: '',
//     contactPersonName: '',
//     commissionRate: '',
//     glAccount: '',
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});  // To track form validation errors

//   const fetchCountries = async () => {
//     const res = await fetch('/api/countries');
//     const data = await res.json();
//     setCountries(data);
//     setFilteredCountries(data); // Initialize filtered list
//   };
//   const handleSelectCountry = (country) => {
//     // Update form data with selected country
//     setFormData((prev) => ({
//       ...prev,
//       shippingCountry: country.name, // Assuming 'shippingCountry' is the field name
//     }));
//     setSearchTerm(''); // Optionally clear search input after selecting
//   };
//   // search
//   const handleSearch = (e) => {
//     const value = e.target.value.toLowerCase();
//     setSearchTerm(value);

//     const filtered = countries.filter((country) =>
//       country.name.toLowerCase().includes(value) ||
//       country.code.toLowerCase().includes(value)
//     );
//     setFilteredCountries(filtered);
//   };
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     Object.keys(formData).forEach((key) => {
//       if (!formData[key].trim()) {
//         newErrors[key] = 'This field is required';
//       }
//     });
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0; // Returns true if no errors
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log('Form Data:', formData);
//       alert('Form Submitted Successfully!');
//       setFormData(initialFormData);  // Reset form after submission
//       setErrors({});
//     } else {
//       alert('Please fill out all required fields.');
//     }
//   };

//   const handleCancel = () => {
//     setFormData({ ...initialFormData });
//     setErrors({});
//   };
//   useEffect(() => {
//     fetchCountries();
//   }, []);

//   return (
//     <div className="p-4 bg-gray-100 min-h-screen flex items-center justify-center">
//       <div className="bg-white shadow-lg rounded-lg p-8 md:p-10 max-w-6xl w-full">
//         <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">Supplier Form</h2>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Supplier Section */}
//           <SectionTitle title="Supplier" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Supplier Code" name="supplierCode" value={formData.supplierCode} onChange={handleChange} error={errors.supplierCode} />
//             <InputField label="Supplier Group" name="supplierGroup" value={formData.supplierGroup} onChange={handleChange} error={errors.supplierGroup} />
//             <InputField label="Supplier Name" name="supplierName" value={formData.supplierName} onChange={handleChange} error={errors.supplierName} />
//             <InputField label="Supplier Type" name="supplierType" value={formData.supplierType} onChange={handleChange} error={errors.supplierType} />
//           </div>

//           {/* Contact Detail Section */}
//           <SectionTitle title="Contact Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Email ID" name="emailId" value={formData.emailId} onChange={handleChange} error={errors.emailId} />
//             <InputField label="Telephone" name="telephone" value={formData.telephone} onChange={handleChange} error={errors.telephone} />
//             <InputField label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} />
//             <InputField label="Telephone 2" name="telephone2" value={formData.telephone2} onChange={handleChange} error={errors.telephone2} />
//           </div>

//           {/* Address Detail Section */}
//           <SectionTitle title="Address Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//             <div>
//               <h4 className="font-medium mb-2">Address - Bill To</h4>
//               <AddressFields prefix="billing" formData={formData} handleChange={handleChange} errors={errors} />
//             </div>
//             <div>
//               <h4 className="font-medium mb-2">Address - Ship To</h4>
//               <AddressFields prefix="shipping" formData={formData} handleChange={handleChange} errors={errors} />
//             </div>
//           </div>

//           {/* Other Detail Section */}
//           <SectionTitle title="Other Detail" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <InputField label="Payment Terms" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} error={errors.paymentTerms} />
//             <InputField label="Contact Person Name" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} error={errors.contactPersonName} />
//             <InputField label="GST NUMBER" name="gstNumber" value={formData.gstNumber} onChange={handleChange} error={errors.gstNumber} />
//             <InputField label="Commission Rate" name="commissionRate" value={formData.commissionRate} onChange={handleChange} error={errors.commissionRate} />
//             <InputField label="GST Category" name="gstCategory" value={formData.gstCategory} onChange={handleChange} error={errors.gstCategory} />
//             <InputField label="GL ACCT" name="glAccount" value={formData.glAccount} onChange={handleChange} error={errors.glAccount} />
//             <InputField label="PAN" name="pan" value={formData.pan} onChange={handleChange} error={errors.pan} />
//           </div>

//           {/* Buttons */}
//           <div className="flex justify-end gap-4 mt-4">
//             <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition duration-200">Add</button>
//             <button type="button" onClick={handleCancel} className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition duration-200">Cancel</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

// // Section Title Component
// function SectionTitle({ title }) {
//   return <h3 className="text-xl font-semibold mb-4 border-b pb-2">{title}</h3>;
// }

// // Reusable InputField Component with Error Handling
// function InputField({ label, name, value, onChange, error }) {
//   return (
//     <div>
//       <label className="block text-gray-700 font-medium mb-2">{label}</label>
//       <input
//         name={name}
//         value={value}
//         onChange={onChange}
//         placeholder={`Enter ${label}`}
//         className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md p-3 focus:outline-none focus:ring focus:ring-blue-400`}
//       />
//       {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//     </div>
//   );
// }

// // Address Fields Component with Error Handling
// function AddressFields({ prefix, formData, handleChange, errors }) {
//   return (
//     <>
//       <InputField label="Address 1" name={`${prefix}Address1`} value={formData[`${prefix}Address1`]} onChange={handleChange} error={errors[`${prefix}Address1`]} />
//       <InputField label="Address 2" name={`${prefix}Address2`} value={formData[`${prefix}Address2`]} onChange={handleChange} error={errors[`${prefix}Address2`]} />
//       <InputField label="City" name={`${prefix}City`} value={formData[`${prefix}City`]} onChange={handleChange} error={errors[`${prefix}City`]} />
//       <InputField label="State" name={`${prefix}State`} value={formData[`${prefix}State`]} onChange={handleChange} error={errors[`${prefix}State`]} />
//       <InputField label="Zip Code" name={`${prefix}Zip`} value={formData[`${prefix}Zip`]} onChange={handleChange} error={errors[`${prefix}Zip`]} />
//       <InputField label="Country" name={`${prefix}Country`} value={formData[`${prefix}Country`]} onChange={handleChange} error={errors[`${prefix}Country`]} />
//     </>
//   );
// }
