"use client";

import { useMemo, useState } from "react";

/** =========================
 * CONSTANTS
 ========================= */
const PACK_TYPES = [
  { key: "PALLETIZATION", label: "Palletization" },
  { key: "UNIFORM - BAGS/BOXES", label: "Uniform - Bags/Boxes" },
  { key: "LOOSE - CARGO", label: "Loose - Cargo" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultRow(packType) {
  if (packType === "PALLETIZATION") {
    return {
      _id: uid(),
      noOfPallets: "",
      unitPerPallets: "",
      totalPkgs: "",
      pkgsType: "",
      uom: "",
      skuSize: "",
      packWeight: "",
      productName: "",
      wtLtr: "",
    };
  }

  if (packType === "UNIFORM - BAGS/BOXES") {
    return {
      _id: uid(),
      totalPkgs: "",
      pkgsType: "",
      uom: "",
      skuSize: "",
      packWeight: "",
      productName: "",
      wtLtr: "",
      actualWt: "",
      chargedWt: "",
      wtUom: "",
    };
  }

  return {
    _id: uid(),
    uom: "",
    productName: "",
    actualWt: "",
    chargedWt: "",
  };
}

/** =========================
 * NEW: Plant/Route Row (missing part)
 ========================= */
function defaultPlantRow() {
  return {
    _id: uid(),
    plantCode: "Not Applicable",
    orderType: "Sales",   // ✅ default from list
    pinCode: "",
    from: "",
    to: "",
    district: "",
    state: "",
    weight: "",
    status: "Open",       // ✅ default from list
  };
}

export default function ModernOrderPanel() {
  /** =========================
   * HEADER (same fields)
   ========================= */
  const [top, setTop] = useState({
    orderNo: "JL-Aug-001",
    branch: "Kandla",
    delivery: "Urgent",
    date: "2020-08-01",
    partyName: "Indorama India Pvt Ltd",

    collectionCharges: "100",
    cancellationCharges: "Nil",
    loadingCharges: "Nil",
    otherCharges: "Nil",
  });

  /** =========================
   * ✅ MISSING PART ADDED:
   * PLANT GRID TABLE DATA
   ========================= */
  const [plantRows, setPlantRows] = useState([
    {
      _id: uid(),
      plantCode: "Kandla - 9002",
      orderType: "Sales",
      pinCode: "207243",
      from: "Kandla",
      to: "Agra",
      district: "Agra",
      state: "Uttar Pradesh",
      weight: "20",
      status: "Open",
    },
    {
      _id: uid(),
      plantCode: "Not Applicable",
      orderType: "STO Order",
      pinCode: "Owner",
      from: "Owner",
      to: "Owner",
      district: "Owner",
      state: "Owner",
      weight: "",
      status: "Hold",
    },
  ]);

  const addPlantRow = () => setPlantRows((p) => [...p, defaultPlantRow()]);

  const updatePlantRow = (rowId, key, value) => {
    setPlantRows((prev) =>
      prev.map((r) => (r._id === rowId ? { ...r, [key]: value } : r))
    );
  };

  const removePlantRow = (rowId) => {
    setPlantRows((prev) => prev.filter((r) => r._id !== rowId));
  };

  /** =========================
   * PACK DATA
   ========================= */
  const [activePack, setActivePack] = useState("PALLETIZATION");

  const [packData, setPackData] = useState({
    PALLETIZATION: [defaultRow("PALLETIZATION")],
    "UNIFORM - BAGS/BOXES": [],
    "LOOSE - CARGO": [],
  });

  /** =========================
   * RIGHT DRAWER (edit row)
   ========================= */
  const [drawer, setDrawer] = useState({
    open: false,
    packType: "",
    rowId: "",
  });

  const rows = packData[activePack] || [];

  const openRowEditor = (packType, rowId) =>
    setDrawer({ open: true, packType, rowId });

  const closeRowEditor = () =>
    setDrawer({ open: false, packType: "", rowId: "" });

  const selectedRow = useMemo(() => {
    if (!drawer.open) return null;
    return (
      (packData[drawer.packType] || []).find((r) => r._id === drawer.rowId) ||
      null
    );
  }, [drawer, packData]);

  const updateRow = (packType, rowId, key, value) => {
    setPackData((prev) => ({
      ...prev,
      [packType]: prev[packType].map((r) => {
        if (r._id !== rowId) return r;
        return { ...r, [key]: value };
      }),
    }));
  };

  const addRow = () => {
    setPackData((prev) => ({
      ...prev,
      [activePack]: [...prev[activePack], defaultRow(activePack)],
    }));
  };

  const removeRow = (packType, id) => {
    setPackData((prev) => ({
      ...prev,
      [packType]: prev[packType].filter((r) => r._id !== id),
    }));
    if (drawer.open && drawer.rowId === id) closeRowEditor();
  };

  const duplicateRow = (packType, id) => {
    const row = (packData[packType] || []).find((r) => r._id === id);
    if (!row) return;
    setPackData((prev) => ({
      ...prev,
      [packType]: [...prev[packType], { ...row, _id: uid() }],
    }));
  };

  const counts = useMemo(() => {
    return {
      pal: packData.PALLETIZATION?.length || 0,
      uni: packData["UNIFORM - BAGS/BOXES"]?.length || 0,
      loose: packData["LOOSE - CARGO"]?.length || 0,
    };
  }, [packData]);

  const handleSave = () => {
    const payload = { top, plantRows, packData };
    console.log("✅ SAVE PAYLOAD:", payload);
    alert("✅ Saved (console payload check)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* ===== Top Bar ===== */}
      <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Order Panel
            </div>
            <div className="text-xs text-slate-500">
              Modern UI • Same fields • Dynamic pack types
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              + Add Row
            </button>

            <button
              onClick={handleSave}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ===== Main Layout ===== */}
      <div className="mx-auto max-w-7xl p-4 grid grid-cols-12 gap-4">
        {/* Left */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Header info */}
          <Card title="Order Details">
            <div className="grid grid-cols-12 gap-3">
              <Input
                col="col-span-12 md:col-span-4"
                label="Order No"
                value={top.orderNo}
                onChange={(v) => setTop((p) => ({ ...p, orderNo: v }))}
              />
              <Input
                col="col-span-12 md:col-span-4"
                label="Branch"
                value={top.branch}
                onChange={(v) => setTop((p) => ({ ...p, branch: v }))}
              />
              <Select
                col="col-span-12 md:col-span-4"
                label="Delivery"
                value={top.delivery}
                onChange={(v) => setTop((p) => ({ ...p, delivery: v }))}
                options={["Urgent", "Normal"]}
              />

              <Input
                col="col-span-12 md:col-span-4"
                type="date"
                label="Date"
                value={top.date}
                onChange={(v) => setTop((p) => ({ ...p, date: v }))}
              />
              <Input
                col="col-span-12 md:col-span-8"
                label="Party Name"
                value={top.partyName}
                onChange={(v) => setTop((p) => ({ ...p, partyName: v }))}
              />

              <Input
                col="col-span-6 md:col-span-3"
                label="Collection Charges"
                value={top.collectionCharges}
                onChange={(v) =>
                  setTop((p) => ({ ...p, collectionCharges: v }))
                }
              />
              <Input
                col="col-span-6 md:col-span-3"
                label="Cancellation Charges"
                value={top.cancellationCharges}
                onChange={(v) =>
                  setTop((p) => ({ ...p, cancellationCharges: v }))
                }
              />
              <Input
                col="col-span-6 md:col-span-3"
                label="Loading Charges"
                value={top.loadingCharges}
                onChange={(v) => setTop((p) => ({ ...p, loadingCharges: v }))}
              />
              <Input
                col="col-span-6 md:col-span-3"
                label="Other Charges"
                value={top.otherCharges}
                onChange={(v) => setTop((p) => ({ ...p, otherCharges: v }))}
              />
            </div>
          </Card>

          {/* ✅ NEW SECTION INCLUDED HERE */}
          <Card
            title="Plant Code / Route"
            right={
              <button
                onClick={addPlantRow}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                +Add
              </button>
            }
          >
            <PlantGridTable
              rows={plantRows}
              onChange={updatePlantRow}
              onRemove={removePlantRow}
            />
          </Card>

          {/* Pack Type Tabs */}
          <Card
            title="Pack Type"
            right={
              <div className="flex gap-2">
                {PACK_TYPES.map((p) => {
                  const active = activePack === p.key;
                  const badge =
                    p.key === "PALLETIZATION"
                      ? counts.pal
                      : p.key === "UNIFORM - BAGS/BOXES"
                      ? counts.uni
                      : counts.loose;

                  return (
                    <button
                      key={p.key}
                      onClick={() => setActivePack(p.key)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold border transition
                        ${
                          active
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      {p.label}{" "}
                      <span
                        className={`ml-2 rounded-lg px-2 py-0.5 text-xs ${
                          active ? "bg-white/20" : "bg-slate-100"
                        }`}
                      >
                        {badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            }
          >
            <ModernTable
              packType={activePack}
              rows={rows}
              onEdit={(id) => openRowEditor(activePack, id)}
              onRemove={(id) => removeRow(activePack, id)}
              onDuplicate={(id) => duplicateRow(activePack, id)}
            />
          </Card>
        </div>

        {/* Right side */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card title="Quick Actions">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={addRow}
                className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold hover:bg-slate-50"
              >
                + Add Row (Pack)
              </button>
              <button
                onClick={() =>
                  setPackData({
                    PALLETIZATION: [],
                    "UNIFORM - BAGS/BOXES": [],
                    "LOOSE - CARGO": [],
                  })
                }
                className="rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                Clear Pack Rows
              </button>

              <button
                onClick={handleSave}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Save All ✅
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== Drawer Row Editor ===== */}
      {drawer.open && selectedRow ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeRowEditor}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  Edit Row
                </div>
                <div className="text-xs text-slate-500">{drawer.packType}</div>
              </div>
              <button
                onClick={closeRowEditor}
                className="rounded-xl border px-3 py-2 font-bold hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-auto h-[calc(100%-70px)] space-y-4">
              <RowEditor
                packType={drawer.packType}
                row={selectedRow}
                onChange={(key, val) =>
                  updateRow(drawer.packType, drawer.rowId, key, val)
                }
                onRemove={() => removeRow(drawer.packType, drawer.rowId)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** =========================
 * COMPONENTS
 ========================= */

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {right || null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, col = "", type = "text" }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </div>
  );
}

function Select({ label, value, onChange, options = [], col = "" }) {
  return (
    <div className={col}>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/** =========================
 * ✅ NEW: Plant Grid Table Component
 ========================= */
function PlantGridTable({ rows, onChange, onRemove }) {
  const cols = [
    { key: "plantCode", label: "Plant Code" },
    { key: "orderType", label: "Order Type" }, // ✅ select
    { key: "pinCode", label: "Pin Code" },
    { key: "from", label: "From" },
    { key: "to", label: "To" },
    { key: "district", label: "District" },
    { key: "state", label: "State" },
    { key: "weight", label: "Weight" },
    { key: "status", label: "Status" }, // ✅ select
  ];

  const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
  const STATUSES = ["Open", "Hold", "Cancelled"];

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="sticky top-0 bg-yellow-300">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className="border border-black px-3 py-2 text-xs font-extrabold text-slate-900"
              >
                {c.label}
              </th>
            ))}
            <th className="border border-black px-3 py-2 text-xs font-extrabold text-slate-900">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className="hover:bg-slate-50">
              {cols.map((c) => {
                // ✅ Order Type Select
                if (c.key === "orderType") {
                  return (
                    <td key={c.key} className="border border-black px-2 py-2">
                      <select
                        value={r.orderType || ""}
                        onChange={(e) => onChange(r._id, "orderType", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        {ORDER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                }

                // ✅ Status Select
                if (c.key === "status") {
                  return (
                    <td key={c.key} className="border border-black px-2 py-2">
                      <select
                        value={r.status || ""}
                        onChange={(e) => onChange(r._id, "status", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                }

                // default input
                return (
                  <td key={c.key} className="border border-black px-2 py-2">
                    <input
                      value={r[c.key] || ""}
                      onChange={(e) => onChange(r._id, c.key, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </td>
                );
              })}

              <td className="border border-black px-2 py-2">
                <button
                  onClick={() => onRemove(r._id)}
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** ===== Modern Table but same columns ===== */
function ModernTable({ packType, rows, onEdit, onRemove, onDuplicate }) {
  const cols = useMemo(() => {
    if (packType === "PALLETIZATION")
      return [
        { key: "noOfPallets", label: "NO OF PALLETS" },
        { key: "unitPerPallets", label: "UNIT PER PALLETS" },
        { key: "totalPkgs", label: "TOTAL PKGS" },
        { key: "pkgsType", label: "PKGS TYPE" },
        { key: "uom", label: "UOM" },
        { key: "skuSize", label: "SKU - SIZE" },
        { key: "packWeight", label: "PACK - WEIGHT" },
        { key: "productName", label: "PRODUCT NAME" },
        { key: "wtLtr", label: "WT (LTR)" },
      ];

    if (packType === "UNIFORM - BAGS/BOXES")
      return [
        { key: "totalPkgs", label: "TOTAL PKGS" },
        { key: "pkgsType", label: "PKGS TYPE" },
        { key: "uom", label: "UOM" },
        { key: "skuSize", label: "SKU - SIZE" },
        { key: "packWeight", label: "PACK - WEIGHT" },
        { key: "productName", label: "PRODUCT NAME" },
        { key: "wtLtr", label: "WT (LTR)" },
        { key: "actualWt", label: "ACTUAL - WT" },
        { key: "chargedWt", label: "CHARGED - WT" },
        { key: "wtUom", label: "UOM" },
      ];

    return [
      { key: "uom", label: "UOM" },
      { key: "productName", label: "PRODUCT NAME" },
      { key: "actualWt", label: "ACTUAL - WT" },
      { key: "chargedWt", label: "CHARGED - WT" },
    ];
  }, [packType]);

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-slate-900 text-white">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wide"
              >
                {c.label}
              </th>
            ))}
            <th className="px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows.map((r) => (
              <tr key={r._id} className="border-t hover:bg-slate-50 transition">
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-3 text-slate-700">
                    {r[c.key] || <span className="text-slate-300">—</span>}
                  </td>
                ))}
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(r._id)}
                      className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDuplicate(r._id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => onRemove(r._id)}
                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={cols.length + 1}
                className="px-4 py-10 text-center text-slate-400 font-semibold"
              >
                No rows yet. Click <b>Add Row</b>.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** ===== Drawer Row Editor ===== */
function RowEditor({ packType, row, onChange, onRemove }) {
  const fields = useMemo(() => {
    if (packType === "PALLETIZATION") {
      return [
        ["noOfPallets", "NO OF PALLETS"],
        ["unitPerPallets", "UNIT PER PALLETS"],
        ["totalPkgs", "TOTAL PKGS"],
        ["pkgsType", "PKGS TYPE"],
        ["uom", "UOM"],
        ["skuSize", "SKU - SIZE"],
        ["packWeight", "PACK - WEIGHT"],
        ["productName", "PRODUCT NAME"],
        ["wtLtr", "WT (LTR)"],
      ];
    }

    if (packType === "UNIFORM - BAGS/BOXES") {
      return [
        ["totalPkgs", "TOTAL PKGS"],
        ["pkgsType", "PKGS TYPE"],
        ["uom", "UOM"],
        ["skuSize", "SKU - SIZE"],
        ["packWeight", "PACK - WEIGHT"],
        ["productName", "PRODUCT NAME"],
        ["wtLtr", "WT (LTR)"],
        ["actualWt", "ACTUAL - WT"],
        ["chargedWt", "CHARGED - WT"],
        ["wtUom", "UOM"],
      ];
    }

    return [
      ["uom", "UOM"],
      ["productName", "PRODUCT NAME"],
      ["actualWt", "ACTUAL - WT"],
      ["chargedWt", "CHARGED - WT"],
    ];
  }, [packType]);

  return (
    <div>
      <div className="grid grid-cols-12 gap-3">
        {fields.map(([key, label]) => (
          <div key={key} className="col-span-12 md:col-span-6">
            <label className="text-xs font-extrabold text-slate-600">
              {label}
            </label>
            <input
              value={row[key] || ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={onRemove}
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700"
        >
          Remove Row
        </button>
        <div className="flex-1" />
        <div className="text-xs text-slate-500 flex items-center">
          ✅ Editing in drawer improves UX
        </div>
      </div>
    </div>
  );
}


// "use client";

// import { useMemo, useState } from "react";

// /** =========================
//  * CONSTANTS
//  ========================= */
// const PACK_TYPES = [
//   { key: "PALLETIZATION", label: "Palletization" },
//   { key: "UNIFORM - BAGS/BOXES", label: "Uniform - Bags/Boxes" },
//   { key: "LOOSE - CARGO", label: "Loose - Cargo" },
// ];

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function defaultRow(packType) {
//   if (packType === "PALLETIZATION") {
//     return {
//       _id: uid(),
//       noOfPallets: "",
//       unitPerPallets: "",
//       totalPkgs: "",
//       pkgsType: "",
//       uom: "",
//       skuSize: "",
//       packWeight: "",
//       productName: "",
//       wtLtr: "",
//     };
//   }

//   if (packType === "UNIFORM - BAGS/BOXES") {
//     return {
//       _id: uid(),
//       totalPkgs: "",
//       pkgsType: "",
//       uom: "",
//       skuSize: "",
//       packWeight: "",
//       productName: "",
//       wtLtr: "",
//       actualWt: "",
//       chargedWt: "",
//       wtUom: "",
//     };
//   }

//   return {
//     _id: uid(),
//     uom: "",
//     productName: "",
//     actualWt: "",
//     chargedWt: "",
//   };
// }

// export default function ModernOrderPanel() {
//   /** =========================
//    * HEADER (same fields)
//    ========================= */
//   const [top, setTop] = useState({
//     orderNo: "JL-Aug-001",
//     branch: "Kandla",
//     delivery: "Urgent",
//     date: "2020-08-01",
//     partyName: "Indorama India Pvt Ltd",

//     collectionCharges: "100",
//     cancellationCharges: "Nil",
//     loadingCharges: "Nil",
//     otherCharges: "Nil",

//     plantCode: "Kandla - 9002",
//     orderType: "Sales",
//     pinCode: "207243",
//     from: "Kandla",
//     to: "Agra",
//     district: "Agra",
//     state: "Uttar Pradesh",
//     weight: "20",
//     status: "Open",
//   });

//   /** =========================
//    * PACK DATA
//    ========================= */
//   const [activePack, setActivePack] = useState("PALLETIZATION");

//   const [packData, setPackData] = useState({
//     "PALLETIZATION": [defaultRow("PALLETIZATION")],
//     "UNIFORM - BAGS/BOXES": [],
//     "LOOSE - CARGO": [],
//   });

//   /** =========================
//    * RIGHT DRAWER (edit row)
//    ========================= */
//   const [drawer, setDrawer] = useState({
//     open: false,
//     packType: "",
//     rowId: "",
//   });

//   const rows = packData[activePack] || [];

//   const openRowEditor = (packType, rowId) =>
//     setDrawer({ open: true, packType, rowId });

//   const closeRowEditor = () => setDrawer({ open: false, packType: "", rowId: "" });

//   const selectedRow = useMemo(() => {
//     if (!drawer.open) return null;
//     return (packData[drawer.packType] || []).find((r) => r._id === drawer.rowId) || null;
//   }, [drawer, packData]);

//   const updateRow = (packType, rowId, key, value) => {
//     setPackData((prev) => ({
//       ...prev,
//       [packType]: prev[packType].map((r) => {
//         if (r._id !== rowId) return r;
//         return { ...r, [key]: value };
//       }),
//     }));
//   };

//   const addRow = () => {
//     setPackData((prev) => ({
//       ...prev,
//       [activePack]: [...prev[activePack], defaultRow(activePack)],
//     }));
//   };

//   const removeRow = (packType, id) => {
//     setPackData((prev) => ({
//       ...prev,
//       [packType]: prev[packType].filter((r) => r._id !== id),
//     }));
//     if (drawer.open && drawer.rowId === id) closeRowEditor();
//   };

//   const duplicateRow = (packType, id) => {
//     const row = (packData[packType] || []).find((r) => r._id === id);
//     if (!row) return;
//     setPackData((prev) => ({
//       ...prev,
//       [packType]: [...prev[packType], { ...row, _id: uid() }],
//     }));
//   };

//   const counts = useMemo(() => {
//     return {
//       pal: packData["PALLETIZATION"]?.length || 0,
//       uni: packData["UNIFORM - BAGS/BOXES"]?.length || 0,
//       loose: packData["LOOSE - CARGO"]?.length || 0,
//     };
//   }, [packData]);

//   const handleSave = () => {
//     const payload = { top, packData };
//     console.log("✅ SAVE PAYLOAD:", payload);
//     alert("✅ Saved (console payload check)");
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
//       {/* ===== Top Bar ===== */}
//       <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
//         <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
//           <div>
//             <div className="text-lg font-extrabold text-slate-900">Order Panel</div>
//             <div className="text-xs text-slate-500">
//               Modern UI • Same fields • Dynamic pack types
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             <button
//               onClick={addRow}
//               className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
//             >
//               + Add Row
//             </button>

//             <button
//               onClick={handleSave}
//               className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
//             >
//               Save
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* ===== Main Layout ===== */}
//       <div className="mx-auto max-w-7xl p-4 grid grid-cols-12 gap-4">
//         {/* Left */}
//         <div className="col-span-12 lg:col-span-8 space-y-4">
//           {/* Header info (same fields, modern cards) */}
//           <Card title="Order Details">
//             <div className="grid grid-cols-12 gap-3">
//               <Input col="col-span-12 md:col-span-4" label="Order No" value={top.orderNo} onChange={(v) => setTop((p) => ({ ...p, orderNo: v }))} />
//               <Input col="col-span-12 md:col-span-4" label="Branch" value={top.branch} onChange={(v) => setTop((p) => ({ ...p, branch: v }))} />
//               <Select col="col-span-12 md:col-span-4" label="Delivery" value={top.delivery} onChange={(v) => setTop((p) => ({ ...p, delivery: v }))} options={["Urgent", "Normal"]} />

//               <Input col="col-span-12 md:col-span-4" type="date" label="Date" value={top.date} onChange={(v) => setTop((p) => ({ ...p, date: v }))} />
//               <Input col="col-span-12 md:col-span-8" label="Party Name" value={top.partyName} onChange={(v) => setTop((p) => ({ ...p, partyName: v }))} />

//               <Input col="col-span-6 md:col-span-3" label="Collection Charges" value={top.collectionCharges} onChange={(v) => setTop((p) => ({ ...p, collectionCharges: v }))} />
//               <Input col="col-span-6 md:col-span-3" label="Cancellation Charges" value={top.cancellationCharges} onChange={(v) => setTop((p) => ({ ...p, cancellationCharges: v }))} />
//               <Input col="col-span-6 md:col-span-3" label="Loading Charges" value={top.loadingCharges} onChange={(v) => setTop((p) => ({ ...p, loadingCharges: v }))} />
//               <Input col="col-span-6 md:col-span-3" label="Other Charges" value={top.otherCharges} onChange={(v) => setTop((p) => ({ ...p, otherCharges: v }))} />
//             </div>
//           </Card>

//           {/* Pack Type Tabs */}
//           <Card
//             title="Pack Type"
//             right={
//               <div className="flex gap-2">
//                 {PACK_TYPES.map((p) => {
//                   const active = activePack === p.key;
//                   const badge =
//                     p.key === "PALLETIZATION"
//                       ? counts.pal
//                       : p.key === "UNIFORM - BAGS/BOXES"
//                       ? counts.uni
//                       : counts.loose;

//                   return (
//                     <button
//                       key={p.key}
//                       onClick={() => setActivePack(p.key)}
//                       className={`rounded-xl px-3 py-2 text-sm font-bold border transition
//                         ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}
//                     >
//                       {p.label}{" "}
//                       <span className={`ml-2 rounded-lg px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-slate-100"}`}>
//                         {badge}
//                       </span>
//                     </button>
//                   );
//                 })}
//               </div>
//             }
//           >
//             <ModernTable
//               packType={activePack}
//               rows={rows}
//               onEdit={(id) => openRowEditor(activePack, id)}
//               onRemove={(id) => removeRow(activePack, id)}
//               onDuplicate={(id) => duplicateRow(activePack, id)}
//             />
//           </Card>
//         </div>

//         {/* Right side summary (UX boost) */}
//         <div className="col-span-12 lg:col-span-4 space-y-4">
//           <Card title="Route & Meta">
//             <div className="grid grid-cols-12 gap-3">
//               <Input col="col-span-6" label="Plant Code" value={top.plantCode} onChange={(v) => setTop((p) => ({ ...p, plantCode: v }))} />
//               <Input col="col-span-6" label="Order Type" value={top.orderType} onChange={(v) => setTop((p) => ({ ...p, orderType: v }))} />
//               <Input col="col-span-6" label="Pin Code" value={top.pinCode} onChange={(v) => setTop((p) => ({ ...p, pinCode: v }))} />
//               <Input col="col-span-6" label="District" value={top.district} onChange={(v) => setTop((p) => ({ ...p, district: v }))} />
//               <Input col="col-span-6" label="From" value={top.from} onChange={(v) => setTop((p) => ({ ...p, from: v }))} />
//               <Input col="col-span-6" label="To" value={top.to} onChange={(v) => setTop((p) => ({ ...p, to: v }))} />
//               <Input col="col-span-6" label="State" value={top.state} onChange={(v) => setTop((p) => ({ ...p, state: v }))} />
//               <Input col="col-span-6" label="Weight" value={top.weight} onChange={(v) => setTop((p) => ({ ...p, weight: v }))} />
//               <Select col="col-span-12" label="Status" value={top.status} onChange={(v) => setTop((p) => ({ ...p, status: v }))} options={["Open", "Closed", "Cancelled"]} />
//             </div>
//           </Card>

//           <Card title="Quick Actions">
//             <div className="grid grid-cols-2 gap-2">
//               <button
//                 onClick={addRow}
//                 className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold hover:bg-slate-50"
//               >
//                 + Add Row
//               </button>
//               <button
//                 onClick={() => setPackData({ "PALLETIZATION": [], "UNIFORM - BAGS/BOXES": [], "LOOSE - CARGO": [] })}
//                 className="rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
//               >
//                 Clear All
//               </button>
//             </div>
//           </Card>
//         </div>
//       </div>

//       {/* ===== Drawer Row Editor (Best UX) ===== */}
//       {drawer.open && selectedRow ? (
//         <div className="fixed inset-0 z-50">
//           <div className="absolute inset-0 bg-black/40" onClick={closeRowEditor} />
//           <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l">
//             <div className="p-4 border-b flex items-center justify-between">
//               <div>
//                 <div className="text-base font-extrabold text-slate-900">Edit Row</div>
//                 <div className="text-xs text-slate-500">{drawer.packType}</div>
//               </div>
//               <button
//                 onClick={closeRowEditor}
//                 className="rounded-xl border px-3 py-2 font-bold hover:bg-slate-50"
//               >
//                 Close
//               </button>
//             </div>

//             <div className="p-4 overflow-auto h-[calc(100%-70px)] space-y-4">
//               <RowEditor
//                 packType={drawer.packType}
//                 row={selectedRow}
//                 onChange={(key, val) => updateRow(drawer.packType, drawer.rowId, key, val)}
//                 onRemove={() => removeRow(drawer.packType, drawer.rowId)}
//               />
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// /** =========================
//  * COMPONENTS
//  ========================= */

// function Card({ title, right, children }) {
//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//       <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
//         <div className="text-sm font-extrabold text-slate-900">{title}</div>
//         {right || null}
//       </div>
//       <div className="p-4">{children}</div>
//     </div>
//   );
// }

// function Input({ label, value, onChange, col = "", type = "text" }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <input
//         type={type}
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//       />
//     </div>
//   );
// }

// function Select({ label, value, onChange, options = [], col = "" }) {
//   return (
//     <div className={col}>
//       <label className="text-xs font-bold text-slate-600">{label}</label>
//       <select
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//       >
//         {options.map((o) => (
//           <option key={o} value={o}>
//             {o}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// }

// /** ===== Modern Table but same columns ===== */
// function ModernTable({ packType, rows, onEdit, onRemove, onDuplicate }) {
//   const cols = useMemo(() => {
//     if (packType === "PALLETIZATION")
//       return [
//         { key: "noOfPallets", label: "NO OF PALLETS" },
//         { key: "unitPerPallets", label: "UNIT PER PALLETS" },
//         { key: "totalPkgs", label: "TOTAL PKGS" },
//         { key: "pkgsType", label: "PKGS TYPE" },
//         { key: "uom", label: "UOM" },
//         { key: "skuSize", label: "SKU - SIZE" },
//         { key: "packWeight", label: "PACK - WEIGHT" },
//         { key: "productName", label: "PRODUCT NAME" },
//         { key: "wtLtr", label: "WT (LTR)" },
//       ];

//     if (packType === "UNIFORM - BAGS/BOXES")
//       return [
//         { key: "totalPkgs", label: "TOTAL PKGS" },
//         { key: "pkgsType", label: "PKGS TYPE" },
//         { key: "uom", label: "UOM" },
//         { key: "skuSize", label: "SKU - SIZE" },
//         { key: "packWeight", label: "PACK - WEIGHT" },
//         { key: "productName", label: "PRODUCT NAME" },
//         { key: "wtLtr", label: "WT (LTR)" },
//         { key: "actualWt", label: "ACTUAL - WT" },
//         { key: "chargedWt", label: "CHARGED - WT" },
//         { key: "wtUom", label: "UOM" },
//       ];

//     return [
//       { key: "uom", label: "UOM" },
//       { key: "productName", label: "PRODUCT NAME" },
//       { key: "actualWt", label: "ACTUAL - WT" },
//       { key: "chargedWt", label: "CHARGED - WT" },
//     ];
//   }, [packType]);

//   return (
//     <div className="overflow-auto rounded-2xl border border-slate-200">
//       <table className="min-w-full text-sm">
//         <thead className="sticky top-0 bg-slate-900 text-white">
//           <tr>
//             {cols.map((c) => (
//               <th key={c.key} className="px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wide">
//                 {c.label}
//               </th>
//             ))}
//             <th className="px-3 py-3 text-left text-xs font-extrabold uppercase tracking-wide">
//               Actions
//             </th>
//           </tr>
//         </thead>

//         <tbody>
//           {rows.length ? (
//             rows.map((r, idx) => (
//               <tr
//                 key={r._id}
//                 className="border-t hover:bg-slate-50 transition"
//               >
//                 {cols.map((c) => (
//                   <td key={c.key} className="px-3 py-3 text-slate-700">
//                     {r[c.key] || <span className="text-slate-300">—</span>}
//                   </td>
//                 ))}
//                 <td className="px-3 py-3">
//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => onEdit(r._id)}
//                       className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => onDuplicate(r._id)}
//                       className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"
//                     >
//                       Duplicate
//                     </button>
//                     <button
//                       onClick={() => onRemove(r._id)}
//                       className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
//                     >
//                       Remove
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan={cols.length + 1} className="px-4 py-10 text-center text-slate-400 font-semibold">
//                 No rows yet. Click <b>Add Row</b>.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// /** ===== Drawer Row Editor ===== */
// function RowEditor({ packType, row, onChange, onRemove }) {
//   const fields = useMemo(() => {
//     if (packType === "PALLETIZATION") {
//       return [
//         ["noOfPallets", "NO OF PALLETS"],
//         ["unitPerPallets", "UNIT PER PALLETS"],
//         ["totalPkgs", "TOTAL PKGS"],
//         ["pkgsType", "PKGS TYPE"],
//         ["uom", "UOM"],
//         ["skuSize", "SKU - SIZE"],
//         ["packWeight", "PACK - WEIGHT"],
//         ["productName", "PRODUCT NAME"],
//         ["wtLtr", "WT (LTR)"],
//       ];
//     }

//     if (packType === "UNIFORM - BAGS/BOXES") {
//       return [
//         ["totalPkgs", "TOTAL PKGS"],
//         ["pkgsType", "PKGS TYPE"],
//         ["uom", "UOM"],
//         ["skuSize", "SKU - SIZE"],
//         ["packWeight", "PACK - WEIGHT"],
//         ["productName", "PRODUCT NAME"],
//         ["wtLtr", "WT (LTR)"],
//         ["actualWt", "ACTUAL - WT"],
//         ["chargedWt", "CHARGED - WT"],
//         ["wtUom", "UOM"],
//       ];
//     }

//     return [
//       ["uom", "UOM"],
//       ["productName", "PRODUCT NAME"],
//       ["actualWt", "ACTUAL - WT"],
//       ["chargedWt", "CHARGED - WT"],
//     ];
//   }, [packType]);

//   return (
//     <div>
//       <div className="grid grid-cols-12 gap-3">
//         {fields.map(([key, label]) => (
//           <div key={key} className="col-span-12 md:col-span-6">
//             <label className="text-xs font-extrabold text-slate-600">{label}</label>
//             <input
//               value={row[key] || ""}
//               onChange={(e) => onChange(key, e.target.value)}
//               className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//             />
//           </div>
//         ))}
//       </div>

//       <div className="mt-6 flex gap-2">
//         <button
//           onClick={onRemove}
//           className="rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700"
//         >
//           Remove Row
//         </button>
//         <div className="flex-1" />
//         <div className="text-xs text-slate-500 flex items-center">
//           ✅ Editing in drawer improves UX (no popup pain)
//         </div>
//       </div>
//     </div>
//   );
// }


