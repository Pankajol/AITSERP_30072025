"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import React from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import ReactDOM from "react-dom";
import {
  FaTrash, FaPlus, FaSearch, FaChartLine,
  FaTimes, FaBoxOpen, FaWarehouse,
  FaChevronUp, FaEdit, FaListUl
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";

const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
    return { priceAfterDiscount, totalAmount, gstAmount: cgstAmount + sgstAmount, cgstAmount, sgstAmount, igstAmount: 0 };
  }
  if (item.taxOption === "IGST") {
    let igstRate = parseFloat(item.igstRate);
    if (isNaN(igstRate) || igstRate === 0) igstRate = parseFloat(item.gstRate) || 0;
    const igstAmount = round(totalAmount * (igstRate / 100));
    return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount };
  }
  return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
};

function ItemImage({ src, alt, className = "w-10 h-10" }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);

  if (!src || err) {
    return (
      <div className={`${className} rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`}>
        <FaBoxOpen className="text-gray-300 text-[10px]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Item"}
      className={`${className} object-cover rounded-md border border-gray-200 shrink-0`}
      onError={() => setErr(true)}
    />
  );
}

// ─── Portal: Variant Dropdown ────────────────────────────────────────────────
const VariantPortal = ({ isOpen, buttonRect, variants, onSelect, onClose, itemImageUrl }) => {
  const [dropdownHeight, setDropdownHeight] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      setDropdownHeight(dropdownRef.current.clientHeight);
    }
  }, [isOpen, variants]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !buttonRect) return null;

  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const top = spaceBelow < dropdownHeight + 10
    ? buttonRect.top - dropdownHeight - 5
    : buttonRect.bottom + 5;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 w-80 max-h-60 overflow-y-auto shadow-2xl rounded-xl z-[99999]"
      style={{ top: Math.max(5, top), left: buttonRect.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 bg-gray-50 border-b sticky top-0">Select a variant</div>
      {variants.map(v => (
        <div
          key={v._id}
          onClick={() => { onSelect(v); onClose(); }}
          className="flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
        >
          <ItemImage src={v.imageUrl || itemImageUrl} alt={v.sku} className="w-8 h-8" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-[11px] truncate">{v.sku || 'Variant'}</p>
            {v.attributes && Object.keys(v.attributes).length > 0 && (
              <p className="text-[9px] text-gray-500 truncate">
                {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')}
              </p>
            )}
          </div>
          <p className="text-[9px] font-mono text-indigo-600 whitespace-nowrap">₹{v.price ?? '—'}</p>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─── Portal: Item Search Dropdown ────────────────────────────────────────────
// Renders the search results list in a portal so it is NEVER clipped by
// `overflow:hidden` / `overflow-x:auto` ancestors.
const SearchDropdownPortal = ({ isOpen, inputRect, items, onSelect, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !inputRect) return null;

  const spaceBelow = window.innerHeight - inputRect.bottom;
  const listMaxH = Math.min(224, spaceBelow - 8); // 224 = max-h-56
  const top = listMaxH < 80
    ? inputRect.top - Math.min(224, inputRect.top - 8) - 4
    : inputRect.bottom + 4;

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="fixed bg-white border border-gray-200 shadow-2xl rounded-xl z-[99999] overflow-y-auto"
      style={{ top, left: inputRect.left, width: inputRect.width, maxHeight: listMaxH }}
    >
      {items.map(itm => (
        <div
          key={itm._id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(itm); }}
          className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0"
        >
          <ItemImage src={itm.imageUrl} alt={itm.itemName} className="w-8 h-8" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-[11px] truncate">{itm.itemName}</p>
            <p className="text-[9px] text-gray-400 font-mono">{itm.itemCode}</p>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
};

// ─── "No match" portal tooltip ────────────────────────────────────────────────
const NoMatchPortal = ({ inputRect, text, onAddNew }) => {
  if (!inputRect) return null;
  return ReactDOM.createPortal(
    <div
      className="fixed bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg z-[99999] text-[10px] flex items-center gap-1.5 shadow w-44"
      style={{ top: inputRect.bottom + 4, left: inputRect.left }}
    >
      <span className="text-amber-600">Not found.</span>
      <button
        onMouseDown={(e) => { e.preventDefault(); onAddNew(); }}
        className="text-indigo-600 font-bold underline"
      >
        + Add
      </button>
    </div>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
  const [apiItems, setApiItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filteredVariants, setFilteredVariants] = useState({});
  const [activeSearchIdx, setActiveSearchIdx] = useState(null);   // which row is searching
  const [searchInputRect, setSearchInputRect] = useState(null);   // bounding rect of that input
  const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "", rect: null });
  const [priceResults, setPriceResults] = useState({});
  const [priceLoading, setPriceLoading] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);

  // Variant portal
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalButtonRect, setPortalButtonRect] = useState(null);
  const [portalVariants, setPortalVariants] = useState([]);
  const [portalItemIndex, setPortalItemIndex] = useState(null);
  const [portalItemImageUrl, setPortalItemImageUrl] = useState("");

  // Refs to each search input so we can grab bounding rect on demand
  const searchInputRefs = useRef({});
  // Refs to each "Select variant" button for auto-open positioning
  const variantBtnRefs = useRef({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const [iRes, wRes] = await Promise.all([
          axios.get("/api/items?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const itemData = iRes.data?.success ? iRes.data.data : (Array.isArray(iRes.data) ? iRes.data : []);
        setApiItems(itemData.map(it => ({ ...it, variants: it.variants || [] })));
        const whData = wRes.data?.success ? wRes.data.data : (Array.isArray(wRes.data) ? wRes.data : []);
        setWarehouses(whData);
      } catch (e) { console.error("[ItemSection] fetch error:", e); }
    })();
  }, []);

  const closeSearch = useCallback(() => {
    setActiveSearchIdx(null);
    setSearchInputRect(null);
    setFilteredItems([]);
  }, []);

  const handleNameSearch = (index, value) => {
    onItemChange(index, { target: { name: "itemName", value } });
    setNoMatchInfo({ index: null, text: "", rect: null });

    if (!value) { closeSearch(); return; }

    const f = apiItems.filter(i => (i.itemName || "").toLowerCase().includes(value.toLowerCase()));
    const inputEl = searchInputRefs.current[index];
    const rect = inputEl ? inputEl.getBoundingClientRect() : null;

    if (f.length) {
      setFilteredItems(f);
      setActiveSearchIdx(index);
      setSearchInputRect(rect);
    } else {
      closeSearch();
      setNoMatchInfo({ index, text: value, rect });
    }
  };

  const handleItemSelect = (index, selectedItem) => {
    onItemChange(index, { target: { name: "variant", value: null } });
    const basePrice = parseFloat(selectedItem.unitPrice) || 0;
    const discount = parseFloat(selectedItem.discount) || 0;
    const freight = parseFloat(selectedItem.freight) || 0;
    const taxOption = selectedItem.taxOption || "GST";
    const gstRate = parseFloat(selectedItem.gstRate) || 0;
    const total = 1 * (basePrice - discount) + freight;
    const cgst = round(total * (gstRate / 2 / 100));

    const row = {
      item: selectedItem._id,
      imageUrl: selectedItem.imageUrl || selectedItem.image || "",
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName || "",
      itemDescription: selectedItem.description || "",
      unitPrice: basePrice, discount, freight, quantity: 1,
      taxOption, gstRate,
      igstRate: taxOption === "IGST" ? (selectedItem.igstRate || gstRate) : 0,
      cgstAmount: cgst, sgstAmount: cgst, gstAmount: cgst * 2,
      priceAfterDiscount: basePrice - discount, totalAmount: total,
      isNewItem: false, variant: null,
      warehouse: "", warehouseName: "", warehouseCode: "",
    };
    const variants = selectedItem.variants || [];
    if (variants.length > 0) {
      setFilteredVariants(prev => ({ ...prev, [index]: variants }));
    } else {
      setFilteredVariants(prev => { const s = { ...prev }; delete s[index]; return s; });
    }
    Object.entries(row).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
    if (typeof onItemSelect === "function") { try { onItemSelect(index, selectedItem); } catch (e) { console.warn(e); } }
    closeSearch();
    setNoMatchInfo({ index: null, text: "", rect: null });

    // ── Auto-open variant portal if this item has variants ──
    if (variants.length > 0) {
      // Use a short timeout so the DOM has rendered the variant button ref
      setTimeout(() => {
        const btnEl = variantBtnRefs.current[index];
        const rect = btnEl
          ? btnEl.getBoundingClientRect()
          : searchInputRefs.current[index]?.getBoundingClientRect() || null;
        setPortalButtonRect(rect);
        setPortalVariants(variants);
        setPortalItemIndex(index);
        setPortalItemImageUrl(selectedItem.imageUrl || selectedItem.image || "");
        setPortalOpen(true);
      }, 80);
    }
  };

  const handleVariantSelect = (index, variant) => {
    const item = apiItems.find(i => i._id === items[index]?.item);
    if (!item) return;
    const basePrice = parseFloat(variant.price !== undefined && variant.price !== null ? variant.price : item.unitPrice) || 0;
    const discount = parseFloat(items[index]?.discount) || 0;
    const freight = parseFloat(items[index]?.freight) || 0;
    const taxOption = items[index]?.taxOption || "GST";
    const gstRate = parseFloat(items[index]?.gstRate) || 0;
    const total = 1 * (basePrice - discount) + freight;
    const cgst = round(total * (gstRate / 2 / 100));

    const variantObj = {
      variantId: variant._id, sku: variant.sku || "", attributes: variant.attributes || {},
      variantPrice: basePrice, variantImageUrl: variant.imageUrl || "", variantBarcode: variant.barcode || "",
    };
    const updatedRow = {
      ...items[index],
      unitPrice: basePrice,
      itemCode: variant.sku || item.itemCode,
      itemName: variant.sku ? `${item.itemName} (${variant.sku})` : item.itemName,
      imageUrl: variant.imageUrl || item.imageUrl,
      variant: variantObj,
      priceAfterDiscount: basePrice - discount,
      totalAmount: total,
      cgstAmount: cgst, sgstAmount: cgst, gstAmount: cgst * 2,
    };
    const computed = computeItemValues(updatedRow);
    Object.entries({ ...updatedRow, ...computed }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
    toast.success(`Variant selected: ${variant.sku || "Variant"}`);
  };

  const handleFieldChange = (index, field, value) => {
    const v = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    const u = { ...items[index], [field]: v };
    const c = computeItemValues(u);
    Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
  };

  const handleTaxChange = (index, value) => {
    const u = { ...items[index], taxOption: value };
    if (value === "IGST" && !u.igstRate) u.igstRate = u.gstRate || 0;
    const c = computeItemValues(u);
    Object.entries({ ...u, ...c }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
  };

  const handleGstChange = (index, v) => {
    const u = { ...items[index], gstRate: parseFloat(v) || 0 };
    const c = computeItemValues(u);
    Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
  };

  const handleIgstChange = (index, v) => {
    const u = { ...items[index], igstRate: parseFloat(v) || 0 };
    const c = computeItemValues(u);
    Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
  };

  const comparePrice = async (index, item) => {
    if (!item?.itemName) { toast.error("Select item first"); return; }
    setPriceLoading(p => ({ ...p, [index]: true }));
    try {
      const res = await axios.post("/api/check-price", { itemName: item.itemName });
      setPriceResults(p => ({ ...p, [index]: res.data }));
      toast.success("Price comparison fetched!");
    } catch { toast.error("Error comparing price"); }
    setPriceLoading(p => ({ ...p, [index]: false }));
  };

  const toggleExpand = (index) => setExpandedRow(prev => prev === index ? null : index);

  const openVariantPortal = (e, variants, index, imageUrl) => {
    if (!variants.length) return;
    const rect = e?.currentTarget?.getBoundingClientRect()
      || variantBtnRefs.current[index]?.getBoundingClientRect()
      || null;
    setPortalButtonRect(rect);
    setPortalVariants(variants);
    setPortalItemIndex(index);
    setPortalItemImageUrl(imageUrl);
    setPortalOpen(true);
  };

  const inp = (ro = false, extra = "") =>
    `w-full px-2 py-1.5 rounded-md border text-xs font-medium transition-all outline-none ${extra}
     ${ro ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
          : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ t }) => <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t}</p>;

  const TH = ({ children }) => (
    <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap bg-indigo-600">{children}</th>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {/* overflow-x scroll but NOT clipping portals — portals escape via body */}
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-600">
                <TH>#</TH>
                <TH>Image</TH>
                <TH>Code</TH>
                <TH>Item Name / Variant</TH>
                <TH>Qty</TH>
                <TH>Unit Price</TH>
                {/* Discount & Freight removed from header — moved to expanded panel */}
                <TH>Total</TH>
                <TH>Warehouse</TH>
                <TH>Tax</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const computed = computeItemValues(item);
                const isExpanded = expandedRow === index;
                const isEven = index % 2 === 0;
                const variants = filteredVariants[index] || [];

                return (
                  <React.Fragment key={index}>
                    <tr className={`${isEven ? "bg-white" : "bg-gray-50/40"} ${isExpanded ? "ring-2 ring-inset ring-indigo-300" : ""} hover:bg-indigo-50/20 transition-colors`}>
                      {/* # */}
                      <td className="px-2 py-2 text-center">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-extrabold inline-flex items-center justify-center">{index + 1}</span>
                      </td>

                      {/* Image */}
                      <td className="px-1 py-1.5">
                        <ItemImage src={item.imageUrl} alt={item.itemName} className="w-12 h-12" />
                      </td>

                      {/* Code */}
                      <td className="px-1 py-1.5">
                        <input
                          className={inp()}
                          type="text"
                          value={item.itemCode ?? ""}
                          onChange={e => onItemChange(index, { target: { name: "itemCode", value: e.target.value } })}
                          placeholder="Code"
                        />
                      </td>

                      {/* Item Name — search input; dropdown via portal */}
                      <td className="px-1 py-1.5">
                        <div className="relative">
                          <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-200 text-[8px] pointer-events-none z-10" />
                          <input
                            ref={el => { searchInputRefs.current[index] = el; }}
                            className={`${inp()} pl-5`}
                            type="text"
                            value={item.itemName ?? ""}
                            onChange={e => handleNameSearch(index, e.target.value)}
                            onFocus={() => {
                              // If there's already a value and items, re-open dropdown
                              if (item.itemName) {
                                const f = apiItems.filter(i => (i.itemName || "").toLowerCase().includes((item.itemName || "").toLowerCase()));
                                if (f.length) {
                                  const rect = searchInputRefs.current[index]?.getBoundingClientRect() || null;
                                  setFilteredItems(f);
                                  setActiveSearchIdx(index);
                                  setSearchInputRect(rect);
                                }
                              }
                            }}
                            onBlur={() => {
                              // Small delay to allow portal item click to fire first
                              setTimeout(() => closeSearch(), 150);
                            }}
                            placeholder="Search item…"
                          />
                        </div>
                        {variants.length > 0 && (
                          <button
                            ref={el => { variantBtnRefs.current[index] = el; }}
                            type="button"
                            onClick={(e) => openVariantPortal(e, variants, index, item.imageUrl)}
                            className="mt-1 text-[9px] text-indigo-600 underline hover:text-indigo-800 flex items-center gap-1"
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            Select variant
                          </button>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-1 py-1.5">
                        <input className={inp()} type="number" value={item.quantity ?? 0} onChange={e => handleFieldChange(index, "quantity", e.target.value)} onFocus={e => e.target.select()} />
                      </td>

                      {/* Unit Price */}
                      <td className="px-1 py-1.5">
                        <input className={inp()} type="number" value={item.unitPrice ?? 0} onChange={e => handleFieldChange(index, "unitPrice", e.target.value)} onFocus={e => e.target.select()} />
                      </td>

                      {/* Total (Discount & Freight moved to expanded row) */}
                      <td className="px-1 py-1.5">
                        <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-right whitespace-nowrap">
                          ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {/* Mini discount/freight badge so user can see at a glance */}
                        {(Number(item.discount) > 0 || Number(item.freight) > 0) && (
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {Number(item.discount) > 0 && (
                              <span className="text-[8px] bg-rose-50 text-rose-400 border border-rose-100 rounded px-1">-₹{item.discount}</span>
                            )}
                            {Number(item.freight) > 0 && (
                              <span className="text-[8px] bg-sky-50 text-sky-400 border border-sky-100 rounded px-1">+₹{item.freight} freight</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Warehouse */}
                      <td className="px-1 py-1.5">
                        <div className="relative">
                          <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px]" />
                          <select
                            className={`${inp()} pl-6 appearance-none cursor-pointer bg-white`}
                            value={item.warehouse || ""}
                            onChange={(e) => {
                              const whId = e.target.value;
                              const warehouse = warehouses.find(w => w._id === whId);
                              onItemChange(index, { target: { name: "warehouse", value: whId } });
                              onItemChange(index, { target: { name: "warehouseName", value: warehouse?.warehouseName || "" } });
                              onItemChange(index, { target: { name: "warehouseCode", value: warehouse?.warehouseCode || "" } });
                            }}
                          >
                            <option value="">Select Warehouse</option>
                            {warehouses.map(wh => <option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>)}
                          </select>
                        </div>
                        {!item.warehouse && <p className="text-[8px] text-amber-500 mt-0.5">Required</p>}
                      </td>

                      {/* Tax */}
                      <td className="px-1 py-1.5">
                        <div className="text-[9px] text-gray-500 leading-tight">
                          <span className={`font-bold ${item.taxOption === "IGST" ? "text-orange-500" : "text-blue-500"}`}>{item.taxOption || "GST"}</span>
                          <span className="ml-1 text-gray-400">{item.gstRate || 0}%</span>
                          <div className="text-[9px] text-gray-400 font-mono whitespace-nowrap">
                            {item.taxOption === "IGST" ? `₹${computed.igstAmount || 0}` : `₹${computed.cgstAmount || 0}+₹${computed.sgstAmount || 0}`}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-1 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(index)}
                            title={isExpanded ? "Collapse" : "Edit details (Discount, Freight, Tax…)"}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}
                          >
                            {isExpanded ? <FaChevronUp className="text-[8px]" /> : <FaEdit className="text-[8px]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(index)}
                            className="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                          >
                            <FaTrash className="text-[8px]" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <tr key={`expand-${index}`}>
                        <td colSpan={10} className="p-0 border-t-0">
                          <div className="bg-indigo-50/30 border-t-2 border-indigo-200 px-4 py-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">{index + 1}</div>
                              <ItemImage src={item.imageUrl} alt={item.itemName} className="w-8 h-8" />
                              {item.variant?.sku && <FaListUl className="text-indigo-400 text-[10px]" />}
                              <p className="text-xs font-bold text-indigo-700">{item.itemName || "Item details"}</p>
                              <button type="button" onClick={() => setExpandedRow(null)} className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium transition-colors">
                                <FaChevronUp className="text-[8px]" /> Collapse
                              </button>
                            </div>

                            {/* Description */}
                            <div>
                              <Lbl t="Description" />
                              <input className={inp()} type="text" name="itemDescription" value={item.itemDescription ?? ""} onChange={e => onItemChange(index, e)} placeholder="Item description…" onFocus={e => e.target.select()} />
                            </div>

                            {/* ── Discount & Freight (moved here from table) ── */}
                            <div className="bg-rose-50/60 rounded-xl border border-rose-100 p-3">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-rose-400 mb-2">Pricing Adjustments</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <Lbl t="Discount (₹)" />
                                  <input
                                    className={inp()}
                                    type="number"
                                    value={item.discount ?? 0}
                                    onChange={e => handleFieldChange(index, "discount", e.target.value)}
                                    onFocus={e => e.target.select()}
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <Lbl t="Freight (₹)" />
                                  <input
                                    className={inp()}
                                    type="number"
                                    value={item.freight ?? 0}
                                    onChange={e => handleFieldChange(index, "freight", e.target.value)}
                                    onFocus={e => e.target.select()}
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <Lbl t="Price After Discount" />
                                  <input className={inp(true)} type="number" value={computed.priceAfterDiscount} readOnly />
                                </div>
                                <div>
                                  <Lbl t="Total Amount" />
                                  <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs text-right">
                                    ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tax Details */}
                            <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500 mb-2">Tax Details</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                <div>
                                  <Lbl t="Tax Type" />
                                  <select className={inp()} value={item.taxOption || "GST"} onChange={e => handleTaxChange(index, e.target.value)}>
                                    <option value="GST">GST</option>
                                    <option value="IGST">IGST</option>
                                  </select>
                                </div>
                                {(item.taxOption === "GST" || !item.taxOption) && (
                                  <>
                                    <div><Lbl t="GST %" /><input className={inp()} type="number" value={item.gstRate ?? 0} onChange={e => handleGstChange(index, e.target.value)} onFocus={e => e.target.select()} /></div>
                                    <div><Lbl t="GST ₹" /><input className={inp(true)} type="number" value={computed.gstAmount} readOnly /></div>
                                    <div><Lbl t="CGST ₹" /><input className={inp(true)} type="number" value={computed.cgstAmount} readOnly /></div>
                                    <div><Lbl t="SGST ₹" /><input className={inp(true)} type="number" value={computed.sgstAmount} readOnly /></div>
                                  </>
                                )}
                                {item.taxOption === "IGST" && (
                                  <>
                                    <div><Lbl t="IGST %" /><input className={inp()} type="number" value={item.igstRate ?? 0} onChange={e => handleIgstChange(index, e.target.value)} onFocus={e => e.target.select()} /></div>
                                    <div><Lbl t="IGST ₹" /><input className={inp(true)} type="number" value={computed.igstAmount} readOnly /></div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Warehouse */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="relative">
                                <Lbl t="Warehouse" />
                                <div className="relative">
                                  <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px]" />
                                  <select
                                    className={`${inp()} pl-6 appearance-none cursor-pointer bg-white`}
                                    value={item.warehouse || ""}
                                    onChange={(e) => {
                                      const whId = e.target.value;
                                      const warehouse = warehouses.find(w => w._id === whId);
                                      onItemChange(index, { target: { name: "warehouse", value: whId } });
                                      onItemChange(index, { target: { name: "warehouseName", value: warehouse?.warehouseName || "" } });
                                      onItemChange(index, { target: { name: "warehouseCode", value: warehouse?.warehouseCode || "" } });
                                    }}
                                  >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(wh => <option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <Lbl t="Status" />
                                <div className="px-2 py-1.5 rounded-md bg-gray-50 text-gray-600 text-xs">
                                  {item.warehouseName ? `Assigned to ${item.warehouseName}` : "No warehouse assigned"}
                                </div>
                              </div>
                            </div>

                            {/* AI Price Compare */}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => comparePrice(index, item)}
                                  disabled={priceLoading[index]}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-all disabled:opacity-60 shadow-sm shadow-violet-200"
                                >
                                  {priceLoading[index]
                                    ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Fetching…</>
                                    : <><FaChartLine className="text-[9px]" /> Compare Market Price</>}
                                </button>
                                {priceResults[index] && (
                                  <button
                                    type="button"
                                    onClick={() => setPriceResults(p => { const n = { ...p }; delete n[index]; return n; })}
                                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <FaTimes className="text-[9px]" /> Clear
                                  </button>
                                )}
                              </div>
                              {priceResults[index] && (
                                <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 mb-2">
                                    <HiSparkles className="text-violet-500" /> AI Price — <span className="font-normal text-violet-400">{item.itemName}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {priceResults[index].market?.map((m, i) => (
                                      <div key={i} className="bg-white rounded-lg border border-violet-100 px-3 py-1.5 min-w-[90px]">
                                        <p className="text-[9px] font-bold uppercase text-gray-400">{m.source || `Source ${i + 1}`}</p>
                                        <p className="text-sm font-extrabold text-gray-800">₹{m.price || "N/A"}</p>
                                      </div>
                                    ))}
                                    {priceResults[index].ai && (
                                      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl px-3 py-2 text-white">
                                        <p className="text-[9px] font-bold uppercase text-violet-200">AI Suggested</p>
                                        <p className="text-lg font-extrabold">₹{priceResults[index].ai.recommendedSellingPrice}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center">
                    <div className="text-3xl opacity-20 mb-2">📦</div>
                    <p className="text-xs text-gray-300 font-medium">No items added yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Button */}
      <button
        type="button"
        onClick={onAddItem}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center"
      >
        <FaPlus className="text-xs" /> Add Item Row
      </button>

      {/* ── Portals ── */}

      {/* Item search dropdown — portal so it's never clipped */}
      <SearchDropdownPortal
        isOpen={activeSearchIdx !== null && filteredItems.length > 0}
        inputRect={searchInputRect}
        items={filteredItems}
        onSelect={(itm) => handleItemSelect(activeSearchIdx, itm)}
        onClose={closeSearch}
      />

      {/* No-match add tooltip — portal */}
      {noMatchInfo.index !== null && noMatchInfo.rect && (
        <NoMatchPortal
          inputRect={noMatchInfo.rect}
          text={noMatchInfo.text}
          onAddNew={() => {
            const index = noMatchInfo.index;
            Object.entries({
              ...items[index],
              itemName: items[index]?.itemName || noMatchInfo.text,
              isNewItem: true,
            }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
            setNoMatchInfo({ index: null, text: "", rect: null });
          }}
        />
      )}

      {/* Variant dropdown — portal */}
      <VariantPortal
        isOpen={portalOpen}
        buttonRect={portalButtonRect}
        variants={portalVariants}
        onSelect={(variant) => handleVariantSelect(portalItemIndex, variant)}
        onClose={() => setPortalOpen(false)}
        itemImageUrl={portalItemImageUrl}
      />
    </div>
  );
};

ItemSection.propTypes = {
  items: PropTypes.array.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onAddItem: PropTypes.func,
  onRemoveItem: PropTypes.func,
  onItemSelect: PropTypes.func,
};

export default ItemSection;


// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import React from "react";
// import PropTypes from "prop-types";
// import { toast } from "react-toastify";
// import {
//   FaTrash, FaPlus, FaSearch, FaChartLine,
//   FaTimes, FaBoxOpen, FaWarehouse,
//   FaChevronUp, FaEdit, FaListUl
// } from "react-icons/fa";
// import { HiSparkles } from "react-icons/hi";

// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     return { priceAfterDiscount, totalAmount, gstAmount: cgstAmount + sgstAmount, cgstAmount, sgstAmount, igstAmount: 0 };
//   }
//   if (item.taxOption === "IGST") {
//     let igstRate = parseFloat(item.igstRate);
//     if (isNaN(igstRate) || igstRate === 0) igstRate = parseFloat(item.gstRate) || 0;
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount };
//   }
//   return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
// };

// function ItemImage({ src, alt, className = "w-10 h-10" }) {
//   const [err, setErr] = useState(false);
//   useEffect(() => { setErr(false); }, [src]);

//   if (!src || err) {
//     return (
//       <div className={`${className} rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`}>
//         <FaBoxOpen className="text-gray-300 text-[10px]" />
//       </div>
//     );
//   }
//   return (
//     <img
//       src={src}
//       alt={alt || "Item"}
//       className={`${className} object-cover rounded-md border border-gray-200 shrink-0`}
//       onError={() => setErr(true)}
//     />
//   );
// }

// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [filteredVariants, setFilteredVariants] = useState({});
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [showVariantDropdown, setShowVariantDropdown] = useState({});
//   const [activeIdx, setActiveIdx] = useState(null);
//   const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "" });
//   const [priceResults, setPriceResults] = useState({});
//   const [priceLoading, setPriceLoading] = useState({});
//   const [expandedRow, setExpandedRow] = useState(null);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     (async () => {
//       try {
//         const [iRes, wRes] = await Promise.all([
//           axios.get("/api/items?limit=1000", { headers: { Authorization: `Bearer ${token}` } }),
//           axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const itemData = iRes.data?.success
//           ? iRes.data.data
//           : Array.isArray(iRes.data) ? iRes.data : [];

//         const itemsWithVariants = itemData.map(it => ({ ...it, variants: it.variants || [] }));
//         setApiItems(itemsWithVariants);
//         const whData = wRes.data?.success
//           ? wRes.data.data
//           : Array.isArray(wRes.data) ? wRes.data : [];
//         setWarehouses(whData);
//       } catch (e) { console.error("[ItemSection] fetch error:", e); }
//     })();
//   }, []);

//   const handleNameSearch = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });
//     if (!value) { 
//       setShowDropdown(false); 
//       setNoMatchInfo({ index: null, text: "" }); 
//       return; 
//     }
//     const f = apiItems.filter(i => (i.itemName || "").toLowerCase().includes(value.toLowerCase()));
//     if (f.length) { 
//       setFilteredItems(f); 
//       setShowDropdown(true); 
//       setActiveIdx(index); 
//       setNoMatchInfo({ index: null, text: "" }); 
//     } else { 
//       setShowDropdown(false); 
//       setNoMatchInfo({ index, text: value }); 
//     }
//   };

//   const handleItemSelect = (index, selectedItem) => {
//     onItemChange(index, { target: { name: "variant", value: null } });
//     const basePrice = parseFloat(selectedItem.unitPrice) || 0;
//     const discount = parseFloat(selectedItem.discount) || 0;
//     const freight = parseFloat(selectedItem.freight) || 0;
//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = parseFloat(selectedItem.gstRate) || 0;
//     const total = 1 * (basePrice - discount) + freight;
//     const cgst = round(total * (gstRate / 2 / 100));

//     const row = {
//       item: selectedItem._id,
//       imageUrl: selectedItem.imageUrl || selectedItem.image || "",
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName || "",
//       itemDescription: selectedItem.description || "",
//       unitPrice: basePrice,
//       discount,
//       freight,
//       quantity: 1,
//       taxOption,
//       gstRate,
//       igstRate: taxOption === "IGST" ? (selectedItem.igstRate || gstRate) : 0,
//       cgstAmount: cgst,
//       sgstAmount: cgst,
//       gstAmount: cgst * 2,
//       priceAfterDiscount: basePrice - discount,
//       totalAmount: total,
//       isNewItem: false,
//       variant: null,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//     };

//     const variants = selectedItem.variants || [];
//     if (variants.length > 0) {
//       setFilteredVariants(prev => ({ ...prev, [index]: variants }));
//       setShowVariantDropdown(prev => ({ ...prev, [index]: true }));
//       toast.info("This item has variants. Please select a variant.");
//     } else {
//       setFilteredVariants(prev => {
//         const newState = { ...prev };
//         delete newState[index];
//         return newState;
//       });
//       setShowVariantDropdown(prev => ({ ...prev, [index]: false }));
//     }

//     Object.entries(row).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//     if (typeof onItemSelect === "function") { 
//       try { onItemSelect(index, selectedItem); } catch(e) { console.warn(e); } 
//     }
//     setShowDropdown(false);
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleVariantSelect = (index, variant) => {
//     const item = apiItems.find(i => i._id === items[index]?.item);
//     if (!item) return;
//     const basePrice = parseFloat(variant.price !== undefined && variant.price !== null ? variant.price : item.unitPrice) || 0;
//     const discount = parseFloat(items[index]?.discount) || 0;
//     const freight = parseFloat(items[index]?.freight) || 0;
//     const taxOption = items[index]?.taxOption || "GST";
//     const gstRate = parseFloat(items[index]?.gstRate) || 0;
//     const total = 1 * (basePrice - discount) + freight;
//     const cgst = round(total * (gstRate / 2 / 100));

//     const variantObj = {
//       variantId: variant._id,
//       sku: variant.sku || "",
//       attributes: variant.attributes || {},
//       variantPrice: basePrice,
//       variantImageUrl: variant.imageUrl || "",
//       variantBarcode: variant.barcode || "",
//     };

//     const updatedRow = {
//       ...items[index],
//       unitPrice: basePrice,
//       itemCode: variant.sku || item.itemCode,
//       itemName: variant.sku ? `${item.itemName} (${variant.sku})` : item.itemName,
//       imageUrl: variant.imageUrl || item.imageUrl,
//       variant: variantObj,
//       priceAfterDiscount: basePrice - discount,
//       totalAmount: total,
//       cgstAmount: cgst,
//       sgstAmount: cgst,
//       gstAmount: cgst * 2,
//     };
//     const computed = computeItemValues(updatedRow);
//     Object.entries({ ...updatedRow, ...computed }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//     setShowVariantDropdown(prev => ({ ...prev, [index]: false }));
//     toast.success(`Variant selected: ${variant.sku || "Variant"}`);
//   };

//   const handleFieldChange = (index, field, value) => {
//     const v = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const u = { ...items[index], [field]: v };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const handleTaxChange = (index, value) => {
//     const u = { ...items[index], taxOption: value };
//     if (value === "IGST" && !u.igstRate) u.igstRate = u.gstRate || 0;
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//   };

//   const handleGstChange = (index, v) => {
//     const u = { ...items[index], gstRate: parseFloat(v) || 0 };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const handleIgstChange = (index, v) => {
//     const u = { ...items[index], igstRate: parseFloat(v) || 0 };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const comparePrice = async (index, item) => {
//     if (!item?.itemName) { toast.error("Select item first"); return; }
//     setPriceLoading(p => ({ ...p, [index]: true }));
//     try {
//       const res = await axios.post("/api/check-price", { itemName: item.itemName });
//       setPriceResults(p => ({ ...p, [index]: res.data }));
//       toast.success("Price comparison fetched!");
//     } catch { 
//       toast.error("Error comparing price"); 
//     }
//     setPriceLoading(p => ({ ...p, [index]: false }));
//   };

//   const toggleExpand = (index) => setExpandedRow(prev => prev === index ? null : index);

//   const inp = (ro = false, extra = "") =>
//     `w-full px-2 py-1.5 rounded-md border text-xs font-medium transition-all outline-none ${extra}
//      ${ro ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
//           : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-gray-300"}`;

//   const Lbl = ({ t }) => <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t}</p>;

//   const TH = ({ children }) => (
//     <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap bg-indigo-600">
//       {children}
//     </th>
//   );

//   return (
//     <div className="space-y-3">
//       <div className="rounded-xl border border-gray-200 overflow-visible">
//         <div className="overflow-x-auto">
//           <table className="min-w-[1200px] w-full border-collapse text-xs">
//             <colgroup>
//               <col style={{width:"40px"}} />
//               <col style={{width:"60px"}} />
//               <col style={{width:"90px"}} />
//               <col style={{width:"180px"}} />
//               <col style={{width:"70px"}} />
//               <col style={{width:"100px"}} />
//               <col style={{width:"80px"}} />
//               <col style={{width:"80px"}} />
//               <col style={{width:"100px"}} />
//               <col style={{width:"130px"}} />
//               <col style={{width:"100px"}} />
//               <col style={{width:"80px"}} />
//             </colgroup>
//             <thead>
//               <tr className="bg-indigo-600">
//                 <TH>#</TH>
//                 <TH>Image</TH>
//                 <TH>Code</TH>
//                 <TH>Item Name / Variant</TH>
//                 <TH className="text-right">Qty</TH>
//                 <TH className="text-right">Unit Price</TH>
//                 <TH className="text-right">Discount</TH>
//                 <TH className="text-right">Freight</TH>
//                 <TH className="text-right">Total</TH>
//                 <TH>Warehouse</TH>
//                 <TH>Tax</TH>
//                 <TH>Actions</TH>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100">
//               {items.map((item, index) => {
//                 const computed = computeItemValues(item);
//                 const isExpanded = expandedRow === index;
//                 const isEven = index % 2 === 0;
//                 const variants = filteredVariants[index] || [];
//                 const showVarDropdown = showVariantDropdown[index];

//                 return (
//                   <React.Fragment key={index}>
//                     <tr className={`${isEven ? "bg-white" : "bg-gray-50/40"} ${isExpanded ? "ring-2 ring-inset ring-indigo-300" : ""} hover:bg-indigo-50/20 transition-colors`}>
//                       <td className="px-2 py-2 text-center">
//                         <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-extrabold inline-flex items-center justify-center">
//                           {index + 1}
//                         </span>
//                        </td>
//                       <td className="px-1 py-1.5">
//                         <ItemImage src={item.imageUrl} alt={item.itemName} className="w-12 h-12" />
//                        </td>
//                       <td className="px-1 py-1.5">
//                         <input
//                           className={inp()}
//                           type="text"
//                           value={item.itemCode ?? ""}
//                           onChange={e => onItemChange(index, { target: { name: "itemCode", value: e.target.value } })}
//                           placeholder="Code"
//                         />
//                        </td>
//                       <td className="px-1 py-1.5 relative">
//                         <div className="relative">
//                           <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-200 text-[8px] pointer-events-none" />
//                           <input
//                             className={`${inp()} pl-5`}
//                             type="text"
//                             value={item.itemName ?? ""}
//                             onChange={e => handleNameSearch(index, e.target.value)}
//                             placeholder="Search item…"
//                           />
//                         </div>
//                         {showDropdown && activeIdx === index && (
//                           <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 w-64 max-h-56 overflow-y-auto shadow-2xl rounded-xl z-50">
//                             {filteredItems.map(itm => (
//                               <div key={itm._id} onClick={() => handleItemSelect(index, itm)}
//                                 className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
//                                 <ItemImage src={itm.imageUrl} alt={itm.itemName} className="w-8 h-8" />
//                                 <div className="min-w-0">
//                                   <p className="font-semibold text-gray-800 text-[11px] truncate">{itm.itemName}</p>
//                                   <p className="text-[9px] text-gray-400 font-mono">{itm.itemCode}</p>
//                                   {itm.variants?.length > 0 && <span className="text-[8px] text-amber-500">⚠️ Variants available</span>}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         {showVarDropdown && variants.length > 0 && activeIdx === index && (
//                           <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 w-72 max-h-56 overflow-y-auto shadow-2xl rounded-xl z-50">
//                             <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-50 border-b">Select a variant</div>
//                             {variants.map(v => (
//                               <div key={v._id} onClick={() => handleVariantSelect(index, v)}
//                                 className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
//                                 <ItemImage src={v.imageUrl || item.imageUrl} alt={v.sku} className="w-8 h-8" />
//                                 <div className="min-w-0 flex-1">
//                                   <p className="font-semibold text-gray-800 text-[11px]">{v.sku || "Variant"}</p>
//                                   {v.attributes && Object.keys(v.attributes).length > 0 && (
//                                     <p className="text-[9px] text-gray-500">
//                                       {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(", ")}
//                                     </p>
//                                   )}
//                                   <p className="text-[9px] font-mono text-indigo-600">₹{v.price !== undefined ? v.price : item.unitPrice}</p>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                         {noMatchInfo.index === index && (
//                           <div className="absolute top-full left-0 mt-0.5 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg z-50 text-[10px] flex items-center gap-1.5 shadow w-44">
//                             <span className="text-amber-600">Not found.</span>
//                             <button className="text-indigo-600 font-bold underline" onClick={() => {
//                               const cur = items[index] || {};
//                               Object.entries({ ...cur, itemName: cur.itemName || noMatchInfo.text, isNewItem: true })
//                                 .forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//                               setNoMatchInfo({ index: null, text: "" });
//                             }}>+ Add</button>
//                           </div>
//                         )}
//                        </td>
//                       <td className="px-1 py-1.5 text-right">
//                         <input className={inp()} type="number" value={item.quantity ?? 0} onChange={e => handleFieldChange(index, "quantity", e.target.value)} onFocus={(e) => e.target.select()} />
//                        </td>
//                       <td className="px-1 py-1.5 text-right">
//                         <input className={inp()} type="number" value={item.unitPrice ?? 0} onChange={e => handleFieldChange(index, "unitPrice", e.target.value)} onFocus={(e) => e.target.select()} />
//                        </td>
//                       <td className="px-1 py-1.5 text-right">
//                         <input className={inp()} type="number" value={item.discount ?? 0} onChange={e => handleFieldChange(index, "discount", e.target.value)} onFocus={(e) => e.target.select()} />
//                        </td>
//                       <td className="px-1 py-1.5 text-right">
//                         <input className={inp()} type="number" value={item.freight ?? 0} onChange={e => handleFieldChange(index, "freight", e.target.value)} onFocus={(e) => e.target.select()} />
//                        </td>
//                       <td className="px-1 py-1.5 text-right">
//                         <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-right">
//                           ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                         </div>
//                        </td>
//                       <td className="px-1 py-1.5">
//                         <div className="relative">
//                           <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px]" />
//                           <select
//                             className={`${inp()} pl-6 appearance-none cursor-pointer bg-white`}
//                             value={item.warehouse || ""}
//                             onChange={(e) => {
//                               const whId = e.target.value;
//                               const warehouse = warehouses.find(w => w._id === whId);
//                               onItemChange(index, { target: { name: "warehouse", value: whId } });
//                               onItemChange(index, { target: { name: "warehouseName", value: warehouse?.warehouseName || "" } });
//                               onItemChange(index, { target: { name: "warehouseCode", value: warehouse?.warehouseCode || "" } });
//                             }}
//                           >
//                             <option value="">Select Warehouse</option>
//                             {warehouses.map(wh => (
//                               <option key={wh._id} value={wh._id}>
//                                 {wh.warehouseName} ({wh.warehouseCode})
//                               </option>
//                             ))}
//                           </select>
//                         </div>
//                         {!item.warehouse && (
//                           <p className="text-[8px] text-amber-500 mt-0.5">Required</p>
//                         )}
//                        </td>
//                       <td className="px-1 py-1.5">
//                         <div className="text-[9px] text-gray-500 leading-tight">
//                           <span className={`font-bold ${item.taxOption === "IGST" ? "text-orange-500" : "text-blue-500"}`}>
//                             {item.taxOption || "GST"}
//                           </span>
//                           <span className="ml-1 text-gray-400">{item.gstRate || 0}%</span>
//                           <div className="text-[9px] text-gray-400 font-mono whitespace-nowrap">
//                             {item.taxOption === "IGST"
//                               ? `₹${computed.igstAmount || 0}`
//                               : `₹${computed.cgstAmount || 0}+₹${computed.sgstAmount || 0}`}
//                           </div>
//                         </div>
//                        </td>
//                       <td className="px-1 py-1.5 text-center">
//                         <div className="flex items-center justify-center gap-1">
//                           <button type="button" onClick={() => toggleExpand(index)}
//                             className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
//                               ${isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}>
//                             {isExpanded ? <FaChevronUp className="text-[8px]" /> : <FaEdit className="text-[8px]" />}
//                           </button>
//                           <button type="button" onClick={() => onRemoveItem(index)}
//                             className="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                             <FaTrash className="text-[8px]" />
//                           </button>
//                         </div>
//                        </td>
//                     </tr>

//                     {isExpanded && (
//                       <tr key={`expand-${index}`}>
//                         <td colSpan={12} className="p-0 border-t-0">
//                           <div className="bg-indigo-50/30 border-t-2 border-indigo-200 px-4 py-4 space-y-3">
//                             <div className="flex items-center gap-2 mb-1">
//                               <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">{index + 1}</div>
//                               <ItemImage src={item.imageUrl} alt={item.itemName} className="w-8 h-8" />
//                               {item.variant?.sku && <FaListUl className="text-indigo-400 text-[10px]" />}
//                               <p className="text-xs font-bold text-indigo-700">{item.itemName || "Item details"}</p>
//                               <button type="button" onClick={() => setExpandedRow(null)}
//                                 className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium transition-colors">
//                                 <FaChevronUp className="text-[8px]" /> Collapse
//                               </button>
//                             </div>

//                             <div>
//                               <Lbl t="Description" />
//                               <input className={inp()} type="text" name="itemDescription" value={item.itemDescription ?? ""} onChange={e => onItemChange(index, e)} placeholder="Item description…" onFocus={(e) => e.target.select()} />
//                             </div>

//                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                               <div>
//                                 <Lbl t="Price After Discount" />
//                                 <input className={inp(true)} type="number" value={computed.priceAfterDiscount} readOnly />
//                               </div>
//                               <div>
//                                 <Lbl t="Total Amount" />
//                                 <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs text-right">
//                                   ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                                 </div>
//                               </div>
//                             </div>

//                             <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3">
//                               <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500 mb-2">Tax Details</p>
//                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
//                                 <div>
//                                   <Lbl t="Tax Type" />
//                                   <select className={inp()} value={item.taxOption || "GST"} onChange={e => handleTaxChange(index, e.target.value)}>
//                                     <option value="GST">GST</option>
//                                     <option value="IGST">IGST</option>
//                                   </select>
//                                 </div>
//                                 {(item.taxOption === "GST" || !item.taxOption) && (
//                                   <>
//                                     <div><Lbl t="GST %" /><input className={inp()} type="number" value={item.gstRate ?? 0} onChange={e => handleGstChange(index, e.target.value)} onFocus={(e) => e.target.select()} /></div>
//                                     <div><Lbl t="GST ₹"  /><input className={inp(true)} type="number" value={computed.gstAmount} readOnly /></div>
//                                     <div><Lbl t="CGST ₹" /><input className={inp(true)} type="number" value={computed.cgstAmount} readOnly /></div>
//                                     <div><Lbl t="SGST ₹" /><input className={inp(true)} type="number" value={computed.sgstAmount} readOnly /></div>
//                                   </>
//                                 )}
//                                 {item.taxOption === "IGST" && (
//                                   <>
//                                     <div><Lbl t="IGST %" /><input className={inp()} type="number" value={item.igstRate ?? 0} onChange={e => handleIgstChange(index, e.target.value)} onFocus={(e) => e.target.select()} /></div>
//                                     <div><Lbl t="IGST ₹" /><input className={inp(true)} type="number" value={computed.igstAmount} readOnly /></div>
//                                   </>
//                                 )}
//                               </div>
//                             </div>

//                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                               <div className="relative">
//                                 <Lbl t="Warehouse" />
//                                 <div className="relative">
//                                   <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px]" />
//                                   <select
//                                     className={`${inp()} pl-6 appearance-none cursor-pointer bg-white`}
//                                     value={item.warehouse || ""}
//                                     onChange={(e) => {
//                                       const whId = e.target.value;
//                                       const warehouse = warehouses.find(w => w._id === whId);
//                                       onItemChange(index, { target: { name: "warehouse", value: whId } });
//                                       onItemChange(index, { target: { name: "warehouseName", value: warehouse?.warehouseName || "" } });
//                                       onItemChange(index, { target: { name: "warehouseCode", value: warehouse?.warehouseCode || "" } });
//                                     }}
//                                   >
//                                     <option value="">Select Warehouse</option>
//                                     {warehouses.map(wh => (
//                                       <option key={wh._id} value={wh._id}>
//                                         {wh.warehouseName} ({wh.warehouseCode})
//                                       </option>
//                                     ))}
//                                   </select>
//                                 </div>
//                               </div>
//                               <div>
//                                 <Lbl t="Status" />
//                                 <div className="px-2 py-1.5 rounded-md bg-gray-50 text-gray-600 text-xs">
//                                   {item.warehouseName ? `Assigned to ${item.warehouseName}` : "No warehouse assigned"}
//                                 </div>
//                               </div>
//                             </div>

//                             <div>
//                               <div className="flex items-center gap-2 flex-wrap">
//                                 <button type="button" onClick={() => comparePrice(index, item)} disabled={priceLoading[index]}
//                                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-all disabled:opacity-60 shadow-sm shadow-violet-200">
//                                   {priceLoading[index]
//                                     ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Fetching…</>
//                                     : <><FaChartLine className="text-[9px]" /> Compare Market Price</>}
//                                 </button>
//                                 {priceResults[index] && (
//                                   <button type="button"
//                                     onClick={() => setPriceResults(p => { const n = { ...p }; delete n[index]; return n; })}
//                                     className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
//                                     <FaTimes className="text-[9px]" /> Clear
//                                   </button>
//                                 )}
//                               </div>
//                               {priceResults[index] && (
//                                 <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
//                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 mb-2">
//                                     <HiSparkles className="text-violet-500" /> AI Price — <span className="font-normal text-violet-400">{item.itemName}</span>
//                                   </div>
//                                   <div className="flex flex-wrap gap-2">
//                                     {priceResults[index].market?.map((m, i) => (
//                                       <div key={i} className="bg-white rounded-lg border border-violet-100 px-3 py-1.5 min-w-[90px]">
//                                         <p className="text-[9px] font-bold uppercase text-gray-400">{m.source || `Source ${i+1}`}</p>
//                                         <p className="text-sm font-extrabold text-gray-800">₹{m.price || "N/A"}</p>
//                                       </div>
//                                     ))}
//                                     {priceResults[index].ai && (
//                                       <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl px-3 py-2 text-white">
//                                         <p className="text-[9px] font-bold uppercase text-violet-200">AI Suggested</p>
//                                         <p className="text-lg font-extrabold">₹{priceResults[index].ai.recommendedSellingPrice}</p>
//                                         {priceResults[index].ai.strategy && <p className="text-[9px] text-violet-200">{priceResults[index].ai.strategy}</p>}
//                                       </div>
//                                     )}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                          </td>
//                         </tr>
//                     )}
//                   </React.Fragment>
//                 );
//               })}

//               {items.length === 0 && (
//                 <tr>
//                   <td colSpan={12} className="py-10 text-center">
//                     <div className="text-3xl opacity-20 mb-2">📦</div>
//                     <p className="text-xs text-gray-300 font-medium">No items added yet</p>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//            </table>
//         </div>
//       </div>

//       <button type="button" onClick={onAddItem}
//         className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center">
//         <FaPlus className="text-xs" /> Add Item Row
//       </button>
//     </div>
//   );
// };

// ItemSection.propTypes = {
//   items: PropTypes.array.isRequired,
//   onItemChange: PropTypes.func.isRequired,
//   onAddItem: PropTypes.func,
//   onRemoveItem: PropTypes.func,
//   onItemSelect: PropTypes.func,
// };

// export default ItemSection;





// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import PropTypes from "prop-types";
// import { toast } from "react-toastify";
// import {
//   FaTrash, FaPlus, FaSearch, FaChartLine,
//   FaTimes, FaBoxOpen, FaWarehouse,
//   FaChevronUp, FaEdit
// } from "react-icons/fa";
// import { HiSparkles } from "react-icons/hi";

// /* ── Helpers ── */
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity           = parseFloat(item.quantity)  || 0;
//   const unitPrice          = parseFloat(item.unitPrice) || 0;
//   const discount           = parseFloat(item.discount)  || 0;
//   const freight            = parseFloat(item.freight)   || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount        = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate    = parseFloat(item.gstRate);
//     const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     return { priceAfterDiscount, totalAmount, gstAmount: cgstAmount + sgstAmount, cgstAmount, sgstAmount, igstAmount: 0 };
//   }
//   if (item.taxOption === "IGST") {
//     let igstRate = item.igstRate;
//     if (!igstRate || parseFloat(igstRate) === 0) igstRate = parseFloat(item.gstRate) || 0;
//     else igstRate = parseFloat(igstRate);
//     return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: round(totalAmount * (igstRate / 100)) };
//   }
//   return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
// };

// /* ─────────────────────────────────────────
//    Reusable image cell — handles all states
// ───────────────────────────────────────── */
// function ItemImage({ src, alt, className = "w-10 h-10" }) {
//   const [err, setErr] = useState(false);
//   useEffect(() => { setErr(false); }, [src]);

//   if (!src || err) {
//     return (
//       <div className={`${className} rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`}>
//         <FaBoxOpen className="text-gray-300 text-[10px]" />
//       </div>
//     );
//   }
//   return (
//     <img
//       src={src}
//       alt={alt || "Item"}
//       className={`${className} object-cover rounded-md border border-gray-200 shrink-0`}
//       onError={() => setErr(true)}
//     />
//   );
// }

// /* ── Component ── */
// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
//   const [apiItems,           setApiItems]           = useState([]);
//   const [warehouses,         setWarehouses]         = useState([]);
//   const [filteredItems,      setFilteredItems]      = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);
//   const [showDropdown,       setShowDropdown]       = useState(false);
//   const [showWhDropdown,     setShowWhDropdown]     = useState(false);
//   const [activeIdx,          setActiveIdx]          = useState(null);
//   const [noMatchInfo,        setNoMatchInfo]        = useState({ index: null, text: "" });
//   const [priceResults,       setPriceResults]       = useState({});
//   const [priceLoading,       setPriceLoading]       = useState({});
//   const [expandedRow,        setExpandedRow]        = useState(null);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     (async () => {
//       try {
//         const [iRes, wRes] = await Promise.all([
//           axios.get("/api/items",     { headers: { Authorization: `Bearer ${token}` } }),
//           axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);

//         const itemData = iRes.data?.success
//           ? iRes.data.data
//           : Array.isArray(iRes.data) ? iRes.data : [];

//         // ── DEBUG: verify imageUrl is present in API response ──
//         if (itemData.length > 0) {
//           console.log("[ItemSection] sample item from API →", {
//             _id:      itemData[0]._id,
//             itemName: itemData[0].itemName,
//             imageUrl: itemData[0].imageUrl,   // should be URL string or ""
//           });
//         }

//         setApiItems(itemData);
//         const whData = wRes.data?.success
//           ? wRes.data.data
//           : Array.isArray(wRes.data) ? wRes.data : [];
//         setWarehouses(whData);
//       } catch (e) { console.error("[ItemSection] fetch error:", e); }
//     })();
//   }, []);

//   /* ── search handlers ── */
//   const handleNameSearch = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });
//     if (!value) { setShowDropdown(false); setNoMatchInfo({ index: null, text: "" }); return; }
//     const f = apiItems.filter(i => (i.itemName || "").toLowerCase().includes(value.toLowerCase()));
//     if (f.length) { setFilteredItems(f); setShowDropdown(true); setActiveIdx(index); setNoMatchInfo({ index: null, text: "" }); }
//     else          { setShowDropdown(false); setNoMatchInfo({ index, text: value }); }
//   };

//   const handleItemSelect = (index, sel) => {
//     // ── DEBUG: what field name does the API use? ──
//     console.log("[ItemSection] handleItemSelect →", {
//       "sel.imageUrl": sel.imageUrl,
//       "sel.image":    sel.image,      // old field name in some schemas
//     });

//     const unitPrice = parseFloat(sel.unitPrice) || 0;
//     const discount  = parseFloat(sel.discount)  || 0;
//     const freight   = parseFloat(sel.freight)   || 0;
//     const taxOption = sel.taxOption || "GST";
//     const gstRate   = sel.gstRate   || 0;
//     const total     = 1 * (unitPrice - discount) + freight;
//     const cgst      = round(total * (gstRate / 2 / 100));

//     const row = {
//       item:            sel._id,
//       // ✅ FIXED: sel.imageUrl (new) with fallback to sel.image (legacy)
//       imageUrl:        sel.imageUrl || sel.image || "",
//       itemCode:        sel.itemCode        || "",
//       itemName:        sel.itemName        || "",
//       itemDescription: sel.description     || "",
//       unitPrice,
//       discount,
//       freight,
//       quantity:        1,
//       taxOption,
//       gstRate,
//       igstRate:        taxOption === "IGST" ? sel.igstRate || gstRate : 0,
//       cgstAmount:      cgst,
//       sgstAmount:      cgst,
//       gstAmount:       cgst * 2,
//       priceAfterDiscount: unitPrice - discount,
//       totalAmount:     total,
//       isNewItem:       false,
//     };

//     console.log("[ItemSection] row.imageUrl =", row.imageUrl);

//     Object.entries(row).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//     if (typeof onItemSelect === "function") { try { onItemSelect(index, sel); } catch(e) { console.warn(e); } }
//     setShowDropdown(false);
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleFieldChange = (index, field, value) => {
//     const v = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const u = { ...items[index], [field]: v };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const handleTaxChange = (index, value) => {
//     const u = { ...items[index], taxOption: value };
//     if (value === "IGST" && !u.igstRate) u.igstRate = u.gstRate || 0;
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
//   };

//   const handleGstChange = (index, v) => {
//     const u = { ...items[index], gstRate: parseFloat(v) || 0 };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const handleIgstChange = (index, v) => {
//     const u = { ...items[index], igstRate: parseFloat(v) || 0 };
//     const c = computeItemValues(u);
//     Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
//   };

//   const handleWhSearch = (index, value) => {
//     onItemChange(index, { target: { name: "warehouseName", value } });
//     if (value) {
//       setFilteredWarehouses(warehouses.filter(w =>
//         (w.warehouseName || "").toLowerCase().includes(value.toLowerCase()) ||
//         (w.warehouseCode || "").toLowerCase().includes(value.toLowerCase())
//       ));
//       setShowWhDropdown(true);
//       setActiveIdx(index);
//     } else {
//       setShowWhDropdown(false);
//     }
//   };

//   const handleWhSelect = async (index, wh) => {
//     onItemChange(index, { target: { name: "warehouse",     value: wh._id } });
//     onItemChange(index, { target: { name: "warehouseName", value: wh.warehouseName } });
//     onItemChange(index, { target: { name: "warehouseCode", value: wh.warehouseCode } });
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get(`/api/warehouse/${wh.warehouseCode}/bins`, { headers: { Authorization: `Bearer ${token}` } });
//       onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
//     } catch {
//       onItemChange(index, { target: { name: "binLocations", value: [] } });
//     }
//     setShowWhDropdown(false);
//   };

//   const comparePrice = async (index, item) => {
//     if (!item?.itemName) { toast.error("Select item first"); return; }
//     setPriceLoading(p => ({ ...p, [index]: true }));
//     try {
//       const res = await axios.post("/api/check-price", { itemName: item.itemName });
//       setPriceResults(p => ({ ...p, [index]: res.data }));
//       toast.success("Price comparison fetched!");
//     } catch { toast.error("Error comparing price"); }
//     setPriceLoading(p => ({ ...p, [index]: false }));
//   };

//   const toggleExpand = (index) => setExpandedRow(prev => prev === index ? null : index);

//   const inp = (ro = false, extra = "") =>
//     `w-full px-2 py-1.5 rounded-md border text-xs font-medium transition-all outline-none ${extra}
//      ${ro ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
//           : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-gray-300"}`;

//   const Lbl = ({ t }) => <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t}</p>;

//   const TH = ({ children }) => (
//     <th className="px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap bg-indigo-600">
//       {children}
//     </th>
//   );

//   return (
//     <div className="space-y-3">
//       <div className="rounded-xl border border-gray-200 overflow-visible">
//         <table className="w-full border-collapse text-xs table-fixed">
//           <colgroup>
//             <col style={{width:"32px"}} />
//             <col style={{width:"56px"}} />
//             <col style={{width:"90px"}} />
//             <col style={{width:"180px"}} />
//             <col style={{width:"60px"}} />
//             <col style={{width:"90px"}} />
//             <col style={{width:"75px"}} />
//             <col style={{width:"75px"}} />
//             <col style={{width:"90px"}} />
//             <col style={{width:"100px"}} />
//             <col style={{width:"72px"}} />
//           </colgroup>
//           <thead>
//             <tr>
//               <TH>#</TH>
//               <TH>Image</TH>
//               <TH>Code</TH>
//               <TH>Item Name</TH>
//               <TH>Qty</TH>
//               <TH>Unit Price</TH>
//               <TH>Discount</TH>
//               <TH>Freight</TH>
//               <TH>Total</TH>
//               <TH>Tax</TH>
//               <TH>Actions</TH>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {items.map((item, index) => {
//               const computed   = computeItemValues(item);
//               const isExpanded = expandedRow === index;
//               const isEven     = index % 2 === 0;

//               return (
//                 <>
//                   <tr
//                     key={`row-${index}`}
//                     className={`${isEven ? "bg-white" : "bg-gray-50/40"} ${isExpanded ? "ring-2 ring-inset ring-indigo-300" : ""} hover:bg-indigo-50/20 transition-colors`}
//                   >
//                     <td className="px-2 py-2">
//                       <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-extrabold flex items-center justify-center">
//                         {index + 1}
//                       </span>
//                     </td>

//                     {/* ✅ Image — ItemImage component, correctly uses item.imageUrl */}
//                     <td className="px-1 py-1.5">
//                           <img
//                           src={item.imageUrl}
//                           alt={item.itemName}
//                           className="w-12 h-12 object-cover rounded-md border border-gray-200"
//                           onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/800x800/eeeeee/999999?text=No+Image&font=montserrat"; }}
//                         />
//                     </td>

//                     <td className="px-1 py-1.5">
//                       <input
//                         className={inp()}
//                         type="text"
//                         value={item.itemCode ?? ""}
//                         onChange={e => onItemChange(index, { target: { name: "itemCode", value: e.target.value } })}
//                         placeholder="Code"
//                       />
//                     </td>

                    // <td className="px-1 py-1.5 relative">
                    //   <div className="relative">
                    //     <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-200 text-[8px] pointer-events-none" />
                    //     <input
                    //       className={`${inp()} pl-5`}
                    //       type="text"
                    //       value={item.itemName ?? ""}
                    //       onChange={e => handleNameSearch(index, e.target.value)}
                    //       placeholder="Search…"
                    //     />
                    //   </div>
                    //   {showDropdown && activeIdx === index && (
                    //     <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 w-64 max-h-56 overflow-y-auto shadow-2xl rounded-xl z-50">
                    //       {filteredItems.map(itm => (
                    //         <div key={itm._id} onClick={() => handleItemSelect(index, itm)}
                    //           className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
                    //               <img
                    //       src={item.imageUrl}
                    //       alt={item.itemName}
                    //       className="w-12 h-12 object-cover rounded-md border border-gray-200"
                    //       onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/800x800/eeeeee/999999?text=No+Image&font=montserrat"; }}
                    //     />
                    //           <div className="min-w-0">
                    //             <p className="font-semibold text-gray-800 text-[11px] truncate">{itm.itemName}</p>
                    //             <p className="text-[9px] text-gray-400 font-mono">{itm.itemCode}</p>
                    //           </div>
                    //         </div>
                    //       ))}
                    //     </div>
                    //   )}
                    //   {noMatchInfo.index === index && (
                    //     <div className="absolute top-full left-0 mt-0.5 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg z-50 text-[10px] flex items-center gap-1.5 shadow w-44">
                    //       <span className="text-amber-600">Not found.</span>
                    //       <button className="text-indigo-600 font-bold underline" onClick={() => {
                    //         const cur = items[index] || {};
                    //         Object.entries({ ...cur, itemName: cur.itemName || noMatchInfo.text, isNewItem: true })
                    //           .forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
                    //         setNoMatchInfo({ index: null, text: "" });
                    //       }}>+ Add</button>
                    //     </div>
                    //   )}
                    // </td>

//                     <td className="px-1 py-1.5">
//                       <input className={inp()} type="number" value={item.quantity ?? 0}  onChange={e => handleFieldChange(index, "quantity",  e.target.value)} onFocus={(e) => e.target.select()} />
//                     </td>
//                     <td className="px-1 py-1.5">
//                       <input className={inp()} type="number" value={item.unitPrice ?? 0} onChange={e => handleFieldChange(index, "unitPrice", e.target.value)} onFocus={(e) => e.target.select()} />
//                     </td>
//                     <td className="px-1 py-1.5">
//                       <input className={inp()} type="number" value={item.discount ?? 0}  onChange={e => handleFieldChange(index, "discount",  e.target.value)} onFocus={(e) => e.target.select()} />
//                     </td>
//                     <td className="px-1 py-1.5">
//                       <input className={inp()} type="number" value={item.freight ?? 0}   onChange={e => handleFieldChange(index, "freight",   e.target.value)} onFocus={(e) => e.target.select()} />
//                     </td>

//                     <td className="px-1 py-1.5">
//                       <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs text-right tabular-nums">
//                         ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                       </div>
//                     </td>

//                     <td className="px-1 py-1.5">
//                       <div className="text-[9px] text-gray-500 leading-tight">
//                         <span className={`font-bold ${item.taxOption === "IGST" ? "text-orange-500" : "text-blue-500"}`}>
//                           {item.taxOption || "GST"}
//                         </span>
//                         <span className="ml-1 text-gray-400">{item.gstRate || 0}%</span>
//                         <div className="text-[9px] text-gray-400 font-mono">
//                           {item.taxOption === "IGST"
//                             ? `₹${computed.igstAmount}`
//                             : `₹${computed.cgstAmount}+₹${computed.sgstAmount}`}
//                         </div>
//                       </div>
//                     </td>

//                     <td className="px-1 py-1.5">
//                       <div className="flex items-center gap-1">
//                         <button type="button" onClick={() => toggleExpand(index)}
//                           className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
//                             ${isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}>
//                           {isExpanded ? <FaChevronUp className="text-[8px]" /> : <FaEdit className="text-[8px]" />}
//                         </button>
//                         <button type="button" onClick={() => onRemoveItem(index)}
//                           className="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaTrash className="text-[8px]" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>

//                   {isExpanded && (
//                     <tr key={`expand-${index}`}>
//                       <td colSpan={11} className="p-0 border-t-0">
//                         <div className="bg-indigo-50/30 border-t-2 border-indigo-200 px-4 py-4 space-y-3">

//                           <div className="flex items-center gap-2 mb-1">
//                             <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">{index + 1}</div>
//                             <ItemImage src={item.imageUrl} alt={item.itemName} className="w-8 h-8" />
//                             <p className="text-xs font-bold text-indigo-700">{item.itemName || "Item details"}</p>
//                             <button type="button" onClick={() => setExpandedRow(null)}
//                               className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium transition-colors">
//                               <FaChevronUp className="text-[8px]" /> Collapse
//                             </button>
//                           </div>

//                           <div>
//                             <Lbl t="Description" />
//                             <input className={inp()} type="text" name="itemDescription" value={item.itemDescription ?? ""} onChange={e => onItemChange(index, e)} placeholder="Item description…" onFocus={(e) => e.target.select()} />
//                           </div>

//                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                             <div>
//                               <Lbl t="Price After Discount" />
//                               <input className={inp(true)} type="number" value={computed.priceAfterDiscount} readOnly />
//                             </div>
//                             <div>
//                               <Lbl t="Total Amount" />
//                               <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs text-right">
//                                 ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
//                               </div>
//                             </div>
//                           </div>

//                           <div className="bg-blue-50/60 rounded-xl border border-blue-100 p-3">
//                             <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500 mb-2">Tax Details</p>
//                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
//                               <div>
//                                 <Lbl t="Tax Type" />
//                                 <select className={inp()} value={item.taxOption || "GST"} onChange={e => handleTaxChange(index, e.target.value)}>
//                                   <option value="GST">GST</option>
//                                   <option value="IGST">IGST</option>
//                                 </select>
//                               </div>
//                               {(item.taxOption === "GST" || !item.taxOption) && (
//                                 <>
//                                   <div><Lbl t="GST %" /><input className={inp()} type="number" value={item.gstRate ?? 0} onChange={e => handleGstChange(index, e.target.value)} onFocus={(e) => e.target.select()} /></div>
//                                   <div><Lbl t="GST ₹"  /><input className={inp(true)} type="number" value={computed.gstAmount}  readOnly /></div>
//                                   <div><Lbl t="CGST ₹" /><input className={inp(true)} type="number" value={computed.cgstAmount} readOnly /></div>
//                                   <div><Lbl t="SGST ₹" /><input className={inp(true)} type="number" value={computed.sgstAmount} readOnly /></div>
//                                 </>
//                               )}
//                               {item.taxOption === "IGST" && (
//                                 <>
//                                   <div><Lbl t="IGST %" /><input className={inp()} type="number" value={item.igstRate ?? 0} onChange={e => handleIgstChange(index, e.target.value)} onFocus={(e) => e.target.select()} /></div>
//                                   <div><Lbl t="IGST ₹" /><input className={inp(true)} type="number" value={computed.igstAmount} readOnly /></div>
//                                 </>
//                               )}
//                             </div>
//                           </div>

//                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                             <div className="relative">
//                               <Lbl t="Warehouse" />
//                               <div className="relative">
//                                 <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px] pointer-events-none" />
//                                 <input className={`${inp()} pl-6`} type="text" value={item.warehouseName ?? ""} onChange={e => handleWhSearch(index, e.target.value)} placeholder="Search warehouse…" />
//                               </div>
//                               {showWhDropdown && activeIdx === index && (
//                                 <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 w-full max-h-44 overflow-y-auto shadow-2xl rounded-xl z-50">
//                                   {filteredWarehouses.map(wh => (
//                                     <div key={wh._id} onClick={() => handleWhSelect(index, wh)}
//                                       className="flex items-center gap-2 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
//                                       <FaWarehouse className="text-gray-300 text-[9px] shrink-0" />
//                                       <div>
//                                         <p className="font-semibold text-gray-800 text-[11px]">{wh.warehouseName}</p>
//                                         <p className="text-[9px] text-gray-400 font-mono">{wh.warehouseCode}</p>
//                                       </div>
//                                     </div>
//                                   ))}
//                                 </div>
//                               )}
//                             </div>
//                             <div>
//                               <Lbl t="Bin Location" />
//                               {item.binLocations?.length > 0 ? (
//                                 <select className={inp()} value={item.selectedBin?._id || ""}
//                                   onChange={e => {
//                                     const bin = item.binLocations.find(b => b._id === e.target.value) || null;
//                                     onItemChange(index, { target: { name: "selectedBin", value: bin } });
//                                   }}>
//                                   <option value="">Select Bin…</option>
//                                   {item.binLocations.map(bin => <option key={bin._id} value={bin._id}>{bin.code}</option>)}
//                                 </select>
//                               ) : (
//                                 <div className="px-2 py-1.5 rounded-md border border-gray-100 bg-gray-50 text-[10px] text-gray-300">
//                                   Select warehouse first
//                                 </div>
//                               )}
//                             </div>
//                           </div>

//                           <div>
//                             <div className="flex items-center gap-2 flex-wrap">
//                               <button type="button" onClick={() => comparePrice(index, item)} disabled={priceLoading[index]}
//                                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-all disabled:opacity-60 shadow-sm shadow-violet-200">
//                                 {priceLoading[index]
//                                   ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Fetching…</>
//                                   : <><FaChartLine className="text-[9px]" /> Compare Market Price</>}
//                               </button>
//                               {priceResults[index] && (
//                                 <button type="button"
//                                   onClick={() => setPriceResults(p => { const n = { ...p }; delete n[index]; return n; })}
//                                   className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
//                                   <FaTimes className="text-[9px]" /> Clear
//                                 </button>
//                               )}
//                             </div>
//                             {priceResults[index] && (
//                               <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
//                                 <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 mb-2">
//                                   <HiSparkles className="text-violet-500" /> AI Price — <span className="font-normal text-violet-400">{item.itemName}</span>
//                                 </div>
//                                 <div className="flex flex-wrap gap-2">
//                                   {priceResults[index].market?.map((m, i) => (
//                                     <div key={i} className="bg-white rounded-lg border border-violet-100 px-3 py-1.5 min-w-[90px]">
//                                       <p className="text-[9px] font-bold uppercase text-gray-400">{m.source || `Source ${i+1}`}</p>
//                                       <p className="text-sm font-extrabold text-gray-800">₹{m.price || "N/A"}</p>
//                                     </div>
//                                   ))}
//                                   {priceResults[index].ai && (
//                                     <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl px-3 py-2 text-white">
//                                       <p className="text-[9px] font-bold uppercase text-violet-200">AI Suggested</p>
//                                       <p className="text-lg font-extrabold">₹{priceResults[index].ai.recommendedSellingPrice}</p>
//                                       {priceResults[index].ai.strategy && <p className="text-[9px] text-violet-200">{priceResults[index].ai.strategy}</p>}
//                                     </div>
//                                   )}
//                                 </div>
//                               </div>
//                             )}
//                           </div>

//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </>
//               );
//             })}

//             {items.length === 0 && (
//               <tr>
//                 <td colSpan={11} className="py-10 text-center">
//                   <div className="text-3xl opacity-20 mb-2">📦</div>
//                   <p className="text-xs text-gray-300 font-medium">No items added yet</p>
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <button type="button" onClick={onAddItem}
//         className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center">
//         <FaPlus className="text-xs" /> Add Item Row
//       </button>
//     </div>
//   );
// };

// ItemSection.propTypes = {
//   items:        PropTypes.array.isRequired,
//   onItemChange: PropTypes.func.isRequired,
//   onAddItem:    PropTypes.func,
//   onRemoveItem: PropTypes.func,
//   onItemSelect: PropTypes.func,
// };

// export default ItemSection;

