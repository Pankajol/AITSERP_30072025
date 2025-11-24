"use client";

export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-xs font-medium text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
}
