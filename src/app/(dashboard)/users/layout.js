'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- Helper: Basic JWT Decoder (replaces external library) ---
const jwtDecode = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

// --- Helper: Simple Router (replaces next/navigation) ---
const useRouter = () => {
    return {
        push: (href) => {
            window.location.href = href;
        },
    };
};

// --- Inlined SVG Icons (replaces react-icons) ---
const icons = {
  Menu: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>),
  X: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>),
  Home: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>),
  Users: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" /></svg>),
  ViewGrid: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
  CurrencyDollar: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 14v3m-3-6H7m6 0h2m-2 3h2M7 11h2m6-3h2" /></svg>),
  ChevronDown: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>),
  ChevronRight: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>),
  ShoppingCart: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
  UserGroup: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
  OutlineCube: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
  CreditCard: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>),
  Puzzle: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>),
  Library: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>),
  Globe: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.5l.053-.053a.5.5 0 01.707 0l2.122 2.121a.5.5 0 00.707 0l2.121-2.121a.5.5 0 01.707 0l.053.053M4.053 7.707l-.053.053a.5.5 0 000 .707l2.121 2.122a.5.5 0 010 .707l-2.121 2.121a.5.5 0 000 .707l.053.053" /></svg>),
  Flag: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>),
  Office: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
  Receipt: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
  Chart: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
  CRM: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" /></svg>),
  Stock: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7l8-4 8 4M12 11v10" /></svg>),
  Bell: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
};


// --- Role and Permission Definitions (Mirrors backend schema) ---
const ROLE_OPTIONS = {
  Admin: [],
  "Sales Manager": ["Sales Order", "Sales Invoice", "Delivery", "Sales Quotation", "Credit Memo", "Sales Report"],
  "Purchase Manager": ["Purchase Order", "Purchase Invoice", "GRN", "Purchase Quotation", "Debit Note", "Purchase Report"],
  "Inventory Manager": ["Inventory View", "Inventory Entry", "Stock Adjustment", "Stock Transfer", "Stock Report"],
  "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry", "Payment Form"],
  "HR Manager": ["Masters", "Masters View", "Employee", "Attendance", "Payroll"],
  "Support Executive": ["Tickets", "Responses", "Lead Generation", "Opportunity"],
  "Production Head": ["BOM", "Work Order", "Production Report", "Production Order"],
  "Project Manager": ["Project", "Tasks", "Timesheet", "Task Board"],
  Employee: ["Profile", "Timesheet", "Tasks", "Task Board"],
};

// --- Inlined Child Components ---
const LogoutButton = () => {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };
  return (
    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-red-400 rounded hover:bg-red-500 hover:text-white">
      Logout
    </button>
  );
};

const NotificationBell = () => (
    <button className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2">
        <icons.Bell className="w-6 h-6"/>
        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
    </button>
);

const MenuBtn = ({ isOpen, onToggle, icon, label }) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full px-4 py-2 text-left rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-white"
  >
    <span className="flex items-center gap-2">{icon} {label}</span>
    {isOpen ? <icons.ChevronDown className="w-5 h-5"/> : <icons.ChevronRight className="w-5 h-5"/>}
  </button>
);

const Item = ({ href, icon, label, close }) => {
    // Replaces next/link with a standard anchor tag
    const router = useRouter();
    const handleClick = (e) => {
        e.preventDefault();
        router.push(href);
        if (close) close();
    };

    return (
      <a
        href={href}
        onClick={handleClick}
        className="flex items-center w-full gap-2 px-4 py-2 text-left rounded hover:bg-gray-600"
      >
        {icon} {label}
      </a>
    );
};


// --- Main Sidebar Layout ---
export default function Sidebar({ children }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState({ menu: null, sub: null });
  const [session, setSession] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }
    try {
      setSession(jwtDecode(token));
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('token');
      router.push('/');
    }
  }, []);

  const userPermissions = useMemo(() => {
    if (!session) return new Set();
    const roles = session.roles || [];
    const subRoles = session.subRoles || [];
    const isAdmin = roles.some(r => r.toLowerCase() === 'admin');

    if (isAdmin) {
      const allPermissions = new Set();
      Object.keys(ROLE_OPTIONS).forEach(r => allPermissions.add(r));
      Object.values(ROLE_OPTIONS).flat().forEach(p => allPermissions.add(p));
      return allPermissions;
    }
    return new Set([...roles, ...subRoles]);
  }, [session]);

  const can = (permission) => userPermissions.has(permission);

  const v = {
    masters: can('HR Manager'),
    mastersView: can('HR Manager'),
    transactions: can('Sales Manager') || can('Purchase Manager'),
    tsales: can('Sales Manager'),
    tpurchase: can('Purchase Manager'),
    crm: can('Support Executive'),
    stock: can('Inventory Manager'),
    pay: can('Accounts Manager'),
    prod: can('Production Head'),
    project: can('Project Manager'),
    employee: can('Employee'),
  };

  if (!session) {
    return null; // Or a loading spinner
  }

  const PREFIX = userPermissions.has('Admin') ? '/admin' : '/users';
  const P = (path) => `${PREFIX}${path}`;
  const toggleMenu = (key) => setOpen(o => ({ ...o, menu: o.menu === key ? null : key, sub: null }));
  const toggleSub = (key) => setOpen(o => ({ ...o, sub: o.sub === key ? null : key }));
  const closeDrawer = () => setDrawer(false);

  return (
    <div className="  flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200  ">
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
        <button onClick={() => setDrawer(true)} className="text-2xl"><icons.Menu className="w-6 h-6"/></button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>
      {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeDrawer} />}

      <aside className={`w-64 bg-gray-700 text-white fixed inset-y-0 left-0 overflow-y-auto`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-600 md:justify-center">
          <span className="text-xl font-bold flex items-center gap-2"><icons.Home className="w-6 h-6"/> Dashboard</span>
          <button onClick={closeDrawer} className="text-2xl md:hidden"><icons.X className="w-6 h-6"/></button>
        </div>

        <nav className="p-2 mt-4 space-y-2">
          {v.masters && (
            <div>
              <MenuBtn isOpen={open.menu === 'm'} onToggle={() => toggleMenu('m')} icon={<icons.Users className="w-5 h-5"/>} label="Masters" />
              {open.menu === 'm' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  <Item href={P('/createCustomers')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Create Customer" close={closeDrawer} />
                  <Item href={P('/Countries')} icon={<icons.Globe className="w-5 h-5"/>} label="Countries" close={closeDrawer} />
                  <Item href={P('/company')} icon={<icons.Home className="w-5 h-5"/>} label="Company" close={closeDrawer} />
                  <Item href={P('/State')} icon={<icons.Flag className="w-5 h-5"/>} label="State" close={closeDrawer} />
                  <Item href={P('/City')} icon={<icons.Office className="w-5 h-5"/>} label="City" close={closeDrawer} />
                  <Item href={P('/supplier')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Supplier" close={closeDrawer} />
                  <Item href={P('/item')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Item" close={closeDrawer} />
                  <Item href={P('/WarehouseDetailsForm')} icon={<icons.Library className="w-5 h-5"/>} label="Warehouse" close={closeDrawer} />
                  <Item href={P('/CreateGroup')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Create Group" close={closeDrawer} />
                  <Item href={P('/CreateItemGroup')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Create Item Group" close={closeDrawer} />
                  <Item href={P('/account-bankhead')} icon={<icons.Library className="w-5 h-5"/>} label="Account Head" close={closeDrawer} />
                  <Item href={P('/bank-head-details')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Bank Head" close={closeDrawer} />
                </div>
              )}
            </div>
          )}

          {v.mastersView && (
             <div>
              <MenuBtn isOpen={open.menu === 'mv'} onToggle={() => toggleMenu('mv')} icon={<icons.ViewGrid className="w-5 h-5"/>} label="Masters View" />
              {open.menu === 'mv' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  <Item href={P('/customer-view')} icon={<icons.Users className="w-5 h-5"/>} label="Customer View" close={closeDrawer} />
                  <Item href={P('/supplier-view')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Supplier View" close={closeDrawer} />
                  <Item href={P('/item-view')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Item View" close={closeDrawer} />
                  <Item href={P('/account-head-view')} icon={<icons.Library className="w-5 h-5"/>} label="Account Head View" close={closeDrawer} />
                  <Item href={P('/bank-head-view')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Bank Head View" close={closeDrawer} />
                </div>
              )}
            </div>
          )}

          {v.transactions && (
            <div>
              <MenuBtn isOpen={open.menu === 't'} onToggle={() => toggleMenu('t')} icon={<icons.CreditCard className="w-5 h-5"/>} label="Transactions" />
              {open.menu === 't' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {v.tsales && (
                    <div>
                      <MenuBtn isOpen={open.sub === 'sales'} onToggle={() => toggleSub('sales')} icon={<icons.ShoppingCart className="w-5 h-5"/>} label="Sales" />
                      {open.sub === 'sales' && (
                        <div className="pl-4 mt-1 space-y-1">
                          {can('Sales Quotation') && <Item href={P('/sales-quotation-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
                          {can('Sales Order') && <Item href={P('/sales-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
                          {can('Delivery') && <Item href={P('/delivery-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Delivery View" close={closeDrawer} />}
                          {can('Sales Invoice') && <Item href={P('/sales-invoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
                          {can('Credit Memo') && <Item href={P('/credit-memo-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Credit Memo View" close={closeDrawer} />}
                          {can('Sales Report') && <Item href={P('/sales-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Report" close={closeDrawer} />}
                        </div>
                      )}
                    </div>
                  )}

                  {v.tpurchase && (
                     <div>
                       <MenuBtn isOpen={open.sub === 'purchase'} onToggle={() => toggleSub('purchase')} icon={<icons.Stock className="w-5 h-5"/>} label="Purchase" />
                       {open.sub === 'purchase' && (
                         <div className="pl-4 mt-1 space-y-1">
                            {can('Purchase Quotation') && <Item href={P('/purchase-quotation-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
                            {can('Purchase Order') && <Item href={P('/purchase-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
                            {can('GRN') && <Item href={P('/grn-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="GRN View" close={closeDrawer} />}
                            {can('Purchase Invoice') && <Item href={P('/purchase-invoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
                            {can('Debit Note') && <Item href={P('/debit-notes-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Debit Notes View" close={closeDrawer} />}
                            {can('Purchase Report') && <Item href={P('/purchase-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Report" close={closeDrawer} />}
                         </div>
                       )}
                     </div>
                  )}
                </div>
              )}
            </div>
          )}

          {v.crm && (
              <div>
                <MenuBtn isOpen={open.menu === 'crm'} onToggle={() => toggleMenu('crm')} icon={<icons.CRM className="w-5 h-5"/>} label="CRM" />
                {open.menu === 'crm' && (
                  <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                    {can('Lead Generation') && <Item href={P('/LeadDetailsFormMaster')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Lead Generation" close={closeDrawer} />}
                    {can('Opportunity') && <Item href={P('/OpportunityDetailsForm')} icon={<icons.Puzzle className="w-5 h-5"/>} label="Opportunity" close={closeDrawer} />}
                  </div>
                )}
              </div>
          )}

          {v.employee && (
            <div>
              <MenuBtn isOpen={open.menu === 'employeeTasks'} onToggle={() => toggleMenu('employeeTasks')} icon={<icons.Puzzle className="w-5 h-5"/>} label="Tasks" />
              {open.menu === 'employeeTasks' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Tasks') && <Item href={P('/tasks')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Tasks" close={closeDrawer} />}
                  {can('Task Board') && <Item href={P('/tasks/board')} icon={<icons.Receipt className="w-5 h-5"/>} label="Task Board" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.stock && (
            <div>
              <MenuBtn isOpen={open.menu === 'stock'} onToggle={() => toggleMenu('stock')} icon={<icons.Stock className="w-5 h-5"/>} label="Inventory" />
              {open.menu === 'stock' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Inventory View') && <Item href={P('/inventory-view')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Inventory View" close={closeDrawer} />}
                  {can('Inventory Entry') && <Item href={P('/inventory-entry')} icon={<icons.Receipt className="w-5 h-5"/>} label="Inventory Entry" close={closeDrawer} />}
                  {can('Stock Adjustment') && <Item href={P('/stock-adjustment')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Adjustment" close={closeDrawer} />}
                  {can('Stock Transfer') && <Item href={P('/stock-transfer')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Transfer" close={closeDrawer} />} 
                  {can('Stock Report') && <Item href={P('/stock-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Report" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.pay && (
            <div>
              <MenuBtn isOpen={open.menu === 'accounts'} onToggle={() => toggleMenu('accounts')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Accounts" />
              {open.menu === 'accounts' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Payment Entry') && <Item href={P('/payment-entry')} icon={<icons.OutlineCreditCard className="w-5 h-5"/>} label="Payment Entry" close={closeDrawer} />}
                  {can('Ledger') && <Item href={P('/ledger')} icon={<icons.Chart className="w-5 h-5"/>} label="Ledger" close={closeDrawer} />}
                  {can('Journal Entry') && <Item href={P('/journal-entry')} icon={<icons.Receipt className="w-5 h-5"/>} label="Journal Entry" close={closeDrawer} />}
                  {can('Payment Form') && <Item href={P('/payment-form')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Payment Form" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.prod && (
            <div>
              <MenuBtn isOpen={open.menu === 'production'} onToggle={() => toggleMenu('production')} icon={<icons.Puzzle className="w-5 h-5"/>} label="Production" /> 
              {open.menu === 'production' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('BOM') && <Item href={P('/bom')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="BOM" close={closeDrawer} />}
                  {can('Work Order') && <Item href={P('/work-order')} icon={<icons.Receipt className="w-5 h-5"/>} label="Work Order" close={closeDrawer} />}
                  {can('Production Order') && <Item href={P('/production-order')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Production Order" close={closeDrawer} />}
                  {can('Production Report') && <Item href={P('/production-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Production Report" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.project && (
            <div>
              <MenuBtn isOpen={open.menu === 'project'} onToggle={() => toggleMenu('project')} icon={<icons.Chart className="w-5 h-5"/>} label="Project" />
              {open.menu === 'project' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Project') && <Item href={P('/project')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Project" close={closeDrawer} />}
                  {can('Tasks') && <Item href={P('/tasks')} icon={<icons.Receipt className="w-5 h-5"/>} label="Tasks" close={closeDrawer} />}
                  {can('Task Board') && <Item href={P('/tasks/board')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Task Board" close={closeDrawer} />}
                  {can('Timesheet') && <Item href={P('/timesheet')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Timesheet" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.employee && (
            <div>
              <MenuBtn isOpen={open.menu === 'employee'} onToggle={() => toggleMenu('employee')} icon={<icons.Users className="w-5 h-5"/>} label="Employee" />
              {open.menu === 'employee' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Profile') && <Item href={P('/profile')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Profile" close={closeDrawer} />}
                  {can('Attendance') && <Item href={P('/attendance')} icon={<icons.Receipt className="w-5 h-5"/>} label="Attendance" close={closeDrawer} />}
                  {can('Payroll') && <Item href={P('/payroll')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Payroll" close={closeDrawer} />}
                  {can('Timesheet') && <Item href={P('/timesheet')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Timesheet" close={closeDrawer} />}
                  {can('Tasks') && <Item href={P('/tasks')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Tasks" close={closeDrawer} />}
                  {can('Task Board') && <Item href={P('/tasks/board')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Task Board" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          {v.project && (
            <div>
              <MenuBtn isOpen={open.menu === 'reports'} onToggle={() => toggleMenu('reports')} icon={<icons.ChartSquareBar className="w-5 h-5"/>} label="Reports" />
              {open.menu === 'reports' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Sales Report') && <Item href={P('/sales-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Sales Report" close={closeDrawer} />}
                  {can('Purchase Report') && <Item href={P('/purchase-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Purchase Report" close={closeDrawer} />}
                  {can('Stock Report') && <Item href={P('/stock-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Report" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}

          {v.employee && (
            <div>
              <MenuBtn isOpen={open.menu === 'hr'} onToggle={() => toggleMenu('hr')} icon={<icons.Users className="w-5 h-5"/>} label="HR" />
              {open.menu === 'hr' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Employee') && <Item href={P('/employee')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Employee" close={closeDrawer} />}
                  {can('Attendance') && <Item href={P('/attendance')} icon={<icons.Receipt className="w-5 h-5"/>} label="Attendance" close={closeDrawer} />}  
                  {can('Payroll') && <Item href={P('/payroll')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Payroll" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}

          {v.project && (
            <div>
              <MenuBtn isOpen={open.menu === 'support'} onToggle={() => toggleMenu('support')} icon={<icons.CRM className="w-5 h-5"/>} label="Support" />
              {open.menu === 'support' && (
                <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                  {can('Tickets') && <Item href={P('/tickets')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Tickets" close={closeDrawer} />} 
                  {can('Responses') && <Item href={P('/responses')} icon={<icons.Receipt className="w-5 h-5"/>} label="Responses" close={closeDrawer} />}
                  {can('Lead Generation') && <Item href={P('/LeadDetailsFormMaster')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Lead Generation" close={closeDrawer} />}
                  {can('Opportunity') && <Item href={P('/OpportunityDetailsForm')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Opportunity" close={closeDrawer} />}
                </div>
              )}
            </div>
          )}
          

          <div className="pt-8">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <div className="flex-1 ml-64 flex flex-col">
         <header className="fixed top-0 right-0 left-0 md:left-64 bg-white dark:bg-gray-800 shadow h-14 flex items-center justify-end px-6 z-10">
            <div className="flex items-center gap-4">
              <NotificationBell />
              <span className="text-sm hidden sm:inline">Hello, {session?.name || session?.email}</span>
              <img
                src={`https://i.pravatar.cc/150?u=${session?.email}`}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
          </header>
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}




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

// /* ---------- Tiny reusable components ---------- */
// const MenuBtn = ({ isOpen, onToggle, icon, label }) => (
//   <button
//     onClick={onToggle}
//     className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600"
//   >
//     <span className="flex items-center gap-2">{icon} {label}</span>
//     {isOpen ? <HiChevronDown /> : <HiChevronRight />}
//   </button>
// );

// const Item = ({ href, icon, label, close }) => (
  
//   <Link
//     href={href}
//     onClick={close}
//     className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-600"
//   >
//     {icon} {label}
//   </Link>
// );

// /* ---------- Main layout ---------- */
// export default function Sidebar({ children }) {
//   const router = useRouter();
//   const [drawer, setDrawer] = useState(false);
//   const [open, setOpen] = useState({ menu: null, sub: null });
//   const [session, setSession] = useState(null);

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


//   console.log("data of the session",session);

//   /* --- roles helper --- */
//   const getRoles = (s) => {
//     let a = [];
//     if (Array.isArray(s?.roles)) a = s.roles;
//     else if (typeof s?.role === 'string') a = s.role.split(',');
//     else if (Array.isArray(s?.user?.roles)) a = s.user.roles;
//     else if (typeof s?.user?.role === 'string') a = s.user.role.split(',');
//     return a.map((r) => r.trim().toLowerCase());
//   };
//   const roles = getRoles(session);
//   const has = (r) => roles.includes('admin') || roles.includes(r.toLowerCase());

//   /* --- visibility flags --- */
//   const v = {
//     masters: has('hr manager'),
//     mastersView: has('hr manager'),
//     tsales: has('sales manager') ,
//     tpurchase: has('purchase manager'),
//     crm:  has('support executive'),
//     stock: has('inventory manager'),
//     pay: has('accounts manager'),
//     prod: has('production head'),
//     project: has('project manager'),
//     Employee: has('employee'),  
//   };
//   if (has('admin')) Object.keys(v).forEach((k) => (v[k] = true));

//   const PREFIX = has('admin') ? '/admin' : '/users';
//   const P = (p) => `${PREFIX}${p}`;
//   const toggleMenu = (k) =>
//     setOpen((o) => ({ ...o, menu: o.menu === k ? null : k, sub: null }));
//   const toggleSub = (k) =>
//     setOpen((o) => ({ ...o, sub: o.sub === k ? null : k }));
//   const closeDrawer = () => setDrawer(false);

//   return (
//     <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
//       {/* mobile topbar */}
//       <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
//         <button onClick={() => setDrawer(true)} className="text-2xl">
//           <HiMenu />
//         </button>
//         <h1 className="text-lg font-semibold">Dashboard</h1>
//       </header>
//       {drawer && (
//         <div
//           className="fixed inset-0 z-30 bg-black/40 md:hidden"
//           onClick={closeDrawer}
//         />
//       )}

//       {/* sidebar */}
//       <aside
//         className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-gray-700 text-white transform duration-200 ${
//           drawer ? 'translate-x-0' : '-translate-x-full'
//         } md:translate-x-0 md:static`}
//       >
//         {/* mobile header inside drawer */}
//         <div className="md:hidden flex items-center justify-between px-4 h-14">
//           <span className="text-xl font-bold flex items-center gap-2">
//             <HiHome /> Dashboard
//           </span>
//           <button onClick={closeDrawer} className="text-2xl">
//             <HiX />
//           </button>
//         </div>

//         <nav className="mt-6 px-2 pb-6 space-y-3">
//           {/* Masters */}
//           {v.masters && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'm'}
//                 onToggle={() => toggleMenu('m')}
//                 icon={<HiUsers />}
//                 label="Masters"
//               />
//               {open.menu === 'm' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/createCustomers')}
//                     icon={<HiUserGroup />}
//                     label="Create Customer"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/Countries')}
//                     icon={<HiGlobeAlt />}
//                     label="Countries"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/company')}
//                     icon={<HiHome />}
//                     label="Company"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/State')}
//                     icon={<HiFlag />}
//                     label="State"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/City')}
//                     icon={<HiOutlineOfficeBuilding />}
//                     label="City"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/supplier')}
//                     icon={<HiUserGroup />}
//                     label="Supplier"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/item')}
//                     icon={<HiCube />}
//                     label="Item"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/WarehouseDetailsForm')}
//                     icon={<HiOutlineLibrary />}
//                     label="Warehouse Details"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/CreateGroup')}
//                     icon={<HiUserGroup />}
//                     label="Create Group"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/CreateItemGroup')}
//                     icon={<HiOutlineCube />}
//                     label="Create Item Group"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/account-bankhead')}
//                     icon={<HiOutlineLibrary />}
//                     label="Account Head"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/bank-head-details')}
//                     icon={<HiCurrencyDollar />}
//                     label="Bank Head"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Masters View */}
//           {v.mastersView && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'mv'}
//                 onToggle={() => toggleMenu('mv')}
//                 icon={<HiViewGrid />}
//                 label="Masters View"
//               />
//               {open.menu === 'mv' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/customer-view')}
//                     icon={<HiUsers />}
//                     label="Customer View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/supplier-view')}
//                     icon={<HiUserGroup />}
//                     label="Supplier View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/item-view')}
//                     icon={<HiCube />}
//                     label="Item View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/account-head-view')}
//                     icon={<HiOutlineLibrary />}
//                     label="Account Head View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/bank-head-view')}
//                     icon={<HiCurrencyDollar />}
//                     label="Bank Head View"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Transactions */}
//           {(v.tsales || v.tpurchase) && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 't'}
//                 onToggle={() => toggleMenu('t')}
//                 icon={<HiOutlineCreditCard />}
//                 label="Transactions"
//               />
//               {open.menu === 't' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   {/* Sales submenu */}
//                   {v.tsales && (
//                     <div>
//                       <MenuBtn
//                         isOpen={open.sub === 'sales'}
//                         onToggle={() => toggleSub('sales')}
//                         icon={<HiShoppingCart />}
//                         label="Sales"
//                       />
//                       {open.sub === 'sales' && (
//                         <div className="ml-4 mt-1 space-y-1">
//                           <Item
//                             href={P('/sales-quotation-view')}
//                             icon={<HiChevronDown />}
//                             label="Quotation View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/sales-order-view')}
//                             icon={<HiChevronRight />}
//                             label="Order View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/delivery-view')}
//                             icon={<HiOutlineCube />}
//                             label="Delivery View"
//                             close={closeDrawer}
                           
//                           />
//                           <Item
//                             href={P('/sales-invoice-view')}
//                             icon={<HiOutlineCreditCard />}
//                             label="Invoice View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/credit-memo-view')}
//                             icon={<HiReceiptTax />}
//                             label="Credit Memo View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/sales-report')}
//                             icon={<HiChartSquareBar />}
//                             label="Report"
//                             close={closeDrawer}
//                           />
//                         </div>
//                       )}
//                     </div>
//                   )}

//                   {/* Purchase submenu */}
//                   {v.tpurchase && (
//                     <div>
//                       <MenuBtn
//                         isOpen={open.sub === 'purchase'}
//                         onToggle={() => toggleSub('purchase')}
//                         icon={<GiStockpiles />}
//                         label="Purchase"
//                       />
//                       {open.sub === 'purchase' && (
//                         <div className="ml-4 mt-1 space-y-1">
//                           <Item
//                             href={P('/purchase-quotation-view')}
//                             icon={<HiChevronDown />}
//                             label="Quotation View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/purchase-order-view')}
//                             icon={<HiChevronRight />}
//                             label="Order View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/grn-view')}
//                             icon={<HiOutlineCube />}
//                             label="GRN View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/purchase-invoice-view')}
//                             icon={<HiOutlineCreditCard />}
//                             label="Invoice View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/debit-notes-view')}
//                             icon={<HiReceiptTax />}
//                             label="Debit Notes View"
//                             close={closeDrawer}
//                           />
//                           <Item
//                             href={P('/purchase-report')}
//                             icon={<HiChartSquareBar />}
//                             label="Report"
//                             close={closeDrawer}
//                           />
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* CRM */}
//           {v.crm && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'crm'}
//                 onToggle={() => toggleMenu('crm')}
//                 icon={<SiCivicrm />}
//                 label="CRM"
//               />
//               {open.menu === 'crm' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/LeadDetailsFormMaster')}
//                     icon={<HiUserGroup />}
//                     label="Lead Generation"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/OpportunityDetailsForm')}
//                     icon={<HiPuzzle />}
//                     label="Opportunity"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Stock */}
//           {v.stock && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'stock'}
//                 onToggle={() => toggleMenu('stock')}
//                 icon={<HiOutlineCube />}
//                 label="Stock"
//               />
//               {open.menu === 'stock' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/InventoryView')}
//                     icon={<HiOutlineLibrary />}
//                     label="Inventory View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/InventoryEntry')}
//                     icon={<HiOutlineLibrary />}
//                     label="Inventory Entry"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Payment */}
//           {v.pay && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'pay'}
//                 onToggle={() => toggleMenu('pay')}
//                 icon={<HiOutlineCreditCard />}
//                 label="Payment"
//               />
//               {open.menu === 'pay' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/payment')}
//                     icon={<HiCurrencyDollar />}
//                     label="Payment Form"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Production */}
//           {v.prod && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'prod'}
//                 onToggle={() => toggleMenu('prod')}
//                 icon={<HiPuzzle />}
//                 label="Production"
//               />
//               {open.menu === 'prod' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/bom')}
//                     icon={<HiOutlineCube />}
//                     label="BoM"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/ProductionOrder')}
//                     icon={<HiReceiptTax />}
//                     label="Production Order"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/bom-view')}
//                     icon={<HiOutlineCube />}
//                     label="BoM View"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/productionorders-list-view')}
//                     icon={<HiReceiptTax />}
//                     label="Production Orders View"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Project  */}
//           {v.project && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'project'}
//                 onToggle={() => toggleMenu('project')}
//                 icon={<HiPuzzle />}
//                 label="Project"
//               />
//               {open.menu === 'project' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/project/projects')}
//                     icon={<HiOutlineCube />}
//                     label="Project"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/project/tasks')}
//                     icon={<HiReceiptTax />}
//                     label="Tasks"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/project/tasks/board')}
//                     icon={<HiOutlineCube />}
//                     label="Task Board"
//                     close={closeDrawer}
//                   />

//                 </div>
//               )}
//             </div>
//           )}


//            {/* Empolyee */}
//           {v.Employee && (
//             <div>
//               <MenuBtn
//                 isOpen={open.menu === 'Tasks'}
//                 onToggle={() => toggleMenu('Tasks')}
//                 icon={<HiPuzzle />}
//                 label="Tasks"
//               />
//               {open.menu === 'Tasks' && (
//                 <div className="ml-6 mt-2 space-y-1">
//                   <Item
//                     href={P('/tasks' )}
//                     icon={<HiOutlineCube />}
//                     label="Tasks"
//                     close={closeDrawer}
//                   />
//                   <Item
//                     href={P('/tasks/board' )}
//                     icon={<HiReceiptTax />}
//                     label="Task Board"
//                     close={closeDrawer}
//                   />
//                 </div>
//               )}
//             </div>
                    
//           )}




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


//       {/* content */}
//       <main className="flex-1  md:pt-20 ">{children}</main>
//     </div>
//   );
// }

