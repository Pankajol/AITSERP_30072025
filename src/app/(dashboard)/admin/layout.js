// 'use client';


// import { useState, useEffect } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import { jwtDecode } from 'jwt-decode';
// import LogoutButton from '@/components/LogoutButton';
// import {
//   HiMenu, HiX, HiHome, HiUsers, HiViewGrid, HiCurrencyDollar, HiChevronDown,
//   HiChevronRight, HiShoppingCart, HiUserGroup, HiOutlineCube, HiOutlineCreditCard,
//   HiPuzzle, HiOutlineLibrary, HiGlobeAlt, HiFlag, HiOutlineOfficeBuilding, HiCube,
//   HiReceiptTax, HiChartSquareBar,
// } from 'react-icons/hi';
// import { SiCivicrm } from 'react-icons/si';
// import { GiStockpiles } from 'react-icons/gi';
// import NotificationBell from '@/components/NotificationBell';



// export default function AdminSidebar({ children }) {
//   const router = useRouter();

//   /* ---------- auth check ---------- */
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) return router.push('/');
//     try { jwtDecode(token); } catch { localStorage.removeItem('token'); router.push('/'); }
//   }, [router]);



//   /* ---------- UI state ---------- */
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenu, setOpenSubmenu] = useState(null);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [session, setSession] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});


//   // mobile drawer

//   /* --- decode token --- */
//   useEffect(() => {
//     const t = localStorage.getItem('token');
//     if (!t) return router.push('/');
//     try {
//       setSession(jwtDecode(t));
//     } catch {
//       localStorage.removeItem('token');
//       router.push('/');
//     }
//   }, [router]);
//   if (!session) return null;


//   console.log("data of the session", session);

//   const toggleMenu = (key) => {
//     setOpenMenu((prev) => (prev === key ? null : key));
//     setOpenSubmenu(null);
//   };
//   const toggleSubmenu = (key) => {
//     setOpenSubmenu((prev) => (prev === key ? null : key));
//   };

//   /* ---------- helpers ---------- */
//   const closeSidebar = () => setIsSidebarOpen(false);

//   /* ---------- component ---------- */
//   return (
//     <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
//       {/* Mobile top‑bar --------------------------------------------------- */}
//       <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
//         <button
//           aria-label="Open menu"
//           onClick={() => setIsSidebarOpen(true)}
//           className="text-2xl text-gray-700 dark:text-gray-200"
//         >
//           <HiMenu />
//         </button>
//         <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Dashboard</h1>
//       </header>

//       {/* Backdrop (mobile) ------------------------------------------------ */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 z-30 bg-black/40 md:hidden"
//           onClick={closeSidebar}
//         />
//       )}

//       {/* Sidebar ---------------------------------------------------------- */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-gray-700 dark:bg-gray-800 text-white transform transition-transform duration-200 ease-in-out
//           ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
//           md:translate-x-0 md:static`}
//       >
//         {/* mobile close btn */}
//         <div className="md:hidden flex items-center justify-between px-4 h-14">
//           <h2 className="text-xl font-bold flex items-center gap-2">
//             <HiHome /> Dashboard
//           </h2>
//           <button aria-label="Close menu" onClick={closeSidebar} className="text-2xl">
//             <HiX />
//           </button>
//         </div>

//         <nav className="mt-6 px-2 pb-6 space-y-3">
//           {/* Masters ----------------------------------------------------- */}
//           <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === 'master'} onToggle={() => toggleMenu('master')}>
//             <Item href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" close={closeSidebar} />
//             {/* <Item href="/admin/company" icon={<HiHome />} label="Company" close={closeSidebar} /> */}
//             <Item href="/admin/State" icon={<HiFlag />} label="State" close={closeSidebar} />
//             <Item href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" close={closeSidebar} />
//             <Item href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" close={closeSidebar} />
//             <Item href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" close={closeSidebar} />
//             <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="Genral Ledger" close={closeSidebar} />
//             <Item href="/admin/createCustomers" icon={<HiUserGroup />} label="Create Customer" close={closeSidebar} />
//             <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier" close={closeSidebar} />
//             <Item href="/admin/item" icon={<HiCube />} label="Item" close={closeSidebar} />
//             {/* <Item href="/admin/City" icon={<HiOutlineOfficeBuilding />} label="City" close={closeSidebar} /> */}
//             <Item href="/admin/WarehouseDetailsForm" icon={<HiOutlineLibrary />} label="Warehouse Details" close={closeSidebar} />
//           </Section>

//           {/* Masters View ------------------------------------------------ */}
//           <Section title="Masters View" icon={<HiViewGrid />} isOpen={openMenu === 'masterView'} onToggle={() => toggleMenu('masterView')}>
//             <Item href="/admin/customer-view" icon={<HiUsers />} label="Customer View" close={closeSidebar} />
//             <Item href="/admin/supplier" icon={<HiUserGroup />} label="Supplier View" close={closeSidebar} />
//             <Item href="/admin/item" icon={<HiCube />} label="Item View" close={closeSidebar} />
//             <Item href="/admin/account-head-view" icon={<HiOutlineLibrary />} label="Account Head View" close={closeSidebar} />
//             <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />} label="Genral Ledger View" close={closeSidebar} />
//           </Section>

      

//           {/* Transactions View ------------------------------------------ */}
//           <div>
//             <MenuButton
//               isOpen={openMenu === 'transactionsView'}
//               onToggle={() => toggleMenu('transactionsView')}
//               icon={<HiOutlineCreditCard />}
//               label="Transactions View"
//             />
//             {openMenu === 'transactionsView' && (
//               <div className="ml-6 mt-2 space-y-1">
//                 {/* TV Sales */}
//                 <Submenu
//                   isOpen={openSubmenu === 'tvSales'}
//                   onToggle={() => toggleSubmenu('tvSales')}
//                   icon={<HiShoppingCart />}
//                   label="Sales"
//                 >
//                   <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
//                   <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
//                   <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
//                   <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
//                   <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
//                   <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
//                 </Submenu>

//                 {/* TV Purchase */}
//                 <Submenu
//                   isOpen={openSubmenu === 'tvPurchase'}
//                   onToggle={() => toggleSubmenu('tvPurchase')}
//                   icon={<GiStockpiles />}
//                   label="Purchase"
//                 >
//                   <Item href="/admin/PurchaseQuotationList" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
//                   <Item href="/admin/purchase-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
//                   <Item href="/admin/grn-view" icon={<HiOutlineCube />} label="GRN View" close={closeSidebar} />
//                   <Item href="/admin/purchaseInvoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
//                   <Item href="/admin/debit-notes-view" icon={<HiReceiptTax />} label="Debit Notes View" close={closeSidebar} />
//                   <Item href="/admin/purchase-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
//                 </Submenu>
//               </div>
//             )}
//           </div>

//           {/* CRM --------------------------------------------------------- */}
//           {/* <Section title="CRM" icon={<SiCivicrm />} isOpen={openMenu === 'CRM'} onToggle={() => toggleMenu('CRM')}>
//             <Item href="/admin/LeadDetailsFormMaster" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
//             <Item href="/admin/OpportunityDetailsForm" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
//           </Section> */}


//           {/* user View ---------------------------------------------------- */}
//           <Section title="User" icon={<SiCivicrm />} isOpen={openMenu === 'user'} onToggle={() => toggleMenu('user')}>
//             <Item href="/admin/users" icon={<HiUserGroup />} label="user" close={closeSidebar} />
//             {/* <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
//             <Item href="#" icon={<HiPuzzle />} label="Report" close={closeSidebar} /> */}
//           </Section>

//           {/* CRM View ---------------------------------------------------- */}
//           <Section title="CRM‑View" icon={<SiCivicrm />} isOpen={openMenu === 'CRM-View'} onToggle={() => toggleMenu('CRM-View')}>
//             <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
//             <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
//             <Item href="#" icon={<HiPuzzle />} label="Report" close={closeSidebar} />
//           </Section>

//           {/* Stock ------------------------------------------------------- */}
//           <Section title="Stock" icon={<HiOutlineCube />} isOpen={openMenu === 'Stock'} onToggle={() => toggleMenu('Stock')}>
//             <Item href="/admin/InventoryView" icon={<HiOutlineLibrary />} label="Inventory View" close={closeSidebar} />
//             <Item href="/admin/InventoryEntry" icon={<HiOutlineLibrary />} label="Inventory Entry" close={closeSidebar} />
//             <Item href="/admin/InventoryAdjustmentsView" icon={<HiOutlineLibrary />} label="Inventory Ledger" close={closeSidebar} />
//           </Section>

//           {/* Payment ----------------------------------------------------- */}
//           <Section title="Payment" icon={<HiOutlineCreditCard />} isOpen={openMenu === 'Payment'} onToggle={() => toggleMenu('Payment')}>
//             <Item href="/admin/Payment" icon={<HiCurrencyDollar />} label="Payment Form" close={closeSidebar} />
//           </Section>
             



// {/* 
//                       <Section title="Finance" icon={<HiOutlineCreditCard />} isOpen={openMenu === 'Finance'} onToggle={() => toggleMenu('Finance')}>
//           <Item href="/admin/finance/joural-entry" icon={<HiCurrencyDollar />} label="Journal Entry" close={closeSidebar} />
//           <Item href="/admin/finance/re"}

//             </Section> */}

//           {/* Finance  and reports */}
// <div>
//       <MenuButton
//   isOpen={openMenu === "finance"}
//   onToggle={() => toggleMenu("finance")}
//   icon={<HiOutlineCreditCard />}
//   label="Finance"
// />

// {openMenu === "finance" && (
//   <div className="ml-4 mt-2 space-y-1">
//     <Submenu
//       isOpen={!!openSubmenus["journalEntry"]}
//       onToggle={() => toggleSubmenu("journalEntry")}
//       icon={<HiCurrencyDollar />}
//       label="Journal Entry"
//     >
//       <Item
//         href="/admin/finance/journal-entry"
//         icon={<HiChevronDown />}
//         label="Journal Entry"
//         close={closeSidebar}
//       />
//     </Submenu>

//     <Submenu
//       isOpen={!!openSubmenus["report"]}
//       onToggle={() => toggleSubmenu("report")}
//       icon={<HiChartSquareBar />}
//       label="Report"
//     >
//       <Submenu
//         isOpen={!!openSubmenus["financialReport"]}
//         onToggle={() => toggleSubmenu("financialReport")}
//         icon={<HiOutlineLibrary />}
//         label="Financial Report"
//       >
//         <Item href="/admin/finance/report/trial-balance" icon={<HiChevronDown />} label="Trial Balance" close={closeSidebar} />
//         <Item href="/admin/finance/report/profit-loss" icon={<HiChevronDown />} label="Profit & Loss" close={closeSidebar} />
//         <Item href="/admin/finance/report/balance-sheet" icon={<HiChevronDown />} label="Balance Sheet" close={closeSidebar} />
//       </Submenu>

//       <Submenu
//         isOpen={!!openSubmenus["ageingReport"]}
//         onToggle={() => toggleSubmenu("ageingReport")}
//         icon={<HiUserGroup />}
//         label="Ageing"
//       >
//         <Item href="/admin/finance/report/ageing/customer" icon={<HiChevronDown />} label="Customer Ageing" close={closeSidebar} />
//         <Item href="/admin/finance/report/ageing/supplier" icon={<HiChevronDown />} label="Supplier Ageing" close={closeSidebar} />
//       </Submenu>

//       <Submenu
//         isOpen={!!openSubmenus["statementReport"]}
//         onToggle={() => toggleSubmenu("statementReport")}
//         icon={<HiReceiptTax />}
//         label="Statement"
//       >
//         <Item href="/admin/finance/report/statement/customer" icon={<HiChevronDown />} label="Customer Statement" close={closeSidebar} />
//         <Item href="/admin/finance/report/statement/supplier" icon={<HiChevronDown />} label="Supplier Statement" close={closeSidebar} />
//         <Item href="/admin/finance/report/statement/bank" icon={<HiChevronDown />} label="Bank Statement" close={closeSidebar} />
//       </Submenu>
//     </Submenu>
//   </div>
// )}

    
//     </div>




 

//           {/* Production -------------------------------------------------- */}
//           <Section title="Production" icon={<HiPuzzle />} isOpen={openMenu === 'Production'} onToggle={() => toggleMenu('Production')}>
//             <Item href="/admin/bom" icon={<HiOutlineCube />} label="BoM" close={closeSidebar} />
//             <Item href="/admin/ProductionOrder" icon={<HiReceiptTax />} label="Production Order" close={closeSidebar} />
//           </Section>

//           {/* Production View -------------------------------------------- */}
//           <Section title="Production View" icon={<HiOutlineLibrary />} isOpen={openMenu === 'ProductionView'} onToggle={() => toggleMenu('ProductionView')}>
//             <Item href="/admin/bom-view" icon={<HiOutlineCube />} label="BoM View" close={closeSidebar} />
//             <Item href="/admin/productionorders-list-view" icon={<HiReceiptTax />} label="Production Orders View" close={closeSidebar} />
//           </Section>

//           {/*------------------------------------- project ------------------------------- */}
//           <Section
//             title={
//               <Link href="/admin/project" onClick={closeSidebar} className="flex items-center gap-2">
//                 <span>Project</span>
//               </Link>
//             }
//             icon={<HiViewGrid />}
//             isOpen={openMenu === "project"}
//             onToggle={() => toggleMenu("project")}
//           >
//             <Item href="/admin/project/workspaces" icon={<HiOutlineOfficeBuilding />} label="Workspaces" close={closeSidebar} />
//             <Item href="/admin/project/projects" icon={<HiOutlineCube />} label="Projects" close={closeSidebar} />
//             <Item href="/admin/project/tasks/board" icon={<HiPuzzle />} label="Tasks Board" close={closeSidebar} />
//             <Item href="/admin/project/tasks" icon={<HiPuzzle />} label="Tasks List" close={closeSidebar} />
//           </Section>

//           {/* Logout ------------------------------------------------------ */}
//           <div className="pt-4">
//             <LogoutButton />
//           </div>
//         </nav>
//       </aside>

//       {/* Navbar in that i want profile and notification */}
//       <header className="fixed top-0  right-0 left-0 md:left-64 bg-white shadow h-14 flex items-center justify-end px-4 z-20">
//         <div className="flex items-center gap-4">

//           <span className="text-sm">Hello, {session?.companyName || session?.email}</span>
//           <img
//             src="/#"
//             alt="Profile"
//             className="w-8 h-8 rounded-full object-cover"
//           />
//           <LogoutButton />
//           <NotificationBell />
//         </div>
//       </header>

//       {/* Main content ---------------------------------------------------- */}
//       <main className="flex-1 pt-16 ">{children}</main>
//     </div>
//   );
// }

// /* ============= helper components ====================================== */
// function Section({ title, icon, children, isOpen, onToggle }) {
//   return (
//     <div>
//       <MenuButton isOpen={isOpen} onToggle={onToggle} icon={icon} label={title} />
//       {isOpen && <div className="ml-6 mt-2 space-y-1">{children}</div>}
//     </div>
//   );
// }

// function MenuButton({ isOpen, onToggle, icon, label }) {
//   return (
//     <button
//       onClick={onToggle}
//       className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600"
//     >
//       <div className="flex items-center gap-2">
//         {icon} {label}
//       </div>
//       {isOpen ? <HiChevronDown /> : <HiChevronRight />}
//     </button>
//   );
// }

// function Submenu({ isOpen, onToggle, icon, label, children }) {
//   return (
//     <>
//       <button
//         onClick={onToggle}
//         className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600"
//       >
//         <div className="flex items-center gap-2">
//           {icon} {label}
//         </div>
//         {isOpen ? <HiChevronDown /> : <HiChevronRight />}
//       </button>
//       {isOpen && <div className="ml-4 mt-1 space-y-1">{children}</div>}
//     </>
//   );
// }

// function Item({ href, icon, label, close }) {
//   return (
//     <Link
//       href={href}
//       onClick={close}
//       className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-600"
//     >
//       {icon} {label}
//     </Link>
//   );
// }



// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { jwtDecode } from 'jwt-decode';
// import LogoutButton from "@/components/LogoutButton";
// import NotificationBell from "@/components/NotificationBell";
// import {
//   HiMenu, HiX, HiHome, HiUsers, HiViewGrid, HiCurrencyDollar, HiChevronDown,
//   HiChevronRight, HiShoppingCart, HiUserGroup, HiOutlineCube, HiOutlineCreditCard,
//   HiPuzzle, HiOutlineLibrary, HiGlobeAlt, HiFlag, HiOutlineOfficeBuilding,
//   HiCube, HiReceiptTax, HiChartSquareBar,
// // Finance main / Bank statement / Journal Entry item
//      // Journal Entry submenu
//     // Report submenu
//     // Financial Report submenu
//   HiDocumentText,      // Trial Balance, Profit & Loss, Balance Sheet items
//        // Ageing submenu
//   HiUser,              // Customer Ageing, Supplier Ageing, Customer Statement, Supplier Statement
//         // Statement submenu
//         // Expand icon
//      // Collapse icon
// } from "react-icons/hi";

// import { SiCivicrm } from "react-icons/si";
// import { GiStockpiles } from "react-icons/gi";

// export default function AdminSidebar({ children }) {
//   const router = useRouter();

//   /* ---------- auth check ---------- */
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return router.push("/");
//     try { jwtDecode(token); } catch { localStorage.removeItem("token"); router.push("/"); }
//   }, [router]);

//   /* ---------- UI state ---------- */
//   const [openMenu, setOpenMenu] = useState(null);
//   const [openSubmenus, setOpenSubmenus] = useState({});
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [session, setSession] = useState(null);

//   /* --- decode token --- */
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

//   /* ---------- toggle functions ---------- */
//   const toggleMenu = (key) => {
//     setOpenMenu((prev) => (prev === key ? null : key));
//     setOpenSubmenus({}); // reset all submenus when main menu changes
//   };

//   const toggleSubmenu = (key) => {
//     setOpenSubmenus((prev) => ({
//       ...prev,
//       [key]: !prev[key],
//     }));
//   };

//   const closeSidebar = () => setIsSidebarOpen(false);

//   /* ---------- render ---------- */
//   return (
//     <div className="flex-1 ml-64 flex flex-col bg-gray-100 dark:bg-gray-900">
//       {/* Mobile Top Bar */}
//       <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
//         <button aria-label="Open menu" onClick={() => setIsSidebarOpen(true)} className="text-2xl text-gray-700 dark:text-gray-200">
//           <HiMenu />
//         </button>
//         <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Dashboard</h1>
//       </header>

//       {/* Mobile Backdrop */}
//       {isSidebarOpen && (
//         <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeSidebar} />
//       )}

//       {/* Sidebar */}
//       <aside
//          className="w-64 bg-gray-700 text-white fixed inset-y-0 left-0 overflow-y-auto"
//       >
//         {/* Mobile Close Button */}
//         <div className="md:hidden flex items-center justify-between px-4 h-14">
//           <h2 className="text-xl font-bold flex items-center gap-2"><HiHome /> Dashboard</h2>
//           <button aria-label="Close menu" onClick={closeSidebar} className="text-2xl"><HiX /></button>
//         </div>

//         <nav className="mt-6 px-2 pb-6 space-y-3">
//           {/* Masters */}
//           <Section title="Masters" icon={<HiUsers />} isOpen={openMenu === "master"} onToggle={() => toggleMenu("master")}>
//             <Item href="/admin/Countries" icon={<HiGlobeAlt />} label="Countries" close={closeSidebar} />
//             <Item href="/admin/State" icon={<HiFlag />} label="State" close={closeSidebar} />
//             <Item href="/admin/CreateGroup" icon={<HiUserGroup />} label="Create Group" close={closeSidebar} />
//             <Item href="/admin/CreateItemGroup" icon={<HiOutlineCube />} label="Create Item Group" close={closeSidebar} />
//             <Item href="/admin/account-bankhead" icon={<HiOutlineLibrary />} label="Account Head" close={closeSidebar} />
//             <Item href="/admin/bank-head-details" icon={<HiCurrencyDollar />} label="Genral Ledger" close={closeSidebar} />
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
//             <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />} label="Genral Ledger View" close={closeSidebar} />
//           </Section>

//           {/* Transactions View */}
//           <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
//             <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
//               <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
//               <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
//               <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
//               <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
//               <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
//               <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
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

//           {/* CRM-View */}
//           <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
//             <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
//             <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
//             <Item href="#" icon={<HiPuzzle />} label="Report" close={closeSidebar} />
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

//           {/* Logout */}
//           <div className="pt-4"><LogoutButton /></div>
//         </nav>
//       </aside>

//       {/* Navbar */}
//       <div className="flex-1 ml-64 flex flex-col">
//       <header className="h-14 bg-white shadow flex items-center px-4">
//         {/* <div className="flex items-center gap-4"> */}
//           <span className="text-sm">Hello, {session?.companyName || session?.email}</span>
//           <img src="/#" alt="Profile" className="w-8 h-8 rounded-full object-cover" />
//           <LogoutButton />
//           <NotificationBell />
//         {/* </div> */}
//       </header>
//       </div>

//       {/* Main Content */}
//       <main className="flex-1 overflow-y-auto p-4">{children}</main>
//     </div>
//   );
// }

// /* ------------------- Helper Components ------------------- */
// function Section({ title, icon, children, isOpen, onToggle }) {
//   return (
//     <div>
//       <MenuButton isOpen={isOpen} onToggle={onToggle} icon={icon} label={title} />
//       {isOpen && <div className="ml-6 mt-2 space-y-1">{children}</div>}
//     </div>
//   );
// }

// function MenuButton({ isOpen, onToggle, icon, label }) {
//   return (
//     <button onClick={onToggle} className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600">
//       <div className="flex items-center gap-2">{icon} {label}</div>
//       {isOpen ? <HiChevronDown /> : <HiChevronRight />}
//     </button>
//   );
// }

// function Submenu({ isOpen, onToggle, icon, label, children }) {
//   return (
//     <>
//       <button onClick={onToggle} className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600">
//         <div className="flex items-center gap-2">{icon} {label}</div>
//         {isOpen ? <HiChevronDown /> : <HiChevronRight />}
//       </button>
//       {isOpen && <div className="ml-4 mt-1 space-y-1">{children}</div>}
//     </>
//   );
// }

// function Item({ href, icon, label, close }) {
//   return (
//     <Link href={href} onClick={close} className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-600">
//       {icon} {label}
//     </Link>
//   );
// }

























"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jwtDecode } from 'jwt-decode';
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import {
  HiMenu, HiX, HiHome, HiUsers, HiViewGrid, HiCurrencyDollar, HiChevronDown,
  HiChevronRight, HiShoppingCart, HiUserGroup, HiOutlineCube, HiOutlineCreditCard,
  HiPuzzle, HiOutlineLibrary, HiGlobeAlt, HiFlag, HiOutlineOfficeBuilding,
  HiCube, HiReceiptTax, HiChartSquareBar, HiDocumentText, HiUser,
} from "react-icons/hi";

import { SiCivicrm } from "react-icons/si";
import { GiStockpiles } from "react-icons/gi";

export default function AdminSidebar({ children }) {
  const router = useRouter();

  /* ---------- Auth Check ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/");
    try { jwtDecode(token); } catch { localStorage.removeItem("token"); router.push("/"); }
  }, [router]);

  const [openMenu, setOpenMenu] = useState(null);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);

  /* ---------- Decode Token ---------- */
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

  if (!session) return null;

  const toggleMenu = (key) => {
    setOpenMenu((prev) => (prev === key ? null : key));
    setOpenSubmenus({});
  };

  const toggleSubmenu = (key) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
        <button aria-label="Open menu" onClick={() => setIsSidebarOpen(true)} className="text-2xl text-gray-700 dark:text-gray-200">
          <HiMenu />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Dashboard</h1>
      </header>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-gray-700 text-white fixed inset-y-0 left-0 overflow-y-auto">
        {/* Mobile Close Button */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <h2 className="text-xl font-bold flex items-center gap-2"><HiHome /> Dashboard</h2>
          <button aria-label="Close menu" onClick={closeSidebar} className="text-2xl"><HiX /></button>
        </div>

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
            <Item href="/admin/bank-head-details-view" icon={<HiCurrencyDollar />} label="General Ledger View" close={closeSidebar} />
          </Section>

          {/* Other sections ... add your other menus here in the same format ... */}

          
          {/* Transactions View */}
          <Section title="Transactions View" icon={<HiOutlineCreditCard />} isOpen={openMenu === "transactionsView"} onToggle={() => toggleMenu("transactionsView")}>
            <Submenu isOpen={!!openSubmenus["tvSales"]} onToggle={() => toggleSubmenu("tvSales")} icon={<HiShoppingCart />} label="Sales">
              <Item href="/admin/sales-quotation-view" icon={<SiCivicrm />} label="Quotation View" close={closeSidebar} />
              <Item href="/admin/sales-order-view" icon={<HiPuzzle />} label="Order View" close={closeSidebar} />
              <Item href="/admin/delivery-view" icon={<HiOutlineCube />} label="Delivery View" close={closeSidebar} />
              <Item href="/admin/sales-invoice-view" icon={<HiOutlineCreditCard />} label="Invoice View" close={closeSidebar} />
              <Item href="/admin/credit-memo-veiw" icon={<HiReceiptTax />} label="Credit Memo View" close={closeSidebar} />
              <Item href="/admin/sales-report" icon={<HiChartSquareBar />} label="Report" close={closeSidebar} />
              <Item href="/admin/sales-bord" icon={<HiChartSquareBar />} label="Sales Bord" close={closeSidebar} />
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

          {/* CRM-View */}
          <Section title="CRM-View" icon={<SiCivicrm />} isOpen={openMenu === "CRM-View"} onToggle={() => toggleMenu("CRM-View")}>
            <Item href="/admin/leads-view" icon={<HiUserGroup />} label="Lead Generation" close={closeSidebar} />
            <Item href="/admin/opportunities" icon={<HiPuzzle />} label="Opportunity" close={closeSidebar} />
            <Item href="#" icon={<HiPuzzle />} label="Report" close={closeSidebar} />
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
            <Item href="/admin/production-bord" icon={<HiChartSquareBar />} label="Production Bord" close={closeSidebar} />
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

          {/* Logout */}
          <div className="pt-4"><LogoutButton /></div>
        </nav>
      </aside>

      {/* Content Area (Navbar + Main) */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Navbar */}
        <header className="h-14 bg-white shadow flex items-center justify-between px-4">
          <span className="text-sm">Hello, {session?.companyName || session?.email}</span>
          <div className="flex items-center gap-3">
            <img src="/#" alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            <NotificationBell />
            <LogoutButton />
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ------------------- Helper Components ------------------- */
function Section({ title, icon, children, isOpen, onToggle }) {
  return (
    <div>
      <MenuButton isOpen={isOpen} onToggle={onToggle} icon={icon} label={title} />
      {isOpen && <div className="ml-6 mt-2 space-y-1">{children}</div>}
    </div>
  );
}

function MenuButton({ isOpen, onToggle, icon, label }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600">
      <div className="flex items-center gap-2">{icon} {label}</div>
      {isOpen ? <HiChevronDown /> : <HiChevronRight />}
    </button>
  );
}

function Submenu({ isOpen, onToggle, icon, label, children }) {
  return (
    <>
      <button onClick={onToggle} className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600">
        <div className="flex items-center gap-2">{icon} {label}</div>
        {isOpen ? <HiChevronDown /> : <HiChevronRight />}
      </button>
      {isOpen && <div className="ml-4 mt-1 space-y-1">{children}</div>}
    </>
  );
}

function Item({ href, icon, label, close }) {
  return (
    <Link href={href} onClick={close} className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-600">
      {icon} {label}
    </Link>
  );
}


