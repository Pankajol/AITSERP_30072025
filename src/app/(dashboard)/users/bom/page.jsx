// 'use client';
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { v4 as uuidv4 } from 'uuid';

// export default function ProductionOrderPage() {
//   const [boms, setBoms] = useState([]);
//   const [selectedBomId, setSelectedBomId] = useState('');
//   const [bomItems, setBomItems] = useState([]);
//   const [quantity, setQuantity] = useState(1);
//   const [productionDate, setProductionDate] = useState('');

//   // Search & add item
//   const [allItems, setAllItems] = useState([]);
//   const [searchText, setSearchText] = useState('');
//   const [selectedItemId, setSelectedItemId] = useState('');

//   // Load all BOMs
//   useEffect(() => {
//     axios.get('/api/bom').then(res => setBoms(res.data));
//     axios.get('/api/items').then(res => setAllItems(res.data));
//   }, []);

//   // When BOM is selected or global quantity changes, fetch its items
//   useEffect(() => {
//     if (!selectedBomId) return;
//     axios.get(`/api/bom/${selectedBomId}`)
//       .then(res => {
//         const items = res.data.items.map(it => ({
//           id: uuidv4(),
//           itemCode: it.itemCode,
//           itemName: it.itemName,
//           quantity: it.quantity,
//           requiredQty: it.quantity * quantity
//         }));
//         setBomItems(items);
//       })
//       .catch(console.error);
//   }, [selectedBomId, quantity]);

//   // Filter items for search
//   const filteredItems = allItems.filter(item =>
//     item.itemCode.toLowerCase().includes(searchText.toLowerCase()) ||
//     item.itemName.toLowerCase().includes(searchText.toLowerCase())
//   );

//   // Handle editing any field in a row
//   const handleItemChange = (id, field, value) => {
//     setBomItems(bomItems.map(item =>
//       item.id === id
//         ? { ...item, [field]: ['quantity','requiredQty'].includes(field) ? Number(value) : value }
//         : item
//     ));
//   };

//   // Add item (search-selected or blank)
//   const handleAddItem = () => {
//     if (selectedItemId) {
//       const it = allItems.find(i => i._id === selectedItemId);
//       if (it) {
//         setBomItems([...bomItems, {
//           id: uuidv4(),
//           itemCode: it.itemCode,
//           itemName: it.itemName,
//           quantity: 1,
//           requiredQty: 1
//         }]);
//         setSearchText('');
//         setSelectedItemId('');
//       }
//     } else {
//       setBomItems([...bomItems, {
//         id: uuidv4(),
//         itemCode: '',
//         itemName: '',
//         quantity: 1,
//         requiredQty: 1
//       }]);
//     }
//   };

//   // Remove an item row
//   const handleRemoveItem = id => {
//     setBomItems(bomItems.filter(item => item.id !== id));
//   };

//   const handleSaveProductionOrder = async () => {
//     try {
//       const payload = {
//         bomId: selectedBomId,
//         productionDate,
//         quantity,
//         items: bomItems
//       };
//       await axios.post('/api/production-orders', payload);
//       alert('Production Order created!');
//       setSelectedBomId('');
//       setBomItems([]);
//       setQuantity(1);
//       setProductionDate('');
//     } catch (err) {
//       console.error(err);
//       alert('Error creating Production Order');
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">New Production Order</h2>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div>
//           <label className="block text-sm font-medium">Select BOM</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={selectedBomId}
//             onChange={e => setSelectedBomId(e.target.value)}
//           >
//             <option value="">-- choose --</option>
//             {boms.map(b => (
//               <option key={b._id} value={b._id}>{b.productNo} - {b.productDesc}</option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm font-medium">Quantity</label>
//           <input
//             type="number" min={1}
//             className="w-full border p-2 rounded"
//             value={quantity}
//             onChange={e => setQuantity(+e.target.value)}
//           />
//         </div>
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

//       {/* Search & Add Item */}
//       <div className="flex justify-center mb-6">
//         <input
//           type="text"
//           className="border p-2 rounded-l flex-1 max-w-md"
//           placeholder="Search item by code or name..."
//           value={searchText}
//           onChange={e => setSearchText(e.target.value)}
//         />
//         <select
//           className="border-t border-b p-2"
//           value={selectedItemId}
//           onChange={e => setSelectedItemId(e.target.value)}
//         >
//           <option value="">Select Item</option>
//           {filteredItems.map(item => (
//             <option key={item._id} value={item._id}>
//               {item.itemCode} - {item.itemName}
//             </option>
//           ))}
//         </select>
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded-r"
//           onClick={handleAddItem}
//         >Add</button>
//       </div>

//       <div className="flex justify-between mb-4">
//         <h3 className="text-lg font-medium">Items</h3>
//       </div>

//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Item Code</th>
//             <th className="border p-2">Item Name</th>
//             <th className="border p-2">Unit Qty</th>
//             <th className="border p-2">Req. Qty</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bomItems.map(item => (
//             <tr key={item.id} className="hover:bg-gray-50">
//               <td className="border p-2">
//                 <input
//                   type="text"
//                   className="w-full border p-1 rounded"
//                   value={item.itemCode}
//                   onChange={e => handleItemChange(item.id, 'itemCode', e.target.value)}
//                 />
//               </td>
//               <td className="border p-2">
//                 <input
//                   type="text"
//                   className="w-full border p-1 rounded"
//                   value={item.itemName}
//                   onChange={e => handleItemChange(item.id, 'itemName', e.target.value)}
//                 />
//               </td>
//               <td className="border p-2">
//                 <input
//                   type="number"
//                   className="w-full border p-1 rounded text-right"
//                   value={item.quantity}
//                   onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
//                 />
//               </td>
//               <td className="border p-2">
//                 <input
//                   type="number"
//                   className="w-full border p-1 rounded text-right"
//                   value={item.requiredQty}
//                   onChange={e => handleItemChange(item.id, 'requiredQty', e.target.value)}
//                 />
//               </td>
//               <td className="border p-2 text-center">
//                 <button
//                   className="text-red-500 hover:underline"
//                   onClick={() => handleRemoveItem(item.id)}
//                 >Remove</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <div className="flex justify-end">
//         <button
//           className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
//           onClick={handleSaveProductionOrder}
//         >Create Order</button>
//       </div>
//     </div>
//   );
// }





"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import {toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter, useSearchParams } from "next/navigation";

export default function BOMPage() {
  // Product & form state
  const [productNo, setProductNo] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [priceList, setPriceList] = useState("");
  const [bomType, setBomType] = useState("Production");
  const [xQuantity, setXQuantity] = useState(1);
  const [distRule, setDistRule] = useState("");
  const [project, setProject] = useState("");

  // Data arrays fetched from API
  const [apiItems, setApiItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // BOM table items
  const [bomItems, setBomItems] = useState([]);

  // Search & selection for adding items
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const router = useRouter();

  // Fetch master items, warehouses, price lists on mount
useEffect(() => {
  const token = localStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  axios.get('/api/items', config)
    .then(res => {
      console.log("Items response:", res.data);
      setApiItems(res.data.data || []);
    })
    .catch(err => console.error("Items fetch error:", err));

  axios.get('/api/warehouse', config)
    .then(res => {
      console.log("Warehouse response:", res.data);
      setWarehouses(res.data.data || []);
    })
    .catch(err => console.error("Warehouse fetch error:", err));

  axios.get('/api/price-list', config)
    .then(res => {
      console.log("Price List response:", res.data);
      setPriceLists(res.data.data || []);
    })
    .catch(err => console.error("Price List fetch error:", err));
}, []);




  // Create options for React Select
  const productOptions = apiItems.map(item => ({
    value: item._id,
    label: `${item.itemCode} - ${item.itemName}`,
  }));
  // Filter items by code or name
  const filteredItems = apiItems.filter(item => {
    const txt = searchText.toLowerCase();
    return (
      (item.itemCode ?? "").toLowerCase().includes(txt) ||
      (item.itemName ?? "").toLowerCase().includes(txt)
    );
  });

  // Add selected item to BOM
  const handleAddItem = () => {
    const item = apiItems.find(i => i._id === selectedItemId);
    if (!item) return;
    if (bomItems.some(i => i.item === selectedItemId)) return alert('Item already added!');

    setBomItems(prev => [
      ...prev,
      {
        item: item._id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: 1,
        warehouse,
        issueMethod: 'Backflush',
        priceList,
        unitPrice: item.unitPrice ?? 0,
        total: item.unitPrice ?? 0
      }
    ]);
    setSelectedItemId('');
    setSearchText('');
  };

  // Update item quantity and total
  const handleQtyChange = (idx, qty) => {
    const arr = [...bomItems];
    arr[idx].quantity = qty;
    arr[idx].total = qty * (arr[idx].unitPrice ?? 0);
    setBomItems(arr);
  };

  // Update warehouse per-row
  const handleWarehouseChange = (idx, wh) => {
    const arr = [...bomItems];
    arr[idx].warehouse = wh;
    setBomItems(arr);
  };

  // Delete row
  const handleDelete = (idx) => {
    const arr = [...bomItems];
    arr.splice(idx, 1);
    setBomItems(arr);
  };

  // Sum of totals
  const totalSum = bomItems.reduce((acc, i) => acc + (i.total ?? 0), 0);

  // Save BOM to backend
  // const handleSaveBOM = async () => {
  //   try {
  //     const payload = { productNo, productDesc, warehouse, priceList, bomType, xQuantity, distRule, project, items: bomItems, totalSum };
  //     await axios.post('/api/bom', payload);
  //     alert('BOM saved successfully!');
  //   } catch (err) {
  //     console.error('Error saving BOM:', err);
  //     alert('Failed to save BOM.');
  //   }
  // };

  const handleSaveBOM = async () => {
  try {
    const token = localStorage.getItem("token"); // Or fetch from cookies if needed
    if (!token) {
      alert("Not authenticated");
      return;
    }

    // const payload = {
    //   productNo,
    //   productDesc,
    //   warehouse,
    //   priceList,
    //   bomType,
    //   xQuantity,
    //   distRule,
    //   project,
    //   items: bomItems,
    //   totalSum,
    // };


    const payload = {
  productNo: productNo || null,
  productDesc: productDesc || null,
  warehouse: warehouse || null,
  priceList: priceList || null,
  bomType: bomType || "Production",  // keep a default
  xQuantity: xQuantity || 1,
  distRule: distRule || null,
  project: project || null,
  items: bomItems,
  totalSum,
};

    await axios.post("/api/bom", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    router.push('/admin/bom-view');

    toast.success("BOM saved successfully!");

    // alert("BOM saved successfully!");
  } catch (err) {
    console.error("Error saving BOM:", err);
    toast.error("Failed to save BOM.");
    // alert("Failed to save BOM.");
  }
};


  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded">
      <h2 className="text-2xl font-semibold mb-6">Bill of Materials</h2>

      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Product No.</label>
                 <Select
        options={productOptions}
        onChange={(selected) => setProductNo(selected?.value || "")}
        isClearable
        placeholder="Search or select product"
      />
        
          </div>
          <div>
            <label className="block text-sm font-medium">Product Description</label>
            <input value={productDesc} onChange={e => setProductDesc(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Warehouse</label>
            <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Select Global Warehouse</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Price List</label>
            <select value={priceList} onChange={e => setPriceList(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Select Global Price List</option>
              {priceLists.map(p => <option key={p._1d} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {/* Right */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">BOM Type</label>
            <select value={bomType} onChange={e => setBomType(e.target.value)} className="w-full border p-2 rounded">
              <option>Production</option>
              <option>Sales</option>
              <option>Template</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">X Quantity</label>
            <input type="number" min={1} value={xQuantity} onChange={e => setXQuantity(+e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Distribution Rule</label>
            <input value={distRule} onChange={e => setDistRule(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Project</label>
            <input value={project} onChange={e => setProject(e.target.value)} className="w-full border p-2 rounded" />
          </div>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex justify-center mb-6">
        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)} className="border p-2 rounded-l flex-1 max-w-md" placeholder="Search item..." />
        <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="border-t border-b p-2">
          <option value="">Select Item</option>
          {filteredItems.map(i => <option key={i._id} value={i._id}>{i.itemCode} – {i.itemName}</option>)}
        </select>
        <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-r">Add</button>
      </div>

      {/* BOM Table */}
      <table className="w-full table-auto border-collapse border text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Code</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Warehouse</th>
            <th className="border p-2">Issue Method</th>
            <th className="border p-2">Price List</th>
            <th className="border p-2">Unit Price</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map((item, idx) => (
            <tr key={item.item}>                                    
              <td className="border p-2 text-center">{idx + 1}</td>
              <td className="border p-2">{item.itemCode}</td>
              <td className="border p-2">{item.itemName}</td>
              <td className="border p-2 text-center">
                <input type="number" min={1} value={item.quantity} onChange={e => handleQtyChange(idx, +e.target.value)} className="w-16 border p-1 rounded text-center" />
              </td>
              <td className="border p-2">
                <select value={item.warehouse} onChange={e => handleWarehouseChange(idx, e.target.value)} className="w-full border p-1 rounded">
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseCode} – {w.warehouseName}</option>)}
                </select>
              </td>
              <td className="border p-2 text-center">{item.issueMethod}</td>
              <td className="border p-2 text-center">{priceLists.find(p => p._id === item.priceList)?.name || 'N/A'}</td>
              <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
              <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
              <td className="border p-2 text-center"><button onClick={() => handleDelete(idx)} className="text-red-600 hover:underline">Delete</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td colSpan={8} className="border p-2 text-right">Total:</td>
            <td className="border p-2 text-right">{totalSum.toFixed(2)}</td>
            <td className="border p-2"></td>
          </tr>
        </tfoot>
      </table>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button onClick={handleSaveBOM} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Save BOM</button>
        <button className="bg-gray-400 text-white px-6 py-2 rounded">Cancel</button>
      </div>
    </div>
  );
}
