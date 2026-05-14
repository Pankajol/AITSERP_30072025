// components/ProductionOrder.js
"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ProductionOrder() {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    type: "Standard",
    status: "Planned",
    productNo: "",
    productDescription: "",
    plannedQuantity: 1,
    uom: "",
    warehouse: "",
    priority: 100,
    remarks: ""
  });
  const [addedComponents, setAddedComponents] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");

  useEffect(() => {
    axios.get("/api/items")
      .then(res => setItems(res.data || []))
      .catch(err => console.error("Error fetching items:", err));
    axios.get("/api/warehouse")
      .then(res => setWarehouses(res.data || []))
      .catch(err => console.error("Error fetching warehouses:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "number" ? +value : value }));
  };

  const handleAddItem = () => {
    const item = items.find(i => i.id === selectedItem || i._id === selectedItem);
    if (item && !addedComponents.some(c => (c.id || c._id) === (item.id || item._id))) {
      setAddedComponents(prev => [...prev, {
        ...item,
        baseQty: "",
        baseRatio: "",
        plannedQty: "",
        issued: "",
        additionalQty: "",
        available: "",
        uomName: "",
        warehouse: "",
        issueMethod: "",
        wipAccount: "",
        distrRule: "",
        location: "",
        uomCode: "",
        routeSeq: "",
        procurementDoc: "",
        allowProcurementDoc: ""
      }]);
      setSelectedItem("");
    }
  };

  const handleComponentChange = (idx, field, value) => {
    setAddedComponents(prev => {
      const copy = [...prev];
      copy[idx][field] = value;
      return copy;
    });
  };

  const handleRemoveItem = (id) => {
    setAddedComponents(prev => prev.filter(item => (item.id || item._id) !== id));
  };

  const handleSubmit = () => {
    console.log("Submitting production order:", form, addedComponents);
    // TODO: integrate backend
  };

  const handleCancel = () => {
    setForm({
      type: "Standard",
      status: "Planned",
      productNo: "",
      productDescription: "",
      plannedQuantity: 1,
      uom: "",
      warehouse: "",
      priority: 100,
      remarks: ""
    });
    setAddedComponents([]);
  };

  return (
    <div className="p-6 bg-white shadow-md">
      <h2 className="text-xl font-bold mb-4">Recipt from Production</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block mb-1">Product No.</label>
          <input
            type="text"
            name="productNo"
            value={form.productNo}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Product Description</label>
          <input
            type="text"
            name="productDescription"
            value={form.productDescription}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Planned Quantity</label>
          <input
            type="number"
            name="plannedQuantity"
            value={form.plannedQuantity}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">UOM</label>
          <input
            type="text"
            name="uom"
            value={form.uom}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label className="block mb-1">Warehouse</label>
          <select
            name="warehouse"
            value={form.warehouse}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map(w => (
              <option key={w._id || w.id} value={w.name}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Priority</label>
          <input
            type="number"
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full border px-2 py-1"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-1">Remarks</label>
        <textarea
          name="remarks"
          value={form.remarks}
          onChange={handleChange}
          className="w-full border px-2 py-1"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1">Add Component</label>
        <div className="flex gap-4 mb-2">
          <select
            value={selectedItem}
            onChange={e => setSelectedItem(e.target.value)}
            className="w-full border px-2 py-1"
          >
            <option value="">Select Item</option>
            {items.map(i => (
              <option key={i._id || i.id} value={i._id || i.id}>{i.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddItem}
            className="bg-green-600 text-white px-4 py-1 rounded"
          >
            Add
          </button>
        </div>
      </div>

      {addedComponents.length > 0 && (
        <div className="overflow-auto mb-4">
          <table className="w-full border text-sm text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Component Name</th>
                <th className="border px-2 py-1">Base Qty</th>
                <th className="border px-2 py-1">Planned Qty</th>
                <th className="border px-2 py-1">UOM</th>
                <th className="border px-2 py-1">Warehouse</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addedComponents.map((comp, idx) => (
                <tr key={idx} className="even:bg-gray-50">
                  <td className="border px-2 py-1">{comp.name}</td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      value={comp.baseQty}
                      onChange={e => handleComponentChange(idx, "baseQty", e.target.value)}
                      className="w-full border p-1"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      value={comp.plannedQty}
                      onChange={e => handleComponentChange(idx, "plannedQty", e.target.value)}
                      className="w-full border p-1"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      value={comp.uomName}
                      onChange={e => handleComponentChange(idx, "uomName", e.target.value)}
                      className="w-full border p-1"
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <input
                      type="text"
                      value={comp.warehouse}
                      onChange={e => handleComponentChange(idx, "warehouse", e.target.value)}
                      className="w-full border p-1"
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => handleRemoveItem(comp._id || comp.id)}
                      className="text-red-500 underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Submit
        </button>
        <button
          onClick={handleCancel}
          className="bg-gray-400 text-white px-6 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
