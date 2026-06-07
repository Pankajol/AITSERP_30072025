"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaFilePdf, FaCheckCircle, FaBoxOpen, FaTasks, FaInfoCircle,
  FaHandshake, FaRupeeSign, FaCalendarAlt, FaEnvelope, FaWhatsapp, FaSpinner,
  FaPlus, FaCheckDouble, FaBuilding, FaUser, FaMapMarkerAlt, FaPhoneAlt
} from "react-icons/fa";
import ItemSection from "@/components/ItemSection";
import EntityTasks from "@/components/crm/EntityTasks";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ---------- Helpers ----------
const round = (num, decimals = 2) => Number(num).toFixed(decimals);
const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const priceAfterDiscount = unitPrice - discount;
  const totalAmount = quantity * priceAfterDiscount;
  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstAmount = (totalAmount * gstRate) / 200;
    const sgstAmount = cgstAmount;
    return {
      priceAfterDiscount, totalAmount,
      gstAmount: cgstAmount + sgstAmount,
      cgstAmount, sgstAmount, igstAmount: 0,
    };
  } else {
    let igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
    const igstAmount = (totalAmount * igstRate) / 100;
    return {
      priceAfterDiscount, totalAmount,
      gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount,
    };
  }
};
const getEmptyItem = () => ({
  item: "", itemCode: "", itemName: "", itemDescription: "",
  quantity: 1, unitPrice: 0, discount: 0, freight: 0,
  gstRate: 18, igstRate: 0, taxOption: "GST",
  priceAfterDiscount: 0, totalAmount: 0,
  gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
  warehouse: null, warehouseName: "", warehouseCode: "",
});

const InfoCard = ({ icon: Icon, title, children, color = "indigo" }) => {
  const colorClasses = { indigo: "bg-indigo-50 border-indigo-100", green: "bg-green-50 border-green-100", blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100", purple: "bg-purple-50 border-purple-100" };
  const iconClasses = { indigo: "text-indigo-600 bg-indigo-100", green: "text-green-600 bg-green-100", blue: "text-blue-600 bg-blue-100", amber: "text-amber-600 bg-amber-100", purple: "text-purple-600 bg-purple-100" };
  return (
    <div className={`rounded-xl border ${colorClasses[color]} p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-3"><div className={`p-2 rounded-lg ${iconClasses[color]}`}><Icon className="w-4 h-4" /></div><h3 className="font-bold text-gray-800">{title}</h3></div>
      {children}
    </div>
  );
};

// ----------------------------- Main Component -------------------------
export default function OpportunityDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [quotationItems, setQuotationItems] = useState([getEmptyItem()]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedGlobalWarehouse, setSelectedGlobalWarehouse] = useState("");
  const [generatingQuotation, setGeneratingQuotation] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", pan: "", email: "", mobile: "", gst: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [quotationsList, setQuotationsList] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch opportunity and its quotations
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const oppRes = await axios.get(`/api/crm/opportunity/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (oppRes.data.success) {
        const oppData = oppRes.data.data;
        setOpp(oppData);
        setCustomerForm(prev => ({
          ...prev,
          name: oppData.accountName || "",
          pan: oppData.pan || "",
          email: oppData.email || "",
          mobile: oppData.mobile || "",
          gst: oppData.gst || ""
        }));

        // Fetch quotations if any
        if (oppData.quotations && oppData.quotations.length) {
          setLoadingQuotations(true);
          const ids = oppData.quotations.join(",");
          const quotesRes = await axios.get(`/api/sales-quotation?ids=${ids}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (quotesRes.data.success) {
            let quotes = quotesRes.data.data;
            if (!Array.isArray(quotes)) quotes = [quotes];
            setQuotationsList(quotes);
          } else {
            setQuotationsList([]);
          }
          setLoadingQuotations(false);
        } else {
          setQuotationsList([]);
        }
      } else {
        toast.error("Opportunity not found");
        router.push("/admin/crm/opportunities");
      }
    } catch (err) {
      toast.error("Failed to load opportunity");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) setWarehouses(res.data.data);
      } catch (err) { console.error(err); }
    };
    fetchWarehouses();
  }, []);

  // Item handlers
  const handleItemChange = (index, update) => {
    setQuotationItems(prev => {
      const items = [...prev];
      let updatedItem = { ...items[index] };
      if (update && typeof update === "object") {
        if (update.target) {
          const { name, value } = update.target;
          const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"];
          const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
          updatedItem[name] = newValue;
        } else {
          updatedItem = { ...updatedItem, ...update };
        }
      }
      const computed = computeItemValues(updatedItem);
      updatedItem = { ...updatedItem, ...computed };
      items[index] = updatedItem;
      return items;
    });
  };
  const addItemRow = () => {
    const defaultWh = warehouses.find(w => w._id === selectedGlobalWarehouse);
    setQuotationItems(prev => [...prev, {
      ...getEmptyItem(),
      warehouse: selectedGlobalWarehouse,
      warehouseName: defaultWh?.warehouseName || "",
      warehouseCode: defaultWh?.warehouseCode || "",
    }]);
  };
  const removeItemRow = (index) => setQuotationItems(prev => prev.filter((_, i) => i !== index));

  // Generate new quotation
  const handleGenerateQuotation = async () => {
    if (quotationItems.length === 0 || quotationItems.some(i => !i.item)) {
      toast.error("Add at least one valid item");
      return;
    }
    setGeneratingQuotation(true);
    try {
      const token = localStorage.getItem("token");
      const itemsPayload = quotationItems.map(it => ({
        itemId: it.item,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        gstRate: it.gstRate,
        taxOption: it.taxOption,
      }));
      await axios.post("/api/crm/opportunity/generate-quotation", {
        opportunityId: id,
        items: itemsPayload,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Quotation generated!");
      await fetchData();
      setQuotationItems([getEmptyItem()]);
      setShowCreateForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate");
    } finally {
      setGeneratingQuotation(false);
    }
  };

  // Accept quotation (close won)
  const handleAcceptQuotation = async (quotationId) => {
    if (!customerForm.pan || !customerForm.email || !customerForm.mobile) {
      toast.error("Please fill PAN, Email and Mobile in the customer details form.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/crm/opportunity/close-won", {
        opportunityId: id,
        quotationId: quotationId,
        customerUpdates: customerForm,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Quotation accepted and customer created!");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to accept");
    }
  };

  // PDF Download (fixed: pass the actual quote object)
  const downloadQuotationPDF = (quote) => {
    if (!quote || !quote.items || !quote.items.length) {
      toast.error("Quotation data incomplete");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text("QUOTATION", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Number: ${quote.documentNumberQuatation || quote.documentNumber}`, 14, 40);
    doc.text(`Date: ${new Date(quote.documentDate).toLocaleDateString()}`, 14, 48);
    doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 14, 56);
    doc.text(`Customer: ${quote.customerName || opp.accountName}`, 14, 64);

    const tableBody = quote.items.map(item => [
      item.itemName || item.item,
      item.quantity,
      `₹${(item.unitPrice || 0).toFixed(2)}`,
      `₹${(item.totalAmount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 80,
      head: [["Item", "Qty", "Price", "Amount"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total: ₹${(quote.grandTotal || 0).toLocaleString()}`, pageWidth - 40, finalY, { align: "right" });
    doc.save(`quotation-${quote.documentNumberQuatation || quote.documentNumber}.pdf`);
  };

  // Email and WhatsApp
  const sendQuotationEmail = async (quotationId, email, customerName) => {
    if (!email) { toast.error("Customer email not available"); return; }
    setSendingEmail(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/quotation/send-email", {
        quotationId,
        email,
        customerName,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Email sent");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to send"); }
    finally { setSendingEmail(false); }
  };
  const shareWhatsApp = (quotationId, phone, value) => {
    if (!phone) { toast.error("Customer mobile not available"); return; }
    const message = encodeURIComponent(`Quotation: ${quotationId}\nTotal: ₹${value?.toLocaleString()}\nDownload: ${window.location.origin}/api/quotation/${quotationId}/pdf`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;
  if (!opp) return <div className="p-6 text-center">Opportunity not found</div>;

  const isEditable = opp.stage !== "Closed Won" && opp.stage !== "Closed Lost";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-indigo-600 hover:text-indigo-800 text-sm mb-2">← Back</button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{opp.opportunityName}</h1>
              <p className="text-sm text-gray-500">ID: {opp._id?.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            {["overview", "quotation", "tasks"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}>
                {tab === "overview" && <FaInfoCircle />}
                {tab === "quotation" && <FaBoxOpen />}
                {tab === "tasks" && <FaTasks />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <InfoCard icon={FaRupeeSign} title="Deal Value" color="green">
                <p className="text-2xl font-bold">₹{opp.value?.toLocaleString()}</p>
              </InfoCard>
              <InfoCard icon={FaCalendarAlt} title="Close Date" color="blue">
                <p>{new Date(opp.closeDate).toLocaleDateString()}</p>
              </InfoCard>
              <InfoCard icon={FaHandshake} title="Stage" color="purple">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${opp.stage === "Closed Won" ? "bg-green-100 text-green-700" : opp.stage === "Closed Lost" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {opp.stage}
                </span>
              </InfoCard>
              <InfoCard icon={FaTasks} title="Probability" color="amber">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${opp.probability}%` }} />
                  </div>
                  <span>{opp.probability}%</span>
                </div>
              </InfoCard>
            </div>

            {/* Opportunity Details Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Opportunity Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="text-xs uppercase text-gray-500">Account Name</label><p>{opp.accountName}</p></div>
                <div><label className="text-xs uppercase text-gray-500">Lead Source</label><p>{opp.leadSource || "—"}</p></div>
                <div><label className="text-xs uppercase text-gray-500">Created Date</label><p>{new Date(opp.createdAt).toLocaleDateString()}</p></div>
                <div><label className="text-xs uppercase text-gray-500">Last Updated</label><p>{new Date(opp.updatedAt).toLocaleDateString()}</p></div>
                <div className="md:col-span-2"><label className="text-xs uppercase text-gray-500">Description</label><p>{opp.description || "No description."}</p></div>
              </div>
            </div>

            {/* Contact & Tax Information */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FaUser className="text-indigo-500" /> Contact & Tax</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs uppercase text-gray-500">Email</label><p>{opp.email || "—"}</p></div>
                <div><label className="text-xs uppercase text-gray-500">Phone</label><p>{opp.phone || "—"}</p></div>
                <div><label className="text-xs uppercase text-gray-500">Mobile</label><p>{opp.mobile || "—"}</p></div>
                <div><label className="text-xs uppercase text-gray-500">PAN</label><p>{opp.pan || "—"}</p></div>
                <div className="md:col-span-2"><label className="text-xs uppercase text-gray-500">GST</label><p>{opp.gst || "—"}</p></div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FaMapMarkerAlt className="text-amber-500" /> Addresses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Billing Address</h3>
                  <p>{opp.billingAddress?.street || "—"}</p>
                  <p>{opp.billingAddress?.city}, {opp.billingAddress?.state} {opp.billingAddress?.postalCode}</p>
                  <p>{opp.billingAddress?.country}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
                  <p>{opp.shippingAddress?.street || "—"}</p>
                  <p>{opp.shippingAddress?.city}, {opp.shippingAddress?.state} {opp.shippingAddress?.postalCode}</p>
                  <p>{opp.shippingAddress?.country}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quotation Tab */}
        {activeTab === "quotation" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><FaBoxOpen className="text-emerald-500" /> Quotations ({quotationsList.length})</h2>
              {isEditable && (
                <button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm">
                  <FaPlus className="text-xs" /> New Quotation
                </button>
              )}
            </div>

            {loadingQuotations ? (
              <div className="animate-pulse text-center py-8">Loading quotations...</div>
            ) : quotationsList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No quotations yet. Click "New Quotation" to create one.</div>
            ) : (
              <div className="space-y-4">
                {quotationsList.map((quote, idx) => (
                  <div key={quote._id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <p className="font-bold">#{idx+1} – {quote.documentNumberQuatation || quote.documentNumber}</p>
                        <p className="text-sm text-gray-500">Date: {new Date(quote.documentDate).toLocaleDateString()}</p>
                        <p className="text-sm font-semibold text-indigo-600">Total: ₹{(quote.grandTotal || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => downloadQuotationPDF(quote)} className="text-red-600 text-sm flex items-center gap-1"><FaFilePdf /> PDF</button>
                        <button onClick={() => sendQuotationEmail(quote._id, customerForm.email, customerForm.name || opp.accountName)} className="text-blue-600 text-sm flex items-center gap-1"><FaEnvelope /> Email</button>
                        <button onClick={() => shareWhatsApp(quote._id, customerForm.mobile, quote.grandTotal)} className="text-green-600 text-sm flex items-center gap-1"><FaWhatsapp /> WhatsApp</button>
                        {isEditable && !quote.customer && opp.stage !== "Closed Won" && (
                          <button onClick={() => handleAcceptQuotation(quote._id)} className="text-emerald-600 text-sm flex items-center gap-1"><FaCheckDouble /> Accept & Create Customer</button>
                        )}
                      </div>
                    </div>
                    {quote.customer && <p className="text-xs text-green-600 mt-2">✓ Customer linked</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Create Quotation Form */}
            {showCreateForm && isEditable && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-md font-semibold mb-3">Create New Quotation</h3>
                {warehouses.length > 0 && (
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-sm">Default Warehouse:</label>
                    <select className="border rounded px-2 py-1 text-sm" value={selectedGlobalWarehouse} onChange={e => setSelectedGlobalWarehouse(e.target.value)}>
                      <option value="">None</option>
                      {warehouses.map(wh => <option key={wh._id} value={wh._id}>{wh.warehouseName}</option>)}
                    </select>
                  </div>
                )}
                <ItemSection
                  items={quotationItems}
                  onItemChange={handleItemChange}
                  onAddItem={addItemRow}
                  onRemoveItem={removeItemRow}
                  computeItemValues={computeItemValues}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={handleGenerateQuotation} disabled={generatingQuotation} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-1">
                    {generatingQuotation ? <FaSpinner className="animate-spin" /> : "Generate Quotation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <EntityTasks entityType="Opportunity" entityId={id} entityName={opp.opportunityName} />
          </div>
        )}

        {/* Customer Details Form (for accepting quotations) */}
        {activeTab === "overview" && isEditable && quotationsList.some(q => !q.customer) && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FaCheckCircle className="text-green-600" /> Customer Details (for accepting quotations)</h2>
            <p className="text-sm text-gray-500 mb-4">Fill these details once; they will be used when you accept any quotation. They are pre-filled from the opportunity if available.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <input placeholder="Customer Name" className="border rounded px-3 py-2 text-sm" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
              <input placeholder="PAN Number *" className="border rounded px-3 py-2 text-sm" value={customerForm.pan} onChange={e => setCustomerForm({...customerForm, pan: e.target.value})} required />
              <input placeholder="Email *" type="email" className="border rounded px-3 py-2 text-sm" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} required />
              <input placeholder="Mobile *" type="tel" className="border rounded px-3 py-2 text-sm" value={customerForm.mobile} onChange={e => setCustomerForm({...customerForm, mobile: e.target.value})} required />
              <input placeholder="GST (optional)" className="border rounded px-3 py-2 text-sm" value={customerForm.gst} onChange={e => setCustomerForm({...customerForm, gst: e.target.value})} />
            </div>
            <p className="text-xs text-gray-400">These details will be used to create the customer when you accept a quotation from the "Quotations" tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}


// "use client";

// import React, { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";

// const ViewLeadPage = () => {
//   const { id } = useParams();
//   const router = useRouter();
//   const [lead, setLead] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const fetchLead = async () => {
//       try {
//         const response = await axios.get(`/api/crm/lead/${id}`);
//         setLead(response.data);
//       } catch (err) {
//         setError("Failed to load lead details.");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchLead();
//   }, [id]);

//   if (loading) return <p className="text-center py-10">Loading...</p>;
//   if (error) return <p className="text-center py-10 text-red-600">{error}</p>;
//   if (!lead) return <p className="text-center py-10">No lead found.</p>;

//   return (
//     <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md mt-6">
//       <h1 className="text-2xl font-bold mb-4 text-orange-600">Lead Details</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         {Object.entries(lead).map(([key, value]) => (
//           <div key={key}>
//             <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
//             <p className="text-base font-medium">{value || "-"}</p>
//           </div>
//         ))}
//       </div>
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           onClick={() => router.push(`/leads/edit/${id}`)}
//           className="px-4 py-2 bg-blue-600 text-white rounded-md"
//         >
//           Edit
//         </button>
//         <button
//           onClick={() => router.push("/leads")}
//           className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
//         >
//           Back
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ViewLeadPage;
