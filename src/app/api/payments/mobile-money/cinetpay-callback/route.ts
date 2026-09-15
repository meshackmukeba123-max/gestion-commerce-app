import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkMobileMoneyStatus } from "@/lib/payments/mobileMoney";

export const runtime = "nodejs";

/**
 * Webhook public appelé par CinetPay (notify_url) pour signaler un changement de statut.
 * Pas d'authentification par session ici (voir middleware.ts pour l'exception).
 *
 * Par sécurité (recommandation officielle CinetPay), on ne fait jamais confiance au contenu
 * brut du webhook : on ré-interroge l'API "check" de CinetPay avec le transaction_id reçu
 * avant de mettre à jour le statut en base.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const body: Record<string, string> = contentType.includes("application/json")
      ? await req.json()
      : (Object.fromEntries((await req.formData()).entries()) as Record<string, string>);

    const transactionId = body.cpm_trans_id || body.transaction_id;
    if (!transactionId) {
      return NextResponse.json({ ok: false, error: "transaction_id manquant" }, { status: 400 });
    }

    const tx = await db.mobileMoneyTransaction.findFirst({ where: { externalRef: transactionId } });
    if (tx) {
      const liveStatus = await checkMobileMoneyStatus("CINETPAY", transactionId);
      if (liveStatus && liveStatus !== "EN_ATTENTE") {
        await db.mobileMoneyTransaction.update({ where: { id: tx.id }, data: { status: liveStatus } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
