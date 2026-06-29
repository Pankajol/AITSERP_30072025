"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import {
  FaPlus,
  FaCheck,
  FaFileInvoice,
  FaFileExcel,
  FaTimes,
  FaLayerGroup,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { toast } from "react-toastify";

export default function ConstructionBOQPage() {
  const [boqs, setBoqs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editBOQ, setEditBOQ] = useState(null);

  // ── Form State ──
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectImport, setSelectedProjectImport] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [boqNumber, setBoqNumber] = useState("");
  const [boqDate, setBoqDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [phase, setPhase] = useState("I"); // added phase

  // ── Fetch BOQs, Projects, Inventory ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [boqRes, projRes, invRes] = await Promise.allSettled([
          api.get("/construction/boq", headers),
          api.get("/construction/projects", headers),
          api.get("/items", headers),
        ]);

        if (boqRes.status === "fulfilled") {
          setBoqs(boqRes.value.data?.data || boqRes.value.data || []);
        } else {
          console.warn("BOQ API failed:", boqRes.reason);
          setBoqs([]);
        }

        if (projRes.status === "fulfilled") {
          setProjects(projRes.value.data?.data || projRes.value.data || []);
        } else {
          console.warn("Projects API failed:", projRes.reason);
          setProjects([]);
        }

        if (invRes.status === "fulfilled") {
          setInventoryItems(invRes.value.data?.data || invRes.value.data || []);
        } else {
          console.warn("Inventory API failed:", invRes.reason);
          setInventoryItems([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // ── Build options with variants ──
  const buildItemOptions = () => {
    const options = [];
    inventoryItems.forEach((item) => {
      if (item.variants && item.variants.length > 0) {
        item.variants.forEach((variant) => {
          let label = item.itemName;
          if (variant.attributes) {
            const attrStr = Object.entries(variant.attributes)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ");
            label += ` (${attrStr})`;
          } else {
            label += ` (${variant.sku || "variant"})`;
          }
          options.push({
            value: variant._id,
            label: label,
            isVariant: true,
            parentId: item._id,
            parentName: item.itemName,
            variantData: variant,
            unit: variant.uom || item.uom || "nos",
            rate: variant.price || item.unitPrice || 0,
            imageUrl: variant.imageUrl || item.imageUrl || "",
          });
        });
      } else {
        options.push({
          value: item._id,
          label: item.itemName,
          isVariant: false,
          parentId: null,
          parentName: item.itemName,
          variantData: null,
          unit: item.uom || "nos",
          rate: item.unitPrice || 0,
          imageUrl: item.imageUrl || "",
        });
      }
    });
    return options;
  };

  // ── Add variant rows (multiple) ──
  const addVariantRows = (selectedOption) => {
    if (!selectedOption) return;

    let rowsToAdd = [];

    if (selectedOption.isVariant) {
      // Single variant
      rowsToAdd = [
        {
          itemId: selectedOption.parentId,
          variantId: selectedOption.value,
          itemName: selectedOption.parentName,
          variantName: selectedOption.label,
          description: selectedOption.label,
          unit: selectedOption.unit,
          quantity: 1,
          rate: selectedOption.rate,
          amount: selectedOption.rate,
          imageUrl: selectedOption.imageUrl,
          isVariant: true,
          variantData: selectedOption.variantData,
          isCustom: false,
        },
      ];
    } else {
      // Check if this item has variants
      const parentItem = inventoryItems.find(
        (i) => i._id === selectedOption.value
      );
      if (parentItem && parentItem.variants && parentItem.variants.length > 0) {
        // Add ALL variants of this item
        parentItem.variants.forEach((v) => {
          let label = parentItem.itemName;
          if (v.attributes) {
            const attrStr = Object.entries(v.attributes)
              .map(([k, val]) => `${k}: ${val}`)
              .join(", ");
            label += ` (${attrStr})`;
          } else {
            label += ` (${v.sku || "variant"})`;
          }
          rowsToAdd.push({
            itemId: parentItem._id,
            variantId: v._id,
            itemName: parentItem.itemName,
            variantName: label,
            description: label,
            unit: v.uom || parentItem.uom || "nos",
            quantity: 1,
            rate: v.price || parentItem.unitPrice || 0,
            amount: v.price || parentItem.unitPrice || 0,
            imageUrl: v.imageUrl || parentItem.imageUrl || "",
            isVariant: true,
            variantData: v,
            isCustom: false,
          });
        });
      } else {
        // No variants – add single row
        rowsToAdd = [
          {
            itemId: selectedOption.value,
            variantId: null,
            itemName: selectedOption.label,
            variantName: null,
            description: selectedOption.label,
            unit: selectedOption.unit,
            quantity: 1,
            rate: selectedOption.rate,
            amount: selectedOption.rate,
            imageUrl: selectedOption.imageUrl,
            isVariant: false,
            variantData: null,
            isCustom: false,
          },
        ];
      }
    }

    setItems((prev) => [...prev, ...rowsToAdd]);
  };

  // ── Open Modal ──
  const openModal = (boq = null) => {
    setEditBOQ(boq);
    if (boq) {
      setSelectedProject({ value: boq.project._id, label: boq.project.name });
      setBoqNumber(boq.boqNumber);
      setBoqDate(boq.date.split("T")[0]);
      setStatus(boq.status);
      setRemarks(boq.remarks || "");
      setPhase(boq.phase || "I");
      setItems(
        boq.items.map((item) => ({
          ...item,
          itemId: item.itemId?._id || item.itemId || null,
          variantId: item.variantId?._id || item.variantId || null, // preserve variantId
          itemName: item.itemName || "",
          description: item.description || "",
          unit: item.unit || "nos",
          quantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          imageUrl: item.imageUrl || "",
          isCustom: !item.itemId,
          isVariant: !!item.variantId,
          variantData: item.variantData || null,
          variantName: item.variantName || null,
        }))
      );
    } else {
      setSelectedProject(null);
      setBoqNumber(`BOQ-${Date.now().toString().slice(-6)}`);
      setBoqDate(new Date().toISOString().split("T")[0]);
      setStatus("draft");
      setRemarks("");
      setPhase("I");
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditBOQ(null);
  };

  // ── BOQ Item Handlers ──
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      item[field] = value;
      // Recalculate amount if quantity or rate changed
      if (field === "quantity" || field === "rate") {
        const qty = field === "quantity" ? value : item.quantity;
        const rate = field === "rate" ? value : item.rate;
        item.amount = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
      }
      newItems[index] = item;
      return newItems;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemId: null,
        variantId: null,
        itemName: "",
        variantName: null,
        description: "",
        unit: "nos",
        quantity: 1,
        rate: 0,
        amount: 0,
        imageUrl: "",
        isCustom: true,
        isVariant: false,
        variantData: null,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalBOQAmount = items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  // ── Submit BOQ ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items
      .filter((item) => item.itemName && item.itemName.trim() !== "")
      .map((item) => ({
        itemId: item.isCustom ? null : item.itemId,
        variantId: item.variantId || null, // include variantId if present
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0,
        amount: parseFloat(item.amount) || 0,
      }));

    if (validItems.length === 0) {
      toast.error("Please add at least one BOQ item.");
      return;
    }

    const payload = {
      project: selectedProject.value,
      boqNumber,
      date: boqDate,
      status,
      remarks,
      phase,
      items: validItems,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      if (editBOQ) {
        const res = await api.put(
          `/construction/boq/${editBOQ._id}`,
          payload,
          headers
        );
        setBoqs(
          boqs.map((b) =>
            b._id === editBOQ._id ? res.data.data || res.data : b
          )
        );
        toast.success("BOQ updated successfully!");
      } else {
        const res = await api.post("/construction/boq", payload, headers);
        setBoqs([res.data.data || res.data, ...boqs]);
        toast.success("BOQ created successfully!");
      }
      closeModal();
    } catch (err) {
      console.error("❌ BOQ save failed:", err);
      toast.error("Failed to save BOQ. Check console.");
    }
  };

  // ── Import BOQ from Excel ──
  const handleImport = async () => {
    if (!selectedProjectImport || !importFile) {
      toast.error("Please select project and upload file.");
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append("projectId", selectedProjectImport.value);
    formData.append("file", importFile);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/construction/boq/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        const refreshRes = await api.get("/construction/boq", headers);
        setBoqs(refreshRes.data.data || []);
        setIsImportModalOpen(false);
        setImportFile(null);
        setSelectedProjectImport(null);
      } else {
        toast.error(data.message || "Import failed.");
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Import failed. Check console.");
    } finally {
      setImporting(false);
    }
  };

  // ── UI Helpers ──
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
  const fi =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      draft: "bg-gray-100 text-gray-600",
      submitted: "bg-blue-100 text-blue-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
          colors[status] || colors.draft
        }`}
      >
        {status}
      </span>
    );
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaFileInvoice className="text-indigo-600" /> Construction BOQ
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Project estimates with multi-row variant support
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
            >
              <FaFileExcel size={12} /> Import Excel
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
            >
              <FaPlus size={12} /> New BOQ
            </button>
          </div>
        </div>

        {/* BOQ Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    BOQ #
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Project
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Phase
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading BOQs...
                    </td>
                  </tr>
                ) : boqs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                      No BOQs found. Import from Excel or create manually.
                    </td>
                  </tr>
                ) : (
                  boqs.map((b) => (
                    <tr key={b._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {b.boqNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {b.project?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-500">
                        {b.phase || "I"}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(b.date).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatCurrency(
                          b.items?.reduce((sum, i) => sum + (i.amount || 0), 0) ||
                            0
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openModal(b)}
                          className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"
                        >
                          <HiDotsVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── BOQ Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaFileInvoice size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editBOQ ? "Edit BOQ" : "Create Bill of Quantities"}
              </h2>
              <div className="ml-auto flex items-center gap-2 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                <span className="font-bold text-gray-400">Total:</span>
                <span className="font-black text-indigo-600">
                  {formatCurrency(totalBOQAmount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Lbl text="Project" req />
                  <Select
                    options={projects.map((p) => ({ value: p._id, label: p.name }))}
                    value={selectedProject}
                    onChange={(s) => setSelectedProject(s)}
                    placeholder="Select Project..."
                    className="text-sm"
                    required
                  />
                </div>
                <div>
                  <Lbl text="BOQ Number" req />
                  <input
                    type="text"
                    className={fi}
                    value={boqNumber}
                    onChange={(e) => setBoqNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Lbl text="Date" req />
                  <input
                    type="date"
                    className={fi}
                    value={boqDate}
                    onChange={(e) => setBoqDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Lbl text="Status" />
                  <select
                    className={fi}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Phase" />
                  <select
                    className={fi}
                    value={phase}
                    onChange={(e) => setPhase(e.target.value)}
                  >
                    <option value="I">Phase I</option>
                    <option value="II">Phase II</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Remarks" />
                  <input
                    type="text"
                    className={fi}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="General notes..."
                  />
                </div>
              </div>

              {/* ── BOQ Items with Multi-Row Support ── */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                    BOQ Line Items
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <FaPlus size={10} /> Add Custom
                    </button>
                  </div>
                </div>

                {/* ── Dropdown to Add Item / Variants ── */}
                <div className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    <FaLayerGroup className="inline mr-1" /> Add from Inventory
                  </p>
                  <div className="flex gap-2">
                    <Select
                      className="flex-1 text-sm"
                      options={buildItemOptions()}
                      placeholder="Search item or variant..."
                      onChange={(opt) => {
                        if (opt) {
                          addVariantRows(opt);
                          // Reset selection after adding
                          const select = document.querySelector(
                            ".inventory-select .react-select__control"
                          );
                          // Better: use a ref, but for simplicity we clear by setting state?
                          // We'll just let it be cleared by the next interaction.
                          // We'll use a key to force re-render? Instead, we'll use a controlled value with state.
                          // But for simplicity, we'll just use a key to reset? We'll implement with a ref or local state.
                          // Let's add a local state for the selected option and clear it.
                          // We'll modify below.
                        }
                      }}
                      isClearable
                      classNamePrefix="react-select"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1.5">
                    💡 Select an item with variants → all variants will be added as separate rows
                  </p>
                </div>

                {/* ── Items Table ── */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-3 py-2 text-left min-w-[200px]">Item</th>
                        <th className="px-3 py-2 text-left min-w-[150px]">Description</th>
                        <th className="px-3 py-2 text-center w-[80px]">Unit</th>
                        <th className="px-3 py-2 text-center w-[80px]">Qty</th>
                        <th className="px-3 py-2 text-center w-[100px]">Rate (₹)</th>
                        <th className="px-3 py-2 text-right w-[120px]">Amount (₹)</th>
                        <th className="px-3 py-2 text-center w-[50px]">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-3 py-8 text-center text-gray-400 text-sm">
                            No items added. Use the dropdown above to add items with variants.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
                                value={item.itemName || ""}
                                onChange={(e) =>
                                  handleItemChange(index, "itemName", e.target.value)
                                }
                                placeholder="Item name"
                              />
                              {item.isVariant && (
                                <p className="text-[8px] text-indigo-500 mt-0.5 truncate">
                                  Variant: {item.variantName}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none"
                                value={item.description || ""}
                                onChange={(e) =>
                                  handleItemChange(index, "description", e.target.value)
                                }
                                placeholder="Description"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.unit || ""}
                                onChange={(e) =>
                                  handleItemChange(index, "unit", e.target.value)
                                }
                                placeholder="nos"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.quantity || 0}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-50 focus:border-indigo-300 outline-none text-center"
                                value={item.rate || 0}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "rate",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold text-gray-700">
                              {formatCurrency(item.amount || 0)}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                disabled={items.length === 1}
                              >
                                <FaTimes size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot className="bg-gray-50/80 border-t border-gray-200">
                        <tr>
                          <td colSpan="5" className="px-3 py-2 text-right font-bold text-gray-600 text-xs uppercase tracking-wider">
                            Grand Total
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-indigo-600 text-sm">
                            {formatCurrency(totalBOQAmount)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  <FaCheck size={12} /> {editBOQ ? "Update BOQ" : "Create BOQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <FaFileExcel className="text-emerald-600" /> Import BOQ from Excel
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setSelectedProjectImport(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Lbl text="Select Project" req />
                <Select
                  options={projects.map((p) => ({ value: p._id, label: p.name }))}
                  value={selectedProjectImport}
                  onChange={setSelectedProjectImport}
                  placeholder="Choose project..."
                />
              </div>

              <div>
                <Lbl text="Upload Excel File" req />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Sheet should have: SR. NO., PARTICULARS, UNIT, RATE, TOTAL QUANTITY, AMOUNT
                  <br />
                  <span className="text-emerald-600">
                    ✓ Auto-detects Phase I/II • Auto-detects sections • Extracts taxes
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setSelectedProjectImport(null);
                  }}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FaFileExcel size={12} /> Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import axios from "axios";
// import Select from "react-select";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useRouter } from "next/navigation";

// export default function BOMPage() {
//   const router = useRouter();

//   // --- Header Form State ---
//   const [productNo, setProductNo] = useState("");
//   const [productDesc, setProductDesc] = useState("");
//   const [warehouse, setWarehouse] = useState("");
//   const [priceList, setPriceList] = useState("");
//   const [bomType, setBomType] = useState("Production");
//   const [xQuantity, setXQuantity] = useState(1);
//   const [distRule, setDistRule] = useState("");
//   const [project, setProject] = useState("");

//   // --- Master data ---
//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [priceLists, setPriceLists] = useState([]);
//   const [resources, setResources] = useState([]);

//   // --- BOM arrays ---
//   const [bomItems, setBomItems] = useState([]);
//   const [bomResources, setBomResources] = useState([]);

//   // --- Add/search selections ---
//   const [selectedItemId, setSelectedItemId] = useState(null);
//   const [selectedResourceId, setSelectedResourceId] = useState(null);

//   // --- Fetch master data on mount ---
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const config = { headers: { Authorization: `Bearer ${token}` } };

//     axios.get("/api/items", config).then((res) => setApiItems(res.data.data || []));
//     axios.get("/api/warehouse", config).then((res) => setWarehouses(res.data.data || []));
//     axios.get("/api/price-list", config).then((res) => setPriceLists(res.data.data || []));
//     axios.get("/api/ppc/resources", config).then((res) => setResources(res.data.data || []));
//   }, []);

//   // --- Add Item/Resource ---
//   const handleAddItem = (type) => {
//     if (type === "item") {
//       if (!selectedItemId) return;
//       const item = apiItems.find((i) => i._id === selectedItemId.value);
//       if (!item) return;
//       if (bomItems.some((i) => i.item === item._id)) return toast.error("Item already added!");
//       setBomItems((prev) => [
//         ...prev,
//         {
//           item: item._id,
//           itemCode: item.itemCode,
//           itemName: item.itemName,
//           quantity: 1,
//           warehouse,
//           unitPrice: item.unitPrice ?? 0,
//           total: item.unitPrice ?? 0,
//         },
//       ]);
//       setSelectedItemId(null);
//     } else {
//       if (!selectedResourceId) return;
//       const res = resources.find((r) => r._id === selectedResourceId.value);
//       if (!res) return;
//       if (bomResources.some((i) => i.item === res._id)) return toast.error("Resource already added!");
//       setBomResources((prev) => [
//         ...prev,
//         {
//           item: res._id,
//           code: res.code,
//           name: res.name,
//           quantity: 1,
//           warehouse,
//           unitPrice: res.unitPrice ?? 0,
//           total: res.unitPrice ?? 0,
//         },
//       ]);
//       setSelectedResourceId(null);
//     }
//   };

//   // --- Update quantity ---
//   const handleQtyChange = (type, idx, qty) => {
//     const arr = type === "item" ? [...bomItems] : [...bomResources];
//     arr[idx].quantity = qty;
//     arr[idx].total = qty * (arr[idx].unitPrice ?? 0);
//     type === "item" ? setBomItems(arr) : setBomResources(arr);
//   };

//   // --- Update warehouse ---
//   const handleWarehouseChange = (type, idx, wh) => {
//     const arr = type === "item" ? [...bomItems] : [...bomResources];
//     arr[idx].warehouse = wh;
//     type === "item" ? setBomItems(arr) : setBomResources(arr);
//   };

//   // --- Delete row ---
//   const handleDelete = (type, idx) => {
//     const arr = type === "item" ? [...bomItems] : [...bomResources];
//     arr.splice(idx, 1);
//     type === "item" ? setBomItems(arr) : setBomResources(arr);
//   };

//   // --- Grand total ---
//   const grandTotal = [...bomItems, ...bomResources].reduce((acc, i) => acc + (i.total ?? 0), 0);

//   // --- Save BOM ---
//   const handleSaveBOM = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Not authenticated");

//       const payload = {
//         productNo: productNo || null,
//         productDesc: productDesc || null,
//         warehouse: warehouse || null,
//         priceList: priceList || null,
//         bomType: bomType || "Production",
//         xQuantity: xQuantity || 1,
//         distRule: distRule || null,
//         project: project || null,
//         items: bomItems,
//         resources: bomResources,
//         totalSum: grandTotal,
//       };

//       await axios.post("/api/bom", payload, { headers: { Authorization: `Bearer ${token}` } });
//       toast.success("BOM saved successfully!");
//       router.push("/admin/bom-view");
//     } catch (err) {
//       console.error("Error saving BOM:", err);
//       toast.error("Failed to save BOM.");
//     }
//   };

//   // --- Options for react-select ---
//   const productOptions = apiItems.map((i) => ({ value: i._id, label: `${i.itemCode} – ${i.itemName}` }));
//   const resourceOptions = resources.map((r) => ({ value: r._id, label: `${r.code} – ${r.name}` }));

//   return (
//     <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-6">Bill of Materials</h2>

//       {/* Header Form */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//         {/* Left */}
//         <div className="space-y-4">
//           <label className="block text-sm font-medium">Product No.</label>
//           <Select
//             options={productOptions}
//             value={selectedItemId || productOptions.find((o) => o.value === productNo) || null}
//             onChange={(selected) => setProductNo(selected?.value || "")}
//             isClearable
//             placeholder="Search or select product"
//           />
//           <div>
//             <label className="block text-sm font-medium">Product Description</label>
//             <input value={productDesc} onChange={(e) => setProductDesc(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Warehouse</label>
//             <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Warehouse</option>
//               {warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Price List</label>
//             <select value={priceList} onChange={(e) => setPriceList(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Price List</option>
//               {priceLists.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
//             </select>
//           </div>
//         </div>

//         {/* Right */}
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">BOM Type</label>
//             <select value={bomType} onChange={(e) => setBomType(e.target.value)} className="w-full border p-2 rounded">
//               <option>Production</option>
//               <option>Sales</option>
//               <option>Template</option>
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">X Quantity</label>
//             <input type="number" min={1} value={xQuantity} onChange={(e) => setXQuantity(+e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Distribution Rule</label>
//             <input value={distRule} onChange={(e) => setDistRule(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Project</label>
//             <input value={project} onChange={(e) => setProject(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Add Items & Resources */}
//       <div className="mb-6 flex gap-2">
//         <div className="flex-1">
//           <Select options={productOptions} value={selectedItemId} onChange={setSelectedItemId} isClearable placeholder="Search or select item..." />
//         </div>
//         <button onClick={() => handleAddItem("item")} className="bg-blue-600 text-white px-4 py-2 rounded">Add Item</button>
//         <div className="flex-1">
//           <Select options={resourceOptions} value={selectedResourceId} onChange={setSelectedResourceId} isClearable placeholder="Search or select resource..." />
//         </div>
//         <button onClick={() => handleAddItem("resource")} className="bg-blue-600 text-white px-4 py-2 rounded">Add Resource</button>
//       </div>

//       {/* BOM Table - Combined */}
//       <div className="mb-8">
//         <h3 className="font-semibold text-lg mb-2">BOM Components</h3>
//         <table className="w-full border-collapse border text-sm">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">#</th>
//               <th className="border p-2">Code</th>
//               <th className="border p-2">Name</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Warehouse</th>
//               <th className="border p-2">Price</th>
//               <th className="border p-2">Total</th>
//               <th className="border p-2">Type</th>
//               <th className="border p-2">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {[...bomItems.map(i => ({ ...i, type: "Item" })), ...bomResources.map(r => ({ ...r, type: "Resource" }))]
//               .map((item, idx) => (
//               <tr key={item.item}>
//                 <td className="border p-2 text-center">{idx + 1}</td>
//                 <td className="border p-2">{item.itemCode || item.code}</td>
//                 <td className="border p-2">{item.itemName || item.name}</td>
//                 <td className="border p-2 text-center">
//                   <input
//                     type="number"
//                     min={1}
//                     value={item.quantity}
//                     onChange={(e) => {
//                       if (item.type === "Item") handleQtyChange("item", bomItems.indexOf(item), +e.target.value);
//                       else handleQtyChange("resource", bomResources.indexOf(item), +e.target.value);
//                     }}
//                     className="w-16 border p-1 text-center rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <select
//                     value={item.warehouse}
//                     onChange={(e) => {
//                       if (item.type === "Item") handleWarehouseChange("item", bomItems.indexOf(item), e.target.value);
//                       else handleWarehouseChange("resource", bomResources.indexOf(item), e.target.value);
//                     }}
//                     className="border p-1 rounded w-full"
//                   >
//                     <option value="">Select</option>
//                     {warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//                   </select>
//                 </td>
//                 <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
//                 <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
//                 <td className="border p-2 text-center">{item.type}</td>
//                 <td className="border p-2 text-center">
//                   <button
//                     onClick={() => {
//                       if (item.type === "Item") handleDelete("item", bomItems.indexOf(item));
//                       else handleDelete("resource", bomResources.indexOf(item));
//                     }}
//                     className="text-red-600 hover:underline"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Grand Total & Save */}
//       <div className="flex justify-between items-center mt-6">
//         <h3 className="font-semibold text-lg">Grand Total: {grandTotal.toFixed(2)}</h3>
//         <button onClick={handleSaveBOM} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-500">Save BOM</button>
//       </div>
//     </div>
//   );
// }







// below code is working fine 07/10/2025

// "use client";
// import { useState, useEffect } from "react";
// import axios from "axios";
// import Select from "react-select";
// import {toast} from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useRouter, useSearchParams } from "next/navigation";

// export default function BOMPage() {
//   // Product & form state
//   const [productNo, setProductNo] = useState("");
//   const [productDesc, setProductDesc] = useState("");
//   const [warehouse, setWarehouse] = useState("");
//   const [priceList, setPriceList] = useState("");
//   const [bomType, setBomType] = useState("Production");
//   const [xQuantity, setXQuantity] = useState(1);
//   const [distRule, setDistRule] = useState("");
//   const [project, setProject] = useState("");

//   // Data arrays fetched from API
//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [priceLists, setPriceLists] = useState([]);
//   const [showProductSuggestions, setShowProductSuggestions] = useState(false);

//   // BOM table items
//   const [bomItems, setBomItems] = useState([]);

//   // Search & selection for adding items
//   const [searchText, setSearchText] = useState("");
//   const [selectedItemId, setSelectedItemId] = useState("");
//   const router = useRouter();

//   // Fetch master items, warehouses, price lists on mount
// useEffect(() => {
//   const token = localStorage.getItem("token");
//   const config = {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   };

//   axios.get('/api/items', config)
//     .then(res => {
//       console.log("Items response:", res.data);
//       setApiItems(res.data.data || []);
//     })
//     .catch(err => console.error("Items fetch error:", err));

//   axios.get('/api/warehouse', config)
//     .then(res => {
//       console.log("Warehouse response:", res.data);
//       setWarehouses(res.data.data || []);
//     })
//     .catch(err => console.error("Warehouse fetch error:", err));

//   axios.get('/api/price-list', config)
//     .then(res => {
//       console.log("Price List response:", res.data);
//       setPriceLists(res.data.data || []);
//     })
//     .catch(err => console.error("Price List fetch error:", err));
// }, []);




//   // Create options for React Select
//   const productOptions = apiItems.map(item => ({
//     value: item._id,
//     label: `${item.itemCode} - ${item.itemName}`,
//   }));
//   // Filter items by code or name
//   const filteredItems = apiItems.filter(item => {
//     const txt = searchText.toLowerCase();
//     return (
//       (item.itemCode ?? "").toLowerCase().includes(txt) ||
//       (item.itemName ?? "").toLowerCase().includes(txt)
//     );
//   });

//   // Add selected item to BOM
//   const handleAddItem = () => {
//     const item = apiItems.find(i => i._id === selectedItemId);
//     if (!item) return;
//     if (bomItems.some(i => i.item === selectedItemId)) return alert('Item already added!');

//     setBomItems(prev => [
//       ...prev,
//       {
//         item: item._id,
//         itemCode: item.itemCode,
//         itemName: item.itemName,
//         quantity: 1,
//         warehouse,
//         issueMethod: 'Backflush',
//         priceList,
//         unitPrice: item.unitPrice ?? 0,
//         total: item.unitPrice ?? 0
//       }
//     ]);
//     setSelectedItemId('');
//     setSearchText('');
//   };

//   // Update item quantity and total
//   const handleQtyChange = (idx, qty) => {
//     const arr = [...bomItems];
//     arr[idx].quantity = qty;
//     arr[idx].total = qty * (arr[idx].unitPrice ?? 0);
//     setBomItems(arr);
//   };

//   // Update warehouse per-row
//   const handleWarehouseChange = (idx, wh) => {
//     const arr = [...bomItems];
//     arr[idx].warehouse = wh;
//     setBomItems(arr);
//   };

//   // Delete row
//   const handleDelete = (idx) => {
//     const arr = [...bomItems];
//     arr.splice(idx, 1);
//     setBomItems(arr);
//   };

//   // Sum of totals
//   const totalSum = bomItems.reduce((acc, i) => acc + (i.total ?? 0), 0);

//   // Save BOM to backend
//   // const handleSaveBOM = async () => {
//   //   try {
//   //     const payload = { productNo, productDesc, warehouse, priceList, bomType, xQuantity, distRule, project, items: bomItems, totalSum };
//   //     await axios.post('/api/bom', payload);
//   //     alert('BOM saved successfully!');
//   //   } catch (err) {
//   //     console.error('Error saving BOM:', err);
//   //     alert('Failed to save BOM.');
//   //   }
//   // };

//   const handleSaveBOM = async () => {
//   try {
//     const token = localStorage.getItem("token"); // Or fetch from cookies if needed
//     if (!token) {
//       alert("Not authenticated");
//       return;
//     }

//     // const payload = {
//     //   productNo,
//     //   productDesc,
//     //   warehouse,
//     //   priceList,
//     //   bomType,
//     //   xQuantity,
//     //   distRule,
//     //   project,
//     //   items: bomItems,
//     //   totalSum,
//     // };


//     const payload = {
//   productNo: productNo || null,
//   productDesc: productDesc || null,
//   warehouse: warehouse || null,
//   priceList: priceList || null,
//   bomType: bomType || "Production",  // keep a default
//   xQuantity: xQuantity || 1,
//   distRule: distRule || null,
//   project: project || null,
//   items: bomItems,
//   totalSum,
// };

//     await axios.post("/api/bom", payload, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     router.push('/admin/bom-view');

//     toast.success("BOM saved successfully!");

//     // alert("BOM saved successfully!");
//   } catch (err) {
//     console.error("Error saving BOM:", err);
//     toast.error("Failed to save BOM.");
//     // alert("Failed to save BOM.");
//   }
// };


//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-6">Bill of Materials</h2>

//       {/* Header */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//         {/* Left */}
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">Product No.</label>
//                  <Select
//         options={productOptions}
//         onChange={(selected) => setProductNo(selected?.value || "")}
//         isClearable
//         placeholder="Search or select product"
//       />
        
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Product Description</label>
//             <input value={productDesc} onChange={e => setProductDesc(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Warehouse</label>
//             <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Warehouse</option>
//               {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Price List</label>
//             <select value={priceList} onChange={e => setPriceList(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Price List</option>
//               {priceLists.map(p => <option key={p._1d} value={p._id}>{p.name}</option>)}
//             </select>
//           </div>
//         </div>
//         {/* Right */}
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">BOM Type</label>
//             <select value={bomType} onChange={e => setBomType(e.target.value)} className="w-full border p-2 rounded">
//               <option>Production</option>
//               <option>Sales</option>
//               <option>Template</option>
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">X Quantity</label>
//             <input type="number" min={1} value={xQuantity} onChange={e => setXQuantity(+e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Distribution Rule</label>
//             <input value={distRule} onChange={e => setDistRule(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Project</label>
//             <input value={project} onChange={e => setProject(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Search & Add */}
//       <div className="flex justify-center mb-6">
//         <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} className="border p-2 rounded-l flex-1 max-w-md" placeholder="Search item..." />
//         <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="border-t border-b p-2">
//           <option value="">Select Item</option>
//           {filteredItems.map(i => <option key={i._id} value={i._id}>{i.itemCode} – {i.itemName}</option>)}
//         </select>
//         <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-r">Add</button>
//       </div>

//       {/* BOM Table */}
//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Code</th>
//             <th className="border p-2">Name</th>
//             <th className="border p-2">Qty</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Issue Method</th>
//             <th className="border p-2">Price List</th>
//             <th className="border p-2">Unit Price</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bomItems.map((item, idx) => (
//             <tr key={item.item}>                                    
//               <td className="border p-2 text-center">{idx + 1}</td>
//               <td className="border p-2">{item.itemCode}</td>
//               <td className="border p-2">{item.itemName}</td>
//               <td className="border p-2 text-center">
//                 <input type="number" min={1} value={item.quantity} onChange={e => handleQtyChange(idx, +e.target.value)} className="w-16 border p-1 rounded text-center" />
//               </td>
//               <td className="border p-2">
//                 <select value={item.warehouse} onChange={e => handleWarehouseChange(idx, e.target.value)} className="w-full border p-1 rounded">
//                   <option value="">Select Warehouse</option>
//                   {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//                 </select>
//               </td>
//               <td className="border p-2 text-center">{item.issueMethod}</td>
//               <td className="border p-2 text-center">{priceLists.find(p => p._id === item.priceList)?.name || 'N/A'}</td>
//               <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
//               <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
//               <td className="border p-2 text-center"><button onClick={() => handleDelete(idx)} className="text-red-600 hover:underline">Delete</button></td>
//             </tr>
//           ))}
//         </tbody>
//         <tfoot>
//           <tr className="bg-gray-100 font-semibold">
//             <td colSpan={8} className="border p-2 text-right">Total:</td>
//             <td className="border p-2 text-right">{totalSum.toFixed(2)}</td>
//             <td className="border p-2"></td>
//           </tr>
//         </tfoot>
//       </table>

//       {/* Actions */}
//       <div className="flex justify-end gap-4">
//         <button onClick={handleSaveBOM} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Save BOM</button>
//         <button className="bg-gray-400 text-white px-6 py-2 rounded">Cancel</button>
//       </div>
//     </div>
//   );
// }




