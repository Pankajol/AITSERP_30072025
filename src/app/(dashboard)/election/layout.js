// app/(dashboard)/election/layout.js
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiLayout, FiFlag, FiMapPin, FiHome, FiUsers, FiUserCheck, FiClipboard, FiMic, FiDollarSign, FiRadio, FiMenu, FiX } from "react-icons/fi";

const sidebarItems = [
  { href: "/election", label: "Dashboard", icon: FiLayout },
  { href: "/election/parties", label: "Parties / Candidates", icon: FiFlag },
  { href: "/election/constituencies", label: "Constituencies", icon: FiMapPin },
  { href: "/election/booths", label: "Booths", icon: FiHome },
  { href: "/election/voters", label: "Voters", icon: FiUsers },
  { href: "/election/workers", label: "Workers", icon: FiUserCheck },
  { href: "/election/surveys", label: "Surveys", icon: FiClipboard },
  { href: "/election/rallies", label: "Rallies & Events", icon: FiMic },
  { href: "/election/expenses", label: "Election Expenses", icon: FiDollarSign },
  { href: "/election/media", label: "Media Campaigns", icon: FiRadio },
];

export default function ElectionLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center h-16 px-6 border-b">
          <FiFlag className="h-6 w-6 text-indigo-600" />
          <span className="ml-2 font-bold text-lg text-gray-800">Election Hub</span>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 border-b bg-white">
          <button className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <FiMenu className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-lg truncate capitalize">
            {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}