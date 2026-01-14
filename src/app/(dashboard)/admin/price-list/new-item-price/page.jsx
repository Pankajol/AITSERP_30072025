// only for reference, do not answer

// "use client";

// import { useEffect, useMemo, useState, useCallback } from "react";
// import axios from "axios";
// import { useSearchParams, useRouter } from "next/navigation";
// import { toast } from "react-toastify";

// export default function NewItemPricePage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const priceListName = searchParams.get("priceListName");


//   const priceListId = searchParams.get("priceListId");
//   const warehouseIdFromQuery = searchParams.get("warehouseId") || "";

//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : "";

//   const headers = useMemo(
//     () => ({ Authorization: `Bearer ${token}` }),
//     [token]
//   );

//   const [warehouses, setWarehouses] = useState([]);
//   const [items, setItems] = useState([]);
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     warehouseId: warehouseIdFromQuery,
//     itemId: "",

//     uom: "",
//     packingUnit: 0,

//     buying: false,
//     selling: true,

//     batchNo: "",
//     currency: "INR",
//     rate: "",

//     validFrom: "",
//     validUpto: "",

//     leadTimeDays: 0,
//     note: "",

//     gstPercent: 18,

//     discountPercent: "",
//     discountAmount: "",
//   });

//   // ✅ keep form warehouse sync with URL (only once or when URL changes)
//   useEffect(() => {
//     if (warehouseIdFromQuery) {
//       setForm((p) => ({ ...p, warehouseId: warehouseIdFromQuery }));
//     }
//   }, [warehouseIdFromQuery]);

//   /* ✅ Fetch Warehouses */
//   useEffect(() => {
//     if (!token) return;

//     axios
//       .get("/api/warehouse", { headers })
//       .then((res) => setWarehouses(res.data.data || []))
//       .catch(() => toast.error("Failed to fetch warehouses"));
//   }, [token, headers]);

//   /* ✅ Fetch POS items from inventory of selected warehouse */
//   useEffect(() => {
//     if (!token || !form.warehouseId) {
//       setItems([]);
//       return;
//     }

//     axios
//       .get(
//         `/api/inventory?warehouseId=${form.warehouseId}&posOnly=true&limit=5000`,
//         { headers }
//       )
//       .then((res) => {
//         const inv = res.data.data || [];
//         const list = inv
//           .filter((x) => x.item)
//           .map((x) => ({
//             ...x.item,
//             availableQty: x?.quantity ?? 0, // adjust if your inv field name differs
//           }));

//         // ✅ unique items
//         const map = new Map();
//         list.forEach((it) => map.set(it._id, it));
//         setItems([...map.values()]);
//       })
//       .catch(() => toast.error("Failed to fetch warehouse items"));
//   }, [token, headers, form.warehouseId]);

//   /* ✅ Set UOM from selected item */
//   useEffect(() => {
//     if (!form.itemId) {
//       setForm((p) => ({ ...p, uom: "" }));
//       return;
//     }

//     const it = items.find((x) => x._id === form.itemId);
//     setForm((p) => ({ ...p, uom: it?.uom || "" }));
//   }, [form.itemId, items]);

//   const handleChange = useCallback((e) => {
//     const { name, value, type, checked } = e.target;

//     setForm((p) => ({
//       ...p,
//       [name]:
//         type === "checkbox"
//           ? checked
//           : ["packingUnit", "leadTimeDays", "gstPercent"].includes(name)
//           ? Number(value || 0)
//           : value,
//     }));
//   }, []);

//   const getFinalPrice = useCallback(() => {
//     const rate = Number(form.rate || 0);
//     const dp = form.discountPercent === "" ? 0 : Number(form.discountPercent);
//     const da = form.discountAmount === "" ? 0 : Number(form.discountAmount);

//     let final = rate;
//     if (dp > 0) final -= (final * dp) / 100;
//     if (da > 0) final -= da;

//     if (!Number.isFinite(final)) return 0;
//     return Math.max(0, Number(final.toFixed(2)));
//   }, [form.rate, form.discountPercent, form.discountAmount]);

//   const validate = () => {
//     if (!priceListId) return toast.error("PriceListId missing"), false;
//     if (!form.warehouseId) return toast.error("Select Warehouse"), false;
//     if (!form.itemId) return toast.error("Select Item"), false;

//     if (!form.buying && !form.selling)
//       return toast.error("Select Buying or Selling"), false;

//     if (form.rate === "" || Number(form.rate) <= 0)
//       return toast.error("Enter valid Rate"), false;

//     // ✅ date validation
//     if (form.validFrom && form.validUpto) {
//       const from = new Date(form.validFrom);
//       const upto = new Date(form.validUpto);
//       if (upto < from)
//         return toast.error("Valid Upto cannot be before Valid From"), false;
//     }

//     // ✅ discount validation
//     const dp = form.discountPercent === "" ? 0 : Number(form.discountPercent);
//     const da = form.discountAmount === "" ? 0 : Number(form.discountAmount);

//     if (dp < 0 || dp > 100)
//       return toast.error("Discount % must be 0 to 100"), false;

//     if (da < 0)
//       return toast.error("Discount amount cannot be negative"), false;

//     if (getFinalPrice() <= 0)
//       return toast.error("Final price cannot be 0"), false;

//     return true;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     if (!validate()) return;

//     setSaving(true);
//     const t = toast.loading("Saving...");

//     try {
//       await axios.post(
//         "/api/pricelist/items",
//         {
//           priceListId,
//           warehouseId: form.warehouseId,
//           itemId: form.itemId,

//           sellingPrice: Number(form.rate),
//           gstPercent: Number(form.gstPercent || 18),

//           discountPercent:
//             form.discountPercent === "" ? 0 : Number(form.discountPercent),
//           discountAmount:
//             form.discountAmount === "" ? 0 : Number(form.discountAmount),

//           validFrom: form.validFrom || null,
//           validUpto: form.validUpto || null,
//           currency: form.currency || "INR",
//           buying: !!form.buying,
//           selling: !!form.selling,
//           batchNo: form.batchNo || "",
//           leadTimeDays: Number(form.leadTimeDays || 0),
//           note: form.note || "",
//           packingUnit: Number(form.packingUnit || 0),
//           uom: form.uom || "",
//         },
//         { headers }
//       );

//       toast.success("✅ Saved", { id: t });
//       router.back();
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.message || "Save failed", { id: t });
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#f8fafc] px-6 py-6">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-5">
//         <div className="flex items-center gap-3">
//           <div className="text-2xl">☰</div>
//           <h1 className="text-xl font-black">New Item Price</h1>
//           <span className="text-xs font-black px-3 py-1 rounded-full bg-orange-100 text-orange-600">
//             Not Saved
//           </span>
//         </div>

//         <button
//           onClick={handleSave}
//           disabled={saving}
//           className="bg-black text-white px-5 py-2 rounded-lg text-sm font-black disabled:opacity-60"
//         >
//           {saving ? "Saving..." : "Save"}
//         </button>
//       </div>

//       {/* Body */}
//       <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
//         <div className="p-8 space-y-8">
//           {/* Warehouse */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Warehouse <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="warehouseId"
//                 value={form.warehouseId}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               >
//                 <option value="">Select Warehouse</option>
//                 {warehouses.map((w) => (
//                   <option key={w._id} value={w._id}>
//                     {w.warehouseName}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div />
//           </div>

//           {/* Item */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Item <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="itemId"
//                 value={form.itemId}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               >
//                 <option value="">Select Item</option>
//                 {items.map((it) => (
//                   <option key={it._id} value={it._id}>
//                     {it.itemName} ({it.itemCode})
//                   </option>
//                 ))}
//               </select>

//               {form.itemId && (
//                 <p className="mt-2 text-xs text-slate-500 font-bold">
//                   Stock: {items.find((x) => x._id === form.itemId)?.availableQty ?? 0}
//                 </p>
//               )}
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 UOM <span className="text-red-500">*</span>
//               </label>
//               <input
//                 name="uom"
//                 value={form.uom}
//                 readOnly
//                 className="mt-2 w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div className="md:col-span-2">
//               <label className="text-sm font-bold text-slate-600">
//                 Packing Unit
//               </label>
//               <input
//                 type="number"
//                 name="packingUnit"
//                 value={form.packingUnit}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//               <p className="mt-2 text-xs text-slate-500">
//                 Quantity that must be bought or sold per UOM
//               </p>
//             </div>
//           </div>

//           <div className="border-t" />

//           {/* Price List section */}
//           <div>
//             <h2 className="text-base font-black text-slate-700 mb-4">
//               Price List
//             </h2>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <label className="text-sm font-bold text-slate-600">
//                   Price List <span className="text-red-500">*</span>
//                 </label>
//             <input
//   value={priceListName ? `${decodeURIComponent(priceListName)} ` : priceListId}
//   readOnly
//   className="mt-2 w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
// />


//               </div>

//               <div className="flex items-center gap-10 pt-7">
//                 <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
//                   <input
//                     type="checkbox"
//                     name="buying"
//                     checked={form.buying}
//                     onChange={handleChange}
//                     className="h-4 w-4"
//                   />
//                   Buying
//                 </label>

//                 <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
//                   <input
//                     type="checkbox"
//                     name="selling"
//                     checked={form.selling}
//                     onChange={handleChange}
//                     className="h-4 w-4"
//                   />
//                   Selling
//                 </label>
//               </div>

//               <div>
//                 <label className="text-sm font-bold text-slate-600">Batch No</label>
//                 <input
//                   name="batchNo"
//                   value={form.batchNo}
//                   onChange={handleChange}
//                   className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="border-t" />

//           {/* Currency / Rate */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-bold text-slate-600">Currency</label>
//               <input
//                 name="currency"
//                 value={form.currency}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Rate <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="number"
//                 name="rate"
//                 value={form.rate}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//                 placeholder="0.00"
//                 min="0"
//                 step="0.01"
//               />
//             </div>
//           </div>

//           {/* Discount */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Discount %
//               </label>
//               <input
//                 type="number"
//                 name="discountPercent"
//                 value={form.discountPercent}
//                 onChange={handleChange}
//                 min="0"
//                 max="100"
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Discount Amount
//               </label>
//               <input
//                 type="number"
//                 name="discountAmount"
//                 value={form.discountAmount}
//                 onChange={handleChange}
//                 min="0"
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Final Price
//               </label>
//               <input
//                 value={getFinalPrice()}
//                 readOnly
//                 className="mt-2 w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-black"
//               />
//             </div>
//           </div>

//           {/* Validity */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="text-sm font-bold text-slate-600">Valid From</label>
//               <input
//                 type="date"
//                 name="validFrom"
//                 value={form.validFrom}
//                 onChange={handleChange}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">Valid Upto</label>
//               <input
//                 type="date"
//                 name="validUpto"
//                 value={form.validUpto}
//                 onChange={handleChange}
//                 min={form.validFrom || undefined}
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">
//                 Lead Time in days
//               </label>
//               <input
//                 type="number"
//                 name="leadTimeDays"
//                 value={form.leadTimeDays}
//                 onChange={handleChange}
//                 min="0"
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-bold text-slate-600">GST %</label>
//               <input
//                 type="number"
//                 name="gstPercent"
//                 value={form.gstPercent}
//                 onChange={handleChange}
//                 min="0"
//                 max="100"
//                 className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               />
//             </div>
//           </div>

//           {/* Note */}
//           <div>
//             <label className="text-sm font-bold text-slate-600">Note</label>
//             <textarea
//               name="note"
//               value={form.note}
//               onChange={handleChange}
//               rows={3}
//               className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-semibold"
//               placeholder="Optional note..."
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
