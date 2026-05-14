export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* ================= HELPERS ================= */
function errorRes(status, msg) {
  return Response.json({ success: false, msg }, { status });
}

async function getCompany(req, withSecrets = false) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: errorRes(401, "Unauthorized") };

  const decoded = verifyJWT(token);
  if (!decoded?.companyId)
    return { error: errorRes(401, "Invalid token") };

  await dbConnect();

  let query = Company.findById(decoded.companyId);

  // 🔐 only when needed (PUT/POST internal use)
  if (withSecrets) {
    query = query.select("+supportEmails.appPassword");
  }

  const company = await query;
  if (!company) return { error: errorRes(404, "Company not found") };

  return { company };
}

/* ================= GET ================= */
export async function GET(req) {
  const { company, error } = await getCompany(req);
  if (error) return error;

  return Response.json({
    success: true,
    supportEmails: company.supportEmails.map((e) => ({
      email: e.email,
      type: e.type,

      // 🟦 Outlook identifiers (safe to expose)
      tenantId: e.tenantId || "",
      clientId: e.clientId || "",
      webhookSecret: e.webhookSecret || "",

      inboundEnabled: e.inboundEnabled,
      outboundEnabled: e.outboundEnabled,
      createdAt: e.createdAt,
    })),
  });
}

/* ================= POST (ADD) ================= */
export async function POST(req) {
  const { company, error } = await getCompany(req, true);
  if (error) return error;

  const body = await req.json();
  const {
    email,
    type = "gmail",
    appPassword,
    inboundEnabled = true,
    outboundEnabled = true,
    tenantId,
    clientId,
    webhookSecret,
  } = body;

  if (!email || !appPassword) {
    return errorRes(400, "Email & password/secret required");
  }

  // 🟦 Outlook validation
  if (type === "outlook") {
    if (!tenantId || !clientId || !webhookSecret) {
      return errorRes(
        400,
        "Tenant ID, Client ID & Webhook Secret required for Outlook"
      );
    }
  }

  const exists = company.supportEmails.some(
    (e) => e.email === email.toLowerCase()
  );
  if (exists) return errorRes(409, "Support email already exists");

  company.supportEmails.push({
    email,
    type,
    appPassword,
    inboundEnabled,
    outboundEnabled,

    // Outlook only
    tenantId: type === "outlook" ? tenantId : undefined,
    clientId: type === "outlook" ? clientId : undefined,
    webhookSecret: type === "outlook" ? webhookSecret : undefined,
  });

  await company.save();
  return Response.json({ success: true, msg: "Support email added" });
}

/* ================= PUT (UPDATE) ================= */
export async function PUT(req) {
  const { company, error } = await getCompany(req, true);
  if (error) return error;

  const { index, data } = await req.json();
  if (index === undefined) return errorRes(400, "Index is required");

  const emailObj = company.supportEmails[index];
  if (!emailObj) return errorRes(404, "Support email not found");

  emailObj.email = data.email ?? emailObj.email;
  emailObj.type = data.type ?? emailObj.type;
  emailObj.inboundEnabled =
    data.inboundEnabled ?? emailObj.inboundEnabled;
  emailObj.outboundEnabled =
    data.outboundEnabled ?? emailObj.outboundEnabled;

  // 🔐 Update secret only if provided
  if (data.appPassword && data.appPassword.trim()) {
    emailObj.appPassword = data.appPassword;
  }

  // 🟦 Outlook specific update
  if (emailObj.type === "outlook") {
    if (!data.tenantId || !data.clientId || !data.webhookSecret) {
      return errorRes(
        400,
        "Tenant ID, Client ID & Webhook Secret required for Outlook"
      );
    }

    emailObj.tenantId = data.tenantId;
    emailObj.clientId = data.clientId;
    emailObj.webhookSecret = data.webhookSecret;
  } else {
    // cleanup if switched away from outlook
    emailObj.tenantId = undefined;
    emailObj.clientId = undefined;
    emailObj.webhookSecret = undefined;
  }

  await company.save();
  return Response.json({ success: true, msg: "Support email updated" });
}

/* ================= DELETE ================= */
export async function DELETE(req) {
  const { company, error } = await getCompany(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const index = searchParams.get("index");

  if (index === null) return errorRes(400, "Index is required");
  if (!company.supportEmails[index])
    return errorRes(404, "Support email not found");

  company.supportEmails.splice(index, 1);
  await company.save();

  return Response.json({ success: true, msg: "Support email deleted" });
}




// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// /** ================= HELPERS ================= */
// function errorRes(status, msg) {
//   return Response.json({ success: false, msg }, { status });
// }

// async function getCompany(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: errorRes(401, "Unauthorized") };

//   const decoded = verifyJWT(token);
//   if (!decoded?.companyId)
//     return { error: errorRes(401, "Invalid token") };

//   await dbConnect();
//   const company = await Company.findById(decoded.companyId);
//   if (!company) return { error: errorRes(404, "Company not found") };

//   return { company };
// }

// /** ================= GET ================= */
// export async function GET(req) {
//   const { company, error } = await getCompany(req);
//   if (error) return error;

//   return Response.json({
//     success: true,
//     supportEmails: company.supportEmails.map((e) => ({
//       email: e.email,
//       type: e.type,
//       inboundEnabled: e.inboundEnabled,
//       outboundEnabled: e.outboundEnabled,
//       createdAt: e.createdAt,
//     })),
//   });
// }

// /** ================= POST (ADD) ================= */
// export async function POST(req) {
//   const { company, error } = await getCompany(req);
//   if (error) return error;

//   const body = await req.json();
//   const { email, type, appPassword, inboundEnabled, outboundEnabled } = body;

//   if (!email || !appPassword)
//     return errorRes(400, "Email & app password required");

//   const alreadyExists = company.supportEmails.some(
//     (e) => e.email === email.toLowerCase()
//   );

//   if (alreadyExists)
//     return errorRes(409, "Support email already exists");

//   company.supportEmails.push({
//     email,
//     type,
//     appPassword,
//     inboundEnabled,
//     outboundEnabled,
//   });

//   await company.save();

//   return Response.json({ success: true, msg: "Support email added" });
// }

// /** ================= PUT (UPDATE) ================= */
// export async function PUT(req) {
//   const { company, error } = await getCompany(req);
//   if (error) return error;

//   const { index, data } = await req.json();
//   if (index === undefined)
//     return errorRes(400, "Index is required");

//   const emailObj = company.supportEmails[index];
//   if (!emailObj) return errorRes(404, "Support email not found");

//   emailObj.email = data.email ?? emailObj.email;
//   emailObj.type = data.type ?? emailObj.type;
//   emailObj.inboundEnabled =
//     data.inboundEnabled ?? emailObj.inboundEnabled;
//   emailObj.outboundEnabled =
//     data.outboundEnabled ?? emailObj.outboundEnabled;

//   // Password only update if provided
//   if (data.appPassword && data.appPassword.trim() !== "") {
//     emailObj.appPassword = data.appPassword;
//   }

//   await company.save();

//   return Response.json({ success: true, msg: "Support email updated" });
// }

// /** ================= DELETE ================= */
// export async function DELETE(req) {
//   const { company, error } = await getCompany(req);
//   if (error) return error;

//   const { searchParams } = new URL(req.url);
//   const index = searchParams.get("index");

//   if (index === null)
//     return errorRes(400, "Index is required");

//   if (!company.supportEmails[index])
//     return errorRes(404, "Support email not found");

//   company.supportEmails.splice(index, 1);
//   await company.save();

//   return Response.json({ success: true, msg: "Support email deleted" });
// }
