"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import axios from "axios";
import "react-quill-new/dist/quill.snow.css";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr:false });

export default function CampaignEdit() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    campaignName: "", scheduledTime: "", channel: "email", sender: "", content: "", emailSubject: "", ctaText: "",
    recipientSource: "segment", recipientList: "", recipientManual: "", recipientExcelPath: ""
  });

  useEffect(()=>{ fetch(); }, [id]);

  async function fetch(){
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/campaign/${id}`, { headers:{ Authorization:`Bearer ${token}` }});
      if (res.data.success) {
        const c = res.data.data;
        setForm({
          campaignName: c.campaignName || "",
          scheduledTime: new Date(c.scheduledTime).toISOString().slice(0,16),
          channel: c.channel || "email",
          sender: c.sender || "",
          content: c.content || "",
          emailSubject: c.emailSubject || "",
          ctaText: c.ctaText || "",
          recipientSource: c.recipientSource || "segment",
          recipientList: c.recipientList || "",
          recipientManual: c.recipientManual || "",
          recipientExcelPath: c.recipientExcelPath || ""
        });
      }
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }

  async function save(e){
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = { ...form, scheduledTime: new Date(form.scheduledTime).toISOString() };
      const res = await axios.put(`/api/campaign/${id}`, payload, { headers:{ Authorization:`Bearer ${token}` }});
      if (res.data.success) {
        alert("Saved");
        router.push(`/campaigns/${id}`);
      } else alert(res.data.error);
    } catch (err) { console.error(err); alert("Save failed"); }
  }

  if (loading) return <p className="p-6">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <form onSubmit={save} className="bg-white p-6 rounded shadow space-y-4">
        <input required value={form.campaignName} onChange={e=>setForm({...form,campaignName:e.target.value})} placeholder="Campaign Name" className="w-full p-2 border rounded" />
        <input required type="datetime-local" value={form.scheduledTime} onChange={e=>setForm({...form,scheduledTime:e.target.value})} className="w-full p-2 border rounded" />
        <select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} className="w-full p-2 border rounded">
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <input required value={form.sender} onChange={e=>setForm({...form,sender:e.target.value})} placeholder="Sender" className="w-full p-2 border rounded" />

        {form.channel === "email" && <>
          <input value={form.emailSubject} onChange={e=>setForm({...form,emailSubject:e.target.value})} placeholder="Email Subject" className="w-full p-2 border rounded" />
          <input value={form.ctaText} onChange={e=>setForm({...form,ctaText:e.target.value})} placeholder="CTA Text" className="w-full p-2 border rounded" />
        </>}

        <label>Content</label>
        <ReactQuill value={form.content} onChange={(v)=>setForm({...form,content:v})} />

        <div>
          <label>Recipient Source</label>
          <select value={form.recipientSource} onChange={e=>setForm({...form,recipientSource:e.target.value})} className="w-full p-2 border rounded">
            <option value="segment">Segment</option>
            <option value="manual">Manual</option>
            <option value="excel">Excel</option>
          </select>
        </div>

        {form.recipientSource === "segment" && <input value={form.recipientList} onChange={e=>setForm({...form,recipientList:e.target.value})} placeholder="Segment ID or name" className="w-full p-2 border rounded" />}
        {form.recipientSource === "manual" && <textarea value={form.recipientManual} onChange={e=>setForm({...form,recipientManual:e.target.value})} placeholder="Comma separated emails/phones" className="w-full p-2 border rounded" />}
        {form.recipientSource === "excel" && <input value={form.recipientExcelPath} onChange={e=>setForm({...form,recipientExcelPath:e.target.value})} placeholder="Uploaded file path" className="w-full p-2 border rounded" />}

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
          <Link href={`/campaigns/${id}`}><button type="button" className="px-4 py-2 bg-gray-200 rounded">Cancel</button></Link>
        </div>
      </form>
    </div>
  );
}
