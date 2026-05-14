"use client"
import React, { useState, useEffect } from "react";
import axios from "axios";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";

export default function CustomerPage({ customerId }) {
  const [customerDetails, setCustomerDetails] = useState({
    customerCode: "",
    customerName: "",
    customerGroup: "",
    customerType: "",
    emailId: "",
    fromLead: "",
    mobileNumber: "",
    fromOpportunity: "",
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingState: null,
    billingZip: "",
    billingCountry: null,
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: null,
    shippingZip: "",
    shippingCountry: null,
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    contactPersonName: "",
    commissionRate: "",
    glAccount: "",
  });

  const initialFormState = { ...customerDetails };

  // Effect hook to fetch customer details if editing
  useEffect(() => {
    if (customerId) {
      const fetchCustomerDetails = async () => {
        try {
          const response = await axios.get(`/api/customers/${customerId}`);
          setCustomerDetails(response.data);
        } catch (error) {
          console.error("Error fetching customer details:", error);
        }
      };

      fetchCustomerDetails();
    } else {
      // Generate a new customer code if creating new customer
      generateCustomerCode();
    }
  }, [customerId]);

  const generateCustomerCode = async () => {
    try {
      const lastCodeRes = await fetch("/api/lastCustomerCode");
      const { lastCustomerCode } = await lastCodeRes.json();
      const lastNumber = parseInt(lastCustomerCode.split("-")[1], 10) || 0;
      let newNumber = lastNumber + 1;

      let generatedCode = "";
      let codeExists = true;

      while (codeExists) {
        generatedCode = `CUST-${newNumber.toString().padStart(4, "0")}`;
        const checkRes = await fetch(`/api/checkCustomerCode?code=${generatedCode}`);
        const { exists } = await checkRes.json();
        if (!exists) break;
        newNumber++;
      }

      setCustomerDetails((prev) => ({
        ...prev,
        customerCode: generatedCode,
      }));
    } catch (error) {
      console.error("Failed to generate code:", error);
    }
  };
  const [selectedGroup, setSelectedGroup] = useState(null);
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setCustomerDetails((prev) => ({ ...prev, customerGroup: group.name }));
  };

  const handleSelectBillingCountry = (country) => {
    setCustomerDetails((prev) => ({ ...prev, billingCountry: country.name }));
  };

  const handleSelectBillingState = (state) => {
    setCustomerDetails((prev) => ({ ...prev, billingState: state.name }));
  };

  const handleSelectShippingCountry = (country) => {
    setCustomerDetails((prev) => ({ ...prev, shippingCountry: country.name }));
  };

  const handleSelectShippingState = (state) => {
    setCustomerDetails((prev) => ({ ...prev, shippingState: state.name }));
  };

  const customerTypeOptions = [
    { value: "Individual", label: "Individual" },
    { value: "Business", label: "Business" },
    { value: "Government", label: "Government" },
  ];
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validate()) {
      try {
        if (customerId) {
          // Edit customer
          await axios.put(`/api/customers/${customerId}`, customerDetails);
          alert("Customer updated successfully!");
        } else {
          // Create new customer
          await axios.post("/api/customers", customerDetails);
          alert("Customer created successfully!");
        }
        setCustomerDetails(initialFormState); // Reset form
      } catch (error) {
        console.error("Error submitting form:", error);
        alert("There was an error submitting the form.");
      }
    }
  };

  const validate = () => {
    const requiredFields = [
      "customerName",
      "emailId",
      "billingAddress1",
      "billingCity",
      "billingCountry",
      "billingState",
      "billingZip",
      "shippingAddress1",
      "shippingCity",
      "shippingCountry",
      "shippingState",
      "shippingZip",
    ];

    for (const field of requiredFields) {
      if (!customerDetails[field]) {
        alert(`Please fill the required field: ${field}`);
        return false;
      }
    }
    return true;
  };

  return (
<div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Create Customer
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Customer Code
              </label>
              <input
                type="text"
                value={customerDetails.customerCode}
                readOnly // Prevent manual editing
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerDetails.customerName}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    customerName: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Customer Group <span className="text-red-500">*</span>
              </label>
              <GroupSearch onSelectGroup={handleGroupSelect} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                name="customerType"
                value={customerDetails.customerType}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    customerType: e.target.value,
                  })
                }
                required
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {customerTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Email ID <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={customerDetails.emailId}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    emailId: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <input
                type="text"
                value={customerDetails.mobileNumber}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    mobileNumber: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Billing Address
              </label>
              <input
                type="text"
                placeholder="Address Line 1"
                value={customerDetails.billingAddress1}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    billingAddress1: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={customerDetails.billingAddress2}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    billingAddress2: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <input
                type="text"
                placeholder="City"
                value={customerDetails.billingCity}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    billingCity: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <CountryStateSearch
                onSelectCountry={handleSelectBillingCountry}
                onSelectState={handleSelectBillingState}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <br />
              <input
                type="text"
                placeholder="PIN Code"
                value={customerDetails.billingZip}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    billingZip: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Shipping Address
              </label>
              <input
                type="text"
                placeholder="Address Line 1"
                value={customerDetails.shippingAddress1}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    shippingAddress1: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={customerDetails.shippingAddress2}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    shippingAddress2: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <input
                type="text"
                placeholder="City"
                value={customerDetails.shippingCity}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    shippingCity: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <CountryStateSearch
                onSelectCountry={handleSelectShippingCountry}
                onSelectState={handleSelectShippingState}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <br />
              <input
                type="text"
                placeholder="PIN Code"
                value={customerDetails.shippingZip}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    shippingZip: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <input
                type="text"
                value={customerDetails.paymentTerms}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    paymentTerms: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={customerDetails.gstNumber}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    gstNumber: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                GST Category
              </label>
              <input
                type="text"
                value={customerDetails.gstCategory}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    gstCategory: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                PAN
              </label>
              <input
                type="text"
                value={customerDetails.pan}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    pan: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Contact Person Name
              </label>
              <input
                type="text"
                value={customerDetails.contactPersonName}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    contactPersonName: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                Commission Rate
              </label>
              <input
                type="text"
                value={customerDetails.commissionRate}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    commissionRate: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">
                GL Account
              </label>
              <input
                type="text"
                value={customerDetails.glAccount}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    glAccount: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-8">
          <button
              type="submit"
              className={`px-6 py-3 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                customerId ? "bg-blue-600" : "bg-green-600"
              }`}
            >
              {customerId ? "Update Customer" : "Create Customer"}
            </button>
            <button
              type="submit"
              className="bg-gray-600 text-white rounded-lg px-6 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
