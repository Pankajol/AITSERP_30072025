"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";

export default function CampaignViewPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/campaign/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) setCampaign(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!campaign) return <p className="p-6">Campaign not found</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{campaign.campaignName}</h1>
        <div className="space-x-3">
          <Link
            href={`/campaign/${id}/edit`}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Edit
          </Link>

          <Link
            href={`/campaigns/${id}/report`}
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            View Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <p><b>Channel:</b> {campaign.channel}</p>
        <p><b>Status:</b> {campaign.status}</p>
        <p><b>Scheduled:</b> {new Date(campaign.scheduledTime).toLocaleString()}</p>
        <p><b>Audience:</b> {campaign.recipientSource}</p>
      </div>

      {campaign.channel === "email" && (
        <>
          <h2 className="font-bold">Subject</h2>
          <div className="p-3 border rounded bg-white">
            {campaign.emailSubject}
          </div>
        </>
      )}

      <h2 className="font-bold">
        {campaign.channel === "email" ? "Email Content" : "WhatsApp Message"}
      </h2>

      {campaign.channel === "email" ? (
        <div
          className="border rounded p-4 bg-white"
          dangerouslySetInnerHTML={{ __html: campaign.content }}
        />
      ) : (
        <div className="border rounded p-4 bg-green-50 whitespace-pre-line">
          {campaign.content}
        </div>
      )}
    </div>
  );
}
