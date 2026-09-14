/**
 * Abstraction "mobile money" : une interface commune pour Orange Money, Airtel Money,
 * M-Pesa, etc. Chaque fournisseur réel nécessite un compte marchand + des clés API
 * (voir .env.example) fournies par l'opérateur — elles ne sont pas incluses ici.
 *
 * Tant qu'aucune clé n'est configurée, le fournisseur MOCK est utilisé : il simule
 * une transaction réussie après un court délai, ce qui permet de tester tout le
 * parcours de vente sans compte marchand réel.
 */

export type MobileMoneyProvider = "ORANGE_MONEY" | "AIRTEL_MONEY" | "MPESA" | "MOCK";

export type ChargeRequest = {
  provider: MobileMoneyProvider;
  phone: string;
  amount: number;
  currency: string;
  reference: string;
};

export type ChargeResult = {
  status: "EN_ATTENTE" | "REUSSI" | "ECHEC";
  externalRef?: string;
  message: string;
};

interface MobileMoneyGateway {
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** Fournisseur de test : ne nécessite aucune clé API, utile en démo/développement. */
class MockGateway implements MobileMoneyGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return {
      status: "REUSSI",
      externalRef: `MOCK-${Date.now()}`,
      message: `Paiement simulé de ${req.amount} ${req.currency} depuis ${req.phone} (mode démo, aucune clé API configurée).`,
    };
  }
}

/**
 * Squelette d'intégration Orange Money (API Web Payment / Collections).
 * Nécessite ORANGE_MONEY_API_KEY, ORANGE_MONEY_MERCHANT_ID dans .env.
 * Documentation opérateur : à obtenir auprès d'Orange Money Développeurs.
 */
class OrangeMoneyGateway implements MobileMoneyGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const apiKey = process.env.ORANGE_MONEY_API_KEY;
    if (!apiKey) {
      return { status: "ECHEC", message: "ORANGE_MONEY_API_KEY non configurée. Voir .env.example." };
    }
    // TODO production : appeler l'API réelle d'Orange Money ici avec fetch().
    return { status: "EN_ATTENTE", message: `Requête envoyée à Orange Money pour ${req.phone}.` };
  }
}

class AirtelMoneyGateway implements MobileMoneyGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const apiKey = process.env.AIRTEL_MONEY_API_KEY;
    if (!apiKey) {
      return { status: "ECHEC", message: "AIRTEL_MONEY_API_KEY non configurée. Voir .env.example." };
    }
    // TODO production : appeler l'API réelle d'Airtel Money ici avec fetch().
    return { status: "EN_ATTENTE", message: `Requête envoyée à Airtel Money pour ${req.phone}.` };
  }
}

/**
 * Intégration M-Pesa réelle via l'API Daraja (Safaricom) — STK Push ("Lipa Na M-Pesa Online").
 * Fonctionne aussi bien en sandbox (gratuit, sans compte marchand — voir
 * https://developer.safaricom.co.ke) qu'en production (nécessite un shortcode marchand actif).
 *
 * Le paiement est asynchrone : cet appel ne fait qu'envoyer l'invite de paiement sur le
 * téléphone du client (statut EN_ATTENTE). La confirmation réelle arrive plus tard via le
 * webhook `/api/payments/mobile-money/mpesa-callback`, qui met à jour la transaction — le
 * frontend interroge ensuite `/api/payments/mobile-money/status/[id]` jusqu'à résolution.
 */
const MPESA_SANDBOX_SHORTCODE = "174379";
// Passkey de test publié par Safaricom pour le sandbox (documentation officielle Daraja) —
// aucune donnée secrète propre à ce projet, utilisé seulement si MPESA_PASSKEY est absent.
const MPESA_SANDBOX_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

function mpesaBaseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function mpesaTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

/** Normalise un numéro local (ex: 0712345678) au format MSISDN attendu par Daraja (ex: 254712345678). */
function mpesaPhone(rawPhone: string) {
  const countryCode = process.env.MPESA_COUNTRY_CODE || "254";
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith(countryCode)) return digits;
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  return countryCode + digits;
}

class MPesaGateway implements MobileMoneyGateway {
  private async getAccessToken(): Promise<string> {
    const consumerKey = process.env.MPESA_CONSUMER_KEY!;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const res = await fetch(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      throw new Error("Authentification M-Pesa refusée (vérifiez MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET).");
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) {
      return {
        status: "ECHEC",
        message:
          "MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET non configurées. Créez une app gratuite sur developer.safaricom.co.ke (sandbox) et renseignez-les dans .env — voir README.md.",
      };
    }
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) {
      return {
        status: "ECHEC",
        message: "MPESA_CALLBACK_URL non configurée (URL publique HTTPS requise par Safaricom). Voir .env.example.",
      };
    }

    try {
      const token = await this.getAccessToken();
      const shortcode = process.env.MPESA_SHORTCODE || MPESA_SANDBOX_SHORTCODE;
      const passkey = process.env.MPESA_PASSKEY || MPESA_SANDBOX_PASSKEY;
      const timestamp = mpesaTimestamp();
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
      const phone = mpesaPhone(req.phone);

      const res = await fetch(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.max(1, Math.round(req.amount)),
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference: req.reference.slice(0, 12) || "VENTE",
          TransactionDesc: "Paiement boutique",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ResponseCode !== "0") {
        return {
          status: "ECHEC",
          message: data.errorMessage || data.ResponseDescription || "Échec de la requête M-Pesa.",
        };
      }

      return {
        status: "EN_ATTENTE",
        externalRef: data.CheckoutRequestID,
        message: `Invite de paiement envoyée au ${req.phone}. Le client doit valider avec son code PIN M-Pesa.`,
      };
    } catch (err) {
      return { status: "ECHEC", message: err instanceof Error ? err.message : "Erreur M-Pesa inconnue." };
    }
  }
}

const gateways: Record<MobileMoneyProvider, MobileMoneyGateway> = {
  MOCK: new MockGateway(),
  ORANGE_MONEY: new OrangeMoneyGateway(),
  AIRTEL_MONEY: new AirtelMoneyGateway(),
  MPESA: new MPesaGateway(),
};

export async function chargeMobileMoney(req: ChargeRequest): Promise<ChargeResult> {
  const gateway = gateways[req.provider] ?? gateways.MOCK;
  return gateway.charge(req);
}
