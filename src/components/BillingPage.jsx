"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCalendar, FiRefreshCw, FiCheckCircle, FiEye, FiEyeOff } from "react-icons/fi";

// ============================================================
// UI Components (Light Theme)
// ============================================================
function GlassInput({ label, name, value, onChange, type = "text", error, multiline, showToggle = false, visible = false, onToggle }) {
  const [focused, setFocused] = useState(false);
  const active = focused || (value && value.length > 0);
  const borderColor = error ? "#ef4444" : focused ? "#3b82f6" : "#d1d5db";
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: "relative", background: "#f9fafb", borderRadius: 14, border: `1px solid ${borderColor}`, transition: "all 0.2s", overflow: "hidden" }}>
        <label style={{ position: "absolute", left: 16, top: active ? 8 : "50%", transform: active ? "none" : "translateY(-50%)", fontSize: active ? 10 : 13, fontWeight: 500, color: error ? "#ef4444" : focused ? "#3b82f6" : "#6b7280", transition: "all 0.2s", pointerEvents: "none" }}>{label}</label>
        {multiline ? (
          <textarea name={name} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} rows={2} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#1f2937", fontSize: 14, padding: "28px 16px 12px", resize: "none" }} />
        ) : (
          <input name={name} type={type} value={value} onChange={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#1f2937", fontSize: 14, padding: showToggle ? "28px 48px 12px 16px" : "28px 16px 12px" }} />
        )}
        {showToggle && !multiline && (
          <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label}` : `Show ${label}`} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", padding: 4 }}>
            {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>⚠ {error}</p>}
    </div>
  );
}

function GradientButton({ label, onClick, loading, fullWidth = false, icon = null, accent = "#3b82f6" }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: fullWidth ? "100%" : "auto",
      padding: "14px 28px",
      background: loading ? "#e5e7eb" : `linear-gradient(135deg, ${accent}, ${accent}dd)`,
      border: "none",
      borderRadius: 40,
      color: loading ? "#6b7280" : "white",
      fontWeight: 700,
      fontSize: 13,
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow: loading ? "none" : "0 8px 20px rgba(59,130,246,0.3)",
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
// Success Modal
// ============================================================
function SuccessModal({ isOpen, onClose, plan, planType }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 420, width: "100%", background: "white", borderRadius: 24, padding: "32px 28px", boxShadow: "0 25px 50px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <FiCheckCircle size={32} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Payment Successful!</h2>
        <p style={{ color: "#4b5563", fontSize: 14, marginBottom: 4 }}>
          Your <strong>{plan}</strong> {planType} plan is now active.
        </p>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
          You will be redirected to your dashboard shortly.
        </p>
        <button onClick={onClose} style={{ padding: "10px 32px", background: "#3b82f6", color: "white", border: "none", borderRadius: 40, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Payment Methods
// ============================================================
const PAYMENT_METHODS = [
  { id: "upi", icon: "📱", title: "UPI Payment", sub: "GPay · PhonePe · Paytm · BHIM", badge: "Instant", badgeColor: "#16a34a" },
  { id: "card", icon: "💳", title: "Debit / Credit Card", sub: "Visa · Mastercard · RuPay", badge: null, badgeColor: null },
  { id: "netbanking", icon: "🏦", title: "Net Banking", sub: "All major banks supported", badge: null, badgeColor: null },
  { id: "razorpay", icon: "💰", title: "Razorpay", sub: "Cards · UPI · Netbanking · Wallets", badge: "Secure", badgeColor: "#0d9488" },
  { id: "qr", icon: "📱", title: "QR Code Payment", sub: "Scan & Pay – UPI / Cards", badge: "Scan", badgeColor: "#e11d48" },
  { id: "cash", icon: "💵", title: "Cash Payment", sub: "Pay at our nearest office", badge: "Offline", badgeColor: "#f59e0b" },
  { id: "paylater", icon: "🕐", title: "Pay Later", sub: "Invoice sent · Pay within 30 days", badge: "Net-30", badgeColor: "#8b5cf6" },
];

// ============================================================
// Main Billing Page Component
// ============================================================
export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [paymentView, setPaymentView] = useState("methods");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ upi: "", cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "" });
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ plan: "", planType: "" });
  const [qrImageError, setQrImageError] = useState(false);

  const getToken = () => localStorage.getItem("token");
  const UPI_ID = "pankajdyadav10699@okhdfcbank"; // ← change to your actual UPI ID

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/subscription", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscription(data.data);
        setSelectedPlan(data.data.plan || "starter");
        setSelectedCycle(data.data.planType === "yearly" ? "yearly" : "monthly");
      } else {
        console.error("API error:", data.error);
        setSubscription(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const n = e.target.name, v = e.target.value;
    setForm(p => ({ ...p, [n]: v }));
    if (errors[n]) setErrors(p => ({ ...p, [n]: null }));
  };

  const handleRenew = async (paymentMethod) => {
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/company/subscription/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ planId: selectedPlan, planType: selectedCycle }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Renewal failed");

      if (paymentMethod === "razorpay") {
        if (!razorpayLoaded) {
          setErrors({ general: "Razorpay SDK not loaded. Please refresh." });
          setSubmitting(false);
          return;
        }
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          subscription_id: data.subscription_id,
          name: "Pankajal ERP",
          description: `${selectedPlan} ${selectedCycle} plan`,
          prefill: {
            name: data.contactName,
            email: data.email,
          },
          theme: { color: "#3b82f6" },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setErrors({ general: "Payment cancelled." });
            },
          },
          handler: async (response) => {
            // Payment successful – show success modal & refresh
            setSuccessData({ plan: selectedPlan, planType: selectedCycle });
            setShowSuccess(true);
            setSubmitting(false);
            fetchSubscription();
          },
        };
        const razorpay = new window.Razorpay(options);
        razorpay.open();
        return;
      }

      // Non‑Razorpay methods – show success immediately
      setSuccessData({ plan: selectedPlan, planType: selectedCycle });
      setShowSuccess(true);
      fetchSubscription();
      setSubmitting(false);
    } catch (err) {
      setErrors({ general: err.message });
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel auto-renewal? You'll keep access until period end.")) return;
    setActionLoading(true);
    try {
      await fetch("/api/company/subscription/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchSubscription();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const statusColors = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    past_due: "bg-red-100 text-red-800",
    canceled: "bg-gray-100 text-gray-800",
    expired: "bg-orange-100 text-orange-800",
  };
  const statusText = {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment Overdue",
    canceled: "Cancelled (ends on period end)",
    expired: "Expired",
  };
  const isExpired = subscription?.subscriptionStatus === "expired";

  const getExpiryWarning = () => {
    if (!subscription?.currentPeriodEnd) return null;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3 && daysLeft > 0 && subscription.subscriptionStatus !== 'expired') {
      return `⚠️ Your ${subscription.planType} plan will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Please renew to avoid interruption.`;
    }
    if (daysLeft <= 0 && subscription.subscriptionStatus !== 'expired') {
      return '⚠️ Your subscription has expired. Please renew immediately.';
    }
    return null;
  };

  const expiryWarning = getExpiryWarning();

  const BackBtn = () => (
    <button onClick={() => { setPaymentView("methods"); setQrConfirmed(false); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>
      ← Back to methods
    </button>
  );

  const renderPaymentDetail = () => {
    const accent = "#3b82f6";
    switch (paymentView) {
      case "upi":
        return (
          <div>
            <BackBtn />
            <GlassInput label="UPI ID" name="upi" value={form.upi} onChange={handleChange} />
            <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 24 }}>e.g. name@okaxis</p>
            <GradientButton label="PAY VIA UPI" onClick={() => handleRenew("upi")} loading={submitting} fullWidth accent={accent} />
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
            <GradientButton label="PAY SECURELY" onClick={() => handleRenew("card")} loading={submitting} fullWidth accent={accent} />
          </div>
        );
      case "netbanking":
        return (
          <div>
            <BackBtn />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {["SBI", "HDFC", "ICICI", "Axis", "Kotak", "PNB"].map(bank => (
                <button key={bank} style={{ padding: "12px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 12, color: "#1f2937", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {bank}
                </button>
              ))}
            </div>
            <GradientButton label="PAY VIA NET BANKING" onClick={() => handleRenew("netbanking")} loading={submitting} fullWidth accent={accent} />
          </div>
        );
      case "razorpay":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, marginBottom: 10 }}>💰 Pay with Razorpay</div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>Cards • UPI • Netbanking • Wallets</div>
            </div>
            <GradientButton label="PAY WITH RAZORPAY" onClick={() => handleRenew("razorpay")} loading={submitting} fullWidth accent="#0d9488" />
          </div>
        );
      case "qr": {
        const upiUrl = `upi://pay?pa=${UPI_ID}&pn=Pankajal%20ERP&am=${getPrice()}&cu=INR`;
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

        return (
          <div>
            <BackBtn />
            <div style={{ textAlign: "center", padding: "16px 12px", background: "#fef2f2", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 10 }}>📱 Scan QR Code to Pay</div>
              {!qrImageError ? (
                <img
                  src={qrImageUrl}
                  alt="UPI Payment QR Code"
                  style={{
                    width: "100%",
                    maxWidth: 220,
                    height: "auto",
                    margin: "0 auto",
                    borderRadius: 12,
                    display: "block",
                  }}
                  onError={() => setQrImageError(true)}
                />
              ) : (
                <div style={{ padding: "20px 16px", background: "#fff", borderRadius: 12, color: "#6b7280", fontSize: 13 }}>
                  QR generation failed. Please use the UPI ID below.
                </div>
              )}
              <p style={{ fontSize: 12, color: "#4b5563", marginTop: 12 }}>
                Amount: ₹{getPrice().toLocaleString('en-IN')}
              </p>
              <div style={{ marginTop: 12, padding: 8, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>UPI ID: </span>
                <strong style={{ fontSize: 13, color: "#1f2937" }}>{UPI_ID}</strong>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(UPI_ID);
                    alert("UPI ID copied to clipboard!");
                  }}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}
                >
                  Copy
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280" }}>
                Scan with any UPI app or pay manually using the UPI ID above.
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, color: "#1f2937" }}>
              <input type="checkbox" checked={qrConfirmed} onChange={(e) => setQrConfirmed(e.target.checked)} /> I have made the payment via QR code / UPI
            </label>
            <GradientButton
              label="CONFIRM PAYMENT"
              onClick={() => {
                if (qrConfirmed) {
                  handleRenew("qr");
                } else {
                  setErrors({ general: "Please confirm that you have made the payment." });
                }
              }}
              loading={submitting}
              fullWidth
              accent="#dc2626"
            />
          </div>
        );
      }
      case "cash":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>💵 Pay at office within 7 days</div>
            </div>
            <GradientButton label="CONFIRM CASH" onClick={() => handleRenew("cash")} loading={submitting} fullWidth accent="#f59e0b" />
          </div>
        );
      case "paylater":
        return (
          <div>
            <BackBtn />
            <div style={{ padding: "16px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>Invoice sent – due in 30 days</div>
            </div>
            <GradientButton label="CONFIRM PAY LATER" onClick={() => handleRenew("paylater")} loading={submitting} fullWidth accent="#8b5cf6" />
          </div>
        );
      default:
        return null;
    }
  };

  const getPrice = () => {
    const prices = { starter: { monthly: 999, yearly: 9999 }, growth: { monthly: 4999, yearly: 49999 } };
    return prices[selectedPlan]?.[selectedCycle] || 0;
  };

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .glass-card{background:white;border:1px solid #e5e7eb;border-radius:32px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #f9fafb inset!important;-webkit-text-fill-color:#1f2937!important;}
        @media (max-width: 480px) {
          .glass-card { border-radius: 20px; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "28px 32px 0" }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Billing & Subscription</h1>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Manage your plan and payment method.</p>
            </div>
            <div style={{ padding: "20px 32px 32px" }}>
              {errors.general && <div style={{ marginBottom: 20, padding: 12, background: "#fee2e2", borderRadius: 16, fontSize: 12, color: "#dc2626" }}>⚠ {errors.general}</div>}

              {/* Current Subscription Info */}
              <div style={{ background: "#f9fafb", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Current Plan</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>{subscription?.plan}</div>
                    <div style={{ fontSize: 13, color: "#4b5563" }}>{subscription?.planType}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[subscription?.subscriptionStatus]}`}>
                    {statusText[subscription?.subscriptionStatus]}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4b5563" }}>
                  <FiCalendar /> {subscription?.subscriptionStatus === "trialing" ? "Trial ends" : "Next billing"}:
                  <strong style={{ color: "#111827" }}>
                    {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}
                  </strong>
                </div>

                {expiryWarning && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d97706", background: "#fffbeb", padding: "8px 12px", borderRadius: 8 }}>
                    {expiryWarning}
                  </div>
                )}

                {subscription?.cancelAtPeriodEnd && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d97706", background: "#fffbeb", padding: "8px 12px", borderRadius: 8 }}>
                    ⚠️ Auto‑renewal is OFF. Expires on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                  </div>
                )}
                {isExpired && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626", background: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>
                    ❌ Your subscription has expired. Please renew.
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {subscription?.subscriptionStatus === "active" && !subscription.cancelAtPeriodEnd && (
                    <button onClick={handleCancel} disabled={actionLoading} style={{ padding: "6px 16px", background: "#e5e7eb", border: "none", borderRadius: 20, color: "#374151", fontSize: 12, cursor: "pointer" }}>
                      Cancel Auto‑renewal
                    </button>
                  )}
                  <button onClick={fetchSubscription} style={{ padding: "6px 16px", background: "transparent", border: "1px solid #d1d5db", borderRadius: 20, color: "#4b5563", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <FiRefreshCw size={12} /> Refresh
                  </button>
                </div>
              </div>

              {/* Plan Selection */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>{isExpired ? "Renew Your Plan" : "Change Plan"}</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {["starter", "growth"].map(p => (
                    <button key={p} onClick={() => setSelectedPlan(p)} style={{
                      flex: 1, padding: "10px", borderRadius: 12, border: selectedPlan === p ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      background: selectedPlan === p ? "#eff6ff" : "white", color: selectedPlan === p ? "#1d4ed8" : "#374151", fontWeight: 600, cursor: "pointer", textTransform: "capitalize"
                    }}>{p}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  {["monthly", "yearly"].map(c => (
                    <button key={c} onClick={() => setSelectedCycle(c)} style={{
                      flex: 1, padding: "8px", borderRadius: 12, border: selectedCycle === c ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      background: selectedCycle === c ? "#eff6ff" : "white", color: selectedCycle === c ? "#1d4ed8" : "#374151", cursor: "pointer", textTransform: "capitalize"
                    }}>{c}</button>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 16, color: "#111827", fontWeight: 700, textAlign: "center" }}>
                  ₹{getPrice().toLocaleString('en-IN')} / {selectedCycle === "monthly" ? "month" : "year"}
                </div>
              </div>

              {/* Payment Methods */}
              {paymentView === "methods" ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Choose Payment Method</div>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} onClick={() => setPaymentView(m.id)} style={{
                      width: "100%", padding: "14px 18px", background: "white", border: "1px solid #e5e7eb",
                      borderRadius: 16, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left", marginBottom: 10,
                      transition: "background 0.2s",
                    }} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "white"}>
                      <div style={{ fontSize: 20 }}>{m.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>{m.title} {m.badge && <span style={{ fontSize: 9, background: "#e5e7eb", padding: "2px 8px", borderRadius: 20, marginLeft: 8, color: m.badgeColor }}>{m.badge}</span>}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{m.sub}</div>
                      </div>
                      <span style={{ color: "#9ca3af" }}>→</span>
                    </button>
                  ))}
                </div>
              ) : (
                renderPaymentDetail()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          router.push("/admin"); // Fallback – will be overridden by dashboard wrappers
        }}
        plan={successData.plan}
        planType={successData.planType}
      />
    </>
  );
}