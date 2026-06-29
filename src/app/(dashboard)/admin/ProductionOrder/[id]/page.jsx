"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Select from "react-select";
import { useParams, useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ProductionOrderPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  // ─── Token state – the root cause fix ─────────────────────
  const [token, setToken] = useState(null);         // null = loading
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    const tk = localStorage.getItem("token");
    setToken(tk);
    setTokenReady(true);
  }, []);

  // Helper – only used after token is ready (inside effects)
  const authHeaders = { Authorization: `Bearer ${token}` };

  const typeOptions = [
    { value: "standard", label: "Standard" },
    { value: "custom", label: "Custom" },
  ];
  const statusOptions = [
    { value: "planned", label: "Planned" },
    { value: "released", label: "Released" },
    { value: "materialto", label: "Material To" },
    { value: "inproduction", label: "In Production" },
    { value: "closed", label: "Closed" },
  ];

  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);

  const [selectedBomId, setSelectedBomId] = useState("");
  const [type, setType] = useState("standard");
  const [status, setStatus] = useState("planned");
  const [warehouse, setWarehouse] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [priority, setPriority] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productionDate, setProductionDate] = useState("");

  const [bomItems, setBomItems] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // ─── 1. Fetch master data (after token is ready) ──────────
  useEffect(() => {
    if (!token) return;
    const fetchMaster = async () => {
      try {
        const [bomRes, itemsRes, whRes] = await Promise.all([
          axios.get("/api/bom", { headers: authHeaders }),
          axios.get("/api/items", { headers: authHeaders }),
          axios.get("/api/warehouse", { headers: authHeaders }),
        ]);
        setBoms(bomRes.data?.data || bomRes.data || []);
        setAllItems(itemsRes.data?.data || itemsRes.data || []);
        setWarehouseOptions(
          (whRes.data?.data || whRes.data || []).map((w) => ({
            value: w._id,
            label: w.warehouseName || w.name,
          }))
        );
      } catch (err) {
        toast.error("Failed to load master data");
      }
    };
    fetchMaster();
  }, [token]);   // ✅ runs only after token state is set

  // ─── 2. Load existing order (edit mode) ──────────────────
  useEffect(() => {
    if (!id || !token) return;
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`/api/production-orders?id=${id}`, {
          headers: authHeaders,
        });
        const o = res.data?.data || res.data;
        setSelectedBomId(o.bomId || "");
        setType(o.type || "standard");
        setStatus(o.status || "planned");
        setWarehouse(o.warehouse || "");
        setProductDesc(o.productDesc || "");
        setPriority(o.priority || "");
        setQuantity(o.quantity || 1);
        setProductionDate(
          o.productionDate ? new Date(o.productionDate).toISOString().split("T")[0] : ""
        );
        setBomItems(
          (o.items || []).map((it) => ({
            id: uuidv4(),
            item: it.item,
            itemCode: it.itemCode,
            itemName: it.itemName,
            unitQty: it.quantity,
            quantity: it.quantity,
            requiredQty: it.quantity * (o.quantity || 1),
            warehouse: it.warehouse || "",
          }))
        );
      } catch (err) {
        toast.error("Failed to load production order");
      }
    };
    fetchOrder();
  }, [id, token]);   // ✅ runs after token is ready

  // ─── 3. Load BOM items when a new BOM is selected (create mode only) ───
  useEffect(() => {
    if (!selectedBomId || id || !token) return;
    const fetchBom = async () => {
      try {
        const res = await axios.get(`/api/bom/${selectedBomId}`, {
          headers: authHeaders,
        });
        const data = res.data?.data || res.data;
        const items = (data.items || []).map((it) => ({
          id: uuidv4(),
          item: it.item?._id || it.item,
          itemCode: it.itemCode || it.item?.itemCode || "",
          itemName: it.itemName || it.item?.itemName || "",
          unitQty: it.quantity,
          quantity: it.quantity,
          requiredQty: it.quantity * quantity,
          warehouse: "",
        }));
        setBomItems(items);
        setProductDesc(data.productDesc || "");
      } catch (err) {
        toast.error("Could not load BOM");
      }
    };
    fetchBom();
  }, [selectedBomId, quantity, id, token]);   // ✅ token included

  // ─── Handlers ──────────────────────────────────────────────
  const handleQuantityChange = (rowId, val) => {
    const qty = Number(val);
    setBomItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? { ...item, quantity: qty, requiredQty: qty * quantity }
          : item
      )
    );
  };

  const handleWarehouseChange = (rowId, val) => {
    setBomItems((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, warehouse: val } : item
      )
    );
  };

  const handleAddItem = () => {
    if (!selectedOption) return;
    const it = selectedOption.data;
    setBomItems((prev) => [
      ...prev,
      {
        id: uuidv4(),
        item: it._id,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: 1,
        quantity: 1,
        requiredQty: 1 * quantity,
        warehouse: "",
      },
    ]);
    setSelectedOption(null);
  };

  const handleRemoveItem = (rowId) => {
    setBomItems((prev) => prev.filter((item) => item.id !== rowId));
  };

  const handleSaveProductionOrder = async () => {
    if (!token) {
      toast.error("Please log in");
      return;
    }

    const payload = {
      bomId: selectedBomId,
      type,
      status,
      warehouse,
      productDesc,
      priority,
      productionDate,
      quantity,
      items: bomItems.map((it) => ({
        item: it.item,
        itemCode: it.itemCode,
        itemName: it.itemName,
        quantity: it.quantity,
        unitPrice: 0,
        total: 0,
        warehouse: it.warehouse,
      })),
    };

    try {
      if (id) {
        await axios.put(`/api/production-orders?id=${id}`, payload, {
          headers: authHeaders,
        });
        toast.success("Production Order updated!");
      } else {
        await axios.post("/api/production-orders", payload, {
          headers: authHeaders,
        });
        toast.success("Production Order created!");
      }
      router.push("/admin/ppc/production-orders");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving production order");
    }
  };

  // ─── Options for react-select ─────────────────────────────
  const itemOptions = allItems.map((it) => ({
    value: it._id,
    label: `${it.itemCode} - ${it.itemName}`,
    data: it,
  }));

  // ─── Loading state until token is known ──────────────────
  if (!tokenReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">
        {id ? "Edit Production Order" : "New Production Order"}
      </h2>

      {/* Order Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* ... same JSX as before ... */}
        <div>
          <label className="block text-sm font-medium">Select BOM</label>
          <select
            className="w-full border p-2 rounded"
            value={selectedBomId}
            onChange={(e) => setSelectedBomId(e.target.value)}
          >
            <option value="">-- choose --</option>
            {boms.map((b) => (
              <option key={b._id} value={b._id}>
                {b.productNo?.itemName || b.productDesc || b._id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Type</label>
          <select className="w-full border p-2 rounded" value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select className="w-full border p-2 rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Warehouse</label>
          <select className="w-full border p-2 rounded" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            <option value="">-- select warehouse --</option>
            {warehouseOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Product Description</label>
          <input className="w-full border p-2 rounded" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Priority</label>
          <input className="w-full border p-2 rounded" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Planned Quantity</label>
          <input type="number" className="w-full border p-2 rounded" value={quantity} min={1} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium">Production Date</label>
          <input type="date" className="w-full border p-2 rounded" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
        </div>
      </div>

      {/* Add Item */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Add Item</label>
        <div className="flex gap-2">
          <div className="grow">
            <Select
              options={itemOptions}
              value={selectedOption}
              onChange={setSelectedOption}
              isClearable
              placeholder="Search and select item..."
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddItem}>
            Add
          </button>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full table-auto border-collapse border text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Item Code</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Required Qty</th>
            <th className="border p-2">Warehouse</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bomItems.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.itemCode}</td>
              <td className="border p-2">{item.itemName}</td>
              <td className="border p-2 text-right">
                <input
                  type="number"
                  className="w-full border p-1 rounded text-right"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                />
              </td>
              <td className="border p-2 text-right">{item.requiredQty}</td>
              <td className="border p-2">
                <select className="w-full border p-1 rounded" value={item.warehouse} onChange={(e) => handleWarehouseChange(item.id, e.target.value)}>
                  <option value="">-- select --</option>
                  {warehouseOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="border p-2 text-center">
                <button className="text-red-500 hover:underline" onClick={() => handleRemoveItem(item.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <button className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700" onClick={handleSaveProductionOrder}>
          {id ? "Update Order" : "Create Order"}
        </button>
      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
}