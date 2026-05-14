import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Transaction from "@/models/accounts/Transaction";
import LedgerEntry from "@/models/accounts/LedgerEntry";

// ─── GET /api/sales-invoice/[id] ─────────────────────────────
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const invoice = await SalesInvoice.findById(id);
    if (!invoice)
      return new Response(JSON.stringify({ message: "SalesInvoice not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, data: invoice }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error fetching SalesInvoice:", error);
    return new Response(JSON.stringify({ message: "Error fetching SalesInvoice", error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ─── PUT /api/sales-invoice/[id] ─────────────────────────────
// No accounting change needed — PUT sirf invoice fields update karta hai
// Amount change nahi hota (agar amount change karna ho toh alag logic chahiye)
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const data = await req.json();

    const updatedSalesInvoice = await SalesInvoice.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedSalesInvoice)
      return new Response(JSON.stringify({ message: "SalesInvoice not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    return new Response(
      JSON.stringify({ message: "Invoice updated successfully", data: updatedSalesInvoice }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating SalesInvoice:", error);
    return new Response(JSON.stringify({ message: "Error updating SalesInvoice", error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ─── DELETE /api/sales-invoice/[id] ──────────────────────────
// ✅ Accounting entry bhi cancel karni hai jab invoice delete ho
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user  = token ? verifyJWT(token) : null;

    const { id } = await params;

    const invoice = await SalesInvoice.findById(id);
    if (!invoice)
      return new Response(JSON.stringify({ message: "SalesInvoice not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    // ✅ Step 1: Accounting entry cancel karo
    // referenceId se linked transaction dhundo aur status "Cancelled" karo
    try {
      const linkedTxn = await Transaction.findOne({
        referenceId:   invoice._id,
        referenceType: "SalesInvoice",
        status:        "Posted",
      });

      if (linkedTxn) {
        // Transaction cancel karo
        await Transaction.findByIdAndUpdate(linkedTxn._id, {
          $set: { status: "Cancelled" }
        });

        // Ledger entries bhi remove karo (ya reverse entry banao)
        await LedgerEntry.deleteMany({ transactionId: linkedTxn._id });

        console.log(`✅ Accounting entry cancelled for invoice ${invoice.invoiceNumber}`);
      }
    } catch (accountingErr) {
      // Accounting cancel fail ho toh bhi invoice delete hoga
      // Sirf log karo
      console.error(`⚠️ Could not cancel accounting entry for ${invoice.invoiceNumber}:`, accountingErr.message);
    }

    // ✅ Step 2: Invoice delete karo
    await SalesInvoice.findByIdAndDelete(id);

    return new Response(
      JSON.stringify({ message: "Invoice deleted successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting SalesInvoice:", error);
    return new Response(JSON.stringify({ message: "Error deleting SalesInvoice", error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}



// import dbConnect from "@/lib/db";
// import SalesInvoice from "@/models/SalesInvoice";


// // GET /api/grn/[id]: Get a single GRN by ID
// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;  // Ensure params are awaited here.
//     const SalesInvoices = await SalesInvoice.findById(id);
//     if (!SalesInvoices) {
//       return new Response(JSON.stringify({ message: "SalesInvoice not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(JSON.stringify({ success: true, data: SalesInvoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching SalesInvoice:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching SalesInvoice", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// export async function PUT(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;  // Ensure params are awaited here.
//     const data = await req.json();
//     const updatedSalesInvoice = await SalesInvoice.findByIdAndUpdate(id, data, {
//       new: true,
//       runValidators: true,
//     });
//     if (!updatedSalesInvoice) {
//       return new Response(JSON.stringify({ message: "SalesInvoice not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(
//       JSON.stringify({ message: "GRN updated successfully", data: updatedSalesInvoice }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error updating updatedSalesInvoice:", error);
//     return new Response(
//       JSON.stringify({ message: "Error updating updatedSalesInvoice", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;  // Ensure params are awaited here.
//     const deletedGRN = await SalesInvoice.findByIdAndDelete(id);
//     if (!deletedGRN) {
//       return new Response(JSON.stringify({ message: "updatedSalesInvoice not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(
//       JSON.stringify({ message: "updatedSalesInvoice deleted successfully" }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error deleting updatedSalesInvoice:", error);
//     return new Response(
//       JSON.stringify({ message: "Error deleting updatedSalesInvoice", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
