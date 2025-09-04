"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const LeadDetailsForm = ({ leadId, initialData = null }) => {
  const router = useRouter();

  const [formData, setFormData] = useState({
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
  });

  const [errors, setErrors] = useState({});
  const isEditMode = Boolean(leadId);

  // Prefill if editing
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (isEditMode) {
      // fetch lead details from API if only leadId is provided
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
        // update existing lead
        const res = await axios.put(`/api/lead/${leadId}`, formData, config);
        if (res.status === 200) {
          alert("Lead updated successfully!");
          router.push("/leads"); // redirect back to leads list
        }
      } else {
        // create new lead
        const res = await axios.post("/api/lead", formData, config);
        if (res.status === 201) {
          alert("Lead created successfully!");
          router.push("/leads");
        }
      }
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Failed to save lead. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg"
    >
      <h1 className="text-2xl font-semibold mb-4">
        {isEditMode ? "Edit Lead" : "Add Lead"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Text/number/date fields */}
        {[
          { label: "Salutation", name: "salutation", type: "text" },
          { label: "Job Title", name: "jobTitle", type: "text" },
          { label: "Lead Owner", name: "leadOwner", type: "text" },
          { label: "First Name", name: "firstName", type: "text", required: true },
          { label: "Gender", name: "gender", type: "text" },
          { label: "Middle Name", name: "middleName", type: "text" },
          { label: "Source", name: "source", type: "text" },
          { label: "Last Name", name: "lastName", type: "text" },
          { label: "Email", name: "email", type: "email", required: true },
          { label: "Mobile No", name: "mobileNo", type: "text", required: true },
          { label: "Phone", name: "phone", type: "text" },
          { label: "Website", name: "website", type: "url" },
          { label: "Whatsapp", name: "whatsapp", type: "text" },
          { label: "Phone Ext", name: "phoneExt", type: "text" },
          { label: "Organization Name", name: "organizationName", type: "text" },
          { label: "Annual Revenue", name: "annualRevenue", type: "number" },
          { label: "Territory", name: "territory", type: "text" },
          { label: "No. of Employees", name: "employees", type: "number" },
          { label: "Industry", name: "industry", type: "text" },
          { label: "Fax", name: "fax", type: "text" },
          { label: "Market Segment", name: "marketSegment", type: "text" },
          { label: "City", name: "city", type: "text" },
          { label: "State", name: "state", type: "text" },
          { label: "County", name: "county", type: "text" },
          { label: "Qualification Status", name: "qualificationStatus", type: "text" },
          { label: "Qualified By", name: "qualifiedBy", type: "text" },
          { label: "Qualified On", name: "qualifiedOn", type: "date" },
        ].map(({ label, name, type, required }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700">
              {label}
            </label>
            <input
              type={type}
              name={name}
              value={formData[name] || ""}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder={`Enter ${label}`}
              required={required}
            />
            {errors[name] && (
              <span className="text-red-500 text-sm">{errors[name]}</span>
            )}
          </div>
        ))}

        {/* Dropdowns */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status || ""}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            required
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Lead Type</label>
          <select
            name="leadType"
            value={formData.leadType || ""}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select Lead Type</option>
            <option value="Client">Client</option>
            <option value="Channel Partner">Channel Partner</option>
            <option value="Consultant">Consultant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Request Type</label>
          <select
            name="requestType"
            value={formData.requestType || ""}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select Request Type</option>
            <option value="Product Enquiry">Product Enquiry</option>
            <option value="Request for Information">Request for Information</option>
            <option value="Suggestions">Suggestions</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <button
          type="submit"
          className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
        >
          {isEditMode ? "Update" : "Add"}
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
          onClick={() => router.push("/leads")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default LeadDetailsForm;
