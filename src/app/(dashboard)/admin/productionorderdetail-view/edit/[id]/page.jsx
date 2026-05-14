// File: app/(dashboard)/admin/productionorderdetail-view/[id]/page.jsx
import ProductionOrderDetail from '@/components/ProductionOrderDetail'

// Server component—can `await` the params promise
export default async function Page({ params }) {
  // unwrap the params promise
  const { id } = await params

  // pass the id into your client component
  return <ProductionOrderDetail id={id} />
}