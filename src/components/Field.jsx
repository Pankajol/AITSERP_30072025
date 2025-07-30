import React from 'react';

const Field = ({ label, name, type = 'text', required = false, placeholder }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      required={required}
      placeholder={placeholder}
      className="w-full h-8 rounded-md  border-orange-500 shadow-sm focus:border-orange-700 focus:ring-orange-700 sm:text-sm"
    />
  </div>
);

export default Field;
