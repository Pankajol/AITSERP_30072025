"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaArrowRight,
  FaSave,
  FaCamera,
  FaIndustry,
  FaClipboardCheck,
  FaCogs,
  FaWrench,
  FaHammer,
  FaCheckCircle,
  FaTruck,
  FaShieldAlt,
  FaBarcode,
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const STATUS_LIST = [
  "Planned",
  "In Progress",
  "QC",
  "Completed",
  "Ready",
  "Delivered",
];

const statusIcons = {
  Planned: FaIndustry,
  "In Progress": FaCogs,
  QC: FaCheckCircle,
  Completed: FaCheckCircle,
  Ready: FaTruck,
  Delivered: FaShieldAlt,
};

export default function ProductionJobCardDetail() {
  const router = useRouter();
  const { id } = useParams();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState("Details");

  useEffect(() => {
    if (!token || !id) return;
    const fetch = async () => {
      try {
        const res = await axios.get(`/api/ppc/production-jobcards?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setJobCard(res.data.data);
        setExpandedSection(res.data.data.status);
      } catch (err) {
        toast.error("Failed to load job card");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, token]);

  // ─── Helpers ────────────────────────────────────────────
  const updateField = (fieldPath, value) => {
    const updated = { ...jobCard };
    const keys = fieldPath.split(".");
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setJobCard(updated);
  };

  const saveJobCard = async (silent = false) => {
    setSaving(true);
    try {
      const payload = { ...jobCard };
      delete payload._id;
      delete payload.__v;
      if (payload.productionOrder && typeof payload.productionOrder === "object") {
        payload.productionOrder = payload.productionOrder._id;
      }
      const res = await axios.put(`/api/ppc/production-jobcards?id=${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobCard(res.data.data);
      if (!silent) toast.success("Changes saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    try {
      const res = await axios.patch(
        `/api/ppc/production-jobcards?id=${id}&action=advance`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobCard(res.data.data);
      setExpandedSection(res.data.data.status);
      toast.success(`Advanced to ${res.data.data.status}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Advance failed");
    }
  };

  const addMaterial = () => {
    const mats = [...(jobCard.materials || []), { itemName: "", quantity: 0, unit: "kg", batchNumber: "" }];
    updateField("materials", mats);
  };
  const removeMaterial = (idx) => {
    const mats = jobCard.materials.filter((_, i) => i !== idx);
    updateField("materials", mats);
  };
  const addLabour = () => {
    const labour = [...(jobCard.labour || []), { department: "", employee: "", hoursWorked: 0, costPerHour: 0 }];
    updateField("labour", labour);
  };
  const removeLabour = (idx) => {
    const labour = jobCard.labour.filter((_, i) => i !== idx);
    updateField("labour", labour);
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (!jobCard) return <div className="p-6 text-center text-red-500">Job card not found.</div>;

  const currentStepIndex = STATUS_LIST.indexOf(jobCard.status);
  const progressPercent = ((currentStepIndex + 1) / STATUS_LIST.length) * 100;
  const StatusIcon = statusIcons[jobCard.status] || FaIndustry;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/admin/ppc/production-jobcards")}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-6"
        >
          <FaArrowLeft /> Back to Job Cards
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <StatusIcon className="text-2xl text-indigo-600" />
                <h1 className="text-2xl font-extrabold text-gray-900">{jobCard.jobCardNo}</h1>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                  {jobCard.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Order: {jobCard.productionOrder?.orderNumber || "N/A"} | Item: {jobCard.itemName} | Qty: {jobCard.quantity} {jobCard.uom}
              </p>
              <p className="text-sm text-gray-500">
                Machine: {jobCard.machine?.name || "N/A"} | Operator: {jobCard.operator?.name || "N/A"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => saveJobCard(false)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                <FaSave /> {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleAdvance}
                disabled={jobCard.status === "Delivered"}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <FaArrowRight /> Advance
              </button>
            </div>
          </div>
          {/* Progress */}
          <div className="mt-6">
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
              {STATUS_LIST.map((s, i) => (
                <span key={s} className={`${i <= currentStepIndex ? "text-indigo-600" : ""}`}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Details */}
          <Section
            title="Job Details"
            icon={FaIndustry}
            expanded={expandedSection === "Details"}
            onToggle={() => setExpandedSection(expandedSection === "Details" ? "" : "Details")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Item Code" value={jobCard.itemCode} onChange={(v) => updateField("itemCode", v)} />
              <Field label="Item Name" value={jobCard.itemName} onChange={(v) => updateField("itemName", v)} />
              <Field label="Quantity" type="number" value={jobCard.quantity} onChange={(v) => updateField("quantity", Number(v))} />
              <Field label="UOM" value={jobCard.uom} onChange={(v) => updateField("uom", v)} />
              <Field label="Expected Start" type="date" value={jobCard.expectedStartDate ? new Date(jobCard.expectedStartDate).toISOString().split("T")[0] : ""} onChange={(v) => updateField("expectedStartDate", new Date(v).toISOString())} />
              <Field label="Expected End" type="date" value={jobCard.expectedEndDate ? new Date(jobCard.expectedEndDate).toISOString().split("T")[0] : ""} onChange={(v) => updateField("expectedEndDate", new Date(v).toISOString())} />
            </div>
          </Section>

          {/* Inspection */}
          <Section
            title="Inspection"
            icon={FaClipboardCheck}
            expanded={expandedSection === "Inspection"}
            onToggle={() => setExpandedSection(expandedSection === "Inspection" ? "" : "Inspection")}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Inspector" value={jobCard.inspection?.inspector} onChange={(v) => updateField("inspection.inspector", v)} />
              <CheckField label="Passed" checked={jobCard.inspection?.passed} onChange={(v) => updateField("inspection.passed", v)} />
              <Field label="Remarks" value={jobCard.inspection?.remarks} onChange={(v) => updateField("inspection.remarks", v)} />
            </div>
            <div className="mt-4">
              <label className="text-xs font-bold text-gray-400 uppercase">Inspection Photos</label>
              <PhotoUpload
                photos={jobCard.inspection?.photos || []}
                onChange={(urls) => updateField("inspection.photos", urls)}
              />
            </div>
          </Section>

          {/* Process Steps */}
          <Section
            title="Process Steps"
            icon={FaCogs}
            expanded={expandedSection === "Steps"}
            onToggle={() => setExpandedSection(expandedSection === "Steps" ? "" : "Steps")}
          >
            <div className="space-y-3">
              {(jobCard.steps || []).map((step, idx) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-center border-b pb-2">
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    placeholder="Step name"
                    value={step.stepName}
                    onChange={(e) => {
                      const steps = [...jobCard.steps];
                      steps[idx].stepName = e.target.value;
                      updateField("steps", steps);
                    }}
                  />
                  <select
                    value={step.status}
                    onChange={(e) => {
                      const steps = [...jobCard.steps];
                      steps[idx].status = e.target.value;
                      updateField("steps", steps);
                    }}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    placeholder="Machine"
                    value={step.machine}
                    onChange={(e) => {
                      const steps = [...jobCard.steps];
                      steps[idx].machine = e.target.value;
                      updateField("steps", steps);
                    }}
                  />
                  <input
                    className="px-2 py-1 border rounded text-sm"
                    placeholder="Operator"
                    value={step.operator}
                    onChange={(e) => {
                      const steps = [...jobCard.steps];
                      steps[idx].operator = e.target.value;
                      updateField("steps", steps);
                    }}
                  />
                  <button
                    onClick={() => {
                      const steps = jobCard.steps.filter((_, i) => i !== idx);
                      updateField("steps", steps);
                    }}
                    className="text-red-500"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const steps = [...(jobCard.steps || []), { stepName: "", status: "pending", machine: "", operator: "" }];
                  updateField("steps", steps);
                }}
                className="text-indigo-600 text-sm font-bold flex items-center gap-1"
              >
                <FaPlus size={12} /> Add Step
              </button>
            </div>
          </Section>

          {/* Materials */}
          <Section
            title="Material Consumption"
            icon={FaHammer}
            expanded={expandedSection === "Materials"}
            onToggle={() => setExpandedSection(expandedSection === "Materials" ? "" : "Materials")}
          >
            <div className="space-y-2">
              {(jobCard.materials || []).map((mat, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="Item name"
                    value={mat.itemName}
                    onChange={(e) => {
                      const mats = [...jobCard.materials];
                      mats[idx].itemName = e.target.value;
                      updateField("materials", mats);
                    }}
                  />
                  <input
                    type="number"
                    className="w-20 px-2 py-1 border rounded text-sm"
                    placeholder="Qty"
                    value={mat.quantity}
                    onChange={(e) => {
                      const mats = [...jobCard.materials];
                      mats[idx].quantity = Number(e.target.value);
                      updateField("materials", mats);
                    }}
                  />
                  <input
                    className="w-20 px-2 py-1 border rounded text-sm"
                    placeholder="Unit"
                    value={mat.unit}
                    onChange={(e) => {
                      const mats = [...jobCard.materials];
                      mats[idx].unit = e.target.value;
                      updateField("materials", mats);
                    }}
                  />
                  <input
                    className="w-32 px-2 py-1 border rounded text-sm"
                    placeholder="Batch"
                    value={mat.batchNumber}
                    onChange={(e) => {
                      const mats = [...jobCard.materials];
                      mats[idx].batchNumber = e.target.value;
                      updateField("materials", mats);
                    }}
                  />
                  <button onClick={() => removeMaterial(idx)} className="text-red-500 hover:text-red-700">
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addMaterial} className="text-indigo-600 text-sm font-bold flex items-center gap-1 mt-2">
                <FaPlus size={12} /> Add Material
              </button>
            </div>
          </Section>

          {/* Labour */}
          <Section
            title="Labour Tracking"
            icon={FaWrench}
            expanded={expandedSection === "Labour"}
            onToggle={() => setExpandedSection(expandedSection === "Labour" ? "" : "Labour")}
          >
            <div className="space-y-2">
              {(jobCard.labour || []).map((l, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="Department"
                    value={l.department}
                    onChange={(e) => {
                      const labour = [...jobCard.labour];
                      labour[idx].department = e.target.value;
                      updateField("labour", labour);
                    }}
                  />
                  <input
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="Employee"
                    value={l.employee}
                    onChange={(e) => {
                      const labour = [...jobCard.labour];
                      labour[idx].employee = e.target.value;
                      updateField("labour", labour);
                    }}
                  />
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border rounded text-sm"
                    placeholder="Hours"
                    value={l.hoursWorked}
                    onChange={(e) => {
                      const labour = [...jobCard.labour];
                      labour[idx].hoursWorked = Number(e.target.value);
                      updateField("labour", labour);
                    }}
                  />
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border rounded text-sm"
                    placeholder="Rate/hr"
                    value={l.costPerHour}
                    onChange={(e) => {
                      const labour = [...jobCard.labour];
                      labour[idx].costPerHour = Number(e.target.value);
                      updateField("labour", labour);
                    }}
                  />
                  <button onClick={() => removeLabour(idx)} className="text-red-500 hover:text-red-700">
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addLabour} className="text-indigo-600 text-sm font-bold flex items-center gap-1 mt-2">
                <FaPlus size={12} /> Add Labour
              </button>
            </div>
          </Section>

          {/* Costing */}
          <Section
            title="Costing"
            icon={FaCheckCircle}
            expanded={expandedSection === "Costing"}
            onToggle={() => setExpandedSection(expandedSection === "Costing" ? "" : "Costing")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["materialCost", "labourCost", "machineCost", "electricityCost", "overheadCost", "totalCost", "sellingPrice", "profitMargin"].map(
                (field) => (
                  <div key={field}>
                    <label className="text-xs text-gray-400 uppercase font-bold">
                      {field.replace(/([A-Z])/g, " $1")}
                    </label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                      value={jobCard.costing?.[field] || 0}
                      onChange={(e) => updateField(`costing.${field}`, Number(e.target.value))}
                    />
                  </div>
                )
              )}
            </div>
          </Section>

          {/* Photos */}
          <Section
            title="Photos"
            icon={FaCamera}
            expanded={expandedSection === "Photos"}
            onToggle={() => setExpandedSection(expandedSection === "Photos" ? "" : "Photos")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PhotoGroup label="Before Production" photos={jobCard.photos?.beforeProduction || []} onChange={(urls) => updateField("photos.beforeProduction", urls)} />
              <PhotoGroup label="During Production" photos={jobCard.photos?.duringProduction || []} onChange={(urls) => updateField("photos.duringProduction", urls)} />
              <PhotoGroup label="After Production" photos={jobCard.photos?.afterProduction || []} onChange={(urls) => updateField("photos.afterProduction", urls)} />
              <PhotoGroup label="Delivery Photo" photos={jobCard.photos?.deliveryPhoto || []} onChange={(urls) => updateField("photos.deliveryPhoto", urls)} />
            </div>
          </Section>

          {/* Barcode / RFID */}
          <Section
            title="Barcode / RFID"
            icon={FaBarcode}
            expanded={expandedSection === "Barcode"}
            onToggle={() => setExpandedSection(expandedSection === "Barcode" ? "" : "Barcode")}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Barcode" value={jobCard.barcode} onChange={(v) => updateField("barcode", v)} />
              <Field label="QR Code" value={jobCard.qrCode} onChange={(v) => updateField("qrCode", v)} />
              <Field label="RFID Tag" value={jobCard.rfidTag} onChange={(v) => updateField("rfidTag", v)} />
            </div>
          </Section>

          {/* Dispatch */}
          <Section
            title="Dispatch"
            icon={FaTruck}
            expanded={expandedSection === "Dispatch"}
            onToggle={() => setExpandedSection(expandedSection === "Dispatch" ? "" : "Dispatch")}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Delivery Challan" value={jobCard.dispatch?.deliveryChallan} onChange={(v) => updateField("dispatch.deliveryChallan", v)} />
              <Field label="Invoice Number" value={jobCard.dispatch?.invoiceNumber} onChange={(v) => updateField("dispatch.invoiceNumber", v)} />
              <Field label="Transport Details" value={jobCard.dispatch?.transportDetails} onChange={(v) => updateField("dispatch.transportDetails", v)} />
              <Field label="Vehicle Number" value={jobCard.dispatch?.vehicleNumber} onChange={(v) => updateField("dispatch.vehicleNumber", v)} />
              <Field label="Delivered By" value={jobCard.dispatch?.deliveredBy} onChange={(v) => updateField("dispatch.deliveredBy", v)} />
              <Field label="Delivery Date" type="date" value={jobCard.dispatch?.deliveryDate ? new Date(jobCard.dispatch.deliveryDate).toISOString().split("T")[0] : ""} onChange={(v) => updateField("dispatch.deliveryDate", new Date(v).toISOString())} />
              <div>
                <label className="text-xs text-gray-400 uppercase font-bold">Customer Signature</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                  placeholder="URL or upload"
                  value={jobCard.dispatch?.customerSignature || ""}
                  onChange={(e) => updateField("dispatch.customerSignature", e.target.value)}
                />
              </div>
            </div>
          </Section>

          {/* Warranty */}
          <Section
            title="Warranty"
            icon={FaShieldAlt}
            expanded={expandedSection === "Warranty"}
            onToggle={() => setExpandedSection(expandedSection === "Warranty" ? "" : "Warranty")}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Warranty Number" value={jobCard.warranty?.warrantyNumber} onChange={(v) => updateField("warranty.warrantyNumber", v)} />
              <Field label="Warranty Period (months)" type="number" value={jobCard.warranty?.warrantyPeriod} onChange={(v) => updateField("warranty.warrantyPeriod", Number(v))} />
              <Field label="KM Warranty" type="number" value={jobCard.warranty?.kmWarranty} onChange={(v) => updateField("warranty.kmWarranty", Number(v))} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────

function Section({ title, icon: Icon, expanded, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-lg font-bold text-gray-800">
          {Icon && <Icon className="text-indigo-600" />}
          {title}
        </div>
        {expanded ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
      </button>
      {expanded && <div className="px-6 pb-6 pt-2">{children}</div>}
    </div>
  );
}

function Field({ label, type = "text", value, onChange, options = [] }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase font-bold">{label}</label>
      {type === "select" ? (
        <select
          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">--</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === "date" ? (
        <input
          type="date"
          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <input
        type="checkbox"
        className="w-4 h-4 text-indigo-600 rounded"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label className="text-sm text-gray-700">{label}</label>
    </div>
  );
}

function PhotoGroup({ label, photos, onChange }) {
  const addPhoto = () => {
    const url = prompt("Enter image URL");
    if (url) onChange([...photos, url]);
  };
  const removePhoto = (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    onChange(updated);
  };
  return (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
      <div className="flex flex-wrap gap-2 mt-1">
        {photos.map((url, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
            <img src={url} className="w-full h-full object-cover" alt="" />
            <button
              onClick={() => removePhoto(idx)}
              className="absolute top-0 right-0 bg-red-500 text-white text-xs p-0.5 rounded-bl-lg"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ))}
        <button onClick={addPhoto} className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600">
          <FaPlus />
        </button>
      </div>
    </div>
  );
}

function PhotoUpload({ photos, onChange }) {
  const addPhoto = () => {
    const url = prompt("Enter image URL");
    if (url) onChange([...photos, url]);
  };
  const removePhoto = (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    onChange(updated);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {photos.map((url, idx) => (
        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
          <img src={url} className="w-full h-full object-cover" alt="" />
          <button
            onClick={() => removePhoto(idx)}
            className="absolute top-0 right-0 bg-red-500 text-white text-xs p-0.5 rounded-bl-lg"
          >
            <FaTrash size={10} />
          </button>
        </div>
      ))}
      <button onClick={addPhoto} className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600">
        <FaPlus />
      </button>
    </div>
  );
}