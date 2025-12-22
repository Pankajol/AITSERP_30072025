import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/** ================= HELPERS ================= **/
function bad(status, msg) {
  return Response.json({ success: false, msg }, { status });
}

/** ================= POST (ADD SUPPORT MAIL) ================= **/
export async function POST(req) {
  try {
    await dbConnect();

    // 1: Read token
    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized");

    // 2: Decode JWT
    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch {
      return bad(403, "Invalid token");
    }

    const companyId = decoded.companyId;
    if (!companyId) return bad(400, "Company ID missing in token");

    // 3: Read email field
    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();
    if (!email) return bad(400, "Email required");
    if (!email.includes("@")) return bad(400, "Invalid email format");

    // 4: Find company
    const company = await Company.findById(companyId);
    if (!company) return bad(404, "Company not found");

    // 5: Push unique email
    company.supportEmails.push(email);
    company.supportEmails = [...new Set(company.supportEmails)];
    await company.save();

    return Response.json({
      success: true,
      supportEmails: company.supportEmails,
      msg: "Support email added"
    });

  } catch (err) {
    console.error("POST error:", err);
    return bad(500, err.message);
  }
}


/** ================= GET (LIST SUPPORT MAILS) ================= **/
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch {
      return bad(403, "Invalid token");
    }

    const companyId = decoded.companyId;
    if (!companyId) return bad(400, "Company ID missing in token");

    const company = await Company.findById(companyId).select("supportEmails");
    if (!company) return bad(404, "Company not found");

    return Response.json({
      success: true,
      supportEmails: company.supportEmails || [],
    });

  } catch (err) {
    console.error("GET error:", err);
    return bad(500, err.message);
  }
}


/** ================= DELETE (REMOVE SUPPORT MAIL) ================= **/
export async function DELETE(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch {
      return bad(403, "Invalid token");
    }

    const companyId = decoded.companyId;
    if (!companyId) return bad(400, "Company ID missing in token");

    const body = await req.json();
    const email = body?.email?.trim()?.toLowerCase();
    if (!email) return bad(400, "Email required");

    const company = await Company.findById(companyId);
    if (!company) return bad(404, "Company not found");

    company.supportEmails = company.supportEmails.filter(
      (e) => e.toLowerCase() !== email
    );
    await company.save();

    return Response.json({
      success: true,
      supportEmails: company.supportEmails,
      msg: "Support email removed",
    });

  } catch (err) {
    console.error("DELETE error:", err);
    return bad(500, err.message);
  }
}
