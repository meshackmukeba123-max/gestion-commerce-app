"use client";

import { useEffect, useRef } from "react";

export function BarcodeLabel({ productName, code, price }: { productName: string; code: string; price: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      try {
        JsBarcode(canvasRef.current, code, { format: "CODE128", height: 50, fontSize: 14, margin: 6 });
      } catch {
        // code invalide pour CODE128 (ex: trop court) : on ignore le rendu
      }
    });
  }, [code]);

  function print() {
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow || !canvasRef.current) return;
    printWindow.document.write(`
      <html><head><title>Étiquette — ${productName}</title></head>
      <body style="text-align:center;font-family:sans-serif;margin:20px">
        <div style="font-weight:600;margin-bottom:4px">${productName}</div>
        <img src="${canvasRef.current.toDataURL()}" />
        <div style="margin-top:4px;font-size:16px;font-weight:700">${price}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  }

  if (!code) return <p className="text-sm text-neutral-500">Aucun code-barres renseigné pour ce produit.</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} />
      <button type="button" onClick={print} className="btn-secondary">
        🖨️ Imprimer l&apos;étiquette
      </button>
    </div>
  );
}
