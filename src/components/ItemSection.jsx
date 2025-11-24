"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { toast } from "react-toastify";


/* ---------- helpers ---------- */
const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = round(totalAmount * (cgstRate / 100));
    const sgstAmount = round(totalAmount * (sgstRate / 100));
    const gstAmount = cgstAmount + sgstAmount;
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  }

  if (item.taxOption === "IGST") {
    let igstRate = item.igstRate;
    if (igstRate === undefined || parseFloat(igstRate) === 0) {
      igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
    } else {
      igstRate = parseFloat(igstRate);
    }
    const igstAmount = round(totalAmount * (igstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
    };
  }

  return {
    priceAfterDiscount,
    totalAmount,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
  };
};

/* ---------- main component ---------- */
const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem, onItemSelect }) => {
  ItemSection.propTypes = {
    items: PropTypes.array.isRequired,
    onItemChange: PropTypes.func.isRequired,
    onAddItem: PropTypes.func,
    onRemoveItem: PropTypes.func,
    onItemSelect: PropTypes.func, // new optional callback
  };

  const [apiItems, setApiItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "" });

  const [priceResults, setPriceResults] = useState({});

  

  const globalTaxOption = items && items.length > 0 ? items[0].taxOption || "GST" : "GST";

  /* ---------- API fetch ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const [itemsRes, warehouseRes] = await Promise.all([
          axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (itemsRes.data?.success) setApiItems(itemsRes.data.data || []);
        else if (Array.isArray(itemsRes.data)) setApiItems(itemsRes.data || []);
        if (warehouseRes.data?.success) setWarehouses(warehouseRes.data.data || []);
        else if (Array.isArray(warehouseRes.data)) setWarehouses(warehouseRes.data || []);
      } catch (err) {
        console.error("ItemSection fetch error:", err);
      }
    };
    fetchData();
  }, []);

  /* ---------- Handlers ---------- */
  const handleSearchChange = (index, value) => {
    onItemChange(index, { target: { name: "itemName", value } });
    if (!value) {
      setShowDropdown(false);
      setNoMatchInfo({ index: null, text: "" });
      return;
    }
    const filtered = apiItems.filter((itm) =>
      (itm.itemName || "").toLowerCase().includes(value.toLowerCase())
    );
    if (filtered.length) {
      setFilteredItems(filtered);
      setShowDropdown(true);
      setActiveDropdownIndex(index);
      setNoMatchInfo({ index: null, text: "" });
    } else {
      setShowDropdown(false);
      setNoMatchInfo({ index, text: value });
    }
  };

  const handleSearchChangecode = (index, value) => {
    onItemChange(index, { target: { name: "itemCode", value } });
    if (!value) {
      setShowDropdown(false);
      setNoMatchInfo({ index: null, text: "" });
      return;
    }
    const filtered = apiItems.filter((itm) =>
      (itm.itemCode || "").toLowerCase().includes(value.toLowerCase())
    );
    if (filtered.length) {
      setFilteredItems(filtered);
      setShowDropdown(true);
      setActiveDropdownIndex(index);
      setNoMatchInfo({ index: null, text: "" });
    } else {
      setShowDropdown(false);
      setNoMatchInfo({ index, text: value });
    }
  };


// const comparePrice = async (index, item) => {
//   console.log("COMPARE START — index:", index, "item:", item);

//   if (!item || !item.itemName) {
//     toast.error("Select item first");
//     return;
//   }

//   try {
//     const res = await axios.post("/api/check-price", {
//       itemName: item.itemName,
//     });

//     console.log("API RESPONSE:", res.data);

//     const { market, ai } = res.data;

//     if (!ai || !ai.recommendedSellingPrice) {
//       console.log("AI RESPONSE INVALID:", ai);
//       toast.error("AI could not suggest a price");
//       return;
//     }

//     const newUnitPrice = Number(ai.recommendedSellingPrice) || 0;

//     setFormData(prev => {
//       console.log("PREVIOUS FORM DATA:", prev);

//       const items = Array.isArray(prev.items) ? [...prev.items] : [];

//       if (!items[index]) {
//         console.log("ITEM ROW IS MISSING — INDEX:", index);
//         toast.error("Item row missing");
//         return prev;
//       }

//       const updatedItem = { ...items[index] };

//       const computed = computeItemValues({
//         ...updatedItem,
//         unitPrice: newUnitPrice,
//         quantity: updatedItem.quantity || 1,
//       });

//       console.log("COMPUTED:", computed);

//       items[index] = {
//         ...updatedItem,
//         marketPrices: market,
//         aiSuggestion: ai,
//         unitPrice: newUnitPrice,
//         ...computed,
//       };

//       return { ...prev, items };
//     });

//     toast.success("Price comparison updated");
//   } catch (e) {
//     console.log("COMPARE ERROR:", e);   // <---- THE REAL ERROR
//     toast.error("Error comparing price");
//   }
// };



const comparePrice = async (index, item) => {
  if (!item || !item.itemName) {
    toast.error("Select item first");
    return;
  }

  try {
    const res = await axios.post("/api/check-price", {
      itemName: item.itemName,
    });

    const { market, ai } = res.data;

    setPriceResults(prev => ({
      ...prev,
      [index]: { market, ai }
    }));

    toast.success("Price comparison fetched");
  } catch (e) {
    console.log("COMPARE ERROR:", e);
    toast.error("Error comparing price");
  }
};



  const createNewItemFromSearch = (index) => {
    const currentRow = items[index] || {};
    const updatedRow = {
      ...currentRow,
      itemName: currentRow.itemName || noMatchInfo.text,
      itemCode: currentRow.itemCode || "",
      isNewItem: true,
      taxOption: currentRow.taxOption || globalTaxOption,
    };
    Object.entries(updatedRow).forEach(([key, value]) =>
      onItemChange(index, { target: { name: key, value } })
    );
    setNoMatchInfo({ index: null, text: "" });
  };

  const handleFieldChange = (index, field, value) => {
    const newValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    const updatedItem = { ...items[index], [field]: newValue };
    const computed = computeItemValues(updatedItem);
    Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
      onItemChange(index, { target: { name: key, value: val } })
    );
  };

  const handleTaxOptionChange = (index, value) => {
    const updatedItem = { ...items[index], taxOption: value };
    if (value === "IGST" && (!updatedItem.igstRate || updatedItem.igstRate === 0)) {
      updatedItem.igstRate = updatedItem.gstRate || 0;
    }
    const computed = computeItemValues(updatedItem);
    Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
      onItemChange(index, { target: { name: key, value: val } })
    );
  };

  const handleGstRateChange = (index, value) => {
    const updatedItem = { ...items[index], gstRate: parseFloat(value) || 0 };
    const computed = computeItemValues(updatedItem);
    Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
      onItemChange(index, { target: { name: key, value: val } })
    );
  };

  const handleIgstRateChange = (index, value) => {
    const updatedItem = { ...items[index], igstRate: parseFloat(value) || 0 };
    const computed = computeItemValues(updatedItem);
    Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
      onItemChange(index, { target: { name: key, value: val } })
    );
  };

  const handleItemSelect = (index, selectedItem) => {
    // Populate the row with selectedItem data and compute tax/amounts
    const unitPrice = parseFloat(selectedItem.unitPrice) || 0;
    const discount = parseFloat(selectedItem.discount) || 0;
    const freight = parseFloat(selectedItem.freight) || 0;
    const quantity = 1;
    const taxOption = selectedItem.taxOption || "GST";
    const gstRate = selectedItem.gstRate || 0;
    const igstRate = taxOption === "IGST" ? selectedItem.igstRate || gstRate : 0;
    const priceAfterDiscount = unitPrice - discount;
    const totalAmount = quantity * priceAfterDiscount + freight;
    const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const gstAmount = cgstAmount + sgstAmount;

    const updatedItem = {
      item: selectedItem._id,
      itemCode: selectedItem.itemCode || "",
      itemName: selectedItem.itemName,
      itemDescription: selectedItem.description || "",
      unitPrice,
      discount,
      freight,
      quantity,
      taxOption,
      gstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      gstAmount,
      priceAfterDiscount,
      totalAmount,
      isNewItem: false,
    };

    // Update parent row (calls onItemChange repeatedly to mimic form input)
    Object.entries(updatedItem).forEach(([key, val]) =>
      onItemChange(index, { target: { name: key, value: val } })
    );

    // NEW: notify parent with the full selected item object (so parent can do lookups)
    if (typeof onItemSelect === "function") {
      try {
        onItemSelect(index, selectedItem);
      } catch (err) {
        // swallow to avoid parent errors breaking UI
        console.warn("onItemSelect callback threw:", err);
      }
    }

    setShowDropdown(false);
    setNoMatchInfo({ index: null, text: "" });
  };

  const handleSearchChangeWarehouse = (index, value) => {
    onItemChange(index, { target: { name: "warehouseName", value } });
    if (value.length > 0) {
      const filtered = warehouses.filter(
        (wh) =>
          (wh.warehouseName || "").toLowerCase().includes(value.toLowerCase()) ||
          (wh.warehouseCode || "").toLowerCase().includes(value.toLowerCase())
      );
      setFilteredWarehouses(filtered);
      setShowWarehouseDropdown(true);
      setActiveDropdownIndex(index);
    } else {
      setShowWarehouseDropdown(false);
    }
  };

  const handleWarehouseSelect = async (index, selectedWarehouse) => {
    onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
    onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
    onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/warehouse/${selectedWarehouse.warehouseCode}/bins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
    } catch (err) {
      console.error(err);
      onItemChange(index, { target: { name: "binLocations", value: [] } });
    }

    setShowWarehouseDropdown(false);
  };

  /* ---------- render ---------- */
  return (
    <div className="overflow-x-auto">
      <div className="max-w-[1200px]">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="border p-2 whitespace-nowrap">Item Code</th>
              <th className="border p-2 whitespace-nowrap">Item Name</th>
              <th className="border p-2 whitespace-nowrap">Description</th>
              <th className="border p-2 whitespace-nowrap">Qty</th>
              <th className="border p-2 whitespace-nowrap">Unit Price</th>
              <th className="border p-2 whitespace-nowrap">Discount</th>
              <th className="border p-2 whitespace-nowrap">Price</th>
              <th className="border p-2 whitespace-nowrap">Freight</th>
              <th className="border p-2 whitespace-nowrap">Total</th>
              <th className="border p-2 whitespace-nowrap">Tax Option</th>
              {globalTaxOption === "GST" && (
                <>
                  <th className="border p-2 whitespace-nowrap">GST %</th>
                  <th className="border p-2 whitespace-nowrap">GST Amt</th>
                  <th className="border p-2 whitespace-nowrap">CGST Amt</th>
                  <th className="border p-2 whitespace-nowrap">SGST Amt</th>
                </>
              )}
              {globalTaxOption === "IGST" && (
                <>
                  <th className="border p-2 whitespace-nowrap">IGST %</th>
                  <th className="border p-2 whitespace-nowrap">IGST Amt</th>
                </>
              )}
              <th className="border p-2 whitespace-nowrap">Warehouse</th>
              <th className="border p-2 whitespace-nowrap">Bin</th>
              <th className="border p-2 whitespace-nowrap">Compare Price</th>
              <th className="border p-2 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const computedValues = computeItemValues(item);
              return (
                <tr key={index} className="border-t hover:bg-gray-50">
                  {/* Item Code */}
                  <td className="p-2 border">
                    <input
                      type="text"
                      value={item.itemCode ?? ""}
                      onChange={(e) => handleSearchChangecode(index, e.target.value)}
                      className="w-full p-1 border rounded"
                      placeholder="Code"
                    />
                  </td>
                  {/* Item Name */}
                  <td className="p-2 border relative">
                    <input
                      type="text"
                      value={item.itemName ?? ""}
                      onChange={(e) => handleSearchChange(index, e.target.value)}
                      className="w-full p-1 border rounded"
                      placeholder="Name"
                    />
                    {showDropdown && activeDropdownIndex === index && (
                      <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
                        {filteredItems.map((itm) => (
                          <div
                            key={itm._id}
                            className="p-1 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleItemSelect(index, itm)}
                          >
                            <div className="font-medium">{itm.itemName}</div>
                            <div className="text-xs text-gray-500">{itm.itemCode}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {noMatchInfo.index === index && (
                      <div className="mt-1 text-xs bg-yellow-50 border border-yellow-200 p-1 rounded">
                        No item found.{" "}
                        <button
                          className="text-blue-600 underline"
                          onClick={() => createNewItemFromSearch(index)}
                        >
                          Add new item
                        </button>
                      </div>
                    )}
                  </td>
                  {/* Description */}
                  <td className="p-2 border">
                    <input
                      type="text"
                      name="itemDescription"
                      value={item.itemDescription ?? ""}
                      onChange={(e) => onItemChange(index, e)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  {/* Quantity */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.quantity ?? 0}
                      onChange={(e) => handleFieldChange(index, "quantity", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  {/* Unit Price */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.unitPrice ?? 0}
                      onChange={(e) => handleFieldChange(index, "unitPrice", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  {/* Discount */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.discount ?? 0}
                      onChange={(e) => handleFieldChange(index, "discount", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  {/* Price After Discount */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.priceAfterDiscount ?? 0}
                      readOnly
                      className="w-full p-1 border rounded bg-gray-100"
                    />
                  </td>
                  {/* Freight */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.freight ?? 0}
                      onChange={(e) => handleFieldChange(index, "freight", e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  {/* Total */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={item.totalAmount ?? 0}
                      readOnly
                      className="w-full p-1 border rounded bg-gray-100"
                    />
                  </td>
                  {/* Tax Option */}
                  <td className="p-2 border">
                    <select
                      value={item.taxOption || "GST"}
                      onChange={(e) => handleTaxOptionChange(index, e.target.value)}
                      className="w-full p-1 border rounded"
                    >
                      <option value="GST">GST</option>
                      <option value="IGST">IGST</option>
                    </select>
                  </td>
                  {/* GST / IGST */}
                  {item.taxOption === "GST" && (
                    <>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.gstRate ?? 0}
                          onChange={(e) => handleGstRateChange(index, e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-2 border">
                        <input type="number" value={computedValues.gstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
                      </td>
                      <td className="p-2 border">
                        <input type="number" value={computedValues.cgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
                      </td>
                      <td className="p-2 border">
                        <input type="number" value={computedValues.sgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
                      </td>
                    </>
                  )}
                  {item.taxOption === "IGST" && (
                    <>
                      <td className="p-2 border">
                        <input
                          type="number"
                          value={item.igstRate ?? 0}
                          onChange={(e) => handleIgstRateChange(index, e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-2 border">
                        <input type="number" value={computedValues.igstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
                      </td>
                    </>
                  )}
                  {/* Warehouse */}
                  <td className="p-2 border relative">
                    <input
                      type="text"
                      value={item.warehouseName ?? ""}
                      onChange={(e) => handleSearchChangeWarehouse(index, e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                    {showWarehouseDropdown && activeDropdownIndex === index && (
                      <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
                        {filteredWarehouses.map((wh) => (
                          <div
                            key={wh._id}
                            className="p-1 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleWarehouseSelect(index, wh)}
                          >
                            {wh.warehouseName} ({wh.warehouseCode})
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Bin */}
                  <td className="p-2 border">
                    {item.binLocations?.length > 0 ? (
                      <select
                        value={item.selectedBin?._id || ""}
                        onChange={(e) => {
                          const bin = item.binLocations.find((b) => b._id === e.target.value) || null;
                          onItemChange(index, { target: { name: "selectedBin", value: bin } });
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                        style={{ minWidth: "120px", maxWidth: "160px" }}
                      >
                        <option value="">Select Bin</option>
                        {item.binLocations.map((bin) => (
                          <option key={bin._id} value={bin._id}>
                            {bin.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </td>
                  {/* Compare Price */}
                  <td className="p-2 border">
                   <button
  type="button"
  className="px-2 py-1 bg-purple-600 text-white rounded text-sm"
  onClick={() => comparePrice(index, item)}
>
  Compare Price
</button>

{priceResults[index] && (
  <div className="mt-2 p-2 border rounded bg-gray-100">
    <p><b>Amazon:</b> ₹{priceResults[index].market[0]?.price || "N/A"}</p>
    <p><b>Flipkart:</b> ₹{priceResults[index].market[1]?.price || "N/A"}</p>

    <p className="mt-2">
      <b>AI Suggestion:</b> ₹{priceResults[index].ai?.recommendedSellingPrice}
    </p>
    <p><b>Reason:</b> {priceResults[index].ai?.reason}</p>
    <p><b>Strategy:</b> {priceResults[index].ai?.strategy}</p>
  </div>
)}


                  </td>

              
                  {/* Actions */}
                  <td className="p-2 border">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-red-600 hover:underline"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={onAddItem}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>
    </div>
  );
};

export default ItemSection;



// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import PropTypes from "prop-types";

// /* ---------- helpers ---------- */
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstRate = gstRate / 2;
//     const sgstRate = gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = cgstAmount + sgstAmount;
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   }

//   if (item.taxOption === "IGST") {
//     let igstRate = item.igstRate;
//     if (igstRate === undefined || parseFloat(igstRate) === 0) {
//       igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
//     } else {
//       igstRate = parseFloat(igstRate);
//     }
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }

//   return {
//     priceAfterDiscount,
//     totalAmount,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: 0,
//   };
// };

// /* ---------- main component ---------- */
// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
//   ItemSection.propTypes = {
//     items: PropTypes.array.isRequired,
//     onItemChange: PropTypes.func.isRequired,
//     onAddItem: PropTypes.func,
//     onRemoveItem: PropTypes.func,
//   };

//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);

//   const [showDropdown, setShowDropdown] = useState(false);
//   const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
//   const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
//   const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "" });

//   const globalTaxOption = items && items.length > 0 ? items[0].taxOption || "GST" : "GST";

//   /* ---------- API fetch ---------- */
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     const fetchData = async () => {
//       try {
//         const [itemsRes, warehouseRes] = await Promise.all([
//           axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } }),
//           axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
//         ]);
//         if (itemsRes.data.success) setApiItems(itemsRes.data.data || []);
//         if (warehouseRes.data.success) setWarehouses(warehouseRes.data.data || []);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchData();
//   }, []);

//   /* ---------- Handlers ---------- */
//   const handleSearchChange = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });
//     if (!value) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }
//     const filtered = apiItems.filter((itm) =>
//       itm.itemName.toLowerCase().includes(value.toLowerCase())
//     );
//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };

//   const handleSearchChangecode = (index, value) => {
//     onItemChange(index, { target: { name: "itemCode", value } });
//     if (!value) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }
//     const filtered = apiItems.filter((itm) =>
//       itm.itemCode?.toLowerCase().includes(value.toLowerCase())
//     );
//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };

//   const createNewItemFromSearch = (index) => {
//     const currentRow = items[index] || {};
//     const updatedRow = {
//       ...currentRow,
//       itemName: currentRow.itemName || noMatchInfo.text,
//       itemCode: currentRow.itemCode || "",
//       isNewItem: true,
//       taxOption: currentRow.taxOption || globalTaxOption,
//     };
//     Object.entries(updatedRow).forEach(([key, value]) =>
//       onItemChange(index, { target: { name: key, value } })
//     );
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleFieldChange = (index, field, value) => {
//     const newValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const updatedItem = { ...items[index], [field]: newValue };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleTaxOptionChange = (index, value) => {
//     const updatedItem = { ...items[index], taxOption: value };
//     if (value === "IGST" && (!updatedItem.igstRate || updatedItem.igstRate === 0)) {
//       updatedItem.igstRate = updatedItem.gstRate || 0;
//     }
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleGstRateChange = (index, value) => {
//     const updatedItem = { ...items[index], gstRate: parseFloat(value) || 0 };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleIgstRateChange = (index, value) => {
//     const updatedItem = { ...items[index], igstRate: parseFloat(value) || 0 };
//     const computed = computeItemValues(updatedItem);
//     Object.entries({ ...updatedItem, ...computed }).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//   };

//   const handleItemSelect = (index, selectedItem) => {
//     const unitPrice = parseFloat(selectedItem.unitPrice) || 0;
//     const discount = parseFloat(selectedItem.discount) || 0;
//     const freight = parseFloat(selectedItem.freight) || 0;
//     const quantity = 1;
//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = selectedItem.gstRate || 0;
//     const igstRate = taxOption === "IGST" ? selectedItem.igstRate || gstRate : 0;
//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount = quantity * priceAfterDiscount + freight;
//     const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
//     const gstAmount = cgstAmount + sgstAmount;

//     const updatedItem = {
//       item: selectedItem._id,
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       unitPrice,
//       discount,
//       freight,
//       quantity,
//       taxOption,
//       gstRate,
//       igstRate,
//       cgstAmount,
//       sgstAmount,
//       gstAmount,
//       priceAfterDiscount,
//       totalAmount,
//       isNewItem: false,
//     };

//     Object.entries(updatedItem).forEach(([key, val]) =>
//       onItemChange(index, { target: { name: key, value: val } })
//     );
//     setShowDropdown(false);
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   const handleSearchChangeWarehouse = (index, value) => {
//     onItemChange(index, { target: { name: "warehouseName", value } });
//     if (value.length > 0) {
//       const filtered = warehouses.filter(
//         (wh) =>
//           wh.warehouseName.toLowerCase().includes(value.toLowerCase()) ||
//           wh.warehouseCode.toLowerCase().includes(value.toLowerCase())
//       );
//       setFilteredWarehouses(filtered);
//       setShowWarehouseDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowWarehouseDropdown(false);
//     }
//   };

//   const handleWarehouseSelect = async (index, selectedWarehouse) => {
//     onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
//     onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
//     onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });

//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`/api/warehouse/${selectedWarehouse.warehouseCode}/bins`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
//     } catch (err) {
//       console.error(err);
//       onItemChange(index, { target: { name: "binLocations", value: [] } });
//     }

//     setShowWarehouseDropdown(false);
//   };

//   /* ---------- render ---------- */
//   return (
//     <div className="overflow-x-auto">
//       <div className="max-w-[1200px]">
//         <table className="min-w-full table-auto border-collapse">
//           <thead>
//             <tr className="bg-blue-500 text-white">
//               <th className="border p-2 whitespace-nowrap">Item Code</th>
//               <th className="border p-2 whitespace-nowrap">Item Name</th>
//               <th className="border p-2 whitespace-nowrap">Description</th>
//               <th className="border p-2 whitespace-nowrap">Qty</th>
//               <th className="border p-2 whitespace-nowrap">Unit Price</th>
//               <th className="border p-2 whitespace-nowrap">Discount</th>
//               <th className="border p-2 whitespace-nowrap">Price</th>
//               <th className="border p-2 whitespace-nowrap">Freight</th>
//               <th className="border p-2 whitespace-nowrap">Total</th>
//               <th className="border p-2 whitespace-nowrap">Tax Option</th>
//               {globalTaxOption === "GST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">GST %</th>
//                   <th className="border p-2 whitespace-nowrap">GST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">CGST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">SGST Amt</th>
//                 </>
//               )}
//               {globalTaxOption === "IGST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">IGST %</th>
//                   <th className="border p-2 whitespace-nowrap">IGST Amt</th>
//                 </>
//               )}
//               <th className="border p-2 whitespace-nowrap">Warehouse</th>
//               <th className="border p-2 whitespace-nowrap">Bin</th>
//               <th className="border p-2 whitespace-nowrap">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((item, index) => {
//               const computedValues = computeItemValues(item);
//               return (
//                 <tr key={index} className="border-t hover:bg-gray-50">
//                   {/* Item Code */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       value={item.itemCode ?? ""}
//                       onChange={(e) => handleSearchChangecode(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Code"
//                     />
//                   </td>
//                   {/* Item Name */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.itemName ?? ""}
//                       onChange={(e) => handleSearchChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Name"
//                     />
//                     {showDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredItems.map((itm) => (
//                           <div
//                             key={itm._id}
//                             className="p-1 hover:bg-gray-100 cursor-pointer"
//                             onClick={() => handleItemSelect(index, itm)}
//                           >
//                             {itm.itemName}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                     {noMatchInfo.index === index && (
//                       <div className="mt-1 text-xs bg-yellow-50 border border-yellow-200 p-1 rounded">
//                         No item found.{" "}
//                         <button
//                           className="text-blue-600 underline"
//                           onClick={() => createNewItemFromSearch(index)}
//                         >
//                           Add new item
//                         </button>
//                       </div>
//                     )}
//                   </td>
//                   {/* Description */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       name="itemDescription"
//                       value={item.itemDescription ?? ""}
//                       onChange={(e) => onItemChange(index, e)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Quantity */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.quantity ?? 0}
//                       onChange={(e) => handleFieldChange(index, "quantity", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Unit Price */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.unitPrice ?? 0}
//                       onChange={(e) => handleFieldChange(index, "unitPrice", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Discount */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.discount ?? 0}
//                       onChange={(e) => handleFieldChange(index, "discount", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Price After Discount */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.priceAfterDiscount ?? 0}
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   {/* Freight */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.freight ?? 0}
//                       onChange={(e) => handleFieldChange(index, "freight", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   {/* Total */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       value={item.totalAmount ?? 0}
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   {/* Tax Option */}
//                   <td className="p-2 border">
//                     <select
//                       value={item.taxOption || "GST"}
//                       onChange={(e) => handleTaxOptionChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                     >
//                       <option value="GST">GST</option>
//                       <option value="IGST">IGST</option>
//                     </select>
//                   </td>
//                   {/* GST / IGST */}
//                   {item.taxOption === "GST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           value={item.gstRate ?? 0}
//                           onChange={(e) => handleGstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.gstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.cgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.sgstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                     </>
//                   )}
//                   {item.taxOption === "IGST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           value={item.igstRate ?? 0}
//                           onChange={(e) => handleIgstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input type="number" value={computedValues.igstAmount} readOnly className="w-full p-1 border rounded bg-gray-100" />
//                       </td>
//                     </>
//                   )}
//                   {/* Warehouse */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.warehouseName ?? ""}
//                       onChange={(e) => handleSearchChangeWarehouse(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                     {showWarehouseDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredWarehouses.map((wh) => (
//                           <div
//                             key={wh._id}
//                             className="p-1 hover:bg-gray-100 cursor-pointer"
//                             onClick={() => handleWarehouseSelect(index, wh)}
//                           >
//                             {wh.warehouseName} ({wh.warehouseCode})
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </td>
//                   {/* Bin */}
//               {/* <td className="p-2 border">
//   {item.binLocations?.length > 0 ? (
//     <select
//       value={item.selectedBin?._id || ""}
//       onChange={(e) => {
//         const bin = item.binLocations.find((b) => b._id === e.target.value) || null;
//         onItemChange(index, { target: { name: "selectedBin", value: bin } });
//       }}
//       className="w-full border rounded px-2 py-1 text-sm"
//       style={{ minWidth: "120px", maxWidth: "160px" }} // keeps dropdown compact
//     >
//       <option value="">Select Bin</option>
//       {item.binLocations.map((bin) => (
//         <option key={bin._id} value={bin._id}>
//           {bin.code} 
//         </option>
//       ))}
//     </select>
//   ) : (
//     <span className="text-gray-400 text-sm">N/A</span>
//   )}
// </td> */}





// <td className="p-2 border">
//   {item.binLocations?.length > 0 ? (
//     <select
//       value={item.selectedBin?._id || ""}
//       // ✅ THIS IS THE CORRECTED LOGIC
//       onChange={(e) => {
//         // Find the full bin object from the binLocations array based on the selected _id
//         const fullBinObject = item.binLocations.find(
//           (b) => b._id === e.target.value
//         ) || null;
        
//         // Update the parent form's state with the entire object
//         onItemChange(index, { 
//           target: { name: "selectedBin", value: fullBinObject } 
//         });
//       }}
//       className="w-full border rounded px-2 py-1 text-sm"
//         style={{ minWidth: "120px", maxWidth: "160px" }}
//     >
//       <option value="">Select Bin</option>
//       {item.binLocations.map((bin) => (
//         <option key={bin._id} value={bin._id}>
//           {bin.code} {/* e.g., b001 */}
//         </option>
//       ))}
//     </select>
//   ) : (
//     <span className="text-gray-400 text-sm">N/A</span>
//   )}
// </td>


//                   {/* Actions */}
//                   <td className="p-2 border">
//                     <button
//                       type="button"
//                       onClick={() => onRemoveItem(index)}
//                       className="text-red-600 hover:underline"
//                     >
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-5 w-5"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                         />
//                       </svg>
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//         <button
//           type="button"
//           onClick={onAddItem}
//           className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//         >
//           Add Item
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ItemSection;







// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import PropTypes from "prop-types";

// /* ---------- helpers ---------- */
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {


  
//   const quantity  = parseFloat(item.quantity)  || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount  = parseFloat(item.discount)  || 0;
//   const freight   = parseFloat(item.freight)   || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount        = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate   = parseFloat(item.gstRate) || 0;
//     const cgstRate  = gstRate / 2;
//     const sgstRate  = gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount  = cgstAmount + sgstAmount;
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   }

//   if (item.taxOption === "IGST") {
//     let igstRate = item.igstRate;
//     if (igstRate === undefined || parseFloat(igstRate) === 0) {
//       igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
//     } else {
//       igstRate = parseFloat(igstRate);
//     }
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }

//   return {
//     priceAfterDiscount,
//     totalAmount,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: 0,
//   };
// };

// /* ---------- main component ---------- */
// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
//   /* --- runtime props check --- */
//   ItemSection.propTypes = {
//     items: PropTypes.array.isRequired,
//     onItemChange: PropTypes.func.isRequired,
//     onAddItem: PropTypes.func,
//     onRemoveItem: PropTypes.func,
//   };

//   /* --- local state --- */
//   const [apiItems, setApiItems]             = useState([]);
//   const [warehouses, setWarehouses]         = useState([]);
//   const [filteredItems, setFilteredItems]   = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);

//   const [showDropdown, setShowDropdown]                 = useState(false);
//   const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
//   const [activeDropdownIndex, setActiveDropdownIndex]   = useState(null);

//   // NEW: track “no match” so we can offer Add‑new
//   const [noMatchInfo, setNoMatchInfo] = useState({ index: null, text: "" });


//     const handleWarehouseSelect = async (index, selectedWarehouse) => {
//     onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
//     onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
//     onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });

//     // Fetch bins
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`/api/warehouse/${selectedWarehouse.warehouseCode}/bins`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       onItemChange(index, { target: { name: "binLocations", value: res.data.success ? res.data.data || [] : [] } });
//     } catch (err) {
//       console.error(err);
//       onItemChange(index, { target: { name: "binLocations", value: [] } });
//     }

//     setShowWarehouseDropdown(false);
//   };



//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       console.error("No token found");
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         const [itemsRes, warehouseRes] = await Promise.all([
//           axios.get("/api/items", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//           axios.get("/api/warehouse", {
//             headers: { Authorization: `Bearer ${token}` },
//           }),
//         ]);

//         // ✅ Check API response structure
//         if (itemsRes.data.success) {
//           setApiItems(itemsRes.data.data || []);
//         } else {
//           console.error("Failed to fetch items:", itemsRes.data.message);
//         }

//         if (warehouseRes.data.success) {
//           setWarehouses(warehouseRes.data.data || []);
//         } else {
//           console.error("Failed to fetch warehouses:", warehouseRes.data.message);
//         }
//       } catch (err) {
//         console.error("Error fetching data:", err.message);
//       }
//     };

//     fetchData();
//   }, []);


//   /* ---------- search helpers ---------- */
//   const globalTaxOption =
//     items && items.length > 0 ? items[0].taxOption || "GST" : "GST";

//   const handleSearchChange = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });

//     if (value.length === 0) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }

//     const filtered = apiItems.filter((itm) =>
//       itm.itemName.toLowerCase().includes(value.toLowerCase())
//     );

//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       // nothing found – offer Add‑new shortcut
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };

//   const handleSearchChangecode = (index, value) => {
//     onItemChange(index, { target: { name: "itemCode", value } });

//     if (value.length === 0) {
//       setShowDropdown(false);
//       setNoMatchInfo({ index: null, text: "" });
//       return;
//     }

//     const filtered = apiItems.filter((itm) =>
//       itm.itemCode?.toLowerCase().includes(value.toLowerCase())
//     );

//     if (filtered.length) {
//       setFilteredItems(filtered);
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//       setNoMatchInfo({ index: null, text: "" });
//     } else {
//       setShowDropdown(false);
//       setNoMatchInfo({ index, text: value });
//     }
//   };

//   const createNewItemFromSearch = (index) => {
//     /*  We mark the row as a brand‑new item.
//         All other cells are already editable, so just stash the name/code
//         (depending on which search box triggered the “no match”). */
//     const currentRow = items[index] || {};

//     const updatedRow = {
//       ...currentRow,
//       itemName: currentRow.itemName || noMatchInfo.text,
//       itemCode: currentRow.itemCode || "",
//       isNewItem: true,
//       taxOption: currentRow.taxOption || globalTaxOption,
//     };

//     Object.entries(updatedRow).forEach(([key, value]) =>
//       onItemChange(index, { target: { name: key, value } })
//     );

//     // clear banner
//     setNoMatchInfo({ index: null, text: "" });
//   };

//   /* ... all your existing field‑change helpers stay unchanged ... */
//   /* (copy verbatim from previous file) */
//   /* ---------- START unchanged helpers ---------- */
//   const handleSearchChangeWarehouse = (index, value) => {
//     onItemChange(index, { target: { name: "warehouseName", value } });
//     if (value.length > 0) {
//       setFilteredWarehouses(
//         warehouses.filter(
//           (wh) =>
//             wh.warehouseName.toLowerCase().includes(value.toLowerCase()) ||
//             wh.warehouseCode.toLowerCase().includes(value.toLowerCase())
//         )
//       );
//       setShowWarehouseDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowWarehouseDropdown(false);
//     }
//   };


//   // handle selecting a warehouse from the dropdown bin
  

//   // const handleWarehouseSelect = (index, selectedWarehouse) => {
//   //   onItemChange(index, {
//   //     target: { name: "warehouse", value: selectedWarehouse._id },
//   //   });
//   //   onItemChange(index, {
//   //     target: { name: "warehouseName", value: selectedWarehouse.warehouseName },
//   //   });
//   //   onItemChange(index, {
//   //     target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode },
//   //   });
//   //   setShowWarehouseDropdown(false);
//   // };

//   const handleFieldChange = (index, field, value) => {
//     const newValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, [field]: newValue };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: field, value: newValue } });
//     onItemChange(index, {
//       target: { name: "priceAfterDiscount", value: computed.priceAfterDiscount },
//     });
//     onItemChange(index, {
//       target: { name: "totalAmount", value: computed.totalAmount },
//     });
//     onItemChange(index, {
//       target: { name: "gstAmount", value: computed.gstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "cgstAmount", value: computed.cgstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "sgstAmount", value: computed.sgstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "igstAmount", value: computed.igstAmount },
//     });
//   };

//   const handleGstRateChange = (index, value) => {
//     const newGstRate = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, gstRate: newGstRate };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: "gstRate", value: newGstRate } });
//     onItemChange(index, {
//       target: { name: "gstAmount", value: computed.gstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "cgstAmount", value: computed.cgstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "sgstAmount", value: computed.sgstAmount },
//     });
//   };

//   const handleIgstRateChange = (index, value) => {
//     const newIgstRate = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, igstRate: newIgstRate };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: "igstRate", value: newIgstRate } });
//     onItemChange(index, {
//       target: { name: "igstAmount", value: computed.igstAmount },
//     });
//   };

//   const handleTaxOptionChange = (index, value) => {
//     onItemChange(index, { target: { name: "taxOption", value } });
//     const currentItem = items[index] || {};
//     let updatedItem = { ...currentItem, taxOption: value };
//     if (
//       value === "IGST" &&
//       (!currentItem.igstRate || parseFloat(currentItem.igstRate) === 0)
//     ) {
//       updatedItem.igstRate = currentItem.gstRate || 0;
//       onItemChange(index, {
//         target: { name: "igstRate", value: updatedItem.igstRate },
//       });
//     }
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, {
//       target: { name: "priceAfterDiscount", value: computed.priceAfterDiscount },
//     });
//     onItemChange(index, {
//       target: { name: "totalAmount", value: computed.totalAmount },
//     });
//     onItemChange(index, {
//       target: { name: "gstAmount", value: computed.gstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "cgstAmount", value: computed.cgstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "sgstAmount", value: computed.sgstAmount },
//     });
//     onItemChange(index, {
//       target: { name: "igstAmount", value: computed.igstAmount },
//     });
//   };

//   const handleItemSelect = (index, selectedItem) => {
//     const itemId = selectedItem._id;
//     if (!itemId) {
//       console.error("Selected item does not have a valid _id.");
//       return;
//     }

//     const unitPrice = parseFloat(selectedItem.unitPrice) || 0;
//     const discount  = parseFloat(selectedItem.discount) || 0;
//     const freight   = parseFloat(selectedItem.freight) || 0;
//     const quantity  = 1;

//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate   = selectedItem.gstRate !== undefined ? parseFloat(selectedItem.gstRate) : 0;
//     let igstRate = 0;
//     if (taxOption === "IGST") {
//       igstRate =
//         selectedItem.igstRate !== undefined && parseFloat(selectedItem.igstRate) !== 0
//           ? parseFloat(selectedItem.igstRate)
//           : gstRate;
//     }
//     const cgstRate = selectedItem.cgstRate !== undefined ? parseFloat(selectedItem.cgstRate) : gstRate / 2;
//     const sgstRate = selectedItem.sgstRate !== undefined ? parseFloat(selectedItem.sgstRate) : gstRate / 2;

//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount        = quantity * priceAfterDiscount + freight;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount  = cgstAmount + sgstAmount;

//     const updatedItem = {
//       item: itemId,
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       unitPrice,
//       discount,
//       managedBy: selectedItem?.managedBy,
//       freight,
//       gstRate,
//       igstRate,
//       cgstRate,
//       sgstRate,
//       taxOption,
//       quantity,
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: round(totalAmount * (igstRate / 100)),
//       isNewItem: false,
//     };

//     Object.entries(updatedItem).forEach(([key, value]) =>
//       onItemChange(index, { target: { name: key, value } })
//     );

//     setShowDropdown(false);
//     setNoMatchInfo({ index: null, text: "" });
//   };
//   /* ---------- END unchanged helpers ---------- */

//   /* -------------------------------- render -------------------------------- */
//   return (
//     <div className="overflow-x-auto">
//       <div className="max-w-[120px]">
//         <table className="min-w-full table-auto border-collapse">
//           <thead>
//             {/* === header row === */}
//             <tr className="bg-blue-500 text-white">
//               <th className="border p-2 whitespace-nowrap">Item Code</th>
//               <th className="border p-2 whitespace-nowrap">Item Name</th>
//               <th className="border p-2 whitespace-nowrap">Item Description</th>
//               <th className="border p-2 whitespace-nowrap">Quantity</th>
//               <th className="border p-2 whitespace-nowrap">Unit Price</th>
//               <th className="border p-2 whitespace-nowrap">Discount</th>
//               <th className="border p-2 whitespace-nowrap">Price</th>
//               <th className="border p-2 whitespace-nowrap">Freight</th>
//               <th className="border p-2 whitespace-nowrap">Total</th>
//               <th className="border p-2 whitespace-nowrap">Tax Option</th>
//               {globalTaxOption === "GST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">GST Rate (%)</th>
//                   <th className="border p-2 whitespace-nowrap">GST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">CGST Amt</th>
//                   <th className="border p-2 whitespace-nowrap">SGST Amt</th>
//                 </>
//               )}
//               {globalTaxOption === "IGST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">IGST Rate (%)</th>
//                   <th className="border p-2 whitespace-nowrap">IGST Amt</th>
//                 </>
//               )}
              
//               <th className="border p-2 whitespace-nowrap">Warehouse</th>
//               <th className="border p-2 whitespace-nowrap ">Bin</th>
//               <th className="border p-2 whitespace-nowrap">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {items.map((item, index) => {
//               const computedValues = computeItemValues(item);
//               return (
//                 <tr key={index} className="border-t hover:bg-gray-50">
//                   {/* -------- Item Code -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       value={item.itemCode ?? ""}
//                       onChange={(e) =>
//                         handleSearchChangecode(index, e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Code"
//                     />
//                   </td>

//                   {/* -------- Item Name -------- */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.itemName ?? ""}
//                       onChange={(e) =>
//                         handleSearchChange(index, e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Name"
//                     />

//                     {/* dropdown with matches */}
//                     {showDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredItems.map((filteredItem) => (
//                           <div
//                             key={filteredItem.itemCode}
//                             className="p-1 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
//                             onClick={() =>
//                               handleItemSelect(index, filteredItem)
//                             }
//                           >
//                             {filteredItem.itemName}
//                           </div>
//                         ))}
//                       </div>
//                     )}

//                     {/* “no match” banner */}
//                     {noMatchInfo.index === index && (
//                       <div className="mt-1 text-xs bg-yellow-50 border border-yellow-200 p-1 rounded">
//                         No item found.{" "}
//                         <button
//                           type="button"
//                           className="text-blue-600 underline"
//                           onClick={() => createNewItemFromSearch(index)}
//                         >
//                           Add new item
//                         </button>
//                       </div>
//                     )}
//                   </td>

//                   {/* -------- Description -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       name="itemDescription"
//                       value={item.itemDescription ?? ""}
//                       onChange={(e) => onItemChange(index, e)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>

//                   {/* -------- Quantity -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="quantity"
//                       value={item.quantity ?? 0}
//                       onChange={(e) =>
//                         handleFieldChange(index, "quantity", e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>

//                   {/* -------- Unit Price -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="unitPrice"
//                       value={item.unitPrice ?? 0}
//                       onChange={(e) =>
//                         handleFieldChange(index, "unitPrice", e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>

//                   {/* -------- Discount -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="discount"
//                       value={item.discount ?? 0}
//                       onChange={(e) =>
//                         handleFieldChange(index, "discount", e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>

//                   {/* -------- Price After Discount -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="priceAfterDiscount"
//                       value={
//                         item.priceAfterDiscount !== undefined
//                           ? round(item.priceAfterDiscount)
//                           : round((item.unitPrice ?? 0) - (item.discount ?? 0))
//                       }
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>

//                   {/* -------- Freight -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="freight"
//                       value={item.freight ?? 0}
//                       onChange={(e) =>
//                         handleFieldChange(index, "freight", e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>

//                   {/* -------- Total -------- */}
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="totalAmount"
//                       value={
//                         item.totalAmount !== undefined
//                           ? round(item.totalAmount)
//                           : 0
//                       }
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>

//                   {/* -------- Tax Option -------- */}
//                   <td className="p-2 border">
//                     <select
//                       name="taxOption"
//                       value={item.taxOption || "GST"}
//                       onChange={(e) =>
//                         handleTaxOptionChange(index, e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                     >
//                       <option value="GST">GST</option>
//                       <option value="IGST">IGST</option>
//                     </select>
//                   </td>

//                   {/* -------- GST / IGST columns -------- */}
//                   {item.taxOption === "GST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="gstRate"
//                           value={item.gstRate ?? 0}
//                           onChange={(e) =>
//                             handleGstRateChange(index, e.target.value)
//                           }
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="gstAmount"
//                           value={computedValues.gstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
                    
                      
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="cgstAmount"
//                           value={computedValues.cgstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="sgstAmount"
//                           value={computedValues.sgstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                     </>
//                   )}

//                   {item.taxOption === "IGST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="igstRate"
//                           value={item.igstRate ?? 0}
//                           onChange={(e) =>
//                             handleIgstRateChange(index, e.target.value)
//                           }
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="igstAmount"
//                           value={computedValues.igstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                     </>
//                   )}

//                   {/* -------- Warehouse -------- */}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.warehouseName || ""}
//                       onChange={(e) =>
//                         handleSearchChangeWarehouse(index, e.target.value)
//                       }
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Warehouse"
//                     />
//                     {showWarehouseDropdown &&
//                       activeDropdownIndex === index && (
//                         <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                           {filteredWarehouses.map((wh) => (
//                             <div
//                               key={wh.warehouseCode}
//                               className="p-1 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
//                               onClick={() => handleWarehouseSelect(index, wh)}
//                             >
//                               {wh.warehouseName} ({wh.warehouseCode})
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                   </td>

//                   {/* -------- Bin -------- */}
//                          <td className="border p-2 relative ">
//             {item.binLocations?.length > 0 ? (
//               <select
//                 value={item.selectedBin?._id || ""}
                // onChange={(e) => {
                //   const bin = item.binLocations.find((b) => b._id === e.target.value);
                //   onItemChange(index, { target: { name: "selectedBin", value: bin } });
                // }}
//                 className="w-full border rounded px-2 py-1"
//               >
//                 <option value="">Select Bin</option>
//                 {item.binLocations.map((bin) => (
//                   <option key={bin._id} value={bin._id}>
//                     {bin.code}
//                   </option>
//                 ))}
//               </select>
//             ) : (
//               <span className="text-gray-400 text-sm px-2">No bins</span>
//             )}
//           </td>


//                   {/* -------- Actions -------- */}
//                   <td className="p-2 border text-center">
//                     <button
//                       onClick={() => onRemoveItem(index)}
//                       className="text-red-500 hover:text-red-700"
//                       title="Remove item"
//                     >
                      // <svg
                      //   xmlns="http://www.w3.org/2000/svg"
                      //   className="h-5 w-5"
                      //   fill="none"
                      //   viewBox="0 0 24 24"
                      //   stroke="currentColor"
                      // >
                      //   <path
                      //     strokeLinecap="round"
                      //     strokeLinejoin="round"
                      //     strokeWidth={2}
                      //     d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      //   />
                      // </svg>
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>

//         {/* ---- Add Item button ---- */}
//         {onAddItem && (
//           <div className="mt-4 flex justify-between">
//             <button
//               onClick={onAddItem}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//             >
//               Add Item
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ItemSection;












// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";

// import PropTypes from 'prop-types';

// // Add this before your component definition

// // Helper function to round a number to two decimal places.
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// // Computes derived fields based on an item object.
// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//   // Parse GST rate (default to 0 if invalid)
//   const gstRate = parseFloat(item.gstRate) || 0;
  
//   // Calculate CGST and SGST rates (split GST rate equally)
//   const cgstRate =  (gstRate / 2);
//   const sgstRate = (gstRate / 2);
  
//   // Calculate tax amounts (remove the /100 division since rates are already percentages)
//   const cgstAmount = round(totalAmount * (cgstRate / 100));
//   const sgstAmount = round(totalAmount * (sgstRate / 100));
//   const gstAmount = cgstAmount + sgstAmount;
  
//   return { 
//     priceAfterDiscount, 
//     totalAmount, 
//     gstAmount, 
//     cgstAmount, 
//     sgstAmount, 
//     igstAmount: 0 
//   };
// }else if (item.taxOption === "IGST") {
//     let igstRate = item.igstRate;
//     if (igstRate === undefined || parseFloat(igstRate) === 0) {
//       igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
//     } else {
//       igstRate = parseFloat(igstRate);
//     }
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount };
//   }
//   return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
// };

// const ItemSection = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
//   ItemSection.propTypes = {
//   items: PropTypes.array.isRequired,
//   onItemChange: PropTypes.func.isRequired,
//   onAddItem: PropTypes.func.isRequired,
//   onRemoveItem: PropTypes.func.isRequired // This will warn if missing
// };

//   const [apiItems, setApiItems] = useState([]);
//   const [warehouses, setWarehouses] = useState([]);
//   const [filteredItems, setFilteredItems] = useState([]);
//   const [filteredWarehouses, setFilteredWarehouses] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
//   const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

//   useEffect(() => {
//     axios
//       .get("/api/items")
//       .then((res) => setApiItems(res.data))
//       .catch((err) => console.error("Error fetching items:", err));
//   }, []);

//   useEffect(() => {
//     axios
//       .get("/api/warehouse")
//       .then((res) => setWarehouses(res.data))
//       .catch((err) => console.error("Error fetching warehouses:", err));
//   }, []);

//   const globalTaxOption = items && items.length > 0 ? items[0].taxOption || "GST" : "GST";

//   const handleSearchChange = (index, value) => {
//     onItemChange(index, { target: { name: "itemName", value } });
//     if (value.length > 0) {
//       setFilteredItems(
//         apiItems.filter((itm) =>
//           itm.itemName.toLowerCase().includes(value.toLowerCase())
//         )
//       );
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowDropdown(false);
//     }
//   };

//     const handleSearchChangecode = (index, value) => {
      
//     onItemChange(index, { target: { name: "itemCode", value } });
//     if (value.length > 0) {
//       setFilteredItems(
//         apiItems.filter((itm) =>
//           itm.itemName.toLowerCase().includes(value.toLowerCase())
//         )
//       );
//       setShowDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowDropdown(false);
//     }
//   };


//   const handleSearchChangeWarehouse = (index, value) => {
//     onItemChange(index, { target: { name: "warehouseName", value } });
//     if (value.length > 0) {
//       setFilteredWarehouses(
//         warehouses.filter((wh) =>
//           wh.warehouseName.toLowerCase().includes(value.toLowerCase()) ||
//           wh.warehouseCode.toLowerCase().includes(value.toLowerCase())
//         )
//       );
//       setShowWarehouseDropdown(true);
//       setActiveDropdownIndex(index);
//     } else {
//       setShowWarehouseDropdown(false);
//     }
//   };

//   const handleWarehouseSelect = (index, selectedWarehouse) => {
//     onItemChange(index, { target: { name: "warehouse", value: selectedWarehouse._id } });
//     onItemChange(index, { target: { name: "warehouseName", value: selectedWarehouse.warehouseName } });
//     onItemChange(index, { target: { name: "warehouseCode", value: selectedWarehouse.warehouseCode } });
//     setShowWarehouseDropdown(false);
//   };

//   const handleFieldChange = (index, field, value) => {
//     const newValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, [field]: newValue };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: field, value: newValue } });
//     onItemChange(index, { target: { name: "priceAfterDiscount", value: computed.priceAfterDiscount } });
//     onItemChange(index, { target: { name: "totalAmount", value: computed.totalAmount } });
//     onItemChange(index, { target: { name: "gstAmount", value: computed.gstAmount } });
//     onItemChange(index, { target: { name: "cgstAmount", value: computed.cgstAmount } });
//     onItemChange(index, { target: { name: "sgstAmount", value: computed.sgstAmount } });
//     onItemChange(index, { target: { name: "igstAmount", value: computed.igstAmount } });
//   };

//   const handleGstRateChange = (index, value) => {
//     const newGstRate = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, gstRate: newGstRate };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: "gstRate", value: newGstRate } });
//     onItemChange(index, { target: { name: "gstAmount", value: computed.gstAmount } });
//     onItemChange(index, { target: { name: "cgstAmount", value: computed.cgstAmount } });
//     onItemChange(index, { target: { name: "sgstAmount", value: computed.sgstAmount } });
//   };

//   const handleIgstRateChange = (index, value) => {
//     const newIgstRate = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
//     const currentItem = items[index] || {};
//     const updatedItem = { ...currentItem, igstRate: newIgstRate };
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: "igstRate", value: newIgstRate } });
//     onItemChange(index, { target: { name: "igstAmount", value: computed.igstAmount } });
//   };

//   const handleTaxOptionChange = (index, value) => {
//     onItemChange(index, { target: { name: "taxOption", value } });
//     const currentItem = items[index] || {};
//     let updatedItem = { ...currentItem, taxOption: value };
//     if (value === "IGST" && (!currentItem.igstRate || parseFloat(currentItem.igstRate) === 0)) {
//       updatedItem.igstRate = currentItem.gstRate || 0;
//       onItemChange(index, { target: { name: "igstRate", value: updatedItem.igstRate } });
//     }
//     const computed = computeItemValues(updatedItem);
//     onItemChange(index, { target: { name: "priceAfterDiscount", value: computed.priceAfterDiscount } });
//     onItemChange(index, { target: { name: "totalAmount", value: computed.totalAmount } });
//     onItemChange(index, { target: { name: "gstAmount", value: computed.gstAmount } });
//     onItemChange(index, { target: { name: "cgstAmount", value: computed.cgstAmount } });
//     onItemChange(index, { target: { name: "sgstAmount", value: computed.sgstAmount } });
//     onItemChange(index, { target: { name: "igstAmount", value: computed.igstAmount } });
//   };

//   const handleItemSelect = (index, selectedItem) => {
//     const itemId = selectedItem._id;
//     if (!itemId) {
//       console.error("Selected item does not have a valid _id.");
//       return;
//     }
//     const unitPrice = parseFloat(selectedItem.unitPrice) || 0;
//     const discount = parseFloat(selectedItem.discount) || 0;
//     const freight = parseFloat(selectedItem.freight) || 0;
//     const quantity = 1;

//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = selectedItem.gstRate !== undefined ? parseFloat(selectedItem.gstRate) : 0;
//     let igstRate = 0;
//     if (taxOption === "IGST") {
//       igstRate =
//         selectedItem.igstRate !== undefined && parseFloat(selectedItem.igstRate) !== 0
//           ? parseFloat(selectedItem.igstRate)
//           : gstRate;
//     }
//     const cgstRate = selectedItem.cgstRate !== undefined ? parseFloat(selectedItem.cgstRate) : (gstRate / 2);
//     const sgstRate = selectedItem.sgstRate !== undefined ? parseFloat(selectedItem.sgstRate) : (gstRate / 2);

//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount = quantity * priceAfterDiscount + freight;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = cgstAmount + sgstAmount;

//     const updatedItem = {
//       item: itemId,
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       unitPrice,
//       discount,
//       managedBy: selectedItem?.managedBy,
//       freight,
//       gstRate,
//       igstRate,
//       cgstRate,
//       sgstRate,
//       taxOption,
//       quantity,
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: round(totalAmount * (igstRate / 100)),
//     };

//     Object.entries(updatedItem).forEach(([key, value]) => {
//       onItemChange(index, { target: { name: key, value } });
//     });
//     setShowDropdown(false);
//   };


//   return (
//     <div className="overflow-x-auto">
//       <div className="max-w-[120px]">
//         <table className="min-w-full table-auto border-collapse">
//           <thead>
//             <tr className="bg-blue-500 text-white">
//               <th className="border p-2 whitespace-nowrap">Item Code</th>
//               <th className="border p-2 whitespace-nowrap">Item Name</th>
//               <th className="border p-2 whitespace-nowrap">Item Description</th>
//               <th className="border p-2 whitespace-nowrap">Quantity</th>
//               <th className="border p-2 whitespace-nowrap">Unit Price</th>
//               <th className="border p-2 whitespace-nowrap">Discount</th>
//               <th className="border p-2 whitespace-nowrap">Price</th>
//               <th className="border p-2 whitespace-nowrap">Freight</th>
//               <th className="border p-2 whitespace-nowrap">Total</th>
//               <th className="border p-2 whitespace-nowrap">Tax Option</th>
//               {globalTaxOption === "GST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">GST Rate (%)</th>
//                   <th className="border p-2 whitespace-nowrap">GST Amount</th>
//                   <th className="border p-2 whitespace-nowrap">CGST Amount</th>
//                   <th className="border p-2 whitespace-nowrap">SGST Amount</th>
//                 </>
//               )}
//               {globalTaxOption === "IGST" && (
//                 <>
//                   <th className="border p-2 whitespace-nowrap">IGST Rate (%)</th>
//                   <th className="border p-2 whitespace-nowrap">IGST Amount</th>
//                 </>
//               )}
//               <th className="border p-2 whitespace-nowrap">Warehouse</th>
//               <th className="border p-2 whitespace-nowrap">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((item, index) => {
//               const computedValues = computeItemValues(item);
//               return (
//                 <tr key={index} className="border-t hover:bg-gray-50">
//                   <td className="p-2 border relative ">
//                     <input
//                       type="text"
//                       value={item.itemCode ?? ""}
//                        onChange={(e) => handleSearchChangecode(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Item Code"
//                     />
                    
//                   </td>
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.itemName ?? ""}
//                       onChange={(e) => handleSearchChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Item Name"
//                     />
//                     {showDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredItems.map((filteredItem) => (
//                           <div
//                             key={filteredItem.itemCode}
//                             className="p-1 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
//                             onClick={() => handleItemSelect(index, filteredItem)}
//                           >
//                             {filteredItem.itemName}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="text"
//                       name="itemDescription"
//                       value={item.itemDescription ?? ""}
//                       onChange={(e) => onItemChange(index, e)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="quantity"
//                       value={item.quantity ?? 0}
//                       onChange={(e) => handleFieldChange(index, "quantity", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="unitPrice"
//                       value={item.unitPrice ?? 0}
//                       onChange={(e) => handleFieldChange(index, "unitPrice", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="discount"
//                       value={item.discount ?? 0}
//                       onChange={(e) => handleFieldChange(index, "discount", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="priceAfterDiscount"
//                       value={
//                         item.priceAfterDiscount !== undefined
//                           ? round(item.priceAfterDiscount)
//                           : round((item.unitPrice ?? 0) - (item.discount ?? 0))
//                       }
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="freight"
//                       value={item.freight ?? 0}
//                       onChange={(e) => handleFieldChange(index, "freight", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <input
//                       type="number"
//                       name="totalAmount"
//                       value={item.totalAmount !== undefined ? round(item.totalAmount) : 0}
//                       readOnly
//                       className="w-full p-1 border rounded bg-gray-100"
//                     />
//                   </td>
//                   <td className="p-2 border">
//                     <select
//                       name="taxOption"
//                       value={item.taxOption || "GST"}
//                       onChange={(e) => handleTaxOptionChange(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                     >
//                       <option value="GST">GST</option>
//                       <option value="IGST">IGST</option>
//                     </select>
//                   </td>
//                   {item.taxOption === "GST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="gstRate"
//                           value={item.gstRate ?? 0}
//                           onChange={(e) => handleGstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="gstAmount"
//                           value={computedValues.gstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="cgstAmount"
//                           value={computedValues.cgstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="sgstAmount"
//                           value={computedValues.sgstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                     </>
//                   )}
//                   {item.taxOption === "IGST" && (
//                     <>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="igstRate"
//                           value={item.igstRate ?? 0}
//                           onChange={(e) => handleIgstRateChange(index, e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="p-2 border">
//                         <input
//                           type="number"
//                           name="igstAmount"
//                           value={computedValues.igstAmount}
//                           readOnly
//                           className="w-full p-1 border rounded bg-gray-100"
//                         />
//                       </td>
//                     </>
//                   )}
//                   <td className="p-2 border relative">
//                     <input
//                       type="text"
//                       value={item.warehouseName || ""}
//                       onChange={(e) => handleSearchChangeWarehouse(index, e.target.value)}
//                       className="w-full p-1 border rounded"
//                       placeholder="Search Warehouse"
//                     />
//                     {showWarehouseDropdown && activeDropdownIndex === index && (
//                       <div className="absolute bg-white border w-full max-h-40 overflow-y-auto shadow-lg rounded z-10">
//                         {filteredWarehouses.map((filteredWh) => (
//                           <div
//                             key={filteredWh.warehouseCode}
//                             className="p-1 hover:bg-gray-100 cursor-pointer whitespace-nowrap"
//                             onClick={() => handleWarehouseSelect(index, filteredWh)}
//                           >
//                             {filteredWh.warehouseName} ({filteredWh.warehouseCode})
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </td>
//                   <td className="p-2 border text-center">
//                   <button
//   onClick={() => onRemoveItem(index)}
//   className="text-red-500 hover:text-red-700"
//   title="Remove item"
// >
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-5 w-5"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         stroke="currentColor"
//                       >
//                         <path
//                           strokeLinecap="round"
//                           strokeLinejoin="round"
//                           strokeWidth={2}
//                           d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//                         />
//                       </svg>
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//         <div className="mt-4 flex justify-between">
//           {onAddItem && (
//             <button
//               onClick={onAddItem}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//             >
//               Add Item
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ItemSection;