"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
import { toast } from "react-toastify";

export default function CustomerManagement() {
  const [view, setView] = useState("list");
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
   const [availableUsers, setAvailableUsers] = useState([]);

  // ✅ MISSING — now added
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [customerDetails, setCustomerDetails] = useState({
    customerCode: "",
    customerName: "",
    customerGroup: "",
    customerType: "",
    emailId: "",
    mobileNumber: "",
    billingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    shippingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    contactPersonName: "",
    commissionRate: "",
    glAccount: null,
     assignedAgents: [],
  });


    // 1. Filtered Users load karne ka logic
 const loadUsers = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/company/users", { 
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // Log check karne ke liye (Optional)
    console.log("Raw Data from API:", res.data);

    // Filter Logic: Agar roles array mein 'Support Executive' ya 'Employee' hai
    const filtered = (res.data || []).filter(user => 
      user.roles && user.roles.some(role => role === "Support Executive" || role === "Agent" )
    );
    
    setAvailableUsers(filtered);
  } catch (err) {
    toast.error("Users load karne mein error");
    console.error(err);
  }
};

  useEffect(() => {
    loadUsers();
  }, []);

  // 2. Selection handle karne ka logic (Checkbox style)
  const handleAgentToggle = (userId) => {
    setCustomerDetails((prev) => {
      const agents = prev.assignedAgents.includes(userId)
        ? prev.assignedAgents.filter((id) => id !== userId) // Remove
        : [...prev.assignedAgents, userId]; // Add
      return { ...prev, assignedAgents: agents };
    });
  };


  /* ✅ FETCH CUSTOMERS */
  const fetchCustomers = async () => {

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(res.data.data || []);
      console.log("Fetched customers:", res.data.data);
    } catch (err) {
      toast.error("Failed to load customers");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  /* ✅ GENERATE CUSTOMER CODE */
  const generateCustomerCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/lastCustomerCode", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const { lastCustomerCode } = await res.json();
      const num = parseInt(lastCustomerCode.split("-")[1], 10) + 1;

      setCustomerDetails((prev) => ({
        ...prev,
        customerCode: `CUST-${num.toString().padStart(4, "0")}`,
      }));
    } catch (err) {
      console.error("Error generating code", err);
    }
  };

  /* ✅ HANDLE INPUT CHANGE */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
  };

  /* ✅ ADDRESS HANDLING */
  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...customerDetails[key]];
    arr[idx][field] = value;
    setCustomerDetails((prev) => ({ ...prev, [key]: arr }));
  };

  const addAddress = (type) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setCustomerDetails((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
      ],
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (customerDetails[key].length === 1) return;
    setCustomerDetails((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  /* ✅ VALIDATION */
  const validate = () => {
    const required = [
      "customerName",
      "customerGroup",
      "customerType",
      "emailId",
      "mobileNumber",
      "gstNumber",
      "gstCategory",
      "pan",
      "glAccount",
    ];

    for (let field of required) {
      const value = customerDetails[field];
      if (!value || (field === "glAccount" && !value?._id)) {
        toast.error(`${field} is required`);
        return false;
      }
    }

    return true;
  };

  /* ✅ SUBMIT FORM */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const token = localStorage.getItem("token");
    const payload = {
      ...customerDetails,
      assignedAgents: customerDetails.assignedAgents.map((id) => ({ _id: id })),
      glAccount: customerDetails.glAccount?._id || null,
    };

    try {
      if (customerDetails._id) {
        await axios.put(`/api/customers/${customerDetails._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/customers", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast.success("Customer saved successfully");
      resetForm();
      fetchCustomers();
    } catch (err) {
      toast.error("Error saving customer");
    }
  };

  /* ✅ RESET FORM */
  const resetForm = () => {
    setCustomerDetails({
      customerCode: "",
      customerName: "",
      customerGroup: "",
      customerType: "",
      emailId: "",
      mobileNumber: "",
      billingAddresses: [
        { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
      ],
      shippingAddresses: [
        { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
      ],
      paymentTerms: "",
      gstNumber: "",
      gstCategory: "",
      pan: "",
      contactPersonName: "",
      commissionRate: "",
      glAccount: null,
    });

    setView("list");
  };

  /* ✅ EDIT */
  const handleEdit = (c) => {
    setCustomerDetails(c);
    setView("form");
  };

  /* ✅ DELETE */
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;

    const token = localStorage.getItem("token");

    await axios.delete(`/api/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchCustomers();
  };

  /* ✅ SEARCH FILTER */
  const filtered = customers.filter((c) =>
    [
      c.customerCode,
      c.customerName,
      c.emailId,
      c.customerGroup,
      c.customerType,
      c.glAccount?.accountCode,
    ].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  /* ✅ DOWNLOAD TEMPLATE */
  const downloadTemplate = () => {
  const header = [
    "customerName",
    "customerGroup",
    "customerType",
    "emailId",
    "mobileNumber",
    "gstNumber",
    "gstCategory",
    "pan",
    "contactPersonName",
    "commissionRate",
    "paymentTerms",

    // ✅ Billing Address Fields
    "billingAddress1",
    "billingAddress2",
    "billingCity",
    "billingState",
    "billingPin",
    "billingCountry",

    // ✅ Shipping Address Fields
    "shippingAddress1",
    "shippingAddress2",
    "shippingCity",
    "shippingState",
    "shippingPin",
    "shippingCountry",

    // ✅ GL Account (BankHead)
    "glAccount"
  ];

  const sampleRow = [
    "John Doe",                   // customerName
    "Retail",                     // customerGroup
    "Individual",                 // customerType (Individual/Business/Government)
    "john@example.com",           // emailId
    "9876543210",                 // mobileNumber
    "22ABCDE1234F1Z5",            // gstNumber
    "Registered Regular",         // gstCategory
    "ABCDE1234F",                 // pan
    "John Manager",               // contactPersonName
    "5",                          // commissionRate
    "30",                         // paymentTerms

    // ✅ Billing Address
    "Line 1",                     // billingAddress1
    "Line 2",                     // billingAddress2
    "Mumbai",                     // billingCity
    "Maharashtra",                // billingState
    "400001",                     // billingPin
    "India",                      // billingCountry

    // ✅ Shipping Address
    "Line 1",                     // shippingAddress1
    "Line 2",                     // shippingAddress2
    "Mumbai",                     // shippingCity
    "Maharashtra",                // shippingState
    "400002",                     // shippingPin
    "India",                      // shippingCountry

    // ✅ BankHead ID
    "BANKHEAD_OBJECT_ID"
  ];

  const csv = [header.join(","), sampleRow.join(",")].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "customer_bulk_upload_template.csv";
  link.click();
};


  /* ✅ MISSING parseCSV() — Now Added ✅ */
  const parseCSV = (csv) => {
    const lines = csv.split("\n").filter((line) => line.trim() !== "");
    const headers = lines[0].split(",");

    return lines.slice(1).map((line) => {
      const values = line.split(",");
      let obj = {};
      headers.forEach((h, i) => (obj[h] = values[i] || ""));
      return obj;
    });
  };

  /* ✅ BULK UPLOAD */
/* ✅ BULK UPLOAD HANDLER */
const handleBulkUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);

  try {
    const text = await file.text();
    const jsonData = parseCSV(text); // Ensure parseCSV returns [{}, {}, ...]
    const token = localStorage.getItem("token");

    const res = await axios.post(
      "/api/customers/bulk",
      { customers: jsonData },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const { success, message, results } = res.data;

    if (success) {
      // ✅ Calculate summary
      const total = results.length;
      const created = results.filter((r) => r.success && r.action === "created").length;
      const updated = results.filter((r) => r.success && r.action === "updated").length;
      const skipped = results.filter((r) => !r.success).length;

      toast.success(
        `✅ Bulk Upload Complete — ${created} created, ${updated} updated, ${skipped} skipped.`
      );

      // ✅ Show detailed warnings (GL Account missing, etc.)
      const warnings = results
        .filter((r) => r.warnings && r.warnings.length > 0)
        .map((r) => `Row ${r.row}: ${r.warnings.join(", ")}`);
      warnings.forEach((msg) => toast.warn(msg));

      // ✅ Show row-specific errors
      const failed = results
        .filter((r) => !r.success && r.errors)
        .map((r) => `Row ${r.row}: ${r.errors.join(", ")}`);
      failed.forEach((msg) => toast.error(msg));

      // ✅ Refresh customer list
      fetchCustomers();
    } else {
      toast.error(`❌ Bulk upload failed: ${message || "Unknown error"}`);
    }
  } catch (err) {
    console.error("Bulk Upload Error:", err);
    toast.error("Invalid CSV format or server error");
  } finally {
    setUploading(false);
    e.target.value = ""; // ✅ reset file input
  }
};

  /* ✅ LIST VIEW UI */
  const renderListView = () => (
    <div className="p-6 sm:p-8">

      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">Customer Management</h1>

        <div className="flex gap-3">

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-gray-700 text-white rounded-md"
          >
            Download Template
          </button>

          {/* Bulk Upload */}
          <label className="px-4 py-2 bg-purple-600 text-white rounded-md cursor-pointer">
            {uploading ? "Uploading..." : "Bulk Upload"}
            <input type="file" hidden accept=".csv" onChange={handleBulkUpload} />
          </label>

          {/* Add Customer */}
          <button
            onClick={() => {
              generateCustomerCode();
              setView("form");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            <FaPlus className="mr-2" /> Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customers..."
          className="w-full border rounded-md py-2 pl-4 pr-10"
        />
        <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Code", "Name", "Email", "Group", "Type", "GL Account","Assigned Agents", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 text-left text-sm font-medium">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((c) => (
              <tr key={c._id}>
                <td className="px-4 py-2">{c.customerCode}</td>
                <td className="px-4 py-2">{c.customerName}</td>
                <td className="px-4 py-2">{c.emailId}</td>
                <td className="px-4 py-2">{c.customerGroup}</td>
                <td className="px-4 py-2">{c.customerType}</td>
            
                <td className="px-4 py-2">{c.glAccount?.accountName || "N/A"}</td>
              <td className="px-4 py-2 text-sm">
  {c.assignedAgents && c.assignedAgents.length > 0 
    ? c.assignedAgents.map(agent => agent.name).join(", ") 
    : "No Agent"}
</td>
                <td className="px-4 py-2 flex gap-3">
                  <button onClick={() => handleEdit(c)} className="text-blue-600">
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );


const renderFormView = () => (
  <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
    <h2 className="text-2xl font-semibold mb-6 text-center">
      {customerDetails._id ? "Edit Customer" : "New Customer"}
    </h2>

    

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <input
            name="customerCode"
            value={customerDetails.customerCode || ""}
            readOnly
            className="w-full border rounded-md p-2 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            name="customerName"
            value={customerDetails.customerName || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Group and Type */}
      <div className="grid sm:grid-cols-2 gap-4">
     <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Customer Group <span className="text-red-500">*</span>
  </label>
  <GroupSearch
    value={customerDetails.customerGroup}
    onSelectGroup={(name) =>
      setCustomerDetails((prev) => ({ ...prev, customerGroup: name }))
    }
  />
  {!customerDetails.customerGroup && (
    <p className="text-red-500 text-sm mt-1">Customer Group is required</p>
  )}
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Type <span className="text-red-500">*</span>
          </label>
          <select
            name="customerType"
            value={customerDetails.customerType || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option>Individual</option>
            <option>Business</option>
            <option>Government</option>
          </select>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email ID <span className="text-red-500">*</span>
          </label>
          <input
            name="emailId"
            type="email"
            value={customerDetails.emailId || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
     <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Mobile Number
  </label>
  <input
    name="mobileNumber"
    type="text"
    placeholder="Mobile Number"
    maxLength={10}
    value={customerDetails.mobileNumber || ""}
    onChange={(e) => {
      const input = e.target.value;
      if (/^\d{0,10}$/.test(input)) {
        handleChange(e); // only allow up to 10 digits
      }
    }}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input
            name="contactPersonName"
            value={customerDetails.contactPersonName || ""}
            onChange={handleChange}
            placeholder="Contact Person"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Billing Addresses */}
      <h3 className="text-lg font-semibold">Billing Addresses</h3>
      {customerDetails.billingAddresses?.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Billing Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("billing", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1 || ""}
              onChange={(e) => handleAddressChange("billing", i, "address1", e.target.value)}
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2 || ""}
              onChange={(e) => handleAddressChange("billing", i, "address2", e.target.value)}
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city || ""}
              onChange={(e) => handleAddressChange("billing", i, "city", e.target.value)}
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin || ""}
               type="Number"
              onChange={(e) => handleAddressChange("billing", i, "pin", e.target.value)}
              placeholder="PIN"
              className="border p-2 rounded"
            />
       <CountryStateSearch
  valueCountry={addr.country ? { name: addr.country } : null}
  valueState={addr.state ? { name: addr.state } : null}
  onSelectCountry={(c) => handleAddressChange("billing", i, "country", c?.name || "")}
  onSelectState={(s) => handleAddressChange("billing", i, "state", s?.name || "")}
/>

          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("billing")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Billing Address
      </button>

      {/* Shipping Addresses */}
      <h3 className="text-lg font-semibold">Shipping Addresses</h3>
      {customerDetails.shippingAddresses?.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Shipping Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("shipping", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1 || ""}
              onChange={(e) => handleAddressChange("shipping", i, "address1", e.target.value)}
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2 || ""}
              onChange={(e) => handleAddressChange("shipping", i, "address2", e.target.value)}
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city || ""}
              onChange={(e) => handleAddressChange("shipping", i, "city", e.target.value)}
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin || ""}
               type="Number"
              onChange={(e) => handleAddressChange("shipping", i, "pin", e.target.value)}
              placeholder="PIN"
              className="border p-2 rounded"
            />
          <CountryStateSearch
  valueCountry={addr.country ? { name: addr.country } : null}
  valueState={addr.state ? { name: addr.state } : null}
  onSelectCountry={(c) => handleAddressChange("shipping", i, "country", c?.name || "")}
  onSelectState={(s) => handleAddressChange("shipping", i, "state", s?.name || "")}
/>

          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("shipping")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Shipping Address
      </button>

      {/* Other Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms In (Day)</label>
          <input
            name="paymentTerms"
            type="Number"
            value={customerDetails.paymentTerms || ""}
            onChange={handleChange}
            placeholder="Payment Terms"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    GST Number
  </label>
  <input
    name="gstNumber"
    type="text"
    placeholder="Enter GST Number"
    value={customerDetails.gstNumber || ""}
    onChange={(e) => {
      const input = e.target.value.toUpperCase();
      if (/^[A-Z0-9]{0,15}$/.test(input)) {
        handleChange({ target: { name: "gstNumber", value: input } });
      }
    }}
    maxLength={15}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Category <span className="text-red-500">*</span>
          </label>
          <select
            name="gstCategory"
            value={customerDetails.gstCategory || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
           
          >
            <option value="">Select GST Category</option>
            <option value="Registered Regular">Registered Regular</option>
            <option value="Registered Composition">Registered Composition</option>
            <option value="Unregistered">Unregistered</option>
            <option value="SEZ">SEZ</option>
            <option value="Overseas">Overseas</option>
            <option value="Deemed Export">Deemed Export</option>
            <option value="UIN Holders">UIN Holders</option>
            <option value="Tax Deductor">Tax Deductor</option>
            <option value="Tax Collector">Tax Collector</option>
            <option value="Input Service Distributor">Input Service Distributor</option>
          </select>
        </div>
    <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    PAN Number
  </label>
  <input
    name="pan"
    type="text"
    placeholder="Enter PAN Number"
    value={customerDetails.pan || ""}
    onChange={(e) => {
      const input = e.target.value.toUpperCase();
      if (/^[A-Z0-9]{0,10}$/.test(input)) {
        handleChange({ target: { name: "pan", value: input } });
      }
    }}
    maxLength={10}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
        
          <AccountSearch
            value={customerDetails.glAccount}
            onSelect={(selected) =>
              setCustomerDetails((prev) => ({
                ...prev,
                glAccount: selected,
              }))
            }
          />
        </div>
      </div>
      {/* Assigned Agents */}
      {/* 3. UI for Assigned Agents */}
      {/* ASSIGNED AGENTS SECTION */}
          <div className="border p-4 rounded bg-blue-50">
            <h3 className="text-sm font-bold text-blue-700 mb-3 uppercase tracking-tight">Assign Agents & Support Staff</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableUsers.map(user => (
                console.log("Available User:", user) || 
                <label key={user._id} className={`flex flex-col p-2 border rounded cursor-pointer transition-all ${customerDetails.assignedAgents.includes(user._id) ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-700 border-gray-200"}`}>
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-2" checked={customerDetails.assignedAgents.includes(user._id)} onChange={() => handleAgentToggle(user._id)} />
                    <div>
                      <div className="text-sm font-bold">Name:{user.name || user.name}</div>
                      <div className={`text-[10px] uppercase ${customerDetails.assignedAgents.includes(user._id) ? "text-blue-100" : "text-gray-500"}`}>{user.roles?.join(", ")}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>


      {/* Footer Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={resetForm}
          className="px-4 py-2 bg-gray-500 text-white rounded-md"
        >
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
          {customerDetails._id ? "Update" : "Create"}
        </button>
      </div>
    </form>
  </div>
);


  return view === "list" ? renderListView() : renderFormView();
}
