"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

const OperatorPage = () => {
  const [operation, setOperation] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // For fetch/delete errors
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for modal actions
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please log in again.');
            setIsLoading(false);
            return;
        }
      const response = await fetch(`/api/ppc/operations?searchQuery=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch operators');
      const data = await response.json();
      setOperation(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchOperators();
  };

  const openModal = (operator = null) => {
    setCurrentOperation(operator ? { ...operator } : { code: '', name: '', cost: '' });
    setModalError(null); // Clear previous modal errors
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOperation(null);
    setModalError(null);
  };
  
  // Consolidated input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentOperation(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token'); // Adjust as needed for your auth
      if (!token) {
        setModalError('Authentication token not found. Please log in again.');
        return;
      }
      
    setIsSaving(true);
    setModalError(null);
    const method = currentOperation._id ? 'PUT' : 'POST';
    const url = currentOperation._id ? `/api/ppc/operations/${currentOperation._id}` : '/api/ppc/operations';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentOperation),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save operator');
      }
      await fetchOperators();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
    }

    if (window.confirm('Are you sure you want to delete this operator?')) {
      try {
        const response = await fetch(`/api/ppc/operations/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.message || 'Failed to delete operator');
        }
        await fetchOperators();
      } catch (err) {
        setError(err.message); // Show delete error on the main page
      }
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Operation Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or code..."
              className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
             <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              Search
            </button>
          </form>
          <button onClick={() => openModal()} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
            <Plus size={18} />
            Add Operator
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
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Cost per Hour</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {operation.map((operator) => (
                <tr key={operator._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{operator.code}</td>
                  <td className="p-4">{operator.name}</td>
                  <td className="p-4">{`$${operator.cost}`}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => openModal(operator)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(operator._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{currentOperation?._id ? 'Edit Operation' : 'Add Operation'}</h2>
            
            {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{modalError}</div>}

            <div className="space-y-4">
              <input name="code" type="text" placeholder="Code" value={currentOperation.code} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input name="name" type="text" placeholder="Name" value={currentOperation.name} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
              <input name="cost" type="number" placeholder="Cost per Hour" value={currentOperation.cost} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
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

export default OperatorPage;

