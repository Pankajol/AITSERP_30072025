import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ElectionExpense from "@/models/election/ElectionExpense";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "election manager", "accounts manager"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const party = searchParams.get("party");
    const category = searchParams.get("category");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);

    if (id) {
      const expense = await ElectionExpense.findOne({ _id: id, companyId: user.companyId })
        .populate("party", "name candidateName")
        .populate("approvedBy", "name")
        .lean();
      if (!expense) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: expense });
    }

    const query = { companyId: user.companyId };
    if (party) query.party = party;
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const [expenses, total] = await Promise.all([
      ElectionExpense.find(query)
        .populate("party", "name")
        .populate("approvedBy", "name")
        .skip(skip)
        .limit(limit)
        .sort({ expenseDate: -1 })
        .lean(),
      ElectionExpense.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: expenses,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    const required = ["party", "amount", "category"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // (यहाँ आप अकाउंटिंग इंटीग्रेशन जोड़ सकते हैं, जैसे JournalEntry बनाना, आदि)
    const expense = new ElectionExpense({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
      approvedBy: user.id, // या कोई और
    });
    await expense.save();

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create expense" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await ElectionExpense.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await ElectionExpense.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}