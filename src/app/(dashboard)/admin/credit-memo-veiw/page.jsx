'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaEllipsisV,
} from 'react-icons/fa';
import ActionMenu from '@/components/ActionMenu';

/* ============================================================= */
/*  Credit Note List                                             */
/* ============================================================= */
export default function CreditNoteList() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* -------- fetch data -------- */
  const fetchNotes = async () => {
    setLoading(true);
    try {
      
      // const res = await axios.get('/api/credit-note');
      const token = localStorage.getItem("token");
if (!token) {
  console.error("Unauthorized: No token found");
  return;
}

const res = await axios.get("/api/credit-note", {
  headers: { Authorization: `Bearer ${token}` },
});

      if (res.data?.success && Array.isArray(res.data.data)) {
        setNotes(res.data.data);
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error('Error fetching credit notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  /* -------- filter -------- */
  const displayNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) =>
      (n.customerName || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  /* -------- actions -------- */
  const handleDelete = async (id) => {
    if (!confirm('Delete this credit note?')) return;
    try {
      await axios.delete(`/api/credit-note/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  /* ============================================================= */
  /*  UI                                                           */
  /* ============================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        Credit Notes
      </h1>

      {/* toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="relative max-w-sm flex-1">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Link href="/admin/credit-memo-veiw/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit className="mr-2" />
            New Credit Note
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    '#',
                    'Documents No.',
                    'Customer',
                    'Contact',
                    'Reference',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayNotes.map((n, i) => (
                  <tr
                    key={n._id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">{n.documentNumberCreditNote}</td>
                    <td className="px-4 py-3">{n.customerName}</td>
                    <td className="px-4 py-3">{n.contactPerson}</td>
                    <td className="px-4 py-3">{n.refNumber}</td>
                    <td className="px-4 py-3">
                      <RowMenu note={n} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))}
                {!displayNotes.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-5 text-gray-500"
                    >
                      No credit notes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-4">
            {displayNotes.map((n, i) => (
              <div
                key={n._id}
                className="bg-white p-4 rounded-lg shadow border"
              >
                <div className="flex justify-between">
                  <div className="font-semibold">
                    #{i + 1} • {n.documentNumberCreditNote}
                  </div>
                  <RowMenu note={n} onDelete={handleDelete} isMobile />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Customer: {n.customerName}
                </p>
                <p className="text-sm text-gray-600">
                  Contact: {n.contactPerson}
                </p>
              </div>
            ))}
            {!displayNotes.length && (
              <p className="text-center text-gray-500">
                No credit notes found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================= */
/*  Row Action Menu                                              */
/* ============================================================= */
function RowMenu({ note, onDelete }) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: <FaEye />,
      label: 'View',
      onClick: () =>
        (window.location.href = `/admin/credit-memo-veiw/${note._id}`),
    },
    {
      icon: <FaEdit />,
      label: 'Edit',
      onClick: () =>
        (window.location.href = `/admin/credit-memo-veiw/new?editId=${note._id}`),
    },
    {
      icon: <FaEnvelope />,
      label: 'Email',
      onClick: () =>
        (window.location.href = `/admin/credit-note/${note._id}/send-email`),
    },
    {
      icon: <FaWhatsapp />,
      label: 'WhatsApp',
      onClick: () =>
        (window.location.href = `/admin/credit-note/${note._id}/send-whatsapp`),
    },
    {
      icon: <FaTrash />,
      label: 'Delete',
      onClick: () => onDelete(note._id),
      color: 'text-red-600',
    },
  ];

  return (
    <ActionMenu  actions={actions}  />
  );
}



// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function CreditNoteView() {
//   const [notes, setNotes] = useState([]);
//   const router = useRouter();

//   const fetchCreditNotes = async () => {
//     try {
//       const res = await axios.get("/api/credit-note");
//       // Assuming your API returns { success: true, creditNotes: [...] }
//       if (res.data.success) {
//         setNotes(Array.isArray(res.data.creditNotes) ? res.data.creditNotes : []);
//       } else {
//         setNotes([]);
//       }
//     } catch (error) {
//       console.error("Error fetching Credit Notes:", error);
//     }
//   };

//   useEffect(() => {
//     fetchCreditNotes();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this Credit Note?")) return;
//     try {
//       const res = await axios.delete(`/api/credit-note/${creditMemoId}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchCreditNotes();
//       }
//     } catch (error) {
//       console.error("Error deleting Credit Note:", error);
//       alert("Failed to delete Credit Note");
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Credit Note List</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/credit-memo">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Credit Note
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Customer Code</th>
//               <th className="py-3 px-4 border-b">Customer Name</th>
//               <th className="py-3 px-4 border-b">Contact Person</th>
//               <th className="py-3 px-4 border-b">Reference Number</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {notes.map((note) => (
//               <tr key={note._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{note.customerCode}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.customerName}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.contactPerson}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.refNumber}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     <Link href={`/admin/credit-memo-veiw/${note._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/credit-memo-veiw/${note._id}/edit`}>
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
//                     <Link href={`/admin/credit-note/${note._id}/send-email`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
//                         title="Send Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/credit-note/${note._id}/send-whatsapp`}>
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
//                 <td colSpan="5" className="text-center py-4">
//                   No Credit Notes found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }


