"use client";

import { useState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiEye, FiEyeOff, FiMail, FiLock, FiChevronRight, FiLoader, FiShield, FiUser, FiBriefcase } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

const Link = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState('Company');
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  
// In your component:
const [logoError, setLogoError] = useState(false);
const [imageLoaded, setImageLoaded] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return toast.error("Credentials required");
    }

    setLoading(true);

    try {
      const urls = {
        Company: "/api/company/login",
        User: "/api/users/login",
        Customer: "/api/customers/login",
      };

      const res = await axios.post(urls[mode], form);

      const { token, company, user, customer } = res.data;
      const finalUser = company || user || customer;

      if (!token || !finalUser) throw new Error("Authentication failed");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast.success(`Access Granted: ${finalUser.name || "User"}`);

      let redirect = "/admin";

      if (mode === "Customer") {
        redirect = "/customer-dashboard";
      } else if (mode === "User") {
        const roles = finalUser?.roles?.map((r) => r.toLowerCase()) || [];
        if (roles.includes("employee")) {
          redirect = "/admin/hr/employees";
        } else if (roles.includes("admin")) {
          redirect = "/admin";
        }
      }

      router.push(redirect);

    } catch (error) {
      toast.error(error?.response?.data?.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#105B92' }}>
      
      {/* Animated Background - Lighter overlays for depth */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-pulse animation-delay-4000" />
      </div>

      <ToastContainer position="top-center" theme="light" />

      <div className="w-full max-w-md z-10 px-6">
        



<div className="flex flex-col items-center mb-6 sm:mb-8">
  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 transition-all duration-300 hover:scale-105 overflow-hidden relative">
    
    {/* Show loading spinner while image loads */}
    {!imageLoaded && !logoError && (
      <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
        <div className="w-6 h-6 border-2 border-[#105B92] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
    
    {/* Attempt to load image */}
    {!logoError ? (
      <img
        src="/logo2_erpexpress.png"
        alt="ERP Express Logo"
        className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setLogoError(true)}
      />
    ) : (
      /* Fallback 1: Text logo */
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#105B92] to-[#0a3b60] rounded-2xl">
        <span className="text-white font-bold text-2xl sm:text-3xl">ERP</span>
      </div>
    )}
  </div>
  
  {/* Fallback 2: If image fails and you want to show an icon instead */}
  {logoError && (
    <div className="mt-2 text-center">
      <span className="text-blue-100 text-xs">Logo not loaded, using text version</span>
    </div>
  )}
  
  {/* <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">
    AITS <span className="text-blue-200">Cloud</span>
  </h1>
  <p className="text-blue-100 text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-1 text-center">
    Enterprise Resource Hub
  </p> */}
</div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100/50 gap-1">
            {[
              { id: 'Company', icon: <FiBriefcase size={14} /> },
              { id: 'User', icon: <FiUser size={14} /> },
              { id: 'Customer', icon: <FiMail size={14} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setForm({ email: '', password: '' });
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  mode === tab.id 
                    ? 'text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
                style={mode === tab.id ? { backgroundColor: '#105B92' } : {}}
              >
                {tab.icon} {tab.id}
              </button>
            ))}
          </div>

          <div className="p-6">
            <form onSubmit={submit} className="space-y-5">
              
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiMail size={16} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handle}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#105B92] focus:border-transparent transition"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock size={16} />
                  </div>
                  <input
                    type={show ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#105B92] focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button type="button" className="text-xs font-medium" style={{ color: '#105B92' }}>
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#105B92' }}
              >
                {loading ? <FiLoader className="animate-spin" size={18} /> : <span>Sign In</span>}
                {!loading && <FiChevronRight size={16} />}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center text-xs text-gray-500">
              New to the platform?{' '}
              <Link href="/signup" className="font-semibold" style={{ color: '#105B92' }}>
                Create an account
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
            <span className="text-gray-400">AITS v3.0.4</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-400">Servers Online</span>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-center text-blue-100 text-[10px] uppercase tracking-wider mt-6">
          🔒 256-bit AES encryption • Authorized access only
        </p>
      </div>

      {/* Add custom delay classes for Tailwind */}
      <style jsx>{`
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </main>
  );
}
// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function LoginPage() {
//   const router = useRouter();

//   const [mode, setMode] = useState('Company');
//   const [form, setForm] = useState({ email: '', password: '' });
//   const [show, setShow] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     if (!form.email || !form.password) {
//       toast.error("Email and password are required");
//       setLoading(false);
//       return;
//     }

//     try {
//       const url =
//         mode === "Company"
//           ? "/api/company/login"
//           : "/api/users/login";

//       const res = await axios.post(url, form);

//       const token = res?.data?.token;
//       const company = res?.data?.company; // ✅ THIS IS CORRECT
//       const user = res?.data?.user; // for user login case

//       const finalUser = mode === "Company" ? company : user;

//       if (!finalUser) {
//         toast.error("Invalid login response");
//         setLoading(false);
//         return;
//       }

//       // Save into localStorage
//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(finalUser));

//       toast.success("Login successful 🚀");

//       // ✅ Redirect logic
//       let redirect = "/";

//       if (mode === "Company") {
//         redirect = "/admin";
//       } else {
//         const roles = Array.isArray(finalUser?.roles)
//           ? finalUser.roles.map(r => r.toLowerCase())
//           : [];

//         if (roles.includes("admin")) redirect = "/admin";
//         else if (roles.includes("agent")) redirect = "/agent-dashboard";
//         else if (roles.includes("employee")) redirect = "/employee-dashboard";
//         else redirect = "/customer-dashboard";
//       }

//       setTimeout(() => {
//         router.push(redirect);
//       }, 800);

//     } catch (error) {
//       toast.error(
//         error?.response?.data?.message ||
//         "Invalid email or password"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
//       <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6">

//         {/* Mode Switch */}
//         <div className="flex justify-center gap-4">
//           {['Company','User'].map(m => (
//             <button
//               key={m}
//               onClick={() => {
//                 setMode(m);
//                 setForm({ email: '', password: '' });
//               }}
//               className={`px-4 py-2 rounded-lg ${
//                 mode === m
//                   ? 'bg-amber-400 text-white'
//                   : 'bg-gray-200 text-gray-700'
//               }`}
//             >
//               {m} Login
//             </button>
//           ))}
//         </div>

//         <h2 className="text-2xl font-bold text-center">
//           {mode} Login
//         </h2>

//         <form onSubmit={submit} className="space-y-4">

//           {/* Email */}
//           <div>
//             <label className="block text-sm">Email</label>
//             <div className="relative">
//               <FiMail className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type="email"
//                 name="email"
//                 value={form.email}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your email"
//               />
//             </div>
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm">Password</label>
//             <div className="relative">
//               <FiLock className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type={show ? "text" : "password"}
//                 name="password"
//                 value={form.password}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your password"
//               />

//               <button
//                 type="button"
//                 onClick={() => setShow(!show)}
//                 className="absolute right-3 top-3 text-gray-600"
//               >
//                 {show ? <FiEyeOff /> : <FiEye />}
//               </button>
//             </div>
//           </div>

//           <button
//             disabled={loading}
//             className={`w-full py-2 rounded-md text-white ${
//               loading
//                 ? 'bg-gray-400'
//                 : 'bg-amber-400 hover:bg-amber-600'
//             }`}
//           >
//             {loading ? 'Signing in…' : 'Sign In'}
//           </button>

//         </form>
//       </div>
//     </main>
//   );
// }
