"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { 
  FaUser, FaBuilding, FaPhoneAlt, FaMapMarkerAlt, 
  FaInfoCircle, FaSave, FaArrowLeft, FaCheckCircle 
} from "react-icons/fa";
import DynamicCustomFields from "@/components/DynamicCustomFields";

const LeadDetailsForm = ({ leadId, initialData = null }) => {
  const router = useRouter();

  const initialFormState = {
    salutation: "", jobTitle: "", leadOwner: "", firstName: "",
    gender: "", middleName: "", source: "", lastName: "",
    email: "", mobileNo: "", phone: "", website: "",
    whatsapp: "", phoneExt: "", organizationName: "", annualRevenue: "",
    territory: "", employees: "", industry: "", fax: "",
    marketSegment: "", city: "", state: "", county: "",
    qualificationStatus: "", qualifiedBy: "", qualifiedOn: "",
    status: "", leadType: "", requestType: "", customFields: {}
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [customFieldsConfig, setCustomFieldsConfig] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState({ isVisible: false, message: "" });

  const isEditMode = Boolean(leadId);

  // Fetch Custom Fields Configuration
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get("/api/custom-fields?module=lead", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setCustomFieldsConfig(res.data.data));
  }, []);

  // Prefill Data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    } else if (isEditMode) {
      const fetchLead = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/lead/${leadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(res.data);
        } catch (err) {
          console.error("Error fetching lead:", err);
        }
      };
      fetchLead();
    }
  }, [leadId, initialData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomChange = (e, name) => {
    setFormData(prev => ({
      ...prev,
      customFields: { ...prev.customFields, [name]: e.target.value }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = "First Name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = "Invalid email.";
    if (!formData.mobileNo) newErrors.mobileNo = "Mobile No. is required.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const token = localStorage.getItem("token");
    const config = { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };

    try {
      if (isEditMode) {
        await axios.put(`/api/lead/${leadId}`, formData, config);
        setConfirmation({ isVisible: true, message: "Lead updated successfully!" });
      } else {
        await axios.post("/api/lead", formData, config);
        setConfirmation({ isVisible: true, message: "Lead created successfully!" });
      }
      setTimeout(() => router.push("/admin/leads-list"), 1500);
    } catch (error) {
      alert("Failed to save lead.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI Helpers ---
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi = "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none placeholder:text-gray-300";

  const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-4 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-bold text-sm hover:text-indigo-600 transition-colors">
            <FaArrowLeft size={12} /> Back
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
            >
              {submitting ? "Processing..." : <><FaSave size={12} /> {isEditMode ? "Update Lead" : "Save Lead"}</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Success Alert */}
        {confirmation.isVisible && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500 text-white font-bold flex items-center animate-bounce shadow-lg">
            <FaCheckCircle className="mr-3 text-xl" />
            {confirmation.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Basic Info */}
          <SectionCard icon={FaUser} title="Primary Contact" subtitle="Basic identity and job details" color="indigo">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Lbl text="Salutation" />
                <select name="salutation" value={formData.salutation} onChange={handleChange} className={fi}>
                  <option value="">None</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>
              <div>
                <Lbl text="First Name" req />
                <input name="firstName" value={formData.firstName} onChange={handleChange} className={fi} placeholder="Enter First Name" />
                {errors.firstName && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.firstName}</p>}
              </div>
              <div>
                <Lbl text="Last Name" />
                <input name="lastName" value={formData.lastName} onChange={handleChange} className={fi} placeholder="Enter Last Name" />
              </div>
              <div>
                <Lbl text="Job Title" />
                <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} className={fi} placeholder="e.g. CEO" />
              </div>
              <div>
                <Lbl text="Gender" />
                <select name="gender" value={formData.gender} onChange={handleChange} className={fi}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Lbl text="Lead Owner" />
                <input name="leadOwner" value={formData.leadOwner} onChange={handleChange} className={fi} placeholder="Owner Name" />
              </div>
            </div>
          </SectionCard>

          {/* Section 2: Contact Info */}
          <SectionCard icon={FaPhoneAlt} title="Contact & Social" subtitle="Email, phone and messaging" color="blue">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Lbl text="Email Address" req />
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={fi} placeholder="example@mail.com" />
                {errors.email && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.email}</p>}
              </div>
              <div>
                <Lbl text="Mobile Number" req />
                <input name="mobileNo" value={formData.mobileNo} onChange={handleChange} className={fi} placeholder="10-digit number" />
                {errors.mobileNo && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.mobileNo}</p>}
              </div>
              <div>
                <Lbl text="WhatsApp" />
                <input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className={fi} />
              </div>
              <div>
                <Lbl text="Website" />
                <input name="website" value={formData.website} onChange={handleChange} className={fi} placeholder="https://..." />
              </div>
              <div>
                <Lbl text="Phone" />
                <input name="phone" value={formData.phone} onChange={handleChange} className={fi} />
              </div>
              <div>
                <Lbl text="Phone Ext" />
                <input name="phoneExt" value={formData.phoneExt} onChange={handleChange} className={fi} />
              </div>
            </div>
          </SectionCard>

          {/* Section 3: Organization Info */}
          <SectionCard icon={FaBuilding} title="Organization Details" subtitle="Company scale and industry" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Lbl text="Organization Name" />
                <input name="organizationName" value={formData.organizationName} onChange={handleChange} className={fi} />
              </div>
              <div>
                <Lbl text="Industry" />
                <input name="industry" value={formData.industry} onChange={handleChange} className={fi} placeholder="e.g. Technology" />
              </div>
              <div>
                <Lbl text="Annual Revenue" />
                <input name="annualRevenue" value={formData.annualRevenue} onChange={handleChange} className={fi} />
              </div>
              <div>
                <Lbl text="Number of Employees" />
                <input name="employees" value={formData.employees} onChange={handleChange} className={fi} />
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Lead Classification */}
          <SectionCard icon={FaInfoCircle} title="Classification" subtitle="Lead status and categorization" color="amber">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Lbl text="Status" req />
                <select name="status" value={formData.status} onChange={handleChange} className={fi} required>
                  <option value="">Select Status</option>
                  <option value="Lead">Lead</option>
                  <option value="Open">Open</option>
                  <option value="Opportunity">Opportunity</option>
                  <option value="Interested">Interested</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>
              <div>
                <Lbl text="Lead Type" />
                <select name="leadType" value={formData.leadType} onChange={handleChange} className={fi}>
                  <option value="">Select Type</option>
                  <option value="Client">Client</option>
                  <option value="Channel Partner">Channel Partner</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>
              <div>
                <Lbl text="Source" />
                <input name="source" value={formData.source} onChange={handleChange} className={fi} placeholder="e.g. Google, Referral" />
              </div>
            </div>
          </SectionCard>

          {/* Custom Fields Section */}
          {customFieldsConfig.length > 0 && (
            <SectionCard icon={FaPlus} title="Additional Information" subtitle="Custom module fields" color="gray">
              <DynamicCustomFields
                fields={customFieldsConfig}
                values={formData.customFields}
                onChange={handleCustomChange}
                formFieldClass={fi}
              />
            </SectionCard>
          )}

        </form>
      </div>
    </div>
  );
};

export default LeadDetailsForm;


// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import DynamicCustomFields from "@/components/DynamicCustomFields";

// const LeadDetailsForm = ({ leadId, initialData = null }) => {
//   const router = useRouter();

//   const initialFormState = {
//     salutation: "",
//     jobTitle: "",
//     leadOwner: "",
//     firstName: "",
//     gender: "",
//     middleName: "",
//     source: "",
//     lastName: "",
//     email: "",
//     mobileNo: "",
//     phone: "",
//     website: "",
//     whatsapp: "",
//     phoneExt: "",
//     organizationName: "",
//     annualRevenue: "",
//     territory: "",
//     employees: "",
//     industry: "",
//     fax: "",
//     marketSegment: "",
//     city: "",
//     state: "",
//     county: "",
//     qualificationStatus: "",
//     qualifiedBy: "",
//     qualifiedOn: "",
//     status: "",
//     leadType: "",
//     requestType: "",
//   };

//   const [formData, setFormData] = useState(initialFormState);
//   const [errors, setErrors] = useState({});
//   const [customFieldsConfig,setCustomFieldsConfig] = useState([]);
//   const [confirmation, setConfirmation] = useState({
//     isVisible: false,
//     message: ""
//   });

//   const isEditMode = Boolean(leadId);
//   useEffect(()=>{

//  const token = localStorage.getItem("token");

//  axios.get("/api/custom-fields?module=lead",{
//    headers:{ Authorization:`Bearer ${token}` }
//  })
//  .then(res=>setCustomFieldsConfig(res.data.data));

// },[]);

//   // Prefill if editing
//   useEffect(() => {
//     if (initialData) {
//       setFormData(initialData);
//     } else if (isEditMode) {
//       const fetchLead = async () => {
//         try {
//           const token = localStorage.getItem("token");
//           const res = await axios.get(`/api/lead/${leadId}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           setFormData(res.data);
//         } catch (err) {
//           console.error("Error fetching lead:", err);
//         }
//       };
//       fetchLead();
//     }
//   }, [leadId, initialData]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };
//   const handleCustomChange = (e,name)=>{
//  setFormData(prev=>({
//    ...prev,
//    customFields:{
//      ...prev.customFields,
//      [name]: e.target.value
//    }
//  }))
// }

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.firstName) newErrors.firstName = "First Name is required.";
//     if (!formData.email) newErrors.email = "Email is required.";
//     if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email))
//       newErrors.email = "Invalid email address.";
//     if (!formData.mobileNo) newErrors.mobileNo = "Mobile Number is required.";
//     if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo))
//       newErrors.mobileNo = "Mobile Number must be 10 digits.";

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("User is not authenticated");
//       return;
//     }

//     const config = {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//     };

//     try {
//       if (isEditMode) {
//         await axios.put(`/api/lead/${leadId}`, formData, config);

//         setConfirmation({
//           isVisible: true,
//           message: "Lead updated successfully!"
//         });
//       } else {
//         await axios.post("/api/lead", formData, config);

//         setConfirmation({
//           isVisible: true,
//           message: "Lead created successfully!"
//         });
//       }

//       setTimeout(() => {
//         router.push("/leads");
//       }, 1500);

//     } catch (error) {
//       console.error("Error saving lead:", error);
//       alert("Failed to save lead. Please try again.");
//     }
//   };

//   // UI Styling classes
//   const formFieldClass =
//     "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600";

//   const requiredAsterisk = <span className="text-red-500">*</span>;

//   return (
//     <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
//       <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden">

//         {/* Header */}
//         <header className="bg-[#1e40af] p-6 sm:p-8">
//           <h1 className="text-3xl font-bold text-white">
//             {isEditMode ? "Edit Lead" : "Create New Lead"}
//           </h1>
//           <p className="text-gray-200 text-sm mt-1">
//             Enter lead details to manage your pipeline.
//           </p>
//         </header>

//         <div className="p-6 sm:p-10">

//           {/* Success Message */}
//           {confirmation.isVisible && (
//             <div className="mb-6 p-4 rounded-lg bg-[#10b981] text-white font-semibold flex items-center shadow-lg">
//               <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
//                   d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
//                 </path>
//               </svg>
//               <span>{confirmation.message}</span>
//             </div>
//           )}

//           {/* FORM */}
//           <form className="space-y-6" onSubmit={handleSubmit}>

//             {/* Fields in 2 columns */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

//               {[
//                 { label: "Salutation", name: "salutation" },
//                 { label: "Job Title", name: "jobTitle" },
//                 { label: "Lead Owner", name: "leadOwner" },
//                 { label: "First Name", name: "firstName", required: true },
//                 { label: "Gender", name: "gender" },
//                 { label: "Middle Name", name: "middleName" },
//                 { label: "Source", name: "source" },
//                 { label: "Last Name", name: "lastName" },
//                 { label: "Email", name: "email", required: true },
//                 { label: "Mobile No", name: "mobileNo", required: true },
//                 { label: "Phone", name: "phone" },
//                 { label: "Website", name: "website" },
//                 { label: "Whatsapp", name: "whatsapp" },
//                 { label: "Phone Ext", name: "phoneExt" },
//                 { label: "Organization", name: "organizationName" },
//                 { label: "Annual Revenue", name: "annualRevenue" },
//                 { label: "Territory", name: "territory" },
//                 { label: "Employees", name: "employees" },
//                 { label: "Industry", name: "industry" },
//                 { label: "Fax", name: "fax" },
//                 { label: "Market Segment", name: "marketSegment" },
//                 { label: "City", name: "city" },
//                 { label: "State", name: "state" },
//                 { label: "County", name: "county" },
//               ].map(({ label, name, required }) => (
//                 <div key={name}>
//                   <label className="block text-sm font-medium mb-1">
//                     {label} {required && requiredAsterisk}
//                   </label>
//                   <input
//                     type="text"
//                     name={name}
//                     value={formData[name] || ""}
//                     onChange={handleChange}
//                     className={formFieldClass}
//                     required={required}
//                   />
//                   {errors[name] && <p className="text-red-500 text-sm">{errors[name]}</p>}
//                 </div>
//               ))}

//               {/* Dropdown: Status */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                   Status {requiredAsterisk}
//                 </label>
//                 <select
//                   name="status"
//                   value={formData.status || ""}
//                   onChange={handleChange}
//                   required
//                   className={`${formFieldClass} appearance-none pr-8`}
//                 >
//                   <option value="">Select Status</option>
//                   <option value="Lead">Lead</option>
//                   <option value="Open">Open</option>
//                   <option value="Replied">Replied</option>
//                   <option value="Opportunity">Opportunity</option>
//                   <option value="Quotation">Quotation</option>
//                   <option value="Lost Quotation">Lost Quotation</option>
//                   <option value="Interested">Interested</option>
//                   <option value="Converted">Converted</option>
//                   <option value="Do Not Contact">Do Not Contact</option>
//                 </select>
//               </div>

//               {/* Dropdown: Lead Type */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">Lead Type</label>
//                 <select
//                   name="leadType"
//                   value={formData.leadType || ""}
//                   onChange={handleChange}
//                   className={`${formFieldClass} appearance-none pr-8`}
//                 >
//                   <option value="">Select Lead Type</option>
//                   <option value="Client">Client</option>
//                   <option value="Channel Partner">Channel Partner</option>
//                   <option value="Consultant">Consultant</option>
//                 </select>
//               </div>

//               {/* Dropdown: Request Type */}
//               <div>
//                 <label className="block text-sm font-medium mb-1">Request Type</label>
//                 <select
//                   name="requestType"
//                   value={formData.requestType || ""}
//                   onChange={handleChange}
//                   className={`${formFieldClass} appearance-none pr-8`}
//                 >
//                   <option value="">Select Request Type</option>
//                   <option value="Product Enquiry">Product Enquiry</option>
//                   <option value="Request for Information">Request for Information</option>
//                   <option value="Suggestions">Suggestions</option>
//                   <option value="Other">Other</option>
//                 </select>
//               </div>
//               <DynamicCustomFields
//   fields={customFieldsConfig}
//   values={formData.customFields}
//   onChange={handleCustomChange}
//   formFieldClass={formFieldClass}
// />

//             </div>

//             {/* Buttons */}
//             <button
//               type="submit"
//               className="w-full bg-[#10b981] hover:bg-green-600 text-white font-bold py-3 rounded-lg"
//             >
//               {isEditMode ? "Update Lead" : "Save Lead"}
//             </button>

//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LeadDetailsForm;

