// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useRouter, useParams } from "next/navigation";
// import Select from "react-select";

// export default function ProductionOrderDetail() {
//   const router = useRouter();
//   const { id } = router.query;
//   const [order, setOrder] = useState(null);
//   const [form, setForm] = useState({});

//   useEffect(() => {
//     if (!id) return;
//     axios.get(`/api/production-orders/${id}`)
//       .then(res => { setOrder(res.data); setForm(res.data); })
//       .catch(console.error);
//   }, [id]);

//   const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

//   const handleSave = async () => {
//     try {
//       await axios.put(`/api/production-orders/${id}`, form);
//       alert('Order updated');
//       router.back();
//     } catch (err) {
//       console.error(err);
//       alert('Update failed');
//     }
//   };

//   if (!order) return <p>Loading...</p>;
//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">Edit Production Order</h2>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         {/* Example: Edit status, priority, etc. */}
//         <div>
//           <label>Status</label>
//           <input name="status" value={form.status} onChange={handleChange} />
//         </div>
//         <div>
//           <label>Priority</label>
//           <input name="priority" value={form.priority} onChange={handleChange} />
//         </div>
//         {/* add other editable fields similarly */}
//       </div>
//       <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
//     </div>
//   );
// }


import ProductionOrderView from '@/components/ProductionOrderView';

export default async function Page({ params }) {
  const { id } = await params;
  return <ProductionOrderView id={id} />;
}