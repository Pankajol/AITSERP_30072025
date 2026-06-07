"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiClock } from "react-icons/fi";

const FIELDS = [
  { name: "name", label: "Shift Name *", type: "text", required: true },
  { name: "startTime", label: "Start Time *", type: "time", required: true },
  { name: "endTime", label: "End Time *", type: "time", required: true },
  { name: "gracePeriod", label: "Grace Period (min)", type: "number", default: 10 },
  { name: "weeklyOffs", label: "Weekly Offs (comma separated)", type: "text", placeholder: "Sunday, Saturday" },
];

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ gracePeriod: 10 });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/hr/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setShifts(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const resetForm = () => {
    setForm({ gracePeriod: 10 });
    setEditingId(null);
    setError("");
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (shift) => {
    setEditingId(shift._id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod || 10,
      weeklyOffs: (shift.weeklyOffs || []).join(", "),
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime) {
      setError("Name, Start Time, End Time are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      // weeklyOffs string को array में बदलो
      if (typeof payload.weeklyOffs === "string") {
        payload.weeklyOffs = payload.weeklyOffs.split(",").map(s => s.trim()).filter(Boolean);
      }
      if (editingId) {
        await axios.put(`/api/hr/shifts?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/hr/shifts", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchShifts();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this shift?")) return;
    await axios.delete(`/api/hr/shifts?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setShifts(prev => prev.filter(s => s._id !== id));
  };

  const filtered = useMemo(() =>
    shifts.filter(s =>
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase())
    ), [shifts, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Shifts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{shifts.length} shifts</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Shift
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search shift name..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiClock className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No shifts yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Shift" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(shift => (
            <div key={shift._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{shift.name}</h3>
                  <p className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</p>
                  <p className="text-xs text-gray-400">Grace: {shift.gracePeriod || 10} min</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(shift)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleDelete(shift._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
              {shift.weeklyOffs?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {shift.weeklyOffs.map(day => (
                    <span key={day} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                      {day}
                    </span>
                  ))}
                </div>
              )}
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
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><FiClock className="text-white text-base" /></div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Shift" : "New Shift"}</h2>
                  <p className="text-xs text-gray-400">Define working hours & offs</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl flex items-center gap-2"><FiX /> {error}</div>}
                {FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
                    <input
                      name={field.name}
                      type={field.type}
                      value={form[field.name] || ""}
                      onChange={handleFieldChange}
                      required={field.required}
                      step={field.type === "number" ? "1" : ""}
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                      placeholder={field.placeholder || `Enter ${field.label.replace(" *","")}`}
                    />
                  </div>
                ))}
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

// import { useEffect, useState } from "react";

// export default function ShiftsPage() {
//   const token = ()=> localStorage.getItem("token")||"";
//   const [user, setUser] = useState(null);
//   const can = (a)=>{ if(!user) return false; if(user.role==="Admin"||user.type==="company") return true; return user.permissions?.shifts?.includes(a); };
//   useEffect(()=>{ const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); },[]);
//   const [items, setItems]  = useState([]);
//   const [loading, setLoading]=useState(true);
//   const [show, setShow]    = useState(false);
//   const [form, setForm]    = useState({ weeklyOffs:[] });
//   const [saving, setSaving]=useState(false);
//   const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
 
//   useEffect(()=>{ load(); },[]);
//   async function load() {
//     setLoading(true);
//     const res=await fetch("/api/hr/shifts",{headers:{Authorization:`Bearer ${token()}`}});
//     const data=await res.json(); setItems(data.data||[]); setLoading(false);
//   }
//   async function save() {
//     setSaving(true);
//     const url=form._id?`/api/hr/shifts/${form._id}`:"/api/hr/shifts";
//     const res=await fetch(url,{method:form._id?"PUT":"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(form)});
//     const data=await res.json();
//     if(data.success){setShow(false);load();}else alert(data.message);
//     setSaving(false);
//   }
//   async function del(id){ if(!confirm("Delete?")) return; await fetch(`/api/hr/shifts/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}}); load(); }
//   const toggleDay=(day)=>{
//     const off=form.weeklyOffs||[];
//     setForm({...form,weeklyOffs:off.includes(day)?off.filter(d=>d!==day):[...off,day]});
//   };
 
//   return (
//     <div style={S.page}>
//       <div style={S.topBar}>
//         <div><p style={S.bc}>HR / Shifts</p><h1 style={S.title}>Shift Management</h1></div>
//         <div style={S.acts}>{can("create")&&<button style={{...S.btn,background:"#f97316"}} onClick={()=>{setForm({weeklyOffs:[]});setShow(true)}}>+ Add Shift</button>}</div>
//       </div>
//       {loading ? <div style={{padding:"4rem",textAlign:"center",color:"#64748b"}}>Loading…</div> : (
//         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1rem"}}>
//           {items.map(s=>(
//             <div key={s._id} style={{background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",padding:"1.5rem",position:"relative"}}>
//               <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
//                 <div style={{width:44,height:44,background:"#f9731622",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>⏰</div>
//                 <div>
//                   <div style={{fontWeight:700,color:"#f1f5f9"}}>{s.name}</div>
//                   <div style={{color:"#f97316",fontWeight:600}}>{s.startTime} – {s.endTime}</div>
//                 </div>
//               </div>
//               <div style={{fontSize:"0.8rem",color:"#64748b",marginBottom:"0.5rem"}}>Grace: {s.gracePeriod} min</div>
//               <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>
//                 {DAYS.map(d=>(
//                   <span key={d} style={{background:s.weeklyOffs?.includes(d)?"#ef444422":"#0f172a",color:s.weeklyOffs?.includes(d)?"#ef4444":"#475569",borderRadius:"4px",padding:"0.15rem 0.4rem",fontSize:"0.7rem"}}>{d.slice(0,3)}</span>
//                 ))}
//               </div>
//               <div style={{position:"absolute",top:"1rem",right:"1rem",display:"flex",gap:"0.4rem"}}>
//                 {can("update")&&<button style={S.ib} onClick={()=>{setForm({...s,weeklyOffs:s.weeklyOffs||[]});setShow(true)}}>✏️</button>}
//                 {can("delete")&&<button style={{...S.ib,color:"#ef4444"}} onClick={()=>del(s._id)}>🗑</button>}
//               </div>
//             </div>
//           ))}
//           {!items.length&&<div style={{color:"#64748b",padding:"2rem"}}>No shifts configured</div>}
//         </div>
//       )}
//       {show&&(
//         <div style={S.overlay}><div style={S.modal}>
//           <div style={S.mHead}><h2 style={{margin:0,color:"#f1f5f9"}}>{form._id?"Edit":"Add"} Shift</h2><button style={S.cls} onClick={()=>setShow(false)}>✕</button></div>
//           <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
//             <div style={{gridColumn:"1/-1"}}><label style={S.lbl}>Shift Name *</label><input style={S.inp2} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></div>
//             <div><label style={S.lbl}>Start Time</label><input type="time" style={S.inp2} value={form.startTime||""} onChange={e=>setForm({...form,startTime:e.target.value})} /></div>
//             <div><label style={S.lbl}>End Time</label><input type="time" style={S.inp2} value={form.endTime||""} onChange={e=>setForm({...form,endTime:e.target.value})} /></div>
//             <div><label style={S.lbl}>Grace Period (min)</label><input type="number" style={S.inp2} value={form.gracePeriod||10} onChange={e=>setForm({...form,gracePeriod:e.target.value})} /></div>
//             <div style={{gridColumn:"1/-1"}}>
//               <label style={S.lbl}>Weekly Offs</label>
//               <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginTop:"0.35rem"}}>
//                 {DAYS.map(d=>(
//                   <button key={d} onClick={()=>toggleDay(d)} style={{background:(form.weeklyOffs||[]).includes(d)?"#ef444422":"#0f172a",border:`1px solid ${(form.weeklyOffs||[]).includes(d)?"#ef4444":"#334155"}`,borderRadius:"6px",padding:"0.3rem 0.6rem",cursor:"pointer",color:(form.weeklyOffs||[]).includes(d)?"#ef4444":"#64748b",fontSize:"0.8rem"}}>{d.slice(0,3)}</button>
//                 ))}
//               </div>
//             </div>
//           </div>
//           <div style={{display:"flex",justifyContent:"flex-end",gap:"0.75rem",padding:"0 1.5rem 1.5rem"}}>
//             <button style={S.cancelBtn} onClick={()=>setShow(false)}>Cancel</button>
//             <button style={{...S.btn,background:"#f97316"}} onClick={save} disabled={saving}>{saving?"…":"Save"}</button>
//           </div>
//         </div></div>
//       )}
//     </div>
//   );
// }
// const S = {
//   page:      { padding:"2rem",background:"#0f172a",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0" },
//   topBar:    { display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem" },
//   bc:        { fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",margin:0 },
//   title:     { fontSize:"1.75rem",fontWeight:800,color:"#f1f5f9",margin:0 },
//   mon:       { color:"#64748b",fontSize:"1.1rem",fontWeight:400 },
//   acts:      { display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center" },
//   btn:       { color:"#fff",border:"none",borderRadius:"8px",padding:"0.5rem 1.25rem",fontWeight:600,cursor:"pointer",fontSize:"0.85rem" },
//   inp:       { background:"#1e293b",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.85rem",outline:"none" },
//   statsRow:  { display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap" },
//   stat:      { flex:1,minWidth:140,background:"#1e293b",border:"1px solid",borderRadius:"12px",padding:"1rem 1.25rem" },
//   tableWrap: { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",overflow:"auto" },
//   table:     { width:"100%",borderCollapse:"collapse" },
//   th:        { padding:"0.9rem 1rem",textAlign:"left",fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #334155" },
//   tr:        { borderBottom:"1px solid #0f172a" },
//   td:        { padding:"0.85rem 1rem",fontSize:"0.875rem",color:"#cbd5e1" },
//   badge:     { borderRadius:"6px",padding:"0.2rem 0.6rem",fontSize:"0.75rem",fontWeight:600 },
//   ib:        { background:"#0f172a",border:"1px solid #334155",borderRadius:"6px",padding:"0.3rem 0.6rem",cursor:"pointer",fontSize:"0.85rem" },
//   overlay:   { position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 },
//   modal:     { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",width:"100%",maxWidth:520 },
//   mHead:     { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1.25rem 1.5rem",borderBottom:"1px solid #334155" },
//   cls:       { background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:"1.2rem" },
//   lbl:       { display:"block",fontSize:"0.75rem",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.35rem" },
//   inp2:      { width:"100%",background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.875rem",outline:"none",boxSizing:"border-box" },
//   cancelBtn: { background:"transparent",border:"1px solid #334155",color:"#94a3b8",borderRadius:"8px",padding:"0.5rem 1.25rem",cursor:"pointer" },
// };