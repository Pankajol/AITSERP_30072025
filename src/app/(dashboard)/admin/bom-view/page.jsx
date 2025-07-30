"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function BOMListPage() {
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filterProductNo, setFilterProductNo] = useState("");
  const [filterBomType, setFilterBomType] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");

  useEffect(() => {
    async function fetchBOMs() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        return;
      }
      try {
        const res = await axios.get("/api/bom", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setBoms(res.data);
      } catch (err) {
        console.error("Error fetching BOMs:", err);
        setError("Failed to load BOM data");
      } finally {
        setLoading(false);
      }
    }

    fetchBOMs();
  }, []);

  // Apply filters
  const filteredBoms = boms.filter((bom) => {
    const productName =
      typeof bom.productNo === "object" ? bom.productNo.itemName : bom.productNo;
    const warehouseName =
      typeof bom.warehouse === "object" ? bom.warehouse.warehouseName : bom.warehouse;

    if (
      filterProductNo &&
      !productName?.toLowerCase().includes(filterProductNo.toLowerCase())
    ) {
      return false;
    }
    if (filterBomType && bom.bomType !== filterBomType) {
      return false;
    }
    if (filterWarehouse && warehouseName !== filterWarehouse) {
      return false;
    }
    return true;
  });

  if (loading) return <div>Loading BOMs...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  // Extract unique values for dropdowns
  const bomTypes = Array.from(new Set(boms.map((b) => b.bomType)));
  const warehouses = Array.from(
    new Set(
      boms.map((b) =>
        typeof b.warehouse === "object" ? b.warehouse.warehouseName : b.warehouse
      )
    )
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded">
      <h2 className="text-2xl font-semibold mb-4">BOM List</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium">Product No.</label>
          <input
            type="text"
            value={filterProductNo}
            onChange={(e) => setFilterProductNo(e.target.value)}
            placeholder="Search Product No."
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">BOM Type</label>
          <select
            value={filterBomType}
            onChange={(e) => setFilterBomType(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">All Types</option>
            {bomTypes.map((type, idx) => (
              <option key={idx} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Warehouse</label>
          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w, idx) => (
              <option key={idx} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BOM Table */}
      <table className="w-full table-auto border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Product No.</th>
            <th className="border p-2">Description</th>
            <th className="border p-2">Type</th>
            <th className="border p-2">Warehouse</th>
            <th className="border p-2">Items Count</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredBoms.map((bom, idx) => (
            <tr key={bom._id} className="hover:bg-gray-50">
              <td className="border p-2 text-center">{idx + 1}</td>
              <td className="border p-2">
                {bom.productNo?.itemName || bom.productNo}
              </td>
              <td className="border p-2">{bom.productDesc}</td>
              <td className="border p-2">{bom.bomType}</td>
              <td className="border p-2">
                {bom.warehouse?.warehouseName || bom.warehouse}
              </td>
              <td className="border p-2 text-center">{bom.items.length}</td>
              <td className="border p-2 text-right">
                {(bom.totalSum ?? 0).toFixed(2)}
              </td>
              <td className="border p-2 text-center">
                {new Date(bom.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {filteredBoms.length === 0 && (
            <tr>
              <td colSpan={8} className="border p-4 text-center text-gray-500">
                No BOMs found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}




// "use client";

// import { useState, useEffect } from "react";
// import axios from "axios";

// export default function BOMListPage() {
//   const [boms, setBoms] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Filter states
//   const [filterProductNo, setFilterProductNo] = useState("");
//   const [filterBomType, setFilterBomType] = useState("");
//   const [filterWarehouse, setFilterWarehouse] = useState("");

//   useEffect(() => {
//     async function fetchBOMs() {
//       const token = localStorage.getItem('token');
//       if (!token) {
//         setError('Not authenticated');
//         return;
//       }
//       try {

//         const res = await axios.get('/api/bom', {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem('token')}`,
//           },
//         });
//         setBoms(res.data);
//       } catch (err) {
//         console.error('Error fetching BOMs:', err);
//         setError('Failed to load BOM data');
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchBOMs();
//   }, []);


//   console.log("bom",boms)
//   // Apply filters
//   const filteredBoms = boms.filter(bom => {
//     if (filterProductNo && !bom.productNo.toLowerCase().includes(filterProductNo.toLowerCase())) {
//       return false;
//     }
//     if (filterBomType && bom.bomType !== filterBomType) {
//       return false;
//     }
//     if (filterWarehouse && bom.warehouse !== filterWarehouse) {
//       return false;
//     }
//     return true;
//   });

//   if (loading) return <div>Loading BOMs...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;

//   // Extract unique values for dropdowns
//   const bomTypes = Array.from(new Set(boms.map(b => b.bomType)));
//   const warehouses = Array.from(new Set(boms.map(b => b.warehouse)));

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-4">BOM List</h2>

//       {/* Filters */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//         <div>
//           <label className="block text-sm font-medium">Product No.</label>
//           <input
//             type="text"
//             value={filterProductNo}
//             onChange={e => setFilterProductNo(e.target.value)}
//             placeholder="Search Product No."
//             className="w-full border p-2 rounded"
//           />
//         </div>
//         <div>
//           <label className="block text-sm font-medium">BOM Type</label>
//           <select
//             value={filterBomType}
//             onChange={e => setFilterBomType(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Types</option>
//             {bomTypes.map((type, idx) => (
//               <option key={idx} value={type}>{type}</option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium">Warehouse</label>
//           <select
//             value={filterWarehouse}
//             onChange={e => setFilterWarehouse(e.target.value)}
//             className="w-full border p-2 rounded"
//           >
//             <option value="">All Warehouses</option>
//             {warehouses.map((w, idx) => (
//               <option key={idx} value={w}>{w}</option>
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
//             <th className="border p-2">Description</th>
//             <th className="border p-2">Type</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Items Count</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Date</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredBoms.map((bom, idx) => (
//         <tr key={bom._id}>
//   <td>{idx + 1}</td>
//   <td>{bom.productNo?.itemName || bom.productNo}</td>
//   <td>{bom.productDesc}</td>
//   <td>{bom.bomType}</td>
//   <td>{bom.warehouse?.warehouseName || bom.warehouse}</td>
//   <td>{bom.items.length}</td>
//   <td>{(bom.totalSum ?? 0).toFixed(2)}</td>
//   <td>{new Date(bom.createdAt).toLocaleDateString()}</td>
// </tr>

//           ))}
//           {filteredBoms.length === 0 && (
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
