"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { Eye, Play, Printer, Square } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function JobCardListPage() {
  const searchParams = useSearchParams();
  const productionOrderId = searchParams.get("productionOrderId");
  const router = useRouter();

  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeJob, setActiveJob] = useState(null);
  const [endQty, setEndQty] = useState(0);

  useEffect(() => {
    if (!productionOrderId) {
      setError("Production Order ID is missing");
      setLoading(false);
      return;
    }

    const fetchJobCards = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Unauthorized");

        const res = await axios.get(
          `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.data) {
          const cards = Array.isArray(res.data.data)
            ? res.data.data
            : [res.data.data];
          setJobCards(cards);
        } else {
          setJobCards([]);
        }
      } catch (err) {
        console.error("Error fetching job cards:", err);
        setError("Failed to fetch job cards");
        toast.error("Failed to fetch job cards");
      } finally {
        setLoading(false);
      }
    };

    fetchJobCards();
  }, [productionOrderId]);

  const handleView = (id) => {
    router.push(`/admin/ppc/jobcards/${id}`);
  };

  const handlePrint = (id) => {
    const printWindow = window.open(`/admin/ppc/jobcards/${id}`, "_blank");
    printWindow?.focus();
  };

  const handleStart = async (jc) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/ppc/jobcards/${jc._id}/start`,
        { status: "In Progress", startTime: new Date().toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setJobCards((prev) =>
        prev.map((job) =>
          job._id === jc._id ? { ...job, status: "In Progress", startTime: new Date().toISOString() } : job
        )
      );
      toast.success(`Job card ${jc.jobCardNo} started`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to start job card");
    }
  };

  const handleEnd = (jc) => {
    setActiveJob(jc);
    setEndQty(jc.qtyToManufacture - (jc.qtyCompleted || 0));
  };

  const confirmEnd = async () => {
    if (!activeJob) return;
    if (endQty <= 0 || endQty > activeJob.qtyToManufacture - (activeJob.qtyCompleted || 0)) {
      toast.error("Invalid quantity");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/ppc/jobcards/${activeJob._id}/end`,
        {
          qtyCompleted: (activeJob.qtyCompleted || 0) + endQty,
          status: "Completed",
          endTime: new Date().toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update job cards state
      setJobCards((prev) =>
        prev.map((jc) =>
          jc._id === activeJob._id
            ? {
                ...jc,
                status: "Completed",
                qtyCompleted: (jc.qtyCompleted || 0) + endQty,
                endTime: new Date().toISOString(),
              }
            : jc
        )
      );

      toast.success(`Job card ${activeJob.jobCardNo} completed`);

      // Auto-start next operation
      const currentIndex = jobCards.findIndex((jc) => jc._id === activeJob._id);
      const nextJob = jobCards[currentIndex + 1];
      if (nextJob && nextJob.status !== "Completed") {
        handleStart(nextJob);
      }

      setActiveJob(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete job card");
    }
  };

  if (loading)
    return <div className="p-6 text-gray-600">Loading job cards...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!jobCards.length)
    return <div className="p-6 text-gray-600">No job cards found.</div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-semibold mb-6">Job Cards</h2>

      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">#</th>
            <th className="p-2 border">Job Card No</th>
            <th className="p-2 border">Operation</th>
            <th className="p-2 border">Machine</th>
            <th className="p-2 border">Operator</th>
            <th className="p-2 border">Qty</th>
            <th className="p-2 border">Completed Qty</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobCards.map((jc, idx) => (
            <tr key={jc._id} className="border-t">
              <td className="p-2 border">{idx + 1}</td>
              <td className="p-2 border">{jc.jobCardNo}</td>
              <td className="p-2 border">{jc.operation?.name || "-"}</td>
              <td className="p-2 border">{jc.machine?.name || "-"}</td>
              <td className="p-2 border">{jc.operator?.name || "-"}</td>
              <td className="p-2 border">{jc.qtyToManufacture || 0}</td>
              <td className="p-2 border">{jc.qtyCompleted || 0}</td>
              <td className="p-2 border">
                <span
                  className={`px-2 py-1 rounded-md text-xs ${
                    jc.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : jc.status === "In Progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {jc.status || "Planned"}
                </span>
              </td>
              <td className="p-2 border flex gap-2 flex-wrap">
                <button
                  onClick={() => handleView(jc._id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Eye size={16} /> View
                </button>
                <button
                  onClick={() => handlePrint(jc._id)}
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
                >
                  <Printer size={16} /> Print
                </button>

                {jc.status !== "Completed" && (
                  <>
                    <button
                      onClick={() => handleStart(jc)}
                      disabled={jc.status === "In Progress"}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <Play size={16} /> Start
                    </button>
                    <button
                      onClick={() => handleEnd(jc)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 flex items-center gap-1"
                    >
                      <Square  size={16} /> End
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* End Job Modal */}
      {activeJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">
              Complete Job Card: {activeJob.jobCardNo}
            </h2>
            <p className="mb-2">Enter quantity completed:</p>
            <input
              type="number"
              min={1}
              max={activeJob.qtyToManufacture - (activeJob.qtyCompleted || 0)}
              value={endQty}
              onChange={(e) => setEndQty(Number(e.target.value))}
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setActiveJob(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmEnd}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





// "use client";

// import { useEffect, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import axios from "axios";
// import { Eye, Printer } from "lucide-react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function JobCardListPage() {
//   const searchParams = useSearchParams();
//   const productionOrderId = searchParams.get("productionOrderId");
//   const router = useRouter();

//   const [jobCards, setJobCards] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!productionOrderId) {
//       setError("Production Order ID is missing");
//       setLoading(false);
//       return;
//     }

//     const fetchJobCards = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) throw new Error("Unauthorized");

//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         if (res.data?.data) {
//           const cards = Array.isArray(res.data.data)
//             ? res.data.data
//             : [res.data.data];
//           setJobCards(cards);
//         } else {
//           setJobCards([]);
//         }
//       } catch (err) {
//         console.error("Error fetching job cards:", err);
//         setError("Failed to fetch job cards");
//         toast.error("Failed to fetch job cards");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [productionOrderId]);

//   const handleView = (id) => {
//     router.push(`/admin/ppc/jobcards/${id}`);
//   };

//   const handlePrint = (id) => {
//     const printWindow = window.open(`/admin/ppc/jobcards/${id}`, "_blank");
//     printWindow?.focus();
//   };

//   if (loading)
//     return <div className="p-6 text-gray-600">Loading job cards...</div>;
//   if (error) return <div className="p-6 text-red-600">{error}</div>;
//   if (!jobCards.length)
//     return <div className="p-6 text-gray-600">No job cards found.</div>;

//   return (
//     <div className="p-6 bg-white rounded-xl shadow-md max-w-6xl mx-auto mt-8">
//       <h2 className="text-2xl font-semibold mb-6">Job Cards</h2>
//       <table className="w-full text-sm border-collapse">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-2 border">#</th>
//             <th className="p-2 border">Job Card No</th>
//             <th className="p-2 border">Operation</th>
//             <th className="p-2 border">Machine</th>
//             <th className="p-2 border">Operator</th>
//             <th className="p-2 border">Qty</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {jobCards.map((jc, idx) => (
//             <tr key={jc._id} className="border-t">
//               <td className="p-2 border">{idx + 1}</td>
//               <td className="p-2 border">{jc.jobCardNo}</td>
//               <td className="p-2 border">{jc.operation?.name || "-"}</td>
//               <td className="p-2 border">{jc.machine?.name || "-"}</td>
//               <td className="p-2 border">{jc.operator?.name || "-"}</td>
//               <td className="p-2 border">{jc.qtyToManufacture || 0}</td>
//               <td className="p-2 border">
//                 <span
//                   className={`px-2 py-1 rounded-md text-xs ${
//                     jc.status === "Completed"
//                       ? "bg-green-100 text-green-700"
//                       : "bg-yellow-100 text-yellow-700"
//                   }`}
//                 >
//                   {jc.status || "In Progress"}
//                 </span>
//               </td>
//               <td className="p-2 border flex gap-2">
//                 <button
//                   onClick={() => handleView(jc._id)}
//                   className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
//                 >
//                   <Eye size={16} /> View
//                 </button>
//                 <button
//                   onClick={() => handlePrint(jc._id)}
//                   className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
//                 >
//                   <Printer size={16} /> Print
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
