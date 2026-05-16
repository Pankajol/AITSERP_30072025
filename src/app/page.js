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

/* ─── Re-usable Trial Banner ─── */
export function TrialBanner() {
  const [record, setRecord] = useState(null);
  useEffect(() => { setRecord(getTrialRecord()); }, []);
  if (!record) return null;
  const daysLeft = getTrialDaysLeft(record);
  const active = isTrialActive(record);
  if (!active) return (
    <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, color: "#FCA5A5", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
      <FiAlertCircle size={18} />
      <span>Your 14-day free trial has <strong>expired</strong>. Upgrade to continue using AITS ERP.</span>
      <Link href="/pricing" style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Upgrade Now</Link>
    </div>
  );
  return (
    <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, color: "#FCD34D", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
      <FiClock size={16} />
      <span>Free trial: <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</strong> — expires {new Date(record.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      <Link href="/pricing" style={{ marginLeft: "auto", background: "#F59E0B", color: "#0A0A0B", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Upgrade</Link>
    </div>
  );
}

/* ─── Helpers ─── */
function Orb({ style }) {
  return <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none", ...style }} />;
}

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
  } catch {
    return "__SKIP__";
  }
}

/* ─── Trial Modal ─── */
function TrialModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    password: "",
    plan: "Starter",
  });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.company.trim()) e.company = "Company name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) e.phone = "Valid 10-digit phone required";
    if (form.password.length < 8) e.password = "Min 8 characters";
    return e;
  };

  /* ─── MERGED handleSubmit ─── */
  const handleSubmit = async () => {
    // 1. Client-side validation first
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setErrors({});

    try {
      // 2. AI validation
      const validationRaw = await callClaude([{
        role: "user",
        content: `Validate this ERP trial registration. Respond ONLY in JSON (no markdown): {"valid":true,"issues":[]}
Data — Name:"${form.name}", Company:"${form.company}", Email:"${form.email}", Phone:"${form.phone}".
Return valid:false with issues array if data looks fake, suspicious, or clearly invalid.`,
      }]);

      if (validationRaw !== "__SKIP__") {
        let aiResult = { valid: true, issues: [] };
        try {
          aiResult = JSON.parse(validationRaw.replace(/```json|```/g, "").trim());
        } catch {}

        if (!aiResult.valid) {
          setErrors({
            general: "AI Review: " + (aiResult.issues?.join(", ") || "Please check your details."),
          });
          setLoading(false);
          return;
        }
      }

      // 3. Simulate processing + start trial in localStorage
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

  const fields = [
    { k: "name",     label: "Full Name",       type: "text",     placeholder: "Pankaj Agarwal" },
    { k: "company",  label: "Company Name",    type: "text",     placeholder: "Agarwal Enterprises" },
    { k: "email",    label: "Work Email",      type: "email",    placeholder: "you@company.com" },
    { k: "phone",    label: "Phone Number",    type: "tel",      placeholder: "9876543210" },
    { k: "password", label: "Create Password", type: "password", placeholder: "Min 8 characters" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", damping: 24, stiffness: 260 }}
        style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, width: "100%", maxWidth: 480, padding: "36px 36px 28px", position: "relative", fontFamily: "'DM Sans',sans-serif", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#9A9790", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <HiX size={16} />
        </button>

        {/* ─── STEP 1: Form ─── */}
        {step === 1 && <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "4px 12px", fontSize: 12, color: "#F59E0B", fontWeight: 600, marginBottom: 14 }}>
              <FiShield size={12} /> 14-Day Free Trial — No Credit Card
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: "#F5F3ED", letterSpacing: "-0.025em", marginBottom: 6 }}>Start your free trial</h2>
            <p style={{ fontSize: 14, color: "#6B6860" }}>Full access to all features. Auto-deactivated after 14 days.</p>
          </div>

          {/* Fields */}
          {fields.map(({ k, label, type, placeholder }) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#9A9790", marginBottom: 6 }}>{label}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={k === "password" ? (showPw ? "text" : "password") : type}
                  value={form[k]}
                  placeholder={placeholder}
                  onChange={ev => {
                    setForm(f => ({ ...f, [k]: ev.target.value }));
                    setErrors(er => ({ ...er, [k]: "" }));
                  }}
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${errors[k] ? "#EF4444" : "rgba(255,255,255,0.12)"}`, color: "#F5F3ED", fontSize: 14, outline: "none", fontFamily: "'DM Sans',sans-serif", paddingRight: k === "password" ? 42 : 14 }}
                />
                {k === "password" && (
                  <button
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#6B6860", cursor: "pointer" }}
                  >
                    {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                )}
              </div>
              {errors[k] && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors[k]}</p>}
            </div>
          ))}

          {/* Plan selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#9A9790", display: "block", marginBottom: 6 }}>Trial Plan</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#F5F3ED", fontSize: 14, fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}
            >
              <option value="Starter">Starter — ₹999/mo</option>
              <option value="Professional">Professional — ₹2,499/mo</option>
              <option value="Enterprise">Enterprise — Custom</option>
            </select>
          </div>

          {/* General / AI error banner */}
          {errors.general && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#FCA5A5" }}>
              <FiAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {errors.general}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: loading ? "rgba(245,158,11,0.5)" : "#F59E0B", color: "#0A0A0B", fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s", fontFamily: "'DM Sans',sans-serif" }}
          >
            {loading ? <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
              Validating &amp; Activating…
            </> : <>Activate Free Trial <FiArrowRight size={16} /></>}
          </button>

          <p style={{ fontSize: 12, color: "#4A4845", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
            No charges unless you upgrade. Trial blocks automatically after 14 days.
          </p>
        </>}

        {/* ─── STEP 2: Success ─── */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
              style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, color: "#10B981" }}
            >
              <HiCheckCircle />
            </motion.div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "#F5F3ED", marginBottom: 10, letterSpacing: "-0.02em" }}>Trial Activated! 🎉</h2>
            <p style={{ color: "#9A9790", fontSize: 15, marginBottom: 12, lineHeight: 1.7 }}>
              Welcome, <strong style={{ color: "#F5F3ED" }}>{form.name}</strong>.<br />
              Your <strong style={{ color: "#F59E0B" }}>{form.plan}</strong> trial runs for <strong style={{ color: "#F59E0B" }}>14 days</strong>.
            </p>
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: "#FCD34D" }}>
              <FiClock size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
              Expires: <strong>{new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: "#6B6860", textAlign: "left" }}>
              <p style={{ marginBottom: 8, color: "#9A9790", fontWeight: 600 }}>What happens after 14 days?</p>
              <p style={{ lineHeight: 1.7 }}>Your account will be <strong style={{ color: "#F5F3ED" }}>automatically locked</strong>. Data is preserved for 30 days. Upgrade anytime to reactivate instantly.</p>
            </div>
            <button
              onClick={onClose}
              style={{ background: "#F59E0B", color: "#0A0A0B", border: "none", cursor: "pointer", width: "100%", padding: "14px", borderRadius: 12, fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              Go to Dashboard <FiArrowRight size={16} />
            </button>
            <p style={{ fontSize: 12, color: "#4A4845", marginTop: 14 }}>
              Check <strong style={{ color: "#9A9790" }}>{form.email}</strong> for your login details
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
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [showModal, setShowModal] = useState(false);
  const [trialRecord, setTrialRecord] = useState(null);

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
    { icon: <HiShoppingBag />, title: "Procure to Pay",      desc: "End-to-end procurement & payment with approvals and vendor collaboration.",               color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    { icon: <HiChartBar />,   title: "Inventory",            desc: "Real-time stock tracking, multi-warehouse, batch & expiry management.",                   color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
    { icon: <HiTruck />,      title: "Order to Cash",        desc: "Sales orders, invoicing, delivery & payment reconciliation.",                             color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    { icon: <HiCog />,        title: "Production",           desc: "BOM, production orders, PPC, quality checks — full manufacturing flow.",                  color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
    { icon: <HiUserGroup />,  title: "CRM",                  desc: "Lead, opportunity, campaign management, customer support & ticketing.",                   color: "#F43F5E", bg: "rgba(244,63,94,0.08)" },
    { icon: <HiDocumentText />, title: "Reports & Analytics",desc: "P&L, balance sheet, ageing reports, bank statements, live dashboards.",                  color: "#06B6D4", bg: "rgba(6,182,212,0.08)" },
  ];

  const advancedModules = [
    { icon: <FiFlag />,         title: "Election Management",       badge: "Premium",    badgeColor: "#F59E0B", desc: "Complete political campaign suite — constituency management, booth tracking, voter database, surveys, rally planning, shadow expense register, and real-time analytics.", gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.03) 100%)", border: "rgba(245,158,11,0.2)" },
    { icon: <FiShoppingCart />, title: "Multi-Vendor Marketplace",  badge: "Premium",    badgeColor: "#10B981", desc: "Launch a full marketplace inside your ERP. Vendors list products & services, customers buy, you earn commission. Supports physical goods, events, weddings & entertainment.", gradient: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)", border: "rgba(16,185,129,0.2)" },
    { icon: <FiDollarSign />,   title: "Services & Entertainment",  badge: "Coming Soon",badgeColor: "#8B5CF6", desc: "Slot booking, calendar management, vendor ratings, and dynamic pricing. Ideal for wedding planners, DJs, photographers, and event managers.", gradient: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 100%)", border: "rgba(139,92,246,0.2)" },
  ];

  const pricingPlans = [
    { name: "Starter",      price: "₹999",   period: "/month", desc: "Perfect for small businesses.",        features: ["Procure to Pay", "Inventory", "Order to Cash", "CRM", "Basic Reports", "1 Company · 5 Users"],                                          cta: "Start Free Trial", popular: false },
    { name: "Professional", price: "₹2,499", period: "/month", desc: "Everything growing businesses need.", features: ["All Starter features", "Production", "HR & Payroll", "Full Accounts", "Election Module (add-on)", "Marketplace (add-on)", "10 Users"], cta: "Start Free Trial", popular: true  },
    { name: "Enterprise",   price: "Custom", period: "",        desc: "Built around your scale.",             features: ["All Professional features", "Unlimited Users", "Dedicated Support", "Custom Integrations", "White Label Option", "On-Premise / Private Cloud"], cta: "Contact Sales",    popular: false },
  ];

  const stats = [
    { value: 500,  suffix: "+",      label: "Companies" },
    { value: 12,   suffix: " modules",label: "Integrated" },
    { value: 99.9, suffix: "%",      label: "Uptime SLA" },
    { value: 24,   suffix: "/7",     label: "Support" },
  ];

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const fadeUp  = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
  const fadeIn  = { hidden: { opacity: 0 },        visible: { opacity: 1, transition: { duration: 0.6 } } };

  const trialActive = isTrialActive(trialRecord);
  const daysLeft    = getTrialDaysLeft(trialRecord);

  return (
    <main style={{ minHeight: "100vh", background: "#0A0A0B", color: "#E8E6E0", fontFamily: "'DM Sans', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #F59E0B; color: #0A0A0B; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px; border: none; cursor: pointer; transition: background 0.2s, transform 0.15s, box-shadow 0.2s; text-decoration: none; font-family: 'DM Sans',sans-serif; }
        .btn-primary:hover { background: #FBBF24; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(245,158,11,0.3); }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #E8E6E0; padding: 13px 28px; border-radius: 12px; font-weight: 500; font-size: 15px; cursor: pointer; border: 1px solid rgba(232,230,224,0.15); transition: border-color 0.2s, background 0.2s, transform 0.15s; text-decoration: none; font-family: 'DM Sans',sans-serif; }
        .btn-ghost:hover { border-color: rgba(232,230,224,0.35); background: rgba(232,230,224,0.05); transform: translateY(-1px); }
        .module-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; transition: border-color 0.25s, background 0.25s, transform 0.25s; }
        .module-card:hover { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.04); transform: translateY(-3px); }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent); }
        .nav-link { color: #9A9790; font-size: 14px; text-decoration: none; transition: color 0.2s; }
        .nav-link:hover { color: #E8E6E0; }
        .social-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); color: #6B6860; text-decoration: none; transition: border-color 0.2s, color 0.2s, background 0.2s; }
        .social-btn:hover { border-color: rgba(245,158,11,0.4); color: #F59E0B; background: rgba(245,158,11,0.07); }
        .contact-link { color: #9A9790; text-decoration: none; font-size: 14px; transition: color 0.2s; display: flex; align-items: center; gap: 8px; }
        .contact-link:hover { color: #F59E0B; }
        select option { background: #1a1a1c; color: #F5F3ED; }
      `}</style>

      <AnimatePresence>
        {showModal && (
          <TrialModal
            onClose={() => setShowModal(false)}
            onSuccess={rec => setTrialRecord(rec)}
          />
        )}
      </AnimatePresence>

      {/* ─── TRIAL STATUS BAR ─── */}
      {trialRecord && (
        <div style={{ background: trialActive ? "rgba(245,158,11,0.08)" : "rgba(220,38,38,0.1)", borderBottom: `1px solid ${trialActive ? "rgba(245,158,11,0.2)" : "rgba(220,38,38,0.25)"}`, padding: "10px 40px", display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
          {trialActive ? (
            <>
              <FiClock size={14} style={{ color: "#F59E0B" }} />
              <span style={{ color: "#FCD34D" }}>
                Free trial active — <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</strong>
                &nbsp;(expires {new Date(trialRecord.trialEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
              </span>
              <span style={{ marginLeft: "auto", color: "#6B6860", fontSize: 12 }}>Signed in as {trialRecord.email}</span>
            </>
          ) : (
            <>
              <FiAlertCircle size={14} style={{ color: "#EF4444" }} />
              <span style={{ color: "#FCA5A5" }}>Your trial has expired. <strong>Upgrade to continue using Pankajal ERP.</strong></span>
              <button onClick={() => setShowModal(true)} style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Upgrade Now</button>
            </>
          )}
        </div>
      )}

      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: "rgba(10,10,11,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#0A0A0B" }}>PKE</div>
          <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.02em" }}>Pankajal <span style={{ color: "#F59E0B" }}>ERP</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {["Modules", "Pricing", "Contact"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/signin" className="btn-ghost" style={{ padding: "10px 20px", fontSize: 14 }}>Sign in</Link>
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
            {trialActive ? `${daysLeft}d trial left` : "Free Trial"}
          </button>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section
        ref={heroRef}
        style={{ position: "relative", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 100px", overflow: "hidden" }}
      >
        <Orb style={{ width: 600, height: 600, background: "rgba(245,158,11,0.08)", top: "10%", left: "50%", transform: "translateX(-50%)" }} />
        <Orb style={{ width: 400, height: 400, background: "rgba(139,92,246,0.07)", top: "20%", left: "10%" }} />
        <Orb style={{ width: 300, height: 300, background: "rgba(59,130,246,0.07)", top: "30%", right: "5%" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(245,158,11,1) 59px, rgba(245,158,11,1) 60px)", pointerEvents: "none" }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: "relative", zIndex: 1, maxWidth: 760 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: 32, fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>
            <FiZap size={13} /> Trusted by 500+ businesses across India
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 7vw, 80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 24, color: "#F5F3ED" }}>
            Run your entire<br />
            <em style={{ color: "#F59E0B", fontStyle: "italic" }}>business</em> from one place
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#9A9790", lineHeight: 1.65, maxWidth: 580, margin: "0 auto 44px" }}>
            Procurement, inventory, sales, production, CRM, elections, and marketplaces — unified in one modern cloud ERP built for Indian businesses.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 16, padding: "16px 32px" }}>
              Start free trial <FiArrowRight size={16} />
            </button>
            <Link href="/signin" className="btn-ghost" style={{ fontSize: 16, padding: "16px 32px" }}>Sign in to account</Link>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginTop: 20, fontSize: 13, color: "#6B6860" }}>
            No credit card required · 14-day free trial · Auto-locked after expiry
          </motion.p>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <div className="divider" />
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "48px 80px", background: "rgba(255,255,255,0.015)" }}
      >
        {stats.map((s, i) => (
          <motion.div key={i} variants={fadeUp} style={{ textAlign: "center", padding: "0 24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: "#F59E0B", lineHeight: 1.1 }}>
              <Counter end={s.value} suffix={s.suffix} />
            </div>
            <div style={{ color: "#6B6860", fontSize: 14, marginTop: 6, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.section>
      <div className="divider" />

      {/* ─── CORE MODULES ─── */}
      <section id="modules" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Core Platform</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED" }}>
            Every module your<br />operations demand
          </h2>
        </motion.div>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
        >
          {coreModules.map((mod, i) => (
            <motion.div key={i} variants={fadeUp} className="module-card">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: mod.bg, border: `1px solid ${mod.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: mod.color, marginBottom: 20 }}>{mod.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "#F5F3ED", marginBottom: 10, letterSpacing: "-0.01em" }}>{mod.title}</h3>
              <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.65 }}>{mod.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── ADVANCED MODULES ─── */}
      <section style={{ padding: "80px 60px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Advanced Modules</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED" }}>Beyond traditional ERP</h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          >
            {advancedModules.map((mod, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -4 }}
                style={{ background: mod.gradient, border: `1px solid ${mod.border}`, borderRadius: 24, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: mod.badgeColor }}>{mod.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 100, background: `${mod.badgeColor}18`, color: mod.badgeColor, border: `1px solid ${mod.badgeColor}30` }}>{mod.badge}</span>
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 700, color: "#F5F3ED", marginBottom: 12, letterSpacing: "-0.02em" }}>{mod.title}</h3>
                <p style={{ fontSize: 14, color: "#9A9790", lineHeight: 1.7 }}>{mod.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" style={{ padding: "100px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Pricing</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#F5F3ED", marginBottom: 16 }}>Simple, transparent pricing</h2>
          <p style={{ color: "#6B6860", fontSize: 16 }}>No hidden fees. No long-term contracts. Cancel anytime.</p>
        </motion.div>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "center" }}
        >
          {pricingPlans.map((plan, i) => (
            <motion.div key={i} variants={fadeUp} style={{ position: "relative", background: plan.popular ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)", border: plan.popular ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: plan.popular ? "40px 32px" : "32px", transform: plan.popular ? "scale(1.04)" : "scale(1)" }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#F59E0B", color: "#0A0A0B", fontSize: 12, fontWeight: 700, padding: "5px 16px", borderRadius: 100, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>MOST POPULAR</div>
              )}
              <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{plan.name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: plan.popular ? "#F59E0B" : "#F5F3ED", lineHeight: 1 }}>{plan.price}</span>
                {plan.period && <span style={{ color: "#6B6860", fontSize: 14 }}>{plan.period}</span>}
              </div>
              <p style={{ fontSize: 14, color: "#6B6860", marginBottom: 24 }}>{plan.desc}</p>
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 24 }} />
              <ul style={{ listStyle: "none", marginBottom: 28, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#9A9790" }}>
                    <FiCheck size={16} style={{ color: "#F59E0B", marginTop: 1, flexShrink: 0 }} />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => plan.name !== "Enterprise" ? setShowModal(true) : null}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 24px", borderRadius: 12, fontWeight: 600, fontSize: 15, border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.15)", cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif", background: plan.popular ? "#F59E0B" : "transparent", color: plan.popular ? "#0A0A0B" : "#E8E6E0" }}
              >
                {plan.cta} <FiArrowRight size={15} />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" style={{ padding: "80px 60px", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 56, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F59E0B", marginBottom: 14 }}>Get in Touch</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#F5F3ED", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 14 }}>Let's talk business</h2>
            <p style={{ color: "#6B6860", fontSize: 16, maxWidth: 420, margin: "0 auto" }}>Questions? Reach us on WhatsApp, email, or any social platform.</p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          >
            {/* WhatsApp */}
            <motion.a variants={fadeUp}
              href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20Pankajal%20ERP%2C%20I%27d%20like%20to%20know%20more!`}
              target="_blank" rel="noopener noreferrer" whileHover={{ y: -3 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 20, textDecoration: "none" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(37,211,102,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#25D366", flexShrink: 0 }}>
                <FiMessageCircle />
              </div>
              <div>
                <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 4, fontWeight: 500 }}>WhatsApp</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#F5F3ED", letterSpacing: "-0.01em" }}>+91 {CONTACT.whatsapp}</p>
                <p style={{ fontSize: 12, color: "#25D366", marginTop: 3 }}>Chat with us →</p>
              </div>
            </motion.a>

            {/* Email */}
            <motion.a variants={fadeUp}
              href={`mailto:${CONTACT.email}`} whileHover={{ y: -3 }}
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20, textDecoration: "none" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#F59E0B", flexShrink: 0 }}>
                <FiMail />
              </div>
              <div>
                <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 4, fontWeight: 500 }}>Email</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#F5F3ED", wordBreak: "break-all" }}>{CONTACT.email}</p>
                <p style={{ fontSize: 12, color: "#F59E0B", marginTop: 3 }}>Reply within 24h →</p>
              </div>
            </motion.a>

            {/* Social */}
            <motion.div variants={fadeUp} style={{ padding: "24px 28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20 }}>
              <p style={{ fontSize: 13, color: "#6B6860", fontWeight: 500, marginBottom: 16 }}>Follow Us</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { href: CONTACT.instagram, icon: <FiInstagram size={18} />, label: "Instagram" },
                  { href: CONTACT.twitter,   icon: <FiTwitter   size={18} />, label: "Twitter" },
                  { href: CONTACT.linkedin,  icon: <FiLinkedin  size={18} />, label: "LinkedIn" },
                  { href: CONTACT.youtube,   icon: <FiYoutube   size={18} />, label: "YouTube" },
                ].map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="social-btn" title={s.label}>{s.icon}</a>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 12, color: "#4A4845", lineHeight: 1.7 }}>🇮🇳 Built for India · Mon–Sat 9am–7pm IST</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section style={{ padding: "60px", maxWidth: 1200, margin: "0 auto 100px" }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 50%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 28, padding: "64px", textAlign: "center", position: "relative", overflow: "hidden" }}
        >
          <Orb style={{ width: 400, height: 400, background: "rgba(245,158,11,0.12)", top: "-30%", left: "40%", transform: "translateX(-50%)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#F5F3ED", marginBottom: 16, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              Ready to transform<br />your operations?
            </h2>
            <p style={{ color: "#9A9790", fontSize: 17, maxWidth: 480, margin: "0 auto 36px" }}>
              Join hundreds of Indian businesses already scaling with Pankajal ERP.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>
                Start your free trial <FiArrowRight size={16} />
              </button>
              <a href={`https://wa.me/91${CONTACT.whatsapp}?text=Hi%20I%27d%20like%20to%20learn%20more%20about%20Pankajal%20ERP`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 16, padding: "16px 36px" }}>
                <FiMessageCircle size={16} /> WhatsApp us
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 60px 36px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0A0A0B" }}>PKE</div>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#F5F3ED" }}>Pankajal ERP</span>
            </div>
            <p style={{ fontSize: 14, color: "#4A4845", lineHeight: 1.7, marginBottom: 20, maxWidth: 260 }}>
              All-in-one cloud ERP for Indian businesses. Procurement to elections to marketplace — one platform.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { href: CONTACT.instagram, icon: <FiInstagram size={16} /> },
                { href: CONTACT.twitter,   icon: <FiTwitter   size={16} /> },
                { href: CONTACT.linkedin,  icon: <FiLinkedin  size={16} /> },
                { href: CONTACT.youtube,   icon: <FiYoutube   size={16} /> },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="social-btn" style={{ width: 36, height: 36 }}>{s.icon}</a>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Product</p>
            {["Modules", "Pricing", "Changelog", "Roadmap"].map(item => (
              <a key={item} href="#" style={{ display: "block", fontSize: 14, color: "#4A4845", textDecoration: "none", marginBottom: 10 }}
                onMouseEnter={e => e.target.style.color = "#9A9790"}
                onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Company</p>
            {["About", "Blog", "Careers", "Press"].map(item => (
              <a key={item} href="#" style={{ display: "block", fontSize: 14, color: "#4A4845", textDecoration: "none", marginBottom: 10 }}
                onMouseEnter={e => e.target.style.color = "#9A9790"}
                onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
            ))}
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#9A9790", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Contact</p>
            <a href={`https://wa.me/91${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="contact-link" style={{ marginBottom: 12 }}>
              <FiMessageCircle size={15} style={{ color: "#25D366", flexShrink: 0 }} />
              +91 {CONTACT.whatsapp}
            </a>
            <a href={`mailto:${CONTACT.email}`} className="contact-link" style={{ marginBottom: 16, wordBreak: "break-all" }}>
              <FiMail size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />
              {CONTACT.email}
            </a>
            <p style={{ fontSize: 13, color: "#4A4845", lineHeight: 1.6 }}>Mon–Sat · 9am–7pm IST</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <p style={{ fontSize: 13, color: "#4A4845" }}>© {new Date().getFullYear()} Pankajal ERP. Built with ❤️ for India.</p>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(item => (
              <a key={item} href="#" style={{ fontSize: 13, color: "#4A4845", textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#6B6860"}
                onMouseLeave={e => e.target.style.color = "#4A4845"}>{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}



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
