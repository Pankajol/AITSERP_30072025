"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Users, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { Device } from "@twilio/voice-sdk";

export default function CRMcallsPage() {
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("sales");
  const [phone, setPhone] = useState("+91");
  const [twilioDevice, setTwilioDevice] = useState(null);
  const [callPopup, setCallPopup] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    const [a, c] = await Promise.all([
      axios.get("/api/crm/agents"),
      axios.get("/api/crm/calls"),
    ]);
    setAgents(a.data.agents || []);
    setCalls(c.data.calls || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ init Twilio device
  const initTwilio = async () => {
    const t = await axios.get("/api/twilio/token");
    const device = new Device(t.data.token, {
      logLevel: 1,
    });

    device.on("registered", () => console.log("Twilio ready"));
    device.on("error", (e) => console.error("Twilio error", e));

    await device.register();
    setTwilioDevice(device);
  };

  useEffect(() => {
    initTwilio();
  }, []);

  const routeAndCallCustomer = async () => {
    if (!phone || phone.length < 8) return alert("Enter phone");

    // step 1: route agent by category
    const routed = await axios.post("/api/crm/calls/route-call", {
      category,
      provider: "twilio",
      toPhone: phone,
    });

    const call = routed.data.call;
    setCallPopup({ type: "external", state: "ringing", call });

    // step 2: twilio connect
    if (!twilioDevice) return alert("Twilio not ready");
    const conn = await twilioDevice.connect({ params: { To: phone } });

    conn.on("accept", () => {
      setCallPopup((p) => ({ ...p, state: "connected" }));
    });
    conn.on("disconnect", async () => {
      setCallPopup((p) => ({ ...p, state: "ended" }));
      await axios.patch(`/api/crm/calls/${call._id}`, { ended: true, status: "ended" });
      fetchAll();
    });
  };

  const categories = ["sales", "payment", "offer", "support", "delivery", "general"];

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6" /> CRM Calling Center
          </h1>
          <p className="text-sm text-gray-600">
            Auto call routing + Internal agent calling + Customer calling (Twilio)
          </p>
        </div>

        <button
          onClick={fetchAll}
          className="px-4 py-2 rounded-2xl border bg-white hover:bg-black/5"
        >
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6 mt-6">
        {/* LEFT: Dialer */}
        <div className="bg-white border rounded-3xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" /> Call Customer
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-black/5 border">Auto Route</span>
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-2xl border bg-white shadow-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Customer Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-2xl border bg-white shadow-sm text-lg font-semibold"
              placeholder="+91 9004902553"
            />
          </div>

          <button
            onClick={routeAndCallCustomer}
            className="w-full mt-4 py-3 rounded-2xl bg-black text-white font-semibold hover:opacity-90 transition"
          >
            Call Now (Auto Assign Agent)
          </button>

          {/* Agents */}
          <div className="mt-6">
            <div className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" /> Agents
            </div>

            <div className="mt-3 space-y-3">
              {agents.map((a) => (
                <div
                  key={a._id}
                  className="p-3 rounded-3xl border bg-gradient-to-b from-black/[0.02] to-transparent flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{a.userId}</div>
                    <div className="text-xs text-gray-500">
                      {a.categories?.join(", ")} | Priority: {a.priority}
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      a.isBusy ? "bg-red-50" : "bg-green-50"
                    }`}
                  >
                    {a.isBusy ? "BUSY" : a.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Logs */}
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Call Logs
            </div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading..." : `${calls.length} records`}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : calls.length === 0 ? (
              <div className="text-sm text-gray-600">No calls yet</div>
            ) : (
              calls.map((c) => (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-3xl border bg-gradient-to-b from-black/[0.02] to-transparent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {c.toPhone || "Internal"} • {c.category?.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Provider: {c.provider} • Status: {c.status}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.durationSec ? `${c.durationSec}s` : "—"}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Popup */}
      <AnimatePresence>
        {callPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[92vw]"
          >
            <div className="rounded-3xl border bg-white shadow-2xl overflow-hidden">
              <div className="p-4 border-b bg-gradient-to-b from-black/[0.04] to-transparent">
                <div className="font-semibold flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  {callPopup.type === "external" ? "Customer Call" : "Internal Call"}
                </div>
                <div className="mt-3 text-xl font-bold">
                  {callPopup.call?.toPhone || "Internal"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {callPopup.state?.toUpperCase()}
                </div>
              </div>

              <div className="p-4">
                <button
                  onClick={() => setCallPopup(null)}
                  className="w-full py-3 rounded-2xl border bg-white hover:bg-black/5 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
