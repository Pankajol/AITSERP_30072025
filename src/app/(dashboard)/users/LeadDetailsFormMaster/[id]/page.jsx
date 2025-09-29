"use client";

import LeadDetailsForm from "@/components/LeadDetailsForm";

export default function LeadDetailsFormPage({ params }) {
//   const { id } = searchParams; // will be undefined for new, or contain leadId for edit
  const { id } = params; // ✅ dynamic route id
  console.log("Lead ID:", id);
  return (
    <div>
      <LeadDetailsForm leadId={id} />
    </div>
  );
}

