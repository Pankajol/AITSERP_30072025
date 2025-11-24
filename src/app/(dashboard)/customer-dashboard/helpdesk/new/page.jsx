"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Paperclip } from "lucide-react";

export default function NewTicket() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    subject: "",
    category: "",
    message: "",
  });

  // ✅ Load categories
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/helpdesk/category/list", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => r.json())
      .then((res) => setCategories(res.categories || []));
  }, []);

  // ✅ On file change
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  // ✅ Submit ticket
  async function submit(e) {
    e.preventDefault();

    if (!form.subject || !form.category || !form.message) {
      return alert("Please complete all fields");
    }

    const token = localStorage.getItem("token");
    if (!token) return alert("Not authenticated");

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("subject", form.subject);
      formData.append("category", form.category);
      formData.append("message", form.message);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await fetch("/api/helpdesk/create", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Ticket created successfully");
        router.push("/helpdesk/tickets");
      } else {
        alert(data.msg || "❌ Failed to create ticket");
      }

    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="bg-white shadow-xl rounded-2xl p-8">

        <h1 className="text-2xl font-bold mb-6">
          Create New Ticket
        </h1>

        <form onSubmit={submit} className="space-y-6">

          {/* Subject */}
          <div>
            <label className="block font-medium mb-1">
              Subject
            </label>

            <input
              type="text"
              placeholder="Enter ticket subject..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.subject}
              onChange={(e) =>
                setForm({ ...form, subject: e.target.value })
              }
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-medium mb-1">
              Category
            </label>

            <select
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block font-medium mb-1">
              Message
            </label>

            <textarea
              rows="6"
              placeholder="Describe your issue in detail..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block font-medium mb-2">
              Attachments
            </label>

            <div className="border-2 border-dashed rounded-lg p-5 text-center">

              <input
                type="file"
                multiple
                className="hidden"
                id="fileUpload"
                onChange={handleFileChange}
              />
              
              <label
                htmlFor="fileUpload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Paperclip size={24} />
                <span className="text-sm text-gray-600">
                  Click to upload files (images, pdf, docs)
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-1">
                {files.map((file, index) => (
                  <p
                    key={index}
                    className="text-sm text-gray-600"
                  >
                    📎 {file.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Ticket
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
