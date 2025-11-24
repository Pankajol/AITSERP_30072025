'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- Helper: Basic JWT Decoder (replaces external library) ---
// Decodes the payload from a JSON Web Token.
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
// Provides a simple push function for client-side navigation.
const useRouter = () => {
    return {
        push: (href) => {
            window.location.href = href;
        },
    };
};

// --- Inlined SVG Icons (replaces react-icons and lucide-react) ---
// An object containing all necessary icons as React components.
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
  ChartSquareBar: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>),
  Settings: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="M11 13.73 7 20.66"/></svg>),
  Key: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 11.5 3 3"/></svg>),
  Box: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>),
  Hammer: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 12-8.373 8.373a1 1 0 1 1-1.414-1.414L12.586 12l.207.207a1 1 0 0 0 1.414 0l.707-.707a1 1 0 0 0 0-1.414l-2-2a1 1 0 0 0-1.414 0l-1.5 1.5"></path><path d="m22 2-1.5 1.5"></path><path d="M11 5.172a2 2 0 0 1 2.828 0l2.586 2.586a2 2 0 0 1 0 2.828l-8.01 8.01a2 2 0 0 1-2.828 0l-2.586-2.586a2 2 0 0 1 0-2.828l8.01-8.01z"></path></svg>),
  Package: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2"></path><path d="M21 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M3 10h18v4H3z"></path><path d="M12 18v-4"></path></svg>),
  FileText: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>),
  BarChart2: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>),
};


// --- Child Components ---
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
    {label && (isOpen ? <icons.ChevronDown className="w-5 h-5"/> : <icons.ChevronRight className="w-5 h-5"/>)}
  </button>
);

const Item = ({ href, icon, label, close }) => {
    const router = useRouter();
    const handleClick = (e) => {
        e.preventDefault();
        router.push(href);
        if (close) close();
    };
    return (
      <a href={href} onClick={handleClick} className="flex items-center w-full gap-2 px-4 py-2 text-left rounded hover:bg-gray-600">
        {icon} {label}
      </a>
    );
};

// --- Main Sidebar Layout Component ---
export default function Sidebar({ children }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState({ menu: null, sub: null });
  const [session, setSession] = useState(null);

  // Effect to handle authentication check on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/'); // Redirect to login if no token
      return;
    }
    try {
      const decodedSession = jwtDecode(token);
      setSession(decodedSession);
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('token');
      router.push('/');
    }
  }, []);

  // Memoized permission logic to avoid recalculation on every render
  const { hasRole, hasPermission, isAdmin } = useMemo(() => {
    const roles = session?.roles || [];
    const modules = session?.modules || {};
    const isAdmin = roles.includes('Admin');

    const hasRole = (role) => {
        if (isAdmin) return true;
        return roles.includes(role);
    };

    const hasPermission = (module, action = 'view') => {
        if (isAdmin) return true;
        const moduleData = modules[module];
        if (!moduleData || !moduleData.selected) {
            return false;
        }
        return moduleData.permissions?.[action] === true;
    };
    
    return { hasRole, hasPermission, isAdmin };
  }, [session]);

  // Memoized visibility flags for cleaner JSX
  const v = useMemo(() => ({
    masters: hasRole('HR Manager'),
    mastersView: hasRole('HR Manager'),
    transactions: hasRole('Sales Manager') || hasRole('Purchase Manager'),
    tsales: hasRole('Sales Manager'),
    tpurchase: hasRole('Purchase Manager'),
    crm: hasRole('Support Executive'),
    stock: hasRole('Inventory Manager'),
    pay: hasRole('Accounts Manager'),
    prod: hasRole('Production Head'),
    project: hasRole('Project Manager'),
    employee: hasRole('Employee') || hasRole('HR Manager'),
    hr: hasRole('HR Manager'),
    support: hasRole('Support Executive'),
    reports: hasPermission('Sales Report') || hasPermission('Purchase Report') || hasPermission('Stock Report'),
  }), [hasRole, hasPermission]);
  
  // Render nothing or a loading spinner until session is verified
  if (!session) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
            <p className="text-gray-800 dark:text-gray-200">Loading...</p>
        </div>
    );
  }

  const PREFIX = isAdmin ? '/admin' : '/users';
  const P = (path) => `${PREFIX}${path}`;
  const toggleMenu = (key) => setOpen(o => ({ ...o, menu: o.menu === key ? null : key, sub: null }));
  const toggleSub = (key) => setOpen(o => ({ ...o, sub: o.sub === key ? null : key }));
  const closeDrawer = () => setDrawer(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Mobile Topbar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
        <button onClick={() => setDrawer(true)} className="text-2xl">
          <icons.Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      {/* Overlay for mobile */}
      {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeDrawer} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-gray-700 text-white transform transition-transform duration-300 z-40 ${drawer ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-600 md:justify-center">
          <span className="text-xl font-bold flex items-center gap-2">
            <icons.Home className="w-6 h-6" /> Dashboard
          </span>
          <button onClick={closeDrawer} className="text-2xl md:hidden">
            <icons.X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col justify-between p-2 mt-2" style={{height: 'calc(100vh - 56px)'}}>
            <div className="space-y-2 overflow-y-auto">
                {v.masters && (
                <div>
                    <MenuBtn isOpen={open.menu === 'm'} onToggle={() => toggleMenu('m')} icon={<icons.Users className="w-5 h-5"/>} label="Masters" />
                    {open.menu === 'm' && (
                    <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                        <Item href={P('/createCustomers')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Create Customer" close={closeDrawer} />
                        <Item href={P('/Countries')} icon={<icons.Globe className="w-5 h-5"/>} label="Countries" close={closeDrawer} />
                        <Item href={P('/company')} icon={<icons.Home className="w-5 h-5"/>} label="Company" close={closeDrawer} />
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
                                {hasPermission('Sales Quotation') && <Item href={P('/sales-quotation-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
                                {hasPermission('Sales Order') && <Item href={P('/sales-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
                                {hasPermission('Delivery') && <Item href={P('/delivery-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Delivery View" close={closeDrawer} />}
                                {hasPermission('Sales Invoice') && <Item href={P('/sales-invoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
                                {hasPermission('Credit Note') && <Item href={P('/credit-note-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Credit Note View" close={closeDrawer} />}

                            </div>
                            )}
                        </div>
                        )}
                        {v.tpurchase && (
                        <div>
                            <MenuBtn isOpen={open.sub === 'purchase'} onToggle={() => toggleSub('purchase')} icon={<icons.Stock className="w-5 h-5"/>} label="Purchase" />
                            {open.sub === 'purchase' && (
                            <div className="pl-4 mt-1 space-y-1">
                                {hasPermission('Purchase Quotation') && <Item href={P('/PurchaseQuotationList')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
                                {hasPermission('GRN') && <Item href={P('/grn-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="GRN View" close={closeDrawer} /> }
                                {hasPermission('Purchase Order') && <Item href={P('/purchase-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
                                {hasPermission('Purchase Invoice') && <Item href={P('/purchaseInvoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
                                {hasPermission('Debit Note') && <Item href={P('/debit-notes-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Debit Note View" close={closeDrawer} />}
                            </div>
                            )}
                        </div>
                        )}
                    </div>
                    )}
                </div>
                )}
                
                {v.stock && (
                  <div>
                    <MenuBtn isOpen={open.menu === 'stock'} onToggle={() => toggleMenu('stock')} icon={<icons.Stock className="w-5 h-5"/>} label="Inventory" />
                    {open.menu === 'stock' && (
                      <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                        {hasPermission('Inventory View') && <Item href={P('/inventory-view')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Inventory View" close={closeDrawer} />}
                        {hasPermission('Stock Adjustment') && <Item href={P('/stock-adjustment')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Adjustment" close={closeDrawer} />}
                      </div>
                    )}
                  </div>
                )}

                {v.hr && (
                    <div>
                        <MenuBtn isOpen={open.menu === 'hr'} onToggle={() => toggleMenu('hr')} icon={<icons.Users className="w-5 h-5"/>} label="HR" />
                        {open.menu === 'hr' && (
                        <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                            {hasPermission('Employee') && <Item href={P('/employee')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Employee" close={closeDrawer} />}
                            {hasPermission('Attendance') && <Item href={P('/attendance')} icon={<icons.Receipt className="w-5 h-5"/>} label="Attendance" close={closeDrawer} />}
                            {hasPermission('Payroll') && <Item href={P('/payroll')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Payroll" close={closeDrawer} />}
                        </div>
                        )}
                    </div>
                )}

                {/* --- THIS IS THE CORRECTED LINE --- */}
                {(v.prod || hasPermission('Production')) && (
                  <div>
                    <MenuBtn
                      isOpen={open.menu === 'prod'}
                      onToggle={() => toggleMenu('prod')}
                      icon={<icons.Settings className="w-5 h-5" />}
                      label="Production"
                    />
                    {open.menu === 'prod' && (
                      <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                        {hasPermission('BOM') && (
                          <Item
                            href={P('/admin/ppc/bom')}
                            icon={<icons.Box className="w-5 h-5" />}
                            label="BOM"
                            close={closeDrawer}
                          />
                        )}
                        {hasPermission('Work Order') && (
                          <Item
                            href={P('/admin/ppc/work-order')}
                            icon={<icons.Hammer className="w-5 h-5" />}
                            label="Work Order"
                            close={closeDrawer}
                          />
                        )}
                        {hasPermission('Production Order') && (
                          <Item
                            href={P('/admin/ppc/production-orders')}
                            icon={<icons.Package className="w-5 h-5" />}
                            label="Production Order"
                            close={closeDrawer}
                          />
                        )}
                        {hasPermission('Job Card') && (
                          <Item
                            href={P('/ppc/jobcards')}
                            icon={<icons.FileText className="w-5 h-5" />}
                            label="Job Card"
                            close={closeDrawer}
                          />
                        )}
                        {hasPermission('Production Report') && (
                          <Item
                            href={P('/ppc/production-report')}
                            icon={<icons.BarChart2 className="w-5 h-5" />}
                            label="Production Report"
                            close={closeDrawer}
                          />
                        )}

                      </div>
                    )}
                  </div>
                )}

                {v.reports && (
                    <div>
                        <MenuBtn isOpen={open.menu === 'reports'} onToggle={() => toggleMenu('reports')} icon={<icons.ChartSquareBar className="w-5 h-5"/>} label="Reports" />
                        {open.menu === 'reports' && (
                        <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                            {hasPermission('Sales Report') && <Item href={P('/sales-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Sales Report" close={closeDrawer} />}
                            {hasPermission('Purchase Report') && <Item href={P('/purchase-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Purchase Report" close={closeDrawer} />}
                            {hasPermission('Stock Report') && <Item href={P('/stock-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Report" close={closeDrawer} />}
                        </div>
                        )}
                    </div>
                )}


                {v.hr && (
                    <div>
                        <MenuBtn isOpen={open.menu === 'hr'} onToggle={() => toggleMenu('hr')} icon={<icons.Users className="w-5 h-5"/>} label="HR" />
                        {open.menu === 'hr' && (
                        <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                            {hasPermission('Employee') && <Item href={P('/employee')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Employee" close={closeDrawer} />}
                            {hasPermission('Attendance') && <Item href={P('/attendance')} icon={<icons.Receipt className="w-5 h-5"/>} label="Attendance" close={closeDrawer} />}
                            {hasPermission('Payroll') && <Item href={P('/payroll')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Payroll" close={closeDrawer} />}
                            {hasPermission('Leave') && <Item href={P('/leave')} icon={<icons.Calendar className="w-5 h-5"/>} label="Leave" close={closeDrawer} />}
                        </div>
                        )}
                    </div>
                )}



                {v.support && (
                    <div>
                        <MenuBtn isOpen={open.menu === 'support'} onToggle={() => toggleMenu('support')} icon={<icons.Headset className="w-5 h-5"/>} label="Support" />
                        {open.menu === 'support' && (
                        <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
                            {hasPermission('Tickets') && <Item href={P('/tickets')} icon={<icons.Ticket className="w-5 h-5"/>} label="Tickets" close={closeDrawer} />}
                            {hasPermission('Report') && <Item href={P('#')} icon={<icons.BookOpen className="w-5 h-5"/>} label="Knowledge Base" close={closeDrawer} />}
                        </div>
                        )}
                    </div>
                )}

            </div>

            <div className="pt-4 border-t border-gray-600">
                <LogoutButton />
            </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64">
        <header className="fixed top-0 right-0 left-0 md:left-64 bg-white dark:bg-gray-800 shadow h-14 flex items-center justify-end px-6 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:inline">
              Hello, {session?.name || session?.email}
            </span>
            <img src={`https://i.pravatar.cc/150?u=${session?.email}`} alt="Profile" className="w-8 h-8 rounded-full object-cover"/>
            <div className="relative">
              <MenuBtn isOpen={open.menu === "settings"} onToggle={() => toggleMenu("settings")} icon={<icons.Settings className="w-5 h-5" />} />
              {open.menu === "settings" && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-20">
                  <Item href={P("/change-password")} icon={<icons.Key className="w-5 h-5" />} label="Change Password" close={() => setOpen((o) => ({ ...o, menu: null }))} />
                </div>
              )}
            </div>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 mt-14">
          {children}
        </main>
      </div>
    </div>
  );
}




// 'use client';

// import React, { useState, useEffect, useMemo } from 'react';

// // --- Helper: Basic JWT Decoder (replaces external library) ---
// // Decodes the payload from a JSON Web Token.
// const jwtDecode = (token) => {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
//         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//     }).join(''));
//     return JSON.parse(jsonPayload);
//   } catch (error) {
//     console.error("Failed to decode JWT:", error);
//     return null;
//   }
// };

// // --- Helper: Simple Router (replaces next/navigation) ---
// // Provides a simple push function for client-side navigation.
// const useRouter = () => {
//     return {
//         push: (href) => {
//             window.location.href = href;
//         },
//     };
// };

// // --- Inlined SVG Icons (replaces react-icons and lucide-react) ---
// // An object containing all necessary icons as React components.
// const icons = {
//   Menu: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>),
//   X: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>),
//   Home: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>),
//   Users: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197" /></svg>),
//   ViewGrid: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
//   CurrencyDollar: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 14v3m-3-6H7m6 0h2m-2 3h2M7 11h2m6-3h2" /></svg>),
//   ChevronDown: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>),
//   ChevronRight: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>),
//   ShoppingCart: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
//   UserGroup: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
//   OutlineCube: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
//   CreditCard: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>),
//   Puzzle: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>),
//   Library: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>),
//   Globe: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.5l.053-.053a.5.5 0 01.707 0l2.122 2.121a.5.5 0 00.707 0l2.121-2.121a.5.5 0 01.707 0l.053.053M4.053 7.707l-.053.053a.5.5 0 000 .707l2.121 2.122a.5.5 0 010 .707l-2.121 2.121a.5.5 0 000 .707l.053.053" /></svg>),
//   Flag: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>),
//   Office: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
//   Receipt: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
//   Chart: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
//   CRM: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" /></svg>),
//   Stock: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7l8-4 8 4M12 11v10" /></svg>),
//   Bell: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
//   ChartSquareBar: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /> </svg>),
//   Cog: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m17 3.34-1 1.73"/><path d="M11 13.73 7 20.66"/></svg>),
//   Key: (props) => (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 11.5 3 3"/></svg>),
// };

// // --- Child Components ---
// const LogoutButton = () => {
//   const router = useRouter();
//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     router.push('/');
//   };
//   return (
//     <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-red-400 rounded hover:bg-red-500 hover:text-white">
//       Logout
//     </button>
//   );
// };

// const NotificationBell = () => (
//     <button className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2">
//         <icons.Bell className="w-6 h-6"/>
//         <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
//     </button>
// );

// const MenuBtn = ({ isOpen, onToggle, icon, label }) => (
//   <button
//     onClick={onToggle}
//     className="flex items-center justify-between w-full px-4 py-2 text-left rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-white"
//   >
//     <span className="flex items-center gap-2">{icon} {label}</span>
//     {label && (isOpen ? <icons.ChevronDown className="w-5 h-5"/> : <icons.ChevronRight className="w-5 h-5"/>)}
//   </button>
// );

// const Item = ({ href, icon, label, close }) => {
//     const router = useRouter();
//     const handleClick = (e) => {
//         e.preventDefault();
//         router.push(href);
//         if (close) close();
//     };
//     return (
//       <a href={href} onClick={handleClick} className="flex items-center w-full gap-2 px-4 py-2 text-left rounded hover:bg-gray-600">
//         {icon} {label}
//       </a>
//     );
// };

// // --- Main Sidebar Layout Component ---
// export default function Sidebar({ children }) {
//   const router = useRouter();
//   const [drawer, setDrawer] = useState(false);
//   const [open, setOpen] = useState({ menu: null, sub: null });
//   const [session, setSession] = useState(null);

//   // Effect to handle authentication check on component mount
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       router.push('/'); // Redirect to login if no token
//       return;
//     }
//     try {
//       const decodedSession = jwtDecode(token);
//       setSession(decodedSession);
//     } catch (error) {
//       console.error("Invalid token:", error);
//       localStorage.removeItem('token');
//       router.push('/');
//     }
//   }, []);

//   // Memoized permission logic to avoid recalculation on every render
//   const { hasRole, hasPermission, isAdmin } = useMemo(() => {
//     const roles = session?.roles || [];
//     const modules = session?.modules || {};
//     const isAdmin = roles.includes('Admin');

//     const hasRole = (role) => {
//         if (isAdmin) return true;
//         return roles.includes(role);
//     };

//     const hasPermission = (module, action = 'view') => {
//         if (isAdmin) return true;
//         const moduleData = modules[module];
//         if (!moduleData || !moduleData.selected) {
//             return false;
//         }
//         return moduleData.permissions?.[action] === true;
//     };
    
//     return { hasRole, hasPermission, isAdmin };
//   }, [session]);

//   // Memoized visibility flags for cleaner JSX
//   const v = useMemo(() => ({
//     masters: hasRole('HR Manager'),
//     mastersView: hasRole('HR Manager'),
//     transactions: hasRole('Sales Manager') || hasRole('Purchase Manager'),
//     tsales: hasRole('Sales Manager'),
//     tpurchase: hasRole('Purchase Manager'),
//     crm: hasRole('Support Executive'),
//     stock: hasRole('Inventory Manager'),
//     pay: hasRole('Accounts Manager'),
//     prod: hasRole('Production Head'),
//     project: hasRole('Project Manager'),
//     employee: hasRole('Employee') || hasRole('HR Manager'),
//     hr: hasRole('HR Manager'),
//     support: hasRole('Support Executive'),
//     reports: hasPermission('Sales Report') || hasPermission('Purchase Report') || hasPermission('Stock Report'),
//   }), [hasRole, hasPermission]);
  
//   // Render nothing or a loading spinner until session is verified
//   if (!session) {
//     return (
//         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
//             <p className="text-gray-800 dark:text-gray-200">Loading...</p>
//         </div>
//     );
//   }

//   const PREFIX = isAdmin ? '/admin' : '/users';
//   const P = (path) => `${PREFIX}${path}`;
//   const toggleMenu = (key) => setOpen(o => ({ ...o, menu: o.menu === key ? null : key, sub: null }));
//   const toggleSub = (key) => setOpen(o => ({ ...o, sub: o.sub === key ? null : key }));
//   const closeDrawer = () => setDrawer(false);

//   return (
//     <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
//       {/* Mobile Topbar */}
//       <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
//         <button onClick={() => setDrawer(true)} className="text-2xl">
//           <icons.Menu className="w-6 h-6" />
//         </button>
//         <h1 className="text-lg font-semibold">Dashboard</h1>
//       </header>

//       {/* Overlay for mobile */}
//       {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={closeDrawer} />}

//       {/* Sidebar */}
//       <aside className={`fixed inset-y-0 left-0 w-64 bg-gray-700 text-white transform transition-transform duration-300 z-40 ${drawer ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
//         <div className="flex items-center justify-between px-4 h-14 border-b border-gray-600 md:justify-center">
//           <span className="text-xl font-bold flex items-center gap-2">
//             <icons.Home className="w-6 h-6" /> Dashboard
//           </span>
//           <button onClick={closeDrawer} className="text-2xl md:hidden">
//             <icons.X className="w-6 h-6" />
//           </button>
//         </div>

//         <nav className="flex flex-col justify-between p-2 mt-2" style={{height: 'calc(100vh - 56px)'}}>
//             <div className="space-y-2 overflow-y-auto">
//                 {v.masters && (
//                 <div>
//                     <MenuBtn isOpen={open.menu === 'm'} onToggle={() => toggleMenu('m')} icon={<icons.Users className="w-5 h-5"/>} label="Masters" />
//                     {open.menu === 'm' && (
//                     <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//                         <Item href={P('/createCustomers')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Create Customer" close={closeDrawer} />
//                         <Item href={P('/Countries')} icon={<icons.Globe className="w-5 h-5"/>} label="Countries" close={closeDrawer} />
//                         <Item href={P('/company')} icon={<icons.Home className="w-5 h-5"/>} label="Company" close={closeDrawer} />
//                     </div>
//                     )}
//                 </div>
//                 )}

//                 {v.transactions && (
//                 <div>
//                     <MenuBtn isOpen={open.menu === 't'} onToggle={() => toggleMenu('t')} icon={<icons.CreditCard className="w-5 h-5"/>} label="Transactions" />
//                     {open.menu === 't' && (
//                     <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//                         {v.tsales && (
//                         <div>
//                             <MenuBtn isOpen={open.sub === 'sales'} onToggle={() => toggleSub('sales')} icon={<icons.ShoppingCart className="w-5 h-5"/>} label="Sales" />
//                             {open.sub === 'sales' && (
//                             <div className="pl-4 mt-1 space-y-1">
//                                 {hasPermission('Sales Quotation') && <Item href={P('/sales-quotation-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
//                                 {hasPermission('Sales Order') && <Item href={P('/sales-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
//                                 {hasPermission('Delivery') && <Item href={P('/delivery-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Delivery View" close={closeDrawer} />}
//                                 {hasPermission('Sales Invoice') && <Item href={P('/sales-invoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
//                             </div>
//                             )}
//                         </div>
//                         )}
//                         {v.tpurchase && (
//                         <div>
//                             <MenuBtn isOpen={open.sub === 'purchase'} onToggle={() => toggleSub('purchase')} icon={<icons.Stock className="w-5 h-5"/>} label="Purchase" />
//                             {open.sub === 'purchase' && (
//                             <div className="pl-4 mt-1 space-y-1">
//                                 {hasPermission('Purchase Quotation') && <Item href={P('/PurchaseQuotationList')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Quotation View" close={closeDrawer} />}
//                                 {hasPermission('GRN') && <Item href={P('/grn-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="GRN View" close={closeDrawer} /> }
//                                 {hasPermission('Purchase Order') && <Item href={P('/purchase-order-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Order View" close={closeDrawer} />}
//                                 {hasPermission('Purchase Invoice') && <Item href={P('/purchaseInvoice-view')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Invoice View" close={closeDrawer} />}
//                             </div>
//                             )}
//                         </div>
//                         )}
//                     </div>
//                     )}
//                 </div>
//                 )}
                
//                 {v.stock && (
//                   <div>
//                     <MenuBtn isOpen={open.menu === 'stock'} onToggle={() => toggleMenu('stock')} icon={<icons.Stock className="w-5 h-5"/>} label="Inventory" />
//                     {open.menu === 'stock' && (
//                       <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//                         {hasPermission('Inventory View') && <Item href={P('/inventory-view')} icon={<icons.OutlineCube className="w-5 h-5"/>} label="Inventory View" close={closeDrawer} />}
//                         {hasPermission('Stock Adjustment') && <Item href={P('/stock-adjustment')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Adjustment" close={closeDrawer} />}
//                       </div>
//                     )}
//                   </div>
//                 )}

//                 {v.hr && (
//                     <div>
//                         <MenuBtn isOpen={open.menu === 'hr'} onToggle={() => toggleMenu('hr')} icon={<icons.Users className="w-5 h-5"/>} label="HR" />
//                         {open.menu === 'hr' && (
//                         <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//                             {hasPermission('Employee') && <Item href={P('/employee')} icon={<icons.UserGroup className="w-5 h-5"/>} label="Employee" close={closeDrawer} />}
//                             {hasPermission('Attendance') && <Item href={P('/attendance')} icon={<icons.Receipt className="w-5 h-5"/>} label="Attendance" close={closeDrawer} />}  
//                             {hasPermission('Payroll') && <Item href={P('/payroll')} icon={<icons.CurrencyDollar className="w-5 h-5"/>} label="Payroll" close={closeDrawer} />}
//                         </div>
//                         )}
//                     </div>
//                 )}
//          {v.prod && hasPermission('Production') && (
//   <div>
//     <MenuBtn
//       isOpen={open.menu === 'prod'}
//       onToggle={() => toggleMenu('prod')}
//       icon={<icons.Settings className="w-5 h-5" />}
//       label="Production"
//     />
//     {open.menu === 'prod' && (
//       <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//         {hasPermission('BOM') && (
//           <Item
//             href={P('/admin/ppc/bom')}
//             icon={<icons.Box className="w-5 h-5" />}
//             label="BOM"
//             close={closeDrawer}
//           />
//         )}
//         {hasPermission('Work Order') && (
//           <Item
//             href={P('/admin/ppc/work-order')}
//             icon={<icons.Hammer className="w-5 h-5" />}
//             label="Work Order"
//             close={closeDrawer}
//           />
//         )}
//         {hasPermission('Production Order') && (
//           <Item
//             href={P('/admin/ppc/production-orders')}
//             icon={<icons.Package className="w-5 h-5" />}
//             label="Production Order"
//             close={closeDrawer}
//           />
//         )}
//         {hasPermission('Job Card') && (
//           <Item
//             href={P('/ppc/jobcards')}
//             icon={<icons.FileText className="w-5 h-5" />}
//             label="Job Card"
//             close={closeDrawer}
//           />
//         )}
//         {hasPermission('Production Report') && (
//           <Item
//             href={P('/ppc/production-report')}
//             icon={<icons.BarChart2 className="w-5 h-5" />}
//             label="Production Report"
//             close={closeDrawer}
//           />
//         )}
//       </div>
//     )}
//   </div>
// )}



//                 {v.reports && (
//                     <div>
//                         <MenuBtn isOpen={open.menu === 'reports'} onToggle={() => toggleMenu('reports')} icon={<icons.ChartSquareBar className="w-5 h-5"/>} label="Reports" />
//                         {open.menu === 'reports' && (
//                         <div className="pl-6 mt-1 space-y-1 border-l-2 border-gray-500">
//                             {hasPermission('Sales Report') && <Item href={P('/sales-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Sales Report" close={closeDrawer} />}
//                             {hasPermission('Purchase Report') && <Item href={P('/purchase-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Purchase Report" close={closeDrawer} />}
//                             {hasPermission('Stock Report') && <Item href={P('/stock-report')} icon={<icons.ChevronRight className="w-5 h-5"/>} label="Stock Report" close={closeDrawer} />}
//                         </div>
//                         )}
//                     </div>
//                 )}
//             </div>

//             <div className="pt-4 border-t border-gray-600">
//                 <LogoutButton />
//             </div>
//         </nav>
//       </aside>

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col md:ml-64">
//         <header className="fixed top-0 right-0 left-0 md:left-64 bg-white dark:bg-gray-800 shadow h-14 flex items-center justify-end px-6 z-10">
//           <div className="flex items-center gap-4">
//             <span className="text-sm hidden sm:inline">
//               Hello, {session?.name || session?.email}
//             </span>
//             <img src={`https://i.pravatar.cc/150?u=${session?.email}`} alt="Profile" className="w-8 h-8 rounded-full object-cover"/>
//             <div className="relative">
//               <MenuBtn isOpen={open.menu === "settings"} onToggle={() => toggleMenu("settings")} icon={<icons.Cog className="w-5 h-5" />} />
//               {open.menu === "settings" && (
//                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-20">
//                   <Item href={P("/change-password")} icon={<icons.Key className="w-5 h-5" />} label="Change Password" close={() => setOpen((o) => ({ ...o, menu: null }))} />
//                 </div>
//               )}
//             </div>
//             <NotificationBell />
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto p-4 lg:p-6 mt-14">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }



















