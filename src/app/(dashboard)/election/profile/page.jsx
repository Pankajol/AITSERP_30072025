"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiArrowLeft, FiBriefcase, FiLoader, FiSave, FiUser } from "react-icons/fi";

export default function ElectionProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userType, setUserType] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    contactName: "",
    companyName: "",
    address: "",
    pinCode: "",
    constituencyName: "",
    electionType: "",
    electionDate: "",
    boothCount: "",
    roles: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/signin");
        return;
      }

      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const isCompany = !!storedUser.companyName;
        setUserType(isCompany ? "company" : "user");

        if (isCompany) {
          const res = await axios.get("/api/company/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data.company;
          setForm({
            name: data.contactName || data.companyName || "",
            email: data.email || "",
            phone: data.phone || "",
            contactName: data.contactName || "",
            companyName: data.companyName || "",
            address: data.address || "",
            pinCode: data.pinCode || "",
            constituencyName: data.constituencyName || "",
            electionType: data.electionType || "",
            electionDate: data.electionDate ? data.electionDate.slice(0, 10) : "",
            boothCount: data.boothCount || "",
            roles: [],
          });
        } else {
          const res = await axios.get("/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data.user;
          setForm({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            roles: data.roles || [],
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token");

    try {
      if (userType === "company") {
        const payload = {
          contactName: form.contactName,
          phone: form.phone,
          address: form.address,
          pinCode: form.pinCode,
          constituencyName: form.constituencyName,
          electionType: form.electionType,
          electionDate: form.electionDate,
          boothCount: form.boothCount,
        };
        await axios.put("/api/company/profile", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...storedUser, ...payload }));
      } else {
        await axios.put(
          "/api/users/profile",
          { name: form.name, phone: form.phone },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...storedUser, name: form.name, phone: form.phone }));
      }
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ToastContainer position="top-center" />
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          {userType === "company" ? (
            <FiBriefcase className="text-indigo-600 text-2xl" />
          ) : (
            <FiUser className="text-indigo-600 text-2xl" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {userType === "company" ? "Election Profile" : "My Profile"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {userType === "company" ? (
            <>
              <Field label="Organization Name" value={form.companyName} disabled />
              <Field label="Contact Person" name="contactName" value={form.contactName} onChange={handleChange} required />
              <Field label="Email" value={form.email} disabled />
              <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" />
              <Field label="Address" name="address" value={form.address} onChange={handleChange} textarea />
              <Field label="PIN / ZIP Code" name="pinCode" value={form.pinCode} onChange={handleChange} />

              <div className="pt-4 border-t border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Election Setup</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Constituency / Ward" name="constituencyName" value={form.constituencyName} onChange={handleChange} />
                  <Field label="Election Type" name="electionType" value={form.electionType} onChange={handleChange} />
                  <Field label="Election Date" name="electionDate" value={form.electionDate} onChange={handleChange} type="date" />
                  <Field label="Booth Count" name="boothCount" value={form.boothCount} onChange={handleChange} type="number" />
                </div>
              </div>
            </>
          ) : (
            <>
              <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
              <Field label="Email" value={form.email} disabled />
              <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {(form.roles || []).map((role) => (
                    <span key={role} className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, textarea, disabled, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          rows="2"
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          {...props}
        />
      ) : (
        <input
          type="text"
          disabled={disabled}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          {...props}
        />
      )}
    </div>
  );
}
