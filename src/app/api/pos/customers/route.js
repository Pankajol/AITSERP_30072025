export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import POSCustomer from "@/models/pos/POSCustomer";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * GET → List POS customers (company-wise)
 */
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    const customers = await POSCustomer.find({
      companyId: user.companyId,
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ success: true, data: customers });
  } catch (err) {
    console.error("POS CUSTOMER GET ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to load POS customers" },
      { status: 500 }
    );
  }
}

/**
 * POST → Create / Reuse POS Customer
 */
export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    const body = await req.json();
    const { name, mobile, email, gstin, customerRef } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Customer name required" },
        { status: 400 }
      );
    }

    /**
     * 1️⃣ Check if POS customer already exists (mobile/email/company)
     */
    const existing = await POSCustomer.findOne({
      companyId: user.companyId,
      $or: [
        mobile ? { mobile } : null,
        email ? { email } : null,
      ].filter(Boolean),
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        reused: true,
      });
    }

    /**
     * 2️⃣ If ERP customer reference provided, validate it
     */
    let erpCustomer = null;
    if (customerRef) {
      erpCustomer = await Customer.findOne({
        _id: customerRef,
        companyId: user.companyId,
      });

      if (!erpCustomer) {
        return NextResponse.json(
          { success: false, message: "Invalid ERP customer reference" },
          { status: 400 }
        );
      }
    }

    /**
     * 3️⃣ Create POS Customer
     */
    const posCustomer = await POSCustomer.create({
      companyId: user.companyId,
      customerRef: erpCustomer?._id || null,
      name,
      mobile,
      email,
      gstin,
      isWalkIn: !erpCustomer,
      lastPurchaseAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: posCustomer,
      created: true,
    });
  } catch (err) {
    console.error("POS CUSTOMER POST ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to create POS customer" },
      { status: 500 }
    );
  }
}
