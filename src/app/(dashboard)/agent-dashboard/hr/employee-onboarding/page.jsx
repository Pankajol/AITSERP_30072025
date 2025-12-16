'use client';
import React, { useState, useMemo } from 'react';
import { User, Briefcase, Phone, CheckCircle } from 'lucide-react';

// Main App Component
const App = () => {
  // 1. State Management (All fields remain, step management removed)
  const [formData, setFormData] = useState({
    // Personal & Contact Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    // Employment Details
    jobTitle: '',
    department: 'Sales',
    startDate: '',
    salary: '',
    employmentType: 'Full-Time',
    // Emergency & Policy
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    idDocument: null, // File input
    hasReadPolicy: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 2. Handlers
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic required field validation (can be expanded)
    if (!formData.firstName || !formData.email || !formData.jobTitle || !formData.emergencyName || !formData.hasReadPolicy) {
      // In a real app, this should display an inline error or toast notification
      console.error('Validation Error: Please fill in all required fields and confirm the policy.');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log('Form Data Submitted:', formData);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  // 3. Form Field Components
  const InputField = ({ label, name, type = 'text', required = false, placeholder, options }) => {
    const commonClasses = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150 p-3";

    const inputElement = useMemo(() => {
      switch (type) {
        case 'select':
          return (
            <select
              id={name}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              required={required}
              className={commonClasses + " bg-white appearance-none cursor-pointer"}
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        case 'checkbox':
          return (
            <div className="flex items-start">
              <input
                id={name}
                name={name}
                type="checkbox"
                checked={formData[name]}
                onChange={handleChange}
                required={required}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor={name} className="ml-3 text-sm font-medium text-gray-700 select-none">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
            </div>
          );
        default:
          return (
            <input
              id={name}
              name={name}
              type={type}
              // Handle file input separately, ensuring value is undefined
              value={type !== 'file' ? (formData[name] || '') : undefined}
              onChange={handleChange}
              required={required}
              placeholder={placeholder}
              className={commonClasses}
            />
          );
      }
    }, [name, type, required, placeholder, options, formData]);

    if (type === 'checkbox') {
      return (
        <div className="mb-6 mt-8">
          {inputElement}
        </div>
      );
    }

    return (
      <div className="mb-6">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {inputElement}
      </div>
    );
  };

  // 4. Combined Form Content
  const renderCombinedForm = () => {
    return (
      <>
        {/* Section 1: Personal & Contact Info */}
        <div className="p-6 bg-indigo-50/50 rounded-xl mb-8 border-l-4 border-indigo-500 shadow-sm">
          <h2 className="text-2xl font-bold text-indigo-800 mb-6 pb-2 border-b border-indigo-200 flex items-center">
            <User className="w-6 h-6 mr-3 text-indigo-600" /> 1. Personal & Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="First Name" name="firstName" required />
            <InputField label="Last Name" name="lastName" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Email Address" name="email" type="email" required placeholder="name@company.com" />
            <InputField label="Phone Number" name="phone" type="tel" required placeholder="(555) 555-5555" />
          </div>
          <InputField label="Current Address" name="address" placeholder="123 Main St, City, State, ZIP" />
        </div>

        {/* Section 2: Employment Details */}
        <div className="p-6 bg-green-50/50 rounded-xl mb-8 border-l-4 border-green-500 shadow-sm">
          <h2 className="text-2xl font-bold text-green-800 mb-6 pb-2 border-b border-green-200 flex items-center">
            <Briefcase className="w-6 h-6 mr-3 text-green-600" /> 2. Employment Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Job Title" name="jobTitle" required placeholder="Software Engineer" />
            <InputField
              label="Department"
              name="department"
              type="select"
              required
              options={[
                { value: 'Sales', label: 'Sales' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Engineering', label: 'Engineering' },
                { value: 'HR', label: 'Human Resources' },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Start Date" name="startDate" type="date" required />
            <InputField label="Annual Salary (USD)" name="salary" type="number" placeholder="75000" />
          </div>
          <InputField
            label="Employment Type"
            name="employmentType"
            type="select"
            required
            options={[
              { value: 'Full-Time', label: 'Full-Time' },
              { value: 'Part-Time', label: 'Part-Time' },
              { value: 'Contract', label: 'Contract' },
            ]}
          />
        </div>

        {/* Section 3: Emergency & Policy */}
        <div className="p-6 bg-yellow-50/50 rounded-xl mb-4 border-l-4 border-yellow-500 shadow-sm">
          <h2 className="text-2xl font-bold text-yellow-800 mb-6 pb-2 border-b border-yellow-200 flex items-center">
            <Phone className="w-6 h-6 mr-3 text-yellow-600" /> 3. Emergency & Compliance
          </h2>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Full Name" name="emergencyName" required />
            <InputField label="Relationship" name="emergencyRelationship" required />
          </div>
          <InputField label="Phone Number" name="emergencyPhone" type="tel" required placeholder="(555) 555-5555" />

          <h3 className="text-xl font-semibold text-gray-700 mb-4 mt-8 pt-4 border-t border-gray-200">Required Documents & Policy</h3>
          <InputField label="Upload ID Document (e.g., Passport)" name="idDocument" type="file" />
          <InputField
            label="I have read and agree to the company's onboarding policies."
            name="hasReadPolicy"
            type="checkbox"
            required
          />
        </div>
      </>
    );
  };

  // 5. Success View
  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center p-8 text-center min-h-screen bg-gray-100">
        <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-lg w-full transform transition-all duration-300 border-t-8 border-green-500">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h2>
          <p className="text-gray-600 mb-6">
            Thank you, {formData.firstName}! Your onboarding form has been successfully submitted to HR.
            A confirmation email will be sent shortly.
          </p>
          <button
            onClick={() => { setIsSubmitted(false); setFormData({}); }}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 transform hover:scale-105"
          >
            Start New Onboarding
          </button>
        </div>
      </div>
    );
  }

  // 6. Main Component Render (Single Page Form)
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl p-6 sm:p-10 transition-all duration-300">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Employee Onboarding Form
        </h1>
        <p className="text-gray-500 mb-8 pb-4 border-b">
          Please fill out all the required sections below to complete your enrollment.
        </p>

        <form onSubmit={handleSubmit}>
          {renderCombinedForm()}

          {/* Submission Button */}
          <div className="flex justify-end pt-6 border-t mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-[1.02] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Onboarding Form
                  <CheckCircle className="w-5 h-5 ml-3" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;