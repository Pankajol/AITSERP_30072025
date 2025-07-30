import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ItemMasterForm = () => {
    // const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    itemCode: '',
    status: 'active',
    itemName: '',
    itemGroup: '',
    unitOfMeasurement: '',
    barcode: '',
    valuationMethod: 'FIFO',
    maintainStock: false,
    sellingPrice: '',
    purchasePrice: '',
    minimumOrderQty: '',
    leadTime: '',
    shelfLife: '',
    warrantyPeriod: '',
    qualityInspection: '',
  });

  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  useEffect(() => {
    // Fetch all items on component mount
    axios.get('/api/item')
      .then(response => {
        setItems(response.data);
      })
      .catch(error => {
        console.error("Error fetching items:", error);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editing) {
      // Update existing item
      try {
        const response = await axios.put(`/api/item/${editItemId}`, formData);
        console.log('Updated item:', response.data);
        setEditing(false);
        setEditItemId(null);
        fetchItems();
      } catch (error) {
        console.error('Error updating item:', error);
      }
    } else {
      // Create new item
      try {
        const response = await axios.post('/api/item', formData);
        console.log('Created item:', response.data);
        fetchItems();
      } catch (error) {
        console.error('Error creating item:', error);
      }
    }
  };

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/item');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleEdit = (id) => {
    const itemToEdit = items.find((item) => item.id === id);
    setFormData(itemToEdit);
    setEditing(true);
    setEditItemId(id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/item/${id}`);
      console.log('Item deleted');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        {editing ? 'Edit Item' : 'Item Management'}
      </h1>
       

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Fields... */}
        {/* The rest of your form fields go here as in the previous JSX example */}
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
      Item Management
    </h1>


      {/* Basic Information Section */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Item Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Item Group
            </label>
            <input
              type="text"
              name="itemGroup"
              value={formData.itemGroup}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Inventory Details Section */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Inventory Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Unit of Measurement
            </label>
            <input
              type="text"
              name="unitOfMeasurement"
              value={formData.unitOfMeasurement}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Barcode
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Valuation Method
            </label>
            <select
              name="valuationMethod"
              value={formData.valuationMethod}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="STANDARD">Standard</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="maintainStock"
              checked={formData.maintainStock}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Maintain Stock
            </label>
          </div>
        </div>
      </div>

      {/* Pricing & Logistics Section */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Pricing & Logistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Selling Price
            </label>
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Purchase Price
            </label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Minimum Order Qty
            </label>
            <input
              type="number"
              name="minimumOrderQty"
              value={formData.minimumOrderQty}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Lead Time (Days)
            </label>
            <input
              type="number"
              name="leadTime"
              value={formData.leadTime}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Quality & Warranty Section */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quality & Warranty</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Shelf Life (Days)
            </label>
            <input
              type="number"
              name="shelfLife"
              value={formData.shelfLife}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Warranty Period (Days)
            </label>
            <input
              type="number"
              name="warrantyPeriod"
              value={formData.warrantyPeriod}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Quality Inspection
            </label>
            <select
              name="qualityInspection"
              value={formData.qualityInspection}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Inspection</option>
              <option value="required">Required</option>
              <option value="not-required">Not Required</option>
            </select>
          </div>
        </div>
      </div>

        <div className="flex justify-end gap-4 mt-8">
          <button type="button" className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {editing ? "Update Item" : "Create Item"}
          </button>
        </div>
      </form>

      {/* Item List */}
      <div className="mt-8">
      <h2 className="text-2xl font-bold text-blue-600 mt-12">Item List</h2>
      <div className="mt-6 bg-gray-100 p-6 rounded-lg shadow-lg">
        <input
          type="text"
          placeholder="Search items..."
          className="mb-4 p-2 border border-gray-300 rounded w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table className="table-auto w-full border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Item Code</th>
              <th className="p-2 border">Item Name</th>
              <th className="p-2 border">Unit of Measurement</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">{item.itemCode}</td>
                <td className="p-2 border">{item.itemName}</td>
                <td className="p-2 border">{item.unitOfMeasurement}</td>
                <td className="p-2 border flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-500"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};

export default ItemMasterForm;
