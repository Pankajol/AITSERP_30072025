"use client";
import React, { useState } from "react";

const OpportunityDetailsForm = () => {
  const [formData, setFormData] = useState({
    opportunityFrom: "",
    opportunityType: "",
    salesStage: "",
    source: "",
    party: "",
    opportunityOwner: "",
    expectedClosingDate: "",
    status: "",
    probability: "",
    employees: "",
    industry: "",
    city: "",
    state: "",
    annualRevenue: "",
    marketSegment: "",
    country: "",
    website: "",
    territory: "",
    currency: "",
    opportunityAmount: "",
    company: "",
    printLanguage: "",
    opportunityDate: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.opportunityFrom) newErrors.opportunityFrom = "This field is required.";
    if (!formData.opportunityType) newErrors.opportunityType = "This field is required.";
    if (!formData.salesStage) newErrors.salesStage = "This field is required.";
    if (!formData.expectedClosingDate) newErrors.expectedClosingDate = "Expected Closing Date is required.";
    if (!formData.opportunityAmount) newErrors.opportunityAmount = "Opportunity Amount is required.";
    if (formData.opportunityAmount && isNaN(formData.opportunityAmount)) {
      newErrors.opportunityAmount = "Opportunity Amount must be a valid number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (validateForm()) {
    try {
      const res = await fetch("/api/opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        alert("Opportunity added successfully");
        setFormData(initialFormState);
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Request failed: " + err.message);
    }
  }
};


  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">Opportunity Details</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: "Opportunity From", name: "opportunityFrom", type: "text", required: true },
          { label: "Opportunity Type", name: "opportunityType", type: "text", required: true },
          { label: "Sales Stage", name: "salesStage", type: "text", required: true },
          { label: "Source", name: "source", type: "text" },
          { label: "Party", name: "party", type: "text" },
          { label: "Opportunity Owner", name: "opportunityOwner", type: "text" },
          { label: "Expected Closing Date", name: "expectedClosingDate", type: "date", required: true },
          { label: "Status", name: "status", type: "text" },
          { label: "Probability (%)", name: "probability", type: "number" },
          { label: "No. of Employees", name: "employees", type: "number" },
          { label: "Industry", name: "industry", type: "text" },
          { label: "City", name: "city", type: "text" },
          { label: "State", name: "state", type: "text" },
          { label: "Annual Revenue", name: "annualRevenue", type: "number" },
          { label: "Market Segment", name: "marketSegment", type: "text" },
          { label: "Country", name: "country", type: "text" },
          { label: "Website", name: "website", type: "url" },
          { label: "Territory", name: "territory", type: "text" },
          { label: "Currency", name: "currency", type: "text" },
          { label: "Opportunity Amount (INR)", name: "opportunityAmount", type: "number", required: true },
          { label: "Company", name: "company", type: "text" },
          { label: "Print Language", name: "printLanguage", type: "text" },
          { label: "Opportunity Date", name: "opportunityDate", type: "date" },
        ].map(({ label, name, type, required }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder={`Enter ${label}`}
              required={required}
            />
            {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button
          type="submit"
          className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
        >
          Add
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
          onClick={() => setFormData({})}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default OpportunityDetailsForm;

// import React, { useState } from "react";

// const OpportunityDetailsForm = () => {
//   const [formData, setFormData] = useState({
//     opportunityFrom: "",
//     opportunityType: "",
//     salesStage: "",
//     source: "",
//     party: "",
//     opportunityOwner: "",
//     expectedClosingDate: "",
//     status: "",
//     probability: "",
//     employees: "",
//     industry: "",
//     city: "",
//     state: "",
//     annualRevenue: "",
//     marketSegment: "",
//     country: "",
//     website: "",
//     territory: "",
//     currency: "",
//     opportunityAmount: "",
//     company: "",
//     printLanguage: "",
//     opportunityDate: "",
//   });

//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.opportunityFrom) newErrors.opportunityFrom = "This field is required.";
//     if (!formData.opportunityType) newErrors.opportunityType = "This field is required.";
//     if (!formData.salesStage) newErrors.salesStage = "This field is required.";
//     if (!formData.expectedClosingDate) newErrors.expectedClosingDate = "Expected Closing Date is required.";
//     if (!formData.opportunityAmount) newErrors.opportunityAmount = "Opportunity Amount is required.";
//     if (formData.opportunityAmount && isNaN(formData.opportunityAmount)) {
//       newErrors.opportunityAmount = "Opportunity Amount must be a valid number.";
//     }
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log("Form submitted successfully:", formData);
//       alert("Form submitted successfully!");
//       setFormData({
//         opportunityFrom: "",
//         opportunityType: "",
//         salesStage: "",
//         source: "",
//         party: "",
//         opportunityOwner: "",
//         expectedClosingDate: "",
//         status: "",
//         probability: "",
//         employees: "",
//         industry: "",
//         city: "",
//         state: "",
//         annualRevenue: "",
//         marketSegment: "",
//         country: "",
//         website: "",
//         territory: "",
//         currency: "",
//         opportunityAmount: "",
//         company: "",
//         printLanguage: "",
//         opportunityDate: "",
//       });
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Opportunity Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Opportunity From", name: "opportunityFrom", type: "text", required: true },
//           { label: "Opportunity Type", name: "opportunityType", type: "text", required: true },
//           { label: "Sales Stage", name: "salesStage", type: "text", required: true },
//           { label: "Source", name: "source", type: "text" },
//           { label: "Party", name: "party", type: "text" },
//           { label: "Opportunity Owner", name: "opportunityOwner", type: "text" },
//           { label: "Expected Closing Date", name: "expectedClosingDate", type: "date", required: true },
//           { label: "Status", name: "status", type: "text" },
//           { label: "Probability (%)", name: "probability", type: "number" },
//           { label: "No. of Employees", name: "employees", type: "number" },
//           { label: "Industry", name: "industry", type: "text" },
//           { label: "City", name: "city", type: "text" },
//           { label: "State", name: "state", type: "text" },
//           { label: "Annual Revenue", name: "annualRevenue", type: "number" },
//           { label: "Market Segment", name: "marketSegment", type: "text" },
//           { label: "Country", name: "country", type: "text" },
//           { label: "Website", name: "website", type: "url" },
//           { label: "Territory", name: "territory", type: "text" },
//           { label: "Currency", name: "currency", type: "text" },
//           { label: "Opportunity Amount (INR)", name: "opportunityAmount", type: "number", required: true },
//           { label: "Company", name: "company", type: "text" },
//           { label: "Print Language", name: "printLanguage", type: "text" },
//           { label: "Opportunity Date", name: "opportunityDate", type: "date" },
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
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Add
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={() => setFormData({})}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default OpportunityDetailsForm;

// import React, { useState } from "react";

// const OpportunityForm = () => {
//   const [formData, setFormData] = useState({
//     opportunityFrom: "",
//     opportunityType: "",
//     source: "",
//     salesStage: "",
//     party: "",
//     opportunityOwner: "",
//     expectedClosingDate: "",
//     status: "",
//     probability: "",
//     noOfEmployees: "",
//     industry: "",
//     city: "",
//     state: "",
//     country: "",
//     annualRevenue: "",
//     marketSegment: "",
//     website: "",
//     territory: "",
//     currency: "",
//     opportunityAmount: "",
//     company: "",
//     printLanguage: "",
//     opportunityDate: "",
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Replace with your API endpoint
//     console.log(formData);
//     alert("Form submitted successfully!");
//   };

//   return (
//     <div className="bg-gray-50 min-h-screen flex items-center justify-center">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full"
//       >
//         {/* Section: Opportunity Details */}
//         <h3 className="text-xl font-semibold text-orange-600 mb-4">
//           Opportunity Details
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">Opportunity From</label>
//             <input
//               type="text"
//               name="opportunityFrom"
//               value={formData.opportunityFrom}
//               onChange={handleChange}
//               placeholder="Enter Opportunity From"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Opportunity Type</label>
//             <input
//               type="text"
//               name="opportunityType"
//               value={formData.opportunityType}
//               onChange={handleChange}
//               placeholder="Enter Opportunity Type"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Source</label>
//             <input
//               type="text"
//               name="source"
//               value={formData.source}
//               onChange={handleChange}
//               placeholder="Enter Source"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Sales Stage</label>
//             <input
//               type="text"
//               name="salesStage"
//               value={formData.salesStage}
//               onChange={handleChange}
//               placeholder="Enter Sales Stage"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Section: Organization */}
//         <h3 className="text-xl font-semibold text-orange-600 my-4">
//           Organization
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">No. of Employees</label>
//             <input
//               type="text"
//               name="noOfEmployees"
//               value={formData.noOfEmployees}
//               onChange={handleChange}
//               placeholder="Enter No. of Employees"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Industry</label>
//             <input
//               type="text"
//               name="industry"
//               value={formData.industry}
//               onChange={handleChange}
//               placeholder="Enter Industry"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Section: Opportunity Value */}
//         <h3 className="text-xl font-semibold text-orange-600 my-4">
//           Opportunity Value
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">Currency</label>
//             <input
//               type="text"
//               name="currency"
//               value={formData.currency}
//               onChange={handleChange}
//               placeholder="Enter Currency"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">
//               Opportunity Amount (INR)
//             </label>
//             <input
//               type="text"
//               name="opportunityAmount"
//               value={formData.opportunityAmount}
//               onChange={handleChange}
//               placeholder="Enter Opportunity Amount"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Buttons */}
//         <div className="flex justify-between items-center mt-6">
//           <button
//             type="submit"
//             className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
//           >
//             Add
//           </button>
//           <button
//             type="button"
//             className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
//             onClick={() => alert("Cancelled")}
//           >
//             Cancel
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default OpportunityForm;

