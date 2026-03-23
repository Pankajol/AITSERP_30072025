import dbConnect from "@/lib/db";
import DebitNote from "@/models/DebitNoteModel";

// GET /api/debit-note/[id]: Get a single Debit Note by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    // Await the params promise
    const { id } = await params;
    const note = await DebitNote.findById(id);
    if (!note) {
      return new Response(JSON.stringify({ message: "Debit Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(note), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Debit Note:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching Debit Note", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PUT /api/debit-note/[id]: Update a Debit Note by ID
// Update the PUT function to handle FormData
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const contentType = req.headers.get("content-type") || "";
    let data;

    // Check if the request is FormData (for files) or JSON
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      // Extract the 'debitNoteData' stringified JSON from FormData
      const rawData = formData.get("debitNoteData");
      if (!rawData) {
        return new Response(JSON.stringify({ message: "No data found in FormData" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      data = JSON.parse(rawData);
    } else {
      // Standard JSON fallback
      data = await req.json();
    }

    // Clean up IDs for items to prevent Mongoose errors
    if (data.items && Array.isArray(data.items)) {
      data.items = data.items.map(it => ({
        ...it,
        item: typeof it.item === 'object' ? it.item._id : it.item
      }));
    }

    const updatedNote = await DebitNote.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedNote) {
      return new Response(JSON.stringify({ message: "Debit Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Debit Note updated successfully", success: true, data: updatedNote }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating Debit Note:", error);
    return new Response(
      JSON.stringify({ message: "Error updating Debit Note", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// DELETE /api/debit-note/[id]: Delete a Debit Note by ID
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    // Await the params promise
    const { id } = await params;
    const deletedNote = await DebitNote.findByIdAndDelete(id);
    if (!deletedNote) {
      return new Response(JSON.stringify({ message: "Debit Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "Debit Note deleted successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting Debit Note:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting Debit Note", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
