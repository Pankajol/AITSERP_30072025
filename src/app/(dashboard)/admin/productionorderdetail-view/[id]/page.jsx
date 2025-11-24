import ProductionOrderView from '@/components/ProductionOrderView';

export default function Page({ params }) {
  const { id } = params;
  return <ProductionOrderView id={id} />;
}
