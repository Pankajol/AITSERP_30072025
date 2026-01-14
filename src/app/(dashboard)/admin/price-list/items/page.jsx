"use client";



import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

// 1. Wrap the actual page content in a separate component
function PriceListContent() {
  const searchParams = useSearchParams();
  const priceListId = searchParams.get("priceListId");

  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [prices, setPrices] = useState({});
  const [search, setSearch] = useState("");

  const [savingRow, setSavingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [importing, setImporting] = useState(false);

  // ✅ Toast refs (to avoid duplicates)
  const loadToastIdRef = useRef(null);
  const importToastIdRef = useRef(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  /* =========================
     HELPERS
  ========================= */
  const toNum = (v, def = 0) => {
    if (v === "" || v === null || v === undefined) return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const calcDiscAmtFromPercent = (sellingPrice, discPercent) => {
    const sp = toNum(sellingPrice, 0);
    const dp = toNum(discPercent, 0);
    if (sp <= 0 || dp <= 0) return "";
    return Number(((sp * dp) / 100).toFixed(2));
  };

  const calcDiscPercentFromAmt = (sellingPrice, discAmount) => {
    const sp = toNum(sellingPrice, 0);
    const da = toNum(discAmount, 0);
    if (sp <= 0 || da <= 0) return "";
    return Number(((da / sp) * 100).toFixed(2));
  };

  // ✅ Disc% -> Disc Amt
  const handleDiscPercentChange = (itemId, value) => {
    setPrices((prev) => {
      const row = prev[itemId] || {};
      const sp = toNum(row.sellingPrice, 0);

      const dpRaw = value === "" ? "" : value;
      const dp = value === "" ? 0 : toNum(value, 0);

      const discAmt = value === "" ? "" : calcDiscAmtFromPercent(sp, dp);

      return {
        ...prev,
        [itemId]: {
          ...row,
          discountPercent: dpRaw,
          discountAmount: discAmt,
        },
      };
    });
  };

  // ✅ Disc Amt -> Disc%
  const handleDiscAmountChange = (itemId, value) => {
    setPrices((prev) => {
      const row = prev[itemId] || {};
      const sp = toNum(row.sellingPrice, 0);

      const daRaw = value === "" ? "" : value;
      const da = value === "" ? 0 : toNum(value, 0);

      const discPercent = value === "" ? "" : calcDiscPercentFromAmt(sp, da);

      return {
        ...prev,
        [itemId]: {
          ...row,
          discountAmount: daRaw,
          discountPercent: discPercent,
        },
      };
    });
  };

  // ✅ Selling price change should recalc the other discount field
  const handleSellingPriceChange = (itemId, sellingPrice) => {
    setPrices((prev) => {
      const row = prev[itemId] || {};
      const dp = toNum(row.discountPercent, 0);
      const da = toNum(row.discountAmount, 0);

      let newDiscAmt = row.discountAmount ?? "";
      let newDiscPercent = row.discountPercent ?? "";

      if (dp > 0) {
        newDiscAmt = calcDiscAmtFromPercent(sellingPrice, dp);
      } else if (da > 0) {
        newDiscPercent = calcDiscPercentFromAmt(sellingPrice, da);
      }

      return {
        ...prev,
        [itemId]: {
          ...row,
          sellingPrice,
          discountAmount: newDiscAmt,
          discountPercent: newDiscPercent,
        },
      };
    });
  };

  const normalizeDate = (v) => {
    if (!v) return "";

    // already yyyy-mm-dd
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // Excel date number
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return "";
      const yyyy = String(d.y).padStart(4, "0");
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    // other strings
    const dt = new Date(v);
    if (isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const computeFinalPrice = (row) => {
    const sp = toNum(row?.sellingPrice, 0);
    const dp = toNum(row?.discountPercent, 0);
    const da = toNum(row?.discountAmount, 0);

    let final = sp;
    if (dp > 0) final -= (final * dp) / 100;
    if (da > 0) final -= da;

    if (!Number.isFinite(final)) return 0;
    return Math.max(0, Number(final.toFixed(2)));
  };

  const updateRow = (itemId, patch) => {
    setPrices((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        ...patch,
      },
    }));
  };

  /* =========================
     TEMPLATE DOWNLOADS
  ========================= */
  const downloadTemplateExcel = () => {
    const rows = [
      {
        itemCode: "ITM001",
        sellingPrice: 100,
        gstPercent: 18,
        discountPercent: 10,
        discountAmount: 0,
        validFrom: "2026-01-01",
        validUpto: "2026-12-31",
      },
      {
        itemCode: "ITM002",
        sellingPrice: 250,
        gstPercent: 18,
        discountPercent: 0,
        discountAmount: 0,
        validFrom: "",
        validUpto: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "PriceList_Items_Import_Template.xlsx");
  };

  const downloadTemplateCSV = () => {
    const csv = `itemCode,sellingPrice,gstPercent,discountPercent,discountAmount,validFrom,validUpto
ITM001,100,18,10,0,2026-01-01,2026-12-31
ITM002,250,18,0,0,,
`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "PriceList_Items_Import_Template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* =========================
     FETCH WAREHOUSES
  ========================= */
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/api/warehouse", { headers });
        if (cancelled) return;
        setWarehouses(res.data.data || []);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        toast.error("Failed to fetch warehouses");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, headers]);

  /* =========================
     FETCH ITEMS FROM INVENTORY (Warehouse wise POS)
  ========================= */
  useEffect(() => {
    if (!token || !selectedWarehouse) {
      setItems([]);
      return;
    }

    let cancelled = false;

    if (loadToastIdRef.current) toast.dismiss(loadToastIdRef.current);
    loadToastIdRef.current = toast.loading("Loading warehouse items...");

    (async () => {
      try {
        const res = await axios.get(
          `/api/inventory?warehouseId=${selectedWarehouse}&posOnly=true&limit=5000`,
          { headers }
        );

        if (cancelled) return;

        const inv = res.data.data || [];

        const list = inv
          .filter((x) => x.item)
          .map((x) => ({
            ...x.item,
            availableQty: x?.quantity ?? 0,
          }));

        const map = new Map();
        list.forEach((it) => map.set(it._id, it));
        setItems([...map.values()]);

        toast.update(loadToastIdRef.current, {
          render: "✅ Items loaded",
          type: "success",
          isLoading: false,
          autoClose: 1200,
        });

        loadToastIdRef.current = null;
      } catch (err) {
        console.error(err);
        if (cancelled) return;

        toast.update(loadToastIdRef.current, {
          render: "❌ Failed to fetch warehouse items",
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });

        loadToastIdRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, headers, selectedWarehouse]);

  /* =========================
     FETCH EXISTING PRICES
  ========================= */
  useEffect(() => {
    if (!priceListId || !selectedWarehouse || !token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get(
          `/api/pricelist/items?priceListId=${priceListId}&warehouseId=${selectedWarehouse}`,
          { headers }
        );

        if (cancelled) return;

        const map = {};
        (res.data.data || []).forEach((p) => {
          map[p.itemId._id] = {
            _id: p._id,
            sellingPrice: p.sellingPrice,
            gstPercent: p.gstPercent ?? 18,
            discountPercent: p.discountPercent ?? "",
            discountAmount: p.discountAmount ?? "",
            validFrom: p.validFrom ? String(p.validFrom).slice(0, 10) : "",
            validUpto: p.validUpto ? String(p.validUpto).slice(0, 10) : "",
          };
        });

        setPrices(map);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        toast.error("Failed to fetch existing prices");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [priceListId, selectedWarehouse, token, headers]);

  /* =========================
     FILTER ITEMS
  ========================= */
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      return (
        it.itemName?.toLowerCase().includes(q) ||
        it.itemCode?.toLowerCase().includes(q) ||
        it.posConfig?.barcode?.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  /* =========================
     VALIDATION
  ========================= */
  const validateRow = (item, row) => {
    const sp = toNum(row?.sellingPrice, 0);
    const gp = toNum(row?.gstPercent, 18);
    const dp = toNum(row?.discountPercent, 0);
    const da = toNum(row?.discountAmount, 0);

    if (sp <= 0) return "Enter valid selling price";
    if (gp < 0 || gp > 100) return "GST must be 0 to 100";
    if (dp < 0 || dp > 100) return "Discount % must be 0 to 100";
    if (da < 0) return "Discount amount cannot be negative";

    if (item?.posConfig?.allowDiscount === false && (dp > 0 || da > 0)) {
      return "Discount not allowed for this POS item";
    }

    const maxDisc = toNum(item?.posConfig?.maxDiscountPercent, 100);
    if (dp > maxDisc) return `Discount % cannot exceed ${maxDisc}`;

    if (row?.validFrom && row?.validUpto) {
      const from = new Date(row.validFrom);
      const upto = new Date(row.validUpto);
      if (upto < from) return "Valid Upto cannot be before Valid From";
    }

    const final = computeFinalPrice(row);
    if (final <= 0) return "Final price cannot be 0";

    return null;
  };

  /* =========================
     SAVE PRICE
  ========================= */
  const savePrice = async (item) => {
    const itemId = item._id;
    const row = prices[itemId] || {};

    const err = validateRow(item, row);
    if (err) return toast.error(err);

    setSavingRow(itemId);
    const t = toast.loading("Saving...");

    try {
      await axios.post(
        "/api/pricelist/items",
        {
          priceListId,
          warehouseId: selectedWarehouse,
          itemId,

          sellingPrice: toNum(row.sellingPrice, 0),
          gstPercent: toNum(row.gstPercent, 18),

          discountPercent: toNum(row.discountPercent, 0),
          discountAmount: toNum(row.discountAmount, 0),

          validFrom: row.validFrom || null,
          validUpto: row.validUpto || null,
        },
        { headers }
      );

      toast.update(t, {
        render: "✅ Price saved",
        type: "success",
        isLoading: false,
        autoClose: 1200,
      });
    } catch (e) {
      console.error(e);
      toast.update(t, {
        render: e.response?.data?.message || "Failed to save",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setSavingRow(null);
    }
  };

  /* =========================
     DELETE PRICE
  ========================= */
  const deletePrice = async (itemId) => {
    const row = prices[itemId];
    if (!row?._id) return toast.error("This item price is not saved yet");

    setDeletingRow(itemId);
    const t = toast.loading("Deleting...");

    try {
      await axios.delete(`/api/pricelist/items?_id=${row._id}`, { headers });

      setPrices((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });

      toast.update(t, {
        render: "✅ Deleted",
        type: "success",
        isLoading: false,
        autoClose: 1200,
      });
    } catch (e) {
      console.error(e);
      toast.update(t, {
        render: e.response?.data?.message || "Delete failed",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      setDeletingRow(null);
    }
  };

  /* =========================
     IMPORT EXCEL
  ========================= */
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedWarehouse) {
      toast.error("Select warehouse before import");
      e.target.value = "";
      return;
    }

    if (!priceListId) {
      toast.error("PriceListId missing");
      e.target.value = "";
      return;
    }

    setImporting(true);

    if (importToastIdRef.current) toast.dismiss(importToastIdRef.current);
    importToastIdRef.current = toast.loading("Importing Excel...");

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (!rows.length) {
        toast.update(importToastIdRef.current, {
          render: "❌ Excel is empty",
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
        importToastIdRef.current = null;
        setImporting(false);
        return;
      }

      const itemCodeMap = new Map();
      items.forEach((it) => itemCodeMap.set(String(it.itemCode).trim(), it));

      let applied = 0;
      let skipped = 0;

      setPrices((prev) => {
        const updates = { ...prev };

        for (const r of rows) {
          const itemCode = String(
            r.itemCode || r.ItemCode || r["Item Code"] || ""
          ).trim();

          if (!itemCode) {
            skipped++;
            continue;
          }

          const it = itemCodeMap.get(itemCode);
          if (!it) {
            skipped++;
            continue;
          }

          const row = updates[it._id] || {};

          const nextSellingPrice =
            r.sellingPrice !== "" ? String(r.sellingPrice) : row.sellingPrice ?? "";

          const nextDiscPercent =
            r.discountPercent !== "" ? String(r.discountPercent) : row.discountPercent ?? "";

          const nextDiscAmount =
            r.discountAmount !== "" ? String(r.discountAmount) : row.discountAmount ?? "";

          // ✅ keep sync for imported values
          let syncedDiscPercent = nextDiscPercent;
          let syncedDiscAmount = nextDiscAmount;

          if (nextDiscPercent !== "" && toNum(nextDiscPercent, 0) > 0) {
            syncedDiscAmount = calcDiscAmtFromPercent(nextSellingPrice, nextDiscPercent);
          } else if (nextDiscAmount !== "" && toNum(nextDiscAmount, 0) > 0) {
            syncedDiscPercent = calcDiscPercentFromAmt(nextSellingPrice, nextDiscAmount);
          }

          updates[it._id] = {
            ...row,
            sellingPrice: nextSellingPrice,

            gstPercent:
              r.gstPercent !== ""
                ? String(r.gstPercent)
                : row.gstPercent ?? 18,

            discountPercent: syncedDiscPercent,
            discountAmount: syncedDiscAmount,

            validFrom: normalizeDate(r.validFrom) || row.validFrom || "",
            validUpto: normalizeDate(r.validUpto) || row.validUpto || "",
          };

          applied++;
        }

        return updates;
      });

      toast.update(importToastIdRef.current, {
        render: `✅ Imported: ${applied} | Skipped: ${skipped}`,
        type: "success",
        isLoading: false,
        autoClose: 2200,
      });

      importToastIdRef.current = null;
    } catch (err) {
      console.error(err);

      toast.update(importToastIdRef.current, {
        render: "❌ Excel import failed",
        type: "error",
        isLoading: false,
        autoClose: 2500,
      });

      importToastIdRef.current = null;
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-6 w-full">
      <h1 className="text-2xl font-black uppercase">Price List Items</h1>

      {/* Controls */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Warehouse */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full border rounded-xl p-3 font-bold"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item name / code / barcode"
              className="w-full border rounded-xl p-3 font-bold"
            />
          </div>

          {/* Excel Import */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Import Excel
            </label>

            <label className="w-full flex items-center justify-center gap-2 cursor-pointer bg-black text-white rounded-xl px-4 py-3 font-black text-xs hover:bg-blue-600 transition">
              {importing ? "IMPORTING..." : "UPLOAD .XLSX"}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                disabled={importing}
                className="hidden"
              />
            </label>

            {/* ✅ Templates */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={downloadTemplateExcel}
                className="w-full bg-slate-100 text-slate-700 rounded-xl px-3 py-2 font-black text-[10px] hover:bg-black hover:text-white transition"
              >
                ⬇ XLSX TEMPLATE
              </button>

              <button
                type="button"
                onClick={downloadTemplateCSV}
                className="w-full bg-slate-100 text-slate-700 rounded-xl px-3 py-2 font-black text-[10px] hover:bg-black hover:text-white transition"
              >
                ⬇ CSV TEMPLATE
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-bold mt-2">
              Columns: itemCode, sellingPrice, gstPercent, discountPercent,
              discountAmount, validFrom, validUpto
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {!selectedWarehouse ? (
        <p className="text-slate-400 font-bold">
          Select warehouse to manage prices
        </p>
      ) : (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm min-w-[1400px]">
              <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                <tr>
                  <th className="px-6 py-4 text-left">Item</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Price (₹)</th>
                  <th className="px-6 py-4 text-center">Disc %</th>
                  <th className="px-6 py-4 text-center">Disc Amt</th>
                  <th className="px-6 py-4 text-center">Final</th>
                  <th className="px-6 py-4 text-center">GST %</th>
                  <th className="px-6 py-4 text-center">Valid From</th>
                  <th className="px-6 py-4 text-center">Valid Upto</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const row = prices[item._id] || {};
                  const final = computeFinalPrice(row);

                  return (
                    <tr key={item._id} className="border-t">
                      <td className="px-6 py-4 font-bold uppercase">
                        {item.itemName}
                        <p className="text-[10px] text-slate-400">
                          {item.itemCode}
                          {item?.posConfig?.barcode
                            ? ` | ${item.posConfig.barcode}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-center font-black">
                        {item.availableQty ?? 0}
                      </td>

                      {/* ✅ SELLING PRICE */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          value={row.sellingPrice ?? ""}
                          onChange={(e) =>
                            handleSellingPriceChange(item._id, e.target.value)
                          }
                          className="w-24 border rounded-lg text-center font-bold"
                        />
                      </td>

                      {/* ✅ DISC % */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          value={row.discountPercent ?? ""}
                          onChange={(e) =>
                            handleDiscPercentChange(item._id, e.target.value)
                          }
                          min="0"
                          max={item?.posConfig?.maxDiscountPercent ?? 100}
                          disabled={item?.posConfig?.allowDiscount === false}
                          className="w-16 border rounded-lg text-center font-bold"
                        />
                      </td>

                      {/* ✅ DISC AMT */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          value={row.discountAmount ?? ""}
                          onChange={(e) =>
                            handleDiscAmountChange(item._id, e.target.value)
                          }
                          min="0"
                          disabled={item?.posConfig?.allowDiscount === false}
                          className="w-20 border rounded-lg text-center font-bold"
                        />
                      </td>

                      <td className="px-6 py-4 text-center font-black">
                        {final}
                      </td>

                      {/* GST */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          value={row.gstPercent ?? 18}
                          onChange={(e) =>
                            updateRow(item._id, { gstPercent: e.target.value })
                          }
                          min="0"
                          max="100"
                          className="w-16 border rounded-lg text-center font-bold"
                        />
                      </td>

                      {/* VALID FROM */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="date"
                          value={row.validFrom ?? ""}
                          onChange={(e) =>
                            updateRow(item._id, {
                              validFrom: e.target.value,
                              validUpto:
                                row.validUpto &&
                                e.target.value &&
                                row.validUpto < e.target.value
                                  ? ""
                                  : row.validUpto,
                            })
                          }
                          className="border rounded-lg text-center font-bold px-2"
                        />
                      </td>

                      {/* VALID UPTO */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="date"
                          value={row.validUpto ?? ""}
                          min={row.validFrom || undefined}
                          onChange={(e) =>
                            updateRow(item._id, { validUpto: e.target.value })
                          }
                          className="border rounded-lg text-center font-bold px-2"
                        />
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => savePrice(item)}
                            disabled={savingRow === item._id}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-black disabled:opacity-60"
                          >
                            {savingRow === item._id ? "SAVING..." : "SAVE"}
                          </button>

                          <button
                            onClick={() => deletePrice(item._id)}
                            disabled={deletingRow === item._id}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-black disabled:opacity-60"
                          >
                            {deletingRow === item._id ? "..." : "DELETE"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-12 text-center text-slate-300 font-black"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-slate-50 text-[11px] font-bold text-slate-500">
            Tip: Excel import updates table values only. After import, click SAVE for each item.
          </div>
        </div>
      )}
    </div>
  );
}

// 2. The default export MUST be wrapped in Suspense
export default function PriceListItemsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-bold animate-pulse">Loading Page Architecture...</p>
      </div>
    }>
      <PriceListContent />
    </Suspense>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useSearchParams } from "next/navigation";
// import { toast } from "react-toastify";

// export default function PriceListItemsPage() {
//   const searchParams = useSearchParams();
//   const priceListId = searchParams.get("priceListId");

//   const [warehouses, setWarehouses] = useState([]);
//   const [items, setItems] = useState([]);
//   const [selectedWarehouse, setSelectedWarehouse] = useState("");
//   const [prices, setPrices] = useState({});

//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : "";

//   /* FETCH MASTERS */
//   useEffect(() => {
//     const headers = { Authorization: `Bearer ${token}` };

//     axios.get("/api/warehouse", { headers }).then(res =>
//       setWarehouses(res.data.data || [])
//     );

//     axios.get("/api/items?posOnly=true", { headers }).then(res =>
//       setItems(res.data.data || [])
//     );
//   }, []);

//   /* FETCH EXISTING PRICES */
//   useEffect(() => {
//     if (!priceListId || !selectedWarehouse) return;

//     axios
//       .get(
//         `/api/pricelist/items?priceListId=${priceListId}&warehouseId=${selectedWarehouse}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       )
//       .then(res => {
//         const map = {};
//         res.data.data.forEach(p => {
//           map[p.itemId._id] = {
//             sellingPrice: p.sellingPrice,
//             gstPercent: p.gstPercent,
//           };
//         });
//         setPrices(map);
//       });
//   }, [priceListId, selectedWarehouse]);

//   /* SAVE PRICE */
//   const savePrice = async (itemId) => {
//     const row = prices[itemId];
//     if (!row?.sellingPrice) {
//       toast.error("Enter selling price");
//       return;
//     }

//     const t = toast.loading("Saving price...");
//     try {
//       await axios.post(
//         "/api/pricelist/items",
//         {
//           priceListId,
//           warehouseId: selectedWarehouse,
//           itemId,
//           sellingPrice: Number(row.sellingPrice),
//           gstPercent: Number(row.gstPercent || 18),
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       toast.success("Price saved", { id: t });
//     } catch {
//       toast.error("Failed to save price", { id: t });
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-6">

//       <h1 className="text-2xl font-black uppercase">
//         Price List Items
//       </h1>

//       {/* WAREHOUSE SELECT */}
//       <div className="max-w-sm">
//         <label className="block text-xs font-bold text-slate-500 mb-1">
//           Warehouse
//         </label>
//         <select
//           value={selectedWarehouse}
//           onChange={(e) => setSelectedWarehouse(e.target.value)}
//           className="w-full border rounded-xl p-3 font-bold"
//         >
//           <option value="">Select Warehouse</option>
//           {warehouses.map(w => (
//             <option key={w._id} value={w._id}>{w.warehouseName}</option>
//           ))}
//         </select>
//       </div>

//       {!selectedWarehouse ? (
//         <p className="text-slate-400 font-bold">
//           Select warehouse to manage prices
//         </p>
//       ) : (
//         <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
//           <table className="w-full text-sm">
//             <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
//               <tr>
//                 <th className="px-6 py-4">Item</th>
//                 <th className="px-6 py-4 text-center">Price (₹)</th>
//                 <th className="px-6 py-4 text-center">GST %</th>
//                 <th className="px-6 py-4 text-right">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.map(item => {
//                 const row = prices[item._id] || {};
//                 return (
//                   <tr key={item._id} className="border-t">
//                     <td className="px-6 py-4 font-bold uppercase">
//                       {item.itemName}
//                       <p className="text-[10px] text-slate-400">
//                         {item.itemCode}
//                       </p>
//                     </td>

//                     <td className="px-6 py-4 text-center">
//                       <input
//                         type="number"
//                         value={row.sellingPrice || ""}
//                         onChange={(e) =>
//                           setPrices({
//                             ...prices,
//                             [item._id]: {
//                               ...row,
//                               sellingPrice: e.target.value,
//                             },
//                           })
//                         }
//                         className="w-24 border rounded-lg text-center font-bold"
//                       />
//                     </td>

//                     <td className="px-6 py-4 text-center">
//                       <input
//                         type="number"
//                         value={row.gstPercent ?? 18}
//                         onChange={(e) =>
//                           setPrices({
//                             ...prices,
//                             [item._id]: {
//                               ...row,
//                               gstPercent: e.target.value,
//                             },
//                           })
//                         }
//                         className="w-16 border rounded-lg text-center font-bold"
//                       />
//                     </td>

//                     <td className="px-6 py-4 text-right">
//                       <button
//                         onClick={() => savePrice(item._id)}
//                         className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-black"
//                       >
//                         SAVE
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               })}

//               {items.length === 0 && (
//                 <tr>
//                   <td colSpan={4} className="py-12 text-center text-slate-300 font-black">
//                     No items found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
