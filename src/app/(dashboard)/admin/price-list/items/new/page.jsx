"use client";

import { useState } from "react";
import axios from "axios";

export default function PriceListForm() {
  const [form, setForm] = useState({
    name: "",
    isDefault: false,
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      return alert("Price List name is required");
    }

    setLoading(true);
    try {
      await axios.post(
        "/api/pricelist",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Price List created successfully");

      setForm({
        name: "",
        isDefault: false,
        active: true,
      });
    } catch (err) {
      alert("Failed to create price list");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex justify-center p-8">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-sm p-8">

        <h1 className="text-xl font-black uppercase mb-6">
          Create Price List
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* PRICE LIST NAME */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Price List Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Retail Price, Wholesale Price"
              className="w-full border rounded-xl p-3 font-bold"
            />
          </div>

          {/* DEFAULT PRICE LIST */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-bold text-slate-700">
              Set as Default Price List
            </label>
          </div>

          {/* ACTIVE */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-bold text-slate-700">
              Active
            </label>
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black text-white transition ${
              loading
                ? "bg-slate-300"
                : "bg-blue-600 hover:bg-black"
            }`}
          >
            {loading ? "CREATING..." : "CREATE PRICE LIST"}
          </button>
        </form>
      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";

// export default function PriceListItemForm() {
//   const [priceLists, setPriceLists] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [items, setItems] = useState([]);

//   const [form, setForm] = useState({
//     priceListId: "",
//     warehouseId: "",
//     itemId: "",
//     sellingPrice: "",
//     gstPercent: 18,
//   });

//   const [loading, setLoading] = useState(false);
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

//   /* FETCH MASTER DATA */
//   useEffect(() => {
//     const headers = { Authorization: `Bearer ${token}` };

//     axios.get("/api/pricelist", { headers }).then(res => setPriceLists(res.data.data || []));
//     axios.get("/api/warehouse", { headers }).then(res => setWarehouses(res.data.data || []));
//     axios.get("/api/items", { headers }).then(res => setItems(res.data.data || []));
//   }, []);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.priceListId || !form.warehouseId || !form.itemId) {
//       return alert("All fields are required");
//     }

//     setLoading(true);
//     try {
//       await axios.post(
//         "/api/pricelist/items",
//         {
//           ...form,
//           sellingPrice: Number(form.sellingPrice),
//           gstPercent: Number(form.gstPercent),
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       alert("Price saved successfully");

//       setForm({
//         ...form,
//         itemId: "",
//         sellingPrice: "",
//       });
//     } catch (err) {
//       alert("Failed to save price");
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-8 flex justify-center">
//       <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-sm p-8">

//         <h1 className="text-xl font-black uppercase mb-6">
//           Add Price List Item
//         </h1>

//         <form onSubmit={handleSubmit} className="space-y-5">

//           {/* PRICE LIST */}
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               Price List
//             </label>
//             <select
//               name="priceListId"
//               value={form.priceListId}
//               onChange={handleChange}
//               className="w-full border rounded-xl p-3 font-bold"
//             >
//               <option value="">Select Price List</option>
//               {priceLists.map(pl => (
//                 <option key={pl._id} value={pl._id}>{pl.name}</option>
//               ))}
//             </select>
//           </div>

//           {/* WAREHOUSE */}
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               Warehouse
//             </label>
//             <select
//               name="warehouseId"
//               value={form.warehouseId}
//               onChange={handleChange}
//               className="w-full border rounded-xl p-3 font-bold"
//             >
//               <option value="">Select Warehouse</option>
//               {warehouses.map(w => (
//                 <option key={w._id} value={w._id}>{w.name}</option>
//               ))}
//             </select>
//           </div>

//           {/* ITEM */}
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               Item
//             </label>
//             <select
//               name="itemId"
//               value={form.itemId}
//               onChange={handleChange}
//               className="w-full border rounded-xl p-3 font-bold"
//             >
//               <option value="">Select Item</option>
//               {items.map(i => (
//                 <option key={i._id} value={i._id}>
//                   {i.itemName} ({i.itemCode})
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* SELLING PRICE */}
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               Selling Price (₹)
//             </label>
//             <input
//               type="number"
//               name="sellingPrice"
//               value={form.sellingPrice}
//               onChange={handleChange}
//               className="w-full border rounded-xl p-3 font-bold"
//               placeholder="0.00"
//             />
//           </div>

//           {/* GST */}
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               GST %
//             </label>
//             <input
//               type="number"
//               name="gstPercent"
//               value={form.gstPercent}
//               onChange={handleChange}
//               className="w-full border rounded-xl p-3 font-bold"
//             />
//           </div>

//           {/* SUBMIT */}
//           <button
//             type="submit"
//             disabled={loading}
//             className={`w-full py-4 rounded-2xl font-black text-white transition ${
//               loading ? "bg-slate-300" : "bg-blue-600 hover:bg-black"
//             }`}
//           >
//             {loading ? "SAVING..." : "SAVE PRICE"}
//           </button>

//         </form>
//       </div>
//     </div>
//   );
// }
