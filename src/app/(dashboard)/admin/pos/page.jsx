"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import POSInvoiceModal from "@/components/pos/POSInvoiceModal";

export default function POSPage() {
  const [inventories, setInventories] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState("all");

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const [customersMaster, setCustomersMaster] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "", email: "", phone: "", gstin: "", address: "", _id: null, isERP: false,
  });

  const [cashReceived, setCashReceived] = useState("");
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState(0);

  const getShortCode = (item) => {
    if (item?.itemCode) return item.itemCode.substring(0, 2).toUpperCase();
    if (item?.itemName) return item.itemName.substring(0, 1).toUpperCase();
    return "?";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowCustomerDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchInventory = useCallback(async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const res = await axios.get(`/api/inventory`, { headers: { Authorization: `Bearer ${token}` } });
      setInventories(res.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchCustomers = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [posRes, erpRes] = await Promise.all([
        axios.get("/api/pos/customers", { headers }),
        axios.get("/api/customers", { headers }),
      ]);
      const combined = [
        ...(posRes.data.data || []),
        ...(erpRes.data.data || []).map((c) => ({ ...c, name: c.name || c.customerName, mobile: c.mobile || c.phone, isERP: true })),
      ];
      setCustomersMaster(combined);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchInventory(); fetchCustomers(); }, [fetchInventory, fetchCustomers]);

  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const matchesSearch = (inv.item?.itemName || "").toLowerCase().includes(search.toLowerCase()) || (inv.item?.itemCode || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || (filter === "lowStock" && inv.quantity > 0 && inv.quantity <= 5);
      return matchesSearch && matchesFilter;
    });
  }, [inventories, filter, search]);

  const addToCart = (inv) => {
    if (!inv.item || inv.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((p) => p.inventoryId === inv._id);
      if (existing) {
        if (existing.qty >= inv.quantity) return prev;
        return prev.map((p) => p.inventoryId === inv._id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [
        ...prev,
        {
          inventoryId: inv._id,
          itemName: inv.item.itemName,
          price: Number(inv.item.unitPrice) || 0,
          qty: 1,
          gstRate: Number(inv.item.gstRate || inv.item.gst) || 0, 
          maxStock: Number(inv.quantity),
          shortCode: getShortCode(inv.item),
        },
      ];
    });
  };

  const updateCartItem = (id, field, value) => {
    setCart((prev) => prev.map((item) => {
      if (item.inventoryId === id) {
        let val = value === "" ? "" : Number(value); 
        if (field === "qty" && val !== "") val = Math.max(1, Math.min(val, item.maxStock));
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const net = cart.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
    const totalDiscount = discountType === "percent" ? (net * Number(discountValue)) / 100 : Number(discountValue);
    const discountFactor = net > 0 ? (net - totalDiscount) / net : 1;
    let totalCgst = 0, totalSgst = 0, totalTaxable = 0;
    cart.forEach(item => {
      const itemNet = Number(item.qty) * Number(item.price);
      const itemTaxable = itemNet * discountFactor;
      const itemTax = (itemTaxable * (Number(item.gstRate) || 0)) / 100;
      totalTaxable += itemTaxable;
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });
    const grand = totalTaxable + totalCgst + totalSgst;
    return { net, discount: totalDiscount, taxable: totalTaxable, cgst: totalCgst, sgst: totalSgst, grand };
  }, [cart, discountType, discountValue]);

  const balance = Math.max((parseFloat(cashReceived) || 0) - totals.grand, 0);

  // const handleCheckout = async () => {
  //   const token = localStorage.getItem("token");
  //   setIsProcessing(true);
  //   try {
  //     let currentCustomer = { ...selectedCustomer };
  //     if (!currentCustomer._id && currentCustomer.name) {
  //       const custRes = await axios.post("/api/pos/customers", 
  //         { name: currentCustomer.name, mobile: currentCustomer.phone, email: currentCustomer.email, gstin: currentCustomer.gstin },
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );
  //       currentCustomer._id = custRes.data.data._id;
  //     }

  //     // 🟢 FIX: Send correct financial field names to backend
  //     const res = await axios.post("/api/pos/checkout", {
  //       customerId: currentCustomer._id,
  //       items: cart,
  //       discount: { type: discountType, value: discountValue },
  //       payment: { received: parseFloat(cashReceived) || 0, balance: balance },
  //       // Ensure these match your POSSale model exactly
  //       totals: { 
  //           netTotal: totals.net, 
  //           taxableAmount: totals.taxable, 
  //           cgst: totals.cgst, 
  //           sgst: totals.sgst, 
  //           grandTotal: totals.grand 
  //       },
  //     }, { headers: { Authorization: `Bearer ${token}` } });

  //     setInvoiceData({ ...totals, items: [...cart], customer: currentCustomer, invoiceNo: res.data.data.invoiceNo });
  //     setIsInvoiceOpen(true);
  //     setCart([]); setCashReceived(""); setDiscountValue(0); setIsAddingNewCustomer(false);
  //     setSelectedCustomer({ name: "", email: "", phone: "", address: "", gstin: "", _id: null });
  //     fetchInventory(); fetchCustomers();
  //   } catch (e) { alert("Checkout failed"); } finally { setIsProcessing(false); }
  // };


const handleCheckout = async () => {
    const token = localStorage.getItem("token");
    if (!cart.length) return alert("Cart is empty");

    setIsProcessing(true);
    try {
      let currentCustomer = { ...selectedCustomer };

      // 1. Handle New Customer Creation
      if (!currentCustomer._id && currentCustomer.name) {
        const custRes = await axios.post("/api/pos/customers", 
          { 
            name: currentCustomer.name, 
            mobile: currentCustomer.phone, 
            email: currentCustomer.email, 
            gstin: currentCustomer.gstin 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentCustomer._id = custRes.data.data._id;
      }

      // 2. Prepare Financial Data
      const cashRec = parseFloat(cashReceived) || 0;
      // We calculate due here just for the Invoice Modal display immediately
      const due = cashRec < totals.grand ? totals.grand - cashRec : 0;
      const bal = cashRec > totals.grand ? cashRec - totals.grand : 0;

      // 3. Process Checkout
      const res = await axios.post("/api/pos/checkout", {
        customerId: currentCustomer._id || null, // Ensure it's not undefined
        items: cart,
        discount: { type: discountType, value: discountValue },
        payment: { 
            received: cashRec, 
            balance: bal 
        },
        totals: { 
            netTotal: totals.net, 
            taxableAmount: totals.taxable, 
            cgst: totals.cgst, 
            sgst: totals.sgst, 
            grandTotal: totals.grand 
        },
      }, { headers: { Authorization: `Bearer ${token}` } });

      // 4. Set Modal Data & Open
      // res.data.customInvoiceNo comes from the backend logic we wrote earlier
      const finalInvoiceNo = res.data.customInvoiceNo || res.data.invoiceId;

      setInvoiceData({ 
        ...totals, 
        items: [...cart], 
        customer: currentCustomer, 
        invoiceNo: finalInvoiceNo,
        paymentReceived: cashRec,
        balanceReturned: bal,
        dueAmount: due // Passing due to modal
      });

      setIsInvoiceOpen(true);

      // 5. Reset UI
      setCart([]); 
      setCashReceived(""); 
      setDiscountValue(0); 
      setIsAddingNewCustomer(false);
      setSelectedCustomer({ name: "", email: "", phone: "", address: "", gstin: "", _id: null });
      
      // Refresh data
      fetchInventory(); 
      fetchCustomers();

    } catch (e) { 
      console.error("Checkout Error:", e);
      alert(e.response?.data?.message || "Checkout failed. Please check stock or customer selection."); 
    } finally { 
      setIsProcessing(false); 
    }
  };


  return (
    <div className="flex h-screen bg-[#F8FAFC] p-4 gap-4 font-sans overflow-hidden text-slate-800">
      
      {/* LEFT: CATALOGUE */}
      <div className="w-[60%] bg-white rounded-3xl p-6 shadow-sm flex flex-col border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-xl uppercase tracking-tighter text-slate-900">Catalogue</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
              {["all", "lowStock"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>{f}</button>
              ))}
          </div>
          <div className="relative">
            <input type="text" placeholder="Search..." className="bg-slate-100 border-none rounded-2xl pl-10 pr-4 py-3 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 scrollbar-hide">
          {loading ? [...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl" />) : 
            filteredInventories.map((inv) => {
              const isLowStock = inv.quantity <= 5;
              return (
                <motion.div layout key={inv._id} onClick={() => addToCart(inv)} 
                  className={`group border rounded-2xl p-4 cursor-pointer transition-all bg-white hover:border-blue-400 ${isLowStock ? "border-rose-100 bg-rose-50/30" : "border-slate-100 shadow-sm"}`}>
                  <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 font-black text-2xl text-slate-200 uppercase">{getShortCode(inv.item)}</div>
                  <p className="text-[11px] font-black uppercase truncate">{inv.item?.itemName}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-black text-sm text-blue-600">₹{inv.item?.unitPrice}</p>
                    <div className={`px-2 py-1 rounded-lg flex flex-col items-end ${isLowStock ? "text-rose-500 bg-rose-50" : "text-emerald-500 bg-emerald-50"}`}>
                        <span className="text-[8px] font-black uppercase leading-none">Stock</span>
                        <span className="text-[10px] font-bold leading-none mt-0.5">{inv.quantity}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          }
        </div>
      </div>

      {/* RIGHT: CUSTOMER & CART */}
      <div className="w-[40%] flex flex-col gap-4">
        {/* CUSTOMER PANEL */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative" ref={dropdownRef}>
            {!isAddingNewCustomer ? (
                <div className="relative">
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase">{selectedCustomer.name ? selectedCustomer.name[0] : "?"}</div>
                        <input className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:text-slate-300" placeholder="Find Customer..." value={selectedCustomer.name} onFocus={() => setShowCustomerDropdown(true)} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value, _id: null })} />
                    </div>
                    <AnimatePresence>
                        {showCustomerDropdown && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 w-full bg-white border mt-2 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto p-1 scrollbar-hide">
                            {customersMaster.filter((c) => (c.name || "").toLowerCase().includes(selectedCustomer.name.toLowerCase()) || (c.mobile || "").includes(selectedCustomer.name)).map((c) => (
                                <div key={c._id} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer rounded-xl transition-all flex justify-between items-center" onClick={() => { setSelectedCustomer({ name: c.name, phone: c.mobile || c.phone || "", email: c.email || "", gstin: c.gstin || "", _id: c._id, isERP: !!c.isERP }); setShowCustomerDropdown(false); }}>
                                  <div>
                                      <p className="text-xs font-black uppercase text-slate-800">{c.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold italic uppercase">{c.mobile || "No Mobile"}</p>
                                  </div>
                                  {c.isERP && <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded font-black">ERP</span>}
                                </div>
                            ))}
                            {selectedCustomer.name && !selectedCustomer._id && (
                            <div className="p-3 bg-blue-600 text-white rounded-xl cursor-pointer m-1 text-center shadow-lg" onClick={() => { setIsAddingNewCustomer(true); setShowCustomerDropdown(false); }}>
                                <p className="text-xs font-black uppercase tracking-tight">+ Create New "{selectedCustomer.name}"</p>
                            </div>
                            )}
                        </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-blue-600">New Customer</h3><button onClick={() => setIsAddingNewCustomer(false)} className="text-[10px] font-bold text-slate-400 underline">BACK</button></div>
                    <input type="text" placeholder="Mobile" className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100" value={selectedCustomer.phone} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })} />
                </div>
            )}
        </div>

        {/* CART */}
        <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col border border-slate-200 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
            {cart.map((item) => (
              <div key={item.inventoryId} className="space-y-1 group border-b border-slate-50 pb-2">
                <div className="flex justify-between items-center">
                    <p className="text-[11px] font-black uppercase text-slate-800">{item.itemName}</p>
                    <button onClick={() => setCart(cart.filter(c => c.inventoryId !== item.inventoryId))} className="text-[10px] text-rose-500 font-black opacity-0 group-hover:opacity-100 transition-opacity">REMOVE</button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Qty</label>
                        <input type="number" className="w-full text-sm font-black text-blue-600 border rounded-lg px-2 py-1 outline-none" value={item.qty} onChange={(e) => updateCartItem(item.inventoryId, "qty", e.target.value)} />
                    </div>
                    <span className="mt-4 text-slate-300 font-bold text-sm">@</span>
                    <div className="flex-[2]">
                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">Rate</label>
                        <input type="number" className="w-full text-sm font-black text-slate-600 border rounded-lg px-2 py-1 outline-none" value={item.price} onChange={(e) => updateCartItem(item.inventoryId, "price", e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">GST %</label>
                        <input type="number" className="w-full text-[11px] font-black text-slate-400 bg-slate-50 border rounded-lg px-2 py-1 outline-none" value={item.gstRate} onChange={(e) => updateCartItem(item.inventoryId, "gstRate", e.target.value)} />
                    </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t space-y-1.5 border-slate-100">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span>₹{totals.net.toLocaleString()}</span></div>
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Discount</span>
              <div className="flex gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                <select className="bg-transparent outline-none text-blue-500 font-bold" value={discountType} onChange={(e) => setDiscountType(e.target.value)}><option value="amount">₹</option><option value="percent">%</option></select>
                <input className="w-12 text-right bg-transparent font-black" type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic"><span>CGST Sum</span><span>₹{totals.cgst.toFixed(2)}</span></div>
            <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic border-b pb-1"><span>SGST Sum</span><span>₹{totals.sgst.toFixed(2)}</span></div>
            
            {/* <div className="bg-slate-900 rounded-3xl p-5 mt-2 shadow-2xl">
              <div className="flex justify-between items-center mb-3 text-white">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Payable</span>
                <span className="text-2xl font-black">₹{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <input type="number" placeholder="CASH RECEIVED" className="w-full bg-slate-800 border-none rounded-2xl py-3 text-white font-black text-center outline-none focus:ring-2 ring-blue-500" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
              {Number(balance) > 0 && <div className="flex justify-between mt-4 text-emerald-400 font-black text-[11px] uppercase border-t border-slate-800 pt-3"><span>Balance Return</span><span>₹{balance.toLocaleString()}</span></div>}
            </div> */}

            <div className="bg-slate-900 rounded-3xl p-5 mt-2 shadow-2xl">
  <div className="flex justify-between items-center mb-3 text-white">
    <span className="text-[10px] font-black uppercase text-slate-400">Total Payable</span>
    <span className="text-2xl font-black">
      ₹{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </span>
  </div>

  <input 
    type="number" 
    placeholder="CASH RECEIVED" 
    className="w-full bg-slate-800 border-none rounded-2xl py-3 text-white font-black text-center outline-none focus:ring-2 ring-blue-500 placeholder:text-slate-600" 
    value={cashReceived} 
    onChange={(e) => setCashReceived(e.target.value)} 
  />

  {/* 🟢 Improved logic: Show balance if cash is enough, show "Remaining" if cash is less */}
  {cashReceived !== "" && (
    <div className="flex justify-between mt-4 font-black text-[11px] uppercase border-t border-slate-800 pt-3">
      {parseFloat(cashReceived) >= totals.grand ? (
        <>
          <span className="text-emerald-400">Balance Return</span>
          <span className="text-emerald-400">₹{(parseFloat(cashReceived) - totals.grand).toFixed(2)}</span>
        </>
      ) : (
        <>
          <span className="text-rose-400">Due Amount</span>
          <span className="text-rose-400">₹{(totals.grand - parseFloat(cashReceived)).toFixed(2)}</span>
        </>
      )}
    </div>
  )}
</div>

            <button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} className={`w-full py-5 rounded-2xl font-black text-white mt-2 shadow-lg transition-all ${cart.length > 0 ? "bg-blue-600 hover:bg-blue-700 active:scale-95" : "bg-slate-200 cursor-not-allowed"}`}>
              {isProcessing ? "PROCESSING..." : "FINALIZE TRANSACTION"}
            </button>
          </div>
        </div>
      </div>

      <POSInvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} data={invoiceData} />
    </div>
  );
}



// "use client";

// import { useEffect, useState, useRef, useMemo, useCallback } from "react";
// import axios from "axios";
// import { motion, AnimatePresence } from "framer-motion";
// import POSInvoiceModal from "@/components/pos/POSInvoiceModal";

// export default function POSPage() {
//   const [inventories, setInventories] = useState([]);
//   const [cart, setCart] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [filter, setFilter] = useState("all");

//   const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
//   const [invoiceData, setInvoiceData] = useState(null);

//   const [customersMaster, setCustomersMaster] = useState([]);
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
//   const dropdownRef = useRef(null);
//   const [selectedCustomer, setSelectedCustomer] = useState({
//     name: "", email: "", phone: "", gstin: "", address: "", _id: null, isERP: false,
//   });

//   const [cashReceived, setCashReceived] = useState("");
//   const [discountType, setDiscountType] = useState("amount");
//   const [discountValue, setDiscountValue] = useState(0);

//   const getShortCode = (item) => {
//     if (item?.itemCode) return item.itemCode.substring(0, 2).toUpperCase();
//     if (item?.itemName) return item.itemName.substring(0, 1).toUpperCase();
//     return "?";
//   };

//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowCustomerDropdown(false);
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const fetchInventory = useCallback(async () => {
//     const token = localStorage.getItem("token");
//     setLoading(true);
//     try {
//       const res = await axios.get(`/api/inventory`, { headers: { Authorization: `Bearer ${token}` } });
//       setInventories(res.data.data || []);
//     } catch (e) { console.error(e); } finally { setLoading(false); }
//   }, []);

//   const fetchCustomers = useCallback(async () => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };
//     try {
//       const [posRes, erpRes] = await Promise.all([
//         axios.get("/api/pos/customers", { headers }),
//         axios.get("/api/customers", { headers }),
//       ]);
//       const combined = [
//         ...(posRes.data.data || []),
//         ...(erpRes.data.data || []).map((c) => ({ ...c, name: c.name || c.customerName, mobile: c.mobile || c.phone, isERP: true })),
//       ];
//       setCustomersMaster(combined);
//     } catch (e) { console.error(e); }
//   }, []);

//   useEffect(() => { fetchInventory(); fetchCustomers(); }, [fetchInventory, fetchCustomers]);

//   const filteredInventories = useMemo(() => {
//     return inventories.filter((inv) => {
//       const matchesSearch = (inv.item?.itemName || "").toLowerCase().includes(search.toLowerCase()) || (inv.item?.itemCode || "").toLowerCase().includes(search.toLowerCase());
//       const matchesFilter = filter === "all" || (filter === "lowStock" && inv.quantity > 0 && inv.quantity <= 5);
//       return matchesSearch && matchesFilter;
//     });
//   }, [inventories, filter, search]);

//   const addToCart = (inv) => {
//     if (!inv.item || inv.quantity <= 0) return;
//     setCart((prev) => {
//       const existing = prev.find((p) => p.inventoryId === inv._id);
//       if (existing) {
//         if (existing.qty >= inv.quantity) return prev;
//         return prev.map((p) => p.inventoryId === inv._id ? { ...p, qty: p.qty + 1 } : p);
//       }
//       return [
//         ...prev,
//         {
//           inventoryId: inv._id,
//           itemName: inv.item.itemName,
//           price: Number(inv.item.unitPrice) || 0,
//           qty: 1,
//           gstRate: Number(inv.item.gstRate || inv.item.gst) || 0, 
//           maxStock: Number(inv.quantity),
//           shortCode: getShortCode(inv.item),
//         },
//       ];
//     });
//   };

//   const updateCartItem = (id, field, value) => {
//     setCart((prev) => prev.map((item) => {
//       if (item.inventoryId === id) {
//         let val = value === "" ? "" : Number(value); 
//         if (field === "qty" && val !== "") val = Math.max(1, Math.min(val, item.maxStock));
//         return { ...item, [field]: val };
//       }
//       return item;
//     }));
//   };

//   const totals = useMemo(() => {
//     const net = cart.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
//     const totalDiscount = discountType === "percent" ? (net * Number(discountValue)) / 100 : Number(discountValue);
//     const discountFactor = net > 0 ? (net - totalDiscount) / net : 1;
//     let totalCgst = 0, totalSgst = 0, totalTaxable = 0;
//     cart.forEach(item => {
//       const itemNet = Number(item.qty) * Number(item.price);
//       const itemTaxable = itemNet * discountFactor;
//       const itemTax = (itemTaxable * (Number(item.gstRate) || 0)) / 100;
//       totalTaxable += itemTaxable;
//       totalCgst += itemTax / 2;
//       totalSgst += itemTax / 2;
//     });
//     const grand = totalTaxable + totalCgst + totalSgst;
//     return { net, discount: totalDiscount, taxable: totalTaxable, cgst: totalCgst, sgst: totalSgst, grand };
//   }, [cart, discountType, discountValue]);

//   const balance = Math.max((parseFloat(cashReceived) || 0) - totals.grand, 0);

//   const handleCheckout = async () => {
//     const token = localStorage.getItem("token");
//     setIsProcessing(true);
//     try {
//       let currentCustomer = { ...selectedCustomer };
//       if (!currentCustomer._id && currentCustomer.name) {
//         const custRes = await axios.post("/api/pos/customers", 
//           { name: currentCustomer.name, mobile: currentCustomer.phone, email: currentCustomer.email, gstin: currentCustomer.gstin },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         currentCustomer._id = custRes.data.data._id;
//       }
//       const res = await axios.post("/api/pos/checkout", {
//         customerId: currentCustomer._id, items: cart, discount: { type: discountType, value: discountValue },
//         payment: { received: parseFloat(cashReceived) || 0, balance },
//         totals: { netTotal: totals.net, taxableAmount: totals.taxable, cgst: totals.cgst, sgst: totals.sgst, grandTotal: totals.grand },
//       }, { headers: { Authorization: `Bearer ${token}` } });

//       setInvoiceData({ ...totals, items: [...cart], customer: currentCustomer, invoiceNo: res.data.invoiceId });
//       setIsInvoiceOpen(true);
//       setCart([]); setCashReceived(""); setDiscountValue(0); setIsAddingNewCustomer(false);
//       setSelectedCustomer({ name: "", email: "", phone: "", address: "", gstin: "", _id: null });
//       fetchInventory(); fetchCustomers();
//     } catch (e) { alert("Checkout failed"); } finally { setIsProcessing(false); }
//   };

//   return (
//     <div className="flex h-screen bg-[#F8FAFC] p-4 gap-4 font-sans overflow-hidden">
      
//       {/* LEFT: ITEM GRID (Original Layout) */}
//       <div className="w-[65%] bg-white rounded-3xl p-6 shadow-sm flex flex-col border border-slate-200">
//         <div className="flex justify-between items-center mb-6">
//           <div className="flex items-center gap-4">
//             <h2 className="font-bold text-xl uppercase tracking-tighter text-slate-900">Catalogue</h2>
//             <div className="flex bg-slate-100 p-1 rounded-xl">
//               {["all", "lowStock"].map((f) => (
//                 <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>{f}</button>
//               ))}
//             </div>
//           </div>
//           <div className="relative">
//             <input type="text" placeholder="Search items..." className="bg-slate-100 border-none rounded-2xl pl-10 pr-4 py-3 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-inner" value={search} onChange={(e) => setSearch(e.target.value)} />
//             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-4 pr-2 scrollbar-hide">
//           {loading ? [...Array(8)].map((_, i) => <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl" />) : (
//             filteredInventories.map((inv) => {
//               const isLowStock = inv.quantity <= 5;
//               return (
//                 <motion.div layout key={inv._id} onClick={() => addToCart(inv)} 
//                   className={`group border rounded-2xl p-4 cursor-pointer transition-all bg-white hover:border-blue-400 ${isLowStock ? "border-rose-100 bg-rose-50/20" : "border-slate-100 shadow-sm"}`}>
//                   <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 font-black text-2xl text-slate-200">{getShortCode(inv.item)}</div>
//                   <p className="text-[11px] text-slate-500 font-bold truncate uppercase">{inv.item?.itemName}</p>
//                   <div className="flex justify-between items-center mt-1">
//                     <p className="font-black text-sm text-slate-800">₹ {inv.item?.unitPrice}</p>
//                     <span className={`text-[10px] font-bold ${isLowStock ? "text-rose-500" : "text-emerald-500"}`}>Stock: {inv.quantity}</span>
//                   </div>
//                 </motion.div>
//               )
//             })
//           )}
//         </div>
//       </div>

//       {/* RIGHT: CUSTOMER & CART */}
//       <div className="w-[35%] flex flex-col gap-4">
        
//         {/* CUSTOMER PANEL (Original Layout) */}
//         <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
//           {!isAddingNewCustomer ? (
//             <div className="relative" ref={dropdownRef}>
//               <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
//                 <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase">{selectedCustomer.name ? selectedCustomer.name[0] : "?"}</div>
//                 <input className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:text-slate-300" placeholder="Find Customer..." value={selectedCustomer.name} onFocus={() => setShowCustomerDropdown(true)} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value, _id: null })} />
//               </div>
//               <AnimatePresence>
//                 {showCustomerDropdown && (
//                   <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full left-0 w-full bg-white border mt-2 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto p-1 scrollbar-hide">
//                     {customersMaster.filter((c) => (c.name || "").toLowerCase().includes(selectedCustomer.name.toLowerCase()) || (c.mobile || "").includes(selectedCustomer.name)).map((c) => (
//                         <div key={c._id} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer rounded-xl transition-all flex justify-between items-center" onClick={() => { setSelectedCustomer({ name: c.name, phone: c.mobile || c.phone || "", email: c.email || "", gstin: c.gstin || "", _id: c._id, isERP: !!c.isERP }); setShowCustomerDropdown(false); }}>
//                           <div>
//                             <p className="text-xs font-black uppercase text-slate-800">{c.name}</p>
//                             <p className="text-[10px] text-slate-400 font-bold italic uppercase">{c.mobile || "No Mobile"}</p>
//                           </div>
//                           {c.isERP && <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded font-black">ERP</span>}
//                         </div>
//                       ))}
//                     {selectedCustomer.name && !selectedCustomer._id && (
//                       <div className="p-3 bg-blue-600 text-white rounded-xl cursor-pointer m-1 text-center shadow-lg shadow-blue-100" onClick={() => { setIsAddingNewCustomer(true); setShowCustomerDropdown(false); }}>
//                         <p className="text-xs font-black uppercase tracking-tight">+ Create New "{selectedCustomer.name}"</p>
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           ) : (
//             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
//               <div className="flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">New Customer</h3><button onClick={() => setIsAddingNewCustomer(false)} className="text-[10px] font-bold text-slate-400 hover:text-rose-500">BACK</button></div>
//               <input type="text" placeholder="Mobile Number" className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100" value={selectedCustomer.phone} onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })} />
//             </motion.div>
//           )}
//         </div>

//         {/* CART (Original Layout with New Row Inputs) */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col border border-slate-200 overflow-hidden">
//           <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
//             {cart.map((item) => (
//               <div key={item.inventoryId} className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
//                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-slate-300 shadow-sm">{item.shortCode}</div>
//                 <div className="flex-1 min-w-0">
//                   <p className="text-[11px] font-black text-slate-800 uppercase truncate">{item.itemName}</p>
//                   <div className="flex gap-2 items-center">
//                     <input type="number" className="w-10 text-[10px] font-black text-blue-600 bg-transparent outline-none" value={item.qty} onChange={(e) => updateCartItem(item.inventoryId, "qty", e.target.value)} />
//                     <span className="text-[10px] text-slate-300 font-bold">@</span>
//                     <input type="number" className="w-14 text-[10px] font-bold text-slate-400 bg-transparent outline-none" value={item.price} onChange={(e) => updateCartItem(item.inventoryId, "price", e.target.value)} />
//                     <input type="number" className="w-8 text-[9px] font-black text-slate-300 bg-white rounded px-1" value={item.gstRate} onChange={(e) => updateCartItem(item.inventoryId, "gstRate", e.target.value)} />
//                   </div>
//                 </div>
//                 <div className="text-right">
//                   <p className="text-xs font-black text-slate-800">₹{(item.qty * item.price).toLocaleString()}</p>
//                   <button onClick={() => setCart(cart.filter((c) => c.inventoryId !== item.inventoryId))} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="mt-4 pt-4 border-t space-y-1.5 border-slate-100">
//             <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Subtotal</span><span>₹{totals.net.toLocaleString()}</span></div>
//             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
//               <span>Discount</span>
//               <div className="flex gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
//                 <select className="bg-transparent outline-none text-blue-500 font-bold" value={discountType} onChange={(e) => setDiscountType(e.target.value)}><option value="amount">₹</option><option value="percent">%</option></select>
//                 <input className="w-12 text-right bg-transparent font-black" type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
//               </div>
//             </div>
//             <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic"><span>CGST Sum</span><span>₹{totals.cgst.toFixed(2)}</span></div>
//             <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic border-b pb-1"><span>SGST Sum</span><span>₹{totals.sgst.toFixed(2)}</span></div>
            
//             <div className="bg-slate-900 rounded-3xl p-5 mt-2 shadow-2xl">
//               <div className="flex justify-between items-center mb-3">
//                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-slate-400">Total Payable</span>
//                 <span className="text-2xl font-black text-white">₹{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
//               </div>
//               <div className="relative">
//                 <input type="number" placeholder="CASH RECEIVED" className="w-full bg-slate-800 border-none rounded-2xl py-3 px-3 text-white font-black text-center outline-none focus:ring-2 ring-blue-500 transition-all placeholder:text-slate-600" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
//               </div>
//             </div>

//             <button onClick={handleCheckout} disabled={cart.length === 0 || isProcessing} className={`w-full py-5 rounded-2xl font-black text-white mt-2 shadow-lg transition-all ${cart.length > 0 ? "bg-blue-600 hover:bg-blue-700 active:scale-95" : "bg-slate-200 cursor-not-allowed"}`}>
//               {isProcessing ? "PROCESSING..." : "FINALIZE TRANSACTION"}
//             </button>
//           </div>
//         </div>
//       </div>

//       <POSInvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} data={invoiceData} />
//     </div>
//   );
// }
