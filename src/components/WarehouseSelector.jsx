"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";

const WarehouseSelectorModal = ({ isOpen, onSelectWarehouse, onClose }) => {
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);

  // Fetch warehouses from API on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await axios.get("/api/warehouse");
        const data = response.data || [];
        setWarehouses(data);
        setFilteredWarehouses(data);
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      }
    };

    fetchWarehouses();
  }, []);

  // Update filtered list when search changes
  useEffect(() => {
    if (!search.trim()) {
      setFilteredWarehouses(warehouses);
    } else {
      const query = search.toLowerCase();
      setFilteredWarehouses(
        warehouses.filter(
          (wh) =>
            wh.warehouseName.toLowerCase().includes(query) ||
            wh.warehouseCode.toLowerCase().includes(query)
        )
      );
    }
  }, [search, warehouses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-50"
        onClick={onClose}
      ></div>
      {/* Modal Content */}
      <div className="bg-white rounded-lg p-6 relative z-10 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Select Warehouse</h2>
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <div className="mt-4 max-h-64 overflow-y-auto border border-gray-300 rounded">
          {filteredWarehouses.length > 0 ? (
            filteredWarehouses.map((wh) => (
              <div
                key={wh._id}
                className="p-2 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
                onClick={() => {
                  onSelectWarehouse(wh);
                  onClose();
                }}
              >
                {wh.warehouseName} ({wh.warehouseCode})
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500">No warehouses found</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white px-3 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default WarehouseSelectorModal;



// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const WarehouseSelectorModal = ({ onSelect, onClose }) => {
//   const [warehouseSearch, setWarehouseSearch] = useState("");
//   const [warehouses, setWarehouses] = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);

//   // Fetch warehouses from the API on mount
//   useEffect(() => {
//     const fetchWarehouses = async () => {
//       try {
//         const response = await axios.get("/api/warehouse");
//         const whs = response.data|| [];
//         setWarehouses(whs);
//         setFilteredWarehouses(whs);
//       } catch (error) {
//         console.error("Error fetching warehouses:", error);
//       }
//     };

//     fetchWarehouses();
//   }, []);

//   // Filter warehouses based on search query (name or code)
//   useEffect(() => {
//     const query = warehouseSearch.toLowerCase();
//     const filtered = warehouses.filter(
//       (wh) =>
//         wh.warehouseName.toLowerCase().includes(query) ||
//         wh.warehouseCode.toLowerCase().includes(query)
//     );
//     setFilteredWarehouses(filtered);
//   }, [warehouseSearch, warehouses]);

//   return (
//     <div className="fixed inset-0 flex items-center justify-center z-50">
//       {/* Overlay */}
//       <div
//         className="absolute inset-0 bg-black opacity-50"
//         onClick={onClose}
//       ></div>

//       {/* Modal Content */}
//       <div className="bg-white rounded-lg p-6 relative z-10 w-full max-w-lg">
//         <h2 className="text-xl font-bold mb-4">Select Warehouse</h2>
//         <input
//           type="text"
//           placeholder="Search by name or code..."
//           value={warehouseSearch}
//           onChange={(e) => setWarehouseSearch(e.target.value)}
//           className="border p-2 rounded w-full"
//         />
//         <div className="mt-4 max-h-64 overflow-y-auto border border-gray-300 rounded">
//           {filteredWarehouses.map((wh) => (
//             <div
//               key={wh._id}
//               className="p-2 hover:bg-gray-200 cursor-pointer"
//               onClick={() => {
//                 onSelect(wh);
//                 onClose();
//               }}
//             >
//               {wh.warehouseName} ({wh.warehouseCode})
//             </div>
//           ))}
//           {filteredWarehouses.length === 0 && (
//             <div className="p-2 text-gray-500">No warehouses found</div>
//           )}
//         </div>
//         <button
//           onClick={onClose}
//           className="mt-4 bg-red-500 text-white px-3 py-1 rounded"
//         >
//           Close
//         </button>
//       </div>
//     </div>
//   );
// };

// export default WarehouseSelectorModal;




// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const WarehouseSelector = ({ onSelect }) => {
//   const [warehouses, setWarehouses] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);

//   // Fetch warehouses on mount
//   useEffect(() => {
//     const fetchWarehouses = async () => {
//       try {
//         const response = await axios.get("/api/warehouse");
//         // Assuming your API returns { success: true, data: [...] }
//         const fetchedWarehouses = response.data.data || [];
//         setWarehouses(fetchedWarehouses);
//         setFilteredWarehouses(fetchedWarehouses);
//       } catch (error) {
//         console.error("Error fetching warehouses:", error);
//       }
//     };

//     fetchWarehouses();
//   }, []);

//   // Filter warehouses by name or code based on searchQuery
//   useEffect(() => {
//     const filtered = warehouses.filter((wh) => {
//       const query = searchQuery.toLowerCase();
//       return (
//         wh.warehouseName.toLowerCase().includes(query) ||
//         wh.warehouseCode.toLowerCase().includes(query)
//       );
//     });
//     setFilteredWarehouses(filtered);
//   }, [searchQuery, warehouses]);

//   return (
//     <div className="warehouse-selector">
//       <input
//         type="text"
//         placeholder="Search by warehouse name or code..."
//         value={searchQuery}
//         onChange={(e) => setSearchQuery(e.target.value)}
//         className="mt-1 p-2 border rounded w-full"
//       />
//       <div className="mt-2 max-h-64 overflow-y-auto border border-gray-300 rounded">
//         {filteredWarehouses.map((wh) => (
//           <div
//             key={wh._id}
//             className="p-2 hover:bg-gray-100 cursor-pointer"
//             onClick={() => onSelect(wh)}
//           >
//             <strong>{wh.warehouseName}</strong> ({wh.warehouseCode})
//           </div>
//         ))}
//         {filteredWarehouses.length === 0 && (
//           <div className="p-2 text-gray-500">No warehouses found</div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default WarehouseSelector;
