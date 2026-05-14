"use client";
import React, { useState, useEffect, useRef } from "react";

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => alert("Logout clicked");
  const handleChangePassword = () => alert("Change Password clicked");

  // Simple SVG icons as React components
  const MenuIcon = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );

  const XMarkIcon = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const ChevronDownIcon = ({ open }) => (
    <svg
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const UserCircleIcon = () => (
    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a7.5 7.5 0 0113 0" />
    </svg>
  );

  const KeyIcon = () => (
    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="15.5" r="3.5" />
      <path d="M10 17l6-6" />
      <path d="M18 7l4 4" />
    </svg>
  );

  const LogoutIcon = () => (
    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 19H5a2 2 0 01-2-2V7a2 2 0 012-2h4" />
    </svg>
  );

  return (
    <header className="bg-orange-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <UserCircleIcon />
          <span className="text-xl font-semibold tracking-wide">Import Export System</span>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <button
            onClick={handleChangePassword}
            className="flex items-center hover:underline focus:outline-none"
            title="Change Password"
          >
            <KeyIcon /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center hover:underline focus:outline-none"
            title="Logout"
          >
            <LogoutIcon /> Logout
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center space-x-1 focus:outline-none"
            >
              <span>Profile</span>
              <ChevronDownIcon open={profileMenuOpen} />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg py-2 z-50">
                <button
                  onClick={handleChangePassword}
                  className="w-full text-left px-4 py-2 hover:bg-orange-100"
                >
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-orange-100"
                >
                  Logout
                </button>
                <hr className="my-1" />
                <button
                  className="w-full text-left px-4 py-2 hover:bg-orange-100"
                  onClick={() => alert("Other profile setting clicked")}
                >
                  Settings
                </button>
              </div>
            )}
          </div>
        </nav>

        <button
          className="md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <XMarkIcon /> : <MenuIcon />}
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-orange-700 text-white px-4 py-3 space-y-3">
          <button
            onClick={handleChangePassword}
            className="flex items-center w-full hover:underline focus:outline-none"
          >
            <KeyIcon /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full hover:underline focus:outline-none"
          >
            <LogoutIcon /> Logout
          </button>
          <button
            className="flex items-center w-full hover:underline focus:outline-none"
            onClick={() => alert("Other profile setting clicked")}
          >
            <UserCircleIcon /> Settings
          </button>
        </nav>
      )}
    </header>
  );
}

export default TopBar;
