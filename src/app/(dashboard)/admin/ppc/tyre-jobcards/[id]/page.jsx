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
  FaFire,
  FaSprayCan,
  FaCheckCircle,
  FaTruck,
  FaShieldAlt,
  FaBarcode,
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaMoneyBillWave 
} from "react-icons/fa";

const STATUS_LIST = [
  "Received",
  "Inspection",
  "Buffing",
  "Repair",
  "Building",
  "Curing",
  "Finishing",
  "QC",
  "Ready",
  "Delivered",
];

const statusIcons = {
  Received: FaIndustry,
  Inspection: FaClipboardCheck,
  Buffing: FaCogs,
  Repair: FaWrench,
  Building: FaHammer,
  Curing: FaFire,
  Finishing: FaSprayCan,
  QC: FaCheckCircle,
  Ready: FaTruck,
  Delivered: FaShieldAlt,
};

export default function TyreJobCardDetail() {
  const router = useRouter();
  const { id } = useParams();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState("Inspection");

  useEffect(() => {
    if (!token || !id) return;
    const fetch = async () => {
      try {
        const res = await axios.get(`/api/ppc/tyre-jobcards?id=${id}`, {
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

  // ─── helpers ───────────────────────────────────────────
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
      if (payload.customer && typeof payload.customer === "object") {
        payload.customer = payload.customer._id || payload.customer;
      }
      const res = await axios.put(`/api/ppc/tyre-jobcards?id=${id}`, payload, {
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
        `/api/ppc/tyre-jobcards?id=${id}&action=advance`,
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

  // ─── Loading / Error ────────────────────────────────────
  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (!jobCard) return <div className="p-6 text-center text-red-500">Job card not found.</div>;

  const currentStepIndex = STATUS_LIST.indexOf(jobCard.status);
  const progressPercent = ((currentStepIndex + 1) / STATUS_LIST.length) * 100;
  const StatusIcon = statusIcons[jobCard.status] || FaIndustry;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push("/admin/ppc/tyre-jobcards")}
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
                {jobCard.priority === "Urgent" && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">URGENT</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Customer: {jobCard.customer?.customerName || "N/A"} &nbsp;|&nbsp; Vehicle: {jobCard.vehicleNumber}
              </p>
              <p className="text-sm text-gray-500">
                Tyre: {jobCard.tyreSerialNumber} &nbsp;|&nbsp; Brand: {jobCard.tyreBrand} &nbsp;|&nbsp; Size: {jobCard.tyreSize}
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

          {/* Progress bar */}
          <div className="mt-6">
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
              {STATUS_LIST.map((s, i) => (
                <span key={s} className={`${i <= currentStepIndex ? "text-indigo-600" : ""}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="space-y-4">
          {/* Customer & Vehicle */}
          <Section
            title="Customer & Vehicle Details"
            icon={FaIndustry}
            expanded={expandedSection === "Customer"}
            onToggle={() => setExpandedSection(expandedSection === "Customer" ? "" : "Customer")}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Vehicle Number" value={jobCard.vehicleNumber} onChange={(v) => updateField("vehicleNumber", v)} />
              <Field label="Fleet Name" value={jobCard.fleetName} onChange={(v) => updateField("fleetName", v)} />
              <Field label="Make & Model" value={jobCard.makeModel} onChange={(v) => updateField("makeModel", v)} />
              <Field label="Axle Position" value={jobCard.axlePosition} onChange={(v) => updateField("axlePosition", v)} />
              <Field label="Driver Name" value={jobCard.driverName} onChange={(v) => updateField("driverName", v)} />
              <Field label="Customer PO" value={jobCard.customerPO} onChange={(v) => updateField("customerPO", v)} />
            </div>
          </Section>

          {/* Tyre Details */}
          <Section
            title="Tyre Details"
            icon={FaClipboardCheck}
            expanded={expandedSection === "Tyre"}
            onToggle={() => setExpandedSection(expandedSection === "Tyre" ? "" : "Tyre")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Tyre Brand" value={jobCard.tyreBrand} onChange={(v) => updateField("tyreBrand", v)} />
              <Field label="Tyre Size" value={jobCard.tyreSize} onChange={(v) => updateField("tyreSize", v)} />
              <Field label="Tyre Pattern" value={jobCard.tyrePattern} onChange={(v) => updateField("tyrePattern", v)} />
              <Field label="Serial Number" value={jobCard.tyreSerialNumber} onChange={(v) => updateField("tyreSerialNumber", v)} />
              <Field label="Type" type="select" value={jobCard.tyreType} options={["Tube", "Tubeless"]} onChange={(v) => updateField("tyreType", v)} />
              <Field label="Casing Number" value={jobCard.casingNumber} onChange={(v) => updateField("casingNumber", v)} />
              <Field label="Odometer (km)" type="number" value={jobCard.odometerReading} onChange={(v) => updateField("odometerReading", Number(v))} />
              <Field label="Previous Retreads" type="number" value={jobCard.previousRetreadCount} onChange={(v) => updateField("previousRetreadCount", Number(v))} />
              <Field label="Manufacturing Date" type="date" value={jobCard.manufacturingDate ? new Date(jobCard.manufacturingDate).toISOString().split("T")[0] : ""} onChange={(v) => updateField("manufacturingDate", new Date(v).toISOString())} />
              <Field label="Condition" value={jobCard.tyreCondition} onChange={(v) => updateField("tyreCondition", v)} />
            </div>
          </Section>

          {/* Inspection */}
          <Section
            title="Inspection"
            icon={FaClipboardCheck}
            expanded={expandedSection === "Inspection"}
            onToggle={() => setExpandedSection(expandedSection === "Inspection" ? "" : "Inspection")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Inspector" value={jobCard.inspection?.inspector} onChange={(v) => updateField("inspection.inspector", v)} />
              <Field label="Casing Grade" type="select" value={jobCard.inspection?.casingGrade} options={["A", "B", "C", "Reject"]} onChange={(v) => updateField("inspection.casingGrade", v)} />
              <CheckField label="Bead Damage" checked={jobCard.inspection?.beadDamage} onChange={(v) => updateField("inspection.beadDamage", v)} />
              <CheckField label="Sidewall Damage" checked={jobCard.inspection?.sidewallDamage} onChange={(v) => updateField("inspection.sidewallDamage", v)} />
              <CheckField label="Shoulder Damage" checked={jobCard.inspection?.shoulderDamage} onChange={(v) => updateField("inspection.shoulderDamage", v)} />
              <CheckField label="Nail Cut" checked={jobCard.inspection?.nailCut} onChange={(v) => updateField("inspection.nailCut", v)} />
              <CheckField label="Separation" checked={jobCard.inspection?.separation} onChange={(v) => updateField("inspection.separation", v)} />
              <CheckField label="Heat Damage" checked={jobCard.inspection?.heatDamage} onChange={(v) => updateField("inspection.heatDamage", v)} />
              <CheckField label="Repair Required" checked={jobCard.inspection?.repairRequired} onChange={(v) => updateField("inspection.repairRequired", v)} />
              <Field label="Rejection Reason" value={jobCard.inspection?.rejectionReason} onChange={(v) => updateField("inspection.rejectionReason", v)} />
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
          {["Buffing", "Repair", "Building", "Curing", "Finishing", "QC"].map((step) => (
            <ProcessSection
              key={step}
              step={step}
              data={jobCard[step.toLowerCase()] || {}}
              expanded={expandedSection === step}
              onToggle={() => setExpandedSection(expandedSection === step ? "" : step)}
              updateField={updateField}
            />
          ))}

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
            icon={FaMoneyBillWave}
            expanded={expandedSection === "Costing"}
            onToggle={() => setExpandedSection(expandedSection === "Costing" ? "" : "Costing")}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["materialCost", "labourCost", "machineCost", "electricityCost", "overheadCost", "totalCost", "sellingPrice", "profitMargin"].map((field) => (
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
              ))}
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
              <PhotoGroup label="Before Repair" photos={jobCard.photos?.beforeRepair || []} onChange={(urls) => updateField("photos.beforeRepair", urls)} />
              <PhotoGroup label="During Repair" photos={jobCard.photos?.duringRepair || []} onChange={(urls) => updateField("photos.duringRepair", urls)} />
              <PhotoGroup label="After Repair" photos={jobCard.photos?.afterRepair || []} onChange={(urls) => updateField("photos.afterRepair", urls)} />
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
              <Field label="Vehicle Number (Delivery)" value={jobCard.dispatch?.vehicleNumber} onChange={(v) => updateField("dispatch.vehicleNumber", v)} />
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

// ─── Reusable Components ───────────────────────────────

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
            <option key={opt} value={opt}>
              {opt}
            </option>
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
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {photos.map((url, idx) => (
        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
          <img src={url} className="w-full h-full object-cover" alt="" />
          <button
            onClick={() => {
              const updated = photos.filter((_, i) => i !== idx);
              onChange(updated);
            }}
            className="absolute top-0 right-0 bg-red-500 text-white text-xs p-0.5 rounded-bl-lg"
          >
            <FaTrash size={10} />
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          const url = prompt("Enter image URL");
          if (url) onChange([...photos, url]);
        }}
        className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600"
      >
        <FaPlus />
      </button>
    </div>
  );
}

function ProcessSection({ step, data = {}, expanded, onToggle, updateField }) {
  const stepLower = step.toLowerCase();
  const fields = {
    Buffing: ["machine", "operator", "startTime", "endTime", "diameterAfterBuffing"],
    Repair: ["repairType", "patchUsed", "cushionGumUsed", "operator"],
    Building: ["treadRubberUsed", "cushionGum", "cementUsed", "builder"],
    Curing: ["chamberNumber", "temperature", "pressure", "cycleTime", "operator"],
    Finishing: ["painting", "branding", "finalInspection"],
    QC: ["airLeakTest", "balanceCheck", "visualInspection", "passed", "remarks", "qcInspector", "photos"],
  };

  const stepFields = fields[step] || [];
  return (
    <Section title={step} icon={statusIcons[step]} expanded={expanded} onToggle={onToggle}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stepFields.map((field) => {
          if (field === "startTime" || field === "endTime") {
            return (
              <div key={field}>
                <label className="text-xs text-gray-400 uppercase font-bold">{field}</label>
                <input
                  type="datetime-local"
                  className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                  value={data[field] ? new Date(data[field]).toISOString().slice(0, 16) : ""}
                  onChange={(e) => updateField(`${stepLower}.${field}`, new Date(e.target.value).toISOString())}
                />
              </div>
            );
          }
          if (typeof data[field] === "boolean") {
            return (
              <CheckField
                key={field}
                label={field}
                checked={data[field]}
                onChange={(v) => updateField(`${stepLower}.${field}`, v)}
              />
            );
          }
          if (field === "photos") {
            return (
              <div key={field} className="col-span-full">
                <label className="text-xs text-gray-400 uppercase font-bold">Photos</label>
                <PhotoUpload
                  photos={data.photos || []}
                  onChange={(urls) => updateField(`${stepLower}.photos`, urls)}
                />
              </div>
            );
          }
          return (
            <div key={field}>
              <label className="text-xs text-gray-400 uppercase font-bold">{field}</label>
              <input
                type={field.includes("Used") || field.includes("Cost") ? "number" : "text"}
                className="w-full mt-1 px-3 py-2 rounded-lg border text-sm"
                value={data[field] || ""}
                onChange={(e) => updateField(`${stepLower}.${field}`, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}