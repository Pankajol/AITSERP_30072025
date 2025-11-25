import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");
    const redirect = searchParams.get("url");

    if (!id || !redirect)
      return new Response("Invalid request", { status: 400 });

    await EmailLog.findByIdAndUpdate(id, {
      linkClicked: true,
    });

    return Response.redirect(redirect);

  } catch (err) {
    return new Response("Error", { status: 500 });
  }
}
