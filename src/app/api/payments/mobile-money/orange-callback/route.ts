import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Webhook public appelé par Orange (notif_url) pour confirmer un paiement Web Payment.
 * Pas d'authentification par session ici (voir middleware.ts pour l'exception).
 *
 * ⚠️ Le format exact du payload (JSON vs formulaire, noms des champs) peut varier selon le
 * pays Orange — ajustez si besoin une fois vos identifiants sandbox obtenus et le premier
 * webhook de test reçu.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const body: Record<string, string> = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries((await req.formData()).entries()) as Record<string, string>;

    const orderId = body.order_id || body.orderId || body.reference;
    const status = (body.status || body.txnstatus || "").toString().toUpperCase();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "order_id manquant" }, { status: 400 });
    }

    const tx = await db.mobileMoneyTransaction.findFirst({ where: { externalRef: orderId } });
    if (tx) {
      const success = status === "SUCCESS" || status === "SUCCESSFUL" || status === "200";
      const failed = status === "FAILED" || status === "FAILURE" || status === "CANCELLED";
      if (success || failed) {
        await db.mobileMoneyTransaction.update({
          where: { id: tx.id },
          data: { status: success ? "REUSSI" : "ECHEC" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Orange Money callback error:", err);
    Sentry.captureException(err, { tags: { provider: "orange", flow: "webhook-callback" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
