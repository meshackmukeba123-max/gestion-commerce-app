import { ProductForm } from "@/components/stock/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Nouveau produit</h1>
      <div className="card">
        <ProductForm />
      </div>
    </div>
  );
}
