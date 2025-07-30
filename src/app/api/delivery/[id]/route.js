import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";

// GET /api/grn/[id]: Get a single GRN by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const SalesDeliverys = await Delivery.findById(id);
    if (!SalesDeliverys) {
      return new Response(JSON.stringify({ message: "SalesDeliverys not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: SalesDeliverys }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching SalesDeliverys:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching SalesDeliverys", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const data = await req.json();
    const updatedSalesDelivery = await Delivery.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!updatedSalesDelivery) {
      return new Response(JSON.stringify({ message: "SalesDelivery not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "updatedSalesDelivery updated successfully", data: updatedSalesDelivery }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating updatedSalesDelivery:", error);
    return new Response(
      JSON.stringify({ message: "Error updating updatedSalesDelivery", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedSalesDelivery = await Delivery.findByIdAndDelete(id);
    if (!deletedSalesDelivery) {
      return new Response(JSON.stringify({ message: "updateddeletedSalesDelivery not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "updateddeletedSalesDelivery deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting updateddeletedSalesDelivery:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting updateddeletedSalesDelivery", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}