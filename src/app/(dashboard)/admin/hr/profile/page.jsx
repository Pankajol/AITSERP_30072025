
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Shield,
  LogOut,
  Pencil,
  Save,
  Lock
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);

      setForm({
        name: parsed.name || "",
        email: parsed.email || "",
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const handleSave = () => {
    const updated = { ...user, ...form };

    // ✅ Save in local storage (you can connect API later)
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);

    setEditMode(false);
    alert("Profile updated ✅");
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-32 text-gray-600">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          My Profile
        </h1>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white shadow-xl rounded-2xl p-8 flex flex-col md:flex-row gap-8">

        {/* LEFT - AVATAR */}
        <div className="flex flex-col items-center md:w-1/3 gap-4">

          <div className="bg-blue-600 w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>

          <h2 className="text-xl font-bold">
            {user?.name}
          </h2>

          <span className="bg-gray-200 px-4 py-1 rounded-full text-sm">
            {user?.roles?.join(", ") || "Customer"}
          </span>
        </div>


        {/* RIGHT - DETAILS */}
        <div className="flex-1 space-y-5">

          {/* NAME */}
          <div>
            <label className="font-medium mb-1 flex items-center gap-2">
              <User size={16} />
              Full Name
            </label>

            {editMode ? (
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            ) : (
              <p className="text-gray-700">
                {user.name}
              </p>
            )}
          </div>


          {/* EMAIL */}
          <div>
            <label className="font-medium mb-1 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>

            {editMode ? (
              <input
                type="email"
                className="w-full border p-2 rounded"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            ) : (
              <p className="text-gray-700">
                {user.email}
              </p>
            )}
          </div>


          {/* USER ID */}
          <div>
            <label className="font-medium mb-1 flex items-center gap-2">
              <Shield size={16} />
              User ID
            </label>

            <p className="text-gray-500 text-sm break-all">
              {user.id}
            </p>
          </div>


          {/* ACTIONS */}
          <div className="pt-4 flex gap-4">

            {editMode ? (
              <button
                onClick={handleSave}
                className="flex gap-2 items-center bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
              >
                <Save size={16} />
                Save
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex gap-2 items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            )}

            <button
              className="flex gap-2 items-center bg-gray-800 text-white px-6 py-2 rounded-lg"
              onClick={() => alert("Coming Soon")}
            >
              <Lock size={16} />
              Change Password
            </button>

          </div>
        </div>
      </div>

    </div>
  );
}
