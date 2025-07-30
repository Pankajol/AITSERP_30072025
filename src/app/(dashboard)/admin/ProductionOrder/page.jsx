"use client";
import { Suspense } from "react";
import { useEffect, useState, } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import router from "next/router";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";

function ProductionOrderPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState(null);


  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [bomItems, setBomItems] = useState([]);

  const [selectedBomId, setSelectedBomId] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("Draft");
  const [priority, setPriority] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productionDate, setProductionDate] = useState("");


  const typeOptions = [
    { label: "Manufacture", value: "manufacture" },
    { label: "Subcontract", value: "subcontract" },
  ];

  // Client-side only logic for token
  const [token, setToken] = useState(null);

  useEffect(() => {
    const tk = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setToken(tk);
  }, []);

  useEffect(() => {
    if (!token) return;

 axios
  .get("/api/bom", {
    headers: { Authorization: `Bearer ${token}` },
  })
  .then((res) => {
    const data = Array.isArray(res.data) ? res.data : res.data.data;
    setBoms(data);
  })
  .catch((err) => toast.error("Failed to fetch BOMs"));


   axios
  .get("/api/items", {
    headers: { Authorization: `Bearer ${token}` },
  })
  .then((res) => {
    const data = Array.isArray(res.data) ? res.data : res.data.data;
    setAllItems(data);
  })
  .catch((err) => toast.error("Failed to fetch Items"));


   axios
  .get("/api/warehouse", {
    headers: { Authorization: `Bearer ${token}` },
  })
  .then((res) => {
    const data = Array.isArray(res.data) ? res.data : res.data.data;
    const options = data.map((w) => ({
      value: w._id,
      label: w.warehouseName,
    }));
    setWarehouseOptions(options);
  })
  .catch((err) => toast.error("Failed to fetch Warehouses"));

  }, [token]);

  useEffect(() => {
    if (!id || !token) return;

    axios
      .get(`/api/production-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const o = res.data;
        setSelectedBomId(o.bomId);
        setType(o.type);
        setStatus(o.status);
        setWarehouse(o.warehouse);
        setProductDesc(o.productDesc);
        setPriority(o.priority);
        setQuantity(o.quantity);
        setBomItems(
          o.items.map((it) => ({
            id: uuidv4(),
            item: it.item,
            itemCode: it.itemCode,
            itemName: it.itemName,
            unitQty: it.unitQty,
            quantity: it.quantity,
            requiredQty: it.requiredQty,
            warehouse: it.warehouse,
          }))
        );
      })
      .catch((err) => toast.error("Failed to fetch Production Order"));
  }, [id, token]);





  useEffect(() => {
    if (!selectedBomId || id || !token) return;

    axios
      .get(`/api/bom/${selectedBomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const items = res.data.items.map((it) => ({
          id: uuidv4(),
          item: it.item,
          itemCode: it.itemCode,
          itemName: it.itemName,
          unitQty: it.quantity,
          quantity: it.quantity,
          requiredQty: it.quantity * quantity,
          warehouse: it.warehouse || "",
        }));

        setBomItems(items);
        setProductDesc(res.data.productDesc || "");
        setWarehouse(res.data.warehouse || "");
      })
      .catch((err) => toast.error("Failed to fetch BOM details"));
  }, [selectedBomId, quantity, id, token]);

const statusOptions = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

  const itemOptions = allItems.map(it => ({
    value: it._id,
    label: `${it.itemCode} - ${it.itemName}`,
    data: it,
  }));

  const handleQuantityChange = (rowId, val) => {
    const qty = Number(val);
    setBomItems(prev =>
      prev.map(item =>
        item.id === rowId
          ? { ...item, quantity: qty, requiredQty: qty * quantity }
          : item
      )
    );
  };

  const handleWarehouseChange = (rowId, val) => {
    setBomItems(prev =>
      prev.map(item =>
        item.id === rowId ? { ...item, warehouse: val } : item
      )
    );
  };

  const handleAddItem = () => {
    if (!selectedOption) return;
    const it = selectedOption.data;
    setBomItems(prev => [
      ...prev,
      {
        id: uuidv4(),
        item: it._id,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: 1,
        quantity: 1,
        requiredQty: 1 * quantity,
        warehouse: it.warehouse,
      },
    ]);
    setSelectedOption(null);
  };

  const handleRemoveItem = rowId => {
    setBomItems(prev => prev.filter(item => item.id !== rowId));
  };

const handleSaveProductionOrder = async () => {
  try {
    const token = localStorage.getItem("token");
    const decodedToken = JSON.parse(atob(token.split(".")[1]));
    const companyId = decodedToken?.companyId;

    const payload = {
      companyId,
      bomId: selectedBomId,
      type,
      status,
      warehouse,
      productDesc,
      priority,
      productionDate,
      quantity,
      items: bomItems.map(it => ({
        item: it.item,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: it.unitQty,
        quantity: it.quantity,
        requiredQty: it.requiredQty,
        warehouse: it.warehouse?._id || it.warehouse || "",
      })),
    };

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    if (id) {
      await axios.put(`/api/production-orders/${id}`, payload, config);
      alert("Production Order updated!");
    } else {
      await axios.post("/api/production-orders", payload, config);
      alert("Production Order created!");
    }

    router.push("/admin/productionorders-list-view");
  } catch (err) {
    console.error("Error saving Production Order:", err);
    alert("Error saving Production Order");
  }
};


const selectedItem = itemOptions.find(opt => opt.value === selectedOption?.value);
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">
        {id ? "Edit Production Order" : "New Production Order"}
      </h2>

      {/* Order Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* BOM */}
        <div>
          <label className="block text-sm font-medium">Select BOM</label>
          <select
            className="w-full border p-2 rounded"
            value={selectedBomId}
            onChange={e => setSelectedBomId(e.target.value)}
          >
            <option value="">-- choose --</option>
            {boms.map(b => (
            <option key={b._id} value={b._id}>
  {(b.productNo?.itemName || "") + " - " + (b.productDesc || "")}
</option>
            ))}
          </select>
        </div>
        {/* Type */}
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select
            className="w-full border p-2 rounded"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {/* Status */}
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            className="w-full border p-2 rounded"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {/* Warehouse */}
        <div>
          <label className="block text-sm font-medium">Warehouse</label>
       <select
  className="w-full border p-2 rounded"
  value={warehouse}
  onChange={(e) => setWarehouse(e.target.value)}
>
  <option value="">-- select warehouse --</option>
  {warehouseOptions.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>

        </div>
        {/* Product Desc */}
        <div>
          <label className="block text-sm font-medium">Product Description</label>
          <input
            className="w-full border p-2 rounded"
            value={productDesc}
            onChange={e => setProductDesc(e.target.value)}
          />
        </div>
        {/* Priority */}
        <div>
          <label className="block text-sm font-medium">Priority</label>
          <input
            className="w-full border p-2 rounded"
            value={priority}
            onChange={e => setPriority(e.target.value)}
          />
        </div>
        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium">Planned Quantity</label>
          <input
            type="number"
            className="w-full border p-2 rounded"
            value={quantity}
            min={1}
            onChange={e => setQuantity(Number(e.target.value))}
          />
        </div>
        {/* Date */}
        <div>
          <label className="block text-sm font-medium">Production Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={productionDate}
            onChange={e => setProductionDate(e.target.value)}
          />
        </div>
      </div>

      {/* Add Item */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Add Item</label>
        <div className="flex gap-2">
          <div className="grow">
          <Select
  options={itemOptions}
  value={selectedItem}
  onChange={setSelectedOption}
  isClearable
  placeholder="Search and select item..."
/>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleAddItem}
          >
            Add
          </button>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full table-auto border-collapse border text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Item Code</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2">Unit Qty</th>
            <th className="border p-2">Req. Qty</th>
            <th className="border p-2">SO Warehouse</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.itemCode}</td>
              <td className="border p-2">{item.itemName}</td>
              <td className="border p-2">
                <input
                  type="number"
                  className="border p-1 w-full"
                  value={item.quantity}
                  onChange={(e) =>
                    handleQuantityChange(item.id, e.target.value)
                  }
                />
              </td>
              <td className="border p-2">{item.requiredQty}</td>
              <td className="border p-2">
               <select
  className="w-full border p-1"
  value={item.warehouse?._id || item.warehouse || ""}
  onChange={(e) => handleWarehouseChange(item.id, e.target.value)}
>
  <option value="">-- select --</option>
  {warehouseOptions.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ))}
</select>

              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          onClick={handleSaveProductionOrder}
        >
          {id ? "Update Order" : "Create Order"}
        </button>
      </div>
    </div>
  );
}


export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductionOrderPage />
    </Suspense>
  );
}



// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
// import Select from "react-select";

// export default function ProductionOrderPage() {
//   // Static options for Type, Status
//   const typeOptions = [
//     { value: "standard", label: "Standard" },
//     { value: "custom", label: "Custom" }
//   ];
//   const defaultType = "standard";
//   const statusOptions = [
//     { value: "planned", label: "Planned" },
//     { value: "released", label: "Released" },
//     { value: "materialto", label: "Material To" },
//     { value: "inproduction", label: "In Production" },
//     { value: "closed", label: "Closed" }
//   ];
//   const defaultStatus = "planned";

//   // State for fetched warehouse options
//   const [warehouseOptions, setWarehouseOptions] = useState([]);

//   // BOM list
//   const [boms, setBoms] = useState([]);
//   const [selectedBomId, setSelectedBomId] = useState("");

//   // Selected order-level fields
//   const [type, setType] = useState(defaultType);
//   const [status, setStatus] = useState(defaultStatus);
//   const [warehouse, setWarehouse] = useState("");

//   // Other order-level fields
//   const [productDesc, setProductDesc] = useState("");
//   const [priority, setPriority] = useState("");

//   // Global qty & production date
//   const [quantity, setQuantity] = useState(1);
//   const [productionDate, setProductionDate] = useState("");

//   // Item search & add
//   const [allItems, setAllItems] = useState([]);
//   const [selectedOption, setSelectedOption] = useState(null);
//   const [bomItems, setBomItems] = useState([]);

//   useEffect(() => {
//     axios.get("/api/bom").then(res => setBoms(res.data));
//     axios.get("/api/items").then(res => setAllItems(res.data));
//     axios.get("/api/warehouse").then(res =>
//       setWarehouseOptions(
//         res.data.map(w => ({ value: w._id, label: w.warehouseName }))
//       )
//     );
//   }, []);

//   // Load BOM items when selecting BOM or changing global quantity
//   useEffect(() => {
//     if (!selectedBomId) {
//       setBomItems([]);
//       return;
//     }
//     axios
//       .get(`/api/bom/${selectedBomId}`)
//       .then(res => {
//         const items = res.data.items.map(it => ({
//           id: uuidv4(),
//           itemCode: it.itemCode,
//           itemName: it.itemName,
//           unitQty: it.quantity,
//           quantity: it.quantity,
//           requiredQty: it.quantity * quantity,
//           warehouse: ""
//         }));
//         setBomItems(items);
//       })
//       .catch(console.error);
//   }, [selectedBomId, quantity]);

//   // React-select options for item add
//   const itemOptions = allItems.map(it => ({
//     value: it._id,
//     label: `${it.itemCode} - ${it.itemName}`,
//     data: it
//   }));

//   // Handlers
//   const handleQuantityChange = (id, value) => {
//     setBomItems(prev =>
//       prev.map(item =>
//         item.id === id
//           ? { ...item, quantity: Number(value), requiredQty: Number(value) * quantity }
//           : item
//       )
//     );
//   };

//   const handleWarehouseChange = (id, value) => {
//     setBomItems(prev =>
//       prev.map(item =>
//         item.id === id ? { ...item, warehouse: value } : item
//       )
//     );
//   };

//   const handleAddItem = () => {
//     if (selectedOption) {
//       const it = selectedOption.data;
//       setBomItems(prev => [
//         ...prev,
//         {
//           id: uuidv4(),
//           itemCode: it.itemCode,
//           itemName: it.itemName,
//           unitQty: 1,
//           quantity: 1,
//           requiredQty: 1 * quantity,
//           warehouse: ""
//         }
//       ]);
//       setSelectedOption(null);
//     }
//   };

//   const handleRemoveItem = id => {
//     setBomItems(prev => prev.filter(item => item.id !== id));
//   };

//   const handleSaveProductionOrder = async () => {
//     try {
//       const payload = {
//         bomId: selectedBomId,
//         type,
//         status,
//         warehouse,
//         productDesc,
//         priority,
//         productionDate,
//         quantity,
//         items: bomItems
//       };
//       await axios.post("/api/production-orders", payload);
//       alert("Production Order created!");
//       // reset
//       setSelectedBomId("");
//       setType(defaultType);
//       setStatus(defaultStatus);
//       setWarehouse("");
//       setProductDesc("");
//       setPriority("");
//       setQuantity(1);
//       setProductionDate("");
//       setBomItems([]);
//     } catch (err) {
//       console.error(err);
//       alert("Error creating Production Order");
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">New Production Order</h2>

//       {/* Order Fields */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         {/* Select BOM */}
//         <div>
//           <label className="block text-sm font-medium">Select BOM</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={selectedBomId}
//             onChange={e => setSelectedBomId(e.target.value)}
//           >
//             <option value="">-- choose --</option>
//             {boms.map(b => (
//               <option key={b._id} value={b._id}>
//                 {b.productNo} - {b.productDesc}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Type */}
//         <div>
//           <label className="block text-sm font-medium">Type</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={type}
//             onChange={e => setType(e.target.value)}
//           >
//             {typeOptions.map(opt => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium">Status</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={status}
//             onChange={e => setStatus(e.target.value)}
//           >
//             {statusOptions.map(opt => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Warehouse (order-level) */}
//         <div>
//           <label className="block text-sm font-medium">Warehouse</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={warehouse}
//             onChange={e => setWarehouse(e.target.value)}
//           >
//             <option value="">-- select warehouse --</option>
//             {warehouseOptions.map(opt => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Product Description */}
//         <div>
//           <label className="block text-sm font-medium">Product Description</label>
//           <input
//             type="text"
//             className="w-full border p-2 rounded"
//             value={productDesc}
//             onChange={e => setProductDesc(e.target.value)}
//           />
//         </div>
//         {/* Priority */}
//         <div>
//           <label className="block text-sm font-medium">Priority</label>
//           <input
//             type="text"
//             className="w-full border p-2 rounded"
//             value={priority}
//             onChange={e => setPriority(e.target.value)}
//           />
//         </div>
//         {/* Planned Quantity */}
//         <div>
//           <label className="block text-sm font-medium">Planned Quantity</label>
//           <input
//             type="number"
//             min={1}
//             className="w-full border p-2 rounded"
//             value={quantity}
//             onChange={e => setQuantity(Number(e.target.value))}
//           />
//         </div>
//         {/* Production Date */}
//         <div>
//           <label className="block text-sm font-medium">Production Date</label>
//           <input
//             type="date"
//             className="w-full border p-2 rounded"
//             value={productionDate}
//             onChange={e => setProductionDate(e.target.value)}
//           />
//         </div>
//       </div>

//       {/* Searchable Select & Add Item */}
//       <div className="mb-6">
//         <label className="block text-sm font-medium mb-1">Add Item</label>
//         <div className="flex gap-2">
//           <div className="grow-1">
//             <Select
//               options={itemOptions}
//               value={selectedOption}
//               onChange={setSelectedOption}
//               isClearable
//               placeholder="Search and select item..."
//             />
//           </div>
//           <button
//             className="bg-blue-600 text-white px-4 py-2 rounded"
//             onClick={handleAddItem}
//           >
//             Add
//           </button>
//         </div>
//       </div>

//       {/* Items Table */}
//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Item Code</th>
//             <th className="border p-2">Item Name</th>
//             <th className="border p-2">Unit Qty</th>
//             <th className="border p-2">Req. Qty</th>
//             <th className="border p-2">SO Warehouse</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bomItems.map(item => (
//             <tr key={item.id} className="hover:bg-gray-50">
//               <td className="border p-2">{item.itemCode}</td>
//               <td className="border p-2">{item.itemName}</td>
//               <td className="border p-2">
//                 <input
//                   type="number"
//                   className=" border p-1 rounded text-right"
//                   value={item.quantity}
//                   onChange={e => handleQuantityChange(item.id, e.target.value)}
//                 />
//               </td>
//               <td className="border p-2 text-right">{item.requiredQty}</td>
//               <td className="border p-2">
//                 <select
//                   className="w-full border p-1 rounded"
//                   value={item.warehouse}
//                   onChange={e => handleWarehouseChange(item.id, e.target.value)}
//                 >
//                   <option value="">-- select warehouse --</option>
//                   {warehouseOptions.map(opt => (
//                     <option key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </option>
//                   ))}
//                 </select>
//               </td>
//               <td className="border p-2 text-center">
//                 <button
//                   className="text-red-500 hover:underline"
//                   onClick={() => handleRemoveItem(item.id)}
//                 >
//                   Remove
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Save Button */}
//       <div className="flex justify-end">
//         <button
//           className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
//           onClick={handleSaveProductionOrder}
//         >
//           Create Order
//         </button>
//       </div>
//     </div>
//   );
// }



