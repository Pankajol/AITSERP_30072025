"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import POSInvoiceModal from "@/components/pos/POSInvoiceModal";
import { toast } from "react-toastify";

/* =========================
   ✅ INLINE SVG LOGOS
   (No download needed)
========================= */

const IconWrap = ({ children }) => (
  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
    {children}
  </div>
);

const GPayLogo = () => (
  <svg width="34" height="18" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 30c0 8.3-6.7 15-15 15S0 38.3 0 30 6.7 15 15 15c4 0 7.4 1.4 10 3.8l-4 4c-1.6-1.6-3.7-2.5-6-2.5-4.8 0-8.7 4-8.7 8.7S10.2 38 15 38c4.1 0 6.7-2.3 7.4-5.5H15v-5h15c.2.8.3 1.7.3 2.5Z" fill="#4285F4"/>
    <path d="M44 45V15h10.8c6.3 0 10.2 4.1 10.2 9.7 0 5.6-4 9.7-10.2 9.7H50.5V45H44Zm6.5-16h4.1c3 0 4.8-1.7 4.8-4.3s-1.8-4.3-4.8-4.3h-4.1V29Z" fill="#1A73E8"/>
    <path d="M66 36.5c0-5.2 4-8.7 10-8.7 5.9 0 9.7 3.5 9.7 8.6 0 5.2-3.8 8.7-9.8 8.7-6.1 0-10-3.5-10-8.6Zm13.5 0c0-2.7-1.5-4.4-3.6-4.4-2.2 0-3.8 1.7-3.8 4.4 0 2.7 1.6 4.4 3.8 4.4 2.1 0 3.6-1.7 3.6-4.4Z" fill="#34A853"/>
    <path d="M94.2 52l4.1-9.3L88 28h6.6l6 14.1h.1l5.8-14.1h6.4L100.7 60h-6.5Z" fill="#EA4335"/>
  </svg>
);

const PhonePeLogo = () => (
  <svg width="34" height="34" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
    <rect width="256" height="256" rx="56" fill="#5F259F"/>
    <path d="M116 54h64c12 0 22 10 22 22v64c0 12-10 22-22 22h-64c-12 0-22-10-22-22V76c0-12 10-22 22-22Z" fill="#fff" opacity="0.12"/>
    <path d="M92 188V76h38.5c27 0 44 16 44 38 0 21-17 38-44 38h-16v36H92Zm22.5-56h14.8c16 0 24-7.5 24-18 0-10.6-8-18-24-18h-14.8v36Z" fill="#fff"/>
  </svg>
);

const PaytmLogo = () => (
  <svg width="44" height="16" viewBox="0 0 250 80" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 12h60c18 0 30 10 30 26s-12 26-30 26H24v12H0V12Zm24 18v16h30c7 0 12-3 12-8s-5-8-12-8H24Z" fill="#00B9F1"/>
    <path d="M110 12h28l20 56h-26l-3-10h-20l-3 10H80l30-56Zm5 32h10l-5-16-5 16Z" fill="#00B9F1"/>
    <path d="M166 12h24v56h-24V12Z" fill="#002E6E"/>
    <path d="M204 12h46v18h-22v38h-24V30h-24V12Z" fill="#002E6E"/>
  </svg>
);

const BHIMLogo = () => (
  <svg width="42" height="18" viewBox="0 0 220 80" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10h60v18H37v10h35v18H37v14H15V10Z" fill="#0F9D58"/>
    <path d="M90 10h22v60H90V10Z" fill="#FF6D00"/>
    <path d="M125 10h25l10 18 10-18h25v60h-22V44l-13 20-13-20v26h-22V10Z" fill="#0F9D58"/>
  </svg>
);

export default function POSPage() {
  const [inventories, setInventories] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState("all");

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  // ✅ Pricelist
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [priceList, setPriceList] = useState(null);
  const [priceMap, setPriceMap] = useState({});

  // ✅ Customer
  const [customersMaster, setCustomersMaster] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const dropdownRef = useRef(null);

  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    address: "",
    _id: null,
    isERP: false,
  });

  // ✅ Payment + Discount
  const [cashReceived, setCashReceived] = useState("");
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState(0);

  // ✅ Online Payment Flow
  const [paymentMode, setPaymentMode] = useState("cash"); // cash | upi | card | bank
  const [upiApp, setUpiApp] = useState("gpay");
  const [txnId, setTxnId] = useState("");

  const getShortCode = (item) => {
    if (item?.itemCode) return item.itemCode.substring(0, 2).toUpperCase();
    if (item?.itemName) return item.itemName.substring(0, 1).toUpperCase();
    return "?";
  };

  /* =========================
     CLICK OUTSIDE
  ========================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowCustomerDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================
     FETCH WAREHOUSES
  ========================= */
  const fetchWarehouses = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await axios.get("/api/warehouse", { headers });
      const list = res.data.data || [];
      setWarehouses(list);

      if (!selectedWarehouse && list.length) {
        setSelectedWarehouse(list[0]._id);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch warehouses");
    }
  }, [selectedWarehouse]);

  /* =========================
     FETCH DEFAULT PRICE LIST
  ========================= */
  const fetchDefaultPriceList = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await axios.get("/api/pricelist/default", { headers });
      setPriceList(res.data.data || null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load default price list");
    }
  }, []);

  /* =========================
     FETCH PRICELIST ITEM PRICES
  ========================= */
  const fetchPriceListPrices = useCallback(async (warehouseId, priceListId) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    if (!warehouseId || !priceListId) {
      setPriceMap({});
      return;
    }

    try {
      const res = await axios.get(
        `/api/pricelist/items?priceListId=${priceListId}&warehouseId=${warehouseId}`,
        { headers }
      );

      const map = {};
      (res.data.data || []).forEach((row) => {
        map[row.itemId?._id] = {
          sellingPrice: Number(row.sellingPrice || 0),
          discountPercent: Number(row.discountPercent || 0),
          discountAmount: Number(row.discountAmount || 0),
        };
      });

      setPriceMap(map);
    } catch (e) {
      console.error(e);
      setPriceMap({});
    }
  }, []);

  /* =========================
     FETCH INVENTORY
  ========================= */
  // const fetchInventory = useCallback(async () => {
  //   const token = localStorage.getItem("token");
  //   setLoading(true);

  //   try {
  //     const url = selectedWarehouse
  //       ? `/api/inventory?posOnly=true&warehouseId=${selectedWarehouse}&limit=5000`
  //       : `/api/inventory?posOnly=true&limit=5000`;

  //     const res = await axios.get(url, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });

  //     const data = res.data.data || [];

  //     const merged = data.map((inv) => {
  //       const itemId = inv?.item?._id;
  //       const pl = itemId ? priceMap[itemId] : null;

  //       const base = Number(inv?.item?.unitPrice || 0);
  //       const plPrice = pl?.sellingPrice > 0 ? pl.sellingPrice : null;
  //       const finalPOSPrice = plPrice ?? base;

  //       return {
  //         ...inv,
  //         posPrice: finalPOSPrice,
  //         posBasePrice: base,
  //         posSavingPerUnit: Math.max(0, base - finalPOSPrice),
  //       };
  //     });

  //     setInventories(merged);
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [selectedWarehouse, priceMap]);

  
  const fetchInventory = useCallback(async () => {
  const token = localStorage.getItem("token");
  setLoading(true);

  try {
    const url = selectedWarehouse
      ? `/api/inventory?posOnly=true&warehouseId=${selectedWarehouse}&limit=5000`
      : `/api/inventory?posOnly=true&limit=5000`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = res.data.data || [];

    // ✅ ONLY STOCK ITEMS
    const inStock = data.filter((inv) => Number(inv?.quantity || 0) > 0);

    const merged = inStock.map((inv) => {
      const itemId = inv?.item?._id;
      const pl = itemId ? priceMap[itemId] : null;

      const base = Number(inv?.item?.unitPrice || 0);
      const plPrice = pl?.sellingPrice > 0 ? pl.sellingPrice : null;
      const finalPOSPrice = plPrice ?? base;

      return {
        ...inv,
        posPrice: finalPOSPrice,
        posBasePrice: base,
        posSavingPerUnit: Math.max(0, base - finalPOSPrice),
      };
    });

    setInventories(merged);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [selectedWarehouse, priceMap]);

  
  /* =========================

     FETCH CUSTOMERS
  ========================= */
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
        ...(erpRes.data.data || []).map((c) => ({
          ...c,
          name: c.name || c.customerName,
          mobile: c.mobile || c.phone,
          isERP: true,
        })),
      ];

      setCustomersMaster(combined);
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    fetchWarehouses();
    fetchDefaultPriceList();
    fetchCustomers();
  }, [fetchWarehouses, fetchDefaultPriceList, fetchCustomers]);

  useEffect(() => {
    if (!selectedWarehouse || !priceList?._id) return;
    fetchPriceListPrices(selectedWarehouse, priceList._id);
  }, [selectedWarehouse, priceList?._id, fetchPriceListPrices]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  /* =========================
     FILTER INVENTORY
  ========================= */
  const filteredInventories = useMemo(() => {
    return inventories.filter((inv) => {
      const matchesSearch =
        (inv.item?.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
        (inv.item?.itemCode || "").toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "lowStock" && inv.quantity > 0 && inv.quantity <= 5);

      return matchesSearch && matchesFilter;
    });
  }, [inventories, filter, search]);

  /* =========================
     ADD TO CART
  ========================= */
  const addToCart = (inv) => {
    if (!inv.item || inv.quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((p) => p.inventoryId === inv._id);

      if (existing) {
        if (existing.qty >= inv.quantity) return prev;
        return prev.map((p) =>
          p.inventoryId === inv._id ? { ...p, qty: p.qty + 1 } : p
        );
      }

      return [
        ...prev,
        {
          inventoryId: inv._id,
          itemId: inv.item?._id,
          itemName: inv.item.itemName,

          price: Number(inv.posPrice ?? inv.item.unitPrice) || 0,
          mrp: Number(inv.posBasePrice ?? inv.item.unitPrice) || 0,

          qty: 1,
          gstRate: Number(inv.item.gstRate || inv.item.gst) || 0,
          maxStock: Number(inv.quantity),
          shortCode: getShortCode(inv.item),
        },
      ];
    });
  };

  const updateCartItem = (id, field, value) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.inventoryId === id) {
          let val = value === "" ? "" : Number(value);
          if (field === "qty" && val !== "")
            val = Math.max(1, Math.min(val, item.maxStock));
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  /* =========================
     TOTALS
  ========================= */
  const totals = useMemo(() => {
    const net = cart.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

    const saving = cart.reduce((s, i) => {
      const mrp = Number(i.mrp || i.price || 0);
      const price = Number(i.price || 0);
      const qty = Number(i.qty || 0);
      return s + Math.max(0, (mrp - price) * qty);
    }, 0);

    const totalDiscount =
      discountType === "percent"
        ? (net * Number(discountValue)) / 100
        : Number(discountValue);

    const discountFactor = net > 0 ? (net - totalDiscount) / net : 1;

    let totalCgst = 0,
      totalSgst = 0,
      totalTaxable = 0;

    cart.forEach((item) => {
      const itemNet = Number(item.qty) * Number(item.price);
      const itemTaxable = itemNet * discountFactor;
      const itemTax = (itemTaxable * (Number(item.gstRate) || 0)) / 100;

      totalTaxable += itemTaxable;
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    const grand = totalTaxable + totalCgst + totalSgst;

    return {
      net,
      discount: totalDiscount,
      taxable: totalTaxable,
      cgst: totalCgst,
      sgst: totalSgst,
      grand,
      saving,
    };
  }, [cart, discountType, discountValue]);

  /* =========================
     PAYMENT AMOUNTS
  ========================= */
  const paidAmount =
    paymentMode === "cash"
      ? parseFloat(cashReceived) || 0
      : Number(totals.grand || 0);

  const due = paidAmount < totals.grand ? totals.grand - paidAmount : 0;
  const balanceReturn = paidAmount > totals.grand ? paidAmount - totals.grand : 0;

  /* =========================
     CHECKOUT
  ========================= */
  const handleCheckout = async () => {
    const token = localStorage.getItem("token");
    if (!cart.length) return toast.error("Cart is empty");

    // ✅ validations
    if (paymentMode !== "cash" && !txnId?.trim()) {
      toast.error("Txn / Ref No is required for online payment");
      return;
    }

    if (paymentMode === "cash" && (!cashReceived || Number(cashReceived) <= 0)) {
      toast.error("Enter cash received");
      return;
    }

    setIsProcessing(true);

    try {
      let currentCustomer = { ...selectedCustomer };

      if (!currentCustomer._id && currentCustomer.name) {
        const custRes = await axios.post(
          "/api/pos/customers",
          {
            name: currentCustomer.name,
            mobile: currentCustomer.phone,
            email: currentCustomer.email,
            gstin: currentCustomer.gstin,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentCustomer._id = custRes.data.data._id;
      }

      const res = await axios.post(
        "/api/pos/checkout",
        {
          customerId: currentCustomer._id || null,

          warehouseId: selectedWarehouse || null,
          priceListId: priceList?._id || null,

          items: cart,
          discount: { type: discountType, value: discountValue },

          payment: {
            mode: paymentMode,
            upiApp: paymentMode === "upi" ? upiApp : null,
            txnId: txnId || null,
            received: paidAmount,
            balance: balanceReturn,
            due,
            status: paymentMode === "cash" ? (due > 0 ? "partial" : "paid") : "paid",
          },

          totals: {
            netTotal: totals.net,
            taxableAmount: totals.taxable,
            cgst: totals.cgst,
            sgst: totals.sgst,
            grandTotal: totals.grand,
            savingTotal: totals.saving,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const finalInvoiceNo = res.data.customInvoiceNo || res.data.invoiceId;

      setInvoiceData({
        ...totals,
        saving: totals.saving,
        items: [...cart],
        customer: currentCustomer,
        invoiceNo: finalInvoiceNo,

        paymentReceived: paidAmount,
        balanceReturned: balanceReturn,
        dueAmount: due,

        paymentMode,
        upiApp,
        txnId,

        priceListName: priceList?.name || "",
        warehouseName:
          warehouses.find((w) => w._id === selectedWarehouse)?.warehouseName || "",
      });

      setIsInvoiceOpen(true);

      // reset
      setCart([]);
      setCashReceived("");
      setDiscountValue(0);
      setTxnId("");
      setPaymentMode("cash");
      setUpiApp("gpay");

      setIsAddingNewCustomer(false);
      setSelectedCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
        gstin: "",
        _id: null,
      });

      fetchInventory();
      fetchCustomers();
    } catch (e) {
      console.error("Checkout Error:", e);
      toast.error(e.response?.data?.message || "Checkout failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="flex h-screen bg-[#F8FAFC] p-4 gap-4 overflow-hidden text-slate-900">
      {/* LEFT: CATALOGUE */}
      <div className="w-[60%] bg-white rounded-3xl p-6 shadow-sm flex flex-col border border-slate-200">
        <div className="flex justify-between items-center mb-6 gap-3">
          <div>
            <h2 className="font-black text-xl uppercase tracking-tighter text-slate-900">
              Catalogue
            </h2>
            <p className="text-[11px] text-slate-500 font-bold uppercase">
              Price List: {priceList?.name || "N/A"} | Warehouse:{" "}
              {warehouses.find((w) => w._id === selectedWarehouse)?.warehouseName || "N/A"}
            </p>
          </div>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black uppercase"
          >
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouseName}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            {["all", "lowStock"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[11px] font-black uppercase rounded-lg transition-all ${
                  filter === f ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search item name/code..."
              className="bg-slate-100 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm w-72 outline-none focus:ring-2 focus:ring-blue-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 scrollbar-hide">
          {loading
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl" />
              ))
            : filteredInventories.map((inv) => {
                const isLowStock = inv.quantity <= 5;

                return (
                  <motion.div
                    layout
                    key={inv._id}
                    onClick={() => addToCart(inv)}
                    className={`group border rounded-2xl p-4 cursor-pointer transition-all bg-white hover:border-blue-400 ${
                      isLowStock
                        ? "border-rose-100 bg-rose-50/30"
                        : "border-slate-100 shadow-sm"
                    }`}
                  >
                    <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 font-black text-2xl text-slate-200 uppercase">
                      {getShortCode(inv.item)}
                    </div>

                    <p className="text-[12px] font-black uppercase truncate text-slate-900">
                      {inv.item?.itemName}
                    </p>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex flex-col">
                        <p className="font-black text-sm text-blue-600">
                          ₹{Number(inv.posPrice || 0).toFixed(2)}
                        </p>

                        {Number(inv.posSavingPerUnit || 0) > 0 && (
                          <p className="text-[10px] font-black text-emerald-600 uppercase">
                            Save ₹{Number(inv.posSavingPerUnit || 0).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div
                        className={`px-2 py-1 rounded-lg flex flex-col items-end ${
                          isLowStock
                            ? "text-rose-600 bg-rose-50"
                            : "text-emerald-600 bg-emerald-50"
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase leading-none">
                          Stock
                        </span>
                        <span className="text-[11px] font-black leading-none mt-0.5">
                          {inv.quantity}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>

      {/* RIGHT: CUSTOMER & CART */}
      <div className="w-[40%] flex flex-col gap-4">
        {/* CUSTOMER PANEL */}
        <div
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative"
          ref={dropdownRef}
        >
          {!isAddingNewCustomer ? (
            <div className="relative">
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase">
                  {selectedCustomer.name ? selectedCustomer.name[0] : "?"}
                </div>

                <input
                  className="flex-1 bg-transparent text-sm font-black outline-none uppercase placeholder:text-slate-400"
                  placeholder="Find customer name / mobile"
                  value={selectedCustomer.name}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) =>
                    setSelectedCustomer({
                      ...selectedCustomer,
                      name: e.target.value,
                      _id: null,
                    })
                  }
                />
              </div>

              <AnimatePresence>
                {showCustomerDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 w-full bg-white border mt-2 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto p-1 scrollbar-hide"
                  >
                    {customersMaster
                      .filter(
                        (c) =>
                          (c.name || "")
                            .toLowerCase()
                            .includes(selectedCustomer.name.toLowerCase()) ||
                          (c.mobile || "").includes(selectedCustomer.name)
                      )
                      .map((c) => (
                        <div
                          key={c._id}
                          className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer rounded-xl transition-all flex justify-between items-center"
                          onClick={() => {
                            setSelectedCustomer({
                              name: c.name,
                              phone: c.mobile || c.phone || "",
                              email: c.email || "",
                              gstin: c.gstin || "",
                              _id: c._id,
                              isERP: !!c.isERP,
                            });
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div>
                            <p className="text-xs font-black uppercase text-slate-900">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase">
                              {c.mobile || "No Mobile"}
                            </p>
                          </div>

                          {c.isERP && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-xl font-black uppercase">
                              ERP
                            </span>
                          )}
                        </div>
                      ))}

                    {selectedCustomer.name && !selectedCustomer._id && (
                      <div
                        className="p-3 bg-blue-600 text-white rounded-xl cursor-pointer m-1 text-center shadow-lg"
                        onClick={() => {
                          setIsAddingNewCustomer(true);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <p className="text-xs font-black uppercase tracking-tight">
                          + Create New "{selectedCustomer.name}"
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[11px] font-black uppercase text-blue-600">
                  New Customer
                </h3>
                <button
                  onClick={() => setIsAddingNewCustomer(false)}
                  className="text-[11px] font-black text-slate-500 underline"
                >
                  BACK
                </button>
              </div>

              <input
                type="text"
                placeholder="Mobile"
                className="w-full bg-slate-50 p-3 rounded-xl text-sm font-black outline-none border border-slate-200 placeholder:text-slate-400"
                value={selectedCustomer.phone}
                onChange={(e) =>
                  setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })
                }
              />
            </div>
          )}
        </div>

        {/* CART */}
        <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col border border-slate-200 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
            {cart.map((item) => (
              <div
                key={item.inventoryId}
                className="space-y-1 group border-b border-slate-50 pb-2"
              >
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black uppercase text-slate-900">
                    {item.itemName}
                  </p>

                  <button
                    onClick={() =>
                      setCart(cart.filter((c) => c.inventoryId !== item.inventoryId))
                    }
                    className="text-[10px] text-rose-600 font-black opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    REMOVE
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">
                      Qty
                    </label>
                    <input
                      type="number"
                      className="w-full text-sm font-black text-blue-600 border border-slate-200 rounded-xl px-2 py-2 outline-none"
                      value={item.qty}
                      onChange={(e) =>
                        updateCartItem(item.inventoryId, "qty", e.target.value)
                      }
                    />
                  </div>

                  <span className="mt-6 text-slate-300 font-black text-sm">@</span>

                  <div className="flex-[2]">
                    <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">
                      Rate (PriceList)
                    </label>
                    <input
                      type="number"
                      className="w-full text-sm font-black text-slate-800 border border-slate-200 rounded-xl px-2 py-2 outline-none"
                      value={item.price}
                      onChange={(e) =>
                        updateCartItem(item.inventoryId, "price", e.target.value)
                      }
                    />
                    {Number(item.mrp || 0) > Number(item.price || 0) && (
                      <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">
                        Saving: ₹
                        {(
                          (Number(item.mrp) - Number(item.price)) *
                          Number(item.qty || 0)
                        ).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="text-[9px] font-black text-slate-500 block mb-1 uppercase">
                      GST %
                    </label>
                    <input
                      type="number"
                      className="w-full text-[12px] font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 outline-none"
                      value={item.gstRate}
                      onChange={(e) =>
                        updateCartItem(item.inventoryId, "gstRate", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SUMMARY */}
          <div className="mt-4 pt-4 border-t space-y-2 border-slate-100">
            <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
              <span>Subtotal</span>
              <span>₹{totals.net.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-[11px] font-black text-emerald-600 uppercase tracking-widest">
              <span>Total Saving</span>
              <span>₹{totals.saving.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
              <span>Discount</span>
              <div className="flex gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                <select
                  className="bg-transparent outline-none text-blue-600 font-black"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="amount">₹</option>
                  <option value="percent">%</option>
                </select>

                <input
                  className="w-14 text-right bg-transparent font-black outline-none text-slate-800"
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
              <span>CGST</span>
              <span>₹{totals.cgst.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase border-b pb-2">
              <span>SGST</span>
              <span>₹{totals.sgst.toFixed(2)}</span>
            </div>

            {/* ✅ NEW: STANDARD PAYMENT UI WITH REAL LOGOS */}
            <div className="bg-slate-900 rounded-3xl p-5 mt-2 shadow-2xl text-white">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[11px] font-black uppercase text-slate-400">
                    Total Payable
                  </p>
                  <p className="text-3xl font-black tracking-tight">
                    ₹{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase text-slate-400">
                    Status
                  </p>
                  <p className="text-sm font-black">
                    {paymentMode === "cash" ? "CASH" : "ONLINE"}
                  </p>
                </div>
              </div>

              {/* ✅ Payment Mode Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { key: "cash", label: "Cash" },
                  { key: "upi", label: "UPI" },
                  { key: "card", label: "Card" },
                  { key: "bank", label: "Bank" },
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.key);

                      if (m.key !== "cash") {
                        setCashReceived(String(Number(totals.grand || 0).toFixed(2)));
                      } else {
                        setCashReceived("");
                        setTxnId("");
                      }
                    }}
                    className={`rounded-2xl px-3 py-3 text-center border transition-all ${
                      paymentMode === m.key
                        ? "bg-white text-black border-white"
                        : "bg-slate-800 text-slate-100 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase">{m.label}</p>
                  </button>
                ))}
              </div>

              {/* ✅ UPI APP LOGOS */}
              {paymentMode === "upi" && (
                <div className="mb-3">
                  <p className="text-[11px] font-black uppercase text-slate-400 mb-2">
                    Select UPI App
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "gpay", name: "Google Pay", logo: <GPayLogo /> },
                      { key: "phonepe", name: "PhonePe", logo: <PhonePeLogo /> },
                      { key: "paytm", name: "Paytm", logo: <PaytmLogo /> },
                      { key: "bhim", name: "BHIM UPI", logo: <BHIMLogo /> },
                    ].map((app) => (
                      <button
                        key={app.key}
                        type="button"
                        onClick={() => setUpiApp(app.key)}
                        className={`rounded-2xl p-3 border flex items-center gap-3 transition-all ${
                          upiApp === app.key
                            ? "bg-white text-black border-white"
                            : "bg-slate-800 border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        <IconWrap>{app.logo}</IconWrap>

                        <div className="text-left">
                          <p className="text-sm font-black">{app.name}</p>
                          <p
                            className={`text-[11px] font-black uppercase ${
                              upiApp === app.key ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            Scan & Pay
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ Txn input for Online */}
              {paymentMode !== "cash" && (
                <div className="mb-3">
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                    Txn / Ref No <span className="text-rose-400">*</span>
                  </label>
                  <input
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Enter reference number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-4 text-white font-black text-center outline-none focus:ring-2 ring-blue-500 placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* ✅ Cash input */}
              {paymentMode === "cash" && (
                <div className="mb-3">
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-4 text-white font-black text-center outline-none focus:ring-2 ring-blue-500 placeholder:text-slate-500"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                </div>
              )}

              {/* ✅ Paid / Due / Balance */}
              <div className="flex justify-between mt-4 font-black text-[12px] uppercase border-t border-slate-800 pt-3">
                {paymentMode !== "cash" ? (
                  <>
                    <span className="text-emerald-400">Payment Status</span>
                    <span className="text-emerald-400">PAID</span>
                  </>
                ) : cashReceived !== "" ? (
                  paidAmount >= totals.grand ? (
                    <>
                      <span className="text-emerald-400">Balance Return</span>
                      <span className="text-emerald-400">
                        ₹{balanceReturn.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-rose-400">Due Amount</span>
                      <span className="text-rose-400">₹{due.toFixed(2)}</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="text-slate-500">Waiting...</span>
                    <span className="text-slate-500">--</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className={`w-full py-5 rounded-2xl font-black text-white mt-2 shadow-lg transition-all ${
                cart.length > 0
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  : "bg-slate-200 cursor-not-allowed"
              }`}
            >
              {isProcessing ? "PROCESSING..." : "FINALIZE TRANSACTION"}
            </button>
          </div>
        </div>
      </div>

      <POSInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        data={invoiceData}
      />
    </div>
  );
}




// "use client";

// import { useEffect, useState, useRef, useMemo, useCallback } from "react";
// import axios from "axios";
// import { motion, AnimatePresence } from "framer-motion";
// import POSInvoiceModal from "@/components/pos/POSInvoiceModal";
// import { toast } from "react-toastify";

// export default function POSPage() {
//   const [inventories, setInventories] = useState([]);
//   const [cart, setCart] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [search, setSearch] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [filter, setFilter] = useState("all");

//   const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
//   const [invoiceData, setInvoiceData] = useState(null);

//   // ✅ new for pricelist
//   const [warehouses, setWarehouses] = useState([]);
//   const [selectedWarehouse, setSelectedWarehouse] = useState("");
//   const [priceList, setPriceList] = useState(null);
//   const [priceMap, setPriceMap] = useState({}); // itemId -> sellingPrice

//   const [customersMaster, setCustomersMaster] = useState([]);
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
//   const dropdownRef = useRef(null);

//   const [selectedCustomer, setSelectedCustomer] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     gstin: "",
//     address: "",
//     _id: null,
//     isERP: false,
//   });

//   const [cashReceived, setCashReceived] = useState("");
//   const [discountType, setDiscountType] = useState("amount");
//   const [discountValue, setDiscountValue] = useState(0);

//   const getShortCode = (item) => {
//     if (item?.itemCode) return item.itemCode.substring(0, 2).toUpperCase();
//     if (item?.itemName) return item.itemName.substring(0, 1).toUpperCase();
//     return "?";
//   };

//   /* =========================
//      CLICK OUTSIDE
//   ========================= */
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(e.target))
//         setShowCustomerDropdown(false);
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   /* =========================
//      FETCH WAREHOUSES
//   ========================= */
//   const fetchWarehouses = useCallback(async () => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };

//     try {
//       const res = await axios.get("/api/warehouse", { headers });
//       const list = res.data.data || [];
//       setWarehouses(list);

//       // ✅ default selection: first warehouse
//       if (!selectedWarehouse && list.length) {
//         setSelectedWarehouse(list[0]._id);
//       }
//     } catch (e) {
//       console.error(e);
//       toast.error("Failed to fetch warehouses");
//     }
//   }, [selectedWarehouse]);

//   /* =========================
//      FETCH DEFAULT PRICE LIST
//   ========================= */
//   const fetchDefaultPriceList = useCallback(async () => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };

//     try {
//       const res = await axios.get("/api/pricelist/default", { headers });
//       setPriceList(res.data.data || null);
//     } catch (e) {
//       console.error(e);
//       toast.error("Failed to load default price list");
//     }
//   }, []);

//   /* =========================
//      FETCH PRICELIST ITEM PRICES
//   ========================= */
//   const fetchPriceListPrices = useCallback(async (warehouseId, priceListId) => {
//     const token = localStorage.getItem("token");
//     const headers = { Authorization: `Bearer ${token}` };

//     if (!warehouseId || !priceListId) {
//       setPriceMap({});
//       return;
//     }

//     try {
//       const res = await axios.get(
//         `/api/pricelist/items?priceListId=${priceListId}&warehouseId=${warehouseId}`,
//         { headers }
//       );

//       const map = {};
//       (res.data.data || []).forEach((row) => {
//         map[row.itemId?._id] = {
//           sellingPrice: Number(row.sellingPrice || 0),
//           discountPercent: Number(row.discountPercent || 0),
//           discountAmount: Number(row.discountAmount || 0),
//         };
//       });

//       setPriceMap(map);
//     } catch (e) {
//       console.error(e);
//       setPriceMap({});
//     }
//   }, []);

//   /* =========================
//      FETCH INVENTORY (POS only + warehouse)
//   ========================= */
//   const fetchInventory = useCallback(async () => {
//     const token = localStorage.getItem("token");
//     setLoading(true);

//     try {
//       const url = selectedWarehouse
//         ? `/api/inventory?posOnly=true&warehouseId=${selectedWarehouse}&limit=5000`
//         : `/api/inventory?posOnly=true&limit=5000`;

//       const res = await axios.get(url, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const data = res.data.data || [];

//       // ✅ merge price list into inventory
//       const merged = data.map((inv) => {
//         const itemId = inv?.item?._id;
//         const pl = itemId ? priceMap[itemId] : null;

//         const base = Number(inv?.item?.unitPrice || 0);
//         const plPrice = pl?.sellingPrice > 0 ? pl.sellingPrice : null;

//         const finalPOSPrice = plPrice ?? base;

//         return {
//           ...inv,
//           posPrice: finalPOSPrice,
//           posBasePrice: base,
//           posSavingPerUnit: Math.max(0, base - finalPOSPrice),
//         };
//       });

//       setInventories(merged);
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedWarehouse, priceMap]);

//   /* =========================
//      FETCH CUSTOMERS
//   ========================= */
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
//         ...(erpRes.data.data || []).map((c) => ({
//           ...c,
//           name: c.name || c.customerName,
//           mobile: c.mobile || c.phone,
//           isERP: true,
//         })),
//       ];

//       setCustomersMaster(combined);
//     } catch (e) {
//       console.error(e);
//     }
//   }, []);

//   /* =========================
//      INIT LOAD
//   ========================= */
//   useEffect(() => {
//     fetchWarehouses();
//     fetchDefaultPriceList();
//     fetchCustomers();
//   }, [fetchWarehouses, fetchDefaultPriceList, fetchCustomers]);

//   /* =========================
//      LOAD PRICELIST PRICES WHEN:
//      warehouse OR pricelist changes
//   ========================= */
//   useEffect(() => {
//     if (!selectedWarehouse || !priceList?._id) return;
//     fetchPriceListPrices(selectedWarehouse, priceList._id);
//   }, [selectedWarehouse, priceList?._id, fetchPriceListPrices]);

//   /* =========================
//      REFRESH INVENTORY WHEN:
//      warehouse OR priceMap changes
//   ========================= */
//   useEffect(() => {
//     fetchInventory();
//   }, [fetchInventory]);

//   /* =========================
//      FILTER INVENTORY
//   ========================= */
//   const filteredInventories = useMemo(() => {
//     return inventories.filter((inv) => {
//       const matchesSearch =
//         (inv.item?.itemName || "").toLowerCase().includes(search.toLowerCase()) ||
//         (inv.item?.itemCode || "").toLowerCase().includes(search.toLowerCase());

//       const matchesFilter =
//         filter === "all" || (filter === "lowStock" && inv.quantity > 0 && inv.quantity <= 5);

//       return matchesSearch && matchesFilter;
//     });
//   }, [inventories, filter, search]);

//   /* =========================
//      ADD TO CART (uses pricelist posPrice)
//   ========================= */
//   const addToCart = (inv) => {
//     if (!inv.item || inv.quantity <= 0) return;

//     setCart((prev) => {
//       const existing = prev.find((p) => p.inventoryId === inv._id);

//       if (existing) {
//         if (existing.qty >= inv.quantity) return prev;

//         return prev.map((p) =>
//           p.inventoryId === inv._id ? { ...p, qty: p.qty + 1 } : p
//         );
//       }

//       return [
//         ...prev,
//         {
//           inventoryId: inv._id,
//           itemId: inv.item?._id,

//           itemName: inv.item.itemName,

//           // ✅ price list selling price
//           price: Number(inv.posPrice ?? inv.item.unitPrice) || 0,

//           // ✅ base price for saving view
//           mrp: Number(inv.posBasePrice ?? inv.item.unitPrice) || 0,

//           qty: 1,
//           gstRate: Number(inv.item.gstRate || inv.item.gst) || 0,
//           maxStock: Number(inv.quantity),
//           shortCode: getShortCode(inv.item),
//         },
//       ];
//     });
//   };

//   const updateCartItem = (id, field, value) => {
//     setCart((prev) =>
//       prev.map((item) => {
//         if (item.inventoryId === id) {
//           let val = value === "" ? "" : Number(value);
//           if (field === "qty" && val !== "")
//             val = Math.max(1, Math.min(val, item.maxStock));

//           return { ...item, [field]: val };
//         }
//         return item;
//       })
//     );
//   };

//   /* =========================
//      TOTALS + SAVING
//   ========================= */
//   const totals = useMemo(() => {
//     const net = cart.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

//     // ✅ saving total
//     const saving = cart.reduce((s, i) => {
//       const mrp = Number(i.mrp || i.price || 0);
//       const price = Number(i.price || 0);
//       const qty = Number(i.qty || 0);
//       return s + Math.max(0, (mrp - price) * qty);
//     }, 0);

//     const totalDiscount =
//       discountType === "percent"
//         ? (net * Number(discountValue)) / 100
//         : Number(discountValue);

//     const discountFactor = net > 0 ? (net - totalDiscount) / net : 1;

//     let totalCgst = 0,
//       totalSgst = 0,
//       totalTaxable = 0;

//     cart.forEach((item) => {
//       const itemNet = Number(item.qty) * Number(item.price);
//       const itemTaxable = itemNet * discountFactor;
//       const itemTax = (itemTaxable * (Number(item.gstRate) || 0)) / 100;

//       totalTaxable += itemTaxable;
//       totalCgst += itemTax / 2;
//       totalSgst += itemTax / 2;
//     });

//     const grand = totalTaxable + totalCgst + totalSgst;

//     return {
//       net,
//       discount: totalDiscount,
//       taxable: totalTaxable,
//       cgst: totalCgst,
//       sgst: totalSgst,
//       grand,
//       saving,
//     };
//   }, [cart, discountType, discountValue]);

//   const balance = Math.max((parseFloat(cashReceived) || 0) - totals.grand, 0);

//   /* =========================
//      CHECKOUT
//   ========================= */
//   const handleCheckout = async () => {
//     const token = localStorage.getItem("token");
//     if (!cart.length) return alert("Cart is empty");

//     setIsProcessing(true);

//     try {
//       let currentCustomer = { ...selectedCustomer };

//       // New customer create
//       if (!currentCustomer._id && currentCustomer.name) {
//         const custRes = await axios.post(
//           "/api/pos/customers",
//           {
//             name: currentCustomer.name,
//             mobile: currentCustomer.phone,
//             email: currentCustomer.email,
//             gstin: currentCustomer.gstin,
//           },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         currentCustomer._id = custRes.data.data._id;
//       }

//       const cashRec = parseFloat(cashReceived) || 0;
//       const due = cashRec < totals.grand ? totals.grand - cashRec : 0;
//       const bal = cashRec > totals.grand ? cashRec - totals.grand : 0;

//       const res = await axios.post(
//         "/api/pos/checkout",
//         {
//           customerId: currentCustomer._id || null,

//           // ✅ include warehouse + pricelist info for record
//           warehouseId: selectedWarehouse || null,
//           priceListId: priceList?._id || null,

//           items: cart,

//           discount: { type: discountType, value: discountValue },

//           payment: {
//             received: cashRec,
//             balance: bal,
//           },

//           totals: {
//             netTotal: totals.net,
//             taxableAmount: totals.taxable,
//             cgst: totals.cgst,
//             sgst: totals.sgst,
//             grandTotal: totals.grand,
//             savingTotal: totals.saving, // ✅ optional
//           },
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const finalInvoiceNo = res.data.customInvoiceNo || res.data.invoiceId;

//       setInvoiceData({
//         ...totals,
//         saving: totals.saving,
//         items: [...cart],
//         customer: currentCustomer,
//         invoiceNo: finalInvoiceNo,
//         paymentReceived: cashRec,
//         balanceReturned: bal,
//         dueAmount: due,
//         priceListName: priceList?.name || "",
//         warehouseName:
//           warehouses.find((w) => w._id === selectedWarehouse)?.warehouseName || "",
//       });

//       setIsInvoiceOpen(true);

//       // reset
//       setCart([]);
//       setCashReceived("");
//       setDiscountValue(0);
//       setIsAddingNewCustomer(false);
//       setSelectedCustomer({
//         name: "",
//         email: "",
//         phone: "",
//         address: "",
//         gstin: "",
//         _id: null,
//       });

//       fetchInventory();
//       fetchCustomers();
//     } catch (e) {
//       console.error("Checkout Error:", e);
//       alert(e.response?.data?.message || "Checkout failed.");
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   /* =========================
//      UI
//   ========================= */
//   return (
//     <div className="flex h-screen bg-[#F8FAFC] p-4 gap-4 font-sans overflow-hidden text-slate-800">
//       {/* LEFT: CATALOGUE */}
//       <div className="w-[60%] bg-white rounded-3xl p-6 shadow-sm flex flex-col border border-slate-200">
//         {/* header */}
//         <div className="flex justify-between items-center mb-6 gap-3">
//           <div>
//             <h2 className="font-bold text-xl uppercase tracking-tighter text-slate-900">
//               Catalogue
//             </h2>
//             <p className="text-[10px] text-slate-400 font-black uppercase">
//               Price List: {priceList?.name || "N/A"} | Warehouse:{" "}
//               {warehouses.find((w) => w._id === selectedWarehouse)?.warehouseName ||
//                 "N/A"}
//             </p>
//           </div>

//           {/* ✅ warehouse dropdown */}
//           <select
//             value={selectedWarehouse}
//             onChange={(e) => setSelectedWarehouse(e.target.value)}
//             className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black uppercase"
//           >
//             {warehouses.map((w) => (
//               <option key={w._id} value={w._id}>
//                 {w.warehouseName}
//               </option>
//             ))}
//           </select>

//           <div className="flex bg-slate-100 p-1 rounded-xl">
//             {["all", "lowStock"].map((f) => (
//               <button
//                 key={f}
//                 onClick={() => setFilter(f)}
//                 className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
//                   filter === f
//                     ? "bg-white text-blue-600 shadow-sm"
//                     : "text-slate-400"
//                 }`}
//               >
//                 {f}
//               </button>
//             ))}
//           </div>

//           <div className="relative">
//             <input
//               type="text"
//               placeholder="Search..."
//               className="bg-slate-100 border-none rounded-2xl pl-10 pr-4 py-3 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
//               🔍
//             </span>
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 scrollbar-hide">
//           {loading
//             ? [...Array(6)].map((_, i) => (
//                 <div
//                   key={i}
//                   className="h-40 bg-slate-50 animate-pulse rounded-2xl"
//                 />
//               ))
//             : filteredInventories.map((inv) => {
//                 const isLowStock = inv.quantity <= 5;

//                 return (
//                   <motion.div
//                     layout
//                     key={inv._id}
//                     onClick={() => addToCart(inv)}
//                     className={`group border rounded-2xl p-4 cursor-pointer transition-all bg-white hover:border-blue-400 ${
//                       isLowStock
//                         ? "border-rose-100 bg-rose-50/30"
//                         : "border-slate-100 shadow-sm"
//                     }`}
//                   >
//                     <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 font-black text-2xl text-slate-200 uppercase">
//                       {getShortCode(inv.item)}
//                     </div>

//                     <p className="text-[11px] font-black uppercase truncate">
//                       {inv.item?.itemName}
//                     </p>

//                     <div className="flex justify-between items-center mt-2">
//                       {/* ✅ shows POS pricelist rate */}
//                       <div className="flex flex-col">
//                         <p className="font-black text-sm text-blue-600">
//                           ₹{Number(inv.posPrice || 0).toFixed(2)}
//                         </p>

//                         {Number(inv.posSavingPerUnit || 0) > 0 && (
//                           <p className="text-[9px] font-black text-emerald-600 uppercase">
//                             Save ₹{Number(inv.posSavingPerUnit || 0).toFixed(2)}
//                           </p>
//                         )}
//                       </div>

//                       <div
//                         className={`px-2 py-1 rounded-lg flex flex-col items-end ${
//                           isLowStock
//                             ? "text-rose-500 bg-rose-50"
//                             : "text-emerald-500 bg-emerald-50"
//                         }`}
//                       >
//                         <span className="text-[8px] font-black uppercase leading-none">
//                           Stock
//                         </span>
//                         <span className="text-[10px] font-bold leading-none mt-0.5">
//                           {inv.quantity}
//                         </span>
//                       </div>
//                     </div>
//                   </motion.div>
//                 );
//               })}
//         </div>
//       </div>

//       {/* RIGHT: CUSTOMER & CART */}
//       <div className="w-[40%] flex flex-col gap-4">
//         {/* CUSTOMER PANEL */}
//         <div
//           className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative"
//           ref={dropdownRef}
//         >
//           {!isAddingNewCustomer ? (
//             <div className="relative">
//               <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-transparent focus-within:border-blue-200 transition-all">
//                 <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase">
//                   {selectedCustomer.name ? selectedCustomer.name[0] : "?"}
//                 </div>

//                 <input
//                   className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:text-slate-300"
//                   placeholder="Find Customer..."
//                   value={selectedCustomer.name}
//                   onFocus={() => setShowCustomerDropdown(true)}
//                   onChange={(e) =>
//                     setSelectedCustomer({
//                       ...selectedCustomer,
//                       name: e.target.value,
//                       _id: null,
//                     })
//                   }
//                 />
//               </div>

//               <AnimatePresence>
//                 {showCustomerDropdown && (
//                   <motion.div
//                     initial={{ opacity: 0, y: -5 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     exit={{ opacity: 0, y: -5 }}
//                     className="absolute top-full left-0 w-full bg-white border mt-2 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto p-1 scrollbar-hide"
//                   >
//                     {customersMaster
//                       .filter(
//                         (c) =>
//                           (c.name || "")
//                             .toLowerCase()
//                             .includes(selectedCustomer.name.toLowerCase()) ||
//                           (c.mobile || "").includes(selectedCustomer.name)
//                       )
//                       .map((c) => (
//                         <div
//                           key={c._id}
//                           className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer rounded-xl transition-all flex justify-between items-center"
//                           onClick={() => {
//                             setSelectedCustomer({
//                               name: c.name,
//                               phone: c.mobile || c.phone || "",
//                               email: c.email || "",
//                               gstin: c.gstin || "",
//                               _id: c._id,
//                               isERP: !!c.isERP,
//                             });
//                             setShowCustomerDropdown(false);
//                           }}
//                         >
//                           <div>
//                             <p className="text-xs font-black uppercase text-slate-800">
//                               {c.name}
//                             </p>
//                             <p className="text-[10px] text-slate-400 font-bold italic uppercase">
//                               {c.mobile || "No Mobile"}
//                             </p>
//                           </div>

//                           {c.isERP && (
//                             <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded font-black">
//                               ERP
//                             </span>
//                           )}
//                         </div>
//                       ))}

//                     {selectedCustomer.name && !selectedCustomer._id && (
//                       <div
//                         className="p-3 bg-blue-600 text-white rounded-xl cursor-pointer m-1 text-center shadow-lg"
//                         onClick={() => {
//                           setIsAddingNewCustomer(true);
//                           setShowCustomerDropdown(false);
//                         }}
//                       >
//                         <p className="text-xs font-black uppercase tracking-tight">
//                           + Create New "{selectedCustomer.name}"
//                         </p>
//                       </div>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           ) : (
//             <div className="space-y-3">
//               <div className="flex justify-between items-center">
//                 <h3 className="text-[10px] font-black uppercase text-blue-600">
//                   New Customer
//                 </h3>
//                 <button
//                   onClick={() => setIsAddingNewCustomer(false)}
//                   className="text-[10px] font-bold text-slate-400 underline"
//                 >
//                   BACK
//                 </button>
//               </div>

//               <input
//                 type="text"
//                 placeholder="Mobile"
//                 className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none border border-slate-100"
//                 value={selectedCustomer.phone}
//                 onChange={(e) =>
//                   setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })
//                 }
//               />
//             </div>
//           )}
//         </div>

//         {/* CART */}
//         <div className="bg-white rounded-3xl p-6 shadow-sm flex-1 flex flex-col border border-slate-200 overflow-hidden">
//           <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
//             {cart.map((item) => (
//               <div
//                 key={item.inventoryId}
//                 className="space-y-1 group border-b border-slate-50 pb-2"
//               >
//                 <div className="flex justify-between items-center">
//                   <p className="text-[11px] font-black uppercase text-slate-800">
//                     {item.itemName}
//                   </p>

//                   <button
//                     onClick={() =>
//                       setCart(cart.filter((c) => c.inventoryId !== item.inventoryId))
//                     }
//                     className="text-[10px] text-rose-500 font-black opacity-0 group-hover:opacity-100 transition-opacity"
//                   >
//                     REMOVE
//                   </button>
//                 </div>

//                 <div className="flex items-center gap-3">
//                   <div className="flex-1">
//                     <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
//                       Qty
//                     </label>
//                     <input
//                       type="number"
//                       className="w-full text-sm font-black text-blue-600 border rounded-lg px-2 py-1 outline-none"
//                       value={item.qty}
//                       onChange={(e) => updateCartItem(item.inventoryId, "qty", e.target.value)}
//                     />
//                   </div>

//                   <span className="mt-4 text-slate-300 font-bold text-sm">@</span>

//                   <div className="flex-[2]">
//                     <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
//                       Rate (PriceList)
//                     </label>
//                     <input
//                       type="number"
//                       className="w-full text-sm font-black text-slate-600 border rounded-lg px-2 py-1 outline-none"
//                       value={item.price}
//                       onChange={(e) =>
//                         updateCartItem(item.inventoryId, "price", e.target.value)
//                       }
//                     />

//                     {/* ✅ Saving per line */}
//                     {Number(item.mrp || 0) > Number(item.price || 0) && (
//                       <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">
//                         Saving: ₹
//                         {(
//                           (Number(item.mrp) - Number(item.price)) *
//                           Number(item.qty || 0)
//                         ).toFixed(2)}
//                       </p>
//                     )}
//                   </div>

//                   <div className="flex-1">
//                     <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">
//                       GST %
//                     </label>
//                     <input
//                       type="number"
//                       className="w-full text-[11px] font-black text-slate-400 bg-slate-50 border rounded-lg px-2 py-1 outline-none"
//                       value={item.gstRate}
//                       onChange={(e) =>
//                         updateCartItem(item.inventoryId, "gstRate", e.target.value)
//                       }
//                     />
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* SUMMARY */}
//           <div className="mt-4 pt-4 border-t space-y-1.5 border-slate-100">
//             <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
//               <span>Subtotal</span>
//               <span>₹{totals.net.toLocaleString()}</span>
//             </div>

//             <div className="flex justify-between text-[10px] font-black text-emerald-600 uppercase tracking-widest">
//               <span>Total Saving</span>
//               <span>₹{totals.saving.toFixed(2)}</span>
//             </div>

//             <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
//               <span>Discount</span>
//               <div className="flex gap-1 bg-slate-50 px-2 py-1 rounded-lg">
//                 <select
//                   className="bg-transparent outline-none text-blue-500 font-bold"
//                   value={discountType}
//                   onChange={(e) => setDiscountType(e.target.value)}
//                 >
//                   <option value="amount">₹</option>
//                   <option value="percent">%</option>
//                 </select>

//                 <input
//                   className="w-12 text-right bg-transparent font-black"
//                   type="number"
//                   value={discountValue}
//                   onChange={(e) => setDiscountValue(e.target.value)}
//                 />
//               </div>
//             </div>

//             <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic">
//               <span>CGST Sum</span>
//               <span>₹{totals.cgst.toFixed(2)}</span>
//             </div>

//             <div className="flex justify-between text-[9px] font-medium text-slate-400 uppercase italic border-b pb-1">
//               <span>SGST Sum</span>
//               <span>₹{totals.sgst.toFixed(2)}</span>
//             </div>

//             {/* TOTAL PAYABLE */}
//             <div className="bg-slate-900 rounded-3xl p-5 mt-2 shadow-2xl">
//               <div className="flex justify-between items-center mb-3 text-white">
//                 <span className="text-[10px] font-black uppercase text-slate-400">
//                   Total Payable
//                 </span>
//                 <span className="text-2xl font-black">
//                   ₹{totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                 </span>
//               </div>

//               <input
//                 type="number"
//                 placeholder="CASH RECEIVED"
//                 className="w-full bg-slate-800 border-none rounded-2xl py-3 text-white font-black text-center outline-none focus:ring-2 ring-blue-500 placeholder:text-slate-600"
//                 value={cashReceived}
//                 onChange={(e) => setCashReceived(e.target.value)}
//               />

//               {cashReceived !== "" && (
//                 <div className="flex justify-between mt-4 font-black text-[11px] uppercase border-t border-slate-800 pt-3">
//                   {parseFloat(cashReceived) >= totals.grand ? (
//                     <>
//                       <span className="text-emerald-400">Balance Return</span>
//                       <span className="text-emerald-400">
//                         ₹{(parseFloat(cashReceived) - totals.grand).toFixed(2)}
//                       </span>
//                     </>
//                   ) : (
//                     <>
//                       <span className="text-rose-400">Due Amount</span>
//                       <span className="text-rose-400">
//                         ₹{(totals.grand - parseFloat(cashReceived)).toFixed(2)}
//                       </span>
//                     </>
//                   )}
//                 </div>
//               )}
//             </div>

//             <button
//               onClick={handleCheckout}
//               disabled={cart.length === 0 || isProcessing}
//               className={`w-full py-5 rounded-2xl font-black text-white mt-2 shadow-lg transition-all ${
//                 cart.length > 0
//                   ? "bg-blue-600 hover:bg-blue-700 active:scale-95"
//                   : "bg-slate-200 cursor-not-allowed"
//               }`}
//             >
//               {isProcessing ? "PROCESSING..." : "FINALIZE TRANSACTION"}
//             </button>
//           </div>
//         </div>
//       </div>

//       <POSInvoiceModal
//         isOpen={isInvoiceOpen}
//         onClose={() => setIsInvoiceOpen(false)}
//         data={invoiceData}
//       />
//     </div>
//   );
// }




