/**
 * Abstraction "mobile money" : une interface commune pour Orange Money, Airtel Money,
 * M-Pesa, etc. Chaque fournisseur réel nécessite un compte marchand + des clés API
 * (voir .env.example) fournies par l'opérateur — elles ne sont pas incluses ici.
 *
 * Tant qu'aucune clé n'est configurée, le fournisseur MOCK est utilisé : il simule
 * une transaction réussie après un court délai, ce qui permet de tester tout le
 * parcours de vente sans compte marchand réel.
 */

export type MobileMoneyProvider = "ORANGE_MONEY" | "AIRTEL_MONEY" | "MPESA" | "CINETPAY" | "MOCK";

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
  /** Lien de paiement à ouvrir/scanner (flux Orange Money Web Payment). */
  paymentUrl?: string;
  message: string;
};

interface MobileMoneyGateway {
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /**
   * Ré-interroge activement le statut auprès de l'opérateur (pour les fournisseurs qui n'ont
   * pas de webhook configuré ici). Optionnel : par défaut on se contente du statut déjà connu.
   */
  checkStatus?(externalRef: string): Promise<"EN_ATTENTE" | "REUSSI" | "ECHEC">;
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
 * Intégration Orange Money réelle via l'API "Web Payment" du portail développeur Orange
 * (https://developer.orange.com — compte gratuit, sandbox disponible immédiatement).
 *
 * Contrairement à M-Pesa/Airtel (invite envoyée directement sur le téléphone), le flux Orange
 * Money standard génère un **lien de paiement** que le client ouvre lui-même (navigateur ou
 * scan QR) pour saisir son code Orange Money. Le statut final arrive via le webhook
 * `/api/payments/mobile-money/orange-callback` (notif_url), interrogé ensuite comme les autres
 * fournisseurs par `/api/payments/mobile-money/status/[id]`.
 *
 * ⚠️ Les URLs exactes et le format de callback varient selon le pays Orange (RDC, Côte
 * d'Ivoire, Sénégal…) — vérifiez la documentation fournie avec votre compte développeur et
 * ajustez `ORANGE_MONEY_BASE_URL` / `ORANGE_MONEY_COUNTRY` si besoin.
 */
function orangeBaseUrl() {
  return process.env.ORANGE_MONEY_BASE_URL || "https://api.orange.com";
}

class OrangeMoneyGateway implements MobileMoneyGateway {
  private async getAccessToken(): Promise<string> {
    const clientId = process.env.ORANGE_MONEY_CLIENT_ID!;
    const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET!;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${orangeBaseUrl()}/oauth/v3/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) {
      throw new Error("Authentification Orange Money refusée (vérifiez ORANGE_MONEY_CLIENT_ID / ORANGE_MONEY_CLIENT_SECRET).");
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const clientId = process.env.ORANGE_MONEY_CLIENT_ID;
    const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET;
    const merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY;
    if (!clientId || !clientSecret || !merchantKey) {
      return {
        status: "ECHEC",
        message:
          "ORANGE_MONEY_CLIENT_ID / ORANGE_MONEY_CLIENT_SECRET / ORANGE_MONEY_MERCHANT_KEY non configurées. Créez un compte gratuit sur developer.orange.com — voir README.md.",
      };
    }
    const notifUrl = process.env.ORANGE_MONEY_NOTIF_URL;
    const returnUrl = process.env.ORANGE_MONEY_RETURN_URL || notifUrl;
    if (!notifUrl) {
      return {
        status: "ECHEC",
        message: "ORANGE_MONEY_NOTIF_URL non configurée (URL publique HTTPS requise par Orange). Voir .env.example.",
      };
    }

    try {
      const token = await this.getAccessToken();
      const country = process.env.ORANGE_MONEY_COUNTRY || "cd"; // ex: cd = RD Congo
      const orderId = req.reference || `TX-${Date.now()}`;

      const res = await fetch(`${orangeBaseUrl()}/orange-money-webpay/${country}/v1/webpayment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_key: merchantKey,
          currency: req.currency,
          order_id: orderId,
          amount: Math.max(1, Math.round(req.amount)),
          return_url: returnUrl,
          cancel_url: returnUrl,
          notif_url: notifUrl,
          lang: "fr",
          reference: orderId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.payment_url) {
        return {
          status: "ECHEC",
          message: data.message || "Échec de la création du paiement Orange Money.",
        };
      }

      return {
        status: "EN_ATTENTE",
        externalRef: orderId,
        paymentUrl: data.payment_url as string,
        message: "Lien de paiement Orange Money généré : faites-le ouvrir ou scanner par le client pour valider.",
      };
    } catch (err) {
      return { status: "ECHEC", message: err instanceof Error ? err.message : "Erreur Orange Money inconnue." };
    }
  }
}

/**
 * Intégration Airtel Money réelle via l'Airtel Money OpenAPI (Collections / "Request to Pay")
 * — https://developers.airtel.africa (compte gratuit, environnement UAT/sandbox disponible
 * immédiatement, sans compte marchand actif).
 *
 * Comme M-Pesa, une invite USSD est envoyée sur le téléphone du client (statut EN_ATTENTE).
 * L'Airtel OpenAPI de base ne pousse pas systématiquement de webhook selon la configuration du
 * compte : par sécurité, `checkStatus()` ré-interroge activement l'API "Enquire" à chaque appel
 * du frontend (voir /api/payments/mobile-money/status/[id]) plutôt que de dépendre d'un callback.
 */
function airtelBaseUrl() {
  return process.env.AIRTEL_ENV === "production"
    ? "https://openapi.airtel.africa"
    : "https://openapiuat.airtel.africa";
}

/** Normalise un numéro local au format attendu par Airtel (sans indicatif pays, sans 0 initial). */
function airtelMsisdn(rawPhone: string) {
  const countryCode = process.env.AIRTEL_COUNTRY_CODE || "243"; // 243 = RD Congo
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

class AirtelMoneyGateway implements MobileMoneyGateway {
  private async getAccessToken(): Promise<string> {
    const clientId = process.env.AIRTEL_CLIENT_ID!;
    const clientSecret = process.env.AIRTEL_CLIENT_SECRET!;
    const res = await fetch(`${airtelBaseUrl()}/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    });
    if (!res.ok) {
      throw new Error("Authentification Airtel Money refusée (vérifiez AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET).");
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const clientId = process.env.AIRTEL_CLIENT_ID;
    const clientSecret = process.env.AIRTEL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return {
        status: "ECHEC",
        message:
          "AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET non configurées. Créez un compte gratuit sur developers.airtel.africa (sandbox UAT) — voir README.md.",
      };
    }

    try {
      const token = await this.getAccessToken();
      const country = process.env.AIRTEL_COUNTRY || "CD"; // CD = RD Congo
      const currency = req.currency;
      const transactionId = `TX${Date.now()}`;

      const res = await fetch(`${airtelBaseUrl()}/merchant/v1/payments/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "*/*",
          "X-Country": country,
          "X-Currency": currency,
        },
        body: JSON.stringify({
          reference: req.reference || "VENTE",
          subscriber: { country, currency, msisdn: airtelMsisdn(req.phone) },
          transaction: { amount: Math.max(1, Math.round(req.amount)), country, currency, id: transactionId },
        }),
      });

      const data = await res.json();
      const success = res.ok && (data.status?.success === true || data.status?.code === "200");

      if (!success) {
        return {
          status: "ECHEC",
          message: data.status?.message || data.status?.response_code || "Échec de la requête Airtel Money.",
        };
      }

      return {
        status: "EN_ATTENTE",
        externalRef: transactionId,
        message: `Invite de paiement envoyée au ${req.phone}. Le client doit valider avec son code PIN Airtel Money.`,
      };
    } catch (err) {
      return { status: "ECHEC", message: err instanceof Error ? err.message : "Erreur Airtel Money inconnue." };
    }
  }

  async checkStatus(externalRef: string): Promise<"EN_ATTENTE" | "REUSSI" | "ECHEC"> {
    try {
      const token = await this.getAccessToken();
      const country = process.env.AIRTEL_COUNTRY || "CD";
      const currency = process.env.AIRTEL_CURRENCY_DEFAULT || "CDF";
      const res = await fetch(`${airtelBaseUrl()}/standard/v1/payments/${externalRef}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Country": country,
          "X-Currency": currency,
        },
      });
      const data = await res.json();
      const code = data?.data?.transaction?.status as string | undefined;
      if (code === "TS" || code === "SUCCESS") return "REUSSI";
      if (code === "TF" || code === "FAILED") return "ECHEC";
      return "EN_ATTENTE";
    } catch {
      return "EN_ATTENTE";
    }
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

/**
 * Intégration CinetPay réelle — agrégateur de paiement mobile money très utilisé en Afrique
 * francophone (RDC, Côte d'Ivoire, Sénégal, Cameroun…). Une seule API donne accès à Orange
 * Money, Airtel Money, MTN Money, Moov Money et carte bancaire, sans négocier un accord
 * marchand séparé avec chaque opérateur — inscription et sandbox gratuits sur cinetpay.com.
 *
 * Flux "lien de paiement" comme Orange Money : le client ouvre le lien, choisit son moyen de
 * paiement (Orange Money, Airtel Money…) et valide. Confirmation via webhook
 * `/api/payments/mobile-money/cinetpay-callback`, qui re-vérifie le statut auprès de CinetPay
 * avant de le considérer fiable (recommandation officielle CinetPay : ne jamais faire confiance
 * au contenu brut du webhook).
 */
const CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2";

class CinetPayGateway implements MobileMoneyGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const apikey = process.env.CINETPAY_APIKEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    if (!apikey || !siteId) {
      return {
        status: "ECHEC",
        message:
          "CINETPAY_APIKEY / CINETPAY_SITE_ID non configurées. Créez un compte gratuit sur cinetpay.com (mode test disponible) — voir README.md.",
      };
    }
    const notifyUrl = process.env.CINETPAY_NOTIFY_URL;
    if (!notifyUrl) {
      return {
        status: "ECHEC",
        message: "CINETPAY_NOTIFY_URL non configurée (URL publique HTTPS requise par CinetPay). Voir .env.example.",
      };
    }
    const returnUrl = process.env.CINETPAY_RETURN_URL || notifyUrl;
    const transactionId = req.reference.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30) || `TX${Date.now()}`;

    try {
      const res = await fetch(`${CINETPAY_BASE_URL}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey,
          site_id: siteId,
          transaction_id: transactionId,
          amount: Math.max(100, Math.round(req.amount)), // CinetPay exige un montant minimum (généralement 100 XOF/XAF/CDF)
          currency: req.currency,
          description: "Paiement boutique",
          notify_url: notifyUrl,
          return_url: returnUrl,
          channels: "MOBILE_MONEY",
          customer_phone_number: req.phone,
        }),
      });

      const data = await res.json();

      if (data.code !== "201" || !data.data?.payment_url) {
        return { status: "ECHEC", message: data.message || data.description || "Échec de la création du paiement CinetPay." };
      }

      return {
        status: "EN_ATTENTE",
        externalRef: transactionId,
        paymentUrl: data.data.payment_url as string,
        message: "Lien de paiement généré : faites-le ouvrir ou scanner par le client (Orange Money, Airtel Money, MTN Money…).",
      };
    } catch (err) {
      return { status: "ECHEC", message: err instanceof Error ? err.message : "Erreur CinetPay inconnue." };
    }
  }

  async checkStatus(externalRef: string): Promise<"EN_ATTENTE" | "REUSSI" | "ECHEC"> {
    const apikey = process.env.CINETPAY_APIKEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    if (!apikey || !siteId) return "EN_ATTENTE";
    try {
      const res = await fetch(`${CINETPAY_BASE_URL}/payment/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey, site_id: siteId, transaction_id: externalRef }),
      });
      const data = await res.json();
      const status = data?.data?.status as string | undefined;
      if (status === "ACCEPTED") return "REUSSI";
      if (status === "REFUSED" || status === "CANCELLED") return "ECHEC";
      return "EN_ATTENTE";
    } catch {
      return "EN_ATTENTE";
    }
  }
}

const gateways: Record<MobileMoneyProvider, MobileMoneyGateway> = {
  MOCK: new MockGateway(),
  ORANGE_MONEY: new OrangeMoneyGateway(),
  AIRTEL_MONEY: new AirtelMoneyGateway(),
  MPESA: new MPesaGateway(),
  CINETPAY: new CinetPayGateway(),
};

export async function chargeMobileMoney(req: ChargeRequest): Promise<ChargeResult> {
  const gateway = gateways[req.provider] ?? gateways.MOCK;
  return gateway.charge(req);
}

/** Ré-interroge activement le statut chez l'opérateur, pour les fournisseurs sans webhook (ex: Airtel). */
export async function checkMobileMoneyStatus(
  provider: MobileMoneyProvider,
  externalRef: string
): Promise<"EN_ATTENTE" | "REUSSI" | "ECHEC" | null> {
  const gateway = gateways[provider];
  if (!gateway?.checkStatus) return null;
  return gateway.checkStatus(externalRef);
}
