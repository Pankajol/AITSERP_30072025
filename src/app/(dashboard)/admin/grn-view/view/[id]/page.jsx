"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";

export default function GRNView() {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchGRN = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Unauthorized: Please log in");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/grn/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setGrn(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "GRN not found.");
        }
      } catch (err) {
        console.error("Error fetching GRN:", err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGRN();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value || 0);

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("en-GB") : "-";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <FaSpinner className="animate-spin text-4xl text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p>No GRN data available.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-center">GRN Details</h1>

      {/* ✅ Supplier & GRN Info */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
            <div className="space-y-2">
              <p><span className="font-bold">Supplier Code:</span> {grn.supplier?.supplierCode || "-"}</p>
              <p><span className="font-bold">Supplier Name:</span> {grn.supplier?.supplierName || "-"}</p>
              <p><span className="font-bold">Contact Person:</span> {grn.contactPerson || "-"}</p>
            </div>
          </div>

          {/* GRN Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">GRN Information</h2>
            <div className="space-y-2">
              <p><span className="font-bold">GRN Number:</span> {grn.grnNumber || "-"}</p>
              <p><span className="font-bold">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  grn.status === "Open" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {grn.status || "N/A"}
                </span>
              </p>
              <p><span className="font-bold">Posting Date:</span> {formatDate(grn.postingDate)}</p>
              <p><span className="font-bold">Document Date:</span> {formatDate(grn.documentDate)}</p>
              <p><span className="font-bold">Remarks:</span> {grn.remarks || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Items Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Items</h2>
        {grn.items && grn.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Item Code","Item Name","Description","Warehouse","Qty","Unit Price","Discount","Tax","Total"].map((col) => (
                    <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grn.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{item.item?.itemCode || "N/A"}</td>
                    <td className="px-6 py-4">{item.item?.itemName || "N/A"}</td>
                    <td className="px-6 py-4">{item.itemDescription || "-"}</td>
                    <td className="px-6 py-4">{item.warehouse?.warehouseName || "N/A"}</td>
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-4">{formatCurrency(item.discount || 0)}</td>
                    <td className="px-6 py-4">{item.taxOption || "N/A"}: {item.gstRate || 0}%</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No items found.</p>
        )}
      </div>

      {/* ✅ Attachments */}
      {grn.attachments && grn.attachments.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Attachments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {grn.attachments.map((file, idx) => {
              const url = file.url || file.fileUrl || "";
              const isPDF = file.fileType === "application/pdf" || url.endsWith(".pdf");
              return (
                <div key={idx} className="border rounded p-2 text-center">
                  {isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                  ) : (
                    <img src={url} alt="Attachment" className="h-24 w-full object-cover rounded" />
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate">
                    {file.fileName || `Attachment-${idx}`}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Financial Summary */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2"><span>Total Before Discount:</span><span>{formatCurrency(grn.totalBeforeDiscount)}</span></div>
            <div className="flex justify-between border-b pb-2"><span>Freight:</span><span>{formatCurrency(grn.freight)}</span></div>
            <div className="flex justify-between border-b pb-2"><span>Rounding:</span><span>{formatCurrency(grn.rounding)}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2"><span>Total Down Payment:</span><span>{formatCurrency(grn.totalDownPayment)}</span></div>
            <div className="flex justify-between border-b pb-2"><span>Applied Amounts:</span><span>{formatCurrency(grn.appliedAmounts)}</span></div>
            <div className="flex justify-between border-b pb-2"><span>GST Total:</span><span>{formatCurrency(grn.gstTotal)}</span></div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t flex justify-between">
          <div>
            <p className="text-lg font-semibold">Open Balance:</p>
            <p className="text-xl">{formatCurrency(grn.openBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Grand Total:</p>
            <p className="text-2xl font-bold">{formatCurrency(grn.grandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function GRNDetail() {
//   const { id } = useParams();
//   const [grn, setGrn] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchGRN = async () => {
//       try {
//         const res = await axios.get(`/api/grn/${id}`);
//         console.log(res.data.data)
//         setGrn(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch GRN:', error);
//         setError('Failed to fetch GRN');
//       }
//     };

//     if (id) {
//       fetchGRN();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!grn) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/grn-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to GRN List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">GRN Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>GRN Number:</strong> {grn.grnNumber}</p>
//         <p><strong>Supplier Name:</strong> {grn.supplierName}</p>
//         <p><strong>GRN Date:</strong> {new Date(grn.grnDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {grn.status}</p>
//         <p><strong>Grand Total:</strong> {grn.grandTotal}</p>
//         <p><strong>Remarks:</strong> {grn.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {grn.items && grn.items.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Item Name</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">Unit Price</th>
//                 <th className="border p-2">Discount</th>
//                 <th className="border p-2">Total Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {grn.items.map((item, index) => (
//                 <tr key={index} className="text-center">
//                   <td className="border p-2">{item.itemName}</td>
//                   <td className="border p-2">{item.quantity}</td>
//                   <td className="border p-2">{item.unitPrice}</td>
//                   <td className="border p-2">{item.discount}</td>
//                   <td className="border p-2">{item.totalAmount}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p>No items available.</p>
//         )}
//       </div>
//       <div className="mt-4">
//         <Link href={`/admin/grn-view/new?editId=${grn._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit GRN</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
