"use client";
import React, { useState } from "react";

const OpportunityDetailsForm = () => {
  const initialFormState = {
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
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const requiredFields = [
    "opportunityFrom",
    "opportunityType",
    "salesStage",
    "expectedClosingDate",
    "opportunityAmount",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field]) newErrors[field] = "This field is required.";
    });

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
          { label: "Opportunity From", name: "opportunityFrom", type: "text" },
          { label: "Opportunity Type", name: "opportunityType", type: "text" },
          { label: "Sales Stage", name: "salesStage", type: "text" },
          { label: "Source", name: "source", type: "text" },
          { label: "Party", name: "party", type: "text" },
          { label: "Opportunity Owner", name: "opportunityOwner", type: "text" },
          { label: "Expected Closing Date", name: "expectedClosingDate", type: "date" },
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
          { label: "Opportunity Amount (INR)", name: "opportunityAmount", type: "number" },
          { label: "Company", name: "company", type: "text" },
          { label: "Print Language", name: "printLanguage", type: "text" },
          { label: "Opportunity Date", name: "opportunityDate", type: "date" },
        ].map(({ label, name, type }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {requiredFields.includes(name) && <span className="text-red-500"> *</span>}
            </label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder={`Enter ${label}`}
              required={requiredFields.includes(name)}
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
          onClick={() => setFormData(initialFormState)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default OpportunityDetailsForm;



// import React, { useState } from "react";

// const LeadDetailsForm = () => {
//   const [formData, setFormData] = useState({
//     salutation: "",
//     jobTitle: "",
//     leadOwner: "",
//     firstName: "",
//     gender: "",
//     status: "",
//     middleName: "",
//     source: "",
//     leadType: "",
//     lastName: "",
//     requestType: "",
//     email: "",
//     mobileNo: "",
//     phone: "",
//     website: "",
//     whatsapp: "",
//     phoneExt: "",
//     organizationName: "",
//     annualRevenue: "",
//     territory: "",
//     employees: "",
//     industry: "",
//     fax: "",
//     marketSegment: "",
//     city: "",
//     state: "",
//     county: "",
//     qualificationStatus: "",
//     qualifiedBy: "",
//     qualifiedOn: "",
//   });

//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.firstName) newErrors.firstName = "First Name is required.";
//     if (!formData.email) newErrors.email = "Email is required.";
//     if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email))
//       newErrors.email = "Invalid email address.";
//     if (!formData.mobileNo) newErrors.mobileNo = "Mobile Number is required.";
//     if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo))
//       newErrors.mobileNo = "Mobile Number must be 10 digits.";

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log("Form submitted successfully:", formData);
//       alert("Form submitted successfully!");
//       setFormData({
//         salutation: "",
//         jobTitle: "",
//         leadOwner: "",
//         firstName: "",
//         gender: "",
//         status: "",
//         middleName: "",
//         source: "",
//         leadType: "",
//         lastName: "",
//         requestType: "",
//         email: "",
//         mobileNo: "",
//         phone: "",
//         website: "",
//         whatsapp: "",
//         phoneExt: "",
//         organizationName: "",
//         annualRevenue: "",
//         territory: "",
//         employees: "",
//         industry: "",
//         fax: "",
//         marketSegment: "",
//         city: "",
//         state: "",
//         county: "",
//         qualificationStatus: "",
//         qualifiedBy: "",
//         qualifiedOn: "",
//       });
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Lead Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Example for one field */}
//         {[
//           { label: "Salutation", name: "salutation", type: "text" },
//           { label: "Job Title", name: "jobTitle", type: "text" },
//           { label: "Lead Owner", name: "leadOwner", type: "text" },
//           { label: "First Name", name: "firstName", type: "text", required: true },
//           { label: "Gender", name: "gender", type: "text" },
//           { label: "Status", name: "status", type: "text" },
//           { label: "Middle Name", name: "middleName", type: "text" },
//           { label: "Source", name: "source", type: "text" },
//           { label: "Lead Type", name: "leadType", type: "text" },
//           { label: "Last Name", name: "lastName", type: "text" },
//           { label: "Request Type", name: "requestType", type: "text" },
//           { label: "Email", name: "email", type: "email", required: true },
//           { label: "Mobile No", name: "mobileNo", type: "text", required: true },
//           { label: "Phone", name: "phone", type: "text" },
//           { label: "Website", name: "website", type: "url" },
//           { label: "Whatsapp", name: "whatsapp", type: "text" },
//           { label: "Phone Ext", name: "phoneExt", type: "text" },
//           { label: "Organization Name", name: "organizationName", type: "text" },
//           { label: "Annual Revenue", name: "annualRevenue", type: "number" },
//           { label: "Territory", name: "territory", type: "text" },
//           { label: "No. of Employees", name: "employees", type: "number" },
//           { label: "Industry", name: "industry", type: "text" },
//           { label: "Fax", name: "fax", type: "text" },
//           { label: "Market Segment", name: "marketSegment", type: "text" },
//           { label: "City", name: "city", type: "text" },
//           { label: "State", name: "state", type: "text" },
//           { label: "County", name: "county", type: "text" },
//           { label: "Qualification Status", name: "qualificationStatus", type: "text" },
//           { label: "Qualified By", name: "qualifiedBy", type: "text" },
//           { label: "Qualified On", name: "qualifiedOn", type: "date" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="label block text-sm font-medium text-gray-700">{label}</label>
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

// export default LeadDetailsForm;

