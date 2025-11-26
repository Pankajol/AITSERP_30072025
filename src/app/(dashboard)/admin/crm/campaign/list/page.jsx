"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { Eye, Pencil, Send, BarChart3, Trash2 } from "lucide-react";


export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/campaign", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setCampaigns(res.data.data);
        await fetchAllStats(res.data.data);
      } else {
        toast.error("Failed to fetch campaigns");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Fetch stats for every campaign
  async function fetchAllStats(campaignList) {
    try {
      const token = localStorage.getItem("token");

      const statsObj = {};

      for (const c of campaignList) {
        if (c.channel === "email" && c.status === "Sent") {
          const res = await axios.get(`/api/campaign/${c._id}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data.success) {
            statsObj[c._id] = res.data.data;
          }
        }
      }

      setStats(statsObj);

    } catch (err) {
      console.error("Stats error:", err);
    }
  }

  function formatDateIST(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}


  const filtered = useMemo(() => {
    let arr = campaigns;
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (c) =>
          (c.campaignName || "").toLowerCase().includes(q) ||
          (c.content || "").toLowerCase().includes(q) ||
          (c.emailSubject || "").toLowerCase().includes(q)
      );
    }
    if (channelFilter) arr = arr.filter((c) => c.channel === channelFilter);
    if (statusFilter) arr = arr.filter((c) => c.status === statusFilter);
    return arr;
  }, [campaigns, search, channelFilter, statusFilter]);

  async function handleDelete(id) {
    if (!confirm("Delete this campaign?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/campaign/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        toast.success("Deleted");
        setCampaigns((p) => p.filter((c) => c._id !== id));
      } else toast.error(res.data.error || "Delete failed");

    } catch {
      toast.error("Delete failed");
    }
  }

  async function handleSendNow(id) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `/api/campaign/${id}/send-now`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        toast.success("Send triggered");
        fetchCampaigns();
      } else toast.error(res.data.error || "Send failed");

    } catch (err) {
      toast.error("Send failed");
    }
  }

  const renderStats = (id) => {
    const s = stats[id];

    if (!s) return <span className="text-gray-400 text-sm">—</span>;

    return (
      <div className="text-xs space-y-1">
        <div>📨 Sent: {s.total}</div>
        <div>👀 Open: {s.opens}</div>
        <div>📎 Attachment: {s.attachments}</div>
        <div>🔗 Click: {s.clicks}</div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>

        <Link href="/campaigns/new">
          <button className="px-4 py-2 bg-green-600 text-white rounded">
            New Campaign
          </button>
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="px-3 py-2 border rounded w-60"
        />

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Sent">Sent</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="bg-white shadow rounded overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Channel</th>
                <th className="p-3 text-left">Scheduled ppp</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Tracking</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id} className="border-t">
                  <td className="p-3">{i + 1}</td>

                  <td className="p-3 font-semibold">
                    {c.campaignName}
                  </td>

                  <td className="p-3 capitalize">
                    {c.channel}
                  </td>

                <td className="p-3">{c.scheduledTime}</td>



                  <td className="p-3">
                    {c.status}
                  </td>

                  <td className="p-3">
                    {c.channel === "email" && c.status === "Sent"
                      ? renderStats(c._id)
                      : <span className="text-gray-400 text-sm">—</span>
                    }
                  </td>

                 <td className="p-3">
  <div className="flex items-center gap-2">

    {/* VIEW */}
    <Link
      href={`/campaigns/${c._id}`}
      className="group flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition"
    >
      <Eye size={14} />
      <span>View</span>
    </Link>

    {/* EDIT */}
    <Link
      href={`/campaigns/${c._id}/edit`}
      className="group flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition"
    >
      <Pencil size={14} />
      <span>Edit</span>
    </Link>

    {/* SEND NOW */}
    {c.status !== "Sent" ? (
      <button
        onClick={() => handleSendNow(c._id)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
      >
        <Send size={14} />
        <span>Send</span>
      </button>
    ) : (
      <span className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-400">
        Sent
      </span>
    )}

    {/* REPORT */}
    <Link
      href={`/campaigns/${c._id}/report`}
      className="group flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition"
    >
      <BarChart3 size={14} />
      <span>Report</span>
    </Link>

    {/* DELETE */}
    <button
      onClick={() => handleDelete(c._id)}
      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition"
    >
      <Trash2 size={14} />
      <span>Delete</span>
    </button>

  </div>
</td>

                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-gray-500"
                  >
                    No campaigns
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



// "use client";

// import { useState, useEffect, useMemo } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { toast } from "react-toastify";

// export default function CampaignsListPage() {
//   const [campaigns, setCampaigns] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // filters
//   const [search, setSearch] = useState("");
//   const [channelFilter, setChannelFilter] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");

//   useEffect(() => {
//     fetchCampaigns();
//   }, []);

//   async function fetchCampaigns() {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/campaign", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) setCampaigns(res.data.data);
//       else toast.error("Failed to fetch campaigns");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch campaigns");
//     } finally {
//       setLoading(false);
//     }
//   }

//   const filtered = useMemo(() => {
//     let arr = campaigns;
//     if (search.trim()) {
//       const q = search.toLowerCase();
//       arr = arr.filter(
//         (c) =>
//           (c.campaignName || "").toLowerCase().includes(q) ||
//           (c.content || "").toLowerCase().includes(q) ||
//           (c.emailSubject || "").toLowerCase().includes(q)
//       );
//     }
//     if (channelFilter) arr = arr.filter((c) => c.channel === channelFilter);
//     if (statusFilter) arr = arr.filter((c) => c.status === statusFilter);
//     return arr;
//   }, [campaigns, search, channelFilter, statusFilter]);

//   async function handleDelete(id) {
//     if (!confirm("Delete this campaign?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.delete(`/api/campaign/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) {
//         toast.success("Deleted");
//         setCampaigns((p) => p.filter((c) => c._id !== id));
//       } else toast.error(res.data.error || "Delete failed");
//     } catch {
//       toast.error("Delete failed");
//     }
//   }

//   async function handleSendNow(id) {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.post(`/api/campaign/${id}/send-now`, {}, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) {
//         toast.success("Send triggered");
//         fetchCampaigns();
//       } else toast.error(res.data.error || "Send failed");
//     } catch (err) {
//       toast.error("Send failed");
//     }
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-2xl font-bold">Campaigns</h1>
//         <Link href="/campaigns/new">
//           <button className="px-4 py-2 bg-green-600 text-white rounded">New Campaign</button>
//         </Link>
//       </div>

//       <div className="flex gap-3 mb-4">
//         <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="px-3 py-2 border rounded w-60" />
//         <select value={channelFilter} onChange={e=>setChannelFilter(e.target.value)} className="px-3 py-2 border rounded">
//           <option value="">All Channels</option>
//           <option value="email">Email</option>
//           <option value="whatsapp">WhatsApp</option>
//         </select>
//         <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 border rounded">
//           <option value="">All Status</option>
//           <option value="Draft">Draft</option>
//           <option value="Scheduled">Scheduled</option>
//           <option value="Sent">Sent</option>
//           <option value="Failed">Failed</option>
//         </select>
//       </div>

//       {loading ? <p>Loading…</p> : (
//         <div className="bg-white shadow rounded overflow-hidden">
//           <table className="min-w-full">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-3 text-left">#</th>
//                 <th className="p-3 text-left">Name</th>
//                 <th className="p-3 text-left">Channel</th>
//                 <th className="p-3 text-left">Scheduled</th>
//                 <th className="p-3 text-left">Status</th>
//                 <th className="p-3 text-left">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((c,i)=>(
//                 <tr key={c._id} className="border-t">
//                   <td className="p-3">{i+1}</td>
//                   <td className="p-3 font-semibold">{c.campaignName}</td>
//                   <td className="p-3">{c.channel}</td>
//                   <td className="p-3">{new Date(c.scheduledTime).toLocaleString()}</td>
//                   <td className="p-3">{c.status}</td>
//                   <td className="p-3 space-x-2">
//                     <Link href={`/campaigns/${c._id}`}><button className="text-blue-600">View</button></Link>
//                     <Link href={`/campaigns/${c._id}/edit`}><button className="text-green-600">Edit</button></Link>
//                     <button onClick={()=>handleSendNow(c._id)} className="text-indigo-600">Send Now</button>
//                     <button onClick={()=>handleDelete(c._id)} className="text-red-600">Delete</button>
//                   </td>
//                 </tr>
//               ))}
//               {!filtered.length && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No campaigns</td></tr>}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
