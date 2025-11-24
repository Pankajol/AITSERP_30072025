"use client";

// Production Order create / edit page
// - Full edit support: loads existing order (when ?id=...), maps to selects
// - Preserves your BOM/item/resource/operation flow UI
// - Sanitizes payload for POST (create) and PUT (update)
// - Uses token from localStorage for API calls

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import Select from "react-select";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import { FiTrash2 } from "react-icons/fi";
import SalesOrderSearch from "@/components/SalesOrderSearch";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductionOrderPage />
    </Suspense>
  );
}

function ProductionOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // if exists -> edit mode

  const [token, setToken] = useState(null);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Master data
  const [boms, setBoms] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [resources, setResources] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [operationOptions, setOperationOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // BOM derived
  const [bomItems, setBomItems] = useState([]);
  const [bomResources, setBomResources] = useState([]);

  // Form fields
  const [selectedBomId, setSelectedBomId] = useState("");
  const [type, setType] = useState("manufacture");
  const [status, setStatus] = useState("Open");
  const [priority, setPriority] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [productionDate, setProductionDate] = useState("");
  const [salesOrder, setSalesOrder] = useState([]);

  // Operation flow
  const [operationFlow, setOperationFlow] = useState([]);

  // Internal raw order (used when editing to map after master loads)
  const [rawOrder, setRawOrder] = useState(null);

  const tokenRef = useRef(null);

  // Load token once
  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) {
      setToken(tk);
      tokenRef.current = tk;
    }
  }, []);

  // Fetch master data (boms, items, warehouses, resources, machines, operations, leaves, operators)
  useEffect(() => {
    if (!token) return;
    setLoadingMaster(true);
    const config = { headers: { Authorization: `Bearer ${token}` } };

    (async () => {
      try {
        const [
          operationsRes,
          bomRes,
          itemsRes,
          warehouseRes,
          resourcesRes,
          machinesRes,
          leaveRes,
          operatorsRes,
        ] = await Promise.all([
          axios.get("/api/ppc/operations", config),
          axios.get("/api/bom", config),
          axios.get("/api/items", config),
          axios.get("/api/warehouse", config),
          axios.get("/api/ppc/resources", config),
          axios.get("/api/ppc/machines", config),
          axios.get("/api/hr/leave", config),
          axios.get("/api/ppc/operators", config),
        ]);

        const operations = operationsRes.data.data || operationsRes.data || [];
        const bomsData = bomRes.data.data || bomRes.data || [];
        const itemsData = itemsRes.data.data || itemsRes.data || [];
        const warehousesData = warehouseRes.data.data || warehouseRes.data || [];
        const resourcesData = resourcesRes.data.data || resourcesRes.data || [];
        const machinesData = machinesRes.data.data || machinesRes.data || [];
        const leavesData = leaveRes.data.data || leaveRes.data || [];
        const operatorsData = operatorsRes.data.data || operatorsRes.data || [];

        // filter operators not on leave
        const today = new Date();
        const availableOperators = operatorsData.filter((op) => {
          const isOnLeave = (leavesData || []).some((l) => {
            const from = l.fromDate ? new Date(l.fromDate) : null;
            const to = l.toDate ? new Date(l.toDate) : null;
            return (
              (op._id === l.employeeId || op.id === l.employeeId) &&
              from &&
              to &&
              today >= from &&
              today <= to
            );
          });
          return !isOnLeave;
        });

        setOperationOptions(
          operations.map((op) => ({ label: op.operationName || op.name, value: op._id }))
        );

        setBoms(bomsData);
        setAllItems(itemsData);
        setResources(resourcesData);

        setMachines(
          machinesData.map((m) => ({ label: m.machineName || m.name, value: m._id }))
        );

        setOperators(
          availableOperators.map((o) => ({ label: o.operatorName || o.name, value: o._id }))
        );

        setWarehouseOptions(
          warehousesData.map((w) => ({ value: w._id, label: w.warehouseName }))
        );

        setLeaves(leavesData || []);
      } catch (err) {
        console.error("Error loading master data", err);
        toast.error("Failed to load master data");
      } finally {
        setLoadingMaster(false);
      }
    })();
  }, [token]);

  // When a BOM is selected, fetch BOM details and populate bomItems and bomResources
  // useEffect(() => {
  //   if (!selectedBomId || !token) return;
  //   const config = { headers: { Authorization: `Bearer ${token}` } };

  //   (async () => {
  //     try {
  //       const res = await axios.get(`/api/bom/${selectedBomId}`, config);
  //       const data = res.data || res.data.data || {};

  //       const items = (data.items || []).map((it) => ({
  //         id: uuidv4(),
  //         type: "Item",
  //         item: it._id || it.item,
  //         itemCode: it.itemCode,
  //         itemName: it.itemName,
  //         unitQty: it.unitQty || 1,
  //         quantity: it.quantity || 1,
  //         requiredQty: it.requiredQty || it.quantity || 1,
  //         warehouse: it.warehouse || "",
  //         unitPrice: it.unitPrice || 0,
  //         total: (it.unitPrice || 0) * (it.quantity || 1),
  //       }));

  //       const resourcesData = (data.resources || []).map((r) => ({
  //         id: uuidv4(),
  //         type: "Resource",
  //         resource: r._id || r.resource,
  //         code: r.code || r.resourceCode || "",
  //         name: r.name || r.resourceName || "",
  //         quantity: r.quantity || 1,
  //         unitPrice: r.unitPrice || 0,
  //         total: (r.unitPrice || 0) * (r.quantity || 1),
  //       }));

  //       setBomItems(items);
  //       setBomResources(resourcesData);
  //       setProductDesc(data.productDesc || "");
  //     } catch (err) {
  //       console.error("Error fetching BOM details", err);
  //       toast.error("Failed to fetch BOM details");
  //     }
  //   })();
  // }, [selectedBomId, token]);

  
 useEffect(() => {
  const bomId = selectedBomId?._id || selectedBomId;

  if (!bomId || !token || id) return; // only for new order creation

  axios
    .get(`/api/bom/${bomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      const data = res.data?.data || res.data || {};

      if (!data.items && !data.resources) {
        toast.error("Invalid BOM structure");
        return;
      }

      // ✅ Map BOM Items
      const items = (data.items || []).map((it) => {
        const unitPrice = Number(it.unitPrice) || Number(it.item?.unitPrice) || 0;
        const qty = Number(it.quantity) || 1;
        return {
          id: uuidv4(),
          type: "Item",
          item: it.item?._id || it._id || it.item,
          itemCode: it.itemCode || it.item?.itemCode || "",
          itemName: it.itemName || it.item?.itemName || "",
          unitQty: qty,
          quantity: qty,
          requiredQty: qty * (Number(quantity) || 1),
          warehouse: it.warehouse || "",
          unitPrice,
          total: unitPrice * qty,
        };
      });

      // ✅ Map BOM Resources
      const resources = (data.resources || []).map((r) => {
        const unitPrice = Number(r.unitPrice) || Number(r.resource?.unitPrice) || 0;
        const qty = Number(r.quantity) || 1;
        return {
          id: uuidv4(),
          type: "Resource",
          resource: r.resource?._id || r._id || r.resource,
          code: r.code || r.resource?.code || "",
          name: r.name || r.resource?.name || "",
          quantity: qty,
          unitPrice,
          total: unitPrice * qty,
          warehouse: r.warehouse || "",
        };
      });

      setBomItems(items);
      setBomResources(resources);
      setProductDesc(data.productDesc || "");
      setWarehouse(data.warehouse || "");
    })
    .catch((err) => {
      console.error("❌ BOM fetch error:", err.response?.data || err.message);
      toast.error("Failed to fetch BOM details");
    });
}, [selectedBomId, quantity, id, token]);


  // Fetch existing production order when editing (raw)
  useEffect(() => {
    if (!id || !token) return;
    setLoadingOrder(true);
    const config = { headers: { Authorization: `Bearer ${token}` } };

    (async () => {
      try {
        const res = await axios.get(`/api/production-orders/${id}`, config);
        const data = res.data?.data || res.data || {};
        setRawOrder(data);
        // set simple fields immediately
        setSelectedBomId(data.bomId || data.bom || "");
        setType(data.type || "manufacture");
        setStatus(data.status || "Open");
        setPriority(data.priority || "");
        setWarehouse(data.warehouse || "");
        setProductDesc(data.productDesc || "");
        setQuantity(data.quantity || 1);
        setProductionDate(data.productionDate ? data.productionDate.split("T")[0] : "");
        setSalesOrder(data.salesOrder || []);
        // Don't set bomItems/bomResources/operationFlow yet — wait until master data loaded to map IDs to option objects.
      } catch (err) {
        console.error("Error loading order", err);
        toast.error("Failed to load order for editing");
      } finally {
        setLoadingOrder(false);
      }
    })();
  }, [id, token]);

  // After master data and rawOrder are loaded, map items/resources/operationFlow to local state
  useEffect(() => {
    if (!rawOrder) return;
    // only map once when master data present
    // Map items
    const mapItems = (rawItems = []) =>
      (rawItems || []).map((it) => ({
        id: uuidv4(),
        type: "Item",
        item: it.item || it.itemId || null,
        itemCode: it.itemCode || it.itemCode,
        itemName: it.itemName || it.itemName,
        unitQty: it.unitQty || it.unitQty || 1,
        quantity: it.quantity ?? it.qty ?? 1,
        requiredQty: it.requiredQty ?? it.quantity ?? 1,
        warehouse: it.warehouse || "",
        unitPrice: it.unitPrice || 0,
        total: (it.unitPrice || 0) * (it.quantity ?? it.qty ?? 1),
      }));

    const mapResources = (rawResources = []) =>
      (rawResources || []).map((r) => ({
        id: uuidv4(),
        type: "Resource",
        resource: r.resource || r.resourceId || null,
        code: r.code,
        name: r.name,
        quantity: r.quantity || 1,
        unitPrice: r.unitPrice || 0,
        total: (r.unitPrice || 0) * (r.quantity || 1),
        warehouse: r.warehouse || "",
      }));

    setBomItems(mapItems(rawOrder.items || []));
    setBomResources(mapResources(rawOrder.resources || []));

    // Map operationFlow to objects usable by Select components
    const mappedFlows = (rawOrder.operationFlow || []).map((f) => {
      const operationOption = operationOptions.find((o) => o.value === f.operation) || null;
      const machineOption = machines.find((m) => m.value === f.machine) || null;
      const operatorOption = operators.find((o) => o.value === f.operator) || null;

      return {
        id: uuidv4(),
        operation: operationOption,
        machine: machineOption,
        operator: operatorOption,
        expectedStartDate: f.expectedStartDate ? f.expectedStartDate.split("T")[0] : "",
        expectedEndDate: f.expectedEndDate ? f.expectedEndDate.split("T")[0] : "",
      };
    });

    setOperationFlow(mappedFlows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawOrder, operationOptions, machines, operators]);

  /* ---------- helpers / handlers ---------- */

  const itemOptions = useMemo(
    () =>
      allItems.map((it) => ({
        value: it._id,
        label: `${it.itemCode || ""} - ${it.itemName || it.name || ""}`.trim(),
        data: it,
      })),
    [allItems]
  );

  const resourceOptions = useMemo(
    () =>
      resources.map((r) => ({
        value: r._id,
        label: r.name || r.resourceName || r.code || r._id,
        data: r,
      })),
    [resources]
  );

  const handleQtyChange = (typeArg, index, val) => {
    const update = (arr, i, changes) => arr.map((o, idx) => (idx === i ? { ...o, ...changes } : o));

    if (typeArg === "item") {
      setBomItems((prev) =>
        update(prev, index, {
          quantity: val,
          total: (prev[index]?.unitPrice || 0) * val,
        })
      );
    } else {
      setBomResources((prev) =>
        update(prev, index, {
          quantity: val,
          total: (prev[index]?.unitPrice || 0) * val,
        })
      );
    }
  };

  const handleWarehouseChange = (typeArg, index, val) => {
    const update = (arr, i, changes) => arr.map((o, idx) => (idx === i ? { ...o, ...changes } : o));
    if (typeArg === "item") setBomItems((prev) => update(prev, index, { warehouse: val }));
    else setBomResources((prev) => update(prev, index, { warehouse: val }));
  };

  const handleItemSelect = (index, option) => {
    if (!option) return;
    const d = option.data || {};
    setBomItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              item: d._id,
              itemCode: d.itemCode || it.itemCode,
              itemName: d.itemName || d.itemName || d.name || it.itemName,
              unitPrice: d.unitPrice || it.unitPrice || 0,
              total: (d.unitPrice || it.unitPrice || 0) * (it.quantity || 1),
            }
          : it
      )
    );
  };

  const handleResourceSelect = (index, option) => {
    if (!option) return;
    const d = option.data || {};
    setBomResources((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              resource: d._id,
              code: d.code || r.code,
              name: d.name || d.resourceName || r.name,
              unitPrice: d.unitPrice || r.unitPrice || 0,
              total: (d.unitPrice || r.unitPrice || 0) * (r.quantity || 1),
            }
          : r
      )
    );
  };

  const handleAddItem = () =>
    setBomItems((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type: "Item",
        item: null,
        itemCode: "",
        itemName: "",
        unitQty: 1,
        quantity: 1,
        requiredQty: 1,
        warehouse: "",
        unitPrice: 0,
        total: 0,
      },
    ]);

  const handleAddResource = () =>
    setBomResources((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type: "Resource",
        resource: null,
        code: "",
        name: "",
        quantity: 1,
        warehouse: "",
        unitPrice: 0,
        total: 0,
      },
    ]);

  const handleDelete = (typeArg, index) => {
    if (typeArg === "item") setBomItems((prev) => prev.filter((_, i) => i !== index));
    else setBomResources((prev) => prev.filter((_, i) => i !== index));
  };

  // Operation Flow handlers
  const handleAddOperationFlow = () => {
    setOperationFlow((prev) => [
      ...prev,
      { id: uuidv4(), operation: null, machine: null, operator: null, expectedStartDate: "", expectedEndDate: "" },
    ]);
  };

  const handleDeleteFlow = (index) => {
    setOperationFlow((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOperationChange = (index, field, value) => {
    setOperationFlow((prev) => prev.map((flow, i) => (i === index ? { ...flow, [field]: value } : flow)));
  };

  const handleSalesOrderSelect = (selectedOrders) => {
    setSalesOrder(selectedOrders || []);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!token) return toast.error("Missing token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // sanitize items & resources
    const sanitizedItems = bomItems
      .filter((it) => it.item)
      .map((it) => ({
        item: it.item,
        itemCode: it.itemCode,
        itemName: it.itemName,
        unitQty: it.unitQty,
        quantity: Number(it.quantity) || 0,
        requiredQty: Number(it.requiredQty) || Number(it.quantity) || 0,
        warehouse: it.warehouse || null,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0),
      }));

    const sanitizedResources = bomResources
      .filter((r) => r.resource)
      .map((r) => ({
        resource: r.resource,
        code: r.code,
        name: r.name,
        quantity: Number(r.quantity) || 0,
        unitPrice: Number(r.unitPrice) || 0,
        total: Number(r.total) || (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0),
        warehouse: r.warehouse || null,
      }));

    const payload = {
      bomId: selectedBomId || null,
      type,
      status,
      warehouse: warehouse || null,
      productDesc,
      priority,
      quantity: Number(quantity) || 0,
      productionDate: productionDate || null,
      salesOrder: salesOrder || [],
      items: sanitizedItems,
      resources: sanitizedResources,
      operationFlow: operationFlow.map((f) => ({
        operation: f.operation?.value || null,
        machine: f.machine?.value || null,
        operator: f.operator?.value || null,
        expectedStartDate: f.expectedStartDate || null,
        expectedEndDate: f.expectedEndDate || null,
      })),
    };

    try {
      if (id) {
        // update
        await axios.put(`/api/production-orders/${id}`, payload, config);
        toast.success("Production Order updated successfully");
      } else {
        // create
        await axios.post("/api/production-orders", payload, config);
        toast.success("Production Order created successfully");
      }
      router.push("/admin/productionorders-list-view");
    } catch (err) {
      console.error("Error saving production order:", err);
      const msg = err?.response?.data?.message || err?.response?.data || err.message || "Failed to save production order";
      toast.error(msg);
    }
  };

  /* ---------- render UI ---------- */

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 shadow rounded">
      <h2 className="text-2xl font-semibold mb-4">{id ? "Edit" : "New"} Production Order</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          {/* <SalesOrderSearch onSelectSalesOrder={handleSalesOrderSelect} selectedSalesOrders={salesOrder} /> */}

         <SalesOrderSearch
  onSelectSalesOrder={handleSalesOrderSelect}
  selectedSalesOrders={salesOrder}
/>

        </div>

        {/* <div>
          <label className="text-sm font-medium">Select BOM</label>
          <select className="w-full border p-2 rounded" value={selectedBomId} onChange={(e) => setSelectedBomId(e.target.value)}>
            <option value="">Select...</option>
            {boms.map((b) => (
              <option key={b._id} value={b._id}>
                {b.productNo?.itemName || b.productDesc || b._id}
              </option>
            ))}
          </select>
        </div> */}


        <div>
  <label className="text-sm font-medium">Select BOM</label>
  <select
    className="w-full border p-2 rounded"
    value={selectedBomId?._id || selectedBomId || ""}
    onChange={(e) => setSelectedBomId(e.target.value)}
  >
    <option value="">Select...</option>
    {boms.map((b) => (
      <option key={b._id} value={b._id}>
        {b.productNo?.itemName || b.productDesc || b._id}
      </option>
    ))}
  </select>
</div>


        <div>
          <label className="text-sm font-medium">Product Description</label>
          <input className="w-full border p-2 rounded" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Priority</label>
          <input className="w-full border p-2 rounded" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Planned Quantity</label>
          <input type="number" min={1} className="w-full border p-2 rounded" value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium">Production Date</label>
          <input type="date" className="w-full border p-2 rounded" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
        </div>
      </div>

      {/* BOM + Resources */}
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
                    value={itemOptions.find((o) => o.value === item.item) || null}
                    onChange={(opt) => handleItemSelect(index, opt)}
                    isSearchable
                    placeholder="Select Item"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </td>
                <td className="border p-2">{item.itemName}</td>
                <td className="border p-2 text-center">
                  <input type="number" min="1" value={item.quantity} onChange={(e) => handleQtyChange("item", index, +e.target.value)} className="w-16 border p-1 text-center rounded" />
                </td>
                <td className="border p-2 text-center">
                  <select className="border rounded p-1 w-full" value={item.warehouse || ""} onChange={(e) => handleWarehouseChange("item", index, e.target.value)}>
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
                  <button onClick={() => handleDelete("item", index)} className="text-red-600 hover:underline">
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
                    value={resourceOptions.find((o) => o.value === resource.resource) || null}
                    onChange={(opt) => handleResourceSelect(index, opt)}
                    isSearchable
                    placeholder="Select Resource"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </td>
                <td className="border p-2">{resource.name}</td>
                <td className="border p-2 text-center">
                  <input type="number" min="1" value={resource.quantity} onChange={(e) => handleQtyChange("resource", index, +e.target.value)} className="w-16 border p-1 text-center rounded" />
                </td>
                <td className="border p-2 text-center">
                  <select className="border rounded p-1 w-full" value={resource.warehouse || ""} onChange={(e) => handleWarehouseChange("resource", index, e.target.value)}>
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
                  <button onClick={() => handleDelete("resource", index)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Operation Flow */}
      <div className="overflow-x-auto mb-6 z-20">
        <h3 className="text-lg font-semibold mb-2">Operation Flow</h3>
        {operationFlow.map((flow, idx) => (
          <div key={flow.id} className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-2 items-end">
            <div>
              <label className="text-sm">Operation</label>
              <Select options={operationOptions} value={flow.operation} onChange={(opt) => handleOperationChange(idx, "operation", opt)} menuPortalTarget={typeof document !== "undefined" ? document.body : null} styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }} />
            </div>

            <div>
              <label className="text-sm">Machine</label>
              <Select options={machines} value={flow.machine} onChange={(opt) => handleOperationChange(idx, "machine", opt)} menuPortalTarget={typeof document !== "undefined" ? document.body : null} styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }} />
            </div>

            <div>
              <label className="text-sm">Operator</label>
              <Select options={operators} value={flow.operator} onChange={(opt) => handleOperationChange(idx, "operator", opt)} menuPortalTarget={typeof document !== "undefined" ? document.body : null} styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }} />
            </div>

            <div>
              <label className="text-sm">Expected Start Date</label>
              <input type="date" className="w-full border p-2 rounded" value={flow.expectedStartDate || ""} onChange={(e) => handleOperationChange(idx, "expectedStartDate", e.target.value)} />
            </div>

            <div>
              <label className="text-sm">Expected End Date</label>
              <input type="date" className="w-full border p-2 rounded" value={flow.expectedEndDate || ""} onChange={(e) => handleOperationChange(idx, "expectedEndDate", e.target.value)} />
            </div>

            <div>
              <button onClick={() => handleDeleteFlow(idx)} className="mt-2 text-red-600 hover:text-red-800">
                <FiTrash2 size={30} />
              </button>
            </div>
          </div>
        ))}

        <button onClick={handleAddOperationFlow} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + Add Operation Flow
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          + Add Item
        </button>
        <button onClick={handleAddResource} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          + Add Resource
        </button>
        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {id ? "Update Production Order" : "Save Production Order"}
        </button>
      </div>
    </div>
  );
}




// "use client";

// // ✅ Disable Next.js prerendering / static caching completely

// import { Suspense, useEffect, useState } from "react";
// import Select from "react-select";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
// import { toast } from "react-toastify";
// import { FiTrash2 } from "react-icons/fi";
// import SalesOrderSearch from "@/components/SalesOrderSearch";

// function ProductionOrderPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const id = searchParams.get("id");

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
//   const [salesOrder, setSalesOrder] = useState([]);

//   const [expectedStartDate, setPlannedStartDate] = useState("");
//   const [expectedEndDate, setPlannedEndDate] = useState("");

//   // Operation Flow
//   const [operationFlow, setOperationFlow] = useState([]);
//   const [operationOptions, setOperationOptions] = useState([]);

//   useEffect(() => {
//     const tk = localStorage.getItem("token");
//     if (tk) setToken(tk);
//   }, []);


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
//           leaveRes,
//           operatorsRes,
//         ] = await Promise.all([
//           axios.get("/api/ppc/operations", config),
//           axios.get("/api/bom", config),
//           axios.get("/api/items", config),
//           axios.get("/api/warehouse", config),
//           axios.get("/api/ppc/resources", config),
//           axios.get("/api/ppc/machines", config),
//           axios.get("/api/hr/leave", config),
//           axios.get("/api/ppc/operators", config),
//         ]);

//         // ✅ Extract all data safely
//         const operations = operationsRes.data.data || operationsRes.data || [];
//         const boms = bomRes.data.data || bomRes.data || [];
//         const items = itemsRes.data.data || itemsRes.data || [];
//         const warehouses = warehouseRes.data.data || warehouseRes.data || [];
//         const resources = resourcesRes.data.data || resourcesRes.data || [];
//         const machines = machinesRes.data.data || machinesRes.data || [];
//         const leaves = leaveRes.data.data || leaveRes.data || [];
//         const operators = operatorsRes.data.data || operatorsRes.data || [];




//         // ✅ Filter out operators currently on leave (today’s date)
//         const today = new Date();
//         const availableOperators = operators.filter((op) => {
//           const isOnLeave = leaves.some((leave) => {
//             const from = new Date(leave.fromDate);
//             const to = new Date(leave.toDate);
//             return (
//               (op._id === leave.employeeId || op.id === leave.employeeId) &&
//               today >= from &&
//               today <= to
//             );
//           });
//           return !isOnLeave;
//         });

//         // ✅ Set formatted dropdown options
//         setOperationOptions(
//           operations.map((op) => ({
//             label: op.operationName || op.name,
//             value: op._id || op.value || op.name,
//           }))
//         );

//         setBoms(boms);
//         setAllItems(items);
//         setResources(resources);

    

//         setMachines(
//           machines.map((m) => ({
//             label: m.machineName || m.name,
//             value: m._id,
//           }))
//         );

//         setOperators(
//           availableOperators.map((o) => ({
//             label: o.operatorName || o.name,
//             value: o._id,
//           }))
//         );

//         setWarehouseOptions(
//           warehouses.map((w) => ({
//             value: w._id,
//             label: w.warehouseName,
//           }))
//         );
//       } catch (err) {
//         console.error("Error loading master data", err);
//         toast.error("Failed to load master data");
//       }
//     };

//     fetchAllData();
//   }, [token]);

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

//   const handleQtyChange = (type, index, val) => {
//     const update = (arr, i, changes) =>
//       arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

//     if (type === "item") {
//       setBomItems((prev) =>
//         update(prev, index, {
//           quantity: val,
//           total: prev[index].unitPrice * val,
//         })
//       );
//     } else {
//       setBomResources((prev) =>
//         update(prev, index, {
//           quantity: val,
//           total: prev[index].unitPrice * val,
//         })
//       );
//     }
//   };

//   const handleWarehouseChange = (type, index, val) => {
//     const update = (arr, i, changes) =>
//       arr.map((obj, idx) => (idx === i ? { ...obj, ...changes } : obj));

//     if (type === "item")
//       setBomItems((prev) => update(prev, index, { warehouse: val }));
//     else setBomResources((prev) => update(prev, index, { warehouse: val }));
//   };

//   const handleItemSelect = (index, option) => {
//     if (!option) return;
//     const { _id, itemCode, itemName, unitPrice } = option.data;
//     setBomItems((prev) =>
//       prev.map((it, i) =>
//         i === index
//           ? {
//               ...it,
//               item: _id,
//               itemCode,
//               itemName,
//               unitPrice,
//               total: unitPrice * it.quantity,
//             }
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
//           ? {
//               ...r,
//               resource: _id,
//               code,
//               name,
//               unitPrice,
//               total: unitPrice * r.quantity,
//             }
//           : r
//       )
//     );
//   };

//   const handleAddItem = () =>
//     setBomItems((prev) => [
//       ...prev,
//       {
//         id: uuidv4(),
//         type: "Item",
//         item: null,
//         itemCode: "",
//         itemName: "",
//         unitQty: 1,
//         quantity: 1,
//         requiredQty: 1,
//         warehouse: "",
//         unitPrice: 0,
//         total: 0,
//       },
//     ]);

//   const handleAddResource = () =>
//     setBomResources((prev) => [
//       ...prev,
//       {
//         id: uuidv4(),
//         type: "Resource",
//         resource: null,
//         code: "",
//         name: "",
//         quantity: 1,
//         warehouse: "",
//         unitPrice: 0,
//         total: 0,
//       },
//     ]);

//   const handleDelete = (type, index) => {
//     if (type === "item")
//       setBomItems((prev) => prev.filter((_, i) => i !== index));
//     else setBomResources((prev) => prev.filter((_, i) => i !== index));
//   };

//   // Operation Flow handlers
//   const handleAddOperationFlow = () => {
//     setOperationFlow((prev) => [
//       ...prev,
//       { id: uuidv4(), operation: null, machine: null, operator: null },
//     ]);
//   };

//   const handleDeleteFlow = (index) => {
//     setOperationFlow((prev) => prev.filter((_, i) => i !== index));
//   };

//   const handleOperationChange = (index, field, value) => {
//     setOperationFlow((prev) =>
//       prev.map((flow, i) => (i === index ? { ...flow, [field]: value } : flow))
//     );
//   };

//   const handleSalesOrderSelect = (selectedOrders) =>
//     setSalesOrder(selectedOrders);

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
//       .map((r) => ({
//         resource: r.resource,
//         code: r.code,
//         name: r.name,
//         quantity: r.quantity,
//         unitPrice: r.unitPrice,
//         total: r.total,
//       }));

//     const payload = {
//       bomId: selectedBomId,
//       type,
//       status,
//       warehouse: warehouse || null,
//       productDesc,
//       priority,
//       quantity,
//       productionDate,
//       salesOrder,
//       items: sanitizedItems,
//       resources: sanitizedResources,
//       operationFlow: operationFlow.map((f) => ({
//         operation: f.operation?.value || null,
//         machine: f.machine?.value || null,
//         operator: f.operator?.value || null,
//         expectedStartDate: f.expectedStartDate || null,
//         expectedEndDate: f.expectedEndDate || null,
//       })),
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

//   const itemOptions = allItems.map((it) => ({
//     value: it._id,
//     label: `${it.itemCode} - ${it.itemName}`,
//     data: it,
//   }));

//   const resourceOptions = resources.map((r) => ({
//     value: r._id,
//     label: r.name || r.resourceName,
//     data: r,
//   }));

//   return (
//     <div className="max-w-6xl mx-auto bg-white p-6 shadow rounded">
//       <h2 className="text-2xl font-semibold mb-4">
//         {id ? "Edit" : "New"} Production Order
//       </h2>

//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
//         <div>
//           <SalesOrderSearch
//             onSelectSalesOrder={handleSalesOrderSelect}
//             selectedSalesOrders={salesOrder}
//           />
//         </div>
//         <div>
//           <label className="text-sm font-medium">Select BOM</label>
//           <select
//             className="w-full border p-2 rounded"
//             value={selectedBomId}
//             onChange={(e) => setSelectedBomId(e.target.value)}
//           >
//             <option value="">Select...</option>
//             {boms.map((b) => (
//               <option key={b._id} value={b._id}>
//                 {b.productNo?.itemName || b.productDesc}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <label className="text-sm font-medium">Product Description</label>
//           <input
//             className="w-full border p-2 rounded"
//             value={productDesc}
//             onChange={(e) => setProductDesc(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Priority</label>
//           <input
//             className="w-full border p-2 rounded"
//             value={priority}
//             onChange={(e) => setPriority(e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Planned Quantity</label>
//           <input
//             type="number"
//             min={1}
//             className="w-full border p-2 rounded"
//             value={quantity}
//             onChange={(e) => setQuantity(+e.target.value)}
//           />
//         </div>

//         <div>
//           <label className="text-sm font-medium">Production Date</label>
//           <input
//             type="date"
//             className="w-full border p-2 rounded"
//             value={productionDate}
//             onChange={(e) => setProductionDate(e.target.value)}
//           />
//         </div>
//       </div>

//       {/* ---------- BOM + RESOURCES TABLE WRAPPER FOR MOBILE SCROLL ---------- */}
//       <div className="overflow-x-auto mb-6">
//         <table className="w-full border-collapse min-w-[800px]">
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
//             {bomItems.map((item, index) => (
//               <tr key={item.id}>
//                 <td className="border p-2 text-center">{index + 1}</td>
//                 <td className="border p-2 w-36">
//                   <Select
//                     options={itemOptions}
//                     value={itemOptions.find(
//                       (o) => o.data.itemCode === item.itemCode
//                     )}
//                     onChange={(opt) => handleItemSelect(index, opt)}
//                     isSearchable
//                     placeholder="Select Item"
//                   />
//                 </td>
//                 <td className="border p-2">{item.itemName}</td>
//                 <td className="border p-2 text-center">
//                   <input
//                     type="number"
//                     min="1"
//                     value={item.quantity}
//                     onChange={(e) =>
//                       handleQtyChange("item", index, +e.target.value)
//                     }
//                     className="w-16 border p-1 text-center rounded"
//                   />
//                 </td>
//                 <td className="border p-2 text-center">
//                   <select
//                     className="border rounded p-1 w-full"
//                     value={item.warehouse}
//                     onChange={(e) =>
//                       handleWarehouseChange("item", index, e.target.value)
//                     }
//                   >
//                     <option value="">Select</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w.value} value={w.value}>
//                         {w.label}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//                 <td className="border p-2 text-right">{item.unitPrice}</td>
//                 <td className="border p-2 text-right">{item.total}</td>
//                 <td className="border p-2 text-center">{item.type}</td>
//                 <td className="border p-2 text-center">
//                   <button
//                     onClick={() => handleDelete("item", index)}
//                     className="text-red-600 hover:underline"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}

//             {bomResources.map((resource, index) => (
//               <tr key={resource.id}>
//                 <td className="border p-2 text-center">
//                   {index + 1 + bomItems.length}
//                 </td>
//                 <td className="border p-2 w-36">
//                   <Select
//                     options={resourceOptions}
//                     value={resourceOptions.find(
//                       (o) => o.data.code === resource.code
//                     )}
//                     onChange={(opt) => handleResourceSelect(index, opt)}
//                     isSearchable
//                     placeholder="Select Resource"
//                   />
//                 </td>
//                 <td className="border p-2">{resource.name}</td>
//                 <td className="border p-2 text-center">
//                   <input
//                     type="number"
//                     min="1"
//                     value={resource.quantity}
//                     onChange={(e) =>
//                       handleQtyChange("resource", index, +e.target.value)
//                     }
//                     className="w-16 border p-1 text-center rounded"
//                   />
//                 </td>
//                 <td className="border p-2 text-center">
//                   <select
//                     className="border rounded p-1 w-full"
//                     value={resource.warehouse}
//                     onChange={(e) =>
//                       handleWarehouseChange("resource", index, e.target.value)
//                     }
//                   >
//                     <option value="">Select</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w.value} value={w.value}>
//                         {w.label}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//                 <td className="border p-2 text-right">{resource.unitPrice}</td>
//                 <td className="border p-2 text-right">{resource.total}</td>
//                 <td className="border p-2 text-center">{resource.type}</td>
//                 <td className="border p-2 text-center">
//                   <button
//                     onClick={() => handleDelete("resource", index)}
//                     className="text-red-600 hover:underline"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* ---------- OPERATION FLOW SECTION ---------- */}
//       <div className="overflow-x-auto mb-6 z-20">
//         <h3 className="text-lg font-semibold mb-2">Operation Flow</h3>
//         {operationFlow.map((flow, idx) => (
//           <div
//             key={flow.id}
//             className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-2 items-end"
//           >
//             <div>
//               <label className="text-sm">Operation</label>
//               <Select
//                 options={operationOptions}
//                 value={flow.operation}
//                 onChange={(opt) => handleOperationChange(idx, "operation", opt)}
//                 className="z-50"
//                 menuPortalTarget={document.body} // 👈 renders dropdown at body level
//                 styles={{
//                   menuPortal: (base) => ({ ...base, zIndex: 9999 }), // 👈 ensures visibility
//                 }}
//               />
//             </div>
//             <div>
//               <label className="text-sm">Machine</label>
//               <Select
//                 options={machines}
//                 value={flow.machine}
//                 onChange={(opt) => handleOperationChange(idx, "machine", opt)}
//                 menuPortalTarget={document.body} // 👈 renders dropdown at body level
//                 styles={{
//                   menuPortal: (base) => ({ ...base, zIndex: 9999 }), // 👈 ensures visibility
//                 }}
//               />
//             </div>
//             <div>
//               <label className="text-sm">Operator</label>
//               <Select
//                 options={operators}
//                 value={flow.operator}
//                 onChange={(opt) => handleOperationChange(idx, "operator", opt)}
//                 menuPortalTarget={document.body} // 👈 renders dropdown at body level
//                 styles={{
//                   menuPortal: (base) => ({ ...base, zIndex: 9999 }), // 👈 ensures visibility
//                 }}
//               />
//             </div>
            
//             {/* planied start date and expected end date*/}
//              <div>
//               <label className="text-sm">Expected Start Date</label>
//               <input
//                 type="date"
//                 className="w-full border p-2 rounded"
//                 value={flow.expectedStartDate}
//                 onChange={(e) =>
//                   handleOperationChange(idx, "expectedStartDate", e.target.value)
//                 }
//               />
//             </div>
//               <div>
//               <label className="text-sm">Expected End Date</label>
//               <input
//                 type="date"
//                 className="w-full border p-2 rounded"
//                 value={flow.expectedEndDate}
//                 onChange={(e) =>
//                   handleOperationChange(idx, "expectedEndDate", e.target.value)
//                 }
//               />
//             </div>


//             <div>
             

//               <button
//                 onClick={() => handleDeleteFlow(idx)}
//                 className="mt-2 text-red-600 hover:text-red-800 "
//               >
//                 <FiTrash2  size={30}/>
//               </button>
//             </div>
//           </div>
//         ))}
//         <button
//           onClick={handleAddOperationFlow}
//           className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//         >
//           + Add Operation Flow
//         </button>
//       </div>

//       <div className="flex justify-end gap-2">
//         <button
//           onClick={handleAddItem}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//         >
//           + Add Item
//         </button>
//         <button
//           onClick={handleAddResource}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//         >
//           + Add Resource
//         </button>
//         <button
//           onClick={handleSave}
//           className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//         >
//           Save Production Order
//         </button>
//       </div>
//     </div>
//   );
// }

// // export default ProductionOrderPage;

// export default function Page() {
//   return (
//     <Suspense fallback={<div>Loading...</div>}>
//       <ProductionOrderPage />
//     </Suspense>
//   );
// }
