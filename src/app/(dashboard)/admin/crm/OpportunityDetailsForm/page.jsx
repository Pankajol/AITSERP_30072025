"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import {
  FaHandshake, FaCalculator, FaCalendarAlt,
  FaSave, FaArrowLeft, FaCheckCircle, FaInfoCircle,
  FaUser, FaMapMarkerAlt
} from "react-icons/fa";

// ---------- SectionCard ----------
const SectionCard = memo(({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const colorClasses = {
    indigo: "bg-indigo-50/40",
    emerald: "bg-emerald-50/40",
    blue: "bg-blue-50/40",
    purple: "bg-purple-50/40",
    gray: "bg-gray-50/40"
  };
  const bgClass = colorClasses[color] || colorClasses.indigo;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${bgClass}`}>
        <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center text-gray-600">
          <Icon className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
});
SectionCard.displayName = "SectionCard";

// ---------- AddressSection ----------
const AddressSection = memo(({ title, data, onDataChange, onPincodeFetch }) => {
  const handleFieldChange = useCallback((field, value) => {
    onDataChange({ ...data, [field]: value });
  }, [data, onDataChange]);

  const handlePincodeChange = useCallback(async (e) => {
    const val = e.target.value.slice(0, 6);
    const updated = { ...data, postalCode: val };
    onDataChange(updated);
    if (val.length === 6) {
      const addressData = await onPincodeFetch(val);
      if (addressData) onDataChange({ ...updated, ...addressData });
    }
  }, [data, onDataChange, onPincodeFetch]);

  const Lbl = ({ text }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
    </label>
  );

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500">
          <FaMapMarkerAlt className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">Customer's address</p>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Lbl text="Street" />
            <input value={data.street} onChange={(e) => handleFieldChange("street", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Lbl text="City" />
            <input value={data.city} onChange={(e) => handleFieldChange("city", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Lbl text="State" />
            <input value={data.state} onChange={(e) => handleFieldChange("state", e.target.value)} className={inputClass} />
          </div>
          <div>
            <Lbl text="Postal Code" />
            <input value={data.postalCode} onChange={handlePincodeChange} maxLength="6" className={inputClass} placeholder="6-digit PIN" />
          </div>
          <div>
            <Lbl text="Country" />
            <input value={data.country} onChange={(e) => handleFieldChange("country", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
    </div>
  );
});
AddressSection.displayName = "AddressSection";

// ---------- Main Form ----------
const OpportunityForm = ({ opportunityId = null }) => {
  const router = useRouter();
  const isEditMode = Boolean(opportunityId);
  const [loading, setLoading] = useState(isEditMode);
  const [formData, setFormData] = useState({
    opportunityName: "", accountName: "", value: "", stage: "", closeDate: "", probability: 50,
    leadSource: "", description: "", email: "", phone: "", mobile: "", pan: "", gst: "",
    billingAddress: { street: "", city: "", state: "", postalCode: "", country: "India" },
    shippingAddress: { street: "", city: "", state: "", postalCode: "", country: "India" },
    customFields: {}
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ isVisible: false, message: "" });

  // Stage → Probability mapping
  const stageProbabilityMap = {
    "Qualification": 20,
    "Needs Analysis": 40,
    "Proposal": 60,
    "Negotiation": 80,
    "Closed Won": 100,
    "Closed Lost": 0,
  };

  // Auto-fill from lead (create mode only)
  useEffect(() => {
    if (!isEditMode) {
      const stored = sessionStorage.getItem("opportunityCopyData");
      if (stored) {
        try {
          const lead = JSON.parse(stored);
          const custom = lead.customFields || {};
          setFormData({
            opportunityName: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
            accountName: lead.organizationName || `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
            value: lead.estimatedValue || "",
            leadSource: lead.source || "",
            description: lead.description || "",
            email: lead.email || "",
            phone: lead.phone || "",
            mobile: lead.mobileNo || "",
            pan: lead.pan || custom.pan || "",
            gst: lead.gstNumber || custom.gstNumber || custom.gst || "",
            billingAddress: {
              street: lead.address?.street || custom.street || "",
              city: lead.city || custom.city || "",
              state: lead.state || custom.state || "",
              postalCode: lead.zipCode || custom.postalCode || custom.zipCode || "",
              country: "India",
            },
            shippingAddress: {
              street: lead.address?.street || custom.street || "",
              city: lead.city || custom.city || "",
              state: lead.state || custom.state || "",
              postalCode: lead.zipCode || custom.postalCode || custom.zipCode || "",
              country: "India",
            },
            customFields: {
              salutation: lead.salutation || "",
              jobTitle: lead.jobTitle || "",
              leadOwner: lead.leadOwner || "",
              middleName: lead.middleName || "",
              gender: lead.gender || "",
              website: lead.website || "",
              whatsapp: lead.whatsapp || "",
              phoneExt: lead.phoneExt || "",
              fax: lead.fax || "",
              annualRevenue: lead.annualRevenue || "",
              employees: lead.employees || "",
              industry: lead.industry || "",
              marketSegment: lead.marketSegment || "",
              county: lead.county || "",
              territory: lead.territory || "",
              qualificationStatus: lead.qualificationStatus || "",
              qualifiedBy: lead.qualifiedBy || "",
              qualifiedOn: lead.qualifiedOn || "",
              leadType: lead.leadType || "",
              requestType: lead.requestType || "",
              ...custom
            }
          });
        } catch (e) { console.error(e); }
      }
    }
  }, [isEditMode]);

  // Fetch existing opportunity for edit mode
  useEffect(() => {
    if (isEditMode && opportunityId) {
      const fetchOpportunity = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/crm/opportunity/${opportunityId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const result = await res.json();
          let opp;
          if (result.success === true && result.data) opp = result.data;
          else if (result._id || result.opportunityName) opp = result;
          else throw new Error("Unexpected API response format");
          setFormData({
            opportunityName: opp.opportunityName || "",
            accountName: opp.accountName || "",
            value: opp.value || "",
            stage: opp.stage || "",
            closeDate: opp.closeDate ? opp.closeDate.split('T')[0] : "",
            probability: opp.probability || 50,
            leadSource: opp.leadSource || "",
            description: opp.description || "",
            email: opp.email || "",
            phone: opp.phone || "",
            mobile: opp.mobile || "",
            pan: opp.pan || "",
            gst: opp.gst || "",
            billingAddress: opp.billingAddress || { street: "", city: "", state: "", postalCode: "", country: "India" },
            shippingAddress: opp.shippingAddress || { street: "", city: "", state: "", postalCode: "", country: "India" },
            customFields: opp.customFields || {}
          });
        } catch (err) {
          console.error(err);
          alert("Failed to load opportunity");
        } finally {
          setLoading(false);
        }
      };
      fetchOpportunity();
    }
  }, [isEditMode, opportunityId]);

  // HandleChange with automatic probability update on stage change
  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    if (name === "stage") {
      const defaultProb = stageProbabilityMap[value];
      if (defaultProb !== undefined) {
        setFormData(prev => ({
          ...prev,
          stage: value,
          probability: defaultProb,
        }));
        return;
      }
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  }, []);

  const handleAddressChange = useCallback((type, addressData) => {
    setFormData(prev => ({ ...prev, [type]: addressData }));
  }, []);

  const fetchAddressByPincode = useCallback(async (pincode) => {
    if (pincode.length !== 6) return null;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const po = data[0]?.PostOffice?.[0];
        if (po) return { city: po.District || "", state: po.State || "", country: "India" };
      }
      return null;
    } catch (err) { console.error(err); return null; }
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.opportunityName.trim()) newErrors.opportunityName = "Required";
    if (!formData.accountName.trim()) newErrors.accountName = "Required";
    if (!formData.value || formData.value <= 0) newErrors.value = "Positive value required";
    if (!formData.stage) newErrors.stage = "Required";
    if (!formData.closeDate) newErrors.closeDate = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const url = isEditMode ? `/api/crm/opportunity/${opportunityId}` : "/api/crm/opportunity";
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmation({ isVisible: true, message: `Opportunity ${isEditMode ? "updated" : "created"} successfully!` });
        if (!isEditMode) {
          setFormData({
            opportunityName: "", accountName: "", value: "", stage: "", closeDate: "", probability: 50,
            leadSource: "", description: "", email: "", phone: "", mobile: "", pan: "", gst: "",
            billingAddress: { street: "", city: "", state: "", postalCode: "", country: "India" },
            shippingAddress: { street: "", city: "", state: "", postalCode: "", country: "India" },
            customFields: {}
          });
        }
        setTimeout(() => router.push("/admin/crm/opportunities-list"), 1500);
      } else alert("Error: " + (result.error || result.message));
    } catch (err) { alert("Request failed: " + err.message); }
    finally { setSubmitting(false); }
  };

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass = (fieldName) => {
    const hasError = errors[fieldName];
    return `w-full px-3 py-2.5 rounded-lg border ${hasError ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'} bg-white text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none`;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-bold text-sm hover:text-indigo-600">
            <FaArrowLeft size={12} /> Back
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg disabled:opacity-50">
            {submitting ? "Processing..." : <><FaSave size={12} /> {isEditMode ? "Update Opportunity" : "Save Opportunity"}</>}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {confirmation.isVisible && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500 text-white font-bold flex items-center shadow-lg">
            <FaCheckCircle className="mr-3 text-xl" /> {confirmation.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Deal Overview */}
          <SectionCard icon={FaHandshake} title="Deal Overview" color="indigo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Lbl text="Opportunity Name" req />
                <input name="opportunityName" value={formData.opportunityName} onChange={handleChange} className={inputClass("opportunityName")} />
                {errors.opportunityName && <p className="text-red-500 text-xs mt-1">{errors.opportunityName}</p>}
              </div>
              <div>
                <Lbl text="Account Name" req />
                <input name="accountName" value={formData.accountName} onChange={handleChange} className={inputClass("accountName")} />
                {errors.accountName && <p className="text-red-500 text-xs mt-1">{errors.accountName}</p>}
              </div>
              <div className="md:col-span-2">
                <Lbl text="Lead Source" />
                <select name="leadSource" value={formData.leadSource} onChange={handleChange} className={inputClass("leadSource")}>
                  <option value="">Select</option>
                  <option>Website</option><option>Referral</option><option>Partner</option><option>Cold Call</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Financials */}
          <SectionCard icon={FaCalculator} title="Financials" color="emerald">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Lbl text="Value (INR)" req />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input type="number" name="value" value={formData.value} onChange={handleChange} className={`${inputClass("value")} pl-7`} min="1" />
                </div>
                {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value}</p>}
              </div>
              <div>
                <Lbl text="Probability (%)" />
                <div className="flex items-center gap-4">
                  <input type="range" name="probability" min="0" max="100" step="5" value={formData.probability} onChange={handleChange} className="flex-1 accent-indigo-600" />
                  <span className="text-indigo-600 font-bold">{formData.probability}%</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Pipeline */}
          <SectionCard icon={FaCalendarAlt} title="Pipeline" color="blue">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Lbl text="Stage" req />
                <select name="stage" value={formData.stage} onChange={handleChange} className={inputClass("stage")}>
                  <option value="" disabled>Select</option>
                  <option>Qualification</option><option>Needs Analysis</option><option>Proposal</option>
                  <option>Negotiation</option><option>Closed Won</option><option>Closed Lost</option>
                </select>
                {errors.stage && <p className="text-red-500 text-xs mt-1">{errors.stage}</p>}
              </div>
              <div>
                <Lbl text="Close Date" req />
                <input type="date" name="closeDate" value={formData.closeDate} onChange={handleChange} className={inputClass("closeDate")} />
                {errors.closeDate && <p className="text-red-500 text-xs mt-1">{errors.closeDate}</p>}
              </div>
            </div>
          </SectionCard>

          {/* Contact & Tax */}
          <SectionCard icon={FaUser} title="Contact & Tax" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><Lbl text="Email" /><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass("email")} /></div>
              <div><Lbl text="Phone" /><input name="phone" value={formData.phone} onChange={handleChange} className={inputClass("phone")} /></div>
              <div><Lbl text="Mobile" /><input name="mobile" value={formData.mobile} onChange={handleChange} className={inputClass("mobile")} /></div>
              <div><Lbl text="PAN" /><input name="pan" value={formData.pan} onChange={handleChange} className={inputClass("pan")} /></div>
              <div className="md:col-span-2"><Lbl text="GST" /><input name="gst" value={formData.gst} onChange={handleChange} className={inputClass("gst")} /></div>
            </div>
          </SectionCard>

          {/* Addresses */}
          <AddressSection
            key="billing"
            title="Billing Address"
            data={formData.billingAddress}
            onDataChange={(newData) => handleAddressChange("billingAddress", newData)}
            onPincodeFetch={fetchAddressByPincode}
          />
          <AddressSection
            key="shipping"
            title="Shipping Address"
            data={formData.shippingAddress}
            onDataChange={(newData) => handleAddressChange("shippingAddress", newData)}
            onPincodeFetch={fetchAddressByPincode}
          />

          {/* Notes */}
          <SectionCard icon={FaInfoCircle} title="Additional Notes" color="gray">
            <textarea name="description" rows="4" value={formData.description} onChange={handleChange} className={`${inputClass("description")} resize-none`} />
          </SectionCard>
        </form>
      </div>
    </div>
  );
};

export default OpportunityForm;
// "use client";

// import React, { useState, useEffect } from "react";

// // Initial form state
// const initialFormData = {
//   opportunityName: "",
//   accountName: "",
//   value: "",
//   stage: "",
//   closeDate: "",
//   probability: 50,
//   leadSource: "",
//   description: "",
// };

// const OpportunityForm = () => {
//   const [formData, setFormData] = useState(initialFormData);
//   const [confirmation, setConfirmation] = useState({
//     isVisible: false,
//     message: "",
//   });

//   /* ----------------------------------------------------------
//      AUTO-FILL OPPORTUNITY DATA FROM LEAD (sessionStorage)
//   -----------------------------------------------------------*/
//   useEffect(() => {
//     const stored = sessionStorage.getItem("opportunityCopyData");

//     if (stored) {
//       const lead = JSON.parse(stored);

//       setFormData((prev) => ({
//         ...prev,
//         opportunityName: `${lead.firstName} ${lead.lastName}`,
//         accountName:
//           lead.companyName || `${lead.firstName} ${lead.lastName}`,
//         value: lead.estimatedValue || "",
//         leadSource: lead.source || "",
//         description: lead.description || "",
//       }));
//     }
//   }, []);

//   /* ----------------------------------------------------------
//      HANDLE FORM FIELD CHANGE
//   -----------------------------------------------------------*/
//   const handleChange = (e) => {
//     const { name, value, type } = e.target;

//     setFormData((prev) => ({
//       ...prev,
//       [name]: type === "number" ? Number(value) : value,
//     }));
//   };

//   /* ----------------------------------------------------------
//      VALIDATION
//   -----------------------------------------------------------*/
//   const validateForm = () => {
//     if (!formData.opportunityName.trim()) {
//       alert("Opportunity name is required");
//       return false;
//     }
//     if (!formData.accountName.trim()) {
//       alert("Account name is required");
//       return false;
//     }
//     if (!formData.value || formData.value <= 0) {
//       alert("Value must be a positive number");
//       return false;
//     }
//     if (!formData.stage) {
//       alert("Please select a sales stage");
//       return false;
//     }
//     if (!formData.closeDate) {
//       alert("Please select a closing date");
//       return false;
//     }
//     return true;
//   };

//   /* ----------------------------------------------------------
//      FINAL SUBMIT HANDLER (API POST)
//   -----------------------------------------------------------*/
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!validateForm()) return;

//     try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//             alert("Unauthorized! Please log in.");
//             return;
//         }

//       const res = await fetch("/api/opportunity", {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}`,"Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });

//       const result = await res.json();

//       if (result.success) {
//         setConfirmation({
//           isVisible: true,
//           message: `Opportunity "${formData.opportunityName}" created successfully!`,
//         });

//         setFormData(initialFormData);

//         setTimeout(() => {
//           setConfirmation({ isVisible: false, message: "" });
//         }, 4000);
//       } else {
//         alert("Error: " + result.error);
//       }
//     } catch (err) {
//       alert("Request failed: " + err.message);
//     }
//   };

//   const formFieldClass =
//     "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-primary-blue transition duration-150 ease-in-out";

//   const requiredAsterisk = <span className="text-red-500">*</span>;

//   return (
//     <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
//       <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">
//         {/* Header */}
//         <header className="bg-[#1e40af] p-6 sm:p-8">
//           <h1 className="text-3xl font-bold text-white">Create New Opportunity</h1>
//           <p className="text-gray-200 text-sm mt-1">
//             Capture essential details to move the deal forward.
//           </p>
//         </header>

//         <div className="p-6 sm:p-10">
//           {/* Confirmation Message */}
//           {confirmation.isVisible && (
//             <div className="mb-6 p-4 rounded-lg bg-[#10b981] text-white font-semibold flex items-center shadow-lg">
//               <svg
//                 className="w-6 h-6 mr-3"
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth="2"
//                   d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
//                 ></path>
//               </svg>
//               <span>{confirmation.message}</span>
//             </div>
//           )}

//           <form className="space-y-6" onSubmit={handleSubmit}>
//             {/* Row 1 */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Opportunity Name */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Opportunity Name {requiredAsterisk}
//                 </label>
//                 <input
//                   type="text"
//                   name="opportunityName"
//                   value={formData.opportunityName}
//                   onChange={handleChange}
//                   required
//                   className={formFieldClass}
//                 />
//               </div>

//               {/* Account Name */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Account Name {requiredAsterisk}
//                 </label>
//                 <input
//                   type="text"
//                   name="accountName"
//                   value={formData.accountName}
//                   onChange={handleChange}
//                   required
//                   className={formFieldClass}
//                 />
//               </div>
//             </div>

//             {/* Row 2 */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Value */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Estimated Value (USD) {requiredAsterisk}
//                 </label>
//                 <input
//                   type="number"
//                   name="value"
//                   value={formData.value}
//                   onChange={handleChange}
//                   required
//                   min="1"
//                   className={formFieldClass}
//                 />
//               </div>

//               {/* Stage */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Sales Stage {requiredAsterisk}
//                 </label>
//                 <select
//                   name="stage"
//                   value={formData.stage}
//                   onChange={handleChange}
//                   required
//                   className={`${formFieldClass} appearance-none pr-8`}
//                 >
//                   <option value="" disabled>Select a pipeline stage</option>
//                   <option value="qualification">Qualification</option>
//                   <option value="needs_analysis">Needs Analysis</option>
//                   <option value="proposal">Proposal</option>
//                   <option value="negotiation">Negotiation</option>
//                   <option value="closed_won">Closed Won</option>
//                   <option value="closed_lost">Closed Lost</option>
//                 </select>
//               </div>
//             </div>

//             {/* Row 3 */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Close Date */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Expected Close Date {requiredAsterisk}
//                 </label>
//                 <input
//                   type="date"
//                   name="closeDate"
//                   value={formData.closeDate}
//                   onChange={handleChange}
//                   required
//                   className={formFieldClass}
//                 />
//               </div>

//               {/* Probability */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">Probability (%)</label>
//                 <input
//                   type="range"
//                   name="probability"
//                   min="0"
//                   max="100"
//                   step="5"
//                   value={formData.probability}
//                   onChange={handleChange}
//                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
//                 />
//                 <p className="text-right mt-1 text-sm text-gray-500">
//                   {formData.probability}%
//                 </p>
//               </div>
//             </div>

//             {/* Lead Source */}
//             <div>
//               <label className="block text-sm font-medium mb-1">Lead Source</label>
//               <select
//                 name="leadSource"
//                 value={formData.leadSource}
//                 onChange={handleChange}
//                 className={`${formFieldClass} appearance-none pr-8`}
//               >
//                 <option value="" disabled>Select the source</option>
//                 <option value="web">Web Inquiry</option>
//                 <option value="referral">Customer Referral</option>
//                 <option value="partner">Partner</option>
//                 <option value="cold_call">Cold Call</option>
//                 <option value="conference">Conference</option>
//               </select>
//             </div>

//             {/* Description */}
//             <div>
//               <label className="block text-sm font-medium mb-1">
//                 Description / Next Steps
//               </label>
//               <textarea
//                 name="description"
//                 rows="4"
//                 value={formData.description}
//                 onChange={handleChange}
//                 className={formFieldClass}
//                 placeholder="Notes about the opportunity..."
//               ></textarea>
//             </div>

//             {/* Submit */}
//             <button
//               type="submit"
//               className="w-full bg-[#10b981] hover:bg-green-600 text-white font-bold py-3 rounded-lg"
//             >
//               Save Opportunity
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OpportunityForm;




// "use client";
// import React, { useState } from "react";

// const OpportunityDetailsForm = () => {
//   const [formData, setFormData] = useState({
//     opportunityFrom: "",
//     opportunityType: "",
//     salesStage: "",
//     source: "",
//     party: "",
//     opportunityOwner: "",
//     expectedClosingDate: "",
//     status: "",
//     probability: "",
//     employees: "",
//     industry: "",
//     city: "",
//     state: "",
//     annualRevenue: "",
//     marketSegment: "",
//     country: "",
//     website: "",
//     territory: "",
//     currency: "",
//     opportunityAmount: "",
//     company: "",
//     printLanguage: "",
//     opportunityDate: "",
//     requestType: "",
//   });

//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.opportunityFrom) newErrors.opportunityFrom = "This field is required.";
//     if (!formData.opportunityType) newErrors.opportunityType = "This field is required.";
//     if (!formData.salesStage) newErrors.salesStage = "This field is required.";
//     if (!formData.expectedClosingDate) newErrors.expectedClosingDate = "Expected Closing Date is required.";
//     if (!formData.opportunityAmount) newErrors.opportunityAmount = "Opportunity Amount is required.";
//     if (formData.opportunityAmount && isNaN(formData.opportunityAmount)) {
//       newErrors.opportunityAmount = "Opportunity Amount must be a valid number.";
//     }
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

// const handleSubmit = async (e) => {
//   e.preventDefault();
//   if (validateForm()) {
//     try {
//       const res = await fetch("/api/opportunity", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await res.json();
//       if (result.success) {
//         alert("Opportunity added successfully");
//         setFormData(initialFormState);
//       } else {
//         alert("Error: " + result.error);
//       }
//     } catch (err) {
//       alert("Request failed: " + err.message);
//     }
//   }
// };


//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Opportunity Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Opportunity From", name: "opportunityFrom", type: "text", required: true },
//           { label: "Opportunity Type", name: "opportunityType", type: "text", required: true },
//           { label: "Opportunity Date", name: "opportunityDate", type: "date" },
//           { label: "Source", name: "source", type: "text" },
         
//           { label: "Sales Stage", name: "salesStage", type: "text", required: true },
//           { label: "Party", name: "party", type: "text" },
//           { label: "Opportunity Owner", name: "opportunityOwner", type: "text" },
//           { label: "Expected Closing Date", name: "expectedClosingDate", type: "date", required: true },
//           { label: "Status", name: "status", type: "text" },
//           { label: "Probability (%)", name: "probability", type: "number" },
//           { label: "No. of Employees", name: "employees", type: "number" },
//           { label: "Industry", name: "industry", type: "text" },
//           { label: "City", name: "city", type: "text" },
//           { label: "State", name: "state", type: "text" },
//           { label: "Annual Revenue", name: "annualRevenue", type: "number" },
//           { label: "Market Segment", name: "marketSegment", type: "text" },
//           { label: "Country", name: "country", type: "text" },
//           { label: "Website", name: "website", type: "url" },
//           { label: "Territory", name: "territory", type: "text" },
//           { label: "Currency", name: "currency", type: "text" },
//           { label: "Opportunity Amount (INR)", name: "opportunityAmount", type: "number", required: true },
//           { label: "Company", name: "company", type: "text" },
//           { label: "Print Language", name: "printLanguage", type: "text" },
        
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>

//           <div>
//           <label className="block text-sm font-medium text-gray-700">Request Type</label>
//           <select
//             name="requestType"
//             value={formData.requestType || ""}
//             onChange={handleChange}
//             className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//           >
//             <option value="">Select Request Type</option>
//             <option value="Product Enquiry">Product Enquiry</option>
//             <option value="Request for Information">Request for Information</option>
//             <option value="Suggestions">Suggestions</option>
//             <option value="Other">Other</option>
//           </select>
//         </div>
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Add
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={() => setFormData({})}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default OpportunityDetailsForm;










// import React, { useState } from "react";

// const OpportunityDetailsForm = () => {
//   const [formData, setFormData] = useState({
//     opportunityFrom: "",
//     opportunityType: "",
//     salesStage: "",
//     source: "",
//     party: "",
//     opportunityOwner: "",
//     expectedClosingDate: "",
//     status: "",
//     probability: "",
//     employees: "",
//     industry: "",
//     city: "",
//     state: "",
//     annualRevenue: "",
//     marketSegment: "",
//     country: "",
//     website: "",
//     territory: "",
//     currency: "",
//     opportunityAmount: "",
//     company: "",
//     printLanguage: "",
//     opportunityDate: "",
//   });

//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.opportunityFrom) newErrors.opportunityFrom = "This field is required.";
//     if (!formData.opportunityType) newErrors.opportunityType = "This field is required.";
//     if (!formData.salesStage) newErrors.salesStage = "This field is required.";
//     if (!formData.expectedClosingDate) newErrors.expectedClosingDate = "Expected Closing Date is required.";
//     if (!formData.opportunityAmount) newErrors.opportunityAmount = "Opportunity Amount is required.";
//     if (formData.opportunityAmount && isNaN(formData.opportunityAmount)) {
//       newErrors.opportunityAmount = "Opportunity Amount must be a valid number.";
//     }
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log("Form submitted successfully:", formData);
//       alert("Form submitted successfully!");
//       setFormData({
//         opportunityFrom: "",
//         opportunityType: "",
//         salesStage: "",
//         source: "",
//         party: "",
//         opportunityOwner: "",
//         expectedClosingDate: "",
//         status: "",
//         probability: "",
//         employees: "",
//         industry: "",
//         city: "",
//         state: "",
//         annualRevenue: "",
//         marketSegment: "",
//         country: "",
//         website: "",
//         territory: "",
//         currency: "",
//         opportunityAmount: "",
//         company: "",
//         printLanguage: "",
//         opportunityDate: "",
//       });
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Opportunity Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Opportunity From", name: "opportunityFrom", type: "text", required: true },
//           { label: "Opportunity Type", name: "opportunityType", type: "text", required: true },
//           { label: "Sales Stage", name: "salesStage", type: "text", required: true },
//           { label: "Source", name: "source", type: "text" },
//           { label: "Party", name: "party", type: "text" },
//           { label: "Opportunity Owner", name: "opportunityOwner", type: "text" },
//           { label: "Expected Closing Date", name: "expectedClosingDate", type: "date", required: true },
//           { label: "Status", name: "status", type: "text" },
//           { label: "Probability (%)", name: "probability", type: "number" },
//           { label: "No. of Employees", name: "employees", type: "number" },
//           { label: "Industry", name: "industry", type: "text" },
//           { label: "City", name: "city", type: "text" },
//           { label: "State", name: "state", type: "text" },
//           { label: "Annual Revenue", name: "annualRevenue", type: "number" },
//           { label: "Market Segment", name: "marketSegment", type: "text" },
//           { label: "Country", name: "country", type: "text" },
//           { label: "Website", name: "website", type: "url" },
//           { label: "Territory", name: "territory", type: "text" },
//           { label: "Currency", name: "currency", type: "text" },
//           { label: "Opportunity Amount (INR)", name: "opportunityAmount", type: "number", required: true },
//           { label: "Company", name: "company", type: "text" },
//           { label: "Print Language", name: "printLanguage", type: "text" },
//           { label: "Opportunity Date", name: "opportunityDate", type: "date" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Add
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={() => setFormData({})}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default OpportunityDetailsForm;

// import React, { useState } from "react";

// const OpportunityForm = () => {
//   const [formData, setFormData] = useState({
//     opportunityFrom: "",
//     opportunityType: "",
//     source: "",
//     salesStage: "",
//     party: "",
//     opportunityOwner: "",
//     expectedClosingDate: "",
//     status: "",
//     probability: "",
//     noOfEmployees: "",
//     industry: "",
//     city: "",
//     state: "",
//     country: "",
//     annualRevenue: "",
//     marketSegment: "",
//     website: "",
//     territory: "",
//     currency: "",
//     opportunityAmount: "",
//     company: "",
//     printLanguage: "",
//     opportunityDate: "",
//   });

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Replace with your API endpoint
//     console.log(formData);
//     alert("Form submitted successfully!");
//   };

//   return (
//     <div className="bg-gray-50 min-h-screen flex items-center justify-center">
//       <form
//         onSubmit={handleSubmit}
//         className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full"
//       >
//         {/* Section: Opportunity Details */}
//         <h3 className="text-xl font-semibold text-orange-600 mb-4">
//           Opportunity Details
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">Opportunity From</label>
//             <input
//               type="text"
//               name="opportunityFrom"
//               value={formData.opportunityFrom}
//               onChange={handleChange}
//               placeholder="Enter Opportunity From"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Opportunity Type</label>
//             <input
//               type="text"
//               name="opportunityType"
//               value={formData.opportunityType}
//               onChange={handleChange}
//               placeholder="Enter Opportunity Type"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Source</label>
//             <input
//               type="text"
//               name="source"
//               value={formData.source}
//               onChange={handleChange}
//               placeholder="Enter Source"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Sales Stage</label>
//             <input
//               type="text"
//               name="salesStage"
//               value={formData.salesStage}
//               onChange={handleChange}
//               placeholder="Enter Sales Stage"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Section: Organization */}
//         <h3 className="text-xl font-semibold text-orange-600 my-4">
//           Organization
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">No. of Employees</label>
//             <input
//               type="text"
//               name="noOfEmployees"
//               value={formData.noOfEmployees}
//               onChange={handleChange}
//               placeholder="Enter No. of Employees"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">Industry</label>
//             <input
//               type="text"
//               name="industry"
//               value={formData.industry}
//               onChange={handleChange}
//               placeholder="Enter Industry"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Section: Opportunity Value */}
//         <h3 className="text-xl font-semibold text-orange-600 my-4">
//           Opportunity Value
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-gray-700 mb-1">Currency</label>
//             <input
//               type="text"
//               name="currency"
//               value={formData.currency}
//               onChange={handleChange}
//               placeholder="Enter Currency"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//           <div>
//             <label className="block text-gray-700 mb-1">
//               Opportunity Amount (INR)
//             </label>
//             <input
//               type="text"
//               name="opportunityAmount"
//               value={formData.opportunityAmount}
//               onChange={handleChange}
//               placeholder="Enter Opportunity Amount"
//               className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-orange-300"
//             />
//           </div>
//         </div>

//         {/* Buttons */}
//         <div className="flex justify-between items-center mt-6">
//           <button
//             type="submit"
//             className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
//           >
//             Add
//           </button>
//           <button
//             type="button"
//             className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
//             onClick={() => alert("Cancelled")}
//           >
//             Cancel
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default OpportunityForm;

