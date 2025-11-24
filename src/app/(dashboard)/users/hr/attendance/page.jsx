



"use client";

import React, { useState ,useEffect} from "react";
import { MapPin, CheckCircle, XCircle, User, Clock } from "lucide-react";
import MapPreview from "@/components/MapPreview"; // already in your project

export default function AttendancePage() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [attendance, setAttendance] = useState({
    punchIn: null,
    punchOut: null,
    totalHours: 0,
  });

  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("/api/hr/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setEmployee(data.employee);
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  // -----------------------------
  // GET LOCATION
  // -----------------------------
  const getLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: +pos.coords.latitude.toFixed(6),
          longitude: +pos.coords.longitude.toFixed(6),
        });
        setLoading(false);
      },
      () => {
        setError("Unable to fetch location");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // -----------------------------
  // PUNCH IN
  // -----------------------------
  const punchIn = async () => {
    if (!location) return setError("Fetch location first");

    const time = new Date().toLocaleTimeString();

    setAttendance((prev) => ({
      ...prev,
      punchIn: { time, ...location },
    }));

    // TODO: API call
    // await fetch("/api/hr/attendance/punch-in", {...})
  };

  // -----------------------------
  // PUNCH OUT
  // -----------------------------
  const punchOut = async () => {
    if (!location) return setError("Fetch location first");

    if (!attendance.punchIn) return setError("Punch in before punching out");

    const timeOut = new Date().toLocaleTimeString();

    // Calculate hours
    const now = new Date();
    const inTime = new Date();
    const inParts = attendance.punchIn.time.split(":");

    inTime.setHours(inParts[0], inParts[1], inParts[2]);

    const diff = (now - inTime) / (1000 * 60 * 60);

    setAttendance((prev) => ({
      ...prev,
      punchOut: { time: timeOut, ...location },
      totalHours: diff.toFixed(2),
    }));

    // TODO: API call
    // await fetch("/api/hr/attendance/punch-out", {...})
  };

  // -----------------------------
  // RESET
  // -----------------------------
  const reset = () => {
    setAttendance({
      punchIn: null,
      punchOut: null,
      totalHours: 0,
    });
    setLocation(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6">
        {/* ---------------- EMPLOYEE CARD ---------------- */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-100 border mb-6">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
            <User className="h-6 w-6" />
          </div>
          <div>
            {employee ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-100 border mb-6">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{employee.name}</h2>
                  <p className="text-gray-600 text-sm">
                    {employee.designation} — {employee.department}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Loading employee details...
              </p>
            )}
          </div>
        </div>

        {/* ---------------- HEADER ---------------- */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                Punch In / Punch Out Attendance
              </h1>
              <p className="text-sm text-gray-500">
                Real-time GPS-based attendance
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={getLocation}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow"
            >
              {loading ? "Loading..." : "Get Location"}
            </button>
          </div>
        </header>

        {/* ---------------- MAP + LOCATION ---------------- */}
        <main className="space-y-6">
          <section className="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              Your Location
            </h2>

            {location ? (
              <>
                <MapPreview
                  latitude={location.latitude}
                  longitude={location.longitude}
                />

                <p className="text-xs mt-2 text-gray-600">
                  Lat: {location.latitude} — Lng: {location.longitude}
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <XCircle className="text-red-400" /> Click **Get Location** to
                load GPS position.
              </p>
            )}
          </section>

          {/* ---------------- PUNCH BUTTONS ---------------- */}
          <div className="flex gap-3">
            <button
              onClick={punchIn}
              disabled={!location || attendance.punchIn}
              className="w-full py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
            >
              Punch In
            </button>

            <button
              onClick={punchOut}
              disabled={!attendance.punchIn || attendance.punchOut}
              className="w-full py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
            >
              Punch Out
            </button>
          </div>

          {/* ---------------- STATUS CARD ---------------- */}
          {(attendance.punchIn || attendance.punchOut) && (
            <section className="bg-green-50 p-4 rounded-lg text-green-700 border">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" /> Today's Summary
              </h3>

              <p className="mt-2 text-sm">
                Punch In:{" "}
                <strong>{attendance.punchIn?.time || "Not yet"}</strong>
              </p>

              <p className="text-sm">
                Punch Out:{" "}
                <strong>{attendance.punchOut?.time || "Not yet"}</strong>
              </p>

              <p className="text-sm">
                Total Hours: <strong>{attendance.totalHours || "0.00"}</strong>
              </p>
            </section>
          )}

          {/* ---------------- RESET BUTTON ---------------- */}
          <button
            onClick={reset}
            className="mt-3 px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Reset
          </button>

          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </main>
      </div>
    </div>
  );
}
