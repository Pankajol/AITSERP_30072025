// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import {
//   HiUsers, HiGlobeAlt, HiFlag, HiUserGroup, HiOutlineCube, HiOutlineLibrary,
//   HiCurrencyDollar, HiOutlineCreditCard, HiChartSquareBar, HiReceiptTax,
//   HiPuzzle, HiViewGrid, HiUser, HiDocumentText, HiOutlineOfficeBuilding,
//   HiCube, HiShoppingCart, HiCog, HiMenu, HiX, HiHome
// } from "react-icons/hi";
// import { GiStockpiles } from "react-icons/gi";
// import { SiCivicrm } from "react-icons/si";
// import { useRouter } from "next/navigation";
// import { jwtDecode } from "jwt-decode";
// import LogoutButton from "@/components/LogoutButton";

// /* ---------- UI COMPONENTS ---------- */
// const Section = ({ title, icon, isOpen, onToggle, children }) => (
//   <div className="border-b border-gray-600/20">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-3 py-3 hover:bg-gray-600 transition-colors text-left"
//     >
//       <span className="flex gap-3 items-center font-medium text-sm">
//         <span className="text-lg text-blue-400">{icon}</span> {title}
//       </span>
//       <span className="text-xs">{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="bg-gray-800/40 pb-2 ml-4 border-l border-gray-500">{children}</div>}
//   </div>
// );

// const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
//   <div className="mt-1">
//     <button
//       onClick={onToggle}
//       className="flex justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider"
//     >
//       <span className="flex gap-2 items-center">{icon}{label}</span>
//       <span>{isOpen ? "−" : "+"}</span>
//     </button>
//     {isOpen && <div className="ml-2 space-y-1 border-l border-gray-600/30">{children}</div>}
//   </div>
// );

// const Item = ({ href, icon, label, onClick }) => (
//   <Link
//     href={href}
//     onClick={onClick}
//     className="flex gap-3 px-4 py-2 text-[13px] text-gray-300 hover:text-white hover:bg-blue-600/20 rounded-l-md transition-all"
//   >
//     <span className="text-base opacity-70">{icon}</span>
//     {label}
//   </Link>
// );

// /* ---------- MAIN LAYOUT ---------- */
// export default function Layout({ children }) {
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSub, setOpenSub] = useState({});
//   const [session, setSession] = useState(null);
//   const router = useRouter();

//   useEffect(() => {
//     const t = localStorage.getItem("token");
//     if (!t) return router.push("/");
//     try {
//       setSession(jwtDecode(t));
//     } catch {
//       localStorage.removeItem("token");
//       router.push("/");
//     }
//   }, [router]);

//   if (!session) return null;

//   const isCompany = session?.type === "company";
//   const canAccess = (roles = []) => (isCompany ? true : roles.some((r) => session?.roles?.includes(r)));

//   const toggleMenu = (m) => setOpenMenu(openMenu === m ? null : m);
//   const toggleSub = (k) => setOpenSub((p) => ({ ...p, [k]: !p[k] }));
//   const closeSidebar = () => setIsSidebarOpen(false);

//   return (
//     <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
//       {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={closeSidebar} />}

//       {/* SIDEBAR */}
//       <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1e293b] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col shadow-2xl`}>
//         <div className="h-16 flex items-center justify-between px-6 bg-[#0f172a] shrink-0 border-b border-gray-700">
//           <span className="font-bold text-lg flex items-center gap-2 tracking-wider"><HiHome className="text-blue-400" /> ERP SYSTEM</span>
//           <button onClick={closeSidebar} className="md:hidden"><HiX size={24} /></button>
//         </div>

//         <nav className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          
//           {/* MASTERS */}
//           {canAccess(["Admin"]) && (
//             <Section title="Masters" icon={<HiUsers/>} isOpen={openMenu==="master"} onToggle={()=>toggleMenu("master")}>
//               <Item href="/admin/Countries" icon={<HiGlobeAlt/>} label="Countries" onClick={closeSidebar}/>
//               <Item href="/admin/State" icon={<HiFlag/>} label="State" onClick={closeSidebar}/>
//               <Item href="/admin/CreateGroup" icon={<HiUserGroup/>} label="Create Group" onClick={closeSidebar}/>
//               <Item href="/admin/CreateItemGroup" icon={<HiOutlineCube/>} label="Create Item Group" onClick={closeSidebar}/>
//               <Item href="/admin/account-bankhead" icon={<HiOutlineLibrary/>} label="Account Head" onClick={closeSidebar}/>
//               <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar/>} label="General Ledger" onClick={closeSidebar}/>
//               <Item href="/admin/createCustomers" icon={<HiUserGroup/>} label="Create Customer" onClick={closeSidebar}/>
//               <Item href="/admin/supplier" icon={<HiUserGroup/>} label="Supplier" onClick={closeSidebar}/>
//               <Item href="/admin/item" icon={<HiCube/>} label="Item" onClick={closeSidebar}/>
//               <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary/>} label="Warehouse Details" onClick={closeSidebar}/>
//             </Section>
//           )}

//           {/* MASTERS VIEW */}
//           {canAccess(["Admin"]) && (
//             <Section title="Masters View" icon={<HiViewGrid/>} isOpen={openMenu==="masterView"} onToggle={()=>toggleMenu("masterView")}>
//               <Item href="/admin/customer-view" icon={<HiUsers/>} label="Customer View" onClick={closeSidebar}/>
//               <Item href="/admin/supplier" icon={<HiUserGroup/>} label="Supplier View" onClick={closeSidebar}/>
//               <Item href="/admin/item" icon={<HiCube/>} label="Item View" onClick={closeSidebar}/>
//               <Item href="/admin/account-head-view" icon={<HiOutlineLibrary/>} label="Account Head View" onClick={closeSidebar}/>
//               <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar/>} label="General Ledger View" onClick={closeSidebar}/>
//               <Item href="/admin/email-templates" icon={<HiDocumentText/>} label="Email Templates" onClick={closeSidebar}/>
//               <Item href="/admin/email-masters" icon={<HiOutlineCreditCard/>} label="Email & App Master" onClick={closeSidebar}/>
//               <Item href="/admin/price-list" icon={<HiOutlineOfficeBuilding/>} label="Price List" onClick={closeSidebar}/>
//             </Section>
//           )}

//           {/* TRANSACTIONS VIEW (SALES & PURCHASE) */}
//           {canAccess(["Admin", "Sales Manager", "Purchase Manager"]) && (
//             <Section title="Transactions View" icon={<HiOutlineCreditCard/>} isOpen={openMenu==="transactionsView"} onToggle={()=>toggleMenu("transactionsView")}>
//               <Submenu label="Sales" icon={<HiShoppingCart/>} isOpen={openSub.tvSales} onToggle={()=>toggleSub("tvSales")}>
//                 <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar}/>
//                 <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar}/>
//                 <Item href="/admin/pos" icon={<HiCube />} label="POS Invoice View" onClick={closeSidebar}/>
//                 <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" onClick={closeSidebar}/>
//                 <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar}/>
//                 <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" onClick={closeSidebar}/>
//                 <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Sales Report" onClick={closeSidebar}/>
//                 <Item href="/admin/pos/reports" icon={<HiChartSquareBar />} label="POS Report" onClick={closeSidebar}/>
//                 <Item href="/admin/sales-board" icon={<HiChartSquareBar />} label="Sales Board" onClick={closeSidebar}/>
//               </Submenu>
//               <Submenu label="Purchase" icon={<GiStockpiles/>} isOpen={openSub.tvPurchase} onToggle={()=>toggleSub("tvPurchase")}>
//                 <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" onClick={closeSidebar}/>
//                 <Item href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" onClick={closeSidebar}/>
//                 <Item href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" onClick={closeSidebar}/>
//                 <Item href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" onClick={closeSidebar}/>
//                 <Item href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes View" onClick={closeSidebar}/>
//                 <Item href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Purchase Report" onClick={closeSidebar}/>
//               </Submenu>
//             </Section>
//           )}

//           {/* USER & TASKS */}
//           {canAccess(["Admin"]) && (
//             <>
//               <Section title="User Management" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
//                 <Item href="/admin/users" icon={<HiUserGroup />} label="All Users" onClick={closeSidebar} />
//               </Section>
//               <Section title="Task Manager" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
//                 <Item href="/admin/tasks" icon={<HiUserGroup />} label="Task List" onClick={closeSidebar} />
//                 <Item href="/admin/tasks/board" icon={<HiPuzzle />} label="Task Board" onClick={closeSidebar} />
//               </Section>
//             </>
//           )}

//           {/* CRM VIEW */}
//           {canAccess(["Admin", "Sales Manager"]) && (
//             <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//               <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" onClick={closeSidebar} />
//               <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" onClick={closeSidebar} />
//               <Item href="/admin/crm/campaign" icon={<HiPuzzle />} label="Campaign" onClick={closeSidebar} />
//             </Section>
//           )}

//           {/* STOCK & PAYMENT */}
//           {canAccess(["Admin", "Stock Manager"]) && (
//             <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
//               <Item href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" onClick={closeSidebar} />
//               <Item href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" onClick={closeSidebar} />
//               <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" onClick={closeSidebar} />
//             </Section>
//           )}
//           {canAccess(["Admin", "Accountant"]) && (
//             <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
//               <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" onClick={closeSidebar} />
//             </Section>
//           )}

//           {/* FINANCE (REPORTS & JOURNALS) */}
//           {canAccess(["Admin", "Accountant"]) && (
//             <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === "finance"} onToggle={() => toggleMenu("finance")}>
//               <Submenu label="Journal Entry" icon={<HiCurrencyDollar />} isOpen={openSub.journal} onToggle={() => toggleSub("journal")}>
//                 <Item href="/admin/finance/journal-entry" label="Create Journal" onClick={closeSidebar} />
//               </Submenu>
//               <Submenu label="Reports" icon={<HiChartSquareBar />} isOpen={openSub.finReport} onToggle={() => toggleSub("finReport")}>
//                 <Submenu label="Financial Statements" icon={<HiOutlineLibrary />} isOpen={openSub.finStat} onToggle={() => toggleSub("finStat")}>
//                   <Item href="/admin/finance/report/trial-balance" label="Trial Balance" onClick={closeSidebar} />
//                   <Item href="/admin/finance/report/profit-loss" label="Profit & Loss" onClick={closeSidebar} />
//                   <Item href="/admin/finance/report/balance-sheet" label="Balance Sheet" onClick={closeSidebar} />
//                 </Submenu>
//                 <Submenu label="Ageing" icon={<HiUserGroup />} isOpen={openSub.ageing} onToggle={() => toggleSub("ageing")}>
//                   <Item href="/admin/finance/report/ageing/customer" label="Customer Ageing" onClick={closeSidebar} />
//                   <Item href="/admin/finance/report/ageing/supplier" label="Supplier Ageing" onClick={closeSidebar} />
//                 </Submenu>
//                 <Submenu label="Statements" icon={<HiReceiptTax />} isOpen={openSub.statement} onToggle={() => toggleSub("statement")}>
//                   <Item href="/admin/finance/report/statement/customer" label="Customer Statement" onClick={closeSidebar} />
//                   <Item href="/admin/finance/report/statement/supplier" label="Supplier Statement" onClick={closeSidebar} />
//                   <Item href="/admin/finance/report/statement/bank" label="Bank Statement" onClick={closeSidebar} />
//                 </Submenu>
//               </Submenu>
//             </Section>
//           )}

//           {/* PRODUCTION & PRODUCTION VIEW */}
//           {canAccess(["Admin", "Production Manager"]) && (
//             <>
//               <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
//                 <Item href="/admin/bom" icon={<HiOutlineCube />} label="Bill of Materials" onClick={closeSidebar} />
//                 <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" onClick={closeSidebar} />
//               </Section>
//               <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
//                 <Item href="/admin/bom-view" label="BoM View" onClick={closeSidebar} />
//                 <Item href="/admin/productionorders-list-view" label="Production Orders View" onClick={closeSidebar} />
//                 <Item href="/admin/production-board" icon={<HiChartSquareBar />} label="Production Board" onClick={closeSidebar} />
//               </Section>
//             </>
//           )}

//           {/* PROJECT */}
//           {canAccess(["Admin", "Project Manager"]) && (
//             <Section title="Project" icon={<HiViewGrid />} isOpen={openMenu === "project"} onToggle={() => toggleMenu("project")}>
//               <Item href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" onClick={closeSidebar} />
//               <Item href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" onClick={closeSidebar} />
//               <Item href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" onClick={closeSidebar} />
//               <Item href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" onClick={closeSidebar} />
//             </Section>
//           )}

//           {/* HR */}
//           {canAccess(["Admin", "HR Manager"]) && (
//             <Section title="HR Management" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
//               <Item href="/admin/hr/employee-onboarding" label="Onboarding" onClick={closeSidebar} />
//               <Item href="/admin/hr/Dashboard" label="Employee Details" onClick={closeSidebar} />
//               <Item href="/admin/hr/masters" label="Department Master" onClick={closeSidebar} />
//               <Item href="/admin/hr/leaves" label="Leaves" onClick={closeSidebar} />
//               <Item href="/admin/hr/attendance" label="Attendance" onClick={closeSidebar} />
//               <Item href="/admin/hr/payroll" label="Payroll" onClick={closeSidebar} />
//               <Item href="/admin/hr/employees" label="All Employees" onClick={closeSidebar} />
//               <Item href="/admin/hr/reports" label="HR Reports" onClick={closeSidebar} />
//               <Item href="/admin/hr/settings" icon={<HiCog />} label="HR Settings" onClick={closeSidebar} />
//               <Item href="/admin/hr/holidays" label="Holidays" onClick={closeSidebar} />
//             </Section>
//           )}

//           {/* PPC */}
//           {canAccess(["Admin", "Production Manager"]) && (
//             <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
//               <Item href="/admin/ppc/operatorsPage" label="Operators" onClick={closeSidebar} />
//               <Item href="/admin/ppc/machinesPage" label="Machines" onClick={closeSidebar} />
//               <Item href="/admin/ppc/resourcesPage" label="Resources" onClick={closeSidebar} />
//               <Item href="/admin/ppc/machineOutputPage" label="Machine Outputs" onClick={closeSidebar} />
//               <Item href="/admin/ppc/operatorMachineMappingPage" label="Machine-Operator Mapping" onClick={closeSidebar} />
//               <Item href="/admin/ppc/operations" label="Operations" onClick={closeSidebar} />
//               <Item href="/admin/ppc/productionOrderPage" label="Production Planning" onClick={closeSidebar} />
//               <Item href="/admin/ppc/jobcards" label="Job Cards" onClick={closeSidebar} />
//               <Item href="/admin/ppc/downtime" label="Downtime Tracking" onClick={closeSidebar} />
//             </Section>
//           )}

//           {/* HELPDESK */}
//           {canAccess(["Admin", "Agent"]) && (
//             <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
//               <Item href="/admin/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" onClick={closeSidebar} />
//               <Item href="/admin/helpdesk/agents" label="Agents List" onClick={closeSidebar} />
//               <Item href="/admin/helpdesk/categories" label="Categories" onClick={closeSidebar} />
//               <Item href="/admin/helpdesk/feedback" icon={<HiDocumentText />} label="Feedback" onClick={closeSidebar} />
//               <Item href="/admin/helpdesk/feedback/analytics" label="Feedback Analysis" onClick={closeSidebar} />
//             </Section>
//           )}

//           <div className="p-4 mt-6 border-t border-gray-700"><LogoutButton /></div>
//         </nav>
//       </aside>

//       {/* CONTENT AREA */}
//       <div className="flex-1 flex flex-col min-w-0">
//         <header className="h-16 bg-white border-b px-4 md:px-8 flex justify-between items-center shadow-sm sticky top-0 z-30">
//           <div className="flex items-center gap-4">
//             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-800 focus:outline-none"><HiMenu size={26} /></button>
//             <h1 className="text-sm md:text-lg font-semibold text-gray-700 truncate">
//               {isCompany ? "Company Administrator" : "Dashboard"}
//             </h1>
//           </div>
//           <div className="flex items-center gap-4">
//             <span className="hidden sm:inline text-xs font-medium text-gray-500 uppercase tracking-widest">{session.email}</span>
//             <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
//               {session.email?.charAt(0).toUpperCase()}
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">{children}</main>
//       </div>
//     </div>
//   );
// }


"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiMenu,
  HiX,
  HiHome,
  HiUsers,
  HiGlobeAlt,
  HiFlag,
  HiUserGroup,
  HiOutlineCube,
  HiOutlineLibrary,
  HiCurrencyDollar,
  HiOutlineCreditCard,
  HiChartSquareBar,
  HiReceiptTax,
  HiPuzzle,
  HiViewGrid,
  HiUser,
  HiDocumentText,
  HiOutlineOfficeBuilding,
  HiCube,
  HiShoppingCart,
  HiCog,
  
 

} from "react-icons/hi";
import { GiStockpiles } from "react-icons/gi";
import { SiCivicrm } from "react-icons/si";
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';
import { useEffect } from "react";
import LogoutButton from "@/components/LogoutButton";

// --- Components for sidebar ---
const Section = ({ title, icon, isOpen, onToggle, children }) => (
  <div>
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-gray-600"
    >
      <span className="flex items-center gap-2">
        {icon} {title}
      </span>
      <span>{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && <div className="ml-6 space-y-2">{children}</div>}
  </div>
);

const Submenu = ({ label, icon, isOpen, onToggle, children }) => (
  <div>
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-600"
    >
      <span className="flex items-center gap-2">
        {icon} {label}
      </span>
      <span>{isOpen ? "−" : "+"}</span>
    </button>
    {isOpen && <div className="ml-6 space-y-2">{children}</div>}
  </div>
);

const Item = ({ href, icon, label, close }) => (
  <Link
    href={href}
    onClick={close}
    className="flex items-center gap-2 px-4 py-2 text-sm rounded-md hover:bg-gray-600"
  >
    {icon} {label}
  </Link>
);

// Dummy buttons (replace with your real ones)
// const LogoutButton = () => (
//   <button className="px-3 py-2 bg-red-500 text-white rounded-md">Logout</button>
// );
const NotificationBell = () => (
  <button className="px-3 py-2 bg-gray-300 rounded-full">🔔</button>
);



export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [session, setSession] = useState(null);
  const router = useRouter();

 
    

    useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return router.push("/");
    try {
      setSession(jwtDecode(t));
    } catch {
      localStorage.removeItem("token");
      router.push("/");
    }
  }, [router]);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const toggleSubmenu = (submenu) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [submenu]: !prev[submenu],
    }));
  };

  console.log(session);


  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
        <button
          aria-label="Open menu"
          onClick={() => setIsSidebarOpen(true)}
          className="text-2xl text-gray-700 dark:text-gray-200"
        >
          <HiMenu />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          Dashboard
        </h1>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-gray-700 text-white fixed inset-y-0 left-0 transform transition-transform duration-200 ease-in-out z-40  overflow-y-auto
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HiHome /> Dashboard
          </h2>
          <button
            aria-label="Close menu"
            onClick={closeSidebar}
            className="text-2xl"
          >
            <HiX />
          </button>
        </div>

        {/* Sidebar Menu */}
               <nav className="mt-6 px-2 pb-6 space-y-3">
          {/* Masters */}
          <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
            <Item href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" close={closeSidebar} />
            <Item href="/admin/State" icon={<HiFlag />} label="State" close={closeSidebar} />
            <Item href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" close={closeSidebar} />
            <Item href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" close={closeSidebar} />
            <Item href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" close={closeSidebar} />
            <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger" close={closeSidebar} />
            <Item href="/admin/createCustomers" icon={<HiUserGroup />} label="Create Customer" close={closeSidebar} />
            <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier" close={closeSidebar} />
            <Item href="/admin/item" icon={<HiCube />} label="Item" close={closeSidebar} />
            <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" close={closeSidebar} />
          </Section>

          {/* Masters View */}
          <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
            <Item href="/admin/customer-view" icon={<HiUsers />} label="Customer View" close={closeSidebar} />
            <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier View" close={closeSidebar} />
            <Item href="/admin/item" icon={<HiCube />} label="Item View" close={closeSidebar} />
            <Item href="/admin/account-head-view" icon={<HiOutlineLibrary />} label="Account Head View" close={closeSidebar} />
            <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />} label="General Ledger View " close={closeSidebar} />
            <Item href="/admin/email-templates" icon={<HiDocumentText />} label="Email Templates" close={closeSidebar} />
            <Item href="/admin/email-masters" icon={<HiOutlineCreditCard />} label="Email & App Password Master" close={closeSidebar} />
            <Item href="/admin/price-list" icon={<HiOutlineOfficeBuilding />} label="Price List" close={closeSidebar} />
            
          </Section>

          {/* Other sections ... add your other menus here in the same format ... */}

          
          {/* Transactions View */}
          <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
            <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
              <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
              <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
              <Item href="/admin/pos" icon={<HiCube />} label="POS Invoice View" close={closeSidebar} />

              <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
              <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
              <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
              <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
              <Item href="/admin/pos/reports" icon={<HiChartSquareBar />} label="POS Report" close={closeSidebar} />
              <Item href="/admin/sales-board" icon={<HiChartSquareBar />} label="Sales Board" close={closeSidebar} />
            </Submenu>

            <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
              <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
              <Item href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
              <Item href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" close={closeSidebar} />
              <Item href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
              <Item href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes View" close={closeSidebar} />
              <Item href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
            </Submenu>
          </Section>

          {/* User */}
          <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
            <Item href="/admin/users" icon={<HiUserGroup />} label="User" close={closeSidebar} />
          </Section>

          {/* task */}
          <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
            <Item href="/admin/tasks" icon={<HiUserGroup />} label="Tasks" close={closeSidebar} />
            {/* <Item href="/admin/task-board" icon={<HiUserGroup />} label="Task Board" close={closeSidebar} /> */}
            <Item href="/admin/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
          </Section>

          {/* CRM-View */}
          <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
            <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
            <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
            <Item href="/admin/crm/campaign" icon={<HiPuzzle />} label="Campaign" close={closeSidebar} />

          </Section>

          {/* Stock */}
          <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
            <Item href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" close={closeSidebar} />
            <Item href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" close={closeSidebar} />
            <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" close={closeSidebar} />
          </Section>

          {/* Payment */}
          <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
            <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" close={closeSidebar} />
          </Section>

          {/* Finance */}
         <Section
  title="Finance"
  icon={<HiOutlineCreditCard />} // Finance main icon
  isOpen={openMenu === "finance"}
  onToggle={() => toggleMenu("finance")}
>
  {/* Journal Entry */}
  <Submenu
    isOpen={!!openSubmenus["journalEntry"]}
    onToggle={() => toggleSubmenu("journalEntry")}
    icon={<HiCurrencyDollar />} // Dollar icon for journal/transactions
    label="Journal Entry"
  >
    <Item
      href="/admin/finance/journal-entry"
      icon={<HiOutlineCreditCard />} // Could use credit card for entry
      label="Journal Entry"
      close={closeSidebar}
    />
  </Submenu>

  {/* Reports */}
  <Submenu
    isOpen={!!openSubmenus["report"]}
    onToggle={() => toggleSubmenu("report")}
    icon={<HiChartSquareBar />} // Report icon
    label="Report"
  >
    {/* Financial Reports */}
    <Submenu
      isOpen={!!openSubmenus["financialReport"]}
      onToggle={() => toggleSubmenu("financialReport")}
      icon={<HiOutlineLibrary />} // Library/book icon for financial reports
      label="Financial Report"
    >
      <Item
        href="/admin/finance/report/trial-balance"
        icon={<HiDocumentText />} // Document icon for report
        label="Trial Balance"
        close={closeSidebar}
      />
      <Item
        href="/admin/finance/report/profit-loss"
        icon={<HiDocumentText />}
        label="Profit & Loss"
        close={closeSidebar}
      />
      <Item
        href="/admin/finance/report/balance-sheet"
        icon={<HiDocumentText />}
        label="Balance Sheet"
        close={closeSidebar}
      />
    </Submenu>

    {/* Ageing Reports */}
    <Submenu
      isOpen={!!openSubmenus["ageingReport"]}
      onToggle={() => toggleSubmenu("ageingReport")}
      icon={<HiUserGroup />} // Users group for ageing reports
      label="Ageing"
    >
      <Item
        href="/admin/finance/report/ageing/customer"
        icon={<HiUser />} // Single user for customer ageing
        label="Customer Ageing"
        close={closeSidebar}
      />
      <Item
        href="/admin/finance/report/ageing/supplier"
        icon={<HiUser />} // Single user for supplier ageing
        label="Supplier Ageing"
        close={closeSidebar}
      />
    </Submenu>

    {/* Statement Reports */}
    <Submenu
      isOpen={!!openSubmenus["statementReport"]}
      onToggle={() => toggleSubmenu("statementReport")}
      icon={<HiReceiptTax />} // Statement/tax icon
      label="Statement"
    >
      <Item
        href="/admin/finance/report/statement/customer"
        icon={<HiUser />} // Customer
        label="Customer Statement"
        close={closeSidebar}
      />
      <Item
        href="/admin/finance/report/statement/supplier"
        icon={<HiUser />} // Supplier
        label="Supplier Statement"
        close={closeSidebar}
      />
      <Item
        href="/admin/finance/report/statement/bank"
        icon={<HiOutlineCreditCard />} // Bank
        label="Bank Statement"
        close={closeSidebar}
      />
    </Submenu>
  </Submenu>
</Section>

          {/* Production */}
          <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
            <Item href="/admin/bom" icon={<HiOutlineCube />} label="BoM" close={closeSidebar} />
            <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" close={closeSidebar} />
          </Section>

          {/* Production View */}
          <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
           
            <Item href="/admin/bom-view" icon={<HiOutlineCube />} label="BoM View" close={closeSidebar} />
            <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" close={closeSidebar} />
           
            <Item href="/admin/production-board" icon={<HiChartSquareBar />} label="Production Board" close={closeSidebar} />
          </Section>

          {/* Project */}
          <Section
            title={<Link href="/admin/project" onClick={closeSidebar} className="flex items-center gap-2">Project</Link>}
            icon={<HiViewGrid />}
            isOpen={openMenu === "project"}
            onToggle={() => toggleMenu("project")}
          >
            <Item href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" close={closeSidebar} />
            <Item href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" close={closeSidebar} />
            <Item href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
            <Item href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" close={closeSidebar} />
          </Section>

          {/* HR  */}
          <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
          <Item href="/admin/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" close={closeSidebar} />
          <Item href="/admin/hr/Dashboard" icon={<HiUserGroup />} label="Employee Details" close={closeSidebar} />
          <Item href="/admin/hr/masters" icon={<HiUserGroup />} label="Department" close={closeSidebar} />
          <Item href="/admin/hr/leaves" icon={<HiUserGroup />} label="Leave" close={closeSidebar} />
          <Item href="/admin/hr/attendance" icon={<HiUserGroup />} label="Attendance" close={closeSidebar} />
          <Item href="/admin/hr/payroll" icon={<HiUserGroup />} label="Payroll" close={closeSidebar} />
          <Item href="/admin/hr/employees" icon={<HiUserGroup />} label="Employee" close={closeSidebar} />
          <Item href="/admin/hr/reports" icon={<HiUserGroup />} label="Reports" close={closeSidebar} />
          <Item href="/admin/hr/settings" icon={<HiCog />} label="Settings" close={closeSidebar} />
          <Item href="/admin/hr/holidays" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
          <Item href="/admin/hr/profile" icon={<HiUser />} label="Profile" close={closeSidebar} />
          
          
          </Section>



          {/* ppc */}
          <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
            <Item href="/admin/ppc/operatorsPage" icon={<HiUser />} label="Operators" close={closeSidebar} />
            <Item href="/admin/ppc/machinesPage" icon={<HiOutlineCube />} label="Machines" close={closeSidebar} />
            <Item href="/admin/ppc/resourcesPage" icon={<HiOutlineLibrary />} label="Resources" close={closeSidebar} />
            <Item href="/admin/ppc/machineOutputPage" icon={<HiOutlineLibrary />}  label="Machine Outputs" close={closeSidebar} />
            <Item href="/admin/ppc/holidaysPage" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
            {/* machine and operator mapping */}
            <Item href="/admin/ppc/operatorMachineMappingPage" icon={<HiPuzzle />} label="Machine-Operator Mapping" close={closeSidebar} />
            <Item href="/admin/ppc/operations" icon={<HiPuzzle />} label="Operations" close={closeSidebar} />
            <Item href="/admin/ppc/productionOrderPage" icon={<HiReceiptTax />} label="Production Planning" close={closeSidebar} />
            <Item href="/admin/ppc/jobcards" icon={<HiReceiptTax />} label="Job Card" close={closeSidebar} />
             <Item href="/admin/ppc/downtime" icon={<HiReceiptTax />} label="Downtime" close={closeSidebar} />

          </Section>

          <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
            <Item href="/admin/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" close={closeSidebar} />
            <Item href="/admin/helpdesk/agents" icon={<HiUsers />} label="Agents" close={closeSidebar} />
            <Item href="/admin/helpdesk/categories" icon={<HiUserGroup />} label="Categories" close={closeSidebar} />
            <Item href="/admin/helpdesk/agents/manage" icon={<HiPuzzle />} label="Create Agent" close={closeSidebar} />
            <Item href="/admin/helpdesk/settings" icon={<HiCog />} label="Settings" close={closeSidebar} />
            <Item href="/admin/helpdesk/feedback" icon={<HiDocumentText />} label="Feedback" close={closeSidebar} />
            <Item href="/admin/helpdesk/feedback/analytics" icon={<HiChartSquareBar />} label="Feedback Analysis" close={closeSidebar} />
          </Section>
          

          {/* Logout */}
          <div className="pt-4"><LogoutButton /></div>
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Navbar */}
        <header className="h-14 bg-white shadow flex items-center justify-between px-4">
          <span className="text-sm">
            Hello, {session?.companyName || session?.email}
          </span>
          <div className="flex items-center gap-3">
            <img
              src="/#"
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <NotificationBell />
            <LogoutButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}




