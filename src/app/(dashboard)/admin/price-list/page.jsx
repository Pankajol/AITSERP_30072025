"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, Edit2, Save } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function PriceListPage() {
  const router = useRouter();

  /* ================= FORM STATE ================= */
  const [form, setForm] = useState({
    name: "",
    isDefault: false,
    active: true,
  });
  const [creating, setCreating] = useState(false);

  /* ================= LIST STATE ================= */
  const [lists, setLists] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  /* ================= FETCH LISTS ================= */
  const fetchLists = async () => {
    try {
      const res = await axios.get("/api/pricelist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLists(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch price lists");
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  /* ================= FORM HANDLERS ================= */
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
      toast.error("Price List name is required");
      return;
    }

    setCreating(true);
    const t = toast.loading("Creating price list...");
    try {
      await axios.post("/api/pricelist", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForm({ name: "", isDefault: false, active: true });
      await fetchLists();
      toast.success("Price List created successfully", { id: t });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create price list", { id: t });
    }
    setCreating(false);
  };

  /* ================= LIST ACTIONS ================= */
  const setDefault = async (id) => {
    setLoading(true);
    const t = toast.loading("Setting default...");

    try {
      await axios.patch(
        "/api/pricelist",
        { _id: id, isDefault: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchLists();
      toast.success("Default price list updated", { id: t });
    } catch (err) {
      console.error(err);
      toast.error("Failed to set default", { id: t });
    }

    setLoading(false);
  };

  const toggleActive = async (id, active) => {
    const t = toast.loading(active ? "Deactivating..." : "Activating...");
    try {
      await axios.patch(
        "/api/pricelist",
        { _id: id, active: !active },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchLists();
      toast.success("Status updated", { id: t });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status", { id: t });
    }
  };

  const saveName = async (id) => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const t = toast.loading("Saving changes...");
    try {
      await axios.patch(
        "/api/pricelist",
        { _id: id, name: editName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingId(null);
      await fetchLists();
      toast.success("Name updated", { id: t });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update name", { id: t });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-10">
      {/* ================= CREATE FORM ================= */}
      <div className="bg-white max-w-xl rounded-3xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-xl font-black uppercase mb-6">Create Price List</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Price List Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Retail / Wholesale"
              className="w-full border rounded-xl p-3 font-bold"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-bold">Set as Default Price List</label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-bold">Active</label>
          </div>

          <button
            type="submit"
            disabled={creating}
            className={`w-full py-4 rounded-2xl font-black text-white ${
              creating ? "bg-slate-300" : "bg-blue-600 hover:bg-black"
            }`}
          >
            {creating ? "CREATING..." : "CREATE PRICE LIST"}
          </button>
        </form>
      </div>

      {/* ================= PRICE LIST TABLE ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-center">Default</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
              <th className="px-6 py-4 text-right">Manage</th>
            </tr>
          </thead>

          <tbody>
            {lists.map((pl) => (
              <tr key={pl._id} className="border-t">
                {/* Name */}
                <td className="px-6 py-4 font-bold">
                  {editingId === pl._id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="border rounded-lg px-2 py-1 font-bold"
                    />
                  ) : (
                    pl.name
                  )}
                </td>

                {/* Default */}
                <td className="px-6 py-4 text-center">
                  {pl.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs">
                      <CheckCircle size={14} /> DEFAULT
                    </span>
                  ) : (
                    <button
                      disabled={loading}
                      onClick={() => setDefault(pl._id)}
                      className="text-xs font-black text-blue-600 hover:underline"
                    >
                      Set Default
                    </button>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleActive(pl._id, pl.active)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black ${
                      pl.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {pl.active ? "ACTIVE" : "INACTIVE"}
                  </button>
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  {editingId === pl._id ? (
                    <button
                      onClick={() => saveName(pl._id)}
                      className="inline-flex items-center gap-1 text-green-600 font-black text-xs"
                    >
                      <Save size={14} /> SAVE
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(pl._id);
                        setEditName(pl.name);
                      }}
                      className="inline-flex items-center gap-1 text-slate-600 font-black text-xs hover:text-black"
                    >
                      <Edit2 size={14} /> EDIT
                    </button>
                  )}
                </td>

                {/* Manage */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <a
                      href={`/admin/price-list/items?priceListId=${pl._id}`}
                      className="text-xs font-black bg-slate-100 px-3 py-2 rounded-xl hover:bg-black hover:text-white transition"
                    >
                      ITEMS
                    </a>

                   <button
  onClick={() =>
    router.push(
      `/dashboard/pricelist/new-item-price?priceListId=${pl._id}&priceListName=${encodeURIComponent(pl.name)}`
    )
  }
  className="text-xs font-black bg-black text-white px-3 py-2 rounded-xl hover:bg-blue-600 transition"
>
  + NEW ITEM PRICE
</button>


                  </div>
                </td>
              </tr>
            ))}

            {lists.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-slate-300 font-black uppercase text-xs"
                >
                  No price lists found
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

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { CheckCircle, Edit2, Save } from "lucide-react";
// import { toast } from "react-toastify";

// export default function PriceListPage() {
//   /* ================= FORM STATE ================= */
//   const [form, setForm] = useState({
//     name: "",
//     isDefault: false,
//     active: true,
//   });
//   const [creating, setCreating] = useState(false);

//   /* ================= LIST STATE ================= */
//   const [lists, setLists] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editName, setEditName] = useState("");
//   const [loading, setLoading] = useState(false);

//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : "";

//   /* ================= FETCH LISTS ================= */
//   const fetchLists = async () => {
//     const res = await axios.get("/api/pricelist", {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setLists(res.data.data || []);
//   };

//   useEffect(() => {
//     fetchLists();
//   }, []);

//   /* ================= FORM HANDLERS ================= */
//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm({
//       ...form,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.name.trim()) {
//       toast.error("Price List name is required");
//       return;
//     }

//     setCreating(true);
//     const t = toast.loading("Creating price list...");
//     try {
//       await axios.post("/api/pricelist", form, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       setForm({ name: "", isDefault: false, active: true });
//       await fetchLists();
//       toast.success("Price List created successfully", { id: t });
//     } catch {
//       toast.error("Failed to create price list", { id: t });
//     }
//     setCreating(false);
//   };

//   /* ================= LIST ACTIONS ================= */
//   const setDefault = async (id) => {
//     setLoading(true);
//     const t = toast.loading("Setting default...");
//     try {
//       await axios.patch(
//         "/api/pricelist",
//         { _id: id, isDefault: true },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       await fetchLists();
//       toast.success("Default price list updated", { id: t });
//     } catch {
//       toast.error("Failed to set default", { id: t });
//     }
//     setLoading(false);
//   };

//   const toggleActive = async (id, active) => {
//     const t = toast.loading(active ? "Deactivating..." : "Activating...");
//     try {
//       await axios.patch(
//         "/api/pricelist",
//         { _id: id, active: !active },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       await fetchLists();
//       toast.success("Status updated", { id: t });
//     } catch {
//       toast.error("Failed to update status", { id: t });
//     }
//   };

//   const saveName = async (id) => {
//     if (!editName.trim()) {
//       toast.error("Name cannot be empty");
//       return;
//     }

//     const t = toast.loading("Saving changes...");
//     try {
//       await axios.patch(
//         "/api/pricelist",
//         { _id: id, name: editName },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setEditingId(null);
//       await fetchLists();
//       toast.success("Name updated", { id: t });
//     } catch {
//       toast.error("Failed to update name", { id: t });
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-10">

//       {/* ================= CREATE FORM ================= */}
//       <div className="bg-white max-w-xl rounded-3xl border border-slate-200 shadow-sm p-8">
//         <h1 className="text-xl font-black uppercase mb-6">
//           Create Price List
//         </h1>

//         <form onSubmit={handleSubmit} className="space-y-6">
//           <div>
//             <label className="block text-xs font-bold text-slate-500 mb-1">
//               Price List Name
//             </label>
//             <input
//               type="text"
//               name="name"
//               value={form.name}
//               onChange={handleChange}
//               placeholder="Retail / Wholesale"
//               className="w-full border rounded-xl p-3 font-bold"
//             />
//           </div>

//           <div className="flex items-center gap-3">
//             <input
//               type="checkbox"
//               name="isDefault"
//               checked={form.isDefault}
//               onChange={handleChange}
//               className="w-4 h-4"
//             />
//             <label className="text-sm font-bold">
//               Set as Default Price List
//             </label>
//           </div>

//           <div className="flex items-center gap-3">
//             <input
//               type="checkbox"
//               name="active"
//               checked={form.active}
//               onChange={handleChange}
//               className="w-4 h-4"
//             />
//             <label className="text-sm font-bold">
//               Active
//             </label>
//           </div>

//           <button
//             type="submit"
//             disabled={creating}
//             className={`w-full py-4 rounded-2xl font-black text-white ${
//               creating ? "bg-slate-300" : "bg-blue-600 hover:bg-black"
//             }`}
//           >
//             {creating ? "CREATING..." : "CREATE PRICE LIST"}
//           </button>
//         </form>
//       </div>

//       {/* ================= PRICE LIST TABLE ================= */}
//       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
//             <tr>
//               <th className="px-6 py-4 text-left">Name</th>
//               <th className="px-6 py-4 text-center">Default</th>
//               <th className="px-6 py-4 text-center">Status</th>
//               <th className="px-6 py-4 text-right">Action</th>
//                 <th className="px-6 py-4 text-right">Manage Items</th>
//             </tr>
//           </thead>
//           <tbody>
//             {lists.map((pl) => (
//               <tr key={pl._id} className="border-t">
//                 <td className="px-6 py-4 font-bold">
//                   {editingId === pl._id ? (
//                     <input
//                       value={editName}
//                       onChange={(e) => setEditName(e.target.value)}
//                       className="border rounded-lg px-2 py-1 font-bold"
//                     />
//                   ) : (
//                     pl.name
//                   )}
//                 </td>

//                 <td className="px-6 py-4 text-center">
//                   {pl.isDefault ? (
//                     <span className="inline-flex items-center gap-1 text-emerald-600 font-black text-xs">
//                       <CheckCircle size={14} /> DEFAULT
//                     </span>
//                   ) : (
//                     <button
//                       disabled={loading}
//                       onClick={() => setDefault(pl._id)}
//                       className="text-xs font-black text-blue-600 hover:underline"
//                     >
//                       Set Default
//                     </button>
//                   )}
//                 </td>

//                 <td className="px-6 py-4 text-center">
//                   <button
//                     onClick={() => toggleActive(pl._id, pl.active)}
//                     className={`px-3 py-1 rounded-full text-[10px] font-black ${
//                       pl.active
//                         ? "bg-emerald-100 text-emerald-700"
//                         : "bg-slate-200 text-slate-500"
//                     }`}
//                   >
//                     {pl.active ? "ACTIVE" : "INACTIVE"}
//                   </button>
//                 </td>

//                 <td className="px-6 py-4 text-right">
//                   {editingId === pl._id ? (
//                     <button
//                       onClick={() => saveName(pl._id)}
//                       className="inline-flex items-center gap-1 text-green-600 font-black text-xs"
//                     >
//                       <Save size={14} /> SAVE
//                     </button>
//                   ) : (
//                     <button
//                       onClick={() => {
//                         setEditingId(pl._id);
//                         setEditName(pl.name);
//                       }}
//                       className="inline-flex items-center gap-1 text-slate-600 font-black text-xs hover:text-black"
//                     >
//                       <Edit2 size={14} /> EDIT
//                     </button>
//                   )}
//                 </td>
//                 <td className="px-6 py-4 text-right">
//                   <div className="flex justify-end gap-3">
//                     <button
//   onClick={() =>
//     router.push(`/dashboard/pricelist/new-item-price?priceListId=${priceListId}&warehouseId=${selectedWarehouse}`)
//   }
//   className="bg-black text-white px-4 py-2 rounded-xl font-black text-xs"
// >
//   + New Item Price
// </button>
//                   </div>
//                 </td>
//                 <td className="px-6 py-4 text-right flex justify-end gap-3">

//   {/* MANAGE ITEMS */}
//   <a
//     href={`/admin/price-list/items?priceListId=${pl._id}`}
//     className="text-xs font-black bg-slate-100 px-3 py-2 rounded-xl hover:bg-black hover:text-white transition"
//   >
//     ITEMS
//   </a>

//   {editingId === pl._id ? (
//     <button
//       onClick={() => saveName(pl._id)}
//       className="inline-flex items-center gap-1 text-green-600 font-black text-xs"
//     >
//       <Save size={14} /> SAVE
//     </button>
//   ) : (
//     <button
//       onClick={() => {
//         setEditingId(pl._id);
//         setEditName(pl.name);
//       }}
//       className="inline-flex items-center gap-1 text-slate-600 font-black text-xs hover:text-black"
//     >
//       <Edit2 size={14} /> EDIT
//     </button>
//   )}
// </td>

//               </tr>
//             ))}

//             {lists.length === 0 && (
//               <tr>
//                 <td
//                   colSpan={4}
//                   className="py-12 text-center text-slate-300 font-black uppercase text-xs"
//                 >
//                   No price lists found
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//     </div>
//   );
// }
