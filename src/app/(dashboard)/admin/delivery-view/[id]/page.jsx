'use client';

import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useEffect, useState  } from 'react';
import React from 'react';

export default function InvoiceDetail({ params }) {
  // Use params directly from the function argument
  
  const { id } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState({ items: [] });

useEffect(() => {
  const fetchDeliveryAndOrder = async () => {
    try {
      setLoading(true);

      // ✅ Fetch delivery
      const res = await axios.get(`/api/sales-delivery/${id}`);
      if (res.data?.data) {
        const deliveryData = res.data.data;
        setDelivery(deliveryData);

        // ✅ If delivery has salesOrderId, fetch related order
        if (deliveryData.salesOrderId) {
          const orderRes = await axios.get(`/api/sales-order/${deliveryData.salesOrderId}`);
          if (orderRes.data?.data) {
            setOrder(orderRes.data.data);
          }
        }
      } else {
        setError("Delivery not found");
      }
    } catch (error) {
      console.error("Failed to fetch delivery:", error);
      setError("Failed to fetch delivery details");
    } finally {
      setLoading(false);
    }
  };

  if (id) fetchDeliveryAndOrder();
}, [id]);


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : '-';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading delivery details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600 text-xl">{error}</p>
        <Link href="/admin/delivery-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Delivery List
          </button>
        </Link>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="container mx-auto p-6">
        <p>Delivery not found</p>
        <Link href="/admin/delivery-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Delivery List
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/admin/delivery-view">
        <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
          ← Back to Delivery List
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Delivery Details</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2">
              <p><strong>Customer Code:</strong> {delivery.customerCode}</p>
              <p><strong>Customer Name:</strong> {delivery.customerName}</p>
              <p><strong>Contact Person:</strong> {delivery.contactPerson}</p>
              <p><strong>Sales Employee:</strong> {delivery.salesEmployee || '-'}</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
            <div className="space-y-2">
              <p><strong>Reference Number:</strong> {delivery.refNumber || '-'}</p>
              <p><strong>Order Date:</strong> {formatDate(delivery.orderDate)}</p>
              <p><strong>Posting Date:</strong> {formatDate(delivery.postingDate)}</p>
              <p><strong>Expected Delivery:</strong> {formatDate(delivery.expectedDeliveryDate)}</p>
              <p>
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  delivery.status === "Confirmed" 
                    ? "bg-green-200 text-green-800" 
                    : "bg-yellow-200 text-yellow-800"
                }`}>
                  {delivery.status}
                </span>
              </p>
              <p><strong>From Quote:</strong> {delivery.fromQuote ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p><strong>Total Before Discount:</strong> {formatCurrency(delivery.totalBeforeDiscount)}</p>
              <p><strong>Freight:</strong> {formatCurrency(delivery.freight)}</p>
              <p><strong>Rounding:</strong> {formatCurrency(delivery.rounding)}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Total Down Payment:</strong> {formatCurrency(delivery.totalDownPayment)}</p>
              <p><strong>Applied Amounts:</strong> {formatCurrency(delivery.appliedAmounts)}</p>
              <p><strong>Open Balance:</strong> {formatCurrency(delivery.openBalance)}</p>
              <p><strong>GST Total:</strong> {formatCurrency(delivery.gstTotal)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xl font-bold">
              <strong>Grand Total:</strong> {formatCurrency(delivery.grandTotal)}
            </p>
          </div>
        </div>
        
        {delivery.remarks && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-xl font-semibold mb-2">Remarks</h2>
            <p className="text-gray-700">{delivery.remarks}</p>
          </div>
        )}
      </div>

   <div className="bg-white shadow-md rounded-lg p-6 mb-6">
  <h2 className="text-2xl font-semibold mb-4">Delivery Items</h2>
  {delivery.items && delivery.items.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Item Code</th>
            <th className="border p-2 text-left">Item Name</th>
            <th className="border p-2 text-left">Description</th>
            <th className="border p-2 text-left">Warehouse</th>
            <th className="border p-2 text-center">Quantity</th>
            <th className="border p-2 text-center">Unit Price</th>
            <th className="border p-2 text-center">Discount</th>
            <th className="border p-2 text-center">Total</th>
            <th className="border p-2 text-center">Batch Details</th>
          </tr>
        </thead>
        <tbody>
          {delivery.items.map((item, index) => (
            <React.Fragment key={item._id || `item-${index}`}>
              {/* Main Item Row */}
              <tr className="hover:bg-gray-50">
                <td className="border p-2">{item.itemCode}</td>
                <td className="border p-2">{item.itemName}</td>
                <td className="border p-2">{item.itemDescription}</td>
                <td className="border p-2">
                  {item.warehouseCode} - {item.warehouseName}
                </td>
                <td className="border p-2 text-center">
                  <div className="flex flex-col">
                    <span>Ordered: {item.quantity}</span>
                    {item.allowedQuantity > 0 && (
                      <span className="text-sm text-green-600">
                        Allowed: {item.allowedQuantity}
                      </span>
                    )}
                  </div>
                </td>
                <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
                <td className="border p-2 text-right font-medium">
                  {formatCurrency(item.totalAmount)}
                </td>
                <td className="border p-2 text-center">
                  {item.managedByBatch ? "Batch Managed" : "Not Batch Managed"}
                </td>
              </tr>

              {/* Batch Details */}
              {item.managedByBatch && item.batches && item.batches.length > 0 && (
                <tr key={`batch-${item._id || index}`}>
                  <td colSpan="9" className="border p-2 bg-gray-50">
                    <h3 className="font-semibold mb-2">Batch Details:</h3>
                    <table className="min-w-full bg-gray-100">
                      <thead>
                        <tr>
                          <th className="p-2 text-left">Batch Code</th>
                          <th className="p-2 text-left">Expiry Date</th>
                          <th className="p-2 text-left">Manufacturer</th>
                          <th className="p-2 text-center">Allocated Qty</th>
                          <th className="p-2 text-center">Available Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.batches.map((batch, batchIndex) => (
                          <tr key={batch._id || `batch-${item._id}-${batchIndex}`}>
                            <td className="p-2">{batch.batchCode}</td>
                            <td className="p-2">{formatDate(batch.expiryDate)}</td>
                            <td className="p-2">{batch.manufacturer}</td>
                            <td className="p-2 text-center">{batch.allocatedQuantity}</td>
                            <td className="p-2 text-center">{batch.availableQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}

              {/* Error Message Row */}
              {item.errorMessage && (
                <tr key={`error-${item._id || index}`}>
                  <td colSpan="9" className="border p-2 bg-red-50 text-red-700">
                    <strong>Error:</strong> {item.errorMessage}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-center text-gray-500 py-4">No items available.</p>
  )}
</div>

       {/* <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
        {order.items && order.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Item Code</th>
                  <th className="border p-2 text-left">Item Name</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-left">Warehouse</th>
                  <th className="border p-2 text-center">Qty</th>
                  <th className="border p-2 text-center">Unit Price</th>
                  <th className="border p-2 text-center">Discount</th>
                  <th className="border p-2 text-center">Tax</th>
                  <th className="border p-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-2">{item.itemCode}</td>
                    <td className="border p-2">{item.itemName}</td>
                    <td className="border p-2">{item.itemDescription}</td>
                    <td className="border p-2">
                      {item.warehouseCode} - {item.warehouseName}
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex flex-col">
                        <span>Ordered: {item.quantity}</span>
                        {item.allowedQuantity > 0 && (
                          <span className="text-sm text-green-600">
                            Allowed: {item.allowedQuantity}
                          </span>
                        )}
                        {item.receivedQuantity > 0 && (
                          <span className="text-sm text-blue-600">
                            Received: {item.receivedQuantity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
                    <td className="border p-2 text-center">
                      <div className="flex flex-col">
                        <span>{item.taxOption}: {item.gstRate}%</span>
                        <span className="text-xs">
                          {formatCurrency(item.gstAmount)}
                        </span>
                      </div>
                    </td>
                    <td className="border p-2 text-right font-medium">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No items available.</p>
        )}
      </div> */}


        <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <h3 className="text-xl font-semibold mb-2">Attachments</h3>
            {delivery.attachments && delivery.attachments.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {delivery.attachments.map((attachment, index) => {
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
      

      <div className="flex justify-end space-x-4">
        <Link href="/admin/delivery-view">
          <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
            Back to List
          </button>
        </Link>
        <Link href={`/admin/delivery-view/new?editId=${delivery._id}`}>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            Edit Delivery
          </button>
        </Link>
      </div>
    </div>
  );
}


// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [order, setOrder] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         const res = await axios.get(`/api/sales-delivery/${id}`);
//         console.log(res.data.data)
//         setOrder(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch sales-order:', error);
//         setError('Failed to fetch sales-order');
//       }
//     };

//     if (id) {
//         fetchOrder();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!order) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/delivery-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
      
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.postingDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {order.status}</p>
//         <p><strong>Grand Total:</strong> {order.grandTotal}</p>
//         <p><strong>Remarks:</strong> {order.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {order.items && order.items.length > 0 ? (
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
//               {order.items.map((item, index) => (
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
//         <Link href={`/admin/delivery-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
