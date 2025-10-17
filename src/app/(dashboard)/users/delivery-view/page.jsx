"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";

// ✅ Permission check function
const hasPermission = (user, moduleName, permissionType) => {
  return (
    user?.modules?.[moduleName]?.selected &&
    user.modules[moduleName]?.permissions?.[permissionType] === true
  );
};

export default function SalesDeliveryList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // ✅ Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Fetch Sales Delivery Orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/sales-delivery", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Error fetching deliveries.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete order
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/sales-delivery/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== id));
        toast.success("Order deleted successfully.");
      }
    } catch {
      toast.error("Failed to delete order");
    }
  };

  // ✅ Copy order
  const handleCopyTo = (order, type) => {
    const data = { ...order, sourceId: order._id, sourceModel: "Delivery" };
    if (type === "GRN") {
      sessionStorage.setItem("grnData", JSON.stringify(order));
      router.push("/users/GRN");
    } else if (type === "Invoice") {
      sessionStorage.setItem("SalesInvoiceData", JSON.stringify(data));
      router.push("/users/sales-invoice-view/new");
    }
  };

  // ✅ Filter orders by customer name
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    return orders.filter((o) =>
      (o.customerName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, orders]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Sales Delivery</h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative max-w-sm w-full">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {hasPermission(user, "Sales Delivery", "create") && (
          <Link href="/users/delivery-view/new">
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit className="mr-2" />
              Create New Delivery
            </button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {[
                    "#",
                    "Document NO.",
                    "Customer",
                    "Date",
                    "Remarks",
                    "Total",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr
                    key={order._id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{idx + 1}.</td>
                    <td className="px-4 py-3">{order.documentNumberDelivery}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{order.remarks}</td>
                    <td className="px-4 py-3">₹ {order.grandTotal}</td>
                    <td className="px-4 py-3">
                      <RowMenu
                        order={order}
                        onDelete={handleDelete}
                        onCopy={handleCopyTo}
                        user={user}
                      />
                    </td>
                  </tr>
                ))}
                {!filteredOrders.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-4 text-gray-500"
                    >
                      No deliveries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order, idx) => (
              <div
                key={order._id}
                className="bg-white p-4 rounded-lg shadow border"
              >
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">
                    #{idx + 1} - {order.documentNumberDelivery}
                  </div>
                  <RowMenu
                    order={order}
                    onDelete={handleDelete}
                    onCopy={handleCopyTo}
                    user={user}
                    isMobile
                  />
                </div>
                <div><strong>Customer:</strong> {order.customerName}</div>
                <div><strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</div>
                <div><strong>Remarks:</strong> {order.remarks}</div>
                <div><strong>Total:</strong> ₹ {order.grandTotal}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ✅ RowMenu with permission checks
function RowMenu({ order, onDelete, onCopy, user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // ✅ Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/users/delivery-view/${order._id}`) },
    hasPermission(user, "Sales Delivery", "edit") && { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/users/delivery-view/new?editId=${order._id}`) },
    hasPermission(user, "Sales Delivery", "create") && { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
    hasPermission(user, "Sales Delivery", "email") && { icon: <FaEnvelope />, label: "Email", onClick: async () => {
      try {
        const res = await axios.post("/api/email", { type: "delivery", id: order._id });
        if (res.data.success) toast.success("Email sent successfully!");
        else toast.error(res.data.message || "Failed to send email.");
      } catch {
        toast.error("Error sending email.");
      }
    }},
    hasPermission(user, "Sales Delivery", "whatsapp") && { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/users/delivery-whatsapp/${order._id}`) },
    hasPermission(user, "Sales Delivery", "delete") && { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ].filter(Boolean);

  return <ActionMenu actions={actions} />;
}
