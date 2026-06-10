"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  FiEye, FiEyeOff, FiMail, FiLock, FiChevronRight,
  FiLoader, FiUser, FiBriefcase, FiShield, FiHeart
} from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

const hasElectionRole = (roles) => {
  if (!roles || !Array.isArray(roles)) return false;
  const electionRoles = [
    "Election Admin", "Election Manager", "Election Agent",
    "Booth Worker", "Surveyor", "Campaign Manager", "Election Analyst"
  ];
  return roles.some(role => electionRoles.includes(role));
};

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState('Company');
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [shake, setShake] = useState('');

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'email') setEmailError('');
  };

  const triggerShake = (field) => {
    setShake(field);
    setTimeout(() => setShake(''), 400);
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async (e) => {
    e.preventDefault();

    if (!form.email || !validateEmail(form.email)) {
      setEmailError('Please enter a valid email address');
      triggerShake('email');
      return;
    }
    if (!form.password) {
      triggerShake('password');
      toast.error("Password is required");
      return;
    }

    setLoading(true);

    try {
      const urls = {
        Company: "/api/company/login",
        User: "/api/users/login",
        Customer: "/api/customers/login",
      };

      const res = await axios.post(urls[mode], form);
      const { token, company, user, customer } = res.data;
      const finalUser = company || user || customer;

      if (!token || !finalUser) throw new Error("Authentication failed");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      toast.success(`Welcome back, ${finalUser.name || finalUser.companyName || "User"}!`);

      let redirect = "/admin";

      if (mode === "Customer") {
        redirect = "/customer-dashboard";
      } else if (mode === "User") {
        const roles = finalUser?.roles?.map((r) => r.toLowerCase()) || [];
        if (hasElectionRole(finalUser.roles)) {
          redirect = "/election";
        } else if (roles.includes("guard") || roles.includes("housekeeper")) {
          redirect = "/societymanagement/guard";
        } else if (roles.includes("resident")) {
          redirect = "/societymanagement/dashboard";
        } else if (roles.includes("society manager")) {
          redirect = "/societymanagement";
        } else if (roles.includes("employee")) {
          redirect = "/admin/hr/employees";
        } else if (roles.includes("admin")) {
          redirect = "/admin";
        } else {
          redirect = "/admin";
        }
      } else if (mode === "Company") {
        const managementType = finalUser?.managementType?.toLowerCase() || "erp";
        if (managementType === "society") redirect = "/societymanagement";
        else if (managementType === "healthcare") redirect = "/healthcare-dashboard";
        else if (managementType === "education") redirect = "/education-dashboard";
        else if (managementType === "retail") redirect = "/retail-dashboard";
        else if (managementType === "election") redirect = "/election";
        else redirect = "/admin";
      }

      router.push(redirect);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'Company', icon: <FiBriefcase size={13} /> },
    { id: 'User', icon: <FiUser size={13} /> },
    { id: 'Customer', icon: <FiHeart size={13} /> },
  ];

  return (
    <main className="login-root">

      {/* ── Animated Background ── */}
      <div className="bg-layer" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="star s1" /><div className="star s2" />
        <div className="star s3" /><div className="star s4" />
        <div className="grid-lines" />
      </div>

      <ToastContainer position="top-center" theme="light" autoClose={3000} />

      <div className="content-wrap">

        {/* ── Brand Header ── */}
        <div className="brand-header">
          <div className="logo-box">
            {!imageLoaded && !logoError && (
              <div className="logo-skeleton">
                <div className="logo-spinner" />
              </div>
            )}
            {!logoError ? (
              <Image
                src="/logo2_erpexpress.png"
                alt="Pankajal ERP"
                width={72}
                height={72}
                className={`logo-img ${imageLoaded ? 'visible' : 'hidden'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="logo-fallback">PE</span>
            )}
          </div>
          <h1 className="brand-name">Pankajal ERP</h1>
          <p className="brand-tagline">Enterprise Resource Platform</p>
        </div>

        {/* ── Login Card ── */}
        <div className="card">
          <div className="card-accent-bar" />

          {/* Tabs */}
          <div className="tabs" role="tablist" aria-label="Login mode">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={mode === tab.id}
                type="button"
                className={`tab-btn ${mode === tab.id ? 'tab-active' : ''}`}
                onClick={() => {
                  setMode(tab.id);
                  setForm({ email: '', password: '' });
                  setEmailError('');
                }}
              >
                {tab.icon}
                <span>{tab.id}</span>
              </button>
            ))}
          </div>

          {/* Card Body */}
          <div className="card-body">
            <div className="card-welcome">
              <h2 className="welcome-title">Welcome back</h2>
              <p className="welcome-sub">Sign in to your {mode.toLowerCase()} account</p>
            </div>

            <form onSubmit={submit} noValidate>

              {/* Email */}
              <div className={`field ${shake === 'email' ? 'shake' : ''}`}>
                <label htmlFor="email" className="field-label">Email address</label>
                <div className={`input-wrap ${emailError ? 'input-error' : ''}`}>
                  <FiMail className="input-icon" size={15} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handle}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="field-input"
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-invalid={!!emailError}
                  />
                </div>
                {emailError && (
                  <p id="email-error" className="field-err" role="alert">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className={`field ${shake === 'password' ? 'shake' : ''}`}>
                <label htmlFor="password" className="field-label">Password</label>
                <div className="input-wrap">
                  <FiLock className="input-icon" size={15} aria-hidden="true" />
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="forgot-row">
                <button type="button" className="forgot-btn">Forgot password?</button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
                aria-busy={loading}
              >
                {loading ? (
                  <FiLoader className="spin" size={17} aria-hidden="true" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <FiChevronRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="divider" aria-hidden="true">
              <hr className="div-line" />
              <span className="div-text">or</span>
              <hr className="div-line" />
            </div>

            {/* SSO Buttons */}
            <div className="sso-row">
              <button type="button" className="sso-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google</span>
              </button>
              <button type="button" className="sso-btn">
                <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
                  <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

            {/* Register */}
            <p className="register-row">
              New to the platform?{' '}
              <a href="/signup" className="register-link">Create an account</a>
            </p>
          </div>

          {/* Card Footer */}
          <div className="card-footer">
            <span className="footer-ver">v3.0.4</span>
            <div className="footer-status">
              <span className="status-dot" aria-hidden="true" />
              <span>Servers online</span>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="security-badge" aria-label="Security information">
          <FiShield size={12} aria-hidden="true" />
          <span>256-bit AES · Authorized access only</span>
        </div>
      </div>

      <style jsx>{`

        /* ── Reset & Root ── */
        .login-root {
          min-height: 100vh;
          height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a1929 0%, #0d2748 40%, #1a3d6e 100%);
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ── Animated Background ── */
        .bg-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: floatOrb 12s ease-in-out infinite;
        }
        .orb-1 {
          width: 380px; height: 380px;
          background: rgba(249, 115, 22, 0.18);
          top: -100px; right: -80px;
          animation-duration: 10s;
        }
        .orb-2 {
          width: 320px; height: 320px;
          background: rgba(59, 130, 246, 0.14);
          bottom: -100px; left: -80px;
          animation-duration: 14s;
          animation-delay: 2s;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: rgba(249, 115, 22, 0.10);
          bottom: 20%; right: 10%;
          animation-duration: 9s;
          animation-delay: 4s;
        }
        .grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .star {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.7);
          animation: starPulse 4s ease-in-out infinite;
        }
        .s1 { top: 14%; left: 8%; animation-delay: 0s; }
        .s2 { top: 18%; right: 10%; animation-delay: 1.2s; }
        .s3 { bottom: 22%; left: 20%; animation-delay: 2.1s; }
        .s4 { bottom: 16%; right: 18%; animation-delay: 0.7s; }

        @keyframes floatOrb {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-22px) scale(1.04); }
        }
        @keyframes starPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Layout ── */
        .content-wrap {
          width: 100%;
          max-width: 400px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          position: relative;
          z-index: 10;
          animation: fadeUp 0.4s ease-out;
        }

        /* ── Brand Header ── */
        .brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
        }
        .logo-box {
          width: 72px; height: 72px;
          background: #fff;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          margin-bottom: 12px;
          overflow: hidden;
          position: relative;
          transition: transform 0.2s;
        }
        .logo-box:hover { transform: scale(1.04); }
        .logo-img { object-fit: contain; }
        .logo-img.visible { opacity: 1; }
        .logo-img.hidden { opacity: 0; }
        .logo-skeleton {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: #fff;
        }
        .logo-spinner {
          width: 24px; height: 24px;
          border: 2px solid #e2e8f0;
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .logo-fallback {
          font-size: 22px;
          font-weight: 600;
          background: linear-gradient(135deg, #1d4ed8, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .brand-name {
          color: #ffffff;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.4px;
          margin: 0 0 2px;
        }
        .brand-tagline {
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── Card ── */
        .card {
          width: 100%;
          background: rgba(255,255,255,0.98);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.15);
        }
        .card-accent-bar {
          height: 4px;
          background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 45%, #f97316 100%);
        }

        /* ── Tabs ── */
        .tabs {
          display: flex;
          gap: 4px;
          padding: 8px 12px 0;
          background: #fff;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 8px 6px;
          border-radius: 10px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover:not(.tab-active) {
          background: #e2e8f0;
          color: #334155;
        }
        .tab-active {
          background: linear-gradient(135deg, #1d4ed8, #2563eb) !important;
          color: #fff !important;
          box-shadow: 0 3px 10px rgba(29,78,216,0.3);
        }

        /* ── Card Body ── */
        .card-body {
          padding: 18px 22px 20px;
        }
        .card-welcome {
          margin-bottom: 16px;
        }
        .welcome-title {
          font-size: 19px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 2px;
        }
        .welcome-sub {
          font-size: 12.5px;
          color: #64748b;
          margin: 0;
        }

        /* ── Fields ── */
        .field {
          margin-bottom: 13px;
        }
        .field.shake {
          animation: shake 0.35s ease;
        }
        .field-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-wrap.input-error .field-input {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .input-icon {
          position: absolute;
          left: 11px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }
        .field-input {
          width: 100%;
          height: 40px;
          padding: 0 40px 0 36px;
          border: 1.5px solid #e2e8f0;
          border-radius: 11px;
          background: #f8fafc;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input::placeholder { color: #cbd5e1; }
        .field-input:focus {
          border-color: #1d4ed8;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.1);
        }
        .eye-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: #475569; }
        .field-err {
          font-size: 11px;
          color: #ef4444;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ── Forgot ── */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
          margin-top: -4px;
        }
        .forgot-btn {
          background: none;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: #f97316;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }
        .forgot-btn:hover { color: #ea580c; }

        /* ── Submit ── */
        .submit-btn {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 50%, #ea6a05 120%);
          background-size: 200% 100%;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(29,78,216,0.35);
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 20px rgba(29,78,216,0.4);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }

        /* ── Divider ── */
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 14px 0;
        }
        .div-line {
          flex: 1;
          border: none;
          border-top: 1px solid #e2e8f0;
        }
        .div-text {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          white-space: nowrap;
        }

        /* ── SSO ── */
        .sso-row {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        .sso-btn {
          flex: 1;
          height: 36px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .sso-btn:hover {
          border-color: #1d4ed8;
          background: #eff6ff;
          color: #1d4ed8;
          box-shadow: 0 2px 8px rgba(29,78,216,0.12);
        }

        /* ── Register ── */
        .register-row {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .register-link {
          color: #f97316;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s;
        }
        .register-link:hover { color: #ea580c; }

        /* ── Card Footer ── */
        .card-footer {
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          padding: 9px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-ver {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        .footer-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }
        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: starPulse 2.5s ease-in-out infinite;
        }

        /* ── Security Badge ── */
        .security-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 14px;
          padding: 5px 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 100px;
          color: rgba(255,255,255,0.5);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .content-wrap {
            padding: 16px 12px;
            max-width: 100%;
          }
          .brand-name { font-size: 20px; }
          .logo-box { width: 64px; height: 64px; }
          .card-body { padding: 16px 16px 18px; }
          .card-footer { padding: 8px 16px; }
          .welcome-title { font-size: 17px; }
          .submit-btn { height: 40px; font-size: 13.5px; }
          .orb-1 { width: 250px; height: 250px; }
          .orb-2 { width: 200px; height: 200px; }
        }
        @media (max-height: 700px) {
          .brand-header { margin-bottom: 12px; }
          .logo-box { width: 56px; height: 56px; border-radius: 14px; }
          .brand-name { font-size: 18px; }
          .brand-tagline { display: none; }
          .card-body { padding: 14px 20px 16px; }
          .card-welcome { margin-bottom: 12px; }
          .field { margin-bottom: 10px; }
          .divider { margin: 10px 0; }
          .sso-row { margin-bottom: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb, .star, .status-dot, .spin, .logo-box { animation: none !important; }
          .card { animation: none !important; }
          .content-wrap { animation: none !important; }
        }
      `}</style>
    </main>
  );
}



// "use client";

// import { useState,useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FiEye, FiEyeOff, FiMail, FiLock, FiChevronRight, FiLoader, FiShield, FiUser, FiBriefcase } from 'react-icons/fi';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import Image from 'next/image';

// const Link = ({ href, children, className }) => (
//   <a href={href} className={className}>
//     {children}
//   </a>
// );

// export default function LoginPage() {
//   const router = useRouter();

//   const [mode, setMode] = useState('Company');
//   const [form, setForm] = useState({ email: '', password: '' });
//   const [show, setShow] = useState(false);
//   const [loading, setLoading] = useState(false);
  
// // In your component:
// const [logoError, setLogoError] = useState(false);
// const [imageLoaded, setImageLoaded] = useState(false);

//   const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();

//     if (!form.email || !form.password) {
//       return toast.error("Credentials required");
//     }

//     setLoading(true);

//     try {
//       const urls = {
//         Company: "/api/company/login",
//         User: "/api/users/login",
//         Customer: "/api/customers/login",
//       };

//       const res = await axios.post(urls[mode], form);

//       const { token, company, user, customer } = res.data;
//       const finalUser = company || user || customer;

//       if (!token || !finalUser) throw new Error("Authentication failed");

//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(finalUser));

//       axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

//       toast.success(`Access Granted: ${finalUser.name || "User"}`);

//       let redirect = "/admin";

//       if (mode === "Customer") {
//         redirect = "/customer-dashboard";
//       } else if (mode === "User") {
//         const roles = finalUser?.roles?.map((r) => r.toLowerCase()) || [];
//         if (roles.includes("employee")) {
//           redirect = "/admin/hr/employees";
//         } else if (roles.includes("admin")) {
//           redirect = "/admin";
//         }
//       }

//       router.push(redirect);

//     } catch (error) {
//       toast.error(error?.response?.data?.message || "Verification Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#105B92' }}>
      
//       {/* Animated Background - Lighter overlays for depth */}
//       <div className="absolute inset-0 overflow-hidden">
//         <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse" />
//         <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse animation-delay-2000" />
//         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-pulse animation-delay-4000" />
//       </div>

//       <ToastContainer position="top-center" theme="light" />

//       <div className="w-full max-w-md z-10 px-6">
        



// <div className="flex flex-col items-center mb-6 sm:mb-8">
//   <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4 transition-all duration-300 hover:scale-105 overflow-hidden relative">
    
//     {/* Show loading spinner while image loads */}
//     {!imageLoaded && !logoError && (
//       <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
//         <div className="w-6 h-6 border-2 border-[#105B92] border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     )}
    
//     {/* Attempt to load image */}
//     {!logoError ? (
//       <img
//         src="/logo2_erpexpress.png"
//         alt="ERP Express Logo"
//         className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
//         onLoad={() => setImageLoaded(true)}
//         onError={() => setLogoError(true)}
//       />
//     ) : (
//       /* Fallback 1: Text logo */
//       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#105B92] to-[#0a3b60] rounded-2xl">
//         <span className="text-white font-bold text-2xl sm:text-3xl">ERP</span>
//       </div>
//     )}
//   </div>
  
//   {/* Fallback 2: If image fails and you want to show an icon instead */}
//   {logoError && (
//     <div className="mt-2 text-center">
//       <span className="text-blue-100 text-xs">Logo not loaded, using text version</span>
//     </div>
//   )}
  
//   {/* <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">
//     AITS <span className="text-blue-200">Cloud</span>
//   </h1>
//   <p className="text-blue-100 text-[10px] sm:text-xs font-medium uppercase tracking-wide mt-1 text-center">
//     Enterprise Resource Hub
//   </p> */}
// </div>

//         {/* Login Card */}
//         <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          
//           {/* Tabs */}
//           <div className="flex p-1 bg-gray-100/50 gap-1">
//             {[
//               { id: 'Company', icon: <FiBriefcase size={14} /> },
//               { id: 'User', icon: <FiUser size={14} /> },
//               { id: 'Customer', icon: <FiMail size={14} /> }
//             ].map((tab) => (
//               <button
//                 key={tab.id}
//                 type="button"
//                 onClick={() => {
//                   setMode(tab.id);
//                   setForm({ email: '', password: '' });
//                 }}
//                 className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
//                   mode === tab.id 
//                     ? 'text-white shadow-sm' 
//                     : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
//                 }`}
//                 style={mode === tab.id ? { backgroundColor: '#105B92' } : {}}
//               >
//                 {tab.icon} {tab.id}
//               </button>
//             ))}
//           </div>

//           <div className="p-6">
//             <form onSubmit={submit} className="space-y-5">
              
//               {/* Email */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
//                     <FiMail size={16} />
//                   </div>
//                   <input
//                     type="email"
//                     name="email"
//                     value={form.email}
//                     onChange={handle}
//                     className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#105B92] focus:border-transparent transition"
//                     placeholder="name@company.com"
//                   />
//                 </div>
//               </div>

//               {/* Password */}
//               <div>
//                 <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
//                     <FiLock size={16} />
//                   </div>
//                   <input
//                     type={show ? "text" : "password"}
//                     name="password"
//                     value={form.password}
//                     onChange={handle}
//                     className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#105B92] focus:border-transparent transition"
//                     placeholder="••••••••"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShow(!show)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   >
//                     {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
//                   </button>
//                 </div>
//               </div>

//               {/* Forgot Password */}
//               <div className="text-right">
//                 <button type="button" className="text-xs font-medium" style={{ color: '#105B92' }}>
//                   Forgot password?
//                 </button>
//               </div>

//               {/* Submit Button */}
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
//                 style={{ backgroundColor: '#105B92' }}
//               >
//                 {loading ? <FiLoader className="animate-spin" size={18} /> : <span>Sign In</span>}
//                 {!loading && <FiChevronRight size={16} />}
//               </button>
//             </form>

//             {/* Register Link */}
//             <div className="mt-6 text-center text-xs text-gray-500">
//               New to the platform?{' '}
//               <Link href="/signup" className="font-semibold" style={{ color: '#105B92' }}>
//                 Create an account
//               </Link>
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
//             <span className="text-gray-400">AITS v3.0.4</span>
//             <div className="flex items-center gap-2">
//               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
//               <span className="text-gray-400">Servers Online</span>
//             </div>
//           </div>
//         </div>

//         {/* Security Note */}
//         <p className="text-center text-blue-100 text-[10px] uppercase tracking-wider mt-6">
//           🔒 256-bit AES encryption • Authorized access only
//         </p>
//       </div>

//       {/* Add custom delay classes for Tailwind */}
//       <style jsx>{`
//         .animation-delay-2000 {
//           animation-delay: 2s;
//         }
//         .animation-delay-4000 {
//           animation-delay: 4s;
//         }
//       `}</style>
//     </main>
//   );
// }





// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function LoginPage() {
//   const router = useRouter();

//   const [mode, setMode] = useState('Company');
//   const [form, setForm] = useState({ email: '', password: '' });
//   const [show, setShow] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     if (!form.email || !form.password) {
//       toast.error("Email and password are required");
//       setLoading(false);
//       return;
//     }

//     try {
//       const url =
//         mode === "Company"
//           ? "/api/company/login"
//           : "/api/users/login";

//       const res = await axios.post(url, form);

//       const token = res?.data?.token;
//       const company = res?.data?.company; // ✅ THIS IS CORRECT
//       const user = res?.data?.user; // for user login case

//       const finalUser = mode === "Company" ? company : user;

//       if (!finalUser) {
//         toast.error("Invalid login response");
//         setLoading(false);
//         return;
//       }

//       // Save into localStorage
//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(finalUser));

//       toast.success("Login successful 🚀");

//       // ✅ Redirect logic
//       let redirect = "/";

//       if (mode === "Company") {
//         redirect = "/admin";
//       } else {
//         const roles = Array.isArray(finalUser?.roles)
//           ? finalUser.roles.map(r => r.toLowerCase())
//           : [];

//         if (roles.includes("admin")) redirect = "/admin";
//         else if (roles.includes("agent")) redirect = "/agent-dashboard";
//         else if (roles.includes("employee")) redirect = "/employee-dashboard";
//         else redirect = "/customer-dashboard";
//       }

//       setTimeout(() => {
//         router.push(redirect);
//       }, 800);

//     } catch (error) {
//       toast.error(
//         error?.response?.data?.message ||
//         "Invalid email or password"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
//       <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6">

//         {/* Mode Switch */}
//         <div className="flex justify-center gap-4">
//           {['Company','User'].map(m => (
//             <button
//               key={m}
//               onClick={() => {
//                 setMode(m);
//                 setForm({ email: '', password: '' });
//               }}
//               className={`px-4 py-2 rounded-lg ${
//                 mode === m
//                   ? 'bg-amber-400 text-white'
//                   : 'bg-gray-200 text-gray-700'
//               }`}
//             >
//               {m} Login
//             </button>
//           ))}
//         </div>

//         <h2 className="text-2xl font-bold text-center">
//           {mode} Login
//         </h2>

//         <form onSubmit={submit} className="space-y-4">

//           {/* Email */}
//           <div>
//             <label className="block text-sm">Email</label>
//             <div className="relative">
//               <FiMail className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type="email"
//                 name="email"
//                 value={form.email}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your email"
//               />
//             </div>
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm">Password</label>
//             <div className="relative">
//               <FiLock className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type={show ? "text" : "password"}
//                 name="password"
//                 value={form.password}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your password"
//               />

//               <button
//                 type="button"
//                 onClick={() => setShow(!show)}
//                 className="absolute right-3 top-3 text-gray-600"
//               >
//                 {show ? <FiEyeOff /> : <FiEye />}
//               </button>
//             </div>
//           </div>

//           <button
//             disabled={loading}
//             className={`w-full py-2 rounded-md text-white ${
//               loading
//                 ? 'bg-gray-400'
//                 : 'bg-amber-400 hover:bg-amber-600'
//             }`}
//           >
//             {loading ? 'Signing in…' : 'Sign In'}
//           </button>

//         </form>
//       </div>
//     </main>
//   );
// }
