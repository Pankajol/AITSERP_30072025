"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection"; // Ensure this component is correctly implemented
import CustomerSearch from "@/components/CustomerSearch"; // Ensure this component is correctly implemented
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// IMPORTANT: This import MUST be your advanced multi-batch modal component
import BatchAllocationModal from "@/components/MultiBatchModalbtach"; // This is the correct path and component

/* ------------------------------------------------------------------ */
/* NOTE: The inline 'BatchModal' function (old, single-batch modal)  */
/* has been ENTIRELY REMOVED from this file to prevent conflicts.     */
/* All batch allocation now uses 'BatchAllocationModal'.              */
/* ------------------------------------------------------------------ */


// Initial state for Sales Invoice.
const initialInvoiceState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "", // Invoice Number.
  salesEmployee: "",
  status: "Pending",
  orderDate: "",
  expectedDeliveryDate: "",
  items: [
    {
      item: "", // Stores item ObjectId from DB
      itemCode: "",
      itemId: "", // Optional: duplicate of 'item' for convenience
      itemName: "",
      itemDescription: "",
      quantity: 0, // Total quantity for the item.
      allowedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0, // Ensure these are initialized for calculations
      sgstAmount: 0, // Ensure these are initialized for calculations
      igstAmount: 0,
      tdsAmount: 0,
      batches: [], // Array to store allocated batch details {batchCode, allocatedQuantity, etc.}
      warehouse: "", // Stores warehouse ObjectId from DB
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "", // Optional: duplicate of 'warehouse'
      errorMessage: "",
      taxOption: "GST",
      managedByBatch: false, // Set default to false, will be set true if item.managedBy is 'batch'
      gstRate: 0,
      managedBy: "", // Stores 'batch', 'serial', or 'none' from item master
    },
  ],
  remarks: "",
  freight: 0,
  rounding: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  fromQuote: false,
  attachments: [], // For storing attachment metadata
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function SalesInvoiceFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesInvoiceEditPage />
    </Suspense>
  );
}

function SalesInvoiceEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [attachments, setAttachments] = useState([]); // New files to upload
  const [existingFiles, setExistingFiles] = useState([]); // Files already uploaded (from editId)
  const [removedFiles, setRemovedFiles] = useState([]); // Files to be marked for removal on update

  const [isReadOnly, setIsReadOnly] = useState(false); // Controls if form fields are read-only

  const [formData, setFormData] = useState(initialInvoiceState);
  const [modalItemIndex, setModalItemIndex] = useState(null); // Index of the item for which batch modal is open
  const [batchModalOptions, setBatchModalOptions] = useState([]); // State to hold available batches fetched for the modal

  const [isCopied, setIsCopied] = useState(false); // Flag indicating if form data was copied

  // Effect to fetch existing Sales Invoice data if in edit mode
  useEffect(() => {
    if (!editId) return;

    const fetchSalesInvoice = async () => {
      try {
        // You might want a loading state here: setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Authentication required to fetch sales invoice.");
          router.push("/login");
          return;
        }

        const res = await axios.get(`/api/sales-invoice/${editId}`, {
          headers: { Authorization: `Bearer ${token}` }, // Add authorization header
        });

        if (res.data.success) {
          const record = res.data.data;
          setFormData({
            ...record,
            orderDate: formatDateForInput(record.orderDate),
            expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
            // Ensure items' managedByBatch and batches array are correctly structured
            items: record.items.map(item => ({
              ...item,
              managedByBatch: item.managedBy && item.managedBy.toLowerCase() === 'batch',
              batches: item.managedBy && item.managedBy.toLowerCase() === 'batch' && Array.isArray(item.batches)
                ? item.batches.map(b => ({
                    batchCode: b.batchCode || b.batchNumber || '',
                    allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0,
                    expiryDate: b.expiryDate || null,
                    manufacturer: b.manufacturer || '',
                    unitPrice: Number(b.unitPrice) || 0,
                  }))
                : [],
            }))
          });
          // Set existing files from the fetched record
          if (record.attachments && Array.isArray(record.attachments)) {
            setExistingFiles(record.attachments);
          } else {
            setExistingFiles([]);
          }
          // Optionally set isReadOnly based on document status (e.g., if status is "Confirmed")
          // if (record.status === "Confirmed") setIsReadOnly(true);

        } else {
          toast.error(res.data.message || "Sales invoice record not found");
        }
      } catch (err) {
        console.error("Error fetching sales invoice for edit:", err.response?.data?.message || err.message);
        toast.error(err.response?.data?.message || "Error fetching sales invoice data");
      } finally {
        // setLoading(false);
      }
    };

    fetchSalesInvoice();
  }, [editId, router]);


  // Effect to handle copying data from session storage (e.g., from Sales Quote or another Sales Invoice)
  useEffect(() => {
    if (typeof window === "undefined") return; // Ensure running in browser environment

    const salesInvoiceKey = "SalesInvoiceData"; // Key for a Sales Invoice's own copy
    const salesQuoteKey = "SalesQuoteData"; // Key for copying from Sales Quote

    let storedData = sessionStorage.getItem(salesInvoiceKey);
    let isQuoteCopy = false;

    if (!storedData) { // If no SalesInvoiceData found, check for SalesQuoteData
      storedData = sessionStorage.getItem(salesQuoteKey);
      if (storedData) isQuoteCopy = true;
    }

    if (!storedData) return; // No data to copy

    try {
      const parsedData = JSON.parse(storedData);
      sessionStorage.removeItem(salesInvoiceKey); // Clear used session storage keys
      sessionStorage.removeItem(salesQuoteKey);

      // Map common fields from source document to Sales Invoice structure
      const mappedFormData = {
        ...initialInvoiceState, // Start with a fresh initial state
        ...parsedData, // Overlay all parsed data
        refNumber: parsedData.refNumber ? `INV-${parsedData.refNumber}` : "", // Prefix invoice number
        status: "Pending", // New invoice always starts as Pending
        orderDate: formatDateForInput(parsedData.orderDate || new Date()),
        expectedDeliveryDate: formatDateForInput(parsedData.expectedDeliveryDate || parsedData.dueDate || new Date()),
        customerCode: parsedData.customer?.customerCode || parsedData.customerCode || "",
        customerName: parsedData.customer?.customerName || parsedData.customerName || "",
        contactPerson: parsedData.customer?.contactPersonName || parsedData.contactPerson || "",
        salesEmployee: parsedData.salesEmployee || "",
        remarks: parsedData.remarks || "",
        freight: Number(parsedData.freight) || 0,
        rounding: Number(parsedData.rounding) || 0,
        totalDownPayment: Number(parsedData.totalDownPayment) || 0,
        appliedAmounts: Number(parsedData.appliedAmounts) || 0,
        fromQuote: isQuoteCopy,
      };

      // Map and normalize item data, ensuring correct types and defaults
      mappedFormData.items = (parsedData.items || []).map((item) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const freight = parseFloat(item.freight) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;
        const taxOption = item.taxOption || "GST";
        const managedBy = item.managedBy || "";

        const priceAfterDiscount = unitPrice - discount;
        const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

        let calculatedCgstAmount = 0;
        let calculatedSgstAmount = 0;
        let calculatedIgstAmount = 0;
        let calculatedGstAmount = 0;

        if (taxOption === "IGST") {
          calculatedIgstAmount = totalAmountBeforeTax * (gstRate / 100);
          calculatedGstAmount = calculatedIgstAmount;
        } else {
          const halfGstRate = gstRate / 2;
          calculatedCgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
          calculatedSgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
          calculatedGstAmount = calculatedCgstAmount + calculatedSgstAmount;
        }

        const copiedBatches = (managedBy.toLowerCase() === "batch" && Array.isArray(item.batches))
            ? item.batches.map(b => ({
                batchCode: b.batchCode || b.batchNumber || '',
                allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0,
                expiryDate: b.expiryDate || null,
                manufacturer: b.manufacturer || '',
                unitPrice: Number(b.unitPrice) || 0,
            }))
            : [];

        return {
          ...item, // Keep other item properties
          // Ensure item, warehouse IDs are extracted from potentially populated objects
          item: item.item?._id || item.item || "",
          itemCode: item.item?.itemCode || item.itemCode || "",
          itemName: item.item?.itemName || item.itemName || "",
          itemDescription: item.item?.description || item.itemDescription || "",
          warehouse: item.warehouse?._id || item.warehouse || "",
          warehouseName: item.warehouse?.warehouseName || item.warehouseName || "",
          warehouseCode: item.warehouse?.warehouseCode || item.warehouseCode || "",
          quantity: quantity,
          unitPrice: unitPrice,
          discount: discount,
          freight: freight,
          gstRate: gstRate,
          gstType: item.gstType || 0,
          taxOption: taxOption,
          priceAfterDiscount: priceAfterDiscount,
          totalAmount: totalAmountBeforeTax,
          gstAmount: calculatedGstAmount,
          cgstAmount: calculatedCgstAmount,
          sgstAmount: calculatedSgstAmount,
          igstAmount: calculatedIgstAmount,
          tdsAmount: item.tdsAmount || 0,
          managedBy: managedBy,
          managedByBatch: managedBy.toLowerCase() === "batch",
          batches: copiedBatches, // Retain copied batch allocations
          errorMessage: "",
        };
      });

      // Handle attachments from copied data (stored in parsedData.attachments)
      if (Array.isArray(parsedData.attachments)) {
        setExistingFiles(parsedData.attachments); // Set these as existing files for the new form
      } else {
        setExistingFiles([]);
      }

      setFormData(mappedFormData);
      setIsCopied(true);
      toast.success("Data copied successfully!");
    }
    catch (err) {
      console.error("❌ Error parsing copied data:", err);
      toast.error(`Failed to copy sales invoice data: ${err.message || 'Unknown error'}`);
    }
  }, []);


  // Effect to recalculate summary totals whenever relevant formData changes
  useEffect(() => {
    const items = formData.items ?? [];

    const totalBeforeDiscountCalc = items.reduce(
      (acc, it) => {
        const up = Number(it.unitPrice) || 0;
        const disc = Number(it.discount) || 0;
        const qty = Number(it.quantity) || 0;
        return acc + (up - disc) * qty;
      },
      0,
    ) || 0;

    const gstTotalCalc = items.reduce((acc, it) => {
      if (it.taxOption === "IGST")
        return acc + (Number(it.igstAmount) || 0);
      return acc + (Number(it.cgstAmount) || 0) + (Number(it.sgstAmount) || 0);
    }, 0) || 0;

    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grandTotal =
      totalBeforeDiscountCalc + gstTotalCalc + freight + rounding;

    setFormData((p) => ({
      ...p,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstTotal: gstTotalCalc,
      grandTotal: grandTotal,
      openBalance:
        grandTotal -
        ((Number(p.totalDownPayment) || 0) +
          (Number(p.appliedAmounts) || 0)),
    }));
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
  ]);


  // Helper function to render previews of newly selected files
  const renderNewFilesPreview = () => (
    attachments.length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
        {attachments.map((file, idx) => {
          if (file instanceof File) {
            const url = URL.createObjectURL(file);
            const isPDF = file.type === "application/pdf";
            return (
              <div key={idx} className="relative border rounded p-2 text-center bg-slate-300">
                {isPDF ? (
                  <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                ) : (
                  <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
                )}
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                >
                  ×
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>
    )
  );


  // Generic handler for changes in main form fields
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handler for customer selection from CustomerSearch component
  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  // Helper function for ItemSection to show toast on quantity change for batch-managed items
  const showInfoOnQuantityChange = useCallback((item) => {
    if (item.managedByBatch) {
      toast.info(`Quantity changed for '${item.itemName}'. Please re-allocate batches.`);
    }
  }, []);

  // Handler for changes within an item row
  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[index] }; // Copy for comparison

      updatedItems[index] = { ...currentItem, [name]: value }; // Apply new value

      // Recalculate item-level totals and taxes
      const item = updatedItems[index]; // Use the now updated item
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0; // Use the new quantity
      const freight = parseFloat(item.freight) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      const taxOption = item.taxOption || "GST";

      const priceAfterDiscount = unitPrice - discount;
      const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

      let calculatedCgstAmount = 0;
      let calculatedSgstAmount = 0;
      let calculatedIgstAmount = 0;
      let calculatedGstAmount = 0;

      if (taxOption === "IGST") {
        calculatedIgstAmount = totalAmountBeforeTax * (gstRate / 100);
        calculatedGstAmount = calculatedIgstAmount;
      } else {
        const halfGstRate = gstRate / 2;
        calculatedCgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
        calculatedSgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
        calculatedGstAmount = calculatedCgstAmount + calculatedSgstAmount;
      }

      updatedItems[index] = {
          ...updatedItems[index],
          priceAfterDiscount,
          totalAmount: totalAmountBeforeTax,
          gstAmount: calculatedGstAmount,
          cgstAmount: calculatedCgstAmount,
          sgstAmount: calculatedSgstAmount,
          igstAmount: calculatedIgstAmount,
      };

      // Clear batches and show toast only if quantity actually changed for a batch-managed item
      if (name === 'quantity' && item.managedByBatch && parseFloat(value) !== currentItem.quantity) {
          updatedItems[index].batches = []; // Clear existing batch allocations
          showInfoOnQuantityChange(item); // Show toast notification
      }

      return { ...prev, items: updatedItems };
    });
  }, [showInfoOnQuantityChange]); // Add showInfoOnQuantityChange to dependencies

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        { ...initialInvoiceState.items[0] }, // Add new item with initial state structure
        ...prev.items, // Add new item at the top
      ],
    }));
  }, []);

  // Handler for item selection from ItemSection component
  const handleItemSelect = useCallback(async (index, selectedItem) => {
    if (!selectedItem._id) {
      toast.error("Selected item does not have a valid ID.");
      return;
    }

    let managedByValue = selectedItem.managedBy;
    if (!managedByValue || managedByValue.trim() === "") {
      try {
        const res = await axios.get(`/api/items/${selectedItem._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.data.success) {
          managedByValue = res.data.data.managedBy;
          console.log(`Fetched managedBy for ${selectedItem.itemCode}:`, managedByValue);
        }
      } catch (error) {
        console.error("Error fetching item master details:", error.response?.data?.message || error.message);
        toast.error(`Error fetching item details: ${error.response?.data?.message || error.message}`);
        managedByValue = ""; // Fallback
      }
    } else {
      console.log(`Using managedBy from selected item for ${selectedItem.itemCode}:`, managedByValue);
    }

    const unitPrice = Number(selectedItem.unitPrice) || 0;
    const discount = Number(selectedItem.discount) || 0;
    const freight = Number(selectedItem.freight) || 0;
    const quantity = 1; // Default quantity when selecting an item
    const taxOption = selectedItem.taxOption || "GST";
    const gstRate = selectedItem.gstRate ? Number(selectedItem.gstRate) : 0;

    const priceAfterDiscount = unitPrice - discount;
    const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let gstAmount = 0;

    if (taxOption === "IGST") {
      igstAmount = totalAmountBeforeTax * (gstRate / 100);
      gstAmount = igstAmount;
    } else {
      const halfGstRate = gstRate / 2;
      cgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
      sgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
      gstAmount = cgstAmount + sgstAmount;
    }

    const updatedItem = {
      item: selectedItem._id,
      itemCode: selectedItem.itemCode || "",
      itemId: selectedItem._id,
      itemName: selectedItem.itemName,
      itemDescription: selectedItem.description || "",
      quantity,
      allowedQuantity: selectedItem.allowedQuantity || 0,
      unitPrice,
      discount,
      freight,
      gstType: selectedItem.gstType || 0,
      gstRate,
      taxOption,
      priceAfterDiscount,
      totalAmount: totalAmountBeforeTax,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      managedBy: managedByValue,
      managedByBatch: managedByValue.toLowerCase() === "batch", // Set based on fetched/derived value
      batches: [], // Always initialize empty for new item selection, force re-allocation
      warehouse: selectedItem.warehouse || "",
      warehouseName: selectedItem.warehouseName || "",
      warehouseCode: selectedItem.warehouseCode || "",
      warehouseId: selectedItem.warehouseId || "",
      errorMessage: "",
      tdsAmount: 0,
    };

    setFormData((prev) => {
      const currentItems = [...prev.items];
      currentItems[index] = updatedItem;
      return { ...prev, items: currentItems };
    });
  }, []);


  // Batch update: Update allocated batches for a specific item using the BatchAllocationModal
  const handleUpdateBatch = useCallback((allocatedBatches) => {
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const targetItem = { ...updatedItems[modalItemIndex] };

      targetItem.batches = allocatedBatches.map(b => ({
          batchCode: b.batchCode || '',
          allocatedQuantity: Number(b.allocatedQuantity) || 0,
          expiryDate: b.expiryDate || null,
          manufacturer: b.manufacturer || '',
          unitPrice: Number(b.unitPrice) || 0,
          // `availableQuantity` is modal-specific; not needed in form data for submission
      }));

      updatedItems[modalItemIndex] = targetItem;
      return { ...prev, items: updatedItems };
    });
  }, [modalItemIndex]);


  // Function to open the Batch Allocation Modal
  const openBatchModal = useCallback(async (index) => {
    const currentItem = formData.items[index];
    // Pre-checks for opening modal
    if (!currentItem.item || !currentItem.warehouse) {
      toast.warn("Please select an Item and a Warehouse for this line item before allocating batches.");
      return;
    }
    if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== 'batch') {
      toast.warn(`Item '${currentItem.itemName || 'selected item'}' is not managed by batch. Cannot allocate batches.`);
      return;
    }
    if (currentItem.quantity <= 0) {
        toast.warn(`Please enter a quantity greater than 0 for '${currentItem.itemName}' before allocating batches.`);
        return;
    }

    console.log("Opening Batch Allocation Modal for item index:", index, "with item ID:", currentItem.item, "warehouse ID:", currentItem.warehouse);

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Authentication required to fetch inventory batches.");
            return;
        }
        const res = await axios.get(
            `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}`,
            { headers: { 'Authorization': `Bearer ${token}` } } // Add token
        );

        if (res.data.success) {
            setBatchModalOptions(res.data.data.batches || []); // Set the fetched batches
            setModalItemIndex(index); // Open modal after successful fetch
        } else {
            toast.error(res.data.message || "Failed to fetch available batches.");
        }
    } catch (error) {
        console.error("Error fetching available batches:", error.response?.data?.message || error.message);
        toast.error(`Error loading available batches: ${error.response?.data?.message || error.message}`);
    }
  }, [formData.items]); // Dependency on formData.items is fine, ensures latest item data


  // Submit handler for Sales Invoice
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required. Please log in.");
        router.push("/login");
        return;
      }

      // Basic form validation
      if (!formData.customerName || !formData.refNumber || formData.items.length === 0) {
        toast.error("Please fill in Customer Name, Invoice Number, and add at least one item.");
        return;
      }
      for (const item of formData.items) {
        if (!item.item || !item.warehouse) { // Ensure item and warehouse IDs are selected
          toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item and Warehouse selection.`);
          return;
        }
        if (!item.itemCode || !item.itemName || item.quantity <= 0 || item.unitPrice <= 0) {
          toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item Code, Item Name, Quantity (>0), and Unit Price (>0).`);
          return;
        }
        // Validate batch allocation for batch-managed items
        if (item.managedByBatch) {
            const allocatedTotal = item.batches.reduce((sum, batch) => sum + (Number(batch.allocatedQuantity) || 0), 0);
            if (allocatedTotal !== item.quantity) {
                toast.error(`Item '${item.itemName}' requires total allocated batch quantity (${allocatedTotal}) to match item quantity (${item.quantity}). Please re-allocate batches.`);
                return;
            }
            if (item.batches.length === 0 && item.quantity > 0) {
                toast.error(`Item '${item.itemName}' is batch-managed but no batches are allocated.`);
                return;
            }
        }
      }

      const dataToSend = new FormData();

      const formDataForApi = { ...formData };
      delete formDataForApi.attachments; // Exclude attachments from main JSON payload

      dataToSend.append("invoiceData", JSON.stringify(formDataForApi));

      attachments.forEach((file) => {
        dataToSend.append("newAttachments", file); // Key matches backend expectation
      });

      // Filter out files that were marked for removal
      const retainedExistingFiles = existingFiles.filter(
        (file) => !removedFiles.some(removed => removed.publicId === file.publicId || removed.fileUrl === file.fileUrl)
      );
      if (retainedExistingFiles.length > 0) {
        dataToSend.append("existingFiles", JSON.stringify(retainedExistingFiles));
      }

      if (removedFiles.length > 0) {
        dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl))); // Backend expects publicId or fileUrl for deletion
      }

      const url = editId ? `/api/sales-invoice/${editId}` : "/api/sales-invoice";
      const method = editId ? "put" : "post";

      const response = await axios({
        method,
        url,
        data: dataToSend,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data", // Essential for FormData
        },
      });

      if (response.data.success) {
          toast.success(editId ? "Sales Invoice updated successfully" : "Sales Invoice added successfully");
          if (!editId) {
            // Reset form for new entry after successful creation
            setFormData(initialInvoiceState);
            setAttachments([]);
            setExistingFiles([]);
            setRemovedFiles([]);
          } else {
            // Update existing files state with the fresh list from the backend response
            // (Assuming backend returns the updated document with new attachment info)
            setExistingFiles(response.data.salesInvoice?.attachments || []);
            setRemovedFiles([]);
            setAttachments([]);
          }
          router.push("/admin/sales-invoice-view"); // Redirect to view page
      } else {
          toast.error(response.data.message || "Operation failed.");
      }

    } catch (error) {
      console.error("Error saving sales invoice:", error);
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
      toast.error(`Failed to save Sales Invoice: ${errorMessage}`);
    }
  };

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Invoice" : "Create Sales Invoice"}
      </h1>

      {/* Customer Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            {isCopied || editId ? (
              <input
                type="text"
                name="customerName"
                value={formData.customerName || ""}
                readOnly={Boolean(isCopied || editId)}
                className={`w-full p-2 border rounded ${Boolean(isCopied || editId) ? 'bg-gray-100' : ''}`}
              />
            ) : (
              <CustomerSearch onSelectCustomer={handleCustomerSelect} />
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        {/* Additional Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4 md:mt-0">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || "Pending"}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Date</label>
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Expected Payment Date</label>
            <input
              type="date"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
          setFormData={setFormData}
          onItemSelect={handleItemSelect}
        />
      </div>

      {/* Batch Allocation Summary Section (for items managed by batch) */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Allocation Summary</h2>
        {formData.items.map((item, index) => {
          if (!item.managedBy || item.managedBy.toLowerCase() !== 'batch') {
            return null;
          }

          const totalAllocatedForCurrentItem = (item.batches || []).reduce(
            (sum, b) => sum + (Number(b.allocatedQuantity) || 0),
            0
          );

          return (
            <div key={index} className="border p-4 my-2 rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{item.itemName || `Item ${index + 1}`} (Required: {item.quantity})</span>
                <button
                  onClick={() => openBatchModal(index)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={!item.item || !item.warehouse || item.quantity <= 0}
                >
                  Allocate Batches
                </button>
              </div>

              {/* Display currently allocated batches for this item */}
              {item.batches && item.batches.length > 0 ? (
                <div className="mt-2 pl-4 text-sm">
                  <p className="font-medium mb-1">Current Allocations:</p>
                  <ul className="list-disc list-inside">
                    {item.batches.map((batch, idx) => (
                      <li key={idx} className="text-gray-700">
                        Batch: **{batch.batchCode || 'N/A'}** &mdash; Allocated: **{Number(batch.allocatedQuantity) || 0}**
                      </li>
                    ))}
                  </ul>
                  <p className={`mt-2 font-bold ${totalAllocatedForCurrentItem !== item.quantity ? "text-red-600" : "text-green-600"}`}>
                    Total Allocated: {totalAllocatedForCurrentItem} / {item.quantity}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic pl-4">No batches currently allocated for this item.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Remarks & Sales Employee */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          ></textarea>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={formData.totalBeforeDiscount.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            name="gstTotal"
            value={formData.gstTotal.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            name="grandTotal"
            value={formData.grandTotal.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>

      {/* Attachments Section */}
      <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
        <label className="font-medium block mb-2">Attachments</label>

        {existingFiles && existingFiles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border">
            {existingFiles.map((file, idx) => {
              const url = file.fileUrl;
              const name = file.fileName;
              const isPDF = file.fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

              return (
                <div key={idx} className="relative border rounded p-2 text-center bg-slate-200">
                  {isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                  ) : (
                    <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-xs mt-1 truncate"
                  >
                    {name}
                  </a>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
                        setRemovedFiles((prev) => [...(prev || []), file]);
                        toast.info(`Marked ${name} for removal.`);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
            No attachments available
          </div>
        )}

        {/* File Upload Input for New Attachments (only if not read-only) */}
        {!isReadOnly && (
          <>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setAttachments((prev) => {
                  const uniqueMap = new Map(prev.map((f) => [f.name + f.size, f]));
                  files.forEach((f) => uniqueMap.set(f.name + f.size, f));
                  return [...uniqueMap.values()];
                });
                e.target.value = "";
              }}
              className="border px-3 py-2 w-full mt-2 rounded"
            />
            {renderNewFilesPreview()}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          {editId ? "Update Sales Invoice" : "Add Sales Invoice"}
        </button>
        <button
          onClick={() => router.push("/admin/sales-invoice-view")}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Corrected: Include existingFiles in the data copied to sessionStorage
            sessionStorage.setItem(
              "SalesInvoiceData",
              JSON.stringify({ ...formData, attachments: existingFiles })
            );
            toast.success("Current form data copied to session storage!");
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
        >
          Copy Current Form
        </button>
      </div>

      {/* Render the Batch Allocation Modal if an item is selected for batch editing */}
      {modalItemIndex !== null && (
        <BatchAllocationModal // Correctly using the imported BatchAllocationModal
          itemsbatch={{
            itemId: formData.items[modalItemIndex].item,
            sourceWarehouse: formData.items[modalItemIndex].warehouse,
            itemName: formData.items[modalItemIndex].itemName,
            qty: formData.items[modalItemIndex].quantity,
            currentAllocations: formData.items[modalItemIndex].batches,
          }}
          batchOptions={batchModalOptions} // Passing the fetched batch options
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={handleUpdateBatch}
        />
      )}

      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}

export default SalesInvoiceFormWrapper;


// "use client";
// import React, { useState, useEffect, useCallback  } from "react";
// import { Suspense, } from "react";
// import { useRouter,useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // BatchModal component: Fetches available batches for the given item.
// function BatchModal({ itemsbatch, onClose, onUpdateBatch }) {
//   const {
//     item,
//     warehouse,
//     itemName,
//     quantity: parentQuantity,
//   } = itemsbatch;

//   const effectiveItemId = item;
//   const effectiveWarehouseId = warehouse;

//   const [inventory, setInventory] = useState(null);
//   const [selectedBatch, setSelectedBatch] = useState(null);
//   const [quantity, setQuantity] = useState(
//     parentQuantity === 1 ? 1 : 1,
//   );
//   const [hasConfirmed, setHasConfirmed] = useState(false);

//   /* Load inventory */
//   useEffect(() => {
//     const fetchInventory = async () => {
//       try {
//         const res = await fetch(
//           `/api/inventory-batch/${effectiveItemId}/${effectiveWarehouseId}`,
//         );
//         if (!res.ok) throw new Error("Inventory fetch failed");
//         const data = await res.json();
//         setInventory(data);
//       } catch (err) {
//         console.error(err);
//         setInventory({ batches: [] });
//       }
//     };

//     if (effectiveItemId && effectiveWarehouseId) fetchInventory();
//   }, [effectiveItemId, effectiveWarehouseId]);

//   /* Confirm button */
//   const handleConfirm = () => {
//     if (hasConfirmed) return;
//     setHasConfirmed(true);

//     const finalQty = parentQuantity === 1 ? 1 : quantity;

//     if (!selectedBatch || finalQty <= 0) {
//       toast.error("Select a batch and valid quantity");
//       return;
//     }
//     if (finalQty > selectedBatch.quantity) {
//       toast.error("Quantity exceeds available");
//       return;
//     }

//     onUpdateBatch(selectedBatch, finalQty);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
//       <div className="relative mx-auto max-w-xl rounded-xl bg-white p-6 shadow-md">
//         <button
//           onClick={onClose}
//           className="absolute top-2 right-2 text-xl font-bold"
//         >
//           &times;
//         </button>
//         <h2 className="mb-4 text-2xl font-bold">
//           Select Batch for {itemName}
//         </h2>

//         {/* loading / empty */}
//         {!inventory ? (
//           <p>Loading inventory…</p>
//         ) : inventory.batches.length === 0 ? (
//           <p>No batches available</p>
//         ) : (
//           <>
//             {/* selector */}
//             <label className="block mt-4">Select Batch:</label>
//             <select
//               className="w-full rounded border p-2"
//               onChange={(e) =>
//                 setSelectedBatch(
//                   e.target.value
//                     ? JSON.parse(e.target.value)
//                     : null,
//                 )
//               }
//             >
//               <option value="">-- Select --</option>
//               {inventory.batches.map((b, i) => (
//                 <option key={i} value={JSON.stringify(b)}>
//                   {b.batchNumber} — {b.quantity} available
//                 </option>
//               ))}
//             </select>

//             {/* details */}
//             {selectedBatch && (
//               <div className="mt-4 rounded border bg-gray-100 p-4 text-sm">
//                 <p>
//                   <strong>Batch No:</strong>{" "}
//                   {selectedBatch.batchNumber}
//                 </p>
//                 <p>
//                   <strong>Expiry:</strong>{" "}
//                   {new Date(
//                     selectedBatch.expiryDate,
//                   ).toDateString()}
//                 </p>
//                 <p>
//                   <strong>Mfr:</strong>{" "}
//                   {selectedBatch.manufacturer}
//                 </p>
//                 <p>
//                   <strong>Unit ₹:</strong>{" "}
//                   {selectedBatch.unitPrice}
//                 </p>

//                 <label className="block mt-2">Qty</label>
//                 <input
//                   type="number"
//                   min="1"
//                   max={selectedBatch.quantity}
//                   value={parentQuantity === 1 ? 1 : quantity}
//                   onChange={(e) =>
//                     parentQuantity !== 1 &&
//                     setQuantity(Number(e.target.value))
//                   }
                 
//                   className="w-full rounded border p-2"
//                 />
//                 <p className="mt-2">
//                   <strong>Total ₹:</strong>{" "}
//                   {(
//                     (parentQuantity === 1 ? 1 : quantity) *
//                     selectedBatch.unitPrice
//                   ).toFixed(2)}
//                 </p>
//               </div>
//             )}

//             <button
//               onClick={handleConfirm}
//               className="mt-4 w-full rounded bg-blue-500 p-2 text-white"
//             >
//               Confirm Batch
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// // Initial state for Sales Invoice.
// const initialInvoiceState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "", // Invoice Number.
//   salesEmployee: "",
//   status: "Pending",
//   orderDate: "",
//   expectedDeliveryDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0, // Total quantity for the item.
//       allowedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       tdsAmount: 0,
//       batches: [],
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
//       errorMessage: "",
//       taxOption: "GST",
//       igstAmount: 0,
//       managedByBatch: true,
//     },
//   ],
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   fromQuote: false,
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }


// function SalesInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesInvoiceEditPage />
//     </Suspense>
//   );
// }

//  function SalesInvoiceEditPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [attachmentsLoading, setAttachmentsLoading] = useState(false);
//   const [isReadOnly, setIsReadOnly] = useState(false);



//   const [formData, setFormData] = useState(initialInvoiceState);
//   // modalItemIndex tracks which item (by index) is currently selecting a batch.
//   const [modalItemIndex, setModalItemIndex] = useState(null);


//     /* ---------------------------------------- copy from sessionStorage */
//     // useEffect(() => {
//     //   const key = "SalesInvoiceData" || "InvoiceData";
//     //   const stored = sessionStorage.getItem(key);
//     //   if (!stored) return;
//     //   try {
//     //     setFormData(JSON.parse(stored));
//     //     setIsCopied(true);
//     //   } catch (err) {
//     //     console.error("Bad JSON in sessionStorage", err);
//     //   } finally {
//     //     sessionStorage.removeItem(key);
//     //   }
//     // }, []);

//   const [isCopied, setIsCopied] = useState(false);


// // Inside SalesInvoiceEditPage function
// // ...


// useEffect(() => {
//   if (typeof window !== "undefined") {
//     let storedData = sessionStorage.getItem("InvoiceData");
//     if (!storedData) {
//       storedData = sessionStorage.getItem("SalesInvoiceData");
//     }
//     if (storedData) {
//       try {
//         const parsedData = JSON.parse(storedData);
//         // For SO copy, if managedBy is missing but managedByBatch is true, force managedBy to "batch".
//         const updatedItems = parsedData.items.map((item) => ({
//           ...item,
//           gstRate: item.gstRate !== undefined ? item.gstRate : 0,
//           cgstAmount: item.cgstAmount !== undefined ? item.cgstAmount : 0,
//           sgstAmount: item.sgstAmount !== undefined ? item.sgstAmount : 0,
//           managedBy:
//             item.managedBy && item.managedBy.trim() !== ""
//               ? item.managedBy
//               : item.managedByBatch
//               ? "batch"
//               : "",
//           managedByBatch:
//             item.managedByBatch !== undefined
//               ? item.managedByBatch
//               : item.managedBy &&
//                 item.managedBy.toLowerCase() === "batch",
//         }));
//         parsedData.items = updatedItems;
//         setFormData(parsedData);
//         setIsCopied(true);
//         sessionStorage.removeItem("InvoiceData");
//         sessionStorage.removeItem("SalesInvoiceData");
//       } catch (error) {
//         console.error("Error parsing copied data:", error);
//       }
//     }
//   }
// }, []); // <--- REPLACE THIS ENTIRE useEffect BLOCK
// // ...



//   // Fetch existing Sales Invoice data if editing.
//   useEffect(() => {
//     if (editId) {
//       axios
//         .get(`/api/sales-invoice/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               orderDate: formatDateForInput(record.orderDate),
//               expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
//             });
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching sales invoice for edit", err);
//           toast.error("Error fetching sales invoice data");
//         });
//     }
//   }, [editId]);
//   const renderNewFilesPreview = () => (
//     attachments.length > 0 && (
//       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//         {attachments.map((file, idx) => {
//           if (file instanceof File) {
//             const url = URL.createObjectURL(file);
//             const isPDF = file.type === "application/pdf";
//             return (
//               <div key={idx} className="relative border rounded p-2 text-center bg-slate-300">
//                 {isPDF ? (
//                   <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                 ) : (
//                   <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                 )}
//                 <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
//               </div>
//             );
//           }
//           return null;
//         })}
//       </div>
//     )
//   );
//   // Handler for CustomerSearch: update customer fields when a customer is selected.
//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData((prev) => ({
//       ...prev,
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);
  

  
//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);
//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           item: "",
//           itemCode: "",
//           itemId: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           allowedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//           batches: [],
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           warehouseId: "",
//           errorMessage: "",
//           taxOption: "GST",
//           igstAmount: 0,
//           managedByBatch: true,
//         },
//       ],
//     }));
//   }, []);




//   useEffect(() => {
//   const items = formData.items ?? []; // ✅ safe fallback

//   const totalBeforeDiscountCalc = items.reduce((acc, item) => {
//     const unitPrice = parseFloat(item.unitPrice) || 0;
//     const discount = parseFloat(item.discount) || 0;
//     const quantity = parseFloat(item.quantity) || 1;
//     return acc + (unitPrice - discount) * quantity;
//   }, 0);

//   const totalItemsCalc = items.reduce(
//     (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//     0
//   );

//   const gstTotalCalc = items.reduce((acc, item) => {
//     if (item.taxOption === "IGST") {
//       return acc + (parseFloat(item.igstAmount) || 0);
//     }
//     return acc + (parseFloat(item.gstAmount) || 0);
//   }, 0);

//   const overallFreight = parseFloat(formData.freight) || 0;
//   const roundingCalc = parseFloat(formData.rounding) || 0;
//   const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
//   const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

//   const grandTotalCalc =
//     totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//   const openBalanceCalc =
//     grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

//   setFormData((prev) => ({
//     ...prev,
//     totalBeforeDiscount: totalBeforeDiscountCalc,
//     gstTotal: gstTotalCalc,
//     grandTotal: grandTotalCalc,
//     openBalance: openBalanceCalc,
//   }));
// }, [
//   formData.items,
//   formData.freight,
//   formData.rounding,
//   formData.totalDownPayment,
//   formData.appliedAmounts,
// ]);


// const handleSubmit = async () => {
//   try {
//     // ✅ Authentication Check
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("You are not authenticated. Please log in.");
//       return;
//     }

//     // ✅ Validate Form Data before sending
//     if (!formData.items || formData.items.length === 0) {
//       toast.error("Please add at least one item to the invoice.");
//       return;
//     }

//     // ✅ Prepare FormData for API
//     const data = new FormData();
//     data.append("invoiceData", JSON.stringify(formData));

//     // ✅ Append New Attachments
//     attachments.forEach((file) => {
//       data.append("attachments", file);
//     });

//     // ✅ Append Existing Files (if any)
//     if (existingFiles && existingFiles.length > 0) {
//       data.append("existingFiles", JSON.stringify(existingFiles));
//     }

//     // ✅ API URL & Method
//     const url = editId ? `/api/sales-invoice/${editId}` : "/api/sales-invoice";
//     const method = editId ? "put" : "post";

//     // ✅ Send Request
//     await axios({
//       method,
//       url,
//       data,
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "multipart/form-data",
//       },
//     });

//     // ✅ Success Message
//     toast.success(editId ? "Sales Invoice updated successfully" : "Sales Invoice added successfully");

//     // ✅ Redirect to listing
//     router.push("/admin/sales-invoice-view");
//   } catch (error) {
//     console.error("Error saving sales invoice:", error);
//     toast.error(editId ? "Failed to update sales invoice" : "Error adding sales invoice");
//   }
// };



//   // Batch update: Update allocated batch for a specific item.
// const handleUpdateBatch = (batch, allocatedQuantity) => {
//   const item = formData.items?.[modalItemIndex];
//   if (!item) {
//     toast.error("Item not found for batch allocation");
//     return;
//   }

//   const currentAllocatedTotal = (item.batches ?? []).reduce(
//     (sum, batchItem) => sum + (batchItem.allocatedQuantity || 0),
//     0
//   );

//   const newTotal = currentAllocatedTotal + allocatedQuantity;
//   if (newTotal > item.quantity) {
//     toast.error("Total allocated quantity exceeds the item quantity");
//     return;
//   }

//   setFormData((prev) => {
//     const updatedItems = [...prev.items];
//     const targetItem = { ...updatedItems[modalItemIndex] };

//     // Ensure batches array is initialized
//     targetItem.batches = targetItem.batches ?? [];

//     if (targetItem.quantity === 1) {
//       targetItem.batches = [
//         {
//           batchCode: batch.batchNumber,
//           expiryDate: batch.expiryDate,
//           manufacturer: batch.manufacturer,
//           allocatedQuantity: 1,
//           availableQuantity: batch.quantity,
//         },
//       ];
//     } else {
//       const existingIndex = targetItem.batches.findIndex(
//         (b) => b.batchCode === batch.batchNumber
//       );

//       if (existingIndex !== -1) {
//         targetItem.batches[existingIndex].allocatedQuantity += allocatedQuantity;
//       } else {
//         targetItem.batches.push({
//           batchCode: batch.batchNumber,
//           expiryDate: batch.expiryDate,
//           manufacturer: batch.manufacturer,
//           allocatedQuantity,
//           availableQuantity: batch.quantity,
//         });
//       }
//     }

//     updatedItems[modalItemIndex] = targetItem;
//     return { ...prev, items: updatedItems };
//   });
// };


//   const openBatchModal = (index) => {
//     console.log("Opening Batch Modal for item index:", index);
//     setModalItemIndex(index);
//   };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Invoice" : "Create Sales Invoice"}
//       </h1>
      
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="grid grid-cols-2 gap-7">
//             <div>
//                   <label className="block mb-2 font-medium">Customer Name</label>
//                      {formData.customerName ? (
//                                   <input
//                                     type="text"
//                                     name="supplierName"
//                                     value={formData.customerName}
//                                     readOnly
//                                     className="w-full p-2 border rounded bg-gray-100"
//                                   />
//                                 ) : (
//                                   <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//                                 )}
                    
//                   </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         {/* Additional Invoice Info */}
//         <div className="w-full md:w-1/2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="">Select status (optional)</option>
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Date</label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Expected Payment Date</label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
      
//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         {/* <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           setFormData={setFormData}
//           removeItemRow={removeItemRow}
//         /> */}

//            <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
        
//               onRemoveItem={removeItemRow}
       
//           setFormData={setFormData}
//         />
   

        
//       </div>
      
//       {/* Batch Selection Section (for items managed by batch) */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Selection</h2>
//         {formData.items.map((item, index) => {
//           if (!item.managedByBatch) return null;
//           return (
//             <div key={index} className="border p-2 my-2">
//               <div className="flex items-center justify-between">
//                 <span>{item.itemName || `Item ${index + 1}`}</span>
//                 <button
//                   onClick={() => {
//                     console.log("Opening Batch Modal for item index:", index);
//                     openBatchModal(index);
//                   }}
//                   className="px-3 py-1 bg-blue-500 text-white rounded"
//                 >
//                   Select Batch
//                 </button>
//               </div>
//               {item.batches && item.batches.length > 0 && (
//                 <div className="mt-2">
//                   <p className="text-sm font-medium">Allocated Batches:</p>
//                   <ul>
//                     {item.batches.map((batch, idx) => (
//                       <li key={idx} className="text-xs">
//                         {batch.batchCode}: {batch.allocatedQuantity} allocated (Available: {batch.availableQuantity})
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
      
//       {/* Remarks & Sales Employee */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>
      
//       {/* Summary Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="totalBeforeDiscount"
//             value={
//               formData.items.reduce(
//                 (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//                 0
//               ).toFixed(2)
//             }
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={formData.gstTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//     {/* Attachments Section */}
// <div className="mt-6">
//   <label className="font-medium block mb-2">Attachments</label>

//   {/* Existing Files */}
//   {attachmentsLoading ? (
//     <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//       Loading attachments...
//     </div>
//   ) : existingFiles && existingFiles.length > 0 ? (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border">
//       {existingFiles.map((file, idx) => {
//         const url = file.fileUrl;
//         const name = file.fileName;
//         const isPDF =
//           file.fileType === "application/pdf" ||
//           url.toLowerCase().endsWith(".pdf");

//         return (
//           <div
//             key={`existing-${idx}`}
//             className="relative border rounded p-2 text-center bg-slate-200"
//           >
//             {isPDF ? (
//               <object
//                 data={url}
//                 type="application/pdf"
//                 className="h-24 w-full rounded"
//               />
//             ) : (
//               <img
//                 src={url}
//                 alt={name}
//                 className="h-24 w-full object-cover rounded"
//               />
//             )}
//             <a
//               href={url}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="block text-blue-600 text-xs mt-1 truncate"
//             >
//               {name}
//             </a>
//             {!isReadOnly && (
//               <button
//                 onClick={() => {
//                   setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                   setRemovedFiles((prev) => [...(prev || []), file]);
//                 }}
//                 className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//               >
//                 ×
//               </button>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   ) : (
//     <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//       No attachments available
//     </div>
//   )}

//   {/* File Upload for New Attachments */}
//   <input
//     type="file"
//     multiple
//     accept="image/*,application/pdf"
//     onChange={(e) => {
//       const files = Array.from(e.target.files);
//       setAttachments((prev) => {
//         const uniqueMap = new Map(prev.map((f) => [f.name + f.size, f]));
//         files.forEach((f) => uniqueMap.set(f.name + f.size, f));
//         return [...uniqueMap.values()];
//       });
//       e.target.value = ""; // Reset input for re-upload
//     }}
//     className="border px-3 py-2 w-full mt-2 rounded"
//   />

//   {/* Previews of New Files */}
//   {attachments.length > 0 && (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//       {attachments.map((file, idx) => {
//         if (!(file instanceof File)) return null;

//         const url = URL.createObjectURL(file);
//         const isPDF = file.type === "application/pdf";

//         return (
//           <div
//             key={`new-${idx}`}
//             className="relative border rounded p-2 text-center bg-slate-300"
//           >
//             {isPDF ? (
//               <object
//                 data={url}
//                 type="application/pdf"
//                 className="h-24 w-full rounded"
//               />
//             ) : (
//               <img
//                 src={url}
//                 alt={file.name}
//                 className="h-24 w-full object-cover rounded"
//               />
//             )}
//             <button
//               onClick={() =>
//                 setAttachments((prev) => prev.filter((_, i) => i !== idx))
//               }
//               className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//             >
//               ×
//             </button>
//           </div>
//         );
//       })}
//     </div>
//   )}
// </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {editId ? "Update Sales Invoice" : "Add Sales Invoice"}
//         </button>
//         <button
//           onClick={() => router.push("/admin/sales-invoice-view")}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//       </div>
      
//       {/* Render the Batch Modal if an item is selected for batch editing */}
//       {modalItemIndex !== null && (
//         <BatchModal
//           itemsbatch={formData.items[modalItemIndex]}
//           onClose={() => setModalItemIndex(null)}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
      
//       <ToastContainer />
//     </div>
//   );
// }

// export default SalesInvoiceFormWrapper;





