// app/api/opportunity/route.js
import dbConnect from "@/lib/db";
import Opportunity from "@/models/Opportunity";

// Create Opportunity
export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    const opportunity = new Opportunity(data);
    const saved = await opportunity.save();

    return new Response(
      JSON.stringify({ success: true, data: saved }),
      { status: 201 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

// Get Opportunities with Pagination
export async function GET(req) {
  try {
    await dbConnect();

    // Extract search params from URL
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1; // default page = 1
    const limit = parseInt(searchParams.get("limit")) || 10; // default limit = 10
    const skip = (page - 1) * limit;

    // Fetch data with pagination
    const [opportunities, total] = await Promise.all([
      Opportunity.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Opportunity.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: opportunities,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
