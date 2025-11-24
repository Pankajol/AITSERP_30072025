"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function CampaignView() {
  const params = useParams();
  const id = params.id;
  const [campaign, setCampaign] = useState(null);

  useEffect(()=> { fetchCampaign(); }, [id]);

  async function fetchCampaign() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/campaign/${id}`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.data.success) setCampaign(res.data.data);
    } catch(e){ console.error(e); }
  }

  if (!campaign) return <p className="p-6">Loading…</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-2">{campaign.campaignName}</h1>
        <p className="text-sm text-gray-500 mb-4">Channel: {campaign.channel} • Status: {campaign.status}</p>

        {campaign.channel === "email" && (
          <>
            <h3 className="font-medium">Subject</h3>
            <p className="mb-3">{campaign.emailSubject}</p>
          </>
        )}

        <h3 className="font-medium">Content</h3>
        <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: campaign.content }} />

        <h3 className="font-medium">Audience</h3>
        <p className="mb-3">Source: {campaign.recipientSource}</p>
        {campaign.recipientSource === "manual" && <pre className="bg-gray-50 p-2 rounded">{campaign.recipientManual}</pre>}
        {campaign.recipientSource === "excel" && <p>Excel path: {campaign.recipientExcelPath}</p>}
        {campaign.recipientSource === "segment" && <p>Segment: {campaign.recipientList}</p>}

        <div className="flex gap-2 mt-4">
          <Link href={`/campaigns/${campaign._id}/edit`}><button className="px-3 py-2 bg-green-600 text-white rounded">Edit</button></Link>
          <Link href="/campaigns/list"><button className="px-3 py-2 bg-gray-200 rounded">Back</button></Link>
        </div>
      </div>
    </div>
  );
}
