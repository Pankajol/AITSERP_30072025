// app/(dashboard)/election/layout.js
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
  FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu,
  FiUpload, FiList, FiCheckSquare, FiTrendingUp, FiShield, FiLogOut,
  FiChevronDown, FiUser, FiKey, FiArrowLeft
} from "react-icons/fi";
import NotificationBell from "@/components/election/NotificationBell";

const sidebarItems = [
  // Dashboard – sabko dikhega
  { href: "/election", label: "Dashboard", icon: FiLayout, requiredRoles: [] },

  // Parties – sirf Admin/Manager
  { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag, requiredRoles: ["Election Admin", "Election Manager"] },

  // Constituencies – Admin/Manager/Analyst
  { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"] },

  // Booths – Admin/Manager/Agent (Booth Worker nahi)
  { href: "/election/booths", label: "Booths", icon: FiHome, requiredRoles: ["Election Admin", "Election Manager", "Election Agent"] },

  // Voters – Admin/Manager/Agent/Booth Worker/Surveyor/Analyst
  { href: "/election/voters", label: "Voters", icon: FiUsers, requiredRoles: ["Election Admin", "Election Manager", "Election Agent", "Booth Worker", "Surveyor", "Election Analyst"] },

  // Import Voters – sirf Admin/Manager
  { href: "/election/voter-import", label: "Import Voters", icon: FiUpload, requiredRoles: ["Election Admin", "Election Manager"] },

  // Workers – sirf Admin/Manager (worker list aur assignment)
  { href: "/election/workers", label: "Workers", icon: FiUserCheck, requiredRoles: ["Election Admin", "Election Manager"] },

  // Worker Activity – Admin/Manager/Agent
  { href: "/election/worker-activity", label: "Worker Activity", icon: FiList, requiredRoles: ["Election Admin", "Election Manager", "Election Agent"] },

  // Surveys – Admin/Manager/Surveyor
  { href: "/election/surveys", label: "Surveys", icon: FiClipboard, requiredRoles: ["Election Admin", "Election Manager", "Surveyor"] },

  // Fill Survey – Admin/Manager/Surveyor/Agent
  { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare, requiredRoles: ["Election Admin", "Election Manager", "Surveyor", "Election Agent","Booth Worker"] },

  // Rallies – Admin/Manager/Campaign Manager
  { href: "/election/rallies", label: "Rallies & Events", icon: FiMic, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"] },

  // Expenses – Admin/Manager
  { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign, requiredRoles: ["Election Admin", "Election Manager"] },

  // Media Campaigns – Admin/Manager/Campaign Manager
  { href: "/election/media", label: "Media Campaigns", icon: FiRadio, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"] },

  // Analytics – Admin/Manager/Analyst
  { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"] },
];

function decodeTokenPayload(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const routeLabels = {
  "/election": "Dashboard",
  "/election/parties": "Parties / Candidates",
  "/election/constituencies": "Constituencies",
  "/election/booths": "Booths",
  "/election/voters": "Voters",
  "/election/voter-import": "Import Voters",
  "/election/workers": "Workers",
  "/election/worker-activity": "Worker Activity",
  "/election/surveys": "Surveys",
  "/election/survey-response": "Fill Survey",
  "/election/rallies": "Rallies & Events",
  "/election/expenses": "Election Expenses",
  "/election/media": "Media Campaigns",
  "/election/analytics": "Analytics",
  "/election/profile": "Profile",
  "/election/change-password": "Change Password",
};

function getLabelFromPath(path) {
  if (!path) return "Dashboard";
  if (routeLabels[path]) return routeLabels[path];
  const segment = path.split("/").pop() || "Dashboard";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getParentPath(path) {
  if (!path || path === "/election") return null;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return "/election";
  return `/${segments.slice(0, segments.length - 1).join("/")}`;
}

function UserMenu({ user: layoutUser }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({ name: "", email: "" });
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const parsed = stored ? JSON.parse(stored) : {};
      setUser({
        name: parsed.contactName || parsed.companyName || parsed.name || layoutUser?.name || "User",
        email: parsed.email || layoutUser?.email || "",
      });
    } catch {
      setUser({
        name: layoutUser?.name || "User",
        email: layoutUser?.email || "",
      });
    }
  }, [layoutUser]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/signin");
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
          {initials || "U"}
        </div>
        <span className="hidden sm:inline-block max-w-[140px] truncate">{user.name}</span>
        <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <Link
            href="/election/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <FiUser className="text-base" /> My Profile
          </Link>
          <Link
            href="/election/change-password"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <FiKey className="text-base" /> Change Password
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
          >
            <FiLogOut className="text-base" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function ElectionLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    const payload = decodeTokenPayload(token);
    if (!payload) {
      setLoading(false);
      return;
    }
    let userObj = {
      id: payload.id,
      email: payload.email,
      type: payload.type,
      companyId: payload.companyId,
      name: payload.companyName || payload.name,
      roles: payload.roles || [],
    };
    if (payload.type === "company") {
      userObj.type = "company";
      userObj.roles = [];
    }
    setUser(userObj);
    setLoading(false);
  }, []);

  const isFullAccess = user?.type === "company" || user?.roles?.includes("Admin") || user?.roles?.includes("admin") || user?.roles?.includes("Election Admin");
  
  const visibleItems = sidebarItems.filter(item => {
    if (!user) return false;
    if (isFullAccess) return true;
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    const userRoles = user.roles || [];
    return item.requiredRoles.some(role => userRoles.includes(role));
  });

  // Guard page access
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/signin");
      return;
    }
    const currentItem = sidebarItems.find(item => item.href === pathname);
    if (currentItem) {
      let hasAccess = false;
      if (isFullAccess) hasAccess = true;
      else if (!currentItem.requiredRoles || currentItem.requiredRoles.length === 0) hasAccess = true;
      else hasAccess = currentItem.requiredRoles.some(role => (user.roles || []).includes(role));
      if (!hasAccess) router.push("/election");
    }
  }, [pathname, user, loading, router, isFullAccess]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const currentLabel = getLabelFromPath(pathname);
  const parentPath = getParentPath(pathname);
  const backLabel = parentPath ? getLabelFromPath(parentPath) : null;

  return (
    <div className="flex h-screen bg-gray-50" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <ToastContainer position="top-right" autoClose={5000} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center h-16 px-6 border-b">
          <FiFlag className="h-6 w-6 text-indigo-600" />
          <span className="ml-2 font-bold text-lg text-gray-800">Election Hub</span>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <FiShield className="text-gray-400" />
            <span className="truncate">{user.name || user.email || "User"}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {(user.roles || []).slice(0, 2).map(role => (
              <span key={role} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px]">
                {role}
              </span>
            ))}
            {(user.roles || []).length > 2 && <span className="text-[10px]">+{(user.roles || []).length-2}</span>}
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu className="h-5 w-5" />
            </button>
            {parentPath && (
              <button
                onClick={() => router.push(parentPath)}
                className="hidden sm:flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <FiArrowLeft className="h-4 w-4" />
                Back to {backLabel}
              </button>
            )}
          </div>
          <div className="flex-1 text-center">
            <h2 className="font-semibold text-lg truncate">{currentLabel}</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6" style={{ paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}



// // app/(dashboard)/election/layout.js
// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import {
//   FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
//   FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu, FiX,
//   FiUpload, FiList, FiCheckSquare, FiTrendingUp, FiShield
// } from "react-icons/fi";

// const sidebarItems = [
//   { href: "/election", label: "Dashboard", icon: FiLayout, requiredRoles: [] },
//   { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag, requiredRoles: ["Election Admin", "Election Manager"] },
//   { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"] },
//   { href: "/election/booths", label: "Booths", icon: FiHome, requiredRoles: ["Election Admin", "Election Manager", "Election Agent", "Booth Worker"] },
//   { href: "/election/voters", label: "Voters", icon: FiUsers, requiredRoles: ["Election Admin", "Election Manager", "Election Agent", "Booth Worker", "Surveyor", "Election Analyst"] },
//   { href: "/election/voter-import", label: "Import Voters", icon: FiUpload, requiredRoles: ["Election Admin", "Election Manager"] },
//   { href: "/election/workers", label: "Workers", icon: FiUserCheck, requiredRoles: ["Election Admin", "Election Manager"] },
//   { href: "/election/worker-activity", label: "Worker Activity", icon: FiList, requiredRoles: ["Election Admin", "Election Manager", "Election Agent"] },
//   { href: "/election/surveys", label: "Surveys", icon: FiClipboard, requiredRoles: ["Election Admin", "Election Manager", "Surveyor"] },
//   { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare, requiredRoles: ["Election Admin", "Election Manager", "Surveyor", "Election Agent"] },
//   { href: "/election/rallies", label: "Rallies & Events", icon: FiMic, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"] },
//   { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign, requiredRoles: ["Election Admin", "Election Manager"] },
//   { href: "/election/media", label: "Media Campaigns", icon: FiRadio, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"] },
//   { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"] },
// ];

// function decodeTokenPayload(token) {
//   if (!token) return null;
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     return JSON.parse(atob(base64));
//   } catch {
//     return null;
//   }
// }

// export default function ElectionLayout({ children }) {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const pathname = usePathname();
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }
//     const payload = decodeTokenPayload(token);
//     if (!payload) {
//       setLoading(false);
//       return;
//     }
//     // Build user object from token payload
//     let userObj = {
//       id: payload.id,
//       email: payload.email,
//       type: payload.type,
//       companyId: payload.companyId,
//       name: payload.companyName || payload.name,
//       roles: payload.roles || [],
//     };
//     // If token says company, ensure type is "company" and roles empty
//     if (payload.type === "company") {
//       userObj.type = "company";
//       userObj.roles = [];
//     }
//     setUser(userObj);
//     setLoading(false);
//   }, []);

//   // Full access for company users (type === "company") or admins
//   const isFullAccess = user?.type === "company" || user?.roles?.includes("Admin") || user?.roles?.includes("admin") || user?.roles?.includes("Election Admin");
  
//   const visibleItems = sidebarItems.filter(item => {
//     if (!user) return false;
//     if (isFullAccess) return true; // company/admin sees all
//     if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
//     const userRoles = user.roles || [];
//     return item.requiredRoles.some(role => userRoles.includes(role));
//   });

//   // Guard page access
//   useEffect(() => {
//     if (loading) return;
//     if (!user) {
//       router.push("/login");
//       return;
//     }
//     const currentItem = sidebarItems.find(item => item.href === pathname);
//     if (currentItem) {
//       let hasAccess = false;
//       if (isFullAccess) hasAccess = true;
//       else if (!currentItem.requiredRoles || currentItem.requiredRoles.length === 0) hasAccess = true;
//       else hasAccess = currentItem.requiredRoles.some(role => (user.roles || []).includes(role));
//       if (!hasAccess) router.push("/election");
//     }
//   }, [pathname, user, loading, router, isFullAccess]);

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }
//   if (!user) return null;

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-40 bg-black/50 lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}
//       <aside
//         className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
//           sidebarOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <div className="flex items-center h-16 px-6 border-b">
//           <FiFlag className="h-6 w-6 text-indigo-600" />
//           <span className="ml-2 font-bold text-lg text-gray-800">Election Hub</span>
//         </div>
//         <nav className="mt-4 space-y-1 px-3">
//           {visibleItems.map((item) => {
//             const isActive = pathname === item.href;
//             const Icon = item.icon;
//             return (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
//                   isActive
//                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                     : "text-gray-600 hover:bg-gray-100"
//                 }`}
//                 onClick={() => setSidebarOpen(false)}
//               >
//                 <Icon className="h-4 w-4" />
//                 {item.label}
//               </Link>
//             );
//           })}
//         </nav>
//         <div className="absolute bottom-0 left-0 right-0 p-4 border-t text-xs text-gray-500">
//           <div className="flex items-center gap-2">
//             <FiShield className="text-gray-400" />
//             <span className="truncate">{user.name || user.email || "User"}</span>
//           </div>
//           <div className="flex flex-wrap gap-1 mt-1">
//             {(user.roles || []).slice(0, 2).map(role => (
//               <span key={role} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px]">
//                 {role}
//               </span>
//             ))}
//             {(user.roles || []).length > 2 && <span className="text-[10px]">+{(user.roles || []).length-2}</span>}
//           </div>
//         </div>
//       </aside>
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="sticky top-0 z-30 flex items-center h-16 px-4 border-b bg-white">
//           <button
//             className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
//             onClick={() => setSidebarOpen(true)}
//           >
//             <FiMenu className="h-5 w-5" />
//           </button>
//           <h2 className="font-semibold text-lg truncate capitalize">
//             {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
//           </h2>
//         </header>
//         <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
//       </div>
//     </div>
//   );
// }


// // app/(dashboard)/election/layout.js
// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import {
//   FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
//   FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu, FiX,
//   FiUpload, FiList, FiCheckSquare, FiTrendingUp, FiShield
// } from "react-icons/fi";

// // Define which modules (permissions) are required for each sidebar item
// const itemAccessMap = {
//   "/election": ["Election Dashboard"],
//   "/election/parties": ["Election Admin", "Election Manager"],  // parties/candidates management
//   "/election/constituencies": ["Election Admin", "Election Manager", "Election Analyst"],
//   "/election/booths": ["Election Admin", "Election Manager", "Election Agent", "Booth Worker"],
//   "/election/voters": ["Election Admin", "Election Manager", "Election Agent", "Booth Worker", "Surveyor", "Election Analyst"],
//   "/election/voter-import": ["Election Admin", "Election Manager"],
//   "/election/workers": ["Election Admin", "Election Manager"],  // party workers management
//   "/election/worker-activity": ["Election Admin", "Election Manager", "Election Agent"],
//   "/election/surveys": ["Election Admin", "Election Manager", "Surveyor"],
//   "/election/survey-response": ["Election Admin", "Election Manager", "Surveyor", "Election Agent"],
//   "/election/rallies": ["Election Admin", "Election Manager", "Campaign Manager"],
//   "/election/expenses": ["Election Admin", "Election Manager"],
//   "/election/media": ["Election Admin", "Election Manager", "Campaign Manager"],
//   "/election/analytics": ["Election Admin", "Election Manager", "Election Analyst"],
// };

// // Helper to check if user has any of the required roles
// function hasRequiredRole(userRoles, requiredRoles) {
//   if (!userRoles || !requiredRoles) return false;
//   if (requiredRoles.length === 0) return true; // no restriction
//   return requiredRoles.some(role => userRoles.includes(role));
// }

// // Helper to check if user has a specific module enabled (from modules/permissions)
// function hasModuleAccess(userModules, moduleName) {
//   if (!userModules) return false;
//   // moduleName is like "Voters" – check if any module object has selected true and matches
//   return Object.values(userModules).some(mod => mod.selected && mod.name === moduleName);
// }

// const sidebarItems = [
//   { href: "/election", label: "Dashboard", icon: FiLayout, requiredRoles: [], requiredModules: [] },
//   { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag, requiredRoles: ["Election Admin", "Election Manager"], requiredModules: [] },
//   { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"], requiredModules: [] },
//   { href: "/election/booths", label: "Booths", icon: FiHome, requiredRoles: ["Election Admin", "Election Manager", "Election Agent", "Booth Worker"], requiredModules: [] },
//   { href: "/election/voters", label: "Voters", icon: FiUsers, requiredRoles: ["Election Admin", "Election Manager", "Election Agent", "Booth Worker", "Surveyor", "Election Analyst"], requiredModules: [] },
//   { href: "/election/voter-import", label: "Import Voters", icon: FiUpload, requiredRoles: ["Election Admin", "Election Manager"], requiredModules: [] },
//   { href: "/election/workers", label: "Workers", icon: FiUserCheck, requiredRoles: ["Election Admin", "Election Manager"], requiredModules: [] },
//   { href: "/election/worker-activity", label: "Worker Activity", icon: FiList, requiredRoles: ["Election Admin", "Election Manager", "Election Agent"], requiredModules: [] },
//   { href: "/election/surveys", label: "Surveys", icon: FiClipboard, requiredRoles: ["Election Admin", "Election Manager", "Surveyor"], requiredModules: [] },
//   { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare, requiredRoles: ["Election Admin", "Election Manager", "Surveyor", "Election Agent"], requiredModules: [] },
//   { href: "/election/rallies", label: "Rallies & Events", icon: FiMic, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"], requiredModules: [] },
//   { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign, requiredRoles: ["Election Admin", "Election Manager"], requiredModules: [] },
//   { href: "/election/media", label: "Media Campaigns", icon: FiRadio, requiredRoles: ["Election Admin", "Election Manager", "Campaign Manager"], requiredModules: [] },
//   { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp, requiredRoles: ["Election Admin", "Election Manager", "Election Analyst"], requiredModules: [] },
// ];

// export default function ElectionLayout({ children }) {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [user, setUser] = useState(null);
//   const [userRoles, setUserRoles] = useState([]);
//   const [userModules, setUserModules] = useState({});
//   const [loading, setLoading] = useState(true);
//   const pathname = usePathname();
//   const router = useRouter();

//   // Load user from localStorage on mount
//   useEffect(() => {
//     const storedUser = localStorage.getItem("user");
//     if (storedUser) {
//       try {
//         const parsed = JSON.parse(storedUser);
//         setUser(parsed);
//         setUserRoles(parsed?.roles || []);
//         setUserModules(parsed?.modules || {});
//       } catch (e) {
//         console.error("Failed to parse user", e);
//       }
//     }
//     setLoading(false);
//   }, []);

//   // Filter sidebar items based on user roles
//   const visibleItems = sidebarItems.filter(item => {
//     // If no roles required, show to everyone
//     if (item.requiredRoles.length === 0) return true;
//     // Otherwise check if user has at least one required role
//     return item.requiredRoles.some(role => userRoles.includes(role));
//   });

//   // Permission guard for current page
//   useEffect(() => {
//     if (loading) return;
//     if (!user) {
//       // No user logged in, redirect to login
//       router.push("/login");
//       return;
//     }
//     // Find the item for current path
//     const currentItem = sidebarItems.find(item => item.href === pathname);
//     if (currentItem && currentItem.requiredRoles.length > 0) {
//       const hasAccess = currentItem.requiredRoles.some(role => userRoles.includes(role));
//       if (!hasAccess) {
//         // Redirect to election dashboard or show forbidden
//         router.push("/election");
//       }
//     }
//   }, [pathname, user, userRoles, loading, router]);

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }

//   if (!user) {
//     return null; // will redirect
//   }

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Mobile overlay */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-40 bg-black/50 lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
//           sidebarOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <div className="flex items-center h-16 px-6 border-b">
//           <FiFlag className="h-6 w-6 text-indigo-600" />
//           <span className="ml-2 font-bold text-lg text-gray-800">Election Hub</span>
//         </div>
//         <nav className="mt-4 space-y-1 px-3">
//           {visibleItems.map((item) => {
//             const isActive = pathname === item.href;
//             const Icon = item.icon;
//             return (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
//                   isActive
//                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                     : "text-gray-600 hover:bg-gray-100"
//                 }`}
//                 onClick={() => setSidebarOpen(false)}
//               >
//                 <Icon className="h-4 w-4" />
//                 {item.label}
//               </Link>
//             );
//           })}
//         </nav>
//         {/* Optional: show user info at bottom */}
//         <div className="absolute bottom-0 left-0 right-0 p-4 border-t text-xs text-gray-500">
//           <div className="flex items-center gap-2">
//             <FiShield className="text-gray-400" />
//             <span className="truncate">{user?.name || user?.email || "User"}</span>
//           </div>
//           <div className="flex flex-wrap gap-1 mt-1">
//             {userRoles.slice(0, 2).map(role => (
//               <span key={role} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px]">
//                 {role}
//               </span>
//             ))}
//             {userRoles.length > 2 && <span className="text-[10px]">+{userRoles.length-2}</span>}
//           </div>
//         </div>
//       </aside>

//       {/* Main content */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="sticky top-0 z-30 flex items-center h-16 px-4 border-b bg-white">
//           <button
//             className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
//             onClick={() => setSidebarOpen(true)}
//           >
//             <FiMenu className="h-5 w-5" />
//           </button>
//           <h2 className="font-semibold text-lg truncate capitalize">
//             {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
//           </h2>
//         </header>
//         <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
//       </div>
//     </div>
//   );
// }





// app/(dashboard)/election/layout.js
// "use client";
// import { useState } from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import {
//   FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
//   FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu, FiX,
//   FiUpload, FiList, FiCheckSquare,FiTrendingUp
// } from "react-icons/fi";

// const sidebarItems = [
//   { href: "/election", label: "Dashboard", icon: FiLayout },
//   { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag },
//   { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin },
//   { href: "/election/booths", label: "Booths", icon: FiHome },
//   { href: "/election/voters", label: "Voters", icon: FiUsers },
//   { href: "/election/voter-import", label: "Import Voters", icon: FiUpload },
//   { href: "/election/workers", label: "Workers", icon: FiUserCheck },
//   { href: "/election/worker-activity", label: "Worker Activity", icon: FiList },
//   { href: "/election/surveys", label: "Surveys", icon: FiClipboard },
//   { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare },
//   { href: "/election/rallies", label: "Rallies & Events", icon: FiMic },
//   { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign },
//   { href: "/election/media", label: "Media Campaigns", icon: FiRadio },
  
// { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp },
// ];

// export default function ElectionLayout({ children }) {
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const pathname = usePathname();

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Mobile overlay */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-40 bg-black/50 lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
//           sidebarOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <div className="flex items-center h-16 px-6 border-b">
//           <FiFlag className="h-6 w-6 text-indigo-600" />
//           <span className="ml-2 font-bold text-lg text-gray-800">Election Hub</span>
//         </div>
//         <nav className="mt-4 space-y-1 px-3">
//           {sidebarItems.map((item) => {
//             const isActive = pathname === item.href;
//             const Icon = item.icon;
//             return (
//               <Link
//                 key={item.href}
//                 href={item.href}
//                 className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
//                   isActive
//                     ? "bg-indigo-50 text-indigo-700 font-medium"
//                     : "text-gray-600 hover:bg-gray-100"
//                 }`}
//                 onClick={() => setSidebarOpen(false)}
//               >
//                 <Icon className="h-4 w-4" />
//                 {item.label}
//               </Link>
//             );
//           })}
//         </nav>
//       </aside>

//       {/* Main content */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="sticky top-0 z-30 flex items-center h-16 px-4 border-b bg-white">
//           <button
//             className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
//             onClick={() => setSidebarOpen(true)}
//           >
//             <FiMenu className="h-5 w-5" />
//           </button>
//           <h2 className="font-semibold text-lg truncate capitalize">
//             {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
//           </h2>
//         </header>
//         <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
//       </div>
//     </div>
//   );
// }
