// src/app/api/mobile/addresses/route.js
// GET  → list all saved addresses for the logged-in customer
// POST → add a new address
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function getMobileUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  return decoded;
}

export async function GET(req) {
  try {
    await dbConnect();
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const customer = await Customer.findById(user.id).lean();
    if (!customer) return NextResponse.json({ message: "Customer not found" }, { status: 404 });

    // Return shippingAddresses array (already in Customer model)
    const addresses = (customer.shippingAddresses || []).map((addr, idx) => ({
      _id: `${customer._id}_addr_${idx}`,
      fullName: addr.fullName || customer.customerName,
      phone: addr.phone || customer.mobilePhone || '',
      addressLine1: addr.address1 || '',
      addressLine2: addr.address2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pin || '',
      country: addr.country || 'India',
      isDefault: idx === 0,
    }));

    return NextResponse.json({ addresses });
  } catch (err) {
    console.error("[mobile/addresses GET]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { fullName, phone, addressLine1, addressLine2, city, state, pincode, country } = body;

    if (!addressLine1 || !city || !state || !pincode) {
      return NextResponse.json({ message: "Address, city, state and pincode are required" }, { status: 400 });
    }

    // Add to shippingAddresses array on the Customer document
    const newAddress = {
      fullName: fullName || customer.customerName,
      phone: phone || customer.mobilePhone || '',
      address1: addressLine1,
      address2: addressLine2 || '',
      city,
      state,
      pin: pincode,
      country: country || 'India',
    };

    const customer = await Customer.findByIdAndUpdate(
      user.id,
      { $push: { shippingAddresses: newAddress } },
      { new: true }
    ).lean();

    if (!customer) return NextResponse.json({ message: "Customer not found" }, { status: 404 });

    const addedAddr = customer.shippingAddresses[customer.shippingAddresses.length - 1];
    const idx = customer.shippingAddresses.length - 1;

    return NextResponse.json({
      message: "Address saved successfully",
      address: {
        _id: `${customer._id}_addr_${idx}`,
        fullName: fullName || customer.customerName,
        phone: phone || customer.mobilePhone || '',
        addressLine1: addedAddr.address1,
        addressLine2: addedAddr.address2,
        city: addedAddr.city,
        state: addedAddr.state,
        pincode: addedAddr.pin,
        country: addedAddr.country,
        isDefault: idx === 0,
      },
    });
  } catch (err) {
    console.error("[mobile/addresses POST]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
