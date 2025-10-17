'use client';

import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/sales-order/${id}`);
        if (res.data && res.data.data) {
          setOrder(res.data.data);
        } else {
          setError('Order not found');
        }
      } catch (error) {
        console.error('Failed to fetch sales-order:', error);
        setError('Failed to fetch sales-order');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
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
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600 text-xl">{error}</p>
      </div>
    );
  }

  if (!order) {
    return <p>Order not found</p>;
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/users/sales-order-view">
        <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
          ← Back to Order List
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Sales Order Details</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2">
              <p><strong>Customer Code:</strong> {order.customerCode}</p>
              <p><strong>Customer Name:</strong> {order.customerName}</p>
              <p><strong>Contact Person:</strong> {order.contactPerson}</p>
              <p><strong>Sales Employee:</strong> {order.salesEmployee || '-'}</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Order Information</h2>
            <div className="space-y-2">
              <p><strong>Order Number:</strong> {order.refNumber}</p>
              <p><strong>Order Date:</strong> {formatDate(order.orderDate)}</p>
              <p><strong>Expected Delivery:</strong> {formatDate(order.expectedDeliveryDate)}</p>
              <p>
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  order.status === "Confirmed" 
                    ? "bg-green-200 text-green-800" 
                    : "bg-yellow-200 text-yellow-800"
                }`}>
                  {order.status}
                </span>
              </p>
              <p><strong>From Quote:</strong> {order.fromQuote ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
        
        {/* Address Information */}
        {(order.billingAddress || order.shippingAddress) && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-xl font-semibold mb-4">Address Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing Address */}
              {order.billingAddress && (
                <div>
                  <h3 className="font-medium mb-2 text-blue-600">Billing Address</h3>
                  <div className="bg-gray-50 p-3 rounded border">
                    {order.billingAddress.address1 && <p>{order.billingAddress.address1}</p>}
                    {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
                    <p>
                      {[order.billingAddress.city, order.billingAddress.state, order.billingAddress.zip]
                        .filter(Boolean).join(', ')}
                    </p>
                    {order.billingAddress.country && <p>{order.billingAddress.country}</p>}
                  </div>
                </div>
              )}
              
              {/* Shipping Address */}
              {order.shippingAddress && (
                <div>
                  <h3 className="font-medium mb-2 text-green-600">Shipping Address</h3>
                  <div className="bg-gray-50 p-3 rounded border">
                    {order.shippingAddress.address1 && <p>{order.shippingAddress.address1}</p>}
                    {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                    <p>
                      {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip]
                        .filter(Boolean).join(', ')}
                    </p>
                    {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p><strong>Total Before Discount:</strong> {formatCurrency(order.totalBeforeDiscount)}</p>
              <p><strong>Freight:</strong> {formatCurrency(order.freight)}</p>
              <p><strong>Rounding:</strong> {formatCurrency(order.rounding)}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Total Down Payment:</strong> {formatCurrency(order.totalDownPayment)}</p>
              <p><strong>Applied Amounts:</strong> {formatCurrency(order.appliedAmounts)}</p>
              <p><strong>Open Balance:</strong> {formatCurrency(order.openBalance)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xl font-bold">
              <strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}
            </p>
          </div>
        </div>
        
        {order.remarks && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-xl font-semibold mb-2">Remarks</h2>
            <p className="text-gray-700">{order.remarks}</p>
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
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
      </div>
         <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <h3 className="text-xl font-semibold mb-2">Attachments</h3>
            {order.attachments && order.attachments.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {order.attachments.map((attachment, index) => {
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
        <Link href="/admin/sales-order-view">
          <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
            Back to List
          </button>
        </Link>
        <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            Edit Order
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
//         const res = await axios.get(`/api/sales-order/${id}`);
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
//       <Link href="/admin/sales-order-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
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
//         <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
