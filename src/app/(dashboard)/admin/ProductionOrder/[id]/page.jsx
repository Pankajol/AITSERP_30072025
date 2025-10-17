"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Select from "react-select";
import { useParams, useRouter } from "next/navigation";

export default function ProductionOrderPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const typeOptions = [
    { value: "standard", label: "Standard" },
    { value: "custom", label: "Custom" },
  ];
  const statusOptions = [
    { value: "planned", label: "Planned" },
    { value: "released", label: "Released" },
    { value: "materialto", label: "Material To" },
    { value: "inproduction", label: "In Production" },
    { value: "closed", label: "Closed" },
  ];

  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);

  const [selectedBomId, setSelectedBomId] = useState("");
  const [type, setType] = useState("standard");
  const [status, setStatus] = useState("planned");
  const [warehouse, setWarehouse] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [priority, setPriority] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productionDate, setProductionDate] = useState("");

  const [bomItems, setBomItems] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // Load static master data
  useEffect(() => {
    axios.get("/api/bom").then(res => setBoms(res.data));
    axios.get("/api/items").then(res => setAllItems(res.data));
    axios.get("/api/warehouse").then(res => {
      setWarehouseOptions(
        res.data.map(w => ({ value: w._id, label: w.warehouseName }))
      );
    });
  }, []);

  // Load existing order (edit mode)
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/production-orders/${id}`).then(res => {
      const o = res.data;
      setSelectedBomId(o.bomId);
      setType(o.type);
      setStatus(o.status);
      setWarehouse(o.warehouse);
      setProductDesc(o.productDesc);
      setPriority(o.priority);
      setQuantity(o.quantity);
      setProductionDate(o.productionDate?.split("T")[0] || "");
      setBomItems(
        o.items.map(it => ({
          id: uuidv4(),
          item: it.item, // preserve ObjectId for saving
          itemCode: it.itemCode,
          itemName: it.itemName,
          unitQty: it.unitQty,
          quantity: it.quantity,
          requiredQty: it.requiredQty,
          warehouse: it.warehouse,
        }))
      );
    });
  }, [id]);

  // Load BOM items when new BOM selected
  useEffect(() => {
    if (!selectedBomId || id) return; // skip if editing
    axios.get(`/api/bom/${selectedBomId}`).then(res => {
      const items = res.data.items.map(it => ({
        id: uuidv4(),
        item: it.item, // needed for POST
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: it.quantity,
        quantity: it.quantity,
        requiredQty: it.quantity * quantity,
        warehouse: "",
      }));
      setBomItems(items);
      setProductDesc(res.data.productDesc || "");
    });
  }, [selectedBomId, quantity, id]);

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
        warehouse: "",
      },
    ]);
    setSelectedOption(null);
  };

  const handleRemoveItem = rowId => {
    setBomItems(prev => prev.filter(item => item.id !== rowId));
  };

  const handleSaveProductionOrder = async () => {
    try {
      const payload = {
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
          requiredQty: 1 * quantity,
          warehouse: it.warehouse,
        })),
      };

      if (id) {
        await axios.put(`/api/production-orders/${id}`, payload);
        alert("Production Order updated!");
      } else {
        await axios.post("/api/production-orders", payload);
        alert("Production Order created!");
      }

      router.push("/admin/productionorders-list-view");
    } catch (err) {
      console.error(err);
      alert("Error saving Production Order");
    }
  };

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
                {b.productNo} - {b.productDesc}
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
            onChange={e => setWarehouse(e.target.value)}
          >
            <option value="">-- select warehouse --</option>
            {warehouseOptions.map(opt => (
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
              value={selectedOption}
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
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map(item => (
            <tr key={item.id}>
              <td className="border p-2">{item.itemCode}</td>
              <td className="border p-2">{item.itemName}</td>
              <td className="border p-2 text-right">
                <input
                  type="number"
                  className="w-full border p-1 rounded text-right"
                  value={item.quantity}
                  onChange={e => handleQuantityChange(item.id, e.target.value)}
                />
              </td>
              <td className="border p-2 text-right">{item.requiredQty}</td>
              <td className="border p-2">
                <select
                  className="w-full border p-1 rounded"
                  value={item.warehouse}
                  onChange={e => handleWarehouseChange(item.id, e.target.value)}
                >
                  <option value="">-- select warehouse --</option>
                  {warehouseOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="border p-2 text-center">
                <button
                  className="text-red-500 hover:underline"
                  onClick={() => handleRemoveItem(item.id)}
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



