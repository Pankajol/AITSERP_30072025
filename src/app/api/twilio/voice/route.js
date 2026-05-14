export const runtime = "nodejs";

export async function POST(req) {
  const form = await req.formData();
  const to = form.get("To");

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${process.env.TWILIO_CALLER_ID}">
    <Number>${to}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
}
