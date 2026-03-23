"use client";
import { useEffect, useState } from "react";


export default function PerformancePage() {
  const token = ()=> localStorage.getItem("token")||"";
  const [user, setUser] = useState(null);
  const can = (a)=>{ if(!user) return false; if(user.role==="Admin"||user.type==="company") return true; return user.permissions?.performance?.includes(a); };
  useEffect(()=>{ const u=localStorage.getItem("user"); if(u) setUser(JSON.parse(u)); },[]);
 
  const [reviews, setReviews]   = useState([]);
  const [employees, setEmps]    = useState([]);
  const [month, setMonth]       = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading]   = useState(true);
  const [showModal, setShow]    = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
 
  useEffect(()=>{ load(); },[month]);
 
  async function load() {
    setLoading(true);
    const [rRes,eRes] = await Promise.all([
      fetch(`/api/hr/performance?reviewMonth=${month}`,{ headers:{Authorization:`Bearer ${token()}`} }),
      fetch(`/api/hr/employees?status=Active`,{ headers:{Authorization:`Bearer ${token()}`} }),
    ]);
    const [r,e] = await Promise.all([rRes.json(),eRes.json()]);
    setReviews(r.data||[]); setEmps(e.data||[]);
    setLoading(false);
  }
 
  async function save() {
    setSaving(true);
    const url    = form._id ? `/api/hr/performance/${form._id}` : "/api/hr/performance";
    const method = form._id ? "PUT" : "POST";
    const res    = await fetch(url,{ method, headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`}, body:JSON.stringify({...form,reviewMonth:month}) });
    const data   = await res.json();
    if(data.success){ setShow(false); load(); } else alert(data.message);
    setSaving(false);
  }
 
  const stars = (n)=> "★".repeat(n)+"☆".repeat(5-n);
  const ratingColor = { 5:"#22c55e", 4:"#84cc16", 3:"#f59e0b", 2:"#f97316", 1:"#ef4444" };
 
  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div><p style={S.bc}>HR / Performance</p><h1 style={S.title}>Performance Reviews</h1></div>
        <div style={S.acts}>
          <input type="month" style={S.inp} value={month} onChange={e=>setMonth(e.target.value)} />
          {can("create") && <button style={{...S.btn,background:"#ec4899"}} onClick={()=>{setForm({rating:3});setShow(true)}}>+ Add Review</button>}
        </div>
      </div>
 
      {loading ? <div style={{padding:"4rem",textAlign:"center",color:"#64748b"}}>Loading…</div> : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead><tr>{["Employee","Month","Rating","Feedback","Reviewed By","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {reviews.map(r=>(
                <tr key={r._id} style={S.tr}>
                  <td style={S.td}>{r.employeeId?.fullName||"—"}</td>
                  <td style={S.td}>{r.reviewMonth}</td>
                  <td style={S.td}><span style={{color:ratingColor[r.rating],fontSize:"1rem",letterSpacing:"0.1rem"}}>{stars(r.rating||0)}</span></td>
                  <td style={{...S.td,maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.feedback||"—"}</td>
                  <td style={S.td}>{r.reviewedBy?.fullName||"—"}</td>
                  <td style={S.td}>
                    {can("update") && <button style={S.ib} onClick={()=>{setForm({...r,employeeId:r.employeeId?._id||r.employeeId});setShow(true)}}>✏️</button>}
                  </td>
                </tr>
              ))}
              {!reviews.length && <tr><td colSpan={6} style={{textAlign:"center",padding:"3rem",color:"#64748b"}}>No reviews this month</td></tr>}
            </tbody>
          </table>
        </div>
      )}
 
      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.mHead}><h2 style={{margin:0,color:"#f1f5f9"}}>Performance Review</h2><button style={S.cls} onClick={()=>setShow(false)}>✕</button></div>
            <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={S.lbl}>Employee *</label>
                <select style={S.inp2} value={form.employeeId||""} onChange={e=>setForm({...form,employeeId:e.target.value})}>
                  <option value="">-- Select --</option>
                  {employees.map(e=><option key={e._id} value={e._id}>{e.fullName}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Rating (1–5)</label>
                <div style={{display:"flex",gap:"0.5rem",marginTop:"0.35rem"}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setForm({...form,rating:n})} style={{background:form.rating>=n?"#f59e0b22":"#0f172a",border:`1px solid ${form.rating>=n?"#f59e0b":"#334155"}`,borderRadius:"6px",padding:"0.4rem 0.7rem",cursor:"pointer",color:form.rating>=n?"#f59e0b":"#64748b",fontSize:"1rem"}}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.lbl}>Reviewed By</label>
                <select style={S.inp2} value={form.reviewedBy||""} onChange={e=>setForm({...form,reviewedBy:e.target.value})}>
                  <option value="">-- Select --</option>
                  {employees.map(e=><option key={e._id} value={e._id}>{e.fullName}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={S.lbl}>Feedback</label>
                <textarea style={{...S.inp2,height:80,resize:"vertical"}} value={form.feedback||""} onChange={e=>setForm({...form,feedback:e.target.value})} />
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"0.75rem",padding:"0 1.5rem 1.5rem"}}>
              <button style={S.cancelBtn} onClick={()=>setShow(false)}>Cancel</button>
              <button style={{...S.btn,background:"#ec4899"}} onClick={save} disabled={saving}>{saving?"…":"Save Review"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const S = {
  page: {padding:"1.5rem",fontFamily:"Inter, sans-serif"},
  topBar: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"},
  title: {margin:0,color:"#f1f5f9"},
    bc: {margin:0,color:"#64748b",fontSize:"0.9rem"},
    inp: {background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",padding:"0.4rem 0.6rem",borderRadius:"6px"},
    btn: {background:"#6366f1",color:"#f1f5f9",border:"none",borderRadius:"6px",padding:"0.5rem 1rem",cursor:"pointer"},
    acts: {display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"},
    tableWrap: {overflowX:"auto",background:"#0f172a",border:"1px solid #334155",borderRadius:"8px"},
    table: {width:"100%",borderCollapse:"collapse"},
    th: {textAlign:"left",padding:"0.75rem",borderBottom:"1px solid #334155",color:"#64748b",fontSize:"0.85rem"},
    td: {padding:"0.75rem",borderBottom:"1px solid #0f172a",color:"#f1f5f9",fontSize:"0.9rem"},
    ib: {background:"transparent",border:"none",cursor:"pointer",color:"#64748b",fontSize:"1.1rem"},
    overlay: {position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"#00000088",display:"flex",justifyContent:"center",alignItems:"center",zIndex:1000},
    modal: {background:"#1e293b",borderRadius:"8px",width:"400px",maxWidth:"90%",boxShadow:"0 4px 12px rgba(0,0,0,0.5)"},
    mHead: {background:"#0f172a",padding:"1rem",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"},
    cls: {background:"transparent",border:"none",color:"#64748b",fontSize:"1.2rem",cursor:"pointer"},
    lbl: {display:"block",marginBottom:"0.35rem",color:"#64748b",fontSize:"0.85rem"},
    inp2: {background:"#0f172a",border:"1px solid #334155",color:"#f1f5f9",padding:"0.4rem 0.6rem",borderRadius:"6px",width:"100%"},
    cancelBtn: {background:"#334155",color:"#f1f5f9",border:"none",borderRadius:"6px",padding:"0.5rem 1rem",cursor:"pointer"},
};