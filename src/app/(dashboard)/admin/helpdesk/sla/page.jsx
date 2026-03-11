"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function SlaAdminPage() {

  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [editing,setEditing] = useState(null);

  const [form,setForm] = useState({
    name:"",
    firstResponseMinutes:"",
    resolutionMinutes:"",
    priority:"normal"
  });

  /* ================= LOAD SLA ================= */
  const load = async () => {
    const token = localStorage.getItem("token");

    const res = await axios.get("/api/helpdesk/sla",{
      headers:{ Authorization:`Bearer ${token}` }
    });

    setList(res.data || []);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);


  /* ================= CHANGE ================= */
  const handleChange = (e)=>{
    setForm({...form,[e.target.name]:e.target.value});
  };


  /* ================= SAVE ================= */
  const handleSubmit = async(e)=>{
    e.preventDefault();

    const token = localStorage.getItem("token");

    if(editing){
      await axios.put(`/api/helpdesk/sla/${editing}`,form,{
        headers:{ Authorization:`Bearer ${token}` }
      });
    }else{
      await axios.post("/api/helpdesk/sla",form,{
        headers:{ Authorization:`Bearer ${token}` }
      });
    }

    setForm({
      name:"",
      firstResponseMinutes:"",
      resolutionMinutes:"",
      priority:"normal"
    });

    setEditing(null);
    load();
  };


  /* ================= DELETE ================= */
  const handleDelete = async(id)=>{
    const token = localStorage.getItem("token");

    if(!confirm("Delete SLA ?")) return;

    await axios.delete(`/api/helpdesk/sla/${id}`,{
      headers:{ Authorization:`Bearer ${token}` }
    });

    load();
  };


  /* ================= EDIT ================= */
  const handleEdit = (sla)=>{
    setEditing(sla._id);
    setForm({
      name:sla.name,
      firstResponseMinutes:sla.firstResponseMinutes,
      resolutionMinutes:sla.resolutionMinutes,
      priority:sla.priority
    });
  };


  /* ================= TOGGLE ACTIVE ================= */
  const toggleActive = async(sla)=>{
    const token = localStorage.getItem("token");

    await axios.put(`/api/helpdesk/sla/${sla._id}`,{
      ...sla,
      isActive:!sla.isActive
    },{
      headers:{ Authorization:`Bearer ${token}` }
    });

    load();
  };



  return (
    <div className="p-6 max-w-5xl mx-auto">

      <h1 className="text-xl font-bold mb-6">SLA Policies</h1>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-4 space-y-3 mb-8">

        <input
          name="name"
          placeholder="Policy Name (VIP / Standard)"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="firstResponseMinutes"
          type="number"
          placeholder="First Response Minutes"
          value={form.firstResponseMinutes}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          name="resolutionMinutes"
          type="number"
          placeholder="Resolution Minutes"
          value={form.resolutionMinutes}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="vip">VIP</option>
        </select>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          {editing ? "Update SLA" : "Create SLA"}
        </button>
      </form>


      {/* ================= LIST ================= */}
      {loading ? "Loading..." : (

        <div className="space-y-3">

          {list.map(sla=>(
            <div key={sla._id} className="border p-4 rounded-xl flex justify-between items-center">

              <div>
                <p className="font-semibold">{sla.name}</p>
                <p className="text-xs text-gray-500">
                  First: {sla.firstResponseMinutes}m | Resolve: {sla.resolutionMinutes}m
                </p>

                <span className={`text-xs px-2 py-1 rounded ${
                  sla.priority==="vip"
                    ? "bg-red-100 text-red-600"
                    : sla.priority==="high"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100"
                }`}>
                  {sla.priority}
                </span>

                {!sla.isActive && (
                  <span className="ml-2 text-xs text-red-500">Inactive</span>
                )}
              </div>


              <div className="flex gap-2">

                <button
                  onClick={()=>handleEdit(sla)}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded"
                >
                  Edit
                </button>

                <button
                  onClick={()=>toggleActive(sla)}
                  className="px-3 py-1 text-xs bg-yellow-500 text-white rounded"
                >
                  {sla.isActive ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={()=>handleDelete(sla._id)}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded"
                >
                  Delete
                </button>

              </div>

            </div>
          ))}

        </div>

      )}

    </div>
  );
}