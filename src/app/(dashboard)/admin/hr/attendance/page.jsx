// src/app/(dashboard)/admin/hr/attendance/page.jsx
"use client";
import { useEffect, useState } from "react";

function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => { const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); }, []);
  const token = () => typeof window!=="undefined" ? localStorage.getItem("token") : "";
  const can = (action) => {
    if (!user) return false;
    if (user.role === "Admin" || user.type === "company") return true;
    return user.permissions?.attendance?.includes(action);
  };
  return { user, token, can };
}

const STATUS_COLORS = { Present:"#10b981", "Half Day":"#f59e0b", Absent:"#ef4444", "Geo-Violation":"#8b5cf6" };

export default function AttendancePage() {
  const { token, can } = useAuth();
  const [records, setRecords]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [date, setDate]           = useState(new Date().toISOString().slice(0,10));
  const [empFilter, setEmpFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editRec, setEditRec]     = useState(null);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);

  useEffect(() => { loadData(); }, [date]);

  async function loadData() {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([
        fetch(`/api/hr/attendance?date=${date}`, { headers:{ Authorization:`Bearer ${token()}` } }),
        fetch(`/api/hr/employees?status=Active`,  { headers:{ Authorization:`Bearer ${token()}` } }),
      ]);
      const [a, e] = await Promise.all([aRes.json(), eRes.json()]);
      setRecords(a.data || []);
      setEmployees(e.data || []);
    } finally { setLoading(false); }
  }

  function openCreate() {
    setEditRec(null);
    setForm({ date, status:"Present" });
    setShowModal(true);
  }

  function openEdit(rec) {
    setEditRec(rec);
    setForm({
      employeeId: rec.employeeId?._id || rec.employeeId,
      date: rec.date, status: rec.status,
      "punchIn.time": rec.punchIn?.time, "punchOut.time": rec.punchOut?.time,
      totalHours: rec.totalHours,
    });
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        employeeId: form.employeeId, date: form.date, status: form.status,
        totalHours: Number(form.totalHours)||0,
        punchIn: { time: form["punchIn.time"] },
        punchOut: { time: form["punchOut.time"] },
      };
      const url    = editRec ? `/api/hr/attendance/${editRec._id}` : "/api/hr/attendance";
      const method = editRec ? "PUT" : "POST";
      const res    = await fetch(url,{ method, headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify(body) });
      const data   = await res.json();
      if (data.success) { setShowModal(false); loadData(); }
      else alert(data.message);
    } finally { setSaving(false); }
  }

  async function del(id) {
    if(!confirm("Delete record?")) return;
    await fetch(`/api/hr/attendance/${id}`,{ method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
    loadData();
  }

  const filtered = records.filter(r => {
    const name = r.employeeId?.fullName || "";
    return !empFilter || name.toLowerCase().includes(empFilter.toLowerCase());
  });

  // Summary counts
  const summary = { Present:0, "Half Day":0, Absent:0, "Geo-Violation":0 };
  records.forEach(r => { if(summary[r.status]!==undefined) summary[r.status]++; });

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div>
          <p style={S.breadcrumb}>HR / Attendance</p>
          <h1 style={S.title}>Attendance</h1>
        </div>
        <div style={S.actions}>
          <input type="date" style={S.input} value={date} onChange={e=>setDate(e.target.value)} />
          <input style={S.search} placeholder="Filter by employee…" value={empFilter} onChange={e=>setEmpFilter(e.target.value)} />
          {can("create") && <button style={S.btn} onClick={openCreate}>+ Add Record</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={S.summaryBar}>
        {Object.entries(summary).map(([status,count])=>(
          <div key={status} style={{...S.summaryCard, borderColor: STATUS_COLORS[status]+"80"}}>
            <div style={{...S.summaryDot, background: STATUS_COLORS[status]}} />
            <div>
              <div style={{fontSize:"1.5rem",fontWeight:700,color:"#1e293b"}}>{count}</div>
              <div style={{fontSize:"0.75rem",color:"#64748b"}}>{status}</div>
            </div>
          </div>
        ))}
        <div style={{...S.summaryCard, borderColor:"#cbd5e1"}}>
          <div style={{...S.summaryDot, background:"#94a3b8"}} />
          <div>
            <div style={{fontSize:"1.5rem",fontWeight:700,color:"#1e293b"}}>{records.length}</div>
            <div style={{fontSize:"0.75rem",color:"#64748b"}}>Total Marked</div>
          </div>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Employee","Date","Punch In","Punch Out","Hours","Status","Geofence","Actions"].map(h=>(
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(rec=>(
                <tr key={rec._id} style={S.tr}>
                  <td style={S.td}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                      <div style={{...S.avatar,background:stringColor(rec.employeeId?.fullName)}}>{rec.employeeId?.fullName?.[0]}</div>
                      <span style={{color:"#0f172a",fontWeight:500}}>{rec.employeeId?.fullName||"—"}</span>
                    </div>
                   </td>
                  <td style={S.td}>{rec.date}</td>
                  <td style={S.td}>{rec.punchIn?.time||"—"}</td>
                  <td style={S.td}>{rec.punchOut?.time||"—"}</td>
                  <td style={S.td}>{rec.totalHours ? `${rec.totalHours}h` : "—"}</td>
                  <td style={S.td}><span style={{...S.badge, background:STATUS_COLORS[rec.status]+"20", color:STATUS_COLORS[rec.status]}}>{rec.status}</span></td>
                  <td style={S.td}>
                    <span style={{fontSize:"1rem"}}>{rec.punchIn?.withinGeofence===false||rec.punchOut?.withinGeofence===false?"⚠️":"✅"}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{display:"flex",gap:"0.5rem"}}>
                      {can("update") && <button style={S.iconBtn} onClick={()=>openEdit(rec)}>✏️</button>}
                      {can("delete") && <button style={{...S.iconBtn,color:"#dc2626"}} onClick={()=>del(rec._id)}>🗑</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8} style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>No attendance records for this date</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHead}>
              <h2 style={{margin:0,color:"#0f172a"}}>{editRec?"Edit Record":"Add Attendance"}</h2>
              <button style={S.closeBtn} onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={S.label}>Employee *</label>
                <select style={S.sinput} value={form.employeeId||""} onChange={e=>setForm({...form,employeeId:e.target.value})}>
                  <option value="">-- Select Employee --</option>
                  {employees.map(e=><option key={e._id} value={e._id}>{e.fullName} ({e.employeeCode})</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Date *</label>
                <input type="date" style={S.sinput} value={form.date||""} onChange={e=>setForm({...form,date:e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Status</label>
                <select style={S.sinput} value={form.status||""} onChange={e=>setForm({...form,status:e.target.value})}>
                  {["Present","Half Day","Absent","Geo-Violation"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Punch In Time</label>
                <input type="time" style={S.sinput} value={form["punchIn.time"]||""} onChange={e=>setForm({...form,"punchIn.time":e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Punch Out Time</label>
                <input type="time" style={S.sinput} value={form["punchOut.time"]||""} onChange={e=>setForm({...form,"punchOut.time":e.target.value})} />
              </div>
              <div>
                <label style={S.label}>Total Hours</label>
                <input type="number" step="0.5" style={S.sinput} value={form.totalHours||""} onChange={e=>setForm({...form,totalHours:e.target.value})} />
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"0.75rem",padding:"0 1.5rem 1.5rem"}}>
              <button style={S.cancelBtn} onClick={()=>setShowModal(false)}>Cancel</button>
              <button style={S.saveBtn} onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{textAlign:"center",padding:"4rem",color:"#64748b"}}>Loading…</div>; }
function stringColor(str="") { let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+((h<<5)-h); return `hsl(${h%360},60%,45%)`; }

const S = {
  page:       { padding:"2rem", background:"linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#0f172a" },
  topBar:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.5rem", flexWrap:"wrap", gap:"1rem" },
  breadcrumb: { fontSize:"0.72rem", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em" },
  title:      { fontSize:"1.75rem", fontWeight:800, color:"#0f172a", margin:0 },
  actions:    { display:"flex", gap:"0.75rem", flexWrap:"wrap", alignItems:"center" },
  input:      { background:"white", border:"1px solid #cbd5e1", color:"#0f172a", borderRadius:"8px", padding:"0.5rem 0.75rem", fontSize:"0.85rem", outline:"none", transition:"0.2s" },
  search:     { background:"white", border:"1px solid #cbd5e1", color:"#0f172a", borderRadius:"8px", padding:"0.5rem 0.75rem", fontSize:"0.85rem", outline:"none", width:220 },
  btn:        { background:"#0ea5e9", color:"#fff", border:"none", borderRadius:"8px", padding:"0.5rem 1.25rem", fontWeight:600, cursor:"pointer", fontSize:"0.85rem", transition:"0.2s" },
  summaryBar: { display:"flex", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap" },
  summaryCard:{ flex:1, minWidth:130, background:"white", border:"1px solid", borderRadius:"12px", padding:"1rem", display:"flex", alignItems:"center", gap:"0.75rem", boxShadow:"0 1px 2px rgba(0,0,0,0.05)" },
  summaryDot: { width:10, height:10, borderRadius:"50%", flexShrink:0 },
  tableWrap:  { background:"white", borderRadius:"16px", border:"1px solid #e2e8f0", overflow:"auto", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  table:      { width:"100%", borderCollapse:"collapse" },
  th:         { padding:"0.9rem 1rem", textAlign:"left", fontSize:"0.72rem", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", background:"#f8fafc", borderBottom:"1px solid #e2e8f0" },
  tr:         { borderBottom:"1px solid #f1f5f9" },
  td:         { padding:"0.85rem 1rem", fontSize:"0.875rem", color:"#334155" },
  avatar:     { width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff", fontSize:"0.8rem", flexShrink:0 },
  badge:      { borderRadius:"6px", padding:"0.2rem 0.6rem", fontSize:"0.75rem", fontWeight:600 },
  iconBtn:    { background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:"6px", padding:"0.3rem 0.6rem", cursor:"pointer", fontSize:"0.85rem", transition:"0.2s" },
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:      { background:"white", borderRadius:"20px", border:"1px solid #e2e8f0", width:"100%", maxWidth:560, boxShadow:"0 20px 35px -12px rgba(0,0,0,0.15)" },
  modalHead:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1.25rem 1.5rem", borderBottom:"1px solid #e2e8f0" },
  closeBtn:   { background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"1.2rem", transition:"0.2s" },
  label:      { display:"block", fontSize:"0.7rem", color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"0.35rem", fontWeight:600 },
  sinput:     { width:"100%", background:"#f8fafc", border:"1px solid #cbd5e1", color:"#0f172a", borderRadius:"10px", padding:"0.5rem 0.75rem", fontSize:"0.875rem", outline:"none", transition:"0.2s" },
  cancelBtn:  { background:"transparent", border:"1px solid #cbd5e1", color:"#475569", borderRadius:"10px", padding:"0.5rem 1.25rem", cursor:"pointer", transition:"0.2s" },
  saveBtn:    { background:"#0ea5e9", color:"#fff", border:"none", borderRadius:"10px", padding:"0.5rem 1.5rem", fontWeight:600, cursor:"pointer", transition:"0.2s" },
};



// // src/app/(dashboard)/admin/hr/attendance/page.jsx
// "use client";
// import { useEffect, useState } from "react";

// function useAuth() {
//   const [user, setUser] = useState(null);
//   useEffect(() => { const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); }, []);
//   const token = () => typeof window!=="undefined" ? localStorage.getItem("token") : "";
//   const can = (action) => {
//     if (!user) return false;
//     if (user.role === "Admin" || user.type === "company") return true;
//     return user.permissions?.attendance?.includes(action);
//   };
//   return { user, token, can };
// }

// const STATUS_COLORS = { Present:"#22c55e", "Half Day":"#f59e0b", Absent:"#ef4444", "Geo-Violation":"#8b5cf6" };

// export default function AttendancePage() {
//   const { token, can } = useAuth();
//   const [records, setRecords]     = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading]     = useState(true);
//   const [date, setDate]           = useState(new Date().toISOString().slice(0,10));
//   const [empFilter, setEmpFilter] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [editRec, setEditRec]     = useState(null);
//   const [form, setForm]           = useState({});
//   const [saving, setSaving]       = useState(false);

//   useEffect(() => { loadData(); }, [date]);

//   async function loadData() {
//     setLoading(true);
//     try {
//       const [aRes, eRes] = await Promise.all([
//         fetch(`/api/hr/attendance?date=${date}`, { headers:{ Authorization:`Bearer ${token()}` } }),
//         fetch(`/api/hr/employees?status=Active`,  { headers:{ Authorization:`Bearer ${token()}` } }),
//       ]);
//       const [a, e] = await Promise.all([aRes.json(), eRes.json()]);
//       setRecords(a.data || []);
//       setEmployees(e.data || []);
//     } finally { setLoading(false); }
//   }

//   function openCreate() {
//     setEditRec(null);
//     setForm({ date, status:"Present" });
//     setShowModal(true);
//   }

//   function openEdit(rec) {
//     setEditRec(rec);
//     setForm({
//       employeeId: rec.employeeId?._id || rec.employeeId,
//       date: rec.date, status: rec.status,
//       "punchIn.time": rec.punchIn?.time, "punchOut.time": rec.punchOut?.time,
//       totalHours: rec.totalHours,
//     });
//     setShowModal(true);
//   }

//   async function save() {
//     setSaving(true);
//     try {
//       const body = {
//         employeeId: form.employeeId, date: form.date, status: form.status,
//         totalHours: Number(form.totalHours)||0,
//         punchIn: { time: form["punchIn.time"] },
//         punchOut: { time: form["punchOut.time"] },
//       };
//       const url    = editRec ? `/api/hr/attendance/${editRec._id}` : "/api/hr/attendance";
//       const method = editRec ? "PUT" : "POST";
//       const res    = await fetch(url,{ method, headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify(body) });
//       const data   = await res.json();
//       if (data.success) { setShowModal(false); loadData(); }
//       else alert(data.message);
//     } finally { setSaving(false); }
//   }

//   async function del(id) {
//     if(!confirm("Delete record?")) return;
//     await fetch(`/api/hr/attendance/${id}`,{ method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
//     loadData();
//   }

//   const filtered = records.filter(r => {
//     const name = r.employeeId?.fullName || "";
//     return !empFilter || name.toLowerCase().includes(empFilter.toLowerCase());
//   });

//   // Summary counts
//   const summary = { Present:0, "Half Day":0, Absent:0, "Geo-Violation":0 };
//   records.forEach(r => { if(summary[r.status]!==undefined) summary[r.status]++; });

//   return (
//     <div style={S.page}>
//       <div style={S.topBar}>
//         <div>
//           <p style={S.breadcrumb}>HR / Attendance</p>
//           <h1 style={S.title}>Attendance</h1>
//         </div>
//         <div style={S.actions}>
//           <input type="date" style={S.input} value={date} onChange={e=>setDate(e.target.value)} />
//           <input style={S.search} placeholder="Filter by employee…" value={empFilter} onChange={e=>setEmpFilter(e.target.value)} />
//           {can("create") && <button style={S.btn} onClick={openCreate}>+ Add Record</button>}
//         </div>
//       </div>

//       {/* Summary Cards */}
//       <div style={S.summaryBar}>
//         {Object.entries(summary).map(([status,count])=>(
//           <div key={status} style={{...S.summaryCard, borderColor: STATUS_COLORS[status]+"44"}}>
//             <div style={{...S.summaryDot, background: STATUS_COLORS[status]}} />
//             <div>
//               <div style={{fontSize:"1.5rem",fontWeight:700,color:"#f1f5f9"}}>{count}</div>
//               <div style={{fontSize:"0.75rem",color:"#64748b"}}>{status}</div>
//             </div>
//           </div>
//         ))}
//         <div style={{...S.summaryCard, borderColor:"#334155"}}>
//           <div style={{...S.summaryDot, background:"#64748b"}} />
//           <div>
//             <div style={{fontSize:"1.5rem",fontWeight:700,color:"#f1f5f9"}}>{records.length}</div>
//             <div style={{fontSize:"0.75rem",color:"#64748b"}}>Total Marked</div>
//           </div>
//         </div>
//       </div>

//       {loading ? <Loader /> : (
//         <div style={S.tableWrap}>
//           <table style={S.table}>
//             <thead>
//               <tr>
//                 {["Employee","Date","Punch In","Punch Out","Hours","Status","Geofence","Actions"].map(h=>(
//                   <th key={h} style={S.th}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map(rec=>(
//                 <tr key={rec._id} style={S.tr}>
//                   <td style={S.td}>
//                     <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
//                       <div style={{...S.avatar,background:stringColor(rec.employeeId?.fullName)}}>{rec.employeeId?.fullName?.[0]}</div>
//                       <span style={{color:"#f1f5f9",fontWeight:500}}>{rec.employeeId?.fullName||"—"}</span>
//                     </div>
//                   </td>
//                   <td style={S.td}>{rec.date}</td>
//                   <td style={S.td}>{rec.punchIn?.time||"—"}</td>
//                   <td style={S.td}>{rec.punchOut?.time||"—"}</td>
//                   <td style={S.td}>{rec.totalHours ? `${rec.totalHours}h` : "—"}</td>
//                   <td style={S.td}><span style={{...S.badge, background:STATUS_COLORS[rec.status]+"22", color:STATUS_COLORS[rec.status]}}>{rec.status}</span></td>
//                   <td style={S.td}>
//                     <span style={{fontSize:"1rem"}}>{rec.punchIn?.withinGeofence===false||rec.punchOut?.withinGeofence===false?"⚠️":"✅"}</span>
//                   </td>
//                   <td style={S.td}>
//                     <div style={{display:"flex",gap:"0.5rem"}}>
//                       {can("update") && <button style={S.iconBtn} onClick={()=>openEdit(rec)}>✏️</button>}
//                       {can("delete") && <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>del(rec._id)}>🗑</button>}
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {!filtered.length && <tr><td colSpan={8} style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>No attendance records for this date</td></tr>}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {showModal && (
//         <div style={S.overlay}>
//           <div style={S.modal}>
//             <div style={S.modalHead}>
//               <h2 style={{margin:0,color:"#f1f5f9"}}>{editRec?"Edit Record":"Add Attendance"}</h2>
//               <button style={S.closeBtn} onClick={()=>setShowModal(false)}>✕</button>
//             </div>
//             <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
//               <div style={{gridColumn:"1/-1"}}>
//                 <label style={S.label}>Employee *</label>
//                 <select style={S.sinput} value={form.employeeId||""} onChange={e=>setForm({...form,employeeId:e.target.value})}>
//                   <option value="">-- Select Employee --</option>
//                   {employees.map(e=><option key={e._id} value={e._id}>{e.fullName} ({e.employeeCode})</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label style={S.label}>Date *</label>
//                 <input type="date" style={S.sinput} value={form.date||""} onChange={e=>setForm({...form,date:e.target.value})} />
//               </div>
//               <div>
//                 <label style={S.label}>Status</label>
//                 <select style={S.sinput} value={form.status||""} onChange={e=>setForm({...form,status:e.target.value})}>
//                   {["Present","Half Day","Absent","Geo-Violation"].map(s=><option key={s}>{s}</option>)}
//                 </select>
//               </div>
//               <div>
//                 <label style={S.label}>Punch In Time</label>
//                 <input type="time" style={S.sinput} value={form["punchIn.time"]||""} onChange={e=>setForm({...form,"punchIn.time":e.target.value})} />
//               </div>
//               <div>
//                 <label style={S.label}>Punch Out Time</label>
//                 <input type="time" style={S.sinput} value={form["punchOut.time"]||""} onChange={e=>setForm({...form,"punchOut.time":e.target.value})} />
//               </div>
//               <div>
//                 <label style={S.label}>Total Hours</label>
//                 <input type="number" step="0.5" style={S.sinput} value={form.totalHours||""} onChange={e=>setForm({...form,totalHours:e.target.value})} />
//               </div>
//             </div>
//             <div style={{display:"flex",justifyContent:"flex-end",gap:"0.75rem",padding:"0 1.5rem 1.5rem"}}>
//               <button style={S.cancelBtn} onClick={()=>setShowModal(false)}>Cancel</button>
//               <button style={S.saveBtn} onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function Loader() { return <div style={{textAlign:"center",padding:"4rem",color:"#64748b"}}>Loading…</div>; }
// function stringColor(str="") { let h=0; for(let i=0;i<str.length;i++) h=str.charCodeAt(i)+((h<<5)-h); return `hsl(${h%360},60%,40%)`; }

// const S = {
//   page:       { padding:"2rem",background:"#0f172a",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0" },
//   topBar:     { display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem" },
//   breadcrumb: { fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em" },
//   title:      { fontSize:"1.75rem",fontWeight:800,color:"#f1f5f9",margin:0 },
//   actions:    { display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center" },
//   input:      { background:"#1e293b",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.85rem",outline:"none" },
//   search:     { background:"#1e293b",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.85rem",outline:"none",width:220 },
//   btn:        { background:"#0ea5e9",color:"#fff",border:"none",borderRadius:"8px",padding:"0.5rem 1.25rem",fontWeight:600,cursor:"pointer",fontSize:"0.85rem" },
//   summaryBar: { display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap" },
//   summaryCard:{ flex:1,minWidth:130,background:"#1e293b",border:"1px solid",borderRadius:"12px",padding:"1rem",display:"flex",alignItems:"center",gap:"0.75rem" },
//   summaryDot: { width:10,height:10,borderRadius:"50%",flexShrink:0 },
//   tableWrap:  { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",overflow:"auto" },
//   table:      { width:"100%",borderCollapse:"collapse" },
//   th:         { padding:"0.9rem 1rem",textAlign:"left",fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",background:"#1e293b",borderBottom:"1px solid #334155" },
//   tr:         { borderBottom:"1px solid #0f172a" },
//   td:         { padding:"0.85rem 1rem",fontSize:"0.875rem",color:"#cbd5e1" },
//   avatar:     { width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:"0.8rem",flexShrink:0 },
//   badge:      { borderRadius:"6px",padding:"0.2rem 0.6rem",fontSize:"0.75rem",fontWeight:600 },
//   iconBtn:    { background:"#0f172a",border:"1px solid #334155",borderRadius:"6px",padding:"0.3rem 0.6rem",cursor:"pointer",fontSize:"0.85rem" },
//   overlay:    { position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 },
//   modal:      { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",width:"100%",maxWidth:560 },
//   modalHead:  { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1.25rem 1.5rem",borderBottom:"1px solid #334155" },
//   closeBtn:   { background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:"1.2rem" },
//   label:      { display:"block",fontSize:"0.75rem",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.35rem" },
//   sinput:     { width:"100%",background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.875rem",outline:"none",boxSizing:"border-box" },
//   cancelBtn:  { background:"transparent",border:"1px solid #334155",color:"#94a3b8",borderRadius:"8px",padding:"0.5rem 1.25rem",cursor:"pointer" },
//   saveBtn:    { background:"#0ea5e9",color:"#fff",border:"none",borderRadius:"8px",padding:"0.5rem 1.5rem",fontWeight:600,cursor:"pointer" },
// };