"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi";

export default function LandingPage() {
  const features = [
    "Procure to Pay – Streamline your procurement and payment processes.",
    "Inventory – Real‑time inventory tracking and alerts.",
    "Order to Cash – Manage your sales cycle from order to cash.",
    "Production – Optimize your production processes for better efficiency.",
    "CRM – Enhance customer relationships and support.",
    "Reports – Insightful reports for better decision making.",
  ];

  /* ✨ Framer‑motion variants for staggered reveal */
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="h-screen overflow-hidden flex flex-col justify-between items-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800 p-6">
      {/* Header */}
      <header className="flex flex-col items-center w-full">
        {/* Logos — one centered, one fixed to the right edge */}
        <div className="relative w-full h-36 mb-4">
          {/* Center logo */}
          <img
            src="/aits_pig.png"
            alt="ERP Dashboard"
            className="absolute left-1/2 -translate-x-1/2 h-full w-auto"
          />
          
          {/* Right‑corner logo (flush with viewport edge) */}
          <img
            src="/aits_logo.png"
            alt="AITS ERP Logo"
            className="absolute right-0 h-72 w-auto p-6"
          />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-center mb-3 text-neutral-700"
        >
          Welcome to <span className="text-amber-500">AITS ERP</span>
        </motion.h1>
        <p className="text-center text-base md:text-lg max-w-2xl">
          Manage your sales, purchases, inventory, and business operations from one centralized, modern ERP platform.
        </p>
      </header>

      {/* Actions & Features */}
      <div className="flex flex-col items-center gap-6">
        {/* Buttons */}
        <div className="flex gap-4">
          <Link
            href="/signin"
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition"
          >
            Company Registration
          </Link>
        </div>

        {/* Animated checklist */}
        <h2 className="text-2xl font-bold text-neutral-700">Key Features</h2>
        <motion.ul
          className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl"
          variants={listVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {features.map((text, idx) => (
            <motion.li
              key={idx}
              className="flex items-start gap-2 text-sm md:text-base"
              variants={itemVariants}
            >
              <HiCheckCircle className="text-amber-500 mt-0.5" />
              <span>{text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs md:text-sm text-gray-600">
        &copy; 2025 AITS ERP. All rights reserved.
      </footer>
    </main>
  );
}



// "use client";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import { HiCheckCircle } from "react-icons/hi";

// export default function LandingPage() {
//   const features = [
//     "Procure to Pay – Streamline your procurement and payment processes.",
//     "Inventory – Real-time inventory tracking and alerts.",
//     "Order to Cash – Manage your sales cycle from order to cash.",
//     "Production – Optimize your production processes for better efficiency.",
//     "CRM – Enhance customer relationships and support.",
//     "Reports – Insightful reports for better decision making.",
//   ];

//   return (
//     <main className="h-screen overflow-hidden flex flex-col justify-between items-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800 p-6">
//       {/* Header */}
//       <header className="flex flex-col items-center">
//         <div className="flex justify-between items-center w-full max-w-4xl mb-4 px-4">
//           <img
//             src="/aits_pig.png"
//             alt="ERP Dashboard"
//             className="h-36 w-auto"
//           />
//           <img
//             src="/aits_logo.png"
//             alt="AITS ERP Logo"
//             className="h-36 w-auto"
//           />
//         </div>

//         <motion.h1
//           initial={{ opacity: 0, y: -30 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="text-4xl md:text-5xl font-bold text-center mb-3 text-neutral-700"
//         >
//           Welcome to <span className="text-amber-500">AITS ERP</span>
//         </motion.h1>
//         <p className="text-center text-base md:text-lg max-w-2xl">
//           Manage your sales, purchases, inventory, and business operations from one centralized, modern ERP platform.
//         </p>
//       </header>

//       {/* Actions & Features */}
//       <div className="flex flex-col items-center gap-6">
//         {/* Buttons */}
//         <div className="flex gap-4">
//           <Link
//             href="/signin"
//             className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
//           >
//             Sign In
//           </Link>
//           <Link
//             href="/signup"
//             className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition"
//           >
//             Company Registration
//           </Link>
//         </div>

//         {/* Checklist */}
//         <h2 className="text-2xl font-bold text-neutral-700">Key Features</h2>
//         <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 max-w-4xl">
//           {features.map((text, idx) => (
//             <li key={idx} className="flex items-start gap-2 text-sm md:text-base">
//               <HiCheckCircle className="text-amber-500 mt-0.5" />
//               <span>{text}</span>
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Footer */}
//       <footer className="text-center text-xs md:text-sm text-gray-600">
//         &copy; 2025 AITS ERP. All rights reserved.
//       </footer>
//     </main>
//   );
// }




// // app/landing/page.js or pages/landing.js (if using pages directory)

// "use client";
// import Link from "next/link";
// import { motion } from "framer-motion";

// export default function LandingPage() {
//   return (
//     <main className="min-h-screen bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
//       <section className="container mx-auto px-4 py-20">
//         <div className="flex justify-center mb-10">
//           <img
//             src="/aits_pig.png"

//             alt="ERP Dashboard"
//             className="mx-auto mb-8 h-64 "
//             style={{ maxWidth: "20%", height: "50%" }}
//           /> 
//           <img
//             src="/aits_logo.png"
//             alt="AITS ERP Logo"
//             className="h-64 p-0 mb-12 left-px"
            
//           /> 
               
//         </div>
//         <motion.h1
//           initial={{ opacity: 0, y: -30 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="text-5xl font-bold text-center mb-8 text-neutral-700"
//         >
//           Welcome to <span className="text-amber-500">AITS ERP</span>
//         </motion.h1>
//         <p className="text-center text-lg max-w-2xl mx-auto mb-10">
//           Manage your sales, purchases, inventory, and business operations from one centralized, modern ERP platform.
//         </p>

//         <div className="flex justify-center gap-6">
//           <Link href="/signin">
//             <button className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition">
//               Sign In
//             </button>
//           </Link>
//           <Link href="/signup">
//             <button className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition">
//             Company Registration
//             </button>
//           </Link>

          
//         </div>

//           <h2 className="text-3xl font-bold text-center mb-8 text-neutral-700 p-8">
//           Key Features
//         </h2>
//         <div className="container mx-auto grid md:grid-cols-3 gap-10 text-center">
//           {[
//             { title:"Procure to Pay", desc: "Streamline your procurement and payment processes." },
//             { title: "Inventory", desc: "Real-time inventory tracking and alerts." },
//              { title: "Order to Cash", desc: "Manage your sales cycle from order to cash." },
//             { title: "Production", desc: "Optimize your production processes for better efficiency." },
//             { title: "CRM", desc: "Enhance customer relationships and support." },
//             { title: "Reports", desc: "Insightful reports for better decision making." },
            
           
          
//           ].map((feature, i) => (
//             <motion.div
//               key={i}
//               initial={{ opacity: 0, y: 30 }}
//               whileInView={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.2 }}
//               viewport={{ once: true }}
//               className="p-6 bg-indigo-50 rounded-xl shadow-md"
//             >
//               <h3 className="text-xl font-semibold mb-2 text-amber-500">{feature.title}</h3>
//               <p className="text-sm text-gray-600">{feature.desc}</p>
//             </motion.div>
//           ))}
//         </div>

//       </section>
//       {/* <section className="bg-white py-16">
//         <div className="container mx-auto text-center"> 
//           <h2 className="text-3xl font-bold mb-8 text-neutral-700">
//             Why Choose AITS ERP?
//           </h2>
   
      
//           <p className="text-lg max-w-2xl mx-auto mb-10">
//             Our ERP system is designed to streamline your business processes, enhance productivity, and provide real-time insights into your operations.
//           </p>  
//           <div className="flex justify-center gap-6">
//             <Link href="/features"> 
//               <button className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition">
//                 Explore Features
//               </button>
//             </Link>
//             <Link href="/contact">
//               <button className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition">
//                 Contact Us
//               </button>
//             </Link>
//           </div>
//         </div>
//       </section> */}

//       {/* <section className="bg-white py-16">
//         <h2 className="text-3xl font-bold text-center mb-8 text-neutral-700">
//           Key Features
//         </h2>
//         <div className="container mx-auto grid md:grid-cols-3 gap-10 text-center">
//           {[
//             { title:"Procure to Pay", desc: "Streamline your procurement and payment processes." },
//             { title: "Inventory", desc: "Real-time inventory tracking and alerts." },
//              { title: "Order to Cash", desc: "Manage your sales cycle from order to cash." },
//             { title: "Production", desc: "Optimize your production processes for better efficiency." },
//             { title: "CRM", desc: "Enhance customer relationships and support." },
//             { title: "Reports", desc: "Insightful reports for better decision making." },
            
           
          
//           ].map((feature, i) => (
//             <motion.div
//               key={i}
//               initial={{ opacity: 0, y: 30 }}
//               whileInView={{ opacity: 1, y: 0 }}
//               transition={{ delay: i * 0.2 }}
//               viewport={{ once: true }}
//               className="p-6 bg-indigo-50 rounded-xl shadow-md"
//             >
//               <h3 className="text-xl font-semibold mb-2 text-amber-500">{feature.title}</h3>
//               <p className="text-sm text-gray-600">{feature.desc}</p>
//             </motion.div>
//           ))}
//         </div>
//       </section> */}

//       <footer className="text-center py-6 text-sm text-gray-500">
//         &copy; 2025 AITS ERP. All rights reserved.
//       </footer>
//     </main>
//   );
// }






// 'use client';

// import Link from 'next/link';
// import { useState } from 'react';
// import {
//   FiUser,
//   FiBriefcase,
//   FiEye,
//   FiEyeOff,
//   FiTruck,
//   FiUsers,
// } from 'react-icons/fi';
// import axios from 'axios';

// export default function SignIn() {
//   const [role, setRole] = useState('Admin');
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [errors, setErrors] = useState({ email: '', password: '', general: '' });
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);

//   const validateEmail = (email) =>
//     /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });

//     if (name === 'email' && !validateEmail(value)) {
//       setErrors({ ...errors, email: 'Please enter a valid email address' });
//     } else if (name === 'password' && value === '') {
//       setErrors({ ...errors, password: 'Password cannot be empty' });
//     } else {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   const handleRoleChange = (newRole) => {
//     setRole(newRole);
//     setFormData({ email: '', password: '' });
//     setErrors({ email: '', password: '', general: '' });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!formData.email || !formData.password) {
//       setErrors({
//         email: !formData.email ? 'Email is required' : '',
//         password: !formData.password ? 'Password is required' : '',
//       });
//       return;
//     }

//     if (!validateEmail(formData.email)) {
//       setErrors({ ...errors, email: 'Please enter a valid email address' });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await axios.post('/api/signin', {
//         email: formData.email,
//         password: formData.password,
//         role,
//       });

//       const { token } = response.data;
//       document.cookie = `token=${token}; path=/; HttpOnly; Secure`;
//       localStorage.setItem('token', token);

//       const dashboardRedirects = {
//         Admin: '/admin',
//         Customer: '/customer-dashboard',
//         Agent: '/agent-dashboard',
//         Supplier: '/supplier-dashboard',
//       };

//       window.location.href = dashboardRedirects[role] || '/';
//     } catch (error) {
//       console.error('Login Error:', error.response?.data || error.message);
//       setErrors({ ...errors, general: 'Invalid credentials' });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors px-4">
//       <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
//         <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
//           Sign In As {role}
//         </h2>

//         <div className="mb-6 flex justify-center flex-wrap gap-3">
//           {[
//             { name: 'Admin', icon: <FiUser size={18} /> },
//             { name: 'Customer', icon: <FiBriefcase size={18} /> },
//             { name: 'Agent', icon: <FiUsers size={18} /> },
//             { name: 'Supplier', icon: <FiTruck size={18} /> },
//           ].map(({ name, icon }) => (
//             <button
//               key={name}
//               type="button"
//               className={`flex items-center space-x-2 py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 transition-colors ${
//                 role === name
//                   ? 'bg-blue-600 text-white shadow'
//                   : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
//               }`}
//               onClick={() => handleRoleChange(name)}
//             >
//               {icon}
//               <span>{name}</span>
//             </button>
//           ))}
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-5">
//           <div>
//             <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//               Email
//             </label>
//             <input
//               type="email"
//               id="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               className="w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
//           </div>

//           <div className="relative">
//             <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
//               Password
//             </label>
//             <input
//               type={showPassword ? 'text' : 'password'}
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               className="w-full px-4 py-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-[38px] text-gray-600 dark:text-gray-300"
//             >
//               {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
//             </button>
//             {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
//           </div>

//           {errors.general && <p className="text-red-500 text-center text-sm">{errors.general}</p>}

//           <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400 hover:underline">
//             <Link href="/forgetpassword">Forgot Password?</Link>
//           </div>

//           <button
//             type="submit"
//             disabled={isLoading}
//             className={`w-full py-2 rounded-md font-medium transition-colors ${
//               isLoading
//                 ? 'bg-gray-400 dark:bg-gray-600 text-white'
//                 : 'bg-blue-600 hover:bg-blue-700 text-white'
//             }`}
//           >
//             {isLoading ? 'Signing In...' : 'Sign In'}
//           </button>

//           {role !== 'Admin' && (
//             <div className="text-center text-sm text-gray-700 dark:text-gray-300">
//               Don't have an account?{' '}
//               <Link href="/signup" className="text-blue-600 hover:underline dark:text-blue-400">
//                 Create Account
//               </Link>
//             </div>
//           )}
//         </form>
//       </div>
//     </div>
//   );
// }




// // new code 14-12-2024
// 'use client';

// import Link from 'next/link';
// import { useState } from 'react';
// import { FiUser, FiBriefcase, FiEye, FiEyeOff, FiTruck, FiUsers } from 'react-icons/fi';
// import axios from 'axios';

// export default function SignIn() {
//   const [role, setRole] = useState('Admin'); // State to track selected role
//   const [formData, setFormData] = useState({ email: '', password: '' });
//   const [errors, setErrors] = useState({ email: '', password: '', general: '' });
//   const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
//   const [isLoading, setIsLoading] = useState(false); // State to manage loading indicator

//   const validateEmail = (email) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({ ...formData, [name]: value });

//     if (name === 'email' && !validateEmail(value)) {
//       setErrors({ ...errors, email: 'Please enter a valid email address' });
//     } else if (name === 'password' && value === '') {
//       setErrors({ ...errors, password: 'Password cannot be empty' });
//     } else {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   const handleRoleChange = (newRole) => {
//     setRole(newRole);
//     setFormData({ email: '', password: '' });
//     setErrors({ email: '', password: '', general: '' });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!formData.email || !formData.password) {
//       setErrors({
//         email: !formData.email ? 'Email is required' : '',
//         password: !formData.password ? 'Password is required' : '',
//       });
//       return;
//     }

//     if (!validateEmail(formData.email)) {
//       setErrors({ ...errors, email: 'Please enter a valid email address' });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await axios.post('/api/signin', {
//         email: formData.email,
//         password: formData.password,
//         role,
//       });

//       const { token } = response.data;
//       document.cookie = `token=${token}; path=/; HttpOnly; Secure`;
//       localStorage.setItem('token', token);

//       const dashboardRedirects = {
//         Admin: '/admin',
//         Customer: '/customer-dashboard',
//         Agent: '/agent-dashboard',
//         Supplier: '/supplier-dashboard',
//       };

//       window.location.href = dashboardRedirects[role] || '/';
//     } catch (error) {
//       console.error('Login Error:', error.response?.data || error.message);
//       setErrors({ ...errors, general: 'Invalid credentials' });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
//         <h2 className="text-2xl font-bold text-center mb-6">SignIn As {role}</h2>

//         {/* Role Selector */}
//         <div className="mb-6 flex justify-center space-x-4">
//           {[
//             { name: 'Admin', icon: <FiUser size={18} /> },
//             { name: 'Customer', icon: <FiBriefcase size={18} /> },
//             { name: 'Agent', icon: <FiUsers size={18} /> },
//             { name: 'Supplier', icon: <FiTruck size={18} /> },
//           ].map(({ name, icon }) => (
//             <button
//               key={name}
//               type="button"
//               className={`relative space-x-2 py-2 px-4 rounded-lg ${
//                 role === name ? 'bg-blue-600 text-white' : 'bg-gray-200'
//               }`}
//               onClick={() => handleRoleChange(name)}
//             >
//               {icon}
//             </button>
//           ))}
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label htmlFor="email" className="block text-sm font-medium text-gray-700">
//               Email
//             </label>
//             <input
//               type="email"
//               id="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
//           </div>

//           <div className="relative">
//             <label htmlFor="password" className="block text-sm font-medium text-gray-700">
//               Password
//             </label>
//             <input
//               type={showPassword ? 'text' : 'password'}
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-9 text-gray-600"
//             >
//               {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
//             </button>
//             {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
//           </div>

//           {errors.general && <p className="text-red-500 text-center">{errors.general}</p>}
//                      {/* Forgot Password */}
//           <Link href="/forgetpassword">
//             <div className="flex justify-between items-center">
//               <button
//                 type="button"
//                 className="text-sm text-blue-600 hover:underline"
//                 onClick={() => console.log('Forgot Password?')}
//               >
//                 Forgot Password?
//               </button>
//             </div>
//           </Link>
//           <button
//             type="submit"
//             disabled={isLoading}
//             className={`w-full py-2 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-blue-600'} text-white`}
//           >
//             {isLoading ? 'Signing In...' : 'Sign In'}
//           </button>
//           {/* Create Account for Customers */}
//         {role !== 'Admin' && (
//           <div className="mt-4 text-center">
//             <p className="text-sm">
//               Don't have an account?{' '}
//               <Link href="/signup">
//                 <button
//                   type="button"
//                   className="text-blue-600 hover:underline"
//                   onClick={() => console.log('Navigate to Create Account')}
//                 >
//                   Create Account
//                 </button>
//               </Link>
//             </p>
//           </div>
//         )}
//         </form>
//       </div>
//     </div>
//   );
// }



