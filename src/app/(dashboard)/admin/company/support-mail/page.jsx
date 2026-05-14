"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";

export default function SupportEmailsPage() {
  const [supportEmails, setSupportEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    type: "gmail",

    appPassword: "",
    inboundEnabled: true,
    outboundEnabled: true,

    tenantId: "",
    clientId: "",
    webhookSecret: "",
  });

  /* ================= AUTH ================= */
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("AUTH_MISSING");
    return { Authorization: `Bearer ${token}` };
  };

  /* ================= FETCH ================= */
  const fetchSupportEmails = async () => {
    try {
      const res = await axios.get("/api/company/support-emails", {
        headers: getAuthHeaders(),
      });
      setSupportEmails(res.data.supportEmails || []);
    } catch {
      alert("Session expired. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportEmails();
  }, []);

  /* ================= RESET ================= */
  const resetForm = () => {
    setForm({
      email: "",
      type: "gmail",
      appPassword: "",
      inboundEnabled: true,
      outboundEnabled: true,
      tenantId: "",
      clientId: "",
      webhookSecret: "",
    });
    setEditingIndex(null);
    setShowForm(false);
    setShowPassword(false);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.type === "outlook") {
      if (
        !form.tenantId ||
        !form.clientId ||
        !form.webhookSecret ||
        !form.appPassword
      ) {
        alert("All Outlook credentials are required");
        return;
      }
    }

    try {
      const headers = getAuthHeaders();

      if (editingIndex !== null) {
        await axios.put(
          "/api/company/support-emails",
          { index: editingIndex, data: form },
          { headers }
        );
      } else {
        await axios.post("/api/company/support-emails", form, { headers });
      }

      fetchSupportEmails();
      resetForm();
    } catch (err) {
      alert(err.response?.data?.msg || "Something went wrong");
    }
  };

  /* ================= EDIT ================= */
  const handleEdit = (item, index) => {
    setForm({
      email: item.email,
      type: item.type,
      appPassword: "",
      inboundEnabled: item.inboundEnabled,
      outboundEnabled: item.outboundEnabled,
      tenantId: item.tenantId || "",
      clientId: item.clientId || "",
      webhookSecret: item.webhookSecret || "",
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (index) => {
    if (!confirm("Delete this support email?")) return;
    await axios.delete(`/api/company/support-emails?index=${index}`, {
      headers: getAuthHeaders(),
    });
    fetchSupportEmails();
  };

  if (loading) return <p className="p-6">Loading...</p>;

  const isOutlook = form.type === "outlook";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Support Emails</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded"
        >
          <Plus size={16} /> Add Email
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {supportEmails.map((item, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{item.email}</p>
              <p className="text-sm text-gray-500">
                {item.type.toUpperCase()} · Inbound:{" "}
                {item.inboundEnabled ? "ON" : "OFF"} · Outbound:{" "}
                {item.outboundEnabled ? "ON" : "OFF"}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleEdit(item, index)}>
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDelete(index)}
                className="text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white w-full max-w-md rounded-lg p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">
              {editingIndex !== null ? "Edit Support Email" : "Add Support Email"}
            </h2>

            <input
              type="email"
              placeholder="support@company.com"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
              className="w-full border px-3 py-2 rounded"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
              className="w-full border px-3 py-2 rounded"
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook (Microsoft 365)</option>
              <option value="smtp">SMTP</option>
            </select>

            {/* Secret */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={
                  isOutlook
                    ? "Client Secret (Microsoft)"
                    : "App / SMTP Password"
                }
                value={form.appPassword}
                onChange={(e) =>
                  setForm({ ...form, appPassword: e.target.value })
                }
                required
                className="w-full border px-3 py-2 rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2.5 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* OUTLOOK FIELDS – ALWAYS VISIBLE */}
            <div className={`border rounded p-3 space-y-2 ${isOutlook ? "" : "opacity-50"}`}>
              <p className="text-sm font-medium">Outlook Webhook Credentials</p>

              <input
                type="text"
                placeholder="Tenant ID"
                value={form.tenantId}
                disabled={!isOutlook}
                onChange={(e) =>
                  setForm({ ...form, tenantId: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <input
                type="text"
                placeholder="Client ID"
                value={form.clientId}
                disabled={!isOutlook}
                onChange={(e) =>
                  setForm({ ...form, clientId: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />

              <input
                type="text"
                placeholder="Webhook Secret"
                value={form.webhookSecret}
                disabled={!isOutlook}
                onChange={(e) =>
                  setForm({ ...form, webhookSecret: e.target.value })
                }
                className="w-full border px-3 py-2 rounded"
              />
            </div>

            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.inboundEnabled}
                  onChange={(e) =>
                    setForm({ ...form, inboundEnabled: e.target.checked })
                  }
                />
                Inbound Enabled
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.outboundEnabled}
                  onChange={(e) =>
                    setForm({ ...form, outboundEnabled: e.target.checked })
                  }
                />
                Outbound Enabled
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";

// export default function SupportEmailsPage() {
//   const [supportEmails, setSupportEmails] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [editingIndex, setEditingIndex] = useState(null);
//   const [showPassword, setShowPassword] = useState(false);

//   const [form, setForm] = useState({
//     email: "",
//     type: "gmail",
//     appPassword: "",
//     inboundEnabled: true,
//     outboundEnabled: true,
//   });

//   /** ================= TOKEN ================= */
//   const getAuthHeaders = () => {
//     const token = localStorage.getItem("token");
//     if (!token) throw new Error("AUTH_MISSING");
//     return { Authorization: `Bearer ${token}` };
//   };

//   /** ================= FETCH ================= */
//   const fetchSupportEmails = async () => {
//     try {
//       const res = await axios.get("/api/company/support-emails", {
//         headers: getAuthHeaders(),
//       });
//       setSupportEmails(res.data.supportEmails || []);
//     } catch (err) {
//       if (err.message === "AUTH_MISSING") {
//         alert("Please login again");
//       } else {
//         console.error(err);
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSupportEmails();
//   }, []);

//   /** ================= RESET ================= */
//   const resetForm = () => {
//     setForm({
//       email: "",
//       type: "gmail",
//       appPassword: "",
//       inboundEnabled: true,
//       outboundEnabled: true,
//     });
//     setEditingIndex(null);
//     setShowForm(false);
//     setShowPassword(false);
//   };

//   /** ================= SUBMIT ================= */
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       const headers = getAuthHeaders();

//       if (editingIndex !== null) {
//         await axios.put(
//           "/api/company/support-emails",
//           {
//             index: editingIndex,
//             data: form,
//           },
//           { headers }
//         );
//       } else {
//         await axios.post("/api/company/support-emails", form, { headers });
//       }

//       fetchSupportEmails();
//       resetForm();
//     } catch (err) {
//       if (err.message === "AUTH_MISSING") {
//         alert("Please login again");
//       } else {
//         alert(err.response?.data?.msg || "Something went wrong");
//       }
//     }
//   };

//   /** ================= EDIT ================= */
//   const handleEdit = (item, index) => {
//     setForm({
//       email: item.email,
//       type: item.type,
//       appPassword: "",
//       inboundEnabled: item.inboundEnabled,
//       outboundEnabled: item.outboundEnabled,
//     });
//     setEditingIndex(index);
//     setShowForm(true);
//   };

//   /** ================= DELETE ================= */
//   const handleDelete = async (index) => {
//     if (!confirm("Delete this support email?")) return;

//     try {
//       await axios.delete(`/api/company/support-emails?index=${index}`, {
//         headers: getAuthHeaders(),
//       });
//       fetchSupportEmails();
//     } catch (err) {
//       alert(err.response?.data?.msg || "Delete failed");
//     }
//   };

//   /** ================= UI ================= */
//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="p-6 max-w-5xl mx-auto">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-semibold">Support Emails</h1>
//         <button
//           onClick={() => setShowForm(true)}
//           className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded"
//         >
//           <Plus size={16} /> Add Email
//         </button>
//       </div>

//       {/* ================= LIST ================= */}
//       <div className="space-y-4">
//         {supportEmails.map((item, index) => (
//           <div
//             key={index}
//             className="border rounded-lg p-4 flex justify-between items-center"
//           >
//             <div>
//               <p className="font-medium">{item.email}</p>
//               <p className="text-sm text-gray-500">
//                 {item.type.toUpperCase()} · Inbound:{" "}
//                 {item.inboundEnabled ? "ON" : "OFF"} · Outbound:{" "}
//                 {item.outboundEnabled ? "ON" : "OFF"}
//               </p>
//             </div>

//             <div className="flex gap-3">
//               <button onClick={() => handleEdit(item, index)}>
//                 <Edit size={18} />
//               </button>
//               <button
//                 onClick={() => handleDelete(index)}
//                 className="text-red-500"
//               >
//                 <Trash2 size={18} />
//               </button>
//             </div>
//           </div>
//         ))}

//         {supportEmails.length === 0 && (
//           <p className="text-gray-500">No support emails added</p>
//         )}
//       </div>

//       {/* ================= MODAL ================= */}
//       {showForm && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//           <form
//             onSubmit={handleSubmit}
//             className="bg-white w-full max-w-md rounded-lg p-6 space-y-4"
//           >
//             <h2 className="text-lg font-semibold">
//               {editingIndex !== null ? "Edit Support Email" : "Add Support Email"}
//             </h2>

//             <input
//               type="email"
//               placeholder="support@company.com"
//               value={form.email}
//               onChange={(e) =>
//                 setForm({ ...form, email: e.target.value })
//               }
//               required
//               className="w-full border px-3 py-2 rounded"
//             />

//             <select
//               value={form.type}
//               onChange={(e) => setForm({ ...form, type: e.target.value })}
//               className="w-full border px-3 py-2 rounded"
//             >
//               <option value="gmail">Gmail</option>
//               <option value="outlook">Outlook</option>
//               <option value="smtp">SMTP</option>
//             </select>

//             <div className="relative">
//               <input
//                 type={showPassword ? "text" : "password"}
//                 placeholder="App Password"
//                 value={form.appPassword}
//                 onChange={(e) =>
//                   setForm({ ...form, appPassword: e.target.value })
//                 }
//                 required={editingIndex === null}
//                 className="w-full border px-3 py-2 rounded pr-10"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-2 top-2.5 text-gray-500"
//               >
//                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//               </button>
//             </div>

//             <div className="flex gap-6 text-sm">
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={form.inboundEnabled}
//                   onChange={(e) =>
//                     setForm({ ...form, inboundEnabled: e.target.checked })
//                   }
//                 />
//                 Inbound Enabled
//               </label>

//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={form.outboundEnabled}
//                   onChange={(e) =>
//                     setForm({ ...form, outboundEnabled: e.target.checked })
//                   }
//                 />
//                 Outbound Enabled
//               </label>
//             </div>

//             <div className="flex justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={resetForm}
//                 className="px-4 py-2 border rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="px-4 py-2 bg-black text-white rounded"
//               >
//                 Save
//               </button>
//             </div>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }
