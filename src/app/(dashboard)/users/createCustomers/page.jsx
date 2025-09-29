"use client";

import React from "react";
import CustomerManagement from "@/components/sampleofcurd";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CreateCustomersFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <CreateCustomersPage />
    </Suspense>
  );
}

 function CreateCustomersPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  return (
    <div>
      <CustomerManagement customerId={customerId} />
    </div>
  );
}

export default CreateCustomersFormWrapper;
