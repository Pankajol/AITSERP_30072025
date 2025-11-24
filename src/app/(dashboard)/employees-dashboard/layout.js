import { redirect } from "next/navigation";
import Sidebar from "@/components/hr/Sidebar";

export const metadata = {
  title: "Employee Dashboard",
};

export default function EmployeeLayout({ children }) {
  // run only on client
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (!token) {
      redirect("/login");
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const roles = payload.roles || [];

      // ❌ BLOCK ADMIN / HR / MANAGER
      if (
        roles.includes("Admin") ||
        roles.includes("HR") ||
        roles.includes("Manager")
      ) {
        redirect("/hr/dashboard");
      }

    } catch (e) {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-100">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6">
        {children}
      </main>

    </div>
  );
}

