"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function PayslipPage({ params, searchParams }) {
  const [data, setData] = useState(null);
  const month = searchParams.month;

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/hr/payslip/${params.id}?month=${month}`);
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);

  if (!data) return <div>Loading...</div>;

  const { employee, payroll } = data;

  const downloadPDF = async () => {
  const element = document.getElementById("payslip");
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const width = 210;
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, width, height);
  pdf.save(`Payslip-${month}.pdf`);
};


  return (
    <div className="max-w-2xl mx-auto bg-white p-6 border rounded-xl print:shadow-none">
      <div className="flex justify-between mb-6 items-center">
        <h1 className="text-xl font-bold">PAYSLIP</h1>
        <button
  onClick={downloadPDF}
  className="rounded-lg bg-black text-white px-3 py-2 text-sm"
>
  Download PDF
</button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><b>Name:</b> {employee.fullName}</div>
        <div><b>Month:</b> {month}</div>
        <div><b>Employee Code:</b> {employee.employeeCode}</div>
        <div><b>Department:</b> {employee.department?.name}</div>
        <div><b>Designation:</b> {employee.designation?.title}</div>
        <div><b>Status:</b> {payroll.paidStatus}</div>
      </div>

      <table className="w-full mt-6 border text-sm">
        <tbody>
          <tr className="border">
            <td className="p-2">Basic</td>
            <td className="p-2 text-right">₹{payroll.basic}</td>
          </tr>
          <tr className="border">
            <td className="p-2">HRA</td>
            <td className="p-2 text-right">₹{payroll.hra}</td>
          </tr>
          <tr className="border">
            <td className="p-2">Allowances</td>
            <td className="p-2 text-right">₹{payroll.allowances}</td>
          </tr>
          <tr className="border">
            <td className="p-2">Deductions</td>
            <td className="p-2 text-right">₹{payroll.deductions}</td>
          </tr>
          <tr className="border bg-muted font-bold">
            <td className="p-2">Net Salary</td>
            <td className="p-2 text-right">₹{payroll.netSalary}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
