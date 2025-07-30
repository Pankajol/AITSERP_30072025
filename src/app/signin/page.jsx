'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('Company');         // 'Company' | 'User'
  const [form, setForm] = useState({ email:'', password:'' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e)=> setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const url = mode==='Company' ? '/api/company/login' : '/api/users/login';
      const { data } = await axios.post(url, form);
      localStorage.setItem('token', data.token);
      router.push(mode==='Company' ? '/admin' : '/users');
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
    {/* <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"> */}
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6 ">
        {/* Mode switch */}
        <div className="flex justify-center gap-4">
          {['Company','User'].map(m=>(
            <button key={m}
              onClick={()=>{setMode(m);setForm({email:'',password:''});}}
              className={`${mode===m?'bg-amber-400 text-white':'bg-gray-200'} px-4 py-2 rounded-lg`}>
              {m} Login
            </button>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-center">{mode} Login</h2>

        <form onSubmit={submit} className="space-y-4">
          {/* email */}
          <div>
            <label className="block text-sm">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-500"/>
              <input type="email" name="email" value={form.email}
                     onChange={handle}
                     className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"/>
            </div>
          </div>

          {/* password */}
          <div>
            <label className="block text-sm">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-500"/>
              <input type={show?'text':'password'} name="password" value={form.password}
                     onChange={handle}
                     className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"/>
              <button type="button" onClick={()=>setShow(!show)}
                className="absolute right-3 top-3 text-gray-600">
                {show ? <FiEyeOff/> : <FiEye/>}
              </button>
            </div>
          </div>

          {err && <p className="text-center text-red-600 text-sm">{err}</p>}

          <button disabled={loading}
            className={`w-full py-2 rounded-md text-white ${loading?'bg-gray-400':'bg-amber-400 hover:bg-amber-600'}`}>
            {loading?'Signing in…':'Sign In'}
          </button>
        </form>
      </div>
    {/* </div> */}
    </main>
  );
}




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
//         <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>

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

//           <button
//             type="submit"
//             disabled={isLoading}
//             className={`w-full py-2 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-blue-600'} text-white`}
//           >
//             {isLoading ? 'Signing In...' : 'Sign In'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }




// 'use client';

// import { useState } from 'react';
// import { FiEye, FiEyeOff } from 'react-icons/fi';

// export default function SignIn() {
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//   });

//   const [errors, setErrors] = useState({
//     email: '',
//     password: '',
//   });
//   const [passwordVisible, setPasswordVisible] = useState(false);

//   const validateEmail = (email) => {
//     const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
//     return emailPattern.test(email);
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: value,
//     });

//     // Validate email field
//     if (name === 'email' && !validateEmail(value)) {
//       setErrors({ ...errors, email: 'Please enter a valid email address' });
//     } else if (name === 'password' && value === '') {
//       setErrors({ ...errors, password: 'Password cannot be empty' });
//     } else {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   const handleSubmit = (e) => {
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

//     console.log('SignIn Form Submitted:', formData);
//     // Proceed with sign-in logic, such as API call
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
//         <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
//             <input
//               type="email"
//               id="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
//           </div>

//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
//             <input
//               type={passwordVisible ? 'text' : 'password'} // Toggle between password and text input
//               id="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//               className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               type="button"
//               onClick={() => setPasswordVisible(!passwordVisible)} // Toggle password visibility
//               className="absolute right-3 top-9 text-gray-600"
//             >
//               {passwordVisible ? <FiEyeOff size={20} /> : <FiEye size={20} />}
//             </button>
//             {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             Sign In
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
