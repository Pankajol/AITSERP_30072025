"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit, FaTrash, FaEye, FaSearch, FaPlus, FaFileInvoiceDollar
} from "react-icons/fa";
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";

export default function DebitNoteList() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/debit-note", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching Debit Notes:", error);
      toast.error("Failed to fetch debit notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Debit Note?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/debit-note/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
        toast.success("Debit Note deleted");
      }
    } catch (error) {
      toast.error("Failed to delete Debit Note");
    }
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch = !search.trim() ||
        (n.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
        (n.documentNumberDebitNote || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || n.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [search, notes, filterStatus]);

  const stats = {
    total: notes.length,
    open: notes.filter(n => n.status === "Open" || n.status === "Pending").length,
    closed: notes.filter(n => n.status === "Closed" || n.status === "Completed").length,
    sum: notes.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0)
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Open: "bg-blue-50 text-blue-600",
      Pending: "bg-amber-50 text-amber-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Completed: "bg-emerald-50 text-emerald-600",
      Cancelled: "bg-red-50 text-red-500",
      Draft: "bg-gray-100 text-gray-500",
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
        {status || "—"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Debit Notes</h1>
            <p className="text-sm text-gray-400 mt-0.5">Supplier return and adjustment tracking</p>
          </div>
          <Link href="/admin/debit-notes-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> Create Debit Note
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Notes", value: stats.total, emoji: "📝", filter: "All" },
            { label: "Open/Pending", value: stats.open, emoji: "⏳", filter: "Open" },
            { label: "Closed", value: stats.closed, emoji: "✅", filter: "Closed" },
            { label: "Total Value", value: `₹${stats.sum.toLocaleString("en-IN")}`, emoji: "💰", filter: "All", noFilter: true },
          ].map(s => (
            <div key={s.label} 
              onClick={() => !s.noFilter && setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all
                ${!s.noFilter && filterStatus === s.filter 
                  ? "border-indigo-400 shadow-md shadow-indigo-100" 
                  : "border-transparent shadow-sm hover:border-indigo-200 cursor-pointer"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Pending", "Closed"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Doc Number", "Supplier", "Ref No.", "Status", "Total", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(8).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded bg-gray-100 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-20 text-gray-300">No records found</td></tr>
                ) : filtered.map((note, idx) => (
                  <tr key={note._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {note.documentNumberDebitNote || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{note.supplierName || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 font-mono">{note.refNumber || "—"}</td>
                    <td className="px-4 py-4"><StatusBadge status={note.status} /></td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-800">
                       ₹{Number(note.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-4"><RowMenu note={note} onDelete={handleDelete} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((note, idx) => (
              <div key={note._id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {note.documentNumberDebitNote || `#${idx + 1}`}
                  </span>
                  <RowMenu note={note} onDelete={handleDelete} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{note.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <StatusBadge status={note.status} />
                    <p className="text-[10px] text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(note.grandTotal || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function RowMenu({ note, onDelete }) {
  const router = useRouter();
  const actions = [
    { icon: <FaEye />, label: "View Note", onClick: () => router.push(`/admin/debit-notes-view/view/${note._id}`) },
    { icon: <FaEdit />, label: "Edit Note", onClick: () => router.push(`/admin/debit-notes-view/new?editId=${note._id}`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(note._id) },
  ];
  return <ActionMenu actions={actions} />;
}

// function RowMenu({ note, onDelete }) {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const btnRef = useRef(null);
//   const [position, setPosition] = useState("right-0"); // Default

//   const actions = [
//     { icon: <FaEye />, label: "View", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}`) },
//     { icon: <FaEdit />, label: "Edit", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}/edit`) },
//     { icon: <FaEnvelope />, label: "Email", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-email`) },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-whatsapp`) },
//     { icon: <FaTrash />, label: "Delete", onClick: () => onDelete(note._id), color: "text-red-600" },
//   ];

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     if (open && btnRef.current) {
//       const rect = btnRef.current.getBoundingClientRect();
//       const spaceRight = window.innerWidth - rect.right;
//       const spaceLeft = rect.left;

//       // If not enough space on the right, open to the left
//       if (spaceRight < 200 && spaceLeft > 200) {
//         setPosition("left-0");
//       } else {
//         setPosition("right-0");
//       }
//     }
//   }, [open]);

//   return (
//     <div className="relative inline-block text-left" ref={menuRef}>
//       <button
//         ref={btnRef}
//         onClick={() => setOpen((p) => !p)}
//         className="p-2 text-gray-500 hover:bg-gray-200 rounded-full focus:ring-2 focus:ring-blue-500"
//       >
//         <FaEllipsisV size={16} />
//       </button>
//       {open && (
//         <div
//           className={`absolute ${position} mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50`}
//         >
//           {actions.map((a, i) => (
//             <button
//               key={i}
//               onClick={() => {
//                 a.onClick();
//                 setOpen(false);
//               }}
//               className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 ${a.color || ""}`}
//             >
//               {a.icon} {a.label}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }





// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function DebitNoteView() {
//   const [notes, setNotes] = useState([]);
//   const router = useRouter();

//   const fetchDebitNotes = async () => {
//     try {
//       const token = localStorage.getItem("token");

//       const res = await axios.get("/api/debit-note",
//         {
//         headers: { Authorization: `Bearer ${token}` },
//       }
//       );
//       // Assuming your API returns { success: true, data: [...] }
//       if (res.data.success) {
//         setNotes(res.data.data);
//       } else {
//         setNotes(res.data);
//       }
//     } catch (error) {
//       console.error("Error fetching Debit Notes:", error);
//     }
//   };

//   useEffect(() => {
//     fetchDebitNotes();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this Debit Note?")) return;
//     try {
//       const res = await axios.delete(`/api/debit-note/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchDebitNotes();
//       }
//     } catch (error) {
//       console.error("Error deleting Debit Note:", error);
//       alert("Failed to delete Debit Note");
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Debit Note List</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/debit-notes-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Debit Note
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">document No.</th>
//               <th className="py-3 px-4 border-b">Supplier Name</th>
//               <th className="py-3 px-4 border-b">Reference Number</th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Created At</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {notes.map((note) => (
//               <tr key={note._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{note.documentNumber}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.supplierName}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.refNumber}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.status}</td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {parseFloat(note.grandTotal).toFixed(2)}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {new Date(note.createdAt).toLocaleDateString()}
//                 </td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     <Link href={`/admin/debit-notes-view/${note._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/debit-notes-view/${note._id}/edit`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Edit"
//                       >
//                         <FaEdit />
//                       </button>
//                     </Link>
//                     <button
//                       onClick={() => handleDelete(note._id)}
//                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
//                       title="Delete"
//                     >
//                       <FaTrash />
//                     </button>
//                     <Link href={`/admin/debit-note/${note._id}/send-email`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
//                         title="Send Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/debit-note/${note._id}/send-whatsapp`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
//                         title="Send WhatsApp"
//                       >
//                         <FaWhatsapp />
//                       </button>
//                     </Link>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//             {notes.length === 0 && (
//               <tr>
//                 <td colSpan="6" className="text-center py-4">
//                   No Debit Notes found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



// function RowMenu({ note, onDelete }) {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const btnRef = useRef(null);
//   const [style, setStyle] = useState({});

//   const actions = [
//     { icon: <FaEye />, label: "View", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}`) },
//     { icon: <FaEdit />, label: "Edit", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}/edit`) },
//     { icon: <FaEnvelope />, label: "Email", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-email`) },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-whatsapp`) },
//     { icon: <FaTrash />, label: "Delete", onClick: () => onDelete(note._id), color: "text-red-600" },
//   ];

//  return (
//   <ActionMenu actions={actions} />
//  )
// }



