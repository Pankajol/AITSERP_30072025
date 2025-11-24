
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
import { toast } from "react-toastify";

export default function SupplierManagement() {
  const [view, setView] = useState("list");
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [supplierDetails, setSupplierDetails] = useState({
    supplierCode: "",
    supplierName: "",
    supplierType: "",
    supplierGroup: "",
    supplierCategory: "",
    emailId: "",
    mobileNumber: "",
    contactPersonName: "",
   
    contactNumber: "",
    alternateContactNumber: "",
     udyamNumber: "",
    incorporated: "",
    valid: false,

    billingAddresses: [
      { address1: "", address2: "", city: "", state: "", country: "", pin: "" },
    ],
    shippingAddresses: [
      { address1: "", address2: "", city: "", state: "", country: "", pin: "" },
    ],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    bankName: "",
    branch: "",
    bankAccountNumber: "",
    ifscCode: "",
    leadTime: "",
    qualityRating: "B",
    glAccount: null,
  });

  const fetchSuppliers = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await axios.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setSuppliers(res.data.data || []);
      } else {
        setError(res.data.message || "Failed to load suppliers.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  
  const verifyUdyam = async (e) => {
    e.preventDefault(); // prevent form reload on button click
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized: Please log in again");
        return;
      }

      const res = await fetch("/api/udyam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ udyamNumber: supplierDetails.udyamNumber }),
      });

      const data = await res.json();
      console.log("Udyam API Response:", data);

      if (data.success && data.data) {
        const udyam = data.data;

        setSupplierDetails((prev) => ({
          ...prev,
          supplierName: udyam.entity || prev.supplierName,
          supplierType: udyam.type || prev.supplierType,
          mobileNumber:
            udyam.officialAddress?.maskedMobile || prev.mobileNumber,

          emailId: udyam.officialAddress?.maskedEmail || prev.emailId,
          gstNumber: udyam.gstNumber || prev.gstNumber,
          gstCategory: udyam.gstCategory || prev.gstCategory,
          pan: udyam.pan || prev.pan,
          bankName: udyam.bankName || prev.bankName,
          branch: udyam.branch || prev.branch,
          bankAccountNumber: udyam.bankAccountNumber || prev.bankAccountNumber,
          ifscCode: udyam.ifscCode || prev.ifscCode,
          supplierType: udyam.type || prev.supplierType,
          supplierCategory: udyam.majorActivity?.join(", ") || prev.supplierCategory,
          incorporated: udyam.incorporated || prev.incorporated,
          valid: udyam.valid ?? prev.valid,
          billingAddresses: [
            {
              address1: `${udyam.officialAddress?.unitNumber || ""}, ${
                udyam.officialAddress?.building || ""
              }`,
              address2: `${udyam.officialAddress?.road || ""}, ${
                udyam.officialAddress?.villageOrTown || ""
              }`,
              city: udyam.officialAddress?.city || "",
              state: udyam.officialAddress?.state || "",
              country: "India",
              pin: udyam.officialAddress?.zip || "",
            },
          ],
        }));

        toast.success("Udyam details fetched successfully!");
      } else {
        toast.error(data.message || "Failed to verify Udyam number");
      }
    } catch (err) {
      console.error("verifyUdyam error:", err);
      toast.error("Error verifying Udyam");
    }
  };

  const generateSupplierCode = async () => {
    try {
      const token = localStorage.getItem("token"); // Make sure this is how you store your token

      const response = await axios.get("/api/lastSupplierCode", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const lastCode = response.data.lastSupplierCode || "SUPP-0000";
      const num = parseInt(lastCode.split("-")[1] || "0", 10) + 1;

      setSupplierDetails((prev) => ({
        ...prev,
        supplierCode: `SUPP-${num.toString().padStart(4, "0")}`,
      }));
    } catch (err) {
      console.error("Error generating supplier code:", err);
    }
  };

  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSupplierDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...supplierDetails[key]];
    arr[idx][field] = value;
    setSupplierDetails((prev) => ({ ...prev, [key]: arr }));
  };

  const addAddress = (type) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setSupplierDetails((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          address1: "",
          address2: "",
          city: "",
          state: "",
          country: "",
          pin: "",
        },
      ],
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (supplierDetails[key].length === 1) return;
    setSupplierDetails((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const validate = () => {
    const errs = {};
    const {
      supplierName,
      supplierType,
      supplierGroup,
      pan,
      gstCategory,
      emailId,
      gstNumber,
      mobileNumber,
      glAccount,
    } = supplierDetails;

    if (!supplierName) {
      errs.supplierName = "Supplier Name is required";
      toast.error(errs.supplierName);
    }

    if (!supplierType) {
      errs.supplierType = "Supplier Type is required";
      toast.error(errs.supplierType);
    }

    if (!supplierGroup) {
      errs.supplierGroup = "Supplier Group is required";
      toast.error(errs.supplierGroup);
    }

    if (!gstCategory) {
      errs.gstCategory = "GST Category is required";
      toast.error(errs.gstCategory);
    }

    if (!pan) {
      errs.pan = "PAN is required";
      toast.error(errs.pan);
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      errs.pan = "Invalid PAN format. Example: ABCDE1234F";
      toast.error(errs.pan);
    }

    if (emailId && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(emailId)) {
      errs.emailId = "Invalid email format";
      toast.error(errs.emailId);
    }

    if (
      gstNumber &&
      !/^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
        gstNumber
      )
    ) {
      errs.gstNumber = "Invalid GST Number. Example: 22ABCDE1234F1Z5";
      toast.error(errs.gstNumber);
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      errs.mobileNumber = "Mobile Number must be exactly 10 digits";
      toast.error(errs.mobileNumber);
    }

    if (!glAccount || !glAccount._id) {
      errs.glAccount = "GL Account is required";
      toast.error(errs.glAccount);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Please log in again.");
      return;
    }

    const payload = {
      ...supplierDetails,
      glAccount: supplierDetails.glAccount?._id || null,
    };

    try {
      let res;

      if (supplierDetails._id) {
        // ✅ Update supplier
        res = await axios.put(
          `/api/suppliers/${supplierDetails._id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // ✅ Update state with updated supplier
        setSuppliers((prev) =>
          prev.map((s) => (s._id === res.data.data._id ? res.data.data : s))
        );
      } else {
        // ✅ Create supplier
        res = await axios.post("/api/suppliers", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        // ✅ Add new supplier to state
        setSuppliers((prev) => [...prev, res.data.data]);
      }

      setView("list"); // ✅ Go back to list view after save
    } catch (err) {
      console.error(
        "Error saving supplier:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Failed to save supplier");
    }
  };

  const getFieldError = (field) =>
    errors[field] && (
      <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
    );
  const handleEdit = (s) => {
    setSupplierDetails(s);
    setView("form");
  };
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await axios.delete(`/api/suppliers/${id}`);
    setSuppliers((prev) => prev.filter((s) => s._id !== id));
  };

  const filtered = suppliers.filter((s) =>
    [
      s.supplierCode,
      s.supplierName,
      s.emailId,
      s.supplierType,
      s.supplierGroup,
    ].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );



const handleBulkUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);
  const token = localStorage.getItem("token");

  try {
    const text = await file.text();
    const rows = text.split("\n").map((r) => r.trim()).filter((r) => r);
    const headers = rows[0].split(",").map((h) => h.trim());
    const jsonData = rows.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((key, i) => {
        obj[key] = values[i]?.trim() || "";
      });
      return obj;
    });

    const res = await axios.post(
      "/api/suppliers/bulk",
      { suppliers: jsonData },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = res.data;
    if (!data.success) {
      toast.error(data.message || "Bulk upload failed");
      return;
    }

    // ✅ Success / Warning / Error handling
    const total = data.results.length;
    const successCount = data.results.filter((r) => r.success).length;
    const failCount = data.results.filter((r) => !r.success).length;

    if (successCount === total) {
      toast.success(`✅ All ${total} records uploaded successfully!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(
        `⚠️ ${successCount} uploaded successfully, ${failCount} skipped.`
      );
      console.group("Skipped Records");
      data.results
        .filter((r) => !r.success)
        .forEach((r) => console.warn(`Row ${r.row}: ${r.errors.join(", ")}`));
      console.groupEnd();
    } else {
      toast.error("❌ All records failed to upload. Check your CSV file.");
    }

    // Optionally reload your table data
    fetchSuppliers();

  } catch (err) {
    console.error("Bulk Upload Error:", err);
    toast.error("Something went wrong during upload.");
  } finally {
    setUploading(false);
    e.target.value = ""; // reset file input
  }
};


const parseCSV = (csv) => {
  const lines = csv.split("\n").filter((line) => line.trim() !== "");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = values[i]?.trim() || ""));
    return obj;
  });
};

const downloadSupplierTemplate = () => {
  const header = [
    "supplierName",
    "supplierGroup",
    "supplierType",
    "emailId",
    "mobileNumber",
    "gstNumber",
    "gstCategory",
    "pan",
    "contactPersonName",
    "commissionRate",
    "paymentTerms",
    "billingAddress1",
    "billingAddress2",
    "billingCity",
    "billingState",
    "billingPin",
    "billingCountry",
    "shippingAddress1",
    "shippingAddress2",
    "shippingCity",
    "shippingState",
    "shippingPin",
    "shippingCountry",
    "glAccount"
  ];

  const sample = [
    "ABC Traders",
    "Wholesale",
    "Business",
    "abc@traders.com",
    "9876543210",
    "22ABCDE1234F1Z5",
    "Registered Regular",
    "ABCDE1234F",
    "Rahul Manager",
    "5",
    "30",
    "Line 1",
    "Line 2",
    "Mumbai",
    "Maharashtra",
    "400001",
    "India",
    "Line 1",
    "Line 2",
    "Mumbai",
    "Maharashtra",
    "400002",
    "India",
    "BANKHEAD_OBJECT_ID"
  ];

  const csv = [header.join(","), sample.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "supplier_bulk_upload_template.csv";
  link.click();
};



  const renderListView = () => (
  <div className="p-6">
    {/* ✅ Header Section */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
      <h1 className="text-2xl font-bold">Supplier Management</h1>

      <div className="flex flex-wrap gap-3">
        {/* ✅ Download Template */}
        <button
          onClick={downloadSupplierTemplate}
          className="inline-flex items-center bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
        >
          Download Template
        </button>

        {/* ✅ Bulk Upload */}
        <label className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md cursor-pointer">
          {uploading ? "Uploading..." : "Bulk Upload"}
          <input type="file" accept=".csv" hidden onChange={handleBulkUpload} />
        </label>

        {/* ✅ Add Supplier */}
        <button
          onClick={() => {
            generateSupplierCode();
            setView("form");
          }}
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <FaPlus className="mr-2" /> Add Supplier
        </button>
      </div>
    </div>

    {/* ✅ Search Bar */}
    <div className="mb-4 relative max-w-md">
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search suppliers..."
        className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
      />
      <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
    </div>

    {/* ✅ Table */}
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {["Code", "Name", "Email", "Type", "Group", "Actions"].map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left text-sm font-medium text-gray-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filtered.map((s) => (
            <tr key={s._id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{s.supplierCode}</td>
              <td className="px-4 py-2">{s.supplierName}</td>
              <td className="px-4 py-2">{s.emailId}</td>
              <td className="px-4 py-2">{s.supplierType}</td>
              <td className="px-4 py-2">{s.supplierGroup}</td>
              <td className="px-4 py-2 flex space-x-3">
                <button onClick={() => handleEdit(s)} className="text-blue-600">
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(s._id)}
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
        {supplierDetails._id ? "Edit Supplier" : "New Supplier"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            {/* uddyam */}
            <input
              name="udyamNumber"
              value={supplierDetails.udyamNumber || ""}
              onChange={(e) =>
                setSupplierDetails((prev) => ({
                  ...prev,
                  udyamNumber: e.target.value,
                }))
              }
              placeholder="Udyam Number"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 mb-2"
            />
            {getFieldError("udyamNumber")}
          </div>
            <div>
              <button
                onClick={verifyUdyam}
                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                <FaSearch className="mr-2" /> Verify Udyam
              </button>
            </div>
        
        </div>
        {/* Incorporated Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incorporated Date
            </label>
            <input
              name="incorporated"
              value={supplierDetails.incorporated}
              onChange={handleChange}
              placeholder="Incorporated Date"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

           {/* Udyam Validity this vaild ture false like  this i want fetch if the the from the udyam  */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid
            </label>
            <select
              name="valid"
              value={supplierDetails.valid}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value={null}>Select</option>
              <option value={true}>True</option>
              <option value={false}>False</option>
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              name="supplierCode"
              value={supplierDetails.supplierCode}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-100"
            />
            {getFieldError("supplierCode")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              name="supplierName"
              value={supplierDetails.supplierName}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
            {getFieldError("supplierName")}
          </div>
        </div>
      

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Group <span className="text-red-500">*</span>
            </label>
            <GroupSearch
              value={supplierDetails.supplierGroup}
              onSelectGroup={(name) =>
                setSupplierDetails((prev) => ({ ...prev, supplierGroup: name }))
              }
            />
            {!supplierDetails.supplierGroup && (
              <p className="text-red-500 text-sm mt-1">
                Supplier Group is required
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Type <span className="text-red-500">*</span>
            </label>
            <select
              name="supplierType"
              value={supplierDetails.supplierType}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option>Manufacturer</option>
              <option>Distributor</option>
              <option>Wholesaler</option>
              <option>Service Provider</option>
            </select>
            {getFieldError("supplierType")}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email ID <span className="text-red-500">*</span>
            </label>
            <input
              name="emailId"
              type="email"
              value={supplierDetails.emailId}
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
              value={supplierDetails.mobileNumber || ""}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person
            </label>
            <input
              name="contactPersonName"
              value={supplierDetails.contactPersonName}
              onChange={handleChange}
              placeholder="Contact Person"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              name="contactNumber"
              type="text"
              placeholder="Contact Number"
              maxLength={10}
              value={supplierDetails.contactNumber || ""}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternate Contact Number
            </label>
            <input
              name="alternateContactNumber"
              type="text"
              placeholder="Alternate Contact Number"
              maxLength={10}
              value={supplierDetails.alternateContactNumber || ""}      
              onChange={(e) => {
                const input = e.target.value;
                if (/^\d{0,10}$/.test(input)) {
                  handleChange(e); // only allow up to 10 digits
                }
              }}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          </div>

        <h3 className="text-lg font-semibold">Billing Addresses</h3>
        {supplierDetails.billingAddresses.map((addr, i) => (
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
                value={addr.address1}
                onChange={(e) =>
                  handleAddressChange("billing", i, "address1", e.target.value)
                }
                placeholder="Line 1"
                className="border p-2 rounded"
              />
              <input
                value={addr.address2}
                onChange={(e) =>
                  handleAddressChange("billing", i, "address2", e.target.value)
                }
                placeholder="Line 2"
                className="border p-2 rounded"
              />
              <input
                value={addr.city}
                onChange={(e) =>
                  handleAddressChange("billing", i, "city", e.target.value)
                }
                placeholder="City"
                className="border p-2 rounded"
              />
              <input
                value={addr.pin}
                onChange={(e) =>
                  handleAddressChange("billing", i, "pin", e.target.value)
                }
                placeholder="PIN"
                className="border p-2 rounded"
              />
              <CountryStateSearch
                valueCountry={addr.country ? { name: addr.country } : null}
                valueState={addr.state ? { name: addr.state } : null}
                onSelectCountry={(c) =>
                  handleAddressChange("billing", i, "country", c?.name || "")
                }
                onSelectState={(s) =>
                  handleAddressChange("billing", i, "state", s?.name || "")
                }
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

        <h3 className="text-lg font-semibold">Shipping Addresses</h3>
        {supplierDetails.shippingAddresses.map((addr, i) => (
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
                value={addr.address1}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "address1", e.target.value)
                }
                placeholder="Line 1"
                className="border p-2 rounded"
              />
              <input
                value={addr.address2}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "address2", e.target.value)
                }
                placeholder="Line 2"
                className="border p-2 rounded"
              />
              <input
                value={addr.city}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "city", e.target.value)
                }
                placeholder="City"
                className="border p-2 rounded"
              />
              <input
                value={addr.pin}
                onChange={(e) =>
                  handleAddressChange("shipping", i, "pin", e.target.value)
                }
                placeholder="PIN"
                className="border p-2 rounded"
              />
              <CountryStateSearch
                valueCountry={addr.country ? { name: addr.country } : null}
                valueState={addr.state ? { name: addr.state } : null}
                onSelectCountry={(c) =>
                  handleAddressChange("shipping", i, "country", c?.name || "")
                }
                onSelectState={(s) =>
                  handleAddressChange("shipping", i, "state", s?.name || "")
                }
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

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms (In Days)
            </label>
            <input
              name="paymentTerms"
              value={supplierDetails.paymentTerms}
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
              value={supplierDetails.gstNumber || ""}
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
              value={supplierDetails.gstCategory}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select GST Category</option>
              <option value="Registered Regular">Registered Regular</option>
              <option value="Registered Composition">
                Registered Composition
              </option>
              <option value="Unregistered">Unregistered</option>
              <option value="SEZ">SEZ</option>
              <option value="Overseas">Overseas</option>
              <option value="Deemed Export">Deemed Export</option>
              <option value="UIN Holders">UIN Holders</option>
              <option value="Tax Deductor">Tax Deductor</option>
              <option value="Tax Collector">Tax Collector</option>
              <option value="Input Service Distributor">
                Input Service Distributor
              </option>
            </select>
            {getFieldError("gstCategory")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Number
            </label>
            <input
              name="pan"
              type="text"
              placeholder="Enter PAN Number"
              value={supplierDetails.pan || ""}
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
              value={supplierDetails.glAccount}
              onSelect={(selected) => {
                setSupplierDetails((prev) => ({
                  ...prev,
                  glAccount: selected,
                }));
              }}
            />
            {getFieldError("glAccount")}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <input
              name="bankName"
              value={supplierDetails.bankName}
              onChange={handleChange}
              placeholder="Bank Name"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              name="branch"
              value={supplierDetails.branch}
              onChange={handleChange}
              placeholder="Branch"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            name="accountNumber"
            type="text"
            placeholder="Enter Account Number"
            maxLength={18}
            required
            className="border rounded px-3 py-2 w-full"
            pattern="\d{9,18}"
            title="Account Number must be 9 to 18 digits"
            onChange={(e) => {
              const input = e.target.value.replace(/\D/g, ""); // Only digits
              if (/^\d{0,18}$/.test(input)) {
                handleChange({
                  target: { name: "accountNumber", value: input },
                });
              }
            }}
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code
          </label>
          <input
            name="ifscCode"
            type="text"
            placeholder="Enter IFSC Code"
            maxLength={11}
            required
            className="uppercase border rounded px-3 py-2 w-full"
            pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
            title="Enter valid IFSC like SBIN0001234"
            onChange={(e) => {
              const input = e.target.value.toUpperCase();
              if (/^[A-Z0-9]{0,11}$/.test(input)) {
                handleChange({ target: { name: "ifscCode", value: input } });
              }
            }}
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => setView("list")}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            {supplierDetails._id ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
  return view === "list" ? renderListView() : renderFormView();
}
