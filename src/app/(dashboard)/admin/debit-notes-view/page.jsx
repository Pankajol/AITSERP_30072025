"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaEllipsisV,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function DebitNoteList() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotes();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Debit Note?")) return;
    try {
      const res = await axios.delete(`/api/debit-note/${id}`);
      if (res.data.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (error) {
      alert("Failed to delete Debit Note");
    }
  };

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    return notes.filter((n) =>
      (n.supplierName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, notes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Debit Notes</h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative max-w-sm w-full">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by supplier name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Link href="/admin/debit-notes-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit className="mr-2" />
            Create New Debit Note
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {["#", "Doc No.", "Supplier", "Ref No.", "Status", "Total", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note, idx) => (
                  <tr key={note._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{note.documentNumber}</td>
                    <td className="px-4 py-3">{note.supplierName}</td>
                    <td className="px-4 py-3">{note.refNumber}</td>
                    <td className="px-4 py-3">{note.status}</td>
                    <td className="px-4 py-3">₹ {parseFloat(note.grandTotal).toFixed(2)}</td>
                    <td className="px-4 py-3">{new Date(note.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <RowMenu note={note} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))}
                {!filteredNotes.length && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">
                      No Debit Notes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredNotes.map((note, idx) => (
              <div key={note._id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">#{idx + 1} - {note.documentNumber} </div>
                  <RowMenu note={note} onDelete={handleDelete} isMobile />
                </div>
                <div><strong>Supplier:</strong> {note.supplierName}</div>
                <div><strong>Doc No:</strong> {note.documentNumber}</div>
                <div><strong>Ref:</strong> {note.refNumber}</div>
                <div><strong>Status:</strong> {note.status}</div>
                <div><strong>Total:</strong> ₹ {parseFloat(note.grandTotal).toFixed(2)}</div>
                <div><strong>Date:</strong> {new Date(note.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
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



function RowMenu({ note, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const [style, setStyle] = useState({});

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => (window.location.href = `/admin/debit-notes-view/${note._id}/edit`) },
    { icon: <FaEnvelope />, label: "Email", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-email`) },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => (window.location.href = `/admin/debit-note/${note._id}/send-whatsapp`) },
    { icon: <FaTrash />, label: "Delete", onClick: () => onDelete(note._id), color: "text-red-600" },
  ];

 return (
  <ActionMenu actions={actions} />
 )
}



