"use client";
import { useState } from "react";
import GSTR1 from "@/components/reports/GSTR1";
import GSTR3B from "@/components/reports/GSTR3B";

export default function GSTReportsPage() {
  const [activeTab, setActiveTab] = useState("gstr1");
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">GST Reports</h1>
        <div className="flex gap-2 border-b mb-6">
          <button onClick={() => setActiveTab("gstr1")} className={`px-4 py-2 text-sm font-medium ${activeTab === "gstr1" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>GSTR‑1 (Outward)</button>
          <button onClick={() => setActiveTab("gstr3b")} className={`px-4 py-2 text-sm font-medium ${activeTab === "gstr3b" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>GSTR‑3B (Summary)</button>
        </div>
        {activeTab === "gstr1" && <GSTR1 />}
        {activeTab === "gstr3b" && <GSTR3B />}
      </div>
    </div>
  );
}