"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Eye, Play, Printer, Square } from "lucide-react";
import { toast } from "react-toastify";
import { FaSearch, FaArrowLeft } from "react-icons/fa";

export default function JobCardListPage() {
  const params = useParams();
  const productionOrderId = params.id;   // from [id] folder
  const router = useRouter();

  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeJob, setActiveJob] = useState(null);
  const [endQty, setEndQty] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!productionOrderId) return;
    fetchJobCards();
  }, [productionOrderId]);

  const fetchJobCards = async () => {
    try {
      if (!token) throw new Error("Unauthorized");
      const res = await axios.get(
        `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobCards(res.data?.data || []);
    } catch (err) {
      setError("Failed to fetch job cards");
      toast.error("Failed to fetch job cards");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id) => router.push(`/admin/ppc/jobcards/${id}`);

  const handleStart = async (jc) => {
    try {
      await axios.patch(
        `/api/ppc/jobcards/${jc._id}?action=start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobCards(prev =>
        prev.map(j => j._id === jc._id ? { ...j, status: "in progress", actualStartDate: new Date() } : j)
      );
      toast.success("Started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Start failed");
    }
  };

  const handleEnd = (jc) => {
    setActiveJob(jc);
    setEndQty(jc.qtyToManufacture - (jc.completedQty || 0));
  };

  const confirmEnd = async () => {
    if (!activeJob || endQty <= 0) return toast.error("Invalid quantity");
    try {
      const res = await axios.patch(
        `/api/ppc/jobcards/${activeJob._id}?action=end`,
        { completedQty: endQty, status: "completed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJobCards(prev =>
        prev.map(j => j._id === activeJob._id ? res.data.data : j)
      );
      toast.success("Completed");
      setActiveJob(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Complete failed");
    }
  };

  const filteredCards = jobCards.filter(jc =>
    [jc.jobCardNo, jc.operation?.name, jc.machine?.name, jc.operator?.name]
      .some(s => (s || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const statusBadge = (status) => {
    const colors = {
      planned: "bg-gray-100 text-gray-700",
      "in progress": "bg-blue-100 text-blue-700",
      on_hold: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
    };
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[status] || colors.planned}`}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <FaArrowLeft className="cursor-pointer hover:text-indigo-600" onClick={() => router.back()} />
            Job Cards
          </h1>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500 outline-none"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Job Card No</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Operation</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Machine</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Operator</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400">Qty</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400">Done</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCards.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400">No job cards</td></tr>
              ) : (
                filteredCards.map((jc, idx) => (
                  <tr key={jc._id} className="hover:bg-indigo-50/20">
                    <td className="px-6 py-4">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{jc.jobCardNo}</td>
                    <td className="px-6 py-4">{jc.operation?.name || "-"}</td>
                    <td className="px-6 py-4">{jc.machine?.name || "-"}</td>
                    <td className="px-6 py-4">{jc.operator?.name || "-"}</td>
                    <td className="px-6 py-4 text-center">{jc.qtyToManufacture}</td>
                    <td className="px-6 py-4 text-center">{jc.completedQty}</td>
                    <td className="px-6 py-4 text-center">{statusBadge(jc.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleView(jc._id)} className="p-1.5 text-gray-300 hover:text-blue-600"><Eye size={16} /></button>
                        <button onClick={() => window.open(`/admin/ppc/jobcards/${jc._id}`, '_blank')?.focus()} className="p-1.5 text-gray-300 hover:text-gray-600"><Printer size={16} /></button>
                        {jc.status !== "completed" && (
                          <>
                            <button onClick={() => handleStart(jc)} disabled={jc.status === "in progress"} className="p-1.5 text-gray-300 hover:text-green-600"><Play size={16} /></button>
                            <button onClick={() => handleEnd(jc)} className="p-1.5 text-gray-300 hover:text-red-600"><Square size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {activeJob && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Complete {activeJob.jobCardNo}</h2>
              <input
                type="number"
                min={1}
                max={activeJob.qtyToManufacture - (activeJob.completedQty || 0)}
                value={endQty}
                onChange={(e) => setEndQty(Number(e.target.value))}
                className="w-full border p-2 rounded-lg mb-4"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setActiveJob(null)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button onClick={confirmEnd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}