import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import BankHead from "@/models/BankHead";
// import GLAccount from "@/models/GLAccount";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ── Auth helper — works with Next.js App Router (Headers instance) ──
function getToken(req) {
  let header = null;
  if (typeof req.headers.get === "function") {
    header = req.headers.get("authorization") || req.headers.get("Authorization");
  } else {
    header = req.headers["authorization"] || req.headers["Authorization"];
  }
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

// ── Authorization check — matches actual JWT structure from logs ──
// JWT contains: { id, companyId, email, roles: [...], modules: {...}, type: "user"|"company" }
function isAuthorized(decoded) {
  if (!decoded) return false;

  // Company owner — always allowed
  if (decoded.type === "company") return true;

  // Admin role
  const roles = Array.isArray(decoded.roles) ? decoded.roles : [];
  if (roles.includes("Admin") || roles.includes("admin")) return true;

  // masters role includes Suppliers access
  if (roles.includes("masters")) return true;

  // Purchase Manager has supplier access
  if (roles.includes("Purchase Manager")) return true;

  // Check if "Suppliers" module is selected in their modules
  const modules = decoded.modules || {};
  if (modules["Suppliers"]?.selected) return true;

  return false;
}

async function validateUser(req) {
  const token = getToken(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const decoded = verifyJWT(token);
    if (!decoded) return { error: "Invalid token", status: 401 };
    if (!isAuthorized(decoded)) return { error: "Forbidden: insufficient permissions", status: 403 };
    return { user: decoded };
  } catch (err) {
    console.error("JWT error:", err.message);
    const status = err.message?.includes("expired") ? 401 : 401;
    return { error: err.message || "Invalid token", status };
  }
}

// ─────────────────────────────────────────
// GET /api/suppliers
// ─────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const suppliers = await Supplier.find({ companyId: user.companyId })
      .populate("glAccount", "accountName accountCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: suppliers }, { status: 200 });
  } catch (err) {
    console.error("GET /suppliers error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
  }
}

// ─────────────────────────────────────────
// POST /api/suppliers
// ─────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Validate required fields
    const requiredFields = ["supplierCode", "supplierName", "supplierType", "pan"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // Prevent duplicate supplierCode within same company
    const existing = await Supplier.findOne({ supplierCode: body.supplierCode, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    const supplier = new Supplier({ ...body, companyId: user.companyId, createdBy: user.id });
    await supplier.save();

    const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");
    return NextResponse.json({ success: true, data: populated }, { status: 201 });

  } catch (err) {
    console.error("POST /suppliers error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
  }
}