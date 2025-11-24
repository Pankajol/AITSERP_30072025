"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const LeadDetailsForm = ({ leadId, initialData = null }) => {
  const router = useRouter();

  const initialFormState = {
    salutation: "",
    jobTitle: "",
    leadOwner: "",
    firstName: "",
    gender: "",
    middleName: "",
    source: "",
    lastName: "",
    email: "",
    mobileNo: "",
    phone: "",
    website: "",
    whatsapp: "",
    phoneExt: "",
    organizationName: "",
    annualRevenue: "",
    territory: "",
    employees: "",
    industry: "",
    fax: "",
    marketSegment: "",
    city: "",
    state: "",
    county: "",
    qualificationStatus: "",
    qualifiedBy: "",
    qualifiedOn: "",
    status: "",
    leadType: "",
    requestType: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [confirmation, setConfirmation] = useState({
    isVisible: false,
    message: ""
  });

  const isEditMode = Boolean(leadId);

  // Prefill if editing
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (isEditMode) {
      const fetchLead = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/lead/${leadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(res.data);
        } catch (err) {
          console.error("Error fetching lead:", err);
        }
      };
      fetchLead();
    }
  }, [leadId, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First Name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email address.";
    if (!formData.mobileNo) newErrors.mobileNo = "Mobile Number is required.";
    if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo))
      newErrors.mobileNo = "Mobile Number must be 10 digits.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("User is not authenticated");
      return;
    }

    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      if (isEditMode) {
        await axios.put(`/api/lead/${leadId}`, formData, config);

        setConfirmation({
          isVisible: true,
          message: "Lead updated successfully!"
        });
      } else {
        await axios.post("/api/lead", formData, config);

        setConfirmation({
          isVisible: true,
          message: "Lead created successfully!"
        });
      }

      setTimeout(() => {
        router.push("/leads");
      }, 1500);

    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Failed to save lead. Please try again.");
    }
  };

  // UI Styling classes
  const formFieldClass =
    "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600";

  const requiredAsterisk = <span className="text-red-500">*</span>;

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">

        {/* Header */}
        <header className="bg-[#1e40af] p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-white">
            {isEditMode ? "Edit Lead" : "Create New Lead"}
          </h1>
          <p className="text-gray-200 text-sm mt-1">
            Enter lead details to manage your pipeline.
          </p>
        </header>

        <div className="p-6 sm:p-10">

          {/* Success Message */}
          {confirmation.isVisible && (
            <div className="mb-6 p-4 rounded-lg bg-[#10b981] text-white font-semibold flex items-center shadow-lg">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
              </svg>
              <span>{confirmation.message}</span>
            </div>
          )}

          {/* FORM */}
          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Fields in 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {[
                { label: "Salutation", name: "salutation" },
                { label: "Job Title", name: "jobTitle" },
                { label: "Lead Owner", name: "leadOwner" },
                { label: "First Name", name: "firstName", required: true },
                { label: "Gender", name: "gender" },
                { label: "Middle Name", name: "middleName" },
                { label: "Source", name: "source" },
                { label: "Last Name", name: "lastName" },
                { label: "Email", name: "email", required: true },
                { label: "Mobile No", name: "mobileNo", required: true },
                { label: "Phone", name: "phone" },
                { label: "Website", name: "website" },
                { label: "Whatsapp", name: "whatsapp" },
                { label: "Phone Ext", name: "phoneExt" },
                { label: "Organization", name: "organizationName" },
                { label: "Annual Revenue", name: "annualRevenue" },
                { label: "Territory", name: "territory" },
                { label: "Employees", name: "employees" },
                { label: "Industry", name: "industry" },
                { label: "Fax", name: "fax" },
                { label: "Market Segment", name: "marketSegment" },
                { label: "City", name: "city" },
                { label: "State", name: "state" },
                { label: "County", name: "county" },
              ].map(({ label, name, required }) => (
                <div key={name}>
                  <label className="block text-sm font-medium mb-1">
                    {label} {required && requiredAsterisk}
                  </label>
                  <input
                    type="text"
                    name={name}
                    value={formData[name] || ""}
                    onChange={handleChange}
                    className={formFieldClass}
                    required={required}
                  />
                  {errors[name] && <p className="text-red-500 text-sm">{errors[name]}</p>}
                </div>
              ))}

              {/* Dropdown: Status */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Status {requiredAsterisk}
                </label>
                <select
                  name="status"
                  value={formData.status || ""}
                  onChange={handleChange}
                  required
                  className={`${formFieldClass} appearance-none pr-8`}
                >
                  <option value="">Select Status</option>
                  <option value="Lead">Lead</option>
                  <option value="Open">Open</option>
                  <option value="Replied">Replied</option>
                  <option value="Opportunity">Opportunity</option>
                  <option value="Quotation">Quotation</option>
                  <option value="Lost Quotation">Lost Quotation</option>
                  <option value="Interested">Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Do Not Contact">Do Not Contact</option>
                </select>
              </div>

              {/* Dropdown: Lead Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Lead Type</label>
                <select
                  name="leadType"
                  value={formData.leadType || ""}
                  onChange={handleChange}
                  className={`${formFieldClass} appearance-none pr-8`}
                >
                  <option value="">Select Lead Type</option>
                  <option value="Client">Client</option>
                  <option value="Channel Partner">Channel Partner</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>

              {/* Dropdown: Request Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Request Type</label>
                <select
                  name="requestType"
                  value={formData.requestType || ""}
                  onChange={handleChange}
                  className={`${formFieldClass} appearance-none pr-8`}
                >
                  <option value="">Select Request Type</option>
                  <option value="Product Enquiry">Product Enquiry</option>
                  <option value="Request for Information">Request for Information</option>
                  <option value="Suggestions">Suggestions</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>

            {/* Buttons */}
            <button
              type="submit"
              className="w-full bg-[#10b981] hover:bg-green-600 text-white font-bold py-3 rounded-lg"
            >
              {isEditMode ? "Update Lead" : "Save Lead"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsForm;

