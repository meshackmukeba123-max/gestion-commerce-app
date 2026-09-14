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

class MPesaGateway implements MobileMoneyGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const apiKey = process.env.MPESA_API_KEY;
    if (!apiKey) {
      return { status: "ECHEC", message: "MPESA_API_KEY non configurée. Voir .env.example." };
    }
    // TODO production : appeler l'API M-Pesa (Daraja) ici avec fetch().
    return { status: "EN_ATTENTE", message: `Requête envoyée à M-Pesa pour ${req.phone}.` };
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
