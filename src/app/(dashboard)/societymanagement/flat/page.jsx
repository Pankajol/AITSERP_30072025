"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiHome } from "react-icons/fi";

const FIELDS = [
  { name: "societyId", label: "Society *", type: "select", required: true, options: [] },
  { name: "buildingId", label: "Building", type: "select", options: [] },   // ✅ नया
  { name: "block", label: "Block", type: "text" },
  { name: "floor", label: "Floor", type: "text" },
  { name: "flatNumber", label: "Flat Number *", type: "text", required: true },
  { name: "flatType", label: "Flat Type", type: "select", options: [
    { value: "1BHK", label: "1BHK" },
    { value: "2BHK", label: "2BHK" },
    { value: "3BHK", label: "3BHK" },
    { value: "Penthouse", label: "Penthouse" },
    { value: "Office", label: "Office" },
  ]},
  { name: "area", label: "Area (sqft)", type: "number" },
];

export default function FlatPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);   // ✅ building dropdown
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/societymanagement/flat", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setRecords(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const options = data.data.map(s => ({ value: s._id, label: s.name }));
        FIELDS.find(f => f.name === "societyId").options = options;
        setSocieties(options);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // ✅ Fetch buildings for selected society
  const fetchBuildings = async (societyId) => {
    if (!societyId) {
      setBuildings([]);
      return;
    }
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const options = data.data.map(b => ({ value: b._id, label: b.name }));
        setBuildings(options);
        FIELDS.find(f => f.name === "buildingId").options = options;
      } else {
        setBuildings([]);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); fetchSocieties(); }, [fetchData, fetchSocieties]);

  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setError("");
    setBuildings([]);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      societyId: item.societyId?._id || item.societyId || "",
      buildingId: item.buildingId?._id || item.buildingId || "",
      block: item.block || "",
      floor: item.floor || "",
      flatNumber: item.flatNumber || "",
      flatType: item.flatType || "",
      area: item.area || "",
    });
    if (item.societyId) fetchBuildings(item.societyId._id || item.societyId);  // pre-load buildings
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === "societyId") {
      fetchBuildings(value);
      setForm(prev => ({ ...prev, buildingId: "" })); // reset building
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.societyId || !form.flatNumber) {
      setError("Society and Flat Number are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      if (editingId) {
        await axios.put(`/api/societymanagement/flat?id=${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/societymanagement/flat", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this flat?")) return;
    await axios.delete(`/api/societymanagement/flat?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecords(prev => prev.filter(r => r._id !== id));
  };

  const filtered = useMemo(() =>
    records.filter(r =>
      !search ||
      r.flatNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.block?.toLowerCase().includes(search.toLowerCase()) ||
      r.societyId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.buildingId?.name?.toLowerCase().includes(search.toLowerCase())
    ), [records, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Flats / Units</h1>
          <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Flat
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search flat number, block, society..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
              <div className="flex gap-1.5">
                {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiHome className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No flats yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Flat" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.flatNumber}</h3>
                  <p className="text-sm text-gray-500">
                    {item.buildingId?.name ? item.buildingId.name : item.block}{" "}
                    {item.floor ? `Floor ${item.floor}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{item.societyId?.name || "—"}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleDelete(item._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.flatType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {item.flatType}
                  </span>
                )}
                {item.area && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-50 text-green-600 border border-green-100">
                    {item.area} sqft
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><FiHome className="text-white text-base" /></div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Flat" : "New Flat"}</h2>
                  <p className="text-xs text-gray-400">{editingId ? "Update flat details" : "Enter flat information"}</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><FiX className="text-red-500" /><p className="text-sm text-red-600">{error}</p></div>}
                {FIELDS.map(field => {
                  let options = field.options;
                  if (field.name === "societyId") options = societies;
                  else if (field.name === "buildingId") options = buildings;

                  return (
                    <div key={field.name}>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
                      {field.type === "select" ? (
                        <select name={field.name} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                          <option value="">Select...</option>
                          {options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input name={field.name} type={field.type} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                          placeholder={`Enter ${field.label.replace(" *","")}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}>
                  {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






// "use client";
// import { useState, useEffect, useCallback, useMemo } from "react";
// import axios from "axios";
// import {
//   FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiHome
// } from "react-icons/fi";

// const FIELDS = [
//   { name: "societyId", label: "Society *", type: "select", required: true, options: [] }, // populated
//   { name: "block", label: "Block", type: "text" },
//   { name: "floor", label: "Floor", type: "text" },
//   { name: "flatNumber", label: "Flat Number *", type: "text", required: true },
//   { name: "flatType", label: "Flat Type", type: "select", options: [
//     { value: "1BHK", label: "1BHK" },
//     { value: "2BHK", label: "2BHK" },
//     { value: "3BHK", label: "3BHK" },
//     { value: "Penthouse", label: "Penthouse" },
//     { value: "Office", label: "Office" },
//   ]},
//   { name: "area", label: "Area (sqft)", type: "number" },
// ];

// export default function FlatPage() {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [search, setSearch] = useState("");
//   const [modalOpen, setModalOpen] = useState(false);
//   const [form, setForm] = useState({});
//   const [editingId, setEditingId] = useState(null);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [societies, setSocieties] = useState([]); // for dropdown
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;



  
//   // Fetch flats
//   const fetchData = useCallback(async () => {
//     if (!token) return;
//     setLoading(true);
//     try {
//       const { data } = await axios.get("/api/societymanagement/flat", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) setRecords(data.data);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   }, [token]);

//   // Fetch societies for dropdown
//   const fetchSocieties = useCallback(async () => {
//     try {
//       const { data } = await axios.get("/api/societymanagement/society", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (data.success) {
//         const options = data.data.map(s => ({ value: s._id, label: s.name }));
//         FIELDS.find(f => f.name === "societyId").options = options;
//         setSocieties(options);
//       }
//     } catch (e) { console.error(e); }
//   }, [token]);

//   useEffect(() => {
//     fetchData();
//     fetchSocieties();
//   }, [fetchData, fetchSocieties]);

//   const resetForm = () => {
//     setForm({});
//     setEditingId(null);
//     setError("");
//   };

//   const openCreate = () => {
//     resetForm();
//     setModalOpen(true);
//   };

//   const openEdit = (item) => {
//     setEditingId(item._id);
//     setForm({
//       societyId: item.societyId?._id || item.societyId || "",
//       block: item.block || "",
//       floor: item.floor || "",
//       flatNumber: item.flatNumber || "",
//       flatType: item.flatType || "",
//       area: item.area || "",
//     });
//     setModalOpen(true);
//   };

//   const handleFieldChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.societyId || !form.flatNumber) {
//       setError("Society and Flat Number are required.");
//       return;
//     }
//     setSaving(true);
//     setError("");
//     try {
//       if (editingId) {
//         await axios.put(`/api/societymanagement/flat?id=${editingId}`, form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         await axios.post("/api/societymanagement/flat", form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }
//       resetForm();
//       setModalOpen(false);
//       fetchData();
//     } catch (err) {
//       setError(err.response?.data?.message || "Error saving");
//     } finally { setSaving(false); }
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Delete this flat?")) return;
//     await axios.delete(`/api/societymanagement/flat?id=${id}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setRecords(prev => prev.filter(r => r._id !== id));
//   };

//   const filtered = useMemo(() =>
//     records.filter(r =>
//       !search ||
//       r.flatNumber?.toLowerCase().includes(search.toLowerCase()) ||
//       r.block?.toLowerCase().includes(search.toLowerCase()) ||
//       r.societyId?.name?.toLowerCase().includes(search.toLowerCase())
//     ), [records, search]);

//   return (
//     <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
//         <div>
//           <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Flats / Units</h1>
//           <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
//         </div>
//         <button
//           onClick={openCreate}
//           className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
//         >
//           <FiPlus className="text-base" /> Add Flat
//         </button>
//       </div>

//       {/* Search */}
//       <div className="relative mb-5 max-w-sm">
//         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
//         <input
//           className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//           value={search} onChange={e => setSearch(e.target.value)}
//           placeholder="Search flat number, block, society..."
//         />
//       </div>

//       {/* Grid */}
//       {loading ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {Array(6).fill(0).map((_, i) => (
//             <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
//               <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
//               <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
//               <div className="flex gap-1.5">
//                 {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="flex flex-col items-center justify-center py-20 text-center">
//           <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
//             <FiHome className="text-3xl text-indigo-300" />
//           </div>
//           <p className="text-gray-400 font-medium">{search ? "No matches" : "No flats yet"}</p>
//           {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Flat" to create one</p>}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//           {filtered.map(item => (
//             <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
//               <div className="flex items-start justify-between mb-2">
//                 <div>
//                   <h3 className="text-base font-bold text-gray-900">{item.flatNumber}</h3>
//                   <p className="text-sm text-gray-500">{item.block ? `Block ${item.block}, ` : ""}{item.floor ? `Floor ${item.floor}` : ""}</p>
//                   <p className="text-xs text-gray-400">{item.societyId?.name || "No Society"}</p>
//                 </div>
//                 <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
//                   <button onClick={() => openEdit(item)}
//                     className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
//                     <FiEdit2 className="text-xs" />
//                   </button>
//                   <button onClick={() => handleDelete(item._id)}
//                     className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
//                     <FiTrash2 className="text-xs" />
//                   </button>
//                 </div>
//               </div>
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 {item.flatType && (
//                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
//                     {item.flatType}
//                   </span>
//                 )}
//                 {item.area && (
//                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-50 text-green-600 border border-green-100">
//                     {item.area} sqft
//                   </span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
//             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
//                   <FiHome className="text-white text-base" />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-bold text-gray-900">
//                     {editingId ? "Edit Flat" : "New Flat"}
//                   </h2>
//                   <p className="text-xs text-gray-400">
//                     {editingId ? "Update flat details" : "Enter flat information"}
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => { setModalOpen(false); resetForm(); }}
//                 className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
//               >
//                 <FiX />
//               </button>
//             </div>

//             <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
//               <div className="px-6 py-5 space-y-4">
//                 {error && (
//                   <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
//                     <FiX className="text-red-500 flex-shrink-0" />
//                     <p className="text-sm text-red-600 font-medium">{error}</p>
//                   </div>
//                 )}
//                 {FIELDS.map(field => (
//                   <div key={field.name}>
//                     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                       {field.label}
//                     </label>
//                     {field.type === "select" ? (
//                       <select
//                         name={field.name}
//                         value={form[field.name] || ""}
//                         onChange={handleFieldChange}
//                         required={field.required}
//                         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
//                       >
//                         <option value="">Select...</option>
//                         {field.options?.map(opt => (
//                           <option key={opt.value} value={opt.value}>{opt.label}</option>
//                         ))}
//                       </select>
//                     ) : (
//                       <input
//                         name={field.name}
//                         type={field.type}
//                         value={form[field.name] || ""}
//                         onChange={handleFieldChange}
//                         required={field.required}
//                         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//                         placeholder={`Enter ${field.label.replace(" *","")}`}
//                       />
//                     )}
//                   </div>
//                 ))}
//               </div>
//               <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
//                 <button
//                   type="button"
//                   onClick={() => { setModalOpen(false); resetForm(); }}
//                   className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={saving}
//                   className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
//                     saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
//                   }`}
//                 >
//                   {saving ? (
//                     <>
//                       <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
//                       Saving...
//                     </>
//                   ) : (
//                     <>
//                       <FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}
//                     </>
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }