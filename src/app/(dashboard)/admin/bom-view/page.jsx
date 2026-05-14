"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  FaSearch, FaWarehouse, FaPlus, FaEye, 
  FaClipboardList, FaLayerGroup, FaCogs, FaBox 
} from "react-icons/fa";
import Link from "next/link";

export default function BOMListPage() {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProductNo, setFilterProductNo] = useState("");
  const [filterBomType, setFilterBomType] = useState("All");
  const [filterWarehouse, setFilterWarehouse] = useState("All");
  const router = useRouter();

  useEffect(() => {
    async function fetchBOMs() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get("/api/bom", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBoms(res.data || []);
      } catch (err) {
        console.error("Error fetching BOMs:", err);
        setError("Failed to load BOM data");
      } finally {
        setLoading(false);
      }
    }
    fetchBOMs();
  }, []);

  const filteredBoms = useMemo(() => {
    return boms.filter((bom) => {
      const productName = bom?.productNo?.itemName || bom?.productNo || "";
      const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "";
      const matchProduct = !filterProductNo || productName.toLowerCase().includes(filterProductNo.toLowerCase());
      const matchType = filterBomType === "All" || bom?.bomType === filterBomType;
      const matchWH = filterWarehouse === "All" || warehouseName === filterWarehouse;
      return matchProduct && matchType && matchWH;
    });
  }, [boms, filterProductNo, filterBomType, filterWarehouse]);

  const stats = useMemo(() => {
    return {
      total: boms.length,
      production: boms.filter(b => b.bomType === "Production").length,
      sales: boms.filter(b => b.bomType === "Sales").length,
      totalValue: filteredBoms.reduce((acc, curr) => acc + (curr.totalSum || 0), 0)
    };
  }, [boms, filteredBoms]);

  const bomTypes = Array.from(new Set(boms.map((b) => b?.bomType).filter(Boolean)));
  const warehouses = Array.from(new Set(boms.map((b) => b?.warehouse?.warehouseName || b?.warehouse).filter(Boolean)));

  // ── UI Helpers ──
  const StatusBadge = ({ type }) => {
    const map = {
      Production: "bg-emerald-50 text-emerald-600 border-emerald-100",
      Sales: "bg-blue-50 text-blue-600 border-blue-100",
      Template: "bg-gray-50 text-gray-600 border-gray-100",
    };
    return (
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${map[type] || "bg-gray-50 text-gray-500"}`}>
        {type}
      </span>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-medium italic">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mr-3"></div>
      Loading BOM Catalog...
    </div>
  );
  
  if (error) return <div className="p-10 text-red-500 text-center font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaClipboardList className="text-indigo-500" /> Bill of Materials
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage multi-level production structures and costs</p>
          </div>
          <Link href="/admin/bom-new">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
              <FaPlus size={12} /> Create New BOM
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total BOMs", value: stats.total, icon: FaLayerGroup, color: "indigo" },
            { label: "Production", value: stats.production, icon: FaCogs, color: "emerald" },
            { label: "Sales BOM", value: stats.sales, icon: FaBox, color: "blue" },
            { label: "Filtered Value", value: `₹${stats.totalValue.toLocaleString('en-IN')}`, icon: FaWarehouse, color: "amber" },
          ].map((s, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-500`}>
                <s.icon className="text-sm" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 leading-none mt-1">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Search Product</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
                <input
                  type="text"
                  value={filterProductNo}
                  onChange={(e) => setFilterProductNo(e.target.value)}
                  placeholder="Code or Name..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">BOM Type</label>
              <select
                value={filterBomType}
                onChange={(e) => setFilterBomType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                <option value="All">All Types</option>
                {bomTypes.map((type, idx) => <option key={idx} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Warehouse</label>
              <select
                value={filterWarehouse}
                onChange={(e) => setFilterWarehouse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                <option value="All">All Warehouses</option>
                {warehouses.map((w, idx) => <option key={idx} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 w-12">#</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Parent Product</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Type</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Warehouse</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Components</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Total Value</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBoms.length > 0 ? (
                  filteredBoms.map((bom, idx) => {
                    const productName = bom?.productNo?.itemName || bom?.productNo || "—";
                    const productCode = bom?.productNo?.itemCode || "—";
                    const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "—";

                    return (
                      <tr key={bom._id || idx} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{productName}</div>
                          <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">{productCode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge type={bom?.bomType} />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <FaWarehouse className="text-gray-300 text-[10px]" />
                            {warehouseName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Items: {bom?.items?.length ?? 0}</span>
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Res: {bom?.resources?.length ?? 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-gray-800">
                          ₹{(bom?.totalSum ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => router.push(`/admin/bom-view/${bom._id}`)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <FaEye size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center text-gray-300 font-medium italic">
                      No Bill of Materials found matching your criteria.
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

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";

// export default function BOMListPage() {
//   const [boms, setBoms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [filterProductNo, setFilterProductNo] = useState("");
//   const [filterBomType, setFilterBomType] = useState("");
//   const [filterWarehouse, setFilterWarehouse] = useState("");
//   const router = useRouter();

//   useEffect(() => {
//     async function fetchBOMs() {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         setError("Not authenticated");
//         setLoading(false);
//         return;
//       }

//       try {
//         const res = await axios.get("/api/bom", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setBoms(res.data || []);
//       } catch (err) {
//         console.error("Error fetching BOMs:", err);
//         setError("Failed to load BOM data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchBOMs();
//   }, []);

//   const filteredBoms = boms.filter((bom) => {
//     const productName = bom?.productNo?.itemName || bom?.productNo || "";
//     const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "";

//     if (filterProductNo && !productName.toLowerCase().includes(filterProductNo.toLowerCase()))
//       return false;
//     if (filterBomType && bom?.bomType !== filterBomType) return false;
//     if (filterWarehouse && warehouseName !== filterWarehouse) return false;

//     return true;
//   });

//   if (loading) return <div>Loading BOMs...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;

//   const bomTypes = Array.from(new Set(boms.map((b) => b?.bomType).filter(Boolean)));
//   const warehouses = Array.from(
//     new Set(
//       boms
//         .map((b) => b?.warehouse?.warehouseName || b?.warehouse)
//         .filter(Boolean)
//     )
//   );

//   return (
//     <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-4">BOM List</h2>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//         <div>
//           <label className="block text-sm font-medium">Product No.</label>
//           <input
//             type="text"
//             value={filterProductNo}
//             onChange={(e) => setFilterProductNo(e.target.value)}
//             placeholder="Search Product No."
//             className="w-full border p-2 rounded"
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium">BOM Type</label>
//           <select
//             value={filterBomType}
//             onChange={(e) => setFilterBomType(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Types</option>
//             {bomTypes.map((type, idx) => (
//               <option key={idx} value={type}>
//                 {type}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium">Warehouse</label>
//           <select
//             value={filterWarehouse}
//             onChange={(e) => setFilterWarehouse(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Warehouses</option>
//             {warehouses.map((w, idx) => (
//               <option key={idx} value={w}>
//                 {w}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* BOM Table */}
//       <table className="w-full table-auto border-collapse border text-sm">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Product No.</th>
//             <th className="border p-2">Type</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Items Count</th>
//             <th className="border p-2">Resources Count</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Date</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredBoms.length > 0 ? (
//             filteredBoms.map((bom, idx) => {
//               const productName = bom?.productNo?.itemName || bom?.productNo || "—";
//               const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "—";

//               return (
//                 <tr key={bom._id || idx} className="hover:bg-gray-50">
//                   <td className="border p-2 text-center">{idx + 1}</td>
//                   <td className="border p-2">{productName}</td>
//                   <td className="border p-2">{bom?.bomType || "—"}</td>
//                   <td className="border p-2">{warehouseName}</td>
//                   <td className="border p-2 text-center">{bom?.items?.length ?? 0}</td>
//                   <td className="border p-2 text-center">{bom?.resources?.length ?? 0}</td>
//                   <td className="border p-2 text-right">{(bom?.totalSum ?? 0).toFixed(2)}</td>
//                   <td className="border p-2 text-center">
//                     {bom?.createdAt ? new Date(bom.createdAt).toLocaleDateString() : "—"}
//                   </td>
//                   <td className="border p-2 text-center">
//                     <button
//                       onClick={() => router.push(`/admin/bom-view/${bom._id}`)}
//                       className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
//                     >
//                       View
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })
//           ) : (
//             <tr>
//               <td colSpan={9} className="border p-4 text-center text-gray-500">
//                 No BOMs found.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }





// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";

// export default function BOMListPage() {
//   const [boms, setBoms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [filterProductNo, setFilterProductNo] = useState("");
//   const [filterBomType, setFilterBomType] = useState("");
//   const [filterWarehouse, setFilterWarehouse] = useState("");
//   const router = useRouter();

//   useEffect(() => {
//     async function fetchBOMs() {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         setError("Not authenticated");
//         setLoading(false);
//         return;
//       }
//       try {
//         const res = await axios.get("/api/bom", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setBoms(res.data || []);
//       } catch (err) {
//         console.error("Error fetching BOMs:", err);
//         setError("Failed to load BOM data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchBOMs();
//   }, []);

//   const filteredBoms = boms.filter((bom) => {
//     const productName =
//       typeof bom?.productNo === "object" ? bom.productNo?.itemName : bom?.productNo;
//     const warehouseName =
//       typeof bom?.warehouse === "object" ? bom.warehouse?.warehouseName : bom?.warehouse;

//     if (filterProductNo && !productName?.toLowerCase().includes(filterProductNo.toLowerCase()))
//       return false;
//     if (filterBomType && bom?.bomType !== filterBomType) return false;
//     if (filterWarehouse && warehouseName !== filterWarehouse) return false;
//     return true;
//   });

//   if (loading) return <div>Loading BOMs...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;

//   const bomTypes = Array.from(new Set(boms.map((b) => b?.bomType).filter(Boolean)));
//   const warehouses = Array.from(
//     new Set(
//       boms
//         .map((b) =>
//           typeof b?.warehouse === "object" ? b.warehouse?.warehouseName : b?.warehouse
//         )
//         .filter(Boolean)
//     )
//   );

//   return (
//     <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-4">BOM List</h2>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//         <div>
//           <label className="block text-sm font-medium">Product No.</label>
//           <input
//             type="text"
//             value={filterProductNo}
//             onChange={(e) => setFilterProductNo(e.target.value)}
//             placeholder="Search Product No."
//             className="w-full border p-2 rounded"
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium">BOM Type</label>
//           <select
//             value={filterBomType}
//             onChange={(e) => setFilterBomType(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Types</option>
//             {bomTypes.map((type, idx) => (
//               <option key={idx} value={type}>
//                 {type}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium">Warehouse</label>
//           <select
//             value={filterWarehouse}
//             onChange={(e) => setFilterWarehouse(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Warehouses</option>
//             {warehouses.map((w, idx) => (
//               <option key={idx} value={w}>
//                 {w}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* BOM Table */}
//       <table className="w-full table-auto border-collapse border text-sm">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Product No.</th>
//             <th className="border p-2">Type</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Items Count</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Date</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredBoms.length > 0 ? (
//             filteredBoms.map((bom, idx) => {
//               const productName =
//                 typeof bom?.productNo === "object" ? bom.productNo?.itemName : bom?.productNo;
//               const warehouseName =
//                 typeof bom?.warehouse === "object"
//                   ? bom.warehouse?.warehouseName
//                   : bom?.warehouse;

//               return (
//                 <tr key={bom._id || idx} className="hover:bg-gray-50">
//                   <td className="border p-2 text-center">{idx + 1}</td>
//                   <td className="border p-2">{productName || "—"}</td>
//                   <td className="border p-2">{bom?.bomType || "—"}</td>
//                   <td className="border p-2">{warehouseName || "—"}</td>
//                   <td className="border p-2 text-center">{bom?.items?.length ?? 0}</td>
//                   <td className="border p-2 text-right">
//                     {(bom?.totalSum ?? 0).toFixed(2)}
//                   </td>
//                   <td className="border p-2 text-center">
//                     {bom?.createdAt ? new Date(bom.createdAt).toLocaleDateString() : "—"}
//                   </td>
//                   <td className="border p-2 text-center">
//                     <button
//                       onClick={() => router.push(`/admin/bom-view/${bom._id}`)}
//                       className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
//                     >
//                       View
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })
//           ) : (
//             <tr>
//               <td colSpan={8} className="border p-4 text-center text-gray-500">
//                 No BOMs found.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }

