"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiShoppingBag, FiUsers, FiCheckSquare, FiDollarSign,
  FiMenu, FiX, FiArrowLeft
} from "react-icons/fi";

const sidebarItems = [
  {
    href: "/marketplace/admin/vendors",
    label: "Vendors",
    icon: FiUsers
  },
  {
    href: "/marketplace/admin/approvals",
    label: "Product Approvals",
    icon: FiCheckSquare
  },
  {
    href: "/marketplace/admin/settlements",
    label: "Settlements",
    icon: FiDollarSign
  }
];

export default function MarketplaceAdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center h-16 px-6 border-b">
          <FiShoppingBag className="h-6 w-6 text-indigo-600" />
          <span className="ml-2 font-bold text-lg text-gray-800">Marketplace</span>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
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

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 border-b bg-white">
          <button
            className="lg:hidden mr-2 p-2 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-lg truncate capitalize">
            {pathname.split("/").pop()?.replace("-", " ") || "Marketplace"}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}