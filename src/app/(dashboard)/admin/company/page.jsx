"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaSave } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";

export default function CompanyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    abbr: "",
    defaultCurrency: "INR",
    country: "India",
    stateCode: "",
    gstCategory: "Registered Regular",
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleCountryState = (c, s) => setForm({ ...form, country: c, stateCode: s });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/company/${data.data._id}`);
      } else throw new Error(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Create Company</h1>
      <form onSubmit={submit} className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg">Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Company Name *" name="name" value={form.name} onChange={handle} />
            <Field label="Abbr *" name="abbr" value={form.abbr} onChange={handle} maxLength={5} />
            <Field label="Default Currency *" name="defaultCurrency" value={form.defaultCurrency} onChange={handle} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Country / State *</label>
              <CountryStateSearch
                country={form.country}
                state={form.stateCode}
                onSelectCountry={(c) => handleCountryState(c.name ?? c, form.stateCode)}
                onSelectState={(s) => handleCountryState(form.country, s.name ?? s)}
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg">Tax Details</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="GSTIN / UIN" name="gstin" value={form.gstin || ""} onChange={handle} />
            <SelectField label="GST Category" name="gstCategory" value={form.gstCategory} onChange={handle} options={["Registered Regular", "Composition", "Unregistered", "Consumer", "Overseas", "Special Economic Zone"]} />
            <Field label="PAN" name="pan" value={form.pan || ""} onChange={handle} />
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg">Address & Contact</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Phone" name="phoneNo" value={form.phoneNo || ""} onChange={handle} />
            <Field label="Email" name="email" value={form.email || ""} onChange={handle} />
            <Field label="Website" name="website" value={form.website || ""} onChange={handle} />
            <Field label="Fax" name="fax" value={form.fax || ""} onChange={handle} />
            <Field label="Date of Incorporation" name="dateOfIncorporation" type="date" value={form.dateOfIncorporation || ""} onChange={handle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company Description</label>
            <textarea
              rows={4}
              name="companyDescription"
              value={form.companyDescription || ""}
              onChange={handle}
              className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="md:col-span-2 flex items-center gap-2 justify-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
          <FaSave /> {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, onChange, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        name={name}
        onChange={onChange}
        className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
        {...props}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}






// ========== models/company.js ==========
// import mongoose from "mongoose";

// const AddressSchema = new mongoose.Schema({
//   address: String,
//   country: String,
//   stateCode: String,
//   pinCode: String,
//   gstin: String,
// });

// const CompanySchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     abbr: { type: String, required: true, maxlength: 5 },
//     defaultCurrency: { type: String, required: true },
//     country: String,
//     stateCode: String,
//     isGroup: { type: Boolean, default: false },
//     defaultHolidayList: String,
//     defaultLetterHead: String,
//     taxId: String,
//     domain: String,
//     dateOfEstablishment: Date,
//     parentCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
//     gstin: String,
//     gstCategory: {
//       type: String,
//       enum: [
//         "Registered Regular",
//         "Composition",
//         "Unregistered",
//         "Consumer",
//         "Overseas",
//         "Special Economic Zone",
//       ],
//     },
//     pan: String,
//     dateOfIncorporation: Date,
//     fax: String,
//     phoneNo: String,
//     website: String,
//     email: String,
//     companyDescription: String,
//     billingAddress: AddressSchema,
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Company || mongoose.model("Company", CompanySchema);

// // ========== app/api/company/route.js ==========
// import Company from "@/models/company";
// import { connectToDB } from "@/utils/db";

// export async function POST(req) {
//   await connectToDB();
//   const body = await req.json();
//   try {
//     const doc = await Company.create(body);
//     return Response.json({ success: true, data: doc }, { status: 201 });
//   } catch (err) {
//     return Response.json({ success: false, message: err.message }, { status: 400 });
//   }
// }

// export async function GET() {
//   await connectToDB();
//   const docs = await Company.find();
//   return Response.json({ success: true, data: docs });
// }