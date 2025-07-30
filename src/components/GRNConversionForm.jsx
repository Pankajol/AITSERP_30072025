"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import WarehouseSelectorModal from "@/components/WarehouseSelector";
import { FaCheckCircle } from "react-icons/fa";

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const ddMmYyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  if (ddMmYyyyRegex.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

const initialState = {
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  // Items with optional per-item warehouse and itemId reference.
  items: [
    {
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
    },
  ],
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  // Global warehouse fields.
  warehouse: "",
  warehouseName: "",
  warehouseCode: "",
  grnNumber: "",
};

export default function GRNConversionForm() {
  const [modalOpen, setModalOpen] = useState(false);
  const [grnData, setGrnData] = useState(initialState);
  const [supplier, setSupplier] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const parentRef = useRef(null);

  // Load GRN data from sessionStorage (if available)
  useEffect(() => {
    const storedData = sessionStorage.getItem("grnData");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setGrnData(parsedData);
        setIsCopied(true);
        sessionStorage.removeItem("grnData");
      } catch (error) {
        console.error("Error parsing grnData:", error);
      }
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSupplierSelect = useCallback((selectedSupplier) => {
    setSupplier(selectedSupplier);
    setGrnData((prev) => ({
      ...prev,
      supplierCode: selectedSupplier.supplierCode || "",
      supplierName: selectedSupplier.supplierName || "",
      contactPerson: selectedSupplier.contactPersonName || "",
    }));
  }, []);

  const handleWarehouseSelect = (warehouse) => {
    setGrnData((prev) => ({
      ...prev,
      warehouse: warehouse._id,
      warehouseName: warehouse.warehouseName,
      warehouseCode: warehouse.warehouseCode,
      items: prev.items.map((item) =>
        item.warehouse ? item : { ...item, warehouse: warehouse._id, warehouseName: warehouse.warehouseName, warehouseCode: warehouse.warehouseCode }
      ),
    }));
    setModalOpen(false);
  };

  const handleItemWarehouseSelect = useCallback((index, warehouse) => {
    setGrnData((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        warehouse: warehouse._id,
        warehouseName: warehouse.warehouseName,
        warehouseCode: warehouse.warehouseCode,
      };
      return { ...prev, items };
    });
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setGrnData((prev) => {
      const items = [...prev.items];
      const numFields = ["quantity", "unitPrice", "discount", "freight", "gstType", "tdsAmount"];
      const newVal = numFields.includes(name) ? parseFloat(value) || 0 : value;
      items[index] = { ...items[index], [name]: newVal };
      const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstType = 0 } = items[index];
      const priceAfterDiscount = unitPrice - discount;
      const totalAmount = quantity * priceAfterDiscount + itemFreight;
      items[index].priceAfterDiscount = priceAfterDiscount;
      items[index].totalAmount = totalAmount;
      items[index].gstAmount = totalAmount * (gstType / 100);
      return { ...prev, items };
    });
  }, []);

  const addItemRow = useCallback(() => {
    setGrnData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          warehouse: prev.warehouse,
          warehouseName: prev.warehouseName,
          warehouseCode: prev.warehouseCode,
        },
      ],
    }));
  }, []);

  useEffect(() => {
    const totalBeforeDiscount = grnData.items.reduce(
      (acc, item) =>
        acc + ((parseFloat(item.unitPrice) || 0) - (parseFloat(item.discount) || 0)) * (parseFloat(item.quantity) || 1),
      0
    );
    const totalItems = grnData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0);
    const gstTotal = grnData.items.reduce((acc, item) => acc + (parseFloat(item.gstAmount) || 0), 0);
    const overallFreight = parseFloat(grnData.freight) || 0;
    const rounding = parseFloat(grnData.rounding) || 0;
    const downPayment = parseFloat(grnData.totalDownPayment) || 0;
    const appliedAmounts = parseFloat(grnData.appliedAmounts) || 0;
    const grandTotal = totalItems + gstTotal + overallFreight + rounding;
    const openBalance = grandTotal - (downPayment + appliedAmounts);
    setGrnData((prev) => ({
      ...prev,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
      openBalance,
    }));
  }, [grnData.items, grnData.freight, grnData.rounding, grnData.totalDownPayment, grnData.appliedAmounts]);

  const handleConvertGRN = useCallback(async () => {
    try {
      const res = await axios.post("/api/grn", grnData, {
        headers: { "Content-Type": "application/json" },
      });
      alert("GRN processed successfully: " + res.data.message);
      setGrnData(initialState);
      router.push("/admin/grn");
    } catch (error) {
      console.error("Error converting GRN:", error);
      alert("Error converting GRN");
    }
  }, [grnData, router]);

  const handleCancel = useCallback(() => {
    setGrnData(initialState);
  }, []);

  return (
    <div ref={parentRef} className="p-5">
      <h1 className="text-2xl font-bold mb-4">GRN Conversion</h1>
      {/* Supplier & Basic GRN Info */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {grnData.supplierName ? (
              <input
                type="text"
                name="supplierName"
                value={grnData.supplierName || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            ) : (
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input type="text" name="supplierCode" value={grnData.supplierCode || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input type="text" name="contactPerson" value={grnData.contactPerson || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input type="text" name="refNumber" value={grnData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select name="status" value={grnData.status || ""} onChange={handleInputChange} className="w-full p-2 border rounded">
              <option value="">Select status (optional)</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input type="date" name="postingDate" value={formatDateForInput(grnData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input type="date" name="validUntil" value={formatDateForInput(grnData.validUntil)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Delivery Date</label>
            <input type="date" name="documentDate" value={formatDateForInput(grnData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          {/* Global Warehouse */}
          <div>
            <label className="block mb-2 font-medium">Global Warehouse</label>
            <input
              type="text"
              readOnly
              value={grnData.warehouseName}
              placeholder="Select Warehouse"
              className="w-full p-2 border rounded cursor-pointer"
              onClick={() => setModalOpen(true)}
            />
          </div>
          {modalOpen && (
            <WarehouseSelectorModal
              isOpen={modalOpen}
              onSelectWarehouse={handleWarehouseSelect}
              onClose={() => setModalOpen(false)}
            />
          )}
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="max-w-[900px] mx-auto overflow-x-auto border rounded-lg shadow-lg p-5">
        <ItemSection
          items={grnData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onWarehouseSelect={handleItemWarehouseSelect}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea name="remarks" value={grnData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="taxableAmount"
            value={grnData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input type="number" name="rounding" value={grnData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST</label>
          <input type="number" name="gstTotal" value={grnData.gstTotal || 0} readOnly className="w-full p-2 border rounded bg-gray-100" />
        </div>
        <div>
          <label className="block mb-2 font-medium">Total Amount</label>
          <input type="number" name="grandTotal" value={grnData.grandTotal || 0} readOnly className="w-full p-2 border rounded bg-gray-100" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button onClick={handleConvertGRN} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-400">
          Convert to GRN
        </button>
        <button onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>
      {isCopied && (
        <div className="flex items-center space-x-2 text-green-600">
          <FaCheckCircle />
          <span>GRN data loaded from copy.</span>
        </div>
      )}
    </div>
  );
}
