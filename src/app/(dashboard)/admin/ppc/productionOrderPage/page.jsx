"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

const ProductionOrderPage = () => {
  const [productionOrders, setProductionOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [resources, setResources] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    if (!token) return; // Prevent fetching without token
    setIsLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ordersRes, machinesRes, operatorsRes, resourcesRes] = await Promise.all([
        fetch('/api/ppc/production-orders', { headers }),
        fetch('/api/ppc/machines', { headers }),
        fetch('/api/ppc/operators', { headers }),
        fetch('/api/ppc/resources', { headers })
      ]);

      if (!ordersRes.ok) throw new Error('Failed to fetch production orders');
      if (!machinesRes.ok) throw new Error('Failed to fetch machines');
      if (!operatorsRes.ok) throw new Error('Failed to fetch operators');
      if (!resourcesRes.ok) throw new Error('Failed to fetch resources');

      const ordersData = await ordersRes.json();
      const machinesData = await machinesRes.json();
      const operatorsData = await operatorsRes.json();
      const resourcesData = await resourcesRes.json();
      
      setProductionOrders(ordersData.data || []);
      setMachines(machinesData.data || []);
      setOperators(operatorsData.data || []);
      setResources(resourcesData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (order = null) => {
    setCurrentOrder(order ? { ...order } : { 
      orderNumber: '',
      itemCode: '',
      itemName: '',
      quantity: '',
      status: 'Pending',
      assignedMachine: machines[0]?._id || '',
      assignedOperator: operators[0]?._id || '',
      assignedResource: resources[0]?._id || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOrder(null);
    setModalError(null);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentOrder.orderNumber || !currentOrder.itemCode || !currentOrder.quantity) {
        setModalError("Order Number, Item Code, and Quantity are required.");
        return;
    }
    setIsSaving(true);
    setModalError(null);
    const method = currentOrder._id ? 'PUT' : 'POST';
    const url = currentOrder._id ? `/api/ppc/production-orders/${currentOrder._id}` : '/api/ppc/production-orders';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentOrder),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save production order');
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
    if (window.confirm('Are you sure you want to delete this production order?')) {
      try {
        const response = await fetch(`/api/ppc/production-orders/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.message || 'Failed to delete order');
        }
        await fetchData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Production Order Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-end">
          <button onClick={() => openModal()} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
            <Plus size={18} />
            Add Production Order
          </button>
        </div>
      </div>

      {isLoading && <p className="text-center">Loading...</p>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Status</th>
                <th className="p-4">Machine</th>
                <th className="p-4">Operator</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.map((order) => (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{order.orderNumber}</td>
                  <td className="p-4">{order.itemName}</td>
                  <td className="p-4">{order.quantity}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        order.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {order.status}
                    </span>
                  </td>
                  <td className="p-4">{order.assignedMachine?.name || 'N/A'}</td>
                  <td className="p-4">{order.assignedOperator?.name || 'N/A'}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => openModal(order)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(order._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">{currentOrder?._id ? 'Edit Production Order' : 'Add Production Order'}</h2>
            
            {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{modalError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="orderNumber" type="text" placeholder="Order Number" value={currentOrder.orderNumber} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input name="itemCode" type="text" placeholder="Item Code" value={currentOrder.itemCode} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input name="itemName" type="text" placeholder="Item Name" value={currentOrder.itemName} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input name="quantity" type="number" placeholder="Quantity" value={currentOrder.quantity} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <select name="status" value={currentOrder.status} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <select name="assignedMachine" value={currentOrder.assignedMachine} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white">
                <option value="">Assign Machine</option>
                {machines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              <select name="assignedOperator" value={currentOrder.assignedOperator} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white">
                <option value="">Assign Operator</option>
                {operators.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
              <select name="assignedResource" value={currentOrder.assignedResource} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-white">
                <option value="">Assign Resource</option>
                {resources.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400" disabled={isSaving}>Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionOrderPage;
