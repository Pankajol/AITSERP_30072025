"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Ticket,
  User,
  LogOut,
  ChevronRight,
  Bell
} from "lucide-react";

export default function HelpdeskLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname(); // To detect active route
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    else router.push("/signin"); // Redirect if not logged in
  }, [router]);

  const logout = () => {
    localStorage.clear();
    router.push("/signin");
  };

  // Helper for active button styling
  const isActive = (path) => pathname === path;

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-72 bg-slate-950 text-white hidden md:flex flex-col border-r border-slate-800 relative z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Ticket size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter">SUPPORT<span className="text-blue-500">.</span></h2>
          </div>

          <nav className="space-y-2">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Overview" 
              active={isActive("/customer-dashboard/helpdesk")} 
              onClick={() => router.push("/customer-dashboard/helpdesk")} 
            />
            <NavItem 
              icon={<Ticket size={20} />} 
              label="My Tickets" 
              active={isActive("/customer-dashboard/helpdesk/tickets")} 
              onClick={() => router.push("/customer-dashboard/helpdesk/tickets")} 
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label="Resolution Report" 
              active={isActive("/customer-dashboard/helpdesk/report")} 
              onClick={() => router.push("/customer-dashboard/helpdesk/report")} 
            />
            <div className="my-6 border-t border-slate-800/50 pt-6">
              <NavItem 
                icon={<User size={20} />} 
                label="Profile Settings" 
                active={isActive("/customer-dashboard/profile")} 
                onClick={() => router.push("/customer-dashboard/profile")} 
              />
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800/50 bg-slate-900/50">
          <button
            onClick={logout}
            className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold group"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} /> 
              <span>Sign Out</span>
            </div>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
          </button>
        </div>
      </aside>


      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* --------- Modern Top Navbar --------- */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex justify-between items-center sticky top-0 z-10">
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Portal Access</p>
            <h1 className="text-lg font-bold text-slate-800">
              Welcome back, {user?.name?.split(' ')[0] || "Guest"}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {/* Notifications */}
            <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-10 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push("/customer-dashboard/profile")}>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || "User Account"}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Customer</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white w-10 h-10 flex items-center justify-center rounded-2xl font-black shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0) || "U"}
              </div>
            </div>
          </div>
        </header>


        {/* --------- Scrollable Body --------- */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          <div className="animate-in fade-in duration-500">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

/* ================= SUB-COMPONENT FOR CLEANER CODE ================= */
function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
        active 
        ? "bg-blue-600 text-white shadow-xl shadow-blue-900/20" 
        : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className={active ? "text-white" : "text-slate-500 group-hover:text-blue-400"}>
          {icon}
        </span>
        <span className="text-sm font-bold tracking-wide">{label}</span>
      </div>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
    </button>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   LayoutDashboard,
//   FileText,
//   Ticket,
//   User,
//   LogOut,
// } from "lucide-react";

// export default function HelpdeskLayout({ children }) {
//   const router = useRouter();
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     const u = localStorage.getItem("user");
//     if (u) setUser(JSON.parse(u));
//   }, []);

//   const logout = () => {
//     localStorage.clear();
//     router.push("/signin");
//   };

//   return (
//     <div className="flex min-h-screen bg-gray-100">

//       {/* ================= SIDEBAR ================= */}
//       <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col">
//         <h2 className="text-2xl font-bold mb-10">Helpdesk</h2>

//         <nav className="space-y-3 flex-1">

//           {/* <button
//             onClick={() => router.push("/customer-dashboard/helpdesk")}
//             className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600"
//           >
//             <LayoutDashboard size={18} /> Dashboard
//           </button> */}

        

//           <button
//             onClick={() => router.push("/customer-dashboard/helpdesk/tickets")}
//             className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
//           >
//             <Ticket size={18} /> My Tickets
//           </button>
//             <button
//             onClick={() => router.push("/customer-dashboard/helpdesk/report")}
//             className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
//           >
//             <FileText size={18} /> Report
//           </button>

//           <button
//             onClick={() => router.push("/customer-dashboard/profile")}
//             className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
//           >
//             <User size={18} /> My Profile
//           </button>

//         </nav>

//         <button
//           onClick={logout}
//           className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg mt-6"
//         >
//           <LogOut size={16} /> Logout
//         </button>
//       </aside>


//       {/* ================= MAIN SECTION ================= */}
//       <div className="flex-1 flex flex-col">

//         {/* --------- Top Navbar --------- */}
//         <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
//           <h1 className="text-xl font-bold">
//             Customer Helpdesk Dashboard
//           </h1>

//           <div className="flex items-center gap-3">
//             <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full font-bold">
//               {user?.name?.charAt(0) || "U"}
//             </div>

//             <p className="text-gray-700 font-medium">
//               {user?.name || "Guest"}
//             </p>
//           </div>
//         </header>


//         {/* --------- Page Content --------- */}
//         <main className="flex-1 p-6">
//           {children}
//         </main>

//       </div>
//     </div>
//   );
// }
