"use client"
import React, { useState } from "react";

const PaymentDetailsForm = () => {
  const initialFormData = {
    paymentType: "",
    postingDate: "",
    company: "",
    modeOfPayment: "",
    paymentFromTo: "",
    partyType: "",
    accountPaidTo: "",
    costCenter: "",
    project: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.paymentType) newErrors.paymentType = "This field is required.";
    if (!formData.postingDate) newErrors.postingDate = "This field is required.";
    if (!formData.company) newErrors.company = "This field is required.";
    if (!formData.modeOfPayment) newErrors.modeOfPayment = "This field is required.";
    if (!formData.paymentFromTo) newErrors.paymentFromTo = "This field is required.";
    if (!formData.partyType) newErrors.partyType = "This field is required.";
    if (!formData.accountPaidTo) newErrors.accountPaidTo = "This field is required.";
    if (!formData.costCenter) newErrors.costCenter = "This field is required.";
    if (!formData.project) newErrors.project = "This field is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Payment details submitted successfully:", formData);
      alert("Payment details submitted successfully!");
      setFormData(initialFormData); // Reset form data after successful submission
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData); // Reset form data when canceling
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-semibold mb-4">Payment Details</h1>

      {/* Payment Type & Posting Date Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[ 
          { label: "Payment Type", name: "paymentType", type: "text", required: true },
          { label: "Posting Date", name: "postingDate", type: "date", required: true },
          { label: "Company", name: "company", type: "text", required: true },
          { label: "Mode of Payment", name: "modeOfPayment", type: "text", required: true },
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

      {/* Payment From/To & Party Type Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {[ 
          { label: "Payment From / To", name: "paymentFromTo", type: "text", required: true },
          { label: "Party Type", name: "partyType", type: "text", required: true },
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

      {/* Accounts & Account Paid To Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {[ 
          { label: "Accounts", name: "accounts", type: "text" },
          { label: "Account Paid To", name: "accountPaidTo", type: "text", required: true },
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

      {/* Accounting Dimensions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {[ 
          { label: "Cost Center", name: "costCenter", type: "text", required: true },
          { label: "Project", name: "project", type: "text", required: true },
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

      {/* Submit and Cancel Buttons */}
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
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default PaymentDetailsForm;
