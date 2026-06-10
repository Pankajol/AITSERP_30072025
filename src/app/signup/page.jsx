"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";

// ============================================================
// Theme Definitions – Unique Backgrounds (non‑linear)
// ============================================================
const THEMES = {
  erp: {
    name: "ERP Management",
    icon: "🏭",
    accent: "#105B92",
    logo: "E",
    tagline: "Enterprise Resource Planning",
    background: "radial-gradient(circle at 30% 40%, #0a2f4d, #041e30), repeating-radial-gradient(circle at 20% 30%, rgba(0,255,255,0.08) 0px, rgba(0,255,255,0.08) 2px, transparent 2px, transparent 12px)",
    features: ["Inventory", "Finance", "Sales"],
    fields: [
      { name: "erpModules", label: "Primary ERP Modules", type: "text", required: true },
      { name: "employeeCount", label: "Approx. Employees", type: "number", required: true },
    ],
  },
  society: {
    name: "Society Management",
    icon: "🏘️",
    accent: "#2d6a4f",
    logo: "S",
    tagline: "Cooperative Housing Society",
    background: "conic-gradient(from 90deg at 50% 50%, #1e3a2f, #0f2a20, #1e3a2f), repeating-linear-gradient(45deg, #d4a37320 0px, #d4a37320 1px, transparent 1px, transparent 20px)",
    features: ["Residents", "Guards", "Maintenance"],
    fields: [
      { name: "societyRegNo", label: "Society Registration No.", type: "text", required: true },
      { name: "totalFlats", label: "Total Flats / Units", type: "number", required: true },
      { name: "committeeName", label: "Committee / Association Name", type: "text", required: false },
    ],
  },
  healthcare: {
    name: "Healthcare Management",
    icon: "🏥",
    accent: "#9d4edd",
    logo: "H",
    tagline: "Hospital & Clinic Management",
    background: "radial-gradient(ellipse at 80% 20%, #4a1d3d, #2a0f2a), repeating-linear-gradient(90deg, #ff99cc10 0px, #ff99cc10 2px, transparent 2px, transparent 20px)",
    features: ["Patients", "Appointments", "Billing"],
    fields: [
      { name: "licenseNumber", label: "Medical License No.", type: "text", required: true },
      { name: "facilityType", label: "Facility Type", type: "text", required: true },
      { name: "bedCapacity", label: "Bed / Chair Capacity", type: "number", required: false },
    ],
  },
  education: {
    name: "Education Management",
    icon: "📚",
    accent: "#3498db",
    logo: "E",
    tagline: "School / College ERP",
    background: "radial-gradient(circle at 70% 10%, #1a2a3a, #0e1a26), repeating-linear-gradient(0deg, #ffffff08 0px, #ffffff08 1px, transparent 1px, transparent 25px)",
    features: ["Students", "Fees", "Academics"],
    fields: [
      { name: "institutionCode", label: "Institution Code", type: "text", required: true },
      { name: "boardOrUniversity", label: "Board / University", type: "text", required: true },
      { name: "studentCapacity", label: "Student Capacity", type: "number", required: false },
    ],
  },
  retail: {
    name: "Retail Management",
    icon: "🛒",
    accent: "#f59e0b",
    logo: "R",
    tagline: "POS & Inventory",
    background: "conic-gradient(from 45deg at 30% 70%, #5e2a0c, #3e1e08, #5e2a0c), repeating-radial-gradient(circle at 80% 20%, #ffaa3320 0px, #ffaa3320 3px, transparent 3px, transparent 15px)",
    features: ["POS", "Stock", "Customers"],
    fields: [
      { name: "storePan", label: "Store PAN / TIN", type: "text", required: false },
      { name: "outletCount", label: "Number of Outlets", type: "number", required: true },
      { name: "primaryCategory", label: "Primary Product Category", type: "text", required: true },
    ],
  },
  election: {
    name: "Election Management",
    icon: "🗳️",
    accent: "#d97706",
    logo: "E",
    tagline: "Campaigns, Voters & Booth Operations",
    background: "radial-gradient(circle at 75% 15%, #4c1d1d, #111827), repeating-linear-gradient(135deg, #ffffff10 0px, #ffffff10 1px, transparent 1px, transparent 18px)",
    features: ["Voters", "Booths", "Surveys"],
    fields: [
      { name: "constituencyName", label: "Constituency / Ward", type: "text", required: true },
      { name: "electionType", label: "Election Type", type: "text", required: true },
      { name: "electionDate", label: "Election Date", type: "date", required: false },
      { name: "boothCount", label: "Approx. Booth Count", type: "number", required: true },
    ],
  },
};

const BUNDLES = [
  { id: "starter", name: "Standard", price: 1, features: ["Sales Order", "Sales Invoice", "5 Users", "Inventory View"] },
  { id: "growth", name: "Growth", price: 99, features: ["All Modules", "Priority Support", "API Access", "Unlimited Users"], popular: true },
];
const BUSINESS_TYPES = ["Pvt Ltd", "LLP", "Partnership", "Sole Proprietorship"];
const INDUSTRIES = ["Manufacturing", "IT / Software", "Retail", "Healthcare", "Education", "Real Estate / Society", "Political / Election", "Other"];
const STEPS = ["Identity", "Business", "Location", "Plan", "Security", "Payment", "Done"];

// PAYMENT_METHODS – includes both RAZORPAY and QR CODE
const PAYMENT_METHODS = [
  { id: "upi", icon: "📱", title: "UPI Payment", sub: "GPay · PhonePe · Paytm · BHIM", badge: "Instant", badgeColor: "#4ade80" },
  { id: "card", icon: "💳", title: "Debit / Credit Card", sub: "Visa · Mastercard · RuPay", badge: null, badgeColor: null },
  { id: "netbanking", icon: "🏦", title: "Net Banking", sub: "All major banks supported", badge: null, badgeColor: null },
  { id: "razorpay", icon: "💰", title: "Razorpay", sub: "Cards · UPI · Netbanking · Wallets", badge: "Secure", badgeColor: "#0d9488" },
  { id: "qr", icon: "📱", title: "QR Code Payment", sub: "Scan & Pay – UPI / Cards", badge: "Scan", badgeColor: "#e11d48" },
  { id: "cash", icon: "💵", title: "Cash Payment", sub: "Pay at our nearest office", badge: "Offline", badgeColor: "#fb923c" },
  { id: "paylater", icon: "🕐", title: "Pay Later", sub: "Invoice sent · Pay within 30 days", badge: "Net-30", badgeColor: "#a855f7" },
  { id: "trial", icon: "🎁", title: "1 Week Free Trial", sub: "Full access · No card required", badge: "FREE", badgeColor: "#00f5ff" },
];

async function callClaude(messages, systemPrompt = "") {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
    });
    const data = await res.json();
    if (data.error && (data.error === "CREDIT_EXHAUSTED" || data.error.toLowerCase().includes("credit") || res.status === 402)) {
      console.warn("Anthropic credits exhausted — skipping AI step");
      return "__SKIP__";
    }
    if (data.error) throw new Error(data.error);
    return data.content?.map(b => b.text || "").join("") || "";
  } catch (err) {
    console.warn("Claude call failed, skipping:", err.message);
    return "__SKIP__";
  }
}

// ============================================================
// UI Components (Glassmorphic)
// ============================================================
function GlassInput({ label, name, value, onChange, type = "text", error, multiline, showToggle = false, visible = false, onToggle }) {
  const [focused, setFocused] = useState(false);
  const active = focused || (value && value.length > 0);
  const borderColor = error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.3)";
  const inputType = showToggle ? (visible ? "text" : "password") : type;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: "relative", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: 14, border: `1px solid ${borderColor}`, transition: "all 0.2s", overflow: "hidden" }}>
        <label style={{ position: "absolute", left: 16, top: active ? 8 : "50%", transform: active ? "none" : "translateY(-50%)", fontSize: active ? 10 : 13, fontWeight: 500, color: error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.6)", transition: "all 0.2s", pointerEvents: "none" }}>{label}</label>
        {multiline ? (
          <textarea name={name} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} rows={2} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", fontSize: 14, padding: "28px 16px 12px", resize: "none" }} />
        ) : (
          <input name={name} type={inputType} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", fontSize: 14, padding: showToggle ? "28px 48px 12px 16px" : "28px 16px 12px" }} />
        )}
        {showToggle && !multiline && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,0.65)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}
          >
            {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>⚠ {error}</p>}
    </div>
  );
}

function GlassSelect({ label, name, value, onChange, options, error }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.3)";
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: "relative", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: 14, border: `1px solid ${borderColor}`, transition: "all 0.2s" }}>
        <label style={{ position: "absolute", left: 16, top: value ? 8 : "50%", transform: value ? "none" : "translateY(-50%)", fontSize: value ? 10 : 13, fontWeight: 500, color: focused ? "#ffffff" : "rgba(255,255,255,0.6)", transition: "all 0.2s", pointerEvents: "none" }}>{label}</label>
        <select name={name} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: value ? "white" : "rgba(255,255,255,0.7)", fontSize: 14, padding: value ? "28px 16px 12px" : "20px 16px", cursor: "pointer", appearance: "none" }}>
          <option value="" style={{ background: "#105B92" }}>Select...</option>
          {options.map(o => <option key={o} value={o} style={{ background: "#105B92" }}>{o}</option>)}
        </select>
        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)", pointerEvents: "none" }}>⌵</div>
      </div>
      {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>⚠ {error}</p>}
    </div>
  );
}

function GradientButton({ label, onClick, loading, fullWidth = false, icon = null, accent }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: fullWidth ? "100%" : "auto",
      padding: "14px 28px",
      background: loading ? "rgba(255,255,255,0.2)" : `linear-gradient(135deg, #ffffff, ${accent}20)`,
      border: "none",
      borderRadius: 40,
      color: loading ? "rgba(255,255,255,0.5)" : accent,
      fontWeight: 700,
      fontSize: 13,
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow: loading ? "none" : "0 8px 20px rgba(0,0,0,0.15)",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    }}>
      {loading ? <><span style={{ animation: "spin 1s linear infinite" }}>◌</span>PROCESSING</> : <>{icon}{label}</>}
    </button>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function PankajalRegistration() {
  const router = useRouter();
  const [themeId, setThemeId] = useState("erp");
  const theme = THEMES[themeId];
  const [step, setStep] = useState(-1);
  const [activeBundle, setActiveBundle] = useState("growth");
  const [paymentView, setPaymentView] = useState("methods");
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [redirectTimer, setRedirectTimer] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPwd: false,
  });
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "", businessType: "", industry: "", gstNumber: "",
    country: "", address: "", pinCode: "", password: "", confirmPwd: "", agreeToTerms: false,
    upi: "", cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "",
    erpModules: "", employeeCount: "",
    societyRegNo: "", totalFlats: "", committeeName: "",
    licenseNumber: "", facilityType: "", bedCapacity: "",
    institutionCode: "", boardOrUniversity: "", studentCapacity: "",
    storePan: "", outletCount: "", primaryCategory: "",
    constituencyName: "", electionType: "", electionDate: "", boothCount: "",
  });

  const price = useMemo(() => BUNDLES.find(b => b.id === activeBundle), [activeBundle]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);

  const handleChange = (e) => {
    const n = e.target.name, v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [n]: v }));
    if (errors[n]) setErrors(p => ({ ...p, [n]: null }));
  };

  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Validators
  const validatePhone = (phone) => {
    if (!phone.trim()) return "Required";
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 5 || digits.length > 15) return "Invalid phone length";
    return null;
  };
  const validatePin = (pin, country) => {
    if (!pin.trim()) return "Required";
    if (country === "India" && !/^\d{6}$/.test(pin)) return "6 digits required";
    if (country === "United States" && !/^\d{5}(-\d{4})?$/.test(pin)) return "ZIP: 5 digits or 5+4";
    if (country === "United Kingdom" && !/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(pin)) return "Invalid UK postcode";
    return null;
  };
  const validateGST = (gst, country) => {
    if (country !== "India") return null;
    if (!gst.trim()) return null;
    if (!/^[0-9A-Z]{15}$/.test(gst.toUpperCase())) return "Must be 15 alphanumeric";
    return null;
  };

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.companyName.trim()) e.companyName = "Required";
      if (!form.contactName.trim()) e.contactName = "Required";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
      const phoneErr = validatePhone(form.phone);
      if (phoneErr) e.phone = phoneErr;
      for (let f of theme.fields) {
        if (f.required && !form[f.name]?.trim()) e[f.name] = `${f.label} required`;
        if (f.required && f.type === "number" && Number(form[f.name]) <= 0) e[f.name] = `${f.label} must be greater than 0`;
      }
    }
    if (step === 1) {
      if (!form.businessType) e.businessType = "Select type";
      if (!form.industry) e.industry = "Select industry";
      const gstErr = validateGST(form.gstNumber, form.country);
      if (gstErr) e.gstNumber = gstErr;
    }
    if (step === 2) {
      if (!form.country) e.country = "Select country";
      if (form.address.length < 5) e.address = "Too short";
      const pinErr = validatePin(form.pinCode, form.country);
      if (pinErr) e.pinCode = pinErr;
    }
    if (step === 4) {
      if (form.password.length < 8) e.password = "Min 8 chars";
      if (form.password !== form.confirmPwd) e.confirmPwd = "No match";
      if (!form.agreeToTerms) e.agreeToTerms = "Accept terms";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => {
    setErrors({});
    if (step === 5 && paymentView !== "methods") {
      if (paymentView === "qr") setQrConfirmed(false);
      setPaymentView("methods");
      return;
    }
    setStep(s => s - 1);
  };

  // Main registration submit (called after any payment confirmation)
  const handleSubmit = async (paymentType) => {
    setProcessing(true);
    setSubmitting(true);
    setErrors({});
    try {
      const validationRaw = await callClaude([{ role: "user", content: `Validate registration. Respond JSON: {"valid":true,"issues":[]}. Data: ${form.companyName}, ${form.email}, ${form.phone}` }]);
      if (validationRaw !== "__SKIP__") {
        let aiResult = { valid: true };
        try {
          const jsonMatch = validationRaw.match(/```(?:json)?\n([\s\S]*?)\n```/);
          const clean = jsonMatch ? jsonMatch[1] : validationRaw;
          aiResult = JSON.parse(clean.trim());
        } catch { }
        if (!aiResult.valid) {
          setErrors({ general: "AI: " + (aiResult.issues?.join(", ") || "Invalid details") });
          setProcessing(false);
          setSubmitting(false);
          return;
        }
      }

      const themeDetails = Object.fromEntries(
        theme.fields
          .map((field) => [field.name, form[field.name]])
          .filter(([, value]) => value?.toString().trim())
      );

      const payload = {
        companyName: form.companyName, contactName: form.contactName, email: form.email,
        phone: form.phone, country: form.country, address: form.address, pinCode: form.pinCode,
        password: form.password, agreeToTerms: form.agreeToTerms,
        ...(form.gstNumber.trim() && { gstNumber: form.gstNumber.toUpperCase() }),
        businessType: form.businessType, industry: form.industry, plan: activeBundle,
        paymentMethod: paymentType, managementType: themeId,
        ...themeDetails,
      };

      const res = await fetch("/api/company/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Registration failed");

      const payLabel = { upi: "UPI", card: "card", netbanking: "netbanking", razorpay: "Razorpay", qr: "QR Code", cash: "cash", paylater: "Pay Later", trial: "Trial" }[paymentType];
      const welcomeRaw = await callClaude([{ role: "user", content: `Welcome 2 sentences for ${form.companyName} (${form.industry}) ${theme.name} plan via ${payLabel}. No quotes.` }]);
      setWelcomeMsg(welcomeRaw === "__SKIP__" || !welcomeRaw ? `Welcome ${form.companyName}! Your ${theme.name} plan is active.` : welcomeRaw);

      setStep(6);
      setProcessing(false);
      setSubmitting(false);
      const timer = setTimeout(() => router.push("/signin"), 4000);
      setRedirectTimer(timer);
    } catch (err) {
      setErrors({ general: err.message });
      setProcessing(false);
      setSubmitting(false);
    }
  };

  // Razorpay specific handler
  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      setErrors({ general: "Razorpay SDK not loaded. Please refresh." });
      return;
    }
    setProcessing(true);
    setSubmitting(true);
    setErrors({});
    try {
      const orderRes = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.price, currency: "INR", receipt: `receipt_${Date.now()}` }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed");

      const options = {
        key: process.env.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: theme.name,
        description: `Registration for ${form.companyName}`,
        order_id: orderData.id,
        prefill: { name: form.contactName, email: form.email, contact: form.phone },
        theme: { color: theme.accent },
        handler: async (response) => {
          const verifyRes = await fetch("/api/verify-razorpay-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) throw new Error("Payment verification failed");
          await handleSubmit("razorpay");
        },
        modal: { ondismiss: () => { setProcessing(false); setSubmitting(false); setErrors({ general: "Payment cancelled." }); } },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setErrors({ general: err.message });
      setProcessing(false);
      setSubmitting(false);
    }
  };

  // QR Code confirmation
  const handleQRConfirm = () => {
    if (!qrConfirmed) {
      setErrors({ general: "Please confirm that you have scanned and paid." });
      return;
    }
    handleSubmit("qr");
  };

  useEffect(() => {
    return () => { if (redirectTimer) clearTimeout(redirectTimer); };
  }, [redirectTimer]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    const map = [
      { score: 0, label: "Very Weak", color: "#f87171" },
      { score: 1, label: "Weak", color: "#fb923c" },
      { score: 2, label: "Fair", color: "#facc15" },
      { score: 3, label: "Good", color: "#a3e635" },
      { score: 4, label: "Strong", color: "#4ade80" },
      { score: 5, label: "Very Strong", color: "#22c55e" }
    ];
    return map[Math.min(5, Math.floor(score))];
  };

  const BackBtn = () => (
    <button onClick={() => { setPaymentView("methods"); setQrConfirmed(false); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>
      ← Back to methods
    </button>
  );

  const renderPaymentDetail = () => {
    switch (paymentView) {
      case "upi":
        return (
          <div>
            <BackBtn />
            <GlassInput label="UPI ID" name="upi" value={form.upi} onChange={handleChange} />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>e.g. name@okaxis</p>
            <GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} VIA UPI`} onClick={() => handleSubmit("upi")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "card":
        return (
          <div>
            <BackBtn />
            <GlassInput label="Card Number" name="cardNumber" value={form.cardNumber} onChange={handleChange} />
            <GlassInput label="Name on Card" name="cardName" value={form.cardName} onChange={handleChange} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><GlassInput label="Expiry MM/YY" name="cardExpiry" value={form.cardExpiry} onChange={handleChange} /></div>
              <div style={{ flex: 1 }}><GlassInput label="CVV" name="cardCvv" value={form.cardCvv} onChange={handleChange} type="password" /></div>
            </div>
            <GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} SECURELY`} onClick={() => handleSubmit("card")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "netbanking":
        return (
          <div>
            <BackBtn />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB"].map(bank => (
                <button key={bank} style={{ padding: "12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {bank}
                </button>
              ))}
            </div>
            <GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} VIA NET BANKING`} onClick={() => handleSubmit("netbanking")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "razorpay":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: `rgba(13,148,136,0.1)`, border: `1px solid ${theme.accent}40`, borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: theme.accent, fontWeight: 700, marginBottom: 10 }}>💰 Pay with Razorpay</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Cards • UPI • Netbanking • Wallets</div>
            </div>
            <GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} VIA RAZORPAY`} onClick={handleRazorpayPayment} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "qr":
        return (
          <div>
            <BackBtn />
            <div style={{ textAlign: "center", padding: "16px", background: "rgba(225,29,72,0.1)", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#e11d48", fontWeight: 700, marginBottom: 10 }}>📱 Scan QR Code to Pay</div>
              {/* Replace with your actual QR code image URL */}
              <img src="/qr-code.png" alt="Payment QR Code" style={{ width: 200, height: 200, margin: "0 auto", borderRadius: 12 }} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 12 }}>Amount: ₹{price?.price?.toLocaleString('en-IN') ?? "0"}</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "white" }}>
              <input type="checkbox" checked={qrConfirmed} onChange={(e) => setQrConfirmed(e.target.checked)} /> I have made the payment via QR code
            </label>
            <GradientButton label="CONFIRM PAYMENT" onClick={handleQRConfirm} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "cash":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "rgba(251,146,60,0.15)", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#fb923c", fontWeight: 700 }}>💵 Pay at office within 7 days</div>
            </div>
            <GradientButton label="CONFIRM CASH" onClick={() => handleSubmit("cash")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "paylater":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "rgba(168,85,247,0.15)", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#a855f7", fontWeight: 700 }}>Invoice sent – due in 30 days</div>
            </div>
            <GradientButton label="CONFIRM PAY LATER" onClick={() => handleSubmit("paylater")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      case "trial":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "rgba(0,245,255,0.1)", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#00f5ff", fontWeight: 700 }}>🎁 7‑day free trial – no card needed</div>
            </div>
            <GradientButton label="START FREE TRIAL" onClick={() => handleSubmit("trial")} loading={submitting} fullWidth accent={theme.accent} />
          </div>
        );
      default:
        return null;
    }
  };

  // Theme Selection Screen
  if (step === -1) {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 20% 30%, #0a0f1a, #03060c)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", maxWidth: 1200 }}>
          <div style={{ fontSize: 48, fontWeight: 800, background: "linear-gradient(135deg, #fff, #88aaff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 12 }}>Pankajal</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", marginBottom: 48 }}>CHOOSE YOUR MANAGEMENT SOLUTION</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24 }}>
            {Object.entries(THEMES).map(([id, t]) => (
              <div key={id} onClick={() => { setThemeId(id); setStep(0); }} style={{
                width: 200, padding: 24, background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", borderRadius: 32, border: `1px solid ${t.accent}80`, cursor: "pointer", transition: "0.3s", textAlign: "center"
              }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-8px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                <div style={{ fontSize: 48 }}>{t.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "white", margin: "12px 0 8px" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{t.tagline}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
                  {t.features?.map((feature) => (
                    <span key={feature} style={{ fontSize: 9, color: "white", background: `${t.accent}55`, border: `1px solid ${t.accent}80`, borderRadius: 20, padding: "4px 8px" }}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div style={{ minHeight: "100vh", background: theme.background, backgroundBlendMode: "overlay", display: "flex", alignItems: "center", justifyContent: "center", padding: "110px 20px 40px", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes countdown{from{width:100%}to{width:0%}}
        .glass-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:32px;box-shadow:0 25px 45px -12px rgba(0,0,0,0.25);}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.1) inset!important;-webkit-text-fill-color:white!important;}
      `}</style>

      {/* Top Bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, background: theme.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, color: "white", fontWeight: "bold" }}>{theme.logo}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "0.15em" }}>{theme.name.toUpperCase()}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{theme.tagline}</div>
          </div>
        </div>
        <button onClick={() => { setStep(-1); setForm((prev) => Object.fromEntries(Object.keys(prev).map((key) => [key, key === "agreeToTerms" ? false : ""]))); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 30, padding: "6px 12px", color: "white", fontSize: 11, cursor: "pointer" }}>← Change Theme</button>
      </div>

      {/* Form Card */}
      <div style={{ width: "100%", maxWidth: 550, margin: "0 auto" }}>
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "28px 32px 0" }}>
            {step < 6 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
                {STEPS.slice(0, -1).map((_, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      background: i < step ? "white" : i === step ? `rgba(255,255,255,0.2)` : "transparent",
                      border: i === step ? `1px solid white` : i < step ? "none" : "1px solid rgba(255,255,255,0.3)",
                      color: i <= step ? theme.accent : "rgba(255,255,255,0.5)",
                      boxShadow: i === step ? `0 0 12px ${theme.accent}` : "none"
                    }}>{i < step ? "✓" : i + 1}</div>
                    {i < STEPS.length - 2 && <div style={{ flex: 1, height: 1, margin: "0 8px", background: "rgba(255,255,255,0.2)" }}>
                      <div style={{ height: "100%", background: theme.accent, width: i < step ? "100%" : "0%", transition: "width 0.4s" }} />
                    </div>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.2em", marginBottom: 6 }}>{step < 6 ? `STEP ${step + 1} / 6` : "COMPLETE"}</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", marginBottom: 8 }}>
              {["Company Identity", "Business Profile", "Office Address", "Choose Plan", "Set Password", "Complete Payment", "You're Live"][step]}
            </h1>
            {step >= 3 && step < 6 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 8px", padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1 }}>{price?.name} Plan</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "white" }}>₹{price?.price?.toLocaleString('en-IN') ?? "0"}</span>
              </div>
            )}
          </div>
          <div style={{ padding: "20px 32px 32px" }}>
            {errors.general && <div style={{ marginBottom: 20, padding: 12, background: "rgba(248,113,113,0.15)", borderRadius: 16, fontSize: 12, color: "#f87171" }}>⚠ {errors.general}</div>}

            {step === 0 && (
              <>
                <GlassInput label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} />
                <GlassInput label="Contact Person" name="contactName" value={form.contactName} onChange={handleChange} error={errors.contactName} />
                <GlassInput label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} type="email" />
                <GlassInput label="Phone (international)" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} type="tel" />
                {theme.fields.map(f => <GlassInput key={f.name} label={f.label} name={f.name} value={form[f.name]} onChange={handleChange} error={errors[f.name]} type={f.type || "text"} />)}
              </>
            )}

            {step === 1 && (
              <>
                <GlassSelect label="Business Type" name="businessType" value={form.businessType} onChange={handleChange} options={BUSINESS_TYPES} error={errors.businessType} />
                <GlassSelect label="Industry" name="industry" value={form.industry} onChange={handleChange} options={INDUSTRIES} error={errors.industry} />
                <GlassInput label="GST Number (optional)" name="gstNumber" value={form.gstNumber} onChange={handleChange} error={errors.gstNumber} />
                {form.country === "India" && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: -8 }}>15-character GST</p>}
              </>
            )}

            {step === 2 && (
              <>
                <GlassSelect label="Country" name="country" value={form.country} onChange={handleChange} options={["India", "United States", "United Kingdom", "UAE", "Singapore", "Australia", "Canada", "Germany", "Other"]} error={errors.country} />
                <GlassInput label="Address" name="address" value={form.address} onChange={handleChange} error={errors.address} multiline />
                <GlassInput label="Postal / ZIP Code" name="pinCode" value={form.pinCode} onChange={handleChange} error={errors.pinCode} />
              </>
            )}

            {step === 3 && (
              <div>
                {BUNDLES.map(b => {
                  const sel = activeBundle === b.id;
                  return (
                    <div key={b.id} onClick={() => setActiveBundle(b.id)} style={{
                      position: "relative", padding: "20px 24px", borderRadius: 24, marginBottom: 16, cursor: "pointer",
                      border: sel ? `2px solid ${theme.accent}` : "1px solid rgba(255,255,255,0.2)",
                      background: sel ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                    }}>
                      {b.popular && <div style={{ position: "absolute", top: -10, right: 20, background: theme.accent, color: "white", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: 30 }}>RECOMMENDED</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                        <div><div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{b.name}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{b.id === "starter" ? "Core" : "Full suite"}</div></div>
                        <div><div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>₹{b.price.toLocaleString('en-IN')}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>/ year</div></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {b.features.map(f => <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? theme.accent : "rgba(255,255,255,0.4)" }} /><span style={{ fontSize: 11, color: sel ? "white" : "rgba(255,255,255,0.6)" }}>{f}</span></div>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <>
                <GlassInput label="Password" name="password" value={form.password} onChange={handleChange} error={errors.password} type="password" showToggle visible={showPassword.password} onToggle={() => togglePassword("password")} />
                {form.password && (() => {
                  const s = getPasswordStrength(form.password);
                  return <div style={{ marginBottom: 20 }}><div style={{ display: "flex", gap: 4, marginBottom: 8 }}>{[0,1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, background: i < s.score ? s.color : "rgba(255,255,255,0.2)" }} />)}</div><div style={{ fontSize: 10, color: s.color }}>{s.label}</div></div>;
                })()}
                <GlassInput label="Confirm Password" name="confirmPwd" value={form.confirmPwd} onChange={handleChange} error={errors.confirmPwd} type="password" showToggle visible={showPassword.confirmPwd} onToggle={() => togglePassword("confirmPwd")} />
                <div onClick={() => setForm(p => ({ ...p, agreeToTerms: !p.agreeToTerms }))} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", marginTop: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 8, background: form.agreeToTerms ? theme.accent : "transparent", border: `1px solid ${form.agreeToTerms ? "transparent" : "rgba(255,255,255,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>{form.agreeToTerms && "✓"}</div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>I accept the <span style={{ color: "white" }}>Terms</span></span>
                </div>
                {errors.agreeToTerms && <p style={{ fontSize: 11, color: "#f87171", marginTop: 8 }}>⚠ {errors.agreeToTerms}</p>}
              </>
            )}

            {step === 5 && (
              <div>
                {paymentView === "methods" ? (
                  <>
                    <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.1)", borderRadius: 20, marginBottom: 20, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>🔐 256-bit SSL Encrypted</div>
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setPaymentView(m.id)} style={{
                        width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 20, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left", marginBottom: 12,
                      }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                        <div style={{ fontSize: 22 }}>{m.icon}</div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontWeight: 700, color: "white" }}>{m.title} {m.badge && <span style={{ fontSize: 9, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 20, marginLeft: 8, color: m.badgeColor }}>{m.badge}</span>}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{m.sub}</div>
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
                      </button>
                    ))}
                    <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>⚠️ Demo mode – no real payment will be processed.</div>
                  </>
                ) : (
                  renderPaymentDetail()
                )}
              </div>
            )}

            {step === 6 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, margin: "0 auto 20px", border: `2px solid ${theme.accent}` }}>🎉</div>
                <h2 style={{ fontSize: 26, color: "white", marginBottom: 12 }}>Registered!</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{welcomeMsg || "Your account is ready."}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Redirecting to sign in in 4s...</p>
                <div style={{ height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden", marginBottom: 24 }}><div style={{ height: "100%", background: theme.accent, width: "100%", animation: "countdown 4s linear forwards" }} /></div>
                <GradientButton label="GO TO SIGN IN →" onClick={() => router.push("/signin")} fullWidth accent={theme.accent} />
              </div>
            )}

            {step < 6 && !(step === 5 && paymentView !== "methods") && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <button disabled={step === 0} onClick={back} style={{ background: "none", border: "none", color: step === 0 ? "transparent" : "rgba(255,255,255,0.6)", cursor: step === 0 ? "default" : "pointer", fontSize: 12 }}>← Back</button>
                <GradientButton label={step === 4 ? "Review & Pay →" : step === 3 ? "Confirm Plan →" : "Continue →"} onClick={next} icon={step !== 4 ? "→" : null} accent={theme.accent} />
              </div>
            )}
          </div>
        </div>
        {step < 6 && <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>Protected by Pankajal Security</p>}
      </div>

      {processing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ width: 60, height: 60, border: `3px solid ${theme.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
          <div style={{ color: "white", fontSize: 13 }}>Processing...</div>
        </div>
      )}
    </div>
  );
}



// "use client";
// import { useEffect, useRef, useState, useMemo, useCallback } from "react";
// import { useRouter } from "next/navigation";

// // ============================================================
// // Constants & Helpers (unchanged)
// // ============================================================
// const LAND_DOTS = [
//   [49,-125],[50,-120],[49,-115],[48,-110],[47,-120],[46,-124],[44,-124],[42,-124],[40,-124],[38,-122],[37,-122],[36,-121],[35,-120],
//   [47,-113],[45,-110],[43,-108],[42,-105],[40,-105],[38,-105],[36,-106],[34,-106],[32,-107],[30,-104],[29,-103],[28,-100],[27,-98],
//   [45,-93],[44,-88],[43,-83],[42,-83],[41,-82],[40,-82],[39,-84],[38,-85],[37,-86],[36,-87],[35,-87],[34,-86],[33,-85],[32,-84],[31,-83],
//   [47,-70],[46,-72],[45,-74],[44,-76],[43,-79],[42,-80],[41,-81],[40,-80],[39,-77],[38,-77],[37,-77],[36,-76],[35,-76],[34,-77],[33,-78],[32,-80],
//   [60,25],[59,24],[58,22],[57,21],[56,20],[55,18],[54,18],[53,19],[52,20],[51,20],[50,19],[49,18],[48,17],[47,16],[46,15],[45,14],
//   [55,38],[56,40],[57,42],[58,44],[59,46],[60,48],[61,50],[62,52],[63,54],[64,56],[65,58],[64,60],[63,62],[62,64],[61,66],[60,68],
//   [44,100],[43,102],[42,104],[41,106],[40,108],[39,110],[38,112],[37,114],[36,116],[35,118],[34,120],[33,120],[32,118],[31,120],[30,120],
//   [37,10],[36,10],[35,10],[34,10],[33,12],[32,14],[31,16],[30,18],[29,20],[28,22],[27,24],[26,26],[25,28],[24,30],[23,32],[22,34],
//   [-38,140],[-36,140],[-34,138],[-32,136],[-30,136],[-28,132],[-26,132],[-24,132],[-22,132],[-20,128],[-18,126],
// ];

// const CITIES = [
//   { name:"Mumbai",    lat:19,  lon:72   },
//   { name:"London",   lat:51,  lon:0    },
//   { name:"New York", lat:40,  lon:-74  },
//   { name:"Tokyo",    lat:35,  lon:139  },
//   { name:"Sydney",   lat:-33, lon:151  },
//   { name:"Dubai",    lat:25,  lon:55   },
//   { name:"Sao Paulo",lat:-23, lon:-46  },
//   { name:"Singapore",lat:1,   lon:103  },
//   { name:"Frankfurt",lat:50,  lon:8    },
//   { name:"Toronto",  lat:43,  lon:-79  },
//   { name:"Nairobi",  lat:-1,  lon:36   },
//   { name:"Seoul",    lat:37,  lon:127  },
// ];
// const CONNECTIONS = [[0,5],[0,1],[1,8],[1,2],[2,9],[0,7],[7,3],[3,11],[5,1],[5,7],[1,10],[2,6],[6,1],[4,7],[4,1],[0,3],[2,5]];

// function project(lat, lon, W, H, rotX = 0, rotY = 0) {
//   let x = ((lon + 180) / 360) * W;
//   let y = (90 - lat) / 180 * H;
//   const radX = rotX * Math.PI / 180;
//   const radY = rotY * Math.PI / 180;
//   const cx = W/2, cy = H/2;
//   let dx = x - cx, dy = y - cy;
//   const cosY = Math.cos(radY), sinY = Math.sin(radY);
//   let newX = dx * cosY;
//   let newZ = dx * sinY;
//   const cosX = Math.cos(radX), sinX = Math.sin(radX);
//   let newY = dy * cosX - newZ * sinX;
//   return [cx + newX, cy + newY];
// }

// const BUNDLES = [
//   { id:"starter", name:"Standard", price:2999, features:["Sales Order","Sales Invoice","5 Users","Inventory View"] },
//   { id:"growth", name:"Growth", price:6999, features:["All Modules","Priority Support","API Access","Unlimited Users"], popular:true },
// ];
// const BUSINESS_TYPES = ["Pvt Ltd", "LLP", "Partnership", "Sole Proprietorship"];
// const INDUSTRIES = ["Manufacturing", "IT / Software", "Retail", "Healthcare", "Other"];
// const STEPS = ["Identity", "Business", "Location", "Plan", "Security", "Payment", "Done"];

// const PAYMENT_METHODS = [
//   { id:"upi",   icon:"📱", title:"UPI Payment",        sub:"GPay · PhonePe · Paytm · BHIM", badge:"Instant", badgeColor:"#4ade80" },
//   { id:"card",  icon:"💳", title:"Debit / Credit Card", sub:"Visa · Mastercard · RuPay",     badge:null,    badgeColor:null },
//   { id:"netbanking", icon:"🏦", title:"Net Banking",     sub:"All major banks supported",     badge:null,    badgeColor:null },
//   { id:"cash",  icon:"💵", title:"Cash Payment",        sub:"Pay at our nearest office",     badge:"Offline", badgeColor:"#fb923c" },
//   { id:"paylater", icon:"🕐", title:"Pay Later",         sub:"Invoice sent · Pay within 30 days", badge:"Net-30", badgeColor:"#a855f7" },
//   { id:"trial", icon:"🎁", title:"1 Week Free Trial",   sub:"Full access · No card required", badge:"FREE",   badgeColor:"#00f5ff" },
// ];

// async function callClaude(messages, systemPrompt = "") {
//   try {
//     const res = await fetch("/api/claude", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
//     });
//     const data = await res.json();
//     if (data.error && (data.error === "CREDIT_EXHAUSTED" || data.error.toLowerCase().includes("credit") || data.error.toLowerCase().includes("billing") || res.status === 402)) {
//       console.warn("Anthropic credits exhausted — skipping AI step");
//       return "__SKIP__";
//     }
//     if (data.error) throw new Error(data.error);
//     return data.content?.map(b => b.text || "").join("") || "";
//   } catch (err) {
//     console.warn("Claude call failed, skipping:", err.message);
//     return "__SKIP__";
//   }
// }

// // ============================================================
// // THEME DEFINITIONS – each with a unique, rich background
// // ============================================================
// const THEMES = {
//   erp: {
//     name: "ERP Management",
//     icon: "🏭",
//     accent: "#105B92",
//     logo: "E",
//     tagline: "Enterprise Resource Planning",
//     // Background: deep blue tech gradient with circuit‑board pattern
//     background: "linear-gradient(145deg, #0a2f4d 0%, #041e30 100%), repeating-linear-gradient(45deg, #00ffff08 0px, #00ffff08 2px, transparent 2px, transparent 10px)",
//     fields: [],
//   },
//   society: {
//     name: "Society Management",
//     icon: "🏘️",
//     accent: "#2d6a4f",
//     logo: "S",
//     tagline: "Cooperative Housing Society",
//     // Background: warm residential with subtle brick texture
//     background: "linear-gradient(135deg, #1e3a2f 0%, #0f2a20 100%), repeating-linear-gradient(45deg, #d4a37320 0px, #d4a37320 1px, transparent 1px, transparent 20px)",
//     fields: [{ name: "societyRegNo", label: "Society Registration No.", type: "text", required: true }],
//   },
//   healthcare: {
//     name: "Healthcare Management",
//     icon: "🏥",
//     accent: "#9d4edd",
//     logo: "H",
//     tagline: "Hospital & Clinic Management",
//     // Background: medical cross pattern + soft purple gradient
//     background: "linear-gradient(125deg, #4a1d3d 0%, #2a0f2a 100%), repeating-linear-gradient(90deg, #ff99cc10 0px, #ff99cc10 2px, transparent 2px, transparent 20px)",
//     fields: [{ name: "licenseNumber", label: "Medical License No.", type: "text", required: true }],
//   },
//   education: {
//     name: "Education Management",
//     icon: "📚",
//     accent: "#3498db",
//     logo: "E",
//     tagline: "School / College ERP",
//     // Background: notebook lines + blue gradient
//     background: "linear-gradient(145deg, #1a2a3a 0%, #0e1a26 100%), repeating-linear-gradient(0deg, #ffffff10 0px, #ffffff10 1px, transparent 1px, transparent 25px)",
//     fields: [{ name: "institutionCode", label: "Institution Code", type: "text", required: true }],
//   },
//   retail: {
//     name: "Retail Management",
//     icon: "🛒",
//     accent: "#f59e0b",
//     logo: "R",
//     tagline: "POS & Inventory",
//     // Background: price tag pattern + warm orange gradient
//     background: "linear-gradient(115deg, #5e2a0c 0%, #3e1e08 100%), radial-gradient(circle at 70% 20%, #ffaa3320 0%, #00000000 70%)",
//     fields: [{ name: "storePan", label: "Store PAN / TIN", type: "text", required: false }],
//   },
// };

// // ============================================================
// // UI Components (GlassInput, GlassSelect, etc.)
// // ============================================================
// function LiveClock() {
//   const [t, setT] = useState(() => new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false }));
//   useEffect(() => {
//     const iv = setInterval(() => setT(new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })), 1000);
//     return () => clearInterval(iv);
//   }, []);
//   return <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 9, color: "#ffffff", letterSpacing: "0.1em", fontWeight: 500 }}>{t} UTC</span>;
// }

// function WorldMapCanvas({ themeAccent }) {
//   const canvasRef = useRef(null);
//   const animRef = useRef(null);
//   const state = useRef({ pulses: [], pings: [], tick: 0, rotX: 0, rotY: 0, targetRotX: 0, targetRotY: 0 });
//   const mouseMove = useCallback((e) => {
//     const rect = canvasRef.current?.getBoundingClientRect();
//     if (!rect) return;
//     const x = (e.clientX - rect.left) / rect.width;
//     const y = (e.clientY - rect.top) / rect.height;
//     state.current.targetRotY = (x - 0.5) * 60;
//     state.current.targetRotX = (y - 0.5) * 30;
//   }, []);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
//     resize();
//     window.addEventListener("resize", resize);
//     canvas.addEventListener("mousemove", mouseMove);
//     canvas.style.cursor = "grab";

//     const spawnPulse = () => {
//       const c = CONNECTIONS[Math.floor(Math.random() * CONNECTIONS.length)];
//       state.current.pulses.push({ a: c[0], b: c[1], t: 0, speed: 0.004 + Math.random() * 0.005, color: "#ffffff", sz: 1.8 + Math.random() * 1.4, rev: Math.random() > 0.5 });
//     };
//     for (let i = 0; i < 7; i++) setTimeout(spawnPulse, i * 400);
//     const pt = setInterval(() => {
//       if (state.current.pulses.length < 18) spawnPulse();
//       state.current.pings.push({ i: Math.floor(Math.random() * CITIES.length), r: 0, alpha: 1 });
//     }, 750);

//     const draw = () => {
//       const W = canvas.width, H = canvas.height;
//       if (!W || !H) { animRef.current = requestAnimationFrame(draw); return; }
//       state.current.rotX += (state.current.targetRotX - state.current.rotX) * 0.05;
//       state.current.rotY += (state.current.targetRotY - state.current.rotY) * 0.05;

//       ctx.clearRect(0, 0, W, H);
//       ctx.fillStyle = "transparent";
//       ctx.fillRect(0, 0, W, H);
//       ctx.strokeStyle = "rgba(255,255,255,0.08)";
//       ctx.lineWidth = 0.5;
//       for (let gx = 0; gx < W; gx += W / 18) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
//       for (let gy = 0; gy < H; gy += H / 12) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

//       LAND_DOTS.forEach(d => {
//         const p = project(d[0], d[1], W, H, state.current.rotX, state.current.rotY);
//         if (p[0] < -50 || p[0] > W + 50 || p[1] < -50 || p[1] > H + 50) return;
//         ctx.beginPath();
//         ctx.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
//         ctx.fillStyle = "rgba(255,255,255,0.25)";
//         ctx.fill();
//       });

//       CONNECTIONS.forEach(c => {
//         const p1 = project(CITIES[c[0]].lat, CITIES[c[0]].lon, W, H, state.current.rotX, state.current.rotY);
//         const p2 = project(CITIES[c[1]].lat, CITIES[c[1]].lon, W, H, state.current.rotX, state.current.rotY);
//         if ((p1[0] < -50 || p1[0] > W + 50 || p1[1] < -50 || p1[1] > H + 50) &&
//             (p2[0] < -50 || p2[0] > W + 50 || p2[1] < -50 || p2[1] > H + 50)) return;
//         const mx = (p1[0] + p2[0]) / 2;
//         const my = (p1[1] + p2[1]) / 2 - Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.22;
//         ctx.beginPath();
//         ctx.moveTo(p1[0], p1[1]);
//         ctx.quadraticCurveTo(mx, my, p2[0], p2[1]);
//         ctx.strokeStyle = "rgba(255,255,255,0.1)";
//         ctx.lineWidth = 0.8;
//         ctx.stroke();
//       });

//       state.current.pulses = state.current.pulses.filter(p => p.t < 1);
//       state.current.pulses.forEach(p => {
//         p.t += p.speed;
//         const si = p.rev ? p.b : p.a, di = p.rev ? p.a : p.b;
//         const p1 = project(CITIES[si].lat, CITIES[si].lon, W, H, state.current.rotX, state.current.rotY);
//         const p2 = project(CITIES[di].lat, CITIES[di].lon, W, H, state.current.rotX, state.current.rotY);
//         const mx = (p1[0] + p2[0]) / 2;
//         const my = (p1[1] + p2[1]) / 2 - Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.22;
//         const t = p.t;
//         const bx = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * mx + t * t * p2[0];
//         const by = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * my + t * t * p2[1];
//         const g = ctx.createRadialGradient(bx, by, 0, bx, by, p.sz * 5);
//         g.addColorStop(0, p.color + "ff");
//         g.addColorStop(0.4, p.color + "66");
//         g.addColorStop(1, "transparent");
//         ctx.beginPath();
//         ctx.arc(bx, by, p.sz * 5, 0, Math.PI * 2);
//         ctx.fillStyle = g;
//         ctx.fill();
//         ctx.beginPath();
//         ctx.arc(bx, by, p.sz, 0, Math.PI * 2);
//         ctx.fillStyle = p.color;
//         ctx.shadowBlur = 8;
//         ctx.shadowColor = p.color;
//         ctx.fill();
//         ctx.shadowBlur = 0;
//       });

//       state.current.pings = state.current.pings.filter(p => p.alpha > 0);
//       state.current.pings.forEach(p => {
//         const pos = project(CITIES[p.i].lat, CITIES[p.i].lon, W, H, state.current.rotX, state.current.rotY);
//         p.r += 0.5;
//         p.alpha = Math.max(0, 1 - p.r / 28);
//         ctx.beginPath();
//         ctx.arc(pos[0], pos[1], p.r, 0, Math.PI * 2);
//         ctx.strokeStyle = `rgba(255,255,255,${p.alpha * 0.5})`;
//         ctx.lineWidth = 0.8;
//         ctx.stroke();
//       });

//       const tick = state.current.tick;
//       CITIES.forEach((city, i) => {
//         const pos = project(city.lat, city.lon, W, H, state.current.rotX, state.current.rotY);
//         if (pos[0] < -50 || pos[0] > W + 50 || pos[1] < -50 || pos[1] > H + 50) return;
//         const pulse = 0.5 + 0.5 * Math.sin(tick * 0.035 + i * 1.4);
//         const g = ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], 16 + pulse * 6);
//         g.addColorStop(0, "rgba(255,255,255,0.2)");
//         g.addColorStop(1, "transparent");
//         ctx.beginPath();
//         ctx.arc(pos[0], pos[1], 16 + pulse * 6, 0, Math.PI * 2);
//         ctx.fillStyle = g;
//         ctx.fill();
//         ctx.beginPath();
//         ctx.arc(pos[0], pos[1], 5 + pulse * 2, 0, Math.PI * 2);
//         ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.35})`;
//         ctx.lineWidth = 1;
//         ctx.stroke();
//         ctx.beginPath();
//         ctx.arc(pos[0], pos[1], 2.5, 0, Math.PI * 2);
//         ctx.fillStyle = "#ffffff";
//         ctx.shadowBlur = 12;
//         ctx.shadowColor = "#ffffff";
//         ctx.fill();
//         ctx.shadowBlur = 0;
//       });
//       state.current.tick++;
//       animRef.current = requestAnimationFrame(draw);
//     };
//     draw();
//     return () => {
//       cancelAnimationFrame(animRef.current);
//       clearInterval(pt);
//       window.removeEventListener("resize", resize);
//       canvas.removeEventListener("mousemove", mouseMove);
//     };
//   }, [mouseMove]);
//   return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto", opacity: 0.85 }} />;
// }

// function GlassInput({ label, name, value, onChange, type = "text", error, multiline }) {
//   const [focused, setFocused] = useState(false);
//   const active = focused || (value && value.length > 0);
//   const borderColor = error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.3)";
//   const boxShadow = focused ? "0 0 0 2px rgba(255,255,255,0.2)" : "none";
//   return (
//     <div style={{ marginBottom: 20 }}>
//       <div style={{ position: "relative", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: 14, border: `1px solid ${borderColor}`, boxShadow, transition: "all 0.2s", overflow: "hidden" }}>
//         <label style={{ position: "absolute", left: 16, top: active ? 8 : "50%", transform: active ? "none" : "translateY(-50%)", fontSize: active ? 10 : 13, fontWeight: 500, color: error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.6)", letterSpacing: active ? "0.1em" : "0", textTransform: active ? "uppercase" : "none", pointerEvents: "none", transition: "all 0.2s", zIndex: 2 }}>{label}</label>
//         {multiline ? (
//           <textarea name={name} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} rows={2} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", fontFamily: "'Inter', sans-serif", fontSize: 14, padding: "28px 16px 12px", resize: "none", boxSizing: "border-box" }} />
//         ) : (
//           <input name={name} type={type} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "white", fontFamily: "'Inter', sans-serif", fontSize: 14, padding: "28px 16px 12px", boxSizing: "border-box" }} />
//         )}
//       </div>
//       {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6, paddingLeft: 4, fontWeight: 500 }}>⚠ {error}</p>}
//     </div>
//   );
// }

// function GlassSelect({ label, name, value, onChange, options, error }) {
//   const [focused, setFocused] = useState(false);
//   const borderColor = error ? "#f87171" : focused ? "#ffffff" : "rgba(255,255,255,0.3)";
//   return (
//     <div style={{ marginBottom: 20 }}>
//       <div style={{ position: "relative", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", borderRadius: 14, border: `1px solid ${borderColor}`, boxShadow: focused ? "0 0 0 2px rgba(255,255,255,0.2)" : "none", transition: "all 0.2s" }}>
//         <label style={{ position: "absolute", left: 16, top: value ? 8 : "50%", transform: value ? "none" : "translateY(-50%)", fontSize: value ? 10 : 13, fontWeight: 500, color: focused ? "#ffffff" : "rgba(255,255,255,0.6)", letterSpacing: value ? "0.1em" : "0", textTransform: value ? "uppercase" : "none", pointerEvents: "none", transition: "all 0.2s", zIndex: 2 }}>{label}</label>
//         <select name={name} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: value ? "white" : "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif", fontSize: 14, padding: value ? "28px 16px 12px" : "20px 16px", boxSizing: "border-box", cursor: "pointer", appearance: "none" }}>
//           <option value="" style={{ background: "#105B92" }}>Select...</option>
//           {options.map(o => <option key={o} value={o} style={{ background: "#105B92" }}>{o}</option>)}
//         </select>
//         <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)", pointerEvents: "none", fontSize: 12 }}>⌵</div>
//       </div>
//       {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6, paddingLeft: 4, fontWeight: 500 }}>⚠ {error}</p>}
//     </div>
//   );
// }

// function GradientButton({ label, onClick, loading, fullWidth = false, icon = null, themeAccent }) {
//   const bgGradient = loading ? "rgba(255,255,255,0.2)" : `linear-gradient(135deg, #ffffff, ${themeAccent}20)`;
//   const textColor = loading ? "rgba(255,255,255,0.5)" : themeAccent;
//   return (
//     <button onClick={onClick} disabled={loading} style={{
//       width: fullWidth ? "100%" : "auto",
//       padding: "14px 28px",
//       background: bgGradient,
//       border: "none",
//       borderRadius: 40,
//       color: textColor,
//       fontFamily: "'Inter', sans-serif",
//       fontWeight: 700,
//       fontSize: 13,
//       letterSpacing: "0.03em",
//       cursor: loading ? "not-allowed" : "pointer",
//       boxShadow: loading ? "none" : "0 8px 20px rgba(0,0,0,0.15)",
//       transition: "all 0.2s",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       gap: 8,
//       backdropFilter: "blur(4px)",
//     }}>
//       {loading ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>PROCESSING</> : <>{icon}{label}</>}
//     </button>
//   );
// }

// // ============================================================
// // Main Component
// // ============================================================
// export default function PankajalERPRegistration() {
//   const router = useRouter();
//   const [themeId, setThemeId] = useState("erp");
//   const theme = THEMES[themeId];
//   const [step, setStep] = useState(-1); // -1 = theme selection
//   const [activeBundle, setActiveBundle] = useState("growth");
//   const [paymentView, setPaymentView] = useState("methods");
//   const [processing, setProcessing] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [errors, setErrors] = useState({});
//   const [packets, setPackets] = useState(8842);
//   const [welcomeMsg, setWelcomeMsg] = useState("");
//   const [redirectTimer, setRedirectTimer] = useState(null);
//   const [liveSessions, setLiveSessions] = useState(127);
//   const [form, setForm] = useState({
//     companyName: "", contactName: "", email: "", phone: "", businessType: "", industry: "", gstNumber: "",
//     country: "", address: "", pinCode: "", password: "", confirmPwd: "", agreeToTerms: false,
//     upi: "", cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "",
//     societyRegNo: "", licenseNumber: "", institutionCode: "", storePan: "",
//   });

//   useEffect(() => {
//     const pktInt = setInterval(() => setPackets(v => v + Math.floor(Math.random() * 40 - 10)), 1100);
//     const sessInt = setInterval(() => setLiveSessions(v => Math.max(80, v + Math.floor(Math.random() * 6 - 2))), 5000);
//     return () => { clearInterval(pktInt); clearInterval(sessInt); };
//   }, []);

//   const price = useMemo(() => BUNDLES.find(b => b.id === activeBundle), [activeBundle]);

//   const handleChange = (e) => {
//     const n = e.target.name, v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
//     setForm(p => ({ ...p, [n]: v }));
//     if (errors[n]) setErrors(p => ({ ...p, [n]: null }));
//   };

//   // Country-aware validators
//   const validatePhone = (phone, country) => {
//     if (!phone.trim()) return "Required";
//     const digits = phone.replace(/\D/g, '');
//     if (digits.length < 5 || digits.length > 15) return "Invalid phone number length";
//     return null;
//   };
//   const validatePin = (pin, country) => {
//     if (!pin.trim()) return "Required";
//     const trimmed = pin.trim();
//     if (country === "India" && !/^\d{6}$/.test(trimmed)) return "PIN must be exactly 6 digits";
//     if (country === "United States" && !/^\d{5}(-\d{4})?$/.test(trimmed)) return "ZIP code: 5 digits or 5+4 format";
//     if (country === "United Kingdom" && !/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(trimmed)) return "Invalid UK postcode format";
//     return null;
//   };
//   const validateGST = (gst, country) => {
//     if (country !== "India") return null;
//     if (!gst.trim()) return null;
//     if (!/^[0-9A-Z]{15}$/.test(gst.toUpperCase())) return "GST must be 15 alphanumeric chars";
//     return null;
//   };

//   const validate = () => {
//     const e = {};
//     if (step === 0) {
//       if (!form.companyName.trim()) e.companyName = "Required";
//       if (!form.contactName.trim()) e.contactName = "Required";
//       if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
//       const phoneErr = validatePhone(form.phone, form.country);
//       if (phoneErr) e.phone = phoneErr;
//       for (let f of theme.fields) {
//         if (f.required && !form[f.name]?.trim()) e[f.name] = `${f.label} is required`;
//       }
//     }
//     if (step === 1) {
//       if (!form.businessType) e.businessType = "Select type";
//       if (!form.industry) e.industry = "Select industry";
//       const gstErr = validateGST(form.gstNumber, form.country);
//       if (gstErr) e.gstNumber = gstErr;
//     }
//     if (step === 2) {
//       if (!form.country) e.country = "Select country";
//       if (form.address.length < 5) e.address = "Too short";
//       const pinErr = validatePin(form.pinCode, form.country);
//       if (pinErr) e.pinCode = pinErr;
//     }
//     if (step === 4) {
//       if (form.password.length < 8) e.password = "Min 8 chars";
//       if (form.password !== form.confirmPwd) e.confirmPwd = "No match";
//       if (!form.agreeToTerms) e.agreeToTerms = "You must agree to terms";
//     }
//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const next = () => { if (validate()) setStep(s => s + 1); };
//   const back = () => { setErrors({}); if (step === 5 && paymentView !== "methods") { setPaymentView("methods"); return; } setStep(s => s - 1); };

//   const handleSubmit = async (paymentType) => {
//     setProcessing(true);
//     setSubmitting(true);
//     setErrors({});
//     try {
//       const validationRaw = await callClaude([{ role: "user", content: `Validate this registration. Respond ONLY in JSON: {"valid":true,"issues":[]}. Data — Company:"${form.companyName}", Email:"${form.email}", Phone:"${form.phone}", Business:"${form.businessType}", Industry:"${form.industry}".` }]);
//       if (validationRaw !== "__SKIP__") {
//         let aiResult = { valid: true, issues: [] };
//         try {
//           const jsonMatch = validationRaw.match(/```(?:json)?\n([\s\S]*?)\n```/);
//           const clean = jsonMatch ? jsonMatch[1] : validationRaw;
//           aiResult = JSON.parse(clean.trim());
//         } catch { }
//         if (!aiResult.valid) {
//           setErrors({ general: "AI Review: " + (aiResult.issues?.join(", ") || "Please check your details.") });
//           setProcessing(false);
//           setSubmitting(false);
//           return;
//         }
//       }

//       const payload = {
//         companyName: form.companyName,
//         contactName: form.contactName,
//         email: form.email,
//         phone: form.phone,
//         country: form.country,
//         address: form.address,
//         pinCode: form.pinCode,
//         password: form.password,
//         agreeToTerms: form.agreeToTerms,
//         ...(form.gstNumber.trim() && { gstNumber: form.gstNumber.trim().toUpperCase() }),
//         businessType: form.businessType,
//         industry: form.industry,
//         plan: activeBundle,
//         paymentMethod: paymentType,
//         managementType: themeId,
//         ...(themeId === "society" && { societyRegNo: form.societyRegNo }),
//         ...(themeId === "healthcare" && { licenseNumber: form.licenseNumber }),
//         ...(themeId === "education" && { institutionCode: form.institutionCode }),
//         ...(themeId === "retail" && { storePan: form.storePan }),
//       };

//       const response = await fetch("/api/company/signup", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       if (!response.ok) {
//         const errData = await response.json().catch(() => ({}));
//         throw new Error(errData.message || "Registration failed.");
//       }

//       const payLabel = { upi: "UPI", card: "card", netbanking: "net banking", cash: "cash", paylater: "Pay Later (Net-30)", trial: "1 Week Free Trial" }[paymentType] || paymentType;
//       const welcomeRaw = await callClaude([{ role: "user", content: `Write a warm 2-sentence welcome for "${form.companyName}" (${form.industry}) who registered for the ${price?.name ?? "Standard"} ${theme.name} plan via ${payLabel}. Professional and exciting. No quotes.` }]);
//       if (welcomeRaw === "__SKIP__" || !welcomeRaw.trim()) {
//         setWelcomeMsg(`Welcome aboard, ${form.companyName}! Your ${theme.name} plan is now active. Let's build something great together.`);
//       } else {
//         setWelcomeMsg(welcomeRaw.trim());
//       }

//       setStep(6);
//       setProcessing(false);
//       setSubmitting(false);
//       const timer = setTimeout(() => router.push("/signin"), 4000);
//       setRedirectTimer(timer);
//     } catch (err) {
//       setErrors({ general: err.message || "Something went wrong. Please try again." });
//       setProcessing(false);
//       setSubmitting(false);
//     }
//   };

//   useEffect(() => {
//     return () => { if (redirectTimer) clearTimeout(redirectTimer); };
//   }, [redirectTimer]);

//   const BackBtn = () => (
//     <button onClick={() => setPaymentView("methods")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em", marginBottom: 24, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
//       ← Back to methods
//     </button>
//   );

//   const renderPaymentDetail = () => {
//     if (paymentView === "upi") return (
//       <div><BackBtn /><GlassInput label="UPI ID" name="upi" value={form.upi} onChange={handleChange} /><p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>e.g. name@okaxis</p><GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} VIA UPI`} onClick={() => handleSubmit("upi")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//     if (paymentView === "card") return (
//       <div><BackBtn /><GlassInput label="Card Number" name="cardNumber" value={form.cardNumber} onChange={handleChange} /><GlassInput label="Name on Card" name="cardName" value={form.cardName} onChange={handleChange} /><div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}><GlassInput label="Expiry MM/YY" name="cardExpiry" value={form.cardExpiry} onChange={handleChange} /></div><div style={{ flex: 1 }}><GlassInput label="CVV" name="cardCvv" value={form.cardCvv} onChange={handleChange} type="password" /></div></div><GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} SECURELY`} onClick={() => handleSubmit("card")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//     if (paymentView === "netbanking") return (
//       <div><BackBtn /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>{["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB"].map(bank => <button key={bank} style={{ padding: "12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: "white", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.borderColor = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}>{bank}</button>)}</div><GradientButton label={`PAY ₹${price?.price?.toLocaleString('en-IN') ?? "0"} VIA NET BANKING`} onClick={() => handleSubmit("netbanking")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//     if (paymentView === "cash") return (
//       <div><BackBtn /><div style={{ padding: "16px", background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.4)", borderRadius: 16, marginBottom: 20 }}><div style={{ fontSize: 12, color: "#fb923c", fontWeight: 700, marginBottom: 10 }}>💵 Cash Payment Instructions</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>1. Account created immediately<br/>2. Visit office within 7 working days<br/>3. Pay ₹{price?.price?.toLocaleString('en-IN') ?? "0"} at billing counter<br/>4. Collect receipt</div></div><div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 24 }}><div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: 6 }}>OFFICE ADDRESS</div><div style={{ fontSize: 12, color: "white", lineHeight: 1.5 }}>{theme.name} Global, 4th Floor,<br />Tech Park, Whitefield, Bengaluru — 560066</div></div><GradientButton label="CONFIRM CASH PAYMENT" onClick={() => handleSubmit("cash")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//     if (paymentView === "paylater") return (
//       <div><BackBtn /><div style={{ padding: "16px", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 16, marginBottom: 20 }}><div style={{ fontSize: 12, color: "#a855f7", fontWeight: 700, marginBottom: 10 }}>🕐 Pay Later — Net 30</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>• Full access starts immediately<br/>• Invoice of ₹{price?.price?.toLocaleString('en-IN') ?? "0"} sent to email<br/>• Payment due within 30 days<br/>• For verified businesses only</div></div><div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 18 }}>📧</span><div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.1em" }}>INVOICE WILL BE SENT TO</div><div style={{ fontSize: 13, color: "white", marginTop: 4, fontWeight: 500 }}>{form.email || "your registered email"}</div></div></div><GradientButton label="CONFIRM · PAY WITHIN 30 DAYS" onClick={() => handleSubmit("paylater")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//     if (paymentView === "trial") return (
//       <div><BackBtn /><div style={{ padding: "16px", background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)", borderRadius: 16, marginBottom: 20 }}><div style={{ fontSize: 12, color: "#00f5ff", fontWeight: 700, marginBottom: 10 }}>🎁 1 Week Free Trial</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>• 100% free for 7 days — no card required<br/>• Full access to {price?.name ?? "Standard"} Plan features<br/>• Auto-reminder on Day 5<br/>• Upgrade anytime</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>{[{ d: "Day 1", t: "Full Access" }, { d: "Day 5", t: "Reminder" }, { d: "Day 7", t: "Trial Ends" }].map(item => <div key={item.d} style={{ padding: "12px", background: "rgba(255,255,255,0.06)", borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 11, color: "#00f5ff", fontWeight: 700 }}>{item.d}</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{item.t}</div></div>)}</div><GradientButton label="START FREE TRIAL → 7 DAYS" onClick={() => handleSubmit("trial")} loading={submitting} fullWidth themeAccent={theme.accent} /></div>
//     );
//   };

//   const getPasswordStrength = (pwd) => {
//     if (!pwd) return { score: 0, label: "", color: "" };
//     let score = 0;
//     if (pwd.length >= 8) score++;
//     if (pwd.length >= 12) score++;
//     if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
//     if (/[0-9]/.test(pwd)) score++;
//     if (/[^a-zA-Z0-9]/.test(pwd)) score++;
//     const map = [
//       { score: 0, label: "Very Weak", color: "#f87171" },
//       { score: 1, label: "Weak", color: "#fb923c" },
//       { score: 2, label: "Fair", color: "#facc15" },
//       { score: 3, label: "Good", color: "#a3e635" },
//       { score: 4, label: "Strong", color: "#4ade80" },
//       { score: 5, label: "Very Strong", color: "#22c55e" }
//     ];
//     const idx = Math.min(5, Math.floor(score));
//     return map[idx];
//   };

//   // Theme selection screen (dark background with subtle grid)
//   if (step === -1) {
//     return (
//       <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#0a0f1a", fontFamily: "'Inter', sans-serif" }}>
//         <WorldMapCanvas themeAccent="#ffffff" />
//         <div style={{ position: "relative", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "20px" }}>
//           <div style={{ textAlign: "center", marginBottom: 48 }}>
//             <div style={{ fontSize: 48, fontWeight: 800, background: "linear-gradient(135deg, #fff, #aaccff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginBottom: 12 }}>Pankajal</div>
//             <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em" }}>CHOOSE YOUR MANAGEMENT SOLUTION</div>
//           </div>
//           <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, maxWidth: 1000 }}>
//             {Object.entries(THEMES).map(([id, t]) => (
//               <div key={id} onClick={() => { setThemeId(id); setStep(0); }} style={{
//                 width: 200, padding: 24, background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", borderRadius: 32, border: `1px solid ${t.accent}80`, cursor: "pointer", textAlign: "center", transition: "all 0.3s", boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
//               }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.background = `rgba(255,255,255,0.1)`; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}>
//                 <div style={{ fontSize: 48, marginBottom: 12 }}>{t.icon}</div>
//                 <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>{t.name}</div>
//                 <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{t.tagline}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Main registration form – background changes per theme
//   return (
//     <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: theme.background, fontFamily: "'Inter', sans-serif", backgroundBlendMode: "overlay" }}>
//       <style>{`
//         @keyframes scanDown{0%{top:-3px}100%{top:100%}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}@keyframes countdown{from{width:100%}to{width:0%}}@keyframes float{0%{transform:translateY(0px)}50%{transform:translateY(-5px)}100%{transform:translateY(0px)}}input:-webkit-autofill,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.1) inset!important;-webkit-text-fill-color:white!important;}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.3);border-radius:4px}select option{background:${theme.accent};color:white}
//         .glass-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:32px;box-shadow:0 25px 45px -12px rgba(0,0,0,0.25);transition:transform 0.3s ease;}
//         .glass-card:hover{transform:scale(1.01);}
//         .step-indicator{transition:all 0.3s cubic-bezier(0.4,0,0.2,1);}
//       `}</style>
//       <WorldMapCanvas themeAccent={theme.accent} />

//       {/* Animated scanline */}
//       <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${theme.accent},transparent)`, animation: "scanDown 8s linear infinite", pointerEvents: "none", zIndex: 5 }} />

//       {/* Top Bar */}
//       <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
//           <div style={{ width: 40, height: 40, background: theme.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
//             <span style={{ fontSize: 22, color: "white", fontWeight: "bold" }}>{theme.logo}</span>
//           </div>
//           <div>
//             <div style={{ fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "0.15em" }}>{theme.name.toUpperCase()}</div>
//             <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>{theme.tagline}</div>
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
//           {[{ l: "NODES", v: String(CITIES.length) }, { l: "LINKS", v: String(CONNECTIONS.length) }, { l: "PKT/S", v: packets.toLocaleString() }, { l: "ACTIVE", v: liveSessions }].map(s => (
//             <div key={s.l} style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{s.v}</div><div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", marginTop: 2 }}>{s.l}</div></div>
//           ))}
//           <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 30 }}>
//             <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "blink 1.5s ease infinite" }} />
//             <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
//           </div>
//           <button onClick={() => { setStep(-1); setForm({}); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 30, padding: "6px 12px", color: "white", fontSize: 11, cursor: "pointer" }}>← Change Theme</button>
//         </div>
//       </div>

//       {/* Main Form Card */}
//       <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80, paddingBottom: 40, overflowY: "auto" }}>
//         <div style={{ width: "100%", maxWidth: 550, margin: "0 auto", padding: "0 20px", animation: "fadeUp 0.6s ease both" }}>
//           <div className="glass-card" style={{ overflow: "hidden" }}>
//             <div style={{ padding: "28px 32px 0" }}>
//               {step < 6 && (
//                 <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
//                   {STEPS.slice(0, -1).map((s, i) => (
//                     <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
//                       <div className="step-indicator" style={{
//                         width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
//                         fontSize: 11, fontWeight: 700,
//                         background: i < step ? "white" : i === step ? `rgba(255,255,255,0.2)` : "transparent",
//                         border: i === step ? `1px solid white` : i < step ? "none" : "1px solid rgba(255,255,255,0.3)",
//                         color: i <= step ? theme.accent : "rgba(255,255,255,0.5)",
//                         boxShadow: i === step ? `0 0 12px ${theme.accent}` : "none"
//                       }}>
//                         {i < step ? "✓" : String(i + 1)}
//                       </div>
//                       {i < STEPS.length - 2 && <div style={{ flex: 1, height: 1, margin: "0 8px", background: "rgba(255,255,255,0.2)", position: "relative", overflow: "hidden" }}>
//                         <div style={{ position: "absolute", inset: 0, background: theme.accent, transform: `scaleX(${i < step ? 1 : 0})`, transformOrigin: "left", transition: "transform 0.4s ease" }} />
//                       </div>}
//                     </div>
//                   ))}
//                 </div>
//               )}
//               <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>{step < 6 ? `STEP ${step + 1} / 6` : "COMPLETE"}</div>
//               <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", letterSpacing: "-0.02em", marginBottom: 8 }}>
//                 {["Company Identity", "Business Profile", "Office Address", "Choose Plan", "Set Password", "Complete Payment", "You're Live"][step]}
//               </h1>
//               {step >= 3 && step < 6 && (
//                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, marginBottom: 8, padding: "12px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 20, animation: "float 3s ease infinite" }}>
//                   <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 8px ${theme.accent}`, animation: "pulse 1.5s infinite" }} />
//                   <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, fontWeight: 500 }}>{price?.name} Plan</span>
//                   <span style={{ fontSize: 18, fontWeight: 700, color: "white" }}>₹{price?.price?.toLocaleString('en-IN') ?? "0"}</span>
//                 </div>
//               )}
//             </div>
//             <div style={{ padding: "20px 32px 32px" }}>
//               {errors.general && (
//                 <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: 16 }}>
//                   <p style={{ fontSize: 12, color: "#f87171", margin: 0, fontWeight: 500 }}>⚠ {errors.general}</p>
//                 </div>
//               )}

//               {step === 0 && (
//                 <>
//                   <GlassInput label="Company / Organization Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} />
//                   <GlassInput label="Contact Person Name" name="contactName" value={form.contactName} onChange={handleChange} error={errors.contactName} />
//                   <GlassInput label="Official Email" name="email" value={form.email} onChange={handleChange} error={errors.email} type="email" />
//                   <GlassInput label="Phone Number (international)" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} type="tel" />
//                   {theme.fields.map(f => (
//                     <GlassInput key={f.name} label={f.label} name={f.name} value={form[f.name]} onChange={handleChange} error={errors[f.name]} />
//                   ))}
//                 </>
//               )}

//               {step === 1 && (
//                 <>
//                   <GlassSelect label="Business Structure" name="businessType" value={form.businessType} onChange={handleChange} options={BUSINESS_TYPES} error={errors.businessType} />
//                   <GlassSelect label="Industry Vertical" name="industry" value={form.industry} onChange={handleChange} options={INDUSTRIES} error={errors.industry} />
//                   <GlassInput label="Tax ID / GST (optional)" name="gstNumber" value={form.gstNumber} onChange={handleChange} error={errors.gstNumber} />
//                   {form.country === "India" && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: -8, marginBottom: 0, paddingLeft: 4 }}>15-character GST · leave blank if not registered</p>}
//                 </>
//               )}

//               {step === 2 && (
//                 <>
//                   <GlassSelect label="Country" name="country" value={form.country} onChange={handleChange} options={["India", "United States", "United Kingdom", "UAE", "Singapore", "Australia", "Canada", "Germany", "Other"]} error={errors.country} />
//                   <GlassInput label="Full Address" name="address" value={form.address} onChange={handleChange} error={errors.address} multiline />
//                   <GlassInput label="Postal / ZIP Code" name="pinCode" value={form.pinCode} onChange={handleChange} error={errors.pinCode} />
//                 </>
//               )}

//               {step === 3 && (
//                 <div>
//                   {BUNDLES.map(b => {
//                     const sel = activeBundle === b.id;
//                     return (
//                       <div key={b.id} onClick={() => setActiveBundle(b.id)} style={{
//                         position: "relative",
//                         padding: "20px 24px",
//                         borderRadius: 24,
//                         cursor: "pointer",
//                         marginBottom: 16,
//                         border: sel ? `2px solid ${theme.accent}` : "1px solid rgba(255,255,255,0.2)",
//                         background: sel ? `rgba(255,255,255,0.12)` : "rgba(255,255,255,0.05)",
//                         backdropFilter: "blur(4px)",
//                         transition: "all 0.25s"
//                       }}>
//                         {b.popular && <div style={{ position: "absolute", top: -10, right: 20, background: theme.accent, color: "white", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: 30, letterSpacing: "0.1em" }}>RECOMMENDED</div>}
//                         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
//                           <div><div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{b.name} Plan</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{b.id === "starter" ? "Core essentials" : "Full suite"}</div></div>
//                           <div style={{ textAlign: "right" }}><div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>₹{b.price.toLocaleString('en-IN')}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>/ year</div></div>
//                         </div>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//                           {b.features.map(f => (
//                             <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                               <div style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? theme.accent : "rgba(255,255,255,0.4)" }} />
//                               <span style={{ fontSize: 11, color: sel ? "white" : "rgba(255,255,255,0.6)", fontWeight: 500 }}>{f}</span>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}

//               {step === 4 && (
//                 <>
//                   <GlassInput label="Create Password" name="password" value={form.password} onChange={handleChange} error={errors.password} type="password" />
//                   {form.password.length > 0 && (() => {
//                     const strength = getPasswordStrength(form.password);
//                     return (
//                       <div style={{ marginBottom: 20 }}>
//                         <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
//                           {[0, 1, 2, 3, 4].map(i => {
//                             const active = i < strength.score;
//                             return <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: active ? strength.color : "rgba(255,255,255,0.2)", transition: "all 0.3s" }} />;
//                           })}
//                         </div>
//                         <div style={{ fontSize: 10, color: strength.color, fontWeight: 500 }}>{strength.label}</div>
//                       </div>
//                     );
//                   })()}
//                   <GlassInput label="Confirm Password" name="confirmPwd" value={form.confirmPwd} onChange={handleChange} error={errors.confirmPwd} type="password" />
//                   <div onClick={() => setForm(p => ({ ...p, agreeToTerms: !p.agreeToTerms }))} style={{
//                     display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 20,
//                     background: "rgba(255,255,255,0.05)", border: errors.agreeToTerms ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(255,255,255,0.15)",
//                     cursor: "pointer", marginTop: 8
//                   }}>
//                     <div style={{
//                       width: 22, height: 22, borderRadius: 8, background: form.agreeToTerms ? theme.accent : "transparent",
//                       border: "1px solid " + (form.agreeToTerms ? "transparent" : "rgba(255,255,255,0.4)"),
//                       display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white", fontWeight: 700
//                     }}>{form.agreeToTerms && "✓"}</div>
//                     <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>I confirm all details are accurate and accept the <span style={{ color: "white", fontWeight: 600 }}>Terms</span></span>
//                   </div>
//                   {errors.agreeToTerms && <p style={{ fontSize: 11, color: "#f87171", marginTop: 8, paddingLeft: 4 }}>⚠ {errors.agreeToTerms}</p>}
//                 </>
//               )}

//               {step === 5 && (
//                 <div>
//                   {paymentView === "methods" ? (
//                     <div>
//                       <div style={{ padding: "14px 18px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
//                         <span style={{ fontSize: 16 }}>🔐</span>
//                         <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>256-bit SSL Encrypted · PCI DSS Compliant</span>
//                       </div>
//                       {PAYMENT_METHODS.map(m => (
//                         <button key={m.id} onClick={() => setPaymentView(m.id)} style={{
//                           width: "100%", padding: "16px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
//                           borderRadius: 20, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left", marginBottom: 12,
//                           transition: "all 0.2s"
//                         }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}>
//                           <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{m.icon}</div>
//                           <div style={{ flex: 1 }}>
//                             <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontWeight: 700, fontSize: 14, color: "white" }}>{m.title}</span>{m.badge && <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(255,255,255,0.15)", color: m.badgeColor || "white", padding: "3px 9px", borderRadius: 20 }}>{m.badge}</span>}</div>
//                             <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{m.sub}</div>
//                           </div>
//                           <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }}>→</span>
//                         </button>
//                       ))}
//                       <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>⚠️ Demo mode – no real payment will be processed.</div>
//                     </div>
//                   ) : renderPaymentDetail()}
//                 </div>
//               )}

//               {step === 6 && (
//                 <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
//                   <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
//                     <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, border: `2px solid ${theme.accent}`, boxShadow: `0 0 40px ${theme.accent}80` }}>🎉</div>
//                     <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: `2px solid ${theme.accent}`, animation: "spin 6s linear infinite" }} />
//                   </div>
//                   <h2 style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 12 }}>Registration Complete!</h2>
//                   <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 8 }}>Your <span style={{ color: theme.accent, fontWeight: 700 }}>{price?.name ?? "Standard"} Plan</span> for <span style={{ color: theme.accent }}>{theme.name}</span> is now active.</p>
//                   {welcomeMsg ? (
//                     <div style={{ margin: "20px 0", padding: "16px 20px", background: "rgba(255,255,255,0.08)", borderRadius: 20, textAlign: "left" }}>
//                       <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>✨ AI WELCOME</div>
//                       <p style={{ fontSize: 13, color: "white", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{welcomeMsg}"</p>
//                     </div>
//                   ) : (
//                     <div style={{ margin: "20px 0", padding: "14px", background: "rgba(255,255,255,0.05)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
//                       <div style={{ animation: "spin 1s linear infinite", display: "inline-block", color: "white" }}>◌</div>
//                       <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Crafting welcome...</span>
//                     </div>
//                   )}
//                   <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Check your email for login credentials.</p>
//                   <div style={{ marginBottom: 24 }}>
//                     <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 8, letterSpacing: "0.1em" }}>REDIRECTING TO SIGN IN IN 4s...</div>
//                     <div style={{ height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
//                       <div style={{ height: "100%", background: theme.accent, animation: "countdown 4s linear forwards", borderRadius: 3 }} />
//                     </div>
//                   </div>
//                   <GradientButton label="GO TO SIGN IN →" onClick={() => router.push("/signin")} fullWidth themeAccent={theme.accent} />
//                 </div>
//               )}

//               {step < 6 && !(step === 5 && paymentView !== "methods") && (
//                 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
//                   <button disabled={step === 0} onClick={back} style={{
//                     background: "none", border: "none", fontSize: 12, fontWeight: 600, color: step === 0 ? "transparent" : "rgba(255,255,255,0.6)",
//                     letterSpacing: "0.05em", cursor: step === 0 ? "default" : "pointer", padding: 0, transition: "color 0.2s"
//                   }}>← Back</button>
//                   <GradientButton label={step === 4 ? "Review & Pay →" : step === 3 ? "Confirm Plan →" : "Continue →"} onClick={next} fullWidth={false} icon={step !== 4 ? "→" : null} themeAccent={theme.accent} />
//                 </div>
//               )}
//             </div>
//           </div>
//           {step < 6 && (
//             <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 20, letterSpacing: "0.1em" }}>
//               Protected by Pankajal Security · <span style={{ opacity: 0.7 }}>Terms</span> · <span style={{ opacity: 0.7 }}>Privacy</span>
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Bottom Bar */}
//       <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
//         <div style={{ display: "flex", gap: 32 }}>{["ENCRYPTION: AES-256", "PROTOCOL: TLS 1.3", "AVG LATENCY: 4ms"].map(l => <span key={l} style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>{l}</span>)}</div>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>SYS TIME</span><LiveClock /></div>
//       </div>

//       {processing && (
//         <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(16px)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
//           <div style={{ position: "relative", width: 80, height: 80, marginBottom: 32 }}>
//             <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)" }} />
//             <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: theme.accent, animation: "spin 0.9s linear infinite" }} />
//             <div style={{ position: "absolute", inset: 12, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "rgba(255,255,255,0.5)", animation: "spin 1.3s linear infinite reverse" }} />
//             <div style={{ position: "absolute", inset: 26, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: theme.accent }}>{theme.logo}</div>
//           </div>
//           <div style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Processing</div>
//           <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>AI validating · Securing your account...</div>
//         </div>
//       )}
//     </div>
//   );
// }





// "use client";
// import { useEffect, useRef, useState, useMemo } from "react";
// import { useRouter } from "next/navigation";

// // ─────────────────────────────────────────────────────────────
// // Constants & Helpers (same as original, but kept for brevity)
// // ─────────────────────────────────────────────────────────────
// const LAND_DOTS = [
//   [49,-125],[50,-120],[49,-115],[48,-110],[47,-120],[46,-124],[44,-124],[42,-124],[40,-124],[38,-122],[37,-122],[36,-121],[35,-120],
//   [47,-113],[45,-110],[43,-108],[42,-105],[40,-105],[38,-105],[36,-106],[34,-106],[32,-107],[30,-104],[29,-103],[28,-100],[27,-98],
//   [45,-93],[44,-88],[43,-83],[42,-83],[41,-82],[40,-82],[39,-84],[38,-85],[37,-86],[36,-87],[35,-87],[34,-86],[33,-85],[32,-84],[31,-83],
//   [47,-70],[46,-72],[45,-74],[44,-76],[43,-79],[42,-80],[41,-81],[40,-80],[39,-77],[38,-77],[37,-77],[36,-76],[35,-76],[34,-77],[33,-78],[32,-80],
//   [60,25],[59,24],[58,22],[57,21],[56,20],[55,18],[54,18],[53,19],[52,20],[51,20],[50,19],[49,18],[48,17],[47,16],[46,15],[45,14],
//   [55,38],[56,40],[57,42],[58,44],[59,46],[60,48],[61,50],[62,52],[63,54],[64,56],[65,58],[64,60],[63,62],[62,64],[61,66],[60,68],
//   [44,100],[43,102],[42,104],[41,106],[40,108],[39,110],[38,112],[37,114],[36,116],[35,118],[34,120],[33,120],[32,118],[31,120],[30,120],
//   [37,10],[36,10],[35,10],[34,10],[33,12],[32,14],[31,16],[30,18],[29,20],[28,22],[27,24],[26,26],[25,28],[24,30],[23,32],[22,34],
//   [-38,140],[-36,140],[-34,138],[-32,136],[-30,136],[-28,132],[-26,132],[-24,132],[-22,132],[-20,128],[-18,126],
// ];

// const CITIES = [
//   { name:"Mumbai",    lat:19,  lon:72   },
//   { name:"London",   lat:51,  lon:0    },
//   { name:"New York", lat:40,  lon:-74  },
//   { name:"Tokyo",    lat:35,  lon:139  },
//   { name:"Sydney",   lat:-33, lon:151  },
//   { name:"Dubai",    lat:25,  lon:55   },
//   { name:"Sao Paulo",lat:-23, lon:-46  },
//   { name:"Singapore",lat:1,   lon:103  },
//   { name:"Frankfurt",lat:50,  lon:8    },
//   { name:"Toronto",  lat:43,  lon:-79  },
//   { name:"Nairobi",  lat:-1,  lon:36   },
//   { name:"Seoul",    lat:37,  lon:127  },
// ];
// const CONNECTIONS = [[0,5],[0,1],[1,8],[1,2],[2,9],[0,7],[7,3],[3,11],[5,1],[5,7],[1,10],[2,6],[6,1],[4,7],[4,1],[0,3],[2,5]];

// function project(lat,lon,W,H){const x=((lon+180)/360)*W;const latRad=(lat*Math.PI)/180;const mercN=Math.log(Math.tan(Math.PI/4+latRad/2));const y=H/2-(W*mercN)/(2*Math.PI);return[x,y];}

// const BUNDLES=[
//   {id:"starter",name:"Standard",price:2999,features:["Sales Order","Sales Invoice","5 Users","Inventory View"]},
//   {id:"growth",name:"Growth",price:6999,features:["All Modules","Priority Support","API Access","Unlimited Users"],popular:true},
// ];
// const BUSINESS_TYPES=["Pvt Ltd","LLP","Partnership","Sole Proprietorship"];
// const INDUSTRIES=["Manufacturing","IT / Software","Retail","Healthcare","Other"];
// const STEPS=["Identity","Business","Location","Plan","Security","Payment","Done"];

// const PAYMENT_METHODS=[
//   {id:"upi",   icon:"📱",title:"UPI Payment",        sub:"GPay · PhonePe · Paytm · BHIM", badge:"Instant", badgeColor:"#4ade80"},
//   {id:"card",  icon:"💳",title:"Debit / Credit Card", sub:"Visa · Mastercard · RuPay",     badge:null,      badgeColor:null},
//   {id:"netbanking",icon:"🏦",title:"Net Banking",     sub:"All major banks supported",     badge:null,      badgeColor:null},
//   {id:"cash",  icon:"💵",title:"Cash Payment",        sub:"Pay at our nearest office",     badge:"Offline", badgeColor:"#fb923c"},
//   {id:"paylater",icon:"🕐",title:"Pay Later",         sub:"Invoice sent · Pay within 30 days",badge:"Net-30",badgeColor:"#a855f7"},
//   {id:"trial", icon:"🎁",title:"1 Week Free Trial",   sub:"Full access · No card required",badge:"FREE",    badgeColor:"#00f5ff"},
// ];

// async function callClaude(messages,systemPrompt=""){
//   try{
//     const res=await fetch("/api/claude",{
//       method:"POST",
//       headers:{"Content-Type":"application/json"},
//       body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:systemPrompt,messages}),
//     });
//     const data=await res.json();
//     if(data.error&&(
//       data.error==="CREDIT_EXHAUSTED"||
//       (typeof data.error==="string"&&data.error.toLowerCase().includes("credit"))||
//       (typeof data.error==="string"&&data.error.toLowerCase().includes("billing"))||
//       res.status===402
//     )){
//       console.warn("Anthropic credits exhausted — skipping AI step");
//       return "__SKIP__";
//     }
//     if(data.error)throw new Error(data.error);
//     return data.content?.map(b=>b.text||"").join("")||"";
//   }catch(err){
//     console.warn("Claude call failed, skipping:",err.message);
//     return "__SKIP__";
//   }
// }

// // ─────────────────────────────────────────────────────────────
// // Advanced UI Components
// // ─────────────────────────────────────────────────────────────

// function LiveClock(){const[t,setT]=useState(()=>new Date().toISOString().slice(11,19));useEffect(()=>{const iv=setInterval(()=>setT(new Date().toISOString().slice(11,19)),1000);return()=>clearInterval(iv);},[]);return<span style={{fontFamily:"'Fira Code', monospace",fontSize:9,color:"#ffffff",letterSpacing:"0.1em",fontWeight:500}}>{t} UTC</span>;}

// // Animated background canvas (light version with #105B92 accents)
// function WorldMapCanvas(){
//   const canvasRef=useRef(null);const animRef=useRef(null);const state=useRef({pulses:[],pings:[],tick:0});
//   useEffect(()=>{
//     const canvas=canvasRef.current;if(!canvas)return;
//     const ctx=canvas.getContext("2d");
//     const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};resize();window.addEventListener("resize",resize);
//     const spawnPulse=()=>{const c=CONNECTIONS[Math.floor(Math.random()*CONNECTIONS.length)];state.current.pulses.push({a:c[0],b:c[1],t:0,speed:0.004+Math.random()*0.005,color:"#ffffff",sz:1.8+Math.random()*1.4,rev:Math.random()>0.5});};
//     for(let i=0;i<7;i++)setTimeout(spawnPulse,i*400);
//     const pt=setInterval(()=>{if(state.current.pulses.length<18)spawnPulse();state.current.pings.push({i:Math.floor(Math.random()*CITIES.length),r:0,alpha:1});},750);
//     const draw=()=>{
//       const W=canvas.width,H=canvas.height;if(!W||!H){animRef.current=requestAnimationFrame(draw);return;}
//       ctx.clearRect(0,0,W,H);
//       // Transparent background (parent container shows #105B92)
//       ctx.fillStyle="transparent"; ctx.fillRect(0,0,W,H);
//       ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=0.5;
//       for(let gx=0;gx<W;gx+=W/18){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
//       for(let gy=0;gy<H;gy+=H/12){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
//       LAND_DOTS.forEach(d=>{const p=project(d[0],d[1],W,H);if(p[0]<0||p[0]>W||p[1]<0||p[1]>H)return;ctx.beginPath();ctx.arc(p[0],p[1],1.2,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.2)";ctx.fill();});
//       CONNECTIONS.forEach(c=>{const p1=project(CITIES[c[0]].lat,CITIES[c[0]].lon,W,H),p2=project(CITIES[c[1]].lat,CITIES[c[1]].lon,W,H);const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2-Math.hypot(p2[0]-p1[0],p2[1]-p1[1])*0.22;ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.quadraticCurveTo(mx,my,p2[0],p2[1]);ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=0.8;ctx.stroke();});
//       state.current.pulses=state.current.pulses.filter(p=>p.t<1);
//       state.current.pulses.forEach(p=>{p.t+=p.speed;const si=p.rev?p.b:p.a,di=p.rev?p.a:p.b;const p1=project(CITIES[si].lat,CITIES[si].lon,W,H),p2=project(CITIES[di].lat,CITIES[di].lon,W,H);const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2-Math.hypot(p2[0]-p1[0],p2[1]-p1[1])*0.22;const t=p.t,bx=(1-t)*(1-t)*p1[0]+2*(1-t)*t*mx+t*t*p2[0],by=(1-t)*(1-t)*p1[1]+2*(1-t)*t*my+t*t*p2[1];const g=ctx.createRadialGradient(bx,by,0,bx,by,p.sz*5);g.addColorStop(0,p.color+"ff");g.addColorStop(0.4,p.color+"66");g.addColorStop(1,"transparent");ctx.beginPath();ctx.arc(bx,by,p.sz*5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(bx,by,p.sz,0,Math.PI*2);ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fill();ctx.shadowBlur=0;});
//       state.current.pings=state.current.pings.filter(p=>p.alpha>0);
//       state.current.pings.forEach(p=>{const pos=project(CITIES[p.i].lat,CITIES[p.i].lon,W,H);p.r+=0.5;p.alpha=Math.max(0,1-p.r/28);ctx.beginPath();ctx.arc(pos[0],pos[1],p.r,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,"+(p.alpha*0.5)+")";ctx.lineWidth=0.8;ctx.stroke();});
//       const tick=state.current.tick;CITIES.forEach((city,i)=>{const pos=project(city.lat,city.lon,W,H),cx=pos[0],cy=pos[1];const pulse=0.5+0.5*Math.sin(tick*0.035+i*1.4);const g=ctx.createRadialGradient(cx,cy,0,cx,cy,16+pulse*6);g.addColorStop(0,"rgba(255,255,255,0.15)");g.addColorStop(1,"transparent");ctx.beginPath();ctx.arc(cx,cy,16+pulse*6,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,5+pulse*2,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,"+(0.35+pulse*0.35)+")";ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle="#ffffff";ctx.shadowBlur=12;ctx.shadowColor="#ffffff";ctx.fill();ctx.shadowBlur=0;});
//       state.current.tick++;animRef.current=requestAnimationFrame(draw);
//     };draw();
//     return()=>{cancelAnimationFrame(animRef.current);clearInterval(pt);window.removeEventListener("resize",resize);};
//   },[]);
//   return<canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
// }

// // Glass input component
// function GlassInput({label,name,value,onChange,type,error,multiline}){
//   const[focused,setFocused]=useState(false);
//   const active=focused||(value&&value.length>0);
//   const borderColor=error?"#f87171":focused?"#ffffff":"rgba(255,255,255,0.3)";
//   const boxShadow=focused?"0 0 0 2px rgba(255,255,255,0.2)":"none";
//   return(
//     <div style={{marginBottom:20}}>
//       <div style={{position:"relative",background:"rgba(255,255,255,0.08)",backdropFilter:"blur(8px)",borderRadius:14,border:`1px solid ${borderColor}`,boxShadow,transition:"all 0.2s",overflow:"hidden"}}>
//         <label style={{position:"absolute",left:16,top:active?8:"50%",transform:active?"none":"translateY(-50%)",fontSize:active?10:13,fontWeight:500,color:error?"#f87171":focused?"#ffffff":"rgba(255,255,255,0.6)",letterSpacing:active?"0.1em":"0",textTransform:active?"uppercase":"none",pointerEvents:"none",transition:"all 0.2s",zIndex:2}}>{label}</label>
//         {multiline?<textarea name={name} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} rows={2} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"white",fontFamily:"'Inter', sans-serif",fontSize:14,padding:"28px 16px 12px",resize:"none",boxSizing:"border-box"}}/>:<input name={name} type={type||"text"} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"white",fontFamily:"'Inter', sans-serif",fontSize:14,padding:"28px 16px 12px",boxSizing:"border-box"}}/>}
//       </div>
//       {error&&<p style={{fontSize:11,color:"#f87171",marginTop:6,paddingLeft:4,fontWeight:500}}>⚠ {error}</p>}
//     </div>
//   );
// }

// function GlassSelect({label,name,value,onChange,options,error}){
//   const[focused,setFocused]=useState(false);
//   const borderColor=error?"#f87171":focused?"#ffffff":"rgba(255,255,255,0.3)";
//   return(
//     <div style={{marginBottom:20}}>
//       <div style={{position:"relative",background:"rgba(255,255,255,0.08)",backdropFilter:"blur(8px)",borderRadius:14,border:`1px solid ${borderColor}`,boxShadow:focused?"0 0 0 2px rgba(255,255,255,0.2)":"none",transition:"all 0.2s"}}>
//         <label style={{position:"absolute",left:16,top:value?8:"50%",transform:value?"none":"translateY(-50%)",fontSize:value?10:13,fontWeight:500,color:focused?"#ffffff":"rgba(255,255,255,0.6)",letterSpacing:value?"0.1em":"0",textTransform:value?"uppercase":"none",pointerEvents:"none",transition:"all 0.2s",zIndex:2}}>{label}</label>
//         <select name={name} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:value?"white":"rgba(255,255,255,0.7)",fontFamily:"'Inter', sans-serif",fontSize:14,padding:value?"28px 16px 12px":"20px 16px",boxSizing:"border-box",cursor:"pointer",appearance:"none"}}>
//           <option value="" style={{background:"#105B92"}}>Select...</option>
//           {options.map(o=><option key={o} value={o} style={{background:"#105B92"}}>{o}</option>)}
//         </select>
//         <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.5)",pointerEvents:"none",fontSize:12}}>⌵</div>
//       </div>
//       {error&&<p style={{fontSize:11,color:"#f87171",marginTop:6,paddingLeft:4,fontWeight:500}}>⚠ {error}</p>}
//     </div>
//   );
// }

// function GradientButton({label,onClick,loading,fullWidth=false,icon=null}){
//   return(
//     <button onClick={onClick} disabled={loading} style={{
//       width:fullWidth?"100%":"auto",
//       padding:"14px 28px",
//       background:loading?"rgba(255,255,255,0.2)":"linear-gradient(135deg, #ffffff, #e0f0ff)",
//       border:"none",
//       borderRadius:40,
//       color:loading?"rgba(255,255,255,0.5)":"#105B92",
//       fontFamily:"'Inter', sans-serif",
//       fontWeight:700,
//       fontSize:13,
//       letterSpacing:"0.03em",
//       cursor:loading?"not-allowed":"pointer",
//       boxShadow:loading?"none":"0 8px 20px rgba(0,0,0,0.15)",
//       transition:"all 0.2s",
//       display:"flex",
//       alignItems:"center",
//       justifyContent:"center",
//       gap:8,
//       backdropFilter:"blur(4px)",
//     }}>
//       {loading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span>PROCESSING</>:<>{icon}{label}</>}
//     </button>
//   );
// }

// export default function App(){
//   const router=useRouter();
//   const[step,setStep]=useState(0);
//   const[activeBundle,setActiveBundle]=useState("growth");
//   const[paymentView,setPaymentView]=useState("methods");
//   const[processing,setProcessing]=useState(false);
//   const[submitting,setSubmitting]=useState(false);
//   const[errors,setErrors]=useState({});
//   const[packets,setPackets]=useState(8842);
//   const[welcomeMsg,setWelcomeMsg]=useState("");
//   const[form,setForm]=useState({companyName:"",contactName:"",email:"",phone:"",businessType:"",industry:"",gstNumber:"",country:"",address:"",pinCode:"",password:"",confirmPwd:"",agreeToTerms:false,upi:"",cardNumber:"",cardName:"",cardExpiry:"",cardCvv:""});
//   useEffect(()=>{const iv=setInterval(()=>setPackets(v=>v+Math.floor(Math.random()*40-10)),1100);return()=>clearInterval(iv);},[]);
//   const price=useMemo(()=>BUNDLES.find(b=>b.id===activeBundle),[activeBundle]);
//   const handleChange=(e)=>{const n=e.target.name,v=e.target.type==="checkbox"?e.target.checked:e.target.value;setForm(p=>({...p,[n]:v}));if(errors[n])setErrors(p=>({...p,[n]:null}));};
//   const validate=()=>{
//     const e={};
//     if(step===0){
//       if(!form.companyName.trim()) e.companyName="Required";
//       if(!form.contactName.trim()) e.contactName="Required";
//       if(!/^\S+@\S+\.\S+$/.test(form.email)) e.email="Invalid email";
//       if(!/^\d{10}$/.test(form.phone)) e.phone="10 digits required";
//     }
//     if(step===1){
//       if(!form.businessType) e.businessType="Select type";
//       if(!form.industry) e.industry="Select industry";
//       if(form.gstNumber&&!/^[0-9A-Z]{15}$/.test(form.gstNumber.toUpperCase())) e.gstNumber="Must be 15 alphanumeric chars";
//     }
//     if(step===2){
//       if(!form.country) e.country="Select country";
//       if(form.address.length<5) e.address="Too short";
//       if(!/^\d{6}$/.test(form.pinCode)) e.pinCode="6 digits required";
//     }
//     if(step===4){
//       if(form.password.length<8) e.password="Min 8 chars";
//       if(form.password!==form.confirmPwd) e.confirmPwd="No match";
//       if(!form.agreeToTerms) e.agreeToTerms="You must agree to terms";
//     }
//     setErrors(e);
//     return Object.keys(e).length===0;
//   };
//   const next=()=>{if(validate())setStep(s=>s+1);};
//   const back=()=>{setErrors({});if(step===5&&paymentView!=="methods"){setPaymentView("methods");return;}setStep(s=>s-1);};

//   const handleSubmit=async(paymentType)=>{
//     setProcessing(true);setSubmitting(true);setErrors({});
//     try{
//       const validationRaw=await callClaude([{role:"user",content:`Validate this ERP registration. Respond ONLY in JSON (no markdown): {"valid":true,"issues":[]} Data — Company:"${form.companyName}", Email:"${form.email}", Phone:"${form.phone}", Business:"${form.businessType}", Industry:"${form.industry}". Return valid:false with issues if data looks fake or suspicious.`}]);
//       if(validationRaw!=="__SKIP__"){
//         let aiResult={valid:true,issues:[]};
//         try{aiResult=JSON.parse(validationRaw.replace(/```json|```/g,"").trim());}catch{}
//         if(!aiResult.valid){setErrors({general:"AI Review: "+(aiResult.issues?.join(", ")||"Please check your details.")});setProcessing(false);setSubmitting(false);return;}
//       }

//       const response=await fetch("/api/company/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
//         companyName:  form.companyName,
//         contactName:  form.contactName,
//         email:        form.email,
//         phone:        form.phone,
//         country:      form.country,
//         address:      form.address,
//         pinCode:      form.pinCode,
//         password:     form.password,
//         agreeToTerms: form.agreeToTerms,
//         ...(form.gstNumber.trim() && { gstNumber: form.gstNumber.trim().toUpperCase() }),
//         businessType: form.businessType,
//         industry:     form.industry,
//         plan:         activeBundle,
//         paymentMethod:paymentType,
//       })});
//       if(!response.ok){const errData=await response.json().catch(()=>({}));throw new Error(errData.message||"Registration failed.");}

//       const payLabel={upi:"UPI",card:"card",netbanking:"net banking",cash:"cash",paylater:"Pay Later (Net-30)",trial:"1 Week Free Trial"}[paymentType]||paymentType;
//       const welcomeRaw=await callClaude([{role:"user",content:`Write a warm 2-sentence welcome for "${form.companyName}" (${form.industry}) who registered for the ${price?.name} ERP plan via ${payLabel}. Professional and exciting. No quotes.`}]);
//       if(welcomeRaw==="__SKIP__"||!welcomeRaw.trim()){
//         setWelcomeMsg(`Welcome aboard, ${form.companyName}! Your ${price?.name} ERP plan is now active. Let's build something great together.`);
//       }else{
//         setWelcomeMsg(welcomeRaw.trim());
//       }

//       setProcessing(false);setSubmitting(false);setStep(6);
//       setTimeout(()=>router.push("/signin"),4000);
//     }catch(err){
//       setErrors({general:err.message||"Something went wrong. Please try again."});
//       setProcessing(false);setSubmitting(false);
//     }
//   };

//   const BackBtn=()=><button onClick={()=>setPaymentView("methods")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:"0.05em",marginBottom:24,display:"flex",alignItems:"center",gap:6,padding:0}}>← Back to methods</button>;

//   const renderPaymentDetail=()=>{
//     if(paymentView==="upi")return(<div><BackBtn/><GlassInput label="UPI ID" name="upi" value={form.upi} onChange={handleChange}/><p style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:24}}>e.g. name@okaxis · name@ybl · name@paytm</p><GradientButton label={`PAY ₹${price?.price.toLocaleString()} VIA UPI`} onClick={()=>handleSubmit("upi")} loading={submitting} fullWidth/></div>);
//     if(paymentView==="card")return(<div><BackBtn/><GlassInput label="Card Number" name="cardNumber" value={form.cardNumber} onChange={handleChange}/><GlassInput label="Name on Card" name="cardName" value={form.cardName} onChange={handleChange}/><div style={{display:"flex",gap:12}}><div style={{flex:1}}><GlassInput label="Expiry MM/YY" name="cardExpiry" value={form.cardExpiry} onChange={handleChange}/></div><div style={{flex:1}}><GlassInput label="CVV" name="cardCvv" value={form.cardCvv} onChange={handleChange} type="password"/></div></div><GradientButton label={`PAY ₹${price?.price.toLocaleString()} SECURELY`} onClick={()=>handleSubmit("card")} loading={submitting} fullWidth/></div>);
//     if(paymentView==="netbanking")return(<div><BackBtn/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>{["SBI","HDFC","ICICI","Axis","Kotak","PNB"].map(bank=><button key={bank} style={{padding:"12px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:12,color:"white",fontFamily:"'Inter', sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.2)";e.currentTarget.style.borderColor="white";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";}}>{bank}</button>)}</div><GradientButton label={`PAY ₹${price?.price.toLocaleString()} VIA NET BANKING`} onClick={()=>handleSubmit("netbanking")} loading={submitting} fullWidth/></div>);
//     if(paymentView==="cash")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(251,146,60,0.15)",border:"1px solid rgba(251,146,60,0.4)",borderRadius:16,marginBottom:20}}><div style={{fontSize:12,color:"#fb923c",fontWeight:700,marginBottom:10}}>💵 Cash Payment Instructions</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.8}}>1. Account created <span style={{color:"#fb923c",fontWeight:700}}>immediately</span><br/>2. Visit office within <span style={{color:"#fb923c",fontWeight:700}}>7 working days</span><br/>3. Pay <span style={{color:"#fb923c",fontWeight:700}}>₹{price?.price.toLocaleString()}</span> at billing counter<br/>4. Collect receipt</div></div><div style={{padding:"12px 16px",background:"rgba(255,255,255,0.08)",borderRadius:12,marginBottom:24}}><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",marginBottom:6}}>OFFICE ADDRESS</div><div style={{fontSize:12,color:"white",lineHeight:1.5}}>AITS ERP Global, 4th Floor,<br/>Tech Park, Whitefield, Bengaluru — 560066</div></div><GradientButton label="CONFIRM CASH PAYMENT" onClick={()=>handleSubmit("cash")} loading={submitting} fullWidth/></div>);
//     if(paymentView==="paylater")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.4)",borderRadius:16,marginBottom:20}}><div style={{fontSize:12,color:"#a855f7",fontWeight:700,marginBottom:10}}>🕐 Pay Later — Net 30</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.8}}>• Full access starts <span style={{color:"#a855f7",fontWeight:700}}>immediately</span><br/>• Invoice of <span style={{color:"#a855f7",fontWeight:700}}>₹{price?.price.toLocaleString()}</span> sent to email<br/>• Payment due within <span style={{color:"#a855f7",fontWeight:700}}>30 days</span><br/>• For verified businesses only</div></div><div style={{padding:"12px 16px",background:"rgba(255,255,255,0.08)",borderRadius:12,marginBottom:24,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:18}}>📧</span><div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700,letterSpacing:"0.1em"}}>INVOICE WILL BE SENT TO</div><div style={{fontSize:13,color:"white",marginTop:4,fontWeight:500}}>{form.email||"your registered email"}</div></div></div><GradientButton label="CONFIRM · PAY WITHIN 30 DAYS" onClick={()=>handleSubmit("paylater")} loading={submitting} fullWidth/></div>);
//     if(paymentView==="trial")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(0,245,255,0.1)",border:"1px solid rgba(0,245,255,0.3)",borderRadius:16,marginBottom:20}}><div style={{fontSize:12,color:"#00f5ff",fontWeight:700,marginBottom:10}}>🎁 1 Week Free Trial</div><div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.8}}>• <span style={{color:"#00f5ff",fontWeight:700}}>100% free</span> for 7 days — no card required<br/>• Full access to <span style={{color:"#00f5ff",fontWeight:700}}>{price?.name} Plan</span> features<br/>• Auto-reminder on Day 5<br/>• Upgrade anytime, cancel anytime</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>{[{d:"Day 1",t:"Full Access"},{d:"Day 5",t:"Reminder"},{d:"Day 7",t:"Trial Ends"}].map(item=><div key={item.d} style={{padding:"12px",background:"rgba(255,255,255,0.06)",borderRadius:12,textAlign:"center"}}><div style={{fontSize:11,color:"#00f5ff",fontWeight:700}}>{item.d}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:4}}>{item.t}</div></div>)}</div><GradientButton label="START FREE TRIAL → 7 DAYS" onClick={()=>handleSubmit("trial")} loading={submitting} fullWidth/></div>);
//   };

//   return(
//     <div style={{width:"100vw",height:"100vh",position:"relative",overflow:"hidden",background:"#105B92",fontFamily:"'Inter', sans-serif"}}>
//       <style>{`
//         @keyframes scanDown{0%{top:-3px}100%{top:100%}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}@keyframes countdown{from{width:100%}to{width:0%}}input:-webkit-autofill,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.1) inset!important;-webkit-text-fill-color:white!important;}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.3);border-radius:4px}select option{background:#105B92;color:white}
//         .glass-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);border-radius:32px;box-shadow:0 25px 45px -12px rgba(0,0,0,0.25);}
//         .step-indicator{transition:all 0.3s cubic-bezier(0.4,0,0.2,1);}
//       `}</style>
//       <WorldMapCanvas/>
//       <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)",animation:"scanDown 8s linear infinite",pointerEvents:"none",zIndex:5}}/>

//       {/* Top Navigation Bar */}
//       <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 32px",background:"rgba(16,91,146,0.7)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.15)"}}>
//         <div style={{display:"flex",alignItems:"center",gap:16}}>
//           <div style={{width:36,height:36,background:"white",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
//             <span style={{fontSize:20,color:"#105B92"}}>◆</span>
//           </div>
//           <div>
//             <div style={{fontSize:13,fontWeight:700,color:"white",letterSpacing:"0.15em"}}>AITS ERP GLOBAL</div>
//             <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:"0.1em"}}>CLOUD REGISTRATION PORTAL</div>
//           </div>
//         </div>
//         <div style={{display:"flex",gap:32,alignItems:"center"}}>
//           {[{l:"NODES",v:String(CITIES.length)},{l:"LINKS",v:String(CONNECTIONS.length)},{l:"PKT/S",v:packets.toLocaleString()},{l:"UPTIME",v:"99.98%"}].map(s=><div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:"white"}}>{s.v}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.5)",letterSpacing:"0.15em",marginTop:2}}>{s.l}</div></div>)}
//           <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px",background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:30}}>
//             <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e",animation:"blink 1.5s ease infinite"}}/>
//             <span style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:"0.1em"}}>LIVE</span>
//           </div>
//         </div>
//       </div>

//       {/* Main Form Card */}
//       <div style={{position:"absolute",inset:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",paddingTop:80,paddingBottom:40,overflowY:"auto"}}>
//         <div style={{width:"100%",maxWidth:520,margin:"0 auto",padding:"0 20px",animation:"fadeUp 0.5s ease both"}}>
//           <div className="glass-card" style={{overflow:"hidden"}}>
//             <div style={{padding:"28px 32px 0"}}>
//               {step<6 && (
//                 <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:24}}>
//                   {STEPS.slice(0,-1).map((s,i)=>(
//                     <div key={i} style={{display:"flex",alignItems:"center",flex:1}}>
//                       <div className="step-indicator" style={{
//                         width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
//                         fontSize:11,fontWeight:700,
//                         background:i<step?"white":i===step?"rgba(255,255,255,0.2)":"transparent",
//                         border:i===step?"1px solid white":i<step?"none":"1px solid rgba(255,255,255,0.3)",
//                         color:i<=step?"#105B92":"rgba(255,255,255,0.5)",
//                         boxShadow:i===step?"0 0 12px rgba(255,255,255,0.4)":"none"
//                       }}>
//                         {i<step?"✓":String(i+1)}
//                       </div>
//                       {i<STEPS.length-2 && <div style={{flex:1,height:1,margin:"0 8px",background:"rgba(255,255,255,0.2)",position:"relative",overflow:"hidden"}}>
//                         <div style={{position:"absolute",inset:0,background:"white",transform:`scaleX(${i<step?1:0})`,transformOrigin:"left",transition:"transform 0.4s ease"}}/>
//                       </div>}
//                     </div>
//                   ))}
//                 </div>
//               )}
//               <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:6}}>{step<6?`STEP ${step+1} / 6`:"COMPLETE"}</div>
//               <h1 style={{fontSize:28,fontWeight:700,color:"white",letterSpacing:"-0.02em",marginBottom:8,fontFamily:"'Inter', sans-serif"}}>
//                 {["Company Identity","Business Profile","Office Address","Choose Plan","Set Password","Complete Payment","You're Live"][step]}
//               </h1>
//               {step>=3 && step<6 && (
//                 <div style={{display:"flex",alignItems:"center",gap:12,marginTop:16,marginBottom:8,padding:"12px 16px",background:"rgba(255,255,255,0.08)",borderRadius:20}}>
//                   <div style={{width:8,height:8,borderRadius:"50%",background:"white",boxShadow:"0 0 8px white",animation:"pulse 1.5s infinite"}}/>
//                   <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",flex:1,fontWeight:500}}>{price?.name} Plan</span>
//                   <span style={{fontSize:18,fontWeight:700,color:"white"}}>₹{price?.price.toLocaleString()}</span>
//                 </div>
//               )}
//             </div>
//             <div style={{padding:"20px 32px 32px"}}>
//               {errors.general && (
//                 <div style={{marginBottom:20,padding:"12px 16px",background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:16}}>
//                   <p style={{fontSize:12,color:"#f87171",margin:0,fontWeight:500}}>⚠ {errors.general}</p>
//                 </div>
//               )}
//               {step===0 && (
//                 <>
//                   <GlassInput label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName}/>
//                   <GlassInput label="Contact Person Name" name="contactName" value={form.contactName} onChange={handleChange} error={errors.contactName}/>
//                   <GlassInput label="Official Email" name="email" value={form.email} onChange={handleChange} error={errors.email} type="email"/>
//                   <GlassInput label="Phone Number (10 digits)" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} type="tel"/>
//                 </>
//               )}
//               {step===1 && (
//                 <>
//                   <GlassSelect label="Business Structure" name="businessType" value={form.businessType} onChange={handleChange} options={BUSINESS_TYPES} error={errors.businessType}/>
//                   <GlassSelect label="Industry Vertical" name="industry" value={form.industry} onChange={handleChange} options={INDUSTRIES} error={errors.industry}/>
//                   <GlassInput label="GST Number (optional)" name="gstNumber" value={form.gstNumber} onChange={handleChange} error={errors.gstNumber}/>
//                   <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:-8,marginBottom:0,paddingLeft:4}}>15-character GST · leave blank if not registered</p>
//                 </>
//               )}
//               {step===2 && (
//                 <>
//                   <GlassSelect label="Country" name="country" value={form.country} onChange={handleChange} options={["India","United States","United Kingdom","UAE","Singapore","Australia","Canada","Germany","Other"]} error={errors.country}/>
//                   <GlassInput label="Full Address" name="address" value={form.address} onChange={handleChange} error={errors.address} multiline/>
//                   <GlassInput label="PIN / ZIP Code (6 digits)" name="pinCode" value={form.pinCode} onChange={handleChange} error={errors.pinCode}/>
//                 </>
//               )}
//               {step===3 && (
//                 <div>
//                   {BUNDLES.map(b=>{
//                     const sel=activeBundle===b.id;
//                     return(
//                       <div key={b.id} onClick={()=>setActiveBundle(b.id)} style={{
//                         position:"relative",
//                         padding:"20px 24px",
//                         borderRadius:24,
//                         cursor:"pointer",
//                         marginBottom:16,
//                         border:sel?"2px solid white":"1px solid rgba(255,255,255,0.2)",
//                         background:sel?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.05)",
//                         backdropFilter:"blur(4px)",
//                         transition:"all 0.25s"
//                       }}>
//                         {b.popular && <div style={{position:"absolute",top:-10,right:20,background:"white",color:"#105B92",fontSize:9,fontWeight:800,padding:"4px 12px",borderRadius:30,letterSpacing:"0.1em"}}>RECOMMENDED</div>}
//                         <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
//                           <div>
//                             <div style={{fontSize:16,fontWeight:700,color:"white",fontFamily:"'Inter', sans-serif"}}>{b.name} Plan</div>
//                             <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:4}}>{b.id==="starter"?"Core essentials":"Full suite"}</div>
//                           </div>
//                           <div style={{textAlign:"right"}}>
//                             <div style={{fontSize:24,fontWeight:700,color:"white"}}>₹{b.price.toLocaleString()}</div>
//                             <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>/ year</div>
//                           </div>
//                         </div>
//                         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
//                           {b.features.map(f=>(
//                             <div key={f} style={{display:"flex",alignItems:"center",gap:8}}>
//                               <div style={{width:5,height:5,borderRadius:"50%",background:sel?"white":"rgba(255,255,255,0.4)"}}/>
//                               <span style={{fontSize:11,color:sel?"white":"rgba(255,255,255,0.6)",fontWeight:500}}>{f}</span>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//               {step===4 && (
//                 <>
//                   <GlassInput label="Create Password" name="password" value={form.password} onChange={handleChange} error={errors.password} type="password"/>
//                   {form.password.length>0 && (
//                     <div style={{marginBottom:20}}>
//                       <div style={{display:"flex",gap:4,marginBottom:8}}>
//                         {[0,1,2,3].map(i=>{
//                           const strength=Math.min(4,Math.floor(form.password.length/2));
//                           const colors=["#f87171","#fb923c","#facc15","#4ade80"];
//                           return <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<strength?colors[Math.min(strength-1,3)]:"rgba(255,255,255,0.2)",transition:"all 0.3s"}}/>;
//                         })}
//                       </div>
//                       <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:500}}>
//                         {form.password.length<4?"Weak":form.password.length<6?"Fair":form.password.length<8?"Good":"Strong"}
//                       </div>
//                     </div>
//                   )}
//                   <GlassInput label="Confirm Password" name="confirmPwd" value={form.confirmPwd} onChange={handleChange} error={errors.confirmPwd} type="password"/>
//                   <div onClick={()=>setForm(p=>({...p,agreeToTerms:!p.agreeToTerms}))} style={{
//                     display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:20,
//                     background:"rgba(255,255,255,0.05)",border:errors.agreeToTerms?"1px solid rgba(248,113,113,0.5)":"1px solid rgba(255,255,255,0.15)",
//                     cursor:"pointer",marginTop:8
//                   }}>
//                     <div style={{
//                       width:22,height:22,borderRadius:8,background:form.agreeToTerms?"white":"transparent",
//                       border:"1px solid "+(form.agreeToTerms?"transparent":"rgba(255,255,255,0.4)"),
//                       display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#105B92",fontWeight:700
//                     }}>{form.agreeToTerms&&"✓"}</div>
//                     <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.4}}>I confirm all details are accurate and accept the <span style={{color:"white",fontWeight:600}}>Terms</span></span>
//                   </div>
//                   {errors.agreeToTerms && <p style={{fontSize:11,color:"#f87171",marginTop:8,paddingLeft:4}}>⚠ {errors.agreeToTerms}</p>}
//                 </>
//               )}
//               {step===5 && (
//                 <div>{paymentView==="methods"?(
//                   <div>
//                     <div style={{padding:"14px 18px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:20,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
//                       <span style={{fontSize:16}}>🔐</span>
//                       <span style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:500}}>256-bit SSL Encrypted · PCI DSS Compliant</span>
//                     </div>
//                     {PAYMENT_METHODS.map(m=>(
//                       <button key={m.id} onClick={()=>setPaymentView(m.id)} style={{
//                         width:"100%",padding:"16px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",
//                         borderRadius:20,display:"flex",alignItems:"center",gap:16,cursor:"pointer",textAlign:"left",marginBottom:12,
//                         transition:"all 0.2s"
//                       }} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.borderColor="white";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}>
//                         <div style={{width:44,height:44,background:"rgba(255,255,255,0.1)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{m.icon}</div>
//                         <div style={{flex:1}}>
//                           <div style={{display:"flex",alignItems:"center",gap:10}}>
//                             <span style={{fontWeight:700,fontSize:14,color:"white"}}>{m.title}</span>
//                             {m.badge && <span style={{fontSize:9,fontWeight:800,background:"rgba(255,255,255,0.15)",color:m.badgeColor||"white",padding:"3px 9px",borderRadius:20}}>{m.badge}</span>}
//                           </div>
//                           <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:4}}>{m.sub}</div>
//                         </div>
//                         <span style={{color:"rgba(255,255,255,0.4)",fontSize:20}}>→</span>
//                       </button>
//                     ))}
//                   </div>
//                 ):renderPaymentDetail()}</div>
//               )}
//               {step===6 && (
//                 <div style={{textAlign:"center",padding:"20px 0 10px"}}>
//                   <div style={{position:"relative",display:"inline-block",marginBottom:28}}>
//                     <div style={{width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:52,border:"2px solid rgba(255,255,255,0.3)",boxShadow:"0 0 40px rgba(255,255,255,0.2)"}}>🎉</div>
//                     <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)",animation:"spin 6s linear infinite"}}/>
//                   </div>
//                   <h2 style={{fontSize:26,fontWeight:700,color:"white",marginBottom:12}}>Registration Complete!</h2>
//                   <p style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6,marginBottom:8}}>Your <span style={{color:"white",fontWeight:700}}>{price?.name} Plan</span> is now active.</p>
//                   {welcomeMsg ? (
//                     <div style={{margin:"20px 0",padding:"16px 20px",background:"rgba(255,255,255,0.08)",borderRadius:20,textAlign:"left"}}>
//                       <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>✨ AI WELCOME</div>
//                       <p style={{fontSize:13,color:"white",lineHeight:1.6,margin:0,fontStyle:"italic"}}>"{welcomeMsg}"</p>
//                     </div>
//                   ):(
//                     <div style={{margin:"20px 0",padding:"14px",background:"rgba(255,255,255,0.05)",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
//                       <div style={{animation:"spin 1s linear infinite",display:"inline-block",color:"white"}}>◌</div>
//                       <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Crafting welcome...</span>
//                     </div>
//                   )}
//                   <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:20}}>Check your email for login credentials.</p>
//                   <div style={{marginBottom:24}}>
//                     <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:8,letterSpacing:"0.1em"}}>REDIRECTING TO SIGN IN IN 4s...</div>
//                     <div style={{height:3,background:"rgba(255,255,255,0.2)",borderRadius:3,overflow:"hidden"}}>
//                       <div style={{height:"100%",background:"white",animation:"countdown 4s linear forwards",borderRadius:3}}/>
//                     </div>
//                   </div>
//                   <GradientButton label="GO TO SIGN IN →" onClick={()=>router.push("/signin")} fullWidth/>
//                 </div>
//               )}
//               {step<6 && !(step===5 && paymentView!=="methods") && (
//                 <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:32,paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.1)"}}>
//                   <button disabled={step===0} onClick={back} style={{
//                     background:"none",border:"none",fontSize:12,fontWeight:600,color:step===0?"transparent":"rgba(255,255,255,0.6)",
//                     letterSpacing:"0.05em",cursor:step===0?"default":"pointer",padding:0,transition:"color 0.2s"
//                   }}>← Back</button>
//                   <GradientButton label={step===4?"Review & Pay →":step===3?"Confirm Plan →":"Continue →"} onClick={next} fullWidth={false} icon={step!==4?"→":null}/>
//                 </div>
//               )}
//             </div>
//           </div>
//           {step<6 && (
//             <p style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:20,letterSpacing:"0.1em"}}>
//               Protected by AITS Security · <span style={{opacity:0.7}}>Terms</span> · <span style={{opacity:0.7}}>Privacy</span>
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Bottom Bar */}
//       <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 32px",background:"rgba(16,91,146,0.7)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.15)"}}>
//         <div style={{display:"flex",gap:32}}>
//           {["ENCRYPTION: AES-256","PROTOCOL: TLS 1.3","AVG LATENCY: 4ms"].map(l=><span key={l} style={{fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em"}}>{l}</span>)}
//         </div>
//         <div style={{display:"flex",alignItems:"center",gap:10}}>
//           <span style={{fontSize:9,color:"rgba(255,255,255,0.6)",letterSpacing:"0.1em"}}>SYS TIME</span>
//           <LiveClock/>
//         </div>
//       </div>

//       {/* Processing Overlay */}
//       {processing && (
//         <div style={{position:"fixed",inset:0,background:"rgba(16,91,146,0.95)",backdropFilter:"blur(16px)",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
//           <div style={{position:"relative",width:80,height:80,marginBottom:32}}>
//             <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)"}}/>
//             <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"white",animation:"spin 0.9s linear infinite"}}/>
//             <div style={{position:"absolute",inset:12,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(255,255,255,0.5)",animation:"spin 1.3s linear infinite reverse"}}/>
//             <div style={{position:"absolute",inset:26,borderRadius:"50%",background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"white"}}>◆</div>
//           </div>
//           <div style={{fontSize:13,fontWeight:700,color:"white",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:10}}>Processing</div>
//           <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:500}}>AI validating · Securing your account...</div>
//         </div>
//       )}
//     </div>
//   );
// }
