import { getTokenFromHeader, verifyJWT } from "@/lib/auth";


  


export async function GET(req, res) {
  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

    const priceLists = [
      { _id: 'pl1', name: 'Retail Price' },
      { _id: 'pl2', name: 'Wholesale Price' },
      { _id: 'pl3', name: 'Special Price' },
    ];
  
    return new Response(JSON.stringify(priceLists), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  