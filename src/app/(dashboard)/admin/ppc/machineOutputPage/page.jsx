"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import Select from "react-select";

const MachineOutputPage = () => {
  const [machineOutputs, setMachineOutputs] = useState([]);
  const [machines, setMachines] = useState([]); // dropdown
  const [items, setItems] = useState([]); // dropdown

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOutput, setCurrentOutput] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  // fetch outputs + machines + items
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [outputsRes, machinesRes, itemsRes] = await Promise.all([
        fetch("/api/ppc/machineOutputs", { headers: getAuthHeaders() }),
        fetch("/api/ppc/machines", { headers: getAuthHeaders() }),
        fetch("/api/items", { headers: getAuthHeaders() }),
      ]);

      if (!outputsRes.ok) throw new Error("Failed to fetch machine outputs");
      if (!machinesRes.ok) throw new Error("Failed to fetch machines");
      if (!itemsRes.ok) throw new Error("Failed to fetch items");

      const outputsData = await outputsRes.json();
      const machinesData = await machinesRes.json();
      const itemsData = await itemsRes.json();

      setMachineOutputs(
        Array.isArray(outputsData) ? outputsData : outputsData.data || []
      );
      setMachines(
        Array.isArray(machinesData) ? machinesData : machinesData.data || []
      );
      setItems(Array.isArray(itemsData) ? itemsData : itemsData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (output = null) => {
    setCurrentOutput(
      output || {
        itemCode: "",
        itemName: "",
        machine: machines[0]?._id || "",
        perDayOutput: "",
        machineRunningCost: "",
      }
    );
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOutput(null);
    setModalError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentOutput((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (
      !currentOutput.itemCode ||
      !currentOutput.machine ||
      !currentOutput.perDayOutput
    ) {
      setModalError("Item Code, Machine, and Per Day Output are required.");
      return;
    }
    setIsSaving(true);
    setModalError(null);

    const method = currentOutput._id ? "PUT" : "POST";
    const url = currentOutput._id
      ? `/api/ppc/machineOutputs/${currentOutput._id}`
      : "/api/ppc/machineOutputs";

    try {
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(currentOutput),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to save machine output");
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this machine output record?"
      )
    ) {
      try {
        const response = await fetch(`/api/ppc/machineOutputs/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error("Failed to delete record");
        await fetchData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Machine Output Management
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-end">
        <button
          onClick={() => openModal()}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={18} /> Add Machine Output
        </button>
      </div>

      {isLoading && <p className="text-center">Loading...</p>}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Item Code</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Machine</th>
                <th className="p-4">Per Day Output</th>
                <th className="p-4">Running Cost</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
           <tbody>
  {(machineOutputs || []).map((output) => (
    <tr key={output._id} className="border-b hover:bg-gray-50">
      <td className="p-4">{output.item?.itemCode || "N/A"}</td>
      <td className="p-4">{output.item?.itemName || "N/A"}</td>
      <td className="p-4">
        {output.machine ? `${output.machine.machineCode} - ${output.machine.name}` : "N/A"}
      </td>
      <td className="p-4">{output.perDayOutput}</td>
      <td className="p-4">{`$${output.machineRunningCost}`}</td>
      <td className="p-4 flex gap-2">
        <button onClick={() => openModal(output)} className="text-blue-500 hover:text-blue-700">
          <Edit size={18} />
        </button>
        <button onClick={() => handleDelete(output._id)} className="text-red-500 hover:text-red-700">
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  ))}
</tbody>

          </table>
        </div>
      )}

      {isModalOpen && currentOutput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">
              {currentOutput._id ? "Edit Machine Output" : "Add Machine Output"}
            </h2>

            {modalError && (
              <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              {/* react-select for item selection */}
            <Select
  placeholder="Select Item"
  value={
    currentOutput.item
      ? {
          value: currentOutput.item,
          label: `${items.find((i) => i._id === currentOutput.item)?.itemCode || ""} - ${
            items.find((i) => i._id === currentOutput.item)?.itemName || ""
          }`,
        }
      : null
  }
  options={items.map((item) => ({
    value: item._id,
    label: `${item.itemCode} - ${item.itemName}`,
  }))}
  onChange={(selected) =>
    setCurrentOutput((prev) => ({
      ...prev,
      item: selected?.value || "",
    }))
  }
/>

           <Select
  placeholder="Select Machine"
  value={
    currentOutput.machine
      ? {
          value: currentOutput.machine,
          label: `${machines.find((m) => m._id === currentOutput.machine)?.machineCode || ""} - ${
            machines.find((m) => m._id === currentOutput.machine)?.name || ""
          }`,
        }
      : null
  }
  options={machines.map((machine) => ({
    value: machine._id,
    label: `${machine.machineCode} - ${machine.name}`,
  }))}
  onChange={(selected) =>
    setCurrentOutput((prev) => ({
      ...prev,
      machine: selected?.value || "",
    }))
  }
/>


              {/* <select
                name="machine"
                value={currentOutput.machine}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md bg-white"
              >
                <option value="">Select Machine</option>
                {machines.map((machine) => (
                  <option key={machine._id} value={machine._id}>
                    {machine.name}
                  </option>
                ))}
              </select> */}

              <input
                name="perDayOutput"
                type="number"
                placeholder="Per Day Output"
                value={currentOutput.perDayOutput}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />

              <input
                name="machineRunningCost"
                type="number"
                placeholder="Machine Running Cost"
                value={currentOutput.machineRunningCost}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineOutputPage;
