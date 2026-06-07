import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Opportunity from "@/models/crm/Opportunity";
import SalesQuotation from "@/models/SalesQuotationModel";
import Item from "@/models/ItemModels";
import Counter from "@/models/Counter";
import { NextResponse } from "next/server";




async function getNextQuotationNumber(companyId) {
  const key = "SalesQuotation";
  let counter = await Counter.findOne({ id: key, companyId });
  if (!counter) {
    counter = await Counter.create({ id: key, companyId, seq: 1 });
  } else {
    counter.seq += 1;
    await counter.save();
  }
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let fyStart = currentYear, fyEnd = currentYear + 1;
  if (currentMonth < 4) {
    fyStart = currentYear - 1;
    fyEnd = currentYear;
  }
  const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
  return `SALES-QUA/${financialYear}/${String(counter.seq).padStart(5, "0")}`;
}

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  const decoded = verifyJWT(token);
  const { opportunityId, items, validUntil } = await req.json();

  // 1. Find opportunity
  const opp = await Opportunity.findOne({ _id: opportunityId, companyId: decoded.companyId });
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  // 2. Validate items
  const itemIds = items.map(i => i.itemId);
  const existingItems = await Item.find({ _id: { $in: itemIds }, companyId: decoded.companyId });
  if (existingItems.length !== itemIds.length) {
    return NextResponse.json({ error: "Some items not found" }, { status: 400 });
  }

  // 3. Calculate totals
  let totalBeforeDiscount = 0, grandTotal = 0;
  let gstAmount = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  const quotationItems = items.map((item) => {
    const foundItem = existingItems.find(i => i._id.toString() === item.itemId);
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice || foundItem.sellingPrice || 0;
    const discountPercent = item.discount || 0;
    const discountAmount = (unitPrice * quantity * discountPercent) / 100;
    const priceAfterDiscount = (unitPrice * quantity) - discountAmount;
    const gstRate = item.gstRate || foundItem.gstRate || 18;
    let gstAmt = 0, cgst = 0, sgst = 0, igst = 0;
    if (item.taxOption === "IGST") {
      igst = (priceAfterDiscount * gstRate) / 100;
      gstAmt = igst;
    } else {
      cgst = (priceAfterDiscount * gstRate) / 200;
      sgst = cgst;
      gstAmt = cgst + sgst;
    }
    const totalAmount = priceAfterDiscount + gstAmt;

    totalBeforeDiscount += unitPrice * quantity;
    gstAmount += gstAmt;
    cgstAmount += cgst;
    sgstAmount += sgst;
    igstAmount += igst;
    grandTotal += totalAmount;

    return {
      item: foundItem._id,
      itemCode: foundItem.itemCode,
      itemName: foundItem.itemName,
      itemDescription: foundItem.description,
      quantity,
      unitPrice,
      discount: discountPercent,
      gstRate,
      taxOption: item.taxOption || "GST",
      priceAfterDiscount,
      totalAmount,
      gstAmount: gstAmt,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
    };
  });

  // 4. Create quotation (without customer)
  const quotation = new SalesQuotation({
    companyId: decoded.companyId,
    createdBy: decoded.id,
    customer: null,
    customerCode: "",
    customerName: opp.opportunityName,
    documentNumberQuatation: await getNextQuotationNumber(decoded.companyId),
    postingDate: new Date(),
    validUntil: validUntil || new Date(Date.now() + 30 * 86400000),
    documentDate: new Date(),
    items: quotationItems,
    totalBeforeDiscount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal,
    status: "Draft",
    remarks: `Quotation for opportunity: ${opp.opportunityName}`,
  });
  await quotation.save();

  // 5. Update opportunity: push quotation ID into quotations array
  if (!opp.quotations) opp.quotations = [];
  opp.quotations.push(quotation._id);
  opp.stage = "Proposal";
  opp.probability = 60;
  await opp.save();

  return NextResponse.json({ success: true, quotation, opportunity: opp });
}