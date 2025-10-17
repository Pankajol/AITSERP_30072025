"use client";

// ✅ Disable Next.js prerendering / static caching completely


import { Suspense, useEffect, useState } from "react";
import Select from "react-select";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import SalesOrderSearch from "@/components/SalesOrderSearch";

function ProductionOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [token, setToken] = useState(null);
  const [boms, setBoms] = useState([]);
  const [resources, setResources] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [bomResources, setBomResources] = useState([]);
  const [selectedBomId, setSelectedBomId] = useState("");
  const [type, setType] = useState("manufacture");
  const [status, setStatus] = useState("Open");
  const [priority, setPriority] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productionDate, setProductionDate] = useState("");
  const [salesOrder, setSalesOrder] = useState([]);

  // Operation Flow
  const [operationFlow, setOperationFlow] = useState([]);
  const [operationOptions, setOperationOptions] = useState([]);

  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  useEffect(() => {
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const fetchAllData = async () => {
      try {
        const [
          operationsRes,
          bomRes,
          itemsRes,
          warehouseRes,
          resourcesRes,
          machinesRes,
          operatorsRes,
        ] = await Promise.all([
          axios.get("/api/ppc/operations", config),
          axios.get("/api/bom", config),
          axios.get("/api/items", config),
          axios.get("/api/warehouse", config),
          axios.get("/api/ppc/resources", config),
          axios.get("/api/ppc/machines", config),
          axios.get("/api/ppc/operators", config),
        ]);

        setOperationOptions(
          (operationsRes.data.data || operationsRes.data).map((op) => ({
            label: op.operationName || op.name,
            value: op._id || op.value || op.name,
          }))
        );
        setBoms(bomRes.data.data || bomRes.data);
        setAllItems(itemsRes.data.data || itemsRes.data);
        setResources(resourcesRes.data.data || resourcesRes.data);
        setMachines(
          (machinesRes.data.data || machinesRes.data).map((m) => ({
            label: m.machineName || m.name,
            value: m._id,
          }))
        );
        setOperators(
          (operatorsRes.data.data || operatorsRes.data).map((o) => ({
            label: o.operatorName || o.name,
            value: o._id,
          }))
        );
        const whData = warehouseRes.data.data || warehouseRes.data;
        setWarehouseOptions(
          whData.map((w) => ({ value: w._id, label: w.warehouseName }))
        );
      } catch (err) {
        console.error("Error loading master data", err);
        toast.error("Failed to load master data");
      }
    };

    fetchAllData();
  }, [token])

  useEffect(() => {
    if (!selectedBomId || !token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const fetchBomDetails = async () => {
      try {
        const res = await axios.get(`/api/bom/${selectedBomId}`, config);
        const data = res.data;

        const items = (data.items || []).map((it) => ({
          id: uuidv4(),
          type: "Item",
          item: it._id || it.item,
          itemCode: it.itemCode,
          itemName: it.itemName,
          unitQty: it.unitQty || 1,
          quantity: it.quantity || 1,
          requiredQty: it.requiredQty || it.quantity || 1,
          warehouse: it.warehouse || "",
          unitPrice: it.unitPrice || 0,
          total: (it.unitPrice || 0) * (it.quantity || 1),
        }));

        const resourcesData = (data.resources || []).map((r) => ({
          id: uuidv4(),
          type: "Resource",
          resource: r._id || r.resource,
          code: r.code || r.resourceCode || "",
          name: r.name || r.resourceName || "",
          quantity: r.quantity || 1,
          unitPrice: r.unitPrice || 0,
          total: (r.unitPrice || 0) * (r.quantity || 1),
        }));

        setBomItems(items);
        setBomResources(resourcesData);
        setProductDesc(data.productDesc || "");
      } catch (err) {
        console.error("Error fetching BOM details", err);
        toast.error("Failed to fetch BOM details");
      }
    };

    fetchBomDetails();
  }, [selectedBomId, token]);

  const handleQtyChange = (type, index, val) => {
    const update = (arr, i, changes) =>
      arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

    if (type === "item") {
      setBomItems((prev) =>
        update(prev, index, { quantity: val, total: prev[index].unitPrice * val })
      );
    } else {
      setBomResources((prev) =>
        update(prev, index, { quantity: val, total: prev[index].unitPrice * val })
      );
    }
  };

  const handleWarehouseChange = (type, index, val) => {
    const update = (arr, i, changes) =>
      arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

    if (type === "item") setBomItems((prev) => update(prev, index, { warehouse: val }));
    else setBomResources((prev) => update(prev, index, { warehouse: val }));
  };

  const handleItemSelect = (index, option) => {
    if (!option) return;
    const { _id, itemCode, itemName, unitPrice } = option.data;
    setBomItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, item: _id, itemCode, itemName, unitPrice, total: unitPrice * it.quantity }
          : it
      )
    );
  };

  const handleResourceSelect = (index, option) => {
    if (!option) return;
    const { _id, code, name, unitPrice } = option.data;
    setBomResources((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, resource: _id, code, name, unitPrice, total: unitPrice * r.quantity }
          : r
      )
    );
  };

  const handleAddItem = () =>
    setBomItems((prev) => [
      ...prev,
      { id: uuidv4(), type: "Item", item: null, itemCode: "", itemName: "", unitQty: 1, quantity: 1, requiredQty: 1, warehouse: "", unitPrice: 0, total: 0 },
    ]);

  const handleAddResource = () =>
    setBomResources((prev) => [
      ...prev,
      { id: uuidv4(), type: "Resource", resource: null, code: "", name: "", quantity: 1, warehouse: "", unitPrice: 0, total: 0 },
    ]);

  const handleDelete = (type, index) => {
    if (type === "item") setBomItems((prev) => prev.filter((_, i) => i !== index));
    else setBomResources((prev) => prev.filter((_, i) => i !== index));
  };

  // Operation Flow handlers
  const handleAddOperationFlow = () => {
    setOperationFlow((prev) => [
      ...prev,
      { id: uuidv4(), operation: null, machine: null, operator: null },
    ]);
  };

  const handleDeleteFlow = (index) => {
    setOperationFlow((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOperationChange = (index, field, value) => {
    setOperationFlow((prev) =>
      prev.map((flow, i) => (i === index ? { ...flow, [field]: value } : flow))
    );
  };

  const handleSalesOrderSelect = (selectedOrders) => setSalesOrder(selectedOrders);

  const handleSave = async () => {
    if (!token) return toast.error("Missing token");

    const sanitizedItems = bomItems
      .filter((it) => it.item)
      .map((it) => ({
        item: it.item,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: it.unitQty,
        quantity: it.quantity,
        requiredQty: it.requiredQty,
        warehouse: it.warehouse || null,
      }));

    const sanitizedResources = bomResources
      .filter((r) => r.resource)
      .map((r) => ({
        resource: r.resource,
        code: r.code,
        name: r.name,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        total: r.total,
      }));

    const payload = {
      bomId: selectedBomId,
      type,
      status,
      warehouse: warehouse || null,
      productDesc,
      priority,
      quantity,
      productionDate,
      salesOrder,
      items: sanitizedItems,
      resources: sanitizedResources,
      operationFlow: operationFlow.map((f) => ({
        operation: f.operation?.value || null,
        machine: f.machine?.value || null,
        operator: f.operator?.value || null,
      })),
    };

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (id) {
        await axios.put(`/api/production-orders/${id}`, payload, config);
        toast.success("Production Order updated successfully");
      } else {
        await axios.post("/api/production-orders", payload, config);
        toast.success("Production Order created successfully");
      }
      router.push("/admin/productionorders-list-view");
    } catch (err) {
      console.error("Error saving production order:", err);
      toast.error("Failed to save production order");
    }
  };

  const itemOptions = allItems.map((it) => ({
    value: it._id,
    label: `${it.itemCode} - ${it.itemName}`,
    data: it,
  }));

  const resourceOptions = resources.map((r) => ({
    value: r._id,
    label: r.name || r.resourceName,
    data: r,
  }));

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">{id ? "Edit" : "New"} Production Order</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <SalesOrderSearch onSelectSalesOrder={handleSalesOrderSelect} selectedSalesOrders={salesOrder} />
        </div>
        <div>
          <label className="text-sm font-medium">Select BOM</label>
          <select
            className="w-full border p-2 rounded"
            value={selectedBomId}
            onChange={(e) => setSelectedBomId(e.target.value)}
          >
            <option value="">Select...</option>
            {boms.map((b) => (
              <option key={b._id} value={b._id}>
                {b.productNo?.itemName || b.productDesc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Product Description</label>
          <input
            className="w-full border p-2 rounded"
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Priority</label>
          <input
            className="w-full border p-2 rounded"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Planned Quantity</label>
          <input
            type="number"
            min={1}
            className="w-full border p-2 rounded"
            value={quantity}
            onChange={(e) => setQuantity(+e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Production Date</label>
          <input
            type="date"
            className="w-full border p-2 rounded"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
          />
        </div>
      </div>

      {/* ---------- BOM + RESOURCES TABLE WRAPPER FOR MOBILE SCROLL ---------- */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">Select</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Warehouse</th>
              <th className="border p-2">Unit Price</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {bomItems.map((item, index) => (
              <tr key={item.id}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2 w-36">
                  <Select
                    options={itemOptions}
                    value={itemOptions.find((o) => o.data.itemCode === item.itemCode)}
                    onChange={(opt) => handleItemSelect(index, opt)}
                    isSearchable
                    placeholder="Select Item"
                  />
                </td>
                <td className="border p-2">{item.itemName}</td>
                <td className="border p-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQtyChange("item", index, +e.target.value)}
                    className="w-16 border p-1 text-center rounded"
                  />
                </td>
                <td className="border p-2 text-center">
                  <select
                    className="border rounded p-1 w-full"
                    value={item.warehouse}
                    onChange={(e) => handleWarehouseChange("item", index, e.target.value)}
                  >
                    <option value="">Select</option>
                    {warehouseOptions.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2 text-right">{item.unitPrice}</td>
                <td className="border p-2 text-right">{item.total}</td>
                <td className="border p-2 text-center">{item.type}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleDelete("item", index)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {bomResources.map((resource, index) => (
              <tr key={resource.id}>
                <td className="border p-2 text-center">{index + 1 + bomItems.length}</td>
                <td className="border p-2 w-36">
                  <Select
                    options={resourceOptions}
                    value={resourceOptions.find((o) => o.data.code === resource.code)}
                    onChange={(opt) => handleResourceSelect(index, opt)}
                    isSearchable
                    placeholder="Select Resource"
                  />
                </td>
                <td className="border p-2">{resource.name}</td>
                <td className="border p-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={resource.quantity}
                    onChange={(e) => handleQtyChange("resource", index, +e.target.value)}
                    className="w-16 border p-1 text-center rounded"
                  />
                </td>
                <td className="border p-2 text-center">
                  <select
                    className="border rounded p-1 w-full"
                    value={resource.warehouse}
                    onChange={(e) => handleWarehouseChange("resource", index, e.target.value)}
                  >
                    <option value="">Select</option>
                    {warehouseOptions.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-2 text-right">{resource.unitPrice}</td>
                <td className="border p-2 text-right">{resource.total}</td>
                <td className="border p-2 text-center">{resource.type}</td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleDelete("resource", index)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- OPERATION FLOW SECTION ---------- */}
      <div className="overflow-x-auto mb-6">
        <h3 className="text-lg font-semibold mb-2">Operation Flow</h3>
        {operationFlow.map((flow, idx) => (
          <div key={flow.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 items-end">
            <div>
              <label className="text-sm">Operation</label>
              <Select
                options={operationOptions}
                value={flow.operation}
                onChange={(opt) => handleOperationChange(idx, "operation", opt)}
              />
            </div>
            <div>
              <label className="text-sm">Machine</label>
              <Select
                options={machines}
                value={flow.machine}
                onChange={(opt) => handleOperationChange(idx, "machine", opt)}
              />
            </div>
            <div>
              <label className="text-sm">Operator</label>
              <Select
                options={operators}
                value={flow.operator}
                onChange={(opt) => handleOperationChange(idx, "operator", opt)}
              />
            </div>
            <div>
              <button
                onClick={() => handleDeleteFlow(idx)}
                className="mt-2 text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleAddOperationFlow}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Operation Flow
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleAddItem}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Item
        </button>
        <button
          onClick={handleAddResource}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add Resource
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Production Order
        </button>
      </div>
    </div>
  );
}

// export default ProductionOrderPage;


export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductionOrderPage />
    </Suspense>
  );
}





// wprking the code not like this 


// "use client";

// import { Suspense, useEffect, useState } from "react";
// import Select from "react-select";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
// import { toast } from "react-toastify";
// import SalesOrderSearch from "@/components/SalesOrderSearch";

// function ProductionOrderPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const id = searchParams.get("id");

//   // ---------- STATES ----------
//   const [token, setToken] = useState(null);
//   const [boms, setBoms] = useState([]);
//   const [resources, setResources] = useState([]);
//   const [machines, setMachines] = useState([]);
//   const [operators, setOperators] = useState([]);
//   const [allItems, setAllItems] = useState([]);
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [bomItems, setBomItems] = useState([]);
//   const [bomResources, setBomResources] = useState([]);
//   const [selectedBomId, setSelectedBomId] = useState("");
//   const [type, setType] = useState("manufacture");
//   const [status, setStatus] = useState("Open");
//   const [priority, setPriority] = useState("");
//   const [warehouse, setWarehouse] = useState("");
//   const [productDesc, setProductDesc] = useState("");
//   const [quantity, setQuantity] = useState(1);
//   const [productionDate, setProductionDate] = useState("");
//   const [operations, setOperations] = useState([]);
//   const [operationOptions, setOperationOptions] = useState([]);
//   const [selectedMachine, setSelectedMachine] = useState(null);
//   const [selectedOperator, setSelectedOperator] = useState(null);
//   const [salesOrder, setSalesOrder] = useState([]);

//   // ---------- LOAD TOKEN ----------
//   useEffect(() => {
//     const tk = localStorage.getItem("token");
//     if (tk) setToken(tk);
//   }, []);

//   // ---------- FETCH MASTER DATA ----------
//   useEffect(() => {
//     if (!token) return;
//     const config = { headers: { Authorization: `Bearer ${token}` } };

//     const fetchAllData = async () => {
//       try {
//         const [
//           operationsRes,
//           bomRes,
//           itemsRes,
//           warehouseRes,
//           resourcesRes,
//           machinesRes,
//           operatorsRes,
//         ] = await Promise.all([
//           axios.get("/api/ppc/operations", config),
//           axios.get("/api/bom", config),
//           axios.get("/api/items", config),
//           axios.get("/api/warehouse", config),
//           axios.get("/api/ppc/resources", config),
//           axios.get("/api/ppc/machines", config),
//           axios.get("/api/ppc/operators", config),
//         ]);

//         setOperationOptions(
//           (operationsRes.data.data || operationsRes.data).map((op) => ({
//             label: op.operationName || op.name,
//             value: op._id || op.value || op.name,
//           }))
//         );
//         setBoms(bomRes.data.data || bomRes.data);
//         setAllItems(itemsRes.data.data || itemsRes.data);
//         setResources(resourcesRes.data.data || resourcesRes.data);
//         setMachines(
//           (machinesRes.data.data || machinesRes.data).map((m) => ({
//             label: m.machineName || m.name,
//             value: m._id,
//           }))
//         );
//         setOperators(
//           (operatorsRes.data.data || operatorsRes.data).map((o) => ({
//             label: o.operatorName || o.name,
//             value: o._id,
//           }))
//         );
//         const whData = warehouseRes.data.data || warehouseRes.data;
//         setWarehouseOptions(
//           whData.map((w) => ({ value: w._id, label: w.warehouseName }))
//         );
//       } catch (err) {
//         console.error("Error loading master data", err);
//         toast.error("Failed to load master data");
//       }
//     };

//     fetchAllData();
//   }, [token]);

//   // ---------- FETCH BOM DETAILS ----------
//   useEffect(() => {
//     if (!selectedBomId || !token) return;
//     const config = { headers: { Authorization: `Bearer ${token}` } };

//     const fetchBomDetails = async () => {
//       try {
//         const res = await axios.get(`/api/bom/${selectedBomId}`, config);
//         const data = res.data;

//         const items = (data.items || []).map((it) => ({
//           id: uuidv4(),
//           type: "Item",
//           item: it._id || it.item,
//           itemCode: it.itemCode,
//           itemName: it.itemName,
//           unitQty: it.unitQty || 1,
//           quantity: it.quantity || 1,
//           requiredQty: it.requiredQty || it.quantity || 1,
//           warehouse: it.warehouse || "",
//           unitPrice: it.unitPrice || 0,
//           total: (it.unitPrice || 0) * (it.quantity || 1),
//         }));

//         const resourcesData = (data.resources || []).map((r) => ({
//           id: uuidv4(),
//           type: "Resource",
//           resource: r._id || r.resource,
//           code: r.code || r.resourceCode || "",
//           name: r.name || r.resourceName || "",
//           quantity: r.quantity || 1,
//           unitPrice: r.unitPrice || 0,
//           total: (r.unitPrice || 0) * (r.quantity || 1),
//         }));

//         setBomItems(items);
//         setBomResources(resourcesData);
//         setProductDesc(data.productDesc || "");
//       } catch (err) {
//         console.error("Error fetching BOM details", err);
//         toast.error("Failed to fetch BOM details");
//       }
//     };

//     fetchBomDetails();
//   }, [selectedBomId, token]);

//   // ---------- HANDLERS ----------
//   const handleQtyChange = (type, index, val) => {
//     const update = (arr, i, changes) =>
//       arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

//     if (type === "item") {
//       setBomItems((prev) =>
//         update(prev, index, { quantity: val, total: prev[index].unitPrice * val })
//       );
//     } else {
//       setBomResources((prev) =>
//         update(prev, index, { quantity: val, total: prev[index].unitPrice * val })
//       );
//     }
//   };

//   const handleWarehouseChange = (type, index, val) => {
//     const update = (arr, i, changes) =>
//       arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

//     if (type === "item") setBomItems((prev) => update(prev, index, { warehouse: val }));
//     else setBomResources((prev) => update(prev, index, { warehouse: val }));
//   };

//   const handleItemSelect = (index, option) => {
//     if (!option) return;
//     const { _id, itemCode, itemName, unitPrice } = option.data;
//     setBomItems((prev) =>
//       prev.map((it, i) =>
//         i === index
//           ? { ...it, item: _id, itemCode, itemName, unitPrice, total: unitPrice * it.quantity }
//           : it
//       )
//     );
//   };

//   const handleResourceSelect = (index, option) => {
//     if (!option) return;
//     const { _id, code, name, unitPrice } = option.data;
//     setBomResources((prev) =>
//       prev.map((r, i) =>
//         i === index
//           ? { ...r, resource: _id, code, name, unitPrice, total: unitPrice * r.quantity }
//           : r
//       )
//     );
//   };

//   const handleAddItem = () =>
//     setBomItems((prev) => [
//       ...prev,
//       { id: uuidv4(), type: "Item", item: null, itemCode: "", itemName: "", unitQty: 1, quantity: 1, requiredQty: 1, warehouse: "", unitPrice: 0, total: 0 },
//     ]);

//   const handleAddResource = () =>
//     setBomResources((prev) => [
//       ...prev,
//       { id: uuidv4(), type: "Resource", resource: null, code: "", name: "", quantity: 1, warehouse: "", unitPrice: 0, total: 0 },
//     ]);

//   const handleDelete = (type, index) => {
//     if (type === "item") setBomItems((prev) => prev.filter((_, i) => i !== index));
//     else setBomResources((prev) => prev.filter((_, i) => i !== index));
//   };

//   const handleSalesOrderSelect = (selectedOrders) => setSalesOrder(selectedOrders);

//   // ---------- SAVE ----------
//   const handleSave = async () => {
//     if (!token) return toast.error("Missing token");

//     const sanitizedItems = bomItems
//       .filter((it) => it.item)
//       .map((it) => ({
//         item: it.item,
//         itemCode: it.itemCode,
//         itemName: it.itemName,
//         unitQty: it.unitQty,
//         quantity: it.quantity,
//         requiredQty: it.requiredQty,
//         warehouse: it.warehouse || null,
//       }));

//     const sanitizedResources = bomResources
//       .filter((r) => r.resource)
//       .map((r) => ({ resource: r.resource, code: r.code, name: r.name, quantity: r.quantity, unitPrice: r.unitPrice, total: r.total }));

//     const payload = {
//       bomId: selectedBomId,
//       type,
//       status,
//       warehouse: warehouse || null,
//       productDesc,
//       priority,
//       quantity,
//       productionDate,
//       operations,
//       machine: selectedMachine?.value || null,
//       operator: selectedOperator?.value || null,
//       salesOrder,
//       items: sanitizedItems,
//       resources: sanitizedResources,
//     };

//     const config = { headers: { Authorization: `Bearer ${token}` } };

//     try {
//       if (id) {
//         await axios.put(`/api/production-orders/${id}`, payload, config);
//         toast.success("Production Order updated successfully");
//       } else {
//         await axios.post("/api/production-orders", payload, config);
//         toast.success("Production Order created successfully");
//       }
//       router.push("/admin/productionorders-list-view");
//     } catch (err) {
//       console.error("Error saving production order:", err);
//       toast.error("Failed to save production order");
//     }
//   };

//   // ---------- OPTIONS ----------
//   const itemOptions = allItems.map((it) => ({ value: it._id, label: `${it.itemCode} - ${it.itemName}`, data: it }));
//   const resourceOptions = resources.map((r) => ({ value: r._id, label: r.name || r.resourceName, data: r }));

//   // ---------- RENDER TABLE ROWS ----------
//   const renderItemRow = (item, index) => (
//     <tr key={item.id}>
//       <td className="border p-2 text-center">{index + 1}</td>
//       <td className="border p-2 w-36">
//         <Select options={itemOptions} value={itemOptions.find((o) => o.data.itemCode === item.itemCode)} onChange={(opt) => handleItemSelect(index, opt)} isSearchable placeholder="Select Item" />
//       </td>
//       <td className="border p-2">{item.itemName}</td>
//       <td className="border p-2 text-center">
//         <input type="number" min="1" value={item.quantity} onChange={(e) => handleQtyChange("item", index, +e.target.value)} className="w-16 border p-1 text-center rounded" />
//       </td>
//       <td className="border p-2 text-center">
//         <select className="border rounded p-1 w-full" value={item.warehouse} onChange={(e) => handleWarehouseChange("item", index, e.target.value)}>
//           <option value="">Select</option>
//           {warehouseOptions.map((w) => (<option key={w.value} value={w.value}>{w.label}</option>))}
//         </select>
//       </td>
//       <td className="border p-2 text-right">{item.unitPrice}</td>
//       <td className="border p-2 text-right">{item.total}</td>
//       <td className="border p-2 text-center">{item.type}</td>
//       <td className="border p-2 text-center">
//         <button onClick={() => handleDelete("item", index)} className="text-red-600 hover:underline">Delete</button>
//       </td>
//     </tr>
//   );

//   const renderResourceRow = (resource, index) => (
//     <tr key={resource.id}>
//       <td className="border p-2 text-center">{index + 1 + bomItems.length}</td>
//       <td className="border p-2 w-36">
//         <Select options={resourceOptions} value={resourceOptions.find((o) => o.data.code === resource.code)} onChange={(opt) => handleResourceSelect(index, opt)} isSearchable placeholder="Select Resource" />
//       </td>
//       <td className="border p-2">{resource.name}</td>
//       <td className="border p-2 text-center">
//         <input type="number" min="1" value={resource.quantity} onChange={(e) => handleQtyChange("resource", index, +e.target.value)} className="w-16 border p-1 text-center rounded" />
//       </td>
//       <td className="border p-2 text-center">{resource.warehouse}</td>
//       <td className="border p-2 text-right">{resource.unitPrice}</td>
//       <td className="border p-2 text-right">{resource.total}</td>
//       <td className="border p-2 text-center">{resource.type}</td>
//       <td className="border p-2 text-center">
//         <button onClick={() => handleDelete("resource", index)} className="text-red-600 hover:underline">Delete</button>
//       </td>
//     </tr>
//   );

//   // ---------- RENDER ----------
//   return (
//     <div className="max-w-6xl mx-auto bg-white p-6 shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">{id ? "Edit" : "New"} Production Order</h2>

//       {/* FORM FIELDS */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <div>
//           <SalesOrderSearch onSelectSalesOrder={handleSalesOrderSelect} selectedSalesOrders={salesOrder} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Select BOM</label>
//           <select className="w-full border p-2 rounded" value={selectedBomId} onChange={(e) => setSelectedBomId(e.target.value)}>
//             <option value="">Select...</option>
//             {boms.map((b) => (
//               <option key={b._id} value={b._id}>{b.productNo?.itemName || b.productDesc}</option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <label className="text-sm font-medium">Product Description</label>
//           <input className="w-full border p-2 rounded" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Priority</label>
//           <input className="w-full border p-2 rounded" value={priority} onChange={(e) => setPriority(e.target.value)} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Planned Quantity</label>
//           <input type="number" min={1} className="w-full border p-2 rounded" value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Production Date</label>
//           <input type="date" className="w-full border p-2 rounded" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Operations</label>
//           <Select options={operationOptions} isMulti value={operationOptions.filter((op) => operations.includes(op.value))} onChange={(opts) => setOperations(opts.map((o) => o.value))} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Machine</label>
//           <Select options={machines} value={selectedMachine} onChange={setSelectedMachine} />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Operator</label>
//           <Select options={operators} value={selectedOperator} onChange={setSelectedOperator} />
//         </div>
//       </div>

//       {/* ITEMS & RESOURCES TABLE */}
//       <div className="overflow-x-auto mb-6">
//         <table className="w-full border-collapse">
//           <thead>
//             <tr>
//               <th className="border p-2">#</th>
//               <th className="border p-2">Select</th>
//               <th className="border p-2">Name</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Warehouse</th>
//               <th className="border p-2">Unit Price</th>
//               <th className="border p-2">Total</th>
//               <th className="border p-2">Type</th>
//               <th className="border p-2">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {bomItems.map((item, index) => renderItemRow(item, index))}
//             {bomResources.map((r, index) => renderResourceRow(r, index))}
//           </tbody>
//         </table>
//       </div>

//       <div className="flex gap-2 mt-2">
//         <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded">+ Add Item</button>
//         <button onClick={handleAddResource} className="px-4 py-2 bg-blue-600 text-white rounded">+ Add Resource</button>
//       </div>

//       <div className="text-right mt-4">
//         <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded">{id ? "Update" : "Create"} Production Order</button>
//       </div>
//     </div>
//   );
// }

// export default function Page() {
//   return (
//     <Suspense fallback={<div>Loading...</div>}>
//       <ProductionOrderPage />
//     </Suspense>
//   );
// }





// before the ppc currect 07/10/2025


// "use client";

// import { Suspense, useEffect, useState } from "react";
// import Select from "react-select";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
// import { toast } from "react-toastify";
// import SalesOrderSearch from "@/components/SalesOrderSearch";


// function ProductionOrderPage() {
//   const searchParams = useSearchParams();
//   const id = searchParams.get("id");
//   const router = useRouter();

//   // State
//   const [token, setToken] = useState(null);
//   const [boms, setBoms] = useState([]);
//   const [allItems, setAllItems] = useState([]);
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [bomItems, setBomItems] = useState([]);
//   const [selectedOption, setSelectedOption] = useState(null);
//     const [resources, setResources] = useState([]);

//   const [selectedBomId, setSelectedBomId] = useState("");
//   const [type, setType] = useState("manufacture");
//   const [status, setStatus] = useState("Open");
//   const [priority, setPriority] = useState("");
//   const [warehouse, setWarehouse] = useState(""); // main warehouse is optional
//   const [productDesc, setProductDesc] = useState("");
//   const [quantity, setQuantity] = useState(1);
//   const [productionDate, setProductionDate] = useState("");
//   const [salesOrder, setSalesOrder] = useState([]);

//   // Options
//   const typeOptions = [
//     { label: "Manufacture", value: "manufacture" },
//     { label: "Subcontract", value: "subcontract" },
//   ];
//   const statusOptions = [
//     { value: "Open", label: "Open" },
//     { value: "In Progress", label: "In Progress" },
//     { value: "Completed", label: "Completed" },
//   ];

//   // Load token
//   useEffect(() => {
//     const tk = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//     setToken(tk);
//   }, []);

//   // Fetch BOMs, Items, Warehouses
//   useEffect(() => {
//     if (!token) return;

//     axios
//       .get("/api/bom", { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => setBoms(Array.isArray(res.data) ? res.data : res.data.data))
//       .catch(() => toast.error("Failed to fetch BOMs"));

//     axios
//       .get("/api/items", { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => setAllItems(Array.isArray(res.data) ? res.data : res.data.data))
//       .catch(() => toast.error("Failed to fetch Items"));

//     axios
//       .get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => {
//         const data = Array.isArray(res.data) ? res.data : res.data.data;
//         setWarehouseOptions(
//           data.map((w) => ({ value: w._id, label: w.warehouseName }))
//         );
//       })
//       .catch(() => toast.error("Failed to fetch Warehouses"));

//     axios
//       .get("/api/ppc/resources", { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => setResources(Array.isArray(res.data) ? res.data : res.data.data))
//       .catch(() => toast.error("Failed to fetch Resources"));
//   }, [token]);

//   // Fetch Production Order if editing
//   useEffect(() => {
//     if (!id || !token) return;

//     axios
//       .get(`/api/production-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => {
//         const o = res.data;
//         setSelectedBomId(o.bomId);
//         setType(o.type);
//         setStatus(o.status);
//         setSalesOrder(o.salesOrder || []);
//         setResources(o.resources || []);// optional
//         setWarehouse(o.warehouse || ""); // optional
//         setProductDesc(o.productDesc);
//         setPriority(o.priority);
//         setQuantity(o.quantity);
//         setBomItems(
//           o.items.map((it) => ({
//             id: uuidv4(),
//             item: it.item,
//             itemCode: it.itemCode,
//             itemName: it.itemName,
//             unitQty: it.unitQty,
//             quantity: it.quantity,
//             requiredQty: it.requiredQty,
//             warehouse: it.warehouse || "", // optional
//           }))
//         );
//       })
//       .catch(() => toast.error("Failed to fetch Production Order"));
//   }, [id, token]);

//   // Fetch BOM details when creating new order
//   useEffect(() => {
//     if (!selectedBomId || !token || id) return; // only for new order

//     axios
//       .get(`/api/bom/${selectedBomId}`, { headers: { Authorization: `Bearer ${token}` } })
//       .then((res) => {
//         const items = res.data.items.map((it) => ({
//           id: uuidv4(),
//           item: it.item,
//           itemCode: it.itemCode,
//           itemName: it.item?.itemName || it.itemName || "—",
//           unitQty: it.quantity,
//           quantity: it.quantity,
//           requiredQty: it.quantity * quantity,
//           warehouse: it.warehouse || "", // optional
//         }));
//         setBomItems(items);
//         setProductDesc(res.data.productDesc || "");
//         setWarehouse(res.data.warehouse || ""); // optional
//       })
//       .catch(() => toast.error("Failed to fetch BOM details"));
//   }, [selectedBomId, quantity, id, token]);

//   const itemOptions = allItems.map((it) => ({
//     value: it._id,
//     label: `${it.itemCode} - ${it.itemName}`,
//     data: it,
//   }));

//   // Handlers
//   const handleQuantityChange = (rowId, val) => {
//     const qty = Number(val);
//     setBomItems((prev) =>
//       prev.map((item) =>
//         item.id === rowId ? { ...item, quantity: qty, requiredQty: qty * quantity } : item
//       )
//     );
//   };

//   const handleSalesOrderSelect = (selectedOrders) => setSalesOrder(selectedOrders);

//   const handleWarehouseChange = (rowId, val) => {
//     setBomItems((prev) =>
//       prev.map((item) => (item.id === rowId ? { ...item, warehouse: val } : item))
//     );
//   };

//   const handleAddItem = () => {
//     if (!selectedOption) return;
//     const it = selectedOption.data;
//     setBomItems((prev) => [
//       ...prev,
//       {
//         id: uuidv4(),
//         item: it._id,
//         itemCode: it.itemCode,
//         itemName: it.itemName,
//         unitQty: 1,
//         quantity: 1,
//         requiredQty: 1 * quantity,
//         warehouse: it.warehouse || "", // optional
//       },
//     ]);
//     setSelectedOption(null);
//   };

//   const handleRemoveItem = (rowId) => setBomItems((prev) => prev.filter((item) => item.id !== rowId));

//  const handleSaveProductionOrder = async () => {
//   try {
//     if (!token) {
//       toast.error("No token found. Please login again.");
//       return;
//     }

//     const payload = {
//       bomId: selectedBomId,
//       type,
//       status,
//       warehouse: warehouse || null, // optional -> null if not selected
//       productDesc,
//       priority,
//       productionDate,
//       quantity,
//       salesOrder,
//       items: bomItems.map((it) => ({
//         item: it.item,
//         itemCode: it.itemCode,
//         itemName: it.itemName,
//         unitQty: it.unitQty,
//         quantity: it.quantity,
//         requiredQty: it.requiredQty,
//         warehouse: it.warehouse || null, // optional -> null if not selected
//       })),
//     };

//     const config = { headers: { Authorization: `Bearer ${token}` } };

//     if (id) {
//       await axios.put(`/api/production-orders/${id}`, payload, config);
//       toast.success("Production Order updated!");
      
//     } else {
//       await axios.post("/api/production-orders", payload, config);
//       toast.success("Production Order created!");
    
//     }

//     router.push("/admin/productionorders-list-view");
//   } catch (err) {
//     console.error("Error saving Production Order:", err);
//     toast.error("Error saving Production Order");
//   }
// };


//   const selectedItem = itemOptions.find((opt) => opt.value === selectedOption?.value);

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">
//         {id ? "Edit Production Order" : "New Production Order"}
//       </h2>

//       {/* Fields */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         {/* BOM */}
//         <div>
//           <label className="block text-sm font-medium">Select BOM</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={selectedBomId}
//             onChange={(e) => setSelectedBomId(e.target.value)}
//           >
//             <option value="">-- choose --</option>
//             {boms.map((b) => (
//               <option key={b._id} value={b._id}>
//                 {(b.productNo?.itemName || "") + " - " + (b.productDesc || "")}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Sales Order */}
        // <SalesOrderSearch
        //   onSelectSalesOrder={handleSalesOrderSelect}
        //   selectedSalesOrders={salesOrder}
        // />

//         {/* Type */}
//         <div>
//           <label className="block text-sm font-medium">Type</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={type}
//             onChange={(e) => setType(e.target.value)}
//           >
//             {typeOptions.map((opt) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium">Status</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={status}
//             onChange={(e) => setStatus(e.target.value)}
//           >
//             {statusOptions.map((opt) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Warehouse (optional) */}
//         <div>
//           <label className="block text-sm font-medium">Warehouse</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={warehouse}
//             onChange={(e) => setWarehouse(e.target.value)}
//           >
//             <option value="">-- optional --</option>
//             {warehouseOptions.map((opt) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Product Desc */}
//         <div>
//           <label className="block text-sm font-medium">Product Description</label>
//           <input
//             className="w-full border p-2 rounded"
//             value={productDesc}
//             onChange={(e) => setProductDesc(e.target.value)}
//           />
//         </div>

//         {/* Priority */}
//         <div>
//           <label className="block text-sm font-medium">Priority</label>
//           <input
//             className="w-full border p-2 rounded"
//             value={priority}
//             onChange={(e) => setPriority(e.target.value)}
//           />
//         </div>

//         {/* Quantity */}
//         <div>
//           <label className="block text-sm font-medium">Planned Quantity</label>
//           <input
//             type="number"
//             className="w-full border p-2 rounded"
//             value={quantity}
//             min={1}
//             onChange={(e) => setQuantity(Number(e.target.value))}
//           />
//         </div>

//         {/* Date */}
//         <div>
//           <label className="block text-sm font-medium">Production Date</label>
//           <input
//             type="date"
//             className="w-full border p-2 rounded"
//             value={productionDate}
//             onChange={(e) => setProductionDate(e.target.value)}
//           />
//         </div>
//       </div>

      // {/* Add Item */}
      // <div className="mb-6">
      //   <label className="block text-sm font-medium mb-1">Add Item</label>
      //   <div className="flex gap-2">
      //     <div className="grow">
      //       <Select
      //         options={itemOptions}
      //         value={selectedItem}
      //         onChange={setSelectedOption}
      //         isClearable
      //         placeholder="Search and select item..."
      //       />
      //     </div>
      //     <button
      //       className="bg-blue-600 text-white px-4 py-2 rounded"
      //       onClick={handleAddItem}
      //     >
      //       Add
      //     </button>
      //   </div>


//       </div>

//         <div className="mb-6">
//         <label className="block text-sm font-medium mb-1">Add Resources</label>
//         <div className="flex gap-2">
//           <div className="grow">
//             <Select
//               options={itemOptions}
//               value={selectedItem}
//               onChange={setSelectedOption}
//               isClearable
//               placeholder="Search and select item..."
//             />
//           </div>
//           <button
//             className="bg-blue-600 text-white px-4 py-2 rounded"
//             onClick={handleAddItem}
//           >
//             Add
//           </button>
//         </div>

        
//       </div>

//       {/* Items Table */}
//       <table className="w-full table-auto border-collapse border text-sm mb-6">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Item Code</th>
//             <th className="border p-2">Item Name</th>
//             <th className="border p-2">Unit Qty</th>
//             <th className="border p-2">Req. Qty</th>
//             <th className="border p-2">Warehouse</th>
//             <th className="border p-2">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bomItems.map((item) => (
//             <tr key={item.id}>
//               <td className="border p-2">{item.itemCode}</td>
//               <td className="border p-2">{item.itemName}</td>
//               <td className="border p-2">
//                 <input
//                   type="number"
//                   className="border p-1 w-full"
//                   value={item.quantity}
//                   onChange={(e) => handleQuantityChange(item.id, e.target.value)}
//                 />
//               </td>
//               <td className="border p-2">{item.requiredQty}</td>
//               <td className="border p-2">
//                 <select
//                   className="w-full border p-1"
//                   value={item.warehouse || ""}
//                   onChange={(e) => handleWarehouseChange(item.id, e.target.value)}
//                 >
//                   <option value="">-- optional --</option>
//                   {warehouseOptions.map((opt) => (
//                     <option key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </option>
//                   ))}
//                 </select>
//               </td>
//               <td className="border p-2 text-center">
//                 <button
//                   onClick={() => handleRemoveItem(item.id)}
//                   className="text-red-500 hover:text-red-700"
//                 >
//                   Remove
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <div className="flex justify-end">
//         <button
//           className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
//           onClick={handleSaveProductionOrder}
//         >
//           {id ? "Update Order" : "Create Order"}
//         </button>
//       </div>
//     </div>
//   );
// }

// export default function Page() {
//   return (
//     <Suspense fallback={<div>Loading...</div>}>
//       <ProductionOrderPage />
//     </Suspense>
//   );
// }




