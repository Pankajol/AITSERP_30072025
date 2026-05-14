"use client";

import React, { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import axios from "axios";
import { 
  FaSearch, FaWarehouse, FaBoxes, FaClipboardCheck, 
  FaTruckLoading, FaChevronDown, FaChevronUp, FaInfoCircle,
  FaChevronLeft, FaChevronRight
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
    
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setError("You are not authenticated. Please log in.");
                setLoading(false);
                return;
            }

            const searchTerms = [search.itemCode, search.itemName, search.warehouse].filter(Boolean).join(" ");
            const params = new URLSearchParams();
            params.append("page", page);
            params.append("limit", limit);
            if (searchTerms) params.append("search", searchTerms);

            const { data } = await axios.get(`/api/inventory?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (data.success) {
                setInventory(data.data || []);
                setTotalRecords(data.pagination?.totalRecords || 0);
                setTotalPages(data.pagination?.totalPages || 0);
                setError(null);
            } else {
                setError(data.message || "Failed to fetch inventory.");
            }
        } catch (err) {
            console.error(err);
            setError("Error fetching inventory. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, search.itemCode, search.itemName, search.warehouse]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    useEffect(() => {
        setPage(1);
    }, [search.itemCode, search.itemName, search.warehouse]);

    const handleSearchChange = (e) => {
        setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleRow = (key) => {
        setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Build rows using both variantInventory and item.variants
    const inventoryRows = useMemo(() => {
        const rows = [];
        for (const inv of inventory) {
            if (!inv.item || !inv.warehouse) continue;

            const baseInfo = {
                item: inv.item,
                warehouse: inv.warehouse,
                bin: inv.bin,
            };

            let variantList = [];
            if (inv.hasVariants && inv.variantInventory?.length) {
                variantList = inv.variantInventory.map(v => ({
                    ...v,
                    quantity: v.quantity || 0,
                    committed: v.committed || 0,
                    onOrder: v.onOrder || 0,
                }));
            } else if (inv.item.variants && inv.item.variants.length) {
                variantList = inv.item.variants.map(v => ({
                    variantId: v._id,
                    sku: v.sku,
                    attributes: v.attributes || {},
                    quantity: 0,
                    committed: 0,
                    onOrder: 0,
                    batches: [],
                }));
            }

            if (variantList.length > 0) {
                for (const variant of variantList) {
                    rows.push({
                        ...baseInfo,
                        rowType: "variant",
                        variant: {
                            id: variant.variantId,
                            sku: variant.sku,
                            attributes: variant.attributes,
                            quantity: variant.quantity,
                            committed: variant.committed,
                            onOrder: variant.onOrder,
                        },
                        totalQuantity: variant.quantity,
                        totalCommitted: variant.committed,
                        totalOnOrder: variant.onOrder,
                        bins: variant.batches?.map(b => ({ ...b, binId: null })) || [],
                    });
                }
            } else {
                rows.push({
                    ...baseInfo,
                    rowType: "item",
                    variant: null,
                    totalQuantity: inv.quantity || 0,
                    totalCommitted: inv.committed || 0,
                    totalOnOrder: inv.onOrder || 0,
                    bins: [{
                        binId: inv.bin,
                        quantity: inv.quantity || 0,
                        committed: inv.committed || 0,
                        onOrder: inv.onOrder || 0,
                    }],
                });
            }
        }
        return rows;
    }, [inventory]);

    const stats = useMemo(() => {
        return inventoryRows.reduce((acc, row) => {
            acc.stock += row.totalQuantity;
            acc.committed += row.totalCommitted;
            acc.onOrder += row.totalOnOrder;
            return acc;
        }, { stock: 0, committed: 0, onOrder: 0 });
    }, [inventoryRows]);

    const getBinCode = (binId, warehouse) => {
        if (!binId) return "General Stock";
        const bin = warehouse.binLocations?.find(b => b._id === binId);
        return bin?.code || "Unknown Bin";
    };

    const goToPage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    const handleLimitChange = (e) => {
        setLimit(Number(e.target.value));
        setPage(1);
    };

    const Lbl = ({ text }) => (
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{text}</label>
    );
    const fi = () => `w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none`;

    if (loading && page === 1 && inventory.length === 0) {
        return <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium">Loading Inventory...</div>;
    }
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">{error}</div>;

    // Color mapping for stat cards (Tailwind requires full class names)
    const getColorClasses = (color) => {
        switch(color) {
            case 'indigo': return 'bg-indigo-50 text-indigo-500';
            case 'amber': return 'bg-amber-50 text-amber-500';
            case 'emerald': return 'bg-emerald-50 text-emerald-500';
            default: return 'bg-gray-50 text-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Inventory Management</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Real-time stock levels including variants</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "In Stock", value: stats.stock, icon: FaBoxes, color: "indigo" },
                        { label: "Committed (SO)", value: stats.committed, icon: FaClipboardCheck, color: "amber" },
                        { label: "On Order (PO)", value: stats.onOrder, icon: FaTruckLoading, color: "emerald" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${getColorClasses(s.color)} flex items-center justify-center`}>
                                <s.icon className="text-xl" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                                <p className="text-2xl font-bold text-gray-900 leading-none mt-1">{s.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

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

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="w-12"></th>
                                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Item Code</th>
                                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Item Name</th>
                                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Variant</th>
                                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Warehouse</th>
                                    <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Stock</th>
                                    <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">Committed</th>
                                    <th className="px-4 py-3 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">On Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && inventoryRows.length === 0 ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td colSpan={8} className="px-4 py-3">
                                                <div className="h-5 rounded bg-gray-100 animate-pulse" />
                                             </td>
                                        </tr>
                                    ))
                                ) : inventoryRows.length > 0 ? (
                                    inventoryRows.map((row, idx) => {
                                        const groupKey = `${row.item._id}-${row.warehouse._id}`;
                                        const isExpanded = expandedRows[groupKey];
                                        const variantDisplay = row.variant ? (
                                            <div>
                                                <span className="text-xs font-mono text-purple-600">{row.variant.sku}</span>
                                                {row.variant.attributes && Object.keys(row.variant.attributes).length > 0 && (
                                                    <div className="text-[9px] text-gray-400">
                                                        {Object.entries(row.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]">—</span>
                                        );

                                        return (
                                            <Fragment key={`${groupKey}-${idx}`}>
                                                <tr className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/20' : ''}`} onClick={() => toggleRow(groupKey)}>
                                                    <td className="px-4 py-3 text-center">
                                                        {isExpanded ? <FaChevronUp className="text-indigo-400 text-xs mx-auto" /> : <FaChevronDown className="text-gray-300 text-xs mx-auto" />}
                                                     </td>
                                                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-600">
                                                        <span className="bg-indigo-50 px-2 py-0.5 rounded">{row.item.itemCode}</span>
                                                     </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900">{row.item.itemName}</td>
                                                    <td className="px-4 py-3">{variantDisplay}</td>
                                                    <td className="px-4 py-3 text-gray-500 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <FaWarehouse className="text-gray-300 text-xs" />
                                                            {row.warehouse.warehouseName}
                                                        </div>
                                                     </td>
                                                    <td className="px-4 py-3 text-right font-mono font-black text-gray-900">{row.totalQuantity}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{row.totalCommitted}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{row.totalOnOrder}</td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr key={`${groupKey}-expand`}>
                                                        <td colSpan={8} className="p-0 bg-gray-50/50">
                                                            <div className="px-12 py-3 space-y-2 border-l-4 border-indigo-400">
                                                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2">
                                                                    <FaInfoCircle /> Bin Locations / Batches
                                                                </p>
                                                                {row.bins.length > 0 ? (
                                                                    row.bins.map((binData, binIdx) => (
                                                                        <div key={binIdx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                                                            <span className="text-xs font-bold text-gray-600">
                                                                                {getBinCode(binData.binId, row.warehouse)}
                                                                            </span>
                                                                            <div className="flex gap-8">
                                                                                <span className="text-xs font-mono w-20 text-right">Qty: {binData.quantity}</span>
                                                                                <span className="text-xs font-mono w-20 text-right text-amber-600">Comm: {binData.committed}</span>
                                                                                <span className="text-xs font-mono w-20 text-right text-emerald-600">Ord: {binData.onOrder}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs text-gray-400 italic">No bin details</p>
                                                                )}
                                                            </div>
                                                         </td>
                                                     </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16 text-center text-gray-300 font-medium">
                                            No matching inventory found.
                                         </td >
                                     </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>Show</span>
                                <select
                                    value={limit}
                                    onChange={handleLimitChange}
                                    className="px-2 py-1 rounded border border-gray-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span>entries</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                                        ${page === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}>
                                    <FaChevronLeft className="text-[10px]" /> Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (page <= 3) pageNum = i + 1;
                                        else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = page - 2 + i;
                                        return (
                                            <button key={pageNum} onClick={() => goToPage(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all
                                                    ${page === pageNum ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}>
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                                        ${page === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}>
                                    Next <FaChevronRight className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import { 
//   FaSearch, FaWarehouse, FaBoxes, FaClipboardCheck, 
//   FaTruckLoading, FaChevronDown, FaChevronUp, FaInfoCircle 
// } from "react-icons/fa";

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
//                 setError("Error fetching inventory. Please try again.");
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchInventory();
//     }, []);

//     const handleSearchChange = (e) => {
//         setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//     };

//     const toggleRow = (key) => {
//         setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
//     };

//     const groupedAndFilteredInventory = useMemo(() => {
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
//             acc[key].bins.push({
//                 binId: inv.bin,
//                 quantity: inv.quantity || 0,
//                 committed: inv.committed || 0,
//                 onOrder: inv.onOrder || 0,
//             });
//             acc[key].totalQuantity += inv.quantity || 0;
//             acc[key].totalCommitted += inv.committed || 0;
//             acc[key].totalOnOrder += inv.onOrder || 0;
//             return acc;
//         }, {});

//         return Object.values(grouped);
//     }, [inventory, search]);

//     // ── Stats Calculation ──
//     const stats = useMemo(() => {
//         return groupedAndFilteredInventory.reduce((acc, curr) => {
//             acc.stock += curr.totalQuantity;
//             acc.committed += curr.totalCommitted;
//             acc.onOrder += curr.totalOnOrder;
//             return acc;
//         }, { stock: 0, committed: 0, onOrder: 0 });
//     }, [groupedAndFilteredInventory]);

//     const getBinCode = (binId, warehouse) => {
//         if (!binId) return "General Stock";
//         const bin = warehouse.binLocations?.find(b => b._id === binId);
//         return bin?.code || "Unknown Bin";
//     };

//     // ── UI Helpers ──
//     const Lbl = ({ text }) => (
//         <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{text}</label>
//     );

//     const fi = () => `w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none`;

//     if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium">Loading Inventory...</div>;
//     if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium">{error}</div>;

//     return (
//         <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
//             <div className="max-w-7xl mx-auto">
                
//                 {/* ── Header ── */}
//                 <div className="mb-8">
//                     <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Inventory Management</h1>
//                     <p className="text-sm text-gray-400 mt-0.5">Real-time stock levels across all warehouses</p>
//                 </div>

//                 {/* ── Stat Cards ── */}
//                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
//                     {[
//                         { label: "In Stock", value: stats.stock, icon: FaBoxes, color: "indigo" },
//                         { label: "Committed (SO)", value: stats.committed, icon: FaClipboardCheck, color: "amber" },
//                         { label: "On Order (PO)", value: stats.onOrder, icon: FaTruckLoading, color: "emerald" },
//                     ].map((s, i) => (
//                         <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
//                             <div className={`w-12 h-12 rounded-xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-500`}>
//                                 <s.icon className="text-xl" />
//                             </div>
//                             <div>
//                                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
//                                 <p className="text-2xl font-bold text-gray-900 leading-none mt-1">{s.value.toLocaleString()}</p>
//                             </div>
//                         </div>
//                     ))}
//                 </div>

//                 {/* ── Search Toolbar ── */}
//                 <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
//                     <div className="flex items-center gap-2 mb-4 text-indigo-600">
//                         <FaSearch size={14} />
//                         <span className="text-xs font-bold uppercase tracking-wider">Search Filters</span>
//                     </div>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                         <div>
//                             <Lbl text="Item Code" />
//                             <input name="itemCode" className={fi()} value={search.itemCode} onChange={handleSearchChange} placeholder="e.g. ITEM-001" />
//                         </div>
//                         <div>
//                             <Lbl text="Item Name" />
//                             <input name="itemName" className={fi()} value={search.itemName} onChange={handleSearchChange} placeholder="Search by name..." />
//                         </div>
//                         <div>
//                             <Lbl text="Warehouse" />
//                             <input name="warehouse" className={fi()} value={search.warehouse} onChange={handleSearchChange} placeholder="All warehouses..." />
//                         </div>
//                     </div>
//                 </div>

//                 {/* ── Main Table Card ── */}
//                 <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-sm border-collapse">
//                             <thead>
//                                 <tr className="bg-gray-50 border-b border-gray-100">
//                                     <th className="w-12"></th>
//                                     {["Item Code", "Item Name", "Warehouse", "Total Stock", "Committed", "On Order"].map((h) => (
//                                         <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
//                                             {h}
//                                         </th>
//                                     ))}
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {groupedAndFilteredInventory.length > 0 ? (
//                                     groupedAndFilteredInventory.map((group) => {
//                                         const key = `${group.item._id}-${group.warehouse._id}`;
//                                         const isExpanded = expandedRows[key];
//                                         return (
//                                             <React.Fragment key={key}>
//                                                 <tr className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/20' : ''}`} onClick={() => toggleRow(key)}>
//                                                     <td className="px-4 py-3 text-center">
//                                                         {isExpanded ? <FaChevronUp className="text-indigo-400 text-xs mx-auto" /> : <FaChevronDown className="text-gray-300 text-xs mx-auto" />}
//                                                     </td>
//                                                     <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-600">
//                                                         <span className="bg-indigo-50 px-2 py-0.5 rounded">{group.item.itemCode}</span>
//                                                     </td>
//                                                     <td className="px-4 py-3 font-bold text-gray-900">{group.item.itemName}</td>
//                                                     <td className="px-4 py-3 text-gray-500 font-medium">
//                                                         <div className="flex items-center gap-2">
//                                                             <FaWarehouse className="text-gray-300 text-xs" />
//                                                             {group.warehouse.warehouseName}
//                                                         </div>
//                                                     </td>
//                                                     <td className="px-4 py-3 text-right font-mono font-black text-gray-900">{group.totalQuantity}</td>
//                                                     <td className="px-4 py-3 text-right font-mono font-bold text-amber-600">{group.totalCommitted}</td>
//                                                     <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{group.totalOnOrder}</td>
//                                                 </tr>

//                                                 {/* Expanded Bin Details */}
//                                                 {isExpanded && (
//                                                     <tr>
//                                                         <td colSpan="7" className="p-0 bg-gray-50/50">
//                                                             <div className="px-12 py-3 space-y-2 border-l-4 border-indigo-400">
//                                                                 <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2">
//                                                                     <FaInfoCircle /> Bin Locations Breakdown
//                                                                 </p>
//                                                                 {group.bins.map((binData, idx) => (
//                                                                     <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
//                                                                         <span className="text-xs font-bold text-gray-600">
//                                                                             {getBinCode(binData.binId, group.warehouse)}
//                                                                         </span>
//                                                                         <div className="flex gap-8">
//                                                                             <span className="text-xs font-mono w-20 text-right"><Lbl text="Qty:" /> {binData.quantity}</span>
//                                                                             <span className="text-xs font-mono w-20 text-right text-amber-600"><Lbl text="Comm:" /> {binData.committed}</span>
//                                                                             <span className="text-xs font-mono w-20 text-right text-emerald-600"><Lbl text="Ord:" /> {binData.onOrder}</span>
//                                                                         </div>
//                                                                     </div>
//                                                                 ))}
//                                                             </div>
//                                                         </td>
//                                                     </tr>
//                                                 )}
//                                             </React.Fragment>
//                                         );
//                                     })
//                                 ) : (
//                                     <tr>
//                                         <td colSpan="7" className="px-4 py-16 text-center text-gray-300 font-medium">
//                                             No matching inventory found.
//                                         </td>
//                                     </tr>
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }


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
