"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  User, Mail, Shield, LogOut, Pencil, Save, Lock, X, 
  Phone, MapPin, Briefcase, Users, Key, Star, Globe
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isContactLogin, setIsContactLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    emailId: "",
    mobileNumber: "",
  });

  const [passForm, setPassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // ===============================
  // 📡 FETCH FULL PROFILE DATA
  // ===============================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("user"));
        
        if (!token) return router.push("/signin");

        // Fetch fresh data using Bearer Token
        const res = await axios.get("/api/customers/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          const fullData = res.data.customer;
          setUser(fullData);

          // Role Detection Logic
          const currentLoginEmail = storedUser.email?.toLowerCase().trim();
          const primaryEmail = fullData.emailId?.toLowerCase().trim();
          const isSub = currentLoginEmail !== primaryEmail;
          setIsContactLogin(isSub);

          if (isSub) {
            const myData = fullData.contactEmails.find(c => c.email.toLowerCase() === currentLoginEmail);
            setForm({
              customerName: myData?.name || fullData.customerName,
              emailId: currentLoginEmail,
              mobileNumber: fullData.mobileNumber || "",
            });
          } else {
            setForm({
              customerName: fullData.customerName,
              emailId: fullData.emailId,
              mobileNumber: fullData.mobileNumber || "",
            });
          }
        }
      } catch (err) {
        console.error("Profile Load Error", err);
        if (err.response?.status === 401) handleLogout();
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/signin");
  };

  // const handlePasswordUpdate = async () => {
  //   if (passForm.newPassword !== passForm.confirmPassword) return alert("Passwords don't match");
  //   setUpdatingPass(true);
  //   try {
  //     const storedUser = JSON.parse(localStorage.getItem("user"));
  //     await axios.post("/api/customers/change-password", {
  //       email: storedUser.email, 
  //       currentPassword: passForm.currentPassword,
  //       newPassword: passForm.newPassword
  //     });
  //     alert("Password Updated! 🔐");
  //     setShowPassModal(false);
  //   } catch (err) {
  //     alert(err.response?.data?.message || "Error updating password");
  //   } finally {
  //     setUpdatingPass(false);
  //   }
  // };


  const handlePasswordUpdate = async () => {
  if (!passForm.currentPassword || !passForm.newPassword) {
    alert("Fields cannot be empty!");
    return;
  }
  
  setUpdatingPass(true);
  try {
    const token = localStorage.getItem("token");
    // 🔥 FIX: Local storage se wo email lo jisse login kiya tha
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const loginEmail = storedUser?.email; 

    const res = await axios.post("/api/customers/change-password", {
      email: loginEmail, // Important: This must be the login email
      currentPassword: passForm.currentPassword,
      newPassword: passForm.newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.success) {
      alert("Vault Security Updated! ✅");
      setShowPassModal(false);
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  } catch (err) {
    alert(err.response?.data?.message || "Vault update failed");
  } finally {
    setUpdatingPass(false);
  }
};
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-slate-50">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Vault</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-10 pb-24 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-[2rem] shadow-2xl text-white ${isContactLogin ? 'bg-blue-600' : 'bg-slate-900'}`}>
            {isContactLogin ? <User size={28} /> : <Shield size={28} />}
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              {isContactLogin ? "Staff Portal" : "Master Admin"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isContactLogin ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                Level: {isContactLogin ? "Sub-Account" : "Primary Account"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setShowPassModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95">
            <Lock size={16} /> Security
          </button>
          <button onClick={handleLogout} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-red-50 transition-all">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: IDENTITY & CONTACTS */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-xl rounded-[3rem] p-10 text-center relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-24 z-0 ${isContactLogin ? 'bg-blue-600' : 'bg-slate-900'}`}></div>
            <div className="relative z-10">
              <div className="bg-white p-1 rounded-full inline-block shadow-2xl mt-4">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-black ${isContactLogin ? 'bg-blue-500' : 'bg-amber-500'}`}>
                  {form.customerName?.charAt(0)}
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tighter">{form.customerName}</h2>
              <p className="text-slate-400 font-bold text-xs mt-1">{form.emailId}</p>
            </div>
          </div>

          {!isContactLogin && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <Users size={16} className="text-amber-500" /> Authorized Team
              </h3>
              <div className="space-y-3">
                {user?.contactEmails?.map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-amber-200 transition-all">
                    <div>
                      <p className="text-xs font-black text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{c.email}</p>
                    </div>
                    {c.isPrimary && <Star size={12} className="text-amber-500 fill-amber-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: CORE DATA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-[3rem] p-10">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
              <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
                <Briefcase size={22} className="text-amber-500" /> Account Identity
              </h3>
              {!isContactLogin && !editMode && (
                <button onClick={() => setEditMode(true)} className="bg-slate-50 text-slate-900 px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 flex items-center gap-2">
                  <Pencil size={12} /> Edit Entity
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {isContactLogin ? <User size={10}/> : <Globe size={10}/>} 
                    {isContactLogin ? "Access Persona" : "Legal Entity Name"}
                  </p>
                  <p className="text-xl font-black text-slate-900">{form.customerName}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global ERP Code</p>
                  <p className="text-xl font-black text-blue-600">{user?.customerCode}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Email Link</p>
                  <p className="text-lg font-bold text-slate-800 italic">{form.emailId}</p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication</p>
                  <p className="text-lg font-bold text-slate-800">{user?.mobileNumber || "Not Linked"}</p>
               </div>
            </div>
          </div>

          {!isContactLogin && (
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl shadow-slate-200">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Tax ID / GSTIN</p>
                  <p className="text-2xl font-black tracking-tight">{user?.gstNumber || "Unregistered"}</p>
               </div>
               <div className="h-px w-full md:w-px md:h-12 bg-slate-800"></div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Company PAN</p>
                  <p className="text-2xl font-black tracking-tight text-amber-500">{user?.pan || "PENDING"}</p>
               </div>
               <div className="h-px w-full md:w-px md:h-12 bg-slate-800"></div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Account Group</p>
                  <p className="text-2xl font-black tracking-tight">{user?.customerGroup || "General"}</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CHANGE PASSWORD */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Security Vault</h3>
              <button onClick={() => setShowPassModal(false)} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="space-y-5">
              <input type="password" placeholder="Current Secret Key" className="w-full p-5 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500" onChange={(e) => setPassForm({...passForm, currentPassword: e.target.value})} />
              <div className="h-px bg-slate-100 my-4"></div>
              <input type="password" placeholder="New Secret Key" className="w-full p-5 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500" onChange={(e) => setPassForm({...passForm, newPassword: e.target.value})} />
              <input type="password" placeholder="Confirm New Secret Key" className="w-full p-5 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-amber-500" onChange={(e) => setPassForm({...passForm, confirmPassword: e.target.value})} />
              <button disabled={updatingPass} onClick={handlePasswordUpdate} className={`w-full py-5 rounded-2xl font-black mt-6 transition-all shadow-xl text-white ${updatingPass ? 'bg-slate-300' : 'bg-amber-500 hover:bg-amber-600 active:scale-95'}`}>
                {updatingPass ? "Synchronizing Vault..." : "Establish New Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   User,
//   Mail,
//   Shield,
//   LogOut,
//   Pencil,
//   Save,
//   Lock
// } from "lucide-react";

// export default function ProfilePage() {
//   const router = useRouter();

//   const [user, setUser] = useState(null);
//   const [editMode, setEditMode] = useState(false);

//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//   });

//   useEffect(() => {
//     const u = localStorage.getItem("user");
//     if (u) {
//       const parsed = JSON.parse(u);
//       setUser(parsed);

//       setForm({
//         name: parsed.name || "",
//         email: parsed.email || "",
//       });
//     }
//   }, []);

//   const handleLogout = () => {
//     localStorage.clear();
//     router.push("/login");
//   };

//   const handleSave = () => {
//     const updated = { ...user, ...form };

//     // ✅ Save in local storage (you can connect API later)
//     localStorage.setItem("user", JSON.stringify(updated));
//     setUser(updated);

//     setEditMode(false);
//     alert("Profile updated ✅");
//   };

//   if (!user) {
//     return (
//       <div className="flex justify-center items-center py-32 text-gray-600">
//         Loading profile...
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-4xl mx-auto space-y-6">

//       {/* HEADER */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">
//           My Profile
//         </h1>

//         <button
//           onClick={handleLogout}
//           className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg"
//         >
//           <LogOut size={16} />
//           Logout
//         </button>
//       </div>

//       {/* PROFILE CARD */}
//       <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col md:flex-row gap-8">

//         {/* LEFT - AVATAR */}
//         <div className="flex flex-col items-center md:w-1/3 gap-4">

//           <div className="bg-blue-600 w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold">
//             {user?.name?.charAt(0) || "U"}
//           </div>

//           <h2 className="text-xl font-bold">
//             {user?.name}
//           </h2>

//           <span className="bg-gray-200 px-4 py-1 rounded-full text-sm">
//             {user?.roles?.join(", ") || "Customer"}
//           </span>
//         </div>


//         {/* RIGHT - DETAILS */}
//         <div className="flex-1 space-y-5">

//           {/* NAME */}
//           <div>
//             <label className="font-medium mb-1 flex items-center gap-2">
//               <User size={16} />
//               Full Name
//             </label>

//             {editMode ? (
//               <input
//                 type="text"
//                 className="w-full border p-2 rounded"
//                 value={form.name}
//                 onChange={(e) =>
//                   setForm({ ...form, name: e.target.value })
//                 }
//               />
//             ) : (
//               <p className="text-gray-700">
//                 {user.name}
//               </p>
//             )}
//           </div>


//           {/* EMAIL */}
//           <div>
//             <label className="font-medium mb-1 flex items-center gap-2">
//               <Mail size={16} />
//               Email
//             </label>

//             {editMode ? (
//               <input
//                 type="email"
//                 className="w-full border p-2 rounded"
//                 value={form.email}
//                 onChange={(e) =>
//                   setForm({ ...form, email: e.target.value })
//                 }
//               />
//             ) : (
//               <p className="text-gray-700">
//                 {user.email}
//               </p>
//             )}
//           </div>


//           {/* USER ID */}
//           <div>
//             <label className="font-medium mb-1 flex items-center gap-2">
//               <Shield size={16} />
//               User ID
//             </label>

//             <p className="text-gray-500 text-sm break-all">
//               {user.id}
//             </p>
//           </div>


//           {/* ACTIONS */}
//           <div className="pt-4 flex gap-4">

//             {editMode ? (
//               <button
//                 onClick={handleSave}
//                 className="flex gap-2 items-center bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
//               >
//                 <Save size={16} />
//                 Save
//               </button>
//             ) : (
//               <button
//                 onClick={() => setEditMode(true)}
//                 className="flex gap-2 items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
//               >
//                 <Pencil size={16} />
//                 Edit Profile
//               </button>
//             )}

//             <button
//               className="flex gap-2 items-center bg-gray-800 text-white px-6 py-2 rounded-lg"
//               onClick={() => alert("Coming Soon")}
//             >
//               <Lock size={16} />
//               Change Password
//             </button>

//           </div>
//         </div>
//       </div>

//     </div>
//   );
// }
