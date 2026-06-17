"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import {
  FiHome,
  FiLayers,
  FiUser,
  FiAlertCircle,
  FiDollarSign,
  FiUserCheck,
  FiMapPin,
  FiTruck,
  FiBell,
  FiClipboard,
  FiBarChart2,
  FiMenu,
  FiX,
  FiClock,
  FiChevronLeft,
  FiChevronDown,
  FiLogOut,
  FiKey,
} from "react-icons/fi";

const ALL_MODULES = [
  { name: "Society", href: "/societymanagement/society", icon: FiHome, moduleKey: "Society" },
  { name: "Buildings", href: "/societymanagement/building", icon: FiHome, moduleKey: "Building" },
  { name: "Flat / Unit", href: "/societymanagement/flat", icon: FiLayers, moduleKey: "Flat" },
  { name: "Residents", href: "/societymanagement/resident", icon: FiUser, moduleKey: "Resident" },
  { name: "Complaints", href: "/societymanagement/complaint", icon: FiAlertCircle, moduleKey: "Complaint" },
  { name: "Maintenance Bills", href: "/societymanagement/maintenance-bill", icon: FiDollarSign, moduleKey: "Maintenance Bill" },
  { name: "Guard Assignments", href: "/societymanagement/guard-assignment", icon: FiUserCheck, moduleKey: "Guard Assignment" },
  { name: "Staff", href: "/societymanagement/staff", icon: FiUser, moduleKey: "employees" },
  { name: "Shifts", href: "/societymanagement/shifts", icon: FiClock, moduleKey: "Shift" },
  { name: "Attendance", href: "/societymanagement/attendance", icon: FiUser, moduleKey: "Attendance" },
  { name: "Staff Deployments", href: "/societymanagement/staff-deployment", icon: FiUserCheck, moduleKey: "Deployment" },
  { name: "Guard Entries", href: "/societymanagement/guard-entry", icon: FiMapPin, moduleKey: "Guard Entry" },
  { name: "Gate Entries", href: "/societymanagement/gate-entry", icon: FiTruck, moduleKey: "Gate Entry" },
  { name: "Notice Board", href: "/societymanagement/notice", icon: FiBell, moduleKey: "Notice Board" },
  { name: "Visitor Pass", href: "/societymanagement/visitor-pass", icon: FiClipboard, moduleKey: "Visitor Pass" },
  { name : "billing", href: "/societymanagement/billing", icon: FiDollarSign, moduleKey: "Billing" },
];

// Bottom nav items for mobile (most-used 4 + "More")
const BOTTOM_NAV_ITEMS = [
  { name: "Dashboard", href: "/societymanagement/dashboard", icon: FiBarChart2 },
  { name: "Residents", href: "/societymanagement/resident", icon: FiUser },
  { name: "Complaints", href: "/societymanagement/complaint", icon: FiAlertCircle },
  { name: "Notices", href: "/societymanagement/notice", icon: FiBell },
];

function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const [user, setUser] = useState({ name: "", email: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ name: decoded.name || "User", email: decoded.email || "" });
      } catch (e) {}
    }
  }, []);

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
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials || "U"}
        </div>
        <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
        <FiChevronDown className={`text-xs transition-transform duration-200 hidden sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Mobile: full-screen overlay dropdown */}
          <div className="fixed inset-0 z-40 sm:hidden bg-black/20" onClick={() => setOpen(false)} />
          <div className="
            absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50
            sm:right-0 sm:w-48 sm:rounded-xl
          ">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
            </div>
            <Link
              href="/societymanagement/profile"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              <FiUser className="text-base text-gray-400" /> My Profile
            </Link>
            <Link
              href="/societymanagement/change-password"
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              <FiKey className="text-base text-gray-400" /> Change Password
            </Link>
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 text-left"
            >
              <FiLogOut className="text-base" /> Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SocietyManagementLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // ── ALL hooks must be declared first, before any early returns ──────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visibleModules, setVisibleModules] = useState(ALL_MODULES);
  const [isSpecialUser, setIsSpecialUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [internalHistory, setInternalHistory] = useState([pathname]);
  const [backPressed, setBackPressed] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Track navigation history for smart back button
  useEffect(() => {
    setInternalHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last === pathname) return prev;
      return [...prev, pathname];
    });
  }, [pathname]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // Auth / permissions
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const decoded = jwtDecode(token);
      const userRoles = decoded.roles || [];
      const userModules = decoded.modules || {};
      const userType = decoded.type;

      if (userRoles.includes("Guard") || userRoles.includes("Housekeeper")) {
        setIsSpecialUser(true);
        setVisibleModules([]);
        setLoading(false);
        return;
      }

      const isSuperUser =
        userType === "company" ||
        userRoles.includes("Company") ||
        userRoles.includes("Admin") ||
        userRoles.includes("Supervisor") ||
        userRoles.includes("Manager") ||
        userRoles.includes("SocietyAdmin");

      if (isSuperUser) {
        setVisibleModules(ALL_MODULES);
        setLoading(false);
        return;
      }

      const filtered = ALL_MODULES.filter((mod) => {
        const modPerm = userModules[mod.moduleKey];
        return modPerm && modPerm.selected === true;
      });
      setVisibleModules(filtered.length > 0 ? filtered : []);
    } catch (err) {
      console.error("Failed to decode token in layout", err);
      setVisibleModules(ALL_MODULES);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Derived values (computed after all hooks) ────────────────────────
  const isDashboard =
    pathname === "/societymanagement/dashboard" || pathname === "/societymanagement";
  const showBackButton = !isDashboard;

  const pathSegments = pathname.split("/").filter(Boolean);
  const pageTitleFromSegment = (seg) =>
    seg?.replace(/-/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) || "";
  const pageTitle = pageTitleFromSegment(pathSegments[pathSegments.length - 1]);
  const parentSegment = pathSegments.length >= 3 ? pathSegments[pathSegments.length - 2] : null;
  const parentTitle = parentSegment ? pageTitleFromSegment(parentSegment) : "Dashboard";

  const canGoBack = internalHistory.length > 1;

  const handleBack = useCallback(() => {
    setBackPressed(true);
    setTimeout(() => setBackPressed(false), 200);
    if (canGoBack) {
      setInternalHistory((prev) => prev.slice(0, -1));
      router.back();
    } else {
      router.push("/societymanagement/dashboard");
    }
  }, [canGoBack, router]);

  // ── Early returns (after ALL hooks) ─────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-200 border-t-indigo-600" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (isSpecialUser) return <>{children}</>;

  const navItems = [
    { name: "Dashboard", href: "/societymanagement/dashboard", icon: FiBarChart2 },
    ...visibleModules,
  ];

  // Filter bottom nav to only show items user has access to
  const accessibleHrefs = new Set(navItems.map((m) => m.href));
  const visibleBottomNav = BOTTOM_NAV_ITEMS.filter((item) => accessibleHrefs.has(item.href));

  return (
    <div
      className="flex h-screen bg-gray-50 overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 shadow-xl
          flex flex-col transform transition-transform duration-250 ease-in-out
          lg:relative lg:z-auto lg:w-64 lg:shadow-none lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FiHome className="text-white text-sm" />
            </div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
              Society<span className="text-indigo-600">Hub</span>
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX className="text-sm" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" aria-label="Sidebar navigation">
          {navItems.map((mod) => {
            const isActive =
              mod.href === "/societymanagement/dashboard"
                ? pathname === mod.href || pathname === "/societymanagement"
                : pathname.startsWith(mod.href);
            return (
              <Link
                key={mod.href}
                href={mod.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                  }
                `}
              >
                <mod.icon
                  className={`text-base flex-shrink-0 transition-colors ${
                    isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                <span className="truncate">{mod.name}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="px-3 py-2 rounded-xl bg-gray-50 text-xs text-gray-400 text-center">
            Society Management System
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Main content area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ─── Top Navbar ────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="h-16 flex items-center justify-between px-3 sm:px-5 lg:px-6 gap-2">

            {/* ── Left cluster ── */}
            <div className="flex items-center gap-2 min-w-0 flex-1">

              {/* Mobile: show back button OR hamburger — never both */}
              {showBackButton ? (
                /* Native-style back button: chevron + parent page name */
                <button
                  onClick={handleBack}
                  className={`
                    lg:hidden flex items-center gap-1 pl-1 pr-3 h-9 rounded-xl
                    text-indigo-600 active:text-indigo-800
                    transition-all duration-150 flex-shrink-0 select-none
                    ${backPressed ? "scale-95 opacity-60" : "scale-100 opacity-100"}
                  `}
                  aria-label={`Back to ${parentTitle}`}
                >
                  <FiChevronLeft className="text-xl flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-sm font-semibold truncate max-w-[90px]">{parentTitle}</span>
                </button>
              ) : (
                /* Hamburger only on dashboard */
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-600 flex-shrink-0 transition-colors"
                  aria-label="Open sidebar"
                >
                  <FiMenu className="text-base" />
                </button>
              )}

              {/* Mobile: centered page title */}
              <div className="min-w-0 flex-1 lg:hidden flex flex-col justify-center">
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                  {isDashboard ? "Society Management" : pageTitle}
                </p>
                {/* Sub-label: show parent path when deep (e.g. on detail page) */}
                {showBackButton && pathSegments.length >= 4 && (
                  <p className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
                    {parentTitle}
                  </p>
                )}
              </div>

              {/* Desktop: hamburger to toggle sidebar (always visible on desktop too for collapse) */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="hidden lg:flex w-9 h-9 rounded-xl hover:bg-gray-100 active:bg-gray-200 items-center justify-center text-gray-500 flex-shrink-0 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FiMenu className="text-base" />
              </button>

              {/* Desktop: back button with parent label + breadcrumb */}
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className={`
                    hidden lg:inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-xl
                    bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                    text-gray-700 text-sm font-medium
                    transition-all duration-150 flex-shrink-0 select-none
                    ${backPressed ? "scale-95" : "scale-100"}
                  `}
                  aria-label={`Back to ${parentTitle}`}
                >
                  <FiChevronLeft className="text-base" strokeWidth={2.5} />
                  {parentTitle}
                </button>
              )}

              {/* Desktop breadcrumb */}
              <div className="hidden lg:flex items-center gap-1.5 min-w-0 text-sm">
                {showBackButton && (
                  <>
                    <span className="text-gray-300 select-none">/</span>
                    <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
                  </>
                )}
                {isDashboard && (
                  <span className="font-semibold text-gray-900">Dashboard</span>
                )}
              </div>
            </div>

            {/* ── Right cluster ── */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile: hamburger on non-dashboard pages (next to user menu) */}
              {showBackButton && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-500 flex-shrink-0 transition-colors"
                  aria-label="Open sidebar"
                >
                  <FiMenu className="text-sm" />
                </button>
              )}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* ─── Scrollable page content ─────────────────────── */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)", // room for bottom nav on mobile
          }}
        >
          <div className="p-4 sm:p-5 lg:p-6 pb-safe lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile bottom navigation bar ───────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch h-16">
          {visibleBottomNav.map((item) => {
            const isActive =
              item.href === "/societymanagement/dashboard"
                ? pathname === item.href || pathname === "/societymanagement"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium
                  transition-colors duration-150 active:bg-gray-50
                  ${isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"}
                `}
              >
                <item.icon
                  className={`text-xl transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
                />
                <span>{item.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-t-full" />
                )}
              </Link>
            );
          })}

          {/* "More" button opens sidebar */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 active:bg-gray-50 transition-colors"
            aria-label="More menu"
          >
            <FiMenu className="text-xl" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}








// "use client";
// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { jwtDecode } from "jwt-decode";
// import {
//   FiHome,
//   FiLayers,
//   FiUser,
//   FiAlertCircle,
//   FiDollarSign,
//   FiUserCheck,
//   FiMapPin,
//   FiTruck,
//   FiBell,
//   FiClipboard,
//   FiBarChart2,
//   FiMenu,
//   FiX,
//   FiClock,
//   FiChevronLeft,
//   FiChevronDown,
//   FiLogOut,
//   FiKey,
// } from "react-icons/fi";

// const ALL_MODULES = [
//   { name: "Society", href: "/societymanagement/society", icon: FiHome, moduleKey: "Society" },
//   { name: "Buildings", href: "/societymanagement/building", icon: FiHome, moduleKey: "Building" },
//   { name: "Flat / Unit", href: "/societymanagement/flat", icon: FiLayers, moduleKey: "Flat" },
//   { name: "Residents", href: "/societymanagement/resident", icon: FiUser, moduleKey: "Resident" },
//   { name: "Complaints", href: "/societymanagement/complaint", icon: FiAlertCircle, moduleKey: "Complaint" },
//   { name: "Maintenance Bills", href: "/societymanagement/maintenance-bill", icon: FiDollarSign, moduleKey: "Maintenance Bill" },
//   { name: "Guard Assignments", href: "/societymanagement/guard-assignment", icon: FiUserCheck, moduleKey: "Guard Assignment" },
//   { name: "Staff", href: "/societymanagement/staff", icon: FiUser, moduleKey: "employees" },
//   { name: "Shifts", href: "/societymanagement/shifts", icon: FiClock, moduleKey: "Shift" },
//   { name: "Attendance", href: "/societymanagement/attendance", icon: FiUser, moduleKey: "Attendance" },
//   { name: "Staff Deployments", href: "/societymanagement/staff-deployment", icon: FiUserCheck, moduleKey: "Deployment" },
//   { name: "Guard Entries", href: "/societymanagement/guard-entry", icon: FiMapPin, moduleKey: "Guard Entry" },
//   { name: "Gate Entries", href: "/societymanagement/gate-entry", icon: FiTruck, moduleKey: "Gate Entry" },
//   { name: "Notice Board", href: "/societymanagement/notice", icon: FiBell, moduleKey: "Notice Board" },
//   { name: "Visitor Pass", href: "/societymanagement/visitor-pass", icon: FiClipboard, moduleKey: "Visitor Pass" },
// ];

// function UserMenu() {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const router = useRouter();
//   const [user, setUser] = useState({ name: "", email: "" });

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       try {
//         const decoded = jwtDecode(token);
//         setUser({
//           name: decoded.name || "User",
//           email: decoded.email || "",
//         });
//       } catch (e) {}
//     }
//   }, []);

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
//         <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
//         <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//           <div className="px-4 py-2 border-b border-gray-100">
//             <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
//             <p className="text-xs text-gray-500 truncate">{user.email}</p>
//           </div>
//           <Link
//             href="/societymanagement/profile"
//             className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
//             onClick={() => setOpen(false)}
//           >
//             <FiUser className="text-base" /> My Profile
//           </Link>
//           <Link
//             href="/societymanagement/change-password"
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

// export default function SocietyManagementLayout({ children }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [visibleModules, setVisibleModules] = useState(ALL_MODULES);
//   const [isSpecialUser, setIsSpecialUser] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }
//     try {
//       const decoded = jwtDecode(token);
//       const userRoles = decoded.roles || [];
//       const userModules = decoded.modules || {};
//       const userType = decoded.type;

//       if (userRoles.includes("Guard") || userRoles.includes("Housekeeper")) {
//         setIsSpecialUser(true);
//         setVisibleModules([]);
//         setLoading(false);
//         return;
//       }

//       const isSuperUser = userType === "company" ||
//         userRoles.includes("Company") ||
//         userRoles.includes("Admin") ||
//         userRoles.includes("Supervisor") ||
//         userRoles.includes("Manager") ||
//         userRoles.includes("SocietyAdmin");

//       if (isSuperUser) {
//         setVisibleModules(ALL_MODULES);
//         setLoading(false);
//         return;
//       }

//       const filtered = ALL_MODULES.filter((mod) => {
//         const modPerm = userModules[mod.moduleKey];
//         return modPerm && modPerm.selected === true;
//       });
//       setVisibleModules(filtered.length > 0 ? filtered : []);
//     } catch (err) {
//       console.error("Failed to decode token in layout", err);
//       setVisibleModules(ALL_MODULES);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   if (loading) {
//     return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
//   }

//   if (isSpecialUser) {
//     return <>{children}</>;
//   }

//   const navItems = [{ name: "Dashboard", href: "/societymanagement/dashboard", icon: FiBarChart2 }, ...visibleModules];
//   const showBackButton = pathname !== "/societymanagement/dashboard" && pathname !== "/societymanagement";
//   const pageTitle = pathname.split("/").filter(Boolean).slice(-1)[0]?.replace(/-/g, " ")?.replace(/\b\w/g, c => c.toUpperCase()) || "Society Management";

//   const handleBack = () => {
//     if (typeof window !== "undefined" && window.history.length > 1) {
//       router.back();
//     } else {
//       router.push("/societymanagement/dashboard");
//     }
//   };

//   return (
//     <div className="flex min-h-screen bg-gray-50 overflow-hidden" style={{
//       paddingTop: 'env(safe-area-inset-top)',
//       paddingRight: 'env(safe-area-inset-right)',
//       paddingBottom: 'env(safe-area-inset-bottom)',
//       paddingLeft: 'env(safe-area-inset-left)'
//     }}>
//       {/* Sidebar - fixed height with scrolling */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-200 ease-in-out flex flex-col
//           ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
//           lg:translate-x-0 lg:static lg:z-auto`}
//         style={{ top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' }}
//       >
//         <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 flex-shrink-0">
//           <h1 className="text-lg font-extrabold text-indigo-600">Society Mgmt</h1>
//           <button
//             onClick={() => setSidebarOpen(false)}
//             className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//           >
//             <FiX className="text-sm" />
//           </button>
//         </div>
//         <nav className="flex-1 overflow-y-auto p-3 space-y-1">
//           {navItems.map((mod) => {
//             const isActive = pathname.startsWith(mod.href);
//             return (
//               <Link
//                 key={mod.href}
//                 href={mod.href}
//                 onClick={() => setSidebarOpen(false)}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
//                   ${isActive
//                     ? "bg-indigo-50 text-indigo-700 shadow-sm"
//                     : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
//                   }`}
//               >
//                 <mod.icon className={`text-base ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
//                 {mod.name}
//               </Link>
//             );
//           })}
//         </nav>
//       </aside>

//       {/* Overlay for mobile sidebar */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Main area - full height with scrolling */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => setSidebarOpen(true)}
//               className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//             >
//               <FiMenu className="text-sm" />
//             </button>
//             {showBackButton ? (
//               <button
//                 onClick={handleBack}
//                 className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
//               >
//                 <FiChevronLeft className="text-base" />
//                 Back
//               </button>
//             ) : (
//               <span className="text-base font-bold text-gray-800 lg:hidden">
//                 Society Management
//               </span>
//             )}
//           </div>
//           <UserMenu />
//         </header>
//         <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
//             <div className="flex items-center gap-2 text-sm text-gray-600">
//               <Link href="/societymanagement/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium">
//                 Dashboard
//               </Link>
//               <span>/</span>
//               <span className="font-semibold text-gray-900">{pageTitle}</span>
//             </div>
//             {showBackButton && (
//               <button
//                 onClick={handleBack}
//                 className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
//               >
//                 <FiChevronLeft className="text-base" />
//                 Go back
//               </button>
//             )}
//           </div>
//         </div>
//         <main className="flex-1 overflow-y-auto p-4 sm:p-6">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }





// "use client";
// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { jwtDecode } from "jwt-decode";
// import {
//   FiHome,
//   FiLayers,
//   FiUser,
//   FiAlertCircle,
//   FiDollarSign,
//   FiUserCheck,
//   FiMapPin,
//   FiTruck,
//   FiBell,
//   FiClipboard,
//   FiBarChart2,
//   FiMenu,
//   FiX,
//   FiClock,
//   FiChevronDown,
//   FiLogOut,
//   FiKey,
// } from "react-icons/fi";

// // ── All possible sidebar modules ──
// const ALL_MODULES = [
//   { name: "Society", href: "/societymanagement/society", icon: FiHome, moduleKey: "Society" },
//   { name: "Buildings", href: "/societymanagement/building", icon: FiHome, moduleKey: "Building" },
//   { name: "Flat / Unit", href: "/societymanagement/flat", icon: FiLayers, moduleKey: "Flat" },
//   { name: "Residents", href: "/societymanagement/resident", icon: FiUser, moduleKey: "Resident" },
//   { name: "Complaints", href: "/societymanagement/complaint", icon: FiAlertCircle, moduleKey: "Complaint" },
//   { name: "Maintenance Bills", href: "/societymanagement/maintenance-bill", icon: FiDollarSign, moduleKey: "Maintenance Bill" },
//   { name: "Guard Assignments", href: "/societymanagement/guard-assignment", icon: FiUserCheck, moduleKey: "Guard Assignment" },
//   { name: "Staff", href: "/societymanagement/staff", icon: FiUser, moduleKey: "employees" },
//   { name: "Shifts", href: "/societymanagement/shifts", icon: FiClock, moduleKey: "Shift" },
//   { name: "Attendance", href: "/societymanagement/attendance", icon: FiUser, moduleKey: "Attendance" },
//   { name: "Staff Deployments", href: "/societymanagement/staff-deployment", icon: FiUserCheck, moduleKey: "Deployment" },
//   { name: "Guard Entries", href: "/societymanagement/guard-entry", icon: FiMapPin, moduleKey: "Guard Entry" },
//   { name: "Gate Entries", href: "/societymanagement/gate-entry", icon: FiTruck, moduleKey: "Gate Entry" },
//   { name: "Notice Board", href: "/societymanagement/notice", icon: FiBell, moduleKey: "Notice Board" }, // ✅ fixed
//   { name: "Visitor Pass", href: "/societymanagement/visitor-pass", icon: FiClipboard, moduleKey: "Visitor Pass" },
// ];

// function UserMenu() {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const router = useRouter();
//   const [user, setUser] = useState({ name: "", email: "" });

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       try {
//         const decoded = jwtDecode(token);
//         setUser({
//           name: decoded.name || "User",
//           email: decoded.email || "",
//         });
//       } catch (e) {}
//     }
//   }, []);

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
//         <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
//         <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//           <div className="px-4 py-2 border-b border-gray-100">
//             <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
//             <p className="text-xs text-gray-500 truncate">{user.email}</p>
//           </div>
//           <Link
//             href="/societymanagement/profile"
//             className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
//             onClick={() => setOpen(false)}
//           >
//             <FiUser className="text-base" /> My Profile
//           </Link>
//           <Link
//             href="/societymanagement/change-password"
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

// export default function SocietyManagementLayout({ children }) {
//   const pathname = usePathname();
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [visibleModules, setVisibleModules] = useState(ALL_MODULES);
//   const [isSpecialUser, setIsSpecialUser] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }
//     try {
//       const decoded = jwtDecode(token);
//       const userRoles = decoded.roles || [];
//       const userModules = decoded.modules || {};
//       const userType = decoded.type;

//       // Guard or Housekeeper → no sidebar
//       if (userRoles.includes("Guard") || userRoles.includes("Housekeeper")) {
//         setIsSpecialUser(true);
//         setVisibleModules([]);
//         setLoading(false);
//         return;
//       }

//       // ✅ Company, Admin, Supervisor, Manager → show ALL modules
//       const isSuperUser = userType === "company" ||
//         userRoles.includes("Company") ||
//         userRoles.includes("Admin") ||
//         userRoles.includes("Supervisor") ||
//         userRoles.includes("Manager") ||
//         userRoles.includes("SocietyAdmin");

//       if (isSuperUser) {
//         setVisibleModules(ALL_MODULES);
//         setLoading(false);
//         return;
//       }

//       // For normal users (Resident), filter modules based on selected flag
//       const filtered = ALL_MODULES.filter((mod) => {
//         const modPerm = userModules[mod.moduleKey];
//         return modPerm && modPerm.selected === true;
//       });
//       setVisibleModules(filtered.length > 0 ? filtered : []);
//     } catch (err) {
//       console.error("Failed to decode token in layout", err);
//       setVisibleModules(ALL_MODULES);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   if (loading) {
//     return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
//   }

//   // Guard/Housekeeper → no sidebar
//   if (isSpecialUser) {
//     return <>{children}</>;
//   }

//   // Always include Dashboard at the top
//   const navItems = [{ name: "Dashboard", href: "/societymanagement/dashboard", icon: FiBarChart2 }, ...visibleModules];

//   return (
//     <div className="flex h-full min-h-screen bg-gray-50">
//       {/* Sidebar */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-200 ease-in-out
//           ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
//           lg:translate-x-0 lg:static lg:z-auto`}
//       >
//         <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
//           <h1 className="text-lg font-extrabold text-indigo-600">Society Mgmt</h1>
//           <button
//             onClick={() => setSidebarOpen(false)}
//             className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//           >
//             <FiX className="text-sm" />
//           </button>
//         </div>
//         <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
//           {navItems.map((mod) => {
//             const isActive = pathname.startsWith(mod.href);
//             return (
//               <Link
//                 key={mod.href}
//                 href={mod.href}
//                 onClick={() => setSidebarOpen(false)}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
//                   ${isActive
//                     ? "bg-indigo-50 text-indigo-700 shadow-sm"
//                     : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
//                   }`}
//               >
//                 <mod.icon className={`text-base ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
//                 {mod.name}
//               </Link>
//             );
//           })}
//         </nav>
//       </aside>

//       {/* Overlay for mobile sidebar */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Main area */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => setSidebarOpen(true)}
//               className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//             >
//               <FiMenu className="text-sm" />
//             </button>
//             <span className="text-base font-bold text-gray-800 lg:hidden">
//               Society Management
//             </span>
//           </div>
//           <UserMenu />
//         </header>
//         <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
//       </div>
//     </div>
//   );
// }



// "use client";
// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { jwtDecode } from "jwt-decode";
// import {
//   FiHome,
//   FiLayers,
//   FiUser,
//   FiAlertCircle,
//   FiDollarSign,
//   FiUserCheck,
//   FiMapPin,
//   FiTruck,
//   FiBell,
//   FiClipboard,
//   FiBarChart2,
//   FiMenu,
//   FiX,
//   FiClock,
//   FiChevronDown,
//   FiLogOut,
//   FiKey,
// } from "react-icons/fi";

// // ── All possible sidebar modules ──
// const ALL_MODULES = [
//   { name: "Dashboard", href: "/societymanagement/dashboard", icon: FiBarChart2, moduleKey: "Dashboard" },
//   { name: "Society", href: "/societymanagement/society", icon: FiHome, moduleKey: "Society" },
//   { name: "Buildings", href: "/societymanagement/building", icon: FiHome, moduleKey: "Building" },
//   { name: "Flat / Unit", href: "/societymanagement/flat", icon: FiLayers, moduleKey: "Flat" },
//   { name: "Residents", href: "/societymanagement/resident", icon: FiUser, moduleKey: "Resident" },
//   { name: "Complaints", href: "/societymanagement/complaint", icon: FiAlertCircle, moduleKey: "Complaint" },
//   { name: "Maintenance Bills", href: "/societymanagement/maintenance-bill", icon: FiDollarSign, moduleKey: "Maintenance Bill" },
//   { name: "Guard Assignments", href: "/societymanagement/guard-assignment", icon: FiUserCheck, moduleKey: "Guard Assignment" },
//   { name: "Staff", href: "/societymanagement/staff", icon: FiUser, moduleKey: "employees" },
//   { name: "Shifts", href: "/societymanagement/shifts", icon: FiClock, moduleKey: "Shift" },
//   { name: "Attendance", href: "/societymanagement/attendance", icon: FiUser, moduleKey: "Attendance" },
//   { name: "Staff Deployments", href: "/societymanagement/staff-deployment", icon: FiUserCheck, moduleKey: "Deployment" },
//   { name: "Guard Entries", href: "/societymanagement/guard-entry", icon: FiMapPin, moduleKey: "Guard Entry" },
//   { name: "Gate Entries", href: "/societymanagement/gate-entry", icon: FiTruck, moduleKey: "Gate Entry" },
//   { name: "Notice Board", href: "/societymanagement/notice", icon: FiBell, moduleKey: "Notice" },
//   { name: "Visitor Pass", href: "/societymanagement/visitor-pass", icon: FiClipboard, moduleKey: "Visitor Pass" },
// ];

// // ── User Dropdown Component (now uses JWT) ──
// function UserMenu() {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const router = useRouter();
//   const [user, setUser] = useState({ name: "", email: "" });

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       try {
//         const decoded = jwtDecode(token);
//         setUser({
//           name: decoded.name || "User",
//           email: decoded.email || "",
//         });
//       } catch (e) {}
//     }
//   }, []);

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
//         <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
//         <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
//           <div className="px-4 py-2 border-b border-gray-100">
//             <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
//             <p className="text-xs text-gray-500 truncate">{user.email}</p>
//           </div>
//           <Link
//             href="/societymanagement/profile"
//             className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
//             onClick={() => setOpen(false)}
//           >
//             <FiUser className="text-base" /> My Profile
//           </Link>
//           <Link
//             href="/societymanagement/change-password"
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

// // ── Layout Component (now uses JWT decoding) ──
// export default function SocietyManagementLayout({ children }) {
//   const pathname = usePathname();
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [visibleModules, setVisibleModules] = useState(ALL_MODULES);
//   const [isSpecialUser, setIsSpecialUser] = useState(false); // Guard / Housekeeper
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }
//     try {
//       const decoded = jwtDecode(token);
//       const userRoles = decoded.roles || [];
//       const userModules = decoded.modules || {};

//       // Check for Guard or Housekeeper
//       if (userRoles.includes("Guard") || userRoles.includes("Housekeeper")) {
//         setIsSpecialUser(true);
//         setVisibleModules([]);
//         setLoading(false);
//         return;
//       }

//       // For normal users, filter modules based on their permissions
//       const filtered = ALL_MODULES.filter((mod) => {
//         const modPerm = userModules[mod.moduleKey];
//         return modPerm && modPerm.selected === true;
//       });
//       setVisibleModules(filtered.length > 0 ? filtered : ALL_MODULES);
//     } catch (err) {
//       console.error("Failed to decode token in layout", err);
//       setVisibleModules(ALL_MODULES);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   if (loading) {
//     return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
//   }

//   // Special users (Guard/Housekeeper) → no sidebar, just children
//   if (isSpecialUser) {
//     return <>{children}</>;
//   }

//   // Normal user layout
//   return (
//     <div className="flex h-full min-h-screen bg-gray-50">
//       {/* Sidebar */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-200 ease-in-out
//           ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
//           lg:translate-x-0 lg:static lg:z-auto`}
//       >
//         <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
//           <h1 className="text-lg font-extrabold text-indigo-600">Society Mgmt</h1>
//           <button
//             onClick={() => setSidebarOpen(false)}
//             className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//           >
//             <FiX className="text-sm" />
//           </button>
//         </div>
//         <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
//           {visibleModules.map((mod) => {
//             const isActive = pathname.startsWith(mod.href);
//             return (
//               <Link
//                 key={mod.href}
//                 href={mod.href}
//                 onClick={() => setSidebarOpen(false)}
//                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
//                   ${isActive
//                     ? "bg-indigo-50 text-indigo-700 shadow-sm"
//                     : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
//                   }`}
//               >
//                 <mod.icon className={`text-base ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
//                 {mod.name}
//               </Link>
//             );
//           })}
//         </nav>
//       </aside>

//       {/* Overlay for mobile sidebar */}
//       {sidebarOpen && (
//         <div
//           className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
//           onClick={() => setSidebarOpen(false)}
//         />
//       )}

//       {/* Main area */}
//       <div className="flex-1 flex flex-col min-w-0">
//         {/* Top bar */}
//         <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => setSidebarOpen(true)}
//               className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"
//             >
//               <FiMenu className="text-sm" />
//             </button>
//             <span className="text-base font-bold text-gray-800 lg:hidden">
//               Society Management
//             </span>
//           </div>
//           <UserMenu />
//         </header>
//         <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
//       </div>
//     </div>
//   );
// }


