"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaPlus, FaTrash, FaSearch, FaChevronDown, FaChevronRight,
  FaTimes, FaWarehouse, FaBoxOpen, FaExclamationCircle, FaCheck,
  FaStar, FaRegStar, FaEdit, FaEye, FaSave, FaTimesCircle
} from "react-icons/fa";

const EMPTY_WAREHOUSE = {
  warehouseCode: "",
  warehouseName: "",
  account: "",
  company: "",
  phoneNo: "",
  mobileNo: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pin: "",
  country: "India",
  warehouseType: "Main",
  defaultInTransit: false,
  isDefault: false,
  status: "Active",
  managerName: "",
  notes: ""
};

const EMPTY_BIN = {
  code: "",
  aisle: "",
  rack: "",
  bin: "",
  maxCapacity: "",
  currentStock: 0,
  description: ""
};

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isBinModalOpen, setIsBinModalOpen] = useState(false);
  const [isEditBinMode, setIsEditBinMode] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [expandedWarehouse, setExpandedWarehouse] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_WAREHOUSE });
  const [binFormData, setBinFormData] = useState({ ...EMPTY_BIN });
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [errors, setErrors] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch warehouses
  const fetchWarehouses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/warehouse?page=${page}&limit=${pagination.limit}&search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setWarehouses(res.data.data);
        setPagination({
          ...pagination,
          page: res.data.pagination.page,
          total: res.data.pagination.total,
          pages: res.data.pagination.pages
        });
      }
    } catch (error) {
      toast.error("Failed to fetch warehouses");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, pagination.limit]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBinChange = (e) => {
    const { name, value } = e.target;
    setBinFormData(prev => ({
      ...prev,
      [name]: name === "maxCapacity" || name === "currentStock" ? Number(value) : value
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    if (!formData.warehouseCode) newErrors.warehouseCode = "Warehouse code is required";
    if (!formData.warehouseName) newErrors.warehouseName = "Warehouse name is required";
    if (!formData.account) newErrors.account = "Account is required";
    if (!formData.company) newErrors.company = "Company is required";
    if (!formData.phoneNo) newErrors.phoneNo = "Phone number is required";
    if (formData.phoneNo && !/^\d{10}$/.test(formData.phoneNo)) newErrors.phoneNo = "Phone number must be 10 digits";
    if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) newErrors.mobileNo = "Mobile number must be 10 digits";
    if (!formData.addressLine1) newErrors.addressLine1 = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.pin) newErrors.pin = "PIN code is required";
    if (formData.pin && !/^\d{6}$/.test(formData.pin)) newErrors.pin = "PIN code must be 6 digits";
    if (!formData.country) newErrors.country = "Country is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBinForm = () => {
    const newErrors = {};
    if (!binFormData.code) newErrors.code = "Bin code is required";
    if (!binFormData.aisle) newErrors.aisle = "Aisle is required";
    if (!binFormData.rack) newErrors.rack = "Rack is required";
    if (!binFormData.bin) newErrors.bin = "Bin is required";
    if (!binFormData.maxCapacity) newErrors.maxCapacity = "Max capacity is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create or update warehouse
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let res;
      
      if (isEditMode) {
        res = await axios.put(`/api/warehouse?id=${formData._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          toast.success("Warehouse updated successfully");
        }
      } else {
        res = await axios.post("/api/warehouse", formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          toast.success("Warehouse created successfully");
        }
      }
      
      closeModal();
      fetchWarehouses();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save warehouse");
    } finally {
      setLoading(false);
    }
  };

  // Delete warehouse
  const deleteWarehouse = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/warehouse?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success("Warehouse deleted successfully");
        fetchWarehouses();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete warehouse");
    } finally {
      setLoading(false);
    }
  };

  // Set default warehouse
  const setAsDefault = async (id, name) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(`/api/warehouse?id=${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success(`${name} is now the default warehouse`);
        fetchWarehouses();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to set default warehouse");
    } finally {
      setLoading(false);
    }
  };

  // Bin CRUD operations
  const fetchBins = async (warehouseCode) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/warehouse/bins/${warehouseCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    } catch (error) {
      toast.error("Failed to fetch bins");
      return [];
    }
  };

  const addBin = async () => {
    if (!validateBinForm()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`/api/warehouse/bins/${selectedWarehouse.warehouseCode}`, binFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success("Bin added successfully");
        closeBinModal();
        // Refresh warehouse data to show new bin
        fetchWarehouses();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add bin");
    } finally {
      setLoading(false);
    }
  };

  const deleteBin = async (binId) => {
    if (!confirm("Are you sure you want to delete this bin?")) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/warehouse/bins/${selectedWarehouse.warehouseCode}?binId=${binId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        toast.success("Bin deleted successfully");
        // Refresh warehouse data
        fetchWarehouses();
        // Refresh expanded view
        if (expandedWarehouse === selectedWarehouse._id) {
          setExpandedWarehouse(null);
          setTimeout(() => setExpandedWarehouse(selectedWarehouse._id), 100);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete bin");
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setFormData({ ...EMPTY_WAREHOUSE });
    setIsEditMode(false);
    setIsViewMode(false);
    setModalTitle("Add Warehouse");
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (warehouse) => {
    setFormData({ ...warehouse });
    setIsEditMode(true);
    setIsViewMode(false);
    setModalTitle("Edit Warehouse");
    setErrors({});
    setModalOpen(true);
  };

  const openViewModal = (warehouse) => {
    setFormData({ ...warehouse });
    setIsViewMode(true);
    setIsEditMode(false);
    setModalTitle("Warehouse Details");
    setModalOpen(true);
  };

  const openBinModal = (warehouse, bin = null) => {
    setSelectedWarehouse(warehouse);
    if (bin) {
      setBinFormData({ ...bin });
      setIsEditBinMode(true);
      setModalTitle(`Edit Bin - ${warehouse.warehouseName}`);
    } else {
      setBinFormData({ ...EMPTY_BIN });
      setIsEditBinMode(false);
      setModalTitle(`Add Bin - ${warehouse.warehouseName}`);
    }
    setErrors({});
    setIsBinModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ ...EMPTY_WAREHOUSE });
    setIsEditMode(false);
    setIsViewMode(false);
    setErrors({});
  };

  const closeBinModal = () => {
    setIsBinModalOpen(false);
    setBinFormData({ ...EMPTY_BIN });
    setIsEditBinMode(false);
    setSelectedWarehouse(null);
    setErrors({});
  };

  const toggleExpand = (warehouseId) => {
    setExpandedWarehouse(expandedWarehouse === warehouseId ? null : warehouseId);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const styles = {
      Active: "bg-emerald-50 text-emerald-600",
      Inactive: "bg-gray-50 text-gray-400",
      "Under Maintenance": "bg-amber-50 text-amber-600"
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.Active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Warehouse Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {warehouses.length} total warehouses | Page {pagination.page} of {pagination.pages}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
          >
            <FaPlus className="text-xs" /> Add Warehouse
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, name, city or type..."
            />
          </div>
        </div>

        {/* Warehouses Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 w-10"></th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Code</th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">City</th>
                  <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Phone</th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Bins</th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Default</th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && warehouses.length === 0 ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(10).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                         </td>
                      ))}
                    </tr>
                  ))
                ) : warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <div className="text-4xl mb-2 opacity-20">🏭</div>
                      <p className="text-sm font-medium text-gray-300">
                        {searchTerm ? "No warehouses match your search" : "No warehouses yet — add your first one!"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  warehouses.map(wh => (
                    <React.Fragment key={wh._id}>
                      <tr className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(wh._id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs
                              ${wh.binLocations?.length ? "bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white" : "bg-gray-50 text-gray-200 cursor-default"}`}
                            disabled={!wh.binLocations?.length}
                          >
                            {expandedWarehouse === wh._id ? <FaChevronDown /> : <FaChevronRight />}
                          </button>
                         </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {wh.warehouseCode}
                          </span>
                         </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-sm">{wh.warehouseName}</p>
                          <p className="text-xs text-gray-400">{wh.company}</p>
                         </td>
                        <td className="px-4 py-3">
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {wh.warehouseType}
                          </span>
                         </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-medium">{wh.city || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-medium">{wh.phoneNo || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full
                            ${wh.binLocations?.length ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"}`}>
                            {wh.binLocations?.length || 0} bins
                          </span>
                         </td>
                        <td className="px-4 py-3 text-center">
                          {wh.isDefault ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600">
                              <FaStar className="text-[10px]" /> Default
                            </span>
                          ) : (
                            <button
                              onClick={() => setAsDefault(wh._id, wh.warehouseName)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-all"
                            >
                              <FaRegStar className="text-[10px]" /> Set
                            </button>
                          )}
                         </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={wh.status} />
                         </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openViewModal(wh)}
                              className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                              title="View"
                            >
                              <FaEye className="text-xs" />
                            </button>
                            <button
                              onClick={() => openEditModal(wh)}
                              className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all"
                              title="Edit"
                            >
                              <FaEdit className="text-xs" />
                            </button>
                            <button
                              onClick={() => openBinModal(wh)}
                              className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all"
                              title="Manage Bins"
                            >
                              <FaBoxOpen className="text-xs" />
                            </button>
                            <button
                              onClick={() => deleteWarehouse(wh._id, wh.warehouseName)}
                              className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                              title="Delete"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </div>
                         </td>
                       </tr>

                      {/* Expanded Bins Section */}
                      {expandedWarehouse === wh._id && wh.binLocations?.length > 0 && (
                        <tr>
                          <td colSpan={10} className="px-6 pb-3 bg-gray-50/60">
                            <div className="rounded-xl border border-gray-200 overflow-hidden mt-1">
                              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600">
                                <FaBoxOpen className="text-white text-xs" />
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-white">
                                  Bin Locations — {wh.warehouseName}
                                </span>
                                <span className="ml-auto text-[10px] text-indigo-200 font-semibold">
                                  {wh.binLocations.length} bins
                                </span>
                              </div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-gray-200">
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Code</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Aisle</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Rack</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">Bin</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Max Capacity</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                                   </tr>
                                </thead>
                                <tbody>
                                  {wh.binLocations.map((bin) => (
                                    <tr key={bin._id} className="border-b border-gray-100 last:border-0 hover:bg-indigo-50/30 transition-colors">
                                      <td className="px-3 py-2">
                                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                          {bin.code}
                                        </span>
                                       </td>
                                      <td className="px-3 py-2 font-medium text-gray-600">{bin.aisle || "—"}</td>
                                      <td className="px-3 py-2 font-medium text-gray-600">{bin.rack || "—"}</td>
                                      <td className="px-3 py-2 font-medium text-gray-600">{bin.bin || "—"}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-700">{bin.maxCapacity}</td>
                                      <td className="px-3 py-2 text-center">
                                        <button
                                          onClick={() => deleteBin(bin._id)}
                                          className="w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all mx-auto"
                                        >
                                          <FaTrash className="text-[10px]" />
                                        </button>
                                       </td>
                                     </tr>
                                  ))}
                                </tbody>
                               </table>
                            </div>
                           </td>
                         </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => fetchWarehouses(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchWarehouses(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warehouse Modal - Add/Edit/View */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <FaWarehouse className="text-sm" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{modalTitle}</h3>
                <p className="text-xs text-gray-400">
                  {isViewMode ? "View warehouse details" : "Fill warehouse details"}
                </p>
              </div>
              <button onClick={closeModal} className="ml-auto w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {isViewMode ? (
                // View Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Code</label><p className="text-sm font-semibold text-gray-900 mt-1">{formData.warehouseCode}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Name</label><p className="text-sm font-semibold text-gray-900 mt-1">{formData.warehouseName}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Account</label><p className="text-sm text-gray-700 mt-1">{formData.account}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Company</label><p className="text-sm text-gray-700 mt-1">{formData.company}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Phone</label><p className="text-sm text-gray-700 mt-1">{formData.phoneNo}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Mobile</label><p className="text-sm text-gray-700 mt-1">{formData.mobileNo || "—"}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Email</label><p className="text-sm text-gray-700 mt-1">{formData.email || "—"}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Type</label><p className="text-sm text-gray-700 mt-1">{formData.warehouseType}</p></div>
                    <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase text-gray-400">Address</label><p className="text-sm text-gray-700 mt-1">{formData.addressLine1}{formData.addressLine2 && `, ${formData.addressLine2}`}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">City</label><p className="text-sm text-gray-700 mt-1">{formData.city}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">State</label><p className="text-sm text-gray-700 mt-1">{formData.state}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">PIN</label><p className="text-sm text-gray-700 mt-1">{formData.pin}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Country</label><p className="text-sm text-gray-700 mt-1">{formData.country}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Status</label><p className="text-sm mt-1"><StatusBadge status={formData.status} /></p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">Default Warehouse</label><p className="text-sm mt-1">{formData.isDefault ? "✓ Yes" : "No"}</p></div>
                    <div><label className="text-[10px] font-bold uppercase text-gray-400">In Transit</label><p className="text-sm mt-1">{formData.defaultInTransit ? "✓ Yes" : "No"}</p></div>
                  </div>
                </div>
              ) : (
                // Edit/Add Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Warehouse Code <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.warehouseCode ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="warehouseCode" value={formData.warehouseCode} onChange={handleChange} placeholder="e.g. WH001" disabled={isEditMode} />
                      {errors.warehouseCode && <p className="text-red-500 text-xs mt-1">{errors.warehouseCode}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Warehouse Name <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.warehouseName ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="warehouseName" value={formData.warehouseName} onChange={handleChange} />
                      {errors.warehouseName && <p className="text-red-500 text-xs mt-1">{errors.warehouseName}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Account <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.account ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="account" value={formData.account} onChange={handleChange} />
                      {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Company <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.company ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="company" value={formData.company} onChange={handleChange} />
                      {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Phone No. <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.phoneNo ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="phoneNo" type="tel" maxLength="10" value={formData.phoneNo} onChange={handleChange} />
                      {errors.phoneNo && <p className="text-red-500 text-xs mt-1">{errors.phoneNo}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Mobile No.</label>
                      <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="mobileNo" type="tel" maxLength="10" value={formData.mobileNo} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Email</label>
                      <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="email" type="email" value={formData.email} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Warehouse Type <span className="text-red-500">*</span></label>
                      <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="warehouseType" value={formData.warehouseType} onChange={handleChange}>
                        <option value="Main">Main</option>
                        <option value="Transit">Transit</option>
                        <option value="Cold Storage">Cold Storage</option>
                        <option value="Bonded">Bonded</option>
                        <option value="Distribution">Distribution</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Address Line 1 <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.addressLine1 ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="addressLine1" value={formData.addressLine1} onChange={handleChange} />
                      {errors.addressLine1 && <p className="text-red-500 text-xs mt-1">{errors.addressLine1}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Address Line 2</label>
                      <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="addressLine2" value={formData.addressLine2} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">City <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.city ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="city" value={formData.city} onChange={handleChange} />
                      {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">State <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.state ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="state" value={formData.state} onChange={handleChange} />
                      {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">PIN Code <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.pin ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="pin" type="text" maxLength="6" value={formData.pin} onChange={handleChange} />
                      {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Country <span className="text-red-500">*</span></label>
                      <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.country ? "border-red-400 bg-red-50" : "border-gray-200"}`} name="country" value={formData.country} onChange={handleChange} />
                      {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Status</label>
                      <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="status" value={formData.status} onChange={handleChange}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Manager Name</label>
                      <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="managerName" value={formData.managerName} onChange={handleChange} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Notes</label>
                      <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="notes" rows="2" value={formData.notes} onChange={handleChange} />
                    </div>
                  </div>

                  {/* Toggle Switches */}
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Set as Default Warehouse</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="defaultInTransit" checked={formData.defaultInTransit} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Default In Transit</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-300 transition-all">
                {isViewMode ? "Close" : "Cancel"}
              </button>
              {!isViewMode && (
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><FaSave className="text-xs" /> {isEditMode ? "Update" : "Create"}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bin Modal */}
      {isBinModalOpen && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeBinModal} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <FaBoxOpen className="text-sm" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{modalTitle}</h3>
                <p className="text-xs text-gray-400">Fill bin location details</p>
              </div>
              <button onClick={closeBinModal} className="ml-auto w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
                <FaTimes className="text-xs" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Bin Code <span className="text-red-500">*</span></label>
                <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.code ? "border-red-400" : "border-gray-200"}`} name="code" value={binFormData.code} onChange={handleBinChange} placeholder="e.g. BIN-001" />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Aisle <span className="text-red-500">*</span></label>
                  <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.aisle ? "border-red-400" : "border-gray-200"}`} name="aisle" value={binFormData.aisle} onChange={handleBinChange} placeholder="e.g. A" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Rack <span className="text-red-500">*</span></label>
                  <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.rack ? "border-red-400" : "border-gray-200"}`} name="rack" value={binFormData.rack} onChange={handleBinChange} placeholder="e.g. R1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Bin <span className="text-red-500">*</span></label>
                  <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.bin ? "border-red-400" : "border-gray-200"}`} name="bin" value={binFormData.bin} onChange={handleBinChange} placeholder="e.g. B1" />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Max Capacity <span className="text-red-500">*</span></label>
                  <input className={`w-full px-3 py-2.5 rounded-lg border text-sm ${errors.maxCapacity ? "border-red-400" : "border-gray-200"}`} name="maxCapacity" type="number" value={binFormData.maxCapacity} onChange={handleBinChange} placeholder="e.g. 100" />
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-gray-500 mb-1.5">Description</label>
                <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" name="description" rows="2" value={binFormData.description} onChange={handleBinChange} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={closeBinModal} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-300 transition-all">Cancel</button>
              <button onClick={addBin} disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50">
                {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : <><FaCheck className="text-xs" /> Add Bin</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const WarehouseDetailsForm = () => {
//   const initialWarehouseData = {
//     warehouseCode: "",
//     warehouseName: "",
//     parentWarehouse: "",
//     account: "",
//     company: "",
//     phoneNo: "",
//     mobileNo: "",
//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//     country: "",
//   };

//   const initialBinData = {
//     code: "",
//     aisle: "",
//     rack: "",
//     bin: "",
//     maxCapacity: "",
//     parentWarehouse: "",
//   };

//   const [formData, setFormData] = useState(initialWarehouseData);
//   const [isBinForm, setIsBinForm] = useState(false);

//   const [warehouses, setWarehouses] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [listLoading, setListLoading] = useState(false);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalTitle, setModalTitle] = useState("Add Warehouse");

//   const [selectedParent, setSelectedParent] = useState(null);
//    const [expanded, setExpanded] = useState({});
//   // Fetch warehouses
//   const fetchWarehouses = async () => {
//     setListLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/warehouse", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) setWarehouses(res.data.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setListLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchWarehouses();
//   }, []);

//   // Form change
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
//   };


//    const toggleExpand = (id) => {
//     setExpanded((prev) => ({
//       ...prev,
//       [id]: !prev[id],
//     }));
//   };

//   const handleSelectCountry = (country) =>
//     setFormData((prev) => ({ ...prev, country: country?._id || "", state: "" }));

//   const handleSelectState = (state) =>
//     setFormData((prev) => ({ ...prev, state: state?._id || "" }));

//   const validateForm = () => {
//     if (isBinForm) {
//       const required = ["code", "aisle", "rack", "bin", "maxCapacity"];
//       const missing = required.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all bin fields.");
//         return false;
//       }
//       return true;
//     } else {
//       const requiredFields = [
//         "warehouseCode",
//         "warehouseName",
//         "account",
//         "company",
//         "phoneNo",
//         "addressLine1",
//         "city",
//         "state",
//         "pin",
//         "country",
//         "warehouseType",
//       ];
//       const missing = requiredFields.filter((f) => !formData[f]);
//       if (missing.length) {
//         toast.error("Please fill all required fields.");
//         return false;
//       }
//       if (!/^\d{10}$/.test(formData.phoneNo)) {
//         toast.error("Phone must be 10 digits.");
//         return false;
//       }
//       if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
//         toast.error("Mobile must be 10 digits.");
//         return false;
//       }
//       if (!/^\d{6}$/.test(formData.pin)) {
//         toast.error("PIN must be 6 digits.");
//         return false;
//       }
//       return true;
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");

//       if (isBinForm) {
//         // 👉 Save Bin
//         const res = await axios.post(
//           `/api/warehouse/${formData.parentWarehouse}/bins`,
//           formData,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (res.data.success) {
//           toast.success("Bin added successfully!");
//           setFormData(initialBinData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       } else {
//         // 👉 Save Main Warehouse
//         const res = await axios.post("/api/warehouse", formData, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           toast.success("Warehouse added successfully!");
//           setFormData(initialWarehouseData);
//           setModalOpen(false);
//           fetchWarehouses();
//         }
//       }
//       setSelectedParent(null);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to save");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const deleteWarehouse = async (id) => {
//     if (!confirm("Are you sure you want to delete this warehouse?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/warehouse?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       toast.success("Deleted successfully!");
//       fetchWarehouses();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete warehouse");
//     }
//   };

//   // Open modal for main warehouse
//   const openMainModal = () => {
//     setModalTitle("Add Warehouse");
//     setFormData(initialWarehouseData);
//     setIsBinForm(false);
//     setSelectedParent(null);
//     setModalOpen(true);
//   };

//   // Open modal for sub-warehouse/bin
//   const openSubModal = (parent) => {
//     setModalTitle(`Add Bin for ${parent.warehouseName}`);
//     setFormData({ ...initialBinData, parentWarehouse: parent._id });
//     setSelectedParent(parent);
//     setIsBinForm(true);
//     setModalOpen(true);
//   };

//   return (
//     <div className="p-6 max-w-6xl mx-auto">
//       <button
//         onClick={openMainModal}
//         className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
//       >
//         Add Warehouse
//       </button>

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//           <div className="bg-white w-full max-w-3xl p-6 m-48 rounded shadow-lg relative max-h-[80vh] overflow-y-auto">
//             <button
//               onClick={() => setModalOpen(false)}
//               className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
//             >
//               ✕
//             </button>
//             <h2 className="text-xl font-semibold mb-4">{modalTitle}</h2>

//             <form
//               onSubmit={handleSubmit}
//               className="grid grid-cols-1 md:grid-cols-2 gap-4"
//             >
//               {isBinForm ? (
//                 <>
//                   <InputField
//                     label="Bin Code"
//                     name="code"
//                     value={formData.code}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Aisle"
//                     name="aisle"
//                     value={formData.aisle}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Rack"
//                     name="rack"
//                     value={formData.rack}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Bin"
//                     name="bin"
//                     value={formData.bin}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Max Capacity"
//                     name="maxCapacity"
//                     value={formData.maxCapacity}
//                     onChange={handleChange}
//                   />
//                 </>
//               ) : (
//                 <>
//                   <InputField
//                     label="Warehouse Code"
//                     name="warehouseCode"
//                     value={formData.warehouseCode}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Warehouse Name"
//                     name="warehouseName"
//                     value={formData.warehouseName}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Account"
//                     name="account"
//                     value={formData.account}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Company"
//                     name="company"
//                     value={formData.company}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Phone"
//                     name="phoneNo"
//                     value={formData.phoneNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Mobile"
//                     name="mobileNo"
//                     value={formData.mobileNo}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 1"
//                     name="addressLine1"
//                     value={formData.addressLine1}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="Address Line 2"
//                     name="addressLine2"
//                     value={formData.addressLine2}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="City"
//                     name="city"
//                     value={formData.city}
//                     onChange={handleChange}
//                   />
//                   <InputField
//                     label="PIN"
//                     name="pin"
//                     value={formData.pin}
//                     onChange={handleChange}
//                   />
//                   <div className="col-span-2">
//                     <CountryStateSearch
//                       valueCountry={formData.country}
//                       valueState={formData.state}
//                       onSelectCountry={handleSelectCountry}
//                       onSelectState={handleSelectState}
//                     />
//                   </div>
//                   <InputField
//                     label="Warehouse Type"
//                     name="warehouseType"
//                     value={formData.warehouseType}
//                     onChange={handleChange}
//                   />
//                   <div className="flex items-center col-span-2">
//                     <input
//                       type="checkbox"
//                       name="defaultInTransit"
//                       checked={formData.defaultInTransit}
//                       onChange={handleChange}
//                       className="mr-2"
//                     />
//                     <label>Default In Transit</label>
//                   </div>
//                 </>
//               )}
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="col-span-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600"
//               >
//                 {loading ? "Saving..." : "Save"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Warehouse List */}
//   <h2 className="text-xl font-semibold mt-6 mb-2">Warehouse List</h2>
//       {listLoading ? (
//         <p>Loading...</p>
//       ) : (
//         <table className="min-w-full border border-gray-300">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="border px-3 py-1">Code</th>
//               <th className="border px-3 py-1">Name</th>
//               <th className="border px-3 py-1">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {warehouses.map((wh) => (
//               <React.Fragment key={wh._id}>
//                 {/* Warehouse row */}
//                 <tr className="bg-white">
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {expanded[wh._id] ? "▼ " : "▶ "} {wh.warehouseCode}
//                   </td>
//                   <td
//                     className="border px-3 py-1 cursor-pointer hover:bg-gray-50"
//                     onClick={() => toggleExpand(wh._id)}
//                   >
//                     {wh.warehouseName}
//                   </td>
//                   <td className="border px-3 py-1 flex gap-2">
//                     <button
//                       onClick={() => openSubModal(wh)}
//                       className="bg-green-500 text-white px-2 py-1 rounded"
//                     >
//                       Add Bin
//                     </button>
//                     <button
//                       onClick={() => deleteWarehouse(wh._id)}
//                       className="bg-red-500 text-white px-2 py-1 rounded"
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>

//                 {/* Expanded Bin rows */}
//                 {expanded[wh._id] && wh.binLocations && wh.binLocations.length > 0 && (
//                   <tr>
//                     <td colSpan="3" className="p-0">
//                       <table className="w-full border border-gray-200 ml-6">
//                         <thead>
//                           <tr className="bg-gray-50 text-sm">
//                             <th className="border px-2 py-1">Bin Code</th>
//                             <th className="border px-2 py-1">Aisle</th>
//                             <th className="border px-2 py-1">Rack</th>
//                             <th className="border px-2 py-1">Bin</th>
//                             <th className="border px-2 py-1">Max Capacity</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {wh.binLocations.map((bin) => (
//                             <tr key={bin._id} className="text-sm">
//                               <td className="border px-2 py-1">{bin.code}</td>
//                               <td className="border px-2 py-1">{bin.aisle || "-"}</td>
//                               <td className="border px-2 py-1">{bin.rack || "-"}</td>
//                               <td className="border px-2 py-1">{bin.bin || "-"}</td>
//                               <td className="border px-2 py-1">{bin.maxCapacity}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             ))}
//           </tbody>
//         </table>
//       )}

//     </div>
//   );
// };

// // Reusable Input Component
// const InputField = ({ label, name, value, onChange, disabled }) => (
//   <div>
//     <label className="block text-sm font-medium">{label}</label>
//     <input
//       type="text"
//       name={name}
//       value={value}
//       onChange={onChange}
//       disabled={disabled}
//       className={`mt-1 p-2 w-full border rounded ${disabled ? "bg-gray-100" : ""}`}
//     />
//   </div>
// );

// export default WarehouseDetailsForm;
