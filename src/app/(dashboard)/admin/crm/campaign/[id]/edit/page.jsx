"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

export default function EditCampaignPage() {
  const { id } = useParams();
  const router = useRouter();

  const [campaignName, setCampaignName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  async function fetchCampaign() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/campaign/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const c = res.data.data;
        setCampaignName(c.campaignName);
        setEmailSubject(c.emailSubject || "");
        setContent(c.content || "");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `/api/campaign/${id}`,
        {
          campaignName,
          emailSubject,
          content,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        alert("Campaign Updated ✅");
        router.push(`/campaigns/${id}`);
      }
    } catch (err) {
      alert("Update Failed");
    }
  }

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Edit Campaign</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block font-semibold">Campaign Name</label>
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full border p-3 rounded"
          />
        </div>

        <div>
          <label className="block font-semibold">Email Subject</label>
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full border p-3 rounded"
          />
        </div>

        <div>
          <label className="block font-semibold">Content</label>
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border p-3 rounded"
          />
        </div>

        <button className="bg-blue-600 text-white px-6 py-3 rounded">
          Update Campaign
        </button>
      </form>
    </div>
  );
}
