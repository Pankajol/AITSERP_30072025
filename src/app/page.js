"use client";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  HiShoppingBag, HiChartBar, HiTruck, HiUserGroup,
  HiDocumentText, HiCog, HiX, HiCheckCircle,
} from "react-icons/hi";
import {
  FiFlag, FiShoppingCart, FiDollarSign,
  FiArrowRight, FiZap, FiCheck, FiMail,
  FiMessageCircle, FiInstagram, FiTwitter,
  FiLinkedin, FiYoutube, FiAlertCircle,
  FiClock, FiShield, FiEye, FiEyeOff,
  FiPackage, FiBarChart2, FiUsers, FiSettings,
  FiDatabase, FiLock, FiGlobe, FiPhoneCall,
  FiStar, FiTrendingUp, FiCpu, FiGrid,
  FiChevronDown, FiChevronRight, FiMenu,
} from "react-icons/fi";

/* ═══════════════════════════════════════
   TRIAL UTILITY
   ═══════════════════════════════════════ */
export const TRIAL_KEY = "aits_trial";
export const TRIAL_DAYS = 14;

export function startTrial(userData) {
  const record = {
    ...userData,
    trialStart: Date.now(),
    trialEnd: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    status: "active",
    id: crypto.randomUUID(),
  };
  localStorage.setItem(TRIAL_KEY, JSON.stringify(record));
  return record;
}

export function getTrialRecord() {
  try {
    const raw = localStorage.getItem(TRIAL_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (record.status === "active" && Date.now() > record.trialEnd) {
      record.status = "expired";
      localStorage.setItem(TRIAL_KEY, JSON.stringify(record));
    }
    return record;
  } catch { return null; }
}

export function getTrialDaysLeft(record) {
  if (!record) return 0;
  const ms = record.trialEnd - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isTrialActive(record) {
  return record?.status === "active" && Date.now() <= record.trialEnd;
}

export function clearTrial() {
  localStorage.removeItem(TRIAL_KEY);
}

/* ─── Claude AI helper ─── */
async function callClaude(messages) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages,
      }),
    });
    if (!res.ok) return "__SKIP__";
    const data = await res.json();
    return data.content?.find(b => b.type === "text")?.text || "__SKIP__";
  } catch { return "__SKIP__"; }
}

/* ─── Helpers ─── */
function Counter({ end, suffix = "", duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) ob.observe(ref.current);
    return () => ob.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let s = 0;
    const step = end / (duration * 60);
    const t = setInterval(() => {
      s += step;
      if (s >= end) { setCount(end); clearInterval(t); } else setCount(Math.floor(s));
    }, 1000 / 60);
    return () => clearInterval(t);
  }, [started, end, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ─── Trial Modal (Light) ─── */
function TrialModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "",
    employees: "", industry: "", password: "", plan: "Professional",
  });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.company.trim()) e.company = "Company name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Valid 10-digit phone required";
    if (!form.employees) e.employees = "Please select team size";
    if (!form.industry) e.industry = "Please select industry";
    if (form.password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setErrors({});
    try {
      const validationRaw = await callClaude([{
        role: "user",
        content: `Validate this ERP trial registration. Respond ONLY in JSON (no markdown): {"valid":true,"issues":[]}
Data — Name:"${form.name}", Company:"${form.company}", Email:"${form.email}", Phone:"${form.phone}", Industry:"${form.industry}".
Return valid:false with issues array if data looks fake, suspicious, or clearly invalid.`,
      }]);

      if (validationRaw !== "__SKIP__") {
        let aiResult = { valid: true, issues: [] };
        try { aiResult = JSON.parse(validationRaw.replace(/```json|```/g, "").trim()); } catch {}
        if (!aiResult.valid) {
          setErrors({ general: "Validation failed: " + (aiResult.issues?.join(", ") || "Please check your details.") });
          setLoading(false); return;
        }
      }

      await new Promise(r => setTimeout(r, 1200));
      const record = startTrial(form);
      setLoading(false);
      setStep(2);
      onSuccess?.(record);
    } catch (err) {
      setErrors({ general: err.message || "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  const fieldConfig = [
    { k: "name",     label: "Full Name",       type: "text",  placeholder: "Pankaj Agarwal",         half: true },
    { k: "company",  label: "Company Name",    type: "text",  placeholder: "Agarwal Enterprises",    half: true },
    { k: "email",    label: "Work Email",      type: "email", placeholder: "you@company.com",        half: true },
    { k: "phone",    label: "Phone Number",    type: "tel",   placeholder: "9876543210",             half: true },
  ];

  const selectFields = [
    { k: "employees", label: "Team Size", options: ["1–5 employees", "6–25 employees", "26–100 employees", "101–500 employees", "500+ employees"] },
    { k: "industry",  label: "Industry",  options: ["Manufacturing", "Trading / Distribution", "Retail", "Construction", "Healthcare", "Education", "IT / Software", "Food & Beverage", "Other"] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 20, width: "100%", maxWidth: 560, padding: "36px 36px 28px", position: "relative", fontFamily: "'Plus Jakarta Sans',sans-serif", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.15)" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <HiX size={16} />
        </button>

        {step === 1 && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#C2410C", fontWeight: 600, marginBottom: 16 }}>
              <FiShield size={12} /> 14-Day Free Trial — No Credit Card Required
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 6 }}>Activate your free trial</h2>
            <p style={{ fontSize: 14, color: "#64748B" }}>Full platform access. Auto-deactivated after 14 days — no surprise charges.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {fieldConfig.map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <input
                  type={type} value={form[k]} placeholder={placeholder}
                  onChange={ev => { setForm(f => ({ ...f, [k]: ev.target.value })); setErrors(er => ({ ...er, [k]: "" })); }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: errors[k] ? "#FFF5F5" : "#F8FAFC", border: `1.5px solid ${errors[k] ? "#EF4444" : "#E2E8F0"}`, color: "#0F172A", fontSize: 14, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif", transition: "border-color 0.2s" }}
                />
                {errors[k] && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors[k]}</p>}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {selectFields.map(({ k, label, options }) => (
              <div key={k}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <select value={form[k]} onChange={e => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: errors[k] ? "#FFF5F5" : "#F8FAFC", border: `1.5px solid ${errors[k] ? "#EF4444" : "#E2E8F0"}`, color: form[k] ? "#0F172A" : "#94A3B8", fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: "pointer" }}>
                  <option value="">Select {label}</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors[k] && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors[k]}</p>}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Create Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"} value={form.password} placeholder="Min 8 characters"
                onChange={ev => { setForm(f => ({ ...f, password: ev.target.value })); setErrors(er => ({ ...er, password: "" })); }}
                style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: 10, background: errors.password ? "#FFF5F5" : "#F8FAFC", border: `1.5px solid ${errors.password ? "#EF4444" : "#E2E8F0"}`, color: "#0F172A", fontSize: 14, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              />
              <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94A3B8", cursor: "pointer" }}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {errors.password && <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>{errors.password}</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Trial Plan</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { v: "Starter",      price: "₹999/mo",   color: "#475569" },
                { v: "Professional", price: "₹2,499/mo", color: "#C2410C" },
                { v: "Enterprise",   price: "Custom",     color: "#7C3AED" },
              ].map(({ v, price, color }) => (
                <div key={v} onClick={() => setForm(f => ({ ...f, plan: v }))}
                  style={{ padding: "12px", borderRadius: 10, border: `2px solid ${form.plan === v ? color : "#E2E8F0"}`, cursor: "pointer", background: form.plan === v ? `${color}08` : "#F8FAFC", transition: "all 0.15s" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: form.plan === v ? color : "#374151", marginBottom: 2 }}>{v}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8" }}>{price}</p>
                </div>
              ))}
            </div>
          </div>

          {errors.general && (
            <div style={{ background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#DC2626" }}>
              <FiAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {errors.general}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: loading ? "#FED7AA" : "linear-gradient(135deg, #EA580C, #F97316)", color: "#FFFFFF", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: loading ? "none" : "0 4px 20px rgba(234,88,12,0.35)" }}>
            {loading ? <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
              Validating &amp; Activating…
            </> : <>Activate Free Trial <FiArrowRight size={16} /></>}
          </button>

          <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
            By signing up you agree to our <a href="#" style={{ color: "#C2410C" }}>Terms</a> and <a href="#" style={{ color: "#C2410C" }}>Privacy Policy</a>
          </p>
        </>}

        {step === 2 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
              style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #10B981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36, color: "#FFFFFF" }}>
              <HiCheckCircle />
            </motion.div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: "#0F172A", marginBottom: 10, letterSpacing: "-0.03em" }}>You're all set! 🎉</h2>
            <p style={{ color: "#64748B", fontSize: 15, marginBottom: 20, lineHeight: 1.7 }}>
              Welcome, <strong style={{ color: "#0F172A" }}>{form.name}</strong>.<br />
              Your <strong style={{ color: "#EA580C" }}>{form.plan}</strong> trial is now active for <strong style={{ color: "#EA580C" }}>14 days</strong>.
            </p>

            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "14px 20px", marginBottom: 16, fontSize: 13, color: "#9A3412" }}>
              <FiClock size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
              Trial expires: <strong>{new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 10 }}>Your next steps:</p>
              {[
                "Set up your company profile & GST details",
                "Add your team members & assign roles",
                "Import your vendor/customer master data",
                "Configure your chart of accounts",
                "Run your first purchase or sales order",
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, fontSize: 13, color: "#475569" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#EA580C", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  {s}
                </div>
              ))}
            </div>

            <button onClick={onClose}
              style={{ background: "linear-gradient(135deg, #EA580C, #F97316)", color: "#fff", border: "none", cursor: "pointer", width: "100%", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(234,88,12,0.3)" }}>
              Go to Dashboard <FiArrowRight size={16} />
            </button>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 12 }}>
              Login details sent to <strong style={{ color: "#64748B" }}>{form.email}</strong>
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════ */
export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const [showModal, setShowModal] = useState(false);
  const [trialRecord, setTrialRecord] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { setTrialRecord(getTrialRecord()); }, []);

  const CONTACT = {
    whatsapp: "7738961799",
    email: "pankajal2099@gmail.com",
    instagram: "https://instagram.com/aits_erp",
    twitter: "https://twitter.com/aits_erp",
    linkedin: "https://linkedin.com/company/aits-erp",
    youtube: "https://youtube.com/@aits_erp",
  };

  const coreModules = [
    { icon: <HiShoppingBag />,    title: "Procure to Pay",        desc: "Vendor onboarding, RFQ, purchase orders, GRN, invoice matching, three-way reconciliation, and automated payment scheduling with bank integration.", color: "#EA580C", bg: "#FFF7ED" },
    { icon: <HiChartBar />,       title: "Inventory Management",  desc: "Real-time stock tracking across multi-warehouse locations. Batch & expiry management, reorder alerts, stock valuation (FIFO/LIFO/Avg), and barcode scanning.", color: "#2563EB", bg: "#EFF6FF" },
    { icon: <HiTruck />,          title: "Order to Cash",         desc: "Sales quotations, orders, delivery challan, e-way bill generation, GST-compliant invoicing, payment receipts, and ageing follow-up automation.", color: "#059669", bg: "#ECFDF5" },
    { icon: <HiCog />,            title: "Production & MFG",      desc: "Bill of Materials, production planning & control, work orders, shop-floor management, quality inspection, wastage tracking, and finished-goods costing.", color: "#7C3AED", bg: "#F5F3FF" },
    { icon: <HiUserGroup />,      title: "CRM & Sales",           desc: "Lead capture from multiple sources, opportunity pipeline, campaign ROI tracking, customer support ticketing, SLA management, and automated follow-up sequences.", color: "#DB2777", bg: "#FDF2F8" },
    { icon: <HiDocumentText />,   title: "Accounts & Finance",    desc: "Full double-entry accounting, GST returns (GSTR-1/3B), TDS/TCS compliance, P&L, balance sheet, cash-flow statements, and multi-bank reconciliation.", color: "#0891B2", bg: "#ECFEFF" },
    { icon: <FiUsers />,          title: "HR & Payroll",          desc: "Employee onboarding, attendance via biometric/app, leave management, PF/ESI/PT compliance, salary slips, Form 16, and appraisal workflows.", color: "#D97706", bg: "#FFFBEB" },
    { icon: <FiBarChart2 />,      title: "Reports & Analytics",   desc: "100+ pre-built reports. Custom dashboards with live KPIs, drill-down capability, scheduled email reports, and export to Excel/PDF.", color: "#16A34A", bg: "#F0FDF4" },
    { icon: <FiSettings />,       title: "System Administration", desc: "Role-based access control, audit trails, data backup, multi-company & multi-branch support, API access, and white-label customization.", color: "#6366F1", bg: "#EEF2FF" },
  ];

  const advancedModules = [
    { icon: <FiFlag />, title: "Election Management", badge: "Premium", badgeColor: "#D97706", badgeBg: "#FEF9C3", borderColor: "#FDE68A", bg: "#FFFBEB", desc: "Constituency & booth mapping, voter database with demographic filters, field-worker app, survey collection, rally & event planning, shadow expense register, opponent tracking, and real-time analytics dashboard." },
    { icon: <FiShoppingCart />, title: "Multi-Vendor Marketplace", badge: "Premium", badgeColor: "#059669", badgeBg: "#D1FAE5", borderColor: "#6EE7B7", bg: "#ECFDF5", desc: "Onboard vendors to sell products/services. Commission engine, vendor payout, customer reviews, coupon management, logistics integration, and a branded storefront for your business ecosystem." },
    { icon: <FiDollarSign />, title: "Services & Entertainment", badge: "Coming Soon", badgeColor: "#7C3AED", badgeBg: "#EDE9FE", borderColor: "#C4B5FD", bg: "#F5F3FF", desc: "Slot booking & calendar management for wedding planners, DJs, photographers, event managers. Dynamic pricing, vendor ratings, customer portal, and deposit/advance payment flows." },
  ];

  const workflow = [
    { step: "01", title: "Sign Up & Onboard", icon: <FiUsers />, color: "#EA580C", desc: "Create your account, set up company profile, GST details, financial year, and invite team members with role-based permissions." },
    { step: "02", title: "Import Your Data", icon: <FiDatabase />, color: "#2563EB", desc: "Upload your vendor/customer masters, opening stock, chart of accounts, and employee records via Excel templates or API." },
    { step: "03", title: "Configure Workflows", icon: <FiSettings />, color: "#7C3AED", desc: "Define approval hierarchies, payment terms, tax configurations, warehouse locations, and auto-alert thresholds." },
    { step: "04", title: "Go Live & Transact", icon: <FiTrendingUp />, color: "#059669", desc: "Start processing purchase orders, sales invoices, production orders, and payroll — everything in sync, in real time." },
    { step: "05", title: "Monitor & Optimize", icon: <FiBarChart2 />, color: "#D97706", desc: "Use live dashboards and 100+ reports to track KPIs, cash flow, stock health, and team performance. Make data-backed decisions." },
  ];

  const pricingPlans = [
    {
      name: "Starter", price: "₹999", period: "/month",
      desc: "Perfect for small businesses just getting started.",
      features: ["Procure to Pay", "Inventory Management", "Order to Cash", "Basic CRM", "GST Invoicing", "Standard Reports", "1 Company • 5 Users", "Email Support"],
      notIncluded: ["HR & Payroll", "Production Module", "Election Module", "Marketplace"],
      cta: "Start Free Trial", popular: false,
    },
    {
      name: "Professional", price: "₹2,499", period: "/month",
      desc: "Everything a growing business needs to scale.",
      features: ["All Starter features", "Full Accounts & Finance", "HR & Payroll", "Production & MFG", "Advanced CRM", "Custom Dashboards", "Multi-branch support", "10 Users", "Priority Support", "Election Module (add-on)", "Marketplace (add-on)"],
      notIncluded: [],
      cta: "Start Free Trial", popular: true,
    },
    {
      name: "Enterprise", price: "Custom", period: "",
      desc: "Built around your scale and specific requirements.",
      features: ["All Professional features", "Unlimited Users & Branches", "Dedicated Account Manager", "Custom Integrations (API)", "White Label / Custom Domain", "On-Premise / Private Cloud", "SLA-backed 24/7 Support", "Quarterly Business Reviews"],
      notIncluded: [],
      cta: "Contact Sales", popular: false,
    },
  ];

  const testimonials = [
    { name: "Ramesh Gupta", role: "MD, Gupta Steel Traders", quote: "We replaced 4 different software tools with Pankajal ERP. Our purchase and invoicing cycle dropped from 3 days to same-day. Worth every rupee.", stars: 5 },
    { name: "Priya Sharma", role: "CFO, Sharma Agro Exports", quote: "The GST compliance module alone saved us 2 days of manual work every month. GSTR-1 reconciliation is now fully automated.", stars: 5 },
    { name: "Kavitha Menon", role: "Operations Head, Menon Foods", quote: "The production planning module transformed our factory floor. We reduced raw material waste by 18% in the first quarter itself.", stars: 5 },
  ];

  const faqs = [
    { q: "Is my data safe on Pankajal ERP?", a: "Yes. We use AWS with AES-256 encryption at rest and TLS 1.3 in transit. Daily automated backups, role-based access controls, and a full audit trail are included in all plans. Your data is stored in Indian data centers." },
    { q: "Can I migrate from my existing software (Tally, Busy, etc.)?", a: "Absolutely. We provide Excel-based import templates for all master data (customers, vendors, products, accounts) and opening balances. Our onboarding team assists with the migration at no extra cost on Professional and Enterprise plans." },
    { q: "Does it support GST, TDS, and Indian compliance?", a: "Yes — built ground-up for Indian compliance. GSTR-1, GSTR-3B, e-way bill, e-invoicing (IRN/QR), TDS/TCS deduction, Form 26Q, PF, ESI, and Professional Tax are all handled natively." },
    { q: "What happens after the 14-day trial ends?", a: "Your account is automatically locked — you cannot create new transactions. However, all your data is preserved for 30 days. You can upgrade anytime to reactivate instantly. No data is deleted during this grace period." },
    { q: "Is there a mobile app?", a: "Yes. Android and iOS apps are available for approvals, dashboard viewing, sales orders, and expense submissions. A field-worker app (for CRM and Election modules) is also included." },
    { q: "Can I add modules later?", a: "Yes. You can add Election Management, Multi-Vendor Marketplace, or additional user packs any time from your account settings. All additions are prorated to your billing cycle." },
  ];

  const stats = [
    { value: 500,  suffix: "+",       label: "Companies Onboarded",  sub: "Across 14 states" },
    { value: 12,   suffix: "",        label: "Integrated Modules",    sub: "One unified platform" },
    { value: 99.9, suffix: "%",       label: "Uptime SLA",            sub: "AWS-powered reliability" },
    { value: 4.8,  suffix: "/5",      label: "Customer Rating",       sub: "Based on 200+ reviews" },
  ];

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } };

  const trialActive = isTrialActive(trialRecord);
  const daysLeft    = getTrialDaysLeft(trialRecord);

  return (
    <main style={{ minHeight: "100vh", padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)", background: "#F8FAFC", color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #EA580C, #F97316); color: #FFFFFF; padding: 13px 26px; border-radius: 12px; font-weight: 700; font-size: 14px; border: none; cursor: pointer; transition: all 0.2s; text-decoration: none; font-family: 'Plus Jakarta Sans',sans-serif; box-shadow: 0 4px 18px rgba(234,88,12,0.28); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(234,88,12,0.38); }

        .btn-outline { display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; color: #374151; padding: 12px 26px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1.5px solid #E2E8F0; transition: all 0.2s; text-decoration: none; font-family: 'Plus Jakarta Sans',sans-serif; }
        .btn-outline:hover { border-color: #CBD5E1; background: #F1F5F9; transform: translateY(-1px); }

        .nav-link { color: #64748B; font-size: 14px; font-weight: 500; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #0F172A; }

        .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 28px; transition: all 0.25s; }
        .card:hover { border-color: #CBD5E1; box-shadow: 0 8px 32px rgba(0,0,0,0.06); transform: translateY(-2px); }

        .tag-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 100px; padding: 5px 14px; font-size: 12px; font-weight: 600; }

        select option { background: #ffffff; color: #0F172A; }

        /* Responsive Styles */
        @media (max-width: 1024px) {
          .grid-3-cols { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-4-cols { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 24px !important; }
          .pricing-card-popular { transform: scale(1) !important; }
          .stats-container { padding: 0 24px !important; }
          .workflow-line { display: none !important; }
          .workflow-step { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 16px !important; }
          .workflow-step > div:first-child { order: 2; text-align: center !important; width: 100% !important; }
          .workflow-step > div:last-child { display: none; }
          .contact-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
        }

        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
          .nav-mobile-menu { display: block; position: absolute; top: 100%; left: 0; right: 0; background: rgba(248,250,252,0.98); backdrop-filter: blur(16px); border-bottom: 1px solid #E2E8F0; padding: 20px 24px; z-index: 99; }
          .grid-3-cols { grid-template-columns: 1fr !important; }
          .grid-4-cols { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 400px; margin: 0 auto; }
          .pricing-card-popular { transform: scale(1) !important; }
          .stats-container { grid-template-columns: 1fr 1fr !important; gap: 24px; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; text-align: center; gap: 28px !important; }
          .footer-brand { text-align: center; align-items: center; }
          .hero-buttons { flex-direction: column; align-items: stretch; gap: 12px; }
          .hero-buttons button, .hero-buttons a { justify-content: center; }
          .section-padding { padding: 60px 24px !important; }
          .cta-banner { padding: 40px 24px !important; }
          .navbar-padding { padding: 12px 24px !important; }
          .trial-status-bar { padding: 8px 16px !important; flex-wrap: wrap; gap: 8px; }
          .trial-status-bar > span:first-child { font-size: 12px; }
        }

        @media (max-width: 640px) {
          .stats-container { grid-template-columns: 1fr !important; gap: 16px; }
          .stats-container > div { border-right: none !important; border-bottom: 1px solid #F1F5F9; padding: 24px 16px !important; }
          .hero-title { font-size: 32px !important; line-height: 1.18 !important; }
          .hero-subtitle { font-size: 15px !important; max-width: 100% !important; }
          .workflow-step > div:first-child { padding: 20px !important; }
          .section-padding { padding: 60px 20px !important; }
          .pricing-grid { margin: 0 auto !important; }
          .cta-banner { padding: 32px 20px !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .footer-brand { text-align: center; align-items: center; justify-content: center; }
          .footer-grid > div { width: 100%; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .nav-mobile-menu { display: block !important; }
          .hero-buttons { flex-direction: column !important; gap: 12px !important; }
          .hero-buttons button, .hero-buttons a { width: 100% !important; padding: 14px 18px !important; }
        }
      `}</style>

      <AnimatePresence>
        {showModal && (
          <TrialModal onClose={() => setShowModal(false)} onSuccess={rec => setTrialRecord(rec)} />
        )}
      </AnimatePresence>

      {/* ─── TRIAL STATUS BAR ─── */}
      {trialRecord && (
        <div className="trial-status-bar" style={{ background: trialActive ? "#FFF7ED" : "#FEF2F2", borderBottom: `1px solid ${trialActive ? "#FED7AA" : "#FECACA"}`, padding: "10px 48px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
          {trialActive ? (
            <>
              <FiClock size={14} style={{ color: "#EA580C" }} />
              <span style={{ color: "#C2410C" }}>
                Free trial active — <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</strong>
                &nbsp;(expires {new Date(trialRecord.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
              </span>
              <span style={{ marginLeft: "auto", color: "#94A3B8", fontSize: 12 }}>{trialRecord.email}</span>
            </>
          ) : (
            <>
              <FiAlertCircle size={14} style={{ color: "#DC2626" }} />
              <span style={{ color: "#DC2626" }}>Your trial has expired. <strong>Upgrade to continue.</strong></span>
              <button onClick={() => setShowModal(true)} style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Upgrade Now</button>
            </>
          )}
        </div>
      )}

      {/* ─── NAVBAR ─── */}
      <motion.nav initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="navbar-padding"
        style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 48px", background: "rgba(248,250,252,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #EA580C, #F97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#FFFFFF", fontFamily: "'Sora',sans-serif" }}>PKE</div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#0F172A" }}>Pankajal <span style={{ color: "#EA580C" }}>ERP</span></span>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[["Modules","#modules"], ["Workflow","#workflow"], ["Pricing","#pricing"], ["Contact","#contact"]].map(([item, href]) => (
            <a key={item} href={href} className="nav-link">{item}</a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/signin" className="btn-outline" style={{ padding: "9px 18px", fontSize: 13 }}>Sign in</Link>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: "9px 18px", fontSize: 13 }}>
            {trialActive ? `${daysLeft}d left` : "Free Trial"} <FiArrowRight size={14} />
          </button>
          <button className="nav-mobile-toggle" onClick={() => setMobileNav(!mobileNav)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#0F172A" }}>
            <FiMenu />
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileNav && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="nav-mobile-menu" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(248,250,252,0.98)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E2E8F0", padding: "20px 24px", zIndex: 99 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[["Modules","#modules"], ["Workflow","#workflow"], ["Pricing","#pricing"], ["Contact","#contact"]].map(([item, href]) => (
                  <a key={item} href={href} className="nav-link" style={{ fontSize: 16 }} onClick={() => setMobileNav(false)}>{item}</a>
                ))}
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <Link href="/signin" className="btn-outline" style={{ flex: 1, textAlign: "center", justifyContent: "center" }}>Sign in</Link>
                  <button onClick={() => { setShowModal(true); setMobileNav(false); }} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>Free Trial</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section ref={heroRef} style={{ position: "relative", minHeight: "88vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 90px", overflow: "hidden", background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)" }}>

        <div style={{ position: "absolute", inset: 0, opacity: 0.4, backgroundImage: "linear-gradient(rgba(226,232,240,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.6) 1px, transparent 1px)", backgroundSize: "64px 64px", pointerEvents: "none" }} />

        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)", top: "5%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)", top: "30%", left: "8%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", top: "25%", right: "6%", pointerEvents: "none" }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 1, maxWidth: 800, width: "100%" }}>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 100, padding: "6px 16px", marginBottom: 28, fontSize: 13, color: "#C2410C", fontWeight: 600 }}>
            <FiZap size={13} /> Trusted by 500+ businesses across India · Built for GST & Compliance
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="hero-title"
            style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(40px, 6.5vw, 76px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.04em", marginBottom: 22, color: "#0F172A" }}>
            Run your entire<br />
            <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", background: "linear-gradient(135deg, #EA580C, #F97316, #FBBF24)", WebkitBackgroundImage: "linear-gradient(135deg, #EA580C, #F97316, #FBBF24)", backgroundClip: "text" }}>business</span> from one place
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="hero-subtitle"
            style={{ fontSize: "clamp(15px, 1.8vw, 18px)", color: "#475569", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 40px" }}>
            Procurement, inventory, sales, production, CRM, accounts, HR — and unique modules for elections & marketplaces. One modern cloud ERP purpose-built for Indian businesses.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="hero-buttons"
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 15, padding: "15px 32px" }}>
              Start free trial <FiArrowRight size={15} />
            </button>
            <a href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20Pankajal%20ERP%2C%20I%27d%20like%20a%20demo!`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 15, padding: "15px 32px" }}>
              <FiMessageCircle size={15} style={{ color: "#25D366" }} /> Request Demo
            </a>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ marginTop: 18, fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <span>✓ No credit card</span>
            <span>✓ 14-day full access trial</span>
            <span>✓ Auto-locked after expiry</span>
            <span>✓ Indian data centers</span>
          </motion.p>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          className="stats-container"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", maxWidth: 1100, margin: "0 auto", padding: "0 48px" }}>
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp} style={{ textAlign: "center", padding: "40px 20px", borderRight: i < 3 ? "1px solid #F1F5F9" : "none" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 44, fontWeight: 800, color: "#EA580C", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                <Counter end={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginTop: 4, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── CORE MODULES ─── */}
      <section id="modules" className="section-padding" style={{ padding: "96px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#C2410C", fontWeight: 600, marginBottom: 16 }}>Core Platform</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", color: "#0F172A", marginBottom: 12 }}>
            Every module your operations demand
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 500 }}>
            Tightly integrated modules that share a single database — no double entry, no sync errors.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid-3-cols"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {coreModules.map((mod, i) => (
            <motion.div key={i} variants={fadeUp} className="card">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: mod.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: mod.color, marginBottom: 18 }}>{mod.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 10, letterSpacing: "-0.02em" }}>{mod.title}</h3>
              <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.7 }}>{mod.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── ADVANCED MODULES ─── */}
      <section style={{ padding: "80px 48px", background: "#FFFFFF", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#166534", fontWeight: 600, marginBottom: 16 }}>Advanced Modules</div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", color: "#0F172A" }}>Beyond traditional ERP</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid-3-cols"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {advancedModules.map((mod, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                style={{ background: mod.bg, border: `1px solid ${mod.borderColor}`, borderRadius: 20, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: mod.badgeColor }}>{mod.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 100, background: mod.badgeBg, color: mod.badgeColor }}>{mod.badge}</span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 12, letterSpacing: "-0.03em", fontFamily: "'Sora',sans-serif" }}>{mod.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75 }}>{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── WORKFLOW ─── */}
      <section id="workflow" className="section-padding" style={{ padding: "96px 48px", maxWidth: 1100, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 60, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#1D4ED8", fontWeight: 600, marginBottom: 16 }}>How It Works</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A", marginBottom: 12 }}>
            Go live in 5 simple steps
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 480, margin: "0 auto" }}>
            From signup to your first transaction — most businesses are fully operational in 48 hours.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ position: "relative" }}>
          <div className="workflow-line" style={{ position: "absolute", left: "50%", top: 60, bottom: 60, width: 2, background: "linear-gradient(180deg, #FED7AA, #E2E8F0)", transform: "translateX(-50%)", zIndex: 0 }} />

          {workflow.map((step, i) => (
            <motion.div key={i} variants={fadeUp}
              className="workflow-step"
              style={{ display: "flex", alignItems: "flex-start", gap: 32, marginBottom: 40, position: "relative", zIndex: 1, flexDirection: i % 2 === 0 ? "row" : "row-reverse" }}>

              <div style={{ flex: 1, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "28px 32px", textAlign: i % 2 === 0 ? "right" : "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: step.color, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Step {step.step}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8, letterSpacing: "-0.02em" }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7 }}>{step.desc}</p>
              </div>

              <div style={{ flexShrink: 0, width: 64, height: 64, borderRadius: "50%", background: step.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#FFFFFF", boxShadow: `0 4px 20px ${step.color}40`, zIndex: 2 }}>
                {step.icon}
              </div>

              <div style={{ flex: 1 }} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ padding: "80px 48px", background: "#FFFFFF", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#92400E", fontWeight: 600, marginBottom: 16 }}>
              <FiStar size={12} /> Customer Stories
            </div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A" }}>
              What our customers say
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid-3-cols"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={fadeUp} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[...Array(t.stars)].map((_, j) => <FiStar key={j} size={14} style={{ color: "#F59E0B", fill: "#F59E0B" }} />)}
                </div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75, marginBottom: 20 }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #EA580C, #F97316)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontWeight: 700, fontSize: 15 }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="section-padding" style={{ padding: "96px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#C2410C", fontWeight: 600, marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A", marginBottom: 12 }}>Simple, transparent pricing</h2>
          <p style={{ color: "#64748B", fontSize: 16 }}>All plans include a 14-day free trial. No hidden fees. No lock-in. Cancel anytime.</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="pricing-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
          {pricingPlans.map((plan, i) => (
            <motion.div key={i} variants={fadeUp} className={plan.popular ? "pricing-card-popular" : ""} style={{ position: "relative", background: "#FFFFFF", border: plan.popular ? "2px solid #EA580C" : "1px solid #E2E8F0", borderRadius: 20, padding: 32, transform: plan.popular ? "scale(1.03)" : "scale(1)", boxShadow: plan.popular ? "0 20px 60px rgba(234,88,12,0.12)" : "none" }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #EA580C, #F97316)", color: "#FFFFFF", fontSize: 11, fontWeight: 700, padding: "6px 18px", borderRadius: 100, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>⭐ MOST POPULAR</div>
              )}

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: plan.popular ? "#EA580C" : "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 44, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{plan.price}</span>
                  {plan.period && <span style={{ color: "#94A3B8", fontSize: 14 }}>{plan.period}</span>}
                </div>
                <p style={{ fontSize: 13, color: "#94A3B8" }}>{plan.desc}</p>
              </div>

              <div style={{ height: 1, background: "#F1F5F9", marginBottom: 24 }} />

              <ul style={{ listStyle: "none", marginBottom: 24, display: "flex", flexDirection: "column", gap: 9 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#374151" }}>
                    <FiCheck size={15} style={{ color: plan.popular ? "#EA580C" : "#10B981", marginTop: 1, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#CBD5E1", textDecoration: "line-through" }}>
                    <FiCheck size={15} style={{ color: "#E2E8F0", marginTop: 1, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.name !== "Enterprise" ? setShowModal(true) : null}
                className={plan.popular ? "btn-primary" : "btn-outline"}
                style={{ width: "100%", justifyContent: "center", padding: "13px 24px", fontSize: 14 }}>
                {plan.cta} <FiArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ marginTop: 40, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px 32px", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#EA580C", flexShrink: 0 }}>
            <FiCpu />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>Add-on Modules</p>
            <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
              Election Management and Multi-Vendor Marketplace modules are available as add-ons on the Professional and Enterprise plans.
              Election module from <strong>₹4,999/election cycle</strong>. Marketplace from <strong>₹1,999/month</strong>. Contact us for bundle pricing.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: "80px 48px", background: "#FFFFFF", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#5B21B6", fontWeight: 600, marginBottom: 16 }}>FAQs</div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A" }}>
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp}
                style={{ border: "1px solid #E2E8F0", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", padding: "18px 22px", background: openFaq === i ? "#F8FAFC" : "#FFFFFF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textAlign: "left", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: "#0F172A" }}>{faq.q}</span>
                  <FiChevronDown size={18} style={{ color: "#94A3B8", flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      style={{ overflow: "hidden" }}>
                      <p style={{ padding: "0 22px 18px", fontSize: 14, color: "#475569", lineHeight: 1.75, borderTop: "1px solid #F1F5F9" }}>{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" className="section-padding" style={{ padding: "96px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#166534", fontWeight: 600, marginBottom: 16 }}>Get in Touch</div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A", marginBottom: 12 }}>Let's talk business</h2>
            <p style={{ color: "#64748B", fontSize: 16, maxWidth: 400, margin: "0 auto" }}>Our team is available Mon–Sat, 9am–7pm IST. We typically reply within a few hours.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="contact-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>

            <motion.a variants={fadeUp}
              href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20Pankajal%20ERP%2C%20I%27d%20like%20to%20know%20more!`}
              target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, textDecoration: "none", transition: "all 0.2s" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#25D366", flexShrink: 0 }}><FiMessageCircle /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>WhatsApp</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>+91 {CONTACT.whatsapp}</p>
                <p style={{ fontSize: 12, color: "#25D366", marginTop: 3 }}>Chat with us →</p>
              </div>
            </motion.a>

            <motion.a variants={fadeUp}
              href={`mailto:${CONTACT.email}`} whileHover={{ y: -3 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, textDecoration: "none", transition: "all 0.2s" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#EA580C", flexShrink: 0 }}><FiMail /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", wordBreak: "break-all" }}>{CONTACT.email}</p>
                <p style={{ fontSize: 12, color: "#EA580C", marginTop: 3 }}>Reply within 24h →</p>
              </div>
            </motion.a>

            <motion.div variants={fadeUp} style={{ padding: "24px 28px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>Follow Us</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { href: CONTACT.instagram, icon: <FiInstagram size={17} />, color: "#E1306C" },
                  { href: CONTACT.twitter,   icon: <FiTwitter   size={17} />, color: "#1DA1F2" },
                  { href: CONTACT.linkedin,  icon: <FiLinkedin  size={17} />, color: "#0A66C2" },
                  { href: CONTACT.youtube,   icon: <FiYoutube   size={17} />, color: "#FF0000" },
                ].map((s, k) => (
                  <a key={k} href={s.href} target="_blank" rel="noopener noreferrer"
                    style={{ width: 44, height: 44, borderRadius: 10, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", textDecoration: "none", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = s.color; e.currentTarget.style.borderColor = s.color + "60"; e.currentTarget.style.background = s.color + "0A"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "transparent"; }}>
                    {s.icon}
                  </a>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7 }}>🇮🇳 Built for India · Mon–Sat 9am–7pm IST</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section style={{ padding: "0 48px 96px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="cta-banner"
          style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 50%, #F0FDF4 100%)", border: "1px solid #FED7AA", borderRadius: 24, padding: "64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(234,88,12,0.06) 0%, transparent 70%)", top: "-30%", left: "40%", transform: "translateX(-50%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, color: "#0F172A", marginBottom: 14, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Ready to transform your operations?
            </h2>
            <p style={{ color: "#64748B", fontSize: 16, maxWidth: 480, margin: "0 auto 36px" }}>
              Join hundreds of Indian businesses already scaling with Pankajal ERP. Start your 14-day free trial today — no card required.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 15, padding: "15px 36px" }}>
                Start your free trial <FiArrowRight size={15} />
              </button>
              <a href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20I%27d%20like%20to%20learn%20more%20about%20Pankajal%20ERP`} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: 15, padding: "15px 36px" }}>
                <FiMessageCircle size={15} style={{ color: "#25D366" }} /> Talk to our team
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#0F172A", padding: "56px 48px 36px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>

            <div className="footer-brand">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #EA580C, #F97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#FFFFFF", fontFamily: "'Sora',sans-serif" }}>PKE</div>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: "#F8FAFC" }}>Pankajal ERP</span>
              </div>
              <p style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.75, marginBottom: 20, maxWidth: 240 }}>
                All-in-one cloud ERP for Indian businesses. GST-compliant, multi-module, mobile-ready.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { href: CONTACT.instagram, icon: <FiInstagram size={15} /> },
                  { href: CONTACT.twitter,   icon: <FiTwitter   size={15} /> },
                  { href: CONTACT.linkedin,  icon: <FiLinkedin  size={15} /> },
                  { href: CONTACT.youtube,   icon: <FiYoutube   size={15} /> },
                ].map((s, i) => (
                  <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                    style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", textDecoration: "none", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#F97316"; e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: "Product",  items: ["Modules", "Pricing", "Changelog", "Roadmap", "API Docs"] },
              { title: "Company",  items: ["About", "Blog", "Careers", "Press Kit"] },
              { title: "Support",  items: ["Help Center", "Onboarding Guide", "Video Tutorials", "System Status"] },
              { title: "Legal",    items: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Data Security"] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{col.title}</p>
                {col.items.map(item => (
                  <a key={item} href="#" style={{ display: "block", fontSize: 13.5, color: "#475569", textDecoration: "none", marginBottom: 10, transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#CBD5E1"}
                    onMouseLeave={e => e.target.style.color = "#475569"}>{item}</a>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: "#334155" }}>© {new Date().getFullYear()} Pankajal ERP. Built with ❤️ for India.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { icon: <FiLock size={12} />, text: "SOC 2 Ready" },
                { icon: <FiShield size={12} />, text: "ISO 27001" },
                { icon: <FiGlobe size={12} />, text: "GDPR Compliant" },
                { icon: <FiPhoneCall size={12} />, text: "India Support" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#64748B" }}>
                  {b.icon} {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}




// "use client";
// import Link from "next/link";
// import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
// import { useRef, useState, useEffect } from "react";
// import {
//   HiShoppingBag, HiChartBar, HiTruck, HiUserGroup,
//   HiDocumentText, HiCog, HiX, HiCheckCircle,
// } from "react-icons/hi";
// import {
//   FiFlag, FiShoppingCart, FiDollarSign,
//   FiArrowRight, FiZap, FiCheck, FiMail,
//   FiMessageCircle, FiInstagram, FiTwitter,
//   FiLinkedin, FiYoutube, FiAlertCircle,
//   FiClock, FiShield, FiEye, FiEyeOff,
// } from "react-icons/fi";

// /* ═══════════════════════════════════════
//    TRIAL UTILITY
//    ═══════════════════════════════════════ */
// export const TRIAL_KEY = "aits_trial";
// export const TRIAL_DAYS = 14;

// export function startTrial(userData) {
//   const record = {
//     ...userData,
//     trialStart: Date.now(),
//     trialEnd: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
//     status: "active",
//     id: crypto.randomUUID(),
//   };
//   localStorage.setItem(TRIAL_KEY, JSON.stringify(record));
//   return record;
// }

// export function getTrialRecord() {
//   try {
//     const raw = localStorage.getItem(TRIAL_KEY);
//     if (!raw) return null;
//     const record = JSON.parse(raw);
//     if (record.status === "active" && Date.now() > record.trialEnd) {
//       record.status = "expired";
//       localStorage.setItem(TRIAL_KEY, JSON.stringify(record));
//     }
//     return record;
//   } catch { return null; }
// }

// export function getTrialDaysLeft(record) {
//   if (!record) return 0;
//   const ms = record.trialEnd - Date.now();
//   return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
// }

// export function isTrialActive(record) {
//   return record?.status === "active" && Date.now() <= record.trialEnd;
// }

// export function clearTrial() {
//   localStorage.removeItem(TRIAL_KEY);
// }

// /* ─── Re-usable Trial Banner ─── */
// export function TrialBanner() {
//   const [record, setRecord] = useState(null);
//   useEffect(() => { setRecord(getTrialRecord()); }, []);
//   if (!record) return null;
//   const daysLeft = getTrialDaysLeft(record);
//   const active = isTrialActive(record);
//   if (!active) return (
//     <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, color: "#FCA5A5", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
//       <FiAlertCircle size={18} />
//       <span>Your 14-day free trial has <strong>expired</strong>. Upgrade to continue using AITS ERP.</span>
//       <Link href="/pricing" style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Upgrade Now</Link>
//     </div>
//   );
//   return (
//     <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, color: "#FCD34D", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
//       <FiClock size={16} />
//       <span>Free trial: <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</strong> — expires {new Date(record.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
//       <Link href="/pricing" style={{ marginLeft: "auto", background: "#F59E0B", color: "#0A0A0B", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Upgrade</Link>
//     </div>
//   );
// }

// /* ─── Helpers ─── */
// function Orb({ style }) {
//   return <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", ...style }} />;
// }

// function Counter({ end, suffix = "", duration = 2 }) {
//   const [count, setCount] = useState(0);
//   const ref = useRef(null);
//   const [started, setStarted] = useState(false);
//   useEffect(() => {
//     const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
//     if (ref.current) ob.observe(ref.current);
//     return () => ob.disconnect();
//   }, [started]);
//   useEffect(() => {
//     if (!started) return;
//     let s = 0;
//     const step = end / (duration * 60);
//     const t = setInterval(() => {
//       s += step;
//       if (s >= end) { setCount(end); clearInterval(t); } else setCount(Math.floor(s));
//     }, 1000 / 60);
//     return () => clearInterval(t);
//   }, [started, end, duration]);
//   return <span ref={ref}>{count}{suffix}</span>;
// }

// /* ─── Claude AI helper ─── */
// async function callClaude(messages) {
//   try {
//     const res = await fetch("https://api.anthropic.com/v1/messages", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "claude-sonnet-4-20250514",
//         max_tokens: 1000,
//         messages,
//       }),
//     });
//     if (!res.ok) return "__SKIP__";
//     const data = await res.json();
//     return data.content?.find(b => b.type === "text")?.text || "__SKIP__";
//   } catch {
//     return "__SKIP__";
//   }
// }

// /* ─── Trial Modal ─── */
// function TrialModal({ onClose, onSuccess }) {
//   const [step, setStep] = useState(1);
//   const [showPw, setShowPw] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [errors, setErrors] = useState({});
//   const [form, setForm] = useState({
//     name: "",
//     company: "",
//     email: "",
//     phone: "",
//     password: "",
//     plan: "Starter",
//   });

//   const validate = () => {
//     const e = {};
//     if (!form.name.trim()) e.name = "Full name is required";
//     if (!form.company.trim()) e.company = "Company name is required";
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
//     if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Valid 10-digit phone required";
//     if (form.password.length < 8) e.password = "Min 8 characters";
//     return e;
//   };

//   /* ─── MERGED handleSubmit ─── */
//   const handleSubmit = async () => {
//     // 1. Client-side validation first
//     const e = validate();
//     if (Object.keys(e).length) { setErrors(e); return; }

//     setLoading(true);
//     setErrors({});

//     try {
//       // 2. AI validation
//       const validationRaw = await callClaude([{
//         role: "user",
//         content: `Validate this ERP trial registration. Respond ONLY in JSON (no markdown): {"valid":true,"issues":[]}
// Data — Name:"${form.name}", Company:"${form.company}", Email:"${form.email}", Phone:"${form.phone}".
// Return valid:false with issues array if data looks fake, suspicious, or clearly invalid.`,
//       }]);

//       if (validationRaw !== "__SKIP__") {
//         let aiResult = { valid: true, issues: [] };
//         try {
//           aiResult = JSON.parse(validationRaw.replace(/```json|```/g, "").trim());
//         } catch {}

//         if (!aiResult.valid) {
//           setErrors({
//             general: "AI Review: " + (aiResult.issues?.join(", ") || "Please check your details."),
//           });
//           setLoading(false);
//           return;
//         }
//       }

//       // 3. Simulate processing + start trial in localStorage
//       await new Promise(r => setTimeout(r, 1200));
//       const record = startTrial(form);

//       setLoading(false);
//       setStep(2);
//       onSuccess?.(record);

//     } catch (err) {
//       setErrors({ general: err.message || "Something went wrong. Please try again." });
//       setLoading(false);
//     }
//   };

//   const fields = [
//     { k: "name",     label: "Full Name",       type: "text",     placeholder: "Pankaj Agarwal" },
//     { k: "company",  label: "Company Name",    type: "text",     placeholder: "Agarwal Enterprises" },
//     { k: "email",    label: "Work Email",      type: "email",    placeholder: "you@company.com" },
//     { k: "phone",    label: "Phone Number",    type: "tel",      placeholder: "9876543210" },
//     { k: "password", label: "Create Password", type: "password", placeholder: "Min 8 characters" },
//   ];

//   return (
//     <motion.div
//       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//       style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
//       onClick={e => e.target === e.currentTarget && onClose()}
//     >
//       <motion.div
//         initial={{ opacity: 0, y: 32, scale: 0.96 }}
//         animate={{ opacity: 1, y: 0, scale: 1 }}
//         exit={{ opacity: 0, y: 16, scale: 0.98 }}
//         transition={{ type: "spring", damping: 24, stiffness: 260 }}
//         style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 480, padding: "36px 36px 28px", position: "relative", fontFamily: "'DM Sans',sans-serif", maxHeight: "90vh", overflowY: "auto" }}
//       >
//         <button
//           onClick={onClose}
//           style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#9A9790", display: "flex", alignItems: "center", justifyContent: "center" }}
//         >
//           <HiX size={16} />
//         </button>

//         {/* ─── STEP 1: Form ─── */}
//         {step === 1 && <>
//           <div style={{ marginBottom: 28 }}>
//             <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "4px 12px", fontSize: 12, color: "#F59E0B", fontWeight: 600, marginBottom: 14 }}>
//               <FiShield size={12} /> 14-Day Free Trial — No Credit Card
//             </div>
//             <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: "#F5F3ED", letterSpacing: "-0.025em", marginBottom: 6 }}>Start your free trial</h2>
//             <p style={{ fontSize: 14, color: "#6B6860" }}>Full access to all features. Auto-deactivated after 14 days.</p>
//           </div>

//           {/* Fields */}
//           {fields.map(({ k, label, type, placeholder }) => (
//             <div key={k} style={{ marginBottom: 16 }}>
//               <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#9A9790", marginBottom: 6 }}>{label}</label>
//               <div style={{ position: "relative" }}>
//                 <input
//                   type={k === "password" ? (showPw ? "text" : "password") : type}
//                   value={form[k]}
//                   placeholder={placeholder}
//                   onChange={ev => {
//                     setForm(f => ({ ...f, [k]: ev.target.value }));
//                     setErrors(er => ({ ...er, [k]: "" }));
//                   }}
//                   style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${errors[k] ? "#EF4444" : "rgba(255,255,255,0.12)"}`, color: "#F5F3ED", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", paddingRight: k === "password" ? 42 : 14 }}
//                 />
//                 {k === "password" && (
//                   <button
//                     onClick={() => setShowPw(p => !p)}
//                     style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6B6860", cursor: "pointer" }}
//                   >
//                     {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
//                   </button>
//                 )}
//               </div>
//               {errors[k] && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors[k]}</p>}
//             </div>
//           ))}

//           {/* Plan selector */}
//           <div style={{ marginBottom: 20 }}>
//             <label style={{ fontSize: 13, fontWeight: 500, color: "#9A9790", display: "block", marginBottom: 6 }}>Trial Plan</label>
//             <select
//               value={form.plan}
//               onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
//               style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F5F3ED", fontSize: 14, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}
//             >
//               <option value="Starter">Starter — ₹999/mo</option>
//               <option value="Professional">Professional — ₹2,499/mo</option>
//               <option value="Enterprise">Enterprise — Custom</option>
//             </select>
//           </div>

//           {/* General / AI error banner */}
//           {errors.general && (
//             <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#FCA5A5" }}>
//               <FiAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
//               {errors.general}
//             </div>
//           )}

//           {/* Submit */}
//           <button
//             onClick={handleSubmit}
//             disabled={loading}
//             style={{ width: "100%", padding: "14px", borderRadius: 12, background: loading ? "rgba(245,158,11,0.5)" : "#F59E0B", color: "#0A0A0B", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s", fontFamily: "'DM Sans',sans-serif" }}
//           >
//             {loading ? <>
//               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                 <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
//                   <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
//                 </path>
//               </svg>
//               Validating &amp; Activating…
//             </> : <>Activate Free Trial <FiArrowRight size={16} /></>}
//           </button>

//           <p style={{ fontSize: 12, color: "#4A4845", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
//             No charges unless you upgrade. Trial blocks automatically after 14 days.
//           </p>
//         </>}

//         {/* ─── STEP 2: Success ─── */}
//         {step === 2 && (
//           <div style={{ textAlign: "center", padding: "16px 0" }}>
//             <motion.div
//               initial={{ scale: 0 }} animate={{ scale: 1 }}
//               transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
//               style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, color: "#10B981" }}
//             >
//               <HiCheckCircle />
//             </motion.div>
//             <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "#F5F3ED", marginBottom: 10, letterSpacing: "-0.02em" }}>Trial Activated! 🎉</h2>
//             <p style={{ color: "#9A9790", fontSize: 15, marginBottom: 12, lineHeight: 1.7 }}>
//               Welcome, <strong style={{ color: "#F5F3ED" }}>{form.name}</strong>.<br />
//               Your <strong style={{ color: "#F59E0B" }}>{form.plan}</strong> trial runs for <strong style={{ color: "#F59E0B" }}>14 days</strong>.
//             </p>
//             <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: "#FCD34D" }}>
//               <FiClock size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
//               Expires: <strong>{new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
//             </div>
//             <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: "#6B6860", textAlign: "left" }}>
//               <p style={{ marginBottom: 8, color: "#9A9790", fontWeight: 600 }}>What happens after 14 days?</p>
//               <p style={{ lineHeight: 1.7 }}>Your account will be <strong style={{ color: "#F5F3ED" }}>automatically locked</strong>. Data is preserved for 30 days. Upgrade anytime to reactivate instantly.</p>
//             </div>
//             <button
//               onClick={onClose}
//               style={{ background: "#F59E0B", color: "#0A0A0B", border: "none", cursor: "pointer", width: "100%", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
//             >
//               Go to Dashboard <FiArrowRight size={16} />
//             </button>
//             <p style={{ fontSize: 12, color: "#4A4845", marginTop: 14 }}>
//               Check <strong style={{ color: "#9A9790" }}>{form.email}</strong> for your login details
//             </p>
//           </div>
//         )}
//       </motion.div>
//     </motion.div>
//   );
// }

// /* ═══════════════════════════════════════
//    MAIN PAGE
//    ═══════════════════════════════════════ */
// export default function LandingPage() {
//   const heroRef = useRef(null);
//   const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
//   const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
//   const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
//   const [showModal, setShowModal] = useState(false);
//   const [trialRecord, setTrialRecord] = useState(null);

//   useEffect(() => { setTrialRecord(getTrialRecord()); }, []);

//   const CONTACT = {
//     whatsapp: "7738961799",
//     email: "pankajal2099@gmail.com",
//     instagram: "https://instagram.com/aits_erp",
//     twitter: "https://twitter.com/aits_erp",
//     linkedin: "https://linkedin.com/company/aits-erp",
//     youtube: "https://youtube.com/@aits_erp",
//   };

//   const coreModules = [
//     { icon: <HiShoppingBag />, title: "Procure to Pay",      desc: "End-to-end procurement & payment with approvals and vendor collaboration.",               color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
//     { icon: <HiChartBar />,   title: "Inventory",            desc: "Real-time stock tracking, multi-warehouse, batch & expiry management.",                   color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
//     { icon: <HiTruck />,      title: "Order to Cash",        desc: "Sales orders, invoicing, delivery & payment reconciliation.",                             color: "#10B981", bg: "rgba(16,185,129,0.08)" },
//     { icon: <HiCog />,        title: "Production",           desc: "BOM, production orders, PPC, quality checks — full manufacturing flow.",                  color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
//     { icon: <HiUserGroup />,  title: "CRM",                  desc: "Lead, opportunity, campaign management, customer support & ticketing.",                   color: "#F43F5E", bg: "rgba(244,63,94,0.08)" },
//     { icon: <HiDocumentText />, title: "Reports & Analytics",desc: "P&L, balance sheet, ageing reports, bank statements, live dashboards.",                  color: "#06B6D4", bg: "rgba(6,182,212,0.08)" },
//   ];

//   const advancedModules = [
//     { icon: <FiFlag />,         title: "Election Management",       badge: "Premium",    badgeColor: "#F59E0B", desc: "Complete political campaign suite — constituency management, booth tracking, voter database, surveys, rally planning, shadow expense register, and real-time analytics.", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)", border: "rgba(245,158,11,0.2)" },
//     { icon: <FiShoppingCart />, title: "Multi-Vendor Marketplace",  badge: "Premium",    badgeColor: "#10B981", desc: "Launch a full marketplace inside your ERP. Vendors list products & services, customers buy, you earn commission. Supports physical goods, events, weddings & entertainment.", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)", border: "rgba(16,185,129,0.2)" },
//     { icon: <FiDollarSign />,   title: "Services & Entertainment",  badge: "Coming Soon",badgeColor: "#8B5CF6", desc: "Slot booking, calendar management, vendor ratings, and dynamic pricing. Ideal for wedding planners, DJs, photographers, and event managers.", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 100%)", border: "rgba(139,92,246,0.2)" },
//   ];

//   const pricingPlans = [
//     { name: "Starter",      price: "₹999",   period: "/month", desc: "Perfect for small businesses.",        features: ["Procure to Pay", "Inventory", "Order to Cash", "CRM", "Basic Reports", "1 Company · 5 Users"],                                          cta: "Start Free Trial", popular: false },
//     { name: "Professional", price: "₹2,499", period: "/month", desc: "Everything growing businesses need.", features: ["All Starter features", "Production", "HR & Payroll", "Full Accounts", "Election Module (add-on)", "Marketplace (add-on)", "10 Users"], cta: "Start Free Trial", popular: true  },
//     { name: "Enterprise",   price: "Custom", period: "",        desc: "Built around your scale.",             features: ["All Professional features", "Unlimited Users", "Dedicated Support", "Custom Integrations", "White Label Option", "On-Premise / Private Cloud"], cta: "Contact Sales",    popular: false },
//   ];

//   const stats = [
//     { value: 500,  suffix: "+",      label: "Companies" },
//     { value: 12,   suffix: " modules",label: "Integrated" },
//     { value: 99.9, suffix: "%",      label: "Uptime SLA" },
//     { value: 24,   suffix: "/7",     label: "Support" },
//   ];

//   const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
//   const fadeUp  = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
//   const fadeIn  = { hidden: { opacity: 0 },        visible: { opacity: 1, transition: { duration: 0.6 } } };

//   const trialActive = isTrialActive(trialRecord);
//   const daysLeft    = getTrialDaysLeft(trialRecord);

//   return (
//     <main style={{ minHeight: "100vh", background: "#0A0A0B", color: "#E8E6E0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #F59E0B; color: #0A0A0B; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px; border: none; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; text-decoration: none; font-family: 'DM Sans',sans-serif; }
//         .btn-primary:hover { background: #FBBF24; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(245,158,11,0.3); }
//         .btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #E8E6E0; padding: 13px 28px; border-radius: 12px; font-weight: 500; font-size: 15px; cursor: pointer; border: 1px solid rgba(232,230,224,0.15); transition: border-color 0.2s, background 0.2s, transform 0.15s; text-decoration: none; font-family: 'DM Sans',sans-serif; }
//         .btn-ghost:hover { border-color: rgba(232,230,224,0.35); background: rgba(232,230,224,0.05); transform: translateY(-1px); }
//         .module-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; transition: border-color 0.25s, background 0.25s, transform 0.25s; }
//         .module-card:hover { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); transform: translateY(-3px); }
//         .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent); }
//         .nav-link { color: #9A9790; font-size: 14px; text-decoration: none; transition: color 0.2s; }
//         .nav-link:hover { color: #E8E6E0; }
//         .social-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); color: #6B6860; text-decoration: none; transition: border-color 0.2s, color 0.2s, background 0.2s; }
//         .social-btn:hover { border-color: rgba(245,158,11,0.4); color: #F59E0B; background: rgba(245,158,11,0.07); }
//         .contact-link { color: #9A9790; text-decoration: none; font-size: 14px; transition: color 0.2s; display: flex; align-items: center; gap: 8px; }
//         .contact-link:hover { color: #F59E0B; }
//         select option { background: #1a1a1c; color: #F5F3ED; }
//       `}</style>

//       <AnimatePresence>
//         {showModal && (
//           <TrialModal
//             onClose={() => setShowModal(false)}
//             onSuccess={rec => setTrialRecord(rec)}
//           />
//         )}
//       </AnimatePresence>

//       {/* ─── TRIAL STATUS BAR ─── */}
//       {trialRecord && (
//         <div style={{ background: trialActive ? "rgba(245,158,11,0.08)" : "rgba(220,38,38,0.1)", borderBottom: `1px solid ${trialActive ? "rgba(245,158,11,0.2)" : "rgba(220,38,38,0.25)"}`, padding: "10px 40px", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
//           {trialActive ? (
//             <>
//               <FiClock size={14} style={{ color: "#F59E0B" }} />
//               <span style={{ color: "#FCD34D" }}>
//                 Free trial active — <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</strong>
//                 &nbsp;(expires {new Date(trialRecord.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
//               </span>
//               <span style={{ marginLeft: "auto", color: "#6B6860", fontSize: 12 }}>Signed in as {trialRecord.email}</span>
//             </>
//           ) : (
//             <>
//               <FiAlertCircle size={14} style={{ color: "#EF4444" }} />
//               <span style={{ color: "#FCA5A5" }}>Your trial has expired. <strong>Upgrade to continue using Pankajal ERP.</strong></span>
//               <button onClick={() => setShowModal(true)} style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Upgrade Now</button>
//             </>
//           )}
//         </div>
//       )}

//       {/* ─── NAVBAR ─── */}
//       <motion.nav
//         initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
//         style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: "rgba(10,10,11,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#0A0A0B" }}>PKE</div>
//           <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.02em" }}>Pankajal <span style={{ color: "#F59E0B" }}>ERP</span></span>
//         </div>
//         <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
//           {["Modules", "Pricing", "Contact"].map(item => (
//             <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
//           ))}
//         </div>
//         <div style={{ display: "flex", gap: 12 }}>
//           <Link href="/signin" className="btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>Sign in</Link>
//           <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
//             {trialActive ? `${daysLeft}d trial left` : "Free Trial"}
//           </button>
//         </div>
//       </motion.nav>

//       {/* ─── HERO ─── */}
//       <section
//         ref={heroRef}
//         style={{ position: "relative", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 100px", overflow: "hidden" }}
//       >
//         <Orb style={{ width: 600, height: 600, background: "rgba(245,158,11,0.08)", top: "10%", left: "50%", transform: "translateX(-50%)" }} />
//         <Orb style={{ width: 400, height: 400, background: "rgba(139,92,246,0.07)", top: "20%", left: "10%" }} />
//         <Orb style={{ width: 300, height: 300, background: "rgba(59,130,246,0.07)", top: "30%", right: "5%" }} />
//         <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px)", pointerEvents: "none" }} />

//         <motion.div style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 1, maxWidth: 760 }}>
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
//             style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: 32, fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>
//             <FiZap size={13} /> Trusted by 500+ businesses across India
//           </motion.div>

//           <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
//             style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24, color: "#F5F3ED" }}>
//             Run your entire<br />
//             <em style={{ color: "#F59E0B", fontStyle: "italic" }}>business</em> from one place
//           </motion.h1>

//           <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
//             style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#9A9790", lineHeight: 1.65, maxWidth: 580, margin: "0 auto 44px" }}>
//             Procurement, inventory, sales, production, CRM, elections, and marketplaces — unified in one modern cloud ERP built for Indian businesses.
//           </motion.p>

//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
//             style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
//             <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
//               Start free trial <FiArrowRight size={16} />
//             </button>
//             <Link href="/signin" className="btn-ghost" style={{ fontSize: 16, padding: "16px 32px" }}>Sign in to account</Link>
//           </motion.div>

//           <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
//             style={{ marginTop: 20, fontSize: 13, color: "#6B6860" }}>
//             No credit card required · 14-day free trial · Auto-locked after expiry
//           </motion.p>
//         </motion.div>
//       </section>

//       {/* ─── STATS ─── */}
//       <div className="divider" />
//       <motion.section
//         initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
//         style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "48px 80px", background: "rgba(255,255,255,0.015)" }}
//       >
//         {stats.map((s, i) => (
//           <motion.div key={i} variants={fadeUp} style={{ textAlign: "center", padding: "0 24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
//             <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: "#F59E0B", lineHeight: 1.1 }}>
//               <Counter end={s.value} suffix={s.suffix} />
//             </div>
//             <div style={{ color: "#6B6860", fontSize: 14, marginTop: 6, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
//           </motion.div>
//         ))}
//       </motion.section>
//       <div className="divider" />

//       {/* ─── CORE MODULES ─── */}
//       <section id="modules" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
//         <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} style={{ marginBottom: 60 }}>
//           <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Core Platform</div>
//           <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED" }}>
//             Every module your<br />operations demand
//           </h2>
//         </motion.div>
//         <motion.div
//           initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
//           style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
//         >
//           {coreModules.map((mod, i) => (
//             <motion.div key={i} variants={fadeUp} className="module-card">
//               <div style={{ width: 48, height: 48, borderRadius: 14, background: mod.bg, border: `1px solid ${mod.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: mod.color, marginBottom: 20 }}>{mod.icon}</div>
//               <h3 style={{ fontSize: 18, fontWeight: 600, color: "#F5F3ED", marginBottom: 10, letterSpacing: "-0.01em" }}>{mod.title}</h3>
//               <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.65 }}>{mod.desc}</p>
//             </motion.div>
//           ))}
//         </motion.div>
//       </section>

//       {/* ─── ADVANCED MODULES ─── */}
//       <section style={{ padding: "80px 60px", background: "rgba(255,255,255,0.015)" }}>
//         <div style={{ maxWidth: 1200, margin: "0 auto" }}>
//           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 60 }}>
//             <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Advanced Modules</div>
//             <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED" }}>Beyond traditional ERP</h2>
//           </motion.div>
//           <motion.div
//             initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
//             style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
//           >
//             {advancedModules.map((mod, i) => (
//               <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
//                 style={{ background: mod.gradient, border: `1px solid ${mod.border}`, borderRadius: 24, padding: 32 }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
//                   <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: mod.badgeColor }}>{mod.icon}</div>
//                   <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 100, background: `${mod.badgeColor}18`, color: mod.badgeColor, border: `1px solid ${mod.badgeColor}30` }}>{mod.badge}</span>
//                 </div>
//                 <h3 style={{ fontSize: 21, fontWeight: 700, color: "#F5F3ED", marginBottom: 12, letterSpacing: "-0.02em" }}>{mod.title}</h3>
//                 <p style={{ fontSize: 14, color: "#9A9790", lineHeight: 1.7 }}>{mod.desc}</p>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ─── PRICING ─── */}
//       <section id="pricing" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
//         <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 64 }}>
//           <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Pricing</div>
//           <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED", marginBottom: 16 }}>Simple, transparent pricing</h2>
//           <p style={{ color: "#6B6860", fontSize: 16 }}>No hidden fees. No long-term contracts. Cancel anytime.</p>
//         </motion.div>
//         <motion.div
//           initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
//           style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "center" }}
//         >
//           {pricingPlans.map((plan, i) => (
//             <motion.div key={i} variants={fadeUp} style={{ position: "relative", background: plan.popular ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)", border: plan.popular ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: plan.popular ? "40px 32px" : "32px", transform: plan.popular ? "scale(1.04)" : "scale(1)" }}>
//               {plan.popular && (
//                 <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0A0A0B", fontSize: 12, fontWeight: 700, padding: "5px 16px", borderRadius: 100, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>MOST POPULAR</div>
//               )}
//               <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.name}</p>
//               <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
//                 <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: plan.popular ? "#F59E0B" : "#F5F3ED", lineHeight: 1 }}>{plan.price}</span>
//                 {plan.period && <span style={{ color: "#6B6860", fontSize: 14 }}>{plan.period}</span>}
//               </div>
//               <p style={{ fontSize: 14, color: "#6B6860", marginBottom: 24 }}>{plan.desc}</p>
//               <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 24 }} />
//               <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
//                 {plan.features.map((f, j) => (
//                   <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#9A9790" }}>
//                     <FiCheck size={16} style={{ color: "#F59E0B", marginTop: 1, flexShrink: 0 }} />{f}
//                   </li>
//                 ))}
//               </ul>
//               <button
//                 onClick={() => plan.name !== "Enterprise" ? setShowModal(true) : null}
//                 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 24px", borderRadius: 12, fontWeight: 600, fontSize: 15, border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif", background: plan.popular ? "#F59E0B" : "transparent", color: plan.popular ? "#0A0A0B" : "#E8E6E0" }}
//               >
//                 {plan.cta} <FiArrowRight size={15} />
//               </button>
//             </motion.div>
//           ))}
//         </motion.div>
//       </section>

//       {/* ─── CONTACT ─── */}
//       <section id="contact" style={{ padding: "80px 60px", background: "rgba(255,255,255,0.015)" }}>
//         <div style={{ maxWidth: 1200, margin: "0 auto" }}>
//           <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 56, textAlign: "center" }}>
//             <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Get in Touch</div>
//             <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#F5F3ED", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 14 }}>Let's talk business</h2>
//             <p style={{ color: "#6B6860", fontSize: 16, maxWidth: 420, margin: "0 auto" }}>Questions? Reach us on WhatsApp, email, or any social platform.</p>
//           </motion.div>

//           <motion.div
//             initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
//             style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
//           >
//             {/* WhatsApp */}
//             <motion.a variants={fadeUp}
//               href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20Pankajal%20ERP%2C%20I%27d%20like%20to%20know%20more!`}
//               target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }}
//               style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 20, textDecoration: "none" }}>
//               <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(37,211,102,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#25D366", flexShrink: 0 }}>
//                 <FiMessageCircle />
//               </div>
//               <div>
//                 <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 4, fontWeight: 500 }}>WhatsApp</p>
//                 <p style={{ fontSize: 18, fontWeight: 700, color: "#F5F3ED", letterSpacing: "-0.01em" }}>+91 {CONTACT.whatsapp}</p>
//                 <p style={{ fontSize: 12, color: "#25D366", marginTop: 3 }}>Chat with us →</p>
//               </div>
//             </motion.a>

//             {/* Email */}
//             <motion.a variants={fadeUp}
//               href={`mailto:${CONTACT.email}`} whileHover={{ y: -3 }}
//               style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20, textDecoration: "none" }}>
//               <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#F59E0B", flexShrink: 0 }}>
//                 <FiMail />
//               </div>
//               <div>
//                 <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 4, fontWeight: 500 }}>Email</p>
//                 <p style={{ fontSize: 14, fontWeight: 700, color: "#F5F3ED", wordBreak: "break-all" }}>{CONTACT.email}</p>
//                 <p style={{ fontSize: 12, color: "#F59E0B", marginTop: 3 }}>Reply within 24h →</p>
//               </div>
//             </motion.a>

//             {/* Social */}
//             <motion.div variants={fadeUp} style={{ padding: "24px 28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20 }}>
//               <p style={{ fontSize: 13, color: "#6B6860", fontWeight: 500, marginBottom: 16 }}>Follow Us</p>
//               <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
//                 {[
//                   { href: CONTACT.instagram, icon: <FiInstagram size={18} />, label: "Instagram" },
//                   { href: CONTACT.twitter,   icon: <FiTwitter   size={18} />, label: "Twitter" },
//                   { href: CONTACT.linkedin,  icon: <FiLinkedin  size={18} />, label: "LinkedIn" },
//                   { href: CONTACT.youtube,   icon: <FiYoutube   size={18} />, label: "YouTube" },
//                 ].map(s => (
//                   <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="social-btn" title={s.label}>{s.icon}</a>
//                 ))}
//               </div>
//               <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
//                 <p style={{ fontSize: 12, color: "#4A4845", lineHeight: 1.7 }}>🇮🇳 Built for India · Mon–Sat 9am–7pm IST</p>
//               </div>
//             </motion.div>
//           </motion.div>
//         </div>
//       </section>

//       {/* ─── CTA BANNER ─── */}
//       <section style={{ padding: "60px", maxWidth: 1200, margin: "0 auto 100px" }}>
//         <motion.div
//           initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
//           style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 50%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 28, padding: "64px", textAlign: "center", position: "relative", overflow: "hidden" }}
//         >
//           <Orb style={{ width: 400, height: 400, background: "rgba(245,158,11,0.12)", top: "-30%", left: "40%", transform: "translateX(-50%)" }} />
//           <div style={{ position: "relative", zIndex: 1 }}>
//             <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#F5F3ED", marginBottom: 16, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
//               Ready to transform<br />your operations?
//             </h2>
//             <p style={{ color: "#9A9790", fontSize: 17, maxWidth: 480, margin: "0 auto 36px" }}>
//               Join hundreds of Indian businesses already scaling with Pankajal ERP.
//             </p>
//             <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
//               <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>
//                 Start your free trial <FiArrowRight size={16} />
//               </button>
//               <a href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20I%27d%20like%20to%20learn%20more%20about%20Pankajal%20ERP`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 16, padding: "16px 36px" }}>
//                 <FiMessageCircle size={16} /> WhatsApp us
//               </a>
//             </div>
//           </div>
//         </motion.div>
//       </section>

//       {/* ─── FOOTER ─── */}
//       <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 60px 36px" }}>
//         <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
//           <div>
//             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
//               <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0A0A0B" }}>PKE</div>
//               <span style={{ fontWeight: 700, fontSize: 16, color: "#F5F3ED" }}>Pankajal ERP</span>
//             </div>
//             <p style={{ fontSize: 14, color: "#4A4845", lineHeight: 1.7, marginBottom: 20, maxWidth: 260 }}>
//               All-in-one cloud ERP for Indian businesses. Procurement to elections to marketplace — one platform.
//             </p>
//             <div style={{ display: "flex", gap: 10 }}>
//               {[
//                 { href: CONTACT.instagram, icon: <FiInstagram size={16} /> },
//                 { href: CONTACT.twitter,   icon: <FiTwitter   size={16} /> },
//                 { href: CONTACT.linkedin,  icon: <FiLinkedin  size={16} /> },
//                 { href: CONTACT.youtube,   icon: <FiYoutube   size={16} /> },
//               ].map((s, i) => (
//                 <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="social-btn" style={{ width: 36, height: 36 }}>{s.icon}</a>
//               ))}
//             </div>
//           </div>

//           <div>
//             <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Product</p>
//             {["Modules", "Pricing", "Changelog", "Roadmap"].map(item => (
//               <a key={item} href="#" style={{ display: "block", fontSize: 14, color: "#4A4845", textDecoration: "none", marginBottom: 10 }}
//                 onMouseEnter={e => e.target.style.color = "#9A9790"}
//                 onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
//             ))}
//           </div>

//           <div>
//             <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Company</p>
//             {["About", "Blog", "Careers", "Press"].map(item => (
//               <a key={item} href="#" style={{ display: "block", fontSize: 14, color: "#4A4845", textDecoration: "none", marginBottom: 10 }}
//                 onMouseEnter={e => e.target.style.color = "#9A9790"}
//                 onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
//             ))}
//           </div>

//           <div>
//             <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Contact</p>
//             <a href={`https://wa.me/91${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="contact-link" style={{ marginBottom: 12 }}>
//               <FiMessageCircle size={15} style={{ color: "#25D366", flexShrink: 0 }} />
//               +91 {CONTACT.whatsapp}
//             </a>
//             <a href={`mailto:${CONTACT.email}`} className="contact-link" style={{ marginBottom: 16, wordBreak: "break-all" }}>
//               <FiMail size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />
//               {CONTACT.email}
//             </a>
//             <p style={{ fontSize: 13, color: "#4A4845", lineHeight: 1.6 }}>Mon–Sat · 9am–7pm IST</p>
//           </div>
//         </div>

//         <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
//           <p style={{ fontSize: 13, color: "#4A4845" }}>© {new Date().getFullYear()} Pankajal ERP. Built with ❤️ for India.</p>
//           <div style={{ display: "flex", gap: 24 }}>
//             {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(item => (
//               <a key={item} href="#" style={{ fontSize: 13, color: "#4A4845", textDecoration: "none" }}
//                 onMouseEnter={e => e.target.style.color = "#6B6860"}
//                 onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
//             ))}
//           </div>
//         </div>
//       </footer>
//     </main>
//   );
// }



// "use client";
// import Link from "next/link";
// import { motion, useScroll, useTransform } from "framer-motion";
// import { useRef, useState, useEffect } from "react";
// import {
//   HiCheckCircle,
//   HiShoppingBag,
//   HiChartBar,
//   HiTruck,
//   HiUserGroup,
//   HiDocumentText,
//   HiCog,
// } from "react-icons/hi";
// import {
//   FiFlag,
//   FiShoppingCart,
//   FiDollarSign,
//   FiArrowRight,
//   FiZap,
//   FiCheck,
// } from "react-icons/fi";

// /* ─── Animated counter ─── */
// function Counter({ end, suffix = "", duration = 2 }) {
//   const [count, setCount] = useState(0);
//   const ref = useRef(null);
//   const [started, setStarted] = useState(false);

//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
//       { threshold: 0.5 }
//     );
//     if (ref.current) observer.observe(ref.current);
//     return () => observer.disconnect();
//   }, [started]);

//   useEffect(() => {
//     if (!started) return;
//     let start = 0;
//     const step = end / (duration * 60);
//     const timer = setInterval(() => {
//       start += step;
//       if (start >= end) { setCount(end); clearInterval(timer); }
//       else setCount(Math.floor(start));
//     }, 1000 / 60);
//     return () => clearInterval(timer);
//   }, [started, end, duration]);

//   return <span ref={ref}>{count}{suffix}</span>;
// }

// /* ─── Floating orb ─── */
// function Orb({ style }) {
//   return (
//     <div
//       style={{
//         position: "absolute",
//         borderRadius: "50%",
//         filter: "blur(80px)",
//         pointerEvents: "none",
//         ...style,
//       }}
//     />
//   );
// }

// export default function LandingPage() {
//   const heroRef = useRef(null);
//   const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
//   const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
//   const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

//   const coreModules = [
//     {
//       icon: <HiShoppingBag />,
//       title: "Procure to Pay",
//       desc: "End-to-end procurement & payment with approvals and vendor collaboration.",
//       color: "#F59E0B",
//       bg: "rgba(245,158,11,0.08)",
//     },
//     {
//       icon: <HiChartBar />,
//       title: "Inventory",
//       desc: "Real-time stock tracking, multi-warehouse, batch & expiry management.",
//       color: "#3B82F6",
//       bg: "rgba(59,130,246,0.08)",
//     },
//     {
//       icon: <HiTruck />,
//       title: "Order to Cash",
//       desc: "Sales orders, invoicing, delivery & payment reconciliation.",
//       color: "#10B981",
//       bg: "rgba(16,185,129,0.08)",
//     },
//     {
//       icon: <HiCog />,
//       title: "Production",
//       desc: "BOM, production orders, PPC, quality checks — full manufacturing flow.",
//       color: "#8B5CF6",
//       bg: "rgba(139,92,246,0.08)",
//     },
//     {
//       icon: <HiUserGroup />,
//       title: "CRM",
//       desc: "Lead, opportunity, campaign management, customer support & ticketing.",
//       color: "#F43F5E",
//       bg: "rgba(244,63,94,0.08)",
//     },
//     {
//       icon: <HiDocumentText />,
//       title: "Reports & Analytics",
//       desc: "P&L, balance sheet, ageing reports, bank statements, live dashboards.",
//       color: "#06B6D4",
//       bg: "rgba(6,182,212,0.08)",
//     },
//   ];

//   const advancedModules = [
//     {
//       icon: <FiFlag />,
//       title: "Election Management",
//       badge: "Premium",
//       badgeColor: "#F59E0B",
//       desc: "Complete political campaign suite — constituency management, booth tracking, voter database, surveys, rally planning, shadow expense register, and real-time analytics.",
//       gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)",
//       border: "rgba(245,158,11,0.2)",
//     },
//     {
//       icon: <FiShoppingCart />,
//       title: "Multi-Vendor Marketplace",
//       badge: "Premium",
//       badgeColor: "#10B981",
//       desc: "Launch a full marketplace inside your ERP. Vendors list products & services, customers buy, you earn commission. Supports physical goods, events, weddings, photography & entertainment.",
//       gradient: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)",
//       border: "rgba(16,185,129,0.2)",
//     },
//     {
//       icon: <FiDollarSign />,
//       title: "Services & Entertainment",
//       badge: "Coming Soon",
//       badgeColor: "#8B5CF6",
//       desc: "Specialised modules for service businesses: slot booking, calendar management, vendor ratings, and dynamic pricing. Ideal for wedding planners, DJs, photographers.",
//       gradient: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 100%)",
//       border: "rgba(139,92,246,0.2)",
//     },
//   ];

//   const pricingPlans = [
//     {
//       name: "Starter",
//       price: "₹999",
//       period: "/month",
//       desc: "Perfect for small businesses getting started.",
//       features: ["Procure to Pay", "Inventory", "Order to Cash", "CRM", "Basic Reports", "1 Company · 5 Users"],
//       cta: "Start Free Trial",
//       popular: false,
//       accentColor: "#F59E0B",
//     },
//     {
//       name: "Professional",
//       price: "₹2,499",
//       period: "/month",
//       desc: "Everything growing businesses need, all in one.",
//       features: ["All Starter features", "Production", "HR & Payroll", "Full Accounts", "Election Module (add-on)", "Marketplace (add-on)", "10 Users"],
//       cta: "Start Free Trial",
//       popular: true,
//       accentColor: "#F59E0B",
//     },
//     {
//       name: "Enterprise",
//       price: "Custom",
//       period: "",
//       desc: "Built around your scale and requirements.",
//       features: ["All Professional features", "Unlimited Users", "Dedicated Support", "Custom Integrations", "White Label Option", "On-Premise / Private Cloud"],
//       cta: "Contact Sales",
//       popular: false,
//       accentColor: "#F59E0B",
//     },
//   ];

//   const stats = [
//     { value: 500, suffix: "+", label: "Companies" },
//     { value: 12, suffix: " modules", label: "Integrated" },
//     { value: 99.9, suffix: "%", label: "Uptime SLA" },
//     { value: 24, suffix: "/7", label: "Support" },
//   ];

//   const stagger = {
//     hidden: {},
//     visible: { transition: { staggerChildren: 0.08 } },
//   };

//   const fadeUp = {
//     hidden: { opacity: 0, y: 32 },
//     visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
//   };

//   const fadeIn = {
//     hidden: { opacity: 0 },
//     visible: { opacity: 1, transition: { duration: 0.6 } },
//   };

//   return (
//     <main
//       style={{
//         minHeight: "100vh",
//         background: "#0A0A0B",
//         color: "#E8E6E0",
//         fontFamily: "'DM Sans', sans-serif",
//         overflowX: "hidden",
//       }}
//     >
//       {/* ─── Google Fonts ─── */}
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');

//         * { box-sizing: border-box; margin: 0; padding: 0; }

//         .gold { color: #F59E0B; }
//         .muted { color: #6B6860; }
//         .subtle { color: #9A9790; }

//         .btn-primary {
//           display: inline-flex; align-items: center; gap: 8px;
//           background: #F59E0B; color: #0A0A0B;
//           padding: 14px 28px; border-radius: 12px;
//           font-weight: 600; font-size: 15px; border: none; cursor: pointer;
//           transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
//           text-decoration: none;
//           box-shadow: 0 0 0 0 rgba(245,158,11,0);
//         }
//         .btn-primary:hover {
//           background: #FBBF24;
//           transform: translateY(-1px);
//           box-shadow: 0 8px 32px rgba(245,158,11,0.3);
//         }

//         .btn-ghost {
//           display: inline-flex; align-items: center; gap: 8px;
//           background: transparent; color: #E8E6E0;
//           padding: 13px 28px; border-radius: 12px;
//           font-weight: 500; font-size: 15px; cursor: pointer;
//           border: 1px solid rgba(232,230,224,0.15);
//           transition: border-color 0.2s, background 0.2s, transform 0.15s;
//           text-decoration: none;
//         }
//         .btn-ghost:hover {
//           border-color: rgba(232,230,224,0.35);
//           background: rgba(232,230,224,0.05);
//           transform: translateY(-1px);
//         }

//         .module-card {
//           background: rgba(255,255,255,0.03);
//           border: 1px solid rgba(255,255,255,0.07);
//           border-radius: 20px;
//           padding: 28px;
//           transition: border-color 0.25s, background 0.25s, transform 0.25s;
//           cursor: default;
//         }
//         .module-card:hover {
//           border-color: rgba(245,158,11,0.25);
//           background: rgba(245,158,11,0.04);
//           transform: translateY(-3px);
//         }

//         .divider {
//           height: 1px;
//           background: linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent);
//         }

//         .nav-link {
//           color: #9A9790; font-size: 14px; text-decoration: none;
//           transition: color 0.2s;
//         }
//         .nav-link:hover { color: #E8E6E0; }

//         @keyframes float {
//           0%, 100% { transform: translateY(0px); }
//           50% { transform: translateY(-12px); }
//         }
//         @keyframes pulse-ring {
//           0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
//           70% { box-shadow: 0 0 0 16px rgba(245,158,11,0); }
//           100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
//         }
//       `}</style>

//       {/* ─── NAVBAR ─── */}
//       <motion.nav
//         initial={{ opacity: 0, y: -16 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5 }}
//         style={{
//           position: "sticky", top: 0, zIndex: 100,
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//           padding: "16px 40px",
//           background: "rgba(10,10,11,0.85)",
//           backdropFilter: "blur(20px)",
//           borderBottom: "1px solid rgba(255,255,255,0.06)",
//         }}
//       >
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{
//             width: 34, height: 34, borderRadius: 10,
//             background: "linear-gradient(135deg, #F59E0B, #D97706)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 15, fontWeight: 700, color: "#0A0A0B",
//           }}>A</div>
//           <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.02em" }}>
//             AITS <span className="gold">ERP</span>
//           </span>
//         </div>

//         <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
//           {["Modules", "Pricing", "Enterprise"].map(item => (
//             <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
//           ))}
//         </div>

//         <div style={{ display: "flex", gap: 12 }}>
//           <Link href="/signin" className="btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>
//             Sign in
//           </Link>
//           <Link href="/signup" className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
//             Get started
//           </Link>
//         </div>
//       </motion.nav>

//       {/* ─── HERO ─── */}
//       <section
//         ref={heroRef}
//         style={{
//           position: "relative",
//           minHeight: "90vh",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "center",
//           textAlign: "center",
//           padding: "80px 24px 100px",
//           overflow: "hidden",
//         }}
//       >
//         {/* Background orbs */}
//         <Orb style={{ width: 600, height: 600, background: "rgba(245,158,11,0.08)", top: "10%", left: "50%", transform: "translateX(-50%)" }} />
//         <Orb style={{ width: 400, height: 400, background: "rgba(139,92,246,0.07)", top: "20%", left: "10%" }} />
//         <Orb style={{ width: 300, height: 300, background: "rgba(59,130,246,0.07)", top: "30%", right: "5%" }} />

//         {/* Grid overlay */}
//         <div style={{
//           position: "absolute", inset: 0, opacity: 0.03,
//           backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px),
//                             repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px)`,
//           pointerEvents: "none",
//         }} />

//         <motion.div style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 1, maxWidth: 760 }}>
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5 }}
//             style={{
//               display: "inline-flex", alignItems: "center", gap: 8,
//               background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
//               borderRadius: 100, padding: "6px 16px", marginBottom: 32,
//               fontSize: 13, color: "#F59E0B", fontWeight: 500,
//             }}
//           >
//             <FiZap size={13} />
//             Trusted by 500+ businesses across India
//           </motion.div>

//           <motion.h1
//             initial={{ opacity: 0, y: 30 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
//             style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "clamp(42px, 7vw, 80px)",
//               fontWeight: 900,
//               lineHeight: 1.05,
//               letterSpacing: "-0.03em",
//               marginBottom: 24,
//               color: "#F5F3ED",
//             }}
//           >
//             Run your entire<br />
//             <em style={{ color: "#F59E0B", fontStyle: "italic" }}>business</em> from one place
//           </motion.h1>

//           <motion.p
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6, delay: 0.25 }}
//             style={{
//               fontSize: "clamp(16px, 2vw, 19px)",
//               color: "#9A9790",
//               lineHeight: 1.65,
//               marginBottom: 44,
//               maxWidth: 580,
//               margin: "0 auto 44px",
//             }}
//           >
//             Procurement, inventory, sales, production, CRM, elections, and marketplaces —
//             unified in one modern cloud ERP built for Indian businesses.
//           </motion.p>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5, delay: 0.35 }}
//             style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}
//           >
//             <Link href="/signup" className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
//               Start free trial <FiArrowRight size={16} />
//             </Link>
//             <Link href="/signin" className="btn-ghost" style={{ fontSize: 16, padding: "16px 32px" }}>
//               Sign in to your account
//             </Link>
//           </motion.div>

//           <motion.p
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ delay: 0.6 }}
//             style={{ marginTop: 20, fontSize: 13, color: "#6B6860" }}
//           >
//             No credit card required · 14-day free trial · Cancel anytime
//           </motion.p>
//         </motion.div>
//       </section>

//       {/* ─── STATS BAR ─── */}
//       <div className="divider" />
//       <motion.section
//         initial="hidden"
//         whileInView="visible"
//         viewport={{ once: true, margin: "-60px" }}
//         variants={stagger}
//         style={{
//           display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
//           padding: "48px 80px",
//           gap: 0,
//           background: "rgba(255,255,255,0.015)",
//         }}
//       >
//         {stats.map((s, i) => (
//           <motion.div
//             key={i}
//             variants={fadeUp}
//             style={{
//               textAlign: "center",
//               padding: "0 24px",
//               borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
//             }}
//           >
//             <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: "#F59E0B", lineHeight: 1.1 }}>
//               <Counter end={s.value} suffix={s.suffix} />
//             </div>
//             <div style={{ color: "#6B6860", fontSize: 14, marginTop: 6, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
//               {s.label}
//             </div>
//           </motion.div>
//         ))}
//       </motion.section>
//       <div className="divider" />

//       {/* ─── CORE MODULES ─── */}
//       <section id="modules" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true, margin: "-80px" }}
//           variants={fadeUp}
//           style={{ marginBottom: 60 }}
//         >
//           <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>
//             Core Platform
//           </div>
//           <h2 style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900,
//             lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED",
//           }}>
//             Every module your<br />operations demand
//           </h2>
//         </motion.div>

//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true, margin: "-60px" }}
//           variants={stagger}
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(3, 1fr)",
//             gap: 16,
//           }}
//         >
//           {coreModules.map((mod, i) => (
//             <motion.div key={i} variants={fadeUp} className="module-card">
//               <div
//                 style={{
//                   width: 48, height: 48, borderRadius: 14,
//                   background: mod.bg, border: `1px solid ${mod.color}22`,
//                   display: "flex", alignItems: "center", justifyContent: "center",
//                   fontSize: 22, color: mod.color, marginBottom: 20,
//                 }}
//               >
//                 {mod.icon}
//               </div>
//               <h3 style={{ fontSize: 18, fontWeight: 600, color: "#F5F3ED", marginBottom: 10, letterSpacing: "-0.01em" }}>
//                 {mod.title}
//               </h3>
//               <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.65 }}>
//                 {mod.desc}
//               </p>
//             </motion.div>
//           ))}
//         </motion.div>
//       </section>

//       {/* ─── ADVANCED MODULES ─── */}
//       <section style={{ padding: "80px 60px", background: "rgba(255,255,255,0.015)" }}>
//         <div style={{ maxWidth: 1200, margin: "0 auto" }}>
//           <motion.div
//             initial="hidden"
//             whileInView="visible"
//             viewport={{ once: true }}
//             variants={fadeUp}
//             style={{ marginBottom: 60 }}
//           >
//             <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>
//               Advanced Modules
//             </div>
//             <h2 style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900,
//               lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED",
//             }}>
//               Beyond traditional ERP
//             </h2>
//           </motion.div>

//           <motion.div
//             initial="hidden"
//             whileInView="visible"
//             viewport={{ once: true }}
//             variants={stagger}
//             style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
//           >
//             {advancedModules.map((mod, i) => (
//               <motion.div
//                 key={i}
//                 variants={fadeUp}
//                 style={{
//                   background: mod.gradient,
//                   border: `1px solid ${mod.border}`,
//                   borderRadius: 24,
//                   padding: 32,
//                   transition: "transform 0.25s",
//                 }}
//                 whileHover={{ y: -4 }}
//               >
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
//                   <div style={{
//                     width: 52, height: 52, borderRadius: 16,
//                     background: "rgba(255,255,255,0.06)",
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     fontSize: 22, color: mod.badgeColor,
//                   }}>
//                     {mod.icon}
//                   </div>
//                   <span style={{
//                     fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
//                     textTransform: "uppercase", padding: "5px 12px",
//                     borderRadius: 100, background: `${mod.badgeColor}18`,
//                     color: mod.badgeColor, border: `1px solid ${mod.badgeColor}30`,
//                   }}>
//                     {mod.badge}
//                   </span>
//                 </div>
//                 <h3 style={{ fontSize: 21, fontWeight: 700, color: "#F5F3ED", marginBottom: 12, letterSpacing: "-0.02em" }}>
//                   {mod.title}
//                 </h3>
//                 <p style={{ fontSize: 14, color: "#9A9790", lineHeight: 1.7 }}>
//                   {mod.desc}
//                 </p>
//               </motion.div>
//             ))}
//           </motion.div>
//         </div>
//       </section>

//       {/* ─── PRICING ─── */}
//       <section id="pricing" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true }}
//           variants={fadeUp}
//           style={{ textAlign: "center", marginBottom: 64 }}
//         >
//           <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>
//             Pricing
//           </div>
//           <h2 style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900,
//             lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED", marginBottom: 16,
//           }}>
//             Simple, transparent pricing
//           </h2>
//           <p style={{ color: "#6B6860", fontSize: 16 }}>No hidden fees. No long-term contracts. Cancel anytime.</p>
//         </motion.div>

//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true }}
//           variants={stagger}
//           style={{
//             display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
//             gap: 16, alignItems: "center",
//           }}
//         >
//           {pricingPlans.map((plan, i) => (
//             <motion.div
//               key={i}
//               variants={fadeUp}
//               style={{
//                 position: "relative",
//                 background: plan.popular ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
//                 border: plan.popular ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)",
//                 borderRadius: 24,
//                 padding: plan.popular ? "40px 32px" : "32px",
//                 transform: plan.popular ? "scale(1.04)" : "scale(1)",
//               }}
//             >
//               {plan.popular && (
//                 <div style={{
//                   position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
//                   background: "#F59E0B", color: "#0A0A0B", fontSize: 12, fontWeight: 700,
//                   padding: "5px 16px", borderRadius: 100, whiteSpace: "nowrap",
//                   letterSpacing: "0.04em",
//                 }}>
//                   MOST POPULAR
//                 </div>
//               )}

//               <div style={{ marginBottom: 24 }}>
//                 <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
//                   {plan.name}
//                 </p>
//                 <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
//                   <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: plan.popular ? "#F59E0B" : "#F5F3ED", lineHeight: 1 }}>
//                     {plan.price}
//                   </span>
//                   {plan.period && (
//                     <span style={{ color: "#6B6860", fontSize: 14 }}>{plan.period}</span>
//                   )}
//                 </div>
//                 <p style={{ fontSize: 14, color: "#6B6860" }}>{plan.desc}</p>
//               </div>

//               <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 24 }} />

//               <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
//                 {plan.features.map((f, j) => (
//                   <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#9A9790" }}>
//                     <FiCheck size={16} style={{ color: "#F59E0B", marginTop: 1, flexShrink: 0 }} />
//                     {f}
//                   </li>
//                 ))}
//               </ul>

//               <Link
//                 href={plan.name === "Enterprise" ? "/contact" : "/signup"}
//                 style={{
//                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
//                   padding: "14px 24px", borderRadius: 12, fontWeight: 600, fontSize: 15,
//                   textDecoration: "none", transition: "all 0.2s",
//                   ...(plan.popular
//                     ? { background: "#F59E0B", color: "#0A0A0B" }
//                     : { background: "transparent", color: "#E8E6E0", border: "1px solid rgba(255,255,255,0.15)" }),
//                 }}
//               >
//                 {plan.cta} <FiArrowRight size={15} />
//               </Link>
//             </motion.div>
//           ))}
//         </motion.div>
//       </section>

//       {/* ─── CTA BANNER ─── */}
//       <section style={{ padding: "60px", maxWidth: 1200, margin: "0 auto 100px" }}>
//         <motion.div
//           initial="hidden"
//           whileInView="visible"
//           viewport={{ once: true }}
//           variants={fadeIn}
//           style={{
//             background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 50%, rgba(139,92,246,0.08) 100%)",
//             border: "1px solid rgba(245,158,11,0.2)",
//             borderRadius: 28,
//             padding: "64px",
//             textAlign: "center",
//             position: "relative",
//             overflow: "hidden",
//           }}
//         >
//           <Orb style={{ width: 400, height: 400, background: "rgba(245,158,11,0.12)", top: "-30%", left: "40%", transform: "translateX(-50%)" }} />
//           <div style={{ position: "relative", zIndex: 1 }}>
//             <h2 style={{
//               fontFamily: "'Playfair Display', serif",
//               fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900,
//               color: "#F5F3ED", marginBottom: 16, letterSpacing: "-0.025em", lineHeight: 1.1,
//             }}>
//               Ready to transform<br />your operations?
//             </h2>
//             <p style={{ color: "#9A9790", fontSize: 17, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
//               Join hundreds of Indian businesses already scaling with AITS ERP.
//             </p>
//             <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
//               <Link href="/signup" className="btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>
//                 Start your free trial <FiArrowRight size={16} />
//               </Link>
//               <Link href="/contact" className="btn-ghost" style={{ fontSize: 16, padding: "16px 36px" }}>
//                 Talk to sales
//               </Link>
//             </div>
//           </div>
//         </motion.div>
//       </section>

//       {/* ─── FOOTER ─── */}
//       <footer style={{
//         borderTop: "1px solid rgba(255,255,255,0.06)",
//         padding: "40px 60px",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//       }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           <div style={{
//             width: 28, height: 28, borderRadius: 8,
//             background: "linear-gradient(135deg, #F59E0B, #D97706)",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize: 13, fontWeight: 700, color: "#0A0A0B",
//           }}>A</div>
//           <span style={{ fontWeight: 600, fontSize: 15, color: "#9A9790" }}>
//             AITS ERP
//           </span>
//         </div>
//         <p style={{ fontSize: 13, color: "#4A4845" }}>
//           © {new Date().getFullYear()} AITS ERP. Built with ❤️ for India.
//         </p>
//         <div style={{ display: "flex", gap: 24 }}>
//           {["Privacy", "Terms", "Support"].map(item => (
//             <a key={item} href="#" style={{ fontSize: 13, color: "#4A4845", textDecoration: "none", transition: "color 0.2s" }}
//               onMouseEnter={e => e.target.style.color = "#9A9790"}
//               onMouseLeave={e => e.target.style.color = "#4A4845"}
//             >
//               {item}
//             </a>
//           ))}
//         </div>
//       </footer>
//     </main>
//   );
// }


// "use client";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import { HiCheckCircle } from "react-icons/hi";

// export default function LandingPage() {
//   const features = [
//     "Procure to Pay – Streamline your procurement and payment processes.",
//     "Inventory – Real-time inventory tracking and alerts.",
//     "Order to Cash – Manage your sales cycle from order to cash.",
//     "Production – Optimize your production processes for better efficiency.",
//     "CRM – Enhance customer relationships and support.",
//     "Reports – Insightful reports for better decision making.",
//   ];

//   // Framer motion variants
//   const listVariants = {
//     hidden: { opacity: 0 },
//     show: {
//       opacity: 1,
//       transition: { staggerChildren: 0.15 },
//     },
//   };

//   const itemVariants = {
//     hidden: { opacity: 0, y: 20 },
//     show: { opacity: 1, y: 0 },
//   };

//   return (
//     <main className="min-h-screen flex flex-col justify-between items-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800 px-4 sm:px-6 py-6">
//       {/* Header */}
//       <header className="flex flex-col items-center w-full">
//         {/* Logos */}
//         <div className="relative w-full flex justify-center items-center mb-6">
//           {/* Center logo */}
//           <img
//             src="/aits_pig.png"
//             alt="ERP Dashboard"
//             className="h-20 sm:h-28 md:h-36 w-auto"
//           />

//           {/* Right corner logo */}
//           <img
//             src="/aits_logo.png"
//             alt="AITS ERP Logo"
//             className="absolute right-2 top-0 h-20 sm:h-28 md:h-36 w-auto"
//           />
//         </div>

//         {/* Title */}
//         <motion.h1
//           initial={{ opacity: 0, y: -30 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-3 text-neutral-700"
//         >
//           Welcome to <span className="text-amber-500">AITS ERP</span>
//         </motion.h1>
//         <p className="text-center text-sm sm:text-base md:text-lg max-w-2xl">
//           Manage your sales, purchases, inventory, and business operations from
//           one centralized, modern ERP platform.
//         </p>
//       </header>

//       {/* Actions & Features */}
//       <div className="flex flex-col items-center gap-6 mt-6">
//         {/* Buttons */}
//         <div className="flex flex-col sm:flex-row gap-4">
//           <Link
//             href="/signin"
//             className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition text-center"
//           >
//             Sign In
//           </Link>
//           <Link
//             href="/signup"
//             className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition text-center"
//           >
//             Company Registration
//           </Link>
//         </div>

//         {/* Features */}
//         <h2 className="text-xl sm:text-2xl font-bold text-neutral-700">
//           Key Features
//         </h2>
//         <motion.ul
//           className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl"
//           variants={listVariants}
//           initial="hidden"
//           whileInView="show"
//           viewport={{ once: true }}
//         >
//           {features.map((text, idx) => (
//             <motion.li
//               key={idx}
//               className="flex items-start gap-2 text-sm sm:text-base"
//               variants={itemVariants}
//             >
//               <HiCheckCircle className="text-amber-500 mt-0.5 shrink-0" />
//               <span>{text}</span>
//             </motion.li>
//           ))}
//         </motion.ul>
//       </div>

//       {/* Footer */}
//       <footer className="text-center text-xs sm:text-sm text-gray-600 mt-6">
//         &copy; 2025 AITS ERP. All rights reserved.
//       </footer>
//     </main>
//   );
// }
