"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiSave, FiArrowLeft, FiLoader, FiUser, FiBriefcase, FiPlus, FiTrash2 } from "react-icons/fi";
import { jwtDecode } from "jwt-decode";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userType, setUserType] = useState(null);
  const [form, setForm] = useState({});
  const [supportEmails, setSupportEmails] = useState([]);
  const [workingHours, setWorkingHours] = useState({ startHour: 10, endHour: 18, workingDays: [1,2,3,4,5] });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/signin");
        return;
      }
      try {
        const decoded = jwtDecode(token);
        const isCompany = decoded.type === "company" || decoded.role === "Company";
        setUserType(isCompany ? "company" : "user");
        if (isCompany) {
          const res = await axios.get("/api/company/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.success) {
            const data = res.data.company;
            setForm(data);
            setSupportEmails(data.supportEmails || []);
            setWorkingHours(data.workingHours || { startHour: 10, endHour: 18, workingDays: [1,2,3,4,5] });
          }
        } else {
          const res = await axios.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.user) setForm(res.data.user);
        }
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleWorkingHoursChange = (field, value) => {
    setWorkingHours({ ...workingHours, [field]: value });
  };

  const addSupportEmail = () => {
    setSupportEmails([...supportEmails, { email: "", type: "gmail", appPassword: "", inboundEnabled: true, outboundEnabled: true }]);
  };
  const updateSupportEmail = (idx, field, value) => {
    const updated = [...supportEmails];
    updated[idx][field] = value;
    setSupportEmails(updated);
  };
  const removeSupportEmail = (idx) => {
    setSupportEmails(supportEmails.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      if (userType === "company") {
        await axios.put("/api/company/profile", { ...form, supportEmails, workingHours }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Profile updated!");
      } else {
        await axios.put("/api/auth/update-profile", { name: form.name, phone: form.phone }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Profile updated!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  // Shared safe‑area wrapper component
  const SafeAreaWrapper = ({ children }) => (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      {children}
    </div>
  );

  if (loading) {
    return (
      <SafeAreaWrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
        </div>
      </SafeAreaWrapper>
    );
  }

  if (userType !== "company") {
    // Simple user profile
    return (
      <SafeAreaWrapper>
        <ToastContainer
          position="top-center"
          style={{ top: "env(safe-area-inset-top, 0px)" }}
        />
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <FiArrowLeft /> Back
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-2xl font-bold mb-6">My Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label>Full Name</label>
                <input
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border"
                  required
                />
              </div>
              <div>
                <label>Email</label>
                <input value={form.email} disabled className="w-full px-4 py-2 rounded-lg bg-gray-100" />
              </div>
              <div>
                <label>Phone</label>
                <input
                  name="phone"
                  value={form.phone || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save
              </button>
            </form>
          </div>
        </div>
      </SafeAreaWrapper>
    );
  }

  // Company full profile
  return (
    <SafeAreaWrapper>
      <ToastContainer
        position="top-center"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      />
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <FiArrowLeft /> Back
        </button>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <FiBriefcase className="text-indigo-600 text-2xl" />
            <h1 className="text-2xl font-bold">Company Profile</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label>Company Name *</label>
                  <input name="companyName" value={form.companyName || ""} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Contact Person *</label>
                  <input name="contactName" value={form.contactName || ""} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Email *</label>
                  <input name="email" value={form.email || ""} disabled className="w-full px-4 py-2 rounded-lg bg-gray-100" />
                </div>
                <div>
                  <label>Phone *</label>
                  <input name="phone" value={form.phone || ""} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Country *</label>
                  <input name="country" value={form.country || ""} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Address *</label>
                  <textarea name="address" value={form.address || ""} onChange={handleChange} rows="2" className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>PIN Code *</label>
                  <input name="pinCode" value={form.pinCode || ""} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg border" />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4">Business Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label>Business Type</label>
                  <select name="businessType" value={form.businessType || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border">
                    <option value="">Select</option>
                    <option value="Pvt Ltd">Pvt Ltd</option>
                    <option value="LLP">LLP</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                  </select>
                </div>
                <div>
                  <label>Industry</label>
                  <select name="industry" value={form.industry || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border">
                    <option value="">Select</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="IT / Software">IT / Software</option>
                    <option value="Retail">Retail</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Real Estate / Society">Real Estate / Society</option>
                    <option value="Political / Election">Political / Election</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label>GST Number (India)</label>
                  <input name="gstNumber" value={form.gstNumber || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Society Reg No.</label>
                  <input name="societyRegNo" value={form.societyRegNo || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Employee Count</label>
                  <input type="number" name="employeeCount" value={form.employeeCount || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
              </div>
            </div>

            {/* Subscription / Plan */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4">Subscription & Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label>Plan</label>
                  <select name="plan" value={form.plan || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border">
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
                <div>
                  <label>Payment Method</label>
                  <select name="paymentMethod" value={form.paymentMethod || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border">
                    <option value="">Select</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="netbanking">Netbanking</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="qr">QR</option>
                    <option value="cash">Cash</option>
                    <option value="paylater">Pay Later</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <div>
                  <label>Plan Activated At</label>
                  <input type="date" name="planActivatedAt" value={form.planActivatedAt ? form.planActivatedAt.split("T")[0] : ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
                <div>
                  <label>Trial Ends At</label>
                  <input type="date" name="trialEndsAt" value={form.trialEndsAt ? form.trialEndsAt.split("T")[0] : ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
              </div>
            </div>

            {/* Management Type & Dynamic Fields */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4">Management Details</h2>
              <div>
                <label>Management Type</label>
                <select name="managementType" value={form.managementType || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border max-w-md">
                  <option value="erp">ERP</option>
                  <option value="society">Society</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="election">Election</option>
                </select>
              </div>
              {form.managementType === "erp" && (
                <div className="mt-4">
                  <label>ERP Modules</label>
                  <input name="erpModules" value={form.erpModules || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" />
                </div>
              )}
              {form.managementType === "society" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label>Total Flats</label><input type="number" name="totalFlats" value={form.totalFlats || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Committee Name</label><input name="committeeName" value={form.committeeName || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>License Number</label><input name="licenseNumber" value={form.licenseNumber || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                </div>
              )}
              {form.managementType === "healthcare" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label>Facility Type</label><input name="facilityType" value={form.facilityType || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Bed Capacity</label><input type="number" name="bedCapacity" value={form.bedCapacity || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>License Number</label><input name="licenseNumber" value={form.licenseNumber || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                </div>
              )}
              {form.managementType === "education" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label>Institution Code</label><input name="institutionCode" value={form.institutionCode || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Board/University</label><input name="boardOrUniversity" value={form.boardOrUniversity || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Student Capacity</label><input type="number" name="studentCapacity" value={form.studentCapacity || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                </div>
              )}
              {form.managementType === "retail" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label>Store PAN</label><input name="storePan" value={form.storePan || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Outlet Count</label><input type="number" name="outletCount" value={form.outletCount || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Primary Category</label><input name="primaryCategory" value={form.primaryCategory || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                </div>
              )}
              {form.managementType === "election" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label>Constituency Name</label><input name="constituencyName" value={form.constituencyName || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Election Type</label><input name="electionType" value={form.electionType || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Election Date</label><input type="date" name="electionDate" value={form.electionDate ? form.electionDate.split("T")[0] : ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                  <div><label>Booth Count</label><input type="number" name="boothCount" value={form.boothCount || ""} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border" /></div>
                </div>
              )}
            </div>

            {/* Support Emails */}
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-4">Support Emails</h2>
              {supportEmails.map((email, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 border rounded-lg">
                  <input
                    placeholder="Email"
                    value={email.email}
                    onChange={(e) => updateSupportEmail(idx, "email", e.target.value)}
                    className="px-3 py-1 border rounded"
                  />
                  <select
                    value={email.type}
                    onChange={(e) => updateSupportEmail(idx, "type", e.target.value)}
                    className="px-3 py-1 border rounded"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="smtp">SMTP</option>
                  </select>
                  {email.type !== "outlook" && (
                    <input
                      placeholder="App Password"
                      value={email.appPassword}
                      onChange={(e) => updateSupportEmail(idx, "appPassword", e.target.value)}
                      className="px-3 py-1 border rounded"
                    />
                  )}
                  {email.type === "outlook" && (
                    <>
                      <input
                        placeholder="Tenant ID"
                        value={email.tenantId || ""}
                        onChange={(e) => updateSupportEmail(idx, "tenantId", e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                      <input
                        placeholder="Client ID"
                        value={email.clientId || ""}
                        onChange={(e) => updateSupportEmail(idx, "clientId", e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                      <input
                        placeholder="Webhook Secret"
                        value={email.webhookSecret || ""}
                        onChange={(e) => updateSupportEmail(idx, "webhookSecret", e.target.value)}
                        className="px-3 py-1 border rounded"
                      />
                    </>
                  )}
                  <button type="button" onClick={() => removeSupportEmail(idx)} className="text-red-600">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSupportEmail} className="mt-2 flex items-center gap-1 text-indigo-600">
                <FiPlus /> Add Support Email
              </button>
            </div>

            {/* Working Hours */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Working Hours</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label>Start Hour</label>
                  <input
                    type="number"
                    value={workingHours.startHour}
                    onChange={(e) => handleWorkingHoursChange("startHour", parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border"
                  />
                </div>
                <div>
                  <label>End Hour</label>
                  <input
                    type="number"
                    value={workingHours.endHour}
                    onChange={(e) => handleWorkingHoursChange("endHour", parseInt(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border"
                  />
                </div>
                <div>
                  <label>Working Days (0=Sun, 1=Mon, ..., 6=Sat)</label>
                  <input
                    type="text"
                    value={workingHours.workingDays.join(",")}
                    onChange={(e) => handleWorkingHoursChange("workingDays", e.target.value.split(",").map(Number))}
                    placeholder="e.g., 1,2,3,4,5"
                    className="w-full px-4 py-2 rounded-lg border"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save All Changes
            </button>
          </form>
        </div>
      </div>
    </SafeAreaWrapper>
  );
}

// "use client";
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { FiSave, FiArrowLeft, FiLoader, FiUser, FiBriefcase } from "react-icons/fi";

// export default function ProfilePage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [userType, setUserType] = useState(null); // "company" or "user"
//   const [form, setForm] = useState({
//     // Common
//     name: "",
//     email: "",
//     phone: "",
//     // Company specific
//     contactName: "",
//     companyName: "",
//     address: "",
//     pinCode: "",
//     societyRegNo: "",
//     // User specific
//     roles: [],
//   });

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         router.push("/login");
//         return;
//       }

//       try {
//         const storedUser = localStorage.getItem("user");
//         if (!storedUser) throw new Error("No user data");

//         const user = JSON.parse(storedUser);
//         const isCompany = !!user.companyName;
//         setUserType(isCompany ? "company" : "user");

//         if (isCompany) {
//           const res = await axios.get("/api/company/profile", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           if (res.data.success) {
//             const data = res.data.company;
//             setForm({
//               name: data.contactName || data.companyName,
//               email: data.email,
//               phone: data.phone || "",
//               contactName: data.contactName || "",
//               companyName: data.companyName || "",
//               address: data.address || "",
//               pinCode: data.pinCode || "",
//               societyRegNo: data.societyRegNo || "",
//             });
//           }
//         } else {
//           const res = await axios.get("/api/users/profile", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           if (res.data.success) {
//             const data = res.data.user;
//             setForm({
//               name: data.name || "",
//               email: data.email,
//               phone: data.phone || "",
//               roles: data.roles || [],
//             });
//           }
//         }
//       } catch (error) {
//         console.error("Profile fetch error:", error);
//         toast.error("Failed to load profile");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProfile();
//   }, [router]);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     const token = localStorage.getItem("token");

//     try {
//       if (userType === "company") {
//         await axios.put(
//           "/api/company/profile",
//           {
//             contactName: form.contactName,
//             phone: form.phone,
//             address: form.address,
//             pinCode: form.pinCode,
//             societyRegNo: form.societyRegNo,
//           },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
//         localStorage.setItem(
//           "user",
//           JSON.stringify({
//             ...storedUser,
//             contactName: form.contactName,
//             phone: form.phone,
//             address: form.address,
//             pinCode: form.pinCode,
//             societyRegNo: form.societyRegNo,
//           })
//         );
//       } else {
//         await axios.put(
//           "/api/users/profile",
//           { name: form.name, phone: form.phone },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
//         localStorage.setItem(
//           "user",
//           JSON.stringify({ ...storedUser, name: form.name, phone: form.phone })
//         );
//       }
//       toast.success("Profile updated successfully!");
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Update failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <ToastContainer position="top-center" />
//       <div className="max-w-2xl mx-auto">
//         <button
//           onClick={() => router.back()}
//           className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
//         >
//           <FiArrowLeft /> Back
//         </button>

//         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
//           <div className="flex items-center gap-3 mb-6">
//             {userType === "company" ? (
//               <FiBriefcase className="text-indigo-600 text-2xl" />
//             ) : (
//               <FiUser className="text-indigo-600 text-2xl" />
//             )}
//             <h1 className="text-2xl font-bold text-gray-900">
//               {userType === "company" ? "Society Profile" : "My Profile"}
//             </h1>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             {userType === "company" ? (
//               <>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
//                   <input
//                     type="text"
//                     value={form.companyName}
//                     disabled
//                     className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
//                   <input
//                     type="text"
//                     name="contactName"
//                     value={form.contactName}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//                   <input
//                     type="email"
//                     value={form.email}
//                     disabled
//                     className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
//                   <input
//                     type="tel"
//                     name="phone"
//                     value={form.phone}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
//                   <textarea
//                     name="address"
//                     value={form.address}
//                     onChange={handleChange}
//                     rows="2"
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code</label>
//                   <input
//                     type="text"
//                     name="pinCode"
//                     value={form.pinCode}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Society Registration No.</label>
//                   <input
//                     type="text"
//                     name="societyRegNo"
//                     value={form.societyRegNo}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
//                   <input
//                     type="text"
//                     name="name"
//                     value={form.name}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//                   <input
//                     type="email"
//                     value={form.email}
//                     disabled
//                     className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
//                   <input
//                     type="tel"
//                     name="phone"
//                     value={form.phone}
//                     onChange={handleChange}
//                     className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   />
//                 </div>
//                 {form.roles.length > 0 && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
//                     <div className="flex flex-wrap gap-2">
//                       {form.roles.map((role, idx) => (
//                         <span key={idx} className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs">
//                           {role}
//                         </span>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </>
//             )}

//             <button
//               type="submit"
//               disabled={saving}
//               className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
//             >
//               {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
//               {saving ? "Saving..." : "Save Changes"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }