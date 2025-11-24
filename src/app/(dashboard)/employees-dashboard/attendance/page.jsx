"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, User, Clock } from "lucide-react";
import axios from "axios";

/* ✅ IMPORTANT: Map only loads on client side (NO window error) */
const MapPreview = dynamic(() => import("@/components/MapPreview"), {
  ssr: false,
});

export default function AttendancePage() {
  const [location, setLocation] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const today = new Date().toISOString().slice(0, 10);

  /* ================= LOAD PROFILE ================= */
  useEffect(() => {
    if (token) {
      loadProfile();
      loadTodayAttendance();
    }
  }, [token]);

  /* ================= GET PROFILE ================= */
  async function loadProfile() {
    try {
      const res = await axios.get("/api/hr/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setEmployee(res.data.employee);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
    }
  }

  /* ================= TODAY ATTENDANCE ================= */
  async function loadTodayAttendance() {
    try {
      const res = await axios.get(`/api/hr/attendance?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.data?.length) {
        setAttendance(res.data.data[0]);
      } else {
        setAttendance(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* ================= GET LOCATION ================= */
  const getLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
        });
      },
      () => {
        setError("Unable to fetch location");
      },
      { enableHighAccuracy: true }
    );
  };

  /* ================= PUNCH IN ================= */
  const punchIn = async () => {
    if (!location) return setError("Get location first");

    try {
      setLoading(true);

      const res = await axios.post(
        "/api/hr/attendance",
        {
          date: today,
          action: "punch-in",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        await loadTodayAttendance();
        setError("");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Punch in failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= PUNCH OUT ================= */
  const punchOut = async () => {
    if (!location) return setError("Get location first");

    try {
      setLoading(true);

      const res = await axios.post(
        "/api/hr/attendance",
        {
          date: today,
          action: "punch-out",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data?.success) {
        await loadTodayAttendance();
        setError("");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "Punch out failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESET ================= */
  const resetUI = () => {
    setLocation(null);
    setAttendance(null);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-6 space-y-6">

        {/* ================= EMPLOYEE INFO ================= */}
        {employee && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="text-blue-700" />
            </div>

            <div>
              <p className="font-semibold">{employee.name}</p>
              <p className="text-sm text-gray-600">
                {employee.designation} — {employee.department}
              </p>
            </div>
          </div>
        )}

        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin className="text-indigo-600" />
            <h2 className="text-lg font-semibold">
              Punch In / Punch Out
            </h2>
          </div>

          <button
            onClick={getLocation}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Get Location
          </button>
        </div>

        {/* ================= MAP ================= */}
        <div className="border rounded-xl p-3 bg-gray-50">
          {location ? (
            <>
              <MapPreview
                latitude={location.latitude}
                longitude={location.longitude}
              />
              <p className="text-xs mt-2 text-gray-600">
                Lat: {location.latitude} | Lng: {location.longitude}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Click <b>Get Location</b> to load the map
            </p>
          )}
        </div>

        {/* ================= ACTION BUTTONS ================= */}
        <div className="flex gap-3">
          <button
            onClick={punchIn}
            disabled={!location || attendance?.punchIn?.time}
            className="flex-1 py-2 rounded-lg text-white bg-green-600 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Punch In"}
          </button>

          <button
            onClick={punchOut}
            disabled={!attendance?.punchIn?.time || attendance?.punchOut?.time}
            className="flex-1 py-2 rounded-lg text-white bg-red-600 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Punch Out"}
          </button>
        </div>

        {/* ================= SUMMARY ================= */}
        <div className="bg-green-50 p-4 rounded-xl border">
          <h3 className="font-semibold flex gap-2 items-center">
            <Clock className="w-4 h-4" /> Today’s Summary
          </h3>

          <p className="text-sm mt-2">
            Punch In:{" "}
            <strong>{attendance?.punchIn?.time || "Not yet"}</strong>
          </p>

          <p className="text-sm">
            Punch Out:{" "}
            <strong>{attendance?.punchOut?.time || "Not yet"}</strong>
          </p>

          <p className="text-sm">
            Status:{" "}
            <strong>{attendance?.status || "Not defined"}</strong>
          </p>

          <p className="text-sm">
            Total Hours:{" "}
            <strong>{attendance?.totalHours || 0}</strong>
          </p>
        </div>

        {/* ================= RESET ================= */}
        <button
          onClick={resetUI}
          className="border px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Reset UI
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
