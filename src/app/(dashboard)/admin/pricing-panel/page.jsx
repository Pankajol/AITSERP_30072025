"use client";

import { useMemo, useState } from "react";

/* =========================
  CONSTANTS
========================= */
const DELIVERY_TYPES = ["Urgent", "Normal"];
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const BILLING_TYPES = ["Single - Order", "Multi - Order"];

const PRICE_LISTS = ["", "INDORAMA GDM MULTI P", "SQM GDM MULTI P", "Nil Price list"];
const PRICING_STATUS = ["Pending", "Completed"];
const APPROVAL_STATUS = ["Pending", "Approved", "Rejected", "Completed"];

const RATE_APPROVAL_TYPES = ["Contract Rates", "Mail Approval Rate"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmtDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}



/* =========================
  EMPTY ROW
========================= */
function emptyOrderRow() {
  return {
    _id: uid(),
    orderNo: "",
    partyName: "",
    plantCode: "",
    orderType: "Sales",
    pinCode: "",
    state: "",
    district: "",
    from: "",
    to: "",
    locationRate: "",
    priceList: "",
    weight: "",
    rate: "",
  };
}

/* =========================
  UI COMPONENTS
========================= */
function Btn({ children, onClick, variant = "primary", className = "", disabled }) {
  const styles = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    red: "bg-red-600 text-white hover:bg-red-700",
    outline: "bg-white border border-slate-200 hover:bg-slate-50",
    dark: "bg-slate-900 text-white hover:bg-black",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-extrabold transition active:scale-[0.99] disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {right || null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SectionBar({ title, tone = "yellow" }) {
  const map = {
    yellow: "bg-yellow-300 text-black",
    blue: "bg-sky-600 text-white",
    green: "bg-green-500 text-black",
  };
  return (
    <div className={`w-full border border-slate-200 ${map[tone]}`}>
      <div className="mx-auto max-w-[1700px] px-4 py-3 text-center font-extrabold text-lg">
        {title}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", col = "", placeholder = "" }) {
  return (
    <div className={col}>
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </div>
  );
}

function Select({ label, value, onChange, options = [], col = "" }) {
  return (
    <div className={col}>
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <select
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "" ? "Select" : o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================
  ORDERS TABLE (Responsive)
========================= */
function OrdersTable({ rows, onChange, onRemove }) {
  // mobile = cards
  // desktop = table
  return (
    <>
      {/* MOBILE */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-extrabold">
            No orders added.
          </div>
        ) : null}

        {rows.map((r) => {
          const total = num(r.weight) * num(r.rate);
          return (
            <div key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 font-bold">Order</div>
                  <div className="font-extrabold text-slate-900">{r.orderNo || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-bold">Total</div>
                  <div className="font-extrabold text-emerald-700">{total}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input label="Party Name" value={r.partyName} onChange={(v) => onChange(r._id, "partyName", v)} />
                <Input label="Plant Code" value={r.plantCode} onChange={(v) => onChange(r._id, "plantCode", v)} />
                <Select label="Order Type" value={r.orderType} onChange={(v) => onChange(r._id, "orderType", v)} options={ORDER_TYPES} />
                <Input label="Pin Code" value={r.pinCode} onChange={(v) => onChange(r._id, "pinCode", v)} />
                <Input label="State" value={r.state} onChange={(v) => onChange(r._id, "state", v)} />
                <Input label="District" value={r.district} onChange={(v) => onChange(r._id, "district", v)} />
                <Input label="From" value={r.from} onChange={(v) => onChange(r._id, "from", v)} />
                <Input label="To" value={r.to} onChange={(v) => onChange(r._id, "to", v)} />
                <Input label="Location Rate" value={r.locationRate} onChange={(v) => onChange(r._id, "locationRate", v)} />
                <Select label="Price List" value={r.priceList} onChange={(v) => onChange(r._id, "priceList", v)} options={PRICE_LISTS} />
                <Input label="Weight" value={r.weight} onChange={(v) => onChange(r._id, "weight", v)} />
                <Input label="Rate" value={r.rate} onChange={(v) => onChange(r._id, "rate", v)} />
              </div>

              <div className="mt-4">
                <Btn variant="red" className="w-full" onClick={() => onRemove(r._id)}>
                  Remove
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block rounded-2xl border border-slate-200 overflow-auto">
        <table className="min-w-[1600px] w-full text-sm">
          <thead className="sticky top-0 bg-slate-900 text-white">
            <tr>
              {[
                "Order No",
                "Party Name",
                "Plant Code",
                "Order Type",
                "Pin Code",
                "State",
                "District",
                "From",
                "To",
                "Location Rate",
                "Price List",
                "Weight",
                "Rate",
                "Total Amount",
                "Action",
              ].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-extrabold uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400 font-extrabold">
                  No order rows added.
                </td>
              </tr>
            ) : null}

            {rows.map((r) => {
              const total = num(r.weight) * num(r.rate);
              return (
                <tr key={r._id} className="border-t hover:bg-slate-50">
                  <td className="px-2 py-2">
                    <input
                      value={r.orderNo}
                      onChange={(e) => onChange(r._id, "orderNo", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={r.partyName}
                      onChange={(e) => onChange(r._id, "partyName", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={r.plantCode}
                      onChange={(e) => onChange(r._id, "plantCode", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={r.orderType}
                      onChange={(e) => onChange(r._id, "orderType", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    >
                      {ORDER_TYPES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-2 py-2">
                    <input
                      value={r.pinCode}
                      onChange={(e) => onChange(r._id, "pinCode", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.state} onChange={(e) => onChange(r._id, "state", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.district} onChange={(e) => onChange(r._id, "district", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.from} onChange={(e) => onChange(r._id, "from", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.to} onChange={(e) => onChange(r._id, "to", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.locationRate} onChange={(e) => onChange(r._id, "locationRate", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={r.priceList}
                      onChange={(e) => onChange(r._id, "priceList", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    >
                      {PRICE_LISTS.map((p) => (
                        <option key={p} value={p}>
                          {p === "" ? "Select" : p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.weight} onChange={(e) => onChange(r._id, "weight", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={r.rate} onChange={(e) => onChange(r._id, "rate", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2" />
                  </td>

                  <td className="px-2 py-2 font-extrabold text-emerald-700">{total}</td>

                  <td className="px-2 py-2">
                    <Btn variant="red" onClick={() => onRemove(r._id)}>
                      Remove
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================
  PAGE
========================= */
export default function PricingPanelPage() {
  /* ===== TOP META (COMMON) ===== */
  const [meta, setMeta] = useState({
    pricingSerialNo: "",
    branch: "",
    delivery: "Urgent",
    date: "",
  });

  /* ===== SINGLE ORDER ===== */
  const [single, setSingle] = useState({
    billingType: "Single - Order",
    loadingPoints: "",
    dropPoints: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
  });
  const [singleRows, setSingleRows] = useState([]);

  /* ===== MULTI ORDER ===== */
  const [multi, setMulti] = useState({
    billingType: "Multi - Order",
    loadingPoints: "",
    dropPoints: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
  });
  const [multiRows, setMultiRows] = useState([]);

  /* ===== Rate Approval ===== */
  const [rateApprovalType, setRateApprovalType] = useState("Contract Rates");
  const [rateUploadFile, setRateUploadFile] = useState(null);
  const [approvalDecision, setApprovalDecision] = useState("Pending");

  /* ===== Notes & Rules ===== */
  const NOTE1 =
    "Pincode is Compulsary for Sales Orders and Pincode - 000000 is only allowed for Stock Transfer Orders.";
  const NOTE2 =
    "The 2nd Order Type needs to fetch the details of SO / STO automatically from 1st Order Type Entry.";
  const NIL_PRICE_NOTE =
    "Note: Nil Price List - If Nil Price List used for a an order then the approval will be required from Owner / Auditor";

  /* ===== Total calcs ===== */
  const singleTotalAmount = useMemo(
    () => singleRows.reduce((acc, r) => acc + num(r.weight) * num(r.rate), 0),
    [singleRows]
  );

  const multiTotalAmount = useMemo(
    () => multiRows.reduce((acc, r) => acc + num(r.weight) * num(r.rate), 0),
    [multiRows]
  );

  /* ===== Pricing Panel Report ===== */
  const pricingReportRows = useMemo(() => {
    const combined = [...singleRows, ...multiRows];
    return combined.map((r) => ({
      date: meta.date,
      pricingSerialNo: meta.pricingSerialNo,
      order: r.orderNo,
      partyName: r.partyName,
      plantCode: r.plantCode,
      orderType: r.orderType,
      pinCode: r.pinCode,
      state: r.state,
      district: r.district,
      from: r.from,
      to: r.to,
      weight: r.weight,
      pricing: PRICING_STATUS[0], // default
      approval: approvalDecision,
    }));
  }, [singleRows, multiRows, meta.date, meta.pricingSerialNo, approvalDecision]);

  /* ===== CRUD ===== */
  const addSingleRow = () => setSingleRows((p) => [...p, emptyOrderRow()]);
  const removeSingleRow = (id) => setSingleRows((p) => p.filter((x) => x._id !== id));
  const updateSingleRow = (id, key, value) =>
    setSingleRows((p) => p.map((r) => (r._id === id ? { ...r, [key]: value } : r)));

  const addMultiRow = () => setMultiRows((p) => [...p, emptyOrderRow()]);
  const removeMultiRow = (id) => setMultiRows((p) => p.filter((x) => x._id !== id));
  const updateMultiRow = (id, key, value) =>
    setMultiRows((p) => p.map((r) => (r._id === id ? { ...r, [key]: value } : r)));

  /* ===== Save ===== */
  const handleSave = () => {
    const payload = {
      meta,
      single: { ...single, rows: singleRows, totalAmount: singleTotalAmount },
      multi: { ...multi, rows: multiRows, totalAmount: multiTotalAmount },
      rateApproval: { type: rateApprovalType, file: rateUploadFile?.name || "", decision: approvalDecision },
      pricingReportRows,
    };
    console.log("✅ PRICING PANEL SAVE:", payload);
    alert("✅ Saved! payload console me check karo");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* TOP HEADER */}
      <div className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-[1700px] px-4 py-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Pricing Panel</div>
            <div className="text-xs text-slate-500">
              Single + Multi Order • Rate Approval • Pricing Report • Fully Responsive
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="green" onClick={handleSave}>
              Save
            </Btn>
          </div>
        </div>
      </div>

      {/* META */}
      <div className="mx-auto max-w-[1700px] p-4 space-y-4">
        <Card title="Common Header">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-4" label="Pricing Serial No" value={meta.pricingSerialNo} onChange={(v) => setMeta((p) => ({ ...p, pricingSerialNo: v }))} placeholder="PSN-001" />
            <Input col="col-span-12 md:col-span-4" label="Branch" value={meta.branch} onChange={(v) => setMeta((p) => ({ ...p, branch: v }))} placeholder="Kandla" />
            <Select col="col-span-12 md:col-span-2" label="Delivery" value={meta.delivery} onChange={(v) => setMeta((p) => ({ ...p, delivery: v }))} options={DELIVERY_TYPES} />
            <Input col="col-span-12 md:col-span-2" type="date" label="Date" value={meta.date} onChange={(v) => setMeta((p) => ({ ...p, date: v }))} />
          </div>
        </Card>
      </div>

      {/* SINGLE ORDER */}
      <SectionBar title="Single - Order" tone="yellow" />
      <div className="mx-auto max-w-[1700px] p-4 space-y-4">
        <Card
          title="Billing Type / Charges"
          right={<Btn variant="primary" onClick={addSingleRow}>+ Add Row</Btn>}
        >
          <div className="grid grid-cols-12 gap-3">
            <Select col="col-span-12 md:col-span-4" label="Billing Type" value={single.billingType} onChange={(v) => setSingle((p) => ({ ...p, billingType: v }))} options={BILLING_TYPES} />
            <Input col="col-span-6 md:col-span-2" label="No. of Loading Points" value={single.loadingPoints} onChange={(v) => setSingle((p) => ({ ...p, loadingPoints: v }))} />
            <Input col="col-span-6 md:col-span-2" label="No. of Droping Point" value={single.dropPoints} onChange={(v) => setSingle((p) => ({ ...p, dropPoints: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Collection Charges" value={single.collectionCharges} onChange={(v) => setSingle((p) => ({ ...p, collectionCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Cancellation Charges" value={single.cancellationCharges} onChange={(v) => setSingle((p) => ({ ...p, cancellationCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Loading Charges" value={single.loadingCharges} onChange={(v) => setSingle((p) => ({ ...p, loadingCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Other Charges" value={single.otherCharges} onChange={(v) => setSingle((p) => ({ ...p, otherCharges: v }))} />
          </div>
        </Card>

        {/* Note + rules */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <Card title="Single Order Rows">
              <OrdersTable rows={singleRows} onChange={updateSingleRow} onRemove={removeSingleRow} />
              <div className="mt-4 flex justify-end text-sm font-extrabold text-emerald-700">
                Total Amount: {singleTotalAmount}
              </div>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-4">
            <Card title="Note">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{NOTE1}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{NOTE2}</div>
              </div>
            </Card>

            <Card title="Rules">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="bg-green-500 text-white font-extrabold text-center py-2 text-sm">Green/Yellow</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l">Data Entry</div>

                  <div className="bg-red-600 text-white font-extrabold text-center py-2 text-sm">Can't Skip</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l border-t">
                    Without Data Entry Further entry is not Permitted.
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-yellow-50 p-3 text-xs font-bold text-slate-700">
                {NIL_PRICE_NOTE}
              </div>
            </Card>
          </div>
        </div>

        {/* bottom boxes */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Card title="Client Rate Working Rules">
              <div className="rounded-xl border border-slate-200 bg-green-50 p-4 text-center font-extrabold">
                Client Rate Working Rules will be Visiable for the Rate Settlements
              </div>
            </Card>
          </div>
          <div className="col-span-12 md:col-span-4">
            <Card title="Pricing Report">
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center font-extrabold">
                Pricing Report for mail approval rates
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* MULTI ORDER */}
      {/* <SectionBar title="Multi - Order" tone="yellow" /> */}
      {/* <div className="mx-auto max-w-[1700px] p-4 space-y-4">
        <Card
          title="Multi Order Billing / Charges"
          right={<Btn variant="primary" onClick={addMultiRow}>+ Add Row</Btn>}
        >
          <div className="grid grid-cols-12 gap-3">
            <Select col="col-span-12 md:col-span-4" label="Billing Type" value={multi.billingType} onChange={(v) => setMulti((p) => ({ ...p, billingType: v }))} options={BILLING_TYPES} />
            <Input col="col-span-6 md:col-span-2" label="No. of Loading Points" value={multi.loadingPoints} onChange={(v) => setMulti((p) => ({ ...p, loadingPoints: v }))} />
            <Input col="col-span-6 md:col-span-2" label="No. of Droping Point" value={multi.dropPoints} onChange={(v) => setMulti((p) => ({ ...p, dropPoints: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Collection Charges" value={multi.collectionCharges} onChange={(v) => setMulti((p) => ({ ...p, collectionCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Cancellation Charges" value={multi.cancellationCharges} onChange={(v) => setMulti((p) => ({ ...p, cancellationCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Loading Charges" value={multi.loadingCharges} onChange={(v) => setMulti((p) => ({ ...p, loadingCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Other Charges" value={multi.otherCharges} onChange={(v) => setMulti((p) => ({ ...p, otherCharges: v }))} />
          </div>
        </Card>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <Card title="Multi Order Rows">
              <OrdersTable rows={multiRows} onChange={updateMultiRow} onRemove={removeMultiRow} />
              <div className="mt-4 flex justify-end text-sm font-extrabold text-emerald-700">
                Total Amount: {multiTotalAmount}
              </div>
            </Card>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-4">
            <Card title="Note">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{NOTE1}</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{NOTE2}</div>
              </div>
            </Card>

            <Card title="Roles / Rules (Multi)">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="bg-green-500 text-white font-extrabold text-center py-2 text-sm">Green/Yellow</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l">
                    Data Entry
                  </div>

                  <div className="bg-red-600 text-white font-extrabold text-center py-2 text-sm">Can't Skip</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l border-t">
                    Without Data Entry Further entry is not Permitted.
                  </div>

                  <div className="bg-blue-600 text-white font-extrabold text-center py-2 text-sm">Auditor</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l border-t">
                    Right to Edit or Change Only for limited time.
                  </div>

                  <div className="bg-orange-500 text-white font-extrabold text-center py-2 text-sm">Owner</div>
                  <div className="bg-white text-slate-900 font-bold text-center py-2 text-sm border-l border-t">
                    Full Access with No time Limit.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div> */}

      {/* RATE APPROVAL */}
      <SectionBar title="Rate - Approval" tone="green" />
      <div className="mx-auto max-w-[1700px] p-4 space-y-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <Card title="Rate Approval Type">
              <Select
                label="Select Type"
                value={rateApprovalType}
                onChange={setRateApprovalType}
                options={RATE_APPROVAL_TYPES}
              />
            </Card>
          </div>

          <div className="col-span-12 md:col-span-4">
            <Card title="Rate Approval Upload">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setRateUploadFile(e.target.files?.[0] || null)}
              />
              <div className="mt-3 text-sm font-extrabold text-slate-700">
                {rateUploadFile ? `Uploaded: ${rateUploadFile.name}` : "No file uploaded"}
              </div>
            </Card>
          </div>

          <div className="col-span-12 md:col-span-4">
            <Card title="Approval / Rejection">
              <Select
                label="Approval Status"
                value={approvalDecision}
                onChange={setApprovalDecision}
                options={APPROVAL_STATUS}
              />
              <div className="mt-3">
                <Btn variant="green" className="w-full" onClick={handleSave}>
                  Save Approval
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* PRICING PANEL REPORT */}
      <SectionBar title="Pricing - Panel" tone="blue" />
      <div className="mx-auto max-w-[1700px] p-4">
        <Card title="Pricing Panel Report">
          <div className="rounded-2xl border border-slate-200 overflow-auto">
            <table className="min-w-[1400px] w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-white">
                <tr>
                  {[
                    "Date",
                    "Pricing Serial No",
                    "Order",
                    "Party Name",
                    "Plant Code",
                    "Order Type",
                    "Pin Code",
                    "State",
                    "District",
                    "From",
                    "To",
                    "Weight",
                    "Pricing",
                    "Approval",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-extrabold uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pricingReportRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-slate-400 font-extrabold">
                      Report will generate after adding Single/Multi order rows.
                    </td>
                  </tr>
                ) : null}

                {pricingReportRows.map((r, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-3">{r.date ? fmtDDMMYYYY(r.date) : ""}</td>
                    <td className="px-3 py-3">{r.pricingSerialNo}</td>
                    <td className="px-3 py-3 font-bold">{r.order}</td>
                    <td className="px-3 py-3">{r.partyName}</td>
                    <td className="px-3 py-3">{r.plantCode}</td>
                    <td className="px-3 py-3">{r.orderType}</td>
                    <td className="px-3 py-3">{r.pinCode}</td>
                    <td className="px-3 py-3">{r.state}</td>
                    <td className="px-3 py-3">{r.district}</td>
                    <td className="px-3 py-3">{r.from}</td>
                    <td className="px-3 py-3">{r.to}</td>
                    <td className="px-3 py-3 font-extrabold">{r.weight}</td>
                    <td className="px-3 py-3">{r.pricing}</td>
                    <td className="px-3 py-3 font-extrabold">{r.approval}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Btn variant="green" className="px-10 py-4 text-lg" onClick={handleSave}>
              Save All
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
