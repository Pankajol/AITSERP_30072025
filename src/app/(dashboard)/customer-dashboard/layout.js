"use client"
import { useState,useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {jwtDecode} from "jwt-decode";
import LogoutButton from "@/components/LogoutButton";

export default function UserSidebar({children}) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState(null);
  const [user, setUser] = useState(null);

  const toggleMenu = (menuName) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };


   useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/"); // Redirect to sign-in if no token
      } else {
        try {
          const decodedToken = jwtDecode(token); // Decode token to get user info
          setUser(decodedToken); // Set user data
        } catch (error) {
          console.error("Invalid token", error);
          localStorage.removeItem("token");
          router.push("/"); // Redirect if token is invalid
        }
      }
    }, [router]);

  return (
    <div className="min-h-screen flex">
    <aside className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold">User Panel</h2>
      <nav className="mt-4 space-y-2">
        {/* Master Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleMenu("master")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
          >
            Master
          </button>
          {openMenu === "master" && (
            <div className="ml-4 mt-2 space-y-1">
              <Link href="/dashboard/admin/master/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 1
              </Link>
              <Link href="/dashboard/admin/master/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 2
              </Link>
              <Link href="/dashboard/admin/master/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 3
              </Link>
            </div>
          )}
        </div>

        {/* Transaction Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleMenu("transaction")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
          >
            Transaction
          </button>
          {openMenu === "transaction" && (
            <div className="ml-4 mt-2 space-y-1">
              <Link href="/dashboard/admin/transaction/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 1
              </Link>
              <Link href="/dashboard/admin/transaction/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 2
              </Link>
              <Link href="/dashboard/admin/transaction/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 3
              </Link>
            </div>
          )}
        </div>

        {/* Report Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleMenu("report")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-700 rounded"
          >
            Report
          </button>
          {openMenu === "report" && (
            <div className="ml-4 mt-2 space-y-1">
              <Link href="/dashboard/admin/report/option1" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 1
              </Link>
              <Link href="/dashboard/admin/report/option2" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 2
              </Link>
              <Link href="/dashboard/admin/report/option3" className="block px-4 py-2 hover:bg-gray-700 rounded">
                Option 3
              </Link>
            </div>
          )}
        </div>
      </nav>
      {/* Logout Button */}
      <div className="mt-4">
          <LogoutButton />
        </div>
    </aside>
     <main className="flex-1 bg-gray-100 p-8">
     {children}
   </main>
   </div>

  );
}
