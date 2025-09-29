'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa';

export default function PurchaseOrderView() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

 useEffect(() => {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError("Invalid or missing Purchase Order ID.");
      setLoading(false);
      return;
    }

    const source = axios.CancelToken.source(); // ✅ For cleanup

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Unauthorized: No token found.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/purchase-order/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cancelToken: source.token,
        });

        if (res.data.success) {
          setOrder(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "Failed to fetch purchase order.");
        }
      } catch (err) {
        if (axios.isCancel(err)) return; // ✅ Ignore if request was canceled
        console.error("Fetch error:", err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    return () => {
      source.cancel("Request canceled due to component unmount.");
    };
  }, [id]);
  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(v || 0);

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <FaSpinner className="animate-spin text-4xl text-orange-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.push('/admin/purchase-order')}
          className="mt-4 px-4 py-2 bg-orange-400 text-white rounded"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="print-area container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-4xl font-bold">Purchase Order #{order?.documentNumber || "N/A"}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-400"
          >
            Download / Print
          </button>
          <button
            onClick={() => router.push("/admin/purchase-order")}
            className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
          >
            Back to Orders
          </button>
        </div>
      </div>

      {/* Supplier & Order Info */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
            <div className="space-y-2">
              <p className="text-lg">
                <span className="font-bold">Supplier Code:</span> {order?.supplierCode || "-"}
              </p>
              <p className="text-lg">
                <span className="font-bold">Supplier Name:</span>{" "}
                {order?.supplierName || order?.supplierName || "-"}
              </p>
              <p className="text-lg">
                <span className="font-bold">Contact Person:</span>{" "}
                {order?.contactPerson || order?.contactPerson || "-"}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Order Information</h2>
            <div className="space-y-2">
              <p className="text-lg">
                <span className="font-bold">documentNumber:</span> {order?.documentNumber || "-"}
              </p>
              <p className="text-lg">
                <span className="font-bold">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-sm ${
                    order?.orderStatus === "Open"
                      ? "bg-green-100 text-green-800"
                      : order?.status === "Closed"
                      ? "bg-red-100 text-red-800"
                      : order?.status === "Pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {order?.orderStatus || "-"}
                </span>
              </p>
              <p className="text-lg">
                <span className="font-bold">Invoice Type:</span> {order?.invoiceType || "Normal"}
              </p>
              <p className="text-lg">
                <span className="font-bold">Posting Date:</span> {formatDate(order?.postingDate)}
              </p>
              <p className="text-lg">
                <span className="font-bold">Valid Until:</span> {formatDate(order?.validUntil)}
              </p>
              <p className="text-lg">
                <span className="font-bold">Document Date:</span> {formatDate(order?.documentDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Employee and Remarks */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-lg">
                <span className="font-bold">Sales Employee:</span> {order?.salesEmployee || "-"}
              </p>
            </div>
            <div>
              {order?.remarks && (
                <div>
                  <p className="font-bold text-lg">Remarks:</p>
                  <p className="text-gray-700">{order?.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Items</h2>
        {order?.items && order?.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Item Code",
                    "Item Name",
                    "Description",
                    "Warehouse",
                    "Qty",
                    "Unit Price",
                    "Discount",
                    "Tax",
                    "Total",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.itemCode || item.item?.itemCode || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.itemName || item.item?.itemName || "N/A"}
                    </td>
                    <td className="px-6 py-4">{item.itemDescription || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.warehouseCode
                        ? `${item.warehouseCode} - ${item.warehouseName || ""}`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>Ordered: {item.quantity || 0}</span>
                        {item.orderedQuantity > 0 && (
                          <span className="text-sm text-green-600">
                            Ordered: {item.orderedQuantity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(item.unitPrice || item.item?.unitPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(item.discount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>
                          {item.taxOption || "GST"}: {item.gstRate || 0}%
                        </span>
                        <span>
                          {formatCurrency(
                            item.taxOption === "IGST"
                              ? item.igstAmount || 0
                              : item.gstAmount || 0
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(item.totalAmount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No items found.</p>
        )}
      </div>
      {/* attechems */}
     {/* ✅ Attachments Section */}
      {order?.attachments && order?.attachments.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Attachments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {order?.attachments.map((file, idx) => {
              const url = file.fileUrl || file.url || file.path || "";
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
        

      {/* Financial Summary */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Total Before Discount:</span>
              <span>{formatCurrency(order?.totalBeforeDiscount)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Freight:</span>
              <span>{formatCurrency(order?.freight)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Rounding:</span>
              <span>{formatCurrency(order?.rounding)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Total Down Payment:</span>
              <span>{formatCurrency(order?.totalDownPayment)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Applied Amounts:</span>
              <span>{formatCurrency(order?.appliedAmounts)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">GST Total:</span>
              <span>{formatCurrency(order?.gstTotal)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between">
            <div>
              <p className="text-lg font-semibold">Open Balance:</p>
              <p className="text-xl">{formatCurrency(order?.openBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">Grand Total:</p>
              <p className="text-2xl font-bold">{formatCurrency(order?.grandTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FaSpinner } from 'react-icons/fa';

// export default function PurchaseOrderView() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!id) {
//       setError('No purchase order ID provided.');
//       setLoading(false);
//       return;
//     }

//     axios
//       .get(`/api/purchase-order/${id}`)
//       .then((res) => {
//         if (res.data.success) {
//           setOrder(res.data.data);
//         } else {
//           setError(res.data.error || 'Purchase order not found.');
//         }
//       })
//       .catch((err) => {
//         console.error('Fetch error:', err);
//         setError(err.response?.data?.error || err.message);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, [id]);

//   const formatCurrency = (v) =>
//     new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//     }).format(v || 0);

//   const formatDate = (d) => {
//     if (!d) return '-';
//     const dt = new Date(d);
//     return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-IN');
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <FaSpinner className="animate-spin text-4xl text-orange-400" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6 text-center text-red-600">
//         <h2 className="text-2xl font-bold mb-4">Error</h2>
//         <p>{error}</p>
//         <button
//           onClick={() => router.push('/admin/purchase-order')}
//           className="mt-4 px-4 py-2 bg-orange-400 text-white rounded"
//         >
//           Back to Orders
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 space-y-6 print-area">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-bold">
//           Purchase Order #{order.refNumber || 'N/A'}
//         </h1>
//         <div className="flex gap-2">
//           <button
//             onClick={() => window.print()}
//             className="px-4 py-2 bg-blue-500 text-white rounded"
//           >
//             Download / Print
//           </button>
//           <button
//             onClick={() => router.push('/admin/purchase-order')}
//             className="px-4 py-2 bg-indigo-600 text-white rounded"
//           >
//             Back to List
//           </button>
//         </div>
//       </div>

//       {/* Supplier & Info */}
//       <div className="bg-white shadow-md rounded-lg p-6 grid md:grid-cols-2 gap-6">
//         <div>
//           <h2 className="text-xl font-semibold mb-2">Supplier Details</h2>
//           <p><strong>Code:</strong> {order.supplierCode || '-'}</p>
//           <p><strong>Name:</strong> {order.supplierName || '-'}</p>
//           <p><strong>Contact:</strong> {order.contactPerson || '-'}</p>
//         </div>
//         <div>
//           <h2 className="text-xl font-semibold mb-2">Order Info</h2>
//           <p><strong>Status:</strong> {order.status}</p>
//           <p><strong>Invoice Type:</strong> {order.invoiceType}</p>
//           <p><strong>Posting Date:</strong> {formatDate(order.postingDate)}</p>
//           <p><strong>Valid Until:</strong> {formatDate(order.validUntil)}</p>
//         </div>
//       </div>

//       {/* Items Table */}
//       <div className="bg-white shadow-md rounded-lg p-6">
//         <h2 className="text-2xl font-semibold mb-4">Items</h2>
//         {order.items?.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   {['Code', 'Name', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total'].map((h) => (
//                     <th key={h} className="px-4 py-2 text-left text-sm font-medium text-gray-600">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {order.items.map((it, i) => (
//                   <tr key={i} className="hover:bg-gray-50">
//                     <td className="px-4 py-2">{it.itemCode || '-'}</td>
//                     <td className="px-4 py-2">{it.itemName || '-'}</td>
//                     <td className="px-4 py-2">{it.quantity}</td>
//                     <td className="px-4 py-2">{formatCurrency(it.unitPrice)}</td>
//                     <td className="px-4 py-2">{formatCurrency(it.discount)}</td>
//                     <td className="px-4 py-2">
//                       {it.taxOption} {it.gstRate}% (
//                       {formatCurrency(it.taxOption === 'IGST' ? it.igstAmount : it.gstAmount)})
//                     </td>
//                     <td className="px-4 py-2 font-semibold">{formatCurrency(it.totalAmount)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-gray-500">No items found.</p>
//         )}
//       </div>

//       {/* Financial Summary */}
//       <div className="bg-white shadow-md rounded-lg p-6 grid md:grid-cols-2 gap-6">
//         <div>
//           <p><strong>Total Before Discount:</strong> {formatCurrency(order.totalBeforeDiscount)}</p>
//           <p><strong>Freight:</strong> {formatCurrency(order.freight)}</p>
//           <p><strong>Rounding:</strong> {formatCurrency(order.rounding)}</p>
//         </div>
//         <div>
//           <p><strong>GST Total:</strong> {formatCurrency(order.gstTotal)}</p>
//           <p><strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}</p>
//           <p><strong>Open Balance:</strong> {formatCurrency(order.openBalance)}</p>
//         </div>
//       </div>
//     </div>
//   );
// }
