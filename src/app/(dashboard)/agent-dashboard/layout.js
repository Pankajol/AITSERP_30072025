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
  HiChartBar,
  
 

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
          {/* <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
            <Item href="/agent-dashboard/Countries" icon={<HiGlobeAlt />} label="Countries" close={closeSidebar} />
            <Item href="/agent-dashboard/State" icon={<HiFlag />} label="State" close={closeSidebar} />
            <Item href="/agent-dashboard/CreateGroup" icon={<HiUserGroup />} label="Create Group" close={closeSidebar} />
            <Item href="/agent-dashboard/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" close={closeSidebar} />
            <Item href="/agent-dashboard/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" close={closeSidebar} />
            <Item href="/agent-dashboard/bank-head-details" icon={<HiCurrencyDollar />} label="General Ledger" close={closeSidebar} />
            <Item href="/agent-dashboard/createCustomers" icon={<HiUserGroup />} label="Create Customer" close={closeSidebar} />
            <Item href="/agent-dashboard/supplier" icon={<HiUserGroup />} label="Supplier" close={closeSidebar} />
            <Item href="/agent-dashboard/item" icon={<HiCube />} label="Item" close={closeSidebar} />
            <Item href="/agent-dashboard/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" close={closeSidebar} />
          </Section> */}

          {/* Masters View */}
          {/* <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === "masterView"} onToggle={() => toggleMenu("masterView")}>
            <Item href="/agent-dashboard/customer-view" icon={<HiUsers />} label="Customer View" close={closeSidebar} />
            <Item href="/agent-dashboard/supplier" icon={<HiUserGroup />} label="Supplier View" close={closeSidebar} />
            <Item href="/agent-dashboard/item" icon={<HiCube />} label="Item View" close={closeSidebar} />
            <Item href="/agent-dashboard/account-head-view" icon={<HiOutlineLibrary />} label="Account Head View" close={closeSidebar} />
            <Item href="/agent-dashboard/bank-head-details-view" icon={<HiCurrencyDollar />} label="General Ledger View " close={closeSidebar} />
            <Item href="/agent-dashboard/email-templates" icon={<HiDocumentText />} label="Email Templates" close={closeSidebar} />
            <Item href="/agent-dashboard/email-masters" icon={<HiOutlineCreditCard />} label="Email & App Password Master" close={closeSidebar} />
          </Section> */}

          {/* Other sections ... add your other menus here in the same format ... */}

          
          {/* Transactions View */}
          {/* <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
            <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
              <Item href="/agent-dashboard/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
              <Item href="/agent-dashboard/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
              <Item href="/agent-dashboard/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
              <Item href="/agent-dashboard/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
              <Item href="/agent-dashboard/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
              <Item href="/agent-dashboard/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
              <Item href="/agent-dashboard/sales-board" icon={<HiChartSquareBar />} label="Sales Board" close={closeSidebar} />
            </Submenu>

            <Submenu isOpen={!!openSubmenus["tvPurchase"]} onToggle={() => toggleSubmenu("tvPurchase")} icon={<GiStockpiles />} label="Purchase">
              <Item href="/agent-dashboard/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
              <Item href="/agent-dashboard/purchase-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
              <Item href="/agent-dashboard/grn-view" icon={<HiOutlineCube />} label="GRN View" close={closeSidebar} />
              <Item href="/agent-dashboard/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
              <Item href="/agent-dashboard/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes View" close={closeSidebar} />
              <Item href="/agent-dashboard/purchase-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
            </Submenu>
          </Section> */}

          {/* User */}
          {/* <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === "user"} onToggle={() => toggleMenu("user")}>
            <Item href="/agent-dashboard/users" icon={<HiUserGroup />} label="User" close={closeSidebar} />
          </Section> */}

          {/* task */}
          {/* <Section title="Task" icon={<HiUserGroup />} isOpen={openMenu === "task"} onToggle={() => toggleMenu("task")}>
            <Item href="/agent-dashboard/tasks" icon={<HiUserGroup />} label="Tasks" close={closeSidebar} />
            
            <Item href="/agent-dashboard/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
          </Section> */}

          {/* CRM-View */}
          {/* <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
            <Item href="/agent-dashboard/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
            <Item href="/agent-dashboard/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
            <Item href="/agent-dashboard/crm/campaign" icon={<HiPuzzle />} label="Campaign" close={closeSidebar} />

          </Section> */}

          {/* Stock */}
          {/* <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === "Stock"} onToggle={() => toggleMenu("Stock")}>
            <Item href="/agent-dashboard/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" close={closeSidebar} />
            <Item href="/agent-dashboard/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" close={closeSidebar} />
            <Item href="/agent-dashboard/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" close={closeSidebar} />
          </Section> */}

          {/* Payment */}
          {/* <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === "Payment"} onToggle={() => toggleMenu("Payment")}>
            <Item href="/agent-dashboard/Payment" icon={<HiCurrencyDollar />} label="Payment Form" close={closeSidebar} />
          </Section> */}

          {/* Finance */}
         {/* <Section
  title="Finance"
  icon={<HiOutlineCreditCard />} 
  isOpen={openMenu === "finance"}
  onToggle={() => toggleMenu("finance")}
>

  <Submenu
    isOpen={!!openSubmenus["journalEntry"]}
    onToggle={() => toggleSubmenu("journalEntry")}
    icon={<HiCurrencyDollar />} // Dollar icon for journal/transactions
    label="Journal Entry"
  >
    <Item
      href="/agent-dashboard/finance/journal-entry"
      icon={<HiOutlineCreditCard />} // Could use credit card for entry
      label="Journal Entry"
      close={closeSidebar}
    />
  </Submenu>

 
  <Submenu
    isOpen={!!openSubmenus["report"]}
    onToggle={() => toggleSubmenu("report")}
    icon={<HiChartSquareBar />} // Report icon
    label="Report"
  >

    <Submenu
      isOpen={!!openSubmenus["financialReport"]}
      onToggle={() => toggleSubmenu("financialReport")}
      icon={<HiOutlineLibrary />} // Library/book icon for financial reports
      label="Financial Report"
    >
      <Item
        href="/agent-dashboard/finance/report/trial-balance"
        icon={<HiDocumentText />} // Document icon for report
        label="Trial Balance"
        close={closeSidebar}
      />
      <Item
        href="/agent-dashboard/finance/report/profit-loss"
        icon={<HiDocumentText />}
        label="Profit & Loss"
        close={closeSidebar}
      />
      <Item
        href="/agent-dashboard/finance/report/balance-sheet"
        icon={<HiDocumentText />}
        label="Balance Sheet"
        close={closeSidebar}
      />
    </Submenu>

   
    <Submenu
      isOpen={!!openSubmenus["ageingReport"]}
      onToggle={() => toggleSubmenu("ageingReport")}
      icon={<HiUserGroup />} // Users group for ageing reports
      label="Ageing"
    >
      <Item
        href="/agent-dashboard/finance/report/ageing/customer"
        icon={<HiUser />} // Single user for customer ageing
        label="Customer Ageing"
        close={closeSidebar}
      />
      <Item
        href="/agent-dashboard/finance/report/ageing/supplier"
        icon={<HiUser />} // Single user for supplier ageing
        label="Supplier Ageing"
        close={closeSidebar}
      />
    </Submenu>


    <Submenu
      isOpen={!!openSubmenus["statementReport"]}
      onToggle={() => toggleSubmenu("statementReport")}
      icon={<HiReceiptTax />} // Statement/tax icon
      label="Statement"
    >
      <Item
        href="/agent-dashboard/finance/report/statement/customer"
        icon={<HiUser />} // Customer
        label="Customer Statement"
        close={closeSidebar}
      />
      <Item
        href="/agent-dashboard/finance/report/statement/supplier"
        icon={<HiUser />} // Supplier
        label="Supplier Statement"
        close={closeSidebar}
      />
      <Item
        href="/agent-dashboard/finance/report/statement/bank"
        icon={<HiOutlineCreditCard />} // Bank
        label="Bank Statement"
        close={closeSidebar}
      />
    </Submenu>
  </Submenu>
</Section> */}

          {/* Production */}
          {/* <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === "Production"} onToggle={() => toggleMenu("Production")}>
            <Item href="/agent-dashboard/bom" icon={<HiOutlineCube />} label="BoM" close={closeSidebar} />
            <Item href="/agent-dashboard/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" close={closeSidebar} />
          </Section> */}

          {/* Production View */}
          {/* <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === "ProductionView"} onToggle={() => toggleMenu("ProductionView")}>
           
            <Item href="/agent-dashboard/bom-view" icon={<HiOutlineCube />} label="BoM View" close={closeSidebar} />
            <Item href="/agent-dashboard/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" close={closeSidebar} />
           
            <Item href="/agent-dashboard/production-board" icon={<HiChartSquareBar />} label="Production Board" close={closeSidebar} />
          </Section> */}

          {/* Project */}
          {/* <Section
            title={<Link href="/agent-dashboard/project" onClick={closeSidebar} className="flex items-center gap-2">Project</Link>}
            icon={<HiViewGrid />}
            isOpen={openMenu === "project"}
            onToggle={() => toggleMenu("project")}
          >
            <Item href="/agent-dashboard/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" close={closeSidebar} />
            <Item href="/agent-dashboard/project/projects" icon={<HiOutlineCube />} label="Projects" close={closeSidebar} />
            <Item href="/agent-dashboard/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
            <Item href="/agent-dashboard/project/tasks" icon={<HiPuzzle />} label="Tasks List" close={closeSidebar} />
          </Section> */}

          {/* HR  */}
          {/* <Section title="HR" icon={<HiUserGroup />} isOpen={openMenu === "hr"} onToggle={() => toggleMenu("hr")}>
          <Item href="/agent-dashboard/hr/employee-onboarding" icon={<HiUserGroup />} label="Employee Onboarding" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/Dashboard" icon={<HiUserGroup />} label="Employee Details" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/masters" icon={<HiUserGroup />} label="Department" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/leaves" icon={<HiUserGroup />} label="Leave" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/attendance" icon={<HiUserGroup />} label="Attendance" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/payroll" icon={<HiUserGroup />} label="Payroll" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/employees" icon={<HiUserGroup />} label="Employee" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/reports" icon={<HiUserGroup />} label="Reports" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/settings" icon={<HiCog />} label="Settings" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/holidays" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
          <Item href="/agent-dashboard/hr/profile" icon={<HiUser />} label="Profile" close={closeSidebar} />
          
          
          </Section> */}



          {/* ppc */}
          {/* <Section title="PPC" icon={<HiPuzzle />} isOpen={openMenu === "ppc"} onToggle={() => toggleMenu("ppc")}>
            <Item href="/agent-dashboard/ppc/operatorsPage" icon={<HiUser />} label="Operators" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/machinesPage" icon={<HiOutlineCube />} label="Machines" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/resourcesPage" icon={<HiOutlineLibrary />} label="Resources" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/machineOutputPage" icon={<HiOutlineLibrary />}  label="Machine Outputs" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/holidaysPage" icon={<HiGlobeAlt />} label="Holidays" close={closeSidebar} />
         
            <Item href="/agent-dashboard/ppc/operatorMachineMappingPage" icon={<HiPuzzle />} label="Machine-Operator Mapping" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/operations" icon={<HiPuzzle />} label="Operations" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/productionOrderPage" icon={<HiReceiptTax />} label="Production Planning" close={closeSidebar} />
            <Item href="/agent-dashboard/ppc/jobcards" icon={<HiReceiptTax />} label="Job Card" close={closeSidebar} />
             <Item href="/agent-dashboard/ppc/downtime" icon={<HiReceiptTax />} label="Downtime" close={closeSidebar} />

          </Section> */}

          <Section title="Helpdesk" icon={<HiUser />} isOpen={openMenu === "helpdesk"} onToggle={() => toggleMenu("helpdesk")}>
            <Item href="/agent-dashboard/helpdesk/tickets" icon={<HiDocumentText />} label="Tickets" close={closeSidebar} />
            <Item href="/agent-dashboard/helpdesk/report" icon={<HiChartBar />} label="Reports" close={closeSidebar} />
            {/* <Item href="/agent-dashboard/helpdesk/agents" icon={<HiUsers />} label="Agents" close={closeSidebar} />
            <Item href="/agent-dashboard/helpdesk/categories" icon={<HiUserGroup />} label="Categories" close={closeSidebar} />
            <Item href="/agent-dashboard/helpdesk/agents/manage" icon={<HiPuzzle />} label="Create Agent" close={closeSidebar} />
            <Item href="/agent-dashboard/helpdesk/settings" icon={<HiCog />} label="Settings" close={closeSidebar} /> */}
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


// "use client"
// import { useState,useEffect } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import {jwtDecode} from "jwt-decode";
// import LogoutButton from "@/components/LogoutButton";

// export default function UserSidebar({children}) {
//   const router = useRouter();
//   const [openMenu, setOpenMenu] = useState(null);
//   const [user, setUser] = useState(null);

//   const toggleMenu = (menuName) => {
//     setOpenMenu(openMenu === menuName ? null : menuName);
//   };


//    useEffect(() => {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         router.push("/"); // Redirect to sign-in if no token
//       } else {
//         try {
//           const decodedToken = jwtDecode(token); // Decode token to get user info
//           setUser(decodedToken); // Set user data
//         } catch (error) {
//           console.error("Invalid token", error);
//           localStorage.removeItem("token");
//           router.push("/"); // Redirect if token is invalid
//         }
//       }
//     }, [router]);

//   return (
//     <div className="min-h-screen flex">
//     <aside className="w-64 bg-gray-900 text-white p-4">
//       <h2 className="text-xl font-bold">User Panel</h2>
//       <nav className="mt-4 space-y-2">
//         {/* Master Dropdown */}
//         <div className="relative">
//           <button
//             onClick={() => toggleMenu("master")}
//             className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
//           >
//             Master
//           </button>
//           {openMenu === "master" && (
//             <div className="ml-4 mt-2 space-y-1">
//               <Link href="/dashboard/admin/master/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 1
//               </Link>
//               <Link href="/dashboard/admin/master/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 2
//               </Link>
//               <Link href="/dashboard/admin/master/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 3
//               </Link>
//             </div>
//           )}
//         </div>

//         {/* Transaction Dropdown */}
//         <div className="relative">
//           <button
//             onClick={() => toggleMenu("transaction")}
//             className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
//           >
//             Transaction
//           </button>
//           {openMenu === "transaction" && (
//             <div className="ml-4 mt-2 space-y-1">
//               <Link href="/dashboard/admin/transaction/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 1
//               </Link>
//               <Link href="/dashboard/admin/transaction/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 2
//               </Link>
//               <Link href="/dashboard/admin/transaction/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 3
//               </Link>
//             </div>
//           )}
//         </div>
//         {/* support */}
//         <div className="relative">
//           <button
//             onClick={() => toggleMenu("helpdesk")}
//             className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
//           >
//             helpdesk
//           </button>
//           {openMenu === "helpdesk" && (
//             <div className="ml-4 mt-2 space-y-1">
//               <Link href="agent-dashboard/helpdesk/tickets" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Tickets
//               </Link>
//               <Link href="agent-dashboard/helpdesk/agents" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Agents
//               </Link>
//             </div>
//           )}
//         </div>

//         {/* Report Dropdown */}
//         <div className="relative">
//           <button
//             onClick={() => toggleMenu("report")}
//             className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
//           >
//             Report
//           </button>
//           {openMenu === "report" && (
//             <div className="ml-4 mt-2 space-y-1">
//               <Link href="/dashboard/admin/report/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 1
//               </Link>
//               <Link href="/dashboard/admin/report/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 2
//               </Link>
//               <Link href="/dashboard/admin/report/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
//                 Option 3
//               </Link>
//             </div>
//           )}
//         </div>
//       </nav>
//       {/* Logout Button */}
//       <div className="mt-4">
//           <LogoutButton />
//         </div>
//     </aside>
//      <main className="flex-1 bg-gray-100 p-8">
//      {children}
//    </main>
//    </div>

//   );
// }
