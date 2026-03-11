"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiEye, FiEyeOff, FiMail, FiLock, FiChevronRight, FiLoader, FiShield, FiUser, FiBriefcase } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const Link = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState('Company'); // Company | User | Customer
  const [step, setStep] = useState('login'); // login | email | setPassword
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Credentials required");

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

      toast.success(`Access Granted: ${finalUser.name || "User"}`);

      const roleRedirectMap = {
        admin: "/admin",
        agent: "/admin",
        employee: "/admin",
        customer: "/customer-dashboard",
      };

      let redirect = "/admin";
      if (mode === "Customer") {
        redirect = "/customer-dashboard";
      } else if (mode === "User") {
        const roles = finalUser?.roles?.map((r) => r.toLowerCase()) || [];
        const matchedRole = roles.find((r) => roleRedirectMap[r]);
        redirect = roleRedirectMap[matchedRole] || "/admin";
      }

      setTimeout(() => router.push(redirect), 500);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden font-sans">
      
      {/* ADVANCED BACKGROUND BLOBS */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full animate-pulse delay-700" />

      <ToastContainer position="top-center" theme="dark" />

      <div className="w-full max-w-[440px] z-10 px-6">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[22px] flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/20 mb-4 transition-transform hover:scale-110 duration-500">
             <FiShield className="text-white" />
          </div>
          <h1 className="text-white text-3xl font-black tracking-tighter uppercase">
            AITS <span className="text-indigo-500">Cloud</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Enterprise Resource Hub</p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#11111d] border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] rounded-[40px] overflow-hidden transition-all duration-500">
          
          {/* TAB SELECTOR */}
          <div className="flex p-2 bg-black/20 gap-1">
            {[
              { id: 'Company', icon: <FiBriefcase /> },
              { id: 'User', icon: <FiUser /> },
              { id: 'Customer', icon: <FiMail /> }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setForm({ email: '', password: '' });
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${
                  mode === m.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {m.icon} {m.id}
              </button>
            ))}
          </div>

          <div className="p-10 pt-8">
            <form onSubmit={submit} className="space-y-6">
              
              {/* EMAIL FIELD */}
              <div className="group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-indigo-400">Identity Identifier</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <FiMail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handle}
                    className="w-full bg-black/40 border-2 border-transparent focus:border-indigo-500/50 text-white pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 placeholder:text-slate-700 font-bold text-sm shadow-inner"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-indigo-400">Access Secret</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                    <FiLock size={18} />
                  </div>
                  <input
                    type={show ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    className="w-full bg-black/40 border-2 border-transparent focus:border-indigo-500/50 text-white pl-14 pr-14 py-4 rounded-2xl outline-none transition-all duration-300 placeholder:text-slate-700 font-bold text-sm shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-indigo-400 transition-colors"
                  >
                    {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              {/* FORGOT PASS */}
              <div className="flex justify-end px-1">
                <button type="button" className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">Forgot Secret Key?</button>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl overflow-hidden transition-all duration-300 active:scale-95 shadow-2xl shadow-indigo-500/20"
              >
                <div className="relative z-10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]">
                  {loading ? <FiLoader className="animate-spin" /> : "Authenticate Connection"}
                  {!loading && <FiChevronRight className="group-hover:translate-x-1 transition-transform" />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
            </form>

            {/* REGISTER LINK */}
            <div className="mt-8 text-center">
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
                New to the platform? <Link href="/signup" className="text-indigo-500 hover:text-indigo-400 underline decoration-2 underline-offset-4 ml-1">Establish Instance</Link>
              </p>
            </div>
          </div>

          {/* FOOTER STRIP */}
          <div className="bg-black/40 py-4 px-8 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">AITS v3.0.4</span>
            <div className="flex gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Servers Online</span>
            </div>
          </div>
        </div>

        {/* SECURITY NOTE */}
        <p className="text-slate-700 text-center mt-8 text-[9px] font-black uppercase tracking-[0.3em] leading-relaxed px-10">
          Encrypted with military-grade 256-bit AES protocol. Authorized access only.
        </p>
      </div>
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
