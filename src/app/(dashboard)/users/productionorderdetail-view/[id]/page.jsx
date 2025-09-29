

import ProductionOrderView from '@/components/ProductionOrderView';

export default async function Page({ params }) {
  const { id } = await params;
  return <ProductionOrderView id={id} />;
}