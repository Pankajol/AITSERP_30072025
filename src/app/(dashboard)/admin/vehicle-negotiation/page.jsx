"use client";

import { useMemo, useRef, useState } from "react";

/* =======================
  HELPERS / CONSTANTS
======================= */
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const STATUSES = ["Open", "Hold", "Cancelled"];

const PURCHASE_TYPES = ["Loading & Unloading", "Unloading Only", "Safi Vehicle"];
const VENDOR_STATUS = ["Active", "Blacklisted"];
const RATE_TYPES = ["Per MT", "Fixed"];
const PAYMENT_TERMS = [
  "80 % Advance",
  "90 % Advance",
  "Rs.10,000/- Balance Only",
  "Rs. 5000/- Balance Only",
  "Full Payment after Delivery",
];
const APPROVALS = ["Approved", "Reject"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/* =======================
  DEFAULT ROWS
======================= */
function defaultOrderRow() {
  return {
    _id: uid(),
    orderNo: "JL-Aug-001",
    partyName: "Indorama India Pvt ltd",
    plantCode: "Kandla - 9002",
    orderType: "Sales",
    pinCode: "207243",
    from: "Kandla",
    to: "Agra",
    district: "Agra",
    state: "Uttar Pradesh",
    weight: "20",
    status: "Open",
  };
}

function defaultOrderRow2() {
  return {
    _id: uid(),
    orderNo: "JL-Aug-002",
    partyName: "SQM India Pvt Ltd",
    plantCode: "Kandla - 9002",
    orderType: "Sales",
    pinCode: "207243",
    from: "Kandla",
    to: "Agra",
    district: "Agra",
    state: "Uttar Pradesh",
    weight: "15",
    status: "Hold",
  };
}

function defaultVendorRow() {
  return {
    _id: uid(),
    vendorName: "New Arjun Road Carriers",
    marketRate: "3200",
  };
}

/* =======================
  UI COMPONENTS
======================= */
function SectionTitle({ children, color = "bg-sky-500" }) {
  return (
    <div className={`${color} text-black font-extrabold text-center py-3 text-lg border border-black`}>
      {children}
    </div>
  );
}

function LabelInput({ label, value, onChange, type = "text", className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="text-[12px] font-bold text-slate-700">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </div>
  );
}

function LabelSelect({ label, value, onChange, options = [], className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="text-[12px] font-bold text-slate-700">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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

/* =======================
  PAGE
======================= */
export default function VehicleNegotiationPanel() {
  /* =======================
    PART-1 HEADER
  ======================= */
  const [header, setHeader] = useState({
    vnnNo: "VNN-001",
    branch: "Kandla",
    delivery: "Urgent", // Urgent / Normal
    date: "2020-08-01",
    billingType: "Multi - Order",
    loadingPoints: "1",
    dropPoints: "2",
    collectionCharges: "100",
    cancellationCharges: "Nil",
    loadingCharges: "Nil",
    otherCharges: "Nil",
  });

  /* =======================
    PART-1 ORDERS
  ======================= */
  const [orders, setOrders] = useState([defaultOrderRow(), defaultOrderRow2()]);

  const updateOrder = (id, key, value) => {
    setOrders((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
  };

  const addOrder = () => {
    setOrders((prev) => [
      ...prev,
      {
        ...defaultOrderRow(),
        _id: uid(),
        orderNo: `JL-Aug-${String(prev.length + 1).padStart(3, "0")}`,
      },
    ]);
  };

  const removeOrder = (id) => setOrders((prev) => prev.filter((x) => x._id !== id));

  const totalWeight = useMemo(() => {
    return orders.reduce((acc, r) => acc + num(r.weight), 0);
  }, [orders]);

  /* =======================
    PART-2 NEGOTIATION
  ======================= */
  const [negotiation, setNegotiation] = useState({
    maxRate: "3000",
    targetRate: "2750",
    purchaseType: "Loading & Unloading",
    oldRatePercent: "-5%",
    remarks1: "Can Close this order by tomorrow as rate is high",
    remarks2: "Close this order by within half an hour - Very Urgent",
  });

  const [vendors, setVendors] = useState([
    { ...defaultVendorRow(), vendorName: "New Arjun Road Carriers", marketRate: "3200" },
    { _id: uid(), vendorName: "Mahabir Road Carriers", marketRate: "3250" },
    { _id: uid(), vendorName: "Divya Roadways", marketRate: "2950" },
  ]);

  const addVendor = () => setVendors((p) => [...p, { _id: uid(), vendorName: "", marketRate: "" }]);
  const removeVendor = (id) => setVendors((p) => p.filter((x) => x._id !== id));
  const updateVendor = (id, key, value) =>
    setVendors((p) => p.map((v) => (v._id === id ? { ...v, [key]: value } : v)));

  // Voice note
  const [voiceUrl, setVoiceUrl] = useState("");
  const audioRef = useRef(null);

  /* =======================
    PART-3 APPROVAL
  ======================= */
  const [approval, setApproval] = useState({
    vendorName: "Divya Roadways",
    vendorStatus: "Active",
    rateType: "Per MT",
    finalPerMT: "2850",
    finalFix: "99750",
    vehicleNo: "HR38X8960",
    mobile: "9856432219",
    purchaseType: "Loading & Unloading",
    paymentTerms: "80 % Advance",
    approvalStatus: "Approved",
    remarks: "Reject Vehicle approvals should be recorded in the report",
    memoStatus: "Uploaded",
  });

  const purchaseAmount = useMemo(() => {
    if (approval.rateType === "Per MT") {
      return num(approval.finalPerMT) * totalWeight;
    }
    return num(approval.finalFix);
  }, [approval.rateType, approval.finalPerMT, approval.finalFix, totalWeight]);

  /* =======================
    REPORT (AUTO)
  ======================= */
  const reportRows = useMemo(() => {
    return orders.map((o) => ({
      date: header.date,
      vnn: header.vnnNo,
      order: o.orderNo,
      partyName: o.partyName,
      plantCode: o.plantCode,
      orderType: o.orderType,
      pinCode: o.pinCode,
      from: o.from,
      to: o.to,
      district: o.district,
      state: o.state,
      weight: o.weight,
      orderStatus: o.status,
      approval: approval.approvalStatus || "Pending",
      memo: approval.memoStatus || "Pending",
    }));
  }, [orders, header.date, header.vnnNo, approval.approvalStatus, approval.memoStatus]);

  const handleSaveAll = () => {
    const payload = {
      header,
      orders,
      totalWeight,
      negotiation,
      vendors,
      approval,
      reportRows,
    };
    console.log("✅ VEHICLE NEGOTIATION SAVE PAYLOAD:", payload);
    alert("✅ Saved! (Console me payload check)");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ===== PART 1 ===== */}
      <SectionTitle>Vehicle Negotiation - Panel - Part -1</SectionTitle>

      <div className="mx-auto max-w-[1400px] p-4 space-y-4">
        {/* Top Header Grid */}
        <div className="grid grid-cols-12 gap-3">
          <LabelInput
            className="col-span-12 md:col-span-3"
            label="Vehicle Negotiation No"
            value={header.vnnNo}
            onChange={(v) => setHeader((p) => ({ ...p, vnnNo: v }))}
          />
          <LabelInput
            className="col-span-12 md:col-span-3"
            label="Branch"
            value={header.branch}
            onChange={(v) => setHeader((p) => ({ ...p, branch: v }))}
          />

          <LabelSelect
            className="col-span-12 md:col-span-3"
            label="Delivery"
            value={header.delivery}
            onChange={(v) => setHeader((p) => ({ ...p, delivery: v }))}
            options={["Urgent", "Normal"]}
          />

          <LabelInput
            type="date"
            className="col-span-12 md:col-span-3"
            label="Date"
            value={header.date}
            onChange={(v) => setHeader((p) => ({ ...p, date: v }))}
          />
        </div>

        {/* Billing / Charges */}
        <div className="grid grid-cols-12 gap-3">
          <LabelInput
            className="col-span-12 md:col-span-4"
            label="Billing Type"
            value={header.billingType}
            onChange={(v) => setHeader((p) => ({ ...p, billingType: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="No. of Loading Points"
            value={header.loadingPoints}
            onChange={(v) => setHeader((p) => ({ ...p, loadingPoints: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="No. of Droping Point"
            value={header.dropPoints}
            onChange={(v) => setHeader((p) => ({ ...p, dropPoints: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="Collection Charges"
            value={header.collectionCharges}
            onChange={(v) => setHeader((p) => ({ ...p, collectionCharges: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="Cancellation Charges"
            value={header.cancellationCharges}
            onChange={(v) => setHeader((p) => ({ ...p, cancellationCharges: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="Loading Charges"
            value={header.loadingCharges}
            onChange={(v) => setHeader((p) => ({ ...p, loadingCharges: v }))}
          />
          <LabelInput
            className="col-span-6 md:col-span-2"
            label="Other Charges"
            value={header.otherCharges}
            onChange={(v) => setHeader((p) => ({ ...p, otherCharges: v }))}
          />
        </div>

        {/* Orders Table +Add */}
        <div className="rounded-2xl border border-slate-200 overflow-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <div className="font-extrabold text-slate-900">
              Orders (Part-1)
            </div>

            <button
              onClick={addOrder}
              className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              +Add
            </button>
          </div>

          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-yellow-300 sticky top-0">
              <tr>
                {[
                  "Order",
                  "Party Name",
                  "Plant Code",
                  "Order Type",
                  "Pin Code",
                  "From",
                  "To",
                  "District",
                  "State",
                  "Weight",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h} className="border border-black px-2 py-2 text-xs font-extrabold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50">
                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.orderNo}
                      onChange={(e) => updateOrder(o._id, "orderNo", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.partyName}
                      onChange={(e) => updateOrder(o._id, "partyName", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.plantCode}
                      onChange={(e) => updateOrder(o._id, "plantCode", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  {/* Order Type Select */}
                  <td className="border border-black px-2 py-2">
                    <select
                      value={o.orderType}
                      onChange={(e) => updateOrder(o._id, "orderType", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    >
                      {ORDER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.pinCode}
                      onChange={(e) => updateOrder(o._id, "pinCode", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.from}
                      onChange={(e) => updateOrder(o._id, "from", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.to}
                      onChange={(e) => updateOrder(o._id, "to", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.district}
                      onChange={(e) => updateOrder(o._id, "district", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.state}
                      onChange={(e) => updateOrder(o._id, "state", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  <td className="border border-black px-2 py-2">
                    <input
                      value={o.weight}
                      onChange={(e) => updateOrder(o._id, "weight", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>

                  {/* Status Select */}
                  <td className="border border-black px-2 py-2">
                    <select
                      value={o.status}
                      onChange={(e) => updateOrder(o._id, "status", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-2"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="border border-black px-2 py-2">
                    <button
                      onClick={() => removeOrder(o._id)}
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

        {/* Total Weight box */}
        <div className="flex justify-end">
          <div className="flex items-center gap-3 border border-black px-4 py-2">
            <div className="font-extrabold text-sm">Total Weight</div>
            <div className="font-extrabold text-sm">{totalWeight}</div>
          </div>
        </div>
      </div>

      {/* ===== PART 2 ===== */}
      <div className="mt-6">
        <div className="bg-yellow-300 text-black font-extrabold text-center py-3 text-lg border border-black">
          Vehicle - Negotiation - Part - 2
        </div>

        <div className="mx-auto max-w-[1400px] p-4 space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <LabelInput
              className="col-span-12 md:col-span-2"
              label="Max Rate"
              value={negotiation.maxRate}
              onChange={(v) => setNegotiation((p) => ({ ...p, maxRate: v }))}
            />
            <LabelInput
              className="col-span-12 md:col-span-2"
              label="Target Rate"
              value={negotiation.targetRate}
              onChange={(v) => setNegotiation((p) => ({ ...p, targetRate: v }))}
            />

            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Purchase - Type"
              value={negotiation.purchaseType}
              onChange={(v) => setNegotiation((p) => ({ ...p, purchaseType: v }))}
              options={PURCHASE_TYPES}
            />

            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Old Rate %"
              value={negotiation.oldRatePercent}
              onChange={(v) => setNegotiation((p) => ({ ...p, oldRatePercent: v }))}
            />
          </div>

          {/* Vendors / Market Rates */}
          <div className="rounded-2xl border border-slate-200 overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
              <div className="font-extrabold text-slate-900">Vendors / Market Rates</div>
              <button
                onClick={addVendor}
                className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                + Add Vendor
              </button>
            </div>

            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-3 text-xs font-extrabold text-left">Vendor Name</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-left">Market Rates</th>
                  <th className="px-3 py-3 text-xs font-extrabold text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {vendors.map((v) => (
                  <tr key={v._id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input
                        value={v.vendorName}
                        onChange={(e) => updateVendor(v._id, "vendorName", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={v.marketRate}
                        onChange={(e) => updateVendor(v._id, "marketRate", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => removeVendor(v._id)}
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

          {/* Remarks & Voice */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-7 rounded-2xl border border-slate-200 p-4">
              <div className="font-extrabold text-slate-900 mb-3">Remarks</div>
              <textarea
                value={negotiation.remarks1}
                onChange={(e) => setNegotiation((p) => ({ ...p, remarks1: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                rows={2}
              />
              <textarea
                value={negotiation.remarks2}
                onChange={(e) => setNegotiation((p) => ({ ...p, remarks2: e.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                rows={2}
              />
            </div>

            <div className="col-span-12 md:col-span-5 rounded-2xl border border-slate-200 p-4">
              <div className="font-extrabold text-slate-900 mb-3">Voice Note</div>

              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setVoiceUrl(url);
                }}
                className="w-full"
              />

              <button
                onClick={() => audioRef.current?.play()}
                className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white hover:bg-black"
                disabled={!voiceUrl}
              >
                Play the Voice Note
              </button>

              <audio ref={audioRef} src={voiceUrl} controls className="mt-3 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== PART 3 ===== */}
      <div className="mt-6">
        <div className="bg-green-400 text-black font-extrabold text-center py-3 text-lg border border-black">
          Vehicle - Approval - Part - 3
        </div>

        <div className="mx-auto max-w-[1400px] p-4 space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Vendor Name"
              value={approval.vendorName}
              onChange={(v) => setApproval((p) => ({ ...p, vendorName: v }))}
            />

            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Vendor (Status)"
              value={approval.vendorStatus}
              onChange={(v) => setApproval((p) => ({ ...p, vendorStatus: v }))}
              options={VENDOR_STATUS}
            />

            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Rate - Type"
              value={approval.rateType}
              onChange={(v) => setApproval((p) => ({ ...p, rateType: v }))}
              options={RATE_TYPES}
            />
          </div>

          {/* A / B / A x B */}
          <div className="grid grid-cols-12 gap-3">
            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Final - Per MT (A)"
              value={approval.finalPerMT}
              onChange={(v) => setApproval((p) => ({ ...p, finalPerMT: v }))}
            />
            <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 p-4">
              <div className="text-[12px] font-bold text-slate-700">Weight (B)</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{totalWeight}</div>
            </div>
            <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 p-4">
              <div className="text-[12px] font-bold text-slate-700">Purchase Amount (A x B)</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{purchaseAmount}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Final - Fix"
              value={approval.finalFix}
              onChange={(v) => setApproval((p) => ({ ...p, finalFix: v }))}
            />

            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Vehicle"
              value={approval.vehicleNo}
              onChange={(v) => setApproval((p) => ({ ...p, vehicleNo: v }))}
            />

            <LabelInput
              className="col-span-12 md:col-span-4"
              label="Mobile"
              value={approval.mobile}
              onChange={(v) => setApproval((p) => ({ ...p, mobile: v }))}
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Purchase - Type"
              value={approval.purchaseType}
              onChange={(v) => setApproval((p) => ({ ...p, purchaseType: v }))}
              options={PURCHASE_TYPES}
            />
            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Payment - Terms"
              value={approval.paymentTerms}
              onChange={(v) => setApproval((p) => ({ ...p, paymentTerms: v }))}
              options={PAYMENT_TERMS}
            />
            <LabelSelect
              className="col-span-12 md:col-span-4"
              label="Approval"
              value={approval.approvalStatus}
              onChange={(v) => setApproval((p) => ({ ...p, approvalStatus: v }))}
              options={APPROVALS}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-extrabold text-slate-900 mb-2">Remarks</div>
            <textarea
              value={approval.remarks}
              onChange={(e) => setApproval((p) => ({ ...p, remarks: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* ===== MEMO UPLOAD ===== */}
      <div className="mt-6">
        <div className="bg-green-400 text-black font-extrabold text-center py-3 text-lg border border-black">
          Memo - Upload
        </div>

        <div className="mx-auto max-w-[1400px] p-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-extrabold text-slate-900 mb-3">Memo Upload</div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setApproval((p) => ({ ...p, memoStatus: "Uploaded" }));
              }}
            />
            <div className="mt-3 text-sm">
              Status:{" "}
              <span className="font-extrabold">
                {approval.memoStatus || "Pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NOTES ===== */}
      <div className="mx-auto max-w-[1400px] p-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-extrabold bg-yellow-300 inline-block px-2 py-1 border border-black">
            Note
          </div>
          <div className="mt-3 text-sm text-slate-700 space-y-2">
            <div>
              The average rate & Rate Percentage should be available only to approver or manager.
            </div>
            <div>
              The Max Rate and the Old Rate Percentage should be visible to Approver only and the Max rate will be input in the Party Master as per Branch - Location and Weight.
            </div>
            <div className="font-bold">Blacklisted won't be approved</div>
            <div>
              The Approval _PS should be visible to the Pricing Manager ID only.
            </div>
          </div>
        </div>
      </div>

      {/* ===== REPORT ===== */}
      <div className="mt-8">
        <SectionTitle>Vehicle Negotiation - Report</SectionTitle>

        <div className="mx-auto max-w-[1400px] p-4">
          <div className="rounded-2xl border border-slate-200 overflow-auto">
            <table className="min-w-[1400px] w-full text-sm">
              <thead className="bg-slate-900 text-white sticky top-0">
                <tr>
                  {[
                    "Date",
                    "VNN",
                    "Order",
                    "Party Name",
                    "Plant Code",
                    "Order Type",
                    "Pin Code",
                    "From",
                    "To",
                    "District",
                    "State",
                    "Weight",
                    "Order Status",
                    "Approval",
                    "Memo",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-extrabold uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {reportRows.map((r, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-3">{formatDateDDMMYYYY(r.date)}</td>
                    <td className="px-3 py-3">{r.vnn}</td>
                    <td className="px-3 py-3">{r.order}</td>
                    <td className="px-3 py-3">{r.partyName}</td>
                    <td className="px-3 py-3">{r.plantCode}</td>
                    <td className="px-3 py-3">{r.orderType}</td>
                    <td className="px-3 py-3">{r.pinCode}</td>
                    <td className="px-3 py-3">{r.from}</td>
                    <td className="px-3 py-3">{r.to}</td>
                    <td className="px-3 py-3">{r.district}</td>
                    <td className="px-3 py-3">{r.state}</td>
                    <td className="px-3 py-3">{r.weight}</td>

                    <td className="px-3 py-3 font-bold">{r.orderStatus}</td>

                    <td
                      className={`px-3 py-3 font-extrabold ${
                        r.approval === "Approved" ? "text-green-700" : "text-orange-600"
                      }`}
                    >
                      {r.approval}
                    </td>

                    <td
                      className={`px-3 py-3 font-extrabold ${
                        r.memo === "Uploaded" ? "text-green-700" : "text-orange-600"
                      }`}
                    >
                      {r.memo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveAll}
              className="rounded-2xl bg-sky-600 px-10 py-4 text-xl font-extrabold text-white hover:bg-sky-700"
            >
              Save All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
