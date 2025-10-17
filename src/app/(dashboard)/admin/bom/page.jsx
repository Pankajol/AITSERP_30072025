"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";

export default function BOMPage() {
  const router = useRouter();

  // --- Header Form State ---
  const [productNo, setProductNo] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [priceList, setPriceList] = useState("");
  const [bomType, setBomType] = useState("Production");
  const [xQuantity, setXQuantity] = useState(1);
  const [distRule, setDistRule] = useState("");
  const [project, setProject] = useState("");

  // --- Master data ---
  const [apiItems, setApiItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [resources, setResources] = useState([]);

  // --- BOM arrays ---
  const [bomItems, setBomItems] = useState([]);
  const [bomResources, setBomResources] = useState([]);

  // --- Add/search selections ---
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedResourceId, setSelectedResourceId] = useState(null);

  // --- Fetch master data on mount ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get("/api/items", config).then((res) => setApiItems(res.data.data || []));
    axios.get("/api/warehouse", config).then((res) => setWarehouses(res.data.data || []));
    axios.get("/api/price-list", config).then((res) => setPriceLists(res.data.data || []));
    axios.get("/api/ppc/resources", config).then((res) => setResources(res.data.data || []));
  }, []);

  // --- Add Item/Resource ---
  const handleAddItem = (type) => {
    if (type === "item") {
      if (!selectedItemId) return;
      const item = apiItems.find((i) => i._id === selectedItemId.value);
      if (!item) return;
      if (bomItems.some((i) => i.item === item._id)) return toast.error("Item already added!");
      setBomItems((prev) => [
        ...prev,
        {
          item: item._id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: 1,
          warehouse,
          unitPrice: item.unitPrice ?? 0,
          total: item.unitPrice ?? 0,
        },
      ]);
      setSelectedItemId(null);
    } else {
      if (!selectedResourceId) return;
      const res = resources.find((r) => r._id === selectedResourceId.value);
      if (!res) return;
      if (bomResources.some((i) => i.item === res._id)) return toast.error("Resource already added!");
      setBomResources((prev) => [
        ...prev,
        {
          item: res._id,
          code: res.code,
          name: res.name,
          quantity: 1,
          warehouse,
          unitPrice: res.unitPrice ?? 0,
          total: res.unitPrice ?? 0,
        },
      ]);
      setSelectedResourceId(null);
    }
  };

  // --- Update quantity ---
  const handleQtyChange = (type, idx, qty) => {
    const arr = type === "item" ? [...bomItems] : [...bomResources];
    arr[idx].quantity = qty;
    arr[idx].total = qty * (arr[idx].unitPrice ?? 0);
    type === "item" ? setBomItems(arr) : setBomResources(arr);
  };

  // --- Update warehouse ---
  const handleWarehouseChange = (type, idx, wh) => {
    const arr = type === "item" ? [...bomItems] : [...bomResources];
    arr[idx].warehouse = wh;
    type === "item" ? setBomItems(arr) : setBomResources(arr);
  };

  // --- Delete row ---
  const handleDelete = (type, idx) => {
    const arr = type === "item" ? [...bomItems] : [...bomResources];
    arr.splice(idx, 1);
    type === "item" ? setBomItems(arr) : setBomResources(arr);
  };

  // --- Grand total ---
  const grandTotal = [...bomItems, ...bomResources].reduce((acc, i) => acc + (i.total ?? 0), 0);

  // --- Save BOM ---
  const handleSaveBOM = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Not authenticated");

      const payload = {
        productNo: productNo || null,
        productDesc: productDesc || null,
        warehouse: warehouse || null,
        priceList: priceList || null,
        bomType: bomType || "Production",
        xQuantity: xQuantity || 1,
        distRule: distRule || null,
        project: project || null,
        items: bomItems,
        resources: bomResources,
        totalSum: grandTotal,
      };

      await axios.post("/api/bom", payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("BOM saved successfully!");
      router.push("/admin/bom-view");
    } catch (err) {
      console.error("Error saving BOM:", err);
      toast.error("Failed to save BOM.");
    }
  };

  // --- Options for react-select ---
  const productOptions = apiItems.map((i) => ({ value: i._id, label: `${i.itemCode} – ${i.itemName}` }));
  const resourceOptions = resources.map((r) => ({ value: r._id, label: `${r.code} – ${r.name}` }));

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded">
      <h2 className="text-2xl font-semibold mb-6">Bill of Materials</h2>

      {/* Header Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left */}
        <div className="space-y-4">
          <label className="block text-sm font-medium">Product No.</label>
          <Select
            options={productOptions}
            value={selectedItemId || productOptions.find((o) => o.value === productNo) || null}
            onChange={(selected) => setProductNo(selected?.value || "")}
            isClearable
            placeholder="Search or select product"
          />
          <div>
            <label className="block text-sm font-medium">Product Description</label>
            <input value={productDesc} onChange={(e) => setProductDesc(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Warehouse</label>
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Select Global Warehouse</option>
              {warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Price List</label>
            <select value={priceList} onChange={(e) => setPriceList(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Select Global Price List</option>
              {priceLists.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">BOM Type</label>
            <select value={bomType} onChange={(e) => setBomType(e.target.value)} className="w-full border p-2 rounded">
              <option>Production</option>
              <option>Sales</option>
              <option>Template</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">X Quantity</label>
            <input type="number" min={1} value={xQuantity} onChange={(e) => setXQuantity(+e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Distribution Rule</label>
            <input value={distRule} onChange={(e) => setDistRule(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Project</label>
            <input value={project} onChange={(e) => setProject(e.target.value)} className="w-full border p-2 rounded" />
          </div>
        </div>
      </div>

      {/* Add Items & Resources */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1">
          <Select options={productOptions} value={selectedItemId} onChange={setSelectedItemId} isClearable placeholder="Search or select item..." />
        </div>
        <button onClick={() => handleAddItem("item")} className="bg-blue-600 text-white px-4 py-2 rounded">Add Item</button>
        <div className="flex-1">
          <Select options={resourceOptions} value={selectedResourceId} onChange={setSelectedResourceId} isClearable placeholder="Search or select resource..." />
        </div>
        <button onClick={() => handleAddItem("resource")} className="bg-blue-600 text-white px-4 py-2 rounded">Add Resource</button>
      </div>

      {/* BOM Table - Combined */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg mb-2">BOM Components</h3>
        <table className="w-full border-collapse border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">Code</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Warehouse</th>
              <th className="border p-2">Price</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {[...bomItems.map(i => ({ ...i, type: "Item" })), ...bomResources.map(r => ({ ...r, type: "Resource" }))]
              .map((item, idx) => (
              <tr key={item.item}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{item.itemCode || item.code}</td>
                <td className="border p-2">{item.itemName || item.name}</td>
                <td className="border p-2 text-center">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      if (item.type === "Item") handleQtyChange("item", bomItems.indexOf(item), +e.target.value);
                      else handleQtyChange("resource", bomResources.indexOf(item), +e.target.value);
                    }}
                    className="w-16 border p-1 text-center rounded"
                  />
                </td>
                <td className="border p-2">
                  <select
                    value={item.warehouse}
                    onChange={(e) => {
                      if (item.type === "Item") handleWarehouseChange("item", bomItems.indexOf(item), e.target.value);
                      else handleWarehouseChange("resource", bomResources.indexOf(item), e.target.value);
                    }}
                    className="border p-1 rounded w-full"
                  >
                    <option value="">Select</option>
                    {warehouses.map((w) => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
                  </select>
                </td>
                <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
                <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
                <td className="border p-2 text-center">{item.type}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => {
                      if (item.type === "Item") handleDelete("item", bomItems.indexOf(item));
                      else handleDelete("resource", bomResources.indexOf(item));
                    }}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grand Total & Save */}
      <div className="flex justify-between items-center mt-6">
        <h3 className="font-semibold text-lg">Grand Total: {grandTotal.toFixed(2)}</h3>
        <button onClick={handleSaveBOM} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-500">Save BOM</button>
      </div>
    </div>
  );
}







// below code is working fine 07/10/2025

// "use client";
// import { useState, useEffect } from "react";
// import axios from "axios";
// import Select from "react-select";
// import {toast} from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useRouter, useSearchParams } from "next/navigation";

// export default function BOMPage() {
//   // Product & form state
//   const [productNo, setProductNo] = useState("");
//   const [productDesc, setProductDesc] = useState("");
//   const [warehouse, setWarehouse] = useState("");
//   const [priceList, setPriceList] = useState("");
//   const [bomType, setBomType] = useState("Production");
//   const [xQuantity, setXQuantity] = useState(1);
//   const [distRule, setDistRule] = useState("");
//   const [project, setProject] = useState("");

//   // Data arrays fetched from API
//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [priceLists, setPriceLists] = useState([]);
//   const [showProductSuggestions, setShowProductSuggestions] = useState(false);

//   // BOM table items
//   const [bomItems, setBomItems] = useState([]);

//   // Search & selection for adding items
//   const [searchText, setSearchText] = useState("");
//   const [selectedItemId, setSelectedItemId] = useState("");
//   const router = useRouter();

//   // Fetch master items, warehouses, price lists on mount
// useEffect(() => {
//   const token = localStorage.getItem("token");
//   const config = {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   };

//   axios.get('/api/items', config)
//     .then(res => {
//       console.log("Items response:", res.data);
//       setApiItems(res.data.data || []);
//     })
//     .catch(err => console.error("Items fetch error:", err));

//   axios.get('/api/warehouse', config)
//     .then(res => {
//       console.log("Warehouse response:", res.data);
//       setWarehouses(res.data.data || []);
//     })
//     .catch(err => console.error("Warehouse fetch error:", err));

//   axios.get('/api/price-list', config)
//     .then(res => {
//       console.log("Price List response:", res.data);
//       setPriceLists(res.data.data || []);
//     })
//     .catch(err => console.error("Price List fetch error:", err));
// }, []);




//   // Create options for React Select
//   const productOptions = apiItems.map(item => ({
//     value: item._id,
//     label: `${item.itemCode} - ${item.itemName}`,
//   }));
//   // Filter items by code or name
//   const filteredItems = apiItems.filter(item => {
//     const txt = searchText.toLowerCase();
//     return (
//       (item.itemCode ?? "").toLowerCase().includes(txt) ||
//       (item.itemName ?? "").toLowerCase().includes(txt)
//     );
//   });

//   // Add selected item to BOM
//   const handleAddItem = () => {
//     const item = apiItems.find(i => i._id === selectedItemId);
//     if (!item) return;
//     if (bomItems.some(i => i.item === selectedItemId)) return alert('Item already added!');

//     setBomItems(prev => [
//       ...prev,
//       {
//         item: item._id,
//         itemCode: item.itemCode,
//         itemName: item.itemName,
//         quantity: 1,
//         warehouse,
//         issueMethod: 'Backflush',
//         priceList,
//         unitPrice: item.unitPrice ?? 0,
//         total: item.unitPrice ?? 0
//       }
//     ]);
//     setSelectedItemId('');
//     setSearchText('');
//   };

//   // Update item quantity and total
//   const handleQtyChange = (idx, qty) => {
//     const arr = [...bomItems];
//     arr[idx].quantity = qty;
//     arr[idx].total = qty * (arr[idx].unitPrice ?? 0);
//     setBomItems(arr);
//   };

//   // Update warehouse per-row
//   const handleWarehouseChange = (idx, wh) => {
//     const arr = [...bomItems];
//     arr[idx].warehouse = wh;
//     setBomItems(arr);
//   };

//   // Delete row
//   const handleDelete = (idx) => {
//     const arr = [...bomItems];
//     arr.splice(idx, 1);
//     setBomItems(arr);
//   };

//   // Sum of totals
//   const totalSum = bomItems.reduce((acc, i) => acc + (i.total ?? 0), 0);

//   // Save BOM to backend
//   // const handleSaveBOM = async () => {
//   //   try {
//   //     const payload = { productNo, productDesc, warehouse, priceList, bomType, xQuantity, distRule, project, items: bomItems, totalSum };
//   //     await axios.post('/api/bom', payload);
//   //     alert('BOM saved successfully!');
//   //   } catch (err) {
//   //     console.error('Error saving BOM:', err);
//   //     alert('Failed to save BOM.');
//   //   }
//   // };

//   const handleSaveBOM = async () => {
//   try {
//     const token = localStorage.getItem("token"); // Or fetch from cookies if needed
//     if (!token) {
//       alert("Not authenticated");
//       return;
//     }

//     // const payload = {
//     //   productNo,
//     //   productDesc,
//     //   warehouse,
//     //   priceList,
//     //   bomType,
//     //   xQuantity,
//     //   distRule,
//     //   project,
//     //   items: bomItems,
//     //   totalSum,
//     // };


//     const payload = {
//   productNo: productNo || null,
//   productDesc: productDesc || null,
//   warehouse: warehouse || null,
//   priceList: priceList || null,
//   bomType: bomType || "Production",  // keep a default
//   xQuantity: xQuantity || 1,
//   distRule: distRule || null,
//   project: project || null,
//   items: bomItems,
//   totalSum,
// };

//     await axios.post("/api/bom", payload, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     router.push('/admin/bom-view');

//     toast.success("BOM saved successfully!");

//     // alert("BOM saved successfully!");
//   } catch (err) {
//     console.error("Error saving BOM:", err);
//     toast.error("Failed to save BOM.");
//     // alert("Failed to save BOM.");
//   }
// };


//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded">
//       <h2 className="text-2xl font-semibold mb-6">Bill of Materials</h2>

//       {/* Header */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//         {/* Left */}
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">Product No.</label>
//                  <Select
//         options={productOptions}
//         onChange={(selected) => setProductNo(selected?.value || "")}
//         isClearable
//         placeholder="Search or select product"
//       />
        
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Product Description</label>
//             <input value={productDesc} onChange={e => setProductDesc(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Warehouse</label>
//             <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Warehouse</option>
//               {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Price List</label>
//             <select value={priceList} onChange={e => setPriceList(e.target.value)} className="w-full border p-2 rounded">
//               <option value="">Select Global Price List</option>
//               {priceLists.map(p => <option key={p._1d} value={p._id}>{p.name}</option>)}
//             </select>
//           </div>
//         </div>
//         {/* Right */}
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium">BOM Type</label>
//             <select value={bomType} onChange={e => setBomType(e.target.value)} className="w-full border p-2 rounded">
//               <option>Production</option>
//               <option>Sales</option>
//               <option>Template</option>
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium">X Quantity</label>
//             <input type="number" min={1} value={xQuantity} onChange={e => setXQuantity(+e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Distribution Rule</label>
//             <input value={distRule} onChange={e => setDistRule(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//           <div>
//             <label className="block text-sm font-medium">Project</label>
//             <input value={project} onChange={e => setProject(e.target.value)} className="w-full border p-2 rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Search & Add */}
//       <div className="flex justify-center mb-6">
//         <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} className="border p-2 rounded-l flex-1 max-w-md" placeholder="Search item..." />
//         <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="border-t border-b p-2">
//           <option value="">Select Item</option>
//           {filteredItems.map(i => <option key={i._id} value={i._id}>{i.itemCode} – {i.itemName}</option>)}
//         </select>
//         <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-r">Add</button>
//       </div>

//       {/* BOM Table */}
//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Code</th>
//             <th className="border p-2">Name</th>
//             <th className="border p-2">Qty</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Issue Method</th>
//             <th className="border p-2">Price List</th>
//             <th className="border p-2">Unit Price</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bomItems.map((item, idx) => (
//             <tr key={item.item}>                                    
//               <td className="border p-2 text-center">{idx + 1}</td>
//               <td className="border p-2">{item.itemCode}</td>
//               <td className="border p-2">{item.itemName}</td>
//               <td className="border p-2 text-center">
//                 <input type="number" min={1} value={item.quantity} onChange={e => handleQtyChange(idx, +e.target.value)} className="w-16 border p-1 rounded text-center" />
//               </td>
//               <td className="border p-2">
//                 <select value={item.warehouse} onChange={e => handleWarehouseChange(idx, e.target.value)} className="w-full border p-1 rounded">
//                   <option value="">Select Warehouse</option>
//                   {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
//                 </select>
//               </td>
//               <td className="border p-2 text-center">{item.issueMethod}</td>
//               <td className="border p-2 text-center">{priceLists.find(p => p._id === item.priceList)?.name || 'N/A'}</td>
//               <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
//               <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
//               <td className="border p-2 text-center"><button onClick={() => handleDelete(idx)} className="text-red-600 hover:underline">Delete</button></td>
//             </tr>
//           ))}
//         </tbody>
//         <tfoot>
//           <tr className="bg-gray-100 font-semibold">
//             <td colSpan={8} className="border p-2 text-right">Total:</td>
//             <td className="border p-2 text-right">{totalSum.toFixed(2)}</td>
//             <td className="border p-2"></td>
//           </tr>
//         </tfoot>
//       </table>

//       {/* Actions */}
//       <div className="flex justify-end gap-4">
//         <button onClick={handleSaveBOM} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Save BOM</button>
//         <button className="bg-gray-400 text-white px-6 py-2 rounded">Cancel</button>
//       </div>
//     </div>
//   );
// }




