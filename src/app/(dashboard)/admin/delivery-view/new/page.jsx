"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection"; // Assumed to handle item details
import CustomerSearch from "@/components/CustomerSearch"; // Assumed to handle customer selection
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Assuming '@/components/MultiBatchModalbtach' is the BatchAllocationModal
// I'll rename the import locally for clarity, but keep the original path.
import BatchAllocationModal from "@/components/MultiBatchModalbtach";

/* ------------------------------------------------------------------ */
/* NOTE: The inline 'BatchModal' function is REMOVED.                 */
/* We are only using the imported 'BatchAllocationModal' (which was  */
/* 'MultiBatchModalbtach'). Having both leads to confusion and bugs. */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Initial form template                                              */
/* ------------------------------------------------------------------ */
const initialDeliveryState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  salesEmployee: "", // Often used as Delivery Person for Delivery Note
  status: "Pending",
  orderDate: "",
  expectedDeliveryDate: "",
  deliveryDate: "", // Important for Delivery Note
  deliveryType: "Sales", // Default type
  items: [
    {
      item: "", // Stores item ObjectId from DB
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      allowedQuantity: 0, // This might be from the sales order, if applicable
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0, // Need these for calculations
      sgstAmount: 0,
      igstAmount: 0,
      tdsAmount: 0,
      batches: [], // Array to store allocated batch details {batchCode, allocatedQuantity, etc.}
      warehouse: "", // Stores warehouse ObjectId from DB
      warehouseName: "",
      warehouseCode: "",
      errorMessage: "",
      taxOption: "GST",
      managedByBatch: false, // Default to false, updated on item select
      gstRate: 0, // Default to 0, updated on item select
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
  attachments: [], // Array for attachment metadata
};

/* helper to format date for HTML date input */
const formatDate = (d) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

/* ------------------------------------------------------------------ */
/* Wrapper to make Suspense work                                      */
/* ------------------------------------------------------------------ */
function DeliveryFormWrapper() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center">Loading form data…</div>
      }
    >
      <DeliveryForm />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                        */
/* ------------------------------------------------------------------ */
function DeliveryForm() {
  const router = useRouter();
  const query = useSearchParams();
  const editId = query.get("editId"); // For editing existing Delivery Notes

  const [formData, setFormData] = useState(initialDeliveryState);
  const [modalItemIndex, setModalItemIndex] = useState(null); // Index of the item for which batch modal is open
  const [batchModalOptions, setBatchModalOptions] = useState([]); // State to hold available batches fetched for the modal

  const [isCopied, setIsCopied] = useState(false); // Flag if data was copied from session storage
  const [loading, setLoading] = useState(Boolean(editId)); // Initial loading state for edit mode

  const [attachments, setAttachments] = useState([]); // Files selected via input for new upload
  const [existingFiles, setExistingFiles] = useState([]); // Files associated with the document from DB/copy
  const [removedFiles, setRemovedFiles] = useState([]); // Public IDs of files marked for removal


  /* -------------------------------------------------- Load for edit mode */
  useEffect(() => {
    if (!editId) {
      setLoading(false); // If not in edit mode, stop loading
      return;
    }

    const fetchDelivery = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Authentication required to fetch delivery.");
          router.push("/login"); // Redirect to login if no token
          return;
        }

        const { data } = await axios.get(`/api/sales-delivery/${editId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success && data.data) {
          const rec = data.data;

          setFormData((prev) => ({
            ...prev,
            ...rec,
            orderDate: rec.orderDate ? formatDate(rec.orderDate) : "",
            expectedDeliveryDate: rec.expectedDeliveryDate ? formatDate(rec.expectedDeliveryDate) : "",
            deliveryDate: rec.deliveryDate ? formatDate(rec.deliveryDate) : "",
            // Ensure items' managedByBatch is correctly set from backend
            items: rec.items.map(item => ({
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
          }));

          if (rec.attachments && Array.isArray(rec.attachments)) {
            setExistingFiles(rec.attachments);
          } else {
            setExistingFiles([]);
          }
        } else {
          toast.error(data.message || "Delivery record not found");
        }
      } catch (err) {
        console.error("Failed to fetch delivery:", err.response?.data?.message || err.message);
        toast.error(err.response?.data?.message || "Failed to fetch delivery");
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [editId, router]);


  /* ---------------------------------------- Copy from sessionStorage */
  useEffect(() => {
    const key = "deliveryData"; // Key for Delivery data (e.g., from Sales Order)
    const salesOrderDataKey = "salesOrderData"; // Key if copying from a Sales Order directly

    let stored = sessionStorage.getItem(key);
    let isSalesOrderCopy = false;

    if (!stored) {
      stored = sessionStorage.getItem(salesOrderDataKey);
      if (stored) {
        isSalesOrderCopy = true;
        sessionStorage.removeItem(salesOrderDataKey); // Clear after use
      }
    } else {
      sessionStorage.removeItem(key); // Clear after use
    }

    if (!stored) {
        return; // No data to copy
    }

    try {
      const parsed = JSON.parse(stored);
      console.log("Parsed Data on Copy/Load (from session storage):", parsed);

      // Map fields from Sales Order or existing Delivery to Delivery form
      const newFormData = {
        ...initialDeliveryState, // Start with clean initial state
        ...parsed, // Apply all parsed data
        // Overwrite specific fields for a clean copy
        refNumber: parsed.refNumber ? `${parsed.refNumber}-DN` : "", // Append -DN for Delivery Note
        status: "Pending", // Always start as pending for new/copied doc
        orderDate: formatDate(parsed.orderDate || new Date()),
        expectedDeliveryDate: formatDate(parsed.expectedDeliveryDate || parsed.dueDate || new Date()),
        deliveryDate: "", // Must be set by user or automatically on submission
        // Map customer info, handling potential nesting or direct fields
        customerCode: parsed.customer?.customerCode || parsed.customerCode || "",
        customerName: parsed.customer?.customerName || parsed.customerName || "",
        contactPerson: parsed.customer?.contactPersonName || parsed.contactPerson || "",
        salesEmployee: parsed.salesEmployee || "",
        remarks: parsed.remarks || "",
        freight: Number(parsed.freight) || 0,
        rounding: Number(parsed.rounding) || 0,
        totalDownPayment: Number(parsed.totalDownPayment) || 0,
        appliedAmounts: Number(parsed.appliedAmounts) || 0,
        fromQuote: isSalesOrderCopy, // Flag if it originated from a sales order (quote)
      };

      // Transform items for the Delivery Note
      newFormData.items = (parsed.items || []).map((item) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const quantity = parseFloat(item.quantity) || 0; // Use quantity from source doc
        const freight = parseFloat(item.freight) || 0;
        const gstRate = parseFloat(item.gstRate) || 0;
        const taxOption = item.taxOption || "GST";
        const managedBy = item.managedBy || "";

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

        // For Delivery Note, when copying from Sales Order, batches should be *re-allocated*
        // or cleared if not explicitly transferred. For now, clear to force user allocation.
        const copiedBatches = (managedBy.toLowerCase() === "batch" && Array.isArray(item.batches))
            ? item.batches.map(b => ({
                batchCode: b.batchCode || b.batchNumber || '',
                allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0, // This will be the *already allocated* quantity if copying from a delivered SO
                expiryDate: b.expiryDate || null,
                manufacturer: b.manufacturer || '',
                unitPrice: Number(b.unitPrice) || 0,
            }))
            : [];


        return {
          ...item,
          item: item.item?._id || item.item || "", // Handle populated item or just ID
          itemCode: item.item?.itemCode || item.itemCode || "",
          itemName: item.item?.itemName || item.itemName || "",
          itemDescription: item.item?.description || item.itemDescription || "",
          warehouse: item.warehouse?._id || item.warehouse || "", // Handle populated warehouse or just ID
          warehouseName: item.warehouse?.warehouseName || item.warehouseName || "",
          warehouseCode: item.warehouse?.warehouseCode || item.warehouseCode || "",
          quantity: quantity, // Use the quantity from source document
          unitPrice: unitPrice,
          discount: discount,
          freight: freight,
          gstType: item.gstType || 0,
          gstRate: gstRate,
          taxOption: taxOption,
          priceAfterDiscount: priceAfterDiscount,
          totalAmount: totalAmountBeforeTax,
          gstAmount: gstAmount,
          cgstAmount: cgstAmount,
          sgstAmount: sgstAmount,
          igstAmount: igstAmount,
          tdsAmount: item.tdsAmount || 0,
          managedBy: managedBy,
          managedByBatch: managedBy.toLowerCase() === "batch",
          batches: copiedBatches, // Retain copied batches if they exist (good for partial deliveries, etc.)
          errorMessage: "",
        };
      });

      // Handle attachments
      if (Array.isArray(parsed.attachments)) {
        setExistingFiles(parsed.attachments);
      } else {
        setExistingFiles([]);
      }

      setFormData(newFormData);
      setIsCopied(true);
      toast.success("Data copied successfully!");
    } catch (err) {
      console.error("❌ Error parsing copied data:", err);
      toast.error("Failed to copy data.");
    }
  }, []); // Run once on mount


  /* ------------------------------------------------ Recalculate totals */
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce(
      (acc, it) => {
        const up = Number(it.unitPrice) || 0;
        const disc = Number(it.discount) || 0;
        const qty = Number(it.quantity) || 0;
        return acc + (up - disc) * qty;
      },
      0,
    ) ?? 0; // Nullish coalescing for safety

    const gstTotal = formData.items.reduce((acc, it) => {
      if (it.taxOption === "IGST")
        return acc + (Number(it.igstAmount) || 0);
      return acc + (Number(it.gstAmount) || 0); // gstAmount should be CGST + SGST for GST option
    }, 0) ?? 0;

    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grandTotal =
      totalBeforeDiscount + gstTotal + freight + rounding;

    setFormData((p) => ({
      ...p,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
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


  /* ------------------------------------------------ Attachment rendering helper */
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
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
              </div>
            );
          }
          return null;
        })}
      </div>
    )
  );

  /* ------------------------------------------------ Field handlers */
  const onInput = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  const onCustomer = useCallback((c) => {
    setFormData((p) => ({
      ...p,
      customerCode: c.customerCode ?? "",
      customerName: c.customerName ?? "",
      contactPerson: c.contactPersonName ?? "",
    }));
  }, []);

  const onItemField = useCallback((idx, e) => {
    const { name, value } = e.target;
    setFormData((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [name]: value };

      // Recalculate item-level totals on quantity/price/discount change
      const item = items[idx];
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0;
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

      items[idx] = {
        ...items[idx],
        priceAfterDiscount,
        totalAmount: totalAmountBeforeTax,
        gstAmount: calculatedGstAmount,
        cgstAmount: calculatedCgstAmount,
        sgstAmount: calculatedSgstAmount,
        igstAmount: calculatedIgstAmount,
      };

      // If quantity changes for a batch-managed item, clear batches or adjust as needed
      if (item.managedByBatch && name === 'quantity' && parseFloat(value) !== item.quantity) {
          items[idx].batches = []; // Clear batches to force re-allocation
          toast.info("Quantity changed for a batch-managed item. Please re-allocate batches.");
      }

      return { ...p, items };
    });
  }, []);

  const addItem = useCallback(() => {
    setFormData((p) => ({
      ...p,
      items: [...p.items, { ...initialDeliveryState.items[0] }],
    }));
  }, []);

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  // Callback for when an item is selected via ItemSearch (from ItemSection)
  const handleItemSelect = useCallback(async (index, selectedItem) => {
    if (!selectedItem._id) {
      toast.error("Selected item does not have a valid ID.");
      return;
    }

    // Fetch managedBy value from item master if not already present in selectedItem
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
        console.error("Error fetching item master details:", error);
        managedByValue = ""; // Fallback if fetch fails
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
      item: selectedItem._id, // This will be the ObjectId string for the backend
      itemCode: selectedItem.itemCode || "",
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
      managedByBatch: managedByValue.toLowerCase() === "batch",
      batches: [], // Initialize empty if batch managed, user will allocate via modal
      warehouse: selectedItem.warehouse || "", // This will be the ObjectId string for the backend
      warehouseName: selectedItem.warehouseName || "",
      warehouseCode: selectedItem.warehouseCode || "",
      errorMessage: "",
      tdsAmount: 0,
    };

    setFormData((prev) => {
      const currentItems = [...prev.items];
      currentItems[index] = updatedItem;
      return { ...prev, items: currentItems };
    });
  }, []);

  /* ------------------------------------------------ Batch updates (from BatchAllocationModal) */
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
      }));

      updatedItems[modalItemIndex] = targetItem;
      return { ...prev, items: updatedItems };
    });
  }, [modalItemIndex]);

  /* Open the Batch Allocation Modal */
  const openBatchModal = useCallback(async (index) => {
    const currentItem = formData.items[index];
    // Crucial validation: Ensure item and warehouse IDs are selected and item is batch-managed
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
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (res.data.success) {
            setBatchModalOptions(res.data.data.batches || []);
            setModalItemIndex(index); // Open modal after successful fetch
        } else {
            toast.error(res.data.message || "Failed to fetch available batches.");
        }
    } catch (error) {
        console.error("Error fetching available batches:", error);
        toast.error(`Error loading available batches: ${error.response?.data?.message || error.message}`);
    }
  }, [formData.items]);


  /* ------------------------------------------------ Submit */
// const handleSubmit = async () => {
//   try {
//     // Client-side authentication check
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Authentication required. Please log in.");
//       router.push("/login");
//       return;
//     }

//     // Basic form validation
//     if (!formData.customerName || !formData.refNumber || formData.items.length === 0) {
//       toast.error("Please fill in Customer Name, Delivery Number, and add at least one item.");
//       return;
//     }

//     // Validate items and batch allocations
//     for (const item of formData.items) {
//       if (!item.item || !item.warehouse) {
//         toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item and Warehouse selection.`);
//         return;
//       }
//       if (!item.itemCode || !item.itemName || item.quantity <= 0 || item.unitPrice <= 0) {
//         toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item Code, Item Name, Quantity (>0), and Unit Price (>0).`);
//         return;
//       }
//       if (item.managedByBatch) {
//           const allocatedTotal = item.batches.reduce((sum, batch) => sum + (Number(batch.allocatedQuantity) || 0), 0);
//           if (allocatedTotal !== item.quantity) {
//               toast.error(`Item '${item.itemName}' requires total allocated batch quantity (${allocatedTotal}) to match item quantity (${item.quantity}). Please re-allocate batches.`);
//               return;
//           }
//           if (item.batches.length === 0 && item.quantity > 0) {
//               toast.error(`Item '${item.itemName}' is batch-managed but no batches are allocated.`);
//               return;
//           }
//       }
//     }

//     // Ensure deliveryDate is set
//     if (!formData.deliveryDate) {
//       formData.deliveryDate = new Date().toISOString().slice(0, 10); // Default to current date
//       toast.info("Delivery Date defaulted to today.");
//     }
//     if (!formData.deliveryType) {
//       formData.deliveryType = "Sales"; // Default if not provided
//     }
 

//     const dataToSend = new FormData();
//     // Prepare main form data for API, excluding attachments to send separately
//     const formDataForApi = { ...formData };
    
//     dataToSend.append("deliveryData", JSON.stringify(formDataForApi));

//     // Append newly selected files (from the file input)
//     attachments.forEach((file) => {
//       dataToSend.append("newAttachments", file); // Key 'newAttachments' matches backend expectation
//     });

//     // Append metadata for existing files that were NOT removed.
//     const retainedExistingFiles = existingFiles.filter(
//       (file) => !removedFiles.some(removed => removed.publicId === file.publicId || removed.fileUrl === file.fileUrl)
//     );
//     if (retainedExistingFiles.length > 0) {
//       dataToSend.append("existingFiles", JSON.stringify(retainedExistingFiles));
//     }

//     // Append IDs of files to be removed (primarily for PUT/edit operations)
//     if (removedFiles.length > 0) {
//       dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//     }


//     const url = editId
//       ? `/api/sales-delivery/${editId}`
//       : "/api/sales-delivery";

//     const method = editId ? "put" : "post";

//     const res = await axios({
//       method,
//       url,
//       data: dataToSend,
//       headers: {
//         Authorization: `Bearer ${token}`, // Pass the JWT token
//         "Content-Type": "multipart/form-data", // Crucial header for file uploads
//       },
//     });

//     if (res.data.success) {
//       toast.success(editId ? "Delivery updated successfully" : "Delivery created successfully");
//       // Reset form on successful creation
//       if (!editId) {
//         setFormData(initialDeliveryState);
//         setAttachments([]);
//         setExistingFiles([]);
//         setRemovedFiles([]);
//       } else {
//         // Update existing files state with the fresh list from the backend response
//         setExistingFiles(res.data.delivery?.attachments || []);
//         setRemovedFiles([]);
//         setAttachments([]);
//       }
//       router.push("/admin/delivery-view");
//     } else {
//       throw new Error(res.data.message || "Unknown error");
//     }
//   } catch (err) {
//     console.error("❌ Error saving delivery:", err.response?.data?.message || err.message);
//     toast.error(err.response?.data?.message || "Save failed");
//   }
// };




const handleSubmit = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required. Please log in.");
      router.push("/login");
      return;
    }

    if (!formData.customerName || !formData.refNumber || formData.items.length === 0) {
      toast.error("Please fill in Customer Name, Delivery Number, and add at least one item.");
      return;
    }

    // Validate batches
    for (const item of formData.items) {
      if (!item.item || !item.warehouse) throw new Error(`Invalid Item/Warehouse for ${item.itemName}`);
      if (item.quantity <= 0 || item.unitPrice <= 0) throw new Error(`Invalid Quantity/Price for ${item.itemName}`);
      if (item.managedByBatch) {
        const allocatedTotal = item.batches.reduce((sum, b) => sum + (Number(b.allocatedQuantity) || 0), 0);
        if (allocatedTotal !== item.quantity) throw new Error(`Allocated batches must equal item quantity for ${item.itemName}`);
      }
    }

    formData.deliveryDate ||= new Date().toISOString().slice(0, 10);
    formData.deliveryType ||= "Sales";

    // Ensure sourceModel is correct
    if (formData.sourceId) formData.sourceModel = "salesorder";

    const dataToSend = new FormData();
    dataToSend.append("deliveryData", JSON.stringify(formData));

    attachments.forEach(file => dataToSend.append("newAttachments", file));

    const retainedFiles = existingFiles.filter(
      f => !removedFiles.some(r => r.publicId === f.publicId)
    );
    if (retainedFiles.length) dataToSend.append("existingFiles", JSON.stringify(retainedFiles));
    if (removedFiles.length) dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId)));

    const url = editId ? `/api/sales-delivery/${editId}` : "/api/sales-delivery";
    const method = editId ? "put" : "post";

    const res = await axios({ method, url, data: dataToSend, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });

    if (res.data.success) {
      toast.success(editId ? "Delivery updated successfully" : "Delivery created successfully");
      if (!editId) {
        setFormData(initialDeliveryState);
        setAttachments([]);
        setExistingFiles([]);
        setRemovedFiles([]);
      } else {
        setExistingFiles(res.data.delivery?.attachments || []);
        setRemovedFiles([]);
        setAttachments([]);
      }
      router.push("/admin/delivery-view");
    } else throw new Error(res.data.message || "Unknown error");

  } catch (err) {
    console.error("❌ Error saving delivery:", err.message);
    toast.error(err.message || "Save failed");
  }
};



  /* ------------------------------------------------ Render */
  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="mb-4 text-2xl font-bold">
        {editId ? "Edit Delivery" : "Create Delivery"}
      </h1>

      {/* ---------------- Customer ---------------- */}
      <div className="m-10 flex flex-wrap justify-between rounded-lg border p-5 shadow-lg">
        <div className="basis-full md:basis-1/2 space-y-4 px-2">
          <div>
            <label className="mb-2 block font-medium">
              Customer Code
            </label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode || ""} // Ensure string value
              readOnly
              className="w-full rounded border bg-gray-100 p-2"
            />
          </div>
          <div>
            {(formData.customerName && isCopied) || editId ? ( // Show read-only if customer data is copied OR in edit mode
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName || ""} // Ensure string value
                  onChange={onInput}
                  readOnly={Boolean(isCopied || editId)} // Make read-only if copied or editing
                  className={`w-full rounded border p-2 ${Boolean(isCopied || editId) ? 'bg-gray-100' : ''}`}
                />
              </>
            ) : (
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <CustomerSearch onSelectCustomer={onCustomer} />
              </>
            )}
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Contact Person
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson || ""} // Ensure string value
              readOnly
              className="w-full rounded border bg-gray-100 p-2"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Delivery No
            </label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""} // Ensure string value
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
        </div>
        {/* status & dates */}
        <div className="basis-full md:basis-1/2 space-y-4 px-2">
          <div>
            <label className="mb-2 block font-medium">Status</label>
            <select
              name="status"
              value={formData.status || "Pending"} // Ensure string value and default
              onChange={onInput}
              className="w-full rounded border p-2"
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Delivered">Delivered</option> {/* Added Delivered status */}
            </select>
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Order Date
            </label>
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate || ""} // Ensure string value
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">
              Expected Delivery Date
            </label>
            <input
              type="date"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate || ""} // Ensure string value
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
          <div> {/* Added Delivery Date field */}
            <label className="mb-2 block font-medium">
              Actual Delivery Date
            </label>
            <input
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate || ""}
              onChange={onInput}
              className="w-full rounded border p-2"
            />
          </div>
        </div>
      </div>

      {/* ---------------- Items ---------------- */}
      <h2 className="mt-6 text-xl font-semibold">Items</h2>
      <div className="m-10 flex flex-col rounded-lg border p-5 shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={onItemField}
          onAddItem={addItem}
          onRemoveItem={removeItemRow}
          setFormData={setFormData}
          onItemSelect={handleItemSelect} 
        />
      </div>

      {/* ---------------- Batch selection ---------------- */}
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
      {/* ---------------- Remarks & employee ---------------- */}
      <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Delivery Person
          </label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee || ""} // Ensure string value
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks || ""} // Ensure string value
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      {/* ---------------- Summary ---------------- */}
      <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium">
            Taxable Amount
          </label>
          <input
            type="number"
            value={formData.totalBeforeDiscount.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding || 0} // Ensure number value
            onChange={onInput}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">GST Total</label>
          <input
            type="number"
            value={formData.gstTotal.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
        <div>
          <label className="mb-2 block font-medium">Grand Total</label>
          <input
            type="number"
            value={formData.grandTotal.toFixed(2)}
            readOnly
            className="w-full rounded border bg-gray-100 p-2"
          />
        </div>
      </div>
      {/* Attachments */}

      <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg"> {/* Consolidated attachments section */}
        <label className="font-medium block mb-2">Attachments</label>

        {/* Existing Files Display */}
        {loading ? ( // Use the main loading state for attachments too
          <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
            Loading attachments...
          </div>
        ) : existingFiles && existingFiles.length > 0 ? (
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
                  {/* Allow removal of existing files only in edit mode, not if it's a new copy */}
                  {editId && (
                    <button
                      onClick={() => {
                        setExistingFiles(prev => prev.filter((_, i) => i !== idx));
                        setRemovedFiles(prev => [...(prev || []), file]); // Add to removed list for backend processing
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

        {/* New Uploads Input */}
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            setAttachments((prev) => {
              const m = new Map(prev.map((f) => [f.name + f.size, f]));
              files.forEach((f) => m.set(f.name + f.size, f));
              return [...m.values()];
            });
            e.target.value = ""; // Clear input after selection
          }}
          className="border px-3 py-2 w-full mt-2 rounded"
        />

        {/* Previews of new uploads */}
        {renderNewFilesPreview()}
      </div>

      {/* ---------------- buttons ---------------- */}
      <div className="flex flex-wrap gap-4 p-8 m-8 rounded-lg border shadow-lg">
        <button
          onClick={handleSubmit}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
        >
          {editId ? "Update Delivery" : "Add Delivery"}
        </button>
        <button
          onClick={() => {
            setFormData(initialDeliveryState);
            router.push("/admin/delivery-view");
          }}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Include both current form data and existing files (which are part of the document)
            sessionStorage.setItem(
              "deliveryData",
              JSON.stringify({ ...formData, attachments: existingFiles }),
            );
            toast.success("Delivery data copied!");
          }}
          className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-400"
        >
          Copy Current Form
        </button>
      </div>

      {/* modal + toast */}
      {modalItemIndex !== null && (
        <BatchAllocationModal
          itemsbatch={{
            itemId: formData.items[modalItemIndex].item,
            sourceWarehouse: formData.items[modalItemIndex].warehouse,
            itemName: formData.items[modalItemIndex].itemName,
            qty: formData.items[modalItemIndex].quantity,
            currentAllocations: formData.items[modalItemIndex].batches,
          }}
          batchOptions={batchModalOptions}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={handleUpdateBatch}
        />
      )}

      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}

export default DeliveryFormWrapper;



// "use client";
// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   Suspense,
// } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import BatchAllocationModal from "@/components/MultiBatchModalbtach";

// /* ------------------------------------------------------------------ */
// /* Batch-selection modal (unchanged, but reused here)                  */
// /* ------------------------------------------------------------------ */
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

// /* ------------------------------------------------------------------ */
// /* Initial form template                                              */
// /* ------------------------------------------------------------------ */
// const initialDeliveryState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
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
//       quantity: 0,
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

// /* helper */
// const formatDate = (d) =>
//   d ? new Date(d).toISOString().slice(0, 10) : "";

// /* ------------------------------------------------------------------ */
// /* Wrapper to make Suspense work                                      */
// /* ------------------------------------------------------------------ */
// function DeliveryFormWrapper() {
//   return (
//     <Suspense
//       fallback={
//         <div className="py-10 text-center">Loading form data…</div>
//       }
//     >
//       <DeliveryForm />
//     </Suspense>
//   );
// }

// /* ------------------------------------------------------------------ */
// /* Main form                                                        */
// /* ------------------------------------------------------------------ */
// function DeliveryForm() {
//   const router = useRouter();
//   const query = useSearchParams();
//   const editId = query.get("editId");

//   const [formData, setFormData] = useState(initialDeliveryState);
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [isCopied, setIsCopied] = useState(false);
//   const [loading, setLoading] = useState(Boolean(editId));
//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachmentsLoading, setAttachmentsLoading] = useState(true);
//   const [removedFiles, setRemovedFiles] = useState([]);


//   /* -------------------------------------------------- load for edit */
// useEffect(() => {
//   if (!editId) return;

//   const fetchDelivery = async () => {
//     try {
//       setLoading(true);

//       const { data } = await axios.get(`/api/sales-delivery/${editId}`);
//       if (data.success && data.data) {
//         const rec = data.data;

//         setFormData((prev) => ({
//           ...prev,
//           ...rec,
//           orderDate: rec.orderDate ? formatDate(rec.orderDate) : "",
//           expectedDeliveryDate: rec.expectedDeliveryDate ? formatDate(rec.expectedDeliveryDate) : "",
//           deliveryDate: rec.deliveryDate ? formatDate(rec.deliveryDate) : "",
//         }));

//         // ✅ If attachments exist, store them separately
//         if (rec.attachments) {
//           setExistingFiles(rec.attachments);
//         }
//       } else {
//         toast.error("Delivery record not found");
//       }
//     } catch (err) {
//       console.error("Failed to fetch delivery:", err.message);
//       toast.error("Failed to fetch delivery");
//     } finally {
//       setLoading(false);
//     }
//   };

//   fetchDelivery();
// }, [editId]);



//   /* ---------------------------------------- copy from sessionStorage */
//   useEffect(() => {
//     const key = "deliveryData";
//     const stored = sessionStorage.getItem(key);
//      setAttachmentsLoading(true); 
// if (!stored) {
//     setAttachmentsLoading(false);
//     return;
//   }

//     try {
//       const parsed = JSON.parse(stored);

//       // ✅ Merge with default state
//       setFormData(prev => ({
//         ...prev,
//         ...parsed
//       }));

//       // ✅ Normalize attachments if any
//       if (Array.isArray(parsed.attachments)) {
//         const normalized = parsed.attachments.map(file => ({
//           fileUrl: file.fileUrl,
//           fileName: file.fileName || file.fileUrl.split("/").pop() || "Attachment",
//           fileType: file.fileType || (file.fileUrl.endsWith(".pdf") ? "application/pdf" : "image/*"),
//         }));
//         setExistingFiles(normalized);
//       }

//       setIsCopied(true);
//     } catch (err) {
//       console.error("❌ Bad JSON in sessionStorage:", err);
//     } finally {
//       sessionStorage.removeItem(key);
//     }
//   }, []);


//   // useEffect(() => {
//   //   const key = "deliveryData";
//   //   const stored = sessionStorage.getItem(key);
//   //   if (!stored) return;
//   //   try {
//   //     setFormData(JSON.parse(stored));
//   //     setIsCopied(true);
//   //   } catch (err) {
//   //     console.error("Bad JSON in sessionStorage", err);
//   //   } finally {
//   //     sessionStorage.removeItem(key);
//   //   }
//   // }, []);


//   /* ------------------------------------------------ recalc totals */
//   useEffect(() => {
//     const totalBeforeDiscount = formData.items.reduce(
//       (acc, it) => {
//         const up = Number(it.unitPrice) || 0;
//         const disc = Number(it.discount) || 0;
//         const qty = Number(it.quantity) || 0;
//         return acc + (up - disc) * qty;
//       },
//       0,
//     ) ?? 0;

//     const gstTotal = formData.items.reduce((acc, it) => {
//       if (it.taxOption === "IGST")
//         return acc + (Number(it.igstAmount) || 0);
//       return acc + (Number(it.gstAmount) || 0);
//     }, 0) ?? 0;

//     const freight = Number(formData.freight) || 0;
//     const rounding = Number(formData.rounding) || 0;
//     const grandTotal =
//       totalBeforeDiscount + gstTotal + freight + rounding;

//     setFormData((p) => ({
//       ...p,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance:
//         grandTotal -
//         ((Number(p.totalDownPayment) || 0) +
//           (Number(p.appliedAmounts) || 0)),
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);


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
//   /* ------------------------------------------------ field handlers */
//   const onInput = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const onCustomer = useCallback((c) => {
//     setFormData((p) => ({
//       ...p,
//       customerCode: c.customerCode ?? "",
//       customerName: c.customerName ?? "",
//       contactPerson: c.contactPersonName ?? "",
//     }));
//   }, []);

//   const onItemField = useCallback((idx, e) => {
//     const { name, value } = e.target;
//     setFormData((p) => {
//       const items = [...p.items];
//       items[idx] = { ...items[idx], [name]: value };
//       return { ...p, items };
//     });
//   }, []);

//   const addItem = useCallback(() => {
//     setFormData((p) => ({
//       ...p,
//       items: [...p.items, { ...initialDeliveryState.items[0] }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   /* ------------------------------------------------ batch updates */
//   const onUpdateBatch = (batch, qty) => {
//     setFormData((prev) => {
//       const items = [...prev.items];
//       const target = { ...items[modalItemIndex] };

//       // ✅ Ensure batches is always an array
//       target.batches = target.batches ?? [];

//       const allocated = target.batches.reduce(
//         (s, b) => s + (b.allocatedQuantity || 0),
//         0
//       );

//       if (allocated + qty > target.quantity) {
//         toast.error("Allocation exceeds item quantity");
//         return prev;
//       }

//       const idx = target.batches.findIndex(
//         (b) => b.batchCode === batch.batchNumber
//       );

//       if (idx === -1) {
//         target.batches.push({
//           batchCode: batch.batchNumber,
//           expiryDate: batch.expiryDate,
//           manufacturer: batch.manufacturer,
//           allocatedQuantity: qty,
//           availableQuantity: batch.quantity - qty,
//         });
//       } else {
//         const line = { ...target.batches[idx] };
//         line.allocatedQuantity += qty;
//         line.availableQuantity = batch.quantity - line.allocatedQuantity;
//         target.batches[idx] = line;
//       }

//       items[modalItemIndex] = target;
//       return { ...prev, items };
//     });
//   };


//     const handleUpdateBatch = useCallback((allocatedBatches) => {
//       setFormData((prev) => {
//         const updatedItems = [...prev.items];
//         const targetItem = { ...updatedItems[modalItemIndex] };
  
//         targetItem.batches = allocatedBatches.map(b => ({
//             batchCode: b.batchCode || '',
//             allocatedQuantity: Number(b.allocatedQuantity) || 0,
//             expiryDate: b.expiryDate || null,
//             manufacturer: b.manufacturer || '',
//             unitPrice: Number(b.unitPrice) || 0,
//         }));
  
//         updatedItems[modalItemIndex] = targetItem;
//         return { ...prev, items: updatedItems };
//       });
//     }, [modalItemIndex]);

//   /* ------------------------------------------------ submit */
// const handleSubmit = async () => {
//   try {
//     // ✅ Add missing required fields
//     if (!formData.deliveryDate) {
//       formData.deliveryDate = formData.orderDate || new Date().toISOString();
//     }
//     if (!formData.deliveryType) {
//       formData.deliveryType = "Sales"; // Default if not provided
//     }

//     const formDataWithAttachments = new FormData();
//     formDataWithAttachments.append("deliveryData", JSON.stringify(formData));

//     // ✅ Append new files
//     attachments.forEach((file) => {
//       formDataWithAttachments.append("newFiles", file);
//     });

//     // ✅ Append removed files
//     removedFiles.forEach((file) => {
//       formDataWithAttachments.append("removedFiles[]", file.fileName);
//     });

//     const headers = {
//       Authorization: `Bearer ${localStorage.getItem("token")}`,
//     };

//     const url = editId
//       ? `/api/sales-delivery/${editId}`
//       : "/api/sales-delivery";

//     const method = editId ? "put" : "post";

//     const res = await axios({
//       method,
//       url,
//       data: formDataWithAttachments,
//       headers,
//     });

//     if (res.data.success) {
//       toast.success(editId ? "Delivery updated" : "Delivery created");
//       router.push("/admin/delivery-view");
//     } else {
//       throw new Error(res.data.message || "Unknown error");
//     }
//   } catch (err) {
//     console.error("❌ Error saving delivery:", err.response?.data || err.message);
//     toast.error(err.response?.data?.message || "Save failed");
//   }
// };


//   /* ------------------------------------------------ render */
//   if (loading) return <div className="p-8">Loading…</div>;

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="mb-4 text-2xl font-bold">
//         {editId ? "Edit Delivery" : "Create Delivery"}
//       </h1>

//       {/* ---------------- Customer ---------------- */}
//       <div className="m-10 flex flex-wrap justify-between rounded-lg border p-5 shadow-lg">
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">
//               Customer Code
//             </label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode}
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             {isCopied ? (
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName}
//                   onChange={onInput}
//                   className="w-full rounded border p-2"
//                 />
//               </>
//             ) : (
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <CustomerSearch onSelectCustomer={onCustomer} />
//               </>
//             )}
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Contact Person
//             </label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson}
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Delivery No
//             </label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//         {/* status & dates */}
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             >
//               <option value="">Select status…</option>
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Order Date
//             </label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Expected Delivery Date
//             </label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//       </div>

//       {/* ---------------- Items ---------------- */}
//       <h2 className="mt-6 text-xl font-semibold">Items</h2>
//       <div className="m-10 flex flex-col rounded-lg border p-5 shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={onItemField}
//           onAddItem={addItem}
//           onRemoveItem={removeItemRow}
//           setFormData={setFormData}
//         />
//       </div>

//       {/* ---------------- Batch selection ---------------- */}
//       {/* <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Selection</h2>
//         {formData.items.map((it, idx) =>
//           it.managedByBatch === false ? null : (
//             <div key={idx} className="my-2 border p-2">
//               <div className="flex items-center justify-between">
//                 <span>{it.itemName || `Item ${idx + 1}`}</span>
//                 <button
//                   onClick={() => setModalItemIndex(idx)}
//                   className="rounded bg-blue-500 px-3 py-1 text-white"
//                 >
//                   Select Batch
//                 </button>
//               </div>
//               {it.batches?.length > 0 && (
//                 <div className="mt-2 text-xs">
//                   <p className="font-medium">Allocated:</p>
//                   <ul>
//                     {it.batches.map((b, i) => (
//                       <li key={i}>
//                         {b.batchCode}: {b.allocatedQuantity}/
//                         {b.availableQuantity + b.allocatedQuantity}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           ),
//         )}
//       </div> */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Allocation Summary</h2>

//         {formData.items.map((item, index) => {
//           if (!item.managedBy || item.managedBy.toLowerCase() !== 'batch') {
//             return null;
//           }

//           const totalAllocatedForCurrentItem = (item.batches || []).reduce(
//             (sum, b) => sum + (Number(b.allocatedQuantity) || 0),
//             0
//           );

//           return (
//             <div key={index} className="border p-4 my-2 rounded-lg bg-white shadow-sm">
//               <div className="flex items-center justify-between mb-2">
//                 <span className="font-semibold text-lg">{item.itemName || `Item ${index + 1}`}</span>
//                 <button
//                   onClick={() => openBatchModal(index)}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//                   disabled={!item.item || !item.warehouse || item.quantity <= 0}
//                 >
//                   Allocate Batches ({item.quantity})
//                 </button>
//               </div>

//               {/* Display currently allocated batches for this item */}
//               {item.batches && item.batches.length > 0 ? (
//                 <div className="mt-2 pl-4 text-sm">
//                   <p className="font-medium mb-1">Current Allocations:</p>
//                   <ul className="list-disc list-inside">
//                     {item.batches.map((batch, idx) => (
//                       <li key={idx} className="text-gray-700">
//                         Batch: **{batch.batchCode || 'N/A'}** &mdash; Allocated: **{Number(batch.allocatedQuantity) || 0}**
//                       </li>
//                     ))}
//                   </ul>
//                   <p className={`mt-2 font-bold ${totalAllocatedForCurrentItem !== item.quantity ? "text-red-600" : "text-green-600"}`}>
//                     Total Allocated: {totalAllocatedForCurrentItem} / {item.quantity}
//                   </p>
//                 </div>
//               ) : (
//                 <p className="text-sm text-gray-500 italic pl-4">No batches currently allocated for this item.</p>
//               )}
//             </div>
//           );
//         })}
//       </div>
//       {/* ---------------- Remarks & employee ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Delivery Person
//           </label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//       </div>

//       {/* ---------------- Summary ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Taxable Amount
//           </label>
//           <input
//             type="number"
//             value={formData.totalBeforeDiscount.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">GST Total</label>
//           <input
//             type="number"
//             value={formData.gstTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={formData.grandTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//       </div>
//       {/* Attachments */}

//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {attachmentsLoading ? (
//           <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//             Loading attachments...
//           </div>
//         ) : existingFiles && existingFiles.length > 0 ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-100 p-3 rounded">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl;
//               const name = file.fileName;
//               const isPDF = file.fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-slate-200">
//                   {isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                   ) : (
//                     <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//                   )}
//                   <a
//                     href={url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="block text-blue-600 text-xs mt-1 truncate"
//                   >
//                     {name}
//                   </a>
//                   {!editId && (
//                     <button
//                       onClick={() => {
//                         setExistingFiles(prev => prev.filter((_, i) => i !== idx));
//                         setRemovedFiles(prev => [...(removedFiles || []), file]);
//                       }}
//                       className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                     >
//                       ×
//                     </button>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         ) : (
//           <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//             No attachments available
//           </div>
//         )}
//       </div>


//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Existing uploaded files */}
//         {/* {renderExistingFiles() || "No attachments available"} */}

//         {/* New Uploads */}
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const m = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => m.set(f.name + f.size, f));
//               return [...m.values()];
//             });
//             e.target.value = "";
//           }}
//           className="border px-3 py-2 w-full"
//         />

//         {/* Previews of new uploads */}
//         {renderNewFilesPreview()}
//       </div>

//       {/* ---------------- buttons ---------------- */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 rounded-lg border shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           {editId ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialDeliveryState);
//             router.push("/admin/delivery-view");
//           }}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem(
//               "deliveryData",
//               JSON.stringify({ ...formData, attachments: existingFiles }), // Include existing attachments for copying
//             );
//             alert("Delivery data copied!");
//           }}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           Copy
//         </button>
//       </div>

//       {/* modal + toast */}
//       {/* {modalItemIndex !== null && (
//         <BatchModal
//           itemsbatch={formData.items[modalItemIndex]}
//           onClose={() => setModalItemIndex(null)}
//           onUpdateBatch={onUpdateBatch}
//         />
//       )} */}


//          {modalItemIndex !== null && (
//               <BatchAllocationModal
//                 itemsbatch={{
//                   itemId: formData.items[modalItemIndex].item,
//                   sourceWarehouse: formData.items[modalItemIndex].warehouse,
//                   itemName: formData.items[modalItemIndex].itemName,
//                   qty: formData.items[modalItemIndex].quantity,
//                   currentAllocations: formData.items[modalItemIndex].batches,
//                 }}
//                 batchOptions={batchModalOptions}
//                 onClose={() => setModalItemIndex(null)}
//                 onUpdateBatch={handleUpdateBatch}
//               />
//             )}
      
//       <ToastContainer />
//     </div>
//   );
// }

// export default DeliveryFormWrapper;

























// "use client";
// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   Suspense,
// } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// /* ------------------------------------------------------------------ */
// /* Batch-selection modal (unchanged, but reused here)                  */
// /* ------------------------------------------------------------------ */
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

// /* ------------------------------------------------------------------ */
// /* Initial form template                                              */
// /* ------------------------------------------------------------------ */
// const initialDeliveryState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
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
//       quantity: 0,
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

// /* helper */
// const formatDate = (d) =>
//   d ? new Date(d).toISOString().slice(0, 10) : "";

// /* ------------------------------------------------------------------ */
// /* Wrapper to make Suspense work                                      */
// /* ------------------------------------------------------------------ */
// function DeliveryFormWrapper() {
//   return (
//     <Suspense
//       fallback={
//         <div className="py-10 text-center">Loading form data…</div>
//       }
//     >
//       <DeliveryForm />
//     </Suspense>
//   );
// }

// /* ------------------------------------------------------------------ */
// /* Main form                                                          */
// /* ------------------------------------------------------------------ */
// function DeliveryForm() {
//   const router = useRouter();
//   const query = useSearchParams();
//   const editId = query.get("editId");

//   const [formData, setFormData] = useState(initialDeliveryState);
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [isCopied, setIsCopied] = useState(false);
//   const [loading, setLoading] = useState(Boolean(editId));
//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachmentsLoading, setAttachmentsLoading] = useState(true);
//   const [removedFiles, setRemovedFiles] = useState([]);


//   /* -------------------------------------------------- load for edit */
//   useEffect(() => {
//     if (!editId) return;

//     (async () => {
//       try {
//         const { data } = await axios.get(`/api/delivery/${editId}`);
//         if (data.success) {
//           const rec = data.data;
//           setFormData({
//             ...rec,
//             orderDate: formatDate(rec.orderDate),
//             expectedDeliveryDate: formatDate(rec.expectedDeliveryDate),
//           });
//         }
//       } catch (err) {
//         toast.error("Failed to fetch delivery");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [editId]);


//   /* ---------------------------------------- copy from sessionStorage */
//  useEffect(() => {
//   const key = "deliveryData";
//   const stored = sessionStorage.getItem(key);

//   if (!stored) return;

//   try {
//     const parsed = JSON.parse(stored);

//     // ✅ Merge with default state
//     setFormData(prev => ({
//       ...prev,
//       ...parsed
//     }));

//     // ✅ Normalize attachments if any
//     if (Array.isArray(parsed.attachments)) {
//       const normalized = parsed.attachments.map(file => ({
//         fileUrl: file.fileUrl,
//         fileName: file.fileName || file.fileUrl.split("/").pop() || "Attachment",
//         fileType: file.fileType || (file.fileUrl.endsWith(".pdf") ? "application/pdf" : "image/*"),
//       }));
//       setExistingFiles(normalized);
//     }

//     setIsCopied(true);
//   } catch (err) {
//     console.error("❌ Bad JSON in sessionStorage:", err);
//   } finally {
//     sessionStorage.removeItem(key);
//   }
// }, []);

 
//   // useEffect(() => {
//   //   const key = "deliveryData";
//   //   const stored = sessionStorage.getItem(key);
//   //   if (!stored) return;
//   //   try {
//   //     setFormData(JSON.parse(stored));
//   //     setIsCopied(true);
//   //   } catch (err) {
//   //     console.error("Bad JSON in sessionStorage", err);
//   //   } finally {
//   //     sessionStorage.removeItem(key);
//   //   }
//   // }, []);


  
//   /* ------------------------------------------------ recalc totals */
//   useEffect(() => {
//     const totalBeforeDiscount = formData.items.reduce(
//       (acc, it) => {
//         const up = Number(it.unitPrice) || 0;
//         const disc = Number(it.discount) || 0;
//         const qty = Number(it.quantity) || 0;
//         return acc + (up - disc) * qty;
//       },
//       0,
//     ) ?? 0;

//     const gstTotal = formData.items.reduce((acc, it) => {
//       if (it.taxOption === "IGST")
//         return acc + (Number(it.igstAmount) || 0);
//       return acc + (Number(it.gstAmount) || 0);
//     }, 0) ?? 0;

//     const freight = Number(formData.freight) || 0;
//     const rounding = Number(formData.rounding) || 0;
//     const grandTotal =
//       totalBeforeDiscount + gstTotal + freight + rounding;

//     setFormData((p) => ({
//       ...p,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance:
//         grandTotal -
//         ((Number(p.totalDownPayment) || 0) +
//           (Number(p.appliedAmounts) || 0)),
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);


//    const renderNewFilesPreview = () => (
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
//   /* ------------------------------------------------ field handlers */
//   const onInput = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const onCustomer = useCallback((c) => {
//     setFormData((p) => ({
//       ...p,
//       customerCode: c.customerCode ?? "",
//       customerName: c.customerName ?? "",
//       contactPerson: c.contactPersonName ?? "",
//     }));
//   }, []);

//   const onItemField = useCallback((idx, e) => {
//     const { name, value } = e.target;
//     setFormData((p) => {
//       const items = [...p.items];
//       items[idx] = { ...items[idx], [name]: value };
//       return { ...p, items };
//     });
//   }, []);

//   const addItem = useCallback(() => {
//     setFormData((p) => ({
//       ...p,
//       items: [...p.items, { ...initialDeliveryState.items[0] }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   /* ------------------------------------------------ batch updates */
// const onUpdateBatch = (batch, qty) => {
//   setFormData((prev) => {
//     const items = [...prev.items];
//     const target = { ...items[modalItemIndex] };

//     // ✅ Ensure batches is always an array
//     target.batches = target.batches ?? [];

//     const allocated = target.batches.reduce(
//       (s, b) => s + (b.allocatedQuantity || 0),
//       0
//     );

//     if (allocated + qty > target.quantity) {
//       toast.error("Allocation exceeds item quantity");
//       return prev;
//     }

//     const idx = target.batches.findIndex(
//       (b) => b.batchCode === batch.batchNumber
//     );

//     if (idx === -1) {
//       target.batches.push({
//         batchCode: batch.batchNumber,
//         expiryDate: batch.expiryDate,
//         manufacturer: batch.manufacturer,
//         allocatedQuantity: qty,
//         availableQuantity: batch.quantity - qty,
//       });
//     } else {
//       const line = { ...target.batches[idx] };
//       line.allocatedQuantity += qty;
//       line.availableQuantity = batch.quantity - line.allocatedQuantity;
//       target.batches[idx] = line;
//     }

//     items[modalItemIndex] = target;
//     return { ...prev, items };
//   });
// };


//   /* ------------------------------------------------ submit */
//   const handleSubmit = async () => {
//     try {
//       if (editId) {
//         await axios.put(`/api/delivery/${editId}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         toast.success("Delivery updated");
//       } else {
//         await axios.post("/api/delivery", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         toast.success("Delivery created");
//         setFormData(initialDeliveryState);
//       }
//       router.push("/admin/delivery-view");
//     } catch (err) {
//       console.error(err);
//       toast.error("Save failed");
//     }
//   };

//   /* ------------------------------------------------ render */
//   if (loading) return <div className="p-8">Loading…</div>;

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="mb-4 text-2xl font-bold">
//         {editId ? "Edit Delivery" : "Create Delivery"}
//       </h1>

//       {/* ---------------- Customer ---------------- */}
//       <div className="m-10 flex flex-wrap justify-between rounded-lg border p-5 shadow-lg">
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">
//               Customer Code
//             </label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode}
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             {isCopied ? (
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName}
//                   onChange={onInput}
//                   className="w-full rounded border p-2"
//                 />
//               </>
//             ) : (
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <CustomerSearch onSelectCustomer={onCustomer} />
//               </>
//             )}
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Contact Person
//             </label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson}
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Delivery No
//             </label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//         {/* status & dates */}
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             >
//               <option value="">Select status…</option>
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Order Date
//             </label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Expected Delivery Date
//             </label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//       </div>

//       {/* ---------------- Items ---------------- */}
//       <h2 className="mt-6 text-xl font-semibold">Items</h2>
//       <div className="m-10 flex flex-col rounded-lg border p-5 shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={onItemField}
//           onAddItem={addItem}
//            onRemoveItem={removeItemRow}
//           setFormData={setFormData}
//         />
//       </div>

//       {/* ---------------- Batch selection ---------------- */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Selection</h2>
//         {formData.items.map((it, idx) =>
//           it.managedByBatch === false ? null : (
//             <div key={idx} className="my-2 border p-2">
//               <div className="flex items-center justify-between">
//                 <span>{it.itemName || `Item ${idx + 1}`}</span>
//                 <button
//                   onClick={() => setModalItemIndex(idx)}
//                   className="rounded bg-blue-500 px-3 py-1 text-white"
//                 >
//                   Select Batch
//                 </button>
//               </div>
//               {it.batches?.length > 0 && (
//                 <div className="mt-2 text-xs">
//                   <p className="font-medium">Allocated:</p>
//                   <ul>
//                     {it.batches.map((b, i) => (
//                       <li key={i}>
//                         {b.batchCode}: {b.allocatedQuantity}/
//                         {b.availableQuantity + b.allocatedQuantity}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
//             </div>
//           ),
//         )}
//       </div>

//       {/* ---------------- Remarks & employee ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Delivery Person
//           </label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//       </div>

//       {/* ---------------- Summary ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Taxable Amount
//           </label>
//           <input
//             type="number"
//             value={formData.totalBeforeDiscount.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding}
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">GST Total</label>
//           <input
//             type="number"
//             value={formData.gstTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={formData.grandTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//       </div>
//        {/* Attachments */}

// <div className="mt-6">
//   <label className="font-medium block mb-1">Attachments</label>

//   {attachmentsLoading ? (
//     <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//       Loading attachments...
//     </div>
//   ) : existingFiles && existingFiles.length > 0 ? (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-100 p-3 rounded">
//       {existingFiles.map((file, idx) => {
//         const url = file.fileUrl;
//         const name = file.fileName;
//         const isPDF = file.fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//         return (
//           <div key={idx} className="relative border rounded p-2 text-center bg-slate-200">
//             {isPDF ? (
//               <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//             ) : (
//               <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
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
//                   setExistingFiles(prev => prev.filter((_, i) => i !== idx));
//                   setRemovedFiles(prev => [...(removedFiles || []), file]);
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
// </div>




//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Existing uploaded files */}
//         {/* {renderExistingFiles() || "No attachments available"} */}

//         {/* New Uploads */}
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const m = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => m.set(f.name + f.size, f));
//               return [...m.values()];
//             });
//             e.target.value = "";
//           }}
//           className="border px-3 py-2 w-full"
//         />

//         {/* Previews of new uploads */}
//         {renderNewFilesPreview()}
//       </div>

//       {/* ---------------- buttons ---------------- */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 rounded-lg border shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           {editId ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialDeliveryState);
//             router.push("/admin/delivery-view");
//           }}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem(
//               "deliveryData",
//               JSON.stringify(formData),
//             );
//             alert("Delivery copied to clipboard!");
//           }}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//       </div>

//       {/* modal + toast */}
//       {modalItemIndex !== null && (
//         <BatchModal
//           itemsbatch={formData.items[modalItemIndex]}
//           onClose={() => setModalItemIndex(null)}
//           onUpdateBatch={onUpdateBatch}
//         />
//       )}
//       <ToastContainer />
//     </div>
//   );
// }

// export default DeliveryFormWrapper;



