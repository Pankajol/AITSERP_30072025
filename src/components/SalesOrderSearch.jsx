"use client";

import { useEffect, useState } from "react";
import Select from "react-select";
import api from "@/lib/api";

export default function SalesOrderSearch({
  onSelectSalesOrder,
  initialSalesOrder = [],
}) {
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await api.get("/sales-order", {
          headers: { Authorization: `Bearer ${token}` },
        });

     

        // ✅ your sales orders are inside res.data.data
        const salesOrders = Array.isArray(res.data?.data)
          ? res.data.data
          : [];

       

        const formatted = salesOrders.map((o) => ({
          value: o._id,
          label: o.documentNumberOrder || o.customerName || o._id,
          raw: o,
        }));

        setOptions(formatted);

        // ✅ preload selection if passed
        if (initialSalesOrder.length > 0) {
          const preSelected = formatted.filter((o) =>
            initialSalesOrder.includes(o.value)
          );
          setSelected(preSelected);
        }
      } catch (err) {
        console.error("Failed to fetch sales orders", err);
        setOptions([]);
      }
    };

    fetchOrders();
  }, [initialSalesOrder]);

  const handleChange = (selectedOptions) => {
    setSelected(selectedOptions);
    const fullOrders = selectedOptions.map((opt) => opt.raw);
    onSelectSalesOrder(fullOrders);
  };

  return (
    <Select
      isMulti
      value={selected}
      onChange={handleChange}
      options={options}
      placeholder="Search & select sales orders..."
      className="text-sm"
      classNamePrefix="sales-order"
    />
  );
}
