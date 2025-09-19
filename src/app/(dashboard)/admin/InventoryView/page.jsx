// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const InventoryView = () => {
//   const [inventoryData, setInventoryData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchItemCode, setSearchItemCode] = useState("");
//   const [searchItemName, setSearchItemName] = useState("");
//   const [searchWarehouseName, setSearchWarehouseName] = useState("");

//   useEffect(() => {
//     axios
//       .get("/api/inventory")
//       .then((res) => {
//         const data = res.data?.data || res.data?.inventory || [];
//         setInventoryData(Array.isArray(data) ? data : [data]);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error("Error fetching inventory:", err);
//         setError(err.message || "Error fetching inventory");
//         setLoading(false);
//       });
//   }, []);

//   if (loading) return <div className="p-4">Loading inventory...</div>;
//   if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

//   const filteredInventory = inventoryData.filter((inv) => {
//     const itemCode = inv.item?.itemCode || inv.productNo?.itemCode || "";
//     const itemName = inv.item?.itemName || inv.productDesc || "";
//     const warehouseName = inv.warehouse?.warehouseName || "";

//     return (
//       (!searchItemCode || itemCode.toLowerCase().includes(searchItemCode.toLowerCase())) &&
//       (!searchItemName || itemName.toLowerCase().includes(searchItemName.toLowerCase())) &&
//       (!searchWarehouseName || warehouseName.toLowerCase().includes(searchWarehouseName.toLowerCase()))
//     );
//   });

//   const getTotalQuantity = (inv) => {
//     if (Array.isArray(inv.batches) && inv.batches.length > 0) {
//       return inv.batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
//     }
//     return inv.quantity || 0;
//   };

//   return (
//     <div className="max-w-7xl mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Inventory</h1>

//       <div className="mb-4 flex flex-wrap gap-4">
//         <input
//           type="text"
//           placeholder="Search by Item Code"
//           value={searchItemCode}
//           onChange={(e) => setSearchItemCode(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Item Name"
//           value={searchItemName}
//           onChange={(e) => setSearchItemName(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Warehouse Name"
//           value={searchWarehouseName}
//           onChange={(e) => setSearchWarehouseName(e.target.value)}
//           className="p-2 border rounded"
//         />
//       </div>

//       <table className="min-w-full table-auto border-collapse border border-gray-300">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="border p-2">Item Code</th>
//             <th className="border p-2">Item Name</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Quantity</th>
//             <th className="border p-2">Unit Price</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredInventory.length === 0 ? (
//             <tr>
//               <td colSpan="5" className="text-center p-4">
//                 No inventory found
//               </td>
//             </tr>
//           ) : (
//             filteredInventory.map((inv, index) => (
//               <tr key={index} className="hover:bg-gray-50">
//                 <td className="border p-2">
//                   {inv.item?.itemCode || inv.bomId?.productNo?.itemCode  || "-"}
//                 </td>
//                 <td className="border p-2">
//                   {inv.item?.itemName || inv.productDesc || "-"}
//                 </td>
//                 <td className="border p-2">
//                   {inv.warehouse?.warehouseName || "-"}
//                 </td>
//                 <td className="border p-2">{getTotalQuantity(inv)}</td>
//                 <td className="border p-2">{inv.unitPrice || "-"}</td>
//               </tr>
//             ))
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default InventoryView;




"use client";

import React, { useEffect, useState } from "react";
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

  // ✅ Fetch Inventory
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
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Send token
          },
        });

        setInventory(data.data || []);
      } catch (err) {
        console.error("Error fetching inventory:", err.response?.data || err.message);
        setError("Error fetching inventory. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // ✅ Filter Inventory
  const filtered = inventory.filter((inv) => {
    const itemCode = inv.item?.itemCode || inv.productNo?.productNo?.itemCode || "";
    const itemName =
      inv.item?.itemName || inv.productNo?.productNo?.itemName || inv.productDesc || "";
    const warehouseName = inv.warehouse?.warehouseName || "";

    return (
      itemCode.toLowerCase().includes(search.itemCode.toLowerCase()) &&
      itemName.toLowerCase().includes(search.itemName.toLowerCase()) &&
      warehouseName.toLowerCase().includes(search.warehouse.toLowerCase())
    );
  });

  // ✅ Handle Search Inputs
  const handleSearchChange = (e) => {
    setSearch((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) return <div className="p-4 text-blue-500">Loading inventory...</div>;

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inventory View</h1>

      {/* ✅ Search Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          name="itemCode"
          placeholder="Search by Item Code"
          value={search.itemCode}
          onChange={handleSearchChange}
          className="p-2 border rounded w-full"
        />
        <input
          type="text"
          name="itemName"
          placeholder="Search by Item Name"
          value={search.itemName}
          onChange={handleSearchChange}
          className="p-2 border rounded w-full"
        />
        <input
          type="text"
          name="warehouse"
          placeholder="Search by Warehouse"
          value={search.warehouse}
          onChange={handleSearchChange}
          className="p-2 border rounded w-full"
        />
      </div>

      {/* ✅ Inventory Table */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-2 text-left">Item Code</th>
              <th className="p-2 text-left">Item Name</th>
              <th className="p-2 text-left">Warehouse</th>
              <th className="p-2 text-left">Stock Quantity</th>
              <th className="p-2 text-left">SO Quantity</th>
              <th className="p-2 text-left">PO Quantity</th>
              {/* <th className="p-2 text-left">Unit Price</th> */}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((inv, i) => {
                const itemCode =
                  inv.item?.itemCode || inv.productNo?.productNo?.itemCode || "";
                const itemName =
                  inv.item?.itemName || inv.productNo?.productNo?.itemName || inv.productDesc || "";
                const warehouseName = inv.warehouse?.warehouseName || "";

                return (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{itemCode}</td>
                    <td className="p-2">{itemName}</td>
                    <td className="p-2">{warehouseName}</td>
                    <td className="p-2">{inv.quantity}</td>
                    <td className="p-2">{inv.committed}</td>
                    <td className="p-2">{inv.onOrder}</td>
                    {/* <td className="p-2">{inv.unitPrice}</td> */}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center p-4 text-gray-500">
                  No inventory items found
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
// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const InventoryView = () => {
//   const [inventoryData, setInventoryData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchItemCode, setSearchItemCode] = useState("");
//   const [searchItemName, setSearchItemName] = useState("");
//   const [searchWarehouseName, setSearchWarehouseName] = useState("");
//   const [expandedRows, setExpandedRows] = useState([]);

//   useEffect(() => {
//     axios
//       .get("/api/inventory")
//       .then((res) => {
//         console.log("Fetched inventory:", res.data.data);
//         setInventoryData(res.data.data || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error("Error fetching inventory:", err);
//         setError(err.message || "Error fetching inventory");
//         setLoading(false);
//       });
//   }, []);

//   const toggleRowExpansion = (index) => {
//     setExpandedRows((prev) =>
//       prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
//     );
//   };

//   if (loading) return <div className="p-4">Loading inventory...</div>;
//   if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

//   // 1️⃣ Filter inventory based on search inputs
//   const filteredInventory = inventoryData.filter((inv) => {
//     const itemCode =
//       inv.item?.itemCode ||
//       inv.productNo?.productNo?.itemCode ||
//       inv.productDesc ||
//       "";
//     const itemName =
//       inv.item?.itemName ||
//       inv.productNo?.productNo?.itemName ||
//       inv.productDesc ||
//       "";
//     const warehouseName = inv.warehouse?.warehouseName || "";

//     return (
//       (!searchItemCode || itemCode.toLowerCase().includes(searchItemCode.toLowerCase())) &&
//       (!searchItemName || itemName.toLowerCase().includes(searchItemName.toLowerCase())) &&
//       (!searchWarehouseName || warehouseName.toLowerCase().includes(searchWarehouseName.toLowerCase()))
//     );
//   });

//   return (
//     <div className="max-w-4xl mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Inventory</h1>

//       <div className="mb-4 flex flex-wrap gap-4">
//         <input
//           type="text"
//           placeholder="Search by Item Code"
//           value={searchItemCode}
//           onChange={(e) => setSearchItemCode(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Item Name"
//           value={searchItemName}
//           onChange={(e) => setSearchItemName(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Warehouse Name"
//           value={searchWarehouseName}
//           onChange={(e) => setSearchWarehouseName(e.target.value)}
//           className="p-2 border rounded"
//         />
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full table-auto border-collapse">
//           <thead>
//             <tr className="bg-gray-200">
//               <th className="border p-2">Warehouse Code</th>
//               <th className="border p-2">Warehouse Name</th>
//               <th className="border p-2">Item Code</th>
//               <th className="border p-2">Item Name</th>
//               <th className="border p-2">Stock</th>
//               <th className="border p-2">Commit</th>
//               <th className="border p-2">Order</th>
//               <th className="border p-2">Available</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredInventory.map((inv, index) => {
//               const stock = inv.quantity || 0;
//               const commit = inv.committed || 0;
//               const order = inv.onOrder || 0;
//               const available = stock + order - commit;
//               const isExpanded = expandedRows.includes(index);

//               const itemCode =
//                 inv.item?.itemCode ||
//                 inv.productNo?.productNo?.itemCode ||
              
//                 "N/A";
//               const itemName =
//                 inv.item?.itemName ||
//                 inv.productNo?.productNo?.itemName ||
//                 inv.productDesc ||
//                 "N/A";

//               return (
//                 <React.Fragment key={index}>
//                   <tr
//                     className={`border-t cursor-pointer ${
//                       isExpanded ? "bg-gray-100" : ""
//                     }`}
//                     onClick={() => toggleRowExpansion(index)}
//                   >
//                     <td className="border p-2">
//                       {inv.warehouse?.warehouseCode || "N/A"}
//                     </td>
//                     <td className="border p-2">
//                       {inv.warehouse?.warehouseName || "N/A"}
//                     </td>
//                     <td className="border p-2">{itemCode}</td>
//                     <td className="border p-2">{itemName}</td>
//                     <td className="border p-2">{stock}</td>
//                     <td className="border p-2">{commit}</td>
//                     <td className="border p-2">{order}</td>
//                     <td className="border p-2">{available}</td>
//                   </tr>

//                   {isExpanded && inv.batches?.length > 0 && (
//                     <tr>
//                       <td colSpan="8" className="p-2">
//                         <div className="overflow-x-auto">
//                           <table className="w-full table-auto border-collapse">
//                             <thead>
//                               <tr className="bg-gray-100">
//                                 <th className="border p-2">Batch Number</th>
//                                 <th className="border p-2">Expiry Date</th>
//                                 <th className="border p-2">Quantity</th>
//                                 <th className="border p-2">Unit Price</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {inv.batches.map((batch, idx2) => (
//                                 <tr key={idx2}>
//                                   <td className="border p-2">
//                                     {batch.batchNumber || "N/A"}
//                                   </td>
//                                   <td className="border p-2">
//                                     {batch.expiryDate
//                                       ? new Date(batch.expiryDate).toLocaleDateString()
//                                       : "N/A"}
//                                   </td>
//                                   <td className="border p-2">
//                                     {batch.quantity || 0}
//                                   </td>
//                                   <td className="border p-2">
//                                     {batch.unitPrice || 0}
//                                   </td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default InventoryView;


















// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const InventoryView = () => {
//   const [inventoryData, setInventoryData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchItemCode, setSearchItemCode] = useState("");
//   const [searchItemName, setSearchItemName] = useState("");
//   const [searchWarehouseName, setSearchWarehouseName] = useState("");
//   const [expandedRows, setExpandedRows] = useState([]);

//   useEffect(() => {
//     axios
//       .get("/api/inventory")
//       .then((res) => {
//          setInventoryData(res.data.data || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error("Error fetching inventory:", err);
//         setError(err.message || "Error fetching inventory");
//         setLoading(false);
//       });
//   }, []);

//   if (loading) return <div className="p-4">Loading inventory...</div>;
//   if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
//   console.log("Inventory Data:", inventoryData);
//   const filteredInventory = inventoryData.filter((inv) => {
// const itemCode = inv.item?.itemCode || inv.productNo?.productNo?.itemCode || "";
// const itemName = inv.item?.itemName || inv.productNo?.productNo?.itemName || "";
//     const warehouseName = inv.warehouse?.warehouseName || "";

//     return (
//       (!searchItemCode ||
//         itemCode.toLowerCase().includes(searchItemCode.toLowerCase())) &&
//       // (!productNo ||
//       //   productNo.toLowerCase().includes(searchItemCode.toLowerCase())) &&
//       // (!productName ||
//       //   productName.toLowerCase().includes(searchItemName.toLowerCase())) &&
//       (!searchItemName ||
//         itemName.toLowerCase().includes(searchItemName.toLowerCase())) &&
//       (!searchWarehouseName ||
//         warehouseName.toLowerCase().includes(searchWarehouseName.toLowerCase()))
//     );
//   });

//   const toggleRowExpansion = (index) => {
//     setExpandedRows((prev) =>
//       prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
//     );
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Inventory</h1>

//       <div className="mb-4 flex flex-wrap gap-4">
//         <input
//           type="text"
//           placeholder="Search by Item Code"
//           value={searchItemCode}
//           onChange={(e) => setSearchItemCode(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Item Name"
//           value={searchItemName}
//           onChange={(e) => setSearchItemName(e.target.value)}
//           className="p-2 border rounded"
//         />
//         <input
//           type="text"
//           placeholder="Search by Warehouse Name"
//           value={searchWarehouseName}
//           onChange={(e) => setSearchWarehouseName(e.target.value)}
//           className="p-2 border rounded"
//         />
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full table-auto border-collapse">
//           <thead>
//             <tr className="bg-gray-200">
//               <th className="border p-2">Warehouse Code</th>
//               <th className="border p-2">Warehouse Name</th>
//               <th className="border p-2">Item Code</th>
//               <th className="border p-2">Item Name</th>
//               <th className="border p-2">Stock</th>
//               <th className="border p-2">Commit</th>
//               <th className="border p-2">Order</th>
//               <th className="border p-2">Available</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredInventory.map((inv, index) => {
//               const stock = inv.quantity || 0;
//               const commit = inv.committed || 0;
//               const order = inv.onOrder || 0;
//               const available = stock + order - commit;
//               const isExpanded = expandedRows.includes(index);

//               return (
//                 <React.Fragment key={index}>
//                   <tr
//                     className={`border-t cursor-pointer ${
//                       isExpanded ? "bg-gray-100" : ""
//                     }`}
//                     onClick={() => toggleRowExpansion(index)}
//                   >
//                     <td className="border p-2">
//                       {inv.warehouse?.warehouseCode || "N/A"}
//                     </td>
//                     <td className="border p-2">
//                       {inv.warehouse?.warehouseName || "N/A"}
//                     </td>
//                     <td className="border p-2">
//                   {inv?.item?.itemCode || inv?.productNo?.productNo?.itemName || "N/A"}

//                     </td>
//                     <td className="border p-2">
//                       {inv.item?.itemName || inv.productDesc || "N/A"}
//                     </td>
//                     <td className="border p-2">{stock}</td>
//                     <td className="border p-2">{commit}</td>
//                     <td className="border p-2">{order}</td>
//                     <td className="border p-2">{available}</td>
//                   </tr>
//                   {isExpanded && inv.batches && (
//                     <tr>
//                       <td colSpan="8" className="p-2">
//                         <div className="overflow-x-auto">
//                           <table className="w-full table-auto border-collapse">
//                             <thead>
//                               <tr className="bg-gray-100">
//                                 <th className="border p-2">Batch Number</th>
//                                 <th className="border p-2">Expiration Date</th>
//                                 <th className="border p-2">Quantity</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {inv.batches.map((batch, batchIndex) => (
//                                 <tr key={batchIndex}>
//                                   <td className="border p-2">
//                                     {batch.batchNumber || "N/A"}
//                                   </td>
//                                   <td className="border p-2">
//                                     {batch.expiryDate || "N/A"}
//                                   </td>
//                                   <td className="border p-2">
//                                     {batch.quantity || 0}
//                                   </td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default InventoryView;
