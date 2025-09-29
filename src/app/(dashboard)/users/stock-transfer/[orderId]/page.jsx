"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import MultiBatchModal from "@/components/MultiBatchModalbtach";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StockTransferPage() {
  const { orderId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qtyParam = Number(searchParams.get("qty")) || 1;

  const [order, setOrder] = useState(null);
  const [rows, setRows] = useState([]);
  const [docNo, setDocNo] = useState("");
  const [docDate, setDocDate] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [batchModalIndex, setBatchModalIndex] = useState(null);
  const [batchOptions, setBatchOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      toast.error("Unauthorized. Please login.");
      router.push("/login");
      return;
    }
    setToken(t);

    axios
      .get("/api/warehouse", {
        headers: { Authorization: `Bearer ${t}` },
      })
      .then((r) => setWarehouseOptions(r.data.data))
      .catch(console.error);
  }, [router]);

  useEffect(() => {
    if (!orderId || !token) return;

    (async () => {
      try {
        const { data: ord } = await axios.get(
          `/api/production-orders/${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrder(ord);

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        setDocNo(`ST-${today}-${orderId.slice(-4)}`);
        setDocDate(new Date().toISOString().slice(0, 10));

        // Initialize rows
        const rowsWithBatchFlag = await Promise.all(
          ord.items.map(async (item) => {
            const itemId = item.item?._id || item.item || "";
            let managedByBatch = false;

            try {
              const { data } = await axios.get(`/api/items/${itemId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              managedByBatch = (data?.data?.managedBy || "").toLowerCase() === "batch";
            } catch (err) {
              console.warn(`Error fetching item ${itemId}:`, err);
            }

            return {
              itemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              uom: item.unitQty > 1 ? `x${item.unitQty}` : "pcs",
              qty: qtyParam * item.quantity,
              batches: [],
              batchNumber: "",
              // Store warehouse info
              warehouse: item.warehouse?._id || "",
              warehouseName: item.warehouse?.warehouseName || "",
              warehouseCode: item.warehouse?.warehouseCode || "",
              binLocations: [], // fetched later
              selectedBin: null,
              destination: item.warehouse?._id || "",
              managedByBatch,
            };
          })
        );

        setRows(rowsWithBatchFlag);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, qtyParam, token]);

  // Fetch bins when warehouseCode changes
  useEffect(() => {
    rows.forEach(async (row, idx) => {
      if (!row.warehouseCode) return;
      try {
        const { data } = await axios.get(
          `/api/warehouse/${row.warehouseCode}/bins`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRows((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], binLocations: data.data || [], selectedBin: null };
          return updated;
        });
      } catch (err) {
        console.error(err);
        setRows((prev) => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], binLocations: [], selectedBin: null };
          return updated;
        });
      }
    });
  }, [rows.map((r) => r.warehouseCode).join(), token]);

  const onItemChange = (index, e) => {
    const { name, value } = e.target;
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });
  };

  const handleWarehouseSelect = async (index, selectedWarehouse) => {
    onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
    onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
    onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/warehouse/${selectedWarehouse.warehouseCode}/bins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
    } catch (err) {
      console.error(err);
      onItemChange(index, { target: { name: "binLocations", value: [] } });
    }

    setShowWarehouseDropdown(false);
  };

  const handleSearchChangeWarehouse = (index, value) => {
    onItemChange(index, { target: { name: "warehouseName", value } });
    if (value.length > 0) {
      const filtered = warehouseOptions.filter(
        (wh) =>
          wh.warehouseName.toLowerCase().includes(value.toLowerCase()) ||
          wh.warehouseCode.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredWarehouses(filtered);
      setShowWarehouseDropdown(true);
      setActiveDropdownIndex(index);
    } else {
      setShowWarehouseDropdown(false);
    }
  };

  const openBatchModal = useCallback((idx) => setBatchModalIndex(idx), []);
  const closeBatchModal = useCallback(() => setBatchModalIndex(null), []);

  const handleUpdateBatch = (updatedBatch) => {
    if (batchModalIndex == null || !rows[batchModalIndex]) return;
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[batchModalIndex] = {
        ...updated[batchModalIndex],
        batches: updatedBatch,
        batchNumber: updatedBatch.map((b) => b.batchNumber).join(", "),
      };
      return updated;
    });
    closeBatchModal();
  };

  const handleQtyChange = (index, newQty) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[index].qty = parseFloat(newQty) || 0;
      return updated;
    });
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const dataToSend = [];

      for (const row of rows) {
        if (row.managedByBatch) {
          if (!row.batches || row.batches.length === 0) {
            toast.error(`Please select batches for item ${row.itemCode}`);
            return;
          }

          for (const batch of row.batches) {
            if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
              toast.error(`Invalid batch quantity or batch number for item ${row.itemCode}`);
              return;
            }

            dataToSend.push({
              productionOrderId: order._id,
              qtyParam,
              itemId: row.itemId,
              sourceWarehouse: row.warehouse,
              destinationWarehouse: row.destination,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate || null,
              manufacturer: batch.manufacturer || null,
              unitPrice: batch.unitPrice || null,
              selectedBin: row.selectedBin?._id || null,
            });
          }
        } else {
          if (!row.qty || row.qty <= 0) {
            toast.error(`Please enter quantity for item ${row.itemCode}`);
            return;
          }

          dataToSend.push({
            productionOrderId: order._id,
            qtyParam,
            itemId: row.itemId,
            sourceWarehouse: row.warehouse,
            destinationWarehouse: row.destination,
            quantity: row.qty,
            batchNumber: null,
            expiryDate: null,
            manufacturer: null,
            unitPrice: null,
            selectedBin: row.selectedBin?._id || null,
          });
        }
      }

      try {
        const response = await axios.post(
          `/api/stock-transfer/${order._id}?qty=${qtyParam}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(response.data.message || "Stock transfer successful");
        router.push("/admin/productionorders-list-view");
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to transfer stock");
      }
    },
    [rows, router, order, qtyParam, token]
  );

  if (loading) return <p>Loading…</p>;
  if (!order) return <p>Order not found</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
      <ToastContainer />
      <h1 className="text-2xl font-semibold mb-6">Stock Transfer</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label>Document No</label>
            <input readOnly value={docNo} className="w-full border p-2 bg-gray-100 rounded" />
          </div>
          <div>
            <label>Date</label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <table className="w-full text-sm border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Item Code</th>
              <th className="border p-2">Item Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Batch</th>
              <th className="border p-2">Source Warehouse</th>
              <th className="border p-2">Bin</th>
              <th className="border p-2">Dest Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border p-1">{item.itemCode}</td>
                <td className="border p-1">{item.itemName}</td>
                <td className="border p-1">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleQtyChange(index, e.target.value)}
                    className="w-full px-1 border border-gray-300 rounded"
                  />
                </td>
                <td className="border p-1">
                  {item.managedByBatch ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openBatchModal(index)}
                        className="px-2 py-1 bg-blue-600 text-white rounded"
                      >
                        {item.batchNumber || "Select Batches"}
                      </button>
                      {item.batches?.length > 0 && (
                        <ul className="mt-1 text-xs">
                          {item.batches.map((b, idx) => (
                            <li key={idx}>
                              Batch: <strong>{b.batchNumber}</strong>, Qty:{" "}
                              <strong>{b.quantity}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 italic">Not batch-managed</span>
                  )}
                </td>
                <td className="p-2 border relative">
                  <input
                    type="text"
                    value={item.warehouseName ?? ""}
                    onChange={(e) => handleSearchChangeWarehouse(index, e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                  {showWarehouseDropdown && activeDropdownIndex === index && (
                    <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
                      {filteredWarehouses.map((wh) => (
                        <div
                          key={wh._id}
                          className="p-1 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleWarehouseSelect(index, wh)}
                        >
                          {wh.warehouseName} ({wh.warehouseCode})
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border p-1">
                  {item.binLocations?.length > 0 ? (
                    <select
                      value={item.selectedBin?._id || ""}
                      onChange={(e) => {
                        const fullBinObject = item.binLocations.find(
                          (b) => b._id === e.target.value
                        ) || null;
                        onItemChange(index, {
                          target: { name: "selectedBin", value: fullBinObject },
                        });
                      }}
                      className="w-full border rounded px-2 py-1 text-sm"
                      style={{ minWidth: "120px", maxWidth: "160px" }}
                    >
                      <option value="">Select Bin</option>
                      {item.binLocations.map((bin) => (
                        <option key={bin._id} value={bin._id}>
                          {bin.code}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </td>
                <td className="border p-1">
                  <select
                    className="w-full border p-1 rounded"
                    value={item.destination}
                    onChange={(e) =>
                      onItemChange(index, { target: { name: "destination", value: e.target.value } })
                    }
                  >
                    <option value="">-- select --</option>
                    {warehouseOptions.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 mt-4"
        >
          Submit Transfer
        </button>
      </form>

      {batchModalIndex != null && rows[batchModalIndex] && (
        <MultiBatchModal
          itemsbatch={rows[batchModalIndex]}
          batchOptions={batchOptions}
          onClose={closeBatchModal}
          onUpdateBatch={handleUpdateBatch}
        />
      )}
    </div>
  );
}





// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { useParams, useSearchParams, useRouter } from "next/navigation";
// import axios from "axios";
// import MultiBatchModal from "@/components/MultiBatchModalbtach";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function StockTransferPage() {
//   const { orderId } = useParams();
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const qtyParam = Number(searchParams.get("qty")) || 1;

//   const [order, setOrder] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [docNo, setDocNo] = useState("");
//   const [docDate, setDocDate] = useState("");
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState("");
//   const [batchModalIndex, setBatchModalIndex] = useState(null);
//   const [batchOptions, setBatchOptions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [token, setToken] = useState("");

//   useEffect(() => {
//     const t = localStorage.getItem("token");
//     if (!t) {
//       toast.error("Unauthorized. Please login.");
//       router.push("/login");
//       return;
//     }
//     setToken(t);

//     axios
//       .get("/api/warehouse", {
//         headers: { Authorization: `Bearer ${t}` },
//       })
//       .then((r) => setWarehouseOptions(r.data.data))
//       .catch(console.error);
//   }, [router]);

//   useEffect(() => {
//     if (!orderId || !token) return;
//     (async () => {
//       try {
//         const { data: ord } = await axios.get(`/api/production-orders/${orderId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setOrder(ord);

//         const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
//         setDocNo(`ST-${today}-${orderId.slice(-4)}`);
//         setDocDate(new Date().toISOString().slice(0, 10));

//         const sw = ord.warehouse?._id || ord.warehouse || "";
//         setSourceWarehouse(sw);

//         const rowsWithBatchFlag = await Promise.all(
//           ord.items.map(async (item) => {
//             const itemId = item.item?._id || item.item || "";
//             let managedByBatch = false;

//             try {
//               const { data } = await axios.get(`/api/items/${itemId}`, {
//                 headers: { Authorization: `Bearer ${token}` },
//               });
//               managedByBatch = (data?.data?.managedBy || "").toLowerCase() === "batch";
//             } catch (err) {
//               console.warn(`Error fetching item ${itemId}:`, err);
//             }

//             return {
//               itemId,
//               itemCode: item.itemCode,
//               itemName: item.itemName,
//               uom: item.unitQty > 1 ? `x${item.unitQty}` : "pcs",
//               qty: qtyParam * item.quantity,
//               batches: [],
//               batchNumber: "",
//               sourceWarehouse: sw,
//               destination: item.warehouse?._id || item.warehouse || "",
//               managedByBatch,
//             };
//           })
//         );

//         setRows(rowsWithBatchFlag);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [orderId, qtyParam, token]);

//   useEffect(() => {
//     if (batchModalIndex == null) return;
//     const row = rows[batchModalIndex];
//     if (!row || !row.itemId || !row.sourceWarehouse) return;

//     axios
//       .get(`/api/inventory-batch/${row.itemId}/${row.sourceWarehouse}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((r) => setBatchOptions(r.data.batches || []))
//       .catch((err) => {
//         if (err.response?.status === 404) {
//           setBatchOptions([]);
//         } else {
//           console.error(err);
//         }
//       });
//   }, [batchModalIndex, rows, token]);

//   const openBatchModal = useCallback((idx) => setBatchModalIndex(idx), []);
//   const closeBatchModal = useCallback(() => setBatchModalIndex(null), []);

//   const handleUpdateBatch = (updatedBatch) => {
//     if (batchModalIndex == null || !rows[batchModalIndex]) return;

//     setRows((prevRows) => {
//       const updated = [...prevRows];
//       updated[batchModalIndex] = {
//         ...updated[batchModalIndex],
//         batches: updatedBatch,
//         batchNumber: updatedBatch.map((b) => b.batchNumber).join(", "),
//       };
//       return updated;
//     });

//     closeBatchModal();
//   };

//   const handleQtyChange = (index, newQty) => {
//     const updatedRows = [...rows];
//     updatedRows[index].qty = parseFloat(newQty) || 0;
//     setRows(updatedRows);
//   };

//   const handleSubmit = useCallback(
//     async (e) => {
//       e.preventDefault();
//       const dataToSend = [];

//       for (const row of rows) {
//         if (row.managedByBatch) {
//           if (!row.batches || row.batches.length === 0) {
//             toast.error(`Please select batches for item ${row.itemCode}`);
//             return;
//           }

//           for (const batch of row.batches) {
//             if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//               toast.error(`Invalid batch quantity or batch number for item ${row.itemCode}`);
//               return;
//             }

//             dataToSend.push({
//               productionOrderId: order._id,
//               qtyParam,
//               itemId: row.itemId,
//               sourceWarehouse: row.sourceWarehouse,
//               destinationWarehouse: row.destination,
//               batchNumber: batch.batchNumber,
//               quantity: batch.quantity,
//               expiryDate: batch.expiryDate || null,
//               manufacturer: batch.manufacturer || null,
//               unitPrice: batch.unitPrice || null,
//             });
//           }
//         } else {
//           if (!row.qty || row.qty <= 0) {
//             toast.error(`Please enter quantity for item ${row.itemCode}`);
//             return;
//           }

//           dataToSend.push({
//             productionOrderId: order._id,
//             qtyParam,
//             itemId: row.itemId,
//             sourceWarehouse: row.sourceWarehouse,
//             destinationWarehouse: row.destination,
//             quantity: row.qty,
//             batchNumber: null,
//             expiryDate: null,
//             manufacturer: null,
//             unitPrice: null,
//           });
//         }
//       }

//       try {
//         const response = await axios.post(
//           `/api/stock-transfer/${order._id}?qty=${qtyParam}`,
//           dataToSend,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           }
//         );
//         toast.success(response.data.message || "Stock transfer successful");
//         router.push("/admin/productionorders-list-view");
//       } catch (error) {
//         console.error(error);
//         toast.error(error.response?.data?.message || "Failed to transfer stock");
//       }
//     },
//     [rows, router, order, qtyParam, token]
//   );

//   if (loading) return <p>Loading…</p>;
//   if (!order) return <p>Order not found</p>;

//     return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Stock  Transfer</h1>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label>Document No</label>
//             <input readOnly value={docNo} className="w-full border p-2 bg-gray-100 rounded" />
//           </div>
//           <div>
//             <label>Date</label>
//             <input
//               type="date"
//               value={docDate}
//               onChange={(e) => setDocDate(e.target.value)}
//               className="w-full border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label>Source Warehouse</label>
//             <select
//               value={sourceWarehouse}
//               onChange={(e) => setSourceWarehouse(e.target.value)}
//               required
//               className="w-full border p-2 rounded"
//             >
//               <option value="">-- select --</option>
//               {warehouseOptions.map((w) => (
//                 <option key={w._id} value={w._id}>
//                   {w.warehouseName}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         <table className="w-full text-sm border border-gray-300">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Item Code</th>
//               <th className="border p-2">Item Name</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Batch</th>
//               <th className="border p-2">Source</th>
//               <th className="border p-2">Dest</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((r, i) => (
//               <tr key={i} className="hover:bg-gray-50">
//                 <td className="border p-1">{r.itemCode}</td>
//                 <td className="border p-1">{r.itemName}</td>
//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={r.qty}
//                     onChange={(e) => handleQtyChange(i, e.target.value)}
//                     className="w-full px-1 border border-gray-300 rounded"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   {r.managedByBatch ? (
//                     <>
//                       <button
//                         type="button"
//                         onClick={() => openBatchModal(i)}
//                         className="px-2 py-1 bg-blue-600 text-white rounded"
//                       >
//                         {r.batchNumber || "Select Batches"}
//                       </button>
//                       {r.batches?.length > 0 && (
//                         <ul className="mt-1 text-xs">
//                           {r.batches.map((b, idx) => (
//                             <li key={idx}>
//                               Batch: <strong>{b.batchNumber}</strong>, Qty:{" "}
//                               <strong>{b.quantity}</strong>
//                             </li>
//                           ))}
//                         </ul>
//                       )}
//                     </>
//                   ) : (
//                     <span className="text-gray-500 italic">Not batch-managed</span>
//                   )}
//                 </td>
//                 <td className="border p-1">
//                   <select
//                     className="w-full border p-1 rounded"
//                     value={r.sourceWarehouse}
//                     onChange={(e) => {
//                       const newSrc = e.target.value;
//                       setRows((prev) => {
//                         const copy = [...prev];
//                         copy[i] = { ...copy[i], sourceWarehouse: newSrc };
//                         return copy;
//                       });
//                     }}
//                   >
//                     <option value="">-- select --</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w._id} value={w._id}>
//                         {w.warehouseName}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//                 <td className="border p-1">
//                   <select
//                     className="w-full border p-1 rounded"
//                     value={r.destination}
//                     onChange={(e) => {
//                       const newDest = e.target.value;
//                       setRows((prev) => {
//                         const copy = [...prev];
//                         copy[i] = { ...copy[i], destination: newDest };
//                         return copy;
//                       });
//                     }}
//                   >
//                     <option value="">-- select --</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w._id} value={w._id}>
//                         {w.warehouseName}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <button
//           type="submit"
//           className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//         >
//           Submit Transfer
//         </button>
//       </form>

//       {batchModalIndex != null && rows[batchModalIndex] && (
//         <MultiBatchModal
//           itemsbatch={rows[batchModalIndex]}
//           batchOptions={batchOptions}
//           onClose={closeBatchModal}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
//     </div>
//   );
// }










