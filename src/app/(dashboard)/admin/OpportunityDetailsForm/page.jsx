"use client";

import React, { useState, useEffect } from "react";

// Initial form state
const initialFormData = {
  opportunityName: "",
  accountName: "",
  value: "",
  stage: "",
  closeDate: "",
  probability: 50,
  leadSource: "",
  description: "",
};

const OpportunityForm = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [confirmation, setConfirmation] = useState({
    isVisible: false,
    message: "",
  });

  /* ----------------------------------------------------------
     AUTO-FILL OPPORTUNITY DATA FROM LEAD (sessionStorage)
  -----------------------------------------------------------*/
  useEffect(() => {
    const stored = sessionStorage.getItem("opportunityCopyData");

    if (stored) {
      const lead = JSON.parse(stored);

      setFormData((prev) => ({
        ...prev,
        opportunityName: `${lead.firstName} ${lead.lastName}`,
        accountName:
          lead.companyName || `${lead.firstName} ${lead.lastName}`,
        value: lead.estimatedValue || "",
        leadSource: lead.source || "",
        description: lead.description || "",
      }));
    }
  }, []);

  /* ----------------------------------------------------------
     HANDLE FORM FIELD CHANGE
  -----------------------------------------------------------*/
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  /* ----------------------------------------------------------
     VALIDATION
  -----------------------------------------------------------*/
  const validateForm = () => {
    if (!formData.opportunityName.trim()) {
      alert("Opportunity name is required");
      return false;
    }
    if (!formData.accountName.trim()) {
      alert("Account name is required");
      return false;
    }
    if (!formData.value || formData.value <= 0) {
      alert("Value must be a positive number");
      return false;
    }
    if (!formData.stage) {
      alert("Please select a sales stage");
      return false;
    }
    if (!formData.closeDate) {
      alert("Please select a closing date");
      return false;
    }
    return true;
  };

  /* ----------------------------------------------------------
     FINAL SUBMIT HANDLER (API POST)
  -----------------------------------------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Unauthorized! Please log in.");
            return;
        }

      const res = await fetch("/api/opportunity", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`,"Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        setConfirmation({
          isVisible: true,
          message: `Opportunity "${formData.opportunityName}" created successfully!`,
        });

        setFormData(initialFormData);

        setTimeout(() => {
          setConfirmation({ isVisible: false, message: "" });
        }, 4000);
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Request failed: " + err.message);
    }
  };

  const formFieldClass =
    "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue transition duration-150 ease-in-out";

  const requiredAsterisk = <span className="text-red-500">*</span>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Header */}
        <header className="bg-[#1e40af] p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-white">Create New Opportunity</h1>
          <p className="text-gray-200 text-sm mt-1">
            Capture essential details to move the deal forward.
          </p>
        </header>

        <div className="p-6 sm:p-10">
          {/* Confirmation Message */}
          {confirmation.isVisible && (
            <div className="mb-6 p-4 rounded-lg bg-[#10b981] text-white font-semibold flex items-center shadow-lg">
              <svg
                className="w-6 h-6 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>{confirmation.message}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opportunity Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Opportunity Name {requiredAsterisk}
                </label>
                <input
                  type="text"
                  name="opportunityName"
                  value={formData.opportunityName}
                  onChange={handleChange}
                  required
                  className={formFieldClass}
                />
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Account Name {requiredAsterisk}
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  required
                  className={formFieldClass}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Value */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Estimated Value (USD) {requiredAsterisk}
                </label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  required
                  min="1"
                  className={formFieldClass}
                />
              </div>

              {/* Stage */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sales Stage {requiredAsterisk}
                </label>
                <select
                  name="stage"
                  value={formData.stage}
                  onChange={handleChange}
                  required
                  className={`${formFieldClass} appearance-none pr-8`}
                >
                  <option value="" disabled>Select a pipeline stage</option>
                  <option value="qualification">Qualification</option>
                  <option value="needs_analysis">Needs Analysis</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Close Date */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expected Close Date {requiredAsterisk}
                </label>
                <input
                  type="date"
                  name="closeDate"
                  value={formData.closeDate}
                  onChange={handleChange}
                  required
                  className={formFieldClass}
                />
              </div>

              {/* Probability */}
              <div>
                <label className="block text-sm font-medium mb-1">Probability (%)</label>
                <input
                  type="range"
                  name="probability"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.probability}
                  onChange={handleChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-right mt-1 text-sm text-gray-500">
                  {formData.probability}%
                </p>
              </div>
            </div>

            {/* Lead Source */}
            <div>
              <label className="block text-sm font-medium mb-1">Lead Source</label>
              <select
                name="leadSource"
                value={formData.leadSource}
                onChange={handleChange}
                className={`${formFieldClass} appearance-none pr-8`}
              >
                <option value="" disabled>Select the source</option>
                <option value="web">Web Inquiry</option>
                <option value="referral">Customer Referral</option>
                <option value="partner">Partner</option>
                <option value="cold_call">Cold Call</option>
                <option value="conference">Conference</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description / Next Steps
              </label>
              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                className={formFieldClass}
                placeholder="Notes about the opportunity..."
              ></textarea>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#10b981] hover:bg-green-600 text-white font-bold py-3 rounded-lg"
            >
              Save Opportunity
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OpportunityForm;




// "use client";
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
//     requestType: "",
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

// const handleSubmit = async (e) => {
//   e.preventDefault();
//   if (validateForm()) {
//     try {
//       const res = await fetch("/api/opportunity", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await res.json();
//       if (result.success) {
//         alert("Opportunity added successfully");
//         setFormData(initialFormState);
//       } else {
//         alert("Error: " + result.error);
//       }
//     } catch (err) {
//       alert("Request failed: " + err.message);
//     }
//   }
// };


//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Opportunity Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Opportunity From", name: "opportunityFrom", type: "text", required: true },
//           { label: "Opportunity Type", name: "opportunityType", type: "text", required: true },
//           { label: "Opportunity Date", name: "opportunityDate", type: "date" },
//           { label: "Source", name: "source", type: "text" },
         
//           { label: "Sales Stage", name: "salesStage", type: "text", required: true },
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

//           <div>
//           <label className="block text-sm font-medium text-gray-700">Request Type</label>
//           <select
//             name="requestType"
//             value={formData.requestType || ""}
//             onChange={handleChange}
//             className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//           >
//             <option value="">Select Request Type</option>
//             <option value="Product Enquiry">Product Enquiry</option>
//             <option value="Request for Information">Request for Information</option>
//             <option value="Suggestions">Suggestions</option>
//             <option value="Other">Other</option>
//           </select>
//         </div>
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

