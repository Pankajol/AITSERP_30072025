"use client";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
  FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu,
  FiUpload, FiList, FiCheckSquare, FiTrendingUp, FiShield, FiLogOut,
  FiChevronDown, FiUser, FiKey, FiArrowLeft, FiInfo,
  FiEye, FiEyeOff
} from "react-icons/fi";
import NotificationBell from "@/components/election/NotificationBell";

// ------------------------- Safe View Context -------------------------
const SafeViewContext = createContext({ safeViewEnabled: false, toggleSafeView: () => {} });
export const useSafeView = () => useContext(SafeViewContext);

function SafeViewProvider({ children }) {
  const [safeViewEnabled, setSafeViewEnabled] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("electionSafeViewMode");
      if (stored !== null) setSafeViewEnabled(stored === "true");
    } catch (e) {}
  }, []);
  const toggleSafeView = () => {
    setSafeViewEnabled(prev => {
      const newVal = !prev;
      try { localStorage.setItem("electionSafeViewMode", String(newVal)); } catch (e) {}
      return newVal;
    });
  };
  return (
    <SafeViewContext.Provider value={{ safeViewEnabled, toggleSafeView }}>
      {children}
    </SafeViewContext.Provider>
  );
}

// Masking helpers
export const maskName = (name, safeViewActive) => {
  if (!safeViewActive || !name) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 1 ? parts[0][0] + "•".repeat(parts[0].length - 1) : "•";
  }
  return parts.map(part => (part.length > 1 ? part[0] + "•".repeat(part.length - 1) : "•")).join(" ");
};

export const maskEmail = (email, safeViewActive) => {
  if (!safeViewActive || !email) return email;
  const [localPart, domain] = email.split("@");
  if (!domain) return "•••@•••";
  const maskedLocal = localPart.length <= 2 ? "••" : localPart[0] + "•".repeat(localPart.length - 2) + localPart.slice(-1);
  const [domainName, tld] = domain.split(".");
  const maskedDomain = domainName.length <= 2 ? "••" : domainName[0] + "•".repeat(domainName.length - 2) + domainName.slice(-1);
  return `${maskedLocal}@${maskedDomain}.${tld || ""}`;
};

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

const sidebarItems = [
  { href: "/election", label: "Dashboard", icon: FiLayout, moduleName: "Election Dashboard" },
  { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag, moduleName: "Parties / Candidates" },
  { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin, moduleName: "Constituencies" },
  { href: "/election/booths", label: "Booths", icon: FiHome, moduleName: "Booths" },
  { href: "/election/wards", label: "Wards", icon: FiMapPin, moduleName: "Booths" },
  { href: "/election/blocks", label: "Blocks", icon: FiMapPin, moduleName: "Booths" },
  { href: "/election/voters", label: "Voters", icon: FiUsers, moduleName: "Voters" },
  { href: "/election/voter-import", label: "Import Voters", icon: FiUpload, moduleName: "Voters" },
  { href: "/election/workers", label: "Workers", icon: FiUserCheck, moduleName: "Workers" },
  { href: "/election/worker-activity", label: "Worker Activity", icon: FiList, moduleName: "Workers" },
  { href: "/election/surveys", label: "Surveys", icon: FiClipboard, moduleName: "Election Surveys" },
  { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare, moduleName: "Election Surveys" },
  { href: "/election/rallies", label: "Rallies & Events", icon: FiMic, moduleName: "Election Campaign" },
  { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign, moduleName: "Election Expenses" },
  { href: "/election/media", label: "Media Campaigns", icon: FiRadio, moduleName: "Election Communication" },
  { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp, moduleName: "Election Analytics" },
];

const routeLabels = {
  "/election": "Dashboard",
  "/election/parties": "Parties / Candidates",
  "/election/constituencies": "Constituencies",
  "/election/booths": "Booths",
  "/election/wards": "Wards",
  "/election/blocks": "Blocks",
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

function SafeViewToggleButton() {
  const { safeViewEnabled, toggleSafeView } = useSafeView();
  return (
    <button
      onClick={toggleSafeView}
      className={`flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
        safeViewEnabled 
          ? "bg-green-100 text-green-700 hover:bg-green-200" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
      title={safeViewEnabled ? "Disable Safe View" : "Enable Safe View"}
    >
      {safeViewEnabled ? <FiEyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <FiEye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
      <span className="hidden sm:inline">{safeViewEnabled ? "Safe ON" : "Safe View"}</span>
    </button>
  );
}

function UserMenu({ user: layoutUser }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({ name: "", email: "" });
  const menuRef = useRef(null);
  const router = useRouter();
  const { safeViewEnabled } = useSafeView();

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

  const displayName = safeViewEnabled ? maskName(user.name, true) : user.name;
  const displayEmail = safeViewEnabled ? maskEmail(user.email, true) : user.email;
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
        <span className="hidden sm:inline-block max-w-[100px] truncate">{displayName}</span>
        <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
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

function SidebarUserInfo({ user }) {
  const { safeViewEnabled } = useSafeView();
  const displayName = safeViewEnabled ? maskName(user.name || user.email, true) : (user.name || user.email || "User");
  const roles = user.roles || [];
  return (
    <>
      <div className="flex items-center gap-2">
        <FiShield className="text-gray-400 shrink-0" />
        <span className="truncate text-xs">{displayName}</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {roles.slice(0, 2).map(role => (
          <span key={role} className="px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px]">
            {role}
          </span>
        ))}
        {roles.length > 2 && <span className="text-[10px]">+{roles.length - 2}</span>}
      </div>
    </>
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

    let modules = {};
    if (payload.modules) {
      if (Array.isArray(payload.modules)) {
        payload.modules.forEach(mod => {
          if (mod.moduleName) {
            modules[mod.moduleName] = {
              selected: mod.selected === true,
              permissions: mod.permissions || {}
            };
          }
        });
      } else if (typeof payload.modules === 'object') {
        modules = payload.modules;
      }
    }

    const userObj = {
      id: payload.id,
      email: payload.email,
      type: payload.type,
      companyId: payload.companyId,
      name: payload.companyName || payload.name,
      roles: payload.roles || [],
      modules: modules,
      assignedConstituency: payload.assignedConstituency,
      assignedBlock: payload.assignedBlock,
      assignedWard: payload.assignedWard,
      assignedBooths: payload.assignedBooths || [],
    };
    setUser(userObj);
    setLoading(false);
  }, []);

  const hasModuleAccess = (moduleName) => {
    if (!moduleName) return false;
    if (moduleName === "Election Dashboard") return true;
    if (user?.type === "company") return true;
    if (user?.roles?.includes("Election Admin")) return true;
    const mod = user?.modules?.[moduleName];
    return !!(mod?.selected === true && mod?.permissions?.view === true);
  };

  const visibleItems = sidebarItems.filter(item => hasModuleAccess(item.moduleName));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/signin");
      return;
    }
    const currentItem = sidebarItems.find(item => item.href === pathname);
    if (currentItem && !hasModuleAccess(currentItem.moduleName)) {
      router.push("/election");
    }
  }, [pathname, user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const assigned = [];
  if (user.assignedConstituency?.name) assigned.push(`Constituency: ${user.assignedConstituency.name}`);
  if (user.assignedBlock?.blockNumber) assigned.push(`Block: ${user.assignedBlock.blockNumber}`);
  if (user.assignedWard?.wardNumber) assigned.push(`Ward: ${user.assignedWard.wardNumber}`);
  if (user.assignedBooths?.length) assigned.push(`Booths: ${user.assignedBooths.map(b => b.boothNumber).join(", ")}`);
  const restrictionText = assigned.length ? `🔒 You are viewing data for: ${assigned.join(" • ")}` : null;

  const currentLabel = getLabelFromPath(pathname);
  const parentPath = getParentPath(pathname);
  const backLabel = parentPath ? getLabelFromPath(parentPath) : null;
  const { safeViewEnabled } = useSafeView();

  return (
    <SafeViewProvider>
      <div className="flex h-screen bg-gray-50">
        <ToastContainer position="top-right" autoClose={5000} />
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
            {visibleItems.length === 0 ? (
              <div className="text-center text-gray-400 text-sm p-4">No accessible modules</div>
            ) : (
              visibleItems.map((item) => {
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
              })
            )}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t text-xs text-gray-500">
            <SidebarUserInfo user={user} />
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
       <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-white shadow-sm">
  {/* Left section */}
  <div className="flex items-center gap-2 min-w-0 flex-nowrap">
    <button
      className="lg:hidden p-2 rounded-md hover:bg-gray-100 shrink-0"
      onClick={() => setSidebarOpen(true)}
    >
      <FiMenu className="h-5 w-5" />
    </button>

    {/* Back button using browser history */}
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else if (parentPath) {
          router.push(parentPath);
        } else {
          router.push("/election");
        }
      }}
      className="flex items-center gap-1 sm:gap-2 rounded-md border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap shrink-0"
    >
      <FiArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">Back</span>
      <span className="sm:hidden">Back</span>
    </button>
  </div>

  {/* Center title */}
  <div className="flex-1 text-center px-2">
    <h2 className="font-semibold text-sm sm:text-lg truncate">{currentLabel}</h2>
  </div>

  {/* Right section */}
  <div className="flex items-center gap-1 sm:gap-4 shrink-0">
    <SafeViewToggleButton />
    <NotificationBell />
    <UserMenu user={user} />
  </div>
</header>

          {restrictionText && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs sm:text-sm text-amber-700">
              <FiInfo className="h-4 w-4 shrink-0" />
              <span className="truncate">{restrictionText}</span>
            </div>
          )}

          {safeViewEnabled && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-xs sm:text-sm text-blue-700">
              <FiEyeOff className="h-4 w-4 shrink-0" />
              <span>🛡️ Safe View Mode ON — personal info hidden</span>
            </div>
          )}

          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SafeViewProvider>
  );
}




// // app/(dashboard)/election/layout.js
// "use client";
// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck,
//   FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu,
//   FiUpload, FiList, FiCheckSquare, FiTrendingUp, FiShield, FiLogOut,
//   FiChevronDown, FiUser, FiKey, FiArrowLeft, FiInfo
// } from "react-icons/fi";
// import NotificationBell from "@/components/election/NotificationBell";

// const sidebarItems = [
//   { href: "/election", label: "Dashboard", icon: FiLayout, moduleName: "Election Dashboard" },
//   { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag, moduleName: "Parties / Candidates" },
//   { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin, moduleName: "Constituencies" },
//   { href: "/election/booths", label: "Booths", icon: FiHome, moduleName: "Booths" },
//   { href: "/election/wards", label: "Wards", icon: FiMapPin, moduleName: "Booths" },
//   { href: "/election/blocks", label: "Blocks", icon: FiMapPin, moduleName: "Booths" },
//   { href: "/election/voters", label: "Voters", icon: FiUsers, moduleName: "Voters" },
//   { href: "/election/voter-import", label: "Import Voters", icon: FiUpload, moduleName: "Voters" },
//   { href: "/election/workers", label: "Workers", icon: FiUserCheck, moduleName: "Workers" },
//   { href: "/election/worker-activity", label: "Worker Activity", icon: FiList, moduleName: "Workers" },
//   { href: "/election/surveys", label: "Surveys", icon: FiClipboard, moduleName: "Election Surveys" },
//   { href: "/election/survey-response", label: "Fill Survey", icon: FiCheckSquare, moduleName: "Election Surveys" },
//   { href: "/election/rallies", label: "Rallies & Events", icon: FiMic, moduleName: "Election Campaign" },
//   { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign, moduleName: "Election Expenses" },
//   { href: "/election/media", label: "Media Campaigns", icon: FiRadio, moduleName: "Election Communication" },
//   { href: "/election/analytics", label: "Analytics", icon: FiTrendingUp, moduleName: "Election Analytics" },
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

// const routeLabels = {
//   "/election": "Dashboard",
//   "/election/parties": "Parties / Candidates",
//   "/election/constituencies": "Constituencies",
//   "/election/booths": "Booths",
//   "/election/wards": "Wards",
//   "/election/blocks": "Blocks",
//   "/election/voters": "Voters",
//   "/election/voter-import": "Import Voters",
//   "/election/workers": "Workers",
//   "/election/worker-activity": "Worker Activity",
//   "/election/surveys": "Surveys",
//   "/election/survey-response": "Fill Survey",
//   "/election/rallies": "Rallies & Events",
//   "/election/expenses": "Election Expenses",
//   "/election/media": "Media Campaigns",
//   "/election/analytics": "Analytics",
//   "/election/profile": "Profile",
//   "/election/change-password": "Change Password",
// };

// function getLabelFromPath(path) {
//   if (!path) return "Dashboard";
//   if (routeLabels[path]) return routeLabels[path];
//   const segment = path.split("/").pop() || "Dashboard";
//   return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
// }

// function getParentPath(path) {
//   if (!path || path === "/election") return null;
//   const segments = path.split("/").filter(Boolean);
//   if (segments.length <= 1) return "/election";
//   return `/${segments.slice(0, segments.length - 1).join("/")}`;
// }

// function UserMenu({ user: layoutUser }) {
//   const [open, setOpen] = useState(false);
//   const [user, setUser] = useState({ name: "", email: "" });
//   const menuRef = useRef(null);
//   const router = useRouter();

//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem("user");
//       const parsed = stored ? JSON.parse(stored) : {};
//       setUser({
//         name: parsed.contactName || parsed.companyName || parsed.name || layoutUser?.name || "User",
//         email: parsed.email || layoutUser?.email || "",
//       });
//     } catch {
//       setUser({
//         name: layoutUser?.name || "User",
//         email: layoutUser?.email || "",
//       });
//     }
//   }, [layoutUser]);

//   useEffect(() => {
//     function handleClickOutside(e) {
//       if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     router.push("/signin");
//   };

//   const initials = user.name
//     .split(" ")
//     .map((n) => n[0])
//     .join("")
//     .toUpperCase()
//     .slice(0, 2);

//   return (
//     <div className="relative" ref={menuRef}>
//       <button
//         onClick={() => setOpen(!open)}
//         className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none"
//       >
//         <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
//           {initials || "U"}
//         </div>
//         <span className="hidden sm:inline-block max-w-[140px] truncate">{user.name}</span>
//         <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//           <div className="px-4 py-2 border-b border-gray-100">
//             <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
//             <p className="text-xs text-gray-500 truncate">{user.email}</p>
//           </div>
//           <Link
//             href="/election/profile"
//             className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
//             onClick={() => setOpen(false)}
//           >
//             <FiUser className="text-base" /> My Profile
//           </Link>
//           <Link
//             href="/election/change-password"
//             className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
//             onClick={() => setOpen(false)}
//           >
//             <FiKey className="text-base" /> Change Password
//           </Link>
//           <button
//             onClick={() => {
//               setOpen(false);
//               handleLogout();
//             }}
//             className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
//           >
//             <FiLogOut className="text-base" /> Sign Out
//           </button>
//         </div>
//       )}
//     </div>
//   );
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

//     let modules = {};
//     if (payload.modules) {
//       if (Array.isArray(payload.modules)) {
//         payload.modules.forEach(mod => {
//           if (mod.moduleName) {
//             modules[mod.moduleName] = {
//               selected: mod.selected === true,
//               permissions: mod.permissions || {}
//             };
//           }
//         });
//       } else if (typeof payload.modules === 'object') {
//         modules = payload.modules;
//       }
//     }

//     const userObj = {
//       id: payload.id,
//       email: payload.email,
//       type: payload.type,
//       companyId: payload.companyId,
//       name: payload.companyName || payload.name,
//       roles: payload.roles || [],
//       modules: modules,
//       assignedConstituency: payload.assignedConstituency,
//       assignedBlock: payload.assignedBlock,
//       assignedWard: payload.assignedWard,
//       assignedBooths: payload.assignedBooths || [],
//     };
//     setUser(userObj);
//     setLoading(false);
//   }, []);

//   // Module access rules:
//   // - Company admin (type === "company") sees everything.
//   // - Election Admin role (legacy) sees everything.
//   // - Others: must have module selected AND view permission.
//   const hasModuleAccess = (moduleName) => {
//     if (!moduleName) return false;
//     if (moduleName === "Election Dashboard") return true; // Dashboard always visible
//     if (user?.type === "company") return true;
//     if (user?.roles?.includes("Election Admin")) return true;
//     const mod = user?.modules?.[moduleName];
//     return !!(mod?.selected === true && mod?.permissions?.view === true);
//   };

//   const visibleItems = sidebarItems.filter(item => hasModuleAccess(item.moduleName));

//   // Guard current page access
//   useEffect(() => {
//     if (loading) return;
//     if (!user) {
//       router.push("/signin");
//       return;
//     }
//     const currentItem = sidebarItems.find(item => item.href === pathname);
//     if (currentItem && !hasModuleAccess(currentItem.moduleName)) {
//       router.push("/election");
//     }
//   }, [pathname, user, loading, router]);

//   if (loading) {
//     return (
//       <div className="flex h-screen items-center justify-center">
//         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }
//   if (!user) return null;

//   // Build restriction banner text
//   const assigned = [];
//   if (user.assignedConstituency?.name) assigned.push(`Constituency: ${user.assignedConstituency.name}`);
//   if (user.assignedBlock?.blockNumber) assigned.push(`Block: ${user.assignedBlock.blockNumber}`);
//   if (user.assignedWard?.wardNumber) assigned.push(`Ward: ${user.assignedWard.wardNumber}`);
//   if (user.assignedBooths?.length) assigned.push(`Booths: ${user.assignedBooths.map(b => b.boothNumber).join(", ")}`);
//   const restrictionText = assigned.length ? `🔒 You are viewing data for: ${assigned.join(" • ")}` : null;

//   const currentLabel = getLabelFromPath(pathname);
//   const parentPath = getParentPath(pathname);
//   const backLabel = parentPath ? getLabelFromPath(parentPath) : null;

//   return (
//     <div className="flex h-screen bg-gray-50">
//       <ToastContainer position="top-right" autoClose={5000} />
//       {sidebarOpen && (
//         <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
//           {visibleItems.length === 0 ? (
//             <div className="text-center text-gray-400 text-sm p-4">No accessible modules</div>
//           ) : (
//             visibleItems.map((item) => {
//               const isActive = pathname === item.href;
//               const Icon = item.icon;
//               return (
//                 <Link
//                   key={item.href}
//                   href={item.href}
//                   className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
//                     isActive
//                       ? "bg-indigo-50 text-indigo-700 font-medium"
//                       : "text-gray-600 hover:bg-gray-100"
//                   }`}
//                   onClick={() => setSidebarOpen(false)}
//                 >
//                   <Icon className="h-4 w-4" />
//                   {item.label}
//                 </Link>
//               );
//             })
//           )}
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
//             {(user.roles || []).length > 2 && <span className="text-[10px]">+{(user.roles || []).length - 2}</span>}
//           </div>
//         </div>
//       </aside>
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-white">
//           <div className="flex items-center gap-2">
//             <button
//               className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
//               onClick={() => setSidebarOpen(true)}
//             >
//               <FiMenu className="h-5 w-5" />
//             </button>
//             {parentPath && (
//               <button
//                 onClick={() => router.push(parentPath)}
//                 className="hidden sm:flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
//               >
//                 <FiArrowLeft className="h-4 w-4" />
//                 Back to {backLabel}
//               </button>
//             )}
//           </div>
//           <div className="flex-1 text-center">
//             <h2 className="font-semibold text-lg truncate">{currentLabel}</h2>
//           </div>
//           <div className="flex items-center gap-4">
//             <NotificationBell />
//             <UserMenu user={user} />
//           </div>
//         </header>

//         {restrictionText && (
//           <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-700">
//             <FiInfo className="h-4 w-4" />
//             <span>{restrictionText}</span>
//           </div>
//         )}

//         <main className="flex-1 overflow-auto m-5 sm:m-8 p-4 sm:p-6">
//           {children}
//         </main>
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
