import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";


// GET /api/grn/[id]: Get a single GRN by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const SalesInvoices = await SalesInvoice.findById(id);
    if (!SalesInvoices) {
      return new Response(JSON.stringify({ message: "SalesInvoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: SalesInvoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching SalesInvoice:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching SalesInvoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const data = await req.json();
    const updatedSalesInvoice = await SalesInvoice.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!updatedSalesInvoice) {
      return new Response(JSON.stringify({ message: "SalesInvoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "GRN updated successfully", data: updatedSalesInvoice }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating updatedSalesInvoice:", error);
    return new Response(
      JSON.stringify({ message: "Error updating updatedSalesInvoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedGRN = await SalesInvoice.findByIdAndDelete(id);
    if (!deletedGRN) {
      return new Response(JSON.stringify({ message: "updatedSalesInvoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "updatedSalesInvoice deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting updatedSalesInvoice:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting updatedSalesInvoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
