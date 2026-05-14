'use client';

import { useState } from 'react';

export default function ItemDetailsForm() {
  const initialFormData = {
    itemCode: '',
    itemName: '',
    itemGroup: '',
    unitMeasurement: '',
    valuationMethod: 'FIFO',
    sellingPrice: '',
    purchasePrice: '',
    barcodes: '',
    maintainStock: false,
    brand: '',
    minimumOrderQty: '',
    shelfLife: '',
    safetyStock: '',
    warrantyPeriod: '',
    leadTime: '',
    endOfLife: '',
    qualityInspection: '',
    materialRequestType: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
    alert("sumit successfully",formData);
    setFormData({...initialFormData})
    // You can add logic to submit the form to the server here
  };

  const handleCancel = () => {
    setFormData({ ...initialFormData }); // Ensure resetting with a fresh initial state
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-10 max-w-5xl w-full">
        <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">Item Details</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Item Details Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Item Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Item Code</label>
                <input
                  name="itemCode"
                  value={formData.itemCode}
                  placeholder="Enter Item Code"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Item Name</label>
                <input
                  name="itemName"
                  value={formData.itemName}
                  placeholder="Enter Item Name"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Item Group</label>
                <input
                  name="itemGroup"
                  value={formData.itemGroup}
                  placeholder="Enter Item Group"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {/* General Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Unit of Measurement</label>
                <input
                  name="unitMeasurement"
                  value={formData.unitMeasurement}
                  placeholder="Enter Unit"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Barcodes</label>
                <input
                  name="barcodes"
                  value={formData.barcodes}
                  placeholder="Enter Barcodes"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Valuation Method</label>
                <select
                  name="valuationMethod"
                  value={formData.valuationMethod}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="FIFO">FIFO</option>
                  <option value="LIFO">LIFO</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  name="maintainStock"
                  type="checkbox"
                  checked={formData.maintainStock}
                  onChange={handleChange}
                  className="w-5 h-5 mr-2"
                />
                <label className="text-gray-700">Maintain Stock</label>
              </div>
              <div>
                <label className="label">Brand</label>
                <input
                  name="brand"
                  value={formData.brand}
                  placeholder="Enter Brand"
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </section>

          {/* Details Section */}
          <section>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[{ name: 'minimumOrderQty', label: 'Minimum Order Qty' }, { name: 'shelfLife', label: 'Shelf Life (In days)' }, { name: 'safetyStock', label: 'Safety Stock' }, { name: 'warrantyPeriod', label: 'Warranty Period (In days)' }, { name: 'leadTime', label: 'Lead Time (In days)' }, { name: 'endOfLife', label: 'End of Life' }, { name: 'qualityInspection', label: 'Quality Inspection' }, { name: 'materialRequestType', label: 'Material Request Type' }].map(({ name, label }) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input
                    type='number'
                    name={name}
                    value={formData[name]}
                    placeholder={`Enter ${label}`}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-4">
            <button type="submit" className="btn-primary">Add</button>
            <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
