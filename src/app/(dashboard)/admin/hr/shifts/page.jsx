"use client";

import { useEffect, useState } from "react";

export default function ShiftsPage() {
  const token = ()=> localStorage.getItem("token")||"";
  const [user, setUser] = useState(null);
  const can = (a)=>{ if(!user) return false; if(user.role==="Admin"||user.type==="company") return true; return user.permissions?.shifts?.includes(a); };
  useEffect(()=>{ const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); },[]);
  const [items, setItems]  = useState([]);
  const [loading, setLoading]=useState(true);
  const [show, setShow]    = useState(false);
  const [form, setForm]    = useState({ weeklyOffs:[] });
  const [saving, setSaving]=useState(false);
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
 
  useEffect(()=>{ load(); },[]);
  async function load() {
    setLoading(true);
    const res=await fetch("/api/hr/shifts",{headers:{Authorization:`Bearer ${token()}`}});
    const data=await res.json(); setItems(data.data||[]); setLoading(false);
  }
  async function save() {
    setSaving(true);
    const url=form._id?`/api/hr/shifts/${form._id}`:"/api/hr/shifts";
    const res=await fetch(url,{method:form._id?"PUT":"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(form)});
    const data=await res.json();
    if(data.success){setShow(false);load();}else alert(data.message);
    setSaving(false);
  }
  async function del(id){ if(!confirm("Delete?")) return; await fetch(`/api/hr/shifts/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}}); load(); }
  const toggleDay=(day)=>{
    const off=form.weeklyOffs||[];
    setForm({...form,weeklyOffs:off.includes(day)?off.filter(d=>d!==day):[...off,day]});
  };
 
  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div><p style={S.bc}>HR / Shifts</p><h1 style={S.title}>Shift Management</h1></div>
        <div style={S.acts}>{can("create")&&<button style={{...S.btn,background:"#f97316"}} onClick={()=>{setForm({weeklyOffs:[]});setShow(true)}}>+ Add Shift</button>}</div>
      </div>
      {loading ? <div style={{padding:"4rem",textAlign:"center",color:"#64748b"}}>Loading…</div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1rem"}}>
          {items.map(s=>(
            <div key={s._id} style={{background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",padding:"1.5rem",position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1rem"}}>
                <div style={{width:44,height:44,background:"#f9731622",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>⏰</div>
                <div>
                  <div style={{fontWeight:700,color:"#f1f5f9"}}>{s.name}</div>
                  <div style={{color:"#f97316",fontWeight:600}}>{s.startTime} – {s.endTime}</div>
                </div>
              </div>
              <div style={{fontSize:"0.8rem",color:"#64748b",marginBottom:"0.5rem"}}>Grace: {s.gracePeriod} min</div>
              <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>
                {DAYS.map(d=>(
                  <span key={d} style={{background:s.weeklyOffs?.includes(d)?"#ef444422":"#0f172a",color:s.weeklyOffs?.includes(d)?"#ef4444":"#475569",borderRadius:"4px",padding:"0.15rem 0.4rem",fontSize:"0.7rem"}}>{d.slice(0,3)}</span>
                ))}
              </div>
              <div style={{position:"absolute",top:"1rem",right:"1rem",display:"flex",gap:"0.4rem"}}>
                {can("update")&&<button style={S.ib} onClick={()=>{setForm({...s,weeklyOffs:s.weeklyOffs||[]});setShow(true)}}>✏️</button>}
                {can("delete")&&<button style={{...S.ib,color:"#ef4444"}} onClick={()=>del(s._id)}>🗑</button>}
              </div>
            </div>
          ))}
          {!items.length&&<div style={{color:"#64748b",padding:"2rem"}}>No shifts configured</div>}
        </div>
      )}
      {show&&(
        <div style={S.overlay}><div style={S.modal}>
          <div style={S.mHead}><h2 style={{margin:0,color:"#f1f5f9"}}>{form._id?"Edit":"Add"} Shift</h2><button style={S.cls} onClick={()=>setShow(false)}>✕</button></div>
          <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div style={{gridColumn:"1/-1"}}><label style={S.lbl}>Shift Name *</label><input style={S.inp2} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={S.lbl}>Start Time</label><input type="time" style={S.inp2} value={form.startTime||""} onChange={e=>setForm({...form,startTime:e.target.value})} /></div>
            <div><label style={S.lbl}>End Time</label><input type="time" style={S.inp2} value={form.endTime||""} onChange={e=>setForm({...form,endTime:e.target.value})} /></div>
            <div><label style={S.lbl}>Grace Period (min)</label><input type="number" style={S.inp2} value={form.gracePeriod||10} onChange={e=>setForm({...form,gracePeriod:e.target.value})} /></div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={S.lbl}>Weekly Offs</label>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginTop:"0.35rem"}}>
                {DAYS.map(d=>(
                  <button key={d} onClick={()=>toggleDay(d)} style={{background:(form.weeklyOffs||[]).includes(d)?"#ef444422":"#0f172a",border:`1px solid ${(form.weeklyOffs||[]).includes(d)?"#ef4444":"#334155"}`,borderRadius:"6px",padding:"0.3rem 0.6rem",cursor:"pointer",color:(form.weeklyOffs||[]).includes(d)?"#ef4444":"#64748b",fontSize:"0.8rem"}}>{d.slice(0,3)}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:"0.75rem",padding:"0 1.5rem 1.5rem"}}>
            <button style={S.cancelBtn} onClick={()=>setShow(false)}>Cancel</button>
            <button style={{...S.btn,background:"#f97316"}} onClick={save} disabled={saving}>{saving?"…":"Save"}</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
const S = {
  page:      { padding:"2rem",background:"#0f172a",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0" },
  topBar:    { display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem" },
  bc:        { fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",margin:0 },
  title:     { fontSize:"1.75rem",fontWeight:800,color:"#f1f5f9",margin:0 },
  mon:       { color:"#64748b",fontSize:"1.1rem",fontWeight:400 },
  acts:      { display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center" },
  btn:       { color:"#fff",border:"none",borderRadius:"8px",padding:"0.5rem 1.25rem",fontWeight:600,cursor:"pointer",fontSize:"0.85rem" },
  inp:       { background:"#1e293b",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.85rem",outline:"none" },
  statsRow:  { display:"flex",gap:"1rem",marginBottom:"1.5rem",flexWrap:"wrap" },
  stat:      { flex:1,minWidth:140,background:"#1e293b",border:"1px solid",borderRadius:"12px",padding:"1rem 1.25rem" },
  tableWrap: { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",overflow:"auto" },
  table:     { width:"100%",borderCollapse:"collapse" },
  th:        { padding:"0.9rem 1rem",textAlign:"left",fontSize:"0.72rem",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #334155" },
  tr:        { borderBottom:"1px solid #0f172a" },
  td:        { padding:"0.85rem 1rem",fontSize:"0.875rem",color:"#cbd5e1" },
  badge:     { borderRadius:"6px",padding:"0.2rem 0.6rem",fontSize:"0.75rem",fontWeight:600 },
  ib:        { background:"#0f172a",border:"1px solid #334155",borderRadius:"6px",padding:"0.3rem 0.6rem",cursor:"pointer",fontSize:"0.85rem" },
  overlay:   { position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 },
  modal:     { background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",width:"100%",maxWidth:520 },
  mHead:     { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1.25rem 1.5rem",borderBottom:"1px solid #334155" },
  cls:       { background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:"1.2rem" },
  lbl:       { display:"block",fontSize:"0.75rem",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.35rem" },
  inp2:      { width:"100%",background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.875rem",outline:"none",boxSizing:"border-box" },
  cancelBtn: { background:"transparent",border:"1px solid #334155",color:"#94a3b8",borderRadius:"8px",padding:"0.5rem 1.25rem",cursor:"pointer" },
};