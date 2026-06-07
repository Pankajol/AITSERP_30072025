import { Suspense } from "react";
import OpportunityForm from "@/components/crm/OpportunityForm"; // adjust path as needed

async function EditOpportunityContent({ params }) {
  const { id } = await params;
  return <OpportunityForm opportunityId={id} />;
}

export default function EditOpportunityPage({ params }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>}>
      <EditOpportunityContent params={params} />
    </Suspense>
  );
}