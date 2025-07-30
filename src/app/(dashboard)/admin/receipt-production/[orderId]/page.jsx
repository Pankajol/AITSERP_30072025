// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useSearchParams } from 'next/navigation';
// import axios from 'axios';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// function BatchModal({ batches, setBatches, onClose }) {
//   const handleBatchChange = (index, field, value) => {
//     const updated = [...batches];
//     updated[index][field] = value;
//     setBatches(updated);
//   };

//   const addBatch = () => {
//     setBatches([...batches, { batchNumber: '', quantity: 0, unitPrice: 0, expiryDate: '', manufacturer: '' }]);
//   };

//   const removeBatch = (index) => {
//     const updated = [...batches];
//     updated.splice(index, 1);
//     setBatches(updated);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded shadow w-full max-w-2xl">
//         <h2 className="text-lg font-semibold mb-4">Enter Batch Details</h2>
//         <table className="w-full text-sm border mb-4">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Batch No</th>
//               <th className="border p-2">Qty</th>
//               {/* <th className="border p-2">Price</th> */}
//               <th className="border p-2">Expiry</th>
//               <th className="border p-2">Manufacturer</th>
//               <th className="border p-2">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {batches.map((batch, i) => (
//               <tr key={i}>
//                 <td className="border p-2">
//                   <input
//                     value={batch.batchNumber}
//                     onChange={(e) => handleBatchChange(i, 'batchNumber', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="number"
//                     value={batch.quantity}
//                     onChange={(e) => handleBatchChange(i, 'quantity', Number(e.target.value))}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 {/* <td className="border p-2">
//                   <input
//                     type="number"
//                     value={batch.unitPrice}
//                     onChange={(e) => handleBatchChange(i, 'unitPrice', Number(e.target.value))}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td> */}
//                 <td className="border p-2">
//                   <input
//                     type="date"
//                     value={batch.expiryDate}
//                     onChange={(e) => handleBatchChange(i, 'expiryDate', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     value={batch.manufacturer}
//                     onChange={(e) => handleBatchChange(i, 'manufacturer', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <button onClick={() => removeBatch(i)} className="text-red-600">Remove</button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         <button onClick={addBatch} className="mr-4 px-4 py-1 bg-blue-500 text-white rounded">+ Add Batch</button>
//         <button onClick={onClose} className="px-4 py-1 bg-green-600 text-white rounded">Done</button>
//       </div>
//     </div>
//   );
// }

// export default function ReceiptForProductionPage() {
//   const params = useParams();
//   const searchParams = useSearchParams();
//   const orderId = params?.orderId;
//   const qtyParam = Number(searchParams.get('qty')) || 1; // Quantity from URL param

//   const [order, setOrder] = useState(null);
//   const [docNo, setDocNo] = useState('');
//   const [docDate, setDocDate] = useState('');
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState('');
//   const [batches, setBatches] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [unitPrice, setUnitPrice] = useState(0);
//   const [loading, setLoading] = useState(true);

//   // Load warehouses on mount
//   useEffect(() => {
//     axios.get('/api/warehouse')
//       .then((r) => setWarehouseOptions(r.data))
//       .catch(console.error);
//   }, []);

//   // Load order data and initialize
//   useEffect(() => {
//     if (!orderId) return;
//     (async () => {
//       try {
//         const { data: ord } = await axios.get(`/api/production-orders/${orderId}`);
//         setOrder(ord);

//         const todayStr = new Date().toISOString().slice(0, 10);
//         const docNoFormatted = `RP-${todayStr.replace(/-/g, '')}-${orderId.slice(-4)}`;
//         setDocNo(docNoFormatted);
//         setDocDate(todayStr);

//         const sw = ord.warehouse?._id || ord.warehouse || '';
//         setSourceWarehouse(sw);

//         // Set unit price from product if available
//         setUnitPrice(ord.rate || 0);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [orderId]);



//   if (order?.bomId) {
//   console.log(order.bomId.productNo, order.bomId.productDesc);
// } else {
//   console.log('No BOM details found');
// }


//   // Calculate total price live
//   const totalPrice = (qtyParam * unitPrice).toFixed(2);

//   const handleSubmit = useCallback(
//     async (e) => {
//       e.preventDefault();
//       if (!order) return toast.error('Order not loaded');

//       // Validate batches
//       if (batches.length === 0) {
//         toast.error('Please enter at least one batch');
//         return;
//       }

//       // You might want to validate total batch qty matches qtyParam here

//       const dataToSend = batches.map((batch) => {
//         if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//           toast.error('Invalid batch data');
//           return null;
//         }
//         return {
//           productionOrderId: order._id,
//           itemId: order?.bomId?.productNo ,
//           sourceWarehouse,
//           batchNumber: batch.batchNumber,
//           quantity: batch.quantity,
//           expiryDate: batch.expiryDate || null,
//           manufacturer: batch.manufacturer || null,
//           unitPrice: order.rate || null,
//         };
//       }).filter(Boolean);

//       try {
//         await axios.post(`/api/receipt-production/${order._id}?qty=${qtyParam}`, dataToSend);
//         toast.success('Production receipt created');
//       } catch (error) {
//         toast.error(error?.response?.data?.message || 'Failed to create receipt');
//       }
//     },
//     [order, qtyParam, batches, sourceWarehouse, unitPrice]
//   );

//   if (loading) return <p>Loading...</p>;
//   if (!order) return <p>Production order not found</p>;

//   return (
//     <div className="max-w-5xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Receipt for Production</h1>

//       <form onSubmit={handleSubmit}>
//         <div className="mb-6 flex flex-wrap gap-4 items-center">
//           <input readOnly value={docNo} className="border p-2 bg-gray-100 rounded w-48" title="Document No" />

//           <input
//             type="date"
//             value={docDate}
//             onChange={(e) => setDocDate(e.target.value)}
//             className="border p-2 rounded w-48"
//             title="Document Date"
//           />

//           <select
//             value={sourceWarehouse}
//             onChange={(e) => setSourceWarehouse(e.target.value)}
//             required
//             className="border p-2 rounded w-48"
//             title="Select Warehouse"
//           >
//             <option value="">-- select warehouse --</option>
//             {warehouseOptions.map((w) => (
//               <option key={w._id} value={w._id}>{w.warehouseName}</option>
//             ))}
//           </select>
//         </div>

//         <table className="w-full border-collapse border border-gray-300 mb-6">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border border-gray-300 p-2">Product No</th>
//               <th className="border border-gray-300 p-2">Product Desc</th>
//               <th className="border border-gray-300 p-2">Qty</th>
//               <th className="border border-gray-300 p-2">Unit Price</th>
//               <th className="border border-gray-300 p-2">Total Price</th>
//               <th className="border border-gray-300 p-2">Batch</th>
//             </tr>
//           </thead>
//           <tbody>
//             <tr>
//               <td className="border border-gray-300 p-2 text-center">{order?.bomId?.productNo || 'N/A'}</td>
//               <td className="border border-gray-300 p-2">{order?.bomId?.productDesc || 'N/A'}</td>
//               <td className="border border-gray-300 p-2 text-center">{qtyParam}</td>
//               <td className="border border-gray-300 p-2 text-right">
//                 <input
//                   type="number"
//                   min={0}
//                   step="0.01"
//                   value={order?.rate}
//                   onChange={(e) => setUnitPrice(Number(e.target.value))}
//                   className="w-full text-right border rounded p-1"
//                   title="rate"
//                 />
//               </td>
//               <td className="border border-gray-300 p-2 text-right">₹{totalPrice}</td>
//               <td className="border border-gray-300 p-2 text-center">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(true)}
//                   className="px-3 py-1 bg-blue-600 text-white rounded"
//                   title="Enter batch details"
//                 >
//                   Enter Batches
//                 </button>
//               </td>
//             </tr>
//           </tbody>
//         </table>

//         <button
//           type="submit"
//           className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
//         >
//           Save Receipt
//         </button>
//       </form>

//       {showModal && (
//         <BatchModal
//           batches={batches}
//           setBatches={setBatches}
//           onClose={() => setShowModal(false)}
//         />
//       )}
//     </div>
//   );
// }



























'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function BatchModal({ batches, setBatches, onClose }) {
  const handleBatchChange = (index, field, value) => {
    const updated = [...batches];
    updated[index][field] = value;
    setBatches(updated);
  };

  const addBatch = () => {
    setBatches([...batches, { batchNumber: '', quantity: 0, expiryDate: '', manufacturer: '' }]);
  };

  const removeBatch = (index) => {
    const updated = [...batches];
    updated.splice(index, 1);
    setBatches(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Enter Batch Details</h2>
        <table className="w-full text-sm border mb-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Batch No</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Expiry</th>
              <th className="border p-2">Manufacturer</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch, i) => (
              <tr key={i}>
                <td className="border p-2">
                  <input
                    value={batch.batchNumber}
                    onChange={(e) => handleBatchChange(i, 'batchNumber', e.target.value)}
                    className="w-full border p-1 rounded"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={batch.quantity}
                    onChange={(e) => handleBatchChange(i, 'quantity', Number(e.target.value))}
                    className="w-full border p-1 rounded"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="date"
                    value={batch.expiryDate}
                    onChange={(e) => handleBatchChange(i, 'expiryDate', e.target.value)}
                    className="w-full border p-1 rounded"
                  />
                </td>
                <td className="border p-2">
                  <input
                    value={batch.manufacturer}
                    onChange={(e) => handleBatchChange(i, 'manufacturer', e.target.value)}
                    className="w-full border p-1 rounded"
                  />
                </td>
                <td className="border p-2 text-center">
                  <button onClick={() => removeBatch(i)} className="text-red-600">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addBatch} className="mr-4 px-4 py-1 bg-blue-500 text-white rounded">+ Add Batch</button>
        <button onClick={onClose} className="px-4 py-1 bg-green-600 text-white rounded">Done</button>
      </div>
    </div>
  );
}

export default function ReceiptForProductionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params?.orderId;
  const qtyParam = Number(searchParams.get('qty')) || 1;

  const [order, setOrder] = useState(null);
  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [unitPrice, setUnitPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;

    axios
      .get("/api/warehouse", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((r) => setWarehouseOptions(r.data.data))
      .catch((err) => {
        console.error("Failed to fetch warehouse:", err);
      });
  }, [token]);

  useEffect(() => {
    if (!orderId || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(`/api/production-orders/${orderId}`, {
          headers: {
            
            
            Authorization: `Bearer ${token}`,
          },
        });

        const ord = res.data;

        console.log(ord);

        if (cancelled) return;
        setOrder(ord);

        const todayStr = new Date().toISOString().slice(0, 10);
        const docNoFormatted = `RP-${todayStr.replace(/-/g, '')}-${orderId?.slice(-4)}`;
        setDocNo(docNoFormatted);
        setDocDate(todayStr);

        const sw = ord.warehouse?._id || ord.warehouse || '';
        setSourceWarehouse(sw);
        setUnitPrice(ord?.rate || 0);
      } catch (e) {
        console.error("Error fetching production order:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  const totalPrice = (qtyParam * unitPrice).toFixed(2);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!token) return toast.error('Unauthorized');

    if (!order) return toast.error('Order not loaded');

    if (batches.length === 0) {
      toast.error('Please enter at least one batch');
      return;
    }

    for (const batch of batches) {
      if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
        toast.error('Invalid batch data');
        return;
      }
    }

    // const dataToSend = [{
    //   itemId: order?.bomId?._id,
    //   productNo: order?.bomId?.productNo,
    //   productDesc: order?.bomId?.productDesc,
    //   quantity: qtyParam,
    //   sourceWarehouse,
    //   warehouseName: warehouseOptions.find(w => w._id === sourceWarehouse)?.warehouseName || '',
    //   docNo,
    //   docDate,
    //   totalPrice: Number(totalPrice),
    //   unitPrice: unitPrice || 0,
    //   batches: batches.map((batch) => ({
    //     batchNumber: batch.batchNumber,
    //     quantity: batch.quantity,
    //     expiryDate: batch.expiryDate || null,
    //     manufacturer: batch.manufacturer || null,
    //   })),
    // }];
const dataToSend = {
  item: order?.bomId?.productNo?._id, // ObjectId of the item
  productionOrder: order?._id,        // ID of the order
  companyId: order?.companyId?._id || order?.companyId, // Ensure it's correct
  warehouse: sourceWarehouse,
  productNo: order?.bomId?.productNo?.itemCode,
  uom: order?.bomId?.productNo?.uom || '',
  unitPrice: unitPrice || 0,
  batchNo: batches?.[0]?.batchNumber || '',
  remarks: '',
  date: docDate,
  batches: batches.map((batch) => ({
    batchNumber: batch.batchNumber,
    quantity: batch.quantity,
    expiryDate: batch.expiryDate || null,
    manufacturer: batch.manufacturer || null,
  })),
};



    try {
      await axios.post(
        `/api/receipt-production/${order._id}?qty=${qtyParam}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('Production receipt created');
      router.push("/admin/productionorders-list-view");
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to create receipt');
    }
  }, [order, qtyParam, batches, sourceWarehouse, unitPrice, docNo, docDate, warehouseOptions, router, totalPrice, token]);

  if (loading) return <p>Loading...</p>;
  if (!order) return <p>Production order not found</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow rounded">
      <ToastContainer />
      <h1 className="text-2xl font-semibold mb-6">Receipt for Production</h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <input readOnly value={docNo} className="border p-2 bg-gray-100 rounded w-48" />
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            className="border p-2 rounded w-48"
          />
          <select
            value={sourceWarehouse}
            onChange={(e) => setSourceWarehouse(e.target.value)}
            required
            className="border p-2 rounded w-48"
          >
            <option value="">-- select warehouse --</option>
            {warehouseOptions.map((w) => (
              <option key={w._id} value={w._id}>{w.warehouseName}</option>
            ))}
          </select>
        </div>

        <table className="w-full border-collapse border border-gray-300 mb-6">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Product No</th>
              <th className="border p-2">Product Desc</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Unit Price</th>
              <th className="border p-2">Total Price</th>
              <th className="border p-2">Batch</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 text-center">{order?.bomId?.productNo?.itemCode || 'N/A'}</td>
              <td className="border p-2">{order?.bomId?.productNo?.itemName || 'N/A'}</td>
              <td className="border p-2 text-center">{qtyParam}</td>
              <td className="border p-2 text-right">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full text-right border rounded p-1"
                />
              </td>
              <td className="border p-2 text-right">₹{totalPrice}</td>
              <td className="border p-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Enter Batches
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <button
          type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save Receipt
        </button>
      </form>

      {showModal && (
        <BatchModal
          batches={batches}
          setBatches={setBatches}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}





























// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useSearchParams,useRouter } from 'next/navigation';
// import axios from 'axios';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// function BatchModal({ batches, setBatches, onClose }) {
//   const handleBatchChange = (index, field, value) => {
//     const updated = [...batches];
//     updated[index][field] = value;
//     setBatches(updated);
//   };

//   const addBatch = () => {
//     setBatches([...batches, { batchNumber: '', quantity: 0, expiryDate: '', manufacturer: '' }]);
//   };

//   const removeBatch = (index) => {
//     const updated = [...batches];
//     updated.splice(index, 1);
//     setBatches(updated);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded shadow w-full max-w-2xl">
//         <h2 className="text-lg font-semibold mb-4">Enter Batch Details</h2>
//         <table className="w-full text-sm border mb-4">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Batch No</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Expiry</th>
//               <th className="border p-2">Manufacturer</th>
//               <th className="border p-2">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {batches.map((batch, i) => (
//               <tr key={i}>
//                 <td className="border p-2">
//                   <input
//                     value={batch.batchNumber}
//                     onChange={(e) => handleBatchChange(i, 'batchNumber', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="number"
//                     value={batch.quantity}
//                     onChange={(e) => handleBatchChange(i, 'quantity', Number(e.target.value))}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="date"
//                     value={batch.expiryDate}
//                     onChange={(e) => handleBatchChange(i, 'expiryDate', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     value={batch.manufacturer}
//                     onChange={(e) => handleBatchChange(i, 'manufacturer', e.target.value)}
//                     className="w-full border p-1 rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <button onClick={() => removeBatch(i)} className="text-red-600">Remove</button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         <button onClick={addBatch} className="mr-4 px-4 py-1 bg-blue-500 text-white rounded">+ Add Batch</button>
//         <button onClick={onClose} className="px-4 py-1 bg-green-600 text-white rounded">Done</button>
//       </div>
//     </div>
//   );
// }

// export default function ReceiptForProductionPage() {
//   const params = useParams();
//   const searchParams = useSearchParams();
//     const router = useRouter(); // ✅ router defined
//   const orderId = params?.orderId;
//   const qtyParam = Number(searchParams.get('qty')) || 1;

//   const [order, setOrder] = useState(null);
//   const [docNo, setDocNo] = useState('');
//   const [docDate, setDocDate] = useState('');
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState('');
//   const [batches, setBatches] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [unitPrice, setUnitPrice] = useState(0);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     axios.get('/api/warehouse')
//       .then((r) => setWarehouseOptions(r.data))
//       .catch(console.error);
//   }, []);

//   useEffect(() => {
//     if (!orderId) return;
//     (async () => {
//       try {
//         const { data: ord } = await axios.get(`/api/production-orders/${orderId}`);
//         setOrder(ord);

//         const todayStr = new Date().toISOString().slice(0, 10);
//         const docNoFormatted = `RP-${todayStr.replace(/-/g, '')}-${orderId.slice(-4)}`;
//         setDocNo(docNoFormatted);
//         setDocDate(todayStr);

//         const sw = ord.warehouse?._id || ord.warehouse || '';
//         setSourceWarehouse(sw);

//         setUnitPrice(ord.rate || 0);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [orderId]);

//   const totalPrice = (qtyParam * unitPrice).toFixed(2);

// const handleSubmit = useCallback(
//   async (e) => {
//     e.preventDefault();
//     if (!order) return toast.error('Order not loaded');

//     if (batches.length === 0) {
//       toast.error('Please enter at least one batch');
//       return;
//     }

//     // Validate batch data before sending
//     for (const batch of batches) {
//       if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//         toast.error('Invalid batch data');
//         return;
//       }
//     }

//     // Prepare data in expected format
//   const dataToSend = [
//   {
//     itemId: order?.bomId?._id,
//     productNo: order?.bomId?._id,
//     productDesc: order?.bomId?.productDesc,
//     quantity: qtyParam,
//     sourceWarehouse,
//     warehouseName: warehouseOptions.find(w => w._id === sourceWarehouse)?.warehouseName || '',
//     docNo,
//     docDate,
//     totalPrice: Number((qtyParam * unitPrice).toFixed(2)),
//     unitPrice: unitPrice || 0,
//     batches: batches.map((batch) => ({
//       batchNumber: batch.batchNumber,
//       quantity: batch.quantity,
//       expiryDate: batch.expiryDate || null,
//       manufacturer: batch.manufacturer || null,
//     })),
//   }
// ];


//     try {
//       await axios.post(`/api/receipt-production/${order._id}?qty=${qtyParam}`, dataToSend);
//       toast.success('Production receipt created');
//       router.push("/admin/productionorders-list-view");
//     } catch (error) {
//       // toast.error(error?.response?.data?.message || 'Failed to create receipt');
//     }
//   },
//   [order, qtyParam, batches, sourceWarehouse, unitPrice, docNo, docDate]
// );


//   if (loading) return <p>Loading...</p>;
//   if (!order) return <p>Production order not found</p>;

//   return (
//     <div className="max-w-5xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Receipt for Production</h1>

//       <form onSubmit={handleSubmit}>
//         <div className="mb-6 flex flex-wrap gap-4 items-center">
//           <input readOnly value={docNo} className="border p-2 bg-gray-100 rounded w-48" />
//           <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="border p-2 rounded w-48" />
//           <select value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)} required className="border p-2 rounded w-48">
//             <option value="">-- select warehouse --</option>
//             {warehouseOptions.map((w) => (
//               <option key={w._id} value={w._id}>{w.warehouseName}</option>
//             ))}
//           </select>
//         </div>

//         <table className="w-full border-collapse border border-gray-300 mb-6">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Product No</th>
//               <th className="border p-2">Product Desc</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Unit Price</th>
//               <th className="border p-2">Total Price</th>
//               <th className="border p-2">Batch</th>
//             </tr>
//           </thead>
//           <tbody>
//             <tr>
//               <td className="border p-2 text-center">  {order?.bomId?.productNo?.itemCode || 'N/A'}</td>
//               <td className="border p-2">{order?.bomId?.productDesc || 'N/A'}</td>
//               <td className="border p-2 text-center">{qtyParam}</td>
//               <td className="border p-2 text-right">
//                 <input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="w-full text-right border rounded p-1" />
//               </td>
//               <td className="border p-2 text-right">₹{totalPrice}</td>
//               <td className="border p-2 text-center">
//                 <button type="button" onClick={() => setShowModal(true)} className="px-3 py-1 bg-blue-600 text-white rounded">
//                   Enter Batches
//                 </button>
//               </td>
//             </tr>
//           </tbody>
//         </table>

//         <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
//           Save Receipt
//         </button>
//       </form>

//       {showModal && (
//         <BatchModal
//           batches={batches}
//           setBatches={setBatches}
//           onClose={() => setShowModal(false)}
//         />
//       )}
//     </div>
//   );
// }
