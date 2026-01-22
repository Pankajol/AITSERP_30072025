"use client";

import { useMemo, useRef, useState } from "react";

/* =========================
  CONSTANTS
========================= */
const DELIVERY_TYPES = ["Urgent", "Normal"];
const BILLING_TYPES = ["Multi - Order", "Single Order"];
const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
const ORDER_STATUSES = ["Open", "Hold", "Cancelled"];
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
const APPROVAL_STATUSES = ["Approved", "Reject", "Pending"];
const MEMO_STATUSES = ["Uploaded", "Pending"];

/* =========================
  HELPERS
========================= */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/* =========================
  EMPTY ROWS
========================= */
function emptyOrderRow() {
  return {
    _id: uid(),
    orderNo: "",
    partyName: "",
    plantCode: "",
    orderType: "Sales",
    pinCode: "",
    from: "",
    to: "",
    district: "",
    state: "",
    weight: "",
    status: "Open",
  };
}

function emptyVendorRow() {
  return { _id: uid(), vendorName: "", marketRate: "" };
}

/* =========================
  UI COMPONENTS
========================= */
function Btn({ children, onClick, variant = "primary", className = "", disabled }) {
  const styles = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    red: "bg-red-600 text-white hover:bg-red-700",
    gray: "bg-slate-900 text-white hover:bg-black",
    outline: "bg-white border border-slate-200 hover:bg-slate-50",
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
      <div className="px-4 py-3 border-b flex items-center justify-between bg-slate-50">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {right || null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, col = "", type = "text", placeholder = "" }) {
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
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l">
        <div className="p-4 border-b flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-extrabold text-slate-900">{title}</div>
            {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
          </div>
          <Btn variant="outline" onClick={onClose}>
            Close
          </Btn>
        </div>

        <div className="p-4 overflow-auto h-[calc(100%-150px)]">{children}</div>

        <div className="p-4 border-t bg-white">{footer}</div>
      </div>
    </div>
  );
}

/* =========================
  MAIN PAGE
========================= */
export default function VehicleNegotiationPage() {
  /* PART 1 META */
  const [meta, setMeta] = useState({
    vnnNo: "",
    branch: "",
    delivery: "Urgent",
    date: "",
    billingType: "Multi - Order",
    loadingPoints: "",
    dropPoints: "",
    collectionCharges: "",
    cancellationCharges: "",
    loadingCharges: "",
    otherCharges: "",
  });

  /* PART 1 ORDERS */
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");

  /* Drawer edit order */
  const [orderDrawer, setOrderDrawer] = useState({ open: false, id: "" });

  const selectedOrder = useMemo(() => {
    if (!orderDrawer.open) return null;
    return orders.find((o) => o._id === orderDrawer.id) || null;
  }, [orderDrawer, orders]);

  const addOrder = () => setOrders((p) => [...p, emptyOrderRow()]);
  const removeOrder = (id) => setOrders((p) => p.filter((x) => x._id !== id));
  const updateOrder = (id, key, value) =>
    setOrders((p) => p.map((r) => (r._id === id ? { ...r, [key]: value } : r)));

  const duplicateOrder = (id) => {
    const row = orders.find((o) => o._id === id);
    if (!row) return;
    setOrders((p) => [...p, { ...row, _id: uid() }]);
  };

  const moveOrder = (id, dir) => {
    const idx = orders.findIndex((o) => o._id === id);
    if (idx === -1) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= orders.length) return;
    const copy = [...orders];
    const tmp = copy[idx];
    copy[idx] = copy[newIdx];
    copy[newIdx] = tmp;
    setOrders(copy);
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      Object.values(o).some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [orders, orderSearch]);

  const totalWeight = useMemo(() => {
    return orders.reduce((acc, r) => acc + num(r.weight), 0);
  }, [orders]);

  /* PART 2 VENDORS */
  const [negotiation, setNegotiation] = useState({
    maxRate: "",
    targetRate: "",
    purchaseType: "Loading & Unloading",
    oldRatePercent: "",
    remarks: "",
  });

  const [vendors, setVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");

  const addVendor = () => setVendors((p) => [...p, emptyVendorRow()]);
  const removeVendor = (id) => setVendors((p) => p.filter((x) => x._id !== id));
  const updateVendor = (id, key, value) =>
    setVendors((p) => p.map((v) => (v._id === id ? { ...v, [key]: value } : v)));

  const filteredVendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      Object.values(v).some((x) => String(x || "").toLowerCase().includes(q))
    );
  }, [vendors, vendorSearch]);

  /* Voice Note */
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");
  const audioRef = useRef(null);

  /* PART 3 APPROVAL */
  const [approval, setApproval] = useState({
    vendorName: "",
    vendorStatus: "Active",
    rateType: "Per MT",
    finalPerMT: "",
    finalFix: "",
    vehicleNo: "",
    mobile: "",
    purchaseType: "Loading & Unloading",
    paymentTerms: "80 % Advance",
    approvalStatus: "Pending",
    memoStatus: "Pending",
    remarks: "",
  });

  const purchaseAmount = useMemo(() => {
    if (approval.rateType === "Per MT") return num(approval.finalPerMT) * totalWeight;
    return num(approval.finalFix);
  }, [approval.rateType, approval.finalPerMT, approval.finalFix, totalWeight]);

  /* REPORT */
  const reportRows = useMemo(() => {
    return orders.map((o) => ({
      date: meta.date,
      vnn: meta.vnnNo,
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
      approval: approval.approvalStatus,
      memo: approval.memoStatus,
    }));
  }, [orders, meta.date, meta.vnnNo, approval.approvalStatus, approval.memoStatus]);

  /* SAVE */
  const handleSaveAll = () => {
    const payload = {
      meta,
      orders,
      negotiation,
      vendors,
      approval,
      totalWeight,
      purchaseAmount,
      reportRows,
    };
    console.log("✅ SAVE VEHICLE NEGOTIATION:", payload);
    alert("✅ Saved! Console me payload check");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-4 py-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">
              Vehicle Negotiation Panel
            </div>
            <div className="text-xs text-slate-500">
              Responsive UI • Mobile Cards + Desktop Table • Drawer Editor
            </div>
          </div>

          <div className="flex gap-2">
            <Btn variant="primary" onClick={addOrder}>
              + Add Order
            </Btn>
            <Btn variant="green" onClick={handleSaveAll}>
              Save
            </Btn>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-[1500px] p-4 space-y-4">
        {/* PART 1 */}
        <Card title="Part - 1 (Vehicle Negotiation)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-3" label="Vehicle Negotiation No" value={meta.vnnNo} onChange={(v) => setMeta((p) => ({ ...p, vnnNo: v }))} />
            <Input col="col-span-12 md:col-span-3" label="Branch" value={meta.branch} onChange={(v) => setMeta((p) => ({ ...p, branch: v }))} />
            <Select col="col-span-12 md:col-span-3" label="Delivery" value={meta.delivery} onChange={(v) => setMeta((p) => ({ ...p, delivery: v }))} options={DELIVERY_TYPES} />
            <Input col="col-span-12 md:col-span-3" type="date" label="Date" value={meta.date} onChange={(v) => setMeta((p) => ({ ...p, date: v }))} />
          </div>

          <div className="mt-4 grid grid-cols-12 gap-3">
            <Select col="col-span-12 md:col-span-4" label="Billing Type" value={meta.billingType} onChange={(v) => setMeta((p) => ({ ...p, billingType: v }))} options={BILLING_TYPES} />
            <Input col="col-span-6 md:col-span-2" label="No. of Loading Points" value={meta.loadingPoints} onChange={(v) => setMeta((p) => ({ ...p, loadingPoints: v }))} />
            <Input col="col-span-6 md:col-span-2" label="No. of Droping Point" value={meta.dropPoints} onChange={(v) => setMeta((p) => ({ ...p, dropPoints: v }))} />

            <Input col="col-span-6 md:col-span-2" label="Collection Charges" value={meta.collectionCharges} onChange={(v) => setMeta((p) => ({ ...p, collectionCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Cancellation Charges" value={meta.cancellationCharges} onChange={(v) => setMeta((p) => ({ ...p, cancellationCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Loading Charges" value={meta.loadingCharges} onChange={(v) => setMeta((p) => ({ ...p, loadingCharges: v }))} />
            <Input col="col-span-6 md:col-span-2" label="Other Charges" value={meta.otherCharges} onChange={(v) => setMeta((p) => ({ ...p, otherCharges: v }))} />
          </div>
        </Card>

        {/* ORDERS */}
        <Card
          title="Orders"
          right={
            <div className="flex gap-2">
              <div className="hidden md:block text-xs font-bold text-slate-600 pt-2">
                Total Weight: <span className="text-slate-900">{totalWeight}</span>
              </div>
            </div>
          }
        >
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <Input
              label="Search Orders"
              value={orderSearch}
              onChange={setOrderSearch}
              placeholder="order / party / plant / state..."
              col="w-full md:w-[380px]"
            />

            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => setOrders([])}>
                Clear Orders
              </Btn>
              <Btn variant="primary" onClick={addOrder}>
                + Add
              </Btn>
            </div>
          </div>

          {/* ✅ MOBILE VIEW: Cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
            {filteredOrders.length === 0 ? (
              <div className="text-center text-slate-400 font-bold py-10">
                No Orders. Tap <b>+ Add</b>
              </div>
            ) : null}

            {filteredOrders.map((o) => (
              <div
                key={o._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 font-bold">Order</div>
                    <div className="font-extrabold text-slate-900">
                      {o.orderNo || "—"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-bold">Status</div>
                    <div className="font-extrabold">{o.status || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Mini label="Party" value={o.partyName} />
                  <Mini label="Plant" value={o.plantCode} />
                  <Mini label="From" value={o.from} />
                  <Mini label="To" value={o.to} />
                  <Mini label="Weight" value={o.weight} />
                  <Mini label="State" value={o.state} />
                </div>

                <div className="mt-4 flex gap-2">
                  <Btn
                    className="flex-1"
                    variant="primary"
                    onClick={() => setOrderDrawer({ open: true, id: o._id })}
                  >
                    Edit
                  </Btn>
                  <Btn variant="outline" onClick={() => duplicateOrder(o._id)}>
                    Duplicate
                  </Btn>
                  <Btn variant="red" onClick={() => removeOrder(o._id)}>
                    Delete
                  </Btn>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ DESKTOP VIEW: Table */}
          <div className="hidden md:block mt-4 rounded-2xl border border-slate-200 overflow-auto">
            <table className="min-w-[1300px] w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-white">
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
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-left text-xs font-extrabold uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-slate-400 font-bold">
                      No Orders. Click + Add
                    </td>
                  </tr>
                ) : null}

                {filteredOrders.map((o) => (
                  <tr key={o._id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold">{o.orderNo || "—"}</td>
                    <td className="px-3 py-3">{o.partyName || "—"}</td>
                    <td className="px-3 py-3">{o.plantCode || "—"}</td>
                    <td className="px-3 py-3">{o.orderType || "—"}</td>
                    <td className="px-3 py-3">{o.pinCode || "—"}</td>
                    <td className="px-3 py-3">{o.from || "—"}</td>
                    <td className="px-3 py-3">{o.to || "—"}</td>
                    <td className="px-3 py-3">{o.district || "—"}</td>
                    <td className="px-3 py-3">{o.state || "—"}</td>
                    <td className="px-3 py-3 font-bold">{o.weight || "—"}</td>
                    <td className="px-3 py-3 font-bold">{o.status || "—"}</td>

                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Btn variant="outline" onClick={() => moveOrder(o._id, "up")}>
                          ↑
                        </Btn>
                        <Btn variant="outline" onClick={() => moveOrder(o._id, "down")}>
                          ↓
                        </Btn>
                        <Btn variant="primary" onClick={() => setOrderDrawer({ open: true, id: o._id })}>
                          Edit
                        </Btn>
                        <Btn variant="outline" onClick={() => duplicateOrder(o._id)}>
                          Duplicate
                        </Btn>
                        <Btn variant="red" onClick={() => removeOrder(o._id)}>
                          Delete
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* total weight mobile */}
          <div className="mt-4 flex justify-between md:hidden">
            <div className="text-sm font-bold text-slate-600">Total Weight</div>
            <div className="font-extrabold text-slate-900">{totalWeight}</div>
          </div>
        </Card>

        {/* PART 2 */}
        <Card title="Part - 2 (Negotiation)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-3" label="Max Rate" value={negotiation.maxRate} onChange={(v) => setNegotiation((p) => ({ ...p, maxRate: v }))} />
            <Input col="col-span-12 md:col-span-3" label="Target Rate" value={negotiation.targetRate} onChange={(v) => setNegotiation((p) => ({ ...p, targetRate: v }))} />
            <Select col="col-span-12 md:col-span-4" label="Purchase Type" value={negotiation.purchaseType} onChange={(v) => setNegotiation((p) => ({ ...p, purchaseType: v }))} options={PURCHASE_TYPES} />
            <Input col="col-span-12 md:col-span-2" label="Old Rate %" value={negotiation.oldRatePercent} onChange={(v) => setNegotiation((p) => ({ ...p, oldRatePercent: v }))} />
          </div>

          <div className="mt-4">
            <div className="text-xs font-bold text-slate-600">Remarks</div>
            <textarea
              value={negotiation.remarks}
              onChange={(e) => setNegotiation((p) => ({ ...p, remarks: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Write remarks..."
            />
          </div>

          {/* Voice */}
          <div className="mt-4 grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="text-xs font-bold text-slate-600">Voice Note</div>
              <input
                className="mt-2 w-full"
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setVoiceNoteUrl(URL.createObjectURL(f));
                }}
              />
              <div className="mt-3 flex gap-2">
                <Btn
                  disabled={!voiceNoteUrl}
                  variant="gray"
                  onClick={() => audioRef.current?.play()}
                >
                  Play
                </Btn>
                <Btn
                  variant="outline"
                  disabled={!voiceNoteUrl}
                  onClick={() => setVoiceNoteUrl("")}
                >
                  Clear
                </Btn>
              </div>
              <audio ref={audioRef} src={voiceNoteUrl} controls className="mt-3 w-full" />
            </div>

            {/* Vendors */}
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-extrabold text-slate-900">Vendors</div>
                <Btn variant="primary" onClick={addVendor}>
                  + Add Vendor
                </Btn>
              </div>

              <div className="mt-3">
                <Input
                  label="Search Vendors"
                  value={vendorSearch}
                  onChange={setVendorSearch}
                  placeholder="vendor name / rate"
                />
              </div>

              <div className="mt-3 space-y-3">
                {filteredVendors.length === 0 ? (
                  <div className="text-center text-slate-400 font-bold py-6">
                    No Vendors Added
                  </div>
                ) : null}

                {filteredVendors.map((v) => (
                  <div key={v._id} className="rounded-2xl border border-slate-200 p-3">
                    <Input
                      label="Vendor Name"
                      value={v.vendorName}
                      onChange={(x) => updateVendor(v._id, "vendorName", x)}
                    />
                    <div className="mt-2">
                      <Input
                        label="Market Rate"
                        value={v.marketRate}
                        onChange={(x) => updateVendor(v._id, "marketRate", x)}
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Btn variant="red" onClick={() => removeVendor(v._id)}>
                        Remove
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* PART 3 */}
        <Card title="Part - 3 (Approval)">
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12 md:col-span-4" label="Vendor Name" value={approval.vendorName} onChange={(v) => setApproval((p) => ({ ...p, vendorName: v }))} />
            <Select col="col-span-12 md:col-span-4" label="Vendor Status" value={approval.vendorStatus} onChange={(v) => setApproval((p) => ({ ...p, vendorStatus: v }))} options={VENDOR_STATUS} />
            <Select col="col-span-12 md:col-span-4" label="Rate Type" value={approval.rateType} onChange={(v) => setApproval((p) => ({ ...p, rateType: v }))} options={RATE_TYPES} />

            <Input col="col-span-12 md:col-span-3" label="Final - Per MT" value={approval.finalPerMT} onChange={(v) => setApproval((p) => ({ ...p, finalPerMT: v }))} />
            <Input col="col-span-12 md:col-span-3" label="Final - Fix" value={approval.finalFix} onChange={(v) => setApproval((p) => ({ ...p, finalFix: v }))} />

            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-600">Purchase Amount</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                {purchaseAmount}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Weight = {totalWeight}
              </div>
            </div>

            <Input col="col-span-12 md:col-span-4" label="Vehicle" value={approval.vehicleNo} onChange={(v) => setApproval((p) => ({ ...p, vehicleNo: v }))} />
            <Input col="col-span-12 md:col-span-4" label="Mobile" value={approval.mobile} onChange={(v) => setApproval((p) => ({ ...p, mobile: v }))} />
            <Select col="col-span-12 md:col-span-4" label="Purchase Type" value={approval.purchaseType} onChange={(v) => setApproval((p) => ({ ...p, purchaseType: v }))} options={PURCHASE_TYPES} />

            <Select col="col-span-12 md:col-span-6" label="Payment Terms" value={approval.paymentTerms} onChange={(v) => setApproval((p) => ({ ...p, paymentTerms: v }))} options={PAYMENT_TERMS} />
            <Select col="col-span-12 md:col-span-3" label="Approval" value={approval.approvalStatus} onChange={(v) => setApproval((p) => ({ ...p, approvalStatus: v }))} options={APPROVAL_STATUSES} />
            <Select col="col-span-12 md:col-span-3" label="Memo Status" value={approval.memoStatus} onChange={(v) => setApproval((p) => ({ ...p, memoStatus: v }))} options={MEMO_STATUSES} />
          </div>

          <div className="mt-4">
            <div className="text-xs font-bold text-slate-600">Approval Remarks</div>
            <textarea
              value={approval.remarks}
              onChange={(e) => setApproval((p) => ({ ...p, remarks: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              placeholder="Write approval remarks..."
            />
          </div>
        </Card>

        {/* MEMO UPLOAD */}
        <Card title="Memo Upload">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setApproval((p) => ({ ...p, memoStatus: "Uploaded" }));
            }}
          />
          <div className="mt-3 text-sm font-extrabold">
            Memo Status: {approval.memoStatus}
          </div>
        </Card>

        {/* REPORT */}
        <Card title="Vehicle Negotiation Report">
          <div className="rounded-2xl border border-slate-200 overflow-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="sticky top-0 bg-slate-900 text-white">
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
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-10 text-center text-slate-400 font-bold">
                      Report will show after adding Orders
                    </td>
                  </tr>
                ) : null}

                {reportRows.map((r, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-3">{r.date ? formatDDMMYYYY(r.date) : ""}</td>
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
                    <td className="px-3 py-3 font-bold">{r.weight}</td>
                    <td className="px-3 py-3 font-extrabold">{r.orderStatus}</td>
                    <td className="px-3 py-3 font-extrabold">{r.approval}</td>
                    <td className="px-3 py-3 font-extrabold">{r.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <Btn variant="green" className="px-10 py-4 text-xl" onClick={handleSaveAll}>
              Save All
            </Btn>
          </div>
        </Card>
      </div>

      {/* ORDER EDIT DRAWER */}
      <Drawer
        open={orderDrawer.open && !!selectedOrder}
        title="Edit Order"
        subtitle="Mobile-first UX • No scrolling tables"
        onClose={() => setOrderDrawer({ open: false, id: "" })}
        footer={
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => duplicateOrder(orderDrawer.id)}>
              Duplicate
            </Btn>
            <Btn variant="red" onClick={() => removeOrder(orderDrawer.id)}>
              Delete
            </Btn>
            <div className="flex-1" />
            <Btn variant="green" onClick={() => setOrderDrawer({ open: false, id: "" })}>
              Done
            </Btn>
          </div>
        }
      >
        {selectedOrder ? (
          <div className="grid grid-cols-12 gap-3">
            <Input col="col-span-12" label="Order No" value={selectedOrder.orderNo} onChange={(v) => updateOrder(selectedOrder._id, "orderNo", v)} />
            <Input col="col-span-12" label="Party Name" value={selectedOrder.partyName} onChange={(v) => updateOrder(selectedOrder._id, "partyName", v)} />
            <Input col="col-span-12" label="Plant Code" value={selectedOrder.plantCode} onChange={(v) => updateOrder(selectedOrder._id, "plantCode", v)} />

            <Select col="col-span-12 md:col-span-6" label="Order Type" value={selectedOrder.orderType} onChange={(v) => updateOrder(selectedOrder._id, "orderType", v)} options={ORDER_TYPES} />
            <Select col="col-span-12 md:col-span-6" label="Status" value={selectedOrder.status} onChange={(v) => updateOrder(selectedOrder._id, "status", v)} options={ORDER_STATUSES} />

            <Input col="col-span-12 md:col-span-6" label="Pin Code" value={selectedOrder.pinCode} onChange={(v) => updateOrder(selectedOrder._id, "pinCode", v)} />
            <Input col="col-span-12 md:col-span-6" label="Weight" value={selectedOrder.weight} onChange={(v) => updateOrder(selectedOrder._id, "weight", v)} />

            <Input col="col-span-12 md:col-span-6" label="From" value={selectedOrder.from} onChange={(v) => updateOrder(selectedOrder._id, "from", v)} />
            <Input col="col-span-12 md:col-span-6" label="To" value={selectedOrder.to} onChange={(v) => updateOrder(selectedOrder._id, "to", v)} />
            <Input col="col-span-12 md:col-span-6" label="District" value={selectedOrder.district} onChange={(v) => updateOrder(selectedOrder._id, "district", v)} />
            <Input col="col-span-12 md:col-span-6" label="State" value={selectedOrder.state} onChange={(v) => updateOrder(selectedOrder._id, "state", v)} />
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

/* =========================
  MINI FIELD
========================= */
function Mini({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 truncate">
        {value || "—"}
      </div>
    </div>
  );
}



// "use client";

// import { useMemo, useRef, useState } from "react";

// /* =======================
//   HELPERS / CONSTANTS
// ======================= */
// const ORDER_TYPES = ["Sales", "STO Order", "Export", "Import"];
// const STATUSES = ["Open", "Hold", "Cancelled"];

// const PURCHASE_TYPES = ["Loading & Unloading", "Unloading Only", "Safi Vehicle"];
// const VENDOR_STATUS = ["Active", "Blacklisted"];
// const RATE_TYPES = ["Per MT", "Fixed"];
// const PAYMENT_TERMS = [
//   "80 % Advance",
//   "90 % Advance",
//   "Rs.10,000/- Balance Only",
//   "Rs. 5000/- Balance Only",
//   "Full Payment after Delivery",
// ];
// const APPROVALS = ["Approved", "Reject"];

// function uid() {
//   return Math.random().toString(36).slice(2, 10);
// }

// function num(v) {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

// function formatDateDDMMYYYY(dateStr) {
//   if (!dateStr) return "";
//   const [y, m, d] = dateStr.split("-");
//   return `${d}/${m}/${y}`;
// }

// /* =======================
//   DEFAULT ROWS
// ======================= */
// function defaultOrderRow() {
//   return {
//     _id: uid(),
//     orderNo: "JL-Aug-001",
//     partyName: "Indorama India Pvt ltd",
//     plantCode: "Kandla - 9002",
//     orderType: "Sales",
//     pinCode: "207243",
//     from: "Kandla",
//     to: "Agra",
//     district: "Agra",
//     state: "Uttar Pradesh",
//     weight: "20",
//     status: "Open",
//   };
// }

// function defaultOrderRow2() {
//   return {
//     _id: uid(),
//     orderNo: "JL-Aug-002",
//     partyName: "SQM India Pvt Ltd",
//     plantCode: "Kandla - 9002",
//     orderType: "Sales",
//     pinCode: "207243",
//     from: "Kandla",
//     to: "Agra",
//     district: "Agra",
//     state: "Uttar Pradesh",
//     weight: "15",
//     status: "Hold",
//   };
// }

// function defaultVendorRow() {
//   return {
//     _id: uid(),
//     vendorName: "New Arjun Road Carriers",
//     marketRate: "3200",
//   };
// }

// /* =======================
//   UI COMPONENTS
// ======================= */
// function SectionTitle({ children, color = "bg-sky-500" }) {
//   return (
//     <div className={`${color} text-black font-extrabold text-center py-3 text-lg border border-black`}>
//       {children}
//     </div>
//   );
// }

// function LabelInput({ label, value, onChange, type = "text", className = "" }) {
//   return (
//     <div className={`flex flex-col ${className}`}>
//       <div className="text-[12px] font-bold text-slate-700">{label}</div>
//       <input
//         type={type}
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
//       />
//     </div>
//   );
// }

// function LabelSelect({ label, value, onChange, options = [], className = "" }) {
//   return (
//     <div className={`flex flex-col ${className}`}>
//       <div className="text-[12px] font-bold text-slate-700">{label}</div>
//       <select
//         value={value}
//         onChange={(e) => onChange?.(e.target.value)}
//         className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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

// /* =======================
//   PAGE
// ======================= */
// export default function VehicleNegotiationPanel() {
//   /* =======================
//     PART-1 HEADER
//   ======================= */
//   const [header, setHeader] = useState({
//     vnnNo: "VNN-001",
//     branch: "Kandla",
//     delivery: "Urgent", // Urgent / Normal
//     date: "2020-08-01",
//     billingType: "Multi - Order",
//     loadingPoints: "1",
//     dropPoints: "2",
//     collectionCharges: "100",
//     cancellationCharges: "Nil",
//     loadingCharges: "Nil",
//     otherCharges: "Nil",
//   });

//   /* =======================
//     PART-1 ORDERS
//   ======================= */
//   const [orders, setOrders] = useState([defaultOrderRow(), defaultOrderRow2()]);

//   const updateOrder = (id, key, value) => {
//     setOrders((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
//   };

//   const addOrder = () => {
//     setOrders((prev) => [
//       ...prev,
//       {
//         ...defaultOrderRow(),
//         _id: uid(),
//         orderNo: `JL-Aug-${String(prev.length + 1).padStart(3, "0")}`,
//       },
//     ]);
//   };

//   const removeOrder = (id) => setOrders((prev) => prev.filter((x) => x._id !== id));

//   const totalWeight = useMemo(() => {
//     return orders.reduce((acc, r) => acc + num(r.weight), 0);
//   }, [orders]);

//   /* =======================
//     PART-2 NEGOTIATION
//   ======================= */
//   const [negotiation, setNegotiation] = useState({
//     maxRate: "3000",
//     targetRate: "2750",
//     purchaseType: "Loading & Unloading",
//     oldRatePercent: "-5%",
//     remarks1: "Can Close this order by tomorrow as rate is high",
//     remarks2: "Close this order by within half an hour - Very Urgent",
//   });

//   const [vendors, setVendors] = useState([
//     { ...defaultVendorRow(), vendorName: "New Arjun Road Carriers", marketRate: "3200" },
//     { _id: uid(), vendorName: "Mahabir Road Carriers", marketRate: "3250" },
//     { _id: uid(), vendorName: "Divya Roadways", marketRate: "2950" },
//   ]);

//   const addVendor = () => setVendors((p) => [...p, { _id: uid(), vendorName: "", marketRate: "" }]);
//   const removeVendor = (id) => setVendors((p) => p.filter((x) => x._id !== id));
//   const updateVendor = (id, key, value) =>
//     setVendors((p) => p.map((v) => (v._id === id ? { ...v, [key]: value } : v)));

//   // Voice note
//   const [voiceUrl, setVoiceUrl] = useState("");
//   const audioRef = useRef(null);

//   /* =======================
//     PART-3 APPROVAL
//   ======================= */
//   const [approval, setApproval] = useState({
//     vendorName: "Divya Roadways",
//     vendorStatus: "Active",
//     rateType: "Per MT",
//     finalPerMT: "2850",
//     finalFix: "99750",
//     vehicleNo: "HR38X8960",
//     mobile: "9856432219",
//     purchaseType: "Loading & Unloading",
//     paymentTerms: "80 % Advance",
//     approvalStatus: "Approved",
//     remarks: "Reject Vehicle approvals should be recorded in the report",
//     memoStatus: "Uploaded",
//   });

//   const purchaseAmount = useMemo(() => {
//     if (approval.rateType === "Per MT") {
//       return num(approval.finalPerMT) * totalWeight;
//     }
//     return num(approval.finalFix);
//   }, [approval.rateType, approval.finalPerMT, approval.finalFix, totalWeight]);

//   /* =======================
//     REPORT (AUTO)
//   ======================= */
//   const reportRows = useMemo(() => {
//     return orders.map((o) => ({
//       date: header.date,
//       vnn: header.vnnNo,
//       order: o.orderNo,
//       partyName: o.partyName,
//       plantCode: o.plantCode,
//       orderType: o.orderType,
//       pinCode: o.pinCode,
//       from: o.from,
//       to: o.to,
//       district: o.district,
//       state: o.state,
//       weight: o.weight,
//       orderStatus: o.status,
//       approval: approval.approvalStatus || "Pending",
//       memo: approval.memoStatus || "Pending",
//     }));
//   }, [orders, header.date, header.vnnNo, approval.approvalStatus, approval.memoStatus]);

//   const handleSaveAll = () => {
//     const payload = {
//       header,
//       orders,
//       totalWeight,
//       negotiation,
//       vendors,
//       approval,
//       reportRows,
//     };
//     console.log("✅ VEHICLE NEGOTIATION SAVE PAYLOAD:", payload);
//     alert("✅ Saved! (Console me payload check)");
//   };

//   return (
//     <div className="min-h-screen bg-white">
//       {/* ===== PART 1 ===== */}
//       <SectionTitle>Vehicle Negotiation - Panel - Part -1</SectionTitle>

//       <div className="mx-auto max-w-[1400px] p-4 space-y-4">
//         {/* Top Header Grid */}
//         <div className="grid grid-cols-12 gap-3">
//           <LabelInput
//             className="col-span-12 md:col-span-3"
//             label="Vehicle Negotiation No"
//             value={header.vnnNo}
//             onChange={(v) => setHeader((p) => ({ ...p, vnnNo: v }))}
//           />
//           <LabelInput
//             className="col-span-12 md:col-span-3"
//             label="Branch"
//             value={header.branch}
//             onChange={(v) => setHeader((p) => ({ ...p, branch: v }))}
//           />

//           <LabelSelect
//             className="col-span-12 md:col-span-3"
//             label="Delivery"
//             value={header.delivery}
//             onChange={(v) => setHeader((p) => ({ ...p, delivery: v }))}
//             options={["Urgent", "Normal"]}
//           />

//           <LabelInput
//             type="date"
//             className="col-span-12 md:col-span-3"
//             label="Date"
//             value={header.date}
//             onChange={(v) => setHeader((p) => ({ ...p, date: v }))}
//           />
//         </div>

//         {/* Billing / Charges */}
//         <div className="grid grid-cols-12 gap-3">
//           <LabelInput
//             className="col-span-12 md:col-span-4"
//             label="Billing Type"
//             value={header.billingType}
//             onChange={(v) => setHeader((p) => ({ ...p, billingType: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="No. of Loading Points"
//             value={header.loadingPoints}
//             onChange={(v) => setHeader((p) => ({ ...p, loadingPoints: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="No. of Droping Point"
//             value={header.dropPoints}
//             onChange={(v) => setHeader((p) => ({ ...p, dropPoints: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="Collection Charges"
//             value={header.collectionCharges}
//             onChange={(v) => setHeader((p) => ({ ...p, collectionCharges: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="Cancellation Charges"
//             value={header.cancellationCharges}
//             onChange={(v) => setHeader((p) => ({ ...p, cancellationCharges: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="Loading Charges"
//             value={header.loadingCharges}
//             onChange={(v) => setHeader((p) => ({ ...p, loadingCharges: v }))}
//           />
//           <LabelInput
//             className="col-span-6 md:col-span-2"
//             label="Other Charges"
//             value={header.otherCharges}
//             onChange={(v) => setHeader((p) => ({ ...p, otherCharges: v }))}
//           />
//         </div>

//         {/* Orders Table +Add */}
//         <div className="rounded-2xl border border-slate-200 overflow-auto">
//           <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
//             <div className="font-extrabold text-slate-900">
//               Orders (Part-1)
//             </div>

//             <button
//               onClick={addOrder}
//               className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700"
//             >
//               +Add
//             </button>
//           </div>

//           <table className="min-w-[1200px] w-full text-sm">
//             <thead className="bg-yellow-300 sticky top-0">
//               <tr>
//                 {[
//                   "Order",
//                   "Party Name",
//                   "Plant Code",
//                   "Order Type",
//                   "Pin Code",
//                   "From",
//                   "To",
//                   "District",
//                   "State",
//                   "Weight",
//                   "Status",
//                   "Action",
//                 ].map((h) => (
//                   <th key={h} className="border border-black px-2 py-2 text-xs font-extrabold">
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {orders.map((o) => (
//                 <tr key={o._id} className="hover:bg-slate-50">
//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.orderNo}
//                       onChange={(e) => updateOrder(o._id, "orderNo", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.partyName}
//                       onChange={(e) => updateOrder(o._id, "partyName", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.plantCode}
//                       onChange={(e) => updateOrder(o._id, "plantCode", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   {/* Order Type Select */}
//                   <td className="border border-black px-2 py-2">
//                     <select
//                       value={o.orderType}
//                       onChange={(e) => updateOrder(o._id, "orderType", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-2"
//                     >
//                       {ORDER_TYPES.map((t) => (
//                         <option key={t} value={t}>
//                           {t}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.pinCode}
//                       onChange={(e) => updateOrder(o._id, "pinCode", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.from}
//                       onChange={(e) => updateOrder(o._id, "from", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.to}
//                       onChange={(e) => updateOrder(o._id, "to", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.district}
//                       onChange={(e) => updateOrder(o._id, "district", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.state}
//                       onChange={(e) => updateOrder(o._id, "state", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <input
//                       value={o.weight}
//                       onChange={(e) => updateOrder(o._id, "weight", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-1"
//                     />
//                   </td>

//                   {/* Status Select */}
//                   <td className="border border-black px-2 py-2">
//                     <select
//                       value={o.status}
//                       onChange={(e) => updateOrder(o._id, "status", e.target.value)}
//                       className="w-full rounded-lg border border-slate-200 px-2 py-2"
//                     >
//                       {STATUSES.map((s) => (
//                         <option key={s} value={s}>
//                           {s}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                   <td className="border border-black px-2 py-2">
//                     <button
//                       onClick={() => removeOrder(o._id)}
//                       className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
//                     >
//                       Remove
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>

//         {/* Total Weight box */}
//         <div className="flex justify-end">
//           <div className="flex items-center gap-3 border border-black px-4 py-2">
//             <div className="font-extrabold text-sm">Total Weight</div>
//             <div className="font-extrabold text-sm">{totalWeight}</div>
//           </div>
//         </div>
//       </div>

//       {/* ===== PART 2 ===== */}
//       <div className="mt-6">
//         <div className="bg-yellow-300 text-black font-extrabold text-center py-3 text-lg border border-black">
//           Vehicle - Negotiation - Part - 2
//         </div>

//         <div className="mx-auto max-w-[1400px] p-4 space-y-4">
//           <div className="grid grid-cols-12 gap-3">
//             <LabelInput
//               className="col-span-12 md:col-span-2"
//               label="Max Rate"
//               value={negotiation.maxRate}
//               onChange={(v) => setNegotiation((p) => ({ ...p, maxRate: v }))}
//             />
//             <LabelInput
//               className="col-span-12 md:col-span-2"
//               label="Target Rate"
//               value={negotiation.targetRate}
//               onChange={(v) => setNegotiation((p) => ({ ...p, targetRate: v }))}
//             />

//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Purchase - Type"
//               value={negotiation.purchaseType}
//               onChange={(v) => setNegotiation((p) => ({ ...p, purchaseType: v }))}
//               options={PURCHASE_TYPES}
//             />

//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Old Rate %"
//               value={negotiation.oldRatePercent}
//               onChange={(v) => setNegotiation((p) => ({ ...p, oldRatePercent: v }))}
//             />
//           </div>

//           {/* Vendors / Market Rates */}
//           <div className="rounded-2xl border border-slate-200 overflow-auto">
//             <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
//               <div className="font-extrabold text-slate-900">Vendors / Market Rates</div>
//               <button
//                 onClick={addVendor}
//                 className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700"
//               >
//                 + Add Vendor
//               </button>
//             </div>

//             <table className="min-w-[900px] w-full text-sm">
//               <thead className="bg-slate-900 text-white">
//                 <tr>
//                   <th className="px-3 py-3 text-xs font-extrabold text-left">Vendor Name</th>
//                   <th className="px-3 py-3 text-xs font-extrabold text-left">Market Rates</th>
//                   <th className="px-3 py-3 text-xs font-extrabold text-left">Action</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {vendors.map((v) => (
//                   <tr key={v._id} className="border-t hover:bg-slate-50">
//                     <td className="px-3 py-3">
//                       <input
//                         value={v.vendorName}
//                         onChange={(e) => updateVendor(v._id, "vendorName", e.target.value)}
//                         className="w-full rounded-xl border border-slate-200 px-3 py-2"
//                       />
//                     </td>
//                     <td className="px-3 py-3">
//                       <input
//                         value={v.marketRate}
//                         onChange={(e) => updateVendor(v._id, "marketRate", e.target.value)}
//                         className="w-full rounded-xl border border-slate-200 px-3 py-2"
//                       />
//                     </td>
//                     <td className="px-3 py-3">
//                       <button
//                         onClick={() => removeVendor(v._id)}
//                         className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
//                       >
//                         Remove
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Remarks & Voice */}
//           <div className="grid grid-cols-12 gap-3">
//             <div className="col-span-12 md:col-span-7 rounded-2xl border border-slate-200 p-4">
//               <div className="font-extrabold text-slate-900 mb-3">Remarks</div>
//               <textarea
//                 value={negotiation.remarks1}
//                 onChange={(e) => setNegotiation((p) => ({ ...p, remarks1: e.target.value }))}
//                 className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
//                 rows={2}
//               />
//               <textarea
//                 value={negotiation.remarks2}
//                 onChange={(e) => setNegotiation((p) => ({ ...p, remarks2: e.target.value }))}
//                 className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
//                 rows={2}
//               />
//             </div>

//             <div className="col-span-12 md:col-span-5 rounded-2xl border border-slate-200 p-4">
//               <div className="font-extrabold text-slate-900 mb-3">Voice Note</div>

//               <input
//                 type="file"
//                 accept="audio/*"
//                 onChange={(e) => {
//                   const file = e.target.files?.[0];
//                   if (!file) return;
//                   const url = URL.createObjectURL(file);
//                   setVoiceUrl(url);
//                 }}
//                 className="w-full"
//               />

//               <button
//                 onClick={() => audioRef.current?.play()}
//                 className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white hover:bg-black"
//                 disabled={!voiceUrl}
//               >
//                 Play the Voice Note
//               </button>

//               <audio ref={audioRef} src={voiceUrl} controls className="mt-3 w-full" />
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ===== PART 3 ===== */}
//       <div className="mt-6">
//         <div className="bg-green-400 text-black font-extrabold text-center py-3 text-lg border border-black">
//           Vehicle - Approval - Part - 3
//         </div>

//         <div className="mx-auto max-w-[1400px] p-4 space-y-4">
//           <div className="grid grid-cols-12 gap-3">
//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Vendor Name"
//               value={approval.vendorName}
//               onChange={(v) => setApproval((p) => ({ ...p, vendorName: v }))}
//             />

//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Vendor (Status)"
//               value={approval.vendorStatus}
//               onChange={(v) => setApproval((p) => ({ ...p, vendorStatus: v }))}
//               options={VENDOR_STATUS}
//             />

//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Rate - Type"
//               value={approval.rateType}
//               onChange={(v) => setApproval((p) => ({ ...p, rateType: v }))}
//               options={RATE_TYPES}
//             />
//           </div>

//           {/* A / B / A x B */}
//           <div className="grid grid-cols-12 gap-3">
//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Final - Per MT (A)"
//               value={approval.finalPerMT}
//               onChange={(v) => setApproval((p) => ({ ...p, finalPerMT: v }))}
//             />
//             <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 p-4">
//               <div className="text-[12px] font-bold text-slate-700">Weight (B)</div>
//               <div className="mt-2 text-2xl font-extrabold text-slate-900">{totalWeight}</div>
//             </div>
//             <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 p-4">
//               <div className="text-[12px] font-bold text-slate-700">Purchase Amount (A x B)</div>
//               <div className="mt-2 text-2xl font-extrabold text-slate-900">{purchaseAmount}</div>
//             </div>
//           </div>

//           <div className="grid grid-cols-12 gap-3">
//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Final - Fix"
//               value={approval.finalFix}
//               onChange={(v) => setApproval((p) => ({ ...p, finalFix: v }))}
//             />

//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Vehicle"
//               value={approval.vehicleNo}
//               onChange={(v) => setApproval((p) => ({ ...p, vehicleNo: v }))}
//             />

//             <LabelInput
//               className="col-span-12 md:col-span-4"
//               label="Mobile"
//               value={approval.mobile}
//               onChange={(v) => setApproval((p) => ({ ...p, mobile: v }))}
//             />
//           </div>

//           <div className="grid grid-cols-12 gap-3">
//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Purchase - Type"
//               value={approval.purchaseType}
//               onChange={(v) => setApproval((p) => ({ ...p, purchaseType: v }))}
//               options={PURCHASE_TYPES}
//             />
//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Payment - Terms"
//               value={approval.paymentTerms}
//               onChange={(v) => setApproval((p) => ({ ...p, paymentTerms: v }))}
//               options={PAYMENT_TERMS}
//             />
//             <LabelSelect
//               className="col-span-12 md:col-span-4"
//               label="Approval"
//               value={approval.approvalStatus}
//               onChange={(v) => setApproval((p) => ({ ...p, approvalStatus: v }))}
//               options={APPROVALS}
//             />
//           </div>

//           <div className="rounded-2xl border border-slate-200 p-4">
//             <div className="font-extrabold text-slate-900 mb-2">Remarks</div>
//             <textarea
//               value={approval.remarks}
//               onChange={(e) => setApproval((p) => ({ ...p, remarks: e.target.value }))}
//               className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
//               rows={2}
//             />
//           </div>
//         </div>
//       </div>

//       {/* ===== MEMO UPLOAD ===== */}
//       <div className="mt-6">
//         <div className="bg-green-400 text-black font-extrabold text-center py-3 text-lg border border-black">
//           Memo - Upload
//         </div>

//         <div className="mx-auto max-w-[1400px] p-4">
//           <div className="rounded-2xl border border-slate-200 p-4">
//             <div className="font-extrabold text-slate-900 mb-3">Memo Upload</div>
//             <input
//               type="file"
//               accept=".pdf,.png,.jpg,.jpeg"
//               onChange={(e) => {
//                 const file = e.target.files?.[0];
//                 if (!file) return;
//                 setApproval((p) => ({ ...p, memoStatus: "Uploaded" }));
//               }}
//             />
//             <div className="mt-3 text-sm">
//               Status:{" "}
//               <span className="font-extrabold">
//                 {approval.memoStatus || "Pending"}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ===== NOTES ===== */}
//       <div className="mx-auto max-w-[1400px] p-4">
//         <div className="rounded-2xl border border-slate-200 p-4">
//           <div className="text-xs font-extrabold bg-yellow-300 inline-block px-2 py-1 border border-black">
//             Note
//           </div>
//           <div className="mt-3 text-sm text-slate-700 space-y-2">
//             <div>
//               The average rate & Rate Percentage should be available only to approver or manager.
//             </div>
//             <div>
//               The Max Rate and the Old Rate Percentage should be visible to Approver only and the Max rate will be input in the Party Master as per Branch - Location and Weight.
//             </div>
//             <div className="font-bold">Blacklisted won't be approved</div>
//             <div>
//               The Approval _PS should be visible to the Pricing Manager ID only.
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ===== REPORT ===== */}
//       <div className="mt-8">
//         <SectionTitle>Vehicle Negotiation - Report</SectionTitle>

//         <div className="mx-auto max-w-[1400px] p-4">
//           <div className="rounded-2xl border border-slate-200 overflow-auto">
//             <table className="min-w-[1400px] w-full text-sm">
//               <thead className="bg-slate-900 text-white sticky top-0">
//                 <tr>
//                   {[
//                     "Date",
//                     "VNN",
//                     "Order",
//                     "Party Name",
//                     "Plant Code",
//                     "Order Type",
//                     "Pin Code",
//                     "From",
//                     "To",
//                     "District",
//                     "State",
//                     "Weight",
//                     "Order Status",
//                     "Approval",
//                     "Memo",
//                   ].map((h) => (
//                     <th key={h} className="px-3 py-3 text-left text-xs font-extrabold uppercase">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>

//               <tbody>
//                 {reportRows.map((r, idx) => (
//                   <tr key={idx} className="border-t hover:bg-slate-50">
//                     <td className="px-3 py-3">{formatDateDDMMYYYY(r.date)}</td>
//                     <td className="px-3 py-3">{r.vnn}</td>
//                     <td className="px-3 py-3">{r.order}</td>
//                     <td className="px-3 py-3">{r.partyName}</td>
//                     <td className="px-3 py-3">{r.plantCode}</td>
//                     <td className="px-3 py-3">{r.orderType}</td>
//                     <td className="px-3 py-3">{r.pinCode}</td>
//                     <td className="px-3 py-3">{r.from}</td>
//                     <td className="px-3 py-3">{r.to}</td>
//                     <td className="px-3 py-3">{r.district}</td>
//                     <td className="px-3 py-3">{r.state}</td>
//                     <td className="px-3 py-3">{r.weight}</td>

//                     <td className="px-3 py-3 font-bold">{r.orderStatus}</td>

//                     <td
//                       className={`px-3 py-3 font-extrabold ${
//                         r.approval === "Approved" ? "text-green-700" : "text-orange-600"
//                       }`}
//                     >
//                       {r.approval}
//                     </td>

//                     <td
//                       className={`px-3 py-3 font-extrabold ${
//                         r.memo === "Uploaded" ? "text-green-700" : "text-orange-600"
//                       }`}
//                     >
//                       {r.memo}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="flex justify-end mt-6">
//             <button
//               onClick={handleSaveAll}
//               className="rounded-2xl bg-sky-600 px-10 py-4 text-xl font-extrabold text-white hover:bg-sky-700"
//             >
//               Save All
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
