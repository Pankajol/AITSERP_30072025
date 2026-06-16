"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCreditCard, FiCalendar, FiAlertCircle, FiRefreshCw, FiCheckCircle } from "react-icons/fi";

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/company/subscription");
      const data = await res.json();
      if (data.success) setSubscription(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (planId, planType) => {
    setRenewing(true);
    try {
      const res = await fetch("/api/company/subscription/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, planType }),
      });
      const data = await res.json();
      if (data.short_url) {
        // Redirect to Razorpay checkout
        window.location.href = data.short_url;
      } else {
        alert("Subscription created. Please complete payment.");
        fetchSubscription();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRenewing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm("Cancel auto-renewal? You will keep access until the end of your billing period.")) {
      try {
        await fetch("/api/company/subscription/cancel", { method: "POST" });
        fetchSubscription();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

      {/* Current Subscription Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize mt-1">{subscription?.plan}</h2>
              <p className="text-sm text-gray-600 mt-1 capitalize">{subscription?.planType}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[subscription?.subscriptionStatus]}`}>
              {statusText[subscription?.subscriptionStatus]}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <FiCalendar className="text-gray-400" />
            <span>
              {subscription?.subscriptionStatus === "trialing" ? "Trial ends" : "Next billing date"}:
              <strong className="ml-1">
                {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}
              </strong>
            </span>
          </div>
          {subscription?.cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
              <FiAlertCircle />
              <span>Auto-renewal is OFF. Your plan will expire on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</span>
            </div>
          )}
          {subscription?.subscriptionStatus === "expired" && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <FiAlertCircle />
              <span>Your subscription has expired. Please renew to continue using the service.</span>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex gap-3">
          {subscription?.subscriptionStatus === "trialing" && (
            <button
              onClick={() => handleRenew(subscription.plan, "monthly")}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Upgrade Now
            </button>
          )}
          {subscription?.subscriptionStatus === "active" && !subscription.cancelAtPeriodEnd && (
            <button
              onClick={handleCancel}
              className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel Auto‑renewal
            </button>
          )}
          {subscription?.subscriptionStatus === "expired" && (
            <button
              onClick={() => handleRenew("starter", "monthly")}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Renew Plan
            </button>
          )}
          <button
            onClick={fetchSubscription}
            className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Change or Upgrade Plan</h3>
          <p className="text-sm text-gray-500 mt-1">Select a new plan. Your remaining balance will be prorated.</p>
        </div>
        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Starter Plan */}
          <div className="border rounded-xl p-5">
            <div className="font-bold text-lg">Starter</div>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹999</span>
              <span className="text-gray-500">/month</span>
            </div>
            <div className="mt-1">
              <span className="text-3xl font-bold">₹9,999</span>
              <span className="text-gray-500">/year</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> Sales Order & Invoice</li>
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> 5 Users</li>
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> Inventory View</li>
            </ul>
            <button
              onClick={() => handleRenew("starter", "monthly")}
              className="mt-5 w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50"
            >
              Switch to Monthly
            </button>
            <button
              onClick={() => handleRenew("starter", "yearly")}
              className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Switch to Yearly
            </button>
          </div>

          {/* Growth Plan */}
          <div className="border-2 border-indigo-200 rounded-xl p-5 relative">
            <div className="absolute -top-3 left-5 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full">POPULAR</div>
            <div className="font-bold text-lg">Growth</div>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹4,999</span>
              <span className="text-gray-500">/month</span>
            </div>
            <div className="mt-1">
              <span className="text-3xl font-bold">₹49,999</span>
              <span className="text-gray-500">/year</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> All Modules</li>
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> Priority Support</li>
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> API Access</li>
              <li className="flex items-center gap-2"><FiCheckCircle className="text-green-500" /> Unlimited Users</li>
            </ul>
            <button
              onClick={() => handleRenew("growth", "monthly")}
              className="mt-5 w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50"
            >
              Switch to Monthly
            </button>
            <button
              onClick={() => handleRenew("growth", "yearly")}
              className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Switch to Yearly
            </button>
          </div>
        </div>
      </div>

      {/* Payment History placeholder */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mt-8">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Payment History</h3>
        </div>
        <div className="p-6 text-center text-gray-500 text-sm">
          No payment records yet.
        </div>
      </div>
    </div>
  );
}