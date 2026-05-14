import dbConnect from '@/lib/db';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return new Response(JSON.stringify({ message: 'Order ID is required' }), { status: 400 });
  }

  try {
    await dbConnect();
    const purchaseOrder = await PurchaseOrder.findById(orderId);

    if (!purchaseOrder) {
      return new Response(JSON.stringify({ message: 'Purchase Order not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ purchaseOrder }), { status: 200 });
  } catch (error) {
    console.error('Error copying from purchase order:', error);
    return new Response(
      JSON.stringify({ message: error.message || 'Error copying from order' }),
      { status: 500 }
    );
  }
}
