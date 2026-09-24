"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { apiGet, apiPost, withStore, ApiClientError } from "@/lib/api-client";
import { BarcodeScannerButton } from "@/components/stock/BarcodeScannerButton";
import { queueOfflineSale } from "@/lib/offline/db";
import { syncPendingSales } from "@/lib/offline/sync";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm, type CustomerFormValues } from "@/components/clients/CustomerForm";

type Product = { id: string; name: string; barcode: string | null; sku: string | null; sellPrice: number; quantity: number; unit: string };
type CartItem = { productId: string; name: string; unitPrice: number; quantity: number; maxQuantity: number };
type PaymentMethod = "MAGASIN" | "MOBILE_MONEY" | "CARTE" | "VIREMENT";
type Customer = { id: string; name: string; phone: string | null; creditLimit: number | null; balance: number };
type PrintMode = "invoice" | "ticket80" | "ticket58" | "none";
const PRINT_MODE_KEY = "gc-print-mode";

/** Ce qui s'ouvre à l'impression après un encaissement ; préférence mémorisée sur cet appareil. */
function readPrintMode(): PrintMode {
  try {
    const v = localStorage.getItem(PRINT_MODE_KEY);
    return v === "ticket80" || v === "ticket58" || v === "none" ? v : "invoice";
  } catch {
    return "invoice";
  }
}

function subscribePrintMode(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function printUrl(saleId: string, mode: PrintMode) {
  if (mode === "ticket80") return `/ventes/${saleId}/ticket?w=80&print=1`;
  if (mode === "ticket58") return `/ventes/${saleId}/ticket?w=58&print=1`;
  return `/ventes/${saleId}?print=1`;
}

export default function VentesPage() {
  const { activeStore } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MAGASIN");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [mmProvider, setMmProvider] = useState<"ORANGE_MONEY" | "AIRTEL_MONEY" | "MPESA" | "CINETPAY" | "MOCK">("MOCK");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [onCredit, setOnCredit] = useState(false);
  const [amountPaid, setAmountPaid] = useState("0");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null);
  // Préférence lue dans le stockage local (absent côté serveur : « facture » par défaut).
  const savedPrintMode = useSyncExternalStore(subscribePrintMode, readPrintMode, () => "invoice" as PrintMode);
  const [printModeOverride, setPrintModeOverride] = useState<PrintMode | null>(null);
  const printMode = printModeOverride ?? savedPrintMode;

  function changePrintMode(mode: PrintMode) {
    setPrintModeOverride(mode);
    try {
      localStorage.setItem(PRINT_MODE_KEY, mode);
    } catch {
      // stockage indisponible (navigation privée) : le choix vaut pour cette page seulement
    }
  }

  const loadCustomers = useCallback(() => {
    apiGet<Customer[]>(withStore("/api/customers", activeStore.storeId))
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [activeStore.storeId]);

  const load = useCallback(() => {
    loadCustomers();
    apiGet<Product[]>(withStore("/api/products", activeStore.storeId)).then(setProducts);
    apiGet<{ taxRate: number }>(`/api/stores/${activeStore.storeId}`).then((s) => setTaxRate(s.taxRate));
  }, [activeStore.storeId, loadCustomers]);

  useEffect(load, [load]);

  const customer = customers.find((c) => c.id === customerId) ?? null;

  async function createCustomer(values: CustomerFormValues) {
    setNewCustomerError(null);
    try {
      const created = await apiPost<Customer>("/api/customers", { ...values, storeId: activeStore.storeId });
      setCustomers((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(created.id);
      setNewCustomerOpen(false);
    } catch (e) {
      setNewCustomerError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function resetClient() {
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setCustomerId("");
    setOnCredit(false);
    setAmountPaid("0");
  }

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
  const paidNow = onCredit ? Math.min(Math.max(Number(amountPaid) || 0, 0), total) : total;
  const balanceDue = Math.round((total - paidNow) * 100) / 100;

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
    setLastSaleId(null);
    setProcessing(true);

    if (onCredit && !customer) {
      setMessage({ type: "error", text: "Sélectionnez un client pour une vente à crédit" });
      setProcessing(false);
      return;
    }

    const saleBody = {
      storeId: activeStore.storeId,
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      paymentMethod,
      items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
      customerId: customer?.id,
      amountPaid: onCredit ? paidNow : undefined,
    };

    try {
      // Vente à crédit : seul l'acompte éventuel est encaissé par mobile money.
      if (paymentMethod === "MOBILE_MONEY" && paidNow > 0) {
        if (!clientPhone) {
          setMessage({ type: "error", text: "Numéro de téléphone requis pour le paiement mobile money" });
          setProcessing(false);
          return;
        }
        if (mmProvider === "CINETPAY" && (!clientName.trim() || !clientEmail.trim())) {
          setMessage({ type: "error", text: "Nom du client et email requis pour un paiement CinetPay" });
          setProcessing(false);
          return;
        }
        const [clientFirstName, ...rest] = clientName.trim().split(/\s+/);
        const clientLastName = rest.join(" ") || clientFirstName || "Client";

        const charge = await apiPost<{ transaction: { id: string; status: string; paymentUrl?: string | null }; message: string }>(
          "/api/payments/mobile-money",
          {
            storeId: activeStore.storeId,
            provider: mmProvider,
            phone: clientPhone,
            amount: paidNow,
            clientFirstName,
            clientLastName,
            clientEmail: clientEmail || undefined,
          }
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

      const created = await apiPost<{ id: string }>("/api/sales", saleBody);
      setMessage({
        type: "success",
        text:
          balanceDue > 0
            ? `Vente à crédit enregistrée : ${balanceDue.toLocaleString("fr-FR")} restent dus par ${customer?.name}.`
            : "Vente enregistrée avec succès.",
      });
      setLastSaleId(created.id);
      if (printMode !== "none") window.open(printUrl(created.id, printMode), "_blank");
      setCart([]);
      resetClient();
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
          customerId: saleBody.customerId,
          amountPaid: saleBody.amountPaid,
          synced: false,
        });
        setMessage({ type: "info", text: "Hors-ligne : vente enregistrée sur l'appareil, elle sera synchronisée automatiquement dès le retour du réseau." });
        setCart([]);
        resetClient();
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
          <div className="flex gap-2">
            <select
              className="input"
              aria-label="Client enregistré"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                if (!e.target.value) setOnCredit(false);
              }}
            >
              <option value="">Client de passage</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.balance > 0 ? ` (doit ${c.balance.toLocaleString("fr-FR")})` : ""}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setNewCustomerOpen(true)} className="btn-secondary shrink-0 px-3" title="Nouveau client">
              +
            </button>
          </div>
          {!customer && (
            <input className="input" placeholder="Nom du client (optionnel)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          )}
          {customer && (
            <div className="space-y-2 rounded-lg bg-black/[0.03] p-2 text-sm dark:bg-white/[0.05]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} />
                Vente à crédit (paiement partiel ou différé)
              </label>
              {onCredit && (
                <>
                  <div className="flex items-center gap-2">
                    <label htmlFor="amount-paid" className="shrink-0 text-neutral-500">
                      Payé maintenant
                    </label>
                    <input
                      id="amount-paid"
                      type="number"
                      min={0}
                      max={total}
                      step="any"
                      className="input px-2 py-1"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                    />
                  </div>
                  <p className="flex justify-between font-medium text-amber-700 dark:text-amber-400">
                    <span>Reste dû sur cette vente</span>
                    <span>{balanceDue.toLocaleString("fr-FR")}</span>
                  </p>
                </>
              )}
              <p className="text-xs text-neutral-500">
                Dette actuelle : {customer.balance.toLocaleString("fr-FR")}
                {customer.creditLimit !== null && ` · plafond ${customer.creditLimit.toLocaleString("fr-FR")}`}
              </p>
            </div>
          )}
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
              {mmProvider === "CINETPAY" && (
                <input
                  className="input"
                  type="email"
                  placeholder="Email du client (requis par CinetPay)"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              )}
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

        {lastSaleId && (
          <Link href={`/ventes/${lastSaleId}`} className="btn-secondary block w-full text-center">
            📄 Voir / télécharger la facture
          </Link>
        )}

        <label className="flex items-center justify-between gap-2 text-xs text-neutral-500">
          <span>Imprimer après encaissement</span>
          <select className="input w-auto px-2 py-1 text-xs" value={printMode} onChange={(e) => changePrintMode(e.target.value as PrintMode)}>
            <option value="invoice">Facture A4</option>
            <option value="ticket80">Ticket 80 mm</option>
            <option value="ticket58">Ticket 58 mm</option>
            <option value="none">Rien</option>
          </select>
        </label>

        <button onClick={checkout} disabled={cart.length === 0 || processing} className="btn-primary w-full">
          {processing ? "Traitement…" : onCredit ? "Enregistrer la vente à crédit" : "Encaisser"}
        </button>

        <Modal open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} title="Nouveau client">
          <CustomerForm onSubmit={createCustomer} error={newCustomerError} submitLabel="Créer et sélectionner" />
        </Modal>
      </div>
    </div>
  );
}
