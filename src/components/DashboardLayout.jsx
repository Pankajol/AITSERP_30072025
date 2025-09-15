"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "🏠 Home" },
    { href: "/dashboard/tasks", label: "📝 Tasks" },
    { href: "/dashboard/notifications", label: "🔔 Notifications" },
    { href: "/dashboard/profile", label: "👤 Profile" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-6">User Dashboard</h1>
        <nav className="flex flex-col space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className={`text-left px-3 py-2 rounded-md transition ${
                  isActive
                    ? "bg-gray-700 font-semibold"
                    : "hover:bg-gray-800"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-100">{children}</main>
    </div>
  );
}
