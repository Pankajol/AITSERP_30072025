"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
  HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
  HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
  HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiBell, HiCreditCard,
} from "react-icons/hi";
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import { GiStockpiles } from "react-icons/gi";
import { SiCivicrm } from "react-icons/si";
import LogoutButton from "@/components/LogoutButton";
import Sidebar from "@/components/hr/Sidebar";

// ------------------------- Safe View Context -------------------------
const SafeViewContext = createContext({ safeViewEnabled: false, toggleSafeView: () => {} });
export const useSafeView = () => useContext(SafeViewContext);

function SafeViewProvider({ children }) {
  const [safeViewEnabled, setSafeViewEnabled] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("adminSafeViewMode");
      if (stored !== null) setSafeViewEnabled(stored === "true");
    } catch (e) {}
  }, []);
  const toggleSafeView = () => {
    setSafeViewEnabled(prev => {
      const newVal = !prev;
      try { localStorage.setItem("adminSafeViewMode", String(newVal)); } catch (e) {}
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

// ------------------------- MODULE_ROUTE_MAP (complete – keep as is) -------------------------
const MODULE_ROUTE_MAP = {
  "Sales Quotation": [
    { label: "Quotation View",   path: "/admin/sales-quotation-view", needsView: true },
    { label: "Create Quotation", path: "/admin/sales-quotation",      needsCreate: true },
  ],
  "Sales Order": [
    { label: "Order View",       path: "/admin/sales-order-view",     needsView: true },
    { label: "Create Order",     path: "/admin/sales-order",          needsCreate: true },
  ],
  "Sales Invoice": [
    { label: "Invoice View",     path: "/admin/sales-invoice-view",   needsView: true },
  ],
  "Delivery": [
    { label: "Delivery View",    path: "/admin/delivery-view",        needsView: true },
  ],
  "Credit Memo": [
    { label: "Credit Memo View", path: "/admin/credit-memo-veiw",     needsView: true },
  ],
  "Sales Report": [
    { label: "Sales Report",     path: "/admin/sales-report",         needsView: true },
    { label: "Sales Board",      path: "/admin/sales-board",          needsView: true },
    { label: "POS Report",       path: "/admin/pos/reports",          needsView: true },
  ],
  "Customers": [
    { label: "Customer View",    path: "/admin/customer-view",        needsView: true },
    { label: "Create Customer",  path: "/admin/createCustomers",      needsCreate: true },
  ],
  "Suppliers": [
    { label: "Supplier View",    path: "/admin/supplier",             needsView: true },
    { label: "Create Supplier",  path: "/admin/createSupplier",       needsCreate: true },
  ],
  "Items": [
    { label: "Item View",        path: "/admin/item",                 needsView: true },
    { label: "Create Item",      path: "/admin/createItem",           needsCreate: true },
  ],
  "Company": [
    { label: "Company Settings", path: "/admin/company",              needsView: true },
  ],
  "Users": [
    { label: "Users",            path: "/admin/users",                needsView: true },
  ],
  "Accounts": [
    { label: "Account Head View", path: "/admin/account-head-view",       needsView: true },
    { label: "General Ledger",    path: "/admin/bank-head-details-view",   needsView: true },
  ],
  "employees": [
    { label: "My Profile",          path: "/admin/hr/profile",               needsView: true },
    { label: "Employee Dashboard",  path: "/admin/hr/Dashboard",             needsView: true },
    { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
    { label: "Department",          path: "/admin/hr/masters",               needsView: true },
  ],
  "attendance": [
    { label: "My Attendance",       path: "/admin/hr/my-attendance",         needsView: true },
    { label: "Attendance Report",   path: "/admin/hr/attendance",            needsView: true },
  ],
  "leaves": [
    { label: "My Leaves",           path: "/admin/hr/my-leaves",             needsView: true },
    { label: "Leave Management",    path: "/admin/hr/leaves",                needsView: true },
  ],
  "salary": [
    { label: "My Salary",           path: "/admin/hr/my-salary",             needsView: true },
  ],
  "payroll": [
    { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
  ],
  "Purchase Quotation": [
    { label: "Quotation View",     path: "/admin/PurchaseQuotationList",      needsView: true },
  ],
  "Purchase Order": [
    { label: "Order View",         path: "/admin/purchase-order-view",        needsView: true },
  ],
  "GRN": [
    { label: "GRN View",           path: "/admin/grn-view",                   needsView: true },
  ],
  "Purchase Invoice": [
    { label: "Invoice View",       path: "/admin/purchaseInvoice-view",       needsView: true },
  ],
  "Debit Notes": [
    { label: "Debit Notes View",   path: "/admin/debit-notes-view",           needsView: true },
  ],
  "Purchase Report": [
    { label: "Purchase Report",    path: "/admin/purchase-report",            needsView: true },
  ],
  "Inventory": [
    { label: "Inventory View",     path: "/admin/InventoryView",              needsView: true },
    { label: "Inventory Entry",    path: "/admin/InventoryEntry",             needsCreate: true },
    { label: "Inventory Ledger",   path: "/admin/InventoryAdjustmentsView",   needsView: true },
    { label: "Gate Entry",         path: "/admin/gate-entry",                  needsCreate: true}
  ],
  "Production Order": [
    { label: "Production Order",   path: "/admin/ProductionOrder",            needsView: true },
    { label: "Production Board",   path: "/admin/production-board",           needsView: true },
  ],
  "BoM": [
    { label: "BoM",                path: "/admin/bom",                        needsCreate: true },
    { label: "BoM View",           path: "/admin/bom-view",                   needsView: true },
  ],
  "Lead Generation": [
    { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
  ],
  "Opportunity": [
    { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
  ],
  "Campaign": [
    { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
  ],
  "Email Templates": [
    { label: "Email Templates",    path: "/admin/email-templates",            needsView: true },
  ],
  "CRM Agent": [
    { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
    { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
    { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
    { label: "Email Templates",      path: "/admin/email-templates",            needsView: true },  
  ],
  "Project": [
    { label: "Projects",           path: "/admin/project/projects",           needsView: true },
    { label: "Workspaces",         path: "/admin/project/workspaces",         needsView: true },
    { label: "Tasks",              path: "/admin/project/tasks",              needsView: true },
    { label: "Task Board",         path: "/admin/project/tasks/board",        needsView: true },
  ],
  "Journal Entry": [
    { label: "Journal Entry",      path: "/admin/finance/journal-entry",      needsCreate: true },
  ],
  "Reports": [
    { label: "Trial Balance",      path: "/admin/finance/report/trial-balance", needsView: true },
  ],
  "Ageing": [
    { label: "Customer Ageing",    path: "/admin/finance/report/ageing/customer", needsView: true },
  ],
  "Statement": [
    { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
  ],
  "Bank Statement": [
    { label: "Bank Statement",     path: "/admin/finance/report/statement/bank",    needsView: true },
  ],
  "Profit & Loss": [
    { label: "Profit & Loss",      path: "/admin/finance/report/profit-loss",        needsView: true },
  ],
  "Balance Sheet": [
    { label: "Balance Sheet",      path: "/admin/finance/report/balance-sheet",      needsView: true },
  ],
  "Supplier Ageing": [
    { label: "Supplier Ageing",    path: "/admin/finance/report/ageing/supplier",    needsView: true },
  ],
  "Supplier Statement": [
    { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
  ],
  "Payment Entry": [
    { label: "Payment Form",       path: "/admin/Payment",                    needsCreate: true },
  ],
  "Ledger": [
    { label: "General Ledger",     path: "/admin/bank-head-details-view",     needsView: true },
  ],
  "Tickets": [
    { label: "Tickets",            path: "/admin/helpdesk/tickets",           needsView: true },
  ],
  "Responses": [
    { label: "Feedback",           path: "/admin/helpdesk/feedback",          needsView: true },
    { label: "Feedback Analysis",  path: "/admin/helpdesk/feedback/analytics", needsView: true },
  ],
  "PPC": [
    { label: "Operators",               path: "/admin/ppc/operatorsPage",              needsView: true },
    { label: "Machines",                path: "/admin/ppc/machinesPage",               needsView: true },
    { label: "Resources",               path: "/admin/ppc/resourcesPage",              needsView: true },
    { label: "Machine Outputs",         path: "/admin/ppc/machineOutputPage",          needsView: true },
    { label: "Holidays",                path: "/admin/ppc/holidaysPage",               needsView: true },
    { label: "Machine-Operator Map",    path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
    { label: "Operations",              path: "/admin/ppc/operations",                 needsView: true },
    { label: "Production Planning",     path: "/admin/ppc/productionOrderPage",        needsView: true },
    { label: "Job Card",                path: "/admin/ppc/jobcards",                   needsView: true },
    { label: "Tyre Job Card",           path: "/admin/ppc/tyrejobcards",               needsView: true },
    { label: "Downtime",                path: "/admin/ppc/downtime",                   needsView: true },
    { label: "Production Job Card",     path: "/admin/ppc/productionjobcards",         needsView: true },
  ],
  "Task": [
    { label: "Tasks",              path: "/admin/tasks",                       needsView: true },
    { label: "Tasks Board",        path: "/admin/tasks/board",                 needsView: true },
  ],
};

function canAccessModule(data) {
  if (!data) return false;
  if (data.selected === true) return true;
  const p = data.permissions || {};
  return !!(p.view || p.edit || p.create || p.delete);
}

// ------------------------- Sidebar Components -------------------------
const Section = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="border-b border-gray-100/80">
    <button onClick={onToggle} className="flex justify-between w-full px-4 py-3 hover:bg-indigo-50/30 transition-all duration-200 text-left group">
      <span className="flex gap-3 items-center text-sm font-medium text-gray-700">
        <span className="text-lg text-gray-500 group-hover:text-indigo-500 transition-colors">{icon}</span>
        <span className="truncate">{title}</span>
      </span>
      <span className={`text-xs text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
    </button>
    {isOpen && <div className="bg-gradient-to-r from-indigo-50/10 to-transparent pb-2 ml-8 border-l border-indigo-100/50">{children}</div>}
  </div>
);

const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
  <div className="mt-1">
    <button onClick={onToggle} className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 uppercase tracking-wider transition-colors">
      <span className="flex gap-2 items-center"><span className="text-sm">{icon}</span><span>{label}</span></span>
      <span className="text-xs">{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && <div className="ml-5 space-y-0.5 border-l border-indigo-100/50">{children}</div>}
  </div>
);

const SidebarItem = ({ href, icon, label, onClick, isActive }) => (
  <Link href={href} onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive ? "bg-gradient-to-r from-indigo-50 to-white text-indigo-700 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
    <span className={`text-base flex-shrink-0 transition-all duration-200 ${isActive ? "text-indigo-600 scale-105" : "text-gray-400 group-hover:text-indigo-500 group-hover:scale-105"}`}>{icon}</span>
    <span className="truncate">{label}</span>
    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm flex-shrink-0" />}
  </Link>
);

// ------------------------- Safe View Components -------------------------
function SafeViewToggleButton() {
  const { safeViewEnabled, toggleSafeView } = useSafeView();
  return (
    <button onClick={toggleSafeView} className={`flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${safeViewEnabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
      {safeViewEnabled ? <FiEyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <FiEye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
      <span className="hidden sm:inline">{safeViewEnabled ? "Safe ON" : "Safe View"}</span>
    </button>
  );
}

function SafeViewBanner() {
  const { safeViewEnabled } = useSafeView();
  if (!safeViewEnabled) return null;
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-xs sm:text-sm text-blue-700">
      <FiEyeOff className="h-4 w-4 shrink-0" />
      <span>🛡️ Safe View Mode ON — personal info hidden</span>
    </div>
  );
}

function UserMenu({ session, handleLogout }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { safeViewEnabled } = useSafeView();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = safeViewEnabled ? maskName(session.name || session.email, true) : (session.name || session.email || "User");
  const displayEmail = safeViewEnabled ? maskEmail(session.email, true) : session.email;
  const userInitial = session.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 focus:outline-none group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-sm font-medium shadow-md group-hover:scale-105 transition-transform">
          {userInitial}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-gray-700">{displayName.split(" ")[0]}</span>
        <HiCog size={14} className="text-gray-400 hidden sm:block group-hover:rotate-90 transition-transform duration-300" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
          </div>
          <Link href="/societymanagement/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50" onClick={() => setOpen(false)}><HiUser size={16} /> Profile</Link>
          <Link href="/societymanagement/change-password" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50" onClick={() => setOpen(false)}><HiCog size={16} /> Change Password</Link>
          <button onClick={() => { setOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"><HiX size={16} /> Logout</button>
        </div>
      )}
    </div>
  );
}

// ------------------------- MAIN LAYOUT -------------------------
export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [session, setSession] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const mainContentRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [openNotif, setOpenNotif] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const pathSegments = pathname.split("/").filter(Boolean);
  const parentSegment = pathSegments.length >= 2 ? pathSegments[pathSegments.length - 2] : null;
  const parentTitle = parentSegment ? parentSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Dashboard";
  const isDashboard = pathname === "/admin";
  const showBackButton = !isDashboard;

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/admin");
    }
  };

  // fetch notifications (same as before)
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.data.filter((n) => !n.isRead).length);
      }
    } catch (err) { console.error(err); }
  };
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchNotifications(); }, []);

  // session check
  useEffect(() => {
    async function getSession() {
      try {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/signin"); return; }
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/signin"); return; }
        const data = await res.json();
        setSession(data.user);
      } catch (err) { router.push("/signin"); }
    }
    getSession();
  }, [router]);

  // close sidebar on route change
  useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-400 border-t-indigo-600 shadow-lg" />
      </div>
    );
  }

  const isCompany = session?.type?.toLowerCase() === "company";
  const isAdmin = session?.roles?.includes("Admin");
  const hasFullAccess = isCompany || isAdmin;
  const modules = session?.modules || {};

  const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
  const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
  const closeSidebar = () => setIsSidebarOpen(false);
  const isActive = (path) => pathname === path;
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/signin"); };

  return (
    <SafeViewProvider>
      {/* Root container: no overflow on this div – scrolling handled inside main */}
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" onClick={closeSidebar} aria-hidden="true" />
        )}

        {/* SIDEBAR – fixed, does NOT scroll with page */}
        <aside
          ref={sidebarRef}
          className={`fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-out md:relative md:translate-x-0 md:shadow-xl md:w-72 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } flex flex-col border-r border-gray-200/50`}
        >
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200/50 shrink-0 bg-white/80 backdrop-blur-sm">
            <Link href="/admin" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
                <HiHome className="text-white text-sm" />
              </div>
              <span className="text-gray-800">ERP<span className="text-indigo-600">System</span></span>
            </Link>
            <button onClick={closeSidebar} className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500">
              <HiX size={20} />
            </button>
          </div>

          {/* Scrollable navigation inside sidebar */}
          <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1">
            {hasFullAccess && (
              <>
                {/* ========== Your complete sidebar sections (exactly as you had) ========== */}
                <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
                  <SidebarItem href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
                  <SidebarItem href="/admin/State" icon={<HiFlag />} label="State" onClick={closeSidebar} isActive={isActive("/admin/State")} />
                  <SidebarItem href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
                  <SidebarItem href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
                  <SidebarItem href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
                  <SidebarItem href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger" onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
                  <SidebarItem href="/admin/createCustomers" icon={<HiUserGroup />} label="Create Customer" onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
                  <SidebarItem href="/admin/supplier" icon={<HiUserGroup />} label="Supplier" onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
                  <SidebarItem href="/admin/item" icon={<HiCube />} label="Item" onClick={closeSidebar} isActive={isActive("/admin/item")} />
                  <SidebarItem href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />
                  <SidebarItem href="/admin/backup-settings" icon={<HiOutlineLibrary />} label="Backup Settings" onClick={closeSidebar} isActive={isActive("/admin/backup-settings")} />
                </Section>

                <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
                  <SidebarItem href="/admin/customer-view" icon={<HiUsers />} label="Customer View" onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
                  <SidebarItem href="/admin/supplier" icon={<HiUserGroup />} label="Supplier View" onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
                  <SidebarItem href="/admin/item" icon={<HiCube />} label="Item View" onClick={closeSidebar} isActive={isActive("/admin/item")} />
                  <SidebarItem href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head View" onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
                  <SidebarItem href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger View" onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
                  <SidebarItem href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
                  <SidebarItem href="/admin/email-masters" icon={<HiOutlineCreditCard />} label="Email & App Password Master" onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
                  <SidebarItem href="/admin/price-list" icon={<HiOutlineOfficeBuilding />} label="Price List" onClick={closeSidebar} isActive={isActive("/admin/price-list")} />
                </Section>

                <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
                  <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
                    <SidebarItem href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/sales-quotation-view")} />
                    <SidebarItem href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar} isActive={isActive("/admin/sales-order-view")} />
                    <SidebarItem href="/admin/pos" icon={<HiCube />} label="POS Invoice" onClick={closeSidebar} isActive={isActive("/admin/pos")} />
                    <SidebarItem href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" onClick={closeSidebar} isActive={isActive("/admin/delivery-view")} />
                    <SidebarItem href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar} isActive={isActive("/admin/sales-invoice-view")} />
                    <SidebarItem href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo" onClick={closeSidebar} isActive={isActive("/admin/credit-memo-veiw")} />
                    <SidebarItem href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/sales-report")} />
                    <SidebarItem href="/admin/pos/reports" icon={<HiChartSquareBar />} label="POS Report" onClick={closeSidebar} isActive={isActive("/admin/pos/reports")} />
                    <SidebarItem href="/admin/sales-board" icon={<HiChartSquareBar />} label="Sales Board" onClick={closeSidebar} isActive={isActive("/admin/sales-board")} />
                  </Submenu>
                  <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
                    <SidebarItem href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
                    <SidebarItem href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
                    <SidebarItem href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
                    <SidebarItem href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
                    <SidebarItem href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes" onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
                    <SidebarItem href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
                  </Submenu>
                </Section>

                <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
                  <SidebarItem href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
                </Section>

                <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
                  <SidebarItem href="/admin/tasks" icon={<HiUserGroup />} label="Tasks" onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
                  <SidebarItem href="/admin/tasks/board" icon={<HiPuzzle />} label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
                </Section>

                <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
                  <SidebarItem href="/admin/crm/leads-view" icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/crm/leads-view")} />
                  <SidebarItem href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
                  <SidebarItem href="/admin/crm/lead-pipeline" icon={<HiPuzzle />} label="Lead Pipeline" onClick={closeSidebar} isActive={isActive("/admin/crm/lead-pipeline")} />
                  <SidebarItem href="/admin/crm/opportunities" icon={<HiPuzzle />} label="Opportunity" onClick={closeSidebar} isActive={isActive("/admin/crm/opportunities")} />
                  <SidebarItem href="/admin/crm/campaign" icon={<HiPuzzle />} label="Campaign" onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
                  <SidebarItem href="/admin/crm/calls" icon={<HiPuzzle />} label="Calls" onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
                </Section>

                <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
                  <SidebarItem href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
                  <SidebarItem href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
                  <SidebarItem href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
                  <SidebarItem href="/admin/gate-entry" icon={<HiOutlineLibrary />} label="Gate Entry" onClick={closeSidebar} isActive={isActive("/admin/gate-entry")} />
                </Section>

                <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
                  <SidebarItem href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
                </Section>

                <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
                  <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
                    <SidebarItem href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
                  </Submenu>
                  <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
                    <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
                      <SidebarItem href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance" onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
                      <SidebarItem href="/admin/finance/report/profit-loss" icon={<HiDocumentText />} label="Profit & Loss" onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
                      <SidebarItem href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet" onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
                      <SidebarItem href="/admin/finance/report/cash-flow" icon={<HiCurrencyDollar />} label="Cash Flow Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/cash-flow")} />
                      <SidebarItem href="/admin/finance/report/bank-reconciliation" icon={<HiOutlineCreditCard />} label="Bank Reconciliation" onClick={closeSidebar} isActive={isActive("/admin/finance/report/bank-reconciliation")} />
                    </Submenu>
                    <Submenu isOpen={!!openSubmenus["gstReport"]} onToggle={() => toggleSubmenu("gstReport")} icon={<HiReceiptTax />} label="GST Report">
                      <SidebarItem href="/admin/finance/report/gst" icon={<HiDocumentText />} label="GSTR‑1 / GSTR‑3B" onClick={closeSidebar} isActive={isActive("/admin/finance/report/gst")} />
                    </Submenu>
                    <Submenu isOpen={!!openSubmenus["budgetReport"]} onToggle={() => toggleSubmenu("budgetReport")} icon={<HiChartSquareBar />} label="Budgeting">
                      <SidebarItem href="/admin/finance/budget" icon={<HiDocumentText />} label="Budget & Variance" onClick={closeSidebar} isActive={isActive("/admin/finance/budget")} />
                    </Submenu>
                    <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
                      <SidebarItem href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
                      <SidebarItem href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
                    </Submenu>
                    <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
                      <SidebarItem href="/admin/finance/report/statement/customer" icon={<HiUser />} label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
                      <SidebarItem href="/admin/finance/report/statement/supplier" icon={<HiUser />} label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
                      <SidebarItem href="/admin/finance/report/statement/bank" icon={<HiOutlineCreditCard />} label="Bank Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
                    </Submenu>
                  </Submenu>
                </Section>

                <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
                  <SidebarItem href="/admin/bom" icon={<HiOutlineCube />} label="BoM" onClick={closeSidebar} isActive={isActive("/admin/bom")} />
                  <SidebarItem href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
                </Section>

                <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
                  <SidebarItem href="/admin/bom-view" icon={<HiOutlineCube />} label="BoM View" onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
                  <SidebarItem href="/admin/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
                  <SidebarItem href="/admin/production-board" icon={<HiChartSquareBar />} label="Production Board" onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
                </Section>

                <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
                  <SidebarItem href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
                  <SidebarItem href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
                  <SidebarItem href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
                  <SidebarItem href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
                </Section>

                <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
                  <SidebarItem href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
                  <SidebarItem href="/admin/hr/Dashboard" icon={<HiUserGroup />} label="Employee Details" onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
                  <SidebarItem href="/admin/hr/masters" icon={<HiUserGroup />} label="Department" onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
                  <SidebarItem href="/admin/hr/leaves" icon={<HiUserGroup />} label="Leave" onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
                  <SidebarItem href="/admin/hr/attendance" icon={<HiUserGroup />} label="Attendance" onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
                  <SidebarItem href="/admin/hr/salary" icon={<HiUserGroup />} label="Salary" onClick={closeSidebar} isActive={isActive("/admin/hr/salary")} />
                  <SidebarItem href="/admin/hr/payroll" icon={<HiUserGroup />} label="Payroll" onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
                  <SidebarItem href="/admin/hr/employees" icon={<HiUserGroup />} label="Employee" onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
                  <SidebarItem href="/admin/hr/reports" icon={<HiUserGroup />} label="Reports" onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
                  <SidebarItem href="/admin/hr/settings" icon={<HiCog />} label="Settings" onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
                  <SidebarItem href="/admin/hr/holidays" icon={<HiGlobeAlt />} label="Holidays" onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
                  <SidebarItem href="/admin/hr/profile" icon={<HiUser />} label="Profile" onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
                </Section>

                <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
                  <SidebarItem href="/admin/ppc/operatorsPage" icon={<HiUser />} label="Operators" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
                  <SidebarItem href="/admin/ppc/machinesPage" icon={<HiOutlineCube />} label="Machines" onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
                  <SidebarItem href="/admin/ppc/resourcesPage" icon={<HiOutlineLibrary />} label="Resources" onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
                  <SidebarItem href="/admin/ppc/machineOutputPage" icon={<HiOutlineLibrary />} label="Machine Outputs" onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
                  <SidebarItem href="/admin/ppc/holidaysPage" icon={<HiGlobeAlt />} label="Holidays" onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
                  <SidebarItem href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />} label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
                  <SidebarItem href="/admin/ppc/operations" icon={<HiPuzzle />} label="Operations" onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
                  <SidebarItem href="/admin/ppc/productionOrderPage" icon={<HiReceiptTax />} label="Production Planning" onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
                  <SidebarItem href="/admin/ppc/jobcards" icon={<HiReceiptTax />} label="Job Card" onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
                  <SidebarItem href="/admin/ppc/tyre-jobcards" icon={<HiReceiptTax />} label="Tyre Job Cards" onClick={closeSidebar} isActive={isActive("/admin/ppc/tyre-jobcards")} />
                  <SidebarItem href="/admin/ppc/production-jobcards" icon={<HiReceiptTax />} label="Production Job Cards" onClick={closeSidebar} isActive={isActive("/admin/ppc/production-jobcards")} />
                  <SidebarItem href="/admin/ppc/downtime" icon={<HiReceiptTax />} label="Downtime" onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
                </Section>

                <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
                  <SidebarItem href="/admin/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
                  <SidebarItem href="/admin/helpdesk/agents" icon={<HiUsers />} label="Agents" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
                  <SidebarItem href="/admin/helpdesk/categories" icon={<HiUserGroup />} label="Categories" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
                  <SidebarItem href="/admin/helpdesk/agents/manage" icon={<HiPuzzle />} label="Create Agent" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
                  <SidebarItem href="/admin/helpdesk/settings" icon={<HiCog />} label="Settings" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
                  <SidebarItem href="/admin/helpdesk/feedback" icon={<HiDocumentText />} label="Feedback" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
                  <SidebarItem href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
                  <SidebarItem href="/admin/helpdesk/report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
                </Section>
                <Section title="Billing" icon={<HiCreditCard />} isOpen={openMenu === "billing"} onToggle={() => toggleMenu("billing")}>
                  <SidebarItem href="/admin/billing" icon={<HiOutlineOfficeBuilding />} label="Plans" onClick={closeSidebar} isActive={isActive("/admin/billing/plans")} />
             
                </Section>
              </>
            )}

            {!hasFullAccess &&
              Object.entries(modules).map(([moduleName, data]) => {
                if (!canAccessModule(data)) return null;
                const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
                if (!moduleRoutes) return null;
                const permissions = data?.permissions || {};
                const visibleRoutes = moduleRoutes.filter((route) => {
                  if (route.needsCreate && !permissions.create) return false;
                  if (route.needsView && !permissions.view) return false;
                  return true;
                });
                if (!visibleRoutes.length) return null;
                return (
                  <Section key={moduleName} title={moduleName} icon={<HiOutlineCube />} isOpen={openMenu === moduleName} onToggle={() => toggleMenu(moduleName)}>
                    {visibleRoutes.map((route) => (
                      <SidebarItem key={route.path} href={route.path} icon={<HiViewGrid />} label={route.label} onClick={closeSidebar} isActive={isActive(route.path)} />
                    ))}
                  </Section>
                );
              })}

            <div className="pt-5 mt-5 border-t border-gray-200/50">
              <LogoutButton />
            </div>
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header with top safe area – uses CSS variables set by your PhoneSafeView */}
          <header
            className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm shrink-0"
            style={{ paddingTop: "var(--safe-top, env(safe-area-inset-top, 0px))" }}
          >
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
              <div className="flex items-center gap-2 min-w-0 flex-nowrap">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0">
                  {isSidebarOpen ? <HiX size={20} /> : <HiMenu size={20} />}
                </button>
                <h1 className="text-sm sm:text-base font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-none">
                  {session?.companyName || (isCompany ? "Company Admin" : isAdmin ? "Admin Dashboard" : "Dashboard")}
                </h1>
                {showBackButton && (
                  <button onClick={goBack} className="flex items-center gap-1 sm:gap-2 rounded-md border border-gray-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap shrink-0">
                    <FiArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Back to {parentTitle}</span>
                    <span className="sm:hidden">Back</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <SafeViewToggleButton />
                <div className="relative">
                  <button onClick={() => setOpenNotif(!openNotif)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
                    <HiBell size={20} />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}
                  </button>
                  {openNotif && (
                    <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      <div className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-100">Notifications</div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? <div className="p-4 text-sm text-gray-500 text-center">No notifications</div> :
                          notifications.map((n) => (
                            <div key={n._id} onClick={() => markAsRead(n._id)} className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-indigo-50/30 transition-colors ${!n.isRead ? "bg-indigo-50/50" : ""}`}>
                              <div className="text-sm font-medium text-gray-800">{n.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{n.message}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <UserMenu session={session} handleLogout={handleLogout} />
              </div>
            </div>
          </header>

          <SafeViewBanner />

          {/* Main content – safe bottom area */}
          <main
            ref={mainContentRef}
            className="flex-1 overflow-y-auto p-4 md:p-6"
            style={{ paddingBottom: "var(--safe-bottom, env(safe-area-inset-bottom, 1rem))" }}
          >
            {children}
          </main>
        </div>
      </div>
    </SafeViewProvider>
  );
}

// "use client";

// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import { useRouter, usePathname } from "next/navigation";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiBell, 
// } from "react-icons/hi";
// import { FiArrowLeft,
// } from "react-icons/fi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import LogoutButton from "@/components/LogoutButton";

// // ─────────────────────────────────────────────────────────────
// // MODULE_ROUTE_MAP (full version – keep as is)
// // ─────────────────────────────────────────────────────────────
// const MODULE_ROUTE_MAP = {
//   "Sales Quotation": [
//     { label: "Quotation View",   path: "/admin/sales-quotation-view", needsView: true },
//     { label: "Create Quotation", path: "/admin/sales-quotation",      needsCreate: true },
//   ],
//   "Sales Order": [
//     { label: "Order View",       path: "/admin/sales-order-view",     needsView: true },
//     { label: "Create Order",     path: "/admin/sales-order",          needsCreate: true },
//   ],
//   "Sales Invoice": [
//     { label: "Invoice View",     path: "/admin/sales-invoice-view",   needsView: true },
//   ],
//   "Delivery": [
//     { label: "Delivery View",    path: "/admin/delivery-view",        needsView: true },
//   ],
//   "Credit Memo": [
//     { label: "Credit Memo View", path: "/admin/credit-memo-veiw",     needsView: true },
//   ],
//   "Sales Report": [
//     { label: "Sales Report",     path: "/admin/sales-report",         needsView: true },
//     { label: "Sales Board",      path: "/admin/sales-board",          needsView: true },
//     { label: "POS Report",       path: "/admin/pos/reports",          needsView: true },
//   ],
//   "Customers": [
//     { label: "Customer View",    path: "/admin/customer-view",        needsView: true },
//     { label: "Create Customer",  path: "/admin/createCustomers",      needsCreate: true },
//   ],
//   "Suppliers": [
//     { label: "Supplier View",    path: "/admin/supplier",             needsView: true },
//     { label: "Create Supplier",  path: "/admin/createSupplier",       needsCreate: true },
//   ],
//   "Items": [
//     { label: "Item View",        path: "/admin/item",                 needsView: true },
//     { label: "Create Item",      path: "/admin/createItem",           needsCreate: true },
//   ],
//   "Company": [
//     { label: "Company Settings", path: "/admin/company",              needsView: true },
//   ],
//   "Users": [
//     { label: "Users",            path: "/admin/users",                needsView: true },
//   ],

//   "Accounts": [
//     { label: "Account Head View", path: "/admin/account-head-view",       needsView: true },
//     { label: "General Ledger",    path: "/admin/bank-head-details-view",   needsView: true },
//   ],
//   "employees": [
//     { label: "My Profile",          path: "/admin/hr/profile",               needsView: true },
//     { label: "Employee Dashboard",  path: "/admin/hr/Dashboard",             needsView: true },
//     { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
//     { label: "Department",          path: "/admin/hr/masters",               needsView: true },
//   ],
//   "attendance": [
//     { label: "My Attendance",       path: "/admin/hr/my-attendance",         needsView: true },
//     { label: "Attendance Report",   path: "/admin/hr/attendance",            needsView: true },
//   ],
//   "leaves": [
//     { label: "My Leaves",           path: "/admin/hr/my-leaves",             needsView: true },
//     { label: "Leave Management",    path: "/admin/hr/leaves",                needsView: true },
//   ],
//   "salary": [
//     { label: "My Salary",           path: "/admin/hr/my-salary",             needsView: true },
//   ],
//   "payroll": [
//     { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
//   ],
//   "Purchase Quotation": [
//     { label: "Quotation View",     path: "/admin/PurchaseQuotationList",      needsView: true },
//   ],
//   "Purchase Order": [
//     { label: "Order View",         path: "/admin/purchase-order-view",        needsView: true },
//   ],
//   "GRN": [
//     { label: "GRN View",           path: "/admin/grn-view",                   needsView: true },
//   ],
//   "Purchase Invoice": [
//     { label: "Invoice View",       path: "/admin/purchaseInvoice-view",       needsView: true },
//   ],
//   "Debit Notes": [
//     { label: "Debit Notes View",   path: "/admin/debit-notes-view",           needsView: true },
//   ],
//   "Purchase Report": [
//     { label: "Purchase Report",    path: "/admin/purchase-report",            needsView: true },
//   ],
//   "Inventory": [
//     { label: "Inventory View",     path: "/admin/InventoryView",              needsView: true },
//     { label: "Inventory Entry",    path: "/admin/InventoryEntry",             needsCreate: true },
//     { label: "Inventory Ledger",   path: "/admin/InventoryAdjustmentsView",   needsView: true },
//     { label: "Gate Entry",         path: "/admin/gate-entry",                  needsCreate: true}
//   ],
//   "Production Order": [
//     { label: "Production Order",   path: "/admin/ProductionOrder",            needsView: true },
//     { label: "Production Board",   path: "/admin/production-board",           needsView: true },
//   ],
//   "BoM": [
//     { label: "BoM",                path: "/admin/bom",                        needsCreate: true },
//     { label: "BoM View",           path: "/admin/bom-view",                   needsView: true },
//   ],
//   "Lead Generation": [
//     { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
//   ],
//   "Opportunity": [
//     { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
//   ],
//   "Campaign": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//   ],
//   "Email Templates": [
//     { label: "Email Templates",    path: "/admin/email-templates",            needsView: true },
//   ],

//   "CRM Agent": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//     { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
//     { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
//     { label: "Email Templates",      path: "/admin/email-templates",            needsView: true },  
//   ],
//   "Project": [
//     { label: "Projects",           path: "/admin/project/projects",           needsView: true },
//     { label: "Workspaces",         path: "/admin/project/workspaces",         needsView: true },
//     { label: "Tasks",              path: "/admin/project/tasks",              needsView: true },
//     { label: "Task Board",         path: "/admin/project/tasks/board",        needsView: true },
//   ],
//   "Journal Entry": [
//     { label: "Journal Entry",      path: "/admin/finance/journal-entry",      needsCreate: true },
//   ],
//   "Reports": [
//     { label: "Trial Balance",      path: "/admin/finance/report/trial-balance", needsView: true },
//   ],
//   "Ageing": [
//     { label: "Customer Ageing",    path: "/admin/finance/report/ageing/customer", needsView: true },
//   ],
//   "Statement": [
//     { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
//   ],
//   "Bank Statement": [
//     { label: "Bank Statement",     path: "/admin/finance/report/statement/bank",    needsView: true },
//   ],
//   "Profit & Loss": [
//     { label: "Profit & Loss",      path: "/admin/finance/report/profit-loss",        needsView: true },
//   ],
  
//   "Balance Sheet": [
//     { label: "Balance Sheet",      path: "/admin/finance/report/balance-sheet",      needsView: true },
//   ],
//   "Supplier Ageing": [
//     { label: "Supplier Ageing",    path: "/admin/finance/report/ageing/supplier",    needsView: true },
//   ],
//   "Supplier Statement": [
//     { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
//   ],
//   "Payment Entry": [
//     { label: "Payment Form",       path: "/admin/Payment",                    needsCreate: true },
//   ],
//   "Ledger": [
//     { label: "General Ledger",     path: "/admin/bank-head-details-view",     needsView: true },
//   ],
//   "Tickets": [
//     { label: "Tickets",            path: "/admin/helpdesk/tickets",           needsView: true },
//   ],
//   "Responses": [
//     { label: "Feedback",           path: "/admin/helpdesk/feedback",          needsView: true },
//     { label: "Feedback Analysis",  path: "/admin/helpdesk/feedback/analytics", needsView: true },
//   ],
//   "PPC": [
//     { label: "Operators",               path: "/admin/ppc/operatorsPage",              needsView: true },
//     { label: "Machines",                path: "/admin/ppc/machinesPage",               needsView: true },
//     { label: "Resources",               path: "/admin/ppc/resourcesPage",              needsView: true },
//     { label: "Machine Outputs",         path: "/admin/ppc/machineOutputPage",          needsView: true },
//     { label: "Holidays",                path: "/admin/ppc/holidaysPage",               needsView: true },
//     { label: "Machine-Operator Map",    path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
//     { label: "Operations",              path: "/admin/ppc/operations",                 needsView: true },
//     { label: "Production Planning",     path: "/admin/ppc/productionOrderPage",        needsView: true },
//     { label: "Job Card",                path: "/admin/ppc/jobcards",                   needsView: true },
//     { label: "Downtime",                path: "/admin/ppc/downtime",                   needsView: true },
//   ],
//   "Task": [
//     { label: "Tasks",              path: "/admin/tasks",                       needsView: true },
//     { label: "Tasks Board",        path: "/admin/tasks/board",                 needsView: true },
//   ],
// };

// function canAccessModule(data) {
//   if (!data) return false;
//   if (data.selected === true) return true;
//   const p = data.permissions || {};
//   return !!(p.view || p.edit || p.create || p.delete);
// }

// // ─── Modern Helper Components ─────────────────────────────────────
// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-100/80">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-4 py-3 hover:bg-indigo-50/30 transition-all duration-200 text-left group"
//     >
//       <span className="flex gap-3 items-center text-sm font-medium text-gray-700">
//         <span className="text-lg text-gray-500 group-hover:text-indigo-500 transition-colors">{icon}</span>
//         <span className="truncate">{title}</span>
//       </span>
//       <span className={`text-xs text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
//         ▼
//       </span>
//     </button>
//     {isOpen && (
//       <div className="bg-gradient-to-r from-indigo-50/10 to-transparent pb-2 ml-8 border-l border-indigo-100/50">
//         {children}
//       </div>
//     )}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
//     >
//       <span className="flex gap-2 items-center">
//         <span className="text-sm">{icon}</span>
//         <span>{label}</span>
//       </span>
//       <span className="text-xs">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-5 space-y-0.5 border-l border-indigo-100/50">{children}</div>}
//   </div>
// );

// const SidebarItem = ({ href, icon, label, onClick, isActive }) => (
//   <Link
//     href={href}
//     onClick={onClick}
//     className={`
//       flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
//       transition-all duration-200 group
//       ${isActive
//         ? "bg-gradient-to-r from-indigo-50 to-white text-indigo-700 shadow-sm"
//         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
//       }
//     `}
//   >
//     <span className={`text-base flex-shrink-0 transition-all duration-200 ${
//       isActive ? "text-indigo-600 scale-105" : "text-gray-400 group-hover:text-indigo-500 group-hover:scale-105"
//     }`}>{icon}</span>
//     <span className="truncate">{label}</span>
//     {isActive && (
//       <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm flex-shrink-0" />
//     )}
//   </Link>
// );

// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});
//   const [session, setSession] = useState(null);
//   const [userDropdownOpen, setUserDropdownOpen] = useState(false);
//   const router = useRouter();
//   const pathname = usePathname();
//   const sidebarRef = useRef(null);
//   const dropdownRef = useRef(null);
//   const mainContentRef = useRef(null);

//   const [notifications, setNotifications] = useState([]);
//   const [openNotif, setOpenNotif] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);

//   // Parent title for back button
//   const pathSegments = pathname.split("/").filter(Boolean);
//   const parentSegment = pathSegments.length >= 2 ? pathSegments[pathSegments.length - 2] : null;
//   const parentTitle = parentSegment
//     ? parentSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
//     : "Dashboard";

//   const isDashboard = pathname === "/admin";
//   const showBackButton = !isDashboard;

//   const scrollToTop = () => {
//     if (mainContentRef.current) {
//       mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   const goBack = () => {
//     if (window.history.length > 1) {
//       router.back();
//     } else {
//       router.push("/admin");
//     }
//   };

//   // Close dropdown outside click
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setUserDropdownOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Fetch notifications
//   useEffect(() => {
//     fetchNotifications();
//   }, []);

//   const fetchNotifications = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success) {
//         setNotifications(data.data);
//         setUnreadCount(data.data.filter((n) => !n.isRead).length);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const markAsRead = async (id) => {
//     try {
//       const token = localStorage.getItem("token");
//       await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
//       fetchNotifications();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // Session check
//   useEffect(() => {
//     async function getSession() {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           router.push("/signin");
//           return;
//         }
//         const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
//         if (!res.ok) {
//           localStorage.removeItem("token");
//           localStorage.removeItem("user");
//           router.push("/signin");
//           return;
//         }
//         const data = await res.json();
//         setSession(data.user);
//       } catch (err) {
//         console.error("Session fetch error:", err);
//         router.push("/signin");
//       }
//     }
//     getSession();
//   }, [router]);

//   // Close sidebar on route change
//   useEffect(() => {
//     setIsSidebarOpen(false);
//   }, [pathname]);

//   // Escape key closes
//   useEffect(() => {
//     const handler = (e) => {
//       if (e.key === "Escape") {
//         setIsSidebarOpen(false);
//         setUserDropdownOpen(false);
//       }
//     };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, []);

//   if (!session)
//     return (
//       <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
//         <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-400 border-t-indigo-600 shadow-lg" />
//       </div>
//     );

//   const isCompany = session?.type?.toLowerCase() === "company";
//   const isAdmin = session?.roles?.includes("Admin");
//   const hasFullAccess = isCompany || isAdmin;
//   const modules = session?.modules || {};

//   const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
//   const closeSidebar = () => setIsSidebarOpen(false);
//   const isActive = (path) => pathname === path;

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     router.push("/signin");
//   };

//   return (
//     <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden font-sans">
//       <style jsx global>{`
//         * { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
//         .safe-top { padding-top: env(safe-area-inset-top, 0px); }
//         .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
//         .safe-left { padding-left: env(safe-area-inset-left, 0px); }
//         .safe-right { padding-right: env(safe-area-inset-right, 0px); }
        
//         /* Custom scrollbar */
//         ::-webkit-scrollbar { width: 6px; height: 6px; }
//         ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
//         ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
//         ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
//       `}</style>

//       {/* Overlay for mobile sidebar */}
//       {isSidebarOpen && (
//         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" onClick={closeSidebar} aria-hidden="true" />
//       )}

//       {/* Sidebar – modern glass effect */}
//       <aside
//         ref={sidebarRef}
//         aria-label="Sidebar navigation"
//         className={`fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-out md:relative md:translate-x-0 md:shadow-xl md:w-72 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } flex flex-col border-r border-gray-200/50 safe-left`}
//       >
//         <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200/50 shrink-0 safe-top bg-white/80 backdrop-blur-sm">
//           <Link href="/admin" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
//             <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200">
//               <HiHome className="text-white text-sm" />
//             </div>
//             <span className="text-gray-800">ERP<span className="text-indigo-600">System</span></span>
//           </Link>
//           <button
//             onClick={closeSidebar}
//             className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
//           >
//             <HiX size={20} />
//           </button>
//         </div>

//         <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1 safe-bottom">
//           {hasFullAccess && (
//             <>
//               <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//                 <SidebarItem href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
//                 <SidebarItem href="/admin/State" icon={<HiFlag />} label="State" onClick={closeSidebar} isActive={isActive("/admin/State")} />
//                 <SidebarItem href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
//                 <SidebarItem href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
//                 <SidebarItem href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <SidebarItem href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger" onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <SidebarItem href="/admin/createCustomers" icon={<HiUserGroup />} label="Create Customer" onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
//                 <SidebarItem href="/admin/supplier" icon={<HiUserGroup />} label="Supplier" onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <SidebarItem href="/admin/item" icon={<HiCube />} label="Item" onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <SidebarItem href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />
//                 <SidebarItem href="/admin/backup-settings" icon={<HiOutlineLibrary />} label="Backup Settings" onClick={closeSidebar} isActive={isActive("/admin/backup-settings")} />
//               </Section>

//               <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
//                 <SidebarItem href="/admin/customer-view" icon={<HiUsers />} label="Customer View" onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
//                 <SidebarItem href="/admin/supplier" icon={<HiUserGroup />} label="Supplier View" onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <SidebarItem href="/admin/item" icon={<HiCube />} label="Item View" onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <SidebarItem href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head View" onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <SidebarItem href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger View" onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <SidebarItem href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <SidebarItem href="/admin/email-masters" icon={<HiOutlineCreditCard />} label="Email & App Password Master" onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
//                 <SidebarItem href="/admin/price-list" icon={<HiOutlineOfficeBuilding />} label="Price List" onClick={closeSidebar} isActive={isActive("/admin/price-list")} />
//               </Section>

//               <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//                 <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//                   <SidebarItem href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/sales-quotation-view")} />
//                   <SidebarItem href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar} isActive={isActive("/admin/sales-order-view")} />
//                   <SidebarItem href="/admin/pos" icon={<HiCube />} label="POS Invoice" onClick={closeSidebar} isActive={isActive("/admin/pos")} />
//                   <SidebarItem href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" onClick={closeSidebar} isActive={isActive("/admin/delivery-view")} />
//                   <SidebarItem href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar} isActive={isActive("/admin/sales-invoice-view")} />
//                   <SidebarItem href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo" onClick={closeSidebar} isActive={isActive("/admin/credit-memo-veiw")} />
//                   <SidebarItem href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/sales-report")} />
//                   <SidebarItem href="/admin/pos/reports" icon={<HiChartSquareBar />} label="POS Report" onClick={closeSidebar} isActive={isActive("/admin/pos/reports")} />
//                   <SidebarItem href="/admin/sales-board" icon={<HiChartSquareBar />} label="Sales Board" onClick={closeSidebar} isActive={isActive("/admin/sales-board")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
//                   <SidebarItem href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
//                   <SidebarItem href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
//                   <SidebarItem href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
//                   <SidebarItem href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
//                   <SidebarItem href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes" onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
//                   <SidebarItem href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
//                 </Submenu>
//               </Section>

//               <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//                 <SidebarItem href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
//               </Section>

//               <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//                 <SidebarItem href="/admin/tasks" icon={<HiUserGroup />} label="Tasks" onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
//                 <SidebarItem href="/admin/tasks/board" icon={<HiPuzzle />} label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
//               </Section>

//               <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//                 <SidebarItem href="/admin/crm/leads-view" icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/crm/leads-view")} />
//                 <SidebarItem href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <SidebarItem href="/admin/crm/lead-pipeline" icon={<HiPuzzle />} label="Lead Pipeline" onClick={closeSidebar} isActive={isActive("/admin/crm/lead-pipeline")} />
//                 <SidebarItem href="/admin/crm/opportunities" icon={<HiPuzzle />} label="Opportunity" onClick={closeSidebar} isActive={isActive("/admin/crm/opportunities")} />
//                 <SidebarItem href="/admin/crm/campaign" icon={<HiPuzzle />} label="Campaign" onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
//                 <SidebarItem href="/admin/crm/calls" icon={<HiPuzzle />} label="Calls" onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
//               </Section>

//               <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//                 <SidebarItem href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
//                 <SidebarItem href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
//                 <SidebarItem href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
//                 <SidebarItem href="/admin/gate-entry" icon={<HiOutlineLibrary />} label="Gate Entry" onClick={closeSidebar} isActive={isActive("/admin/gate-entry")} />
//               </Section>

//               <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//                 <SidebarItem href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
//               </Section>

//               <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
//                 <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
//                   <SidebarItem href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
//                   <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
//                     <SidebarItem href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance" onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
//                     <SidebarItem href="/admin/finance/report/profit-loss" icon={<HiDocumentText />} label="Profit & Loss" onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
//                     <SidebarItem href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet" onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
//                     <SidebarItem href="/admin/finance/report/cash-flow" icon={<HiCurrencyDollar />} label="Cash Flow Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/cash-flow")} />
//                     <SidebarItem href="/admin/finance/report/bank-reconciliation" icon={<HiOutlineCreditCard />} label="Bank Reconciliation" onClick={closeSidebar} isActive={isActive("/admin/finance/report/bank-reconciliation")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["gstReport"]} onToggle={() => toggleSubmenu("gstReport")} icon={<HiReceiptTax />} label="GST Report">
//                     <SidebarItem href="/admin/finance/report/gst" icon={<HiDocumentText />} label="GSTR‑1 / GSTR‑3B" onClick={closeSidebar} isActive={isActive("/admin/finance/report/gst")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["budgetReport"]} onToggle={() => toggleSubmenu("budgetReport")} icon={<HiChartSquareBar />} label="Budgeting">
//                     <SidebarItem href="/admin/finance/budget" icon={<HiDocumentText />} label="Budget & Variance" onClick={closeSidebar} isActive={isActive("/admin/finance/budget")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
//                     <SidebarItem href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
//                     <SidebarItem href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
//                     <SidebarItem href="/admin/finance/report/statement/customer" icon={<HiUser />} label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
//                     <SidebarItem href="/admin/finance/report/statement/supplier" icon={<HiUser />} label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
//                     <SidebarItem href="/admin/finance/report/statement/bank" icon={<HiOutlineCreditCard />} label="Bank Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
//                   </Submenu>
//                 </Submenu>
//               </Section>

//               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//                 <SidebarItem href="/admin/bom" icon={<HiOutlineCube />} label="BoM" onClick={closeSidebar} isActive={isActive("/admin/bom")} />
//                 <SidebarItem href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
//               </Section>

//               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
//                 <SidebarItem href="/admin/bom-view" icon={<HiOutlineCube />} label="BoM View" onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
//                 <SidebarItem href="/admin/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
//                 <SidebarItem href="/admin/production-board" icon={<HiChartSquareBar />} label="Production Board" onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
//               </Section>

//               <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
//                 <SidebarItem href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
//                 <SidebarItem href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
//                 <SidebarItem href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
//                 <SidebarItem href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
//               </Section>

//               <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//                 <SidebarItem href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
//                 <SidebarItem href="/admin/hr/Dashboard" icon={<HiUserGroup />} label="Employee Details" onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
//                 <SidebarItem href="/admin/hr/masters" icon={<HiUserGroup />} label="Department" onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
//                 <SidebarItem href="/admin/hr/leaves" icon={<HiUserGroup />} label="Leave" onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
//                 <SidebarItem href="/admin/hr/attendance" icon={<HiUserGroup />} label="Attendance" onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
//                 <SidebarItem href="/admin/hr/salary" icon={<HiUserGroup />} label="Salary" onClick={closeSidebar} isActive={isActive("/admin/hr/salary")} />
//                 <SidebarItem href="/admin/hr/payroll" icon={<HiUserGroup />} label="Payroll" onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
//                 <SidebarItem href="/admin/hr/employees" icon={<HiUserGroup />} label="Employee" onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
//                 <SidebarItem href="/admin/hr/reports" icon={<HiUserGroup />} label="Reports" onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
//                 <SidebarItem href="/admin/hr/settings" icon={<HiCog />} label="Settings" onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
//                 <SidebarItem href="/admin/hr/holidays" icon={<HiGlobeAlt />} label="Holidays" onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
//                 <SidebarItem href="/admin/hr/profile" icon={<HiUser />} label="Profile" onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
//               </Section>

//               <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//                 <SidebarItem href="/admin/ppc/operatorsPage" icon={<HiUser />} label="Operators" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
//                 <SidebarItem href="/admin/ppc/machinesPage" icon={<HiOutlineCube />} label="Machines" onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
//                 <SidebarItem href="/admin/ppc/resourcesPage" icon={<HiOutlineLibrary />} label="Resources" onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
//                 <SidebarItem href="/admin/ppc/machineOutputPage" icon={<HiOutlineLibrary />} label="Machine Outputs" onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
//                 <SidebarItem href="/admin/ppc/holidaysPage" icon={<HiGlobeAlt />} label="Holidays" onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
//                 <SidebarItem href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />} label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
//                 <SidebarItem href="/admin/ppc/operations" icon={<HiPuzzle />} label="Operations" onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
//                 <SidebarItem href="/admin/ppc/productionOrderPage" icon={<HiReceiptTax />} label="Production Planning" onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
//                 <SidebarItem href="/admin/ppc/jobcards" icon={<HiReceiptTax />} label="Job Card" onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
//                 <SidebarItem href="/admin/ppc/downtime" icon={<HiReceiptTax />} label="Downtime" onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
//               </Section>

//               <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//                 <SidebarItem href="/admin/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
//                 <SidebarItem href="/admin/helpdesk/agents" icon={<HiUsers />} label="Agents" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
//                 <SidebarItem href="/admin/helpdesk/categories" icon={<HiUserGroup />} label="Categories" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
//                 <SidebarItem href="/admin/helpdesk/agents/manage" icon={<HiPuzzle />} label="Create Agent" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
//                 <SidebarItem href="/admin/helpdesk/settings" icon={<HiCog />} label="Settings" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
//                 <SidebarItem href="/admin/helpdesk/feedback" icon={<HiDocumentText />} label="Feedback" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
//                 <SidebarItem href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
//                 <SidebarItem href="/admin/helpdesk/report" icon={<HiChartSquareBar />} label="Report" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
//               </Section>
//             </>
//           )}

//           {!hasFullAccess &&
//             Object.entries(modules).map(([moduleName, data]) => {
//               if (!canAccessModule(data)) return null;
//               const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
//               if (!moduleRoutes) return null;
//               const permissions = data?.permissions || {};
//               const visibleRoutes = moduleRoutes.filter((route) => {
//                 if (route.needsCreate && !permissions.create) return false;
//                 if (route.needsView && !permissions.view) return false;
//                 return true;
//               });
//               if (!visibleRoutes.length) return null;
//               return (
//                 <Section key={moduleName} title={moduleName} icon={<HiOutlineCube />} isOpen={openMenu === moduleName} onToggle={() => toggleMenu(moduleName)}>
//                   {visibleRoutes.map((route) => (
//                     <SidebarItem key={route.path} href={route.path} icon={<HiViewGrid />} label={route.label} onClick={closeSidebar} isActive={isActive(route.path)} />
//                   ))}
//                 </Section>
//               );
//             })}

//           <div className="pt-5 mt-5 border-t border-gray-200/50">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* MAIN CONTENT AREA */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm safe-top">
//           <div className="flex items-center justify-between h-16 px-4 md:px-6">
//             <div className="flex items-center gap-3 min-w-0">
//               <button
//                 onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
//               >
//                 {isSidebarOpen ? <HiX size={20} /> : <HiMenu size={20} />}
//               </button>

             

   

//               <h1 className="text-base font-semibold text-gray-800 truncate">
//                 {session?.companyName || (isCompany ? "Company Admin" : isAdmin ? "Admin Dashboard" : "Dashboard")}
//               </h1>

//                {/* Modern Back Button */}
//               {showBackButton && (
//                 <button
//                   onClick={goBack}
//                  className="items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
//                 >
//                   <FiArrowLeft className="h-4 w-4" />
//                   Back to {parentTitle}
//                 </button>
//               )}
                  
//             </div>

//             <div className="flex items-center gap-4 safe-right">
//               {/* Notifications */}
//               <div className="relative">
//                 <button
//                   onClick={() => setOpenNotif(!openNotif)}
//                   className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
//                 >
//                   <HiBell size={20} />
//                   {unreadCount > 0 && (
//                     <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
//                   )}
//                 </button>
//                 {openNotif && (
//                   <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
//                     <div className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-100">Notifications</div>
//                     <div className="max-h-80 overflow-y-auto">
//                       {notifications.length === 0 ? (
//                         <div className="p-4 text-sm text-gray-500 text-center">No notifications</div>
//                       ) : (
//                         notifications.map((n) => (
//                           <div
//                             key={n._id}
//                             onClick={() => markAsRead(n._id)}
//                             className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-indigo-50/30 transition-colors ${!n.isRead ? "bg-indigo-50/50" : ""}`}
//                           >
//                             <div className="text-sm font-medium text-gray-800">{n.title}</div>
//                             <div className="text-xs text-gray-500 mt-1">{n.message}</div>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* User menu */}
//               <div className="relative" ref={dropdownRef}>
//                 <button
//                   onClick={() => setUserDropdownOpen(!userDropdownOpen)}
//                   className="flex items-center gap-2 focus:outline-none group"
//                 >
//                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-sm font-medium shadow-md group-hover:scale-105 transition-transform">
//                     {session.email?.charAt(0).toUpperCase()}
//                   </div>
//                   <span className="hidden sm:inline text-sm font-medium text-gray-700">{session.name?.split(" ")[0] || "User"}</span>
//                   <HiCog size={14} className="text-gray-400 hidden sm:block group-hover:rotate-90 transition-transform duration-300" />
//                 </button>
//                 {userDropdownOpen && (
//                   <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 py-1 z-50">
//                     <Link
//                       href="/societymanagement/profile"
//                       className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
//                       onClick={() => setUserDropdownOpen(false)}
//                     >
//                       <HiUser size={16} /> Profile
//                     </Link>
//                     <Link
//                       href="/societymanagement/change-password"
//                       className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 transition-colors"
//                       onClick={() => setUserDropdownOpen(false)}
//                     >
//                       <HiCog size={16} /> Change Password
//                     </Link>
//                     <button
//                       onClick={() => {
//                         setUserDropdownOpen(false);
//                         handleLogout();
//                       }}
//                       className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
//                     >
//                       <HiX size={16} /> Logout
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </header>

//         {/* Main content */}
//         <main
//           ref={mainContentRef}
//           className="flex-1 overflow-y-auto p-4 md:p-6 safe-bottom safe-left safe-right"
//         >
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }



// "use client";

// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiBell,
// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter, usePathname } from "next/navigation";
// import LogoutButton from "@/components/LogoutButton";

// // ─────────────────────────────────────────────────────────────
// // MODULE_ROUTE_MAP (unchanged functionality)
// // ─────────────────────────────────────────────────────────────
// const MODULE_ROUTE_MAP = {
//   "Sales Quotation": [
//     { label: "Quotation View",   path: "/admin/sales-quotation-view", needsView: true },
//     { label: "Create Quotation", path: "/admin/sales-quotation",      needsCreate: true },
//   ],
//   "Sales Order": [
//     { label: "Order View",       path: "/admin/sales-order-view",     needsView: true },
//     { label: "Create Order",     path: "/admin/sales-order",          needsCreate: true },
//   ],
//   "Sales Invoice": [
//     { label: "Invoice View",     path: "/admin/sales-invoice-view",   needsView: true },
//   ],
//   "Delivery": [
//     { label: "Delivery View",    path: "/admin/delivery-view",        needsView: true },
//   ],
//   "Credit Memo": [
//     { label: "Credit Memo View", path: "/admin/credit-memo-veiw",     needsView: true },
//   ],
//   "Sales Report": [
//     { label: "Sales Report",     path: "/admin/sales-report",         needsView: true },
//     { label: "Sales Board",      path: "/admin/sales-board",          needsView: true },
//     { label: "POS Report",       path: "/admin/pos/reports",          needsView: true },
//   ],
//   "Customers": [
//     { label: "Customer View",    path: "/admin/customer-view",        needsView: true },
//     { label: "Create Customer",  path: "/admin/createCustomers",      needsCreate: true },
//   ],
//   "Suppliers": [
//     { label: "Supplier View",    path: "/admin/supplier",             needsView: true },
//     { label: "Create Supplier",  path: "/admin/createSupplier",       needsCreate: true },
//   ],
//   "Items": [
//     { label: "Item View",        path: "/admin/item",                 needsView: true },
//     { label: "Create Item",      path: "/admin/createItem",           needsCreate: true },
//   ],
//   "Company": [
//     { label: "Company Settings", path: "/admin/company",              needsView: true },
//   ],
//   "Users": [
//     { label: "Users",            path: "/admin/users",                needsView: true },
//   ],
//   "Accounts": [
//     { label: "Account Head View", path: "/admin/account-head-view",       needsView: true },
//     { label: "General Ledger",    path: "/admin/bank-head-details-view",   needsView: true },
//   ],
//   "employees": [
//     { label: "My Profile",          path: "/admin/hr/profile",               needsView: true },
//     { label: "Employee Dashboard",  path: "/admin/hr/Dashboard",             needsView: true },
//     { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
//     { label: "Department",          path: "/admin/hr/masters",               needsView: true },
//   ],
//   "attendance": [
//     { label: "My Attendance",       path: "/admin/hr/my-attendance",         needsView: true },
//     { label: "Attendance Report",   path: "/admin/hr/attendance",            needsView: true },
//   ],
//   "leaves": [
//     { label: "My Leaves",           path: "/admin/hr/my-leaves",             needsView: true },
//     { label: "Leave Management",    path: "/admin/hr/leaves",                needsView: true },
//   ],
//   "salary": [
//     { label: "My Salary",           path: "/admin/hr/my-salary",             needsView: true },
//   ],
//   "payroll": [
//     { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
//   ],
//   "Purchase Quotation": [
//     { label: "Quotation View",     path: "/admin/PurchaseQuotationList",      needsView: true },
//   ],
//   "Purchase Order": [
//     { label: "Order View",         path: "/admin/purchase-order-view",        needsView: true },
//   ],
//   "GRN": [
//     { label: "GRN View",           path: "/admin/grn-view",                   needsView: true },
//   ],
//   "Purchase Invoice": [
//     { label: "Invoice View",       path: "/admin/purchaseInvoice-view",       needsView: true },
//   ],
//   "Debit Notes": [
//     { label: "Debit Notes View",   path: "/admin/debit-notes-view",           needsView: true },
//   ],
//   "Purchase Report": [
//     { label: "Purchase Report",    path: "/admin/purchase-report",            needsView: true },
//   ],
//   "Inventory": [
//     { label: "Inventory View",     path: "/admin/InventoryView",              needsView: true },
//     { label: "Inventory Entry",    path: "/admin/InventoryEntry",             needsCreate: true },
//     { label: "Inventory Ledger",   path: "/admin/InventoryAdjustmentsView",   needsView: true },
//     { label: "Gate Entry",         path: "/admin/gate-entry",                  needsCreate: true}
//   ],
//   "Production Order": [
//     { label: "Production Order",   path: "/admin/ProductionOrder",            needsView: true },
//     { label: "Production Board",   path: "/admin/production-board",           needsView: true },
//   ],
//   "BoM": [
//     { label: "BoM",                path: "/admin/bom",                        needsCreate: true },
//     { label: "BoM View",           path: "/admin/bom-view",                   needsView: true },
//   ],
//   "Lead Generation": [
//     { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
//   ],
//   "Opportunity": [
//     { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
//   ],
//   "Campaign": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//   ],
//   "Email Templates": [
//     { label: "Email Templates",    path: "/admin/email-templates",            needsView: true },
//   ],

//   "CRM Agent": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//     { label: "Opportunity",        path: "/admin/crm/opportunities",              needsView: true },
//     { label: "Lead Generation",    path: "/admin/crm/leads-view",                 needsView: true },
//     { label: "Email Templates",      path: "/admin/email-templates",            needsView: true },  
//   ],
//   "Project": [
//     { label: "Projects",           path: "/admin/project/projects",           needsView: true },
//     { label: "Workspaces",         path: "/admin/project/workspaces",         needsView: true },
//     { label: "Tasks",              path: "/admin/project/tasks",              needsView: true },
//     { label: "Task Board",         path: "/admin/project/tasks/board",        needsView: true },
//   ],
//   "Journal Entry": [
//     { label: "Journal Entry",      path: "/admin/finance/journal-entry",      needsCreate: true },
//   ],
//   "Reports": [
//     { label: "Trial Balance",      path: "/admin/finance/report/trial-balance", needsView: true },
//   ],
//   "Ageing": [
//     { label: "Customer Ageing",    path: "/admin/finance/report/ageing/customer", needsView: true },
//   ],
//   "Statement": [
//     { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
//   ],
//   "Bank Statement": [
//     { label: "Bank Statement",     path: "/admin/finance/report/statement/bank",    needsView: true },
//   ],
//   "Profit & Loss": [
//     { label: "Profit & Loss",      path: "/admin/finance/report/profit-loss",        needsView: true },
//   ],
  
//   "Balance Sheet": [
//     { label: "Balance Sheet",      path: "/admin/finance/report/balance-sheet",      needsView: true },
//   ],
//   "Supplier Ageing": [
//     { label: "Supplier Ageing",    path: "/admin/finance/report/ageing/supplier",    needsView: true },
//   ],
//   "Supplier Statement": [
//     { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
//   ],
//   "Payment Entry": [
//     { label: "Payment Form",       path: "/admin/Payment",                    needsCreate: true },
//   ],
//   "Ledger": [
//     { label: "General Ledger",     path: "/admin/bank-head-details-view",     needsView: true },
//   ],
//   "Tickets": [
//     { label: "Tickets",            path: "/admin/helpdesk/tickets",           needsView: true },
//   ],
//   "Responses": [
//     { label: "Feedback",           path: "/admin/helpdesk/feedback",          needsView: true },
//     { label: "Feedback Analysis",  path: "/admin/helpdesk/feedback/analytics", needsView: true },
//   ],
//   "PPC": [
//     { label: "Operators",               path: "/admin/ppc/operatorsPage",              needsView: true },
//     { label: "Machines",                path: "/admin/ppc/machinesPage",               needsView: true },
//     { label: "Resources",               path: "/admin/ppc/resourcesPage",              needsView: true },
//     { label: "Machine Outputs",         path: "/admin/ppc/machineOutputPage",          needsView: true },
//     { label: "Holidays",                path: "/admin/ppc/holidaysPage",               needsView: true },
//     { label: "Machine-Operator Map",    path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
//     { label: "Operations",              path: "/admin/ppc/operations",                 needsView: true },
//     { label: "Production Planning",     path: "/admin/ppc/productionOrderPage",        needsView: true },
//     { label: "Job Card",                path: "/admin/ppc/jobcards",                   needsView: true },
//     { label: "Downtime",                path: "/admin/ppc/downtime",                   needsView: true },
//   ],
//   "Task": [
//     { label: "Tasks",              path: "/admin/tasks",                       needsView: true },
//     { label: "Tasks Board",        path: "/admin/tasks/board",                 needsView: true },
//   ],
// };

// function canAccessModule(data) {
//   if (!data) return false;
//   if (data.selected === true) return true;
//   const p = data.permissions || {};
//   return !!(p.view || p.edit || p.create || p.delete);
// }

// // ─── Helper Components (light theme versions) ─────────────────
// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-200">
//     <button onClick={onToggle} className="flex justify-between w-full px-3 py-3 hover:bg-gray-100 transition-colors text-left">
//       <span className="flex gap-3 items-center font-medium text-sm text-gray-700">
//         <span className="text-lg text-blue-600">{icon}</span>
//         <span className="truncate">{title}</span>
//       </span>
//       <span className="text-xs ml-2 shrink-0 text-gray-500">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="bg-gray-50 pb-2 ml-4 border-l border-gray-200">{children}</div>
//     )}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button onClick={onToggle} className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 uppercase tracking-wider transition-colors">
//       <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-2 space-y-0.5 border-l border-gray-200">{children}</div>}
//   </div>
// );

// const Item = ({ href, icon, label, onClick, isActive }) => (
//   <Link href={href} onClick={onClick}
//     className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all font-serif ${
//       isActive ? "text-blue-700 bg-blue-100 border-r-2 border-blue-500" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
//     }`}>
//     <span className="text-base opacity-70 shrink-0">{icon}</span>
//     <span className="truncate">{label}</span>
//   </Link>
// );

// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu]           = useState(null);
//   const [openSubmenus, setOpenSubmenus]   = useState({});
//   const [session, setSession]             = useState(null);
//   const router   = useRouter();
//   const pathname = usePathname();
//   const sidebarRef = useRef(null);

//   const [notifications, setNotifications] = useState([]);
//   const [openNotif, setOpenNotif]         = useState(false);
//   const [unreadCount, setUnreadCount]     = useState(0);

//   useEffect(() => { fetchNotifications(); }, []);

//   const fetchNotifications = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res  = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success) {
//         setNotifications(data.data);
//         setUnreadCount(data.data.filter(n => !n.isRead).length);
//       }
//     } catch (err) { console.error(err); }
//   };

//   const markAsRead = async (id) => {
//     try {
//       const token = localStorage.getItem("token");
//       await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
//       fetchNotifications();
//     } catch (err) { console.error(err); }
//   };

//   useEffect(() => {
//     async function getSession() {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) { router.push("/signin"); return; }
//         const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
//         if (!res.ok) { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/signin"); return; }
//         const data = await res.json();
//         setSession(data.user);
//       } catch (err) { console.error("Session fetch error:", err); router.push("/signin"); }
//     }
//     getSession();
//   }, [router]);

//   useEffect(() => { setIsSidebarOpen(false); }, [pathname]);
//   useEffect(() => {
//     const handler = (e) => { if (e.key === "Escape") setIsSidebarOpen(false); };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, []);

//   if (!session) return (
//     <div className="flex h-screen items-center justify-center bg-gray-50">
//       <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
//     </div>
//   );

//   const isCompany    = session?.type?.toLowerCase() === "company";
//   const isAdmin      = session?.roles?.includes("Admin");
//   const hasFullAccess = isCompany || isAdmin;
//   const modules      = session?.modules || {};

//   const toggleSubmenu = (k) => setOpenSubmenus(p => ({ ...p, [k]: !p[k] }));
//   const toggleMenu    = (m) => setOpenMenu(openMenu === m ? null : m);
//   const closeSidebar  = () => setIsSidebarOpen(false);
//   const isActive      = (path) => pathname === path;

//   return (
//     <div className="flex h-screen bg-gray-50 overflow-hidden pt-safe-top sm:pt-0 font-serif">
//       {/* Global font override */}
//       <style jsx global>{`
//         * { font-family: 'Times New Roman', Times, serif; }
//       `}</style>

//       {isSidebarOpen && (
//         <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={closeSidebar} aria-hidden="true" />
//       )}

//       <aside ref={sidebarRef} aria-label="Sidebar navigation"
//         className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-white text-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } flex flex-col shadow-xl border-r border-gray-200`}>

//         <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-gray-50 border-b border-gray-200 shrink-0">
//           <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider text-gray-800">
//             <HiHome className="text-blue-600 shrink-0" />
//             <Link href="/admin" className="truncate">ERP SYSTEM</Link>
//           </span>
//           {isSidebarOpen && (
//             <button onClick={closeSidebar} className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600">
//               <HiX size={24} />
//             </button>
//           )}
//         </div>

//         <nav className="flex-1 overflow-y-auto py-2">
//           {hasFullAccess && (
//             <>
//               <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//                 <Item href="/admin/Countries"            icon={<HiGlobeAlt />}              label="Countries"            onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
//                 <Item href="/admin/State"                icon={<HiFlag />}                  label="State"                onClick={closeSidebar} isActive={isActive("/admin/State")} />
//                 <Item href="/admin/CreateGroup"          icon={<HiUserGroup />}             label="Create Group"         onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
//                 <Item href="/admin/CreateItemGroup"      icon={<HiOutlineCube />}           label="Create Item Group"    onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
//                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}        label="Account Head"         onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}        label="General Ledger"       onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/createCustomers"      icon={<HiUserGroup />}             label="Create Customer"      onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
//                 <Item href="/admin/supplier"             icon={<HiUserGroup />}             label="Supplier"             onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                 icon={<HiCube />}                  label="Item"                 onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />}        label="Warehouse Details"    onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />

//              <Item href="/admin/backup-settings" icon={<HiOutlineLibrary />} label="Backup Settings" onClick={closeSidebar} isActive={isActive("/admin/backup-settings")} />
//               </Section>
//               <Section title="System" icon={<HiCog />} isOpen={openMenu === "system"} onToggle={() => toggleMenu("system")}>
//               <Item href="/admin/backup-settings" icon={<HiOutlineLibrary />} label="Backup Setting" onClick={closeSidebar} isActive={isActive("/admin/backup-settings")} />
// </Section>

//               <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
//                 <Item href="/admin/customer-view"        icon={<HiUsers />}                 label="Customer View"                onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
//                 <Item href="/admin/supplier"             icon={<HiUserGroup />}             label="Supplier View"                onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                 icon={<HiCube />}                  label="Item View"                    onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}        label="Account Head View"            onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}        label="General Ledger View"          onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/email-templates"      icon={<HiDocumentText />}          label="Email Templates"              onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <Item href="/admin/email-masters"        icon={<HiOutlineCreditCard />}     label="Email & App Password Master"  onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
//                 <Item href="/admin/price-list"           icon={<HiOutlineOfficeBuilding />} label="Price List"                   onClick={closeSidebar} isActive={isActive("/admin/price-list")} />
//               </Section>

//               <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//                 <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//                   <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />}           label="Quotation View"  onClick={closeSidebar} isActive={isActive("/admin/sales-quotation-view")} />
//                   <Item href="/admin/sales-order-view"     icon={<HiPuzzle />}            label="Order View"      onClick={closeSidebar} isActive={isActive("/admin/sales-order-view")} />
//                   <Item href="/admin/pos"                  icon={<HiCube />}              label="POS Invoice"     onClick={closeSidebar} isActive={isActive("/admin/pos")} />
//                   <Item href="/admin/delivery-view"        icon={<HiOutlineCube />}       label="Delivery View"   onClick={closeSidebar} isActive={isActive("/admin/delivery-view")} />
//                   <Item href="/admin/sales-invoice-view"   icon={<HiOutlineCreditCard />} label="Invoice View"    onClick={closeSidebar} isActive={isActive("/admin/sales-invoice-view")} />
//                   <Item href="/admin/credit-memo-veiw"     icon={<HiReceiptTax />}        label="Credit Memo"     onClick={closeSidebar} isActive={isActive("/admin/credit-memo-veiw")} />
//                   <Item href="/admin/sales-report"         icon={<HiChartSquareBar />}    label="Report"          onClick={closeSidebar} isActive={isActive("/admin/sales-report")} />
//                   <Item href="/admin/pos/reports"          icon={<HiChartSquareBar />}    label="POS Report"      onClick={closeSidebar} isActive={isActive("/admin/pos/reports")} />
//                   <Item href="/admin/sales-board"          icon={<HiChartSquareBar />}    label="Sales Board"     onClick={closeSidebar} isActive={isActive("/admin/sales-board")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
//                   <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />}           label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
//                   <Item href="/admin/purchase-order-view"   icon={<HiPuzzle />}            label="Order View"     onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
//                   <Item href="/admin/grn-view"              icon={<HiOutlineCube />}       label="GRN View"       onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
//                   <Item href="/admin/purchaseInvoice-view"  icon={<HiOutlineCreditCard />} label="Invoice View"   onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
//                   <Item href="/admin/debit-notes-view"      icon={<HiReceiptTax />}        label="Debit Notes"    onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
//                   <Item href="/admin/purchase-report"       icon={<HiChartSquareBar />}    label="Report"         onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
//                 </Submenu>
//               </Section>

//               <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//                 <Item href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
//               </Section>
//               <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//                 <Item href="/admin/tasks"       icon={<HiUserGroup />} label="Tasks"       onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
//                 <Item href="/admin/tasks/board" icon={<HiPuzzle />}    label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
//               </Section>
//               <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//                 <Item href="/admin/crm/leads-view"    icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/crm/leads-view")} />
//                 <Item href="/admin/email-templates"      icon={<HiDocumentText />} label="Email Templates" onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <Item href="/admin/crm/lead-pipeline" icon={<HiPuzzle />}    label="Lead Pipeline"   onClick={closeSidebar} isActive={isActive("/admin/crm/lead-pipeline")} />
//                 <Item href="/admin/crm/opportunities" icon={<HiPuzzle />}    label="Opportunity"     onClick={closeSidebar} isActive={isActive("/admin/crm/opportunities")} />
//                 <Item href="/admin/crm/campaign"  icon={<HiPuzzle />}    label="Campaign"        onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
//                 <Item href="/admin/crm/calls"     icon={<HiPuzzle />}    label="Calls"           onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
//               </Section>
//               <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//                 <Item href="/admin/InventoryView"            icon={<HiOutlineLibrary />} label="Inventory View"   onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
//                 <Item href="/admin/InventoryEntry"           icon={<HiOutlineLibrary />} label="Inventory Entry"  onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
//                 <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
//                 <Item href="/admin/gate-entry"               icon={<HiOutlineLibrary />} label="Gate Entry"       onClick={closeSidebar} isActive={isActive("/admin/gate-entry")} />
//               </Section>
//               <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//                 <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
//               </Section>

//               {/* ========== FINANCE SECTION (UPDATED) ========== */}
//               <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
//                 <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
//                   <Item href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
//                   <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
//                     <Item href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
//                     <Item href="/admin/finance/report/profit-loss"   icon={<HiDocumentText />} label="Profit & Loss"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
//                     <Item href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
//                     <Item href="/admin/finance/report/cash-flow"     icon={<HiCurrencyDollar />} label="Cash Flow Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/cash-flow")} />
//                     <Item href="/admin/finance/report/bank-reconciliation" icon={<HiOutlineCreditCard />} label="Bank Reconciliation" onClick={closeSidebar} isActive={isActive("/admin/finance/report/bank-reconciliation")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["gstReport"]} onToggle={() => toggleSubmenu("gstReport")} icon={<HiReceiptTax />} label="GST Report">
//                     <Item href="/admin/finance/report/gst" icon={<HiDocumentText />} label="GSTR‑1 / GSTR‑3B" onClick={closeSidebar} isActive={isActive("/admin/finance/report/gst")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["budgetReport"]} onToggle={() => toggleSubmenu("budgetReport")} icon={<HiChartSquareBar />} label="Budgeting">
//                     <Item href="/admin/finance/budget" icon={<HiDocumentText />} label="Budget & Variance" onClick={closeSidebar} isActive={isActive("/admin/finance/budget")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
//                     <Item href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
//                     <Item href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
//                     <Item href="/admin/finance/report/statement/customer" icon={<HiUser />}              label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
//                     <Item href="/admin/finance/report/statement/supplier" icon={<HiUser />}              label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
//                     <Item href="/admin/finance/report/statement/bank"     icon={<HiOutlineCreditCard />} label="Bank Statement"     onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
//                   </Submenu>
//                 </Submenu>
//               </Section>

//               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//                 <Item href="/admin/bom"             icon={<HiOutlineCube />} label="BoM"              onClick={closeSidebar} isActive={isActive("/admin/bom")} />
//                 <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />}  label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
//               </Section>
//               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
//                 <Item href="/admin/bom-view"                   icon={<HiOutlineCube />}    label="BoM View"               onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
//                 <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />}     label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
//                 <Item href="/admin/production-board"           icon={<HiChartSquareBar />} label="Production Board"       onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
//               </Section>
//               <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
//                 <Item href="/admin/project/workspaces"  icon={<HiOutlineOfficeBuilding />} label="Workspaces"  onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
//                 <Item href="/admin/project/projects"    icon={<HiOutlineCube />}           label="Projects"    onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
//                 <Item href="/admin/project/tasks/board" icon={<HiPuzzle />}                label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
//                 <Item href="/admin/project/tasks"       icon={<HiPuzzle />}                label="Tasks List"  onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
//               </Section>
//               <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//                 <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
//                 <Item href="/admin/hr/Dashboard"           icon={<HiUserGroup />} label="Employee Details"    onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
//                 <Item href="/admin/hr/masters"             icon={<HiUserGroup />} label="Department"          onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
//                 <Item href="/admin/hr/leaves"              icon={<HiUserGroup />} label="Leave"               onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
//                 <Item href="/admin/hr/attendance"          icon={<HiUserGroup />} label="Attendance"          onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
//                 <Item href="/admin/hr/salary"              icon={<HiUserGroup />} label="Salary"              onClick={closeSidebar} isActive={isActive("/admin/hr/salary")} />
//                 <Item href="/admin/hr/payroll"             icon={<HiUserGroup />} label="Payroll"             onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
//                 <Item href="/admin/hr/employees"           icon={<HiUserGroup />} label="Employee"            onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
//                 <Item href="/admin/hr/reports"             icon={<HiUserGroup />} label="Reports"             onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
//                 <Item href="/admin/hr/settings"            icon={<HiCog />}       label="Settings"            onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
//                 <Item href="/admin/hr/holidays"            icon={<HiGlobeAlt />}  label="Holidays"            onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
//                 <Item href="/admin/hr/profile"             icon={<HiUser />}      label="Profile"             onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
//               </Section>
//               <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//                 <Item href="/admin/ppc/operatorsPage"              icon={<HiUser />}           label="Operators"                onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
//                 <Item href="/admin/ppc/machinesPage"               icon={<HiOutlineCube />}    label="Machines"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
//                 <Item href="/admin/ppc/resourcesPage"              icon={<HiOutlineLibrary />} label="Resources"                onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
//                 <Item href="/admin/ppc/machineOutputPage"          icon={<HiOutlineLibrary />} label="Machine Outputs"          onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
//                 <Item href="/admin/ppc/holidaysPage"               icon={<HiGlobeAlt />}       label="Holidays"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
//                 <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />}         label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
//                 <Item href="/admin/ppc/operations"                 icon={<HiPuzzle />}         label="Operations"               onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
//                 <Item href="/admin/ppc/productionOrderPage"        icon={<HiReceiptTax />}     label="Production Planning"      onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
//                 <Item href="/admin/ppc/jobcards"                   icon={<HiReceiptTax />}     label="Job Card"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
//                 <Item href="/admin/ppc/downtime"                   icon={<HiReceiptTax />}     label="Downtime"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
//               </Section>
//               <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//                 <Item href="/admin/helpdesk/tickets"            icon={<HiDocumentText />}   label="Tickets"           onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
//                 <Item href="/admin/helpdesk/agents"             icon={<HiUsers />}          label="Agents"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
//                 <Item href="/admin/helpdesk/categories"         icon={<HiUserGroup />}      label="Categories"        onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
//                 <Item href="/admin/helpdesk/agents/manage"      icon={<HiPuzzle />}         label="Create Agent"      onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
//                 <Item href="/admin/helpdesk/settings"           icon={<HiCog />}            label="Settings"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
//                 <Item href="/admin/helpdesk/feedback"           icon={<HiDocumentText />}   label="Feedback"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
//                 <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
//                 <Item href="/admin/helpdesk/report"             icon={<HiChartSquareBar />} label="Report"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
//               </Section>
//             </>
//           )}

//           {!hasFullAccess &&
//             Object.entries(modules).map(([moduleName, data]) => {
//               if (!canAccessModule(data)) return null;
//               const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
//               if (!moduleRoutes) return null;
//               const permissions = data?.permissions || {};
//               const visibleRoutes = moduleRoutes.filter(route => {
//                 if (route.needsCreate && !permissions.create) return false;
//                 if (route.needsView   && !permissions.view)   return false;
//                 return true;
//               });
//               if (!visibleRoutes.length) return null;
//               return (
//                 <Section key={moduleName} title={moduleName} icon={<HiOutlineCube />}
//                   isOpen={openMenu === moduleName} onToggle={() => toggleMenu(moduleName)}>
//                   {visibleRoutes.map(route => (
//                     <Item key={route.path} href={route.path} icon={<HiViewGrid />}
//                       label={route.label} onClick={closeSidebar} isActive={isActive(route.path)} />
//                   ))}
//                 </Section>
//               );
//             })
//           }

//           <div className="p-4 mt-4 border-t border-gray-200">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* CONTENT AREA */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm shrink-0">
//           <div className="flex items-center justify-between px-4 h-14">
//             <div className="flex items-center gap-3 min-w-0">
//               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors">
//                 {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
//               </button>
//             <h1 className="text-sm md:text-base font-bold text-gray-800 truncate tracking-tight">
//   {session?.companyName || (isCompany ? "Company Administrator" : isAdmin ? "Admin Dashboard" : "Dashboard")}
// </h1>
//             </div>

//             <div className="flex items-center gap-3 shrink-0 relative">
//               <div className="relative">
//                 <button onClick={() => setOpenNotif(!openNotif)} className="relative p-2 text-gray-600 hover:text-gray-900">
//                   <HiBell size={22} />
//                   {unreadCount > 0 && (
//                     <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full">{unreadCount}</span>
//                   )}
//                 </button>
//                 {openNotif && (
//                   <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
//                     <div className="p-3 font-bold border-b border-gray-200">Notifications</div>
//                     <div className="max-h-80 overflow-y-auto">
//                       {notifications.length === 0 ? (
//                         <div className="p-4 text-sm text-gray-500">No notifications</div>
//                       ) : (
//                         notifications.map(n => (
//                           <div key={n._id} onClick={() => markAsRead(n._id)}
//                             className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${!n.isRead ? "bg-gray-50 font-semibold" : ""}`}>
//                             <div className="text-sm">{n.title}</div>
//                             <div className="text-xs text-gray-500">{n.message}</div>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//               <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
//                 <span>{session.name || session.email}</span>
//               </div>
//               <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/20 shadow-sm" title={session.email}>
//                 {session.email?.charAt(0).toUpperCase()}
//               </div>
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto bg-gray-50">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }



// "use client";

// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome, HiBell,
// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter, usePathname } from "next/navigation";
// import LogoutButton from "@/components/LogoutButton";

// // ─────────────────────────────────────────────────────────────
// // MODULE_ROUTE_MAP (unchanged functionality)
// // ─────────────────────────────────────────────────────────────
// const MODULE_ROUTE_MAP = {
//   "Sales Quotation": [
//     { label: "Quotation View",   path: "/admin/sales-quotation-view", needsView: true },
//     { label: "Create Quotation", path: "/admin/sales-quotation",      needsCreate: true },
//   ],
//   "Sales Order": [
//     { label: "Order View",       path: "/admin/sales-order-view",     needsView: true },
//     { label: "Create Order",     path: "/admin/sales-order",          needsCreate: true },
//   ],
//   "Sales Invoice": [
//     { label: "Invoice View",     path: "/admin/sales-invoice-view",   needsView: true },
//   ],
//   "Delivery": [
//     { label: "Delivery View",    path: "/admin/delivery-view",        needsView: true },
//   ],
//   "Credit Memo": [
//     { label: "Credit Memo View", path: "/admin/credit-memo-veiw",     needsView: true },
//   ],
//   "Sales Report": [
//     { label: "Sales Report",     path: "/admin/sales-report",         needsView: true },
//     { label: "Sales Board",      path: "/admin/sales-board",          needsView: true },
//     { label: "POS Report",       path: "/admin/pos/reports",          needsView: true },
//   ],
//   "Customers": [
//     { label: "Customer View",    path: "/admin/customer-view",        needsView: true },
//     { label: "Create Customer",  path: "/admin/createCustomers",      needsCreate: true },
//   ],
//   "Suppliers": [
//     { label: "Supplier View",    path: "/admin/supplier",             needsView: true },
//     { label: "Create Supplier",  path: "/admin/createSupplier",       needsCreate: true },
//   ],
//   "Items": [
//     { label: "Item View",        path: "/admin/item",                 needsView: true },
//     { label: "Create Item",      path: "/admin/createItem",           needsCreate: true },
//   ],
//   "Company": [
//     { label: "Company Settings", path: "/admin/company",              needsView: true },
//   ],
//   "Users": [
//     { label: "Users",            path: "/admin/users",                needsView: true },
//   ],
//   "Accounts": [
//     { label: "Account Head View", path: "/admin/account-head-view",       needsView: true },
//     { label: "General Ledger",    path: "/admin/bank-head-details-view",   needsView: true },
//   ],
//   "employees": [
//     { label: "My Profile",          path: "/admin/hr/profile",               needsView: true },
//     { label: "Employee Dashboard",  path: "/admin/hr/Dashboard",             needsView: true },
//     { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
//     { label: "Department",          path: "/admin/hr/masters",               needsView: true },
//   ],
//   "attendance": [
//     { label: "My Attendance",       path: "/admin/hr/my-attendance",         needsView: true },
//     { label: "Attendance Report",   path: "/admin/hr/attendance",            needsView: true },
//   ],
//   "leaves": [
//     { label: "My Leaves",           path: "/admin/hr/my-leaves",             needsView: true },
//     { label: "Leave Management",    path: "/admin/hr/leaves",                needsView: true },
//   ],
//   "salary": [
//     { label: "My Salary",           path: "/admin/hr/my-salary",             needsView: true },
//   ],
//   "payroll": [
//     { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
//   ],
//   "Purchase Quotation": [
//     { label: "Quotation View",     path: "/admin/PurchaseQuotationList",      needsView: true },
//   ],
//   "Purchase Order": [
//     { label: "Order View",         path: "/admin/purchase-order-view",        needsView: true },
//   ],
//   "GRN": [
//     { label: "GRN View",           path: "/admin/grn-view",                   needsView: true },
//   ],
//   "Purchase Invoice": [
//     { label: "Invoice View",       path: "/admin/purchaseInvoice-view",       needsView: true },
//   ],
//   "Debit Notes": [
//     { label: "Debit Notes View",   path: "/admin/debit-notes-view",           needsView: true },
//   ],
//   "Purchase Report": [
//     { label: "Purchase Report",    path: "/admin/purchase-report",            needsView: true },
//   ],
//   "Inventory": [
//     { label: "Inventory View",     path: "/admin/InventoryView",              needsView: true },
//     { label: "Inventory Entry",    path: "/admin/InventoryEntry",             needsCreate: true },
//     { label: "Inventory Ledger",   path: "/admin/InventoryAdjustmentsView",   needsView: true },
//     { lable: "Gate Entry",         path: "/admin/gate-entry",                  needsCreate: true}
//   ],
//   "Production Order": [
//     { label: "Production Order",   path: "/admin/ProductionOrder",            needsView: true },
//     { label: "Production Board",   path: "/admin/production-board",           needsView: true },
//   ],
//   "BoM": [
//     { label: "BoM",                path: "/admin/bom",                        needsCreate: true },
//     { label: "BoM View",           path: "/admin/bom-view",                   needsView: true },
//   ],
//   "Lead Generation": [
//     { label: "Lead Generation",    path: "/admin/leads-view",                 needsView: true },
//   ],
//   "Opportunity": [
//     { label: "Opportunity",        path: "/admin/opportunities",              needsView: true },
//   ],
//   "Campaign": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//   ],
//   "Email Templates": [
//     { label: "Email Templates",    path: "/admin/email-templates",            needsView: true },
//   ],

//   "CRM Agent": [
//     { label: "Campaign",           path: "/admin/crm/campaign",               needsView: true },
//     { label: "Opportunity",        path: "/admin/opportunities",              needsView: true },
//     { label: "Lead Generation",    path: "/admin/leads-view",                 needsView: true },
//     { label: "Email Templates",      path: "/admin/email-templates",            needsView: true },  
//   ],
//   "Project": [
//     { label: "Projects",           path: "/admin/project/projects",           needsView: true },
//     { label: "Workspaces",         path: "/admin/project/workspaces",         needsView: true },
//     { label: "Tasks",              path: "/admin/project/tasks",              needsView: true },
//     { label: "Task Board",         path: "/admin/project/tasks/board",        needsView: true },
//   ],
//   "Journal Entry": [
//     { label: "Journal Entry",      path: "/admin/finance/journal-entry",      needsCreate: true },
//   ],
//   "Reports": [
//     { label: "Trial Balance",      path: "/admin/finance/report/trial-balance", needsView: true },
//   ],
//   "Ageing": [
//     { label: "Customer Ageing",    path: "/admin/finance/report/ageing/customer", needsView: true },
//   ],
//   "Statement": [
//     { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
//   ],
//   "Bank Statement": [
//     { label: "Bank Statement",     path: "/admin/finance/report/statement/bank",    needsView: true },
//   ],
//   "Profit & Loss": [
//     { label: "Profit & Loss",      path: "/admin/finance/report/profit-loss",        needsView: true },
//   ],
  
//   "Balance Sheet": [
//     { label: "Balance Sheet",      path: "/admin/finance/report/balance-sheet",      needsView: true },
//   ],
//   "Supplier Ageing": [
//     { label: "Supplier Ageing",    path: "/admin/finance/report/ageing/supplier",    needsView: true },
//   ],
//   "Supplier Statement": [
//     { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
//   ],
//   "Payment Entry": [
//     { label: "Payment Form",       path: "/admin/Payment",                    needsCreate: true },
//   ],
//   "Ledger": [
//     { label: "General Ledger",     path: "/admin/bank-head-details-view",     needsView: true },
//   ],
//   "Tickets": [
//     { label: "Tickets",            path: "/admin/helpdesk/tickets",           needsView: true },
//   ],
//   "Responses": [
//     { label: "Feedback",           path: "/admin/helpdesk/feedback",          needsView: true },
//     { label: "Feedback Analysis",  path: "/admin/helpdesk/feedback/analytics", needsView: true },
//   ],
//   "PPC": [
//     { label: "Operators",               path: "/admin/ppc/operatorsPage",              needsView: true },
//     { label: "Machines",                path: "/admin/ppc/machinesPage",               needsView: true },
//     { label: "Resources",               path: "/admin/ppc/resourcesPage",              needsView: true },
//     { label: "Machine Outputs",         path: "/admin/ppc/machineOutputPage",          needsView: true },
//     { label: "Holidays",                path: "/admin/ppc/holidaysPage",               needsView: true },
//     { label: "Machine-Operator Map",    path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
//     { label: "Operations",              path: "/admin/ppc/operations",                 needsView: true },
//     { label: "Production Planning",     path: "/admin/ppc/productionOrderPage",        needsView: true },
//     { label: "Job Card",                path: "/admin/ppc/jobcards",                   needsView: true },
//     { label: "Downtime",                path: "/admin/ppc/downtime",                   needsView: true },
//   ],
//   "Task": [
//     { label: "Tasks",              path: "/admin/tasks",                       needsView: true },
//     { label: "Tasks Board",        path: "/admin/tasks/board",                 needsView: true },
//   ],
// };

// function canAccessModule(data) {
//   if (!data) return false;
//   if (data.selected === true) return true;
//   const p = data.permissions || {};
//   return !!(p.view || p.edit || p.create || p.delete);
// }

// // ─── Helper Components (light theme versions) ─────────────────
// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-200">
//     <button onClick={onToggle} className="flex justify-between w-full px-3 py-3 hover:bg-gray-100 transition-colors text-left">
//       <span className="flex gap-3 items-center font-medium text-sm text-gray-700">
//         <span className="text-lg text-blue-600">{icon}</span>
//         <span className="truncate">{title}</span>
//       </span>
//       <span className="text-xs ml-2 shrink-0 text-gray-500">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="bg-gray-50 pb-2 ml-4 border-l border-gray-200">{children}</div>
//     )}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button onClick={onToggle} className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 uppercase tracking-wider transition-colors">
//       <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-2 space-y-0.5 border-l border-gray-200">{children}</div>}
//   </div>
// );

// const Item = ({ href, icon, label, onClick, isActive }) => (
//   <Link href={href} onClick={onClick}
//     className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all font-serif ${
//       isActive ? "text-blue-700 bg-blue-100 border-r-2 border-blue-500" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
//     }`}>
//     <span className="text-base opacity-70 shrink-0">{icon}</span>
//     <span className="truncate">{label}</span>
//   </Link>
// );

// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu]           = useState(null);
//   const [openSubmenus, setOpenSubmenus]   = useState({});
//   const [session, setSession]             = useState(null);
//   const router   = useRouter();
//   const pathname = usePathname();
//   const sidebarRef = useRef(null);

//   const [notifications, setNotifications] = useState([]);
//   const [openNotif, setOpenNotif]         = useState(false);
//   const [unreadCount, setUnreadCount]     = useState(0);

//   useEffect(() => { fetchNotifications(); }, []);

//   const fetchNotifications = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res  = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
//       const data = await res.json();
//       if (data.success) {
//         setNotifications(data.data);
//         setUnreadCount(data.data.filter(n => !n.isRead).length);
//       }
//     } catch (err) { console.error(err); }
//   };

//   const markAsRead = async (id) => {
//     try {
//       const token = localStorage.getItem("token");
//       await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
//       fetchNotifications();
//     } catch (err) { console.error(err); }
//   };

//   useEffect(() => {
//     async function getSession() {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) { router.push("/signin"); return; }
//         const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
//         if (!res.ok) { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/signin"); return; }
//         const data = await res.json();
//         setSession(data.user);
//       } catch (err) { console.error("Session fetch error:", err); router.push("/signin"); }
//     }
//     getSession();
//   }, [router]);

//   useEffect(() => { setIsSidebarOpen(false); }, [pathname]);
//   useEffect(() => {
//     const handler = (e) => { if (e.key === "Escape") setIsSidebarOpen(false); };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, []);

//   if (!session) return (
//     <div className="flex h-screen items-center justify-center bg-gray-50">
//       <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
//     </div>
//   );

//   const isCompany    = session?.type?.toLowerCase() === "company";
//   const isAdmin      = session?.roles?.includes("Admin");
//   const hasFullAccess = isCompany || isAdmin;
//   const modules      = session?.modules || {};

//   const toggleSubmenu = (k) => setOpenSubmenus(p => ({ ...p, [k]: !p[k] }));
//   const toggleMenu    = (m) => setOpenMenu(openMenu === m ? null : m);
//   const closeSidebar  = () => setIsSidebarOpen(false);
//   const isActive      = (path) => pathname === path;

//   return (
//     <div className="flex h-screen bg-gray-50 overflow-hidden pt-safe-top sm:pt-0 font-serif">
//       {/* Global font override */}
//       <style jsx global>{`
//         * { font-family: 'Times New Roman', Times, serif; }
//       `}</style>

//       {isSidebarOpen && (
//         <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={closeSidebar} aria-hidden="true" />
//       )}

//       <aside ref={sidebarRef} aria-label="Sidebar navigation"
//         className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-white text-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } flex flex-col shadow-xl border-r border-gray-200`}>

//         <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-gray-50 border-b border-gray-200 shrink-0">
//           <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider text-gray-800">
//             <HiHome className="text-blue-600 shrink-0" />
//             <Link href="/admin" className="truncate">ERP SYSTEM</Link>
//           </span>
//           {isSidebarOpen && (
//             <button onClick={closeSidebar} className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600">
//               <HiX size={24} />
//             </button>
//           )}
//         </div>

//         <nav className="flex-1 overflow-y-auto py-2">
//           {hasFullAccess && (
//             <>
//               <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//                 <Item href="/admin/Countries"            icon={<HiGlobeAlt />}              label="Countries"            onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
//                 <Item href="/admin/State"                icon={<HiFlag />}                  label="State"                onClick={closeSidebar} isActive={isActive("/admin/State")} />
//                 <Item href="/admin/CreateGroup"          icon={<HiUserGroup />}             label="Create Group"         onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
//                 <Item href="/admin/CreateItemGroup"      icon={<HiOutlineCube />}           label="Create Item Group"    onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
//                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}        label="Account Head"         onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}        label="General Ledger"       onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/createCustomers"      icon={<HiUserGroup />}             label="Create Customer"      onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
//                 <Item href="/admin/supplier"             icon={<HiUserGroup />}             label="Supplier"             onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                 icon={<HiCube />}                  label="Item"                 onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />}        label="Warehouse Details"    onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />
//               </Section>

//               <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
//                 <Item href="/admin/customer-view"        icon={<HiUsers />}                 label="Customer View"                onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
//                 <Item href="/admin/supplier"             icon={<HiUserGroup />}             label="Supplier View"                onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                 icon={<HiCube />}                  label="Item View"                    onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}        label="Account Head View"            onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}        label="General Ledger View"          onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/email-templates"      icon={<HiDocumentText />}          label="Email Templates"              onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <Item href="/admin/email-masters"        icon={<HiOutlineCreditCard />}     label="Email & App Password Master"  onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
//                 <Item href="/admin/price-list"           icon={<HiOutlineOfficeBuilding />} label="Price List"                   onClick={closeSidebar} isActive={isActive("/admin/price-list")} />
//               </Section>

//               <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//                 <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//                   <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />}           label="Quotation View"  onClick={closeSidebar} isActive={isActive("/admin/sales-quotation-view")} />
//                   <Item href="/admin/sales-order-view"     icon={<HiPuzzle />}            label="Order View"      onClick={closeSidebar} isActive={isActive("/admin/sales-order-view")} />
//                   <Item href="/admin/pos"                  icon={<HiCube />}              label="POS Invoice"     onClick={closeSidebar} isActive={isActive("/admin/pos")} />
//                   <Item href="/admin/delivery-view"        icon={<HiOutlineCube />}       label="Delivery View"   onClick={closeSidebar} isActive={isActive("/admin/delivery-view")} />
//                   <Item href="/admin/sales-invoice-view"   icon={<HiOutlineCreditCard />} label="Invoice View"    onClick={closeSidebar} isActive={isActive("/admin/sales-invoice-view")} />
//                   <Item href="/admin/credit-memo-veiw"     icon={<HiReceiptTax />}        label="Credit Memo"     onClick={closeSidebar} isActive={isActive("/admin/credit-memo-veiw")} />
//                   <Item href="/admin/sales-report"         icon={<HiChartSquareBar />}    label="Report"          onClick={closeSidebar} isActive={isActive("/admin/sales-report")} />
//                   <Item href="/admin/pos/reports"          icon={<HiChartSquareBar />}    label="POS Report"      onClick={closeSidebar} isActive={isActive("/admin/pos/reports")} />
//                   <Item href="/admin/sales-board"          icon={<HiChartSquareBar />}    label="Sales Board"     onClick={closeSidebar} isActive={isActive("/admin/sales-board")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
//                   <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />}           label="Quotation View" onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
//                   <Item href="/admin/purchase-order-view"   icon={<HiPuzzle />}            label="Order View"     onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
//                   <Item href="/admin/grn-view"              icon={<HiOutlineCube />}       label="GRN View"       onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
//                   <Item href="/admin/purchaseInvoice-view"  icon={<HiOutlineCreditCard />} label="Invoice View"   onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
//                   <Item href="/admin/debit-notes-view"      icon={<HiReceiptTax />}        label="Debit Notes"    onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
//                   <Item href="/admin/purchase-report"       icon={<HiChartSquareBar />}    label="Report"         onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
//                 </Submenu>
//               </Section>

//               <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//                 <Item href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
//               </Section>
//               <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//                 <Item href="/admin/tasks"       icon={<HiUserGroup />} label="Tasks"       onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
//                 <Item href="/admin/tasks/board" icon={<HiPuzzle />}    label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
//               </Section>
//               <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//                 <Item href="/admin/leads-view"    icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/leads-view")} />
//                 <Item href="/admin/opportunities" icon={<HiPuzzle />}    label="Opportunity"     onClick={closeSidebar} isActive={isActive("/admin/opportunities")} />
//                 <Item href="/admin/crm/campaign"  icon={<HiPuzzle />}    label="Campaign"        onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
//                 <Item href="/admin/crm/calls"     icon={<HiPuzzle />}    label="Calls"           onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
//               </Section>
//               <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//                 <Item href="/admin/InventoryView"            icon={<HiOutlineLibrary />} label="Inventory View"   onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
//                 <Item href="/admin/InventoryEntry"           icon={<HiOutlineLibrary />} label="Inventory Entry"  onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
//                 <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
//                 <Item href="/admin/gate-entry"               icon={<HiOutlineLibrary />} label="Gate Entry"       onClick={closeSidebar} isActive={isActive("/admin/gate-entry")} />
//               </Section>
//               <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//                 <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
//               </Section>
//               <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
//                 <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
//                   <Item href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
//                   <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
//                     <Item href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
//                     <Item href="/admin/finance/report/profit-loss"   icon={<HiDocumentText />} label="Profit & Loss"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
//                     <Item href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
//                     <Item href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
//                     <Item href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
//                     <Item href="/admin/finance/report/statement/customer" icon={<HiUser />}              label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
//                     <Item href="/admin/finance/report/statement/supplier" icon={<HiUser />}              label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
//                     <Item href="/admin/finance/report/statement/bank"     icon={<HiOutlineCreditCard />} label="Bank Statement"     onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
//                   </Submenu>
//                 </Submenu>
//               </Section>
//               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//                 <Item href="/admin/bom"             icon={<HiOutlineCube />} label="BoM"              onClick={closeSidebar} isActive={isActive("/admin/bom")} />
//                 <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />}  label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
//               </Section>
//               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
//                 <Item href="/admin/bom-view"                   icon={<HiOutlineCube />}    label="BoM View"               onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
//                 <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />}     label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
//                 <Item href="/admin/production-board"           icon={<HiChartSquareBar />} label="Production Board"       onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
//               </Section>
//               <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
//                 <Item href="/admin/project/workspaces"  icon={<HiOutlineOfficeBuilding />} label="Workspaces"  onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
//                 <Item href="/admin/project/projects"    icon={<HiOutlineCube />}           label="Projects"    onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
//                 <Item href="/admin/project/tasks/board" icon={<HiPuzzle />}                label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
//                 <Item href="/admin/project/tasks"       icon={<HiPuzzle />}                label="Tasks List"  onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
//               </Section>
//               <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//                 <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
//                 <Item href="/admin/hr/Dashboard"           icon={<HiUserGroup />} label="Employee Details"    onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
//                 <Item href="/admin/hr/masters"             icon={<HiUserGroup />} label="Department"          onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
//                 <Item href="/admin/hr/leaves"              icon={<HiUserGroup />} label="Leave"               onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
//                 <Item href="/admin/hr/attendance"          icon={<HiUserGroup />} label="Attendance"          onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
//                 <Item href="/admin/hr/salary"              icon={<HiUserGroup />} label="Salary"              onClick={closeSidebar} isActive={isActive("/admin/hr/salary")} />
//                 <Item href="/admin/hr/payroll"             icon={<HiUserGroup />} label="Payroll"             onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
//                 <Item href="/admin/hr/employees"           icon={<HiUserGroup />} label="Employee"            onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
//                 <Item href="/admin/hr/reports"             icon={<HiUserGroup />} label="Reports"             onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
//                 <Item href="/admin/hr/settings"            icon={<HiCog />}       label="Settings"            onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
//                 <Item href="/admin/hr/holidays"            icon={<HiGlobeAlt />}  label="Holidays"            onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
//                 <Item href="/admin/hr/profile"             icon={<HiUser />}      label="Profile"             onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
//               </Section>
//               <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//                 <Item href="/admin/ppc/operatorsPage"              icon={<HiUser />}           label="Operators"                onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
//                 <Item href="/admin/ppc/machinesPage"               icon={<HiOutlineCube />}    label="Machines"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
//                 <Item href="/admin/ppc/resourcesPage"              icon={<HiOutlineLibrary />} label="Resources"                onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
//                 <Item href="/admin/ppc/machineOutputPage"          icon={<HiOutlineLibrary />} label="Machine Outputs"          onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
//                 <Item href="/admin/ppc/holidaysPage"               icon={<HiGlobeAlt />}       label="Holidays"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
//                 <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />}         label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
//                 <Item href="/admin/ppc/operations"                 icon={<HiPuzzle />}         label="Operations"               onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
//                 <Item href="/admin/ppc/productionOrderPage"        icon={<HiReceiptTax />}     label="Production Planning"      onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
//                 <Item href="/admin/ppc/jobcards"                   icon={<HiReceiptTax />}     label="Job Card"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
//                 <Item href="/admin/ppc/downtime"                   icon={<HiReceiptTax />}     label="Downtime"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
//               </Section>
//               <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//                 <Item href="/admin/helpdesk/tickets"            icon={<HiDocumentText />}   label="Tickets"           onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
//                 <Item href="/admin/helpdesk/agents"             icon={<HiUsers />}          label="Agents"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
//                 <Item href="/admin/helpdesk/categories"         icon={<HiUserGroup />}      label="Categories"        onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
//                 <Item href="/admin/helpdesk/agents/manage"      icon={<HiPuzzle />}         label="Create Agent"      onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
//                 <Item href="/admin/helpdesk/settings"           icon={<HiCog />}            label="Settings"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
//                 <Item href="/admin/helpdesk/feedback"           icon={<HiDocumentText />}   label="Feedback"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
//                 <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
//                 <Item href="/admin/helpdesk/report"             icon={<HiChartSquareBar />} label="Report"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
//               </Section>
//             </>
//           )}

//           {!hasFullAccess &&
//             Object.entries(modules).map(([moduleName, data]) => {
//               if (!canAccessModule(data)) return null;
//               const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
//               if (!moduleRoutes) return null;
//               const permissions = data?.permissions || {};
//               const visibleRoutes = moduleRoutes.filter(route => {
//                 if (route.needsCreate && !permissions.create) return false;
//                 if (route.needsView   && !permissions.view)   return false;
//                 return true;
//               });
//               if (!visibleRoutes.length) return null;
//               return (
//                 <Section key={moduleName} title={moduleName} icon={<HiOutlineCube />}
//                   isOpen={openMenu === moduleName} onToggle={() => toggleMenu(moduleName)}>
//                   {visibleRoutes.map(route => (
//                     <Item key={route.path} href={route.path} icon={<HiViewGrid />}
//                       label={route.label} onClick={closeSidebar} isActive={isActive(route.path)} />
//                   ))}
//                 </Section>
//               );
//             })
//           }

//           <div className="p-4 mt-4 border-t border-gray-200">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* CONTENT AREA */}
//       <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm shrink-0">
//           <div className="flex items-center justify-between px-4 h-14">
//             <div className="flex items-center gap-3 min-w-0">
//               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//                 className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors">
//                 {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
//               </button>
//             <h1 className="text-sm md:text-base font-bold text-gray-800 truncate tracking-tight">
//   {session?.companyName || (isCompany ? "Company Administrator" : isAdmin ? "Admin Dashboard" : "Dashboard")}
// </h1>
//             </div>

//             <div className="flex items-center gap-3 shrink-0 relative">
//               <div className="relative">
//                 <button onClick={() => setOpenNotif(!openNotif)} className="relative p-2 text-gray-600 hover:text-gray-900">
//                   <HiBell size={22} />
//                   {unreadCount > 0 && (
//                     <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full">{unreadCount}</span>
//                   )}
//                 </button>
//                 {openNotif && (
//                   <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
//                     <div className="p-3 font-bold border-b border-gray-200">Notifications</div>
//                     <div className="max-h-80 overflow-y-auto">
//                       {notifications.length === 0 ? (
//                         <div className="p-4 text-sm text-gray-500">No notifications</div>
//                       ) : (
//                         notifications.map(n => (
//                           <div key={n._id} onClick={() => markAsRead(n._id)}
//                             className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${!n.isRead ? "bg-gray-50 font-semibold" : ""}`}>
//                             <div className="text-sm">{n.title}</div>
//                             <div className="text-xs text-gray-500">{n.message}</div>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>
//               <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
//                 <span>{session.name || session.email}</span>
//               </div>
//               <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/20 shadow-sm" title={session.email}>
//                 {session.email?.charAt(0).toUpperCase()}
//               </div>
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto bg-gray-50">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }






// "use client";

// import { useState, useEffect, useRef } from "react";
// import Link from "next/link";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome,HiBell,
// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter, usePathname } from "next/navigation";
// import LogoutButton from "@/components/LogoutButton";

// /* ---------- UI COMPONENTS ---------- */

// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-600/20">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-3 py-3 hover:bg-gray-600/40 transition-colors text-left"
//     >
//       <span className="flex gap-3 items-center font-medium text-sm">
//         <span className="text-lg text-blue-400">{icon}</span>
//         <span className="truncate">{title}</span>
//       </span>
//       <span className="text-xs ml-2 shrink-0">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="bg-gray-800/40 pb-2 ml-4 border-l border-gray-500/50">
//         {children}
//       </div>
//     )}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
//     >
//       <span className="flex gap-2 items-center">{icon}<span>{label}</span></span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && (
//       <div className="ml-2 space-y-0.5 border-l border-gray-600/30">
//         {children}
//       </div>
//     )}
//   </div>
// );

// const Item = ({ href, icon, label, onClick, isActive }) => (
//   <Link
//     href={href}
//     onClick={onClick}
//     className={`flex gap-3 px-4 py-2 text-[13px] rounded-l-md transition-all ${
//       isActive
//         ? "text-white bg-blue-600/40 border-r-2 border-blue-400"
//         : "text-gray-300 hover:text-white hover:bg-blue-600/20"
//     }`}
//   >
//     <span className="text-base opacity-70 shrink-0">{icon}</span>
//     <span className="truncate">{label}</span>
//   </Link>
// );

// /* ---------- MODULE ROUTE MAP ---------- */

// const MODULE_ROUTE_MAP = {
//   // ── Sales ──────────────────────────────────────────
//   "Sales Quotation": [
//     { label: "Quotation View",    path: "/admin/sales-quotation-view", needsView: true },
//     { label: "Create Quotation",  path: "/admin/sales-quotation",      needsCreate: true },
//   ],
//   "Sales Order": [
//     { label: "Order View",        path: "/admin/sales-order-view",     needsView: true },
//     { label: "Create Order",      path: "/admin/sales-order",          needsCreate: true },
//   ],
//   "Sales Invoice": [
//     { label: "Invoice View",      path: "/admin/sales-invoice-view",   needsView: true },
//   ],
//   "Delivery": [
//     { label: "Delivery View",     path: "/admin/delivery-view",        needsView: true },
//   ],
//   "Credit Memo": [
//     { label: "Credit Memo View",  path: "/admin/credit-memo-veiw",     needsView: true },
//   ],
//   "Sales Report": [
//     { label: "Sales Report",      path: "/admin/sales-report",         needsView: true },
//     { label: "Sales Board",       path: "/admin/sales-board",          needsView: true },
//     { label: "POS Report",        path: "/admin/pos/reports",          needsView: true },
//   ],

//   // ── Masters ────────────────────────────────────────
//   "Customers": [
//     { label: "Customer View",     path: "/admin/customer-view",        needsView: true },
//     { label: "Create Customer",   path: "/admin/createCustomers",      needsCreate: true },
//   ],
//   "Suppliers": [
//     { label: "Supplier View",     path: "/admin/supplier",             needsView: true },
//     { label: "Create Supplier",   path: "/admin/createSupplier",       needsCreate: true },
//   ],
//   "Items": [
//     { label: "Item View",         path: "/admin/item",                 needsView: true },
//     { label: "Create Item",       path: "/admin/createItem",           needsCreate: true },
//   ],
//   "Company": [
//     { label: "Company Settings",  path: "/admin/company",              needsView: true },
//   ],
//   "Users": [
//     { label: "Users",             path: "/admin/users",                needsView: true },
//   ],
//   "Accounts": [
//     { label: "Account Head View", path: "/admin/account-head-view",          needsView: true },
//     { label: "General Ledger",    path: "/admin/bank-head-details-view",      needsView: true },
//   ],

//   "employees": [
//   { label: "Employee Dashboard", path: "/admin/hr/Dashboard", needsView: true },
//   { label: "Attendance", path: "/admin/hr/attendance", needsView: true },
//   { label: "Leaves", path: "/admin/hr/leaves", needsView: true },
// ],
//   // "Employees": [
//   //   { label: "Employee Details",    path: "/admin/hr/Dashboard",             needsView: true },
//   //   { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding",   needsCreate: true },
//   //   { label: "Department",          path: "/admin/hr/masters",               needsView: true },
//   //   { label: "Leave",               path: "/admin/hr/leaves",                needsView: true },
//   //   { label: "Attendance",          path: "/admin/hr/attendance",            needsView: true },
//   //   { label: "Payroll",             path: "/admin/hr/payroll",               needsView: true },
//   //   { label: "Employee",            path: "/admin/hr/employees",             needsView: true },
//   //   { label: "Reports",             path: "/admin/hr/reports",               needsView: true },
//   //   { label: "Holidays",            path: "/admin/hr/holidays",              needsView: true },
//   //   { label: "Profile",             path: "/admin/hr/profile",               needsView: true },
//   // ],

//   // ── Purchase ───────────────────────────────────────
//   "Purchase Quotation": [
//     { label: "Quotation View",    path: "/admin/PurchaseQuotationList",       needsView: true },
//   ],
//   "Purchase Order": [
//     { label: "Order View",        path: "/admin/purchase-order-view",         needsView: true },
//   ],
//   "GRN": [
//     { label: "GRN View",          path: "/admin/grn-view",                    needsView: true },
//   ],
//   "Purchase Invoice": [
//     { label: "Invoice View",      path: "/admin/purchaseInvoice-view",        needsView: true },
//   ],
//   "Debit Notes": [
//     { label: "Debit Notes View",  path: "/admin/debit-notes-view",            needsView: true },
//   ],
//   "Purchase Report": [
//     { label: "Purchase Report",   path: "/admin/purchase-report",             needsView: true },
//   ],


//   // ── Inventory / Stock ──────────────────────────────
//   // ✅ ADDED: These match the actual DB keys from JWT logs
//   "Inventory": [
//     { label: "Inventory View",    path: "/admin/InventoryView",               needsView: true },
//     { label: "Inventory Entry",   path: "/admin/InventoryEntry",              needsCreate: true },
//     { label: "Inventory Ledger",  path: "/admin/InventoryAdjustmentsView",    needsView: true },
//   ],
//   "Inventory View": [
//     { label: "Inventory View",    path: "/admin/InventoryView",               needsView: true },
//   ],
//   "Inventory Entry": [
//     { label: "Inventory Entry",   path: "/admin/InventoryEntry",              needsCreate: true },
//   ],
//   "Stock Adjustment": [
//     { label: "Stock Adjustment",  path: "/admin/InventoryAdjustmentsView",    needsView: true },
//   ],
//   "Stock Transfer": [
//     { label: "Stock Transfer",    path: "/admin/InventoryAdjustmentsView",    needsView: true },
//   ],
//   "Stock Report": [
//     { label: "Stock Report",      path: "/admin/sales-report",                needsView: true },
//   ],

//   // ── Production ─────────────────────────────────────
//   "Production Order": [
//     { label: "Production Order",  path: "/admin/ProductionOrder",             needsView: true },
//     { label: "Production Board",  path: "/admin/production-board",            needsView: true },
//   ],
//   "BoM": [
//     { label: "BoM",               path: "/admin/bom",                         needsCreate: true },
//     { label: "BoM View",          path: "/admin/bom-view",                    needsView: true },
//   ],

//   // ── CRM ────────────────────────────────────────────
//   "Lead Generation": [
//     { label: "Lead Generation",   path: "/admin/leads-view",                  needsView: true },
//   ],
//   "Opportunity": [
//     { label: "Opportunity",       path: "/admin/opportunities",               needsView: true },
//   ],
//   "crm": [
//     { label: "Campaign",          path: "/admin/crm/campaign",                needsView: true },
//     { label: "Opportunity",       path: "/admin/opportunities",               needsView: true },
//     { label: "Lead Generation",   path: "/admin/leads-view",                  needsView: true },
//   ],
//   "Campaign" : [
//     { label: "Campaign",          path: "/admin/crm/campaign",                needsView: true },
//   ],


//   // ── Project ────────────────────────────────────────
//   "Project": [
//     { label: "Projects",          path: "/admin/project/projects",            needsView: true },
//     { label: "Workspaces",        path: "/admin/project/workspaces",          needsView: true },
//     { label: "Tasks",             path: "/admin/project/tasks",               needsView: true },
//     { label: "Task Board",        path: "/admin/project/tasks/board",         needsView: true },
//   ],

//   // ── Finance ────────────────────────────────────────
//   "Journal Entry": [
//     { label: "Journal Entry",     path: "/admin/finance/journal-entry",       needsCreate: true },
//   ],
//   "Reports": [
//     { label: "Trial Balance",     path: "/admin/finance/report/trial-balance", needsView: true },
//   ],
//   "Ageing": [
//     { label: "Customer Ageing",   path: "/admin/finance/report/ageing/customer", needsView: true },
//   ],
//   "Statement": [
//     { label: "Customer Statement", path: "/admin/finance/report/statement/customer", needsView: true },
//   ],
//   "Bank Statement": [
//     { label: "Bank Statement",    path: "/admin/finance/report/statement/bank",    needsView: true },
//   ],
//   "Profit & Loss": [
//     { label: "Profit & Loss",     path: "/admin/finance/report/profit-loss",        needsView: true },
//   ],
//   "Balance Sheet": [
//     { label: "Balance Sheet",     path: "/admin/finance/report/balance-sheet",      needsView: true },
//   ],
//   "Supplier Ageing": [
//     { label: "Supplier Ageing",   path: "/admin/finance/report/ageing/supplier",    needsView: true },
//   ],
//   "Supplier Statement": [
//     { label: "Supplier Statement", path: "/admin/finance/report/statement/supplier", needsView: true },
//   ],
//   "Financial Statements": [
//     { label: "Financial Statements", path: "/admin/finance/report/financial-statements", needsView: true },
//   ],
//   "Payment": [
//     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
//   ],

//   // ✅ ADDED: These match actual DB keys from JWT logs
//   "Payment Entry": [
//     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
//   ],
//   "Payment Form": [
//     { label: "Payment Form",      path: "/admin/Payment",                     needsCreate: true },
//   ],
//   "Ledger": [
//     { label: "General Ledger",    path: "/admin/bank-head-details-view",      needsView: true },
//   ],

//   // ── Helpdesk ───────────────────────────────────────
//   "Tickets": [
//     { label: "Tickets",           path: "/admin/helpdesk/tickets",            needsView: true },
//   ],
//   "Responses": [
//     { label: "Feedback",          path: "/admin/helpdesk/feedback",           needsView: true },
//     { label: "Feedback Analysis", path: "/admin/helpdesk/feedback/analytics", needsView: true },
//   ],

//   // ── PPC ────────────────────────────────────────────
//   "PPC": [
//     { label: "Operators",              path: "/admin/ppc/operatorsPage",              needsView: true },
//     { label: "Machines",               path: "/admin/ppc/machinesPage",               needsView: true },
//     { label: "Resources",              path: "/admin/ppc/resourcesPage",              needsView: true },
//     { label: "Machine Outputs",        path: "/admin/ppc/machineOutputPage",          needsView: true },
//     { label: "Holidays",               path: "/admin/ppc/holidaysPage",               needsView: true },
//     { label: "Machine-Operator Map",   path: "/admin/ppc/operatorMachineMappingPage", needsView: true },
//     { label: "Operations",             path: "/admin/ppc/operations",                 needsView: true },
//     { label: "Production Planning",    path: "/admin/ppc/productionOrderPage",        needsView: true },
//     { label: "Job Card",               path: "/admin/ppc/jobcards",                   needsView: true },
//     { label: "Downtime",               path: "/admin/ppc/downtime",                   needsView: true },
//   ],

//   // ── Task ───────────────────────────────────────────
//   "Task": [
//     { label: "Tasks",             path: "/admin/tasks",                       needsView: true },
//     { label: "Tasks Board",       path: "/admin/tasks/board",                 needsView: true },
//   ],
//   // HR  mamanegemnent module 

//   "employees": [
//   { label: "My Profile", path: "/admin/hr/profile", needsView: true },
// ],

// "attendance": [
//   { label: "My Attendance", path: "/admin/hr/my-attendance", needsView: true },
// ],

// "leaves": [
//  { label: "My Leaves", path: "/admin/hr/my-leaves", needsView: true },
// ],
// "salary": [
//   { label: "My Salary", path: "/admin/hr/my-salary", needsView: true },
// ],



//   "HR": [
//     { label: "Dashboard",         path: "/admin/hr/Dashboard",                needsView: true },
//     { label:"Employee Onboarding",path: "/admin/hr/employee-onboarding",      needsCreate: true },
//     { label:"Department",        path: "/admin/hr/masters",                  needsView: true },
//     { label:"Leave",             path: "/admin/hr/leaves",                   needsView: true },
  

//   ],
  
// };

// /* ---------- PERMISSION HELPER ---------- */

// function canAccessModule(data) {
//   if (!data) return false;
//   if (data.selected === true) return true;
//   const p = data.permissions || {};
//   return !!(p.view || p.read || p.write || p.edit || p.create || p.delete);
// }

// /* ---------- MAIN LAYOUT ---------- */

// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});
//   const [session, setSession] = useState(null);
//   const router = useRouter();
//   const pathname = usePathname();
//   const sidebarRef = useRef(null);

//   const [notifications, setNotifications] = useState([]);
// const [openNotif, setOpenNotif] = useState(false);
// const [unreadCount, setUnreadCount] = useState(0);

// useEffect(() => {
//   fetchNotifications();
// }, []);

// const fetchNotifications = async () => {
//   try {
//     const token = localStorage.getItem("token");

//     const res = await fetch("/api/notifications", {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     const data = await res.json();

//     if (data.success) {
//       setNotifications(data.data);

//       const unread = data.data.filter(n => !n.isRead).length;
//       setUnreadCount(unread);
//     }
//   } catch (err) {
//     console.error(err);
//   }
// };


// const markAsRead = async (id) => {
//   try {
//     const token = localStorage.getItem("token");

//     await fetch(`/api/notifications/${id}`, {
//       method: "PATCH",
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     fetchNotifications(); // refresh
//   } catch (err) {
//     console.error(err);
//   }
// };

//   useEffect(() => {
//     async function getSession() {
//       try {
//         const token = localStorage.getItem("token");

//         if (!token) {
//           router.push("/signin");
//           return;
//         }

//         const res = await fetch("/api/auth/me", {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!res.ok) {
//           localStorage.removeItem("token");
//           localStorage.removeItem("user");
//           router.push("/signin");
//           return;
//         }

//         const data = await res.json();
//         setSession(data.user);
//       } catch (err) {
//         console.error("Session fetch error:", err);
//         router.push("/signin");
//       }
//     }

//     getSession();
//   }, [router]);

//   useEffect(() => {
//     setIsSidebarOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     const handler = (e) => {
//       if (e.key === "Escape") setIsSidebarOpen(false);
//     };
//     document.addEventListener("keydown", handler);
//     return () => document.removeEventListener("keydown", handler);
//   }, []);

//   if (!session) return (
//     <div className="flex h-screen items-center justify-center bg-gray-100">
//       <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
//     </div>
//   );

//   const isCompany = session?.type?.toLowerCase() === "company";
//   const isAdmin = session?.roles?.includes("Admin");
//   const hasFullAccess = isCompany || isAdmin;
//   const modules = session?.modules || {};

//   const toggleSubmenu = (k) => setOpenSubmenus((p) => ({ ...p, [k]: !p[k] }));
//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
//   const closeSidebar = () => setIsSidebarOpen(false);
//   const isActive = (path) => pathname === path;

//   return (
//     <div className="flex h-screen bg-gray-100 overflow-hidden pt-[safe-area-inset-top] sm:pt-0 font-sans">

//       {/* Overlay */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black/60 z-40 md:hidden"
//           onClick={closeSidebar}
//           aria-hidden="true"
//         />
//       )}

//       {/* SIDEBAR */}
//       <aside
//         ref={sidebarRef}
//         aria-label="Sidebar navigation"
//         className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-[#1e293b] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } flex flex-col shadow-2xl`}
//       >
//         {/* Logo */}
//         <div className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[#0f172a] border-b border-gray-700 shrink-0">
//           <span className="font-bold text-base lg:text-lg flex items-center gap-2 tracking-wider">
//             <HiHome className="text-blue-400 shrink-0" />
//             {/* <span className="truncate">ERP SYSTEM</span> */}
//             <Link href="/admin" className="truncate">ERP SYSTEM</Link>
//           </span>
//           {isSidebarOpen && (
//   <button
//     onClick={closeSidebar}
//     className="p-2 rounded hover:bg-gray-700 transition-colors"
//   >
//     <HiX size={24} />
//   </button>
// )}
//         </div>

//         {/* Nav */}
//         <nav className="flex-1 overflow-y-auto py-2">

//           {/* ===== FULL ACCESS (Admin / Company) ===== */}
//           {hasFullAccess && (
//             <>
//               <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//                 <Item href="/admin/Countries"            icon={<HiGlobeAlt />}          label="Countries"             onClick={closeSidebar} isActive={isActive("/admin/Countries")} />
//                 <Item href="/admin/State"                icon={<HiFlag />}               label="State"                 onClick={closeSidebar} isActive={isActive("/admin/State")} />
//                 <Item href="/admin/CreateGroup"          icon={<HiUserGroup />}          label="Create Group"          onClick={closeSidebar} isActive={isActive("/admin/CreateGroup")} />
//                 <Item href="/admin/CreateItemGroup"      icon={<HiOutlineCube />}        label="Create Item Group"     onClick={closeSidebar} isActive={isActive("/admin/CreateItemGroup")} />
//                 <Item href="/admin/account-bankhead"     icon={<HiOutlineLibrary />}     label="Account Head"          onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details"    icon={<HiCurrencyDollar />}     label="General Ledger"        onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/createCustomers"      icon={<HiUserGroup />}          label="Create Customer"       onClick={closeSidebar} isActive={isActive("/admin/createCustomers")} />
//                 <Item href="/admin/supplier"             icon={<HiUserGroup />}          label="Supplier"              onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                 icon={<HiCube />}               label="Item"                  onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />}     label="Warehouse Details"     onClick={closeSidebar} isActive={isActive("/admin/WarehouseDetailsForm")} />
//               </Section>

//               <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
//                 <Item href="/admin/customer-view"          icon={<HiUsers />}             label="Customer View"                onClick={closeSidebar} isActive={isActive("/admin/customer-view")} />
//                 <Item href="/admin/supplier"               icon={<HiUserGroup />}         label="Supplier View"                onClick={closeSidebar} isActive={isActive("/admin/supplier")} />
//                 <Item href="/admin/item"                   icon={<HiCube />}              label="Item View"                    onClick={closeSidebar} isActive={isActive("/admin/item")} />
//                 <Item href="/admin/account-bankhead"      icon={<HiOutlineLibrary />}    label="Account Head View"            onClick={closeSidebar} isActive={isActive("/admin/account-bankhead")} />
//                 <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar />}    label="General Ledger View"          onClick={closeSidebar} isActive={isActive("/admin/bank-head-details")} />
//                 <Item href="/admin/email-templates"        icon={<HiDocumentText />}      label="Email Templates"              onClick={closeSidebar} isActive={isActive("/admin/email-templates")} />
//                 <Item href="/admin/email-masters"          icon={<HiOutlineCreditCard />} label="Email & App Password Master"  onClick={closeSidebar} isActive={isActive("/admin/email-masters")} />
//                 <Item href="/admin/price-list"             icon={<HiOutlineOfficeBuilding />} label="Price List"               onClick={closeSidebar} isActive={isActive("/admin/price-list")} />
//               </Section>

//               <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//                 <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//                   <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />}           label="Quotation View"  onClick={closeSidebar} isActive={isActive("/admin/sales-quotation-view")} />
//                   <Item href="/admin/sales-order-view"     icon={<HiPuzzle />}            label="Order View"      onClick={closeSidebar} isActive={isActive("/admin/sales-order-view")} />
//                   <Item href="/admin/pos"                  icon={<HiCube />}              label="POS Invoice"     onClick={closeSidebar} isActive={isActive("/admin/pos")} />
//                   <Item href="/admin/delivery-view"        icon={<HiOutlineCube />}       label="Delivery View"   onClick={closeSidebar} isActive={isActive("/admin/delivery-view")} />
//                   <Item href="/admin/sales-invoice-view"   icon={<HiOutlineCreditCard />} label="Invoice View"    onClick={closeSidebar} isActive={isActive("/admin/sales-invoice-view")} />
//                   <Item href="/admin/credit-memo-veiw"     icon={<HiReceiptTax />}        label="Credit Memo"     onClick={closeSidebar} isActive={isActive("/admin/credit-memo-veiw")} />
//                   <Item href="/admin/sales-report"         icon={<HiChartSquareBar />}    label="Report"          onClick={closeSidebar} isActive={isActive("/admin/sales-report")} />
//                   <Item href="/admin/pos/reports"          icon={<HiChartSquareBar />}    label="POS Report"      onClick={closeSidebar} isActive={isActive("/admin/pos/reports")} />
//                   <Item href="/admin/sales-board"          icon={<HiChartSquareBar />}    label="Sales Board"     onClick={closeSidebar} isActive={isActive("/admin/sales-board")} />
//                 </Submenu>

//                 <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
//                   <Item href="/admin/PurchaseQuotationList"  icon={<SiCivicrm />}           label="Quotation View"    onClick={closeSidebar} isActive={isActive("/admin/PurchaseQuotationList")} />
//                   <Item href="/admin/purchase-order-view"    icon={<HiPuzzle />}            label="Order View"        onClick={closeSidebar} isActive={isActive("/admin/purchase-order-view")} />
//                   <Item href="/admin/grn-view"               icon={<HiOutlineCube />}       label="GRN View"          onClick={closeSidebar} isActive={isActive("/admin/grn-view")} />
//                   <Item href="/admin/purchaseInvoice-view"   icon={<HiOutlineCreditCard />} label="Invoice View"      onClick={closeSidebar} isActive={isActive("/admin/purchaseInvoice-view")} />
//                   <Item href="/admin/debit-notes-view"       icon={<HiReceiptTax />}        label="Debit Notes"       onClick={closeSidebar} isActive={isActive("/admin/debit-notes-view")} />
//                   <Item href="/admin/purchase-report"        icon={<HiChartSquareBar />}    label="Report"            onClick={closeSidebar} isActive={isActive("/admin/purchase-report")} />
//                 </Submenu>
//               </Section>

//               <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//                 <Item href="/admin/users" icon={<HiUserGroup />} label="User" onClick={closeSidebar} isActive={isActive("/admin/users")} />
//               </Section>

//               <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//                 <Item href="/admin/tasks"       icon={<HiUserGroup />} label="Tasks"       onClick={closeSidebar} isActive={isActive("/admin/tasks")} />
//                 <Item href="/admin/tasks/board" icon={<HiPuzzle />}    label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/tasks/board")} />
//               </Section>

//               <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//                 <Item href="/admin/leads-view"     icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} isActive={isActive("/admin/leads-view")} />
//                 <Item href="/admin/opportunities"  icon={<HiPuzzle />}    label="Opportunity"     onClick={closeSidebar} isActive={isActive("/admin/opportunities")} />
//                 <Item href="/admin/crm/campaign"   icon={<HiPuzzle />}    label="Campaign"        onClick={closeSidebar} isActive={isActive("/admin/crm/campaign")} />
//                 <Item href="/admin/crm/calls"      icon={<HiPuzzle />}    label="Calls"           onClick={closeSidebar} isActive={isActive("/admin/crm/calls")} />
                
//               </Section>

//               <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//                 <Item href="/admin/InventoryView"            icon={<HiOutlineLibrary />} label="Inventory View"   onClick={closeSidebar} isActive={isActive("/admin/InventoryView")} />
//                 <Item href="/admin/InventoryEntry"           icon={<HiOutlineLibrary />} label="Inventory Entry"  onClick={closeSidebar} isActive={isActive("/admin/InventoryEntry")} />
//                 <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} isActive={isActive("/admin/InventoryAdjustmentsView")} />
//               </Section>

//               <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//                 <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} isActive={isActive("/admin/Payment")} />
//               </Section>

//               <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
//                 <Submenu isOpen={!!openSubmenus["journalEntry"]} onToggle={() => toggleSubmenu("journalEntry")} icon={<HiCurrencyDollar />} label="Journal Entry">
//                   <Item href="/admin/finance/journal-entry" icon={<HiOutlineCreditCard />} label="Journal Entry" onClick={closeSidebar} isActive={isActive("/admin/finance/journal-entry")} />
//                 </Submenu>
//                 <Submenu isOpen={!!openSubmenus["report"]} onToggle={() => toggleSubmenu("report")} icon={<HiChartSquareBar />} label="Report">
//                   <Submenu isOpen={!!openSubmenus["financialReport"]} onToggle={() => toggleSubmenu("financialReport")} icon={<HiOutlineLibrary />} label="Financial Report">
//                     <Item href="/admin/finance/report/trial-balance" icon={<HiDocumentText />} label="Trial Balance"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/trial-balance")} />
//                     <Item href="/admin/finance/report/profit-loss"   icon={<HiDocumentText />} label="Profit & Loss"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/profit-loss")} />
//                     <Item href="/admin/finance/report/balance-sheet" icon={<HiDocumentText />} label="Balance Sheet"  onClick={closeSidebar} isActive={isActive("/admin/finance/report/balance-sheet")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["ageingReport"]} onToggle={() => toggleSubmenu("ageingReport")} icon={<HiUserGroup />} label="Ageing">
//                     <Item href="/admin/finance/report/ageing/customer" icon={<HiUser />} label="Customer Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/customer")} />
//                     <Item href="/admin/finance/report/ageing/supplier" icon={<HiUser />} label="Supplier Ageing" onClick={closeSidebar} isActive={isActive("/admin/finance/report/ageing/supplier")} />
//                   </Submenu>
//                   <Submenu isOpen={!!openSubmenus["statementReport"]} onToggle={() => toggleSubmenu("statementReport")} icon={<HiReceiptTax />} label="Statement">
//                     <Item href="/admin/finance/report/statement/customer" icon={<HiUser />}              label="Customer Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/customer")} />
//                     <Item href="/admin/finance/report/statement/supplier" icon={<HiUser />}              label="Supplier Statement" onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/supplier")} />
//                     <Item href="/admin/finance/report/statement/bank"     icon={<HiOutlineCreditCard />} label="Bank Statement"     onClick={closeSidebar} isActive={isActive("/admin/finance/report/statement/bank")} />
//                   </Submenu>
//                 </Submenu>
//               </Section>

//               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//                 <Item href="/admin/bom"             icon={<HiOutlineCube />} label="BoM"              onClick={closeSidebar} isActive={isActive("/admin/bom")} />
//                 <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />}  label="Production Order" onClick={closeSidebar} isActive={isActive("/admin/ProductionOrder")} />
//               </Section>

//               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
//                 <Item href="/admin/bom-view"                   icon={<HiOutlineCube />}    label="BoM View"               onClick={closeSidebar} isActive={isActive("/admin/bom-view")} />
//                 <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />}     label="Production Orders View" onClick={closeSidebar} isActive={isActive("/admin/productionorders-list-view")} />
//                 <Item href="/admin/production-board"           icon={<HiChartSquareBar />} label="Production Board"       onClick={closeSidebar} isActive={isActive("/admin/production-board")} />
//               </Section>

//               <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
//                 <Item href="/admin/project/workspaces"   icon={<HiOutlineOfficeBuilding />} label="Workspaces"  onClick={closeSidebar} isActive={isActive("/admin/project/workspaces")} />
//                 <Item href="/admin/project/projects"     icon={<HiOutlineCube />}           label="Projects"    onClick={closeSidebar} isActive={isActive("/admin/project/projects")} />
//                 <Item href="/admin/project/tasks/board"  icon={<HiPuzzle />}                label="Tasks Board" onClick={closeSidebar} isActive={isActive("/admin/project/tasks/board")} />
//                 <Item href="/admin/project/tasks"        icon={<HiPuzzle />}                label="Tasks List"  onClick={closeSidebar} isActive={isActive("/admin/project/tasks")} />
//               </Section>

//               <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//                 <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" onClick={closeSidebar} isActive={isActive("/admin/hr/employee-onboarding")} />
                  
//                 <Item href="/admin/hr/Dashboard"           icon={<HiUserGroup />} label="Employee Details"    onClick={closeSidebar} isActive={isActive("/admin/hr/Dashboard")} />
//                 <Item href="/admin/hr/masters"             icon={<HiUserGroup />} label="Department"          onClick={closeSidebar} isActive={isActive("/admin/hr/masters")} />
//                 <Item href="/admin/hr/leaves"              icon={<HiUserGroup />} label="Leave"               onClick={closeSidebar} isActive={isActive("/admin/hr/leaves")} />
//                 <Item href="/admin/hr/attendance"          icon={<HiUserGroup />} label="Attendance"          onClick={closeSidebar} isActive={isActive("/admin/hr/attendance")} />
//                 <Item href="/admin/hr/salary"             icon={<HiUserGroup />} label="Salary"              onClick={closeSidebar} isActive={isActive("/admin/hr/salary")} />
//                 <Item href="/admin/hr/payroll"             icon={<HiUserGroup />} label="Payroll"             onClick={closeSidebar} isActive={isActive("/admin/hr/payroll")} />
//                 <Item href="/admin/hr/employees"           icon={<HiUserGroup />} label="Employee"            onClick={closeSidebar} isActive={isActive("/admin/hr/employees")} />
//                 <Item href="/admin/hr/reports"             icon={<HiUserGroup />} label="Reports"             onClick={closeSidebar} isActive={isActive("/admin/hr/reports")} />
//                 <Item href="/admin/hr/settings"            icon={<HiCog />}       label="Settings"            onClick={closeSidebar} isActive={isActive("/admin/hr/settings")} />
//                 <Item href="/admin/hr/holidays"            icon={<HiGlobeAlt />}  label="Holidays"            onClick={closeSidebar} isActive={isActive("/admin/hr/holidays")} />
//                 <Item href="/admin/hr/profile"             icon={<HiUser />}      label="Profile"             onClick={closeSidebar} isActive={isActive("/admin/hr/profile")} />
//               </Section>

//               <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//                 <Item href="/admin/ppc/operatorsPage"              icon={<HiUser />}              label="Operators"                onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorsPage")} />
//                 <Item href="/admin/ppc/machinesPage"               icon={<HiOutlineCube />}       label="Machines"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/machinesPage")} />
//                 <Item href="/admin/ppc/resourcesPage"              icon={<HiOutlineLibrary />}    label="Resources"                onClick={closeSidebar} isActive={isActive("/admin/ppc/resourcesPage")} />
//                 <Item href="/admin/ppc/machineOutputPage"          icon={<HiOutlineLibrary />}    label="Machine Outputs"          onClick={closeSidebar} isActive={isActive("/admin/ppc/machineOutputPage")} />
//                 <Item href="/admin/ppc/holidaysPage"               icon={<HiGlobeAlt />}          label="Holidays"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/holidaysPage")} />
//                 <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />}            label="Machine-Operator Mapping" onClick={closeSidebar} isActive={isActive("/admin/ppc/operatorMachineMappingPage")} />
//                 <Item href="/admin/ppc/operations"                 icon={<HiPuzzle />}            label="Operations"               onClick={closeSidebar} isActive={isActive("/admin/ppc/operations")} />
//                 <Item href="/admin/ppc/productionOrderPage"        icon={<HiReceiptTax />}        label="Production Planning"      onClick={closeSidebar} isActive={isActive("/admin/ppc/productionOrderPage")} />
//                 <Item href="/admin/ppc/jobcards"                   icon={<HiReceiptTax />}        label="Job Card"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/jobcards")} />
//                 <Item href="/admin/ppc/downtime"                   icon={<HiReceiptTax />}        label="Downtime"                 onClick={closeSidebar} isActive={isActive("/admin/ppc/downtime")} />
//               </Section>

//               <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//                 <Item href="/admin/helpdesk/tickets"            icon={<HiDocumentText />}   label="Tickets"           onClick={closeSidebar} isActive={isActive("/admin/helpdesk/tickets")} />
//                 <Item href="/admin/helpdesk/agents"             icon={<HiUsers />}          label="Agents"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents")} />
//                 <Item href="/admin/helpdesk/categories"         icon={<HiUserGroup />}      label="Categories"        onClick={closeSidebar} isActive={isActive("/admin/helpdesk/categories")} />
//                 <Item href="/admin/helpdesk/agents/manage"      icon={<HiPuzzle />}         label="Create Agent"      onClick={closeSidebar} isActive={isActive("/admin/helpdesk/agents/manage")} />
//                 <Item href="/admin/helpdesk/settings"           icon={<HiCog />}            label="Settings"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/settings")} />
//                 <Item href="/admin/helpdesk/feedback"           icon={<HiDocumentText />}   label="Feedback"          onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback")} />
//                 <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" onClick={closeSidebar} isActive={isActive("/admin/helpdesk/feedback/analytics")} />
//                 <Item href="/admin/helpdesk/report"             icon={<HiChartSquareBar />} label="Report"            onClick={closeSidebar} isActive={isActive("/admin/helpdesk/report")} />
//               </Section>
//             </>
//           )}

//           {/* ===== MODULE-BASED ACCESS (Normal Users) ===== */}
//           {!hasFullAccess &&
//             Object.entries(modules).map(([moduleName, data]) => {
//               if (!canAccessModule(data)) return null;

//               const moduleRoutes = MODULE_ROUTE_MAP[moduleName];
//               if (!moduleRoutes) return null;

//               const permissions = data?.permissions || {};

//               // ✅ Permissions ke hisaab se routes filter karo
//               const visibleRoutes = moduleRoutes.filter((route) => {
//                 if (route.needsCreate && !permissions.create) return false;
//                 if (route.needsView && !permissions.view) return false;
//                 return true;
//               });

//               if (!visibleRoutes.length) return null;

//               return (
//                 <Section
//                   key={moduleName}
//                   title={moduleName}
//                   icon={<HiOutlineCube />}
//                   isOpen={openMenu === moduleName}
//                   onToggle={() => toggleMenu(moduleName)}
//                 >
//                   {visibleRoutes.map((route) => (
//                     <Item
//                       key={route.path}
//                       href={route.path}
//                       icon={<HiViewGrid />}
//                       label={route.label}
//                       onClick={closeSidebar}
//                       isActive={isActive(route.path)}
//                     />
//                   ))}
//                 </Section>
//               );
//             })
//           }

//           <div className="p-4 mt-4 border-t border-gray-700">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* CONTENT AREA */}
//    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//   <header className="sticky top-0 z-50 w-full bg-black border-b border-gray-800 shadow-lg shrink-0">
    
//     {/* Safe area (mobile notch ke liye) */}
//     <div className="h-[env(safe-area-inset-top,24px)] w-full bg-black" />

//     {/* Main Header Content */}
//     <div className="flex items-center justify-between px-4 h-14">
      
//       {/* Left Section */}
//       <div className="flex items-center gap-3 min-w-0">
//        <button
//   onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//   className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
// >
//   {isSidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
// </button>

//         <h1 className="text-sm md:text-base font-bold text-white truncate tracking-tight">
//           {isCompany
//             ? "Company Administrator"
//             : isAdmin
//             ? "Admin Dashboard"
//             : "Dashboard"}
//         </h1>
//       </div>

//       {/* Right Section */}
//       <div className="flex items-center gap-3 shrink-0 relative">

//   {/* 🔔 Notification Bell */}
//   <div className="relative">
//     <button
//       onClick={() => setOpenNotif(!openNotif)}
//       className="relative p-2 text-gray-300 hover:text-white"
//     >
//       <HiBell size={22} />

//       {/* 🔴 Unread Badge */}
//       {unreadCount > 0 && (
//         <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full">
//           {unreadCount}
//         </span>
//       )}
//     </button>

//     {/* 📩 Dropdown */}
//     {openNotif && (
//       <div className="absolute right-0 mt-2 w-80 bg-white text-black rounded-xl shadow-lg overflow-hidden z-50">

//         <div className="p-3 font-bold border-b">
//           Notifications
//         </div>

//         <div className="max-h-80 overflow-y-auto">

//           {notifications.length === 0 ? (
//             <div className="p-4 text-sm text-gray-500">
//               No notifications
//             </div>
//           ) : (
//             notifications.map((n) => (
//               <div
//                 key={n._id}
//                 onClick={() => markAsRead(n._id)}
//                 className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
//                   !n.isRead ? "bg-gray-50 font-semibold" : ""
//                 }`}
//               >
//                 <div className="text-sm">{n.title}</div>
//                 <div className="text-xs text-gray-500">
//                   {n.message}
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     )}
//   </div>

//   {/* USER INFO */}
//   <div className="hidden md:flex items-center gap-3 text-sm text-gray-300">
//     <span>{session.name || session.email}</span>
//   </div>

//   {/* AVATAR */}
//   <div
//     className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-white/10 shadow-inner"
//     title={session.email}
//   >
//     {session.email?.charAt(0).toUpperCase()}
//   </div>
// </div>

//     </div>
//   </header>

//   <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
//     {children}
//   </main>
// </div>
//     </div>
//   );
// }




// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import {
//   HiMenu,
//   HiX,
//   HiHome,
//   HiUsers,
//   HiGlobeAlt,
//   HiFlag,
//   HiUserGroup,
//   HiOutlineCube,
//   HiOutlineLibrary,
//   HiCurrencyDollar,
//   HiOutlineCreditCard,
//   HiChartSquareBar,
//   HiReceiptTax,
//   HiPuzzle,
//   HiViewGrid,
//   HiUser,
//   HiDocumentText,
//   HiOutlineOfficeBuilding,
//   HiCube,
//   HiShoppingCart,
//   HiCog,
  
 

// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter } from "next/navigation";
// import { jwtDecode } from 'jwt-decode';
// import { useEffect } from "react";
// import LogoutButton from "@/components/LogoutButton";

// // --- Components for sidebar ---
// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div>
//     <button
//       onClick={onToggle}
//       className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-600"
//     >
//       <span className="flex items-center gap-2">
//         {icon} {title}
//       </span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-6 space-y-2">{children}</div>}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div>
//     <button
//       onClick={onToggle}
//       className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-600"
//     >
//       <span className="flex items-center gap-2">
//         {icon} {label}
//       </span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-6 space-y-2">{children}</div>}
//   </div>
// );

// const Item = ({ href, icon, label, close }) => (
//   <Link
//     href={href}
//     onClick={close}
//     className="flex items-center gap-2 px-4 py-2 text-sm rounded-md hover:bg-gray-600"
//   >
//     {icon} {label}
//   </Link>
// );

// // Dummy buttons (replace with your real ones)
// // const LogoutButton = () => (
// //   <button className="px-3 py-2 bg-red-500 text-white rounded-md">Logout</button>
// // );
// const NotificationBell = () => (
//   <button className="px-3 py-2 bg-gray-300 rounded-full">🔔</button>
// );



// export default function DashboardLayout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});
//   const [session, setSession] = useState(null);
//   const router = useRouter();

 
    

//     useEffect(() => {
//     const t = localStorage.getItem("token");
//     if (!t) return router.push("/");
//     try {
//       setSession(jwtDecode(t));
//     } catch {
//       localStorage.removeItem("token");
//       router.push("/");
//     }
//   }, [router]);

//   const toggleMenu = (menu) => {
//     setOpenMenu(openMenu === menu ? null : menu);
//   };

//   const toggleSubmenu = (submenu) => {
//     setOpenSubmenus((prev) => ({
//       ...prev,
//       [submenu]: !prev[submenu],
//     }));
//   };

//   console.log(session);


//   const closeSidebar = () => setIsSidebarOpen(false);

//   return (
//     <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
//       {/* Mobile Top Bar */}
//       <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
//         <button
//           aria-label="Open menu"
//           onClick={() => setIsSidebarOpen(true)}
//           className="text-2xl text-gray-700 dark:text-gray-200"
//         >
//           <HiMenu />
//         </button>
//         <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
//           Dashboard
//         </h1>
//       </header>

//       {/* Mobile Overlay */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 z-30 bg-black/40 md:hidden"
//           onClick={closeSidebar}
//         />
//       )}

//       {/* Sidebar */}
//       <aside
//         className={`w-64 bg-gray-700 text-white fixed inset-y-0 left-0 transform transition-transform duration-200 ease-in-out z-40  overflow-y-auto
//           ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
//       >
//         {/* Mobile Close Button */}
//         <div className="md:hidden flex items-center justify-between px-4 h-14">
//           <h2 className="text-xl font-bold flex items-center gap-2">
//             <HiHome /> Dashboard
//           </h2>
//           <button
//             aria-label="Close menu"
//             onClick={closeSidebar}
//             className="text-2xl"
//           >
//             <HiX />
//           </button>
//         </div>

//         {/* Sidebar Menu */}
//                <nav className="mt-6 px-2 pb-6 space-y-3">
//           {/* Masters */}
//           <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//             <Item href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" close={closeSidebar} />
//             <Item href="/admin/State" icon={<HiFlag />} label="State" close={closeSidebar} />
//             <Item href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" close={closeSidebar} />
//             <Item href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" close={closeSidebar} />
//             <Item href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" close={closeSidebar} />
//             <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger" close={closeSidebar} />
//             <Item href="/admin/createCustomers" icon={<HiUserGroup />} label="Create Customer" close={closeSidebar} />
//             <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier" close={closeSidebar} />
//             <Item href="/admin/item" icon={<HiCube />} label="Item" close={closeSidebar} />
//             <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" close={closeSidebar} />
//           </Section>

//           {/* Masters View */}
//           <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
//             <Item href="/admin/customer-view" icon={<HiUsers />} label="Customer View" close={closeSidebar} />
//             <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier View" close={closeSidebar} />
//             <Item href="/admin/item" icon={<HiCube />} label="Item View" close={closeSidebar} />
//             <Item href="/admin/account-head-view" icon={<HiOutlineLibrary />} label="Account Head View" close={closeSidebar} />
//             <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />} label="General Ledger View " close={closeSidebar} />
//             <Item href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" close={closeSidebar} />
//             <Item href="/admin/email-masters" icon={<HiOutlineCreditCard />} label="Email & App Password Master" close={closeSidebar} />
//             <Item href="/admin/price-list" icon={<HiOutlineOfficeBuilding />} label="Price List" close={closeSidebar} />
            
//           </Section>

//           {/* Other sections ... add your other menus here in the same format ... */}

          
//           {/* Transactions View */}
//           <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//             <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//               <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
//               <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
//               <Item href="/admin/pos" icon={<HiCube />} label="POS Invoice View" close={closeSidebar} />

//               <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
//               <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
//               <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
//               <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
//               <Item href="/admin/pos/reports" icon={<HiChartSquareBar />} label="POS Report" close={closeSidebar} />
//               <Item href="/admin/sales-board" icon={<HiChartSquareBar />} label="Sales Board" close={closeSidebar} />
//             </Submenu>

//             <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
//               <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
//               <Item href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
//               <Item href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" close={closeSidebar} />
//               <Item href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
//               <Item href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes View" close={closeSidebar} />
//               <Item href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
//             </Submenu>
//           </Section>

//           {/* User */}
//           <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//             <Item href="/admin/users" icon={<HiUserGroup />} label="User" close={closeSidebar} />
//           </Section>

//           {/* task */}
//           <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//             <Item href="/admin/tasks" icon={<HiUserGroup />} label="Tasks" close={closeSidebar} />
//             {/* <Item href="/admin/task-board" icon={<HiUserGroup />} label="Task Board" close={closeSidebar} /> */}
//             <Item href="/admin/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
//           </Section>

//           {/* CRM-View */}
//           <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//             <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
//             <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
//             <Item href="/admin/crm/campaign" icon={<HiPuzzle />} label="Campaign" close={closeSidebar} />

//           </Section>

//           {/* Stock */}
//           <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//             <Item href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" close={closeSidebar} />
//             <Item href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" close={closeSidebar} />
//             <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" close={closeSidebar} />
//           </Section>

//           {/* Payment */}
//           <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//             <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" close={closeSidebar} />
//           </Section>

//           {/* Finance */}
//          <Section
//   title="Finance"
//   icon={<HiOutlineCreditCard />} // Finance main icon
//   isOpen={openMenu === "finance"}
//   onToggle={() => toggleMenu("finance")}
// >
//   {/* Journal Entry */}
//   <Submenu
//     isOpen={!!openSubmenus["journalEntry"]}
//     onToggle={() => toggleSubmenu("journalEntry")}
//     icon={<HiCurrencyDollar />} // Dollar icon for journal/transactions
//     label="Journal Entry"
//   >
//     <Item
//       href="/admin/finance/journal-entry"
//       icon={<HiOutlineCreditCard />} // Could use credit card for entry
//       label="Journal Entry"
//       close={closeSidebar}
//     />
//   </Submenu>

//   {/* Reports */}
//   <Submenu
//     isOpen={!!openSubmenus["report"]}
//     onToggle={() => toggleSubmenu("report")}
//     icon={<HiChartSquareBar />} // Report icon
//     label="Report"
//   >
//     {/* Financial Reports */}
//     <Submenu
//       isOpen={!!openSubmenus["financialReport"]}
//       onToggle={() => toggleSubmenu("financialReport")}
//       icon={<HiOutlineLibrary />} // Library/book icon for financial reports
//       label="Financial Report"
//     >
//       <Item
//         href="/admin/finance/report/trial-balance"
//         icon={<HiDocumentText />} // Document icon for report
//         label="Trial Balance"
//         close={closeSidebar}
//       />
//       <Item
//         href="/admin/finance/report/profit-loss"
//         icon={<HiDocumentText />}
//         label="Profit & Loss"
//         close={closeSidebar}
//       />
//       <Item
//         href="/admin/finance/report/balance-sheet"
//         icon={<HiDocumentText />}
//         label="Balance Sheet"
//         close={closeSidebar}
//       />
//     </Submenu>

//     {/* Ageing Reports */}
//     <Submenu
//       isOpen={!!openSubmenus["ageingReport"]}
//       onToggle={() => toggleSubmenu("ageingReport")}
//       icon={<HiUserGroup />} // Users group for ageing reports
//       label="Ageing"
//     >
//       <Item
//         href="/admin/finance/report/ageing/customer"
//         icon={<HiUser />} // Single user for customer ageing
//         label="Customer Ageing"
//         close={closeSidebar}
//       />
//       <Item
//         href="/admin/finance/report/ageing/supplier"
//         icon={<HiUser />} // Single user for supplier ageing
//         label="Supplier Ageing"
//         close={closeSidebar}
//       />
//     </Submenu>

//     {/* Statement Reports */}
//     <Submenu
//       isOpen={!!openSubmenus["statementReport"]}
//       onToggle={() => toggleSubmenu("statementReport")}
//       icon={<HiReceiptTax />} // Statement/tax icon
//       label="Statement"
//     >
//       <Item
//         href="/admin/finance/report/statement/customer"
//         icon={<HiUser />} // Customer
//         label="Customer Statement"
//         close={closeSidebar}
//       />
//       <Item
//         href="/admin/finance/report/statement/supplier"
//         icon={<HiUser />} // Supplier
//         label="Supplier Statement"
//         close={closeSidebar}
//       />
//       <Item
//         href="/admin/finance/report/statement/bank"
//         icon={<HiOutlineCreditCard />} // Bank
//         label="Bank Statement"
//         close={closeSidebar}
//       />
//     </Submenu>
//   </Submenu>
// </Section>

//           {/* Production */}
//           <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//             <Item href="/admin/bom" icon={<HiOutlineCube />} label="BoM" close={closeSidebar} />
//             <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" close={closeSidebar} />
//           </Section>

//           {/* Production View */}
//           <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
           
//             <Item href="/admin/bom-view" icon={<HiOutlineCube />} label="BoM View" close={closeSidebar} />
//             <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" close={closeSidebar} />
           
//             <Item href="/admin/production-board" icon={<HiChartSquareBar />} label="Production Board" close={closeSidebar} />
//           </Section>

//           {/* Project */}
//           <Section
//             title={<Link href="/admin/project" onClick={closeSidebar} className="flex items-center gap-2">Project</Link>}
//             icon={<HiViewGrid />}
//             isOpen={openMenu === "project"}
//             onToggle={() => toggleMenu("project")}
//           >
//             <Item href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" close={closeSidebar} />
//             <Item href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" close={closeSidebar} />
//             <Item href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
//             <Item href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" close={closeSidebar} />
//           </Section>

//           {/* HR  */}
//           <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//           <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" close={closeSidebar} />
//           <Item href="/admin/hr/Dashboard" icon={<HiUserGroup />} label="Employee Details" close={closeSidebar} />
//           <Item href="/admin/hr/masters" icon={<HiUserGroup />} label="Department" close={closeSidebar} />
//           <Item href="/admin/hr/leaves" icon={<HiUserGroup />} label="Leave" close={closeSidebar} />
//           <Item href="/admin/hr/attendance" icon={<HiUserGroup />} label="Attendance" close={closeSidebar} />
//           <Item href="/admin/hr/payroll" icon={<HiUserGroup />} label="Payroll" close={closeSidebar} />
//           <Item href="/admin/hr/employees" icon={<HiUserGroup />} label="Employee" close={closeSidebar} />
//           <Item href="/admin/hr/reports" icon={<HiUserGroup />} label="Reports" close={closeSidebar} />
//           <Item href="/admin/hr/settings" icon={<HiCog />} label="Settings" close={closeSidebar} />
//           <Item href="/admin/hr/holidays" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
//           <Item href="/admin/hr/profile" icon={<HiUser />} label="Profile" close={closeSidebar} />
          
          
//           </Section>



//           {/* ppc */}
//           <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//             <Item href="/admin/ppc/operatorsPage" icon={<HiUser />} label="Operators" close={closeSidebar} />
//             <Item href="/admin/ppc/machinesPage" icon={<HiOutlineCube />} label="Machines" close={closeSidebar} />
//             <Item href="/admin/ppc/resourcesPage" icon={<HiOutlineLibrary />} label="Resources" close={closeSidebar} />
//             <Item href="/admin/ppc/machineOutputPage" icon={<HiOutlineLibrary />}  label="Machine Outputs" close={closeSidebar} />
//             <Item href="/admin/ppc/holidaysPage" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
//             {/* machine and operator mapping */}
//             <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />} label="Machine-Operator Mapping" close={closeSidebar} />
//             <Item href="/admin/ppc/operations" icon={<HiPuzzle />} label="Operations" close={closeSidebar} />
//             <Item href="/admin/ppc/productionOrderPage" icon={<HiReceiptTax />} label="Production Planning" close={closeSidebar} />
//             <Item href="/admin/ppc/jobcards" icon={<HiReceiptTax />} label="Job Card" close={closeSidebar} />
//              <Item href="/admin/ppc/downtime" icon={<HiReceiptTax />} label="Downtime" close={closeSidebar} />

//           </Section>

//           <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//             <Item href="/admin/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" close={closeSidebar} />
//             <Item href="/admin/helpdesk/agents" icon={<HiUsers />} label="Agents" close={closeSidebar} />
//             <Item href="/admin/helpdesk/categories" icon={<HiUserGroup />} label="Categories" close={closeSidebar} />
//             <Item href="/admin/helpdesk/agents/manage" icon={<HiPuzzle />} label="Create Agent" close={closeSidebar} />
//             <Item href="/admin/helpdesk/settings" icon={<HiCog />} label="Settings" close={closeSidebar} />
//             <Item href="/admin/helpdesk/feedback" icon={<HiDocumentText />} label="Feedback" close={closeSidebar} />
//             <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" close={closeSidebar} />
//             <Item href="/admin/helpdesk/report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
//           </Section>
          

//           {/* Logout */}
//           <div className="pt-4"><LogoutButton /></div>
//         </nav>
//       </aside>

//       {/* Content Area */}
//       <div className="flex-1 md:ml-64 flex flex-col">
//         {/* Navbar */}
//         <header className="h-14 bg-white shadow flex items-center justify-between px-4">
//           <span className="text-sm">
//             Hello, {session?.companyName || session?.email}
//           </span>
//           <div className="flex items-center gap-3">
//             <img
//               src="/#"
//               alt="Profile"
//               className="w-8 h-8 rounded-full object-cover"
//             />
//             <NotificationBell />
//             <LogoutButton />
//           </div>
//         </header>

//         {/* Main Content */}
//         <main className="flex-1 overflow-y-auto p-4">{children}</main>
//       </div>
//     </div>
//   );
// }




