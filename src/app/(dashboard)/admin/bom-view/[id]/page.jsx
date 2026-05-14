"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { 
  FaArrowLeft, FaBox, FaCogs, FaWarehouse, 
  FaCalendarAlt, FaCalculator, FaListOl, FaTools 
} from "react-icons/fa";

export default function BOMViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBOM() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`/api/bom/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBom(res.data);
      } catch (err) {
        console.error("Error fetching BOM:", err);
        setError("Failed to load BOM details");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchBOM();
  }, [id]);

  // --- UI Helpers ---
  const Lbl = ({ text }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">
      {text}
    </label>
  );

  const SectionCard = ({ icon: Icon, title, children, color = "indigo" }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
          <Icon className="text-sm" />
        </div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const InfoField = ({ label, value, isMono = false }) => (
    <div>
      <Lbl text={label} />
      <p className={`text-sm font-semibold text-gray-700 ${isMono ? 'font-mono' : ''}`}>
        {value || "—"}
      </p>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-medium italic">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600 mr-3"></div>
      Fetching BOM Structure...
    </div>
  );
  
  if (error) return <div className="p-10 text-red-500 text-center font-bold">{error}</div>;
  if (!bom) return <div className="p-10 text-gray-500 text-center">BOM not found.</div>;

  const productName = bom?.productNo?.itemName || bom?.productNo || "—";
  const productCode = bom?.productNo?.itemCode || "—";
  const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "—";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-5xl mx-auto">
        
        {/* --- Header Actions --- */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 font-bold text-sm hover:text-indigo-600 transition-colors"
          >
            <FaArrowLeft size={12} /> Back to List
          </button>
          <div className="flex gap-3">
             <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100`}>
                {bom?.bomType || "Production"}
             </span>
          </div>
        </div>

        {/* --- Document Title --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">BOM Definition</h1>
          <p className="text-sm text-gray-400">Reference ID: <span className="font-mono">{id}</span></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- Left Column: Summary --- */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard icon={FaBox} title="Product Info">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <InfoField label="Parent Product" value={productName} />
                <InfoField label="Item Code" value={productCode} isMono />
                <div className="col-span-2">
                   <InfoField label="Product Description" value={bom?.productDesc} />
                </div>
              </div>
            </SectionCard>

            {/* Combined Components List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                 <div className="flex items-center gap-3">
                    <FaListOl className="text-gray-400 text-sm" />
                    <p className="text-sm font-bold text-gray-900">BOM Structure</p>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-[10.5px] font-bold uppercase text-gray-400 bg-gray-50/50 border-b border-gray-100">
                      <th className="px-4 py-3 text-center w-12">#</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Component Name</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Items Section */}
                    {bom?.items?.map((it, idx) => (
                      <tr key={`item-${idx}`} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-gray-300">{idx + 1}</td>
                        <td className="px-4 py-3">
                           <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase">Item</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-700">{it.item?.itemName || it.itemName}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600">{it.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">₹{(it.unitPrice ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{(it.total ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {/* Resources Section */}
                    {bom?.resources?.map((res, idx) => (
                      <tr key={`res-${idx}`} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-gray-300">{idx + 1 + (bom.items?.length || 0)}</td>
                        <td className="px-4 py-3">
                           <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase">Resource</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-700">{res.name || res.code}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600">{res.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">₹{(res.unitPrice ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{(res.total ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- Right Column: Sidebar Stats --- */}
          <div className="space-y-6">
            <SectionCard icon={FaCalculator} title="Cost Summary" color="amber">
              <div className="space-y-4">
                 <div className="p-4 bg-indigo-900 rounded-xl text-white shadow-lg shadow-indigo-100">
                    <Lbl text="Total Production Value" />
                    <p className="text-2xl font-black font-mono">₹{(bom?.totalSum ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <Lbl text="Base Quantity" />
                    <span className="text-sm font-bold text-gray-700">{bom?.xQuantity || 1} Unit(s)</span>
                 </div>
                 <hr className="border-gray-100" />
                 <div className="flex justify-between items-center px-2">
                    <Lbl text="Component Count" />
                    <span className="text-sm font-bold text-gray-700">{bom?.items?.length || 0}</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <Lbl text="Resource Count" />
                    <span className="text-sm font-bold text-gray-700">{bom?.resources?.length || 0}</span>
                 </div>
              </div>
            </SectionCard>

            <SectionCard icon={FaWarehouse} title="Logistics" color="blue">
              <div className="space-y-4">
                <InfoField label="Designated Warehouse" value={warehouseName} />
                <InfoField label="Created On" value={bom?.createdAt ? new Date(bom.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"} />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";

// export default function BOMViewPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [bom, setBom] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     async function fetchBOM() {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         setError("Not authenticated");
//         setLoading(false);
//         return;
//       }
//       try {
//         const res = await axios.get(`/api/bom/${id}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setBom(res.data);
//       } catch (err) {
//         console.error("Error fetching BOM:", err);
//         setError("Failed to load BOM details");
//       } finally {
//         setLoading(false);
//       }
//     }
//     if (id) fetchBOM();
//   }, [id]);

//   if (loading) return <div>Loading BOM details...</div>;
//   if (error) return <div className="text-red-600">{error}</div>;
//   if (!bom) return <div>No BOM found.</div>;

//   const productName = bom?.productNo?.itemName || bom?.productNo || "—";
//   const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "—";

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded">
//       <button
//         onClick={() => router.back()}
//         className="mb-4 text-blue-600 hover:underline"
//       >
//         ← Back to BOM List
//       </button>

//       <h2 className="text-2xl font-semibold mb-4">BOM Details</h2>

//       <div className="grid grid-cols-2 gap-4 mb-6">
//         <div><strong>Product:</strong> {productName}</div>
//         <div><strong>Description:</strong> {bom?.productDesc || "—"}</div>
//         <div><strong>BOM Type:</strong> {bom?.bomType || "—"}</div>
//         <div><strong>Warehouse:</strong> {warehouseName}</div>
//         <div><strong>Total:</strong> {(bom?.totalSum ?? 0).toFixed(2)}</div>
//         <div><strong>Date:</strong> {bom?.createdAt ? new Date(bom.createdAt).toLocaleDateString() : "—"}</div>
//       </div>

//       {/* Items Table */}
//       <h3 className="text-xl font-semibold mb-2">Items</h3>
//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Item</th>
//             <th className="border p-2">Quantity</th>
//             <th className="border p-2">Rate</th>
//             <th className="border p-2">Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bom?.items?.length > 0 ? (
//             bom.items.map((it, idx) => (
//               <tr key={idx}>
//                 <td className="border p-2 text-center">{idx + 1}</td>
//                 <td className="border p-2">{it.item?.itemName || it.itemName || "—"}</td>
//                 <td className="border p-2 text-center">{it.quantity}</td>
//                 <td className="border p-2 text-right">{(it.unitPrice ?? 0).toFixed(2)}</td>
//                 <td className="border p-2 text-right">{(it.total ?? 0).toFixed(2)}</td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan={5} className="border p-4 text-center text-gray-500">
//                 No items in this BOM.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {/* Resources Table */}
//       <h3 className="text-xl font-semibold mb-2">Resources</h3>
//       <table className="w-full table-auto border-collapse border text-sm">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Resource</th>
//             <th className="border p-2">Quantity</th>
//             <th className="border p-2">Cost</th>
//             <th className="border p-2">Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bom?.resources?.length > 0 ? (
//             bom.resources.map((res, idx) => (
//               <tr key={idx}>
//                 <td className="border p-2 text-center">{idx + 1}</td>
//                 <td className="border p-2">{res.name || res.code || "—"}</td>
//                 <td className="border p-2 text-center">{res.quantity}</td>
//                 <td className="border p-2 text-right">{(res.unitPrice ?? 0).toFixed(2)}</td>
//                 <td className="border p-2 text-right">{(res.total ?? 0).toFixed(2)}</td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan={5} className="border p-4 text-center text-gray-500">
//                 No resources in this BOM.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }
