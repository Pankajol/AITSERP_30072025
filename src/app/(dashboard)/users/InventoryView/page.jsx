"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

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
                const errMsg = err.response?.data?.message || err.message || "Error fetching inventory.";
                console.error("Error fetching inventory:", errMsg);
                setError("Error fetching inventory. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []);

    // Handle search input changes
    const handleSearchChange = (e) => {
        setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Toggle row expansion
    const toggleRow = (key) => {
        setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Group inventory by item and warehouse, and calculate totals
    const groupedAndFilteredInventory = useMemo(() => {
        // First, filter the raw inventory based on search criteria
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

        // Now, group the filtered results
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

            // Add the bin-specific stock to the group
            acc[key].bins.push({
                binId: inv.bin,
                quantity: inv.quantity || 0,
                committed: inv.committed || 0,
                onOrder: inv.onOrder || 0,
            });

            // Aggregate the totals for the group
            acc[key].totalQuantity += inv.quantity || 0;
            acc[key].totalCommitted += inv.committed || 0;
            acc[key].totalOnOrder += inv.onOrder || 0;

            return acc;
        }, {});

        return Object.values(grouped); // Convert the grouped object back to an array
    }, [inventory, search]);
    
    // Helper to find the bin's code from its ID
    const getBinCode = (binId, warehouse) => {
        if (!binId) return "General Stock"; // For items not in a specific bin
        const bin = warehouse.binLocations?.find(b => b._id === binId);
        return bin?.code || "Unknown Bin";
    };

    if (loading) return <div className="p-4 text-center text-blue-500">Loading inventory...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 text-center">Inventory Stock View</h1>
            
            {/* Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-gray-50">
                <input
                    type="text" name="itemCode" placeholder="Search by Item Code"
                    value={search.itemCode} onChange={handleSearchChange}
                    className="p-2 border rounded w-full"
                />
                <input
                    type="text" name="itemName" placeholder="Search by Item Name"
                    value={search.itemName} onChange={handleSearchChange}
                    className="p-2 border rounded w-full"
                />
                <input
                    type="text" name="warehouse" placeholder="Search by Warehouse"
                    value={search.warehouse} onChange={handleSearchChange}
                    className="p-2 border rounded w-full"
                />
            </div>

            {/* Inventory Table */}
            <div className="overflow-auto border rounded-lg shadow-md">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="p-3 text-left w-12"></th>
                            <th className="p-3 text-left">Item Code</th>
                            <th className="p-3 text-left">Item Name</th>
                            <th className="p-3 text-left">Warehouse</th>
                            <th className="p-3 text-right font-semibold">Total Stock</th>
                            <th className="p-3 text-right">Committed (SO)</th>
                            <th className="p-3 text-right">On Order (PO)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedAndFilteredInventory.length > 0 ? (
                            groupedAndFilteredInventory.map((group) => {
                                const key = `${group.item._id}-${group.warehouse._id}`;
                                const isExpanded = expandedRows[key];
                                return (
                                    <React.Fragment key={key}>
                                        {/* Main Row: Grouped Item/Warehouse with Totals */}
                                        <tr
                                            className="border-b hover:bg-gray-50 cursor-pointer"
                                            onClick={() => toggleRow(key)}
                                        >
                                            <td className="p-3 text-center text-blue-600 font-bold">
                                                {isExpanded ? "−" : "+"}
                                            </td>
                                            <td className="p-3">{group.item.itemCode}</td>
                                            <td className="p-3">{group.item.itemName}</td>
                                            <td className="p-3">{group.warehouse.warehouseName}</td>
                                            <td className="p-3 text-right font-semibold text-lg">{group.totalQuantity}</td>
                                            <td className="p-3 text-right text-orange-600">{group.totalCommitted}</td>
                                            <td className="p-3 text-right text-green-600">{group.totalOnOrder}</td>
                                        </tr>

                                        {/* Expanded View: Bin-level Details */}
                                        {isExpanded && (
                                            group.bins.map((binData, idx) => (
                                                <tr key={`${key}-bin-${idx}`} className="bg-gray-50 text-gray-700">
                                                    <td className="p-2 border-l-4 border-blue-500"></td>
                                                    <td colSpan="3" className="px-3 py-2 text-right font-medium">
                                                        Bin: {getBinCode(binData.binId, group.warehouse)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">{binData.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-orange-600">{binData.committed}</td>
                                                    <td className="px-3 py-2 text-right text-green-600">{binData.onOrder}</td>
                                                </tr>
                                            ))
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center p-6 text-gray-500">
                                    No inventory items found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}



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
