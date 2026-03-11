"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { 
  FaSearch, FaWarehouse, FaBoxes, FaClipboardCheck, 
  FaTruckLoading, FaChevronDown, FaChevronUp, FaInfoCircle 
} from "react-icons/fa";

export default function InventoryView() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState({
        itemCode: "",
        itemName: "",
        warehouse: "",
    });
    const [expandedRows, setExpandedRows] = useState({});

    // Fetch inventory from API
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setError("You are not authenticated. Please log in.");
                    setLoading(false);
                    return;
                }
                const { data } = await axios.get("/api/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (data.success) {
                    setInventory(data.data || []);
                } else {
                    setError(data.message || "Failed to fetch inventory.");
                }
            } catch (err) {
                setError("Error fetching inventory. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, []);

    const handleSearchChange = (e) => {
        setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleRow = (key) => {
        setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const groupedAndFilteredInventory = useMemo(() => {
        const filtered = inventory.filter((inv) => {
            const itemCode = inv.item?.itemCode || "";
            const itemName = inv.item?.itemName || "";
            const warehouseName = inv.warehouse?.warehouseName || "";
            return (
                itemCode.toLowerCase().includes(search.itemCode.toLowerCase()) &&
                itemName.toLowerCase().includes(search.itemName.toLowerCase()) &&
                warehouseName.toLowerCase().includes(search.warehouse.toLowerCase())
            );
        });

        const grouped = filtered.reduce((acc, inv) => {
            if (!inv.item || !inv.warehouse) return acc;
            const key = `${inv.item._id}-${inv.warehouse._id}`;
            if (!acc[key]) {
                acc[key] = {
                    item: inv.item,
                    warehouse: inv.warehouse,
                    totalQuantity: 0,
                    totalCommitted: 0,
                    totalOnOrder: 0,
                    bins: [],
                };
            }
            acc[key].bins.push({
                binId: inv.bin,
                quantity: inv.quantity || 0,
                committed: inv.committed || 0,
                onOrder: inv.onOrder || 0,
            });
            acc[key].totalQuantity += inv.quantity || 0;
            acc[key].totalCommitted += inv.committed || 0;
            acc[key].totalOnOrder += inv.onOrder || 0;
            return acc;
        }, {});

        return Object.values(grouped);
    }, [inventory, search]);

    // ── Stats Calculation ──
    const stats = useMemo(() => {
        return groupedAndFilteredInventory.reduce((acc, curr) => {
            acc.stock += curr.totalQuantity;
            acc.committed += curr.totalCommitted;
            acc.onOrder += curr.totalOnOrder;
            return acc;
        }, { stock: 0, committed: 0, onOrder: 0 });
    }, [groupedAndFilteredInventory]);

    const getBinCode = (binId, warehouse) => {
        if (!binId) return "General Stock";
        const bin = warehouse.binLocations?.find(b => b._id === binId);
        return bin?.code || "Unknown Bin";
    };

    // ── UI Helpers ──
    const Lbl = ({ text }) => (
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{text}</label>
    );

    const fi = () => `w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none`;

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium">Loading Inventory...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                
                {/* ── Header ── */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Inventory Management</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Real-time stock levels across all warehouses</p>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "In Stock", value: stats.stock, icon: FaBoxes, color: "indigo" },
                        { label: "Committed (SO)", value: stats.committed, icon: FaClipboardCheck, color: "amber" },
                        { label: "On Order (PO)", value: stats.onOrder, icon: FaTruckLoading, color: "emerald" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-500`}>
                                <s.icon className="text-xl" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none mt-1">{s.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Search Toolbar ── */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <FaSearch size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Search Filters</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Lbl text="Item Code" />
                            <input name="itemCode" className={fi()} value={search.itemCode} onChange={handleSearchChange} placeholder="e.g. ITEM-001" />
                        </div>
                        <div>
                            <Lbl text="Item Name" />
                            <input name="itemName" className={fi()} value={search.itemName} onChange={handleSearchChange} placeholder="Search by name..." />
                        </div>
                        <div>
                            <Lbl text="Warehouse" />
                            <input name="warehouse" className={fi()} value={search.warehouse} onChange={handleSearchChange} placeholder="All warehouses..." />
                        </div>
                    </div>
                </div>

                {/* ── Main Table Card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="w-12"></th>
                                    {["Item Code", "Item Name", "Warehouse", "Total Stock", "Committed", "On Order"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {groupedAndFilteredInventory.length > 0 ? (
                                    groupedAndFilteredInventory.map((group) => {
                                        const key = `${group.item._id}-${group.warehouse._id}`;
                                        const isExpanded = expandedRows[key];
                                        return (
                                            <React.Fragment key={key}>
                                                <tr className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/20' : ''}`} onClick={() => toggleRow(key)}>
                                                    <td className="px-4 py-3 text-center">
                                                        {isExpanded ? <FaChevronUp className="text-indigo-400 text-xs mx-auto" /> : <FaChevronDown className="text-gray-300 text-xs mx-auto" />}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-600">
                                                        <span className="bg-indigo-50 px-2 py-0.5 rounded">{group.item.itemCode}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900">{group.item.itemName}</td>
                                                    <td className="px-4 py-3 text-gray-500 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <FaWarehouse className="text-gray-300 text-xs" />
                                                            {group.warehouse.warehouseName}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-black text-gray-900">{group.totalQuantity}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{group.totalCommitted}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{group.totalOnOrder}</td>
                                                </tr>

                                                {/* Expanded Bin Details */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="7" className="p-0 bg-gray-50/50">
                                                            <div className="px-12 py-3 space-y-2 border-l-4 border-indigo-400">
                                                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2">
                                                                    <FaInfoCircle /> Bin Locations Breakdown
                                                                </p>
                                                                {group.bins.map((binData, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                                        <span className="text-xs font-bold text-gray-600">
                                                                            {getBinCode(binData.binId, group.warehouse)}
                                                                        </span>
                                                                        <div className="flex gap-8">
                                                                            <span className="text-xs font-mono w-20 text-right"><Lbl text="Qty:" /> {binData.quantity}</span>
                                                                            <span className="text-xs font-mono w-20 text-right text-amber-600"><Lbl text="Comm:" /> {binData.committed}</span>
                                                                            <span className="text-xs font-mono w-20 text-right text-emerald-600"><Lbl text="Ord:" /> {binData.onOrder}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-16 text-center text-gray-300 font-medium">
                                            No matching inventory found.
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

// import React, { useEffect, useState, useMemo } from "react";
// import axios from "axios";

// export default function InventoryView() {
//     const [inventory, setInventory] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [search, setSearch] = useState({
//         itemCode: "",
//         itemName: "",
//         warehouse: "",
//     });
//     const [expandedRows, setExpandedRows] = useState({});

//     // Fetch inventory from API
//     useEffect(() => {
//         const fetchInventory = async () => {
//             try {
//                 const token = localStorage.getItem("token");
//                 if (!token) {
//                     setError("You are not authenticated. Please log in.");
//                     setLoading(false);
//                     return;
//                 }

//                 const { data } = await axios.get("/api/inventory", {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });

//                 if (data.success) {
//                     setInventory(data.data || []);
//                 } else {
//                     setError(data.message || "Failed to fetch inventory.");
//                 }
//             } catch (err) {
//                 const errMsg = err.response?.data?.message || err.message || "Error fetching inventory.";
//                 console.error("Error fetching inventory:", errMsg);
//                 setError("Error fetching inventory. Please try again.");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchInventory();
//     }, []);

//     // Handle search input changes
//     const handleSearchChange = (e) => {
//         setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//     };

//     // Toggle row expansion
//     const toggleRow = (key) => {
//         setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
//     };

//     // Group inventory by item and warehouse, and calculate totals
//     const groupedAndFilteredInventory = useMemo(() => {
//         // First, filter the raw inventory based on search criteria
//         const filtered = inventory.filter((inv) => {
//             const itemCode = inv.item?.itemCode || "";
//             const itemName = inv.item?.itemName || "";
//             const warehouseName = inv.warehouse?.warehouseName || "";

//             return (
//                 itemCode.toLowerCase().includes(search.itemCode.toLowerCase()) &&
//                 itemName.toLowerCase().includes(search.itemName.toLowerCase()) &&
//                 warehouseName.toLowerCase().includes(search.warehouse.toLowerCase())
//             );
//         });

//         // Now, group the filtered results
//         const grouped = filtered.reduce((acc, inv) => {
//             if (!inv.item || !inv.warehouse) return acc;

//             const key = `${inv.item._id}-${inv.warehouse._id}`;
//             if (!acc[key]) {
//                 acc[key] = {
//                     item: inv.item,
//                     warehouse: inv.warehouse,
//                     totalQuantity: 0,
//                     totalCommitted: 0,
//                     totalOnOrder: 0,
//                     bins: [],
//                 };
//             }

//             // Add the bin-specific stock to the group
//             acc[key].bins.push({
//                 binId: inv.bin,
//                 quantity: inv.quantity || 0,
//                 committed: inv.committed || 0,
//                 onOrder: inv.onOrder || 0,
//             });

//             // Aggregate the totals for the group
//             acc[key].totalQuantity += inv.quantity || 0;
//             acc[key].totalCommitted += inv.committed || 0;
//             acc[key].totalOnOrder += inv.onOrder || 0;

//             return acc;
//         }, {});

//         return Object.values(grouped); // Convert the grouped object back to an array
//     }, [inventory, search]);
    
//     // Helper to find the bin's code from its ID
//     const getBinCode = (binId, warehouse) => {
//         if (!binId) return "General Stock"; // For items not in a specific bin
//         const bin = warehouse.binLocations?.find(b => b._id === binId);
//         return bin?.code || "Unknown Bin";
//     };

//     if (loading) return <div className="p-4 text-center text-blue-500">Loading inventory...</div>;
//     if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

//     return (
//         <div className="max-w-7xl mx-auto p-4">
//             <h1 className="text-2xl font-bold mb-6 text-center">Inventory Stock View</h1>
            
//             {/* Search Filters */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-gray-50">
//                 <input
//                     type="text" name="itemCode" placeholder="Search by Item Code"
//                     value={search.itemCode} onChange={handleSearchChange}
//                     className="p-2 border rounded w-full"
//                 />
//                 <input
//                     type="text" name="itemName" placeholder="Search by Item Name"
//                     value={search.itemName} onChange={handleSearchChange}
//                     className="p-2 border rounded w-full"
//                 />
//                 <input
//                     type="text" name="warehouse" placeholder="Search by Warehouse"
//                     value={search.warehouse} onChange={handleSearchChange}
//                     className="p-2 border rounded w-full"
//                 />
//             </div>

//             {/* Inventory Table */}
//             <div className="overflow-auto border rounded-lg shadow-md">
//                 <table className="min-w-full bg-white text-sm">
//                     <thead className="bg-gray-200">
//                         <tr>
//                             <th className="p-3 text-left w-12"></th>
//                             <th className="p-3 text-left">Item Code</th>
//                             <th className="p-3 text-left">Item Name</th>
//                             <th className="p-3 text-left">Warehouse</th>
//                             <th className="p-3 text-right font-semibold">Total Stock</th>
//                             <th className="p-3 text-right">Committed (SO)</th>
//                             <th className="p-3 text-right">On Order (PO)</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {groupedAndFilteredInventory.length > 0 ? (
//                             groupedAndFilteredInventory.map((group) => {
//                                 const key = `${group.item._id}-${group.warehouse._id}`;
//                                 const isExpanded = expandedRows[key];
//                                 return (
//                                     <React.Fragment key={key}>
//                                         {/* Main Row: Grouped Item/Warehouse with Totals */}
//                                         <tr
//                                             className="border-b hover:bg-gray-50 cursor-pointer"
//                                             onClick={() => toggleRow(key)}
//                                         >
//                                             <td className="p-3 text-center text-blue-600 font-bold">
//                                                 {isExpanded ? "−" : "+"}
//                                             </td>
//                                             <td className="p-3">{group.item.itemCode}</td>
//                                             <td className="p-3">{group.item.itemName}</td>
//                                             <td className="p-3">{group.warehouse.warehouseName}</td>
//                                             <td className="p-3 text-right font-semibold text-lg">{group.totalQuantity}</td>
//                                             <td className="p-3 text-right text-orange-600">{group.totalCommitted}</td>
//                                             <td className="p-3 text-right text-green-600">{group.totalOnOrder}</td>
//                                         </tr>

//                                         {/* Expanded View: Bin-level Details */}
//                                         {isExpanded && (
//                                             group.bins.map((binData, idx) => (
//                                                 <tr key={`${key}-bin-${idx}`} className="bg-gray-50 text-gray-700">
//                                                     <td className="p-2 border-l-4 border-blue-500"></td>
//                                                     <td colSpan="3" className="px-3 py-2 text-right font-medium">
//                                                         Bin: {getBinCode(binData.binId, group.warehouse)}
//                                                     </td>
//                                                     <td className="px-3 py-2 text-right">{binData.quantity}</td>
//                                                     <td className="px-3 py-2 text-right text-orange-600">{binData.committed}</td>
//                                                     <td className="px-3 py-2 text-right text-green-600">{binData.onOrder}</td>
//                                                 </tr>
//                                             ))
//                                         )}
//                                     </React.Fragment>
//                                 );
//                             })
//                         ) : (
//                             <tr>
//                                 <td colSpan="7" className="text-center p-6 text-gray-500">
//                                     No inventory items found matching your search.
//                                 </td>
//                             </tr>
//                         )}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// }



// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";

// export default function InventoryView() {
//   const [inventory, setInventory] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState({
//     itemCode: "",
//     itemName: "",
//     warehouse: "",
//   });
//   const [expandedRows, setExpandedRows] = useState({});

//   // Fetch inventory from API
//   useEffect(() => {
//     const fetchInventory = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setError("You are not authenticated. Please log in.");
//           setLoading(false);
//           return;
//         }

//         const { data } = await axios.get("/api/inventory", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         setInventory(data.data || []);
//         console.log("Fetched Inventory:", data.data || []);
//       } catch (err) {
//         console.error(
//           "Error fetching inventory:",
//           err.response?.data || err.message
//         );
//         setError("Error fetching inventory. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInventory();
//   }, []);

//   // Handle search input changes
//   const handleSearchChange = (e) => {
//     setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   // Toggle row expansion
//   const toggleRow = (index) => {
//     setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
//   };

//   const getBinLabel = (binId, inv) => {
//   if (!binId) return "Default";
//   const found = inv.warehouse?.binLocations?.find(b => b._id === binId);
//   return found?.code || found?.code || binId; // fallback to ObjectId if no match
// };


//   // Filter inventory based on search
//   const filtered = inventory.filter((inv) => {
//     const itemCode = inv.item?.itemCode || "";
//     const itemName = inv.item?.itemName || inv.productDesc || "";
//     const warehouseName = inv.warehouse?.warehouseName || "";

//     return (
//       itemCode.toLowerCase().includes(search.itemCode.toLowerCase()) &&
//       itemName.toLowerCase().includes(search.itemName.toLowerCase()) &&
//       warehouseName.toLowerCase().includes(search.warehouse.toLowerCase())
//     );
//   });

//   if (loading)
//     return <div className="p-4 text-blue-500">Loading inventory...</div>;
//   if (error) return <div className="p-4 text-red-500">{error}</div>;

//   return (
//     <div className="max-w-7xl mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-6">Inventory View</h1>

//       {/* Search Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//         <input
//           type="text"
//           name="itemCode"
//           placeholder="Search by Item Code"
//           value={search.itemCode}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//         <input
//           type="text"
//           name="itemName"
//           placeholder="Search by Item Name"
//           value={search.itemName}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//         <input
//           type="text"
//           name="warehouse"
//           placeholder="Search by Warehouse"
//           value={search.warehouse}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//       </div>

//       {/* Inventory Table */}
//       <div className="overflow-auto border rounded">
//         <table className="min-w-full bg-white text-sm">
//           <thead className="bg-gray-100 border-b">
//             <tr>
//               <th className="p-2 text-left"></th>
//               <th className="p-2 text-left">Item Code</th>
//               <th className="p-2 text-left">Item Name</th>
//               <th className="p-2 text-left">Warehouse</th>
//               <th className="p-2 text-left">Stock Quantity</th>
//               <th className="p-2 text-left">SO Quantity</th>
//               <th className="p-2 text-left">PO Quantity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.length > 0 ? (
//               filtered.map((inv, i) => {
//                 const itemCode = inv.item?.itemCode || "";
//                 const itemName = inv.item?.itemName || inv.productDesc || "";
//                 const warehouseName = inv.warehouse?.warehouseName || "";

//                 // Collect bins (for expansion only)
//                 const bins = [];
//                 if (Array.isArray(inv.batches) && inv.batches.length > 0) {
//                   inv.batches.forEach((b) => {
//                     if ((b.quantity ?? 0) > 0) {
//                       bins.push({
//                         bin: b.bin || "Default",
//                         quantity: b.quantity,
//                       });
//                     }
//                   });
//                 } else {
//                   bins.push({
//                     bin: inv.bin || "Default",
//                     quantity: inv.quantity,
//                   });
//                 }

//                 return (
//                   <React.Fragment key={i}>
//                     {/* Main row (no bin shown) */}
//                     <tr
//                       className="border-b hover:bg-gray-50 cursor-pointer"
//                       onClick={() => toggleRow(i)}
//                     >
//                       <td className="p-2 text-center">
//                         {expandedRows[i] ? "-" : "+"}
//                       </td>
//                       <td className="p-2">{itemCode}</td>
//                       <td className="p-2">{itemName}</td>
//                       <td className="p-2">{warehouseName}</td>
//                       <td className="p-2">{inv.quantity}</td>
//                       <td className="p-2">{inv.committed}</td>
//                       <td className="p-2">{inv.onOrder}</td>
//                     </tr>

//                     {/* Expanded rows (bin details) */}
//                     {expandedRows[i] &&
//                       bins.map((b, idx) => (
//                         <tr
//                           key={`${i}-bin-${idx}`}
//                           className="bg-gray-50 text-sm"
//                         >
//                           <td className="p-2"></td>
//                           <td className="p-2" colSpan={2}></td>
                         
//                           <td className="p-2 font-medium">
//   Bin: {getBinLabel(b.bin?._id || b.bin, inv)}
// </td>
                       
//                           <td className="p-2">{b.quantity}</td>
//                           <td className="p-2"></td>
//                           <td className="p-2"></td>
//                         </tr>
//                       ))}
//                   </React.Fragment>
//                 );
//               })
//             ) : (
//               <tr>
//                 <td colSpan="7" className="text-center p-4 text-gray-500">
//                   No inventory items found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }




// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";

// export default function InventoryView() {
//   const [inventory, setInventory] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [search, setSearch] = useState({
//     itemCode: "",
//     itemName: "",
//     warehouse: "",
//   });

//   // ✅ Fetch Inventory
//   useEffect(() => {
//     const fetchInventory = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setError("You are not authenticated. Please log in.");
//           setLoading(false);
//           return;
//         }

//         const { data } = await axios.get("/api/inventory", {
//           headers: {
//             Authorization: `Bearer ${token}`, // ✅ Send token
//           },
//         });

//         setInventory(data.data || []);
//       } catch (err) {
//         console.error("Error fetching inventory:", err.response?.data || err.message);
//         setError("Error fetching inventory. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInventory();
//   }, []);

//   // ✅ Filter Inventory
//   const filtered = inventory.filter((inv) => {
//     const itemCode = inv.item?.itemCode || inv.productNo?.productNo?.itemCode || "";
//     const itemName =
//       inv.item?.itemName || inv.productNo?.productNo?.itemName || inv.productDesc || "";
//     const warehouseName = inv.warehouse?.warehouseName || "";

//     return (
//       itemCode.toLowerCase().includes(search.itemCode.toLowerCase()) &&
//       itemName.toLowerCase().includes(search.itemName.toLowerCase()) &&
//       warehouseName.toLowerCase().includes(search.warehouse.toLowerCase())
//     );
//   });

//   // ✅ Handle Search Inputs
//   const handleSearchChange = (e) => {
//     setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   if (loading) return <div className="p-4 text-blue-500">Loading inventory...</div>;

//   if (error) return <div className="p-4 text-red-500">{error}</div>;

//   return (
//     <div className="max-w-7xl mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-6">Inventory View</h1>

//       {/* ✅ Search Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//         <input
//           type="text"
//           name="itemCode"
//           placeholder="Search by Item Code"
//           value={search.itemCode}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//         <input
//           type="text"
//           name="itemName"
//           placeholder="Search by Item Name"
//           value={search.itemName}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//         <input
//           type="text"
//           name="warehouse"
//           placeholder="Search by Warehouse"
//           value={search.warehouse}
//           onChange={handleSearchChange}
//           className="p-2 border rounded w-full"
//         />
//       </div>

//       {/* ✅ Inventory Table */}
//       <div className="overflow-auto border rounded">
//         <table className="min-w-full bg-white text-sm">
//           <thead className="bg-gray-100 border-b">
//             <tr>
//               <th className="p-2 text-left">Item Code</th>
//               <th className="p-2 text-left">Item Name</th>
//               <th className="p-2 text-left">Warehouse</th>
//               <th className="p-2 text-left">Stock Quantity</th>
//               <th className="p-2 text-left">SO Quantity</th>
//               <th className="p-2 text-left">PO Quantity</th>
//               {/* <th className="p-2 text-left">Unit Price</th> */}
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.length > 0 ? (
//               filtered.map((inv, i) => {
//                 const itemCode =
//                   inv.item?.itemCode || inv.productNo?.productNo?.itemCode || "";
//                 const itemName =
//                   inv.item?.itemName || inv.productNo?.productNo?.itemName || inv.productDesc || "";
//                 const warehouseName = inv.warehouse?.warehouseName || "";

//                 return (
//                   <tr key={i} className="border-b hover:bg-gray-50">
//                     <td className="p-2">{itemCode}</td>
//                     <td className="p-2">{itemName}</td>
//                     <td className="p-2">{warehouseName}</td>
//                     <td className="p-2">{inv.quantity}</td>
//                     <td className="p-2">{inv.committed}</td>
//                     <td className="p-2">{inv.onOrder}</td>
//                     {/* <td className="p-2">{inv.unitPrice}</td> */}
//                   </tr>
//                 );
//               })
//             ) : (
//               <tr>
//                 <td colSpan="7" className="text-center p-4 text-gray-500">
//                   No inventory items found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
