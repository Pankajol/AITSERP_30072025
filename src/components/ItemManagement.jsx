// "use client";
// import React, { useState, useEffect } from "react"; 
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
// import WarehouseSelectorModal from "./WarehouseSelector";
// import ItemGroupSearch from "./ItemGroupSearch";

// function ItemManagement({ itemId }) {
//   const router = useRouter();
//   const [itemList, setItemList] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);

//   const [itemDetails, setItemDetails] = useState({
//     itemCode: "",
//     itemName: "",
//     description: "",
//     category: "",
//     unitPrice: "",
//     quantity: "",
//     reorderLevel: "",
//     itemType: "",
//     uom: "",
//     managedBy: "",
//     managedValue: "",
//     batchNumber: "",
//     expiryDate: "",
//     manufacturer: "",
//     length: "",
//     width: "",
//     height: "",
//     weight: "",
//     gnr: false,
//     delivery: false,
//     productionProcess: false,
//     // For quality check, now using a checkbox toggle
//     includeQualityCheck: false,
//     qualityCheckDetails: [],
//     // Tax details flags and fields:
//     includeGST: true,
//     includeIGST: false,
//     // GST details:
//     gstCode: "",
//     gstName: "",
//     gstRate: "",
//     cgstRate: "",
//     sgstRate: "",
//     // IGST details:
//     igstCode: "",
//     igstName: "",
//     igstRate: "",
//     status: "",
//     active: true,
//   });

//   const [selectedCategory, setSelectedCategory] = useState(null);

//   // Handle change for all fields.
//   const handleItemDetailsChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (type === "checkbox") {
//       setItemDetails((prev) => ({ ...prev, [name]: checked }));
//       return;
//     }
//     if (name === "gstRate") {
//       const rate = parseFloat(value) || 0;
//       const halfRate = rate / 2;
//       setItemDetails((prev) => ({
//         ...prev,
//         gstRate: value,
//         cgstRate: halfRate,
//         sgstRate: halfRate,
//       }));
//     } else {
//       setItemDetails((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   // Quality Check detail handler.
//   const handleQualityCheckDetailChange = (index, e) => {
//     const { name, value } = e.target;
//     setItemDetails((prev) => {
//       const newQC = [...prev.qualityCheckDetails];
//       newQC[index] = { ...newQC[index], [name]: value };
//       return { ...prev, qualityCheckDetails: newQC };
//     });
//   };

//   const addQualityCheckItem = () => {
//     setItemDetails((prev) => ({
//       ...prev,
//       qualityCheckDetails: [
//         ...prev.qualityCheckDetails,
//         { srNo: "", parameter: "", min: "", max: "" },
//       ],
//     }));
//   };

//   const handleCategorySelect = (category) => {
//     setSelectedCategory(category);
//     setItemDetails((prev) => ({ ...prev, category: category.name }));
//   };

//   // Fetch master items list.
//   const fetchItemDetailsList = async () => {
//     try {
//       const res = await axios.get("/api/items");
//       setItemList(res.data || []);
//     } catch (error) {
//       console.error("Error fetching items:", error);
//     }
//   };

//   useEffect(() => {
//     fetchItemDetailsList();
//   }, []);

//   useEffect(() => {
//     if (itemId) {
//       const fetchItemDetails = async () => {
//         try {
//           const response = await axios.get(`/api/items/${itemId}`);
//           setItemDetails(response.data);
//           setIsEditing(true);
//         } catch (error) {
//           console.error("Error fetching item details:", error);
//         }
//       };
//       fetchItemDetails();
//     } else {
//       generateItemCode();
//     }
//   }, [itemId]);

//   const generateItemCode = async () => {
//     try {
//       const lastCodeRes = await fetch("/api/lastItemCode");
//       const { lastItemCode } = await lastCodeRes.json();
//       const lastNumber = parseInt(lastItemCode.split("-")[1], 10) || 0;
//       let newNumber = lastNumber + 1;
//       let generatedCode = "";
//       while (true) {
//         generatedCode = `ITEM-${newNumber.toString().padStart(4, "0")}`;
//         const checkRes = await axios.get(`/api/checkItemCode?code=${generatedCode}`);
//         const { exists } = checkRes.data;
//         if (!exists) break;
//         newNumber++;
//       }
//       setItemDetails((prev) => ({ ...prev, itemCode: generatedCode }));
//     } catch (error) {
//       console.error("Failed to generate code:", error);
//     }
//   };

//   const handleEdit = (item) => {
//     setItemDetails(item);
//     setIsEditing(true);
//   };

//   const handleDelete = async (id) => {
//     try {
//       await axios.delete(`/api/items/${id}`);
//       alert("Item deleted successfully!");
//     } catch (error) {
//       console.error("Error deleting item:", error);
//       alert("Failed to delete item");
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (isEditing) {
//         await axios.put(`/api/items/${itemDetails._id}`, itemDetails);
//         alert("Item updated successfully!");
//       } else {
//         await axios.post("/api/items", itemDetails);
//         alert("Item created successfully!");
//       }
//       resetForm();
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert(error.response?.data?.error || "Form submission error");
//     }
//   };

//   const resetForm = () => {
//     setItemDetails({
//       itemCode: "",
//       itemName: "",
//       description: "",
//       category: "",
//       unitPrice: "",
//       quantity: "",
//       reorderLevel: "",
//       itemType: "",
//       uom: "",
//       managedBy: "",
//       managedValue: "",
//       batchNumber: "",
//       expiryDate: "",
//       manufacturer: "",
//       length: "",
//       width: "",
//       height: "",
//       weight: "",
//       gnr: false,
//       delivery: false,
//       productionProcess: false,
//       includeQualityCheck: false,
//       qualityCheckDetails: [],
//       includeGST: true,
//       includeIGST: false,
//       gstCode: "",
//       gstName: "",
//       gstRate: "",
//       cgstRate: "",
//       sgstRate: "",
//       igstCode: "",
//       igstName: "",
//       igstRate: "",
//       status: "",
//       active: true,
//     });
//     setIsEditing(false);
//   };

//   const [filteredItems, setFilteredItems] = useState([]);
//   useEffect(() => {
//     const term = searchTerm.toLowerCase();
//     const filtered = itemList.filter((item) =>
//       item.itemCode.toLowerCase().includes(term) ||
//       item.itemName.toLowerCase().includes(term) ||
//       item.category.toLowerCase().includes(term)
//     );
//     setFilteredItems(filtered);
//   }, [searchTerm, itemList]);

//   return (
//     <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//       <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//         {isEditing ? "Edit Item" : "Create Item"}
//       </h1>
      
//       <form className="space-y-6" onSubmit={handleSubmit}>
//         {/* Basic Item Details */}
//         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Item Code</label>
//             <input
//               type="text"
//               value={itemDetails.itemCode}
//               readOnly
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Item Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               name="itemName"
//               value={itemDetails.itemName}
//               onChange={handleItemDetailsChange}
//               required
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Category <span className="text-red-500">*</span>
//             </label>
//             <ItemGroupSearch onSelectItemGroup={handleCategorySelect} />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Unit Price <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="number"
//               name="unitPrice"
//               value={itemDetails.unitPrice}
//               onChange={handleItemDetailsChange}
//               required
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Quantity <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="number"
//               name="quantity"
//               value={itemDetails.quantity}
//               onChange={handleItemDetailsChange}
//               required
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             />
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
//             <input
//               type="number"
//               name="reorderLevel"
//               value={itemDetails.reorderLevel}
//               onChange={handleItemDetailsChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             />
//           </div>
//           <div className="md:col-span-2">
//             <label className="text-sm font-medium text-gray-700 mb-2">Description</label>
//             <textarea
//               name="description"
//               value={itemDetails.description}
//               onChange={handleItemDetailsChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full h-24"
//             />
//           </div>
//         </div>

//         {/* Tax Details Checkboxes */}
//         <div className="mt-4 grid grid-cols-2 gap-4">
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               name="includeGST"
//               checked={itemDetails.includeGST}
//               onChange={handleItemDetailsChange}
//               className="mr-2"
//             />
//             <label className="text-sm font-medium text-gray-700">Include GST</label>
//           </div>
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               name="includeIGST"
//               checked={itemDetails.includeIGST}
//               onChange={handleItemDetailsChange}
//               className="mr-2"
//             />
//             <label className="text-sm font-medium text-gray-700">Include IGST</label>
//           </div>
//         </div>

//         {/* GST Details Section */}
//         {itemDetails.includeGST && (
//           <div className="mt-4 p-4 border rounded-lg bg-gray-50">
//             <h3 className="text-lg font-semibold mb-4">GST Details</h3>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">GST Code</label>
//                 <input
//                   type="text"
//                   name="gstCode"
//                   value={itemDetails.gstCode}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">GST Name</label>
//                 <input
//                   type="text"
//                   name="gstName"
//                   value={itemDetails.gstName}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">GST Rate (%)</label>
//                 <input
//                   type="number"
//                   name="gstRate"
//                   value={itemDetails.gstRate}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">CGST Rate (%)</label>
//                 <input
//                   type="number"
//                   name="cgstRate"
//                   value={itemDetails.cgstRate}
//                   readOnly
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">SGST Rate (%)</label>
//                 <input
//                   type="number"
//                   name="sgstRate"
//                   value={itemDetails.sgstRate}
//                   readOnly
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* IGST Details Section */}
//         {itemDetails.includeIGST && (
//           <div className="mt-4 p-4 border rounded-lg bg-gray-50">
//             <h3 className="text-lg font-semibold mb-4">IGST Details</h3>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">IGST Code</label>
//                 <input
//                   type="text"
//                   name="igstCode"
//                   value={itemDetails.igstCode}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">IGST Name</label>
//                 <input
//                   type="text"
//                   name="igstName"
//                   value={itemDetails.igstName}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//               <div>
//                 <label className="text-sm font-medium text-gray-700 mb-2">IGST Rate (%)</label>
//                 <input
//                   type="number"
//                   name="igstRate"
//                   value={itemDetails.igstRate}
//                   onChange={handleItemDetailsChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Quality Check Section */}
//         <div className="mt-4 grid grid-cols-2 gap-4">
//           <div className="flex items-center">
//             <input
//               type="checkbox"
//               name="includeQualityCheck"
//               checked={itemDetails.includeQualityCheck}
//               onChange={handleItemDetailsChange}
//               className="mr-2"
//             />
//             <label className="text-sm font-medium text-gray-700">Include Quality Check</label>
//           </div>
//         </div>
//         {itemDetails.includeQualityCheck && (
//           <div className="mt-4 p-4 border rounded-lg bg-gray-50">
//             <h3 className="text-lg font-semibold mb-4">Quality Check Details</h3>
//             {itemDetails.qualityCheckDetails.map((qcItem, index) => (
//               <div key={index} className="flex space-x-2 mb-2">
//                 <input
//                   type="text"
//                   name="srNo"
//                   placeholder="Sr No"
//                   value={qcItem.srNo}
//                   onChange={(e) => handleQualityCheckDetailChange(index, e)}
//                   className="border p-1 rounded w-1/4"
//                 />
//                 <input
//                   type="text"
//                   name="parameter"
//                   placeholder="Parameter"
//                   value={qcItem.parameter}
//                   onChange={(e) => handleQualityCheckDetailChange(index, e)}
//                   className="border p-1 rounded w-1/4"
//                 />
//                 <input
//                   type="text"
//                   name="min"
//                   placeholder="Min"
//                   value={qcItem.min}
//                   onChange={(e) => handleQualityCheckDetailChange(index, e)}
//                   className="border p-1 rounded w-1/4"
//                 />
//                 <input
//                   type="text"
//                   name="max"
//                   placeholder="Max"
//                   value={qcItem.max}
//                   onChange={(e) => handleQualityCheckDetailChange(index, e)}
//                   className="border p-1 rounded w-1/4"
//                 />
//               </div>
//             ))}
//             <button
//               type="button"
//               onClick={addQualityCheckItem}
//               className="bg-blue-500 text-white px-3 py-1 rounded"
//             >
//               Add Quality Check Item
//             </button>
//           </div>
//         )}

//         {/* Unit, Item Type, and Managed By */}
//         <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Unit of Measurement</label>
//             <select
//               name="uom"
//               value={itemDetails.uom}
//               onChange={handleItemDetailsChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             >
//               <option value="">Select UOM</option>
//               <option value="KG">KG</option>
//               <option value="MTP">MTP</option>
//               <option value="PC">PC</option>
//             </select>
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Item Type</label>
//             <select
//               name="itemType"
//               value={itemDetails.itemType}
//               onChange={handleItemDetailsChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             >
//               <option value="">Select Item Type</option>
//               <option value="Product">Product</option>
//               <option value="Service">Service</option>
//             </select>
//           </div>
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Managed By</label>
//             <select
//               name="managedBy"
//               value={itemDetails.managedBy}
//               onChange={(e) =>
//                 setItemDetails({
//                   ...itemDetails,
//                   managedBy: e.target.value,
//                   batchNumber: "",
//                   expiryDate: "",
//                   manufacturer: "",
//                   managedValue: "",
//                 })
//               }
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             >
//               <option value="">Select</option>
//               <option value="batch">Batch</option>
//               <option value="serial">Serial</option>
//             </select>
//           </div>
//         </div>

//         {/* Status and Dimensions/Weight */}
//         <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">Status</label>
//             <select
//               name="status"
//               value={itemDetails.status}
//               onChange={handleItemDetailsChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             >
//               <option value="">Select status</option>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//             </select>
//           </div>
//           <div className="md:col-span-2 grid grid-cols-2 gap-4">
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">Length</label>
//               <input
//                 type="number"
//                 name="length"
//                 value={itemDetails.length}
//                 onChange={handleItemDetailsChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">Width</label>
//               <input
//                 type="number"
//                 name="width"
//                 value={itemDetails.width}
//                 onChange={handleItemDetailsChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">Height</label>
//               <input
//                 type="number"
//                 name="height"
//                 value={itemDetails.height}
//                 onChange={handleItemDetailsChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">Weight</label>
//               <input
//                 type="number"
//                 name="weight"
//                 value={itemDetails.weight}
//                 onChange={handleItemDetailsChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Submit / Cancel Buttons */}
//         <div className="flex gap-3 mt-8">
//           <button
//             type="submit"
//             className={`px-6 py-3 text-white font-bold rounded-lg ${isEditing ? "bg-blue-600" : "bg-green-600"}`}
//           >
//             {isEditing ? "Update Item" : "Create Item"}
//           </button>
//           <button
//             type="button"
//             onClick={resetForm}
//             className="bg-gray-600 text-white rounded-lg px-6 py-3 font-bold"
//           >
//             Cancel
//           </button>
//         </div>
//       </form>

//       {/* Item List */}
//       <h2 className="text-2xl font-bold text-blue-600 mt-12">Item List</h2>
//       <div className="mt-6 bg-gray-100 p-6 rounded-lg shadow-lg">
//         <input
//           type="text"
//           placeholder="Search items..."
//           className="mb-4 p-2 border border-gray-300 rounded w-full"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//         />
//         <table className="table-auto w-full border border-gray-300">
//           <thead className="bg-gray-200">
//             <tr>
//               <th className="p-2 border">Item Code</th>
//               <th className="p-2 border">Item Name</th>
//               <th className="p-2 border">Category</th>
//               <th className="p-2 border">Price</th>
//               <th className="p-2 border">Stock</th>
//               <th className="p-2 border">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredItems.map((item) => (
//               <tr key={item._id} className="hover:bg-gray-50">
//                 <td className="p-2 border">{item.itemCode}</td>
//                 <td className="p-2 border">{item.itemName}</td>
//                 <td className="p-2 border">{item.category}</td>
//                 <td className="p-2 border">${item.unitPrice}</td>
//                 <td className="p-2 border">{item.quantity}</td>
//                 <td className="p-2 border flex gap-2">
//                   <button onClick={() => handleEdit(item)} className="text-blue-500">
//                     <FaEdit />
//                   </button>
//                   <button onClick={() => handleDelete(item._id)} className="text-red-500">
//                     <FaTrash />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// export default ItemManagement;



"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import ItemGroupSearch from "./ItemGroupSearch";
 import { toast } from "react-toastify";

function ItemManagement() {
  const [view, setView] = useState("list"); // 'list' or 'form'
  // const [items, setItems] = useState([]);
   const [item, setItem] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialItemState = {
    itemCode: "",
    itemName: "",
    description: "",
    category: "",
    unitPrice: "",
    quantity: "",
    reorderLevel: "",
    leadTime: "",
    itemType: "",
    uom: "",
    managedBy: "",
    managedValue: "",
    batchNumber: "",
    expiryDate: "",
    manufacturer: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    gnr: false,
    delivery: false,
    productionProcess: false,
    includeQualityCheck: false,
    qualityCheckDetails: [],
    includeGST: true,
    includeIGST: true,
    gstCode: "",
    gstName: "",
    gstRate: "",
    cgstRate: "",
    sgstRate: "",
    igstCode: "",
    igstName: "",
    igstRate: "",
    status: "active",
    active: true,
  };

  const [itemDetails, setItemDetails] = useState(initialItemState);

  // Fetch items on component mount
  // useEffect(() => {
  //   fetchItems();
  // }, []);

useEffect(() => {
  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in.");

      const response = await axios.get("/api/items", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setItem(response.data.data || []); // ✅ Ensure safe fallback
      } else {
        setError(response.data.message || "Failed to fetch items.");
      }
    } catch (err) {
      console.error("Error fetching items:", err.response?.data || err.message);
      setError("Unable to fetch items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  fetchItems();
}, []);


  // Generate item code for new items
// const generateItemCode = async () => {
//   try {
//     const res = await axios.get("/api/lastItemCode");
//     const lastCode = res.data.lastItemCode || "ITEM000";

//     // Validate code format like ITEM001
//     if (!/^ITEM\d{3}$/.test(lastCode)) {
//       throw new Error("No valid items found in the system");
//     }

//     const lastNumber = parseInt(lastCode.slice(4), 10) || 0; // get the number part
//     const newNumber = lastNumber + 1;
//     const generatedCode = `ITEM${newNumber.toString().padStart(3, "0")}`;

//     setItemDetails(prev => ({ ...prev, itemCode: generatedCode }));
//   } catch (error) {
//     console.error("Failed to generate code:", error.message);
//     setItemDetails(prev => ({ ...prev, itemCode: "ITEM000" }));
//   }
// };


const generateItemCode = async () => {
  try {
    const token = localStorage.getItem("token"); // Or however you're storing the JWT

    const res = await axios.get("/api/lastItemCode", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const lastCode = res.data.lastItemCode || "ITEM-0000";
    const num = parseInt(lastCode.split("-")[1] || "0", 10) + 1;

    // Ensure the format is like "ITEM000"
    // if (!/^ITEM\d{3}$/.test(lastCode)) {
    //   throw new Error("Invalid item code format");
    // }

    // const lastNumber = parseInt(lastCode.slice(4), 10) || 0;
    // const newNumber = lastNumber + 1;
    // const generatedCode = `ITEM${newNumber.toString().padStart(3, "0")}`;

    setItemDetails(prev => ({ ...prev, itemCode: `ITEM-${num.toString().padStart(4, "0")}` }));
  } catch (error) {
    console.error("Failed to generate item code:", error.message);
    // setItemDetails(prev => ({ ...prev, itemCode: `ITEM-${num.toString().padStart(4, "0")}` }));
  }
};



  // Handle form field changes
  const handleItemDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      setItemDetails(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    if (name === "gstRate") {
      const rate = parseFloat(value) || 0;
      const halfRate = rate / 2;
      setItemDetails(prev => ({
        ...prev,
        gstRate: value,
        cgstRate: halfRate,
        sgstRate: halfRate,
      }));
    } else {
      setItemDetails(prev => ({ ...prev, [name]: value }));
    }
  };

  // Quality Check detail handler
  const handleQualityCheckDetailChange = (index, e) => {
    const { name, value } = e.target;
    setItemDetails(prev => {
      const newQC = [...prev.qualityCheckDetails];
      newQC[index] = { ...newQC[index], [name]: value };
      return { ...prev, qualityCheckDetails: newQC };
    });
  };

  const addQualityCheckItem = () => {
    setItemDetails(prev => ({
      ...prev,
      qualityCheckDetails: [
        ...prev.qualityCheckDetails,
        { srNo: "", parameter: "", min: "", max: "" },
      ],
    }));
  };

  const handleCategorySelect = (category) => {
    setItemDetails(prev => ({ ...prev, category: category.name }));
  };

  // Form validation
  // const validate = () => {
  //   const requiredFields = [
  //     "itemName",
  //     "category",
  //     "unitPrice",
  //     "quantity",
  //     "uom",
  //     "itemType"
  //   ];

  //   for (const field of requiredFields) {
  //     if (!itemDetails[field]) {
  //       alert(`Please fill the required field: ${field}`);
  //       return false;
  //     }
  //   }
  //   return true;
  // };



const validate = () => { 
  const requiredFields = [
    "itemName",
    "category",
    "unitPrice",
    "quantity",
    "uom",
    "itemType"
  ];

  for (const field of requiredFields) {
    if (!itemDetails[field]) {
      const label = field
        .replace(/([A-Z])/g, " $1") // Convert camelCase to spaced
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
      toast.error(`Please fill the required field: ${label}`);
      return false;
    }
  }

  return true;
};

  // Form submission


const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required. Please log in.");
      return;
    }

    let response;
    if (itemDetails._id) {
      // ✅ Update existing item
      response = await axios.put(`/api/items/${itemDetails._id}`, itemDetails, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setItem((prev) =>
          prev.map((it) => (it._id === itemDetails._id ? response.data.data : it))
        );
        toast.success("✅ Item updated successfully!");
      } else {
        toast.error(response.data.message || "Update failed");
      }
    } else {
      // ✅ Create new item
      response = await axios.post(`/api/items`, itemDetails, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setItem((prev) => [...prev, response.data.data]);
        toast.success("✅ Item created successfully!");
      } else {
        toast.error(response.data.message || "Create failed");
      }
    }

    setView("list");
  } catch (error) {
    console.error("Submission error:", error);
    toast.error(error.response?.data?.message || "Something went wrong");
  }
};


  // Reset form and switch to list view
  const resetForm = () => {
    setItemDetails(initialItemState);
    generateItemCode();
    setView("list");
  };

  // Edit item handler
  const handleEdit = (item) => {
    setItemDetails(item);
    setView("form");
  };

  // Delete item handler
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      await axios.delete(`/api/items/${id}`);
      setItem(item.filter(item => item._id !== id));
      alert("Item deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed. Please try again.");
    }
  };

  // Filter items based on search term
  const filteredItems = item.filter(
    (item) =>
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render item list view
  const renderListView = () => (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Item Management</h1>
        <button
          onClick={() => {
            generateItemCode();
            setView("form");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center"
        >
          <FaPlus className="mr-2" /> Create Item
        </button>
      </div>

      <div className="mb-6 relative">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="py-2 px-4 w-full focus:outline-none"
          />
          <FaSearch className="text-gray-500 mx-4" />
        </div>
      </div>

      {loading ? (
        <p>Loading items...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Code</th>
                <th className="py-3 px-4 text-left">Item Name</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-left">Price</th>
                {/* <th className="py-3 px-4 text-left">Stock</th> */}
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.reverse().map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{item.itemCode}</td>
                    <td className="py-3 px-4">{item.itemName}</td>
                    <td className="py-3 px-4">{item.category}</td>
                    <td className="py-3 px-4">₹{Number(item.unitPrice).toFixed(2)}</td>
                    {/* <td className="py-3 px-4">{item.quantity}</td> */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render item form view
  const renderFormView = () => (
    <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
        {itemDetails._id ? "Edit Item" : "Create New Item"}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Code
              </label>
              <input
                type="text"
                value={itemDetails.itemCode}
                readOnly
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="itemName"
                value={itemDetails.itemName}
                onChange={handleItemDetailsChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <ItemGroupSearch onSelectItemGroup={handleCategorySelect} />
              {itemDetails.category && (
                <div className="mt-1 text-sm text-gray-500">
                  Selected: {itemDetails.category}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="unitPrice"
                value={itemDetails.unitPrice}
                onChange={handleItemDetailsChange}
                required
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                minimum stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={itemDetails.quantity}
                onChange={handleItemDetailsChange}
                required
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                name="reorderLevel"
                value={itemDetails.reorderLevel}
                onChange={handleItemDetailsChange}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>


              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LeadTime
              </label>
              <input
                type="number"
                name="leadTime"
                value={itemDetails.leadTime}
                onChange={handleItemDetailsChange}
                min="1"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={itemDetails.description}
                onChange={handleItemDetailsChange}
                rows="3"
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Tax Information Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Tax Information</h2>
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="includeGST"
                checked={itemDetails.includeGST}
                onChange={handleItemDetailsChange}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-700">Include GST</span>
            </label>
            
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="includeIGST"
                checked={itemDetails.includeIGST}
                onChange={handleItemDetailsChange}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-700">Include IGST</span>
            </label>
          </div>

          {itemDetails.includeGST && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-lg mb-3">GST Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">GST Code</label>
                  <input
                    type="text"
                    name="gstCode"
                    value={itemDetails.gstCode}
                    onChange={handleItemDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">GST Name</label>
                  <input
                    type="text"
                    name="gstName"
                    value={itemDetails.gstName}
                    onChange={handleItemDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    name="gstRate"
                    value={itemDetails.gstRate}
                    onChange={handleItemDetailsChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">CGST Rate (%)</label>
                  <input
                    type="number"
                    name="cgstRate"
                    value={itemDetails.cgstRate}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">SGST Rate (%)</label>
                  <input
                    type="number"
                    name="sgstRate"
                    value={itemDetails.sgstRate}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {itemDetails.includeIGST && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">IGST Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">IGST Code</label>
                  <input
                    type="text"
                    name="igstCode"
                    value={itemDetails.igstCode}
                    onChange={handleItemDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">IGST Name</label>
                  <input
                    type="text"
                    name="igstName"
                    value={itemDetails.igstName}
                    onChange={handleItemDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">IGST Rate (%)</label>
                  <input
                    type="number"
                    name="igstRate"
                    value={itemDetails.igstRate}
                    onChange={handleItemDetailsChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quality Check Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Quality Control</h2>
          <label className="inline-flex items-center mb-4">
            <input
              type="checkbox"
              name="includeQualityCheck"
              checked={itemDetails.includeQualityCheck}
              onChange={handleItemDetailsChange}
              className="h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-gray-700">Include Quality Checks</span>
          </label>

          {itemDetails.includeQualityCheck && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Quality Parameters</h3>
                <button
                  type="button"
                  onClick={addQualityCheckItem}
                  className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded"
                >
                  <FaPlus className="mr-1" /> Add Parameter
                </button>
              </div>
              
              <div className="space-y-3">
                {itemDetails.qualityCheckDetails.map((qc, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        name="srNo"
                        placeholder="Sr. No"
                        value={qc.srNo}
                        onChange={(e) => handleQualityCheckDetailChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        name="parameter"
                        placeholder="Parameter"
                        value={qc.parameter}
                        onChange={(e) => handleQualityCheckDetailChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        name="min"
                        placeholder="Min"
                        value={qc.min}
                        onChange={(e) => handleQualityCheckDetailChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        name="max"
                        placeholder="Max"
                        value={qc.max}
                        onChange={(e) => handleQualityCheckDetailChange(index, e)}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const newQC = [...itemDetails.qualityCheckDetails];
                          newQC.splice(index, 1);
                          setItemDetails(prev => ({
                            ...prev,
                            qualityCheckDetails: newQC
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Details Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Unit of Measure <span className="text-red-500">*</span></label>
              <select
                name="uom"
                value={itemDetails.uom}
                onChange={handleItemDetailsChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select UOM</option>
                <option value="KG">Kilogram (KG)</option>
                <option value="MTP">Metric Ton (MTP)</option>
                <option value="PC">Piece (PC)</option>
                <option value="LTR">Liter (LTR)</option>
                <option value="MTR">Meter (MTR)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Item Type <span className="text-red-500">*</span></label>
              <select
                name="itemType"
                value={itemDetails.itemType}
                onChange={handleItemDetailsChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Type</option>
                <option value="Product">Product</option>
                <option value="Service">Service</option>
                <option value="Raw Material">Raw Material</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Managed By</label>
              <select
                name="managedBy"
                value={itemDetails.managedBy}
                onChange={handleItemDetailsChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Method</option>
                <option value="batch">Batch</option>
                <option value="serial">Serial Number</option>
                <option value="none">Not Managed</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Length (cm)</label>
              <input
                type="number"
                name="length"
                value={itemDetails.length}
                onChange={handleItemDetailsChange}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Width (cm)</label>
              <input
                type="number"
                name="width"
                value={itemDetails.width}
                onChange={handleItemDetailsChange}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Height (cm)</label>
              <input
                type="number"
                name="height"
                value={itemDetails.height}
                onChange={handleItemDetailsChange}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                name="weight"
                value={itemDetails.weight}
                onChange={handleItemDetailsChange}
                min="0"
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="flex justify-between">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={itemDetails.status}
                onChange={handleItemDetailsChange}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-md ${
                  itemDetails._id 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {itemDetails._id ? "Update Item" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  return view === "list" ? renderListView() : renderFormView();
}

export default ItemManagement;