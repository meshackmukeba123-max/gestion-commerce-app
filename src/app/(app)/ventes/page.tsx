"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore, ApiClientError } from "@/lib/api-client";
import { BarcodeScannerButton } from "@/components/stock/BarcodeScannerButton";
import { queueOfflineSale } from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";

type Product = { id: string; name: string; barcode: string | null; sku: string | null; sellPrice: number; quantity: number; unit: string };
type CartItem = { productId: string; name: string; unitPrice: number; quantity: number; maxQuantity: number };
type PaymentMethod = "MAGASIN" | "MOBILE_MONEY" | "CARTE" | "VIREMENT";

export default function VentesPage() {
  const { activeStore } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MAGASIN");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [mmProvider, setMmProvider] = useState<"ORANGE_MONEY" | "AIRTEL_MONEY" | "MPESA" | "CINETPAY" | "MOCK">("MOCK");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(() => {
    apiGet<Product[]>(withStore("/api/products", activeStore.storeId)).then(setProducts);
    apiGet<{ taxRate: number }>(`/api/stores/${activeStore.storeId}`).then((s) => setTaxRate(s.taxRate));
  }, [activeStore.storeId]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!query) return products.slice(0, 12);
    const q = query.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(query) || p.sku?.toLowerCase().includes(q)).slice(0, 12);
  }, [products, query]);

  function addToCart(p: Product) {
    setCart((cart) => {
      const existing = cart.find((c) => c.productId === p.id);
      if (existing) {
        if (existing.quantity >= p.quantity) return cart;
        return cart.map((c) => (c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      if (p.quantity <= 0) return cart;
      return [...cart, { productId: p.id, name: p.name, unitPrice: p.sellPrice, quantity: 1, maxQuantity: p.quantity }];
    });
    setQuery("");
  }

  function onBarcodeDetected(code: string) {
    const p = products.find((p) => p.barcode === code || p.sku === code);
    if (p) addToCart(p);
    else setMessage({ type: "error", text: `Aucun produit ne correspond au code "${code}"` });
  }

  function updateQty(productId: string, quantity: number) {
    setCart((cart) =>
      cart.map((c) => (c.productId === productId ? { ...c, quantity: Math.max(1, Math.min(quantity, c.maxQuantity)) } : c)).filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((cart) => cart.filter((c) => c.productId !== productId));
  }

  const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  /** Interroge le statut d'une transaction mobile money (paiement asynchrone type STK Push M-Pesa). */
  async function pollMobileMoneyStatus(transactionId: string): Promise<"REUSSI" | "ECHEC"> {
    const maxAttempts = 30; // ~60s
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await apiGet<{ status: "EN_ATTENTE" | "REUSSI" | "ECHEC" }>(
        `/api/payments/mobile-money/status/${transactionId}`
      );
      if (res.status !== "EN_ATTENTE") return res.status;
      setMessage({ type: "info", text: `En attente de confirmation sur le téléphone du client… (${attempt + 1}/${maxAttempts})` });
      await new Promise((r) => setTimeout(r, 2000));
    }
    return "ECHEC";
  }

  async function checkout() {
    if (cart.length === 0) return;
    setMessage(null);
    setPaymentUrl(null);
    setProcessing(true);

    const saleBody = {
      storeId: activeStore.storeId,
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      paymentMethod,
      items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
    };

    try {
      if (paymentMethod === "MOBILE_MONEY") {
        if (!clientPhone) {
          setMessage({ type: "error", text: "Numéro de téléphone requis pour le paiement mobile money" });
          setProcessing(false);
          return;
        }
        const charge = await apiPost<{ transaction: { id: string; status: string; paymentUrl?: string | null }; message: string }>(
          "/api/payments/mobile-money",
          { storeId: activeStore.storeId, provider: mmProvider, phone: clientPhone, amount: total }
        );

        if (charge.transaction.status === "ECHEC") {
          setMessage({ type: "error", text: charge.message });
          setProcessing(false);
          return;
        }

        if (charge.transaction.status === "EN_ATTENTE") {
          // Paiement asynchrone (STK Push M-Pesa/Airtel, ou lien Orange Money) : on attend la confirmation.
          setMessage({ type: "info", text: charge.message });
          if (charge.transaction.paymentUrl) setPaymentUrl(charge.transaction.paymentUrl);
          const finalStatus = await pollMobileMoneyStatus(charge.transaction.id);
          setPaymentUrl(null);
          if (finalStatus === "ECHEC") {
            setMessage({ type: "error", text: "Paiement mobile money refusé, annulé ou délai dépassé." });
            setProcessing(false);
            return;
          }
        }
      }

      await apiPost("/api/sales", saleBody);
      setMessage({ type: "success", text: "Vente enregistrée avec succès." });
      setCart([]);
      setClientName("");
      setClientPhone("");
      load();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setMessage({ type: "error", text: err.message });
      } else {
        // Pas de réseau : on enregistre la vente hors-ligne pour synchronisation ultérieure.
        await queueOfflineSale({
          offlineId: crypto.randomUUID(),
          storeId: activeStore.storeId,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          paymentMethod,
          items: saleBody.items,
          createdAt: new Date().toISOString(),
          synced: false,
        });
        setMessage({ type: "info", text: "Hors-ligne : vente enregistrée sur l'appareil, elle sera synchronisée automatiquement dès le retour du réseau." });
        setCart([]);
        setClientName("");
        setClientPhone("");
        syncPendingSales();
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-xl font-semibold">Vente (caisse)</h1>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Rechercher un produit ou scanner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <BarcodeScannerButton onDetected={onBarcodeDetected} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity <= 0}
              className="card items-start text-left hover:border-emerald-500 disabled:opacity-40"
            >
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-neutral-500">
                {p.sellPrice.toLocaleString("fr-FR")} · {p.quantity} {p.unit}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="card h-fit space-y-4">
        <h2 className="text-sm font-semibold">Panier</h2>

        {cart.length === 0 && <p className="text-sm text-neutral-500">Aucun article sélectionné.</p>}

        <div className="space-y-2">
          {cart.map((c) => (
            <div key={c.productId} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{c.name}</span>
              <input
                type="number"
                min={1}
                max={c.maxQuantity}
                className="input w-16 px-2 py-1"
                value={c.quantity}
                onChange={(e) => updateQty(c.productId, Number(e.target.value))}
              />
              <span className="w-16 text-right">{(c.unitPrice * c.quantity).toLocaleString("fr-FR")}</span>
              <button onClick={() => removeFromCart(c.productId)} className="text-red-600">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-black/10 pt-3 text-sm dark:border-white/10">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{subtotal.toLocaleString("fr-FR")}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Taxe ({taxRate}%)</span>
            <span>{taxAmount.toLocaleString("fr-FR")}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{total.toLocaleString("fr-FR")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <input className="input" placeholder="Nom du client (optionnel)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="MAGASIN">Espèces (au comptoir)</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CARTE">Carte bancaire</option>
            <option value="VIREMENT">Virement</option>
          </select>
          {paymentMethod === "MOBILE_MONEY" && (
            <>
              <select className="input" value={mmProvider} onChange={(e) => setMmProvider(e.target.value as typeof mmProvider)}>
                <option value="MOCK">Démo (test)</option>
                <option value="CINETPAY">CinetPay (Orange/Airtel/MTN Money…)</option>
                <option value="ORANGE_MONEY">Orange Money (direct)</option>
                <option value="AIRTEL_MONEY">Airtel Money (direct)</option>
                <option value="MPESA">M-Pesa</option>
              </select>
              <input className="input" placeholder="Numéro de téléphone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </>
          )}
        </div>

        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary block w-full text-center"
          >
            🔗 Ouvrir le lien de paiement mobile money
          </a>
        )}

        {message && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : message.type === "info"
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {message.text}
          </p>
        )}

        <button onClick={checkout} disabled={cart.length === 0 || processing} className="btn-primary w-full">
          {processing ? "Traitement…" : "Encaisser"}
        </button>
      </div>
    </div>
  );
}
