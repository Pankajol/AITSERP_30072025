"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import {
  FaTrash, FaPlus, FaSearch, FaChartLine,
  FaTimes, FaBoxOpen, FaWarehouse,
  FaChevronDown, FaChevronUp, FaEdit
} from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";

/* ── Helpers ── */
const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity           = parseFloat(item.quantity)  || 0;
  const unitPrice          = parseFloat(item.unitPrice) || 0;
  const discount           = parseFloat(item.discount)  || 0;
  const freight            = parseFloat(item.freight)   || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount        = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate    = parseFloat(item.gstRate) || 0;
    const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
    return { priceAfterDiscount, totalAmount, gstAmount: cgstAmount + sgstAmount, cgstAmount, sgstAmount, igstAmount: 0 };
  }
  if (item.taxOption === "IGST") {
    let igstRate = item.igstRate;
    if (!igstRate || parseFloat(igstRate) === 0) igstRate = parseFloat(item.gstRate) || 0;
    else igstRate = parseFloat(igstRate);
    return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: round(totalAmount * (igstRate / 100)) };
  }
  return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
};

/* ── Component ── */
const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
  const [apiItems,           setApiItems]           = useState([]);
  const [warehouses,         setWarehouses]         = useState([]);
  const [filteredItems,      setFilteredItems]      = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [showWhDropdown,     setShowWhDropdown]     = useState(false);
  const [activeIdx,          setActiveIdx]          = useState(null);
  const [noMatchInfo,        setNoMatchInfo]        = useState({ index: null, text: "" });
  const [priceResults,       setPriceResults]       = useState({});
  const [priceLoading,       setPriceLoading]       = useState({});
  const [expandedRow,        setExpandedRow]        = useState(null); // only 1 expanded at a time

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const [iRes, wRes] = await Promise.all([
          axios.get("/api/items",     { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (iRes.data?.success)            setApiItems(iRes.data.data   || []);
        else if (Array.isArray(iRes.data)) setApiItems(iRes.data);
        if (wRes.data?.success)            setWarehouses(wRes.data.data || []);
        else if (Array.isArray(wRes.data)) setWarehouses(wRes.data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  /* ── search handlers ── */
  const handleNameSearch = (index, value) => {
    onItemChange(index, { target: { name: "itemName", value } });
    if (!value) { setShowDropdown(false); setNoMatchInfo({ index: null, text: "" }); return; }
    const f = apiItems.filter(i => (i.itemName || "").toLowerCase().includes(value.toLowerCase()));
    if (f.length) { setFilteredItems(f); setShowDropdown(true); setActiveIdx(index); setNoMatchInfo({ index: null, text: "" }); }
    else          { setShowDropdown(false); setNoMatchInfo({ index, text: value }); }
  };

  // const handleCodeSearch = (index, value) => {
  //   onItemChange(index, { target: { name: "itemCode", value } });
  //   if (!value) { setShowDropdown(false); setNoMatchInfo({ index: null, text: "" }); return; }
  //   const f = apiItems.filter(i => (i.itemCode || "").toLowerCase().includes(value.toLowerCase()));
  //   if (f.length) { setFilteredItems(f); setShowDropdown(true); setActiveIdx(index); setNoMatchInfo({ index: null, text: "" }); }
  //   else          { setShowDropdown(false); setNoMatchInfo({ index, text: value }); }
  // };

  const handleItemSelect = (index, sel) => {
    const unitPrice = parseFloat(sel.unitPrice) || 0;
    const discount  = parseFloat(sel.discount)  || 0;
    const freight   = parseFloat(sel.freight)   || 0;
    const taxOption = sel.taxOption || "GST";
    const gstRate   = sel.gstRate   || 0;
    const total     = 1 * (unitPrice - discount) + freight;
    const cgst      = round(total * (gstRate / 2 / 100));
    const row = {
      item: sel._id, itemCode: sel.itemCode || "", itemName: sel.itemName,
      itemDescription: sel.description || "", unitPrice, discount, freight,
      quantity: 1, taxOption, gstRate,
      igstRate: taxOption === "IGST" ? sel.igstRate || gstRate : 0,
      cgstAmount: cgst, sgstAmount: cgst, gstAmount: cgst * 2,
      priceAfterDiscount: unitPrice - discount, totalAmount: total, isNewItem: false,
    };
    Object.entries(row).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
    if (typeof onItemSelect === "function") { try { onItemSelect(index, sel); } catch(e) { console.warn(e); } }
    setShowDropdown(false); setNoMatchInfo({ index: null, text: "" });
  };

  const handleFieldChange = (index, field, value) => {
    const v = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    const u = { ...items[index], [field]: v };
    const c = computeItemValues(u);
    Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } }));
  };

  const handleTaxChange  = (index, value) => { const u = { ...items[index], taxOption: value }; if (value === "IGST" && !u.igstRate) u.igstRate = u.gstRate || 0; const c = computeItemValues(u); Object.entries({ ...u, ...c }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } })); };
  const handleGstChange  = (index, v) => { const u = { ...items[index], gstRate:  parseFloat(v) || 0 }; const c = computeItemValues(u); Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } })); };
  const handleIgstChange = (index, v) => { const u = { ...items[index], igstRate: parseFloat(v) || 0 }; const c = computeItemValues(u); Object.entries({ ...u, ...c }).forEach(([k, val]) => onItemChange(index, { target: { name: k, value: val } })); };

  const handleWhSearch = (index, value) => {
    onItemChange(index, { target: { name: "warehouseName", value } });
    if (value) {
      setFilteredWarehouses(warehouses.filter(w =>
        (w.warehouseName || "").toLowerCase().includes(value.toLowerCase()) ||
        (w.warehouseCode || "").toLowerCase().includes(value.toLowerCase())
      ));
      setShowWhDropdown(true); setActiveIdx(index);
    } else setShowWhDropdown(false);
  };

  const handleWhSelect = async (index, wh) => {
    onItemChange(index, { target: { name: "warehouse",     value: wh._id } });
    onItemChange(index, { target: { name: "warehouseName", value: wh.warehouseName } });
    onItemChange(index, { target: { name: "warehouseCode", value: wh.warehouseCode } });
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get(`/api/warehouse/${wh.warehouseCode}/bins`, { headers: { Authorization: `Bearer ${token}` } });
      onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
    } catch { onItemChange(index, { target: { name: "binLocations", value: [] } }); }
    setShowWhDropdown(false);
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

  /* ── shared styles ── */
  const inp = (ro = false, extra = "") =>
    `w-full px-2 py-1.5 rounded-md border text-xs font-medium transition-all outline-none ${extra}
     ${ro ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
          : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ t }) => <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t}</p>;

  const TH = ({ children, w }) => (
    <th className={`px-2 py-2.5 text-left text-[9.5px] font-bold uppercase tracking-wider text-indigo-100 whitespace-nowrap bg-indigo-600 ${w || ""}`}>
      {children}
    </th>
  );

  return (
    <div className="space-y-3">

      {/* ── Compact Table ── */}
      <div className="rounded-xl border border-gray-200 overflow-visible">
        <table className="w-full border-collapse text-xs table-fixed">
          <colgroup>
            <col style={{width:"32px"}} />   {/* # */}
            <col style={{width:"90px"}} />   {/* Code */}
            <col style={{width:"180px"}} />  {/* Name */}
            <col style={{width:"60px"}} />   {/* Qty */}
            <col style={{width:"90px"}} />   {/* Unit Price */}
            <col style={{width:"75px"}} />   {/* Discount */}
            <col style={{width:"75px"}} />   {/* Freight */}
            <col style={{width:"90px"}} />   {/* Total */}
            <col style={{width:"100px"}} />  {/* Tax summary */}
            <col style={{width:"72px"}} />   {/* Actions */}
          </colgroup>
          <thead>
            <tr>
              <TH>#</TH>
              <TH>Code</TH>
              <TH>Item Name</TH>
              <TH>Qty</TH>
              <TH>Unit Price</TH>
              <TH>Discount</TH>
              <TH>Freight</TH>
              <TH>Total</TH>
              <TH>Tax</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
              const computed  = computeItemValues(item);
              const isExpanded = expandedRow === index;
              const isEven    = index % 2 === 0;

              return (
                <>
                {/* ── Compact Row ── */}
                <tr
                  key={`row-${index}`}
                  className={`${isEven ? "bg-white" : "bg-gray-50/40"} ${isExpanded ? "ring-2 ring-inset ring-indigo-300" : ""} hover:bg-indigo-50/20 transition-colors`}
                >
                  {/* # */}
                  <td className="px-2 py-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-extrabold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </td>

                  {/* Code — inline editable */}
                   <td className="px-1 py-1.5 relative">
                    <input
                      className={inp()}
                      type="text"
                      value={item.itemCode ?? ""}
                      onChange={e => handleFieldChange(index, "itemCode", e.target.value)}
                      // onChange={e => handleCodeSearch(index, e.target.value)}
                      placeholder="Code"
                    />
                    </td>
                 

                  {/* Name — inline editable with search */}
                  <td className="px-1 py-1.5 relative">
                    <div className="relative">
                      <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-200 text-[8px] pointer-events-none" />
                      <input
                        className={`${inp()} pl-5`}
                        type="text"
                        value={item.itemName ?? ""}
                        onChange={e => handleNameSearch(index, e.target.value)}
                        placeholder="Search…"
                      />
                    </div>
                    {showDropdown && activeIdx === index && (
                      <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 w-56 max-h-48 overflow-y-auto shadow-2xl rounded-xl z-50">
                        {filteredItems.map(itm => (
                          <div key={itm._id} onClick={() => handleItemSelect(index, itm)}
                            className="flex items-center gap-2 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
                            <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-400 shrink-0">
                              <FaBoxOpen className="text-[8px]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-[11px] truncate">{itm.itemName}</p>
                              <p className="text-[9px] text-gray-400 font-mono">{itm.itemCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {noMatchInfo.index === index && (
                      <div className="absolute top-full left-0 mt-0.5 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg z-50 text-[10px] flex items-center gap-1.5 shadow w-44">
                        <span className="text-amber-600">Not found.</span>
                        <button className="text-indigo-600 font-bold underline" onClick={() => {
                          const cur = items[index] || {};
                          Object.entries({ ...cur, itemName: cur.itemName || noMatchInfo.text, isNewItem: true }).forEach(([k, v]) => onItemChange(index, { target: { name: k, value: v } }));
                          setNoMatchInfo({ index: null, text: "" });
                        }}>+ Add</button>
                      </div>
                    )}
                  </td>

                  {/* Qty */}
                  <td className="px-1 py-1.5">
                    <input className={inp()} type="number" value={item.quantity ?? 0} onChange={e => handleFieldChange(index, "quantity", e.target.value)} />
                  </td>

                  {/* Unit Price */}
                  <td className="px-1 py-1.5">
                    <input className={inp()} type="number" value={item.unitPrice ?? 0} onChange={e => handleFieldChange(index, "unitPrice", e.target.value)} />
                  </td>

                  {/* Discount */}
                  <td className="px-1 py-1.5">
                    <input className={inp()} type="number" value={item.discount ?? 0} onChange={e => handleFieldChange(index, "discount", e.target.value)} />
                  </td>

                  {/* Freight */}
                  <td className="px-1 py-1.5">
                    <input className={inp()} type="number" value={item.freight ?? 0} onChange={e => handleFieldChange(index, "freight", e.target.value)} />
                  </td>

                  {/* Total */}
                  <td className="px-1 py-1.5">
                    <div className="px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs text-right tabular-nums">
                      ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Tax summary */}
                  <td className="px-1 py-1.5">
                    <div className="text-[9px] text-gray-500 leading-tight">
                      <span className={`font-bold ${item.taxOption === "IGST" ? "text-orange-500" : "text-blue-500"}`}>{item.taxOption || "GST"}</span>
                      <span className="ml-1 text-gray-400">{item.gstRate || 0}%</span>
                      <div className="text-[9px] text-gray-400 font-mono">
                        {item.taxOption === "IGST"
                          ? `₹${computed.igstAmount}`
                          : `₹${computed.cgstAmount}+₹${computed.sgstAmount}`}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-1">
                      {/* Expand/edit */}
                      <button type="button" onClick={() => toggleExpand(index)}
                        title="Expand for more details"
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
                          ${isExpanded ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-400 hover:bg-indigo-500 hover:text-white"}`}>
                        {isExpanded ? <FaChevronUp className="text-[8px]" /> : <FaEdit className="text-[8px]" />}
                      </button>
                      {/* Delete */}
                      <button type="button" onClick={() => onRemoveItem(index)}
                        className="w-6 h-6 rounded-md bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                        <FaTrash className="text-[8px]" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ── Expanded Detail Panel ── */}
                {isExpanded && (
                  <tr key={`expand-${index}`}>
                    <td colSpan={10} className="p-0 border-t-0">
                      <div className="bg-indigo-50/30 border-t-2 border-indigo-200 px-4 py-4 space-y-3">

                        {/* Panel header */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center">{index + 1}</div>
                          <p className="text-xs font-bold text-indigo-700">{item.itemName || "Item details"}</p>
                          <button type="button" onClick={() => setExpandedRow(null)}
                            className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-600 font-medium transition-colors">
                            <FaChevronUp className="text-[8px]" /> Collapse
                          </button>
                        </div>

                        {/* Description */}
                        <div>
                          <Lbl t="Description" />
                          <input className={inp()} type="text" name="itemDescription" value={item.itemDescription ?? ""} onChange={e => onItemChange(index, e)} placeholder="Item description…" />
                        </div>

                        {/* After Discount (read) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

                        {/* Tax */}
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
                            {item.taxOption === "GST" && (
                              <>
                                <div><Lbl t="GST %" /><input className={inp()} type="number" value={item.gstRate ?? 0} onChange={e => handleGstChange(index, e.target.value)} /></div>
                                <div><Lbl t="GST ₹"  /><input className={inp(true)} type="number" value={computed.gstAmount}  readOnly /></div>
                                <div><Lbl t="CGST ₹" /><input className={inp(true)} type="number" value={computed.cgstAmount} readOnly /></div>
                                <div><Lbl t="SGST ₹" /><input className={inp(true)} type="number" value={computed.sgstAmount} readOnly /></div>
                              </>
                            )}
                            {item.taxOption === "IGST" && (
                              <>
                                <div><Lbl t="IGST %" /><input className={inp()} type="number" value={item.igstRate ?? 0} onChange={e => handleIgstChange(index, e.target.value)} /></div>
                                <div><Lbl t="IGST ₹" /><input className={inp(true)} type="number" value={computed.igstAmount} readOnly /></div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Warehouse + Bin */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="relative">
                            <Lbl t="Warehouse" />
                            <div className="relative">
                              <FaWarehouse className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-[9px] pointer-events-none" />
                              <input className={`${inp()} pl-6`} type="text" value={item.warehouseName ?? ""} onChange={e => handleWhSearch(index, e.target.value)} placeholder="Search warehouse…" />
                            </div>
                            {showWhDropdown && activeIdx === index && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 w-full max-h-44 overflow-y-auto shadow-2xl rounded-xl z-50">
                                {filteredWarehouses.map(wh => (
                                  <div key={wh._id} onClick={() => handleWhSelect(index, wh)}
                                    className="flex items-center gap-2 px-2.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0">
                                    <FaWarehouse className="text-gray-300 text-[9px] shrink-0" />
                                    <div>
                                      <p className="font-semibold text-gray-800 text-[11px]">{wh.warehouseName}</p>
                                      <p className="text-[9px] text-gray-400 font-mono">{wh.warehouseCode}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <Lbl t="Bin Location" />
                            {item.binLocations?.length > 0 ? (
                              <select className={inp()} value={item.selectedBin?._id || ""}
                                onChange={e => { const bin = item.binLocations.find(b => b._id === e.target.value) || null; onItemChange(index, { target: { name: "selectedBin", value: bin } }); }}>
                                <option value="">Select Bin…</option>
                                {item.binLocations.map(bin => <option key={bin._id} value={bin._id}>{bin.code}</option>)}
                              </select>
                            ) : (
                              <div className="px-2 py-1.5 rounded-md border border-gray-100 bg-gray-50 text-[10px] text-gray-300">
                                Select warehouse first
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Compare Price */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button type="button" onClick={() => comparePrice(index, item)} disabled={priceLoading[index]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-all disabled:opacity-60 shadow-sm shadow-violet-200">
                              {priceLoading[index]
                                ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Fetching…</>
                                : <><FaChartLine className="text-[9px]" /> Compare Market Price</>}
                            </button>
                            {priceResults[index] && (
                              <button type="button" onClick={() => setPriceResults(p => { const n = { ...p }; delete n[index]; return n; })}
                                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors">
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
                                    <p className="text-[9px] font-bold uppercase text-gray-400">{m.source || `Source ${i+1}`}</p>
                                    <p className="text-sm font-extrabold text-gray-800">₹{m.price || "N/A"}</p>
                                  </div>
                                ))}
                                {priceResults[index].ai && (
                                  <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl px-3 py-2 text-white">
                                    <p className="text-[9px] font-bold uppercase text-violet-200">AI Suggested</p>
                                    <p className="text-lg font-extrabold">₹{priceResults[index].ai.recommendedSellingPrice}</p>
                                    {priceResults[index].ai.strategy && <p className="text-[9px] text-violet-200">{priceResults[index].ai.strategy}</p>}
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
                </>
              );
            })}

            {/* Empty state */}
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

      {/* ── Add Item ── */}
      <button type="button" onClick={onAddItem}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-indigo-500 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition-all w-full justify-center">
        <FaPlus className="text-xs" /> Add Item Row
      </button>
    </div>
  );
};

ItemSection.propTypes = {
  items:        PropTypes.array.isRequired,
  onItemChange: PropTypes.func.isRequired,
  onAddItem:    PropTypes.func,
  onRemoveItem: PropTypes.func,
  onItemSelect: PropTypes.func,
};

export default ItemSection;


// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import PropTypes from "prop-types";
// import { toast } from "react-toastify";


// /* ---------- helpers ---------- */
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
//     const cgstRate = gstRate / 2;
//     const sgstRate = gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = cgstAmount + sgstAmount;
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   }

//   if (item.taxOption === "IGST") {
//     let igstRate = item.igstRate;
//     if (igstRate === undefined || parseFloat(igstRate) === 0) {
//       igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
//     } else {
//       igstRate = parseFloat(igstRate);
//     }
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }

//   return {
//     priceAfterDiscount,
//     totalAmount,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: 0,
//   };
// };

// /* ---------- main component ---------- */
// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
//   ItemSection.propTypes = {
//     items: PropTypes.array.isRequired,
//     onItemChange: PropTypes.func.isRequired,
//     onAddItem: PropTypes.func,
//     onRemoveItem: PropTypes.func,
//     onItemSelect: PropTypes.func, // new optional callback
//   };

//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);

//   const [showDropdown, setShowDropdown] = useState(false);
//   const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
//   const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
//   const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "" });

//   const [priceResults, setPriceResults] = useState({});

  

//   const globalTaxOption = items && items.length > 0 ? items[0].taxOption || "GST" : "GST";

//   /* ---------- API fetch ---------- */
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     const fetchData = async () => {
//       try {
//         const [itemsRes, warehouseRes] = await Promise.all([
//           axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } }),
//           axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);
//         if (itemsRes.data?.success) setApiItems(itemsRes.data.data || []);
//         else if (Array.isArray(itemsRes.data)) setApiItems(itemsRes.data || []);
//         if (warehouseRes.data?.success) setWarehouses(warehouseRes.data.data || []);
//         else if (Array.isArray(warehouseRes.data)) setWarehouses(warehouseRes.data || []);
//       } catch (err) {
//         console.error("ItemSection fetch error:", err);
//       }
//     };
//     fetchData();
//   }, []);

//   /* ---------- Handlers ---------- */
//   const handleSearchChange = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });
//     if (!value) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }
//     const filtered = apiItems.filter((itm) =>
//       (itm.itemName || "").toLowerCase().includes(value.toLowerCase())
//     );
//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };

//   const handleSearchChangecode = (index, value) => {
//     onItemChange(index, { target: { name: "itemCode", value } });
//     if (!value) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }
//     const filtered = apiItems.filter((itm) =>
//       (itm.itemCode || "").toLowerCase().includes(value.toLowerCase())
//     );
//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };


// // const comparePrice = async (index, item) => {
// //   console.log("COMPARE START — index:", index, "item:", item);

// //   if (!item || !item.itemName) {
// //     toast.error("Select item first");
// //     return;
// //   }

// //   try {
// //     const res = await axios.post("/api/check-price", {
// //       itemName: item.itemName,
// //     });

// //     console.log("API RESPONSE:", res.data);

// //     const { market, ai } = res.data;

// //     if (!ai || !ai.recommendedSellingPrice) {
// //       console.log("AI RESPONSE INVALID:", ai);
// //       toast.error("AI could not suggest a price");
// //       return;
// //     }

// //     const newUnitPrice = Number(ai.recommendedSellingPrice) || 0;

// //     setFormData(prev => {
// //       console.log("PREVIOUS FORM DATA:", prev);

// //       const items = Array.isArray(prev.items) ? [...prev.items] : [];

// //       if (!items[index]) {
// //         console.log("ITEM ROW IS MISSING — INDEX:", index);
// //         toast.error("Item row missing");
// //         return prev;
// //       }

// //       const updatedItem = { ...items[index] };

// //       const computed = computeItemValues({
// //         ...updatedItem,
// //         unitPrice: newUnitPrice,
// //         quantity: updatedItem.quantity || 1,
// //       });

// //       console.log("COMPUTED:", computed);

// //       items[index] = {
// //         ...updatedItem,
// //         marketPrices: market,
// //         aiSuggestion: ai,
// //         unitPrice: newUnitPrice,
// //         ...computed,
// //       };

// //       return { ...prev, items };
// //     });

// //     toast.success("Price comparison updated");
// //   } catch (e) {
// //     console.log("COMPARE ERROR:", e);   // <---- THE REAL ERROR
// //     toast.error("Error comparing price");
// //   }
// // };



// const comparePrice = async (index, item) => {
//   if (!item || !item.itemName) {
//     toast.error("Select item first");
//     return;
//   }

//   try {
//     const res = await axios.post("/api/check-price", {
//       itemName: item.itemName,
//     });

//     const { market, ai } = res.data;

//     setPriceResults(prev => ({
//       ...prev,
//       [index]: { market, ai }
//     }));

//     toast.success("Price comparison fetched");
//   } catch (e) {
//     console.log("COMPARE ERROR:", e);
//     toast.error("Error comparing price");
//   }
// };



//   const createNewItemFromSearch = (index) => {
//     const currentRow = items[index] || {};
//     const updatedRow = {
//       ...currentRow,
//       itemName: currentRow.itemName || noMatchInfo.text,
//       itemCode: currentRow.itemCode || "",
//       isNewItem: true,
//       taxOption: currentRow.taxOption || globalTaxOption,
//     };
//     Object.entries(updatedRow).forEach(([key, value]) =>
//       onItemChange(index, { target: { name: key, value } })
//     );
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleFieldChange = (index, field, value) => {
//     const newValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const updatedItem = { ...items[index], [field]: newValue };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleTaxOptionChange = (index, value) => {
//     const updatedItem = { ...items[index], taxOption: value };
//     if (value === "IGST" && (!updatedItem.igstRate || updatedItem.igstRate === 0)) {
//       updatedItem.igstRate = updatedItem.gstRate || 0;
//     }
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleGstRateChange = (index, value) => {
//     const updatedItem = { ...items[index], gstRate: parseFloat(value) || 0 };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleIgstRateChange = (index, value) => {
//     const updatedItem = { ...items[index], igstRate: parseFloat(value) || 0 };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleItemSelect = (index, selectedItem) => {
//     // Populate the row with selectedItem data and compute tax/amounts
//     const unitPrice = parseFloat(selectedItem.unitPrice) || 0;
//     const discount = parseFloat(selectedItem.discount) || 0;
//     const freight = parseFloat(selectedItem.freight) || 0;
//     const quantity = 1;
//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = selectedItem.gstRate || 0;
//     const igstRate = taxOption === "IGST" ? selectedItem.igstRate || gstRate : 0;
//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount = quantity * priceAfterDiscount + freight;
//     const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const gstAmount = cgstAmount + sgstAmount;

//     const updatedItem = {
//       item: selectedItem._id,
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       unitPrice,
//       discount,
//       freight,
//       quantity,
//       taxOption,
//       gstRate,
//       igstRate,
//       cgstAmount,
//       sgstAmount,
//       gstAmount,
//       priceAfterDiscount,
//       totalAmount,
//       isNewItem: false,
//     };

//     // Update parent row (calls onItemChange repeatedly to mimic form input)
//     Object.entries(updatedItem).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );

//     // NEW: notify parent with the full selected item object (so parent can do lookups)
//     if (typeof onItemSelect === "function") {
//       try {
//         onItemSelect(index, selectedItem);
//       } catch (err) {
//         // swallow to avoid parent errors breaking UI
//         console.warn("onItemSelect callback threw:", err);
//       }
//     }

//     setShowDropdown(false);
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleSearchChangeWarehouse = (index, value) => {
//     onItemChange(index, { target: { name: "warehouseName", value } });
//     if (value.length > 0) {
//       const filtered = warehouses.filter(
//         (wh) =>
//           (wh.warehouseName || "").toLowerCase().includes(value.toLowerCase()) ||
//           (wh.warehouseCode || "").toLowerCase().includes(value.toLowerCase())
//       );
//       setFilteredWarehouses(filtered);
//       setShowWarehouseDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowWarehouseDropdown(false);
//     }
//   };

//   const handleWarehouseSelect = async (index, selectedWarehouse) => {
//     onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
//     onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
//     onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });

//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`/api/warehouse/${selectedWarehouse.warehouseCode}/bins`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
//     } catch (err) {
//       console.error(err);
//       onItemChange(index, { target: { name: "binLocations", value: [] } });
//     }

//     setShowWarehouseDropdown(false);
//   };

//   /* ---------- render ---------- */
//   return (
//     <div className="overflow-x-auto">
//       <div className="max-w-[1200px]">
//         <table className="min-w-full table-auto border-collapse">
//           <thead>
//             <tr className="bg-blue-500 text-white">
//               <th className="border p-2 whitespace-nowrap">Item Code</th>
//               <th className="border p-2 whitespace-nowrap">Item Name</th>
//               <th className="border p-2 whitespace-nowrap">Description</th>
//               <th className="border p-2 whitespace-nowrap">Qty</th>
//               <th className="border p-2 whitespace-nowrap">Unit Price</th>
//               <th className="border p-2 whitespace-nowrap">Discount</th>
//               <th className="border p-2 whitespace-nowrap">Price</th>
//               <th className="border p-2 whitespace-nowrap">Freight</th>
//               <th className="border p-2 whitespace-nowrap">Total</th>
//               <th className="border p-2 whitespace-nowrap">Tax Option</th>
//               {globalTaxOption === "GST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">GST %</th>
//                   <th className="border p-2 whitespace-nowrap">GST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">CGST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">SGST Amt</th>
//                 </>
//               )}
//               {globalTaxOption === "IGST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">IGST %</th>
//                   <th className="border p-2 whitespace-nowrap">IGST Amt</th>
//                 </>
//               )}
//               <th className="border p-2 whitespace-nowrap">Warehouse</th>
//               <th className="border p-2 whitespace-nowrap">Bin</th>
//               <th className="border p-2 whitespace-nowrap">Compare Price</th>
//               <th className="border p-2 whitespace-nowrap">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((item, index) => {
//               const computedValues = computeItemValues(item);
//               return (
//                 <tr key={index} className="border-t hover:bg-gray-50">
//                   {/* Item Code */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       value={item.itemCode ?? ""}
//                       onChange={(e) => handleSearchChangecode(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Code"
//                     />
//                   </td>
//                   {/* Item Name */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.itemName ?? ""}
//                       onChange={(e) => handleSearchChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Name"
//                     />
//                     {showDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredItems.map((itm) => (
//                           <div
//                             key={itm._id}
//                             className="p-1 hover:bg-gray-100 cursor-pointer"
//                             onClick={() => handleItemSelect(index, itm)}
//                           >
//                             <div className="font-medium">{itm.itemName}</div>
//                             <div className="text-xs text-gray-500">{itm.itemCode}</div>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                     {noMatchInfo.index === index && (
//                       <div className="mt-1 text-xs bg-yellow-50 border border-yellow-200 p-1 rounded">
//                         No item found.{" "}
//                         <button
//                           className="text-blue-600 underline"
//                           onClick={() => createNewItemFromSearch(index)}
//                         >
//                           Add new item
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                   {/* Description */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       name="itemDescription"
//                       value={item.itemDescription ?? ""}
//                       onChange={(e) => onItemChange(index, e)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Quantity */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.quantity ?? 0}
//                       onChange={(e) => handleFieldChange(index, "quantity", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Unit Price */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.unitPrice ?? 0}
//                       onChange={(e) => handleFieldChange(index, "unitPrice", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Discount */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.discount ?? 0}
//                       onChange={(e) => handleFieldChange(index, "discount", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Price After Discount */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.priceAfterDiscount ?? 0}
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   {/* Freight */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.freight ?? 0}
//                       onChange={(e) => handleFieldChange(index, "freight", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Total */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.totalAmount ?? 0}
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   {/* Tax Option */}
//                   <td className="p-2 border">
//                     <select
//                       value={item.taxOption || "GST"}
//                       onChange={(e) => handleTaxOptionChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                     >
//                       <option value="GST">GST</option>
//                       <option value="IGST">IGST</option>
//                     </select>
//                   </td>
//                   {/* GST / IGST */}
//                   {item.taxOption === "GST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           value={item.gstRate ?? 0}
//                           onChange={(e) => handleGstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.gstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.cgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.sgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                     </>
//                   )}
//                   {item.taxOption === "IGST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           value={item.igstRate ?? 0}
//                           onChange={(e) => handleIgstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.igstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                     </>
//                   )}
//                   {/* Warehouse */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.warehouseName ?? ""}
//                       onChange={(e) => handleSearchChangeWarehouse(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                     {showWarehouseDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredWarehouses.map((wh) => (
//                           <div
//                             key={wh._id}
//                             className="p-1 hover:bg-gray-100 cursor-pointer"
//                             onClick={() => handleWarehouseSelect(index, wh)}
//                           >
//                             {wh.warehouseName} ({wh.warehouseCode})
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </td>

//                   {/* Bin */}
//                   <td className="p-2 border">
//                     {item.binLocations?.length > 0 ? (
//                       <select
//                         value={item.selectedBin?._id || ""}
//                         onChange={(e) => {
//                           const bin = item.binLocations.find((b) => b._id === e.target.value) || null;
//                           onItemChange(index, { target: { name: "selectedBin", value: bin } });
//                         }}
//                         className="w-full border rounded px-2 py-1 text-sm"
//                         style={{ minWidth: "120px", maxWidth: "160px" }}
//                       >
//                         <option value="">Select Bin</option>
//                         {item.binLocations.map((bin) => (
//                           <option key={bin._id} value={bin._id}>
//                             {bin.code}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       <span className="text-gray-400 text-sm">N/A</span>
//                     )}
//                   </td>
//                   {/* Compare Price */}
//                   <td className="p-2 border">
//                    <button
//   type="button"
//   className="px-2 py-1 bg-purple-600 text-white rounded text-sm"
//   onClick={() => comparePrice(index, item)}
// >
//   Compare Price
// </button>

// {priceResults[index] && (
//   <div className="mt-2 p-2 border rounded bg-gray-100">
//     <p><b>Amazon:</b> ₹{priceResults[index].market[0]?.price || "N/A"}</p>
//     <p><b>Flipkart:</b> ₹{priceResults[index].market[1]?.price || "N/A"}</p>

//     <p className="mt-2">
//       <b>AI Suggestion:</b> ₹{priceResults[index].ai?.recommendedSellingPrice}
//     </p>
//     <p><b>Reason:</b> {priceResults[index].ai?.reason}</p>
//     <p><b>Strategy:</b> {priceResults[index].ai?.strategy}</p>
//   </div>
// )}


//                   </td>

              
//                   {/* Actions */}
//                   <td className="p-2 border">
//                     <button
//                       type="button"
//                       onClick={() => onRemoveItem(index)}
//                       className="text-red-600 hover:underline"
//                     >
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-5 w-5"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                         />
//                       </svg>
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//         <button
//           type="button"
//           onClick={onAddItem}
//           className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//         >
//           Add Item
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ItemSection;


