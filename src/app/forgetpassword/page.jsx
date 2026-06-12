'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState('Company');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resetRoutes = {
    Company: '/api/company/reset-password',
    User: '/api/users/reset-password',
    Customer: '/api/customers/set-password',
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(resetRoutes[mode], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Unable to reset password.');
      } else {
        setMessage(data.message || 'Password updated successfully.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700 p-8 shadow-2xl text-slate-100">
        <h1 className="text-2xl font-semibold mb-2">Reset your password</h1>
        <p className="text-slate-400 mb-4">
          Select the account type and enter the email used for that login.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          {['Company', 'User', 'Customer'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === item
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="Enter new password"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              placeholder="Repeat new password"
              required
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          {message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="font-semibold text-sky-300 hover:text-sky-200"
          >
            Back to login
          </button>
        </div>
      </div>
    </main>
  );
}
