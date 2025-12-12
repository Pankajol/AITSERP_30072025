// /app/email-master/add/page.jsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailForm from "@/components/email-master/EmailForm"; // <- adjust path if your EmailForm lives elsewhere

export default function AddPage() {
  const router = useRouter();

  async function onSaved(data) {
    // called after EmailForm saves successfully
    // you can show a toast or message here if you want
    // then navigate back to list
    router.push("/admin/email-masters");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add Email</h1>
        <Link href="/email-masters" className="text-sm text-gray-600">
          Back to list
        </Link>
      </div>

      {/* EmailForm is a client component */}
      <EmailForm onSaved={onSaved} />
    </div>
  );
}
