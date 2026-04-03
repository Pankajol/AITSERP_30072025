"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
  FaChevronLeft, FaChevronRight, FaCheck, FaFileUpload,
  FaDownload, FaExclamationCircle, FaBoxOpen, FaTag,
  FaShieldAlt, FaCashRegister, FaRuler, FaClipboardCheck,
  FaListUl, FaQrcode, FaTimes, FaKeyboard, FaCamera,
  FaCheckCircle, FaSpinner, FaImage, FaCloudUploadAlt
} from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";
import ItemGroupSearch from "./ItemGroupSearch";
import { toast } from "react-toastify";

// ── 7 Steps ──
const STEPS = [
  { id: 1, label: "Basic Info",   icon: FaBoxOpen },
  { id: 2, label: "Tax & GST",    icon: HiOutlineDocumentText },
  { id: 3, label: "POS Settings", icon: FaCashRegister },
  { id: 4, label: "Quality",      icon: FaShieldAlt },
  { id: 5, label: "Dimensions",   icon: FaRuler },
  { id: 6, label: "Variants",     icon: FaListUl },
  { id: 7, label: "Review",       icon: FaClipboardCheck },
];

const INITIAL = {
  itemCode: "", itemName: "", description: "", category: "",
  unitPrice: "", quantity: "", reorderLevel: "", leadTime: "",
  itemType: "", uom: "", managedBy: "", managedValue: "",
  batchNumber: "", expiryDate: "", manufacturer: "",
  length: "", width: "", height: "", weight: "",
  gnr: false, delivery: false, productionProcess: false,
  includeQualityCheck: false, qualityCheckDetails: [],
  includeGST: true, includeIGST: true,
  gstCode: "", gstName: "", gstRate: "", cgstRate: "", sgstRate: "",
  igstCode: "", igstName: "", igstRate: "",
  status: "active", active: true,
  posEnabled: false,
  imageUrl: "",
  posConfig: {
    barcode: "", posPrice: "", allowDiscount: true,
    maxDiscountPercent: 100, taxableInPOS: true, showInPOS: true,
  },
  enableVariants: false,
  variants: [],
  calculationType: "linear",
  logBase: 10,
};

const VALIDATORS = {
  1: (d) => {
    const e = {};
    if (!d.itemName?.trim()) e.itemName = "Item Name is required";
    if (!d.category?.trim()) e.category = "Category is required";
    if (!d.unitPrice) e.unitPrice = "Unit Price is required";
    if (d.quantity === "" || d.quantity === undefined) e.quantity = "Minimum Stock is required";
    if (!d.uom) e.uom = "Unit of Measure is required";
    if (!d.itemType) e.itemType = "Item Type is required";
    return e;
  },
  2: () => ({}), 3: () => ({}), 4: () => ({}), 5: () => ({}), 6: () => ({}), 7: () => ({}),
};

// ════════════════════════════════════════
// IMAGE UPLOAD COMPONENT
// ════════════════════════════════════════
function ImageUpload({ imageUrl, onImageChange, disabled }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(imageUrl || "");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setPreview(imageUrl || "");
  }, [imageUrl]);

  const uploadToLocal = async (file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP or GIF images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/items/upload-image", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success && res.data.imageUrl) {
        setPreview(res.data.imageUrl);
        onImageChange(res.data.imageUrl);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error(res.data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.message || "Image upload failed");
      setPreview(imageUrl || "");
      onImageChange(imageUrl || "");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localUrl);
    }
  };

  const handleFile = (file) => {
    if (file && file.type.startsWith("image/")) {
      uploadToLocal(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleRemove = () => {
    setPreview("");
    onImageChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        Item Image
      </label>

      {preview ? (
        <div className="relative w-full max-w-xs group">
          <img
            src={preview}
            alt="Item preview"
            className="w-full h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/400x300/eeeeee/999999?text=No+Image&font=montserrat";
            }}
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <FaSpinner className="animate-spin text-2xl mx-auto mb-1" />
                <p className="text-xs font-semibold">Uploading…</p>
              </div>
            </div>
          )}
          {!uploading && !disabled && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-md"
                title="Change image"
              >
                <FaCamera className="text-sm" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md"
                title="Remove image"
              >
                <FaTrash className="text-sm" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative w-full max-w-xs h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
            ${dragOver
              ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
              : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {uploading ? (
            <div className="text-center text-indigo-500">
              <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
              <p className="text-xs font-semibold">Uploading…</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2">
                <FaCloudUploadAlt className="text-indigo-400 text-xl" />
              </div>
              <p className="text-xs font-bold text-gray-600">
                {dragOver ? "Drop image here" : "Click or drag to upload"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · max 5MB</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  );
}

// ════════════════════════════════════════
// QR SCANNER MODAL
// ════════════════════════════════════════
function QRScannerModal({ onScanSuccess, onManual, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [tab, setTab] = useState("camera");
  const [libStatus, setLibStatus] = useState("idle");

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const tickDetect = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tickDetect);
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (detectorRef.current) {
      try {
        const codes = await detectorRef.current.detect(video);
        if (codes && codes.length > 0) {
          handleCodeDetected(codes[0].rawValue);
          return;
        }
      } catch { }
    }

    if (window.jsQR) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: "dontInvert"
        });
        if (code && code.data) {
          handleCodeDetected(code.data);
          return;
        }
      } catch { }
    }

    rafRef.current = requestAnimationFrame(tickDetect);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError("");
    setScanResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise((res, rej) => {
          video.onloadedmetadata = res;
          video.onerror = rej;
        });
        await video.play();
      }

      setScanning(true);

      if ("BarcodeDetector" in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "data_matrix", "itf"]
          });
        } catch { detectorRef.current = null; }
      }

      if (!detectorRef.current && !window.jsQR) {
        setLibStatus("loading");
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
        script.onload = () => { setLibStatus("ready"); };
        script.onerror = () => { setLibStatus("error"); };
        document.head.appendChild(script);
      } else {
        setLibStatus("ready");
      }

      rafRef.current = requestAnimationFrame(tickDetect);

    } catch (err) {
      console.error("Camera error:", err);
      setCamError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : err.name === "NotFoundError"
            ? "No camera found on this device."
            : `Camera error: ${err.message}`
      );
    }
  }, [tickDetect]);

  const handleCodeDetected = useCallback(async (code) => {
    if (!code) return;
    stopCamera();
    setScanResult(code);
    setFetching(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/items/barcode/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.data) {
        onScanSuccess(res.data.data, code);
        return;
      }
    } catch { }

    try {
      const parsed = JSON.parse(code);
      if (parsed && (parsed.itemName || parsed.name)) {
        const mapped = mapQRToItem(parsed, code);
        onScanSuccess(mapped, code);
        setFetching(false);
        return;
      }
    } catch { }

    onScanSuccess({ posConfig: { barcode: code } }, code);
    setFetching(false);
  }, [stopCamera, onScanSuccess]);

  const mapQRToItem = (qr, code) => ({
    itemName: qr.itemName || qr.name || "",
    description: qr.description || qr.desc || "",
    category: qr.category || "",
    unitPrice: qr.unitPrice || qr.price || "",
    quantity: qr.quantity || qr.qty || "",
    reorderLevel: qr.reorderLevel || "",
    leadTime: qr.leadTime || "",
    itemType: qr.itemType || "Product",
    uom: qr.uom || "",
    manufacturer: qr.manufacturer || qr.brand || "",
    batchNumber: qr.batchNumber || qr.batch || "",
    expiryDate: qr.expiryDate || qr.expiry || "",
    gstRate: qr.gstRate || "",
    cgstRate: qr.cgstRate || (qr.gstRate ? qr.gstRate / 2 : ""),
    sgstRate: qr.sgstRate || (qr.gstRate ? qr.gstRate / 2 : ""),
    igstRate: qr.igstRate || "",
    posConfig: {
      barcode: code,
      posPrice: qr.posPrice || qr.price || "",
      allowDiscount: true, maxDiscountPercent: 100,
      taxableInPOS: true, showInPOS: true
    },
  });

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    await handleCodeDetected(manualCode.trim());
  };

  useEffect(() => {
    if (tab === "camera") startCamera();
    return () => stopCamera();
  }, [tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FaQrcode className="text-white text-lg" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Scan to Auto-Fill</p>
              <p className="text-indigo-200 text-[11px]">Scan QR/Barcode or enter manually</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {[
            { key: "camera", icon: FaCamera, label: "Camera Scan" },
            { key: "manual", icon: FaKeyboard, label: "Manual Entry" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-all
                ${tab === t.key ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              <t.icon className="text-xs" />{t.label}
            </button>
          ))}
        </div>

        {tab === "camera" && (
          <div className="p-5 space-y-4">
            {camError ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <FaExclamationCircle className="text-red-400 text-2xl mx-auto mb-2" />
                <p className="text-sm text-red-600 font-medium">{camError}</p>
                <button onClick={() => setTab("manual")}
                  className="mt-3 text-xs text-indigo-600 font-bold underline">
                  Switch to Manual Entry →
                </button>
              </div>
            ) : scanResult ? (
              <div className="text-center py-6">
                {fetching ? (
                  <>
                    <FaSpinner className="text-indigo-500 text-3xl mx-auto mb-3 animate-spin" />
                    <p className="text-sm font-semibold text-gray-700">Looking up item…</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono break-all px-4">{scanResult}</p>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700">Scanned successfully!</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono break-all px-4">{scanResult}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} className="hidden" />
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-52 h-52">
                      {[
                        ["top-0 left-0", "border-t-2 border-l-2 rounded-tl-lg"],
                        ["top-0 right-0", "border-t-2 border-r-2 rounded-tr-lg"],
                        ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl-lg"],
                        ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br-lg"],
                      ].map(([pos, cls], i) => (
                        <div key={i} className={`absolute ${pos} w-8 h-8 border-indigo-400 ${cls}`} />
                      ))}
                      <div className="absolute left-2 right-2 h-0.5 bg-indigo-400 opacity-80"
                        style={{
                          top: "50%",
                          boxShadow: "0 0 8px #6366f1",
                          animation: "scanline 2s ease-in-out infinite"
                        }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)"
                    }} />
                  {scanning && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <span className="bg-black/60 text-white text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                        Scanning…
                      </span>
                    </div>
                  )}
                  {libStatus === "loading" && (
                    <div className="absolute top-3 left-0 right-0 flex justify-center">
                      <span className="bg-amber-500/90 text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                        <FaSpinner className="animate-spin text-[9px]" /> Loading scanner…
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-gray-400">
                  Point camera at QR code or barcode on the product
                </p>
                {!scanning && !camError && (
                  <button onClick={startCamera}
                    className="w-full py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                    <FaCamera className="text-xs" /> Restart Camera
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {tab === "manual" && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
              <FaKeyboard className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Enter barcode, item code, or scan using a hardware barcode scanner into the field below.
              </p>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Barcode / Item Code
              </label>
              <input
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Scan or type barcode…"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
              />
            </div>
            <button onClick={handleManualSubmit}
              disabled={!manualCode.trim() || fetching}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {fetching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
              {fetching ? "Looking up…" : "Lookup Item"}
            </button>
          </div>
        )}

        <div className="px-5 pb-5">
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => { stopCamera(); onManual(); }}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
              <FaKeyboard className="text-xs" /> Fill Manually
            </button>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-400 text-sm font-medium hover:bg-gray-50 transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 8%;  }
          50%  { top: 88%; }
          100% { top: 8%;  }
        }
      `}</style>
    </div>
  );
}
/////////////////////////////////////////////////////////////////////
// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function ItemManagement() {
  const [view, setView] = useState("list");
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [id, setId] = useState({ ...INITIAL });
  const [errs, setErrs] = useState({});
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setItems(res.data.data || []);
    } catch { toast.error("Failed to load items"); }
    setLoading(false);
  };

  const generateCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/lastItemCode", { headers: { Authorization: `Bearer ${token}` } });
      const last = res.data.lastItemCode || "ITEM-0000";
      const num = parseInt(last.split("-")[1] || "0", 10) + 1;
      setId(p => ({ ...p, itemCode: `ITEM-${String(num).padStart(4, "0")}` }));
    } catch { }
  };

  const calculateDiscount = (variantPrice, originalPrice) => {
    if (!variantPrice || !originalPrice || originalPrice === 0) return 0;
    const discount = ((originalPrice - variantPrice) / originalPrice) * 100;
    return Math.round(discount);
  };

  // Calculate price based on quantity ratio
  const calculatePriceByQuantity = (variantQuantity, basePrice, baseQuantity) => {
    if (!variantQuantity || !basePrice || !baseQuantity || baseQuantity === 0) return basePrice;
    // Price is proportional to quantity
    const ratio = variantQuantity / baseQuantity;
    return basePrice * ratio;
  };

  const generateVariants = useCallback(() => {
    if (!id.unitPrice || !id.quantity) {
      toast.warning("Please set Unit Price and Min Stock first");
      return;
    }

    const basePrice = parseFloat(id.unitPrice);
    const baseQuantity = parseFloat(id.quantity);
    const uom = id.uom || "";
    
    const variants = [];
    
    // Define variant quantities based on UOM (in grams/ml/pieces)
    let variantData = [];
    if (uom === "KG") {
      // For KG: 250gm, 500gm, 1kg, 2kg, 5kg (convert to grams)
      variantData = [
        { name: "250gm", quantity: 250, discount: 0 },
        { name: "500gm", quantity: 500, discount: 0 },
        { name: "1kg", quantity: 1000, discount: 0 },
        { name: "2kg", quantity: 2000, discount: 5 },
        { name: "5kg", quantity: 5000, discount: 10 }
      ];
    } else if (uom === "LTR") {
      // For LTR: 250ml, 500ml, 1L, 2L, 5L (convert to ml)
      variantData = [
        { name: "250ml", quantity: 250, discount: 0 },
        { name: "500ml", quantity: 500, discount: 0 },
        { name: "1L", quantity: 1000, discount: 0 },
        { name: "2L", quantity: 2000, discount: 5 },
        { name: "5L", quantity: 5000, discount: 10 }
      ];
    } else if (uom === "PC") {
      variantData = [
        { name: "1pc", quantity: 1, discount: 0 },
        { name: "2pc", quantity: 2, discount: 0 },
        { name: "5pc", quantity: 5, discount: 5 },
        { name: "10pc", quantity: 10, discount: 10 },
        { name: "20pc", quantity: 20, discount: 15 }
      ];
    } else if (uom === "MTR") {
      variantData = [
        { name: "1m", quantity: 1, discount: 0 },
        { name: "2m", quantity: 2, discount: 0 },
        { name: "5m", quantity: 5, discount: 5 },
        { name: "10m", quantity: 10, discount: 10 },
        { name: "25m", quantity: 25, discount: 15 }
      ];
    } else {
      variantData = [
        { name: "Small", quantity: 1, discount: 0 },
        { name: "Medium", quantity: 2, discount: 0 },
        { name: "Large", quantity: 5, discount: 5 },
        { name: "XL", quantity: 10, discount: 10 },
        { name: "XXL", quantity: 20, discount: 15 }
      ];
    }
    
    // Generate variants with proper pricing
    for (let i = 0; i < variantData.length; i++) {
      const data = variantData[i];
      // Calculate price based on quantity ratio
      let price = calculatePriceByQuantity(data.quantity, basePrice, baseQuantity);
      
      // Apply discount if any
      if (data.discount > 0) {
        price = price * (1 - data.discount / 100);
      }
      
      variants.push({
        id: i + 1,
        name: data.name,
        quantity: data.quantity,
        price: Math.round(price * 100) / 100,
        discount: data.discount,
      });
    }
    
    setId(prev => ({ ...prev, variants }));
    toast.success(`${variants.length} variants generated! Example: ${basePrice} for ${baseQuantity}${uom} → ${variants[0].price} for ${variants[0].quantity}${uom}`);
  }, [id.unitPrice, id.quantity, id.uom]);

  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...id.variants];
    const basePrice = parseFloat(id.unitPrice) || 0;
    const baseQuantity = parseFloat(id.quantity) || 1;
    
    updatedVariants[index][field] = value;
    const variantQuantity = parseFloat(updatedVariants[index].quantity) || baseQuantity;
    
    // Calculate original price based on quantity ratio
    const originalPrice = calculatePriceByQuantity(variantQuantity, basePrice, baseQuantity);
    
    if (field === "price") {
      const price = parseFloat(value) || 0;
      const discount = calculateDiscount(price, originalPrice);
      updatedVariants[index].discount = discount;
    }
    
    if (field === "discount") {
      const discount = parseFloat(value) || 0;
      const price = originalPrice * (1 - discount / 100);
      updatedVariants[index].price = Math.round(price * 100) / 100;
    }
    
    if (field === "quantity") {
      const newQuantity = parseFloat(value) || baseQuantity;
      const newOriginalPrice = calculatePriceByQuantity(newQuantity, basePrice, baseQuantity);
      const currentPrice = parseFloat(updatedVariants[index].price) || 0;
      const discount = calculateDiscount(currentPrice, newOriginalPrice);
      updatedVariants[index].discount = discount;
    }
    
    setId(prev => ({ ...prev, variants: updatedVariants }));
  };

  const addVariant = () => {
    const basePrice = parseFloat(id.unitPrice) || 0;
    const baseQuantity = parseFloat(id.quantity) || 1;
    
    setId(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: prev.variants.length + 1,
          name: "",
          quantity: "",
          price: "",
          discount: 0,
        },
      ],
    }));
  };

  const removeVariant = (index) => {
    const updatedVariants = [...id.variants];
    updatedVariants.splice(index, 1);
    setId(prev => ({ ...prev, variants: updatedVariants }));
  };

  const handleScanSuccess = useCallback((scannedData, rawCode) => {
    setShowScanner(false);
    setId(prev => ({
      ...INITIAL,
      ...prev,
      ...scannedData,
      posConfig: {
        ...INITIAL.posConfig,
        ...(prev.posConfig || {}),
        ...(scannedData.posConfig || {}),
      },
      includeGST: scannedData.gstRate ? true : prev.includeGST,
      includeIGST: scannedData.igstRate ? true : prev.includeIGST,
    }));
    toast.success(
      scannedData.itemName
        ? `✓ Auto-filled: ${scannedData.itemName}`
        : `Barcode captured: ${rawCode} — please complete remaining fields`
    );
    setStep(1);
    setView("form");
  }, []);

  const handleCreateClick = async () => {
    await generateCode();
    setId(p => ({ ...INITIAL, itemCode: p.itemCode }));
    setStep(1);
    setErrs({});
    setShowScanner(true);
  };

  const handleManualEntry = () => {
    setShowScanner(false);
    setView("form");
  };

  const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("posConfig.")) {
      const key = name.split(".")[1];
      setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [key]: type === "checkbox" ? checked : value } }));
      return;
    }
    if (type === "checkbox") { setId(p => ({ ...p, [name]: checked })); return; }
    if (name === "gstRate") {
      const rate = parseFloat(value) || 0;
      setId(p => ({ ...p, gstRate: value, cgstRate: rate / 2, sgstRate: rate / 2 }));
      return;
    }
    setId(p => ({ ...p, [name]: value }));
    clearErr(name);
  };

  const handleQCChange = (i, e) => {
    const { name, value } = e.target;
    setId(p => {
      const q = [...p.qualityCheckDetails];
      q[i] = { ...q[i], [name]: value };
      return { ...p, qualityCheckDetails: q };
    });
  };

  const addQC = () => setId(p => ({ ...p, qualityCheckDetails: [...p.qualityCheckDetails, { srNo: "", parameter: "", min: "", max: "" }] }));
  const removeQC = (i) => setId(p => ({ ...p, qualityCheckDetails: p.qualityCheckDetails.filter((_, j) => j !== i) }));

  const goNext = () => {
    const v = VALIDATORS[step];
    if (v) {
      const e = v(id);
      if (Object.keys(e).length) {
        setErrs(e);
        toast.error(Object.values(e)[0]);
        return;
      }
    }
    setErrs({});
    setStep(s => s + 1);
  };
  const goPrev = () => { setErrs({}); setStep(s => s - 1); };

  const handleSubmit = async () => {
    const allE = VALIDATORS[1](id);
    if (Object.keys(allE).length) { setErrs(allE); toast.error("Fix required fields"); return; }
    setSubmitting(true);
    const token = localStorage.getItem("token");
    const toNum = (v) => (v === "" || v == null ? undefined : Number(v));
    const payload = {
      ...id,
      unitPrice: Number(id.unitPrice || 0),
      quantity: Number(id.quantity || 0),
      reorderLevel: toNum(id.reorderLevel),
      leadTime: toNum(id.leadTime),
      length: toNum(id.length), width: toNum(id.width),
      height: toNum(id.height), weight: toNum(id.weight),
      gstRate: toNum(id.gstRate), cgstRate: toNum(id.cgstRate),
      sgstRate: toNum(id.sgstRate), igstRate: toNum(id.igstRate),
      posEnabled: !!id.posEnabled,
      imageUrl: id.imageUrl || "",
      posConfig: {
        ...id.posConfig,
        posPrice: toNum(id.posConfig?.posPrice),
        maxDiscountPercent: id.posConfig?.maxDiscountPercent === "" ? 100 : Number(id.posConfig?.maxDiscountPercent ?? 100),
        allowDiscount: id.posConfig?.allowDiscount ?? true,
        taxableInPOS: id.posConfig?.taxableInPOS ?? true,
        showInPOS: id.posConfig?.showInPOS ?? true,
      },
      enableVariants: id.enableVariants || false,
      variants: id.variants || [],
      calculationType: id.calculationType || "linear",
      logBase: id.logBase || 10,
    };
    try {
      if (id._id) {
        const res = await axios.put(`/api/items/${id._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setItems(p => p.map(it => it._id === id._id ? res.data.data : it)); toast.success("Item updated!"); }
        else toast.error(res.data.message || "Update failed");
      } else {
        const res = await axios.post("/api/items", payload, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setItems(p => [...p, res.data.data]); toast.success("Item created!"); }
        else toast.error(res.data.message || "Create failed");
      }
      reset();
    } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
    setSubmitting(false);
  };

  const reset = () => { setId({ ...INITIAL }); setStep(1); setErrs({}); setView("list"); };
  const handleEdit = (item) => { setId(item); setStep(1); setErrs({}); setView("form"); };
  const handleDelete = async (itemId) => {
    if (!confirm("Delete this item?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(p => p.filter(it => it._id !== itemId));
      toast.success("Item deleted");
    } catch { toast.error("Delete failed"); }
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/items/template");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "item_template.csv"; a.click();
    } catch { toast.error("Error downloading template"); }
  };

  const handleBulk = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const hdrs = lines[0].split(",").map(h => h.trim());
      const jsonData = lines.slice(1).map(line => {
        const v = line.split(",");
        const o = {};
        hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || ""));
        return o;
      });
      const res = await axios.post("/api/items/bulk", { items: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
      const { success, results } = res.data;
      if (success) {
        const cr = results.filter(r => r.success && r.action === "created").length;
        const up = results.filter(r => r.success && r.action === "updated").length;
        const sk = results.filter(r => !r.success).length;
        toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
        results.filter(r => r.warnings?.length).forEach(r => toast.warn(`Row ${r.row}: ${r.warnings.join(", ")}`));
        fetchItems();
      } else toast.error(res.data.message || "Bulk upload failed");
    } catch { toast.error("Invalid CSV or server error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const filtered = items.filter(it => {
    const q = searchTerm.toLowerCase();
    const mQ = [it.itemCode, it.itemName, it.category, it.itemType].some(v => v?.toLowerCase().includes(q));
    const mT = filterType === "All" || it.itemType === filterType;
    return mQ && mT;
  }).slice().reverse();

  const stats = {
    total: items.length,
    product: items.filter(it => it.itemType === "Product").length,
    service: items.filter(it => it.itemType === "Service").length,
    rawMat: items.filter(it => it.itemType === "Raw Material").length,
  };

  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const Toggle = ({ name, checked, label, nested }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className={`relative w-9 h-5 rounded-full transition-all ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
        onClick={() => nested
          ? setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [name.split(".")[1]]: !checked } }))
          : setId(p => ({ ...p, [name]: !checked }))}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );

  const RRow = ({ l, v }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
    </div>
  );

  // ── Step Content ──
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-4 py-3">
            <FaQrcode className="text-indigo-500 text-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-800">Scan product barcode / QR code</p>
              <p className="text-[11px] text-indigo-500">Auto-fill fields by scanning the product packaging</p>
            </div>
            <button type="button" onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shrink-0">
              <FaCamera className="text-[10px]" /> Scan
            </button>
          </div>

          <ImageUpload
            imageUrl={id.imageUrl}
            onImageChange={(url) => setId(p => ({ ...p, imageUrl: url }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Item Code" />
              <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.itemCode || ""} readOnly />
              <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
            </div>
            <div>
              <Lbl text="Item Name" req />
              <input className={fi("itemName")} name="itemName" value={id.itemName || ""} onChange={handleChange} placeholder="e.g. Steel Rod 10mm" />
              <Err k="itemName" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Category" req />
              <ItemGroupSearch onSelectItemGroup={g => { setId(p => ({ ...p, category: g.name })); clearErr("category"); }} />
              {id.category && <p className="text-xs text-indigo-600 font-semibold mt-1.5 flex items-center gap-1"><FaTag className="text-[10px]" /> {id.category}</p>}
              <Err k="category" />
            </div>
            <div>
              <Lbl text="Item Type" req />
              <select className={fi("itemType")} name="itemType" value={id.itemType || ""} onChange={handleChange}>
                <option value="">Select type…</option>
                <option>Product</option>
                <option>Service</option>
                <option>Raw Material</option>
              </select>
              <Err k="itemType" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Unit Price (₹)" req />
              <input className={fi("unitPrice")} name="unitPrice" type="number" min="0" step="0.01" placeholder="0.00" value={id.unitPrice || ""} onChange={handleChange} />
              <Err k="unitPrice" />
            </div>
            <div>
              <Lbl text="Min. Stock" req />
              <input className={fi("quantity")} name="quantity" type="number" min="0" placeholder="0" value={id.quantity || ""} onChange={handleChange} />
              <Err k="quantity" />
            </div>
            <div>
              <Lbl text="Reorder Level" />
              <input className={fi("")} name="reorderLevel" type="number" min="0" placeholder="0" value={id.reorderLevel || ""} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Lead Time (Days)" />
              <input className={fi("")} name="leadTime" type="number" min="1" placeholder="7" value={id.leadTime || ""} onChange={handleChange} />
            </div>
            <div>
              <Lbl text="Unit of Measure" req />
              <select className={fi("uom")} name="uom" value={id.uom || ""} onChange={handleChange}>
                <option value="">Select UOM…</option>
                <option value="KG">Kilogram (KG)</option>
                <option value="MTP">Metric Ton (MTP)</option>
                <option value="PC">Piece (PC)</option>
                <option value="LTR">Liter (LTR)</option>
                <option value="MTR">Meter (MTR)</option>
              </select>
              <Err k="uom" />
            </div>
            <div>
              <Lbl text="Managed By" />
              <select className={fi("")} name="managedBy" value={id.managedBy || ""} onChange={handleChange}>
                <option value="">Select method…</option>
                <option value="batch">Batch</option>
                <option value="serial">Serial Number</option>
                <option value="none">Not Managed</option>
              </select>
            </div>
          </div>

          <div>
            <Lbl text="Description" />
            <textarea className={`${fi("")} resize-none`} name="description" rows={3} placeholder="Brief description of this item…" value={id.description || ""} onChange={handleChange} />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Lbl text="Status" />
            <select className={`${fi("")} w-auto`} name="status" value={id.status || "active"} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      );

      case 2: return (
        <div className="space-y-5">
          <div className="flex gap-6">
            <Toggle name="includeGST" checked={id.includeGST} label="Include GST" />
            <Toggle name="includeIGST" checked={id.includeIGST} label="Include IGST" />
          </div>
          {id.includeGST && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2"><HiOutlineDocumentText /> GST Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Lbl text="GST Code" /><input className={fi("")} name="gstCode" value={id.gstCode || ""} onChange={handleChange} placeholder="e.g. GST18" /></div>
                <div><Lbl text="GST Name" /><input className={fi("")} name="gstName" value={id.gstName || ""} onChange={handleChange} placeholder="e.g. GST 18%" /></div>
                <div>
                  <Lbl text="GST Rate (%)" />
                  <input className={fi("")} name="gstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.gstRate || ""} onChange={handleChange} />
                  <p className="text-[11px] text-blue-500 mt-1">CGST & SGST will be auto-split (half each)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl text="CGST (%)" /><input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.cgstRate || ""} readOnly /></div>
                  <div><Lbl text="SGST (%)" /><input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.sgstRate || ""} readOnly /></div>
                </div>
              </div>
            </div>
          )}
          {id.includeIGST && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
              <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2"><HiOutlineDocumentText /> IGST Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Lbl text="IGST Code" /><input className={fi("")} name="igstCode" value={id.igstCode || ""} onChange={handleChange} placeholder="e.g. IGST18" /></div>
                <div><Lbl text="IGST Name" /><input className={fi("")} name="igstName" value={id.igstName || ""} onChange={handleChange} placeholder="e.g. IGST 18%" /></div>
                <div><Lbl text="IGST Rate (%)" /><input className={fi("")} name="igstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.igstRate || ""} onChange={handleChange} /></div>
              </div>
            </div>
          )}
          {!id.includeGST && !id.includeIGST && (
            <div className="text-center py-8 text-gray-300">
              <HiOutlineDocumentText className="text-5xl mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Enable GST or IGST above to configure tax details</p>
            </div>
          )}
        </div>
      );

      case 3: return (
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <FaCashRegister className="text-orange-500 text-xl mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-orange-800 mb-0.5">POS (Point of Sale)</p>
              <p className="text-xs text-orange-600">Enable this item to be sold through the POS system.</p>
            </div>
          </div>
          <Toggle name="posEnabled" checked={id.posEnabled} label="Enable this item for POS (Sellable)" />
          {id.posEnabled && (
            <div className="border border-gray-200 rounded-xl p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Barcode" />
                  <input className={fi("")} name="posConfig.barcode" value={id.posConfig?.barcode || ""} onChange={handleChange} placeholder="Scan or enter barcode" />
                </div>
                <div>
                  <Lbl text="POS Price (Optional override)" />
                  <input className={fi("")} name="posConfig.posPrice" type="number" min="0" step="0.01" placeholder={`Leave blank → uses ₹${id.unitPrice || 0}`} value={id.posConfig?.posPrice ?? ""} onChange={handleChange} />
                  <p className="text-[11px] text-gray-400 mt-1">Empty = uses Unit Price: <strong>₹{id.unitPrice || 0}</strong></p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Toggle name="posConfig.allowDiscount" checked={id.posConfig?.allowDiscount ?? true} label="Allow Discount in POS" nested />
                  <Toggle name="posConfig.taxableInPOS" checked={id.posConfig?.taxableInPOS ?? true} label="Taxable in POS" nested />
                  <Toggle name="posConfig.showInPOS" checked={id.posConfig?.showInPOS ?? true} label="Show in POS list" nested />
                </div>
                <div>
                  <Lbl text="Max Discount (%)" />
                  <input className={fi("")} name="posConfig.maxDiscountPercent" type="number" min="0" max="100"
                    value={id.posConfig?.maxDiscountPercent ?? 100} onChange={handleChange}
                    disabled={!(id.posConfig?.allowDiscount ?? true)} />
                </div>
              </div>
            </div>
          )}
        </div>
      );

      case 4: return (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <FaShieldAlt className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">Define quality parameters for inspection during GRN or production.</p>
          </div>
          <Toggle name="includeQualityCheck" checked={id.includeQualityCheck} label="Include Quality Checks" />
          {id.includeQualityCheck && (
            <div>
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                {["Sr.", "Parameter", "Min", "Max", ""].map((h, i) => (
                  <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${i === 0 ? "col-span-1" : i === 1 ? "col-span-5" : i === 4 ? "col-span-1" : "col-span-2"}`}>{h}</div>
                ))}
              </div>
              <div className="space-y-2">
                {id.qualityCheckDetails.map((qc, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
                    <div className="col-span-1"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 text-center font-mono" name="srNo" placeholder="#" value={qc.srNo} onChange={e => handleQCChange(i, e)} /></div>
                    <div className="col-span-5"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="parameter" placeholder="e.g. Tensile Strength" value={qc.parameter} onChange={e => handleQCChange(i, e)} /></div>
                    <div className="col-span-2"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="min" placeholder="Min" value={qc.min} onChange={e => handleQCChange(i, e)} /></div>
                    <div className="col-span-2"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="max" placeholder="Max" value={qc.max} onChange={e => handleQCChange(i, e)} /></div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" onClick={() => removeQC(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><FaTrash className="text-xs" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addQC} className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-indigo-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                <FaPlus className="text-xs" /> Add Quality Parameter
              </button>
            </div>
          )}
        </div>
      );

      case 5: return (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <FaRuler className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 font-medium">Physical dimensions and weight are used for logistics and warehouse management. All optional.</p>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3">Dimensions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[{ n: "length", l: "Length (cm)", ph: "0" }, { n: "width", l: "Width (cm)", ph: "0" }, { n: "height", l: "Height (cm)", ph: "0" }, { n: "weight", l: "Weight (kg)", ph: "0.00", step: "0.01" }].map(f => (
                <div key={f.n}><Lbl text={f.l} /><input className={fi("")} name={f.n} type="number" min="0" step={f.step || "1"} placeholder={f.ph} value={id[f.n] || ""} onChange={handleChange} /></div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Additional Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Lbl text="Manufacturer" /><input className={fi("")} name="manufacturer" value={id.manufacturer || ""} onChange={handleChange} placeholder="e.g. Tata Steel" /></div>
              <div><Lbl text="Expiry Date" /><input className={fi("")} name="expiryDate" type="date" value={id.expiryDate || ""} onChange={handleChange} /></div>
              <div><Lbl text="Batch Number" /><input className={fi("")} name="batchNumber" value={id.batchNumber || ""} onChange={handleChange} placeholder="e.g. BATCH-2024-001" /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Toggle name="gnr" checked={id.gnr} label="GNR Applicable" />
              <Toggle name="delivery" checked={id.delivery} label="Delivery Item" />
              <Toggle name="productionProcess" checked={id.productionProcess} label="Production Process" />
            </div>
          </div>
        </div>
      );

      case 6: return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FaListUl className="text-purple-500 text-xl" />
                <h3 className="text-lg font-bold text-purple-800">Item Variants</h3>
              </div>
              <Toggle
                name="enableVariants"
                checked={id.enableVariants}
                label="Enable Variants"
              />
            </div>

            {id.enableVariants && (
              <div className="space-y-4">
                <div className="bg-purple-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-800">
                    Current Unit of Measure: <span className="font-bold">{id.uom || "Not selected"}</span>
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Base Price: ₹{id.unitPrice} for {id.quantity} {id.uom}
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Pricing Calculation</p>
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="calculationType"
                        value="linear"
                        checked={id.calculationType === "linear"}
                        onChange={(e) => setId(p => ({ ...p, calculationType: e.target.value }))}
                        className="text-purple-600"
                      />
                      <span className="text-sm">Proportional (Price based on quantity)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="calculationType"
                        value="logarithmic"
                        checked={id.calculationType === "logarithmic"}
                        onChange={(e) => setId(p => ({ ...p, calculationType: e.target.value }))}
                        className="text-purple-600"
                      />
                      <span className="text-sm">Logarithmic (Auto Calculate)</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={generateVariants}
                    className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  >
                    <FaListUl className="text-xs" /> Generate Variants
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-700">Variant Details</p>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-full transition"
                    >
                      <FaPlus className="text-[10px]" /> Add Manual Variant
                    </button>
                  </div>

                  {id.variants && id.variants.length > 0 ? (
                    <div className="space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-2 py-2 bg-purple-100 rounded-lg text-xs font-semibold text-purple-800">
                        <div className="col-span-3">Variant Name</div>
                        <div className="col-span-2">Quantity ({id.uom || 'unit'})</div>
                        <div className="col-span-2">Price (₹)</div>
                        <div className="col-span-2">Discount (%)</div>
                        <div className="col-span-2">Unit</div>
                        <div className="col-span-1">Action</div>
                      </div>
                      
                      {/* Variant Rows */}
                      {id.variants.map((variant, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <input
                                type="text"
                                placeholder="e.g., 250gm"
                                value={variant.name}
                                onChange={(e) => handleVariantChange(idx, "name", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 focus:border-purple-400 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="Quantity"
                                value={variant.quantity}
                                onChange={(e) => handleVariantChange(idx, "quantity", parseFloat(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 focus:border-purple-400 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                placeholder="Price (₹)"
                                value={variant.price}
                                onChange={(e) => handleVariantChange(idx, "price", parseFloat(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 focus:border-purple-400 focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  placeholder="Discount %"
                                  value={variant.discount}
                                  onChange={(e) => handleVariantChange(idx, "discount", parseFloat(e.target.value))}
                                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 focus:border-purple-400 focus:outline-none"
                                />
                                <span className="text-xs text-green-600 font-medium">% off</span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {id.uom || 'unit'}
                              </span>
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                                title="Remove variant"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </div>
                          </div>
                          {/* Show calculated info */}
                          {variant.price && variant.quantity && (
                            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                              <span className="font-medium">Info:</span> ₹{variant.price} per {variant.quantity} {id.uom} 
                              {variant.discount > 0 && <span className="text-green-600 ml-2">({variant.discount}% discount applied)</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">
                      No variants added. Click "Generate Variants" or "Add Manual Variant"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );

      case 7: return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review all details before saving.</p>

          {id.imageUrl && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center gap-4">
              <img
                src={id.imageUrl}
                alt="Item"
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/200x200/eeeeee/999999?text=No+Image&font=montserrat"; }}
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Item Image</p>
                <p className="text-xs text-indigo-500 font-medium truncate max-w-[200px]">{id.imageUrl}</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBoxOpen className="text-indigo-400" /> Basic Info</p>
            <RRow l="Code" v={id.itemCode} />
            <RRow l="Name" v={id.itemName} />
            <RRow l="Category" v={id.category} />
            <RRow l="Type" v={id.itemType} />
            <RRow l="Unit Price" v={id.unitPrice ? `₹${Number(id.unitPrice).toFixed(2)}` : ""} />
            <RRow l="Min. Stock" v={id.quantity} />
            <RRow l="UOM" v={id.uom} />
            <RRow l="Reorder Level" v={id.reorderLevel} />
            <RRow l="Lead Time" v={id.leadTime ? `${id.leadTime} days` : ""} />
            <RRow l="Status" v={id.status} />
            {id.posConfig?.barcode && <RRow l="Barcode" v={id.posConfig.barcode} />}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax</p>
            <RRow l="Include GST" v={id.includeGST ? "Yes" : "No"} />
            <RRow l="GST Rate" v={id.gstRate ? `${id.gstRate}%` : ""} />
            <RRow l="Include IGST" v={id.includeIGST ? "Yes" : "No"} />
            <RRow l="IGST Rate" v={id.igstRate ? `${id.igstRate}%` : ""} />
          </div>

          {id.posEnabled && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaCashRegister className="text-orange-400" /> POS</p>
              <RRow l="POS Price" v={id.posConfig?.posPrice ? `₹${id.posConfig.posPrice}` : `₹${id.unitPrice} (unit price)`} />
              <RRow l="Barcode" v={id.posConfig?.barcode} />
              <RRow l="Discount" v={id.posConfig?.allowDiscount ? `Allowed (max ${id.posConfig.maxDiscountPercent}%)` : "Not allowed"} />
              <RRow l="Taxable" v={id.posConfig?.taxableInPOS ? "Yes" : "No"} />
            </div>
          )}

          {id.includeQualityCheck && id.qualityCheckDetails?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Quality ({id.qualityCheckDetails.length} parameters)</p>
              {id.qualityCheckDetails.map((q, i) => <RRow key={i} l={q.parameter || `Param ${i + 1}`} v={`Min: ${q.min || "—"} · Max: ${q.max || "—"}`} />)}
            </div>
          )}

          {(id.length || id.weight || id.manufacturer) && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaRuler className="text-blue-400" /> Dimensions</p>
              {id.length && <RRow l="L × W × H" v={`${id.length} × ${id.width || 0} × ${id.height || 0} cm`} />}
              {id.weight && <RRow l="Weight" v={`${id.weight} kg`} />}
              {id.manufacturer && <RRow l="Manufacturer" v={id.manufacturer} />}
            </div>
          )}

          {id.enableVariants && id.variants?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <FaListUl className="text-purple-400" /> Variants ({id.variants.length} units)
              </p>
              {id.variants.map((variant, idx) => (
                <RRow
                  key={idx}
                  l={`${variant.name}`}
                  v={`${variant.quantity} ${id.uom} @ ₹${variant.price} (${variant.discount}% off)`}
                />
              ))}
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  // ════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      {showScanner && (
        <QRScannerModal
          onScanSuccess={handleScanSuccess}
          onManual={handleManualEntry}
          onClose={() => setShowScanner(false)}
        />
      )}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Item Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{items.length} total items</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
              {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
              <input type="file" hidden accept=".csv" onChange={handleBulk} />
            </label>
            <button onClick={handleCreateClick}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> Create Item
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, emoji: "📦", filter: "All" },
            { label: "Product", value: stats.product, emoji: "🛍️", filter: "Product" },
            { label: "Service", value: stats.service, emoji: "🔧", filter: "Service" },
            { label: "Raw Material", value: stats.rawMat, emoji: "⚙️", filter: "Raw Material" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterType(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search items…" />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Product", "Service", "Raw Material"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Image", "Code", "Item", "Category", "Type", "Price", "UOM", "Status", "POS", "Variants", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(11).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16">
                      <div className="text-4xl mb-2 opacity-20">📦</div>
                      <p className="text-sm font-medium text-gray-300">No items found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-1 py-1.5 relative">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.itemName}
                            className="w-12 h-12 object-cover rounded-md border border-gray-200"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/800x800/eeeeee/999999?text=No+Image&font=montserrat"; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                            <FaBoxOpen className="text-gray-300 text-base" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{it.itemCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{it.itemName}</p>
                        {it.manufacturer && <p className="text-xs text-gray-400">{it.manufacturer}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{it.category || <span className="text-gray-200">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                          ${it.itemType === "Product" ? "bg-blue-50 text-blue-600"
                            : it.itemType === "Service" ? "bg-purple-50 text-purple-600"
                              : it.itemType === "Raw Material" ? "bg-amber-50 text-amber-600"
                                : "bg-gray-100 text-gray-500"}`}>
                          {it.itemType || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-bold text-gray-700">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{it.uom || <span className="text-gray-200">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${it.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                          {it.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {it.posEnabled
                          ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">POS</span>
                          : <span className="text-gray-200 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {it.enableVariants && it.variants?.length > 0
                          ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">{it.variants.length} units</span>
                          : <span className="text-gray-200 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleEdit(it)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                            <FaEdit className="text-xs" />
                          </button>
                          <button onClick={() => handleDelete(it._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                            <FaTrash className="text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ════════════════════════════════════════
  // FORM VIEW
  // ════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      {showScanner && (
        <QRScannerModal
          onScanSuccess={handleScanSuccess}
          onManual={handleManualEntry}
          onClose={() => setShowScanner(false)}
        />
      )}
      <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-6">
        <button onClick={reset} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-5 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Items
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
              {STEPS.map((s, idx) => {
                const done = step > s.id;
                const current = step === s.id;
                const Icon = s.icon;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${done ? "bg-emerald-500 text-white"
                          : current ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                            : "bg-gray-100 text-gray-300"}`}>
                        {done ? <FaCheck className="text-[10px]" /> : <Icon className="text-[10px]" />}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block
                        ${current ? "text-indigo-600" : done ? "text-emerald-500" : "text-gray-300"}`}>
                        {s.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 transition-all ${step > s.id ? "bg-emerald-400" : "bg-gray-100"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="px-6 pb-4 border-b border-gray-100">
            <h2 className="text-base font-extrabold text-gray-900">{STEPS[step - 1].label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>

          <div className="px-6 py-5">{renderStep()}</div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-3">
            <button onClick={goPrev} disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold disabled:opacity-30 hover:bg-gray-50 transition-all">
              <FaChevronLeft className="text-xs" /> Back
            </button>
            {step < STEPS.length ? (
              <button onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
                Next <FaChevronRight className="text-xs" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm shadow-emerald-200">
                {submitting ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                {submitting ? "Saving…" : id._id ? "Update Item" : "Save Item"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import axios from "axios";
// import {
//   FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
//   FaChevronLeft, FaChevronRight, FaCheck, FaFileUpload,
//   FaDownload, FaExclamationCircle, FaBoxOpen, FaTag,
//   FaShieldAlt, FaCashRegister, FaRuler, FaClipboardCheck,
//   FaListUl, FaQrcode, FaTimes, FaKeyboard, FaCamera,
//   FaCheckCircle, FaSpinner, FaImage, FaCloudUploadAlt
// } from "react-icons/fa";
// import { HiOutlineDocumentText } from "react-icons/hi";
// import ItemGroupSearch from "./ItemGroupSearch";
// import { toast } from "react-toastify";

// // ── 6 Steps ──
// const STEPS = [
//   { id: 1, label: "Basic Info",   icon: FaBoxOpen },
//   { id: 2, label: "Tax & GST",    icon: HiOutlineDocumentText },
//   { id: 3, label: "POS Settings", icon: FaCashRegister },
//   { id: 4, label: "Quality",      icon: FaShieldAlt },
//   { id: 5, label: "Dimensions",   icon: FaRuler },
//   { id: 6, label: "Review",       icon: FaClipboardCheck },
// ];

// const INITIAL = {
//   itemCode: "", itemName: "", description: "", category: "",
//   unitPrice: "", quantity: "", reorderLevel: "", leadTime: "",
//   itemType: "", uom: "", managedBy: "", managedValue: "",
//   batchNumber: "", expiryDate: "", manufacturer: "",
//   length: "", width: "", height: "", weight: "",
//   gnr: false, delivery: false, productionProcess: false,
//   includeQualityCheck: false, qualityCheckDetails: [],
//   includeGST: true, includeIGST: true,
//   gstCode: "", gstName: "", gstRate: "", cgstRate: "", sgstRate: "",
//   igstCode: "", igstName: "", igstRate: "",
//   status: "active", active: true,
//   posEnabled: false,
//   imageUrl: "",
//   posConfig: {
//     barcode: "", posPrice: "", allowDiscount: true,
//     maxDiscountPercent: 100, taxableInPOS: true, showInPOS: true,
//   },
// };

// const VALIDATORS = {
//   1: (d) => {
//     const e = {};
//     if (!d.itemName?.trim()) e.itemName  = "Item Name is required";
//     if (!d.category?.trim()) e.category  = "Category is required";
//     if (!d.unitPrice)        e.unitPrice = "Unit Price is required";
//     if (d.quantity === "" || d.quantity === undefined) e.quantity = "Minimum Stock is required";
//     if (!d.uom)     e.uom     = "Unit of Measure is required";
//     if (!d.itemType) e.itemType = "Item Type is required";
//     return e;
//   },
//   2: () => ({}), 3: () => ({}), 4: () => ({}), 5: () => ({}), 6: () => ({}),
// };

// // ════════════════════════════════════════
// // IMAGE UPLOAD COMPONENT
// // ════════════════════════════════════════
// function ImageUpload({ imageUrl, onImageChange, disabled }) {
//   const fileInputRef = useRef(null);
//   const [uploading, setUploading] = useState(false);
//   const [preview, setPreview] = useState(imageUrl || "");
//   const [dragOver, setDragOver] = useState(false);

//   useEffect(() => {
//     setPreview(imageUrl || "");
//   }, [imageUrl]);

//   const uploadToCloudinary = async (file) => {
//     if (!file) return;

//     // Validate file type
//     const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only JPG, PNG, WebP or GIF images are allowed");
//       return;
//     }

//     // Validate file size (max 5MB)
//     if (file.size > 5 * 1024 * 1024) {
//       toast.error("Image must be smaller than 5MB");
//       return;
//     }

//     setUploading(true);

//     // Show local preview immediately
//     const localUrl = URL.createObjectURL(file);
//     setPreview(localUrl);

//     try {
//       const token = localStorage.getItem("token");
//       const formData = new FormData();
//       formData.append("file", file);

//       const res = await axios.post("/api/items/upload-image", formData, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       if (res.data.success && res.data.imageUrl) {
//         setPreview(res.data.imageUrl);
//         onImageChange(res.data.imageUrl);
//         toast.success("Image uploaded successfully");
//       } else {
//         throw new Error(res.data.message || "Upload failed");
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Image upload failed");
//       setPreview(imageUrl || ""); // revert to original
//       onImageChange(imageUrl || "");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleFile = (file) => {
//     if (file && file.type.startsWith("image/")) {
//       uploadToCloudinary(file);
//     }
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragOver(false);
//     const file = e.dataTransfer.files[0];
//     handleFile(file);
//   };

//   const handleRemove = () => {
//     setPreview("");
//     onImageChange("");
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   return (
//     <div className="space-y-2">
//       <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//         Item Image
//       </label>

//       {preview ? (
//         <div className="relative w-full max-w-xs group">
//           <img
//             src={preview}
//             alt="Item preview"
//             className="w-full h-40 object-cover rounded-xl border border-gray-200 shadow-sm"
//             onError={e => {
//               e.target.onerror = null;
//               e.target.src = "https://placehold.co/400x300/eeeeee/999999?text=Image+Error&font=montserrat";
//             }}
//           />
//           {uploading && (
//             <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
//               <div className="text-center text-white">
//                 <FaSpinner className="animate-spin text-2xl mx-auto mb-1" />
//                 <p className="text-xs font-semibold">Uploading…</p>
//               </div>
//             </div>
//           )}
//           {!uploading && !disabled && (
//             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
//               <button
//                 type="button"
//                 onClick={() => fileInputRef.current?.click()}
//                 className="p-2 bg-white rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-md"
//                 title="Change image"
//               >
//                 <FaCamera className="text-sm" />
//               </button>
//               <button
//                 type="button"
//                 onClick={handleRemove}
//                 className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md"
//                 title="Remove image"
//               >
//                 <FaTrash className="text-sm" />
//               </button>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div
//           onClick={() => !disabled && fileInputRef.current?.click()}
//           onDragOver={e => { e.preventDefault(); setDragOver(true); }}
//           onDragLeave={() => setDragOver(false)}
//           onDrop={handleDrop}
//           className={`relative w-full max-w-xs h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
//             ${dragOver
//               ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
//               : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
//             }
//             ${disabled ? "opacity-50 cursor-not-allowed" : ""}
//           `}
//         >
//           {uploading ? (
//             <div className="text-center text-indigo-500">
//               <FaSpinner className="animate-spin text-2xl mx-auto mb-2" />
//               <p className="text-xs font-semibold">Uploading…</p>
//             </div>
//           ) : (
//             <div className="text-center">
//               <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-2">
//                 <FaCloudUploadAlt className="text-indigo-400 text-xl" />
//               </div>
//               <p className="text-xs font-bold text-gray-600">
//                 {dragOver ? "Drop image here" : "Click or drag to upload"}
//               </p>
//               <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · max 5MB</p>
//             </div>
//           )}
//         </div>
//       )}

//       <input
//         ref={fileInputRef}
//         type="file"
//         accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
//         className="hidden"
//         disabled={disabled || uploading}
//         onChange={e => handleFile(e.target.files[0])}
//       />
//     </div>
//   );
// }

// // ════════════════════════════════════════
// // QR SCANNER MODAL (Fixed)
// // ════════════════════════════════════════
// function QRScannerModal({ onScanSuccess, onManual, onClose }) {
//   const videoRef    = useRef(null);
//   const streamRef   = useRef(null);
//   const rafRef      = useRef(null);
//   const canvasRef   = useRef(null);
//   const detectorRef = useRef(null);
//   const [scanning,   setScanning]   = useState(false);
//   const [camError,   setCamError]   = useState("");
//   const [scanResult, setScanResult] = useState(null);
//   const [fetching,   setFetching]   = useState(false);
//   const [manualCode, setManualCode] = useState("");
//   const [tab,        setTab]        = useState("camera");
//   const [libStatus,  setLibStatus]  = useState("idle"); // idle | loading | ready | error

//   const stopCamera = useCallback(() => {
//     if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(t => t.stop());
//       streamRef.current = null;
//     }
//     setScanning(false);
//   }, []);

//   // ── Core: detect from canvas frame (works with BarcodeDetector or jsQR) ──
//   const tickDetect = useCallback(async () => {
//     const video  = videoRef.current;
//     const canvas = canvasRef.current;
//     if (!video || !canvas || video.readyState < 2) {
//       rafRef.current = requestAnimationFrame(tickDetect);
//       return;
//     }

//     canvas.width  = video.videoWidth  || 640;
//     canvas.height = video.videoHeight || 480;
//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//     // 1. Try BarcodeDetector (Chrome/Edge native)
//     if (detectorRef.current) {
//       try {
//         const codes = await detectorRef.current.detect(video);
//         if (codes && codes.length > 0) {
//           handleCodeDetected(codes[0].rawValue);
//           return;
//         }
//       } catch {}
//     }

//     // 2. Try jsQR (fallback, QR codes only)
//     if (window.jsQR) {
//       try {
//         const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
//         const code = window.jsQR(imageData.data, canvas.width, canvas.height, {
//           inversionAttempts: "dontInvert"
//         });
//         if (code && code.data) {
//           handleCodeDetected(code.data);
//           return;
//         }
//       } catch {}
//     }

//     rafRef.current = requestAnimationFrame(tickDetect);
//   }, []);

//   const startCamera = useCallback(async () => {
//     setCamError("");
//     setScanResult(null);

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
//       });
//       streamRef.current = stream;

//       const video = videoRef.current;
//       if (video) {
//         video.srcObject = stream;
//         await new Promise((res, rej) => {
//           video.onloadedmetadata = res;
//           video.onerror = rej;
//         });
//         await video.play();
//       }

//       setScanning(true);

//       // Setup BarcodeDetector if available
//       if ("BarcodeDetector" in window) {
//         try {
//           detectorRef.current = new window.BarcodeDetector({
//             formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "data_matrix", "itf"]
//           });
//         } catch { detectorRef.current = null; }
//       }

//       // Load jsQR if BarcodeDetector not available
//       if (!detectorRef.current && !window.jsQR) {
//         setLibStatus("loading");
//         const script = document.createElement("script");
//         script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
//         script.onload  = () => { setLibStatus("ready"); };
//         script.onerror = () => { setLibStatus("error"); };
//         document.head.appendChild(script);
//       } else {
//         setLibStatus("ready");
//       }

//       rafRef.current = requestAnimationFrame(tickDetect);

//     } catch (err) {
//       console.error("Camera error:", err);
//       setCamError(
//         err.name === "NotAllowedError"
//           ? "Camera permission denied. Please allow camera access in your browser settings."
//           : err.name === "NotFoundError"
//           ? "No camera found on this device."
//           : `Camera error: ${err.message}`
//       );
//     }
//   }, [tickDetect]);

//   const handleCodeDetected = useCallback(async (code) => {
//     if (!code) return;
//     stopCamera();
//     setScanResult(code);
//     setFetching(true);

//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`/api/items/barcode/${encodeURIComponent(code)}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       if (res.data.success && res.data.data) {
//         onScanSuccess(res.data.data, code);
//         return;
//       }
//     } catch {}

//     // Try parsing QR as JSON item data
//     try {
//       const parsed = JSON.parse(code);
//       if (parsed && (parsed.itemName || parsed.name)) {
//         const mapped = mapQRToItem(parsed, code);
//         onScanSuccess(mapped, code);
//         setFetching(false);
//         return;
//       }
//     } catch {}

//     // Fallback: pre-fill barcode only
//     onScanSuccess({ posConfig: { barcode: code } }, code);
//     setFetching(false);
//   }, [stopCamera, onScanSuccess]);

//   const mapQRToItem = (qr, code) => ({
//     itemName:     qr.itemName || qr.name || "",
//     description:  qr.description || qr.desc || "",
//     category:     qr.category || "",
//     unitPrice:    qr.unitPrice || qr.price || "",
//     quantity:     qr.quantity || qr.qty || "",
//     reorderLevel: qr.reorderLevel || "",
//     leadTime:     qr.leadTime || "",
//     itemType:     qr.itemType || "Product",
//     uom:          qr.uom || "",
//     manufacturer: qr.manufacturer || qr.brand || "",
//     batchNumber:  qr.batchNumber || qr.batch || "",
//     expiryDate:   qr.expiryDate || qr.expiry || "",
//     gstRate:      qr.gstRate || "",
//     cgstRate:     qr.cgstRate || (qr.gstRate ? qr.gstRate / 2 : ""),
//     sgstRate:     qr.sgstRate || (qr.gstRate ? qr.gstRate / 2 : ""),
//     igstRate:     qr.igstRate || "",
//     posConfig: {
//       barcode: code,
//       posPrice: qr.posPrice || qr.price || "",
//       allowDiscount: true, maxDiscountPercent: 100,
//       taxableInPOS: true, showInPOS: true
//     },
//   });

//   const handleManualSubmit = async () => {
//     if (!manualCode.trim()) return;
//     await handleCodeDetected(manualCode.trim());
//   };

//   useEffect(() => {
//     if (tab === "camera") startCamera();
//     return () => stopCamera();
//   }, [tab]);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
//       style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
//       <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

//         {/* Header */}
//         <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2.5">
//             <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
//               <FaQrcode className="text-white text-lg" />
//             </div>
//             <div>
//               <p className="text-white font-bold text-sm">Scan to Auto-Fill</p>
//               <p className="text-indigo-200 text-[11px]">Scan QR/Barcode or enter manually</p>
//             </div>
//           </div>
//           <button onClick={() => { stopCamera(); onClose(); }}
//             className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
//             <FaTimes className="text-sm" />
//           </button>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-gray-100">
//           {[
//             { key: "camera", icon: FaCamera,   label: "Camera Scan" },
//             { key: "manual", icon: FaKeyboard, label: "Manual Entry" },
//           ].map(t => (
//             <button key={t.key} onClick={() => setTab(t.key)}
//               className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-all
//                 ${tab === t.key ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
//               <t.icon className="text-xs" />{t.label}
//             </button>
//           ))}
//         </div>

//         {/* Camera Tab */}
//         {tab === "camera" && (
//           <div className="p-5 space-y-4">
//             {camError ? (
//               <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
//                 <FaExclamationCircle className="text-red-400 text-2xl mx-auto mb-2" />
//                 <p className="text-sm text-red-600 font-medium">{camError}</p>
//                 <button onClick={() => setTab("manual")}
//                   className="mt-3 text-xs text-indigo-600 font-bold underline">
//                   Switch to Manual Entry →
//                 </button>
//               </div>
//             ) : scanResult ? (
//               <div className="text-center py-6">
//                 {fetching ? (
//                   <>
//                     <FaSpinner className="text-indigo-500 text-3xl mx-auto mb-3 animate-spin" />
//                     <p className="text-sm font-semibold text-gray-700">Looking up item…</p>
//                     <p className="text-xs text-gray-400 mt-1 font-mono break-all px-4">{scanResult}</p>
//                   </>
//                 ) : (
//                   <>
//                     <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-3" />
//                     <p className="text-sm font-semibold text-gray-700">Scanned successfully!</p>
//                     <p className="text-xs text-gray-400 mt-1 font-mono break-all px-4">{scanResult}</p>
//                   </>
//                 )}
//               </div>
//             ) : (
//               <>
//                 {/* Hidden canvas for image processing */}
//                 <canvas ref={canvasRef} className="hidden" />

//                 {/* Viewfinder */}
//                 <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
//                   <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

//                   {/* Scan frame overlay */}
//                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                     <div className="relative w-52 h-52">
//                       {[
//                         ["top-0 left-0", "border-t-2 border-l-2 rounded-tl-lg"],
//                         ["top-0 right-0", "border-t-2 border-r-2 rounded-tr-lg"],
//                         ["bottom-0 left-0", "border-b-2 border-l-2 rounded-bl-lg"],
//                         ["bottom-0 right-0", "border-b-2 border-r-2 rounded-br-lg"],
//                       ].map(([pos, cls], i) => (
//                         <div key={i} className={`absolute ${pos} w-8 h-8 border-indigo-400 ${cls}`} />
//                       ))}
//                       {/* Animated scan line */}
//                       <div className="absolute left-2 right-2 h-0.5 bg-indigo-400 opacity-80"
//                         style={{
//                           top: "50%",
//                           boxShadow: "0 0 8px #6366f1",
//                           animation: "scanline 2s ease-in-out infinite"
//                         }} />
//                     </div>
//                   </div>

//                   {/* Dim overlay on sides */}
//                   <div className="absolute inset-0 pointer-events-none"
//                     style={{
//                       background: "radial-gradient(ellipse 55% 55% at 50% 50%, transparent 50%, rgba(0,0,0,0.45) 100%)"
//                     }} />

//                   {scanning && (
//                     <div className="absolute bottom-3 left-0 right-0 flex justify-center">
//                       <span className="bg-black/60 text-white text-[11px] font-medium px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
//                         <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
//                         Scanning…
//                       </span>
//                     </div>
//                   )}

//                   {libStatus === "loading" && (
//                     <div className="absolute top-3 left-0 right-0 flex justify-center">
//                       <span className="bg-amber-500/90 text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
//                         <FaSpinner className="animate-spin text-[9px]" /> Loading scanner…
//                       </span>
//                     </div>
//                   )}
//                 </div>

//                 <p className="text-center text-xs text-gray-400">
//                   Point camera at QR code or barcode on the product
//                 </p>

//                 {/* Manual restart button */}
//                 {!scanning && !camError && (
//                   <button onClick={startCamera}
//                     className="w-full py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
//                     <FaCamera className="text-xs" /> Restart Camera
//                   </button>
//                 )}
//               </>
//             )}
//           </div>
//         )}

//         {/* Manual Tab */}
//         {tab === "manual" && (
//           <div className="p-5 space-y-4">
//             <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
//               <FaKeyboard className="text-amber-500 mt-0.5 shrink-0" />
//               <p className="text-xs text-amber-700 font-medium">
//                 Enter barcode, item code, or scan using a hardware barcode scanner into the field below.
//               </p>
//             </div>
//             <div>
//               <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                 Barcode / Item Code
//               </label>
//               <input
//                 autoFocus
//                 className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
//                 placeholder="Scan or type barcode…"
//                 value={manualCode}
//                 onChange={e => setManualCode(e.target.value)}
//                 onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
//               />
//             </div>
//             <button onClick={handleManualSubmit}
//               disabled={!manualCode.trim() || fetching}
//               className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
//               {fetching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
//               {fetching ? "Looking up…" : "Lookup Item"}
//             </button>
//           </div>
//         )}

//         {/* Footer */}
//         <div className="px-5 pb-5">
//           <div className="flex gap-2 pt-2 border-t border-gray-100">
//             <button onClick={() => { stopCamera(); onManual(); }}
//               className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
//               <FaKeyboard className="text-xs" /> Fill Manually
//             </button>
//             <button onClick={() => { stopCamera(); onClose(); }}
//               className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-400 text-sm font-medium hover:bg-gray-50 transition-all">
//               Cancel
//             </button>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         @keyframes scanline {
//           0%   { top: 8%;  }
//           50%  { top: 88%; }
//           100% { top: 8%;  }
//         }
//       `}</style>
//     </div>
//   );
// }

// // ════════════════════════════════════════
// // MAIN COMPONENT
// // ════════════════════════════════════════
// export default function ItemManagement() {
//   const [view,        setView]        = useState("list");
//   const [items,       setItems]       = useState([]);
//   const [searchTerm,  setSearchTerm]  = useState("");
//   const [filterType,  setFilterType]  = useState("All");
//   const [loading,     setLoading]     = useState(false);
//   const [uploading,   setUploading]   = useState(false);
//   const [submitting,  setSubmitting]  = useState(false);
//   const [step,        setStep]        = useState(1);
//   const [id,          setId]          = useState({ ...INITIAL });
//   const [errs,        setErrs]        = useState({});
//   const [showScanner, setShowScanner] = useState(false);

//   useEffect(() => { fetchItems(); }, []);

//   const fetchItems = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } });
//       if (res.data.success) setItems(res.data.data || []);
//     } catch { toast.error("Failed to load items"); }
//     setLoading(false);
//   };

//   const generateCode = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/lastItemCode", { headers: { Authorization: `Bearer ${token}` } });
//       const last  = res.data.lastItemCode || "ITEM-0000";
//       const num   = parseInt(last.split("-")[1] || "0", 10) + 1;
//       setId(p => ({ ...p, itemCode: `ITEM-${String(num).padStart(4, "0")}` }));
//     } catch {}
//   };

//   // ── QR scan success handler ──
//   const handleScanSuccess = useCallback((scannedData, rawCode) => {
//     setShowScanner(false);
//     setId(prev => ({
//       ...INITIAL,
//       ...prev,
//       ...scannedData,
//       posConfig: {
//         ...INITIAL.posConfig,
//         ...(prev.posConfig || {}),
//         ...(scannedData.posConfig || {}),
//       },
//       includeGST:  scannedData.gstRate  ? true : prev.includeGST,
//       includeIGST: scannedData.igstRate ? true : prev.includeIGST,
//     }));
//     toast.success(
//       scannedData.itemName
//         ? `✓ Auto-filled: ${scannedData.itemName}`
//         : `Barcode captured: ${rawCode} — please complete remaining fields`
//     );
//     setStep(1);
//     setView("form");
//   }, []);

//   const handleCreateClick = async () => {
//     await generateCode();
//     setId(p => ({ ...INITIAL, itemCode: p.itemCode }));
//     setStep(1);
//     setErrs({});
//     setShowScanner(true);
//   };

//   const handleManualEntry = () => {
//     setShowScanner(false);
//     setView("form");
//   };

//   const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     if (name.startsWith("posConfig.")) {
//       const key = name.split(".")[1];
//       setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [key]: type === "checkbox" ? checked : value } }));
//       return;
//     }
//     if (type === "checkbox") { setId(p => ({ ...p, [name]: checked })); return; }
//     if (name === "gstRate") {
//       const rate = parseFloat(value) || 0;
//       setId(p => ({ ...p, gstRate: value, cgstRate: rate / 2, sgstRate: rate / 2 }));
//       return;
//     }
//     setId(p => ({ ...p, [name]: value }));
//     clearErr(name);
//   };

//   const handleQCChange = (i, e) => {
//     const { name, value } = e.target;
//     setId(p => { const q = [...p.qualityCheckDetails]; q[i] = { ...q[i], [name]: value }; return { ...p, qualityCheckDetails: q }; });
//   };

//   const addQC    = ()  => setId(p => ({ ...p, qualityCheckDetails: [...p.qualityCheckDetails, { srNo: "", parameter: "", min: "", max: "" }] }));
//   const removeQC = (i) => setId(p => ({ ...p, qualityCheckDetails: p.qualityCheckDetails.filter((_, j) => j !== i) }));

//   const goNext = () => {
//     const v = VALIDATORS[step];
//     if (v) { const e = v(id); if (Object.keys(e).length) { setErrs(e); toast.error(Object.values(e)[0]); return; } }
//     setErrs({});
//     setStep(s => s + 1);
//   };
//   const goPrev = () => { setErrs({}); setStep(s => s - 1); };

//   const handleSubmit = async () => {
//     const allE = VALIDATORS[1](id);
//     if (Object.keys(allE).length) { setErrs(allE); toast.error("Fix required fields"); return; }
//     setSubmitting(true);
//     const token = localStorage.getItem("token");
//     const toNum = (v) => (v === "" || v == null ? undefined : Number(v));
//     const payload = {
//       ...id,
//       unitPrice: Number(id.unitPrice || 0),
//       quantity:  Number(id.quantity  || 0),
//       reorderLevel: toNum(id.reorderLevel),
//       leadTime:  toNum(id.leadTime),
//       length: toNum(id.length), width: toNum(id.width),
//       height: toNum(id.height), weight: toNum(id.weight),
//       gstRate: toNum(id.gstRate), cgstRate: toNum(id.cgstRate),
//       sgstRate: toNum(id.sgstRate), igstRate: toNum(id.igstRate),
//       posEnabled: !!id.posEnabled,
//       imageUrl: id.imageUrl || "",
//       posConfig: {
//         ...id.posConfig,
//         posPrice: toNum(id.posConfig?.posPrice),
//         maxDiscountPercent: id.posConfig?.maxDiscountPercent === "" ? 100 : Number(id.posConfig?.maxDiscountPercent ?? 100),
//         allowDiscount: id.posConfig?.allowDiscount ?? true,
//         taxableInPOS:  id.posConfig?.taxableInPOS  ?? true,
//         showInPOS:     id.posConfig?.showInPOS      ?? true,
//       },
//     };
//     try {
//       if (id._id) {
//         const res = await axios.put(`/api/items/${id._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => p.map(it => it._id === id._id ? res.data.data : it)); toast.success("Item updated!"); }
//         else toast.error(res.data.message || "Update failed");
//       } else {
//         const res = await axios.post("/api/items", payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => [...p, res.data.data]); toast.success("Item created!"); }
//         else toast.error(res.data.message || "Create failed");
//       }
//       reset();
//     } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
//     setSubmitting(false);
//   };

//   const reset = () => { setId({ ...INITIAL }); setStep(1); setErrs({}); setView("list"); };
//   const handleEdit   = (item) => { setId(item); setStep(1); setErrs({}); setView("form"); };
//   const handleDelete = async (itemId) => {
//     if (!confirm("Delete this item?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
//       setItems(p => p.filter(it => it._id !== itemId));
//       toast.success("Item deleted");
//     } catch { toast.error("Delete failed"); }
//   };

//   const downloadTemplate = async () => {
//     try {
//       const res  = await fetch("/api/items/template");
//       if (!res.ok) throw new Error();
//       const blob = await res.blob();
//       const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "item_template.csv"; a.click();
//     } catch { toast.error("Error downloading template"); }
//   };

//   const handleBulk = async (e) => {
//     const file = e.target.files[0]; if (!file) return;
//     setUploading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const text  = await file.text();
//       const lines = text.split("\n").filter(l => l.trim());
//       const hdrs  = lines[0].split(",").map(h => h.trim());
//       const jsonData = lines.slice(1).map(line => { const v = line.split(","); const o = {}; hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || "")); return o; });
//       const res = await axios.post("/api/items/bulk", { items: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
//       const { success, results } = res.data;
//       if (success) {
//         const cr = results.filter(r => r.success && r.action === "created").length;
//         const up = results.filter(r => r.success && r.action === "updated").length;
//         const sk = results.filter(r => !r.success).length;
//         toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
//         results.filter(r => r.warnings?.length).forEach(r => toast.warn(`Row ${r.row}: ${r.warnings.join(", ")}`));
//         fetchItems();
//       } else toast.error(res.data.message || "Bulk upload failed");
//     } catch { toast.error("Invalid CSV or server error"); }
//     finally { setUploading(false); e.target.value = ""; }
//   };

//   const filtered = items.filter(it => {
//     const q  = searchTerm.toLowerCase();
//     const mQ = [it.itemCode, it.itemName, it.category, it.itemType].some(v => v?.toLowerCase().includes(q));
//     const mT = filterType === "All" || it.itemType === filterType;
//     return mQ && mT;
//   }).slice().reverse();

//   const stats = {
//     total:   items.length,
//     product: items.filter(it => it.itemType === "Product").length,
//     service: items.filter(it => it.itemType === "Service").length,
//     rawMat:  items.filter(it => it.itemType === "Raw Material").length,
//   };

//   const Err = ({ k }) => errs[k]
//     ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
//     : null;

//   const fi = (k, extra = "") =>
//     `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
//      ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );

//   const Toggle = ({ name, checked, label, nested }) => (
//     <label className="flex items-center gap-2.5 cursor-pointer group">
//       <div className={`relative w-9 h-5 rounded-full transition-all ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
//         onClick={() => nested
//           ? setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [name.split(".")[1]]: !checked } }))
//           : setId(p => ({ ...p, [name]: !checked }))}>
//         <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
//       </div>
//       <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
//     </label>
//   );

//   const RRow = ({ l, v }) => (
//     <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
//       <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
//       <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
//     </div>
//   );

//   // ── Step Content ──
//   const renderStep = () => {
//     switch (step) {
//       case 1: return (
//         <div className="space-y-4">
//           {/* QR Scan banner inside form */}
//           <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl px-4 py-3">
//             <FaQrcode className="text-indigo-500 text-xl shrink-0" />
//             <div className="flex-1 min-w-0">
//               <p className="text-xs font-bold text-indigo-800">Scan product barcode / QR code</p>
//               <p className="text-[11px] text-indigo-500">Auto-fill fields by scanning the product packaging</p>
//             </div>
//             <button type="button" onClick={() => setShowScanner(true)}
//               className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shrink-0">
//               <FaCamera className="text-[10px]" /> Scan
//             </button>
//           </div>

//           {/* Image Upload */}
//           <ImageUpload
//             imageUrl={id.imageUrl}
//             onImageChange={(url) => setId(p => ({ ...p, imageUrl: url }))}
//           />

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Item Code" />
//               <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.itemCode || ""} readOnly />
//               <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
//             </div>
//             <div>
//               <Lbl text="Item Name" req />
//               <input className={fi("itemName")} name="itemName" value={id.itemName || ""} onChange={handleChange} placeholder="e.g. Steel Rod 10mm" />
//               <Err k="itemName" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Category" req />
//               <ItemGroupSearch onSelectItemGroup={g => { setId(p => ({ ...p, category: g.name })); clearErr("category"); }} />
//               {id.category && <p className="text-xs text-indigo-600 font-semibold mt-1.5 flex items-center gap-1"><FaTag className="text-[10px]" /> {id.category}</p>}
//               <Err k="category" />
//             </div>
//             <div>
//               <Lbl text="Item Type" req />
//               <select className={fi("itemType")} name="itemType" value={id.itemType || ""} onChange={handleChange}>
//                 <option value="">Select type…</option>
//                 <option>Product</option>
//                 <option>Service</option>
//                 <option>Raw Material</option>
//               </select>
//               <Err k="itemType" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Unit Price (₹)" req />
//               <input className={fi("unitPrice")} name="unitPrice" type="number" min="0" step="0.01" placeholder="0.00" value={id.unitPrice || ""} onChange={handleChange} />
//               <Err k="unitPrice" />
//             </div>
//             <div>
//               <Lbl text="Min. Stock" req />
//               <input className={fi("quantity")} name="quantity" type="number" min="0" placeholder="0" value={id.quantity || ""} onChange={handleChange} />
//               <Err k="quantity" />
//             </div>
//             <div>
//               <Lbl text="Reorder Level" />
//               <input className={fi("")} name="reorderLevel" type="number" min="0" placeholder="0" value={id.reorderLevel || ""} onChange={handleChange} />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Lead Time (Days)" />
//               <input className={fi("")} name="leadTime" type="number" min="1" placeholder="7" value={id.leadTime || ""} onChange={handleChange} />
//             </div>
//             <div>
//               <Lbl text="Unit of Measure" req />
//               <select className={fi("uom")} name="uom" value={id.uom || ""} onChange={handleChange}>
//                 <option value="">Select UOM…</option>
//                 <option value="KG">Kilogram (KG)</option>
//                 <option value="MTP">Metric Ton (MTP)</option>
//                 <option value="PC">Piece (PC)</option>
//                 <option value="LTR">Liter (LTR)</option>
//                 <option value="MTR">Meter (MTR)</option>
//               </select>
//               <Err k="uom" />
//             </div>
//             <div>
//               <Lbl text="Managed By" />
//               <select className={fi("")} name="managedBy" value={id.managedBy || ""} onChange={handleChange}>
//                 <option value="">Select method…</option>
//                 <option value="batch">Batch</option>
//                 <option value="serial">Serial Number</option>
//                 <option value="none">Not Managed</option>
//               </select>
//             </div>
//           </div>

//           <div>
//             <Lbl text="Description" />
//             <textarea className={`${fi("")} resize-none`} name="description" rows={3} placeholder="Brief description of this item…" value={id.description || ""} onChange={handleChange} />
//           </div>

//           <div className="flex items-center gap-4 pt-2">
//             <Lbl text="Status" />
//             <select className={`${fi("")} w-auto`} name="status" value={id.status || "active"} onChange={handleChange}>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//             </select>
//           </div>
//         </div>
//       );

//       case 2: return (
//         <div className="space-y-5">
//           <div className="flex gap-6">
//             <Toggle name="includeGST"  checked={id.includeGST}  label="Include GST"  />
//             <Toggle name="includeIGST" checked={id.includeIGST} label="Include IGST" />
//           </div>
//           {id.includeGST && (
//             <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2"><HiOutlineDocumentText /> GST Details</p>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div><Lbl text="GST Code" /><input className={fi("")} name="gstCode" value={id.gstCode || ""} onChange={handleChange} placeholder="e.g. GST18" /></div>
//                 <div><Lbl text="GST Name" /><input className={fi("")} name="gstName" value={id.gstName || ""} onChange={handleChange} placeholder="e.g. GST 18%" /></div>
//                 <div>
//                   <Lbl text="GST Rate (%)" />
//                   <input className={fi("")} name="gstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.gstRate || ""} onChange={handleChange} />
//                   <p className="text-[11px] text-blue-500 mt-1">CGST & SGST will be auto-split (half each)</p>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div><Lbl text="CGST (%)" /><input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.cgstRate || ""} readOnly /></div>
//                   <div><Lbl text="SGST (%)" /><input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.sgstRate || ""} readOnly /></div>
//                 </div>
//               </div>
//             </div>
//           )}
//           {id.includeIGST && (
//             <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2"><HiOutlineDocumentText /> IGST Details</p>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                 <div><Lbl text="IGST Code" /><input className={fi("")} name="igstCode" value={id.igstCode || ""} onChange={handleChange} placeholder="e.g. IGST18" /></div>
//                 <div><Lbl text="IGST Name" /><input className={fi("")} name="igstName" value={id.igstName || ""} onChange={handleChange} placeholder="e.g. IGST 18%" /></div>
//                 <div><Lbl text="IGST Rate (%)" /><input className={fi("")} name="igstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.igstRate || ""} onChange={handleChange} /></div>
//               </div>
//             </div>
//           )}
//           {!id.includeGST && !id.includeIGST && (
//             <div className="text-center py-8 text-gray-300">
//               <HiOutlineDocumentText className="text-5xl mx-auto mb-2 opacity-30" />
//               <p className="text-sm font-medium">Enable GST or IGST above to configure tax details</p>
//             </div>
//           )}
//         </div>
//       );

//       case 3: return (
//         <div className="space-y-5">
//           <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
//             <FaCashRegister className="text-orange-500 text-xl mt-0.5 shrink-0" />
//             <div>
//               <p className="text-sm font-bold text-orange-800 mb-0.5">POS (Point of Sale)</p>
//               <p className="text-xs text-orange-600">Enable this item to be sold through the POS system.</p>
//             </div>
//           </div>
//           <Toggle name="posEnabled" checked={id.posEnabled} label="Enable this item for POS (Sellable)" />
//           {id.posEnabled && (
//             <div className="border border-gray-200 rounded-xl p-5 space-y-5">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Barcode" />
//                   <input className={fi("")} name="posConfig.barcode" value={id.posConfig?.barcode || ""} onChange={handleChange} placeholder="Scan or enter barcode" />
//                 </div>
//                 <div>
//                   <Lbl text="POS Price (Optional override)" />
//                   <input className={fi("")} name="posConfig.posPrice" type="number" min="0" step="0.01" placeholder={`Leave blank → uses ₹${id.unitPrice || 0}`} value={id.posConfig?.posPrice ?? ""} onChange={handleChange} />
//                   <p className="text-[11px] text-gray-400 mt-1">Empty = uses Unit Price: <strong>₹{id.unitPrice || 0}</strong></p>
//                 </div>
//               </div>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="space-y-3">
//                   <Toggle name="posConfig.allowDiscount" checked={id.posConfig?.allowDiscount ?? true} label="Allow Discount in POS" nested />
//                   <Toggle name="posConfig.taxableInPOS"  checked={id.posConfig?.taxableInPOS  ?? true} label="Taxable in POS"        nested />
//                   <Toggle name="posConfig.showInPOS"     checked={id.posConfig?.showInPOS     ?? true} label="Show in POS list"      nested />
//                 </div>
//                 <div>
//                   <Lbl text="Max Discount (%)" />
//                   <input className={fi("")} name="posConfig.maxDiscountPercent" type="number" min="0" max="100"
//                     value={id.posConfig?.maxDiscountPercent ?? 100} onChange={handleChange}
//                     disabled={!(id.posConfig?.allowDiscount ?? true)} />
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       );

//       case 4: return (
//         <div className="space-y-4">
//           <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
//             <FaShieldAlt className="text-emerald-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-emerald-700 font-medium">Define quality parameters for inspection during GRN or production.</p>
//           </div>
//           <Toggle name="includeQualityCheck" checked={id.includeQualityCheck} label="Include Quality Checks" />
//           {id.includeQualityCheck && (
//             <div>
//               <div className="grid grid-cols-12 gap-2 mb-2 px-1">
//                 {["Sr.", "Parameter", "Min", "Max", ""].map((h, i) => (
//                   <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${i===0?"col-span-1":i===1?"col-span-5":i===4?"col-span-1":"col-span-2"}`}>{h}</div>
//                 ))}
//               </div>
//               <div className="space-y-2">
//                 {id.qualityCheckDetails.map((qc, i) => (
//                   <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
//                     <div className="col-span-1"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 text-center font-mono" name="srNo" placeholder="#" value={qc.srNo} onChange={e => handleQCChange(i, e)} /></div>
//                     <div className="col-span-5"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="parameter" placeholder="e.g. Tensile Strength" value={qc.parameter} onChange={e => handleQCChange(i, e)} /></div>
//                     <div className="col-span-2"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="min" placeholder="Min" value={qc.min} onChange={e => handleQCChange(i, e)} /></div>
//                     <div className="col-span-2"><input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="max" placeholder="Max" value={qc.max} onChange={e => handleQCChange(i, e)} /></div>
//                     <div className="col-span-2 flex justify-end">
//                       <button type="button" onClick={() => removeQC(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><FaTrash className="text-xs" /></button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <button type="button" onClick={addQC} className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-indigo-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
//                 <FaPlus className="text-xs" /> Add Quality Parameter
//               </button>
//             </div>
//           )}
//         </div>
//       );

//       case 5: return (
//         <div className="space-y-5">
//           <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
//             <FaRuler className="text-blue-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-blue-700 font-medium">Physical dimensions and weight are used for logistics and warehouse management. All optional.</p>
//           </div>
//           <div>
//             <p className="text-sm font-bold text-gray-700 mb-3">Dimensions</p>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//               {[{n:"length",l:"Length (cm)",ph:"0"},{n:"width",l:"Width (cm)",ph:"0"},{n:"height",l:"Height (cm)",ph:"0"},{n:"weight",l:"Weight (kg)",ph:"0.00",step:"0.01"}].map(f => (
//                 <div key={f.n}><Lbl text={f.l} /><input className={fi("")} name={f.n} type="number" min="0" step={f.step||"1"} placeholder={f.ph} value={id[f.n]||""} onChange={handleChange} /></div>
//               ))}
//             </div>
//           </div>
//           <div className="border-t border-gray-100 pt-5">
//             <p className="text-sm font-bold text-gray-700 mb-3">Additional Details</p>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div><Lbl text="Manufacturer" /><input className={fi("")} name="manufacturer" value={id.manufacturer||""} onChange={handleChange} placeholder="e.g. Tata Steel" /></div>
//               <div><Lbl text="Expiry Date" /><input className={fi("")} name="expiryDate" type="date" value={id.expiryDate||""} onChange={handleChange} /></div>
//               <div><Lbl text="Batch Number" /><input className={fi("")} name="batchNumber" value={id.batchNumber||""} onChange={handleChange} placeholder="e.g. BATCH-2024-001" /></div>
//             </div>
//             <div className="mt-4 flex flex-wrap gap-4">
//               <Toggle name="gnr"              checked={id.gnr}              label="GNR Applicable" />
//               <Toggle name="delivery"          checked={id.delivery}          label="Delivery Item" />
//               <Toggle name="productionProcess" checked={id.productionProcess} label="Production Process" />
//             </div>
//           </div>
//         </div>
//       );

//       case 6: return (
//         <div className="space-y-4">
//           <p className="text-sm text-gray-500">Review all details before saving.</p>

//           {/* Image Preview in Review */}
//           {id.imageUrl && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center gap-4">
//               <img
//                 src={id.imageUrl}
//                 alt="Item"
//                 className="w-16 h-16 object-cover rounded-lg border border-gray-200"
//                 onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/200x200/eeeeee/999999?text=No+Image&font=montserrat"; }}
//               />
//               <div>
//                 <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">Item Image</p>
//                 <p className="text-xs text-indigo-500 font-medium truncate max-w-[200px]">{id.imageUrl}</p>
//               </div>
//             </div>
//           )}

//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBoxOpen className="text-indigo-400" /> Basic Info</p>
//             <RRow l="Code"       v={id.itemCode} />
//             <RRow l="Name"       v={id.itemName} />
//             <RRow l="Category"   v={id.category} />
//             <RRow l="Type"       v={id.itemType} />
//             <RRow l="Unit Price" v={id.unitPrice ? `₹${Number(id.unitPrice).toFixed(2)}` : ""} />
//             <RRow l="Min. Stock" v={id.quantity} />
//             <RRow l="UOM"        v={id.uom} />
//             <RRow l="Reorder Level" v={id.reorderLevel} />
//             <RRow l="Lead Time"  v={id.leadTime ? `${id.leadTime} days` : ""} />
//             <RRow l="Status"     v={id.status} />
//             {id.posConfig?.barcode && <RRow l="Barcode" v={id.posConfig.barcode} />}
//           </div>
//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax</p>
//             <RRow l="Include GST"  v={id.includeGST  ? "Yes" : "No"} />
//             <RRow l="GST Rate"     v={id.gstRate ? `${id.gstRate}%` : ""} />
//             <RRow l="Include IGST" v={id.includeIGST ? "Yes" : "No"} />
//             <RRow l="IGST Rate"    v={id.igstRate ? `${id.igstRate}%` : ""} />
//           </div>
//           {id.posEnabled && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaCashRegister className="text-orange-400" /> POS</p>
//               <RRow l="POS Price" v={id.posConfig?.posPrice ? `₹${id.posConfig.posPrice}` : `₹${id.unitPrice} (unit price)`} />
//               <RRow l="Barcode"   v={id.posConfig?.barcode} />
//               <RRow l="Discount"  v={id.posConfig?.allowDiscount ? `Allowed (max ${id.posConfig.maxDiscountPercent}%)` : "Not allowed"} />
//               <RRow l="Taxable"   v={id.posConfig?.taxableInPOS ? "Yes" : "No"} />
//             </div>
//           )}
//           {id.includeQualityCheck && id.qualityCheckDetails?.length > 0 && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Quality ({id.qualityCheckDetails.length} parameters)</p>
//               {id.qualityCheckDetails.map((q, i) => <RRow key={i} l={q.parameter||`Param ${i+1}`} v={`Min: ${q.min||"—"} · Max: ${q.max||"—"}`} />)}
//             </div>
//           )}
//           {(id.length || id.weight || id.manufacturer) && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaRuler className="text-blue-400" /> Dimensions</p>
//               {id.length && <RRow l="L × W × H" v={`${id.length} × ${id.width||0} × ${id.height||0} cm`} />}
//               {id.weight       && <RRow l="Weight"       v={`${id.weight} kg`} />}
//               {id.manufacturer && <RRow l="Manufacturer" v={id.manufacturer} />}
//             </div>
//           )}
//         </div>
//       );

//       default: return null;
//     }
//   };

//   // ════════════════════════════════════════
//   // LIST VIEW
//   // ════════════════════════════════════════
//   if (view === "list") return (
//     <div className="min-h-screen bg-gray-50">
//       {showScanner && (
//         <QRScannerModal
//           onScanSuccess={handleScanSuccess}
//           onManual={handleManualEntry}
//           onClose={() => setShowScanner(false)}
//         />
//       )}
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Item Management</h1>
//             <p className="text-sm text-gray-400 mt-0.5">{items.length} total items</p>
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <button onClick={downloadTemplate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
//               <FaDownload className="text-xs" /> Template
//             </button>
//             <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
//               {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
//               <input type="file" hidden accept=".csv" onChange={handleBulk} />
//             </label>
//             <button onClick={handleCreateClick}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               <FaPlus className="text-xs" /> Create Item
//             </button>
//           </div>
//         </div>

//         {/* Stat cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label:"Total",       value:stats.total,   emoji:"📦", filter:"All" },
//             { label:"Product",     value:stats.product, emoji:"🛍️", filter:"Product" },
//             { label:"Service",     value:stats.service, emoji:"🔧", filter:"Service" },
//             { label:"Raw Material",value:stats.rawMat,  emoji:"⚙️",  filter:"Raw Material" },
//           ].map(s => (
//             <div key={s.label} onClick={() => setFilterType(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
//                 ${filterType===s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
//                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search items…" />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All","Product","Service","Raw Material"].map(t => (
//                 <button key={t} onClick={() => setFilterType(t)}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterType===t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {t}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["Image","Code","Item","Category","Type","Price","UOM","Status","POS","Actions"].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   Array(5).fill(0).map((_, i) => (
//                     <tr key={i} className="border-b border-gray-50">
//                       {Array(10).fill(0).map((__, j) => (
//                         <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" /></td>
//                       ))}
//                     </tr>
//                   ))
//                 ) : filtered.length === 0 ? (
//                   <tr><td colSpan={10} className="text-center py-16">
//                     <div className="text-4xl mb-2 opacity-20">📦</div>
//                     <p className="text-sm font-medium text-gray-300">No items found</p>
//                   </td></tr>
//                 ) : filtered.map(it => (
//                   <tr key={it._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
//                     {/* Image cell */}
//                     <td className="px-1 py-1.5 relative">
//                       {it.imageUrl ? (
//                         <img
//                           src={it.imageUrl}
//                           alt={it.itemName}
//                           className="w-12 h-12 object-cover rounded-md border border-gray-200"
//                           onError={e => { e.target.onerror = null; e.target.src = "https://placehold.co/800x800/eeeeee/999999?text=No+Image&font=montserrat"; }}
//                         />
//                       ) : (
//                         <div className="w-12 h-12 rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
//                           <FaBoxOpen className="text-gray-300 text-base" />
//                         </div>
//                       )}
//                     </td>
//                     <td className="px-4 py-3">
//                       <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{it.itemCode}</span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="font-semibold text-gray-900 text-sm leading-tight">{it.itemName}</p>
//                       {it.manufacturer && <p className="text-xs text-gray-400">{it.manufacturer}</p>}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-gray-500 font-medium">{it.category || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
//                         ${it.itemType==="Product" ? "bg-blue-50 text-blue-600"
//                           : it.itemType==="Service" ? "bg-purple-50 text-purple-600"
//                           : it.itemType==="Raw Material" ? "bg-amber-50 text-amber-600"
//                           : "bg-gray-100 text-gray-500"}`}>
//                         {it.itemType || "—"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 font-mono text-sm font-bold text-gray-700">₹{Number(it.unitPrice||0).toFixed(2)}</td>
//                     <td className="px-4 py-3 text-xs text-gray-500">{it.uom || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${it.status==="active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
//                         {it.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       {it.posEnabled
//                         ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">POS</span>
//                         : <span className="text-gray-200 text-xs">—</span>}
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex gap-1.5">
//                         <button onClick={() => handleEdit(it)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaEdit className="text-xs" />
//                         </button>
//                         <button onClick={() => handleDelete(it._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaTrash className="text-xs" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );

//   // ════════════════════════════════════════
//   // FORM VIEW
//   // ════════════════════════════════════════
//   return (
//     <div className="min-h-screen bg-gray-50">
//       {showScanner && (
//         <QRScannerModal
//           onScanSuccess={handleScanSuccess}
//           onManual={handleManualEntry}
//           onClose={() => setShowScanner(false)}
//         />
//       )}
//       <div className="max-w-screen-md mx-auto px-4 sm:px-6 py-6">
//         <button onClick={reset} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-5 transition-colors">
//           <FaArrowLeft className="text-xs" /> Back to Items
//         </button>

//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
//           {/* Step progress */}
//           <div className="px-6 pt-6 pb-0">
//             <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
//               {STEPS.map((s, idx) => {
//                 const done    = step > s.id;
//                 const current = step === s.id;
//                 const Icon    = s.icon;
//                 return (
//                   <React.Fragment key={s.id}>
//                     <div className="flex flex-col items-center gap-1 shrink-0">
//                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
//                         ${done    ? "bg-emerald-500 text-white"
//                           : current ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
//                           : "bg-gray-100 text-gray-300"}`}>
//                         {done ? <FaCheck className="text-[10px]" /> : <Icon className="text-[10px]" />}
//                       </div>
//                       <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block
//                         ${current ? "text-indigo-600" : done ? "text-emerald-500" : "text-gray-300"}`}>
//                         {s.label}
//                       </span>
//                     </div>
//                     {idx < STEPS.length - 1 && (
//                       <div className={`flex-1 h-0.5 mx-1 transition-all ${step > s.id ? "bg-emerald-400" : "bg-gray-100"}`} />
//                     )}
//                   </React.Fragment>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="px-6 pb-4 border-b border-gray-100">
//             <h2 className="text-base font-extrabold text-gray-900">{STEPS[step-1].label}</h2>
//             <p className="text-xs text-gray-400 mt-0.5">Step {step} of {STEPS.length}</p>
//           </div>

//           <div className="px-6 py-5">{renderStep()}</div>

//           <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-3">
//             <button onClick={goPrev} disabled={step === 1}
//               className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold disabled:opacity-30 hover:bg-gray-50 transition-all">
//               <FaChevronLeft className="text-xs" /> Back
//             </button>
//             {step < STEPS.length ? (
//               <button onClick={goNext}
//                 className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//                 Next <FaChevronRight className="text-xs" />
//               </button>
//             ) : (
//               <button onClick={handleSubmit} disabled={submitting}
//                 className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-all shadow-sm shadow-emerald-200">
//                 {submitting ? <FaSpinner className="animate-spin" /> : <FaCheck />}
//                 {submitting ? "Saving…" : id._id ? "Update Item" : "Save Item"}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }





// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import {
//   FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
//   FaChevronLeft, FaChevronRight, FaCheck, FaFileUpload,
//   FaDownload, FaExclamationCircle, FaBoxOpen, FaTag,
//   FaShieldAlt, FaCashRegister, FaRuler, FaClipboardCheck,
//   FaListUl
// } from "react-icons/fa";
// import { HiOutlineDocumentText } from "react-icons/hi";
// import ItemGroupSearch from "./ItemGroupSearch";
// import { toast } from "react-toastify";

// // ── 6 Steps ──
// const STEPS = [
//   { id: 1, label: "Basic Info",     icon: FaBoxOpen },
//   { id: 2, label: "Tax & GST",      icon: HiOutlineDocumentText },
//   { id: 3, label: "POS Settings",   icon: FaCashRegister },
//   { id: 4, label: "Quality",        icon: FaShieldAlt },
//   { id: 5, label: "Dimensions",     icon: FaRuler },
//   { id: 6, label: "Review",         icon: FaClipboardCheck },
// ];

// const INITIAL = {
//   itemCode: "", itemName: "", description: "", category: "",
//   unitPrice: "", quantity: "", reorderLevel: "", leadTime: "",
//   itemType: "", uom: "", managedBy: "", managedValue: "",
//   batchNumber: "", expiryDate: "", manufacturer: "",
//   length: "", width: "", height: "", weight: "",
//   gnr: false, delivery: false, productionProcess: false,
//   includeQualityCheck: false, qualityCheckDetails: [],
//   includeGST: true, includeIGST: true,
//   gstCode: "", gstName: "", gstRate: "", cgstRate: "", sgstRate: "",
//   igstCode: "", igstName: "", igstRate: "",
//   status: "active", active: true,
//   posEnabled: false,
//   posConfig: {
//     barcode: "", posPrice: "", allowDiscount: true,
//     maxDiscountPercent: 100, taxableInPOS: true, showInPOS: true,
//   },
// };

// const VALIDATORS = {
//   1: (d) => {
//     const e = {};
//     if (!d.itemName?.trim()) e.itemName  = "Item Name is required";
//     if (!d.category?.trim()) e.category  = "Category is required";
//     if (!d.unitPrice)        e.unitPrice = "Unit Price is required";
//     if (d.quantity === "" || d.quantity === undefined) e.quantity = "Minimum Stock is required";
//     if (!d.uom)     e.uom     = "Unit of Measure is required";
//     if (!d.itemType) e.itemType = "Item Type is required";
//     return e;
//   },
//   2: () => ({}),
//   3: () => ({}),
//   4: () => ({}),
//   5: () => ({}),
//   6: () => ({}),
// };

// export default function ItemManagement() {
//   const [view,      setView]      = useState("list");
//   const [items,     setItems]     = useState([]);
//   const [searchTerm,setSearchTerm]= useState("");
//   const [filterType,setFilterType]= useState("All");
//   const [loading,   setLoading]   = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [submitting,setSubmitting]= useState(false);
//   const [step,      setStep]      = useState(1);
//   const [id,        setId]        = useState({ ...INITIAL });  // id = itemDetails
//   const [errs,      setErrs]      = useState({});

//   useEffect(() => { fetchItems(); }, []);

//   const fetchItems = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/items", { headers: { Authorization: `Bearer ${token}` } });
//       if (res.data.success) setItems(res.data.data || []);
//     } catch { toast.error("Failed to load items"); }
//     setLoading(false);
//   };

//   const generateCode = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res   = await axios.get("/api/lastItemCode", { headers: { Authorization: `Bearer ${token}` } });
//       const last  = res.data.lastItemCode || "ITEM-0000";
//       const num   = parseInt(last.split("-")[1] || "0", 10) + 1;
//       setId(p => ({ ...p, itemCode: `ITEM-${String(num).padStart(4, "0")}` }));
//     } catch { }
//   };

//   // ── Handlers ──
//   const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;

//     if (name.startsWith("posConfig.")) {
//       const key = name.split(".")[1];
//       setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [key]: type === "checkbox" ? checked : value } }));
//       return;
//     }
//     if (type === "checkbox") { setId(p => ({ ...p, [name]: checked })); return; }
//     if (name === "gstRate") {
//       const rate = parseFloat(value) || 0;
//       setId(p => ({ ...p, gstRate: value, cgstRate: rate / 2, sgstRate: rate / 2 }));
//       return;
//     }
//     setId(p => ({ ...p, [name]: value }));
//     clearErr(name);
//   };

//   const handleQCChange = (i, e) => {
//     const { name, value } = e.target;
//     setId(p => { const q = [...p.qualityCheckDetails]; q[i] = { ...q[i], [name]: value }; return { ...p, qualityCheckDetails: q }; });
//   };

//   const addQC    = ()  => setId(p => ({ ...p, qualityCheckDetails: [...p.qualityCheckDetails, { srNo: "", parameter: "", min: "", max: "" }] }));
//   const removeQC = (i) => setId(p => ({ ...p, qualityCheckDetails: p.qualityCheckDetails.filter((_, j) => j !== i) }));

//   // ── Navigation ──
//   const goNext = () => {
//     const v = VALIDATORS[step];
//     if (v) {
//       const e = v(id);
//       if (Object.keys(e).length) { setErrs(e); toast.error(Object.values(e)[0]); return; }
//     }
//     setErrs({});
//     setStep(s => s + 1);
//   };

//   const goPrev = () => { setErrs({}); setStep(s => s - 1); };

//   // ── Submit ──
//   const handleSubmit = async () => {
//       //  handlesubmit pahe eak open the comera and and for scan QR code of that that item scanning that auto fill the details 

//     // Final validation before submit
    
//     const allE = VALIDATORS[1](id);
//     if (Object.keys(allE).length) { setErrs(allE); toast.error("Fix required fields"); return; }

//     setSubmitting(true);
//     const token   = localStorage.getItem("token");
//     const toNum   = (v) => (v === "" || v == null ? undefined : Number(v));
//     const payload = {
//       ...id,
//       unitPrice: Number(id.unitPrice || 0),
//       quantity:  Number(id.quantity  || 0),
//       reorderLevel: toNum(id.reorderLevel),
//       leadTime:  toNum(id.leadTime),
//       length: toNum(id.length), width: toNum(id.width),
//       height: toNum(id.height), weight: toNum(id.weight),
//       gstRate: toNum(id.gstRate), cgstRate: toNum(id.cgstRate),
//       sgstRate: toNum(id.sgstRate), igstRate: toNum(id.igstRate),
//       posEnabled: !!id.posEnabled,
//       posConfig: {
//         ...id.posConfig,
//         posPrice: toNum(id.posConfig?.posPrice),
//         maxDiscountPercent: id.posConfig?.maxDiscountPercent === "" ? 100 : Number(id.posConfig?.maxDiscountPercent ?? 100),
//         allowDiscount: id.posConfig?.allowDiscount ?? true,
//         taxableInPOS:  id.posConfig?.taxableInPOS  ?? true,
//         showInPOS:     id.posConfig?.showInPOS      ?? true,
//       },
//     };

//     try {
//       if (id._id) {
//         const res = await axios.put(`/api/items/${id._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => p.map(it => it._id === id._id ? res.data.data : it)); toast.success("Item updated!"); }
//         else toast.error(res.data.message || "Update failed");
//       } else {
//         const res = await axios.post("/api/items", payload, { headers: { Authorization: `Bearer ${token}` } });
//         if (res.data.success) { setItems(p => [...p, res.data.data]); toast.success("Item created!"); }
//         else toast.error(res.data.message || "Create failed");
//       }
//       reset();
//     } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
//     setSubmitting(false);
//   };

//   const reset = () => { setId({ ...INITIAL }); setStep(1); setErrs({}); setView("list"); };

//   const handleEdit = (item) => { setId(item); setStep(1); setErrs({}); setView("form"); };

//   const handleDelete = async (itemId) => {
//     if (!confirm("Delete this item?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/items/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
//       setItems(p => p.filter(it => it._id !== itemId));
//       toast.success("Item deleted");
//     } catch { toast.error("Delete failed"); }
//   };

//   // ── Bulk ──
//   const downloadTemplate = async () => {
//     try {
//       const res  = await fetch("/api/items/template");
//       if (!res.ok) throw new Error();
//       const blob = await res.blob();
//       const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "item_template.csv"; a.click();
//     } catch { toast.error("Error downloading template"); }
//   };

//   const handleBulk = async (e) => {
//     const file = e.target.files[0]; if (!file) return;
//     setUploading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const text  = await file.text();
//       const lines = text.split("\n").filter(l => l.trim());
//       const hdrs  = lines[0].split(",").map(h => h.trim());
//       const jsonData = lines.slice(1).map(line => { const v = line.split(","); const o = {}; hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || "")); return o; });
//       const res = await axios.post("/api/items/bulk", { items: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
//       const { success, results } = res.data;
//       if (success) {
//         const cr = results.filter(r => r.success && r.action === "created").length;
//         const up = results.filter(r => r.success && r.action === "updated").length;
//         const sk = results.filter(r => !r.success).length;
//         toast.success(`${cr} created · ${up} updated · ${sk} skipped`);
//         results.filter(r => r.warnings?.length).forEach(r => toast.warn(`Row ${r.row}: ${r.warnings.join(", ")}`));
//         fetchItems();
//       } else toast.error(res.data.message || "Bulk upload failed");
//     } catch { toast.error("Invalid CSV or server error"); }
//     finally { setUploading(false); e.target.value = ""; }
//   };

//   // ── Derived ──
//   const filtered = items.filter(it => {
//     const q  = searchTerm.toLowerCase();
//     const mQ = [it.itemCode, it.itemName, it.category, it.itemType].some(v => v?.toLowerCase().includes(q));
//     const mT = filterType === "All" || it.itemType === filterType;
//     return mQ && mT;
//   }).slice().reverse();

//   const stats = {
//     total:    items.length,
//     product:  items.filter(it => it.itemType === "Product").length,
//     service:  items.filter(it => it.itemType === "Service").length,
//     rawMat:   items.filter(it => it.itemType === "Raw Material").length,
//   };

//   // ── UI Helpers ──
//   const Err = ({ k }) => errs[k]
//     ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
//     : null;

//   const fi = (k, extra = "") =>
//     `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
//      ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );

//   const Toggle = ({ name, checked, label, nested }) => (
//     <label className="flex items-center gap-2.5 cursor-pointer group">
//       <div className={`relative w-9 h-5 rounded-full transition-all ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
//         onClick={() => nested
//           ? setId(p => ({ ...p, posConfig: { ...(p.posConfig || {}), [name.split(".")[1]]: !checked } }))
//           : setId(p => ({ ...p, [name]: !checked }))}>
//         <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "translate-x-4" : "translate-x-0"}`} />
//       </div>
//       <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
//     </label>
//   );

//   const RRow = ({ l, v }) => (
//     <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
//       <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
//       <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
//     </div>
//   );

//   // ── Step Content ──
//   const renderStep = () => {
//     switch (step) {

//       // ── Step 1: Basic Info ──
//       case 1: return (
//         <div className="space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Item Code" />
//               <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.itemCode || ""} readOnly />
//               <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
//             </div>
//             <div>
//               <Lbl text="Item Name" req />
//               <input className={fi("itemName")} name="itemName" value={id.itemName || ""} onChange={handleChange} placeholder="e.g. Steel Rod 10mm" />
//               <Err k="itemName" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Category" req />
//               <ItemGroupSearch onSelectItemGroup={g => { setId(p => ({ ...p, category: g.name })); clearErr("category"); }} />
//               {id.category && <p className="text-xs text-indigo-600 font-semibold mt-1.5 flex items-center gap-1"><FaTag className="text-[10px]" /> {id.category}</p>}
//               <Err k="category" />
//             </div>
//             <div>
//               <Lbl text="Item Type" req />
//               <select className={fi("itemType")} name="itemType" value={id.itemType || ""} onChange={handleChange}>
//                 <option value="">Select type…</option>
//                 <option>Product</option>
//                 <option>Service</option>
//                 <option>Raw Material</option>
//               </select>
//               <Err k="itemType" />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Unit Price (₹)" req />
//               <input className={fi("unitPrice")} name="unitPrice" type="number" min="0" step="0.01" placeholder="0.00" value={id.unitPrice || ""} onChange={handleChange} />
//               <Err k="unitPrice" />
//             </div>
//             <div>
//               <Lbl text="Min. Stock" req />
//               <input className={fi("quantity")} name="quantity" type="number" min="0" placeholder="0" value={id.quantity || ""} onChange={handleChange} />
//               <Err k="quantity" />
//             </div>
//             <div>
//               <Lbl text="Reorder Level" />
//               <input className={fi("")} name="reorderLevel" type="number" min="0" placeholder="0" value={id.reorderLevel || ""} onChange={handleChange} />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div>
//               <Lbl text="Lead Time (Days)" />
//               <input className={fi("")} name="leadTime" type="number" min="1" placeholder="7" value={id.leadTime || ""} onChange={handleChange} />
//             </div>
//             <div>
//               <Lbl text="Unit of Measure" req />
//               <select className={fi("uom")} name="uom" value={id.uom || ""} onChange={handleChange}>
//                 <option value="">Select UOM…</option>
//                 <option value="KG">Kilogram (KG)</option>
//                 <option value="MTP">Metric Ton (MTP)</option>
//                 <option value="PC">Piece (PC)</option>
//                 <option value="LTR">Liter (LTR)</option>
//                 <option value="MTR">Meter (MTR)</option>
//               </select>
//               <Err k="uom" />
//             </div>
//             <div>
//               <Lbl text="Managed By" />
//               <select className={fi("")} name="managedBy" value={id.managedBy || ""} onChange={handleChange}>
//                 <option value="">Select method…</option>
//                 <option value="batch">Batch</option>
//                 <option value="serial">Serial Number</option>
//                 <option value="none">Not Managed</option>
//               </select>
//             </div>
//           </div>

//           <div>
//             <Lbl text="Description" />
//             <textarea className={`${fi("")} resize-none`} name="description" rows={3} placeholder="Brief description of this item…" value={id.description || ""} onChange={handleChange} />
//           </div>

//           <div className="flex items-center gap-4 pt-2">
//             <Lbl text="Status" />
//             <select className={`${fi("")} w-auto`} name="status" value={id.status || "active"} onChange={handleChange}>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//             </select>
//           </div>
//         </div>
//       );

//       // ── Step 2: Tax & GST ──
//       case 2: return (
//         <div className="space-y-5">
//           <div className="flex gap-6">
//             <Toggle name="includeGST"  checked={id.includeGST}  label="Include GST"  />
//             <Toggle name="includeIGST" checked={id.includeIGST} label="Include IGST" />
//           </div>

//           {id.includeGST && (
//             <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
//                 <HiOutlineDocumentText /> GST Details
//               </p>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="GST Code" />
//                   <input className={fi("")} name="gstCode" value={id.gstCode || ""} onChange={handleChange} placeholder="e.g. GST18" />
//                 </div>
//                 <div>
//                   <Lbl text="GST Name" />
//                   <input className={fi("")} name="gstName" value={id.gstName || ""} onChange={handleChange} placeholder="e.g. GST 18%" />
//                 </div>
//                 <div>
//                   <Lbl text="GST Rate (%)" />
//                   <input className={fi("")} name="gstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.gstRate || ""} onChange={handleChange} />
//                   <p className="text-[11px] text-blue-500 mt-1">CGST & SGST will be auto-split (half each)</p>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Lbl text="CGST (%)" />
//                     <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.cgstRate || ""} readOnly />
//                   </div>
//                   <div>
//                     <Lbl text="SGST (%)" />
//                     <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={id.sgstRate || ""} readOnly />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {id.includeIGST && (
//             <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
//               <p className="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2">
//                 <HiOutlineDocumentText /> IGST Details
//               </p>
//               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                 <div>
//                   <Lbl text="IGST Code" />
//                   <input className={fi("")} name="igstCode" value={id.igstCode || ""} onChange={handleChange} placeholder="e.g. IGST18" />
//                 </div>
//                 <div>
//                   <Lbl text="IGST Name" />
//                   <input className={fi("")} name="igstName" value={id.igstName || ""} onChange={handleChange} placeholder="e.g. IGST 18%" />
//                 </div>
//                 <div>
//                   <Lbl text="IGST Rate (%)" />
//                   <input className={fi("")} name="igstRate" type="number" min="0" max="100" step="0.1" placeholder="0" value={id.igstRate || ""} onChange={handleChange} />
//                 </div>
//               </div>
//             </div>
//           )}

//           {!id.includeGST && !id.includeIGST && (
//             <div className="text-center py-8 text-gray-300">
//               <HiOutlineDocumentText className="text-5xl mx-auto mb-2 opacity-30" />
//               <p className="text-sm font-medium">Enable GST or IGST above to configure tax details</p>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 3: POS Settings ──
//       case 3: return (
//         <div className="space-y-5">
//           <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
//             <FaCashRegister className="text-orange-500 text-xl mt-0.5 shrink-0" />
//             <div>
//               <p className="text-sm font-bold text-orange-800 mb-0.5">POS (Point of Sale)</p>
//               <p className="text-xs text-orange-600">Enable this item to be sold through the POS system. Configure barcode, pricing, and discount rules.</p>
//             </div>
//           </div>

//           <Toggle name="posEnabled" checked={id.posEnabled} label="Enable this item for POS (Sellable)" />

//           {id.posEnabled && (
//             <div className="border border-gray-200 rounded-xl p-5 space-y-5">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div>
//                   <Lbl text="Barcode" />
//                   <input className={fi("")} name="posConfig.barcode" value={id.posConfig?.barcode || ""} onChange={handleChange} placeholder="Scan or enter barcode" />
//                 </div>
//                 <div>
//                   <Lbl text="POS Price (Optional override)" />
//                   <input className={fi("")} name="posConfig.posPrice" type="number" min="0" step="0.01" placeholder={`Leave blank → uses ₹${id.unitPrice || 0}`} value={id.posConfig?.posPrice ?? ""} onChange={handleChange} />
//                   <p className="text-[11px] text-gray-400 mt-1">Empty = uses Unit Price: <strong>₹{id.unitPrice || 0}</strong></p>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="space-y-3">
//                   <Toggle name="posConfig.allowDiscount"  checked={id.posConfig?.allowDiscount  ?? true} label="Allow Discount in POS" nested />
//                   <Toggle name="posConfig.taxableInPOS"   checked={id.posConfig?.taxableInPOS   ?? true} label="Taxable in POS"         nested />
//                   <Toggle name="posConfig.showInPOS"      checked={id.posConfig?.showInPOS      ?? true} label="Show in POS list"       nested />
//                 </div>
//                 <div>
//                   <Lbl text="Max Discount (%)" />
//                   <input className={fi("")} name="posConfig.maxDiscountPercent" type="number" min="0" max="100"
//                     value={id.posConfig?.maxDiscountPercent ?? 100} onChange={handleChange}
//                     disabled={!(id.posConfig?.allowDiscount ?? true)} />
//                   {!(id.posConfig?.allowDiscount ?? true) && <p className="text-[11px] text-gray-400 mt-1">Enable discount to set max %</p>}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 4: Quality ──
//       case 4: return (
//         <div className="space-y-4">
//           <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
//             <FaShieldAlt className="text-emerald-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-emerald-700 font-medium">Define quality parameters for inspection during GRN or production. Each parameter needs a min and max acceptable value.</p>
//           </div>

//           <Toggle name="includeQualityCheck" checked={id.includeQualityCheck} label="Include Quality Checks" />

//           {id.includeQualityCheck && (
//             <div>
//               {/* Header row */}
//               <div className="grid grid-cols-12 gap-2 mb-2 px-1">
//                 {["Sr.", "Parameter", "Min", "Max", ""].map((h, i) => (
//                   <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-gray-400 ${i === 0 ? "col-span-1" : i === 1 ? "col-span-5" : i === 4 ? "col-span-1" : "col-span-2"}`}>{h}</div>
//                 ))}
//               </div>

//               <div className="space-y-2">
//                 {id.qualityCheckDetails.map((qc, i) => (
//                   <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg px-2 py-1.5">
//                     <div className="col-span-1">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400 text-center font-mono" name="srNo" placeholder="#" value={qc.srNo} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-5">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="parameter" placeholder="e.g. Tensile Strength" value={qc.parameter} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="min" placeholder="Min" value={qc.min} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2">
//                       <input className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white focus:outline-none focus:border-indigo-400" name="max" placeholder="Max" value={qc.max} onChange={e => handleQCChange(i, e)} />
//                     </div>
//                     <div className="col-span-2 flex justify-end">
//                       <button type="button" onClick={() => removeQC(i)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                         <FaTrash className="text-xs" />
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <button type="button" onClick={addQC}
//                 className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-indigo-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-all">
//                 <FaPlus className="text-xs" /> Add Quality Parameter
//               </button>
//             </div>
//           )}
//         </div>
//       );

//       // ── Step 5: Dimensions ──
//       case 5: return (
//         <div className="space-y-5">
//           <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
//             <FaRuler className="text-blue-500 mt-0.5 shrink-0" />
//             <p className="text-xs text-blue-700 font-medium">Physical dimensions and weight are used for logistics, shipping calculations, and warehouse management. All fields are optional.</p>
//           </div>

//           <div>
//             <p className="text-sm font-bold text-gray-700 mb-3">Dimensions</p>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//               {[
//                 { n: "length", l: "Length (cm)", ph: "0" },
//                 { n: "width",  l: "Width (cm)",  ph: "0" },
//                 { n: "height", l: "Height (cm)", ph: "0" },
//                 { n: "weight", l: "Weight (kg)", ph: "0.00", step: "0.01" },
//               ].map(f => (
//                 <div key={f.n}>
//                   <Lbl text={f.l} />
//                   <input className={fi("")} name={f.n} type="number" min="0" step={f.step || "1"} placeholder={f.ph} value={id[f.n] || ""} onChange={handleChange} />
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="border-t border-gray-100 pt-5">
//             <p className="text-sm font-bold text-gray-700 mb-3">Additional Details</p>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div>
//                 <Lbl text="Manufacturer" />
//                 <input className={fi("")} name="manufacturer" value={id.manufacturer || ""} onChange={handleChange} placeholder="e.g. Tata Steel" />
//               </div>
//               <div>
//                 <Lbl text="Expiry Date" />
//                 <input className={fi("")} name="expiryDate" type="date" value={id.expiryDate || ""} onChange={handleChange} />
//               </div>
//               <div>
//                 <Lbl text="Batch Number" />
//                 <input className={fi("")} name="batchNumber" value={id.batchNumber || ""} onChange={handleChange} placeholder="e.g. BATCH-2024-001" />
//               </div>
//             </div>

//             <div className="mt-4 flex flex-wrap gap-4">
//               <Toggle name="gnr"               checked={id.gnr}               label="GNR Applicable" />
//               <Toggle name="delivery"           checked={id.delivery}           label="Delivery Item" />
//               <Toggle name="productionProcess"  checked={id.productionProcess}  label="Production Process" />
//             </div>
//           </div>
//         </div>
//       );

//       // ── Step 6: Review ──
//       case 6: return (
//         <div className="space-y-4">
//           <p className="text-sm text-gray-500">Review all details before saving.</p>

//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBoxOpen className="text-indigo-400" /> Basic Info</p>
//             <RRow l="Code"       v={id.itemCode} />
//             <RRow l="Name"       v={id.itemName} />
//             <RRow l="Category"   v={id.category} />
//             <RRow l="Type"       v={id.itemType} />
//             <RRow l="Unit Price" v={id.unitPrice ? `₹${Number(id.unitPrice).toFixed(2)}` : ""} />
//             <RRow l="Min. Stock" v={id.quantity} />
//             <RRow l="UOM"        v={id.uom} />
//             <RRow l="Reorder Level" v={id.reorderLevel} />
//             <RRow l="Lead Time"  v={id.leadTime ? `${id.leadTime} days` : ""} />
//             <RRow l="Status"     v={id.status} />
//           </div>

//           <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//             <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax</p>
//             <RRow l="Include GST"  v={id.includeGST  ? "Yes" : "No"} />
//             <RRow l="GST Rate"     v={id.gstRate ? `${id.gstRate}%` : ""} />
//             <RRow l="Include IGST" v={id.includeIGST ? "Yes" : "No"} />
//             <RRow l="IGST Rate"    v={id.igstRate ? `${id.igstRate}%` : ""} />
//           </div>

//           {id.posEnabled && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaCashRegister className="text-orange-400" /> POS</p>
//               <RRow l="POS Price"    v={id.posConfig?.posPrice ? `₹${id.posConfig.posPrice}` : `₹${id.unitPrice} (unit price)`} />
//               <RRow l="Barcode"      v={id.posConfig?.barcode} />
//               <RRow l="Discount"     v={id.posConfig?.allowDiscount ? `Allowed (max ${id.posConfig.maxDiscountPercent}%)` : "Not allowed"} />
//               <RRow l="Taxable"      v={id.posConfig?.taxableInPOS ? "Yes" : "No"} />
//             </div>
//           )}

//           {id.includeQualityCheck && id.qualityCheckDetails?.length > 0 && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaShieldAlt className="text-emerald-400" /> Quality ({id.qualityCheckDetails.length} parameters)</p>
//               {id.qualityCheckDetails.map((q, i) => <RRow key={i} l={q.parameter || `Param ${i+1}`} v={`Min: ${q.min || "—"} · Max: ${q.max || "—"}`} />)}
//             </div>
//           )}

//           {(id.length || id.weight || id.manufacturer) && (
//             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
//               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaRuler className="text-blue-400" /> Dimensions</p>
//               {id.length && <RRow l="L × W × H" v={`${id.length} × ${id.width || 0} × ${id.height || 0} cm`} />}
//               {id.weight       && <RRow l="Weight"       v={`${id.weight} kg`} />}
//               {id.manufacturer && <RRow l="Manufacturer" v={id.manufacturer} />}
//             </div>
//           )}
//         </div>
//       );

//       default: return null;
//     }
//   };

//   // ════════════════════════════════════════
//   // ── LIST VIEW ──
//   // ════════════════════════════════════════
//   if (view === "list") return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Item Management</h1>
//             <p className="text-sm text-gray-400 mt-0.5">{items.length} total items</p>
//           </div>
//           <div className="flex flex-wrap gap-2">
//             <button onClick={downloadTemplate}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
//               <FaDownload className="text-xs" /> Template
//             </button>
//             <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
//               {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
//               <input type="file" hidden accept=".csv" onChange={handleBulk} />
//             </label>
//             <button onClick={() => { generateCode();   setView("form"); }}
//               className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               <FaPlus className="text-xs" /> Create Item
//             </button>
//           </div>
//         </div>

//         {/* Stat cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label: "Total",        value: stats.total,   emoji: "📦", filter: "All" },
//             { label: "Product",      value: stats.product, emoji: "🛍️", filter: "Product" },
//             { label: "Service",      value: stats.service, emoji: "🔧", filter: "Service" },
//             { label: "Raw Material", value: stats.rawMat,  emoji: "⚙️",  filter: "Raw Material" },
//           ].map(s => (
//             <div key={s.label} onClick={() => setFilterType(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
//                 ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Table card */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
//                 value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search items…" />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All","Product","Service","Raw Material"].map(t => (
//                 <button key={t} onClick={() => setFilterType(t)}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {t}
//                 </button>
//               ))}
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["Code","Item","Category","Type","Price","UOM","Status","POS","Actions"].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   Array(5).fill(0).map((_, i) => (
//                     <tr key={i} className="border-b border-gray-50">
//                       {Array(9).fill(0).map((__, j) => (
//                         <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" /></td>
//                       ))}
//                     </tr>
//                   ))
//                 ) : filtered.length === 0 ? (
//                   <tr><td colSpan={9} className="text-center py-16">
//                     <div className="text-4xl mb-2 opacity-20">📦</div>
//                     <p className="text-sm font-medium text-gray-300">No items found</p>
//                   </td></tr>
//                 ) : filtered.map(it => (
//                   <tr key={it._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
//                     <td className="px-4 py-3">
//                       <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{it.itemCode}</span>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="font-semibold text-gray-900 text-sm leading-tight">{it.itemName}</p>
//                       {it.manufacturer && <p className="text-xs text-gray-400">{it.manufacturer}</p>}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-gray-500 font-medium">{it.category || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
//                         ${it.itemType === "Product"      ? "bg-blue-50 text-blue-600"
//                           : it.itemType === "Service"    ? "bg-purple-50 text-purple-600"
//                           : it.itemType === "Raw Material" ? "bg-amber-50 text-amber-600"
//                           : "bg-gray-100 text-gray-500"}`}>
//                         {it.itemType || "—"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3 font-mono text-sm font-bold text-gray-700">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
//                     <td className="px-4 py-3 text-xs text-gray-500">{it.uom || <span className="text-gray-200">—</span>}</td>
//                     <td className="px-4 py-3">
//                       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${it.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
//                         {it.status}
//                       </span>
//                     </td>
//                     <td className="px-4 py-3">
//                       {it.posEnabled
//                         ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">POS</span>
//                         : <span className="text-gray-200 text-xs">—</span>}
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex gap-1.5">
//                         <button onClick={() => handleEdit(it)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaEdit className="text-xs" />
//                         </button>
//                         <button onClick={() => handleDelete(it._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
//                           <FaTrash className="text-xs" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );

//   // ════════════════════════════════════════
//   // ── FORM VIEW ──
//   // ════════════════════════════════════════
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

//         <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
//           <FaArrowLeft className="text-xs" /> Back to Items
//         </button>

//         <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
//           {id._id ? "Edit Item" : "New Item"}
//         </h2>
//         <p className="text-sm text-gray-400 mb-6">
//           Step {step} of {STEPS.length} — <span className="font-semibold text-gray-600">{STEPS[step - 1].label}</span>
//         </p>

//         {/* Stepper */}
//         <div className="flex items-start mb-7">
//           {STEPS.map((s, i) => {
//             const Icon  = s.icon;
//             const done   = step > s.id;
//             const active = step === s.id;
//             return (
//               <React.Fragment key={s.id}>
//                 <div className="flex flex-col items-center shrink-0">
//                   <button type="button" onClick={() => done && setStep(s.id)}
//                     className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
//                       ${done   ? "bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
//                         : active ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
//                         : "bg-white border-gray-200 text-gray-300 cursor-default"}`}>
//                     {done ? <FaCheck style={{ fontSize: 12 }} /> : <Icon style={{ fontSize: 12 }} />}
//                   </button>
//                   <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 whitespace-nowrap hidden sm:block
//                     ${done ? "text-emerald-500" : active ? "text-indigo-600" : "text-gray-300"}`}>
//                     {s.label}
//                   </span>
//                 </div>
//                 {i < STEPS.length - 1 && (
//                   <div className={`flex-1 h-0.5 mt-[18px] mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
//                 )}
//               </React.Fragment>
//             );
//           })}
//         </div>

//         {/* Card */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">
//           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
//             <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
//               {React.createElement(STEPS[step - 1].icon, { className: "text-base" })}
//             </div>
//             <div>
//               <h3 className="text-base font-bold text-gray-900">{STEPS[step - 1].label}</h3>
//               <p className="text-xs text-gray-400">Fill in the details below</p>
//             </div>
//             <span className="ml-auto text-xs font-bold text-gray-300 font-mono">{step}/{STEPS.length}</span>
//           </div>

//           {renderStep()}
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between">
//           <button type="button" onClick={step > 1 ? goPrev : reset}
//             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
//             <FaChevronLeft className="text-xs" /> {step > 1 ? "Previous" : "Cancel"}
//           </button>

//           <span className="text-xs font-bold text-gray-300 font-mono">{step} / {STEPS.length}</span>

//           {step < STEPS.length ? (
//             <button type="button" onClick={goNext}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//               Next <FaChevronRight className="text-xs" />
//             </button>
//           ) : (
//             <button type="button" onClick={handleSubmit} disabled={submitting}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
//               {submitting
//                 ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
//                 : <><FaCheck className="text-xs" /> {id._id ? "Update Item" : "Create Item"}</>}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


