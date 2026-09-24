import { describe, it, expect } from "vitest";
import { loginSchema, productSchema, saleSchema, expenseSchema, mobileMoneyChargeSchema, cancelSaleSchema } from "./validators";

describe("loginSchema", () => {
  it("accepte un email et un mot de passe valides", () => {
    const result = loginSchema.safeParse({ email: "admin@demo.com", password: "demo1234" });
    expect(result.success).toBe(true);
  });

  it("refuse un email invalide", () => {
    const result = loginSchema.safeParse({ email: "pas-un-email", password: "demo1234" });
    expect(result.success).toBe(false);
  });

  it("refuse un mot de passe vide", () => {
    const result = loginSchema.safeParse({ email: "admin@demo.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("productSchema", () => {
  it("applique les valeurs par défaut (unité, prix, quantité, seuil)", () => {
    const result = productSchema.parse({ name: "Ciment 50kg" });
    expect(result.unit).toBe("pièce");
    expect(result.costPrice).toBe(0);
    expect(result.sellPrice).toBe(0);
    expect(result.quantity).toBe(0);
    expect(result.alertThreshold).toBe(5);
  });

  it("refuse un produit sans nom", () => {
    const result = productSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("convertit les chaînes numériques (formulaires HTML) en nombres", () => {
    const result = productSchema.parse({ name: "Marteau", sellPrice: "8000", quantity: "35" });
    expect(result.sellPrice).toBe(8000);
    expect(result.quantity).toBe(35);
  });
});

describe("saleSchema", () => {
  it("exige au moins un article", () => {
    const result = saleSchema.safeParse({ paymentMethod: "MAGASIN", items: [] });
    expect(result.success).toBe(false);
  });

  it("accepte une vente avec un article valide", () => {
    const result = saleSchema.safeParse({
      paymentMethod: "MAGASIN",
      items: [{ productId: "p1", quantity: 2, unitPrice: 1500 }],
    });
    expect(result.success).toBe(true);
  });

  it("refuse une quantité négative ou nulle", () => {
    const result = saleSchema.safeParse({
      paymentMethod: "MAGASIN",
      items: [{ productId: "p1", quantity: 0, unitPrice: 1500 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("refuse un montant négatif ou nul", () => {
    const result = expenseSchema.safeParse({ category: "LOYER", label: "Loyer", amount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepte une dépense valide", () => {
    const result = expenseSchema.safeParse({ category: "TRANSPORT", label: "Livraison", amount: 25000 });
    expect(result.success).toBe(true);
  });
});

describe("mobileMoneyChargeSchema", () => {
  it("accepte les fournisseurs supportés, y compris CinetPay", () => {
    for (const provider of ["MOCK", "ORANGE_MONEY", "AIRTEL_MONEY", "MPESA", "CINETPAY"]) {
      const result = mobileMoneyChargeSchema.safeParse({ provider, phone: "0812345678", amount: 1000 });
      expect(result.success).toBe(true);
    }
  });

  it("refuse un fournisseur inconnu", () => {
    const result = mobileMoneyChargeSchema.safeParse({ provider: "PAYPAL", phone: "0812345678", amount: 1000 });
    expect(result.success).toBe(false);
  });

  it("refuse un montant négatif", () => {
    const result = mobileMoneyChargeSchema.safeParse({ provider: "MOCK", phone: "0812345678", amount: -5 });
    expect(result.success).toBe(false);
  });
});

describe("cancelSaleSchema", () => {
  it("exige un motif d'annulation", () => {
    expect(cancelSaleSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(cancelSaleSchema.safeParse({}).success).toBe(false);
  });

  it("accepte un motif et le nettoie", () => {
    const result = cancelSaleSchema.safeParse({ reason: "  Retour client  " });
    expect(result.success && result.data.reason).toBe("Retour client");
  });
});
