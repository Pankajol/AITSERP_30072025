/* ------------------------------------------------------------------
   pages/company-register.js  –  “Company Register” flow
-------------------------------------------------------------------*/
'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function CompanyRegister() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    gstNumber: '',
    country: '',
    address: '',
    pinCode: '',
    password: '',
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState({});

  /* ---------------- helpers ------------------------------------------------ */
  const validateEmail  = (email)  => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validatePhone  = (phone)  => /^[0-9]{10}$/.test(phone);
  const validateGST    = (gst)    => /^[0-9A-Z]{15}$/.test(gst);         // 15‑char PAN‑based GSTIN
  const validatePin    = (pin)    => /^[0-9]{6}$/.test(pin);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newVal }));

    /* on‑the‑fly field validation */
    let message = '';
    if (name === 'email'    && value && !validateEmail(value)) message = 'Invalid email address';
    if (name === 'phone'    && value && !validatePhone(value)) message = 'Must be 10 digits';
    if (name === 'gstNumber' && value && !validateGST(value))  message = 'GST must be 15 alphanumerics';
    if (name === 'pinCode'  && value && !validatePin(value))   message = 'PIN must be 6 digits';

    setErrors((prev) => ({ ...prev, [name]: message }));
  };

  /* ---------------- submit -------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic required‑field sweep
    const required = ['companyName','contactName','phone','email',
                      'country','address','pinCode','password'];
    const newErrs = {};
    required.forEach((f) => { if (!formData[f]) newErrs[f] = 'Required'; });
    if (!formData.agreeToTerms) newErrs.agreeToTerms = 'You must accept the terms';

    if (Object.keys(newErrs).length > 0) { setErrors(newErrs); return; }

    try {
      const res = await axios.post('/api/company/signup', formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 201) {
        alert('Company account created!');
        window.location.href = '/';           // go to login/home
      }
    } catch (err) {
      console.error('Company signup error:', err?.response?.data || err.message);
      setErrors({ general: err?.response?.data?.message || 'Server error' });
    }
  };

  /* ---------------- view ---------------------------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-semibold text-center mb-6">Register Your Company</h1>

        {errors.general && (
          <p className="mb-4 text-center text-red-600 text-sm">{errors.general}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* row 1 */}
          <div className="flex flex-col md:flex-row md:space-x-4">
            <Input
              label="Company Name"
              id="companyName"
              value={formData.companyName}
              error={errors.companyName}
              onChange={handleChange}
            />
            <Input
              label="Contact Person"
              id="contactName"
              value={formData.contactName}
              error={errors.contactName}
              onChange={handleChange}
            />
          </div>

          {/* row 2 */}
          <div className="flex flex-col md:flex-row md:space-x-4">
            <Input
              label="Phone (10‑digit)"
              id="phone"
              value={formData.phone}
              error={errors.phone}
              onChange={handleChange}
            />
            <Input
              label="Email"
              id="email"
              type="email"
              value={formData.email}
              error={errors.email}
              onChange={handleChange}
            />
          </div>

          {/* row 3 */}
          <div className="flex flex-col md:flex-row md:space-x-4">
            <Input
              label="GST Number (optional)"
              id="gstNumber"
              value={formData.gstNumber}
              error={errors.gstNumber}
              onChange={handleChange}
            />
            <Select
              label="Country"
              id="country"
              value={formData.country}
              error={errors.country}
              onChange={handleChange}
              options={['India','USA','Canada','Australia']}
            />
          </div>

          {/* row 4 */}
          <Input
            label="Address"
            id="address"
            value={formData.address}
            error={errors.address}
            onChange={handleChange}
          />

          {/* row 5 */}
          <div className="flex flex-col md:flex-row md:space-x-4">
            <Input
              label="PIN Code"
              id="pinCode"
              value={formData.pinCode}
              error={errors.pinCode}
              onChange={handleChange}
            />
            <Input
              label="Password"
              id="password"
              type="password"
              value={formData.password}
              error={errors.password}
              onChange={handleChange}
            />
          </div>

          {/* agree */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-amber-400"
            />
            <span className="text-gray-700 text-sm">
              I agree to Import Export Terms&nbsp;of Service, Privacy Policy &amp; Cookie Policy.
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="text-red-500 text-xs -mt-2">{errors.agreeToTerms}</p>
          )}

          <button
            type="submit"
            className="w-full bg-amber-400 text-white py-2 rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Register Company
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link href="/">
            <span className="text-amber-400 hover:underline cursor-pointer">Login here</span>
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ---------------- tiny UI helpers (keeps JSX tidy) -------------------------*/
function Input({ label, id, type = 'text', value, error, onChange }) {
  return (
    <div className="flex-1 mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}<span className="text-red-500">*</span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

function Select({ label, id, value, error, onChange, options }) {
  return (
    <div className="flex-1 mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}<span className="text-red-500">*</span>
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}




// 'use client';

// import { useState } from 'react';
// import Link from 'next/link';
// import axios from 'axios';

// export default function CreateAccount() {
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     phone: '',
//     email: '',
//     country: '',
//     address: '',
//     pinCode: '',
//     agreeToTerms: false,
//   });

//   const [errors, setErrors] = useState({});

//   const validateEmail = (email) =>
//     /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
//   const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === 'checkbox' ? checked : value,
//     });

//     // Field-specific validation
//     if (name === 'email' && !validateEmail(value)) {
//       setErrors({ ...errors, email: 'Invalid email address' });
//     } else if (name === 'phone' && !validatePhone(value)) {
//       setErrors({ ...errors, phone: 'Phone number must be 10 digits' });
//     } else {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
  
//     try {
//       const response = await axios.post('/api/signup', formData, {
//         headers: { 'Content-Type': 'application/json' },
//       });
  
//       if (response.status === 201) {
//         alert('Account created successfully!');
//         window.location.href = '/';
//         setFormData({
//           firstName: '',
//           lastName: '',
//           phone: '',
//           email: '',
//           country: '',
//           address: '',
//           pinCode: '',
//           agreeToTerms: false,
//         });
//         setErrors({});
        
//       }

//     } catch (error) {
//       if (error.response) {
//         // Handle error from server response
//         console.error('Server error:', error.response.data);
//         setErrors({ general: error.response.data.details || 'Error creating account.' });
//       } else {
//         // Handle other errors (network, etc.)
//         console.error('Error submitting form:', error.message);
//         setErrors({ general: 'Something went wrong. Please try again.' });
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-lg">
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="firstName"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 First Name<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="firstName"
//                 name="firstName"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
//               />
//               {errors.firstName && (
//                 <p className="text-red-500 text-xs">{errors.firstName}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="lastName"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Last Name<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="lastName"
//                 name="lastName"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
//               />
//               {errors.lastName && (
//                 <p className="text-red-500 text-xs">{errors.lastName}</p>
//               )}
//             </div>
//           </div>

//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="phone"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Phone Number<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="phone"
//                 name="phone"
//                 value={formData.phone}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               {errors.phone && (
//                 <p className="text-red-500 text-xs">{errors.phone}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Email<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="email"
//                 id="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               {errors.email && (
//                 <p className="text-red-500 text-xs">{errors.email}</p>
//               )}
//             </div>
//           </div>

//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="country"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Country<span className="text-red-500">*</span>
//               </label>
//               <select
//                 id="country"
//                 name="country"
//                 value={formData.country}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Select Country</option>
//                 <option value="India">India</option>
//                 <option value="USA">USA</option>
//                 <option value="Canada">Canada</option>
//                 <option value="Australia">Australia</option>
//               </select>
//               {errors.country && (
//                 <p className="text-red-500 text-xs">{errors.country}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="address"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Address (Optional)
//               </label>
//               <input
//                 type="text"
//                 id="address"
//                 name="address"
//                 value={formData.address}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>

//           <div>
//             <label htmlFor="agreeToTerms" className="flex items-center space-x-2">
//               <input
//                 type="checkbox"
//                 id="agreeToTerms"
//                 name="agreeToTerms"
//                 checked={formData.agreeToTerms}
//                 onChange={handleChange}
//                 className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//               />
//               <span className="text-gray-700 text-sm">
//                 I agree to Import Export Terms of Service,Privacy Policy & Cookie Policy.
//               </span>
//             </label>
//             {errors.agreeToTerms && (
//               <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
//             )}
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             Create Account
//           </button>
//         </form>
//       <div className="mt-4 text-center">
//             <p className="text-sm">
//               I have an account?{' '}
//               <Link href="/">
//                 <button
//                   type="button"
//                   className="text-blue-600 hover:underline"
//                   onClick={() => console.log('Navigate to Create Account')}
//                 >
//                   Login
//                 </button>
//               </Link>
//             </p>
//           </div>
//       </div>
//     </div>
//   );
// }
