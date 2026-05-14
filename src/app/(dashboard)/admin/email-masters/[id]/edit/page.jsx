// /app/email-master/[id]/edit/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmailForm from "@/components/email-master/EmailForm";

export default function EditPage({ params }) {
  const id = params.id;
  const router = useRouter();
  const [initial, setInitial] = useState(null);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/email-masters");
      const all = await res.json();
      const item = all.find(i => i._id === id);
      if (item) setInitial(item);
      else {
        // fetch single? fallback: redirect
        alert("Item not found");
        router.push("/email-masters");
      }
    })();
  }, [id]);

  if (!initial) return <div className="p-6">Loading...</div>;

  async function onSaved() {
    router.push("/email-masters");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit: {initial.email}</h1>
      </div>
      <EmailForm initial={initial} onSaved={onSaved} />
    </div>
  );
}
