


// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';

// export default function LoginPage() {
//   const router = useRouter();
//   const [mode, setMode] = useState('Company');         // 'Company' | 'User'
//   const [form, setForm] = useState({ email:'', password:'' });
//   const [show, setShow] = useState(false);
//   const [err, setErr] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handle = (e)=> setForm({ ...form, [e.target.name]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();
//     setErr('');
//     setLoading(true);
//     try {
//       const url = mode==='Company' ? '/api/company/login' : '/api/users/login';
//       const { data } = await axios.post(url, form);
      // localStorage.setItem('token', data.token);
      // localStorage.setItem('user', JSON.stringify(data.user));
//       router.push(mode==='Company' ? '/admin' : '/users');
//     } catch (ex) {
//       setErr(ex?.response?.data?.message || 'Login failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//         <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
//     {/* <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"> */}
//       <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6 ">
//         {/* Mode switch */}
//         <div className="flex justify-center gap-4">
//           {['Company','User'].map(m=>(
//             <button key={m}
//               onClick={()=>{setMode(m);setForm({email:'',password:''});}}
//               className={`${mode===m?'bg-amber-400 text-white':'bg-gray-200'} px-4 py-2 rounded-lg`}>
//               {m} Login
//             </button>
//           ))}
//         </div>

//         <h2 className="text-2xl font-bold text-center">{mode} Login</h2>

//         <form onSubmit={submit} className="space-y-4">
//           {/* email */}
//           <div>
//             <label className="block text-sm">Email</label>
//             <div className="relative">
//               <FiMail className="absolute left-3 top-3 text-gray-500"/>
//               <input type="email" name="email" value={form.email}
//                      onChange={handle}
//                      className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"/>
//             </div>
//           </div>

//           {/* password */}
//           <div>
//             <label className="block text-sm">Password</label>
//             <div className="relative">
//               <FiLock className="absolute left-3 top-3 text-gray-500"/>
//               <input type={show?'text':'password'} name="password" value={form.password}
//                      onChange={handle}
//                      className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"/>
//               <button type="button" onClick={()=>setShow(!show)}
//                 className="absolute right-3 top-3 text-gray-600">
//                 {show ? <FiEyeOff/> : <FiEye/>}
//               </button>
//             </div>
//           </div>

//           {err && <p className="text-center text-red-600 text-sm">{err}</p>}

//           <button disabled={loading}
//             className={`w-full py-2 rounded-md text-white ${loading?'bg-gray-400':'bg-amber-400 hover:bg-amber-600'}`}>
//             {loading?'Signing in…':'Sign In'}
//           </button>
//         </form>
//       </div>
//     {/* </div> */}
//     </main>
//   );
// }



'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState('Company');
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      const url =
        mode === "Company"
          ? "/api/company/login"
          : "/api/users/login";

      const res = await axios.post(url, form);

      const token = res?.data?.token;
      const company = res?.data?.company; // ✅ THIS IS CORRECT
      const user = res?.data?.user; // for user login case

      const finalUser = mode === "Company" ? company : user;

      if (!finalUser) {
        toast.error("Invalid login response");
        setLoading(false);
        return;
      }

      // Save into localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));

      toast.success("Login successful 🚀");

      // ✅ Redirect logic
      let redirect = "/";

      if (mode === "Company") {
        redirect = "/admin";
      } else {
        const roles = Array.isArray(finalUser?.roles)
          ? finalUser.roles.map(r => r.toLowerCase())
          : [];

        if (roles.includes("admin")) redirect = "/admin";
        else if (roles.includes("agent")) redirect = "/agent-dashboard";
        else if (roles.includes("employee")) redirect = "/employee-dashboard";
        else redirect = "/customer-dashboard";
      }

      setTimeout(() => {
        router.push(redirect);
      }, 800);

    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6">

        {/* Mode Switch */}
        <div className="flex justify-center gap-4">
          {['Company','User'].map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setForm({ email: '', password: '' });
              }}
              className={`px-4 py-2 rounded-lg ${
                mode === m
                  ? 'bg-amber-400 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {m} Login
            </button>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-center">
          {mode} Login
        </h2>

        <form onSubmit={submit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-500"/>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handle}
                className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-500"/>
              <input
                type={show ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handle}
                className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
                placeholder="Enter your password"
              />

              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-3 text-gray-600"
              >
                {show ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className={`w-full py-2 rounded-md text-white ${
              loading
                ? 'bg-gray-400'
                : 'bg-amber-400 hover:bg-amber-600'
            }`}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

        </form>
      </div>
    </main>
  );
}
