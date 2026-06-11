import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import Item from "@/models/ItemModels";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { sendOrderConfirmation } from "@/lib/whatsapp";

async function getMobileUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.type !== "customer") return null;
  return decoded;
}

export async function GET(req) {
  try {
    await dbConnect();
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const orders = await SalesOrder.find({
      companyId: user.companyId,
      customer:  user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const statusMap = { open: "confirmed", confirmed: "confirmed", shipped: "shipped", delivered: "delivered", cancelled: "cancelled", packed: "packed" };

    const mapped = orders.map((o) => {
      const subtotal      = o.totalBeforeDiscount || o.grandTotal || 0;
      const gstAmount     = o.totalTax            || 0;
      const deliveryCharge = o.deliveryCharge     || 0;
      const totalAmount   = o.grandTotal          || subtotal;
      const safeStatus    = statusMap[(o.status || "open").toLowerCase()] || "confirmed";
      const paymentStatus = o.paymentStatus || (o.paid === true || o.openBalance === 0 ? "paid" : "pending");
      const sa            = o.shippingAddress || {};

      return {
        _id:         o._id,
        orderNumber: o.documentNumberOrder || o.salesNumber || `ORD-${String(o._id).slice(-6).toUpperCase()}`,
        status:      safeStatus,
        paymentStatus,
        paymentMethod: o.paymentMethod || "cod",
        items: (o.items || []).map((item) => ({
          productId: item.item,
          name:      item.itemName  || "Product",
          image:     item.imageUrl  || "",
          quantity:  item.quantity  || item.orderedQuantity || 1,
          price:     item.unitPrice || 0,
          unit:      item.unit      || "piece",
        })),
        deliveryAddress: {
          fullName:     sa.fullName     || o.customerName || "Customer",
          addressLine1: sa.address1     || sa.addressLine1 || sa.address     || "",
          addressLine2: sa.address2     || sa.addressLine2 || "",
          city:         sa.city         || "",
          state:        sa.state        || "",
          pincode:      sa.zip          || sa.pincode      || "",
          phone:        sa.phone        || "",
        },
        subtotal,
        gstAmount,
        deliveryCharge,
        totalAmount,
        placedAt:  o.createdAt,
        updatedAt: o.updatedAt,
      };
    });

    return NextResponse.json({ orders: mapped });
  } catch (err) {
    console.error("[mobile/orders GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { items, paymentMethod, shippingAddress } = await req.json();
    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items in order" }, { status: 400 });
    }

    // 1. Fetch Customer details
    const customer = await Customer.findById(user.id);
    if (!customer) {
      return NextResponse.json({ message: "Customer profile not found" }, { status: 404 });
    }

    // 2. Fetch product details from DB
    const productIds = items.map(i => i.productId);
    const dbItems = await Item.find({ _id: { $in: productIds } }).lean();
    const dbItemsMap = dbItems.reduce((acc, item) => {
      acc[item._id.toString()] = item;
      return acc;
    }, {});

    // 3. Build order items
    const orderItems = items.map((i) => {
      const dbItem = dbItemsMap[i.productId?.toString()];
      return {
        item:               i.productId,
        itemCode:           dbItem?.itemCode || `ITEM-${String(i.productId).substring(0, 6)}`,
        itemName:           i.name || dbItem?.itemName || "Product",
        itemDescription:    dbItem?.description || "",
        imageUrl:           i.image || dbItem?.imageUrl || "",
        quantity:           i.qty,
        orderedQuantity:    i.qty,
        unitPrice:          i.price || dbItem?.salesPrice || 0,
        totalAmount:        (i.price || dbItem?.salesPrice || 0) * i.qty,
        priceAfterDiscount: i.price || dbItem?.salesPrice || 0,
      };
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + i.totalAmount, 0);

    // 4. Create order in database
    const documentNumberOrder = `SO-MOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await SalesOrder.create({
      companyId:           user.companyId,
      customer:            user.id,
      customerCode:        customer.customerCode || `MOB-${customer.mobilePhone}`,
      customerName:        customer.customerName,
      documentNumberOrder,
      items:               orderItems,
      grandTotal:          totalAmount,
      totalBeforeDiscount: totalAmount,
      openBalance:         totalAmount,
      paymentMethod:       paymentMethod || "cod",
      shippingAddress: shippingAddress ? {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address1: shippingAddress.addressLine1 || shippingAddress.address1 || '',
        address2: shippingAddress.addressLine2 || shippingAddress.address2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        zip: shippingAddress.pincode || shippingAddress.zip || '',
        country: shippingAddress.country || 'India'
      } : {},
      status:              "Open",
      source:              "mobile",
      orderDate:           new Date(),
      postingDate:         new Date(),
      documentDate:        new Date(),
    });

    // 5. Send WhatsApp order confirmation to customer (non-blocking)
    if (customer.mobilePhone) {
      sendOrderConfirmation(customer.mobilePhone, {
        orderNumber:  documentNumberOrder,
        customerName: customer.customerName,
        totalAmount,
        itemCount:    orderItems.length,
      }).catch(e => console.error("[WhatsApp] Order confirmation failed:", e.message));
    }

    return NextResponse.json({
      order: {
        _id:         order._id,
        orderNumber: order.documentNumberOrder,
        status:      order.status,
        totalAmount: order.grandTotal,
        placedAt:    order.createdAt,
      },
      message: "Order placed successfully",
    });
  } catch (err) {
    console.error("[mobile/orders POST]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
