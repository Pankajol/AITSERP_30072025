"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";

export default function SalesQuotationView() {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!id) return;

  const fetchQuotation = async () => {
    try {
      setLoading(true);

      // ✅ Validate ID
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        setError("Invalid quotation ID");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Unauthorized: Please log in.");
        return;
      }

      const res = await axios.get(`/api/sales-quotation/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Add token
        },
      });

      if (res.data.success) {
        setQuotation(res.data.data);
        setError(null);
      } else {
        setError(res.data.error || "Quotation not found.");
      }
    } catch (err) {
      console.error("Error fetching quotation:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchQuotation();
}, [id]);


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

  if (!quotation) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p>No quotation data available.</p>
      </div>
    );
  }

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold text-center">Sales Quotation Details</h1>

      {/* Basic Info Section */}
      <div className="bg-white shadow-md rounded p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-lg">
              <span className="font-bold">Customer Code:</span> {quotation.customerCode}
            </p>
            <p className="text-lg">
              <span className="font-bold">Customer Name:</span> {quotation.customerName}
            </p>
            <p className="text-lg">
              <span className="font-bold">Contact Person:</span> {quotation.contactPerson || "-"}
            </p>
            <p className="text-lg">
              <span className="font-bold">Reference Number:</span> {quotation.refNumber || "-"}
            </p>
            <p className="text-lg">
              <span className="font-bold">Sales Employee:</span> {quotation.salesEmployee || "-"}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-lg">
              <span className="font-bold">Status:</span>
              <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                quotation.status === "Open" || quotation.status === "Draft"
                  ? "bg-green-100 text-green-800"
                  : (quotation.status === "Closed" || quotation.status === "Accepted" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800")
              }`}>
                {quotation.status}
              </span>
            </p>
            <p className="text-lg">
              <span className="font-bold">Posting Date:</span>{" "}
              {quotation.postingDate ? new Date(quotation.postingDate).toLocaleDateString() : "-"}
            </p>
            <p className="text-lg">
              <span className="font-bold">Valid Until:</span>{" "}
              {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "-"}
            </p>
            <p className="text-lg">
              <span className="font-bold">Document Date:</span>{" "}
              {quotation.documentDate ? new Date(quotation.documentDate).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>

        {/* Remarks Section */}
        {quotation.remarks && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-lg font-bold mb-2">Remarks:</p>
            <p className="text-gray-700">{quotation.remarks}</p>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white shadow-md rounded p-6">
        <h2 className="text-2xl font-semibold mb-4">Items</h2>
        {quotation.items && quotation.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotation.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{item.itemCode || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.itemName || "-"}</td>
                    <td className="px-6 py-4">{item.itemDescription || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.quantity || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.discount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500">No items found.</p>
        )}
      </div>

      {/* Financial Summary Section */}
      <div className="bg-white shadow-md rounded p-6">
        <h2 className="text-2xl font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Total Before Discount:</span>
              <span>{formatCurrency(quotation.totalBeforeDiscount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Freight:</span>
              <span>{formatCurrency(quotation.freight)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Rounding:</span>
              <span>{formatCurrency(quotation.rounding)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">GST Amount:</span>
              <span>{formatCurrency(quotation.gstAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">CGST Amount:</span>
              <span>{formatCurrency(quotation.cgstAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">SGST Amount:</span>
              <span>{formatCurrency(quotation.sgstAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">IGST Amount:</span>
              <span>{formatCurrency(quotation.igstAmount)}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Total Down Payment:</span>
              <span>{formatCurrency(quotation.totalDownPayment)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Applied Amounts:</span>
              <span>{formatCurrency(quotation.appliedAmounts)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-semibold">Open Balance:</span>
              <span>{formatCurrency(quotation.openBalance)}</span>
            </div>
            <div className="mt-8 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between py-2">
                <span className="text-xl font-bold">Grand Total:</span>
                <span className="text-xl font-bold">{formatCurrency(quotation.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Attachments */}
        
      <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <h3 className="text-xl font-semibold mb-2">Attachments</h3>
            {quotation.attachments && quotation.attachments.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {quotation.attachments.map((attachment, index) => {
                  const isImage = attachment.fileType && attachment.fileType.startsWith("image/");
                  const isPDF = attachment.fileType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
                  return (
                    <li key={index}>
                      <p className="font-semibold mb-2">{attachment.fileName}</p>
                      {isImage ? (
                        <img src={attachment.fileUrl} alt={attachment.fileName} className="max-w-full h-auto rounded mb-2" />
                      ) : isPDF ? (
                        <iframe src={attachment.fileUrl} className="w-full h-[400px] rounded mb-2" title="PDF Preview"></iframe>
                      ) : (
                        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Open {attachment.fileName} in a new tab
                        </a>
                      )}
                      {!isImage && !isPDF && (
                        <p className="text-sm text-gray-500">Unsupported file type for preview.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500">No attachments available.</p>
            )}
          </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import axios from "axios";
// import { FaSpinner } from "react-icons/fa";

// export default function PurchaseQuotationView() {
//   const { id } = useParams();
//   const [quotation, setQuotation] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     axios
//       .get(`/api/sales-quotation/${id}`)
//       .then((res) => {
//         if (res.data.success) {
//           setQuotation(res.data.data);
//           setError(null);
//         } else {
//           setError(res.data.error || "Quotation not found.");
//         }
//       })
//       .catch((err) => {
//         console.error("Error fetching quotation:", err);
//         setError(err.message);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, [id]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <FaSpinner className="animate-spin text-4xl text-gray-500" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6 text-center text-red-600">
//         <h2 className="text-2xl font-bold mb-4">Error</h2>
//         <p>{error}</p>
//       </div>
//     );
//   }

//   if (!quotation) {
//     return (
//       <div className="container mx-auto p-6 text-center">
//         <p>No quotation data available.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 space-y-6">
//       <h1 className="text-4xl font-bold text-center">Sales Quotation Details</h1>
      
//       {/* Basic Info Section */}
//       <div className="bg-white shadow-md rounded p-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <p className="text-lg">
//               <span className="font-bold">Reference Number:</span> {quotation.refNumber}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Supplier Name:</span> {quotation.supplierName}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Status:</span> {quotation.status}
//             </p>
//           </div>
//           <div>
//             <p className="text-lg">
//               <span className="font-bold">Posting Date:</span>{" "}
//               {quotation.postingDate ? new Date(quotation.postingDate).toLocaleDateString() : "-"}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Valid Until:</span>{" "}
//               {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "-"}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Delivery Date:</span>{" "}
//               {quotation.documentDate ? new Date(quotation.documentDate).toLocaleDateString() : "-"}
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <div className="bg-white shadow-md rounded p-6">
//         <h2 className="text-2xl font-semibold mb-4">Items</h2>
//         {quotation.items && quotation.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {quotation.items.map((item, index) => (
//                   <tr key={index}>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.itemDescription || "N/A"}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.unitPrice}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.totalAmount}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-center text-gray-500">No items found.</p>
//         )}
//       </div>
//     </div>
//   );
// }
