// src/app/api/mobile/orders/[id]/route.js
// GET a single order by ID for the mobile order-detail screen
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/** Map an ERP SalesOrder into the shape the mobile app expects */
function mapOrder(order) {
  const subtotal    = order.totalBeforeDiscount || order.grandTotal || 0;
  const gstAmount   = order.totalTax            || Math.round(subtotal * 0.18 * 100) / 100;
  const deliveryCharge = order.deliveryCharge   || 0;
  const totalAmount = order.grandTotal          || subtotal;

  // Determine payment status from ERP fields
  let paymentStatus = "pending";
  if (order.paymentStatus)                         paymentStatus = order.paymentStatus;
  else if (order.paid === true || order.openBalance === 0) paymentStatus = "paid";

  // Normalise order status to mobile-expected values
  const statusMap = {
    "open":      "confirmed",
    "Open":      "confirmed",
    "confirmed": "confirmed",
    "shipped":   "shipped",
    "delivered": "delivered",
    "cancelled": "cancelled",
    "packed":    "packed",
  };
  const status = statusMap[order.status] || "confirmed";

  const sa = order.shippingAddress || {};

  return {
    _id:         order._id,
    orderNumber: order.documentNumberOrder || order.salesNumber || `ORD-${String(order._id).slice(-6).toUpperCase()}`,
    status,
    paymentStatus,
    paymentMethod: order.paymentMethod || "cod",
    items: (order.items || []).map((item) => ({
      productId: item.item,
      name:      item.itemName  || "Product",
      image:     item.imageUrl  || "",
      quantity:  item.quantity  || item.orderedQuantity || 1,
      price:     item.unitPrice || 0,
      unit:      item.unit      || "piece",
    })),
    deliveryAddress: {
      fullName:     sa.fullName     || order.customerName || "Customer",
      addressLine1: sa.addressLine1 || sa.address         || "",
      addressLine2: sa.addressLine2 || "",
      city:         sa.city         || "",
      state:        sa.state        || "",
      pincode:      sa.pincode      || sa.zip || "",
      phone:        sa.phone        || "",
    },
    subtotal,
    gstAmount,
    deliveryCharge,
    totalAmount,
    trackingNumber:   order.trackingNumber   || null,
    courierName:      order.courierName      || null,
    estimatedDelivery: order.estimatedDelivery || null,
    placedAt:  order.createdAt || order.orderDate,
    updatedAt: order.updatedAt,
  };
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || decoded.type !== "customer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const order = await SalesOrder.findOne({
      _id:       orderId,
      companyId: decoded.companyId,
      customer:  decoded.id,
    }).lean();

    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

    return NextResponse.json({ order: mapOrder(order) });
  } catch (err) {
    console.error("[mobile/orders/:id GET]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
