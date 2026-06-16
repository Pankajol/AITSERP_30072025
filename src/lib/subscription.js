import Company from "@/models/Company";

export async function checkAndUpdateSubscription(companyId) {
  const company = await Company.findById(companyId);
  if (!company) return null;

  const now = new Date();
  let statusChanged = false;

  // Trial expiry
  if (company.subscriptionStatus === "trialing" && company.trialEndsAt && now > company.trialEndsAt) {
    company.subscriptionStatus = "expired";
    statusChanged = true;
  }
  // Active subscription expiry
  if (company.subscriptionStatus === "active" && company.currentPeriodEnd && now > company.currentPeriodEnd) {
    company.subscriptionStatus = "expired";
    statusChanged = true;
  }

  if (statusChanged) await company.save();
  return company;
}