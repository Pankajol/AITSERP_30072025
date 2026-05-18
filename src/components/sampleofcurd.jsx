"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaMinus,
  FaUsers,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaFileUpload,
  FaDownload,
  FaChevronRight,
  FaChevronLeft,
  FaTimes,
  FaCheck,
  FaArrowLeft,
  FaShieldAlt,
  FaExclamationCircle,
  FaClipboardCheck,
  FaEye,
  FaPaperclip,
  FaFile,
  FaImage,
  FaFilePdf,
  FaFileExcel,
  FaFileWord,
  FaTrashAlt,
} from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
import { toast } from "react-toastify";

const STEPS = [
  { id: 1, label: "Basic Info", icon: FaUser },
  { id: 2, label: "Contact", icon: FaPhone },
  { id: 3, label: "Addresses", icon: FaMapMarkerAlt },
  { id: 4, label: "Tax & Finance", icon: HiOutlineDocumentText },
  { id: 5, label: "SLA, Agents & Docs", icon: FaShieldAlt },
  { id: 6, label: "Review & Submit", icon: FaClipboardCheck },
];

const EMPTY_ADDR = {
  address1: "",
  address2: "",
  country: "",
  state: "",
  city: "",
  pin: "",
};

const EMPTY = {
  customerCode: "",
  customerName: "",
  customerGroup: "",
  customerType: "",
  emailId: "",
  mobileNumber: "",
  contactPersonName: "",
  commissionRate: "",
  billingAddresses: [{ ...EMPTY_ADDR }],
  shippingAddresses: [{ ...EMPTY_ADDR }],
  paymentTerms: "",
  gstNumber: "",
  gstCategory: "",
  pan: "",
  glAccount: null,
  assignedAgents: [],
  contactEmails: [],
  slaPolicyId: null,
  attachments: "",
};

const VALIDATORS = {
  1: (d) => {
    const e = {};
    if (!d.customerName?.trim()) e.customerName = "Required";

    if (!d.customerGroup?.trim()) e.customerGroup = "Required";
    if (!d.customerType) e.customerType = "Required";
    return e;
  },
2: (d) => {
  const e = {};

  // Email required
  if (!d.emailId || !d.emailId.trim()) {
    e.emailId = "Email is required";
  }

  // Email format validation
  else if (
    !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(d.emailId)
  ) {
    e.emailId = "Invalid email format";
  }

  // Mobile validation
  if (d.mobileNumber && !/^\d{10}$/.test(d.mobileNumber)) {
    e.mobileNumber = "10 digits required";
  }

  // Contact emails validation
  (d.contactEmails || []).forEach((c, i) => {
    if (
      c.email &&
      !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(c.email)
    ) {
      e[`ce_${i}`] = "Invalid email format";
    }
  });

  return e;
},
  3: (d) => {
    const e = {};
    (d.billingAddresses || []).forEach((a, i) => {
      if (a.pin && !/^\d{6}$/.test(a.pin))
        e[`bp_${i}`] = "PIN must be 6 digits";
    });
    (d.shippingAddresses || []).forEach((a, i) => {
      if (a.pin && !/^\d{6}$/.test(a.pin))
        e[`sp_${i}`] = "PIN must be 6 digits";
    });
    return e;
  },
  4: (d) => {
    const e = {};
    if (!d.pan?.trim()) e.pan = "PAN required";
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.pan)) e.pan = "Invalid PAN";
    if (d.gstNumber && !/^[A-Z0-9]{15}$/.test(d.gstNumber))
      e.gstNumber = "GST must be 15 chars";
    return e;
  },
  5: () => ({}),
  6: () => ({}),
};

const AddrBlock = ({
  type,
  list,
  color,
  onChange,
  onRemove,
  onAdd,
  onFetchPin,
  fi,
  Err,
  errs,
}) => (
  <div>
    
   {(list || []).map((addr, i) => {
      <div
        key={i}
        className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3"
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${color}`}
          >
            {type === "bill" ? "Billing" : "Shipping"} #{i + 1}
          </span>
          {i > 0 && (
            <button
              type="button"
              onClick={() => onRemove(type, i)}
              className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={fi("")}
            value={addr.address1 || ""}
            onChange={(e) => onChange(type, i, "address1", e.target.value)}
            placeholder="Address line 1"
          />
          <input
            className={fi("")}
            value={addr.address2 || ""}
            onChange={(e) => onChange(type, i, "address2", e.target.value)}
            placeholder="Address line 2"
          />
          <div>
            <input
              className={fi(type === "bill" ? `bp_${i}` : `sp_${i}`)}
              type="number"
              value={addr.pin || ""}
              placeholder="PIN code"
              onChange={(e) => {
                const p = e.target.value;
                onChange(type, i, "pin", p);
                onFetchPin(type, i, p);
              }}
            />
            <Err k={type === "bill" ? `bp_${i}` : `sp_${i}`} />
          </div>
          <input
            className={fi("")}
            value={addr.city || ""}
            onChange={(e) => onChange(type, i, "city", e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="mt-3">
          <CountryStateSearch
            valueCountry={addr.country ? { name: addr.country } : null}
            valueState={addr.state ? { name: addr.state } : null}
            onSelectCountry={(c) => onChange(type, i, "country", c?.name || "")}
            onSelectState={(s) => onChange(type, i, "state", s?.name || "")}
          />
        </div>
      </div>
    })}
    <button
      type="button"
      onClick={() => onAdd(type)}
      className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center gap-2"
    >
      <FaPlus className="text-xs" /> Add{" "}
      {type === "bill" ? "Billing" : "Shipping"} Address
    </button>
  </div>
);

const getFileIcon = (filename) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <FaImage className="text-blue-500" />;
  if (ext === "pdf") return <FaFilePdf className="text-red-500" />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FaFileExcel className="text-green-600" />;
  if (["doc", "docx"].includes(ext))
    return <FaFileWord className="text-blue-700" />;
  return <FaFile className="text-gray-500" />;
};

export default function CustomerManagement() {
  const [view, setView] = useState("list");

  const [search, setSearch] = useState("");

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [cd, setCd] = useState({ ...EMPTY });
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canView, setCanView] = useState(true);
  const [localFiles, setLocalFiles] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    Individual: 0,
    Business: 0,
    Government: 0,
  });
const filtered = Array.isArray(customers) ? customers : [];

  // Fetch statistics (for dashboard cards)
  // const fetchStats = useCallback(async () => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const res = await axios.get("/api/customers?getStats=true", {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     setStats(res.data.data);
  //   } catch (err) {
  //     console.error("Stats fetch failed", err);
  //   }
  // }, []);
useEffect(() => {
  const total = customers.length;
  const individual = customers.filter(c => (c.customerType || "").toLowerCase() === "individual").length;
  const business = customers.filter(c => (c.customerType || "").toLowerCase() === "business").length;
  const government = customers.filter(c => (c.customerType || "").toLowerCase() === "government").length;
  setStats({ total, Individual: individual, Business: business, Government: government });
}, [customers]);
  // Fetch customers with server-side pagination
const fetchCustomers = useCallback(async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/customers", {
      params: {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        customerType: filterType === "All" ? "" : filterType,
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // ✅ Ensure data is always an array
    const customerList = Array.isArray(res.data.data) ? res.data.data : [];
    setCustomers(customerList);
    setTotalPages(res.data.meta?.pages || 1);
  } catch (error) {
    console.error(error);
    toast.error("Failed to load customers");
    setCustomers([]);   // fallback to empty array
    setTotalPages(1);
  } finally {
    setLoading(false);
  }
}, [currentPage, searchTerm, filterType]);

  // Initial data loads
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    // fetchStats();
    loadUsers();
    loadSla();
    fetchPermissions();
  }, []);

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const p = data?.user?.modules?.Customers?.permissions || {};
      const isCompany = data?.user?.type?.toLowerCase() === "company";
      const isAdmin = data?.user?.roles?.includes("Admin");
      if (isCompany || isAdmin) {
        setCanCreate(true);
        setCanEdit(true);
        setCanDelete(true);
        setCanView(true);
      } else {
        setCanCreate(p.create === true);
        setCanEdit(p.edit === true);
        setCanDelete(p.delete === true);
        setCanView(p.view !== false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableUsers(
        (res.data || []).filter((u) =>
          u.roles?.some((r) => r === "Support Executive" || r === "Agent"),
        ),
      );
    } catch {
      toast.error("Failed to load users");
    }
  };

  const loadSla = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/helpdesk/sla", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSlaPolicies(res.data?.data || res.data || []);
    } catch {
      toast.error("Failed to load SLA policies");
    }
  };

  const generateCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/lastCustomerCode", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { lastCustomerCode } = await res.json();
      const num = parseInt(lastCustomerCode.split("-")[1], 10) + 1;
      setCd((p) => ({
        ...p,
        customerCode: `CUST-${String(num).padStart(4, "0")}`,
      }));
    } catch {}
  };

  const clearErr = (k) =>
    setErrs((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCd((p) => ({ ...p, [name]: value }));
    clearErr(name);
  };

  const handleAddrChange = (type, idx, field, value) => {
    const key = type === "bill" ? "billingAddresses" : "shippingAddresses";
    setCd((p) => {
      const arr = [...p[key]];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...p, [key]: arr };
    });
    if (field === "pin") clearErr(`${type === "bill" ? "bp" : "sp"}_${idx}`);
  };

  const fetchPin = async (type, idx, pin) => {
    if (pin.length !== 6) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0]?.PostOffice?.[0];
        if (post) {
          handleAddrChange(type, idx, "city", post.District || "");
          handleAddrChange(type, idx, "state", post.State || "");
          handleAddrChange(type, idx, "country", "India");
        }
      }
    } catch {}
  };

  const addAddr = (type) => {
    const k = type === "bill" ? "billingAddresses" : "shippingAddresses";
    setCd((p) => ({ ...p, [k]: [...p[k], { ...EMPTY_ADDR }] }));
  };
  const removeAddr = (type, idx) => {
    const k = type === "bill" ? "billingAddresses" : "shippingAddresses";
    if (cd[k].length === 1) return;
    setCd((p) => ({ ...p, [k]: p[k].filter((_, i) => i !== idx) }));
  };
  const addCE = () =>
    setCd((p) => ({
      ...p,
      contactEmails: [...(p.contactEmails || []), { name: "", email: "" }],
    }));
  const removeCE = (i) =>
    setCd((p) => ({
      ...p,
      contactEmails: p.contactEmails.filter((_, j) => j !== i),
    }));
  const handleCE = (i, f, v) => {
    const arr = [...cd.contactEmails];
    arr[i] = { ...arr[i], [f]: v };
    setCd((p) => ({ ...p, contactEmails: arr }));
    if (f === "email") clearErr(`ce_${i}`);
  };
  const toggleAgent = (id) =>
    setCd((p) => {
      const ids = p.assignedAgents.map((x) => x.toString());
      return {
        ...p,
        assignedAgents: ids.includes(id.toString())
          ? ids.filter((x) => x !== id.toString())
          : [...ids, id.toString()],
      };
    });
  const selectSla = (id) =>
    setCd((p) => ({
      ...p,
      slaPolicyId: p.slaPolicyId?.toString() === id?.toString() ? null : id,
    }));

  // Attachment handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLocalFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };
  const removeLocalFile = (index) => {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const removeExistingAttachment = (urlToRemove) => {
    const current = cd.attachments || "";
    const urls = current.split(",").filter((url) => url && url !== urlToRemove);
    setCd((prev) => ({ ...prev, attachments: urls.join(",") }));
  };

  const handleSubmit = async () => {
    if (cd._id && !canEdit) return toast.error("No edit permission");
    if (!cd._id && !canCreate) return toast.error("No create permission");
    let allE = {};
    for (let s = 1; s <= 5; s++) {
      const v = VALIDATORS[s];
      if (v) allE = { ...allE, ...v(cd) };
    }
    if (Object.keys(allE).length) {
      setErrs(allE);
      toast.error("Please fix errors");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    localFiles.forEach((file) => formData.append("attachments", file));
    const customerData = {
      ...cd,
      assignedAgents: cd.assignedAgents.map((id) => ({ _id: id })),
      glAccount: cd.glAccount?._id || cd.glAccount || null,
      slaPolicyId: cd.slaPolicyId?._id || cd.slaPolicyId || null,
      attachments: cd.attachments, // already string of kept URLs
    };
    formData.append("data", JSON.stringify(customerData));
    try {
      const method = cd._id ? "put" : "post";
      await axios({
        method,
        url: "/api/customers",
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(cd._id ? "Customer updated" : "Customer created");
      reset();
      fetchCustomers();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    const v = VALIDATORS[step];
    if (v) {
      const e = v(cd);
      if (Object.keys(e).length) {
        setErrs(e);
        toast.error(Object.values(e)[0]);
        return;
      }
    }
    setErrs({});
    setStep((s) => s + 1);
  };
  const goPrev = () => {
    setErrs({});
    setStep((s) => s - 1);
  };
  const reset = () => {
    setCd({ ...EMPTY });
    setLocalFiles([]);
    setStep(1);
    setErrs({});
    setView("list");
    setCurrentPage(1);
  };

  const handleEdit = (c) => {
    setCd({
      ...c,
      contactEmails: c.contactEmails || [],
      assignedAgents: (c.assignedAgents || []).map((a) =>
        typeof a === "string" ? a : a._id,
      ),
      slaPolicyId: c.slaPolicyId?._id || c.slaPolicyId || null,
      attachments: c.attachments || "",
    });
    setLocalFiles([]);
    setStep(1);
    setErrs({});
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!canDelete) return toast.error("No delete permission");
    if (!confirm("Delete?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/customers?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted");
      fetchCustomers();
      fetchStats();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleView = (customer) => {
    setViewingCustomer(customer);
    setViewModalOpen(true);
  };

  const parseCSV = (csv) => {
    const lines = csv.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const vals = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = vals[i] || ""));
      return obj;
    });
  };
  const downloadTemplate = () => {
    const h = [
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
      "glAccount",
    ];
    const r = [
      "John Doe",
      "Retail",
      "Individual",
      "john@example.com",
      "9876543210",
      "22ABCDE1234F1Z5",
      "Registered Regular",
      "ABCDE1234F",
      "John Manager",
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
      "BANKHEAD_ID",
    ];
    const blob = new Blob([[h, r].map((x) => x.join(",")).join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "customer_template.csv";
    a.click();
  };
  const handleBulk = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/customers/bulk",
        { customers: parseCSV(await file.text()) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const { success, results } = res.data;
      if (success) {
        const cr = results.filter(
          (r) => r.success && r.action === "created",
        ).length;
        const up = results.filter(
          (r) => r.success && r.action === "updated",
        ).length;
        const sk = results.filter((r) => !r.success).length;
        toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
        fetchCustomers();
        fetchStats();
      }
    } catch {
      toast.error("Bulk failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const Err = ({ k }) =>
    errs[k] ? (
      <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
        <FaExclamationCircle />
        {errs[k]}
      </p>
    ) : null;
  const fi = (k) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium outline-none bg-white ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50" : "border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"}`;
  const label = (text, req) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const RRow = ({ label: l, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {l}
      </span>
      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%]">
        {value || <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {label("Customer Code")}
                <input
                  className={`${fi("")} bg-gray-100 cursor-not-allowed`}
                  value={cd.customerCode}
                  readOnly
                />
              </div>
              <div>
                {label("Customer Name", true)}
                <input
                  className={fi("customerName")}
                  name="customerName"
                  value={cd.customerName}
                  onChange={handleChange}
                />
                <Err k="customerName" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {label("Customer Group", true)}
                <GroupSearch
                  value={cd.customerGroup}
                  onSelectGroup={(name) => {
                    setCd((p) => ({ ...p, customerGroup: name }));
                    clearErr("customerGroup");
                  }}
                />
                <Err k="customerGroup" />
              </div>
              <div>
                {label("Customer Type", true)}
                <select
                  className={fi("customerType")}
                  name="customerType"
                  value={cd.customerType}
                  onChange={handleChange}
                >
                  <option value="">Select type</option>
                  <option>Individual</option>
                  <option>Business</option>
                  <option>Government</option>
                </select>
                <Err k="customerType" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                {label("Primary Email", true)}
                <input
                  className={fi("emailId")}
                  name="emailId"
                  value={cd.emailId}
                  onChange={handleChange}
                />
                <Err k="emailId" />
              </div>
              <div>
                {label("Mobile Number")}
                <input
                  className={fi("mobileNumber")}
                  name="mobileNumber"
                  maxLength={10}
                  value={cd.mobileNumber}
                  onChange={(e) => {
                    if (/^\d{0,10}$/.test(e.target.value)) handleChange(e);
                  }}
                />
                <Err k="mobileNumber" />
              </div>
              <div>
                {label("Contact Person")}
                <input
                  className={fi("")}
                  name="contactPersonName"
                  value={cd.contactPersonName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="border-t pt-5">
              <p className="text-sm font-bold mb-3 flex items-center gap-2">
                <FaEnvelope className="text-indigo-500" /> Additional Emails
              </p>
              {(cd.contactEmails || []).map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-2 items-start"
                >
                  <input
                    className={fi("")}
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => handleCE(i, "name", e.target.value)}
                  />
                  <div>
                    <input
                      className={fi(`ce_${i}`)}
                      placeholder="Email"
                      value={c.email}
                      onChange={(e) => handleCE(i, "email", e.target.value)}
                    />
                    <Err k={`ce_${i}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCE(i)}
                    className="w-8 h-[42px] rounded-lg bg-red-50 text-red-400 hover:bg-red-500"
                  >
                    <FaMinus />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCE}
                className="w-full py-2.5 border-2 border-dashed rounded-xl text-indigo-500 font-semibold flex items-center justify-center gap-2"
              >
                <FaPlus /> Add Email
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold mb-3 flex items-center gap-2">
                <FaMapMarkerAlt className="text-indigo-500" /> Billing Addresses
              </p>
              <AddrBlock
                type="bill"
                list={cd.billingAddresses}
                color="bg-indigo-50 text-indigo-600"
                onChange={handleAddrChange}
                onRemove={removeAddr}
                onAdd={addAddr}
                onFetchPin={fetchPin}
                fi={fi}
                Err={Err}
                errs={errs}
              />
            </div>
            <div className="border-t pt-5">
              <p className="text-sm font-bold mb-3 flex items-center gap-2">
                <FaMapMarkerAlt className="text-emerald-500" /> Shipping
                Addresses
              </p>
              <AddrBlock
                type="ship"
                list={cd.shippingAddresses}
                color="bg-emerald-50 text-emerald-600"
                onChange={handleAddrChange}
                onRemove={removeAddr}
                onAdd={addAddr}
                onFetchPin={fetchPin}
                fi={fi}
                Err={Err}
                errs={errs}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {label("GST Number")}
                <input
                  className={fi("gstNumber")}
                  name="gstNumber"
                  maxLength={15}
                  value={cd.gstNumber}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "gstNumber",
                        value: e.target.value.toUpperCase(),
                      },
                    })
                  }
                />
                <Err k="gstNumber" />
              </div>
              <div>
                {label("GST Category")}
                <select
                  className={fi("")}
                  name="gstCategory"
                  value={cd.gstCategory}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {[
                    "Registered Regular",
                    "Registered Composition",
                    "Unregistered",
                    "SEZ",
                    "Overseas",
                    "Deemed Export",
                    "UIN Holders",
                    "Tax Deductor",
                    "Tax Collector",
                    "Input Service Distributor",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                {label("PAN Number", true)}
                <input
                  className={fi("pan")}
                  name="pan"
                  maxLength={10}
                  value={cd.pan}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "pan",
                        value: e.target.value.toUpperCase(),
                      },
                    })
                  }
                />
                <Err k="pan" />
              </div>
              <div>
                {label("Payment Terms (Days)")}
                <input
                  className={fi("")}
                  name="paymentTerms"
                  type="number"
                  value={cd.paymentTerms}
                  onChange={handleChange}
                />
              </div>
              <div>
                {label("Commission Rate (%)")}
                <input
                  className={fi("")}
                  name="commissionRate"
                  value={cd.commissionRate}
                  onChange={handleChange}
                />
              </div>
            </div>
            {/* <div className="border-t pt-4">
              {label("GL Account")}
              <AccountSearch
                value={cd.glAccount}
                onSelect={(sel) => setCd((p) => ({ ...p, glAccount: sel }))}
              />
            </div> */}
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold mb-1 flex items-center gap-2">
                <FaShieldAlt className="text-violet-500" /> SLA Policy
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  onClick={() => setCd((p) => ({ ...p, slaPolicyId: null }))}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer ${!cd.slaPolicyId ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50"}`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${!cd.slaPolicyId ? "bg-violet-500 text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    ✕
                  </div>
                  <div>
                    <p className="text-sm font-bold">No SLA</p>
                    <p className="text-xs text-gray-400">Default</p>
                  </div>
                  <div
                    className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${!cd.slaPolicyId ? "border-violet-500 bg-violet-500" : "border-gray-300"}`}
                  >
                    {!cd.slaPolicyId && (
                      <FaCheck className="text-white text-[8px]" />
                    )}
                  </div>
                </div>
                {slaPolicies.map((sla) => {
                  const curId = cd.slaPolicyId?._id || cd.slaPolicyId;
                  const isSel =
                    curId && curId.toString() === sla._id.toString();
                  return (
                    <div
                      key={sla._id}
                      onClick={() => selectSla(sla._id)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer ${isSel ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSel ? "bg-violet-500 text-white" : "bg-violet-100 text-violet-500"}`}
                      >
                        <FaShieldAlt />
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate">{sla.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {sla.description || sla.responseTime}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSel ? "border-violet-500 bg-violet-500" : "border-gray-300"}`}
                      >
                        {isSel && <FaCheck className="text-white text-[8px]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t pt-5">
              <p className="text-sm font-bold mb-1 flex items-center gap-2">
                <FaUsers className="text-indigo-500" /> Assign Agents
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableUsers.map((user) => {
                  const isSel = cd.assignedAgents
                    ?.map((x) => x.toString())
                    .includes(user._id.toString());
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleAgent(user._id)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer ${isSel ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSel ? "bg-indigo-500 text-white" : "bg-indigo-100 text-indigo-500"}`}
                      >
                        {(user.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate">
                          {user.name}
                        </p>
                        <p className="text-[10px] font-semibold uppercase text-gray-400">
                          {user.roles?.join(", ")}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSel ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}
                      >
                        {isSel && <FaCheck className="text-white text-[8px]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t pt-5">
              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                <FaPaperclip className="text-indigo-500" /> Attachments
              </p>
              <div className="flex items-center gap-3 mb-4">
                <label className="cursor-pointer bg-white border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                  <FaFileUpload /> Select Files
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={handleFileSelect}
                  />
                </label>
                <span className="text-xs text-gray-400">
                  {localFiles.length} new file(s)
                </span>
              </div>
              {localFiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {localFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.name)}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLocalFile(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {cd.attachments &&
                typeof cd.attachments === "string" &&
                cd.attachments.split(",").filter(Boolean).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">
                      Uploaded files:
                    </p>
                    <div className="space-y-2">
                      {cd.attachments
                        .split(",")
                        .filter(Boolean)
                        .map((url, idx) => {
                          const filename =
                            url.split("/").pop()?.split("?")[0] || "file";
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-gray-100 rounded"
                            >
                              <div className="flex items-center gap-3">
                                {getFileIcon(filename)}
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-indigo-600 hover:underline truncate"
                                >
                                  {filename}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExistingAttachment(url)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <FaTrashAlt />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Review before saving.</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                Basic Info
              </p>
              <RRow label="Code" value={cd.customerCode} />
              <RRow label="Name" value={cd.customerName} />
              <RRow label="Group" value={cd.customerGroup} />
              <RRow label="Type" value={cd.customerType} />
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                Contact
              </p>
              <RRow label="Email" value={cd.emailId} />
              <RRow label="Mobile" value={cd.mobileNumber} />
              <RRow label="Contact Person" value={cd.contactPersonName} />
              {cd.contactEmails?.length > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-xs font-bold text-gray-400">
                    Extra Emails
                  </span>
                  <div className="text-right">
                    {cd.contactEmails.map((c, i) => (
                      <p key={i} className="text-xs">
                        {c.name} — {c.email}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                Tax & Finance
              </p>
              <RRow label="GST" value={cd.gstNumber} />
              <RRow label="GST Category" value={cd.gstCategory} />
              <RRow label="PAN" value={cd.pan} />
              <RRow
                label="Payment Terms"
                value={cd.paymentTerms ? `${cd.paymentTerms} days` : ""}
              />
              <RRow
                label="Commission"
                value={cd.commissionRate ? `${cd.commissionRate}%` : ""}
              />
              <RRow
                label="GL Account"
                value={cd.glAccount?.accountName || cd.glAccount?.name}
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                SLA & Agents
              </p>
              <RRow
                label="SLA Policy"
                value={
                  cd.slaPolicyId
                    ? slaPolicies.find(
                        (s) =>
                          s._id.toString() ===
                          (cd.slaPolicyId?._id || cd.slaPolicyId)?.toString(),
                      )?.name || "Selected"
                    : "No SLA"
                }
              />
              <div className="flex justify-between py-2">
                <span className="text-xs font-bold text-gray-400">Agents</span>
                <div className="text-right">
                  {cd.assignedAgents?.length > 0 ? (
                    cd.assignedAgents.map((id) => {
                      const u = availableUsers.find(
                        (u) => u._id.toString() === id.toString(),
                      );
                      return (
                        <p key={id} className="text-xs">
                          {u?.name || id}
                        </p>
                      );
                    })
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                Attachments
              </p>
              {cd.attachments &&
              typeof cd.attachments === "string" &&
              cd.attachments.split(",").filter(Boolean).length > 0 ? (
                cd.attachments
                  .split(",")
                  .filter(Boolean)
                  .map((url, i) => {
                    const filename =
                      url.split("/").pop()?.split("?")[0] || "file";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 py-1 text-xs"
                      >
                        {getFileIcon(filename)} {filename}
                      </div>
                    );
                  })
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                Addresses
              </p>
              <RRow
                label="Billing"
                value={`${cd.billingAddresses?.filter((a) => a.address1).length || 0} added`}
              />
              <RRow
                label="Shipping"
                value={`${cd.shippingAddresses?.filter((a) => a.address1).length || 0} added`}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (view === "list") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold">Customers</h1>
              <p className="text-sm text-gray-400">{stats.total} total</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700"
              >
                <FaDownload /> Template
              </button>
              <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white cursor-pointer">
                <FaFileUpload /> Bulk Upload
                <input type="file" hidden accept=".csv" onChange={handleBulk} />
              </label>
              {canCreate && (
                <button
                  onClick={() => {
                    generateCode();
                    setView("form");
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white"
                >
                  <FaPlus /> Add Customer
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Total",
                value: stats.total,
                emoji: "👥",
                filter: "All",
              },
              {
                label: "Individual",
                value: stats.Individual,
                emoji: "🙍",
                filter: "Individual",
              },
              {
                label: "Business",
                value: stats.Business,
                emoji: "🏢",
                filter: "Business",
              },
              {
                label: "Government",
                value: stats.Government,
                emoji: "🏛️",
                filter: "Government",
              },
            ].map((s) => (
              <div
                key={s.label}
                onClick={() => setFilterType(s.filter)}
                className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 ${filterType === s.filter ? "border-indigo-400 shadow-md" : "border-transparent shadow-sm"}`}
              >
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="text-[10.5px] font-bold uppercase text-gray-400">
                    {s.label}
                  </p>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-3 px-5 py-4 border-b">
              <div className="relative flex-1 max-w-xs">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  className="w-full pl-8 pr-3 py-2 rounded-lg border bg-gray-50 text-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 ml-auto">
                {["All", "Individual", "Business", "Government"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {[
                      "Code",
                      "Customer",
                      "Type",
                      "Email",
                      "SLA",
                      "GL Account",
                      "Agents",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i}>
                          {Array(8)
                            .fill(0)
                            .map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                              </td>
                            ))}
                        </tr>
                      ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center py-16 text-gray-300"
                      >
                        No customers
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c._id}
                        className="border-b hover:bg-indigo-50/30"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {c.customerCode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{c.customerName}</p>
                          <p className="text-xs text-gray-400">
                            {c.customerGroup}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${c.customerType === "Individual" ? "bg-indigo-50 text-indigo-600" : c.customerType === "Business" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            {c.customerType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {c.emailId || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {c.slaPolicyId ? (
                            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                              {c.slaPolicyId.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.glAccount?.accountName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex">
                            {c.assignedAgents?.slice(0, 3).map((a, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white -ml-1.5 first:ml-0 flex items-center justify-center text-white text-[9px] font-bold"
                              >
                                {(a.name || "?")[0].toUpperCase()}
                              </div>
                            ))}
                            {c.assignedAgents?.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white -ml-1.5 flex items-center justify-center text-gray-500 text-[9px] font-bold">
                                +{c.assignedAgents.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {canView && (
                              <button
                                onClick={() => handleView(c)}
                                className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-500 hover:text-white"
                              >
                                <FaEye className="text-xs" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(c)}
                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white"
                              >
                                <FaEdit className="text-xs" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(c._id)}
                                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden">
              {filtered.map((c) => (
                <div key={c._id} className="p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {c.customerCode}
                    </span>
                    <div className="flex gap-1.5">
                      {canView && (
                        <button
                          onClick={() => handleView(c)}
                          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500"
                        >
                          <FaEye />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(c)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500"
                        >
                          <FaEdit />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-400"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold">{c.customerName}</p>
                  <p className="text-xs text-gray-400">{c.customerGroup}</p>
                  <span
                    className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${c.customerType === "Individual" ? "bg-indigo-50 text-indigo-600" : c.customerType === "Business" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                  >
                    {c.customerType}
                  </span>
                </div>
              ))}
            </div>
            {/* Pagination controls */}
            <div className="px-5 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50"
              >
                <FaChevronLeft /> Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 disabled:opacity-50"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        {viewModalOpen && viewingCustomer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setViewModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaUser className="text-indigo-500" /> Customer Details
                </h3>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Code
                    </label>
                    <p className="font-mono text-indigo-600 font-bold">
                      {viewingCustomer.customerCode}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Name
                    </label>
                    <p className="font-semibold">
                      {viewingCustomer.customerName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Group
                    </label>
                    <p>{viewingCustomer.customerGroup}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Type
                    </label>
                    <p>{viewingCustomer.customerType}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Email
                    </label>
                    <p>{viewingCustomer.emailId || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Mobile
                    </label>
                    <p>{viewingCustomer.mobileNumber || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Contact Person
                    </label>
                    <p>{viewingCustomer.contactPersonName || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      PAN
                    </label>
                    <p>{viewingCustomer.pan}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      GST
                    </label>
                    <p>{viewingCustomer.gstNumber || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      GST Category
                    </label>
                    <p>{viewingCustomer.gstCategory || "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Payment Terms
                    </label>
                    <p>
                      {viewingCustomer.paymentTerms
                        ? `${viewingCustomer.paymentTerms} days`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400">
                      Commission
                    </label>
                    <p>
                      {viewingCustomer.commissionRate
                        ? `${viewingCustomer.commissionRate}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase font-bold text-gray-400">
                      GL Account
                    </label>
                    <p>
                      {viewingCustomer.glAccount?.accountName ||
                        viewingCustomer.glAccount?.name ||
                        "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-gray-400">
                    SLA Policy
                  </label>
                  <p>
                    {viewingCustomer.slaPolicyId?.name ||
                      (viewingCustomer.slaPolicyId ? "Selected" : "None")}
                  </p>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-gray-400">
                    Assigned Agents
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewingCustomer.assignedAgents?.length ? (
                      viewingCustomer.assignedAgents.map((a) => (
                        <span
                          key={a._id}
                          className="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-full"
                        >
                          {a.name || a._id}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-gray-400">
                    Attachments
                  </label>
                  <div className="space-y-2 mt-1">
                    {viewingCustomer.attachments &&
                      typeof viewingCustomer.attachments === "string" &&
                      viewingCustomer.attachments
                        .split(",")
                        .filter(Boolean)
                        .map((url, i) => {
                          const filename =
                            url.split("/").pop()?.split("?")[0] || "file";
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                {getFileIcon(filename)} {filename}
                              </a>
                            </div>
                          );
                        })}
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-gray-400">
                    Billing Addresses
                  </label>
                  {viewingCustomer.billingAddresses?.map((a, i) => (
                    <div
                      key={i}
                      className="text-sm mt-1 p-2 bg-gray-50 rounded"
                    >
                      {a.address1} {a.address2}, {a.city}, {a.state} - {a.pin},{" "}
                      {a.country}
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-gray-400">
                    Shipping Addresses
                  </label>
                  {viewingCustomer.shippingAddresses?.map((a, i) => (
                    <div
                      key={i}
                      className="text-sm mt-1 p-2 bg-gray-50 rounded"
                    >
                      {a.address1} {a.address2}, {a.city}, {a.state} - {a.pin},{" "}
                      {a.country}
                    </div>
                  ))}
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                {canEdit && (
                  <button
                    onClick={() => {
                      setViewModalOpen(false);
                      handleEdit(viewingCustomer);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <FaEdit className="text-xs" /> Edit Customer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4"
        >
          <FaArrowLeft /> Back to Customers
        </button>
        <h2 className="text-xl font-extrabold">
          {cd._id ? "Edit Customer" : "New Customer"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Step {step} of {STEPS.length} — {STEPS[step - 1].label}
        </p>
        <div className="flex items-start mb-7">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => done && setStep(s.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-white border-gray-200 text-gray-300"}`}
                  >
                    {done ? (
                      <FaCheck style={{ fontSize: 12 }} />
                    ) : (
                      <Icon style={{ fontSize: 12 }} />
                    )}
                  </button>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 hidden sm:block ${done ? "text-emerald-500" : active ? "text-indigo-600" : "text-gray-300"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mt-[18px] mx-1 ${done ? "bg-emerald-400" : "bg-gray-200"}`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 mb-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              {React.createElement(STEPS[step - 1].icon, {
                className: "text-base",
              })}
            </div>
            <div>
              <h3 className="text-base font-bold">{STEPS[step - 1].label}</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-300 font-mono">
              {step}/{STEPS.length}
            </span>
          </div>
          {renderStep()}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={step > 1 ? goPrev : reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold"
          >
            <FaChevronLeft /> {step > 1 ? "Previous" : "Cancel"}
          </button>
          <span className="text-xs font-bold text-gray-300 font-mono">
            {step}/{STEPS.length}
          </span>
          {step < STEPS.length ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Next <FaChevronRight />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || (cd._id ? !canEdit : !canCreate)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold ${submitting || (cd._id ? !canEdit : !canCreate) ? "bg-gray-300 cursor-not-allowed opacity-60" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {submitting ? (
                "Saving..."
              ) : cd._id ? (
                canEdit ? (
                  <>
                    <FaCheck /> Update Customer
                  </>
                ) : (
                  "No Edit Permission"
                )
              ) : canCreate ? (
                <>
                  <FaCheck /> Create Customer
                </>
              ) : (
                "No Create Permission"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
