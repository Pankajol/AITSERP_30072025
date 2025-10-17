"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import { FaCheckCircle } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Demo supplier suggestions.
const demoSuggestions = [
  { _id: "demo1", name: "Demo Supplier One", code: "DS1", contactPerson: "Alice" },
  { _id: "demo2", name: "Demo Supplier Two", code: "DS2", contactPerson: "Bob" },
  { _id: "demo3", name: "Demo Supplier Three", code: "DS3", contactPerson: "Charlie" },
];

// Updated initial state for Purchase Quotation (invoiceType is set to "Normal" by default).
const initialPurchaseQuotationState = {
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      orderedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      stockAdded: false,
      managedBy: "",
      batches: [],
      qualityCheckDetails: [],
      removalReason: "",
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  // Hidden field: invoiceType is preset as "Normal"
  invoiceType: "Normal",
};

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

export default function PurchaseQuotationForm() {
  const [quotationData, setQuotationData] = useState(initialPurchaseQuotationState);
  const [isCopied, setIsCopied] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const router = useRouter();
  const parentRef = useRef(null);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);

  // Handler to update a specific item's warehouse.
  const handleWarehouseSelect = (warehouse) => {
    if (selectedItemIndex !== null) {
      setQuotationData((prev) => {
        const updatedItems = [...prev.items];
        updatedItems[selectedItemIndex].warehouse = warehouse._id;
        updatedItems[selectedItemIndex].warehouseName = warehouse.warehouseName;
        updatedItems[selectedItemIndex].warehouseCode = warehouse.warehouseCode;
        return { ...prev, items: updatedItems };
      });
    }
    setWarehouseModalOpen(false);
    setSelectedItemIndex(null);
  };

  // Auto-fill Quotation data from sessionStorage if available.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = sessionStorage.getItem("purchaseQuotationData");
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setQuotationData(parsedData);
          setIsCopied(true);
          sessionStorage.removeItem("purchaseQuotationData");
        } catch (error) {
          console.error("Error parsing purchaseQuotationData:", error);
          toast.error("Error loading saved Purchase Quotation data.");
        }
      }
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setQuotationData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSupplierSelect = useCallback((selectedSupplier) => {
    setSupplier(selectedSupplier);
    setQuotationData((prev) => ({
      ...prev,
      supplierCode: selectedSupplier.supplierCode || "",
      supplierName: selectedSupplier.supplierName || "",
      contactPerson: selectedSupplier.contactPersonName || "",
    }));
  }, []);

  useEffect(() => {
    if (quotationData.supplierName) {
      const matchingSupplier = demoSuggestions.find(
        (s) => s.name.toLowerCase() === quotationData.supplierName.toLowerCase()
      );
      if (matchingSupplier) {
        setQuotationData((prev) => ({
          ...prev,
          supplierCode: matchingSupplier.code,
          contactPerson: matchingSupplier.contactPerson,
        }));
      }
    }
  }, [quotationData.supplierName]);

  // Update item fields.
  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setQuotationData((prev) => {
      const updatedItems = [...prev.items];
      const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "tdsAmount"];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };

      // Recalculate derived values.
      const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstRate = 0, taxOption = "GST" } = updatedItems[index];
      const priceAfterDiscount = unitPrice - discount;
      const totalAmount = quantity * priceAfterDiscount + itemFreight;
      updatedItems[index].priceAfterDiscount = priceAfterDiscount;
      updatedItems[index].totalAmount = totalAmount;
      if (taxOption === "IGST") {
        updatedItems[index].igstAmount = totalAmount * (gstRate / 100);
        updatedItems[index].gstAmount = 0;
        updatedItems[index].cgstAmount = 0;
        updatedItems[index].sgstAmount = 0;
      } else {
        updatedItems[index].cgstAmount = totalAmount * ((gstRate / 2) / 100);
        updatedItems[index].sgstAmount = totalAmount * ((gstRate / 2) / 100);
        updatedItems[index].gstAmount = updatedItems[index].cgstAmount + updatedItems[index].sgstAmount;
        updatedItems[index].igstAmount = 0;
      }
      return { ...prev, items: updatedItems };
    });
  }, []);

  // When an item is selected.
  const handleItemSelect = useCallback((index, selectedItem) => {
    console.log("Selected item:", selectedItem);
    setQuotationData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        item: selectedItem._id,
        itemCode: selectedItem.itemCode || "",
        itemName: selectedItem.itemName,
        itemDescription: selectedItem.description || "",
        unitPrice: selectedItem.unitPrice || 0,
        discount: selectedItem.discount || 0,
        freight: selectedItem.freight || 0,
        gstRate: selectedItem.gstType || 0,
        taxOption: "GST",
        quantity: 1,
        priceAfterDiscount: (selectedItem.unitPrice || 0) - (selectedItem.discount || 0),
        totalAmount:
          1 * ((selectedItem.unitPrice || 0) - (selectedItem.discount || 0)) +
          (selectedItem.freight || 0),
        igstAmount: 0,
        managedBy: selectedItem.managedBy,
        batches:
          selectedItem.managedBy && selectedItem.managedBy.toLowerCase() === "batch"
            ? []
            : [],
        qualityCheckDetails:
          selectedItem.qualityCheckDetails && selectedItem.qualityCheckDetails.length > 0
            ? selectedItem.qualityCheckDetails
            : [
                { parameter: "Weight", min: "", max: "", actualValue: "" },
                { parameter: "Dimension", min: "", max: "", actualValue: "" },
              ],
        removalReason: "",
      };
      return { ...prev, items: newItems };
    });
  }, []);

  // Add a new item row.
  const addItemRowHandler = useCallback(() => {
    setQuotationData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          orderedQuantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstRate: 0,
          taxOption: "GST",
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          tdsAmount: 0,
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          stockAdded: false,
          managedBy: "",
          batches: [],
          qualityCheckDetails: [
            { parameter: "Weight", min: "", max: "", actualValue: "" },
            { parameter: "Dimension", min: "", max: "", actualValue: "" },
          ],
          removalReason: "",
        },
      ],
    }));
  }, []);

  // Summary Calculation.
  useEffect(() => {
    const totalBeforeDiscountCalc = quotationData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return acc + (unitPrice - discount) * quantity;
    }, 0);
    const totalItemsCalc = quotationData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0);
    const gstTotalCalc = quotationData.items.reduce((acc, item) => {
      if (item.taxOption === "IGST") {
        return acc + (parseFloat(item.igstAmount) || 0);
      }
      return acc + (parseFloat(item.gstAmount) || 0);
    }, 0);
    const overallFreight = parseFloat(quotationData.freight) || 0;
    const roundingCalc = parseFloat(quotationData.rounding) || 0;
    const totalDownPaymentCalc = parseFloat(quotationData.totalDownPayment) || 0;
    const appliedAmountsCalc = parseFloat(quotationData.appliedAmounts) || 0;
    const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
    const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);
    setQuotationData((prev) => ({
      ...prev,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstTotal: gstTotalCalc,
      grandTotal: grandTotalCalc,
      openBalance: openBalanceCalc,
    }));
  }, [
    quotationData.items,
    quotationData.freight,
    quotationData.rounding,
    quotationData.totalDownPayment,
    quotationData.appliedAmounts,
  ]);

  // Load PO copy data from sessionStorage.
  useEffect(() => {
    async function loadPOCopyData() {
      if (typeof window !== "undefined") {
        const poData = sessionStorage.getItem("purchaseOrderData");
        if (poData) {
          try {
            const parsedData = JSON.parse(poData);
            // Set invoiceType to "POCopy"
            parsedData.invoiceType = "POCopy";
            for (let i = 0; i < parsedData.items.length; i++) {
              let item = parsedData.items[i];
              if (!item.managedBy || item.managedBy.trim() === "") {
                const res = await axios.get(`/api/items/${item.item}`);
                if (res.data.success) {
                  const masterData = res.data.data;
                  item.managedBy = masterData.managedBy;
                  console.log(`Fetched managedBy for PO item ${item.itemCode}:`, masterData.managedBy);
                }
              }
            }
            parsedData.items = parsedData.items.map((item) => {
              if (item._id) delete item._id;
              return {
                ...item,
                allowedQuantity: item.allowedQuantity || item.quantity,
                managedBy: item.managedBy,
                batches:
                  item.managedBy && item.managedBy.toLowerCase() === "batch"
                    ? item.batches && item.batches.length > 0
                      ? item.batches.map(b => ({
                          batchNumber: b.batchNumber || "",
                          expiryDate: b.expiryDate || "",
                          manufacturer: b.manufacturer || "",
                          batchQuantity: Number(b.batchQuantity) || 0,
                        }))
                      : [
                          {
                            batchNumber: "",
                            expiryDate: "",
                            manufacturer: "",
                            batchQuantity: 0,
                          },
                        ]
                    : [],
                gstRate: item.gstRate || 0,
                taxOption: item.taxOption || "GST",
                igstRate:
                  item.taxOption === "IGST" && (!item.igstRate || parseFloat(item.igstRate) === 0)
                    ? item.gstRate
                    : item.igstRate || 0,
                cgstRate: item.taxOption === "GST" && !item.cgstRate ? item.gstRate / 2 : item.cgstRate || 0,
                sgstRate: item.taxOption === "GST" && !item.sgstRate ? item.gstRate / 2 : item.sgstRate || 0,
                qualityCheckDetails:
                  item.qualityCheckDetails && item.qualityCheckDetails.length > 0
                    ? item.qualityCheckDetails
                    : [
                        { parameter: "Weight", min: "", max: "", actualValue: "" },
                        { parameter: "Dimension", min: "", max: "", actualValue: "" },
                      ],
              };
            });
            if (parsedData._id) {
              parsedData.purchaseOrderId = parsedData._id;
              delete parsedData._id;
            }
            setQuotationData(parsedData);
            sessionStorage.removeItem("purchaseOrderData");
            setIsCopied(true);
            toast.info("PO data loaded into Purchase Quotation form.");
          } catch (error) {
            console.error("Error parsing PO data:", error);
          }
        }
      }
    }
    loadPOCopyData();
  }, []);

  // Load GRN copy data from sessionStorage.
  useEffect(() => {
    async function loadGRNCopyData() {
      if (typeof window !== "undefined") {
        const grnCopyData = sessionStorage.getItem("grnCopyData");
        if (grnCopyData) {
          try {
            const parsedData = JSON.parse(grnCopyData);
            parsedData.invoiceType = "GRNCopy";
            for (let i = 0; i < parsedData.items.length; i++) {
              let item = parsedData.items[i];
              if (!item.managedBy || item.managedBy.trim() === "") {
                const res = await axios.get(`/api/items/${item.item}`);
                if (res.data.success) {
                  const masterData = res.data.data;
                  item.managedBy = masterData.managedBy;
                  console.log(`Fetched managedBy for GRN item ${item.itemCode}:`, masterData.managedBy);
                }
              }
            }
            parsedData.items = parsedData.items.map((item) => {
              if (item._id) delete item._id;
              return {
                ...item,
                allowedQuantity: item.allowedQuantity || item.quantity,
                managedBy: item.managedBy,
                batches:
                  item.managedBy && item.managedBy.toLowerCase() === "batch"
                    ? item.batches && item.batches.length > 0
                      ? item.batches.map(b => ({
                          batchNumber: b.batchNumber || "",
                          expiryDate: b.expiryDate || "",
                          manufacturer: b.manufacturer || "",
                          batchQuantity: Number(b.batchQuantity) || 0,
                        }))
                      : [
                          {
                            batchNumber: "",
                            expiryDate: "",
                            manufacturer: "",
                            batchQuantity: 0,
                          },
                        ]
                    : [],
                gstRate: item.gstRate || 0,
                taxOption: item.taxOption || "GST",
                igstRate:
                  item.taxOption === "IGST" && (!item.igstRate || parseFloat(item.igstRate) === 0)
                    ? item.gstRate
                    : item.igstRate || 0,
                cgstRate: item.taxOption === "GST" && !item.cgstRate ? item.gstRate / 2 : item.cgstRate || 0,
                sgstRate: item.taxOption === "GST" && !item.sgstRate ? item.gstRate / 2 : item.sgstRate || 0,
                qualityCheckDetails:
                  item.qualityCheckDetails && item.qualityCheckDetails.length > 0
                    ? item.qualityCheckDetails
                    : [
                        { parameter: "Weight", min: "", max: "", actualValue: "" },
                        { parameter: "Dimension", min: "", max: "", actualValue: "" },
                      ],
              };
            });
            if (parsedData._id) {
              parsedData.purchaseOrderId = parsedData._id;
              delete parsedData._id;
            }
            setQuotationData(parsedData);
            sessionStorage.removeItem("grnCopyData");
            setIsCopied(true);
            toast.info("GRN copy data loaded into Purchase Quotation form.");
          } catch (error) {
            console.error("Error parsing GRN copy data:", error);
          }
        }
      }
    }
    loadGRNCopyData();
  }, []);

  // handleCopyFrom: copies current quotationData to sessionStorage.
  const handleCopyFrom = useCallback(() => {
    const modifiedData = {
      ...quotationData,
      items: quotationData.items.map((item) => ({
        ...item,
        managedBy: item.managedBy,
        batches:
          item.managedBy && item.managedBy.toLowerCase() === "batch"
            ? item.batches || []
            : [],
        gstRate: item.gstType,
        qualityCheckDetails:
          item.qualityCheckDetails && item.qualityCheckDetails.length > 0
            ? item.qualityCheckDetails
            : [
                { parameter: "Weight", min: "", max: "", actualValue: "" },
                { parameter: "Dimension", min: "", max: "", actualValue: "" },
              ],
      })),
    };
    sessionStorage.setItem("purchaseQuotationData", JSON.stringify(modifiedData));
    toast.success("Data copied from source!");
  }, [quotationData]);

  const handleSaveQuotation = useCallback(async () => {
    // Validate each item.
    // for (let item of quotationData.items) {
    //   const allowedQty = Number(item.allowedQuantity) || 0;
    //   if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
    //     toast.error(`For item ${item.itemCode}, quotation quantity (${item.quantity}) exceeds allowed quantity (${allowedQty}).`);
    //     return;
    //   }
    //   // For batch-managed items, ensure total batch quantity equals item quantity.
    //   if (item.managedBy && item.managedBy.toLowerCase() === "batch") {
    //     const totalBatchQty = (item.batches || []).reduce((sum, batch) => sum + (Number(batch.batchQuantity) || 0), 0);
    //     if (totalBatchQty !== Number(item.quantity)) {
    //       toast.error(`Batch quantity mismatch for item ${item.itemCode}: total batch quantity (${totalBatchQty}) does not equal item quantity (${item.quantity}).`);
    //       return;
    //     }
    //  }
    // }
    console.log("Purchase Quotation Data:", quotationData);
    try {
      const response = await axios.post("/api/purchase-quotation", quotationData, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success(`Purchase Quotation saved successfully. ID: ${response.data.quotationId}`);
      setQuotationData(initialPurchaseQuotationState);
    } catch (error) {
      console.error("Error saving Purchase Quotation:", error);
      toast.error(error.response?.data?.message || "Error saving Purchase Quotation");
    }
  }, [quotationData]);

  const handleCancel = useCallback(() => {
    setQuotationData(initialPurchaseQuotationState);
    toast.info("Purchase Quotation form cleared.");
  }, []);

  const handleCopyTo = useCallback((destination) => {
    if (destination === "GRN") {
      sessionStorage.setItem("purchaseQuotationData", JSON.stringify(quotationData));
      router.push("/users/GRN");
    } else if (destination === "PurchaseInvoice") {
      sessionStorage.setItem("purchaseQuotationData", JSON.stringify(quotationData));
      router.push("/users/purchase-invoice");
    } else if (destination === "DebitNote") {
      sessionStorage.setItem("purchaseQuotationData", JSON.stringify(quotationData));
      router.push("/users/debit-note");
    }
  }, [quotationData, router]);

  const CopyToDropdown = ({ handleCopyTo, defaultLabel }) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(defaultLabel);
    const toggleDropdown = () => setOpen((prev) => !prev);
    const onSelect = (option) => {
      setSelected(option);
      setOpen(false);
      handleCopyTo(option);
    };
    const ref = useRef(null);
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (
      <div ref={ref} className="relative inline-block text-left">
        <button onClick={toggleDropdown} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300 focus:outline-none shadow">
          {selected}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
            <button onClick={() => onSelect("GRN")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              GRN
            </button>
            <button onClick={() => onSelect("PurchaseInvoice")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              Purchase Invoice
            </button>
            <button onClick={() => onSelect("DebitNote")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
              Debit Note
            </button>
          </div>
        )}
      </div>
    );
  };
  CopyToDropdown.defaultProps = {
    handleCopyTo: () => {},
    defaultLabel: "Copy To",
  };

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <ToastContainer />
      <h1 className="text-2xl font-bold mb-4">Purchase Quotation Form</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          {isCopied ? (
            <div>
              <label className="block mb-2 font-medium">Supplier Name</label>
              <input
                type="text"
                name="supplierName"
                value={quotationData.supplierName || ""}
                onChange={handleInputChange}
                placeholder="Enter supplier name"
                className="w-full p-2 border rounded"
              />
            </div>
          ) : (
            <div>
              <label className="block mb-2 font-medium">Supplier Name</label>
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            </div>
          )}
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input type="text" name="supplierCode" value={quotationData.supplierCode || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input type="text" name="contactPerson" value={quotationData.contactPerson || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input type="text" name="refNumber" value={quotationData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select name="status" value={quotationData.status || ""} onChange={handleInputChange} className="w-full p-2 border rounded">
              <option value="">Select status (optional)</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input type="date" name="postingDate" value={formatDateForInput(quotationData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input type="date" name="validUntil" value={formatDateForInput(quotationData.validUntil)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Delivery Date</label>
            <input type="date" name="documentDate" value={formatDateForInput(quotationData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={quotationData.items}
          onItemChange={handleItemChange}
          onItemSelect={handleItemSelect}
          onWarehouseSelect={(index) => setSelectedItemIndex(index)}
          onAddItem={(!isCopied) ? addItemRowHandler : undefined}
        />
      </div>
      {/* Warehouse Modal would be rendered here if implemented */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input type="text" name="salesEmployee" value={quotationData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea name="remarks" value={quotationData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="taxableAmount"
            value={quotationData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input type="number" name="rounding" value={quotationData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            name="gstTotal"
            value={quotationData.items.reduce((acc, item) => {
              if (item.taxOption === "IGST") {
                return acc + (parseFloat(item.igstAmount) || 0);
              }
              return acc + (parseFloat(item.gstAmount) || 0);
            }, 0)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Total Amount</label>
          <input type="number" name="grandTotal" value={quotationData.grandTotal || 0} readOnly className="w-full p-2 border rounded bg-gray-100" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSaveQuotation}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Save Quotation
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={handleCopyFrom}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Copy From
        </button>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-center">
            <CopyToDropdown
              handleCopyTo={handleCopyTo}
              defaultLabel={supplier ? `Copy To (${supplier.name})` : "Copy To"}
            />
          </div>
        </div>
      </div>
      {isCopied && (
        <div className="flex items-center space-x-2 text-green-600">
          <FaCheckCircle />
          <span>Purchase Quotation data loaded from copy.</span>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
