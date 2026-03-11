"use client";

import axios from "axios";
import { useEffect, useState, useMemo } from "react";
import { 
  FaSearch, FaWarehouse, FaBox, FaHistory, 
  FaArrowUp, FaArrowDown, FaFilter, FaPlus 
} from "react-icons/fa";
import Link from "next/link";

export default function InventoryAdjustmentsView() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    item: "",
    warehouse: "",
    type: "",
    remarks: "",
    quantity: "",
    date: "",
  });

  useEffect(() => {
    const fetchAdjustments = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("/api/inventory-adjustments", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAdjustments(res.data.data || []);
      } catch (err) {
        console.error("Error fetching adjustments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdjustments();
  }, []);

  // Filter Logic
  const filteredAdjustments = useMemo(() => {
    return adjustments
      .filter((adj) => adj.item && adj.warehouse)
      .filter((adj) => {
        const matchItem = !filters.item || adj?.item?.itemName?.toLowerCase().includes(filters.item.toLowerCase());
        const matchWH = !filters.warehouse || adj?.warehouse?.warehouseName?.toLowerCase().includes(filters.warehouse.toLowerCase());
        const matchType = !filters.type || adj.movementType === filters.type;
        const matchRemarks = !filters.remarks || adj?.remarks?.toLowerCase().includes(filters.remarks.toLowerCase());
        const matchQty = !filters.quantity || adj.quantity == filters.quantity;
        const matchDate = !filters.date || new Date(adj.date).toLocaleDateString() === new Date(filters.date).toLocaleDateString();
        
        return matchItem && matchWH && matchType && matchRemarks && matchQty && matchDate;
      });
  }, [adjustments, filters]);

  const stats = useMemo(() => {
    return {
      total: filteredAdjustments.length,
      ins: filteredAdjustments.filter(a => a.movementType === "IN").length,
      outs: filteredAdjustments.filter(a => a.movementType === "OUT").length,
    };
  }, [filteredAdjustments]);

  const clearFilters = () => setFilters({ item: "", warehouse: "", type: "", remarks: "", quantity: "", date: "" });

  // ── UI Helpers ──
  const Lbl = ({ text }) => (
    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{text}</label>
  );

  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-400 text-sm font-medium">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaHistory className="text-indigo-500 text-xl" /> Inventory Adjustment Logs
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Audit trail of all manual stock corrections</p>
          </div>
          {/* <Link href="/admin/InventoryAdjustmentForm">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
              <FaPlus size={12} /> New Adjustment
            </button>
          </Link> */}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><FaFilter className="text-sm" /></div>
                <div>
                    <Lbl text="Filtered Results" />
                    <p className="text-xl font-bold text-gray-900 leading-none">{stats.total}</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><FaArrowUp className="text-sm" /></div>
                <div>
                    <Lbl text="Stock In (IN)" />
                    <p className="text-xl font-bold text-gray-900 leading-none">{stats.ins}</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><FaArrowDown className="text-sm" /></div>
                <div>
                    <Lbl text="Stock Out (OUT)" />
                    <p className="text-xl font-bold text-gray-900 leading-none">{stats.outs}</p>
                </div>
            </div>
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-indigo-600">
                <FaSearch size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">Search Filters</span>
            </div>
            <button onClick={clearFilters} className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                Clear All
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Lbl text="Item" />
              <input type="text" className={fi} value={filters.item} onChange={(e) => setFilters({ ...filters, item: e.target.value })} placeholder="Item name..." />
            </div>
            <div>
              <Lbl text="Warehouse" />
              <input type="text" className={fi} value={filters.warehouse} onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })} placeholder="Warehouse..." />
            </div>
            <div>
              <Lbl text="Type" />
              <select className={fi} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">All Types</option>
                <option value="IN">IN (Stock In)</option>
                <option value="OUT">OUT (Stock Out)</option>
              </select>
            </div>
            <div>
              <Lbl text="Remarks" />
              <input type="text" className={fi} value={filters.remarks} onChange={(e) => setFilters({ ...filters, remarks: e.target.value })} placeholder="Keyword..." />
            </div>
            <div>
              <Lbl text="Quantity" />
              <input type="number" className={fi} value={filters.quantity} onChange={(e) => setFilters({ ...filters, quantity: e.target.value })} placeholder="Exact qty" />
            </div>
            <div>
              <Lbl text="Date" />
              <input type="date" className={fi} value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            {["Item & Code", "Warehouse", "Movement", "Quantity", "Remarks", "Logged Date"].map((h) => (
                                <th key={h} className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredAdjustments.length > 0 ? (
                            filteredAdjustments.map((adj) => (
                                <tr key={adj._id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{adj?.item?.itemName || "N/A"}</div>
                                        <div className="text-[10px] font-mono text-gray-400">{adj?.item?.itemCode}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <FaWarehouse className="text-gray-300 text-xs" />
                                            {adj?.warehouse?.warehouseName || "N/A"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                                            adj.movementType === "IN" 
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                            : "bg-red-50 text-red-600 border-red-100"
                                        }`}>
                                            {adj.movementType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                                        {adj.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate italic text-xs">
                                        {adj.remarks || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">
                                        {new Date(adj.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-20 text-center text-gray-300 font-medium">
                                    <FaBox className="mx-auto text-3xl mb-3 opacity-20" />
                                    No adjustment logs found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}


// "use client";
// import axios from "axios";
// import { useEffect, useState } from "react";

// export default function InventoryAdjustmentsView() {
//   const [adjustments, setAdjustments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Filters
//   const [filters, setFilters] = useState({
//     item: "",
//     warehouse: "",
//     type: "",
//     remarks: "",
//     quantity: "",
//     date: "",
//   });

//   useEffect(() => {
//     const fetchAdjustments = async () => {
//       try {
//         const token = localStorage.getItem("token");

//         if (!token) {
//           console.error("No token found");
//           return;
//         }

//         const res = await axios.get("/api/inventory-adjustments", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         setAdjustments(res.data.data || []);
//       } catch (err) {
//         console.error(
//           "Error fetching adjustments:",
//           err.response?.data || err.message
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAdjustments();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
//       </div>
//     );
//   }

//   // Apply filters
//   const filteredAdjustments = adjustments
//     .filter((adj) => adj.item && adj.warehouse)
//     .filter((adj) =>
//       filters.item
//         ? adj?.item?.itemName
//             ?.toLowerCase()
//             .includes(filters.item.toLowerCase())
//         : true
//     )
//     .filter((adj) =>
//       filters.warehouse
//         ? adj?.warehouse?.warehouseName
//             ?.toLowerCase()
//             .includes(filters.warehouse.toLowerCase())
//         : true
//     )
//     .filter((adj) =>
//       filters.type
//         ? adj.movementType?.toLowerCase().includes(filters.type.toLowerCase())
//         : true
//     )
//     .filter((adj) =>
//       filters.remarks
//         ? adj?.remarks?.toLowerCase().includes(filters.remarks.toLowerCase())
//         : true
//     )
//     .filter((adj) =>
//       filters.quantity ? adj.quantity == filters.quantity : true
//     )
//     .filter((adj) =>
//       filters.date
//         ? new Date(adj.date).toLocaleDateString() ===
//           new Date(filters.date).toLocaleDateString()
//         : true
//     );

//   // Reset filters
//   const clearFilters = () =>
//     setFilters({
//       item: "",
//       warehouse: "",
//       type: "",
//       remarks: "",
//       quantity: "",
//       date: "",
//     });

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <h2 className="text-2xl font-bold mb-6 text-gray-800">
//         Inventory Adjustments
//       </h2>

//       {/* Filters */}
//       <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
//         <input
//           type="text"
//           placeholder="Filter by Item"
//           className="border px-3 py-2 rounded"
//           value={filters.item}
//           onChange={(e) =>
//             setFilters({ ...filters, item: e.target.value })
//           }
//         />
//         <input
//           type="text"
//           placeholder="Filter by Warehouse"
//           className="border px-3 py-2 rounded"
//           value={filters.warehouse}
//           onChange={(e) =>
//             setFilters({ ...filters, warehouse: e.target.value })
//           }
//         />
//         <select
//           className="border px-3 py-2 rounded"
//           value={filters.type}
//           onChange={(e) => setFilters({ ...filters, type: e.target.value })}
//         >
//           <option value="">All Types</option>
//           <option value="IN">IN</option>
//           <option value="OUT">OUT</option>
//         </select>
//         <input
//           type="text"
//           placeholder="Filter by Remarks"
//           className="border px-3 py-2 rounded"
//           value={filters.remarks}
//           onChange={(e) =>
//             setFilters({ ...filters, remarks: e.target.value })
//           }
//         />
//         <input
//           type="number"
//           placeholder="Filter by Quantity"
//           className="border px-3 py-2 rounded"
//           value={filters.quantity}
//           onChange={(e) =>
//             setFilters({ ...filters, quantity: e.target.value })
//           }
//         />
//         <input
//           type="date"
//           className="border px-3 py-2 rounded"
//           value={filters.date}
//           onChange={(e) => setFilters({ ...filters, date: e.target.value })}
//         />
//       </div>

//       {/* Clear Filters Button */}
//       <div className="mb-6">
//         <button
//           onClick={clearFilters}
//           className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
//         >
//           Clear Filters
//         </button>
//       </div>

//       {filteredAdjustments.length === 0 ? (
//         <div className="bg-white p-6 rounded-lg shadow-md text-center">
//           <p className="text-gray-500">No adjustments found.</p>
//         </div>
//       ) : (
//         <div className="overflow-x-auto bg-white rounded-lg shadow-md">
//           <table className="min-w-full border border-gray-200">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Item
//                 </th>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Warehouse
//                 </th>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Type
//                 </th>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Remarks
//                 </th>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Quantity
//                 </th>
//                 <th className="text-left px-4 py-3 border-b text-gray-600">
//                   Date
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredAdjustments.map((adj) => (
//                 <tr key={adj._id} className="hover:bg-gray-50 transition">
//                   <td className="px-4 py-3 border-b text-gray-700">
//                     {adj?.item?.itemName || "N/A"}
//                   </td>
//                   <td className="px-4 py-3 border-b text-gray-700">
//                     {adj?.warehouse?.warehouseName || "N/A"}
//                   </td>
//                   <td
//                     className={`px-4 py-3 border-b font-semibold ${
//                       adj.movementType === "IN"
//                         ? "text-green-600"
//                         : "text-red-600"
//                     }`}
//                   >
//                     {adj.movementType}
//                   </td>
//                   <td className="px-4 py-3 border-b text-gray-700">
//                     {adj.remarks || "N/A"}
//                   </td>
//                   <td className="px-4 py-3 border-b text-gray-700">
//                     {adj.quantity}
//                   </td>
//                   <td className="px-4 py-3 border-b text-gray-500">
//                     {new Date(adj.date).toLocaleDateString("en-GB")}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
