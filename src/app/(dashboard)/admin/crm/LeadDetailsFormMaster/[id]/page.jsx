// app/admin/crm/LeadDetailsFormMaster/[id]/page.js
import { Suspense } from "react";
import LeadDetailsForm from "@/components/LeadDetailsForm"; // Adjust the import path as needed

async function EditLeadContent({ params }) {
  // ✅ CORRECT: Await the params promise
  const { id } = await params;
  return <LeadDetailsForm leadId={id} />;
}

export default function EditLeadPage({ params }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading lead data...</p>
        </div>
      </div>
    }>
      <EditLeadContent params={params} />
    </Suspense>
  );
}
