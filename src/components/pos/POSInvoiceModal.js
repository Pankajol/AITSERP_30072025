"use client";
import { X, Printer, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function POSInvoiceModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const handlePrint = () => window.print();

  const formatNum = (num) => (Number(num) || 0).toFixed(2);

  // ✅ helpers
  const lineTotal = (item) => (Number(item.qty || 0) * Number(item.price || 0));
  const lineSaving = (item) => {
    const mrp = Number(item.mrp ?? item.price ?? 0);
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 0);
    return Math.max(0, (mrp - price) * qty);
  };

  const totalSaving =
    Number(data.saving) ||
    (data.items || []).reduce((s, it) => s + lineSaving(it), 0);

  const showPriceMeta = !!(data.priceListName || data.warehouseName);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      {/* --- UI MODAL (Hidden during print) --- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden print:hidden"
      >
        <div className="p-4 flex justify-between items-center border-b bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle size={18} /> Sale Complete
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          <div className="text-center pb-4 border-b border-dashed">
            <h2 className="font-black text-xl uppercase tracking-tighter">
              Tax Invoice
            </h2>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              INV: {data.invoiceNo ? data.invoiceNo.toUpperCase() : "PENDING"}
            </p>

            {/* ✅ NEW: PriceList + Warehouse */}
            {showPriceMeta && (
              <p className="text-[10px] font-black text-slate-500 uppercase mt-1">
                {data.priceListName ? `Price List: ${data.priceListName}` : ""}
                {data.priceListName && data.warehouseName ? " | " : ""}
                {data.warehouseName ? `Warehouse: ${data.warehouseName}` : ""}
              </p>
            )}
          </div>

          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
            <div>
              <p className="text-slate-300">Customer</p>
              <p className="text-slate-900">
                {data.customer?.name || "Walk-in Guest"}
              </p>
              <p>{data.customer?.phone || data.customer?.mobile || "N/A"}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-300">Date</p>
              <p className="text-slate-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* ✅ UPDATED TABLE (shows saving) */}
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b text-slate-400 font-black uppercase">
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>

            <tbody className="font-bold">
              {data.items?.map((item, i) => {
                const ls = lineSaving(item);

                return (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 uppercase">
                      {item.itemName}

                      <span className="block text-[8px] text-slate-400 font-medium italic">
                        GST {item.gstRate || 0}%
                      </span>

                      {/* ✅ NEW: MRP, Rate & Saving */}
                      <div className="mt-1 text-[9px] font-black text-slate-500 normal-case space-y-0.5">
                        <div className="flex justify-between">
                          <span>Rate</span>
                          <span>₹{formatNum(item.price)}</span>
                        </div>

                        {Number(item.mrp ?? 0) > Number(item.price ?? 0) && (
                          <>
                            <div className="flex justify-between text-slate-400">
                              <span>MRP</span>
                              <span>₹{formatNum(item.mrp)}</span>
                            </div>

                            <div className="flex justify-between text-emerald-600">
                              <span>Saving</span>
                              <span>₹{formatNum(ls)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-2 text-center">{item.qty}</td>

                    <td className="py-2 text-right">
                      ₹{lineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="space-y-1 text-[11px] font-bold">
            {/* ✅ NEW saving row */}
            <div className="flex justify-between text-emerald-600 font-black">
              <span>Total Saving</span>
              <span>₹{formatNum(totalSaving)}</span>
            </div>

            <div className="flex justify-between">
              <span>Taxable Value</span>
              <span>₹{formatNum(data.taxable)}</span>
            </div>

            <div className="flex justify-between text-slate-400 font-medium italic">
              <span>CGST Total</span>
              <span>₹{formatNum(data.cgst)}</span>
            </div>

            <div className="flex justify-between text-slate-400 font-medium italic">
              <span>SGST Total</span>
              <span>₹{formatNum(data.sgst)}</span>
            </div>

            <div className="flex justify-between text-lg font-black pt-2 border-t border-dashed">
              <span>TOTAL</span>
              <span>₹{formatNum(data.grand)}</span>
            </div>

            {/* ✅ Payment summary */}
            {(data.paymentReceived !== undefined || data.balanceReturned !== undefined) && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex justify-between text-[10px] uppercase text-slate-500 font-black">
                  <span>Received</span>
                  <span>₹{formatNum(data.paymentReceived)}</span>
                </div>

                {Number(data.balanceReturned || 0) > 0 && (
                  <div className="flex justify-between text-[10px] uppercase text-emerald-600 font-black">
                    <span>Balance Return</span>
                    <span>₹{formatNum(data.balanceReturned)}</span>
                  </div>
                )}

                {Number(data.dueAmount || 0) > 0 && (
                  <div className="flex justify-between text-[10px] uppercase text-rose-600 font-black">
                    <span>Due Amount</span>
                    <span>₹{formatNum(data.dueAmount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors"
          >
            <Printer size={16} /> PRINT
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-black text-sm hover:bg-slate-100 transition-colors"
          >
            DONE
          </button>
        </div>
      </motion.div>

      {/* --- 📄 THERMAL PRINT LAYOUT (80mm Width) --- */}
      <div
        className="hidden print:block bg-white text-black p-4"
        style={{ width: "80mm", fontFamily: "monospace" }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "10px",
            borderBottom: "1px solid #000",
            paddingBottom: "10px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Tax Invoice
          </h2>

          <p style={{ fontSize: "10px", margin: "2px 0" }}>
            {new Date().toLocaleString()}
          </p>

          {/* ✅ NEW meta in thermal */}
          {showPriceMeta && (
            <p style={{ fontSize: "9px", margin: "4px 0", fontWeight: "bold" }}>
              {data.priceListName ? `PL: ${data.priceListName}` : ""}
              {data.priceListName && data.warehouseName ? " | " : ""}
              {data.warehouseName ? `WH: ${data.warehouseName}` : ""}
            </p>
          )}
        </div>

        <div
          style={{
            fontSize: "11px",
            marginBottom: "10px",
            borderBottom: "1px dashed #000",
            paddingBottom: "5px",
          }}
        >
          <p style={{ margin: "2px 0" }}>
            <strong>INV NO:</strong>{" "}
            {data.invoiceNo ? data.invoiceNo.toUpperCase() : "PENDING"}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>CUST:</strong> {data.customer?.name || "Walk-in Guest"}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>MOB:</strong>{" "}
            {data.customer?.phone || data.customer?.mobile || "N/A"}
          </p>
        </div>

        <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000" }}>
              <th align="left">ITEM</th>
              <th align="center">QTY</th>
              <th align="right">AMT</th>
            </tr>
          </thead>

          <tbody>
            {data.items?.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: "4px 0" }}>
                  {item.itemName?.substring(0, 18).toUpperCase()}
                </td>
                <td align="center">{item.qty}</td>
                <td align="right">₹{formatNum(item.qty * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            fontSize: "11px",
            marginTop: "10px",
            borderTop: "1px solid #000",
            paddingTop: "5px",
            textAlign: "right",
            lineHeight: "1.6",
          }}
        >
          {/* ✅ NEW saving */}
          <p style={{ margin: 0, fontWeight: "bold" }}>
            SAVING: ₹{formatNum(totalSaving)}
          </p>

          <p style={{ margin: 0 }}>TAXABLE: ₹{formatNum(data.taxable)}</p>
          <p style={{ margin: 0 }}>CGST: ₹{formatNum(data.cgst)}</p>
          <p style={{ margin: 0 }}>SGST: ₹{formatNum(data.sgst)}</p>

          <p
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              borderTop: "1px dashed #000",
              marginTop: "5px",
              paddingTop: "5px",
            }}
          >
            TOTAL: ₹{formatNum(data.grand)}
          </p>

          {/* ✅ payment */}
          <p style={{ margin: 0 }}>
            RECEIVED: ₹{formatNum(data.paymentReceived)}
          </p>

          {Number(data.balanceReturned || 0) > 0 && (
            <p style={{ margin: 0 }}>
              RETURN: ₹{formatNum(data.balanceReturned)}
            </p>
          )}

          {Number(data.dueAmount || 0) > 0 && (
            <p style={{ margin: 0 }}>
              DUE: ₹{formatNum(data.dueAmount)}
            </p>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "10px",
            borderTop: "1px solid #000",
            paddingTop: "10px",
          }}
        >
          <p style={{ margin: 0 }}>--- THANK YOU ---</p>
          <p style={{ margin: "4px 0 0 0" }}>Visit Again!</p>
        </div>
      </div>
    </div>
  );
}





// "use client";
// import { X, Printer, CheckCircle } from "lucide-react";
// import { motion } from "framer-motion";

// export default function POSInvoiceModal({ isOpen, onClose, data }) {
//   // Prevent rendering if modal is closed or data is missing
//   if (!isOpen || !data) return null;

//   const handlePrint = () => {
//     window.print();
//   };

//   // Helper to ensure we have numbers for .toFixed()
//   const formatNum = (num) => (Number(num) || 0).toFixed(2);

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white">
//       {/* --- UI MODAL (Hidden during print) --- */}
//       <motion.div 
//         initial={{ opacity: 0, scale: 0.95 }} 
//         animate={{ opacity: 1, scale: 1 }}
//         className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden print:hidden"
//       >
//         <div className="p-4 flex justify-between items-center border-b bg-slate-50">
//           <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
//             <CheckCircle size={18} /> Sale Complete
//           </div>
//           <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
//             <X size={20} />
//           </button>
//         </div>

//         <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
//           <div className="text-center pb-4 border-b border-dashed">
//             <h2 className="font-black text-xl uppercase tracking-tighter">Tax Invoice</h2>
//             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//               INV: {data.invoiceNo ? data.invoiceNo.toUpperCase() : 'PENDING'}
//             </p>
//           </div>

//           <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
//             <div>
//               <p className="text-slate-300">Customer</p>
//               <p className="text-slate-900">{data.customer?.name || "Walk-in Guest"}</p>
//               <p>{data.customer?.phone || data.customer?.mobile || "N/A"}</p>
//             </div>
//             <div className="text-right">
//               <p className="text-slate-300">Date</p>
//               <p className="text-slate-900">{new Date().toLocaleDateString()}</p>
//             </div>
//           </div>

//           <table className="w-full text-left text-[11px]">
//             <thead>
//               <tr className="border-b text-slate-400 font-black uppercase">
//                 <th className="py-2">Item</th>
//                 <th className="py-2 text-center">Qty</th>
//                 <th className="py-2 text-right">Price</th>
//               </tr>
//             </thead>
//             <tbody className="font-bold">
//               {data.items?.map((item, i) => (
//                 <tr key={i} className="border-b border-slate-50">
//                   <td className="py-2 uppercase">
//                     {item.itemName}
//                     <span className="block text-[8px] text-slate-400 font-medium italic">GST {item.gstRate || 0}%</span>
//                   </td>
//                   <td className="py-2 text-center">{item.qty}</td>
//                   <td className="py-2 text-right">₹{( (item.qty || 0) * (item.price || 0) ).toLocaleString()}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           <div className="space-y-1 text-[11px] font-bold">
//             <div className="flex justify-between">
//               <span>Taxable Value</span>
//               <span>₹{formatNum(data.taxable)}</span>
//             </div>
//             {/* Dynamic CGST/SGST display */}
//             <div className="flex justify-between text-slate-400 font-medium italic">
//               <span>CGST Total</span>
//               <span>₹{formatNum(data.cgst)}</span>
//             </div>
//             <div className="flex justify-between text-slate-400 font-medium italic">
//               <span>SGST Total</span>
//               <span>₹{formatNum(data.sgst)}</span>
//             </div>
//             <div className="flex justify-between text-lg font-black pt-2 border-t border-dashed">
//               <span>TOTAL</span>
//               <span>₹{formatNum(data.grand)}</span>
//             </div>
//           </div>
//         </div>

//         <div className="p-4 bg-slate-50 flex gap-2">
//           <button onClick={handlePrint} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors">
//             <Printer size={16} /> PRINT
//           </button>
//           <button onClick={onClose} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-black text-sm hover:bg-slate-100 transition-colors">
//             DONE
//           </button>
//         </div>
//       </motion.div>

//       {/* --- 📄 THERMAL PRINT LAYOUT (80mm Width) --- */}
//       <div className="hidden print:block bg-white text-black p-4" style={{ width: '80mm', fontFamily: 'monospace' }}>
//         <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '10px' }}>
//           <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Tax Invoice</h2>
//           <p style={{ fontSize: '10px', margin: '2px 0' }}>{new Date().toLocaleString()}</p>
//         </div>
        
//         <div style={{ fontSize: '11px', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
//           <p style={{ margin: '2px 0' }}><strong>INV NO:</strong>  {data.invoiceNo ? data.invoiceNo.toUpperCase() : 'PENDING'}</p>
//           <p style={{ margin: '2px 0' }}><strong>CUST:</strong> {data.customer?.name}</p>
//           <p style={{ margin: '2px 0' }}><strong>MOB:</strong> {data.customer?.phone || data.customer?.mobile}</p>
//         </div>

//         <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
//           <thead>
//             <tr style={{ borderBottom: '1px solid #000' }}>
//               <th align="left">ITEM</th>
//               <th align="center">QTY</th>
//               <th align="right">AMT</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data.items?.map((item, i) => (
//               <tr key={i}>
//                 <td style={{ padding: '4px 0' }}>{item.itemName?.substring(0, 18).toUpperCase()}</td>
//                 <td align="center">{item.qty}</td>
//                 <td align="right">₹{formatNum(item.qty * item.price)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <div style={{ fontSize: '11px', marginTop: '10px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'right', lineHeight: '1.6' }}>
//           <p style={{ margin: 0 }}>TAXABLE: ₹{formatNum(data.taxable)}</p>
//           <p style={{ margin: 0 }}>CGST: ₹{formatNum(data.cgst)}</p>
//           <p style={{ margin: 0 }}>SGST: ₹{formatNum(data.sgst)}</p>
//           <p style={{ fontSize: '15px', fontWeight: 'bold', borderTop: '1px dashed #000', marginTop: '5px', paddingTop: '5px' }}>
//             TOTAL: ₹{formatNum(data.grand)}
//           </p>
//         </div>
        
//         <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', borderTop: '1px solid #000', paddingTop: '10px' }}>
//           <p style={{ margin: 0 }}>--- THANK YOU ---</p>
//           <p style={{ margin: '4px 0 0 0' }}>Visit Again!</p>
//         </div>
//       </div>
//     </div>
//   );
// }