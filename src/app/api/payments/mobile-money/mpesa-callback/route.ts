import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Webhook public appelé par Safaricom pour confirmer (ou annuler) un paiement STK Push.
 * Pas d'authentification par session ici : Safaricom appelle ce endpoint directement
 * (voir middleware.ts pour l'exception à la protection par cookie).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback?.CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Payload invalide" });
    }

    const success = callback.ResultCode === 0;
    let externalReceipt: string | undefined;

    if (success && Array.isArray(callback.CallbackMetadata?.Item)) {
      const item = callback.CallbackMetadata.Item.find(
        (i: { Name: string; Value?: string | number }) => i.Name === "MpesaReceiptNumber"
      );
      externalReceipt = item?.Value ? String(item.Value) : undefined;
    }

    const tx = await db.mobileMoneyTransaction.findFirst({
      where: { externalRef: callback.CheckoutRequestID },
    });

    if (tx) {
      await db.mobileMoneyTransaction.update({
        where: { id: tx.id },
        data: {
          status: success ? "REUSSI" : "ECHEC",
          externalRef: externalReceipt ?? tx.externalRef,
        },
      });
    }

    // Safaricom attend cette forme de réponse pour considérer le webhook comme reçu.
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error("M-Pesa callback error:", err);
    Sentry.captureException(err, { tags: { provider: "mpesa", flow: "webhook-callback" } });
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Erreur serveur" });
  }
}
